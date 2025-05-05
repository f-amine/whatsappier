import { Connection } from '@prisma/client';
import { prisma } from '@/lib/db';
import { sheets_v4, sheets } from '@googleapis/sheets';
import { OAuth2Client } from 'google-auth-library';
import { drive, drive_v3 } from '@googleapis/drive';
import { env } from '@/env.mjs';

export interface GoogleSheetInfo {
  id: string;
  name: string;
  url: string;
}

export interface SheetData {
  sheets: GoogleSheetInfo[];
}

export interface SheetColumn {
  header: string;
  values: string[];
}

export class GoogleSheetsService {
  private sheetsClient: sheets_v4.Sheets;
  private driveClient: drive_v3.Drive;
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string, refreshToken?: string) {
    // Create an OAuth2 client with the given credentials
    this.oauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${env.NEXT_PUBLIC_APP_URL}/api/connections/google-sheets/callback`
    );
    
    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive'
    });
    
    // Create the sheets client
    this.sheetsClient = sheets({
      version: 'v4',
      auth: this.oauth2Client
    });
    
    // Create the drive client for listing files
    this.driveClient = drive({
      version: 'v3',
      auth: this.oauth2Client
    });
  }

  static async fromConnection(connection: Connection) {
    // Extract credentials
    const credentials = connection.credentials as any;
    if (!credentials.accessToken) {
      throw new Error('Invalid Google Sheets connection credentials');
    }

    return new GoogleSheetsService(
      credentials.accessToken,
      credentials.refreshToken
    );
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    // Check if token is expired or will expire soon
    const tokenInfo = this.oauth2Client.credentials;
    const now = Date.now();
    
    if (!tokenInfo.expiry_date || now >= (tokenInfo.expiry_date as number) - 60000) {
      console.log('Token expired or will expire soon, refreshing...');
      try {
        if (!tokenInfo.refresh_token) {
          throw new Error('No refresh token available');
        }
        
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        // Update the client with new credentials
        this.oauth2Client.setCredentials(credentials);
        
        console.log('Token refreshed successfully');
      } catch (error) {
        console.error('Error refreshing token:', error);
        throw new Error('Failed to refresh access token');
      }
    }
  }

  async getSpreadsheets(): Promise<GoogleSheetInfo[]> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      console.log('Fetching spreadsheets...');
      
      // Use the Drive API to list spreadsheets
      const response = await this.driveClient.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: 'files(id,name,webViewLink)',
        pageSize: 50
      });

      if (!response.data.files) {
        console.log('No spreadsheets found');
        return [];
      }

      console.log(`Found ${response.data.files.length} spreadsheets`);
      
      return response.data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`
      }));
    } catch (error: any) {
      console.error('Error fetching Google Sheets:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      
      throw new Error(`Failed to fetch Google Sheets: ${error.message}`);
    }
  }

  async createNewSpreadsheet(name: string): Promise<GoogleSheetInfo> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      console.log(`Creating new spreadsheet: ${name}`);
      
      // Create a new spreadsheet
      const response = await this.sheetsClient.spreadsheets.create({
        requestBody: {
          properties: {
            title: name
          },
          sheets: [
            {
              properties: {
                title: 'Sheet1',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26
                }
              }
            }
          ]
        }
      });

      const spreadsheetId = response.data.spreadsheetId!;
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      
      console.log(`Created new spreadsheet with ID: ${spreadsheetId}`);
      
      return {
        id: spreadsheetId,
        name: name,
        url: spreadsheetUrl
      };
    } catch (error: any) {
      console.error('Error creating Google Sheet:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      
      throw new Error(`Failed to create Google Sheet: ${error.message}`);
    }
  }
  
  async getSheetColumns(spreadsheetId: string, sheetName: string = 'Sheet1'): Promise<string[]> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      console.log(`Getting columns for sheet: ${sheetName} in spreadsheet: ${spreadsheetId}`);
      
      // Get the first row of the sheet (headers)
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!1:1`
      });
      
      if (!response.data.values || response.data.values.length === 0) {
        return [];
      }
      
      return response.data.values[0].map(header => header.toString());
    } catch (error: any) {
      console.error('Error getting sheet columns:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      
      throw new Error(`Failed to get sheet columns: ${error.message}`);
    }
  }
  
  async getSheetData(spreadsheetId: string, sheetName: string = 'Sheet1'): Promise<string[][]> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      console.log(`Getting data from sheet: ${sheetName} in spreadsheet: ${spreadsheetId}`);
      
      // Get all data from the sheet
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName
      });
      
      if (!response.data.values) {
        return [];
      }
      
      return response.data.values;
    } catch (error: any) {
      console.error('Error getting sheet data:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      
      throw new Error(`Failed to get sheet data: ${error.message}`);
    }
  }

  async addRowToSheet(
    spreadsheetId: string, 
    range: string, 
    values: string[][],
    includeHeaders: boolean = false
  ): Promise<void> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      // Format range correctly - if range doesn't contain '!', assume it's just a sheet name and append 'A1'
      const formattedRange = range.includes('!') ? range : `${range}!A1`;
      
      // If we need to include headers and this is a new sheet
      if (includeHeaders) {
        // First, check if the sheet already has data
        const response = await this.sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: formattedRange
        });
        
        // If the sheet is empty, add headers first
        if (!response.data.values || response.data.values.length === 0) {
          await this.sheetsClient.spreadsheets.values.update({
            spreadsheetId,
            range: formattedRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [values[0]] // Use the first row as headers
            }
          });
          
          // Then add the actual data starting from row 2
          if (values.length > 1) {
            const dataRange = formattedRange.replace('A1', 'A2');
            await this.sheetsClient.spreadsheets.values.append({
              spreadsheetId,
              range: dataRange,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: values.slice(1)
              }
            });
          }
          
          return;
        }
      }
      
      // Regular append if we don't need headers or the sheet already has data
      await this.sheetsClient.spreadsheets.values.append({
        spreadsheetId,
        range: formattedRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values
        }
      });
    } catch (error: any) {
      console.error('Error adding row to Google Sheet:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      
      throw new Error(`Failed to add row to Google Sheet: ${error.message}`);
    }
  }

  async getSpreadsheetInfo(spreadsheetId: string): Promise<any> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      console.log(`Getting spreadsheet info for: ${spreadsheetId}`);
      
      // Get spreadsheet information including sheets
      const response = await this.sheetsClient.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties'
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error getting spreadsheet info:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      
      throw new Error(`Failed to get spreadsheet info: ${error.message}`);
    }
  }

  async createSheet(spreadsheetId: string, sheetName: string): Promise<void> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      console.log(`Creating new sheet "${sheetName}" in spreadsheet: ${spreadsheetId}`);
      
      // Add a new sheet to the spreadsheet
      await this.sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 26
                  }
                }
              }
            }
          ]
        }
      });
      
      console.log(`Created new sheet "${sheetName}" successfully`);
    } catch (error: any) {
      console.error('Error creating sheet:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      
      throw new Error(`Failed to create sheet: ${error.message}`);
    }
  }

  async insertRowAt(
    spreadsheetId: string,
    sheetName: string,
    values: string[],
    rowIndex: number
  ): Promise<void> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      console.log(`Inserting row at position ${rowIndex} in sheet "${sheetName}"`);
      
      // First, create space for the new row by inserting a row
      await this.sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: await this.getSheetId(spreadsheetId, sheetName),
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1, // 0-based index
                  endIndex: rowIndex // exclusive
                }
              }
            }
          ]
        }
      });
      
      // Then, update the values in the newly inserted row
      await this.sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values]
        }
      });
      
      console.log(`Row inserted successfully at position ${rowIndex}`);
    } catch (error: any) {
      console.error('Error inserting row:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      
      throw new Error(`Failed to insert row: ${error.message}`);
    }
  }

  async formatHeadersAsBold(
    spreadsheetId: string,
    sheetName: string
  ): Promise<void> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      console.log(`Formatting headers as bold in sheet "${sheetName}"`);
      
      // Get the sheet ID
      const sheetId = await this.getSheetId(spreadsheetId, sheetName);
      
      // Apply bold formatting to the first row
      await this.sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1, // Only the first row
                  startColumnIndex: 0,
                  endColumnIndex: 100 // A large number to cover all columns
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true
                    }
                  }
                },
                fields: 'userEnteredFormat.textFormat.bold'
              }
            }
          ]
        }
      });
      
      console.log(`Headers formatted as bold successfully`);
    } catch (error: any) {
      console.error('Error formatting headers as bold:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      
      throw new Error(`Failed to format headers as bold: ${error.message}`);
    }
  }

  private async getSheetId(spreadsheetId: string, sheetName: string): Promise<number> {
    const spreadsheetInfo = await this.getSpreadsheetInfo(spreadsheetId);
    
    const sheet = spreadsheetInfo.sheets.find((s: any) => 
      s.properties.title === sheetName
    );
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
    }
    
    return sheet.properties.sheetId;
  }

  /**
   * Generic method to update a Google Sheet with any data structure
   * @param spreadsheetId - The ID of the spreadsheet to update
   * @param data - Object containing the data to add to the sheet
   * @param options - Configuration options for updating the sheet
   * @returns 
   */
  async updateSheet(
    spreadsheetId: string,
    data: Record<string, any>,
    options: {
      sheetName?: string;
      createIfNotExist?: boolean;
      useHeadersFromData?: boolean;
      customHeaders?: string[];
      formatHeaders?: boolean;
    } = {}
  ): Promise<void> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      // Set default options
      const sheetName = options.sheetName || 'Sheet1';
      const createIfNotExist = options.createIfNotExist !== false;
      const formatHeaders = options.formatHeaders !== false;
      
      console.log(`Updating sheet "${sheetName}" in spreadsheet: ${spreadsheetId}`);
      
      // Check if the spreadsheet exists
      const spreadsheetInfo = await this.getSpreadsheetInfo(spreadsheetId);
      
      // Check if the specified sheet exists
      const sheetExists = spreadsheetInfo.sheets.some((sheet: any) => 
        sheet.properties?.title === sheetName
      );
      
      // Create the sheet if it doesn't exist and createIfNotExist is true
      if (!sheetExists) {
        if (!createIfNotExist) {
          throw new Error(`Sheet "${sheetName}" doesn't exist in spreadsheet`);
        }
        
        console.log(`Sheet "${sheetName}" doesn't exist, creating it...`);
        await this.createSheet(spreadsheetId, sheetName);
      }
      
      // Get existing data to check if headers exist
      const existingData = await this.getSheetData(spreadsheetId, sheetName);
      const isEmpty = !existingData || existingData.length === 0;
      
      // Determine headers (column names)
      let headers: string[] = [];
      
      if (options.customHeaders && options.customHeaders.length > 0) {
        // Use custom headers if provided
        headers = options.customHeaders;
      } else if (options.useHeadersFromData) {
        // Use all keys from the data object as headers
        headers = Object.keys(data);
      } else if (!isEmpty) {
        // Use existing headers from the sheet
        headers = existingData[0] || [];
      } else {
        // Default to using all keys from the data object if sheet is empty
        headers = Object.keys(data);
      }
      
      // Prepare row values based on headers
      const rowValues = headers.map(header => {
        const value = data[header];
        
        // Handle different types of values
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          return JSON.stringify(value);
        } else {
          return String(value);
        }
      });
      
      // Update the sheet
      if (isEmpty) {
        // Sheet is empty, add headers and data
        console.log(`Adding headers and data to empty sheet ${sheetName}`);
        const values = [headers, rowValues];
        await this.addRowToSheet(spreadsheetId, sheetName, values, true);
        
        // Format headers as bold if requested
        if (formatHeaders) {
          await this.formatHeadersAsBold(spreadsheetId, sheetName);
        }
      } else {
        // Check if headers match
        const existingHeaders = existingData[0] || [];
        const headersMatch = headers.every(header => existingHeaders.includes(header));
        
        if (!headersMatch) {
          console.log(`Headers don't match, updating sheet structure`);
          
          // Create a new set of headers that includes both existing and new ones
          const combinedHeaders = [...new Set([...existingHeaders, ...headers])];
          
          // Update the headers row
          await this.sheetsClient.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [combinedHeaders]
            }
          });
          
          // Format headers as bold if requested
          if (formatHeaders) {
            await this.formatHeadersAsBold(spreadsheetId, sheetName);
          }
          
          // Prepare row values based on new combined headers
          const newRowValues = combinedHeaders.map(header => {
            const value = data[header];
            
            // Handle different types of values
            if (value === null || value === undefined) {
              return '';
            } else if (typeof value === 'object') {
              return JSON.stringify(value);
            } else {
              return String(value);
            }
          });
          
          // Append the data as a new row
          await this.sheetsClient.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A2`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
              values: [newRowValues]
            }
          });
        } else {
          // Headers already match, just append the data
          console.log(`Headers match, appending data to sheet ${sheetName}`);
          await this.sheetsClient.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A${existingData.length + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [rowValues]
            }
          });
        }
      }
      
      console.log(`Sheet "${sheetName}" updated successfully`);
    } catch (error: any) {
      console.error('Error updating sheet:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
      }
      
      throw new Error(`Failed to update sheet: ${error.message}`);
    }
  }

  /**
   * Find or create a spreadsheet with the given name
   * @param name - The name of the spreadsheet to find or create
   * @returns Information about the found or created spreadsheet
   */
  async findOrCreateSpreadsheet(name: string): Promise<GoogleSheetInfo> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();
      
      console.log(`Looking for spreadsheet with name: ${name}`);
      
      // First check if a spreadsheet with this name already exists
      const existingSpreadsheets = await this.getSpreadsheets();
      
      // Do case-insensitive comparison to be more forgiving with names
      const matchingSpreadsheet = existingSpreadsheets.find(
        sheet => sheet.name.toLowerCase() === name.toLowerCase()
      );
      
      if (matchingSpreadsheet) {
        console.log(`Found existing spreadsheet with name: ${name}, ID: ${matchingSpreadsheet.id}`);
        return matchingSpreadsheet;
      }
      
      // If no matching spreadsheet was found, create a new one
      console.log(`No existing spreadsheet found with name: ${name}. Creating new.`);
      return await this.createNewSpreadsheet(name);
    } catch (error: any) {
      console.error('Error finding or creating spreadsheet:', error);
      throw new Error(`Failed to find or create spreadsheet: ${error.message}`);
    }
  }
}

export async function getGoogleSheets(
  connectionId: string | null | undefined
): Promise<GoogleSheetInfo[]> {
  if (!connectionId) {
    return [];
  }

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId }
  });

  if (!connection) {
    throw new Error('Google Sheets connection not found');
  }

  const sheetsService = await GoogleSheetsService.fromConnection(connection);
  return sheetsService.getSpreadsheets();
}
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
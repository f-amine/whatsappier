'use server';

import { getCurrentUser } from '@/lib/sessions';
import { prisma } from '@/lib/db';
import { Platform } from '@prisma/client';
import { GoogleSheetsService, GoogleSheetInfo } from '@/lib/automations/helpers/google-sheets';

interface GetSheetsOptions {
  search?: string;
  limit?: number;
}
interface WorksheetInfo {
  id: string;
  name: string;
  index: number;
}

interface GetWorksheetsOptions {
  search?: string;
  limit?: number;
}
export async function getGoogleSheets(
  connectionId: string | null | undefined,
  options: GetSheetsOptions = {}
): Promise<{ data: GoogleSheetInfo[], error?: string }> {
  if (!connectionId) {
    return { data: [] };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: [], error: 'Unauthorized' };
    }

    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: user.id,
        platform: Platform.GOOGLE_SHEETS,
        isActive: true,
      },
    });

    if (!connection) {
      return { data: [], error: 'Connection not found or access denied' };
    }

    try {
      const sheetsService = await GoogleSheetsService.fromConnection(connection);
      const allSheets = await sheetsService.getSpreadsheets();
      
      // Filter by search term if provided
      let filteredSheets = allSheets;
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredSheets = allSheets.filter(sheet => 
          sheet.name.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply limit if provided
      if (options.limit && filteredSheets.length > options.limit) {
        filteredSheets = filteredSheets.slice(0, options.limit);
      }
      
      return { data: filteredSheets };
    } catch (error: any) {
      console.error('Error fetching Google Sheets:', error);
      
      // Detect token issues and provide a helpful message
      if (error.message.includes('Invalid Credentials') || 
          error.message.includes('token') || 
          error.message.includes('auth')) {
        return { 
          data: [], 
          error: 'Your Google Sheets connection needs to be refreshed. Please disconnect and reconnect your Google account.' 
        };
      }
      
      return { data: [], error: `Error fetching Google Sheets: ${error.message}` };
    }
  } catch (error: any) {
    console.error('Error in getGoogleSheets:', error);
    return { data: [], error: error.message };
  }
} 

export async function getWorksheets(
  connectionId: string | null | undefined,
  spreadsheetId: string | null | undefined,
  options: GetWorksheetsOptions = {}
): Promise<{ data: WorksheetInfo[], error?: string }> {
  if (!connectionId || !spreadsheetId) {
    return { data: [] };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { data: [], error: 'Unauthorized' };
    }

    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: user.id,
        platform: Platform.GOOGLE_SHEETS,
        isActive: true,
      },
    });

    if (!connection) {
      return { data: [], error: 'Connection not found or access denied' };
    }

    try {
      const sheetsService = await GoogleSheetsService.fromConnection(connection);
      const spreadsheetInfo = await sheetsService.getSpreadsheetInfo(spreadsheetId);
      
      let worksheets: WorksheetInfo[] = [];
      if (spreadsheetInfo.sheets) {
        worksheets = spreadsheetInfo.sheets.map((sheet: any, index: number) => ({
          id: sheet.properties.sheetId?.toString() || index.toString(),
          name: sheet.properties.title || `Sheet${index + 1}`,
          index: sheet.properties.index || index,
        }));
      }
      
      let filteredWorksheets = worksheets;
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredWorksheets = worksheets.filter(worksheet => 
          worksheet.name.toLowerCase().includes(searchLower)
        );
      }
      
      if (options.limit && filteredWorksheets.length > options.limit) {
        filteredWorksheets = filteredWorksheets.slice(0, options.limit);
      }
      
      return { data: filteredWorksheets };
    } catch (error: any) {
      console.error('Error fetching worksheets:', error);
      
      // Detect token issues and provide a helpful message
      if (error.message.includes('Invalid Credentials') || 
          error.message.includes('token') || 
          error.message.includes('auth')) {
        return { 
          data: [], 
          error: 'Your Google Sheets connection needs to be refreshed. Please disconnect and reconnect your Google account.' 
        };
      }
      
      return { data: [], error: `Error fetching worksheets: ${error.message}` };
    }
  } catch (error: any) {
    console.error('Error in getWorksheets:', error);
    return { data: [], error: error.message };
  }
}

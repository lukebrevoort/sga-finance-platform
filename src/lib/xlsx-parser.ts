/**
 * XLSX Parser for weekly budget spreadsheets
 * 
 * Parses completed weekly spreadsheets to extract budget requests by week
 * for PowerPoint generation.
 */

import * as ExcelJS from 'exceljs';
import type { 
  ParsedWeek, 
  SpreadsheetRow, 
  ParseSpreadsheetResult, 
  WeekSummary,
  PresentationRequest 
} from '@/types/presentation-request';
import { rowToPresentationRequest } from '@/types/presentation-request';

/**
 * Pattern to match "Week of X" section headers
 * Matches formats like: "Week of 2/1", "Week of 2/8/26", "Week of 02/01/2026"
 */
const WEEK_HEADER_PATTERN = /^Week\s+of\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i;

/**
 * Rows to skip when parsing (subtotals, remaining budget, etc.)
 */
const SKIP_PATTERNS = [
  /weekly\s*subtotal/i,
  /remaining\s*budget/i,
  /initial\s*budget/i,
  /^total/i,
];

/**
 * Check if a cell value matches a week header pattern
 * Returns the extracted date string if matched, null otherwise
 */
function extractWeekDate(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  
  const match = value.match(WEEK_HEADER_PATTERN);
  if (match) {
    return match[1]; // Return the date portion
  }
  return null;
}

/**
 * Check if a row should be skipped (subtotals, headers, etc.)
 */
function shouldSkipRow(row: ExcelJS.Row): boolean {
  // Check first few cells for skip patterns
  for (let col = 1; col <= 3; col++) {
    const cellValue = row.getCell(col).value;
    if (cellValue && typeof cellValue === 'string') {
      for (const pattern of SKIP_PATTERNS) {
        if (pattern.test(cellValue)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Parse a date string from "M/D" or "M/D/YY" format to ISO string
 * Assumes current year if not specified
 */
function parseWeekDateToISO(dateStr: string): string {
  const parts = dateStr.split('/');
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  
  let year: number;
  if (parts.length > 2) {
    year = parseInt(parts[2], 10);
    // Handle 2-digit years
    if (year < 100) {
      year += 2000;
    }
  } else {
    year = new Date().getFullYear();
  }
  
  // Create ISO date string
  const date = new Date(year, month - 1, day);
  return date.toISOString().split('T')[0];
}

/**
 * Extract cell value as string
 */
function getCellString(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && 'text' in value) return String(value.text).trim();
  if (typeof value === 'object' && 'result' in value) {
    // Formula result
    const result = value.result;
    if (result === null || result === undefined) return '';
    return String(result);
  }
  return String(value).trim();
}

/**
 * Extract cell value as number
 */
function getCellNumber(cell: ExcelJS.Cell): number {
  const value = cell.value;
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'result' in value) {
    const result = value.result;
    if (typeof result === 'number') return result;
    if (typeof result === 'string') {
      const parsed = parseFloat(result.replace(/[$,]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[$,]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Parse an AFR row from the spreadsheet
 * 
 * AFR Columns:
 * A: Date of Meeting
 * B: Notes
 * C: Organization
 * D: AFR'd / Requested Amount
 * E: Amended
 * F: After Amendments
 * G: Status
 * H: Final Amount
 * I: Remaining Budget (skip)
 * J: Name of Org
 * K: Entered in KFS?
 * L: Account Number
 */
function parseAFRRow(row: ExcelJS.Row): SpreadsheetRow | null {
  const organization = getCellString(row.getCell(3)); // Column C
  
  // Skip empty rows or header rows
  if (!organization || organization === 'Organization') {
    return null;
  }
  
  const requestedAmount = getCellNumber(row.getCell(4)); // Column D
  const afterAmendments = getCellNumber(row.getCell(6)); // Column F
  const statusValue = getCellString(row.getCell(7)); // Column G
  const finalAmount = getCellNumber(row.getCell(8)); // Column H
  const notes = getCellString(row.getCell(2)); // Column B
  const accountNumber = getCellString(row.getCell(12)); // Column L
  
  // Parse status
  let status: 'Approved' | 'Denied' | null = null;
  if (statusValue.toLowerCase() === 'approved') {
    status = 'Approved';
  } else if (statusValue.toLowerCase() === 'denied') {
    status = 'Denied';
  }
  
  return {
    organization,
    requestedAmount,
    afterAmendments: afterAmendments || null,
    status,
    finalAmount,
    notes,
    accountNumber,
  };
}

/**
 * Parse a Reallocation row from the spreadsheet
 * 
 * Reallocation Columns:
 * A: Date of Meeting
 * B: Notes
 * C: Organization
 * D: Requested Amount
 * E: Approved Amount
 * F: Status
 * G: Account Number
 */
function parseReallocationRow(row: ExcelJS.Row): SpreadsheetRow | null {
  const organization = getCellString(row.getCell(3)); // Column C
  
  // Skip empty rows or header rows
  if (!organization || organization === 'Organization') {
    return null;
  }
  
  const requestedAmount = getCellNumber(row.getCell(4)); // Column D
  const approvedAmount = getCellNumber(row.getCell(5)); // Column E
  const statusValue = getCellString(row.getCell(6)); // Column F
  const notes = getCellString(row.getCell(2)); // Column B
  const accountNumber = getCellString(row.getCell(7)); // Column G
  
  // Parse status
  let status: 'Approved' | 'Denied' | null = null;
  if (statusValue.toLowerCase() === 'approved') {
    status = 'Approved';
  } else if (statusValue.toLowerCase() === 'denied') {
    status = 'Denied';
  }
  
  return {
    organization,
    requestedAmount,
    afterAmendments: approvedAmount || null,
    status,
    finalAmount: status === 'Approved' ? approvedAmount : 0,
    notes,
    accountNumber,
  };
}

/**
 * Parse a worksheet (AFR or Reallocation) and extract weeks
 */
function parseWorksheet(
  worksheet: ExcelJS.Worksheet,
  isAFR: boolean
): Map<string, SpreadsheetRow[]> {
  const weekMap = new Map<string, SpreadsheetRow[]>();
  let currentWeekDate: string | null = null;
  
  worksheet.eachRow((row, rowNumber) => {
    // Check if this row is a week header
    const cell1Value = getCellString(row.getCell(1));
    const weekDate = extractWeekDate(cell1Value);
    
    if (weekDate) {
      currentWeekDate = weekDate;
      if (!weekMap.has(currentWeekDate)) {
        weekMap.set(currentWeekDate, []);
      }
      return; // Don't try to parse the header as data
    }
    
    // Skip subtotal and other special rows
    if (shouldSkipRow(row)) {
      return;
    }
    
    // If we don't have a current week, skip
    if (!currentWeekDate) {
      return;
    }
    
    // Parse the row
    const parsedRow = isAFR ? parseAFRRow(row) : parseReallocationRow(row);
    
    if (parsedRow) {
      const weekRows = weekMap.get(currentWeekDate);
      if (weekRows) {
        weekRows.push(parsedRow);
      }
    }
  });
  
  return weekMap;
}

/**
 * Parse a weekly spreadsheet and extract budget requests by week
 * 
 * @param buffer - ArrayBuffer containing the .xlsx file
 * @returns ParseSpreadsheetResult with weeks, warnings, and errors
 */
export async function parseWeeklySpreadsheet(
  buffer: ArrayBuffer
): Promise<ParseSpreadsheetResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const weeks: ParsedWeek[] = [];
  
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    // Find AFR worksheet
    const afrWorksheet = 
      workbook.getWorksheet('AFR Requests') ||
      workbook.getWorksheet('AFR') ||
      workbook.getWorksheet('Sunday Meeting') ||
      workbook.getWorksheet(1);
    
    // Find Reallocation worksheet
    const reallocationWorksheet = 
      workbook.getWorksheet('Reallocation Requests') ||
      workbook.getWorksheet('Reallocation');
    
    if (!afrWorksheet) {
      errors.push('Could not find AFR worksheet in the spreadsheet.');
      return { weeks, warnings, errors };
    }
    
    // Parse AFR worksheet
    const afrWeeks = parseWorksheet(afrWorksheet, true);
    
    // Parse Reallocation worksheet if exists
    const reallocationWeeks = reallocationWorksheet 
      ? parseWorksheet(reallocationWorksheet, false)
      : new Map<string, SpreadsheetRow[]>();
    
    // Combine weeks from both worksheets
    const allWeekDates = new Set([
      ...afrWeeks.keys(),
      ...reallocationWeeks.keys(),
    ]);
    
    if (allWeekDates.size === 0) {
      errors.push('No weeks found in the spreadsheet. Ensure weeks are marked with "Week of X" headers.');
      return { weeks, warnings, errors };
    }
    
    // Build ParsedWeek objects
    for (const date of allWeekDates) {
      const afrRequests = afrWeeks.get(date) || [];
      const reallocationRequests = reallocationWeeks.get(date) || [];
      
      weeks.push({
        date,
        dateISO: parseWeekDateToISO(date),
        afrRequests,
        reallocationRequests,
      });
    }
    
    // Sort weeks by date (most recent first)
    weeks.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    
    // Add warnings for weeks with no status set
    for (const week of weeks) {
      const allRequests = [...week.afrRequests, ...week.reallocationRequests];
      const missingStatus = allRequests.filter(r => r.status === null);
      
      if (missingStatus.length > 0) {
        warnings.push(
          `Week of ${week.date}: ${missingStatus.length} request(s) have no status set.`
        );
      }
    }
    
    return { weeks, warnings, errors };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to parse spreadsheet: ${message}`);
    return { weeks, warnings, errors };
  }
}

/**
 * Get a summary of all weeks for the week selector UI
 */
export function getWeekSummaries(weeks: ParsedWeek[]): WeekSummary[] {
  return weeks.map(week => {
    const allRequests = [...week.afrRequests, ...week.reallocationRequests];
    
    return {
      date: week.date,
      dateISO: week.dateISO,
      requestCount: allRequests.length,
      approvedCount: allRequests.filter(r => r.status === 'Approved').length,
      deniedCount: allRequests.filter(r => r.status === 'Denied').length,
      afrCount: week.afrRequests.length,
      reallocationCount: week.reallocationRequests.length,
    };
  });
}

/**
 * Get all presentation requests for a specific week
 */
export function getWeekPresentationRequests(week: ParsedWeek): PresentationRequest[] {
  const requests: PresentationRequest[] = [];
  
  // Process AFR requests
  for (const row of week.afrRequests) {
    const request = rowToPresentationRequest(row, 'AFR');
    if (request) {
      requests.push(request);
    }
  }
  
  // Process Reallocation requests
  for (const row of week.reallocationRequests) {
    const request = rowToPresentationRequest(row, 'Reallocation');
    if (request) {
      requests.push(request);
    }
  }
  
  return requests;
}

/**
 * Find a specific week by date string
 */
export function findWeekByDate(weeks: ParsedWeek[], date: string): ParsedWeek | undefined {
  return weeks.find(w => w.date === date || w.dateISO === date);
}

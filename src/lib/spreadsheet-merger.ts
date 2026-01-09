/**
 * Spreadsheet merger - combines new pending requests into an existing master spreadsheet
 * Preserves all existing data and appends new requests to their respective sections
 */

import * as ExcelJS from 'exceljs';
import { BudgetRequest } from '@/types/budget-request';

/**
 * Column definitions matching the master spreadsheet format
 */
const COLUMNS = [
  { header: 'Date of Meeting', key: 'dateOfMeeting', width: 15 },
  { header: '', key: 'notes', width: 10 }, // Notes column (B)
  { header: 'Organization', key: 'organization', width: 30 },
  { header: 'AFR\'d / Requested Amount', key: 'amount', width: 22 },
  { header: 'Amended', key: 'amended', width: 12 },
  { header: 'After Amendments', key: 'afterAmendments', width: 18 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Final Amount', key: 'finalAmount', width: 14 },
  { header: 'Name of Org', key: 'nameOfOrg', width: 30 },
  { header: 'Entered in KFS?', key: 'enteredInKFS', width: 15 },
  { header: 'Account Number', key: 'accountNumber', width: 18 },
];

/**
 * Stevens branding colors
 */
const BRANDING = {
  headerBg: 'A32638', // Stevens Red
  headerFont: 'FFFFFF', // White
};

/**
 * Apply header styling to a row
 */
function styleHeaderRow(row: ExcelJS.Row): void {
  row.height = 20;
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRANDING.headerBg },
    };
    cell.font = {
      bold: true,
      color: { argb: BRANDING.headerFont },
      size: 11,
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

/**
 * Apply styling to data rows
 */
function styleDataRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { size: 11 };
    cell.alignment = { vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'D0D0D0' } },
      left: { style: 'thin', color: { argb: 'D0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'D0D0D0' } },
      right: { style: 'thin', color: { argb: 'D0D0D0' } },
    };
  });
}

/**
 * Apply currency formatting to amount columns
 */
function applyCurrencyFormat(worksheet: ExcelJS.Worksheet): void {
  // Columns D, E, F, H are currency columns (1-indexed: 4, 5, 6, 8)
  const currencyColumns = [4, 5, 6, 8];
  currencyColumns.forEach((colNum) => {
    const column = worksheet.getColumn(colNum);
    column.numFmt = '"$"#,##0.00';
  });
}

/**
 * Add a section header row
 */
function addSectionHeader(
  worksheet: ExcelJS.Worksheet,
  title: string
): ExcelJS.Row {
  const row = worksheet.addRow([title]);
  row.height = 24;
  
  // Merge cells across all columns for section header
  worksheet.mergeCells(row.number, 1, row.number, COLUMNS.length);
  
  const cell = row.getCell(1);
  cell.font = {
    bold: true,
    size: 14,
    color: { argb: BRANDING.headerBg },
  };
  cell.alignment = {
    horizontal: 'left',
    vertical: 'middle',
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F5F5F5' },
  };
  
  return row;
}

/**
 * Add column headers row
 */
function addColumnHeaders(worksheet: ExcelJS.Worksheet): ExcelJS.Row {
  const headerRow = worksheet.addRow(COLUMNS.map((col) => col.header));
  styleHeaderRow(headerRow);
  return headerRow;
}

/**
 * Convert a BudgetRequest to a spreadsheet row
 */
function requestToRow(request: BudgetRequest, meetingDate?: string): (string | number | undefined)[] {
  const displayName = request.displayName || request.organizationName;
  
  return [
    meetingDate || '', // Date of Meeting
    '', // Notes column - left blank
    displayName, // Organization
    request.amount, // AFR'd / Requested Amount
    undefined, // Amended - left blank
    undefined, // After Amendments - left blank
    '', // Status - left blank
    undefined, // Final Amount - left blank
    displayName, // Name of Org (same as Organization)
    '', // Entered in KFS? - left blank
    request.accountNumber, // Account Number
  ];
}

/**
 * Add requests to the worksheet with proper styling
 */
function addRequests(
  worksheet: ExcelJS.Worksheet,
  requests: BudgetRequest[],
  meetingDate?: string
): void {
  requests.forEach((request) => {
    const rowData = requestToRow(request, meetingDate);
    const row = worksheet.addRow(rowData);
    styleDataRow(row);
  });
}

interface MergeOptions {
  meetingDate?: string;
}

/**
 * Merge new requests into an existing master spreadsheet
 * 
 * If master exists:
 * - Appends new AFR requests to the AFR section
 * - Appends new Reallocation requests to the Reallocation section
 * 
 * If master doesn't exist:
 * - Creates a new spreadsheet with the standard format
 * 
 * @param masterBuffer - Buffer containing the existing master spreadsheet (optional)
 * @param newRequests - Array of new BudgetRequest objects to add
 * @param options - Merge options including meeting date
 * @returns Promise resolving to a Buffer containing the merged .xlsx file
 */
export async function mergeSpreadsheet(
  masterBuffer: ArrayBuffer | null,
  newRequests: BudgetRequest[],
  options: MergeOptions = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // Separate new requests by type
  const newAfrRequests = newRequests.filter((r) => r.requestType === 'AFR');
  const newReallocationRequests = newRequests.filter((r) => r.requestType === 'Reallocation');
  
  if (masterBuffer) {
    // Load existing workbook
    await workbook.xlsx.load(masterBuffer);
    
    // Get or create the main worksheet
    let worksheet = workbook.getWorksheet('Sunday Meeting') || workbook.getWorksheet(1);
    
    if (!worksheet) {
      // Create new worksheet if none exists
      worksheet = workbook.addWorksheet('Sunday Meeting', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      
      // Set column widths
      worksheet.columns = COLUMNS.map((col) => ({
        width: col.width,
        key: col.key,
      }));
    }
    
    // Find the last row with data
    const lastRow = worksheet.lastRow?.number || 0;
    
    // Add a blank row separator if there's existing data
    if (lastRow > 0) {
      worksheet.addRow([]);
    }
    
    // Add new AFR requests if any
    if (newAfrRequests.length > 0) {
      addSectionHeader(worksheet, `New AFR Requests (${options.meetingDate || 'Pending'})`);
      addColumnHeaders(worksheet);
      addRequests(worksheet, newAfrRequests, options.meetingDate);
      
      if (newReallocationRequests.length > 0) {
        worksheet.addRow([]);
      }
    }
    
    // Add new Reallocation requests if any
    if (newReallocationRequests.length > 0) {
      addSectionHeader(worksheet, `New Reallocation Requests (${options.meetingDate || 'Pending'})`);
      addColumnHeaders(worksheet);
      addRequests(worksheet, newReallocationRequests, options.meetingDate);
    }
    
    // Apply currency formatting
    applyCurrencyFormat(worksheet);
    
  } else {
    // No master - create fresh spreadsheet
    workbook.creator = 'SGA Finance Platform';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Sunday Meeting', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    
    // Set column widths
    worksheet.columns = COLUMNS.map((col) => ({
      width: col.width,
      key: col.key,
    }));
    
    // Add AFR section if there are AFR requests
    if (newAfrRequests.length > 0) {
      addSectionHeader(worksheet, 'AFR Requests');
      addColumnHeaders(worksheet);
      addRequests(worksheet, newAfrRequests, options.meetingDate);
      
      // Add empty row between sections
      if (newReallocationRequests.length > 0) {
        worksheet.addRow([]);
      }
    }
    
    // Add Reallocation section if there are reallocation requests
    if (newReallocationRequests.length > 0) {
      addSectionHeader(worksheet, 'Reallocation Requests');
      addColumnHeaders(worksheet);
      addRequests(worksheet, newReallocationRequests, options.meetingDate);
    }
    
    // If no requests, add a placeholder
    if (newRequests.length === 0) {
      addColumnHeaders(worksheet);
      const emptyRow = worksheet.addRow(['', '', 'No pending requests', '', '', '', '', '', '', '', '']);
      styleDataRow(emptyRow);
    }
    
    // Apply currency formatting
    applyCurrencyFormat(worksheet);
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

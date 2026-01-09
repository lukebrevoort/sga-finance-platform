/**
 * Spreadsheet merger - combines new pending requests into an existing master spreadsheet
 * Preserves all existing data and appends new requests to their respective sections
 * Adds proper Excel formulas for budget tracking
 */

import * as ExcelJS from 'exceljs';
import { BudgetRequest } from '@/types/budget-request';
import { formatMeetingDateShort } from '@/lib/date-utils';

/**
 * Column definitions matching the master spreadsheet format
 * AFR Sheet columns:
 * A: Date of Meeting
 * B: Notes (blank)
 * C: Organization
 * D: AFR'd / Requested Amount
 * E: Amended (formula)
 * F: After Amendments
 * G: Status
 * H: Final Amount (formula)
 * I: Remaining Budget (only on subtotal rows)
 * J: Name of Org
 * K: Entered in KFS?
 * L: Account Number
 */
const AFR_COLUMNS = [
  { header: 'Date of Meeting', key: 'dateOfMeeting', width: 15 },
  { header: '', key: 'notes', width: 10 }, // Notes column (B)
  { header: 'Organization', key: 'organization', width: 30 },
  { header: 'AFR\'d / Requested Amount', key: 'amount', width: 22 },
  { header: 'Amended', key: 'amended', width: 12 },
  { header: 'After Amendments', key: 'afterAmendments', width: 18 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Final Amount', key: 'finalAmount', width: 14 },
  { header: 'Remaining Budget', key: 'remainingBudget', width: 18 },
  { header: 'Name of Org', key: 'nameOfOrg', width: 30 },
  { header: 'Entered in KFS?', key: 'enteredInKFS', width: 15 },
  { header: 'Account Number', key: 'accountNumber', width: 18 },
];

/**
 * Reallocation sheet columns - simpler format
 * A: Date
 * B: Organization
 * C: Requested Amount
 * D: Account Number
 */
const REALLOCATION_COLUMNS = [
  { header: 'Date', key: 'date', width: 15 },
  { header: 'Organization', key: 'organization', width: 30 },
  { header: 'Requested Amount', key: 'amount', width: 18 },
  { header: 'Account Number', key: 'accountNumber', width: 18 },
];

/**
 * Stevens branding colors
 */
const BRANDING = {
  headerBg: 'A32638', // Stevens Red
  headerFont: 'FFFFFF', // White
  subtotalBg: 'E8E8E8', // Light gray for subtotal rows
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
 * Apply styling to subtotal rows (Weekly Subtotal)
 */
function styleSubtotalRow(row: ExcelJS.Row): void {
  row.height = 22; // Taller row for visibility
  row.eachCell((cell) => {
    cell.font = { size: 12, bold: true, color: { argb: '333333' } };
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D9E2F3' }, // Light blue background
    };
    cell.border = {
      top: { style: 'medium', color: { argb: '4472C4' } },
      left: { style: 'thin', color: { argb: '4472C4' } },
      bottom: { style: 'thin', color: { argb: '4472C4' } },
      right: { style: 'thin', color: { argb: '4472C4' } },
    };
  });
}

/**
 * Apply styling to remaining budget rows
 */
function styleRemainingBudgetRow(row: ExcelJS.Row): void {
  row.height = 26; // Extra tall for emphasis
  row.eachCell((cell) => {
    cell.font = { size: 14, bold: true, color: { argb: BRANDING.headerBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2CC' }, // Light yellow/gold background
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'DFA500' } },
      left: { style: 'thin', color: { argb: 'DFA500' } },
      bottom: { style: 'medium', color: { argb: 'DFA500' } },
      right: { style: 'thin', color: { argb: 'DFA500' } },
    };
  });
}

/**
 * Apply currency formatting to AFR amount columns
 */
function applyAFRCurrencyFormat(worksheet: ExcelJS.Worksheet): void {
  // Columns D, E, F, H, I are currency columns (1-indexed: 4, 5, 6, 8, 9)
  const currencyColumns = [4, 5, 6, 8, 9];
  currencyColumns.forEach((colNum) => {
    const column = worksheet.getColumn(colNum);
    column.numFmt = '"$"#,##0.00';
  });
}

/**
 * Apply currency formatting to Reallocation amount column
 */
function applyReallocationCurrencyFormat(worksheet: ExcelJS.Worksheet): void {
  // Column C is the amount column (1-indexed: 3)
  const column = worksheet.getColumn(3);
  column.numFmt = '"$"#,##0.00';
}

/**
 * Add a section header row
 */
function addSectionHeader(
  worksheet: ExcelJS.Worksheet,
  title: string,
  columnCount: number
): ExcelJS.Row {
  const row = worksheet.addRow([title]);
  row.height = 24;
  
  // Merge cells across all columns for section header
  worksheet.mergeCells(row.number, 1, row.number, columnCount);
  
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
 * Add AFR column headers row
 */
function addAFRColumnHeaders(worksheet: ExcelJS.Worksheet): ExcelJS.Row {
  const headerRow = worksheet.addRow(AFR_COLUMNS.map((col) => col.header));
  styleHeaderRow(headerRow);
  return headerRow;
}

/**
 * Add Reallocation column headers row
 */
function addReallocationColumnHeaders(worksheet: ExcelJS.Worksheet): ExcelJS.Row {
  const headerRow = worksheet.addRow(REALLOCATION_COLUMNS.map((col) => col.header));
  styleHeaderRow(headerRow);
  return headerRow;
}

/**
 * Add AFR requests to the worksheet with proper formulas
 * Returns the row numbers of the first and last data rows
 */
function addAFRRequests(
  worksheet: ExcelJS.Worksheet,
  requests: BudgetRequest[],
  meetingDate?: string
): { firstDataRow: number; lastDataRow: number } {
  const firstDataRow = worksheet.lastRow ? worksheet.lastRow.number + 1 : 1;
  
  requests.forEach((request, index) => {
    const displayName = request.displayName || request.organizationName;
    const rowNumber = worksheet.lastRow ? worksheet.lastRow.number + 1 : 1;
    
    // Only show date on first row of this week's data
    const dateValue = index === 0 ? (meetingDate || '') : '';
    
    const row = worksheet.addRow([
      dateValue, // A: Date of Meeting
      '', // B: Notes column - left blank
      displayName, // C: Organization
      request.amount, // D: AFR'd / Requested Amount
      { formula: `D${rowNumber}-F${rowNumber}` }, // E: Amended = AFR'd - After Amendments
      null, // F: After Amendments - left blank for manual entry
      '', // G: Status - left blank for manual entry (dropdown)
      { formula: `IF(G${rowNumber}="Approved",F${rowNumber},0)` }, // H: Final Amount
      null, // I: Remaining Budget - only on subtotal rows
      displayName, // J: Name of Org (same as Organization)
      '', // K: Entered in KFS? - left blank
      request.accountNumber, // L: Account Number
    ]);
    styleDataRow(row);
    
    // Add data validation for Status column (G) - dropdown with Approved/Denied
    row.getCell(7).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Approved,Denied"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Status',
      error: 'Please select either Approved or Denied',
    };
  });
  
  const lastDataRow = worksheet.lastRow ? worksheet.lastRow.number : firstDataRow;
  
  return { firstDataRow, lastDataRow };
}

/**
 * Add weekly subtotal and remaining budget rows after AFR data
 */
function addWeeklySubtotalRows(
  worksheet: ExcelJS.Worksheet,
  firstDataRow: number,
  lastDataRow: number,
  previousRemainingCell: string | null,
  initialBudgetCell: string
): { subtotalRow: number; remainingRow: number } {
  // Add Weekly Subtotal row
  const subtotalRowData = new Array(AFR_COLUMNS.length).fill('');
  subtotalRowData[6] = 'Weekly Subtotal:'; // Column G
  
  const subtotalRow = worksheet.addRow(subtotalRowData);
  const subtotalRowNumber = subtotalRow.number;
  
  // Add SUM formula for Final Amount column (H)
  subtotalRow.getCell(8).value = { formula: `SUM(H${firstDataRow}:H${lastDataRow})` };
  styleSubtotalRow(subtotalRow);
  
  // Add Remaining Budget row
  const remainingRowData = new Array(AFR_COLUMNS.length).fill('');
  remainingRowData[6] = 'Remaining Budget:'; // Column G
  
  const remainingRow = worksheet.addRow(remainingRowData);
  const remainingRowNumber = remainingRow.number;
  
  // Add formula for Remaining Budget column (I)
  // For first week: =initialBudgetCell-H{subtotalRow}
  // For subsequent weeks: ={previousRemainingCell}-H{subtotalRow}
  if (previousRemainingCell) {
    remainingRow.getCell(9).value = { formula: `${previousRemainingCell}-H${subtotalRowNumber}` };
  } else {
    remainingRow.getCell(9).value = { formula: `${initialBudgetCell}-H${subtotalRowNumber}` };
  }
  styleRemainingBudgetRow(remainingRow);
  
  return { subtotalRow: subtotalRowNumber, remainingRow: remainingRowNumber };
}

/**
 * Add Reallocation requests to the worksheet (simple append, no formulas)
 */
function addReallocationRequests(
  worksheet: ExcelJS.Worksheet,
  requests: BudgetRequest[],
  meetingDate?: string
): void {
  requests.forEach((request, index) => {
    const displayName = request.displayName || request.organizationName;
    
    // Only show date on first row of this week's data
    const dateValue = index === 0 ? (meetingDate || '') : '';
    
    const row = worksheet.addRow([
      dateValue, // A: Date
      displayName, // B: Organization
      request.amount, // C: Requested Amount
      request.accountNumber, // D: Account Number
    ]);
    styleDataRow(row);
  });
}

/**
 * Find the last remaining budget cell in the AFR worksheet
 * Returns the cell reference (e.g., "I15") or null if not found
 */
function findLastRemainingBudgetCell(worksheet: ExcelJS.Worksheet): string | null {
  let lastRemainingCell: string | null = null;
  
  worksheet.eachRow((row, rowNumber) => {
    const cellG = row.getCell(7); // Column G (1-indexed)
    if (cellG.value && typeof cellG.value === 'string' && 
        cellG.value.toLowerCase().includes('remaining budget')) {
      lastRemainingCell = `I${rowNumber}`;
    }
  });
  
  return lastRemainingCell;
}

interface MergeOptions {
  meetingDate?: string;
  /** Cell reference for initial budget (e.g., "I1"). Defaults to "I1" */
  initialBudgetCell?: string;
}

/**
 * Merge new requests into an existing master spreadsheet
 * 
 * If master exists:
 * - Appends new AFR requests to the AFR sheet with formulas
 * - Appends new Reallocation requests to the Reallocation sheet
 * - Adds weekly subtotal and remaining budget rows
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
  const initialBudgetCell = options.initialBudgetCell || 'I1';
  
  // Format the meeting date if provided
  let formattedMeetingDate = options.meetingDate;
  if (options.meetingDate) {
    // Try to parse and format the date
    const dateObj = new Date(options.meetingDate);
    if (!isNaN(dateObj.getTime())) {
      formattedMeetingDate = formatMeetingDateShort(dateObj);
    }
  }
  
  // Separate new requests by type
  const newAfrRequests = newRequests.filter((r) => r.requestType === 'AFR');
  const newReallocationRequests = newRequests.filter((r) => r.requestType === 'Reallocation');
  
  if (masterBuffer) {
    // Load existing workbook
    await workbook.xlsx.load(masterBuffer);
    
    // Handle AFR sheet
    // Support both legacy and new master-generator sheet names
    let afrWorksheet =
      workbook.getWorksheet('AFR Requests') ||
      workbook.getWorksheet('AFR') ||
      workbook.getWorksheet('Sunday Meeting') ||
      workbook.getWorksheet(1);
    
    if (!afrWorksheet) {
      afrWorksheet = workbook.addWorksheet('AFR Requests', {
        views: [{ state: 'frozen', ySplit: 2 }],
      });
      afrWorksheet.columns = AFR_COLUMNS.map((col) => ({
        width: col.width,
        key: col.key,
      }));
    }
    
    // Handle Reallocation sheet
    // Support both legacy and new master-generator sheet names
    let reallocationWorksheet =
      workbook.getWorksheet('Reallocation Requests') || workbook.getWorksheet('Reallocation');
    
    if (!reallocationWorksheet && newReallocationRequests.length > 0) {
      reallocationWorksheet = workbook.addWorksheet('Reallocation Requests', {
        views: [{ state: 'frozen', ySplit: 2 }],
      });
      reallocationWorksheet.columns = REALLOCATION_COLUMNS.map((col) => ({
        width: col.width,
        key: col.key,
      }));
      addReallocationColumnHeaders(reallocationWorksheet);
    }
    
    // Add new AFR requests if any
    if (newAfrRequests.length > 0) {
      // Find the last remaining budget cell to chain the formula
      const previousRemainingCell = findLastRemainingBudgetCell(afrWorksheet);
      
      // Add a blank row separator if there's existing data
      const lastRow = afrWorksheet.lastRow?.number || 0;
      
      if (lastRow > 0) {
        afrWorksheet.addRow([]);
      }
      
      // Add section header
      addSectionHeader(afrWorksheet, `Week of ${formattedMeetingDate || 'Pending'}`, AFR_COLUMNS.length);

      // Only add column headers when we are creating a new "weekly section" style sheet.
      // For the semester master (generated by master-generator.ts), the column headers already exist on Row 2.
      const existingHeaderCellA2 = afrWorksheet.getCell('A2')?.value;
      
      const hasMasterHeader =
        typeof existingHeaderCellA2 === 'string' &&
        existingHeaderCellA2.toLowerCase().includes('date');
      
      if (!hasMasterHeader) {
        addAFRColumnHeaders(afrWorksheet);
      }
      
      // Add the AFR requests with formulas
      const { firstDataRow, lastDataRow } = addAFRRequests(
        afrWorksheet, 
        newAfrRequests, 
        formattedMeetingDate
      );
      
      // Add weekly subtotal and remaining budget rows
      addWeeklySubtotalRows(
        afrWorksheet,
        firstDataRow,
        lastDataRow,
        previousRemainingCell,
        initialBudgetCell
      );
      
      // Apply currency formatting
      applyAFRCurrencyFormat(afrWorksheet);
    }
    
    // Add new Reallocation requests if any
    if (newReallocationRequests.length > 0 && reallocationWorksheet) {
      addReallocationRequests(reallocationWorksheet, newReallocationRequests, formattedMeetingDate);
      applyReallocationCurrencyFormat(reallocationWorksheet);
    }
    
  } else {
    // No master - create fresh spreadsheet
    workbook.creator = 'SGA Finance Platform';
    workbook.created = new Date();
    
    // Create AFR worksheet
    const afrWorksheet = workbook.addWorksheet('AFR', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    
    afrWorksheet.columns = AFR_COLUMNS.map((col) => ({
      width: col.width,
      key: col.key,
    }));
    
    // Add initial budget row (row 2 after header)
    addAFRColumnHeaders(afrWorksheet);
    
    // Add a row for initial budget (this will be row 2)
    const budgetRow = afrWorksheet.addRow([
      '', // A
      '', // B
      'Initial Budget', // C
      '', // D
      '', // E
      '', // F
      '', // G
      '', // H
      null, // I - This is where user enters initial budget
      '', // J
      '', // K
      '', // L
    ]);
    styleDataRow(budgetRow);
    budgetRow.getCell(9).note = 'Enter the initial budget amount here';
    
    // Add AFR section if there are AFR requests
    if (newAfrRequests.length > 0) {
      afrWorksheet.addRow([]); // Blank separator row
      
      addSectionHeader(afrWorksheet, `Week of ${formattedMeetingDate || 'Pending'}`, AFR_COLUMNS.length);
      addAFRColumnHeaders(afrWorksheet);
      
      // Add the AFR requests with formulas
      const { firstDataRow, lastDataRow } = addAFRRequests(
        afrWorksheet, 
        newAfrRequests, 
        formattedMeetingDate
      );
      
      // Add weekly subtotal and remaining budget rows
      // For new spreadsheet, this is the first week so previousRemainingCell is null
      addWeeklySubtotalRows(
        afrWorksheet,
        firstDataRow,
        lastDataRow,
        null, // No previous remaining cell
        initialBudgetCell
      );
    }
    
    // Apply currency formatting
    applyAFRCurrencyFormat(afrWorksheet);
    
    // Create Reallocation worksheet if there are reallocation requests
    if (newReallocationRequests.length > 0) {
      const reallocationWorksheet = workbook.addWorksheet('Reallocation Requests', {
        views: [{ state: 'frozen', ySplit: 2 }],
      });
      
      reallocationWorksheet.columns = REALLOCATION_COLUMNS.map((col) => ({
        width: col.width,
        key: col.key,
      }));
      
      addReallocationColumnHeaders(reallocationWorksheet);
      addReallocationRequests(reallocationWorksheet, newReallocationRequests, formattedMeetingDate);
      applyReallocationCurrencyFormat(reallocationWorksheet);
    }
    
    // If no requests at all, add placeholder
    if (newRequests.length === 0) {
      // AFR worksheet already has headers and initial budget row
      // Just add a note that no requests are pending
    }
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

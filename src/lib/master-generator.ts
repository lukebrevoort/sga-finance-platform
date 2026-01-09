/**
 * Master Spreadsheet Generator for SGA Finance Platform
 * Creates a new semester master spreadsheet with AFR and Reallocation tracking sheets
 * Uses ExcelJS to create .xlsx files
 */

import * as ExcelJS from 'exceljs';

/**
 * Options for generating a master spreadsheet
 */
export interface MasterOptions {
  semesterName: string;
  startingBudget: number;
  meetingDate?: Date;
}

/**
 * Stevens branding colors
 */
const BRANDING = {
  headerBg: 'A32638', // Stevens Red
  headerFont: 'FFFFFF', // White
};

/**
 * Column definitions for AFR Requests sheet
 */
const AFR_COLUMNS = [
  { header: 'Date of Meeting', key: 'dateOfMeeting', width: 15 },
  { header: 'Notes', key: 'notes', width: 12 },
  { header: 'Organization', key: 'organization', width: 30 },
  { header: "AFR'd", key: 'afrd', width: 14 },
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
 * Column definitions for Reallocation Requests sheet
 */
const REALLOCATION_COLUMNS = [
  { header: 'Date of Meeting', key: 'dateOfMeeting', width: 15 },
  { header: 'Notes', key: 'notes', width: 12 },
  { header: 'Organization', key: 'organization', width: 30 },
  { header: 'Requested Amount', key: 'requestedAmount', width: 18 },
  { header: 'Approved Amount', key: 'approvedAmount', width: 18 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Account Number', key: 'accountNumber', width: 18 },
];

/**
 * Apply header styling to a row (Stevens branding)
 */
function styleHeaderRow(row: ExcelJS.Row): void {
  row.height = 22;
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
      name: 'Arial',
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
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
 * Style the semester header row (Row 2)
 */
function styleSemesterRow(row: ExcelJS.Row, budgetCell?: ExcelJS.Cell): void {
  row.height = 20;
  row.eachCell((cell) => {
    cell.font = {
      bold: true,
      size: 12,
      name: 'Arial',
      color: { argb: '1E1E1E' },
    };
    cell.alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };
  });

  // Special styling for budget cell
  if (budgetCell) {
    budgetCell.font = {
      bold: true,
      size: 12,
      name: 'Arial',
      color: { argb: BRANDING.headerBg },
    };
    budgetCell.alignment = {
      horizontal: 'right',
      vertical: 'middle',
    };
  }
}

/**
 * Apply currency formatting to specified columns
 */
function applyCurrencyFormat(
  worksheet: ExcelJS.Worksheet,
  columnIndices: number[]
): void {
  columnIndices.forEach((colNum) => {
    const column = worksheet.getColumn(colNum);
    column.numFmt = '"$"#,##0.00';
  });
}

/**
 * Format date for display (e.g., "1/12/2025")
 */
function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/**
 * Create the AFR Requests worksheet
 */
function createAFRSheet(
  workbook: ExcelJS.Workbook,
  options: MasterOptions
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet('AFR Requests', {
    views: [{ state: 'frozen', ySplit: 2 }], // Freeze first 2 rows (title + column headers)
  });

  // Set column widths
  worksheet.columns = AFR_COLUMNS.map((col) => ({
    width: col.width,
    key: col.key,
  }));

  // Row 1: Title header with semester name and starting budget
  const titleRow = worksheet.addRow([]);
  titleRow.height = 36;
  
  // Merge cells A1:H1 for the title
  worksheet.mergeCells('A1:H1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = options.semesterName;
  titleCell.font = {
    bold: true,
    size: 20,
    name: 'Arial',
    color: { argb: BRANDING.headerBg },
  };
  titleCell.alignment = {
    horizontal: 'left',
    vertical: 'middle',
  };

  // Starting budget in column I (Remaining Budget column)
  const budgetCell = worksheet.getCell('I1');
  budgetCell.value = options.startingBudget;
  budgetCell.font = {
    bold: true,
    size: 16,
    name: 'Arial',
    color: { argb: '1E1E1E' },
  };
  budgetCell.alignment = {
    horizontal: 'right',
    vertical: 'middle',
  };
  budgetCell.numFmt = '"Starting Budget: "$#,##0.00';

  // Row 2: Column headers
  const headerValues = AFR_COLUMNS.map((col) => col.header);
  const headerRow = worksheet.addRow(headerValues);
  styleHeaderRow(headerRow);

  // Apply currency formatting to amount columns: D (4), E (5), F (6), H (8), I (9)
  applyCurrencyFormat(worksheet, [4, 5, 6, 8, 9]);

  // Note: Data validation for Status column (G) is applied dynamically when rows are added
  // via the spreadsheet-merger. This avoids pre-creating 1000+ empty rows which would
  // cause issues with worksheet.lastRow calculations during merge operations.

  return worksheet;
}

/**
 * Create the Reallocation Requests worksheet
 */
function createReallocationSheet(
  workbook: ExcelJS.Workbook,
  options: MasterOptions
): ExcelJS.Worksheet {
  const worksheet = workbook.addWorksheet('Reallocation Requests', {
    views: [{ state: 'frozen', ySplit: 2 }], // Freeze first 2 rows (title + column headers)
  });

  // Set column widths
  worksheet.columns = REALLOCATION_COLUMNS.map((col) => ({
    width: col.width,
    key: col.key,
  }));

  // Row 1: Title header with semester name
  const titleRow = worksheet.addRow([]);
  titleRow.height = 36;
  
  // Merge cells A1:E1 for the title
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${options.semesterName} - Reallocations`;
  titleCell.font = {
    bold: true,
    size: 20,
    name: 'Arial',
    color: { argb: BRANDING.headerBg },
  };
  titleCell.alignment = {
    horizontal: 'left',
    vertical: 'middle',
  };

  // Row 2: Column headers
  const headerValues = REALLOCATION_COLUMNS.map((col) => col.header);
  const headerRow = worksheet.addRow(headerValues);
  styleHeaderRow(headerRow);

  // Apply currency formatting to amount columns: D (4), E (5)
  applyCurrencyFormat(worksheet, [4, 5]);

  // Note: Data validation for Status column (F) is applied dynamically when rows are added
  // via the spreadsheet-merger. This avoids pre-creating 1000+ empty rows which would
  // cause issues with worksheet.lastRow calculations during merge operations.

  return worksheet;
}

/**
 * Generate a master spreadsheet for a new semester
 *
 * Creates a workbook with two sheets:
 * - AFR Requests: Tracks Additional Funding Requests with budget pool
 * - Reallocation Requests: Tracks reallocation requests (no budget pool)
 *
 * @param options - Configuration options for the master spreadsheet
 * @returns Promise resolving to a Buffer containing the .xlsx file
 */
export async function generateMasterSpreadsheet(
  options: MasterOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SGA Finance Platform';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create both sheets
  createAFRSheet(workbook, options);
  createReallocationSheet(workbook, options);

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Column indices for reference (1-indexed for ExcelJS)
 */
export const AFR_COLUMN_INDICES = {
  dateOfMeeting: 1,
  notes: 2,
  organization: 3,
  afrd: 4,
  amended: 5,
  afterAmendments: 6,
  status: 7,
  finalAmount: 8,
  remainingBudget: 9,
  nameOfOrg: 10,
  enteredInKFS: 11,
  accountNumber: 12,
} as const;

export const REALLOCATION_COLUMN_INDICES = {
  dateOfMeeting: 1,
  notes: 2,
  organization: 3,
  requestedAmount: 4,
  approvedAmount: 5,
  status: 6,
  accountNumber: 7,
} as const;

/**
 * Row indices for reference (1-indexed for ExcelJS)
 */
export const HEADER_ROW = 1;  // Title row
export const COLUMN_HEADER_ROW = 2;  // Column headers row
export const DATA_START_ROW = 3;  // First data row

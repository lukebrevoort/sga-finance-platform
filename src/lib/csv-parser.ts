/**
 * CSV Parser for CampusGroups budget request exports
 * 
 * Parses CSV files exported from CampusGroups and maps them to BudgetRequest objects.
 */

import Papa from 'papaparse';
import type { BudgetRequest, CSVParseResult, CSVType } from '@/types/budget-request';
import { validateCSV } from './csv-validator';

// CampusGroups column name mappings
const CSV_COLUMNS = {
  submissionId: 'Submission Id',
  organizationName: 'Please enter the name of the organization this request is for:',
  requestType: 'What type of request is this?',
  afrAmount: 'Total Cost of AFR:',
  reallocationAmount: 'Total Amount to Reallocate:',
  approvalStatus: 'Approval Status',
  // Note: There are two "Finance Review" columns - one for AFR, one for Reallocation
  // Papa Parse will rename duplicates, so we check both
  financeReviewAFR: 'Finance Review',
  financeReviewReallocation: 'Finance Review_1', // Papa Parse auto-renames duplicates
  afrDescription: 'Please explain the details of the Additional Funding Request. Be sure to include what each budget line item is used for and the items being purchases. Be sure to include the specific amount(s) you would like to request. Be as specific as possible to improve approval odds.',
  reallocationDescription: 'Please explain the details of the reallocation request. Be sure to include what budget line item you want the money to come from and go to. Be sure to include the specific amount(s) you would like to reallocate. Be as specific as possible to improve approval odds.',
  accountNumber: 'Please list the account number you would like any additional approved funds to be deposited into:',
  submittedOn: 'Submitted On',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
} as const;

// Required columns that must exist in the CSV
const REQUIRED_COLUMNS = [
  CSV_COLUMNS.submissionId,
  CSV_COLUMNS.organizationName,
  CSV_COLUMNS.requestType,
  CSV_COLUMNS.approvalStatus,
  CSV_COLUMNS.submittedOn,
  CSV_COLUMNS.firstName,
  CSV_COLUMNS.lastName,
  CSV_COLUMNS.email,
];

/**
 * Parse a currency string to a number
 * Handles formats like "$1,234.56", "1234.56", "$100", etc.
 */
function parseCurrency(value: string | undefined | null): number {
  if (!value || typeof value !== 'string') {
    return 0;
  }
  
  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, '').trim();
  
  if (!cleaned) {
    return 0;
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a date string from CampusGroups format
 * Expected format: "1/9/2026 12:19:03 PM" or similar
 */
function parseDate(value: string | undefined | null): Date {
  if (!value || typeof value !== 'string') {
    return new Date();
  }
  
  const trimmed = value.trim();
  if (!trimmed) {
    return new Date();
  }
  
  const parsed = new Date(trimmed);
  
  // Check if date is valid
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  
  return parsed;
}

/**
 * Normalize approval status to expected values
 */
function normalizeApprovalStatus(value: string | undefined | null): BudgetRequest['approvalStatus'] {
  if (!value || typeof value !== 'string') {
    return 'Pending Approval';
  }
  
  const normalized = value.trim().toLowerCase();
  
  if (normalized === 'approved') {
    return 'Approved';
  } else if (normalized === 'pending approval' || normalized === 'pending') {
    return 'Pending Approval';
  } else if (normalized === 'denied' || normalized === 'rejected') {
    return 'Denied';
  }
  
  // Default to Pending Approval for unknown values
  return 'Pending Approval';
}

/**
 * Normalize finance route to expected values
 */
function normalizeFinanceRoute(value: string | undefined | null): BudgetRequest['financeRoute'] {
  if (!value || typeof value !== 'string') {
    return 'Sunday Meeting';
  }
  
  const normalized = value.trim().toLowerCase();
  
  if (normalized === 'auto-approve' || normalized === 'auto approve' || normalized === 'autoapprove') {
    return 'Auto-Approve';
  } else if (normalized === 'budget review') {
    return 'Budget Review';
  } else if (normalized === 'sunday meeting') {
    return 'Sunday Meeting';
  }
  
  // Default to Sunday Meeting for unknown values
  return 'Sunday Meeting';
}

/**
 * Normalize request type to expected values
 * Handles common typos like "rellocation" for "reallocation"
 */
function normalizeRequestType(value: string | undefined | null): BudgetRequest['requestType'] {
  if (!value || typeof value !== 'string') {
    return 'AFR';
  }

  const normalized = value.trim().toLowerCase();

  // Check for reallocation (including common typo "rellocation")
  // Also handles variations like "re-allocation", "re allocation"
  if (normalized.includes('realloc') || normalized.includes('re alloc')) {
    return 'Reallocation';
  }

  // Default to AFR (Additional Funding Request)
  return 'AFR';
}

/**
 * Get a string value from a row, handling undefined/null
 */
function getString(row: Record<string, string>, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Check if required columns exist in the CSV
 */
function validateColumns(headers: string[]): { valid: boolean; missing: string[] } {
  const headerSet = new Set(headers.map(h => h.trim()));
  const missing: string[] = [];
  
  for (const col of REQUIRED_COLUMNS) {
    if (!headerSet.has(col)) {
      missing.push(col);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Parse a single CSV row into a BudgetRequest
 */
function parseRow(row: Record<string, string>, rowIndex: number, warnings: string[]): BudgetRequest | null {
  const submissionId = getString(row, CSV_COLUMNS.submissionId);
  
  // Skip rows without a submission ID
  if (!submissionId) {
    return null;
  }
  
  const organizationName = getString(row, CSV_COLUMNS.organizationName);
  if (!organizationName) {
    warnings.push(`Row ${rowIndex + 1}: Missing organization name, skipping`);
    return null;
  }
  
  const requestType = normalizeRequestType(getString(row, CSV_COLUMNS.requestType));
  
  // Get amount based on request type
  let amount: number;
  if (requestType === 'AFR') {
    amount = parseCurrency(getString(row, CSV_COLUMNS.afrAmount));
  } else {
    amount = parseCurrency(getString(row, CSV_COLUMNS.reallocationAmount));
  }
  
  // Get description based on request type
  let description: string;
  if (requestType === 'AFR') {
    description = getString(row, CSV_COLUMNS.afrDescription);
  } else {
    description = getString(row, CSV_COLUMNS.reallocationDescription);
  }
  
  // Get finance route based on request type
  let financeRoute: BudgetRequest['financeRoute'];
  if (requestType === 'AFR') {
    financeRoute = normalizeFinanceRoute(getString(row, CSV_COLUMNS.financeReviewAFR));
  } else {
    // Try the reallocation column first, fall back to AFR column
    const reallocationRoute = getString(row, CSV_COLUMNS.financeReviewReallocation);
    financeRoute = normalizeFinanceRoute(reallocationRoute || getString(row, CSV_COLUMNS.financeReviewAFR));
  }
  
  const approvalStatus = normalizeApprovalStatus(getString(row, CSV_COLUMNS.approvalStatus));
  const accountNumber = getString(row, CSV_COLUMNS.accountNumber);
  const submittedOn = parseDate(getString(row, CSV_COLUMNS.submittedOn));
  
  const firstName = getString(row, CSV_COLUMNS.firstName);
  const lastName = getString(row, CSV_COLUMNS.lastName);
  const submitterName = `${firstName} ${lastName}`.trim();
  const submitterEmail = getString(row, CSV_COLUMNS.email);
  
  return {
    submissionId,
    organizationName,
    requestType,
    amount,
    description,
    approvalStatus,
    financeRoute,
    accountNumber,
    submittedOn,
    submitterName,
    submitterEmail,
  };
}

/**
 * Parse a CSV string into BudgetRequest objects
 * 
 * @param csvString - The raw CSV string content
 * @returns CSVParseResult with parsed requests, type detection, and any warnings/errors
 */
export function parseCSV(csvString: string): CSVParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const requests: BudgetRequest[] = [];
  
  // Handle empty input
  if (!csvString || typeof csvString !== 'string' || !csvString.trim()) {
    return {
      type: 'unknown',
      requests: [],
      warnings: [],
      errors: ['CSV content is empty'],
    };
  }
  
  // Remove BOM if present
  const cleanedCSV = csvString.replace(/^\uFEFF/, '');
  
  // Parse CSV with Papa Parse
  const parseResult = Papa.parse<Record<string, string>>(cleanedCSV, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  
  // Check for parsing errors
  if (parseResult.errors.length > 0) {
    for (const error of parseResult.errors) {
      if (error.type === 'FieldMismatch') {
        warnings.push(`Row ${error.row}: Field count mismatch - ${error.message}`);
      } else {
        errors.push(`Parse error: ${error.message}`);
      }
    }
  }
  
  // Validate required columns
  const headers = parseResult.meta.fields || [];
  const columnValidation = validateColumns(headers);
  
  if (!columnValidation.valid) {
    for (const missing of columnValidation.missing) {
      errors.push(`Missing required column: '${missing}'. Please ensure you're exporting the correct report from CampusGroups.`);
    }
    
    // If critical columns are missing, return early
    if (errors.length > 0) {
      return {
        type: 'unknown',
        requests: [],
        warnings,
        errors,
      };
    }
  }
  
  // Parse each row
  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const request = parseRow(row, i, warnings);
    
    if (request) {
      requests.push(request);
    }
  }
  
  // Check if we got any valid requests
  if (requests.length === 0) {
    return {
      type: 'unknown',
      requests: [],
      warnings,
      errors: [...errors, 'No valid budget requests found in CSV'],
    };
  }
  
  // Validate and determine CSV type
  const validation = validateCSV(requests);
  
  return {
    type: validation.type,
    requests,
    warnings: [...warnings, ...validation.warnings],
    errors: [...errors, ...validation.errors],
  };
}

/**
 * Export column definitions for reference
 */
export { CSV_COLUMNS, REQUIRED_COLUMNS };

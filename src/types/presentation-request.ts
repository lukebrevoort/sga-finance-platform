/**
 * Type definitions for generating PowerPoint presentations from weekly spreadsheets
 */

/**
 * Represents a single row from the weekly spreadsheet parsed for presentation
 */
export interface SpreadsheetRow {
  /** Organization name as displayed in the spreadsheet */
  organization: string;
  /** Requested/AFR'd amount from the original request */
  requestedAmount: number;
  /** Amount after amendments (if any) */
  afterAmendments: number | null;
  /** Status from the meeting (Approved/Denied) */
  status: 'Approved' | 'Denied' | null;
  /** Final approved amount */
  finalAmount: number;
  /** Notes column - contains description from CSV */
  notes: string;
  /** Account number for the organization */
  accountNumber: string;
}

/**
 * Represents a week's worth of budget requests parsed from the spreadsheet
 */
export interface ParsedWeek {
  /** Display date (e.g., "2/1", "2/8") extracted from "Week of X" header */
  date: string;
  /** ISO date string for sorting and API usage */
  dateISO: string;
  /** AFR requests for this week */
  afrRequests: SpreadsheetRow[];
  /** Reallocation requests for this week */
  reallocationRequests: SpreadsheetRow[];
}

/**
 * Represents a request ready for PowerPoint generation
 * Derived from SpreadsheetRow with additional computed properties
 */
export interface PresentationRequest {
  /** Organization name with numbering (e.g., "SGA 1", "SGA 2") */
  organizationName: string;
  /** Display name used on slide - same as organizationName for now */
  displayName: string;
  /** Original requested amount from CSV */
  requestedAmount: number;
  /** Final approved amount after meeting review */
  finalAmount: number;
  /** Whether this request was approved or denied */
  status: 'Approved' | 'Denied';
  /** Description from Notes column (treasurer's description from CSV) */
  description: string;
  /** 
   * Finance route extracted from Notes if pre-approved
   * Will be "Auto-Approve", "Budget Review", or "Sunday Meeting" 
   */
  financeRoute: string;
  /** Type of request */
  requestType: 'AFR' | 'Reallocation';
  /** True if finalAmount !== requestedAmount (request was amended) */
  wasAmended: boolean;
  /** Account number for reference */
  accountNumber: string;
}

/**
 * Result from parsing a weekly spreadsheet
 */
export interface ParseSpreadsheetResult {
  /** Array of parsed weeks, sorted by date (most recent first) */
  weeks: ParsedWeek[];
  /** Any warnings encountered during parsing */
  warnings: string[];
  /** Any errors encountered during parsing */
  errors: string[];
}

/**
 * Summary information for a week (used in week selector)
 */
export interface WeekSummary {
  /** Display date (e.g., "2/1") */
  date: string;
  /** ISO date string */
  dateISO: string;
  /** Total number of requests in this week */
  requestCount: number;
  /** Number of approved requests */
  approvedCount: number;
  /** Number of denied requests */
  deniedCount: number;
  /** Total AFR requests */
  afrCount: number;
  /** Total reallocation requests */
  reallocationCount: number;
}

/**
 * Extract finance route from notes if it's a pre-approved request
 * Notes format for pre-approved: "[Finance Route]: [Description]"
 * 
 * @param notes - Notes column value
 * @returns Object with financeRoute and description extracted
 */
export function parseNotesColumn(notes: string): { financeRoute: string; description: string } {
  if (!notes) {
    return { financeRoute: 'Sunday Meeting', description: '' };
  }
  
  // Check for pre-approved format: "Auto-Approve: description" or "Budget Review: description"
  const preApprovedMatch = notes.match(/^(Auto-Approve|Budget Review):\s*(.*)$/i);
  
  if (preApprovedMatch) {
    return {
      financeRoute: preApprovedMatch[1],
      description: preApprovedMatch[2].trim(),
    };
  }
  
  // For Sunday Meeting requests, the whole notes is the description
  return {
    financeRoute: 'Sunday Meeting',
    description: notes.trim(),
  };
}

/**
 * Convert a SpreadsheetRow to a PresentationRequest
 * 
 * @param row - Parsed spreadsheet row
 * @param requestType - AFR or Reallocation
 * @returns PresentationRequest ready for PPTX generation
 */
export function rowToPresentationRequest(
  row: SpreadsheetRow,
  requestType: 'AFR' | 'Reallocation'
): PresentationRequest | null {
  // Skip rows without a valid status
  if (!row.status) {
    return null;
  }
  
  // Parse notes to extract finance route and description
  const { financeRoute, description } = parseNotesColumn(row.notes);
  
  // Determine the actual final amount based on request type
  // For AFR: use afterAmendments if available, otherwise requestedAmount if approved
  // For Reallocation: use finalAmount
  const finalAmount = row.finalAmount || row.afterAmendments || 0;
  
  return {
    organizationName: row.organization,
    displayName: row.organization,
    requestedAmount: row.requestedAmount,
    finalAmount: row.status === 'Approved' ? finalAmount : 0,
    status: row.status,
    description,
    financeRoute,
    requestType,
    wasAmended: finalAmount !== row.requestedAmount,
    accountNumber: row.accountNumber,
  };
}

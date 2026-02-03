/**
 * Core type definitions for budget requests from CampusGroups
 */

export type RequestType = 'AFR' | 'Reallocation';

export type ApprovalStatus = 'Approved' | 'Pending Approval' | 'Denied';

export type FinanceRoute = 'Auto-Approve' | 'Budget Review' | 'Sunday Meeting';

export interface BudgetRequest {
  submissionId: string;
  organizationName: string;
  /** Display name with numbering (e.g., "SGA 1", "SGA 2") - used when org has multiple requests */
  displayName?: string;
  requestType: RequestType;
  amount: number;
  description: string;
  approvalStatus: ApprovalStatus;
  financeRoute: FinanceRoute;
  /** Raw finance route from CSV - may include "Finance Review" for late submissions */
  rawFinanceRoute?: string;
  accountNumber: string;
  submittedOn: Date;
  submitterName: string;
  submitterEmail: string;
  /** Flag indicating this request was pre-approved (Auto-Approve or Budget Review) */
  isPreApproved?: boolean;
}

export type CSVType = 'approved' | 'pending' | 'mixed' | 'all' | 'unknown';

/**
 * Finance Review route type - includes the special case for late submissions
 */
export type FinanceReviewRoute = FinanceRoute | 'Finance Review';

export interface CSVParseResult {
  type: CSVType;
  requests: BudgetRequest[];
  warnings: string[];
  errors: string[];
}

export interface ValidationResult {
  type: CSVType;
  warnings: string[];
  errors: string[];
}

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
  accountNumber: string;
  submittedOn: Date;
  submitterName: string;
  submitterEmail: string;
}

export type CSVType = 'approved' | 'pending' | 'mixed' | 'unknown';

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

/**
 * CSV Validator for budget requests
 * 
 * Validates parsed budget requests and determines the CSV type
 * based on approval status values.
 */

import type { BudgetRequest, CSVType, ValidationResult } from '@/types/budget-request';

/**
 * Validate parsed budget requests and determine CSV type
 * 
 * @param requests - Array of parsed BudgetRequest objects
 * @returns ValidationResult with type, warnings, and errors
 */
export function validateCSV(requests: BudgetRequest[]): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Handle empty requests
  if (!requests || requests.length === 0) {
    return {
      type: 'unknown',
      warnings: [],
      errors: ['No budget requests to validate'],
    };
  }
  
  // Count approval status values
  let approvedCount = 0;
  let pendingCount = 0;
  let deniedCount = 0;
  let unknownStatusCount = 0;
  const unknownStatuses: Set<string> = new Set();
  
  for (const request of requests) {
    switch (request.approvalStatus) {
      case 'Approved':
        approvedCount++;
        break;
      case 'Pending Approval':
        pendingCount++;
        break;
      case 'Denied':
        deniedCount++;
        break;
      default:
        unknownStatusCount++;
        unknownStatuses.add(String(request.approvalStatus));
    }
  }
  
  // Determine CSV type based on approval statuses
  let type: CSVType;
  
  if (unknownStatusCount > 0) {
    // If there are unknown status values, mark as unknown
    type = 'unknown';
    errors.push(
      `Found ${unknownStatusCount} request(s) with unknown approval status: ${Array.from(unknownStatuses).join(', ')}. ` +
      `Expected values are: "Approved", "Pending Approval", or "Denied".`
    );
  } else if (approvedCount > 0 && pendingCount === 0 && deniedCount === 0) {
    // All approved
    type = 'approved';
  } else if (pendingCount > 0 && approvedCount === 0 && deniedCount === 0) {
    // All pending
    type = 'pending';
  } else if (approvedCount > 0 && pendingCount > 0) {
    // Mixed approved and pending - this is now the 'all' type for spreadsheet generation
    type = 'all';
    // No longer an error - this is expected for spreadsheet generation
    if (deniedCount > 0) {
      warnings.push(
        `CSV contains ${deniedCount} denied request(s). These will be excluded from generation.`
      );
    }
  } else if (deniedCount > 0) {
    // Has denied requests
    if (approvedCount > 0 || pendingCount > 0) {
      type = approvedCount > 0 ? 'approved' : 'pending';
      warnings.push(
        `CSV contains ${deniedCount} denied request(s). ` +
        `These will be excluded from generation.`
      );
    } else {
      // Only denied requests
      type = 'unknown';
      errors.push('CSV contains only denied requests. Nothing to generate.');
    }
  } else {
    type = 'unknown';
    errors.push('Unable to determine CSV type from approval statuses.');
  }
  
  // For pending requests, check if any are not "Sunday Meeting" finance route
  if (type === 'pending' || type === 'all' || (pendingCount > 0 && type !== 'unknown')) {
    const pendingRequests = requests.filter(r => r.approvalStatus === 'Pending Approval');
    const nonSundayMeeting = pendingRequests.filter(r => r.financeRoute !== 'Sunday Meeting');
    
    if (nonSundayMeeting.length > 0) {
      const routeCounts: Record<string, number> = {};
      for (const req of nonSundayMeeting) {
        routeCounts[req.financeRoute] = (routeCounts[req.financeRoute] || 0) + 1;
      }
      
      const routeDetails = Object.entries(routeCounts)
        .map(([route, count]) => `${count} "${route}"`)
        .join(', ');
      
      warnings.push(
        `${nonSundayMeeting.length} pending request(s) are not routed to "Sunday Meeting" (${routeDetails}). ` +
        `These may not require Senate approval. Consider reviewing before including in the Sunday meeting spreadsheet.`
      );
    }
  }
  
  // Validate individual requests
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    
    // Warn about missing amounts
    if (request.amount === 0) {
      warnings.push(
        `Request ${i + 1} (${request.organizationName}): Amount is $0 or missing.`
      );
    }
    
    // Warn about missing descriptions
    if (!request.description || request.description.trim() === '') {
      warnings.push(
        `Request ${i + 1} (${request.organizationName}): Description is empty.`
      );
    }
    
    // Warn about missing account numbers
    if (!request.accountNumber || request.accountNumber.trim() === '' || request.accountNumber === '#') {
      warnings.push(
        `Request ${i + 1} (${request.organizationName}): Account number is missing or invalid.`
      );
    }
  }
  
  return {
    type,
    warnings,
    errors,
  };
}

/**
 * Validate CSV for spreadsheet generation (accepts all request types)
 * Filters out denied requests and "Finance Review" late submissions
 * 
 * @param requests - Array of parsed BudgetRequest objects
 * @returns ValidationResult with type 'all', warnings, and errors
 */
export function validateCSVForSpreadsheet(requests: BudgetRequest[]): ValidationResult & { 
  filteredRequests: BudgetRequest[];
  excludedCount: { denied: number; financeReview: number };
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Handle empty requests
  if (!requests || requests.length === 0) {
    return {
      type: 'unknown',
      warnings: [],
      errors: ['No budget requests to validate'],
      filteredRequests: [],
      excludedCount: { denied: 0, financeReview: 0 },
    };
  }
  
  // Filter out denied requests and "Finance Review" route (late submissions)
  const deniedRequests = requests.filter(r => r.approvalStatus === 'Denied');
  const financeReviewRequests = requests.filter(r => 
    r.rawFinanceRoute === 'Finance Review' || r.financeRoute === 'Finance Review' as any
  );
  
  const filteredRequests = requests.filter(r => 
    r.approvalStatus !== 'Denied' && 
    r.rawFinanceRoute !== 'Finance Review' &&
    r.financeRoute !== 'Finance Review' as any
  );
  
  // Add warnings about excluded requests
  if (deniedRequests.length > 0) {
    warnings.push(
      `${deniedRequests.length} denied request(s) were excluded from the spreadsheet.`
    );
  }
  
  if (financeReviewRequests.length > 0) {
    warnings.push(
      `${financeReviewRequests.length} late submission(s) (Finance Review route) were excluded from the spreadsheet.`
    );
  }
  
  if (filteredRequests.length === 0) {
    errors.push('No valid requests remaining after filtering out denied and late submissions.');
    return {
      type: 'unknown',
      warnings,
      errors,
      filteredRequests: [],
      excludedCount: { denied: deniedRequests.length, financeReview: financeReviewRequests.length },
    };
  }
  
  // Mark pre-approved requests
  for (const request of filteredRequests) {
    if (request.approvalStatus === 'Approved' && 
        (request.financeRoute === 'Auto-Approve' || request.financeRoute === 'Budget Review')) {
      request.isPreApproved = true;
    }
  }
  
  // Count types for summary
  const approvedCount = filteredRequests.filter(r => r.approvalStatus === 'Approved').length;
  const pendingCount = filteredRequests.filter(r => r.approvalStatus === 'Pending Approval').length;
  const preApprovedCount = filteredRequests.filter(r => r.isPreApproved).length;
  
  // Add summary info
  if (preApprovedCount > 0) {
    warnings.push(
      `${preApprovedCount} pre-approved request(s) (Auto-Approve/Budget Review) will be added with "Approved" status pre-filled.`
    );
  }
  
  // Validate individual requests
  for (let i = 0; i < filteredRequests.length; i++) {
    const request = filteredRequests[i];
    
    if (request.amount === 0) {
      warnings.push(
        `Request ${i + 1} (${request.organizationName}): Amount is $0 or missing.`
      );
    }
    
    if (!request.accountNumber || request.accountNumber.trim() === '' || request.accountNumber === '#') {
      warnings.push(
        `Request ${i + 1} (${request.organizationName}): Account number is missing or invalid.`
      );
    }
  }
  
  return {
    type: approvedCount > 0 && pendingCount > 0 ? 'all' : (approvedCount > 0 ? 'approved' : 'pending'),
    warnings,
    errors,
    filteredRequests,
    excludedCount: { denied: deniedRequests.length, financeReview: financeReviewRequests.length },
  };
}

/**
 * Filter requests by approval status
 */
export function filterByStatus(
  requests: BudgetRequest[],
  status: BudgetRequest['approvalStatus']
): BudgetRequest[] {
  return requests.filter(r => r.approvalStatus === status);
}

/**
 * Filter requests by request type
 */
export function filterByRequestType(
  requests: BudgetRequest[],
  type: BudgetRequest['requestType']
): BudgetRequest[] {
  return requests.filter(r => r.requestType === type);
}

/**
 * Filter requests by finance route
 */
export function filterByFinanceRoute(
  requests: BudgetRequest[],
  route: BudgetRequest['financeRoute']
): BudgetRequest[] {
  return requests.filter(r => r.financeRoute === route);
}

/**
 * Get summary statistics for a set of requests
 */
export function getRequestSummary(requests: BudgetRequest[]): {
  totalCount: number;
  totalAmount: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byRoute: Record<string, number>;
} {
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byRoute: Record<string, number> = {};
  let totalAmount = 0;
  
  for (const request of requests) {
    totalAmount += request.amount;
    byStatus[request.approvalStatus] = (byStatus[request.approvalStatus] || 0) + 1;
    byType[request.requestType] = (byType[request.requestType] || 0) + 1;
    byRoute[request.financeRoute] = (byRoute[request.financeRoute] || 0) + 1;
  }
  
  return {
    totalCount: requests.length,
    totalAmount,
    byStatus,
    byType,
    byRoute,
  };
}

/**
 * Detect CSV type based on approval status values
 * This is a convenience function that returns just the type without full validation
 * 
 * @param requests - Array of parsed BudgetRequest objects
 * @returns CSVType indicating the type of requests in the CSV
 */
export function detectCSVType(requests: BudgetRequest[]): CSVType {
  if (!requests || requests.length === 0) {
    return 'unknown';
  }
  
  let approvedCount = 0;
  let pendingCount = 0;
  let deniedCount = 0;
  
  for (const request of requests) {
    switch (request.approvalStatus) {
      case 'Approved':
        approvedCount++;
        break;
      case 'Pending Approval':
        pendingCount++;
        break;
      case 'Denied':
        deniedCount++;
        break;
    }
  }
  
  // All approved (possibly with some denied)
  if (approvedCount > 0 && pendingCount === 0) {
    return 'approved';
  }
  
  // All pending (possibly with some denied)
  if (pendingCount > 0 && approvedCount === 0) {
    return 'pending';
  }
  
  // Mixed approved and pending
  if (approvedCount > 0 && pendingCount > 0) {
    return 'mixed';
  }
  
  // Only denied or unknown
  return 'unknown';
}

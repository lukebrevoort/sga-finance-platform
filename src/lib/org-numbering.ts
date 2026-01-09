/**
 * Organization Numbering Utility
 * 
 * Handles numbering of multiple requests from the same organization.
 * When an org has multiple requests, they get numbered: "SGA 1", "SGA 2", etc.
 * Single requests don't get numbered.
 */

import type { BudgetRequest } from '@/types/budget-request';

/**
 * Group requests by organization name (case-insensitive)
 */
function groupByOrganization(requests: BudgetRequest[]): Map<string, BudgetRequest[]> {
  const groups = new Map<string, BudgetRequest[]>();
  
  for (const request of requests) {
    // Use lowercase key for case-insensitive grouping
    const key = request.organizationName.toLowerCase().trim();
    
    const existing = groups.get(key);
    if (existing) {
      existing.push(request);
    } else {
      groups.set(key, [request]);
    }
  }
  
  return groups;
}

/**
 * Apply organization numbering to budget requests
 * 
 * For organizations with multiple requests:
 * - Appends " 1", " 2", etc. to the organization name
 * - Numbering is based on order in the input array
 * 
 * For organizations with single requests:
 * - Organization name remains unchanged
 * 
 * @param requests - Array of BudgetRequest objects
 * @returns New array with updated organization names (original array is not modified)
 */
export function applyOrgNumbering(requests: BudgetRequest[]): BudgetRequest[] {
  if (!requests || requests.length === 0) {
    return [];
  }
  
  // Group requests by organization
  const groups = groupByOrganization(requests);
  
  // Track which organizations need numbering (more than one request)
  const needsNumbering = new Set<string>();
  for (const [key, groupRequests] of groups) {
    if (groupRequests.length > 1) {
      needsNumbering.add(key);
    }
  }
  
  // Track current number for each organization
  const orgCounters = new Map<string, number>();
  
  // Process requests in original order
  const result: BudgetRequest[] = [];
  
  for (const request of requests) {
    const key = request.organizationName.toLowerCase().trim();
    
    if (needsNumbering.has(key)) {
      // Get and increment counter for this org
      const currentNumber = (orgCounters.get(key) || 0) + 1;
      orgCounters.set(key, currentNumber);
      
      // Create new request with numbered organization name
      result.push({
        ...request,
        organizationName: `${request.organizationName} ${currentNumber}`,
      });
    } else {
      // Single request, no numbering needed
      result.push({ ...request });
    }
  }
  
  return result;
}

/**
 * Remove organization numbering from a name
 * Useful for display or comparison purposes
 * 
 * @param orgName - Organization name potentially with numbering (e.g., "SGA 2")
 * @returns Organization name without numbering (e.g., "SGA")
 */
export function removeOrgNumbering(orgName: string): string {
  // Match pattern: name followed by space and number at end
  const match = orgName.match(/^(.+)\s+(\d+)$/);
  
  if (match) {
    return match[1].trim();
  }
  
  return orgName;
}

/**
 * Check if an organization name has numbering applied
 * 
 * @param orgName - Organization name to check
 * @returns True if the name ends with a number suffix
 */
export function hasOrgNumbering(orgName: string): boolean {
  return /\s+\d+$/.test(orgName);
}

/**
 * Get the number suffix from an organization name
 * 
 * @param orgName - Organization name with potential numbering
 * @returns The number suffix, or null if no numbering
 */
export function getOrgNumber(orgName: string): number | null {
  const match = orgName.match(/\s+(\d+)$/);
  
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

/**
 * Get statistics about organization distribution in requests
 * 
 * @param requests - Array of BudgetRequest objects
 * @returns Statistics about organizations
 */
export function getOrgStatistics(requests: BudgetRequest[]): {
  totalOrganizations: number;
  orgsWithMultipleRequests: number;
  requestsPerOrg: Map<string, number>;
} {
  const groups = groupByOrganization(requests);
  
  let orgsWithMultipleRequests = 0;
  const requestsPerOrg = new Map<string, number>();
  
  for (const [key, groupRequests] of groups) {
    // Use the original casing from the first request
    const originalName = groupRequests[0].organizationName;
    requestsPerOrg.set(originalName, groupRequests.length);
    
    if (groupRequests.length > 1) {
      orgsWithMultipleRequests++;
    }
  }
  
  return {
    totalOrganizations: groups.size,
    orgsWithMultipleRequests,
    requestsPerOrg,
  };
}

'use client';

import type { BudgetRequest, CSVType } from '@/types/budget-request';
import { StatusBadge } from './status-badge';

interface CSVPreviewProps {
  requests: BudgetRequest[];
  type: CSVType;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getTypeLabel(type: CSVType): { text: string; className: string } {
  switch (type) {
    case 'approved':
      return {
        text: 'Approved Requests - Ready for PowerPoint',
        className: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
      };
    case 'pending':
      return {
        text: 'Pending Requests - Ready for Spreadsheet',
        className: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      };
    case 'mixed':
      return {
        text: 'Mixed Statuses - Please separate approved and pending',
        className: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
      };
    default:
      return {
        text: 'Unknown Status',
        className: 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-neutral-700',
      };
  }
}

export function CSVPreview({ requests, type }: CSVPreviewProps) {
  const typeLabel = getTypeLabel(type);
  const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0);

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-2 text-sm font-medium">No requests found</p>
        <p className="mt-1 text-xs">Upload a CSV file to preview budget requests</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with type indicator and summary */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div
          className={`inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium ${typeLabel.className}`}
        >
          {typeLabel.text}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            <span className="font-semibold text-gray-900 dark:text-white">{requests.length}</span> request
            {requests.length !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-300 dark:text-neutral-700">|</span>
          <span>
            Total: <span className="font-semibold text-[#A32638] dark:text-red-400">{formatCurrency(totalAmount)}</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
          <thead className="bg-gray-50 dark:bg-neutral-800/50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                Organization
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                Amount
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              >
                Finance Route
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-800">
            {requests.map((request, index) => (
              <tr
                key={request.submissionId || index}
                className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    {request.displayName || request.organizationName}
                  </div>
                  {request.displayName && request.displayName !== request.organizationName && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{request.organizationName}</div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      request.requestType === 'AFR'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                    }`}
                  >
                    {request.requestType}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    {formatCurrency(request.amount)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={request.approvalStatus} variant="approval" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={request.financeRoute} variant="finance" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      {type === 'mixed' && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <strong>Mixed statuses detected.</strong> Please export separate CSV files for approved
              and pending requests from CampusGroups.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

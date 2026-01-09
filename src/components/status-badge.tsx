'use client';

import type { ApprovalStatus, FinanceRoute } from '@/types/budget-request';

type BadgeVariant = 'approval' | 'finance';

interface StatusBadgeProps {
  status: ApprovalStatus | FinanceRoute;
  variant?: BadgeVariant;
}

const approvalStyles: Record<ApprovalStatus, string> = {
  'Approved': 'bg-green-100 text-green-800 border-green-200',
  'Pending Approval': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Denied': 'bg-red-100 text-red-800 border-red-200',
};

const financeStyles: Record<FinanceRoute, string> = {
  'Auto-Approve': 'bg-blue-100 text-blue-800 border-blue-200',
  'Budget Review': 'bg-purple-100 text-purple-800 border-purple-200',
  'Sunday Meeting': 'bg-orange-100 text-orange-800 border-orange-200',
};

function isApprovalStatus(status: string): status is ApprovalStatus {
  return ['Approved', 'Pending Approval', 'Denied'].includes(status);
}

function isFinanceRoute(status: string): status is FinanceRoute {
  return ['Auto-Approve', 'Budget Review', 'Sunday Meeting'].includes(status);
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  let styles: string;

  if (variant === 'approval' || (!variant && isApprovalStatus(status))) {
    styles = approvalStyles[status as ApprovalStatus] || 'bg-gray-100 text-gray-800 border-gray-200';
  } else if (variant === 'finance' || (!variant && isFinanceRoute(status))) {
    styles = financeStyles[status as FinanceRoute] || 'bg-gray-100 text-gray-800 border-gray-200';
  } else {
    styles = 'bg-gray-100 text-gray-800 border-gray-200';
  }

  return (
    <span
      className={`
        inline-flex items-center
        px-2.5 py-0.5
        text-xs font-medium
        rounded-full border
        ${styles}
      `}
    >
      {status}
    </span>
  );
}

'use client';

import { useState, type ReactNode } from 'react';
import type { BudgetRequest } from '@/types/budget-request';

type FileType = 'pptx' | 'xlsx';

interface DownloadButtonProps {
  requests: BudgetRequest[];
  type: FileType;
  disabled?: boolean;
}

const fileTypeConfig: Record<FileType, { label: string; icon: ReactNode; endpoint: string }> = {
  pptx: {
    label: 'Download PowerPoint',
    endpoint: '/api/generate-pptx',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h1v4h2V9h1" />
      </svg>
    ),
  },
  xlsx: {
    label: 'Download Spreadsheet',
    endpoint: '/api/generate-xlsx',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
};

export function DownloadButton({ requests, type, disabled = false }: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = fileTypeConfig[type];

  const handleDownload = async () => {
    if (disabled || isLoading || requests.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate ${type.toUpperCase()} file`);
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `sga-budget-requests.${type}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || isLoading || requests.length === 0;

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleDownload}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          px-5 py-2.5
          text-sm font-medium
          rounded-lg
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A32638]
          ${
            isDisabled
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-[#A32638] text-white hover:bg-[#8a1f2f] active:bg-[#721a27] shadow-sm hover:shadow-md'
          }
        `}
      >
        {isLoading ? (
          <>
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Generating...</span>
          </>
        ) : (
          <>
            {config.icon}
            <span>{config.label}</span>
          </>
        )}
      </button>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Disabled hint */}
      {requests.length === 0 && !error && (
        <p className="text-xs text-gray-500">Upload a CSV file to enable download</p>
      )}
    </div>
  );
}

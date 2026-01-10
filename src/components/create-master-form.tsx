'use client';

import { useState } from 'react';
import { getNextSundayISO } from '@/lib/date-utils';

export function CreateMasterForm() {
  const [semesterName, setSemesterName] = useState('');
  const [startingBalance, setStartingBalance] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState(getNextSundayISO());
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation
    if (!semesterName.trim()) {
      setError('Please enter a semester name');
      setIsLoading(false);
      return;
    }

    if (!startingBalance || isNaN(parseFloat(startingBalance))) {
      setError('Please enter a valid starting balance');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/create-master', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          semesterName,
          startingBudget: parseFloat(startingBalance),
          meetingDate: meetingDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create master spreadsheet');
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `Master_Spreadsheet_${semesterName.replace(/\s+/g, '_')}.xlsx`;
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

      // Reset form on success (optional, but good UX)
      // setSemesterName('');
      // setStartingBalance('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg border border-gray-200 dark:border-neutral-800 shadow-sm h-full">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-[#A32638]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Semester Setup
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Generate a blank master spreadsheet to start a new semester.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Semester Name */}
        <div>
          <label htmlFor="semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Semester Name
          </label>
          <input
            id="semester"
            type="text"
            value={semesterName}
            onChange={(e) => setSemesterName(e.target.value)}
            placeholder="e.g., Spring 2026"
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A32638] focus:border-transparent transition-shadow bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Starting Balance */}
          <div>
            <label htmlFor="balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Starting AFR Budget
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
              </div>
              <input
                id="balance"
                type="number"
                min="0"
                step="0.01"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A32638] focus:border-transparent transition-shadow bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
            </div>
          </div>

          {/* First Meeting Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Meeting Date
            </label>
            <input
              id="date"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A32638] focus:border-transparent transition-shadow bg-white dark:bg-neutral-800 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              required
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`
            w-full flex items-center justify-center gap-2
            px-4 py-2.5 mt-2
            text-sm font-medium text-white
            bg-[#A32638] rounded-md
            hover:bg-[#8a1f2f] active:bg-[#721a27]
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A32638] dark:focus:ring-offset-neutral-900
            transition-all duration-200 shadow-sm
            disabled:opacity-70 disabled:cursor-not-allowed
          `}
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating...
            </>
          ) : (
            <>
              Create Master Spreadsheet
            </>
          )}
        </button>
      </form>
    </div>
  );
}
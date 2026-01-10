'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { getNextSundayISO } from '@/lib/date-utils';

export function MergeMasterForm() {
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [meetingDate, setMeetingDate] = useState(getNextSundayISO());
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Master file dropzone
  const onMasterDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setMasterFile(file);
        setError(null);
      } else {
        setError('Please upload an Excel file (.xlsx)');
      }
    }
  }, []);

  const {
    getRootProps: getMasterRootProps,
    getInputProps: getMasterInputProps,
    isDragActive: isMasterDragActive,
  } = useDropzone({
    onDrop: onMasterDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    disabled: isLoading,
  });

  // CSV file dropzone
  const onCsvDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.name.endsWith('.csv')) {
        setCsvFile(file);
        setError(null);
      } else {
        setError('Please upload a CSV file');
      }
    }
  }, []);

  const {
    getRootProps: getCsvRootProps,
    getInputProps: getCsvInputProps,
    isDragActive: isCsvDragActive,
  } = useDropzone({
    onDrop: onCsvDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
    disabled: isLoading,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    if (!csvFile) {
      setError('Please upload a CSV file with pending requests');
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('csv', csvFile);
      if (masterFile) {
        formData.append('master', masterFile);
      }
      formData.append('meetingDate', meetingDate);

      const response = await fetch('/api/merge-spreadsheet', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to merge spreadsheet');
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `SGA_Budget_Review_${meetingDate}.xlsx`;
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

      setSuccess(true);
      // Clear the CSV file after successful merge, keep master for next week
      setCsvFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearMasterFile = () => {
    setMasterFile(null);
    setSuccess(false);
  };

  const clearCsvFile = () => {
    setCsvFile(null);
    setSuccess(false);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg border border-gray-200 dark:border-neutral-800 shadow-sm h-full">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-[#A32638]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Merge New Requests
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add new pending requests to your existing master spreadsheet.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Master File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Master Spreadsheet <span className="text-gray-400 dark:text-gray-500">(optional)</span>
          </label>
          {!masterFile ? (
            <div
              {...getMasterRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
                transition-colors duration-200
                ${isMasterDragActive 
                  ? 'border-[#A32638] dark:border-red-500 bg-red-50 dark:bg-red-900/10' 
                  : 'border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-800'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getMasterInputProps()} />
              <svg className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {isMasterDragActive ? 'Drop the master file here' : 'Drop master .xlsx or click to upload'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Leave empty to create new spreadsheet</p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-green-800 dark:text-green-300 font-medium truncate max-w-[200px]">
                  {masterFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={clearMasterFile}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* CSV File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pending Requests CSV <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          {!csvFile ? (
            <div
              {...getCsvRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
                transition-colors duration-200
                ${isCsvDragActive 
                  ? 'border-[#A32638] dark:border-red-500 bg-red-50 dark:bg-red-900/10' 
                  : 'border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-800'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getCsvInputProps()} />
              <svg className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {isCsvDragActive ? 'Drop the CSV file here' : 'Drop pending requests .csv or click to upload'}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-green-800 dark:text-green-300 font-medium truncate max-w-[200px]">
                  {csvFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={clearCsvFile}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Meeting Date */}
        <div>
          <label htmlFor="merge-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Meeting Date
          </label>
          <input
            id="merge-date"
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A32638] focus:border-transparent transition-shadow bg-white dark:bg-neutral-800 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
            required
          />
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

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Spreadsheet merged successfully! Check your downloads.</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !csvFile}
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
              Merging...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Merge & Download
            </>
          )}
        </button>
      </form>
    </div>
  );
}
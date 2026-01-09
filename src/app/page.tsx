'use client';

import { useState, useCallback } from 'react';
import { FileUpload } from '@/components/file-upload';
import { CSVPreview } from '@/components/csv-preview';
import { DownloadButton } from '@/components/download-button';
import type { BudgetRequest, CSVType } from '@/types/budget-request';

interface ParsedData {
  type: CSVType;
  requests: BudgetRequest[];
  warnings: string[];
  errors: string[];
}

export default function Home() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileAccepted = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setParsedData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse CSV');
      }

      setParsedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setParsedData(null);
    setError(null);
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Generate Budget Documents in Seconds
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload your CampusGroups CSV export and automatically generate 
          approval slideshows or Sunday meeting spreadsheets.
        </p>
      </section>

      {/* Main Upload/Preview Area */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {!parsedData ? (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload CSV Export
              </h3>
              <p className="text-gray-600">
                Export your budget requests from CampusGroups and drag the CSV file here
              </p>
            </div>
            
            <FileUpload 
              onFileAccepted={handleFileAccepted}
              isProcessing={isLoading}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-red-800">Error Processing File</h4>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header with reset button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {parsedData.type === 'approved' ? 'Approved Requests' : 
                   parsedData.type === 'pending' ? 'Pending Requests' :
                   'Uploaded Requests'}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {parsedData.requests.length} request{parsedData.requests.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 
                         bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Upload Different File
              </button>
            </div>

            {/* Warnings */}
            {parsedData.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-yellow-800">Warnings</h4>
                    <ul className="text-yellow-700 text-sm mt-1 list-disc list-inside">
                      {parsedData.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Errors (for mixed status) */}
            {parsedData.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-red-800">Cannot Process</h4>
                    <ul className="text-red-700 text-sm mt-1 list-disc list-inside">
                      {parsedData.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Table */}
            <CSVPreview requests={parsedData.requests} type={parsedData.type} />

            {/* Download Actions */}
            {parsedData.errors.length === 0 && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 border-t border-gray-200">
                {parsedData.type === 'approved' && (
                  <DownloadButton 
                    requests={parsedData.requests} 
                    type="pptx"
                    disabled={parsedData.requests.length === 0}
                  />
                )}
                {parsedData.type === 'pending' && (
                  <DownloadButton 
                    requests={parsedData.requests} 
                    type="xlsx"
                    disabled={parsedData.requests.length === 0}
                  />
                )}
                {parsedData.type === 'mixed' && (
                  <p className="text-gray-600 text-center">
                    Please separate approved and pending requests into different CSV files.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Instructions Section */}
      <section id="instructions" className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Approved Requests</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            For budget requests that have been approved, upload a CSV containing only 
            approved items to generate a PowerPoint slideshow for Senate presentation.
          </p>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              Export approved requests from CampusGroups
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              Upload the CSV file
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              Download branded .pptx slideshow
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Pending Requests</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            For Sunday meeting review, upload a CSV containing pending requests 
            to generate an Excel spreadsheet ready for your review session.
          </p>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-1">•</span>
              Export pending requests from CampusGroups
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-1">•</span>
              Upload the CSV file
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-1">•</span>
              Download .xlsx spreadsheet for review
            </li>
          </ul>
        </div>
      </section>

      {/* Tips Section */}
      <section className="bg-gray-100 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips for Best Results</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <span className="text-[#A32638] font-bold">1</span>
            <p>Export only approved OR pending requests per file, not both</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[#A32638] font-bold">2</span>
            <p>For pending requests, ensure they are tagged as &quot;Sunday Meeting&quot;</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[#A32638] font-bold">3</span>
            <p>Multiple requests from the same org will be auto-numbered (SGA 1, SGA 2, etc.)</p>
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { FileUpload } from '@/components/file-upload';
import { CSVPreview } from '@/components/csv-preview';
import { DownloadButton } from '@/components/download-button';
import { CreateMasterForm } from '@/components/create-master-form';
import { MergeMasterForm } from '@/components/merge-master-form';
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

      // STRICT MODE: Only allow 'approved' type for this section
      if (data.type === 'pending') {
        throw new Error('This section is for Senate Presentations only. Please use the "Sunday Meeting" section below to merge pending requests.');
      }

      if (data.type === 'mixed') {
        throw new Error('File contains mixed request types. Please upload a CSV with ONLY approved requests.');
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
    <div className="space-y-12 pb-12">
      {/* Header */}
      <div className="text-center pt-8 pb-4">
        <h1 className="text-4xl font-extrabold text-[#A32638] mb-2 tracking-tight">
          SGA Finance Platform
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Automated tools for Stevens Student Government Association finance operations.
        </p>
      </div>

      {/* SECTION 1: Senate Presentations (Top) */}
      <section className="bg-white rounded-xl shadow-md border-t-4 border-t-[#A32638] overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-[#A32638] text-white p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Senate Presentation Generator</h2>
              <p className="text-gray-600">Convert approved budget requests into PowerPoint slides for Senate meetings.</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {!parsedData ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center mb-6">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Step 1</p>
                <h3 className="text-lg font-semibold text-gray-900">Upload Approved Requests CSV</h3>
                <p className="text-gray-500 text-sm mt-1">Export &quot;Approved&quot; requests from CampusGroups and drop the file below.</p>
              </div>
              
              <FileUpload 
                onFileAccepted={handleFileAccepted}
                isProcessing={isLoading}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-red-800">Cannot Process File</h4>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              {/* Header with reset button */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Ready to Generate
                  </h3>
                  <p className="text-green-600 text-sm mt-1 font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {parsedData.requests.length} approved request{parsedData.requests.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 
                           bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Start Over
                </button>
              </div>

              {/* Warnings */}
              {parsedData.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-yellow-800">Note</h4>
                      <ul className="text-yellow-700 text-sm mt-1 list-disc list-inside">
                        {parsedData.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-200 bg-gray-100/50">
                  <h4 className="text-sm font-medium text-gray-700">Preview Data</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <CSVPreview requests={parsedData.requests} type={parsedData.type} />
                </div>
              </div>

              {/* Download Actions */}
              <div className="flex flex-col items-center justify-center pt-4">
                <DownloadButton 
                  requests={parsedData.requests} 
                  type="pptx"
                  disabled={parsedData.requests.length === 0}
                />
                <p className="text-xs text-gray-500 mt-2">Generates a .pptx file formatted for Senate</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: Sunday Meeting (Bottom) */}
      <section id="master-management" className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-gray-300 flex-1"></div>
          <span className="text-gray-400 font-medium text-sm uppercase tracking-wider">or</span>
          <div className="h-px bg-gray-300 flex-1"></div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-700 rounded-full mb-4">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Sunday Meeting Budget Review
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tools for the Finance Committee to manage the Master Spreadsheet.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Card 1: Merge Requests */}
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
             <div className="p-1 h-full">
                <MergeMasterForm />
             </div>
          </div>
          
          {/* Card 2: Create Master */}
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="p-1 h-full">
              <CreateMasterForm />
            </div>
          </div>
        </div>

        {/* Master Spreadsheet Tips */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Master Spreadsheet Guide
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-blue-800">
            <div>
              <h4 className="font-bold text-blue-900 mb-1">1. Weekly Workflow</h4>
              <p className="text-blue-700/90 leading-relaxed">
                Every Sunday, export <strong>Pending</strong> requests from CampusGroups. Use the &quot;Merge New Requests&quot; tool to add them to your current semester&apos;s master file.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-1">2. Data Integrity</h4>
              <p className="text-blue-700/90 leading-relaxed">
                The merge tool preserves your existing data. It appends new requests to the bottom of the list and recalculates budget formulas automatically.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-1">3. New Semesters</h4>
              <p className="text-blue-700/90 leading-relaxed">
                Only use &quot;New Semester Setup&quot; at the start of the term. This creates a blank slate with your initial AFR budget allocation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
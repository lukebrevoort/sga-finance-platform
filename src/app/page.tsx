'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CreateMasterForm } from '@/components/create-master-form';
import { MergeMasterForm } from '@/components/merge-master-form';
import { WeekSelector } from '@/components/week-selector';
import type { WeekSummary } from '@/types/presentation-request';

export default function Home() {
  // State for Senate Presentation workflow
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [isParsingXlsx, setIsParsingXlsx] = useState(false);
  const [isGeneratingPptx, setIsGeneratingPptx] = useState(false);
  const [xlsxError, setXlsxError] = useState<string | null>(null);
  const [xlsxWarnings, setXlsxWarnings] = useState<string[]>([]);

  // Handle XLSX file drop for Senate Presentation
  const onXlsxDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setXlsxError('Please upload an Excel file (.xlsx)');
      return;
    }

    setXlsxFile(file);
    setXlsxError(null);
    setXlsxWarnings([]);
    setWeeks([]);
    setSelectedWeek('');
    setIsParsingXlsx(true);

    try {
      const formData = new FormData();
      formData.append('spreadsheet', file);

      const response = await fetch('/api/parse-spreadsheet', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse spreadsheet');
      }

      setWeeks(data.weeks);
      setXlsxWarnings(data.warnings || []);
      
      // Default to most recent week (first in array since sorted desc)
      if (data.weeks.length > 0) {
        setSelectedWeek(data.weeks[0].dateISO);
      }
    } catch (err) {
      setXlsxError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setXlsxFile(null);
    } finally {
      setIsParsingXlsx(false);
    }
  }, []);

  const {
    getRootProps: getXlsxRootProps,
    getInputProps: getXlsxInputProps,
    isDragActive: isXlsxDragActive,
  } = useDropzone({
    onDrop: onXlsxDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    disabled: isParsingXlsx || isGeneratingPptx,
  });

  const handleGeneratePptx = async () => {
    if (!xlsxFile || !selectedWeek) return;

    setIsGeneratingPptx(true);
    setXlsxError(null);

    try {
      const formData = new FormData();
      formData.append('spreadsheet', xlsxFile);
      formData.append('weekDate', selectedWeek);

      const response = await fetch('/api/generate-pptx-from-xlsx', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate presentation');
      }

      // Get filename from header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `SGA_Budget_Approvals_Week_${selectedWeek.replace(/\//g, '-')}.pptx`;
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
      setXlsxError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsGeneratingPptx(false);
    }
  };

  const handleResetXlsx = useCallback(() => {
    setXlsxFile(null);
    setWeeks([]);
    setSelectedWeek('');
    setXlsxError(null);
    setXlsxWarnings([]);
  }, []);

  // Get selected week summary for display
  const selectedWeekSummary = weeks.find(w => w.dateISO === selectedWeek);

  return (
    <div className="space-y-12 pb-12 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="text-center pt-8 pb-4">
        <h1 className="text-4xl font-extrabold text-[#A32638] mb-2 tracking-tight">
          SGA Finance Platform
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Automated tools for Stevens Student Government Association finance operations.
        </p>
      </div>

      {/* SECTION 1: Senate Presentations (Top) - NEW XLSX WORKFLOW */}
      <section className="bg-white dark:bg-neutral-900 rounded-xl shadow-md border-t-4 border-t-[#A32638] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-[#A32638] text-white p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Senate Presentation Generator</h2>
              <p className="text-gray-600 dark:text-gray-400">Generate PowerPoint slides from your completed weekly budget spreadsheet.</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {!xlsxFile ? (
            // Step 1: Upload XLSX
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center mb-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Step 1</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Weekly Spreadsheet</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Upload your completed budget review spreadsheet (.xlsx) from the Sunday meeting.
                </p>
              </div>
              
              <div
                {...getXlsxRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-all duration-200
                  ${isXlsxDragActive 
                    ? 'border-[#A32638] dark:border-red-500 bg-red-50 dark:bg-red-900/10' 
                    : 'border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-800'
                  }
                  ${isParsingXlsx ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getXlsxInputProps()} />
                {isParsingXlsx ? (
                  <div className="flex flex-col items-center gap-3">
                    <svg className="w-10 h-10 animate-spin text-[#A32638]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-300">Parsing spreadsheet...</p>
                  </div>
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
                      {isXlsxDragActive ? 'Drop the spreadsheet here' : 'Drop your .xlsx file or click to upload'}
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                      Upload the completed weekly budget spreadsheet with statuses filled in
                    </p>
                  </>
                )}
              </div>

              {xlsxError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-300">Cannot Process File</h4>
                      <p className="text-red-700 dark:text-red-400 text-sm mt-1">{xlsxError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Step 2 & 3: Select Week and Generate
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              {/* Header with reset button */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Spreadsheet Loaded
                  </h3>
                  <p className="text-green-600 dark:text-green-500 text-sm mt-1 font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {weeks.length} week{weeks.length !== 1 ? 's' : ''} found in spreadsheet
                  </p>
                </div>
                <button
                  onClick={handleResetXlsx}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white
                           bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Start Over
                </button>
              </div>

              {/* Warnings */}
              {xlsxWarnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Note</h4>
                      <ul className="text-yellow-700 dark:text-yellow-400 text-sm mt-1 list-disc list-inside">
                        {xlsxWarnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Week Selector */}
              <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Step 2</p>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Select Week to Present</h4>
                </div>
                
                <WeekSelector
                  weeks={weeks}
                  selectedWeek={selectedWeek}
                  onWeekChange={setSelectedWeek}
                  disabled={isGeneratingPptx}
                />
              </div>

              {/* Error message */}
              {xlsxError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-300">Error</h4>
                      <p className="text-red-700 dark:text-red-400 text-sm mt-1">{xlsxError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Generate Button */}
              <div className="flex flex-col items-center justify-center pt-4">
                <button
                  onClick={handleGeneratePptx}
                  disabled={!selectedWeek || isGeneratingPptx || (selectedWeekSummary && selectedWeekSummary.approvedCount + selectedWeekSummary.deniedCount === 0)}
                  className={`
                    flex items-center justify-center gap-2
                    px-8 py-3 text-lg font-medium text-white
                    bg-[#A32638] rounded-lg shadow-md
                    hover:bg-[#8a1f2f] active:bg-[#721a27]
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A32638] dark:focus:ring-offset-neutral-900
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isGeneratingPptx ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating Presentation...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PowerPoint
                    </>
                  )}
                </button>
                {selectedWeekSummary && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Generates slides for {selectedWeekSummary.approvedCount + selectedWeekSummary.deniedCount} request{(selectedWeekSummary.approvedCount + selectedWeekSummary.deniedCount) !== 1 ? 's' : ''} from Week of {selectedWeekSummary.date}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: Sunday Meeting (Bottom) */}
      <section id="master-management" className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-gray-300 dark:bg-neutral-800 flex-1"></div>
          <span className="text-gray-400 dark:text-neutral-600 font-medium text-sm uppercase tracking-wider">Sunday Meeting Tools</span>
          <div className="h-px bg-gray-300 dark:bg-neutral-800 flex-1"></div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full mb-4">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sunday Meeting Budget Review
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Tools for the Finance Committee to manage the weekly budget spreadsheet.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Card 1: Merge Requests */}
          <div className="bg-white dark:bg-neutral-900 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 h-full flex flex-col">
             <div className="p-1 h-full">
                <MergeMasterForm />
             </div>
          </div>
          
          {/* Card 2: Create Master */}
          <div className="bg-white dark:bg-neutral-900 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 h-full flex flex-col">
            <div className="p-1 h-full">
              <CreateMasterForm />
            </div>
          </div>
        </div>

        {/* Master Spreadsheet Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Weekly Workflow Guide
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-1">1. Before the Meeting</h4>
              <p className="text-blue-700/90 dark:text-blue-200/80 leading-relaxed">
                Export <strong>all</strong> budget requests from CampusGroups. Use &quot;Merge New Requests&quot; to add them to your spreadsheet. Pre-approved items will be marked automatically.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-1">2. During the Meeting</h4>
              <p className="text-blue-700/90 dark:text-blue-200/80 leading-relaxed">
                Review each request in the spreadsheet. Set Status to &quot;Approved&quot; or &quot;Denied&quot; and fill in any amended amounts as needed.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-1">3. After the Meeting</h4>
              <p className="text-blue-700/90 dark:text-blue-200/80 leading-relaxed">
                Upload your completed spreadsheet above and select the week to generate a PowerPoint presentation for Senate.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

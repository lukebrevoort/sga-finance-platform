'use client';

import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';

type UploadState = 'idle' | 'dragging' | 'processing';

interface FileUploadProps {
  onFileAccepted: (file: File) => void;
  isProcessing?: boolean;
}

export function FileUpload({ onFileAccepted, isProcessing = false }: FileUploadProps) {
  const [internalState, setInternalState] = useState<UploadState>('idle');
  
  // Use external processing state if provided, otherwise use internal
  const uploadState: UploadState = isProcessing ? 'processing' : internalState;
  const setUploadState = setInternalState;
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        const errorMessage = rejection.errors[0]?.message || 'Invalid file type';
        setError(errorMessage);
        setUploadState('idle');
        return;
      }

      if (acceptedFiles.length > 0) {
        setUploadState('processing');
        const file = acceptedFiles[0];
        
        // Small delay to show processing state
        setTimeout(() => {
          onFileAccepted(file);
          setUploadState('idle');
        }, 300);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    onDragEnter: () => setUploadState('dragging'),
    onDragLeave: () => setUploadState('idle'),
  });

  const stateStyles = {
    idle: 'border-gray-300 bg-gray-50 hover:border-[#A32638] hover:bg-red-50',
    dragging: 'border-[#A32638] bg-red-50 scale-[1.02]',
    processing: 'border-[#A32638] bg-red-50 opacity-75',
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[200px] p-8
          border-2 border-dashed rounded-lg
          cursor-pointer transition-all duration-200 ease-in-out
          ${stateStyles[uploadState]}
          ${isDragActive ? stateStyles.dragging : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {/* Upload Icon */}
        <div className={`mb-4 transition-transform duration-200 ${isDragActive ? 'scale-110' : ''}`}>
          {uploadState === 'processing' ? (
            <svg
              className="w-12 h-12 text-[#A32638] animate-spin"
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
          ) : (
            <svg
              className={`w-12 h-12 ${isDragActive ? 'text-[#A32638]' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          )}
        </div>

        {/* Text Content */}
        <div className="text-center">
          {uploadState === 'processing' ? (
            <p className="text-sm font-medium text-[#A32638]">Processing file...</p>
          ) : isDragActive ? (
            <p className="text-sm font-medium text-[#A32638]">Drop the CSV file here</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">
                <span className="text-[#A32638] hover:underline">Click to upload</span> or drag and
                drop
              </p>
              <p className="mt-1 text-xs text-gray-500">CSV files only (exported from CampusGroups)</p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}

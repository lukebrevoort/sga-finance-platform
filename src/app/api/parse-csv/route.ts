import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/csv-parser';
import { validateCSV, detectCSVType } from '@/lib/csv-validator';
import type { CSVParseResult } from '@/types/budget-request';

/**
 * POST /api/parse-csv
 * 
 * Accepts a CSV file via FormData, parses and validates it,
 * and returns the parsed budget requests with type detection.
 */
export async function POST(request: NextRequest): Promise<NextResponse<CSVParseResult | { error: string }>> {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file');

    // Validate that a file was provided
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a CSV file.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file (.csv).' },
        { status: 400 }
      );
    }

    // Read file contents
    const fileContent = await file.text();

    // Check for empty file
    if (!fileContent.trim()) {
      return NextResponse.json(
        { error: 'The uploaded file appears to be empty.' },
        { status: 400 }
      );
    }

    // Parse the CSV content
    const parseResult = parseCSV(fileContent);

    // Check for parsing errors
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          type: 'unknown' as const,
          requests: [],
          warnings: parseResult.warnings,
          errors: parseResult.errors,
        },
        { status: 400 }
      );
    }

    // Validate the CSV structure and content
    const validationResult = validateCSV(parseResult.requests);

    // If there are validation errors, return them
    if (validationResult.errors.length > 0) {
      return NextResponse.json(
        {
          type: 'unknown' as const,
          requests: [],
          warnings: [...parseResult.warnings, ...validationResult.warnings],
          errors: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Detect the CSV type based on approval status values
    const csvType = detectCSVType(parseResult.requests);

    // Handle mixed status case
    if (csvType === 'mixed') {
      return NextResponse.json(
        {
          type: 'mixed' as const,
          requests: parseResult.requests,
          warnings: [...parseResult.warnings, ...validationResult.warnings],
          errors: [
            'This CSV contains both approved and pending requests. ' +
            'Please upload separate files for approved and pending requests.'
          ],
        },
        { status: 400 }
      );
    }

    // Return successful parse result
    return NextResponse.json({
      type: csvType,
      requests: parseResult.requests,
      warnings: [...parseResult.warnings, ...validationResult.warnings],
      errors: [],
    });

  } catch (error) {
    console.error('Error parsing CSV:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to parse CSV: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while parsing the CSV file.' },
      { status: 500 }
    );
  }
}

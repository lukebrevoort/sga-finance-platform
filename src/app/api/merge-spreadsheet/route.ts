/**
 * API Route: POST /api/merge-spreadsheet
 * 
 * Merges budget requests from a CSV into an existing master spreadsheet.
 * Accepts multipart form data with:
 * - csv: The budget requests CSV file (required) - can include all request types
 * - master: The existing master spreadsheet (optional - creates new if not provided)
 * - meetingDate: The date for the meeting (optional)
 * 
 * Processing:
 * - Denied requests are automatically excluded
 * - "Finance Review" (late submissions) are automatically excluded
 * - Auto-Approve and Budget Review requests are pre-filled with "Approved" status
 * - Pending Sunday Meeting requests are left blank for manual review
 * 
 * Returns: The merged .xlsx file as a download
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/csv-parser';
import { validateCSVForSpreadsheet } from '@/lib/csv-validator';
import { mergeSpreadsheet } from '@/lib/spreadsheet-merger';
import { applyOrgNumbering } from '@/lib/org-numbering';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get the CSV file (required)
    const csvFile = formData.get('csv') as File | null;
    if (!csvFile) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      );
    }
    
    // Get the master spreadsheet file (optional)
    const masterFile = formData.get('master') as File | null;
    
    // Get the meeting date (optional)
    const meetingDate = formData.get('meetingDate') as string | null;
    
    // Parse the CSV
    const csvText = await csvFile.text();
    const parseResult = parseCSV(csvText);
    
    // Check for errors in initial parsing
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Unable to parse CSV. Ensure the file is a valid CampusGroups export.',
          warnings: parseResult.warnings,
          errors: parseResult.errors 
        },
        { status: 400 }
      );
    }
    
    // Use the spreadsheet-specific validator to filter and mark requests
    const validationResult = validateCSVForSpreadsheet(parseResult.requests);
    
    // Check for critical errors
    if (validationResult.errors.length > 0 || validationResult.type === 'unknown') {
      return NextResponse.json(
        { 
          error: 'No valid requests to include in spreadsheet after filtering.',
          warnings: validationResult.warnings,
          errors: validationResult.errors,
          excluded: validationResult.excludedCount
        },
        { status: 400 }
      );
    }
    
    // Apply organization numbering to the filtered requests
    const numberedRequests = applyOrgNumbering(validationResult.filteredRequests);
    
    // Load master spreadsheet if provided
    let masterBuffer: ArrayBuffer | null = null;
    if (masterFile) {
      masterBuffer = await masterFile.arrayBuffer();
    }
    
    // Merge the spreadsheets
    const mergedBuffer = await mergeSpreadsheet(
      masterBuffer,
      numberedRequests,
      { meetingDate: meetingDate || undefined }
    );
    
    // Generate filename
    const dateStr = meetingDate || new Date().toISOString().split('T')[0];
    const filename = `SGA_Budget_Review_${dateStr}.xlsx`;
    
    // Build response with warnings if any
    const responseHeaders: HeadersInit = {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': mergedBuffer.length.toString(),
    };
    
    // Include warnings in a custom header if any
    if (validationResult.warnings.length > 0) {
      responseHeaders['X-SGA-Warnings'] = JSON.stringify(validationResult.warnings);
    }
    
    // Include exclusion counts
    if (validationResult.excludedCount.denied > 0 || validationResult.excludedCount.financeReview > 0) {
      responseHeaders['X-SGA-Excluded'] = JSON.stringify(validationResult.excludedCount);
    }
    
    // Return the merged file
    return new NextResponse(new Uint8Array(mergedBuffer), {
      status: 200,
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error('Merge spreadsheet error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: `Failed to merge spreadsheet: ${message}` },
      { status: 500 }
    );
  }
}

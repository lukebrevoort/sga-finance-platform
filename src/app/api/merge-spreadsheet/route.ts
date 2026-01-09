/**
 * API Route: POST /api/merge-spreadsheet
 * 
 * Merges new pending requests from a CSV into an existing master spreadsheet.
 * Accepts multipart form data with:
 * - csv: The new pending requests CSV file (required)
 * - master: The existing master spreadsheet (optional - creates new if not provided)
 * - meetingDate: The date for the meeting (optional)
 * 
 * Returns: The merged .xlsx file as a download
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/csv-parser';
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
    
    // Check for errors in parsing
    if (parseResult.errors.length > 0 || parseResult.type === 'unknown') {
      return NextResponse.json(
        { 
          error: 'Unable to parse CSV or determine type. Ensure the CSV has valid Approval Status values.',
          warnings: parseResult.warnings,
          errors: parseResult.errors 
        },
        { status: 400 }
      );
    }
    
    // Apply organization numbering
    const numberedRequests = applyOrgNumbering(parseResult.requests);
    
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
    
    // Return the merged file
    return new NextResponse(new Uint8Array(mergedBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': mergedBuffer.length.toString(),
      },
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

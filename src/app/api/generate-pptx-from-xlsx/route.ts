/**
 * API Route: POST /api/generate-pptx-from-xlsx
 * 
 * Generates a PowerPoint presentation from a weekly budget spreadsheet.
 * Parses the spreadsheet, extracts the selected week's requests, and generates slides.
 * 
 * Accepts multipart form data with:
 * - spreadsheet: The weekly budget .xlsx file (required)
 * - weekDate: The week date string to generate for, e.g., "2/1" (required)
 * 
 * Returns: Binary .pptx file as a download
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseWeeklySpreadsheet, findWeekByDate, getWeekPresentationRequests } from '@/lib/xlsx-parser';
import { generatePPTXFromSpreadsheet } from '@/lib/pptx-generator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get the spreadsheet file (required)
    const spreadsheetFile = formData.get('spreadsheet') as File | null;
    if (!spreadsheetFile) {
      return NextResponse.json(
        { error: 'Spreadsheet file is required' },
        { status: 400 }
      );
    }
    
    // Get the week date (required)
    const weekDate = formData.get('weekDate') as string | null;
    if (!weekDate) {
      return NextResponse.json(
        { error: 'Week date is required. Please select a week to generate.' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!spreadsheetFile.name.endsWith('.xlsx') && !spreadsheetFile.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Please upload an Excel file (.xlsx)' },
        { status: 400 }
      );
    }
    
    // Read the file
    const buffer = await spreadsheetFile.arrayBuffer();
    
    // Parse the spreadsheet
    const parseResult = await parseWeeklySpreadsheet(buffer);
    
    // Check for critical errors
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Failed to parse spreadsheet',
          errors: parseResult.errors,
          warnings: parseResult.warnings 
        },
        { status: 400 }
      );
    }
    
    // Find the requested week
    const week = findWeekByDate(parseResult.weeks, weekDate);
    if (!week) {
      return NextResponse.json(
        { 
          error: `Week "${weekDate}" not found in the spreadsheet.`,
          availableWeeks: parseResult.weeks.map(w => w.date)
        },
        { status: 400 }
      );
    }
    
    // Get presentation requests for this week
    const requests = getWeekPresentationRequests(week);
    
    if (requests.length === 0) {
      return NextResponse.json(
        { 
          error: `No requests with a status (Approved/Denied) found for week of ${week.date}. ` +
                 'Ensure all requests have their status set in the spreadsheet.'
        },
        { status: 400 }
      );
    }
    
    // Generate the PPTX
    const pptxBuffer = await generatePPTXFromSpreadsheet(requests, week.date);
    
    // Generate filename
    const safeDate = week.date.replace(/\//g, '-');
    const filename = `SGA_Budget_Approvals_Week_${safeDate}.pptx`;
    
    // Return the PPTX file
    return new NextResponse(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pptxBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Generate PPTX from XLSX error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: `Failed to generate presentation: ${message}` },
      { status: 500 }
    );
  }
}

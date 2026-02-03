/**
 * API Route: POST /api/parse-spreadsheet
 * 
 * Parses a weekly budget spreadsheet and returns available weeks with summaries.
 * Used by the Senate Presentation workflow to let users select which week to generate.
 * 
 * Accepts multipart form data with:
 * - spreadsheet: The weekly budget .xlsx file (required)
 * 
 * Returns: JSON with weeks array containing summaries for week selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseWeeklySpreadsheet, getWeekSummaries } from '@/lib/xlsx-parser';

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
    
    // Check if any weeks were found
    if (parseResult.weeks.length === 0) {
      return NextResponse.json(
        { 
          error: 'No weeks found in the spreadsheet. Ensure weeks are marked with "Week of X" headers.',
          warnings: parseResult.warnings 
        },
        { status: 400 }
      );
    }
    
    // Get summaries for the week selector
    const weekSummaries = getWeekSummaries(parseResult.weeks);
    
    // Return the summaries
    return NextResponse.json({
      weeks: weekSummaries,
      warnings: parseResult.warnings,
      totalWeeks: parseResult.weeks.length,
    });
    
  } catch (error) {
    console.error('Parse spreadsheet error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: `Failed to parse spreadsheet: ${message}` },
      { status: 500 }
    );
  }
}

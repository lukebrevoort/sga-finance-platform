import { NextRequest, NextResponse } from 'next/server';
import { generateXLSX } from '@/lib/xlsx-generator';
import { applyOrgNumbering } from '@/lib/org-numbering';
import type { BudgetRequest } from '@/types/budget-request';

interface GenerateXLSXRequest {
  requests: BudgetRequest[];
}

/**
 * POST /api/generate-xlsx
 * 
 * Accepts an array of pending budget requests and generates
 * an Excel spreadsheet for Sunday meeting review.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse the JSON body
    const body: GenerateXLSXRequest = await request.json();

    // Validate that requests were provided
    if (!body.requests || !Array.isArray(body.requests)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected an array of budget requests.' },
        { status: 400 }
      );
    }

    // Check for empty requests array
    if (body.requests.length === 0) {
      return NextResponse.json(
        { error: 'No budget requests provided. Please provide at least one request.' },
        { status: 400 }
      );
    }

    // Check for non-pending requests and generate warnings
    const warnings: string[] = [];
    const nonPendingRequests = body.requests.filter(
      (req) => req.approvalStatus !== 'Pending Approval'
    );

    if (nonPendingRequests.length > 0) {
      warnings.push(
        `Found ${nonPendingRequests.length} non-pending request(s). ` +
        'These will still be included in the spreadsheet.'
      );
    }

    // Check for non-Sunday Meeting finance routes
    const nonSundayMeetingRequests = body.requests.filter(
      (req) => req.financeRoute !== 'Sunday Meeting'
    );

    if (nonSundayMeetingRequests.length > 0) {
      warnings.push(
        `Warning: ${nonSundayMeetingRequests.length} request(s) are not tagged as 'Sunday Meeting'. ` +
        'These may not be ready for review.'
      );
    }

    // Apply organization numbering for duplicate org names
    const numberedRequests = applyOrgNumbering(body.requests);

    // Generate the Excel file
    const xlsxBuffer = await generateXLSX(numberedRequests);

    // Convert to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(xlsxBuffer);

    // Create the response with the file
    const response = new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="SGA_Sunday_Meeting_${formatDate(new Date())}.xlsx"`,
        'Content-Length': uint8Array.byteLength.toString(),
        'Cache-Control': 'no-store',
        // Include warnings in a custom header if there are any
        ...(warnings.length > 0 && {
          'X-Warnings': encodeURIComponent(JSON.stringify(warnings)),
        }),
      },
    });

    return response;

  } catch (error) {
    console.error('Error generating Excel spreadsheet:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body.' },
        { status: 400 }
      );
    }

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to generate Excel spreadsheet: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while generating the Excel file.' },
      { status: 500 }
    );
  }
}

/**
 * Format a date as YYYY-MM-DD for use in filenames
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

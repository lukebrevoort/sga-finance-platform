import { NextRequest, NextResponse } from 'next/server';
import { generatePPTX } from '@/lib/pptx-generator';
import { applyOrgNumbering } from '@/lib/org-numbering';
import type { BudgetRequest } from '@/types/budget-request';

interface GeneratePPTXRequest {
  requests: BudgetRequest[];
}

/**
 * POST /api/generate-pptx
 * 
 * Accepts an array of approved budget requests and generates
 * a PowerPoint slideshow for Senate presentation.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse the JSON body
    const body: GeneratePPTXRequest = await request.json();

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

    // Validate that all requests are approved
    const nonApprovedRequests = body.requests.filter(
      (req) => req.approvalStatus !== 'Approved'
    );

    if (nonApprovedRequests.length > 0) {
      return NextResponse.json(
        { 
          error: `Found ${nonApprovedRequests.length} non-approved request(s). ` +
                 'PowerPoint generation is only for approved requests.'
        },
        { status: 400 }
      );
    }

    // Apply organization numbering for duplicate org names
    const numberedRequests = applyOrgNumbering(body.requests);

    // Generate the PowerPoint file
    const pptxBuffer = await generatePPTX(numberedRequests);

    // Convert to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pptxBuffer);

    // Create the response with the file
    const response = new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="SGA_Approved_Requests_${formatDate(new Date())}.pptx"`,
        'Content-Length': uint8Array.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    });

    return response;

  } catch (error) {
    console.error('Error generating PowerPoint:', error);

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
        { error: `Failed to generate PowerPoint: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while generating the PowerPoint file.' },
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

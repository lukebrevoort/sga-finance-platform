import { NextRequest, NextResponse } from 'next/server';
import { generateMasterSpreadsheet } from '@/lib/master-generator';
import { getNextSunday, parseDateString } from '@/lib/date-utils';

interface CreateMasterRequest {
  semesterName: string;
  startingBudget: number;
  meetingDate?: string;
}

/**
 * POST /api/create-master
 * 
 * Creates a new master budget spreadsheet for a semester.
 * Used to initialize tracking for Sunday meeting budget reviews.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse the JSON body
    const body: CreateMasterRequest = await request.json();

    // Validate semesterName
    if (!body.semesterName || typeof body.semesterName !== 'string') {
      return NextResponse.json(
        { error: 'semesterName is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    const semesterName = body.semesterName.trim();
    if (semesterName.length === 0) {
      return NextResponse.json(
        { error: 'semesterName cannot be empty.' },
        { status: 400 }
      );
    }

    // Validate startingBudget
    if (body.startingBudget === undefined || body.startingBudget === null) {
      return NextResponse.json(
        { error: 'startingBudget is required.' },
        { status: 400 }
      );
    }

    if (typeof body.startingBudget !== 'number' || isNaN(body.startingBudget)) {
      return NextResponse.json(
        { error: 'startingBudget must be a valid number.' },
        { status: 400 }
      );
    }

    if (body.startingBudget <= 0) {
      return NextResponse.json(
        { error: 'startingBudget must be a positive number.' },
        { status: 400 }
      );
    }

    // Determine meeting date
    let meetingDate: Date;

    if (body.meetingDate) {
      const parsed = parseDateString(body.meetingDate);
      if (!parsed) {
        return NextResponse.json(
          { error: 'Invalid meetingDate format. Please provide a valid ISO date string (e.g., "2026-01-12").' },
          { status: 400 }
        );
      }
      meetingDate = parsed;
    } else {
      // Calculate next Sunday if not provided
      meetingDate = getNextSunday();
    }

    // Generate the master spreadsheet
    const xlsxBuffer = await generateMasterSpreadsheet({
      semesterName,
      startingBudget: body.startingBudget,
      meetingDate,
    });

    // Convert to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(xlsxBuffer);

    // Create filename from semester name (sanitize for safe filename)
    const safeFilename = semesterName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');

    // Create the response with the file
    const response = new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeFilename}_Budget_Master.xlsx"`,
        'Content-Length': uint8Array.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    });

    return response;

  } catch (error) {
    console.error('Error creating master spreadsheet:', error);

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
        { error: `Failed to create master spreadsheet: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the master spreadsheet.' },
      { status: 500 }
    );
  }
}

# AGENTS.md - AI Agent Guidelines for SGA Finance Platform

## Project Overview

This is the **SGA Finance Platform** for Stevens Institute of Technology's Student Government Association Finance Department. The platform automates generation of:

1. **PowerPoint Slideshows** - For presenting approved budget requests to Senate
2. **Excel Spreadsheets** - For Sunday meeting budget reviews

**Live URL**: https://sga-finance.vercel.app  
**Repository Owner**: Luke Brevoort (VP of Finance)

---

## Quick Context

### What This App Does
- **Spreadsheet Generation**: Users upload CSV exports from CampusGroups containing ALL budget requests (Pending, Auto-Approved, Budget Review approved). The system generates formatted .xlsx files for Sunday meeting reviews, with pre-approved items already marked.
- **Slideshow Generation**: After the Sunday meeting, users upload the completed weekly spreadsheet (.xlsx) and select which week to generate a PowerPoint presentation for Senate.
- Can merge new requests into an existing master spreadsheet

### Who Uses This
- SGA Finance Team members
- Future VPs of Finance
- Non-technical student government members

### Key Constraint
- CampusGroups API is not available - all data comes via manual CSV export

### Current Workflow (as of Feb 2026)
1. **Before Meeting**: Export all pending/approved requests from CampusGroups → Upload CSV → Get weekly spreadsheet
2. **During Meeting**: Review requests in spreadsheet, mark Approved/Denied, fill in final amounts
3. **After Meeting**: Upload completed spreadsheet → Select week → Generate PPTX for Senate

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel Hosting                       │
│                                                          │
│  ┌──────────────────┐    ┌────────────────────────────┐ │
│  │   Next.js App    │    │   API Routes (Serverless)  │ │
│  │   (Frontend)     │    │                            │ │
│  │                  │    │  POST /api/generate-pptx   │ │
│  │  - File Upload   │───▶│  POST /api/generate-xlsx   │ │
│  │  - Preview       │    │  POST /api/merge-spreadsheet│ │
│  │  - Download      │◀───│  POST /api/parse-csv       │ │
│  │                  │    │  POST /api/parse-spreadsheet│ │
│  │                  │    │  POST /api/generate-pptx-from-xlsx │
│  └──────────────────┘    └────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

- **No database** - Stateless processing only
- **No authentication** - Open access for SGA members
- **Serverless functions** - Document generation happens in API routes

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | Full-stack React framework (App Router) |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| Shadcn/ui | Latest | UI components |
| PptxGenJS | 3.x | PowerPoint generation |
| ExcelJS | 4.x | Excel spreadsheet generation |
| Papa Parse | 5.x | CSV parsing |
| React Dropzone | 14.x | File upload UI |

---

## Project Structure

```
sga-finance-platform/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page (main UI)
│   ├── globals.css             # Global styles
│   └── api/                    # Serverless API routes
│       ├── generate-pptx/route.ts
│       ├── generate-xlsx/route.ts
│       ├── merge-spreadsheet/route.ts
│       └── parse-csv/route.ts
│
├── components/                 # React components
│   ├── ui/                     # Shadcn components (don't modify directly)
│   ├── file-upload.tsx         # Drag-and-drop upload
│   ├── csv-preview.tsx         # Data preview table
│   └── download-button.tsx     # Download trigger
│
├── lib/                        # Core business logic
│   ├── csv-parser.ts           # Parse CampusGroups CSV
│   ├── csv-validator.ts        # Validate CSV structure
│   ├── pptx-generator.ts       # PowerPoint creation
│   ├── xlsx-generator.ts       # Excel creation
│   ├── spreadsheet-merger.ts   # Merge master + new data
│   ├── org-numbering.ts        # "SGA 1, SGA 2" logic
│   └── utils.ts                # Shared utilities
│
├── types/                      # TypeScript type definitions
│   └── budget-request.ts       # Core data types
│
├── constants/                  # Static configuration
│   ├── branding.ts             # Colors, fonts
│   └── csv-columns.ts          # Expected CSV structure
│
├── public/                     # Static assets
│   └── sga-logo.png            # Logo for slides
│
├── PLAN.md                     # Project plan & architecture decisions
├── AGENTS.md                   # This file
└── README.md                   # User-facing documentation
```

---

## Key Files & Their Purpose

### `/lib/csv-parser.ts`
Parses CampusGroups CSV exports. Key responsibilities:
- Map CSV columns to internal `BudgetRequest` type
- Handle column name variations
- Parse currency strings to numbers
- Parse dates

### `/lib/csv-validator.ts`
Validates CSV structure and content:
- Check required columns exist
- Detect CSV type (approved vs pending) based on `Approval Status` values
- Warn about non-"Sunday Meeting" pending requests

### `/lib/pptx-generator.ts`
Generates PowerPoint slideshows:
- Apply Stevens branding (#A32638 red)
- One slide per budget request
- Display: Org name, amount, finance route, description (max 200 chars)
- Number duplicate orgs: "SGA 1", "SGA 2", etc.

### `/lib/xlsx-generator.ts`
Generates Excel spreadsheets:
- Separate sections for AFR and Reallocation requests
- Match master spreadsheet column structure
- Leave Amended, After Amendments, Status, Final Amount blank
- Number duplicate orgs within each week

### `/lib/org-numbering.ts`
Handles organization name numbering:
- Groups requests by organization name (case-insensitive matching)
- Appends " 1", " 2", etc. for multiple requests from same org
- Numbering resets each week (not cumulative across weeks)

---

## Data Types

### Core Type: `BudgetRequest`

```typescript
interface BudgetRequest {
  submissionId: string;
  organizationName: string;
  requestType: 'AFR' | 'Reallocation';
  amount: number;
  description: string;
  approvalStatus: 'Approved' | 'Pending Approval' | 'Denied';
  financeRoute: 'Auto-Approve' | 'Budget Review' | 'Sunday Meeting';
  accountNumber: string;
  submittedOn: Date;
  submitterName: string;
  submitterEmail: string;
}
```

### CSV Detection Result

```typescript
type CSVType = 'approved' | 'pending' | 'mixed' | 'unknown';

interface CSVParseResult {
  type: CSVType;
  requests: BudgetRequest[];
  warnings: string[];
  errors: string[];
}
```

---

## Business Rules

### 1. Auto-Detection Logic
```
IF all rows have ApprovalStatus = "Approved" → Generate PPTX
IF all rows have ApprovalStatus = "Pending Approval" → Generate XLSX
IF mixed statuses → Show error, ask user to separate
IF unknown status values → Show error with details
```

### 2. Organization Numbering
- Multiple requests from same org get numbered: "SGA 1", "SGA 2"
- Matching is case-insensitive but preserves original casing
- Numbering is per-upload, not cumulative across weeks
- Single requests don't get numbered (just "SGA", not "SGA 1")

### 3. Description Truncation
- Max 200 characters for PowerPoint slides
- Truncate with "..." if exceeded
- Full description preserved in Excel output

### 4. Finance Route Validation
- For pending requests going to Sunday Meeting spreadsheet:
  - All should have `Finance Review = "Sunday Meeting"`
  - If not, show warning but still process
  - Never block generation, just inform user

### 5. Master Spreadsheet Merge
- New requests append to existing data
- Preserve all existing rows unchanged
- AFR and Reallocation go to their respective sections
- Org numbering is independent per week (doesn't continue from previous weeks)

---

## Branding Constants

```typescript
// constants/branding.ts
export const BRANDING = {
  colors: {
    primary: '#A32638',      // Stevens Red
    secondary: '#1E1E1E',    // Dark Gray
    accent: '#FFFFFF',       // White
    background: '#F5F5F5',   // Light Gray
  },
  fonts: {
    heading: 'Arial',
    body: 'Arial',
  },
  slide: {
    width: 10,               // inches
    height: 5.625,           // inches (16:9 ratio)
  }
};
```

---

## CSV Column Mapping

The CampusGroups CSV has verbose column names. Map them as follows:

| CSV Column (exact) | Internal Field |
|--------------------|----------------|
| `Please enter the name of the organization this request is for:` | `organizationName` |
| `What type of request is this?` | `requestType` |
| `Total Cost of AFR:` | `amount` (for AFR) |
| `Total Amount to Reallocate:` | `amount` (for Reallocation) |
| `Approval Status` | `approvalStatus` |
| `Finance Review` | `financeRoute` |
| `Please explain the details of the Additional Funding Request...` | `description` (for AFR) |
| `Please explain the details of the reallocation request...` | `description` (for Reallocation) |
| `Please list the account number...` | `accountNumber` |
| `Submitted On` | `submittedOn` |
| `First Name` + `Last Name` | `submitterName` |
| `Email` | `submitterEmail` |

---

## API Routes

### `POST /api/parse-csv`
**Input**: FormData with CSV file  
**Output**: `{ type: CSVType, requests: BudgetRequest[], warnings: string[] }`  
**Purpose**: Parse and validate CSV, detect type

### `POST /api/generate-pptx`
**Input**: `{ requests: BudgetRequest[] }`  
**Output**: Binary .pptx file  
**Purpose**: Generate PowerPoint slideshow (legacy - from BudgetRequest array)

### `POST /api/generate-xlsx`
**Input**: `{ requests: BudgetRequest[] }`  
**Output**: Binary .xlsx file  
**Purpose**: Generate Sunday meeting spreadsheet

### `POST /api/merge-spreadsheet`
**Input**: FormData with master .xlsx + new CSV  
**Output**: Binary .xlsx file (merged)  
**Purpose**: Append new requests to existing master

### `POST /api/parse-spreadsheet`
**Input**: FormData with .xlsx file  
**Output**: `{ weeks: ParsedWeek[] }` with dates and request data  
**Purpose**: Parse weekly spreadsheet and identify week boundaries

### `POST /api/generate-pptx-from-xlsx`
**Input**: FormData with .xlsx file + weekDate: string  
**Output**: Binary .pptx file  
**Purpose**: Generate PPTX for a specific week from weekly spreadsheet

---

## Error Handling Patterns

### User-Facing Errors
Always provide clear, actionable messages:

```typescript
// Good
throw new UserError(
  "Missing required column: 'Approval Status'. " +
  "Please ensure you're exporting the correct report from CampusGroups."
);

// Bad
throw new Error("Column not found");
```

### Error Types
```typescript
class UserError extends Error {
  // Shown directly to user
}

class ValidationError extends Error {
  // CSV validation failures
  warnings: string[];
}

class GenerationError extends Error {
  // Document generation failures
}
```

### Never Crash On
- Extra columns in CSV (ignore them)
- Missing optional fields (use defaults)
- Whitespace variations in column names
- BOM characters in CSV

---

## Testing Considerations

### Test Data
Sample CSVs are in `/test-data/`:
- `approved-requests.csv` - For PPTX generation
- `pending-requests.csv` - For XLSX generation
- `mixed-requests.csv` - Should trigger error
- `malformed.csv` - Missing columns

### Key Test Cases
1. Single request from org → No numbering
2. Multiple requests from same org → Proper numbering
3. Description exactly 200 chars → No truncation
4. Description 201 chars → Truncated with "..."
5. Empty CSV → Appropriate error
6. Non-Sunday Meeting pending → Warning shown
7. Currency with commas → Parsed correctly ("$1,234.56")

---

## Common Tasks

### Adding a New CSV Column
1. Update `constants/csv-columns.ts` with column name
2. Update `types/budget-request.ts` interface
3. Update `lib/csv-parser.ts` mapping logic
4. Update relevant generator if column affects output

### Changing Slide Design
1. Modify `lib/pptx-generator.ts`
2. Update `constants/branding.ts` if colors change
3. Test with various description lengths

### Changing Spreadsheet Format
1. Modify `lib/xlsx-generator.ts`
2. Ensure column order matches master spreadsheet
3. Test merge functionality still works

### Adding a New API Route
1. Create folder in `app/api/[route-name]/`
2. Create `route.ts` with appropriate HTTP method handler
3. Add types for request/response
4. Update this documentation

---

## Deployment

### Automatic Deployment
- Push to `main` → Auto-deploys to production
- Pull requests → Preview deployments

### Manual Deployment
```bash
npx vercel --prod
```

### Environment Variables
None required for MVP. If added later:
```bash
# .env.local (local development)
# .env.production (set in Vercel dashboard)
```

---

## Gotchas & Known Issues

### 1. Vercel Serverless Timeout
- Free tier: 10 second limit
- Document generation should complete well within this
- If issues arise, consider chunking large CSVs

### 2. File Size Limits
- Vercel body limit: 4.5MB
- Should be fine for typical CSV exports
- Generated PPTX/XLSX are typically small

### 3. Browser Compatibility
- Tested on: Chrome, Firefox, Safari, Edge
- File download uses Blob API (modern browsers only)
- No IE11 support needed

### 4. CSV Encoding
- Expect UTF-8 encoding
- Handle BOM character if present
- CampusGroups exports are typically clean

---

## Contact & Ownership

- **Project Owner**: Luke Brevoort (VP of Finance, SGA)
- **Email**: lbrevoor@stevens.edu
- **Handoff**: Document any changes in this file for future maintainers

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-09 | Initial AGENTS.md created | Luke Brevoort |
| 2026-02-03 | Updated workflow: CSV now accepts all request types (pre-fills approved); PPTX generated from weekly spreadsheet with week selection | Luke Brevoort |

---

*This file should be updated whenever significant architectural decisions are made or project structure changes.*

# SGA Finance Platform - Project Plan

## Overview

A web-based tool for the Stevens SGA Finance Department to automate the generation of:
1. **Approval Slideshows** - PowerPoint presentations of approved budget requests for Senate transparency
2. **Sunday Meeting Spreadsheets** - Excel files for reviewing pending requests during Sunday meetings

The platform eliminates manual, repetitive work and ensures consistency in finance team outputs.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [User Workflow](#user-workflow)
3. [Architecture Decision](#architecture-decision)
4. [Tech Stack](#tech-stack)
5. [Data Model](#data-model)
6. [Features & Requirements](#features--requirements)
7. [Implementation Phases](#implementation-phases)
8. [File Structure](#file-structure)
9. [Deployment](#deployment)
10. [Future Considerations](#future-considerations)

---

## Problem Statement

### Current Pain Points
- Manual creation of PowerPoint slides for each approved budget request
- Manual formatting and data entry into master spreadsheets for Sunday meetings
- Time wasted on repetitive tasks that could be automated
- Risk of human error in data transcription
- Inconsistent formatting across different weeks/semesters

### Solution
A simple drag-and-drop web interface that:
- Accepts CSV exports from CampusGroups
- Auto-detects whether the CSV contains approved or pending requests
- Generates properly formatted .pptx or .xlsx files
- Handles the master spreadsheet merge for cumulative tracking

---

## User Workflow

### Flow 1: Generate Approval Slideshow
```
User exports "Approved" requests from CampusGroups
    ↓
Drag & drop CSV into web interface
    ↓
System auto-detects: Approved requests
    ↓
Generates .pptx with Stevens SGA branding
    ↓
User downloads slideshow for Senate presentation
```

### Flow 2: Generate Sunday Meeting Spreadsheet
```
User exports "Pending" requests from CampusGroups
    ↓
Drag & drop CSV into web interface
    ↓
(Optional) Upload existing master spreadsheet to merge
    ↓
System auto-detects: Pending requests
    ↓
Validates all are "Sunday Meeting" tagged (warns if not)
    ↓
Generates .xlsx separated by AFR / Reallocation
    ↓
User downloads spreadsheet for Sunday meeting
```

### Flow 3: Merge with Master Spreadsheet
```
User uploads pending CSV + existing master .xlsx
    ↓
System appends new requests to master
    ↓
Auto-numbers duplicate org names (SGA 1, SGA 2, etc.)
    ↓
User downloads updated master spreadsheet
```

---

## Architecture Decision

### Context
Need a simple, hostable solution that:
- Non-technical users can operate
- Generates documents quickly
- Costs nothing (or minimal) to host
- Requires no backend database
- Can be maintained by future finance chairs

### Decision: Static Frontend + Serverless API

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Hosting                        │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   Next.js App   │    │   Serverless API Routes     │ │
│  │                 │    │                             │ │
│  │  - Drag & Drop  │───▶│  /api/generate-pptx        │ │
│  │  - File Upload  │    │  /api/generate-xlsx        │ │
│  │  - Download     │◀───│  /api/detect-csv-type      │ │
│  │                 │    │                             │ │
│  └─────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Rationale
- **Next.js**: Full-stack React framework, perfect for Vercel
- **Serverless**: No server to maintain, scales automatically, free tier generous
- **No Database**: All processing is stateless; files in, files out
- **Client-side CSV parsing**: Fast, reduces server load

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Python Flask | Familiar, good libraries | Needs hosting, more complex deploy | Rejected |
| Pure client-side | No server costs | Large libraries (pptx) bloat bundle | Rejected |
| Google Apps Script | Free, integrates with Sheets | Limited, harder to maintain | Rejected |
| **Next.js + Vercel** | Free, fast, maintainable | Learning curve if unfamiliar | **Selected** |

### Consequences
- **Pros**: Zero hosting cost, automatic scaling, easy deploys via GitHub
- **Cons**: Document generation happens on serverless functions (10s timeout on free tier - should be fine for our use case)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type safety, better maintainability |
| **Tailwind CSS** | Rapid styling, consistent design |
| **React Dropzone** | Drag-and-drop file uploads |
| **Shadcn/ui** | Pre-built accessible components |

### Backend (Serverless)
| Technology | Purpose |
|------------|---------|
| **Next.js API Routes** | Serverless functions |
| **PptxGenJS** | PowerPoint generation |
| **ExcelJS** | Excel spreadsheet generation |
| **Papa Parse** | CSV parsing |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Vercel** | Hosting & deployment |
| **GitHub** | Version control |

### Why These Choices?
- **PptxGenJS**: Pure JavaScript, works in Node.js, well-documented, actively maintained
- **ExcelJS**: Full-featured Excel generation, supports styling, formulas, multiple sheets
- **Papa Parse**: Fast, handles edge cases in CSV parsing
- **Tailwind + Shadcn**: Professional look with minimal custom CSS

---

## Data Model

### Input: CampusGroups CSV Structure

```typescript
interface BudgetRequest {
  // Identification
  submissionId: string;
  
  // Requester Info
  firstName: string;
  lastName: string;
  email: string;
  
  // Request Details
  organizationName: string;
  requestType: 'Additional Funding Request (AFR)' | 'Reallocation';
  
  // AFR Fields
  afrDescription?: string;
  afrTotalCost?: number;
  afrSpreadsheetLink?: string;
  afrAccountNumber?: string;
  afrFinanceReview?: 'Auto-Approve' | 'Budget Review' | 'Sunday Meeting';
  
  // Reallocation Fields
  reallocationDescription?: string;
  reallocationAmount?: number;
  reallocationSpreadsheetLink?: string;
  
  // Status
  approvalStatus: 'Approved' | 'Pending Approval' | 'Denied';
  submittedOn: Date;
}
```

### Output: PowerPoint Slide Structure

```typescript
interface ApprovalSlide {
  organizationName: string;      // "SASE"
  displayName: string;           // "SASE 1" (if multiple)
  totalCost: string;             // "$100.00"
  financeRoute: string;          // "Budget Review"
  description?: string;          // Truncated to 200 chars
  requestType: string;           // "AFR" or "Reallocation"
}
```

### Output: Spreadsheet Structure

```typescript
interface SundayMeetingRow {
  organization: string;          // "SGA 1"
  requestType: string;           // "AFR" or "Reallocation"
  requestedAmount: number;       // Original request amount
  amended: number | null;        // Left blank for meeting
  afterAmendments: number | null;// Left blank for meeting
  status: string | null;         // Left blank for meeting
  finalAmount: number | null;    // Left blank for meeting
  accountNumber: string;
  description: string;           // Full description for reference
}
```

---

## Features & Requirements

### Must Have (MVP)

#### CSV Upload & Detection
- [ ] Drag-and-drop CSV upload
- [ ] Auto-detect CSV type based on `Approval Status` column values
- [ ] Validate CSV structure matches expected CampusGroups format
- [ ] Clear error messages for invalid files

#### PowerPoint Generation (Approved Requests)
- [ ] Stevens SGA branding (red theme: #A32638)
- [ ] One slide per request
- [ ] Display: Organization name, Amount, Finance Route, Description (truncated)
- [ ] Auto-number multiple requests from same org (SGA 1, SGA 2, etc.)
- [ ] Professional, clean layout
- [ ] Download as .pptx

#### Excel Generation (Pending Requests)
- [ ] Separate sheets/sections for AFR vs Reallocation
- [ ] Match master spreadsheet column structure
- [ ] Leave Amended, After Amendments, Status, Final Amount blank
- [ ] Auto-number multiple requests from same org
- [ ] Warn if any requests are not tagged "Sunday Meeting"
- [ ] Download as .xlsx

#### Master Spreadsheet Merge
- [ ] Upload existing master + new pending CSV
- [ ] Append new requests to appropriate section
- [ ] Preserve existing data
- [ ] Download merged .xlsx

### Should Have (Post-MVP)
- [ ] Preview slides/spreadsheet before download
- [ ] Batch download (both pptx and xlsx at once)
- [ ] Dark mode support
- [ ] Mobile-responsive design

### Could Have (Future)
- [ ] Historical data storage
- [ ] Analytics dashboard
- [ ] Google Drive integration
- [ ] Email notifications

---

## Implementation Phases

### Phase 1: Project Setup (Week 1)
**Goal**: Development environment ready, basic UI scaffold

- [ ] Initialize Next.js project with TypeScript
- [ ] Configure Tailwind CSS + Shadcn/ui
- [ ] Set up project structure
- [ ] Create basic layout with header/footer
- [ ] Implement drag-and-drop file upload component
- [ ] Deploy empty shell to Vercel

**Deliverable**: Live site at sga-finance.vercel.app with upload UI (non-functional)

### Phase 2: CSV Processing (Week 1-2)
**Goal**: Parse and validate CSV files

- [ ] Implement CSV parser with Papa Parse
- [ ] Create type definitions for CampusGroups data
- [ ] Build CSV validation logic
- [ ] Implement auto-detection (Approved vs Pending)
- [ ] Display parsed data in UI for verification
- [ ] Error handling and user feedback

**Deliverable**: Can upload CSV and see parsed/validated data

### Phase 3: PowerPoint Generation (Week 2-3)
**Goal**: Generate branded approval slideshows

- [ ] Set up PptxGenJS
- [ ] Create slide template matching Stevens branding
- [ ] Implement organization name numbering logic
- [ ] Add finance route badge/indicator
- [ ] Handle description truncation (200 char limit)
- [ ] Generate and trigger download

**Deliverable**: Upload approved CSV → Download .pptx

### Phase 4: Excel Generation (Week 3-4)
**Goal**: Generate Sunday meeting spreadsheets

- [ ] Set up ExcelJS
- [ ] Create spreadsheet template matching master format
- [ ] Implement AFR / Reallocation separation
- [ ] Add validation warnings (non-Sunday Meeting items)
- [ ] Organization name numbering
- [ ] Generate and trigger download

**Deliverable**: Upload pending CSV → Download .xlsx

### Phase 5: Master Spreadsheet Merge (Week 4-5)
**Goal**: Merge new requests into existing master

- [ ] Implement dual file upload UI
- [ ] Parse existing .xlsx master spreadsheet
- [ ] Merge logic (append to correct sections)
- [ ] Handle edge cases (empty master, format mismatches)
- [ ] Generate updated master

**Deliverable**: Upload master + pending CSV → Download merged .xlsx

### Phase 6: Polish & Testing (Week 5-6)
**Goal**: Production-ready quality

- [ ] Comprehensive error handling
- [ ] Loading states and progress indicators
- [ ] User instructions and help text
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] User acceptance testing with Finance Team

**Deliverable**: Production-ready platform

---

## File Structure

```
sga-finance-platform/
├── app/
│   ├── layout.tsx              # Root layout with header/footer
│   ├── page.tsx                # Home page with upload interface
│   ├── globals.css             # Global styles
│   └── api/
│       ├── generate-pptx/
│       │   └── route.ts        # PowerPoint generation endpoint
│       ├── generate-xlsx/
│       │   └── route.ts        # Excel generation endpoint
│       ├── merge-spreadsheet/
│       │   └── route.ts        # Master merge endpoint
│       └── parse-csv/
│           └── route.ts        # CSV parsing & validation
│
├── components/
│   ├── ui/                     # Shadcn components
│   ├── file-upload.tsx         # Drag-and-drop component
│   ├── csv-preview.tsx         # Data preview table
│   ├── generation-options.tsx  # Output configuration
│   └── download-button.tsx     # Download trigger
│
├── lib/
│   ├── csv-parser.ts           # CSV parsing logic
│   ├── csv-validator.ts        # Validation rules
│   ├── pptx-generator.ts       # PowerPoint generation
│   ├── xlsx-generator.ts       # Excel generation
│   ├── spreadsheet-merger.ts   # Merge logic
│   ├── org-numbering.ts        # "SGA 1, SGA 2" logic
│   └── utils.ts                # Shared utilities
│
├── types/
│   ├── budget-request.ts       # TypeScript interfaces
│   └── generation-options.ts
│
├── constants/
│   ├── branding.ts             # Colors, fonts
│   └── csv-columns.ts          # Expected CSV structure
│
├── public/
│   ├── sga-logo.png            # Logo for slides
│   └── favicon.ico
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## Deployment

### Vercel Setup

1. **Connect GitHub Repository**
   ```bash
   # Push to GitHub
   git remote add origin https://github.com/[your-username]/sga-finance-platform.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to vercel.com
   - Click "Import Project"
   - Select GitHub repo
   - Deploy automatically

3. **Domain Configuration**
   - Default: `sga-finance-platform.vercel.app`
   - Custom: Can add `finance.sgastevens.org` later if desired

### Environment Variables
None required for MVP (no external APIs or databases).

### CI/CD
- Every push to `main` triggers automatic deployment
- Preview deployments for pull requests

---

## Phase 2: Master Spreadsheet Management

### Overview

The Master Spreadsheet feature allows the VP of Finance to:
1. **Create** a new semester budget tracking workbook
2. **Merge** pending requests into an existing master each week
3. **Track** remaining budget automatically with Excel formulas

### User Workflow

#### Flow 4: Create New Master Spreadsheet
```
User clicks "Create Master Spreadsheet"
    ↓
Enters: Semester name (e.g., "Spring 2026")
        Starting AFR budget (e.g., $200,000.00)
        First meeting date (auto-suggests next Sunday)
    ↓
System generates .xlsx with two sheets:
    - Sheet 1: AFR Requests (with budget tracking)
    - Sheet 2: Reallocation Requests (simple tracking)
    ↓
User downloads master spreadsheet template
```

#### Flow 5: Weekly Merge to Master
```
User has pending requests CSV from CampusGroups
    ↓
User uploads: Existing master .xlsx + Pending CSV
    ↓
System auto-detects meeting date (next Sunday)
    ↓
Appends new requests to appropriate sheet
    - AFR requests → AFR sheet
    - Reallocation requests → Reallocation sheet
    ↓
Adds weekly subtotal and remaining budget rows
    ↓
User downloads updated master
```

### Sheet 1: AFR Requests

#### Structure
```
Row 1: Column Headers (frozen)
Row 2: [Semester Name] section header | Starting Budget: $XXX,XXX.XX (in col I)
Row 3+: Week 1 data rows
Row N: Weekly Subtotal (Final Amount sum)
Row N+1: Remaining Budget (Previous - Subtotal)
[Blank row]
[Repeat for each week]
```

#### Columns
| Column | Letter | On Import | Formula/Behavior |
|--------|--------|-----------|------------------|
| Date of Meeting | A | Auto (next Sunday) | First row of each week only |
| Notes | B | Blank | Manual during meeting |
| Organization | C | From CSV (numbered) | "SGA 1", "SGA 2", etc. |
| AFR'd | D | From CSV | Requested amount |
| Amended | E | Formula | `= D - F` (AFR'd - After Amendments) |
| After Amendments | F | Blank | Filled during meeting |
| Status | G | Blank | "Approved" or "Denied" |
| Final Amount | H | Formula | `= IF(G="Approved", F, 0)` |
| Name of Org | I | Same as C | For KFS reference |
| Entered in KFS? | J | Blank | Post-meeting tracking |
| Account Number | K | From CSV | |

#### Weekly Summary Rows
- **Weekly Subtotal Row**: `= SUM(H:H)` for that week's Final Amount column
  - Only Approved items contribute (since Final Amount = 0 for Denied)
- **Remaining Budget Row**: `= [Previous Remaining] - [Weekly Subtotal]`
  - First week: Starting Budget - Week 1 Subtotal
  - Week N: Week N-1 Remaining - Week N Subtotal

### Sheet 2: Reallocation Requests

#### Structure (Simplified)
No budget pool tracking - just a record of requests.

```
Row 1: Column Headers (frozen)
Row 2: [Semester Name] section header
Row 3+: Data rows (organized by week)
```

#### Columns
| Column | Letter | On Import | Notes |
|--------|--------|-----------|-------|
| Date of Meeting | A | Auto (next Sunday) | |
| Notes | B | Blank | Manual notes |
| Organization | C | From CSV (numbered) | |
| Requested Amount | D | From CSV | Amount to reallocate |
| Approved Amount | E | Blank | Filled during meeting |
| Status | F | Blank | "Approved" or "Denied" |
| Account Number | G | From CSV | |

### Meeting Date Auto-Calculation

```typescript
function getNextSunday(fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  const dayOfWeek = date.getDay(); // 0 = Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  date.setDate(date.getDate() + daysUntilSunday);
  return date;
}
```

Example:
- Friday Jan 9th → Sunday Jan 11th
- Sunday Jan 11th → Sunday Jan 11th (same day)
- Monday Jan 12th → Sunday Jan 18th

### API Endpoints

#### POST /api/create-master
**Input**:
```typescript
{
  semesterName: string;      // "Spring 2026"
  startingBudget: number;    // 200000.00
  meetingDate?: string;      // Optional override, ISO date
}
```
**Output**: Binary .xlsx file

#### POST /api/merge-spreadsheet (Updated)
**Input**: FormData with:
- `master`: Existing .xlsx file
- `pending`: CSV file with pending requests
- `meetingDate`: Optional date override
**Output**: Binary .xlsx file (merged)

### Excel Formula Examples

For a week with data in rows 3-10:

```excel
# Amended (Column E, Row 3)
=D3-F3

# Final Amount (Column H, Row 3)  
=IF(G3="Approved",F3,0)

# Weekly Subtotal (Row 11)
=SUM(H3:H10)

# Remaining Budget (Row 12, I12)
# If first week:
=I2-H11
# If subsequent week:
=[Previous Remaining Cell]-H11
```

### UI Components Needed

1. **Create Master Section**
   - Semester name input (text)
   - Starting budget input (currency)
   - Meeting date picker (default: next Sunday)
   - "Create Master Spreadsheet" button

2. **Merge to Master Section**
   - Master file upload (.xlsx only)
   - Pending CSV upload
   - Meeting date picker (optional override)
   - "Merge & Download" button

---

## Future Considerations

### Data Persistence
If historical tracking becomes needed:
- **Option A**: Vercel KV (Redis) for simple key-value storage
- **Option B**: Supabase for PostgreSQL with free tier
- **Option C**: Export to Google Sheets via API

### Analytics
Could add:
- Total approved this semester
- Breakdown by organization
- Trends over time

### Integrations
- Google Drive auto-upload
- Slack/Discord notifications
- Email summaries

### Multi-Semester Support
- Semester selector
- Archive previous semesters
- Year-over-year comparisons

---

## Success Metrics

1. **Time Saved**: Reduce document generation from ~30 min to <2 min
2. **Error Reduction**: Zero transcription errors
3. **Adoption**: Finance team and successors actively using the tool
4. **Reliability**: 99%+ uptime, no failed generations

---

## Appendix

### A. CSV Column Mapping

| CampusGroups Column | Internal Field | Notes |
|---------------------|----------------|-------|
| `Please enter the name of the organization...` | `organizationName` | Primary identifier |
| `What type of request is this?` | `requestType` | AFR or Reallocation |
| `Total Cost of AFR:` | `afrTotalCost` | Parse as number |
| `Total Amount to Reallocate:` | `reallocationAmount` | Parse as number |
| `Approval Status` | `approvalStatus` | Used for auto-detection |
| `Finance Review` | `financeRoute` | Auto-Approve, Budget Review, Sunday Meeting |
| `Please explain the details...` | `description` | Truncate at 200 chars |

### B. Branding Specification

| Element | Value |
|---------|-------|
| Primary Color | #A32638 (Stevens Red) |
| Secondary Color | #1E1E1E (Dark Gray) |
| Accent Color | #FFFFFF (White) |
| Font (Headings) | Arial Bold or system sans-serif |
| Font (Body) | Arial or system sans-serif |
| Logo | Stevens SGA logo (to be provided) |

### C. Error Messages

| Scenario | Message |
|----------|---------|
| Invalid file type | "Please upload a CSV file (.csv)" |
| Empty CSV | "The uploaded file appears to be empty" |
| Missing required columns | "Missing required column: [column name]" |
| Mixed approval statuses | "This CSV contains both approved and pending requests. Please upload separate files." |
| Non-Sunday Meeting pending | "Warning: [X] requests are not tagged as 'Sunday Meeting'. These may not be ready for review." |

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/[username]/sga-finance-platform.git

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

---

*Last Updated: February 3, 2026*
*Author: Luke Brevoort, VP of Finance*

---

## Phase 3: Post-Meeting Workflow Improvements

### Overview

After the first budget meeting, we identified workflow issues that require changes to how both the spreadsheet and slideshow are generated. This phase addresses two key improvements:

1. **Spreadsheet Generation**: Accept ALL requests (not just Pending), with Auto-Approved/Budget Review requests pre-filled
2. **Slideshow Generation**: Generate from the weekly spreadsheet instead of CSV, with week selection

### Problem Statement

**Current Issues:**
- Spreadsheet only shows Pending requests; Auto-Approved and Budget Review approved items are missing
- Users must manually add Auto-Approved/Budget Review items to the spreadsheet
- Slideshow generation requires a separate CSV export of approved items
- No way to generate a slideshow directly from the completed weekly spreadsheet

**Solution:**
- CSV upload for spreadsheet includes ALL request types (pre-fill approved items)
- Slideshow is generated from the weekly spreadsheet after the meeting is complete
- Week selector allows generating presentations for any past meeting

---

### Change 1: Enhanced Spreadsheet Generation

#### Current Behavior
```
CSV (Pending only) → XLSX with blank Status/Final Amount
```

#### New Behavior
```
CSV (All Requests) → XLSX with:
  - Pending (Sunday Meeting): Blank Status, Blank Final Amount
  - Approved (Auto-Approve): Status="Approved", Final Amount=Amount, Notes="Auto-Approve"
  - Approved (Budget Review): Status="Approved", Final Amount=Amount, Notes="Budget Review"
  - Denied: EXCLUDED (from previous weeks)
  - Finance Review route: EXCLUDED (submitted late, not reviewed)
```

#### Implementation Details

##### 1. Update CSV Validator (`lib/csv-validator.ts`)
- Remove strict "pending only" check for spreadsheet generation
- Add new CSVType: `'all'` for mixed approved+pending scenarios
- Add filter function to exclude:
  - Denied requests
  - Requests with financeRoute = "Finance Review" (late submissions)

##### 2. Update Types (`types/budget-request.ts`)
- Add `'all'` to CSVType union
- Add optional `preApproved?: boolean` flag to BudgetRequest for tracking

##### 3. Update Spreadsheet Merger (`lib/spreadsheet-merger.ts`)
- Modify `addAFRRequests()` to handle pre-approved requests:
  ```typescript
  // For Auto-Approve or Budget Review approved requests:
  // - Set Status cell to "Approved"
  // - Set Final Amount to request amount
  // - Set Notes column to financeRoute ("Auto-Approve" or "Budget Review")
  ```
- Modify `addReallocationRequests()` similarly

##### 4. Update XLSX Generator (`lib/xlsx-generator.ts`)
- Same logic as spreadsheet-merger for standalone generation

##### 5. Update API Route (`app/api/merge-spreadsheet/route.ts`)
- Accept CSVs with approved + pending requests
- Filter out Denied and "Finance Review" route requests
- Pass `isPreApproved` flag based on approvalStatus

##### 6. Update UI (`components/merge-master-form.tsx`)
- Update label from "Pending Requests CSV" to "Budget Requests CSV"
- Update help text to explain all request types are accepted
- Add info about what gets excluded (Denied, Finance Review)

#### Data Flow for AFR Rows

| Request Status | Finance Route | Status Cell | Final Amount Cell | Notes Cell |
|---------------|---------------|-------------|-------------------|------------|
| Pending | Sunday Meeting | (blank) | (blank) | Description from CSV |
| Approved | Auto-Approve | "Approved" | $amount | "Auto-Approve: [Description]" |
| Approved | Budget Review | "Approved" | $amount | "Budget Review: [Description]" |
| Approved | Sunday Meeting | (blank) | (blank) | Description from CSV (shouldn't happen) |
| Denied | Any | EXCLUDED | EXCLUDED | EXCLUDED |
| Any | Finance Review | EXCLUDED | EXCLUDED | EXCLUDED |

**Notes Column Format:**
- For Pending (Sunday Meeting): Just the treasurer's description from CSV
- For Pre-approved: "[Finance Route]: [Description]" (e.g., "Auto-Approve: GBM refreshments for spring semester")
- This allows the PPTX generator to extract both the finance route and description from a single column

---

### Change 2: Slideshow from Weekly Spreadsheet

#### Current Behavior
```
CSV (Approved) → PPTX
```

#### New Behavior
```
XLSX (Weekly Spreadsheet) → Parse weeks by date → Week selector → PPTX
  - User uploads completed weekly spreadsheet
  - System parses and identifies week boundaries (by Date of Meeting column)
  - UI shows available weeks with tabs/dropdown
  - User selects week (default: most recent)
  - Generate PPTX for selected week showing ALL requests (Approved + Denied)
```

#### Implementation Details

##### 1. Create XLSX Parser (`lib/xlsx-parser.ts`)
New module to read and parse the weekly spreadsheet:

```typescript
interface ParsedWeek {
  date: string;           // "2/1", "2/8", etc. (extracted from "Week of X" header)
  dateISO: string;        // "2026-02-01"
  afrRequests: SpreadsheetRow[];
  reallocationRequests: SpreadsheetRow[];
}

interface SpreadsheetRow {
  organization: string;
  requestedAmount: number;
  amendedAmount: number | null;
  afterAmendments: number | null;
  status: 'Approved' | 'Denied' | null;
  finalAmount: number;
  notes: string;          // Contains treasurer's description from CSV
  accountNumber: string;
}

function parseWeeklySpreadsheet(buffer: ArrayBuffer): ParsedWeek[];
```

**Week Detection Logic:**
- Scan for section header rows matching pattern: `"Week of X"` (e.g., "Week of 2/1", "Week of 2/8")
- Each "Week of X" row starts a new week section
- All data rows until the next "Week of X" (or end of sheet) belong to that week
- Skip subtotal/remaining budget rows (identified by "Weekly Subtotal" or "Remaining Budget" text)

##### 2. Create Presentation Request Type (`types/presentation-request.ts`)
```typescript
interface PresentationRequest {
  organizationName: string;
  displayName: string;
  requestedAmount: number;
  finalAmount: number;
  status: 'Approved' | 'Denied';
  description: string;        // From Notes column (treasurer's description from CSV)
  financeRoute: string;       // From Notes if Auto-Approve/Budget Review, else "Sunday Meeting"
  requestType: 'AFR' | 'Reallocation';
  wasAmended: boolean;        // true if finalAmount !== requestedAmount
}
```

**Notes/Description Handling:**
- The Notes column in the spreadsheet will contain the treasurer's original description from the CSV
- For pre-approved requests (Auto-Approve/Budget Review), Notes will contain the finance route
- When generating PPTX: use Notes as description; if empty, leave description blank on slide

##### 3. Update PPTX Generator (`lib/pptx-generator.ts`)
- Accept `PresentationRequest[]` (different from `BudgetRequest`)
- Update slide layout to show:
  - Organization name (with numbering if applicable)
  - Requested Amount (only if different from Final Amount)
  - Final Amount (prominent)
  - Status badge (green "Approved" or red "Denied")
  - Finance Route badge
  - Notes/Description
- Add visual differentiation for Denied requests (red border or strikethrough amount)

##### 4. Create New API Route (`app/api/parse-spreadsheet/route.ts`)
```typescript
// POST /api/parse-spreadsheet
// Input: FormData with .xlsx file
// Output: { weeks: ParsedWeek[] }
```

##### 5. Create New API Route (`app/api/generate-pptx-from-xlsx/route.ts`)
```typescript
// POST /api/generate-pptx-from-xlsx
// Input: FormData with .xlsx file + weekDate: string
// Output: Binary .pptx file
```

##### 6. Create Week Selector Component (`components/week-selector.tsx`)
```typescript
interface WeekSelectorProps {
  weeks: { date: string; requestCount: number }[];
  selectedWeek: string;
  onWeekChange: (date: string) => void;
}
```
- Display as tabs or dropdown
- Show date + request count per week
- Default to most recent week

##### 7. Update Main Page (`app/page.tsx`)
- Remove CSV file upload for Senate Presentations section
- Add XLSX file upload instead
- Add week selector after file is parsed
- Update download button to call new API endpoint

#### Slide Layout for New PPTX

```
┌─────────────────────────────────────────────────────────┐
│ [Stevens Red Header Bar]                    1 of 15     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Organization Name                                      │
│  ══════════════════                                     │
│                                                         │
│  Requested: $500.00  →  Final: $450.00    [APPROVED]   │
│                       OR                                │
│  Final: $500.00                           [APPROVED]   │
│  (if no amendment)                                      │
│                                                         │
│  [Sunday Meeting]  [AFR]                               │
│  ─────────────────────────                             │
│                                                         │
│  Description:                                          │
│  Lorem ipsum dolor sit amet, consectetur adipiscing... │
│  (from Notes column - omit section entirely if empty)  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [Stevens Red Footer Bar]                               │
└─────────────────────────────────────────────────────────┘
```

For Denied requests:
```
┌─────────────────────────────────────────────────────────┐
│ [Stevens Red Header Bar]                    5 of 15     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Organization Name                                      │
│  ══════════════════                                     │
│                                                         │
│  Requested: $500.00  →  Final: $0.00      [DENIED]     │
│                                           (red badge)   │
│                                                         │
│  [Sunday Meeting]  [AFR]                               │
│  ─────────────────────────                             │
│                                                         │
│  Description:                                          │
│  Original request description...                       │
│  (from Notes column - omit section entirely if empty)  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [Stevens Red Footer Bar]                               │
└─────────────────────────────────────────────────────────┘
```

---

### UI Changes Summary

#### Senate Presentation Section (Top)

**Before:**
```
Step 1: Upload Approved Requests CSV
[Drag & Drop CSV]
→ Preview Data
→ [Download PPTX]
```

**After:**
```
Step 1: Upload Weekly Spreadsheet
[Drag & Drop XLSX - your completed budget review spreadsheet]

Step 2: Select Week
[Tab: 2/1] [Tab: 2/8] [Tab: 2/15 (selected)]
         ↑ most recent, default selected

Step 3: Preview & Download
[Preview showing requests for selected week]
→ 8 requests (6 Approved, 2 Denied)
→ [Download PPTX for 2/15 Meeting]
```

#### Sunday Meeting Section (Bottom - Merge Form)

**Before:**
```
- Master Spreadsheet (optional)
- Pending Requests CSV *
- Meeting Date
→ [Merge & Download]
```

**After:**
```
- Master Spreadsheet (optional)
- Budget Requests CSV *
  (includes Auto-Approved, Budget Review, and Sunday Meeting requests)
  ℹ️ Denied and late submissions (Finance Review) are automatically excluded
- Meeting Date
→ [Merge & Download]
```

---

### Implementation Phases

#### Phase 3.1: Spreadsheet Enhancement (1-2 days)
1. Update types for new CSVType `'all'`
2. Update CSV validator to accept all request types
3. Add filtering logic for Denied/Finance Review
4. Update spreadsheet-merger to pre-fill approved requests
5. Update xlsx-generator similarly
6. Update merge-spreadsheet API route
7. Update merge-master-form UI labels and help text
8. Test with sample CSV containing mixed request types

#### Phase 3.2: XLSX Parser (1 day)
1. Create `lib/xlsx-parser.ts`
2. Implement week boundary detection by Date of Meeting column
3. Parse AFR and Reallocation sheets
4. Return structured `ParsedWeek[]` data
5. Unit test with sample spreadsheet

#### Phase 3.3: Week Selector UI (0.5 days)
1. Create `components/week-selector.tsx`
2. Add tab-style week selection
3. Show request counts per week
4. Default to most recent week
5. Connect to parent state

#### Phase 3.4: New PPTX Generator (1 day)
1. Create `types/presentation-request.ts`
2. Update `lib/pptx-generator.ts` to handle new input type
3. Update slide layout for amended amounts
4. Add Denied status styling
5. Add status badges (Approved green, Denied red)
6. Test slide generation

#### Phase 3.5: API Routes & Integration (0.5 days)
1. Create `/api/parse-spreadsheet` route
2. Create `/api/generate-pptx-from-xlsx` route
3. Update main page to use new workflow
4. End-to-end testing

#### Phase 3.6: Testing & Polish (0.5 days)
1. Test with real weekly spreadsheet data
2. Edge cases (empty weeks, single request, etc.)
3. Error handling improvements
4. Update help text and tooltips

**Total Estimated Time: 4-5 days**

---

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `types/budget-request.ts` | Modify | Add `'all'` to CSVType |
| `types/presentation-request.ts` | Create | New type for PPTX from spreadsheet |
| `lib/csv-validator.ts` | Modify | Accept all request types, add filters |
| `lib/spreadsheet-merger.ts` | Modify | Pre-fill approved requests |
| `lib/xlsx-generator.ts` | Modify | Same as spreadsheet-merger |
| `lib/xlsx-parser.ts` | Create | Parse weekly spreadsheet |
| `lib/pptx-generator.ts` | Modify | New slide layout, handle PresentationRequest |
| `app/api/merge-spreadsheet/route.ts` | Modify | Handle all request types |
| `app/api/parse-spreadsheet/route.ts` | Create | Parse XLSX and return weeks |
| `app/api/generate-pptx-from-xlsx/route.ts` | Create | Generate PPTX from spreadsheet week |
| `components/week-selector.tsx` | Create | Week tab selection component |
| `components/merge-master-form.tsx` | Modify | Update labels and help text |
| `app/page.tsx` | Modify | New Senate Presentation workflow |
| `AGENTS.md` | Modify | Update documentation |

---

### Testing Checklist

#### Spreadsheet Generation
- [x] CSV with only Pending requests works as before
- [x] CSV with Pending + Auto-Approved correctly pre-fills
- [x] CSV with Budget Review approved correctly pre-fills
- [x] Denied requests are excluded
- [x] "Finance Review" route requests are excluded
- [x] Notes column shows finance route for pre-approved
- [x] Org numbering still works correctly

#### Slideshow Generation
- [x] XLSX with single week parses correctly
- [x] XLSX with multiple weeks shows all in selector
- [x] Most recent week is default selected
- [x] Approved requests show green badge (verified PPTX generated)
- [x] Denied requests show red badge (code verified, needs visual test)
- [x] Amended amounts show "Requested → Final" format (code verified)
- [x] Non-amended amounts show only Final (code verified)
- [x] Org numbering preserved from spreadsheet

#### Bug Fixes Applied
- [x] Fixed CSV parser to handle "Rellocation" typo (missing 'a')
- [x] Fixed spreadsheet-merger to add "Week of X" headers for Reallocation sheets

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-09 | 1.0 | Initial plan created |
| 2026-01-09 | 1.1 | Added Phase 2: Master Spreadsheet Management specification |
| 2026-02-03 | 2.0 | Added Phase 3: Post-Meeting Workflow Improvements - enhanced spreadsheet generation and XLSX-to-PPTX workflow |

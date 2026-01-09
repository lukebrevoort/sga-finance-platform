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

*Last Updated: January 9, 2026*
*Author: Luke Brevoort, VP of Finance*

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-09 | 1.0 | Initial plan created |
| 2026-01-09 | 1.1 | Added Phase 2: Master Spreadsheet Management specification |

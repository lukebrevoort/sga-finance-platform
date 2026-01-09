# PROGRESS.md - SGA Finance Platform Development Log

## Current Status: Feature Complete (MVP)

**Last Updated**: January 9, 2026  
**Current Phase**: Styling Polish & Cleanup

---

## Completed Features

### Phase 1: Core Platform (COMPLETE)

#### CSV Upload & Detection
- [x] Drag-and-drop file upload with React Dropzone
- [x] CSV parsing with Papa Parse
- [x] Auto-detection of CSV type (approved vs pending vs mixed)
- [x] Validation of required CampusGroups columns
- [x] Warning system for non-Sunday Meeting pending requests
- [x] Error handling for malformed CSVs
- [x] Strict mode: Senate section only accepts approved CSVs

#### PowerPoint Generation (COMPLETE)
- [x] PptxGenJS integration
- [x] Stevens branding (#A32638 red theme)
- [x] One slide per budget request
- [x] Organization name numbering (SGA 1, SGA 2, etc.)
- [x] Description truncation (200 char max)
- [x] Finance route display
- [x] Download as .pptx

#### Excel Generation - Basic (COMPLETE)
- [x] ExcelJS integration
- [x] Separate sections for AFR / Reallocation
- [x] Stevens branding in headers
- [x] Organization name numbering
- [x] Currency formatting
- [x] Download as .xlsx

#### Deployment (COMPLETE)
- [x] GitHub repository created
- [x] Vercel deployment configured
- [x] Auto-deploy on push to main
- [x] Live at: https://sga-finance-platorm.vercel.app

---

### Phase 2: Master Spreadsheet Management (COMPLETE)

#### Create Master Spreadsheet (COMPLETE)
- [x] Two sheets: AFR Requests + Reallocation Requests
- [x] User inputs: Semester name, Starting AFR budget
- [x] Excel formulas for:
  - Amended = AFR'd - After Amendments
  - Final Amount = IF(Status="Approved", After Amendments, 0)
  - Weekly Subtotal = SUM(Final Amount) for week
  - Remaining Budget = Previous Remaining - Weekly Subtotal
- [x] API endpoint: POST /api/create-master
- [x] UI section for creating new master

#### Merge Pending Requests to Master (COMPLETE)
- [x] Dual file upload (master .xlsx + pending .csv)
- [x] Auto-detect insertion point in master
- [x] Add new weekly section with proper date
- [x] Preserve existing data and formulas
- [x] Update running totals with chained formulas
- [x] UI for merge workflow

#### Spreadsheet Styling (COMPLETE)
- [x] Weekly subtotal row: Light blue background, blue borders
- [x] Remaining budget row: Yellow/gold background, larger font (14pt), Stevens red text
- [x] Proper row heights for visibility
- [x] Data validation dropdowns for Status column (Approved/Denied)

---

### Phase 3: UI/UX Polish (COMPLETE)

#### Main Page Redesign
- [x] Two-section layout: Senate Presentations (top) + Sunday Meeting (bottom)
- [x] Clear visual separation between workflows
- [x] Stevens branding throughout
- [x] Helpful "Master Spreadsheet Guide" section
- [x] SGA logo in header (replaced text placeholder)
- [x] Removed Home/Instructions nav buttons (single-page app)

#### Bug Fixes
- [x] Fixed master spreadsheet row count issue (was appending at row 1002+)
  - Root cause: for-loops creating cells via getCell() for data validation
  - Fix: Removed loops, apply validation dynamically when rows are added
- [x] Cleaned up debug console.log statements

---

## Architecture Decisions

### ADR-001: Stateless Processing
**Decision**: No database, all processing is stateless  
**Rationale**: Simpler architecture, no data persistence concerns, free hosting tier sufficient  
**Status**: Implemented

### ADR-002: Serverless Document Generation
**Decision**: Generate PPTX/XLSX in Next.js API routes (serverless functions)  
**Rationale**: Keeps heavy processing server-side, avoids bundle bloat  
**Status**: Implemented

### ADR-003: Excel Formulas for Budget Tracking
**Decision**: Use actual Excel formulas instead of pre-calculated values  
**Rationale**: Allows VPF to make manual edits during meetings and have totals update automatically  
**Status**: Implemented

### ADR-004: Chained Remaining Budget Formulas
**Decision**: Each week's "Remaining Budget" formula references the previous week's remaining cell  
**Rationale**: Running total automatically updates when any week's approvals change  
**Status**: Implemented

---

## Known Issues

1. **Vercel URL Typo**: Domain is `sga-finance-platorm` (missing 'f' in platform) - cosmetic only

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Main UI (two-section layout)
│   ├── layout.tsx                  # Stevens-branded layout with SGA logo
│   └── api/
│       ├── parse-csv/route.ts      # CSV parsing
│       ├── generate-pptx/route.ts  # PowerPoint generation
│       ├── generate-xlsx/route.ts  # Excel generation (basic)
│       ├── create-master/route.ts  # Create new semester master
│       └── merge-spreadsheet/route.ts # Merge pending into master
├── components/
│   ├── file-upload.tsx             # Drag-drop component
│   ├── csv-preview.tsx             # Data preview table
│   ├── download-button.tsx         # Download triggers
│   ├── create-master-form.tsx      # New semester form
│   ├── merge-master-form.tsx       # Merge workflow form
│   └── status-badge.tsx            # Status indicators
├── lib/
│   ├── csv-parser.ts               # CSV parsing logic
│   ├── csv-validator.ts            # Validation & type detection
│   ├── pptx-generator.ts           # PowerPoint creation
│   ├── xlsx-generator.ts           # Excel creation (basic)
│   ├── master-generator.ts         # Create semester master spreadsheet
│   ├── spreadsheet-merger.ts       # Merge logic with formulas
│   ├── org-numbering.ts            # "SGA 1, SGA 2" numbering
│   └── date-utils.ts               # Date formatting utilities
├── types/
│   └── budget-request.ts           # TypeScript interfaces
└── constants/
    └── branding.ts                 # Stevens colors, fonts
```

---

## Next Session Checklist

When resuming development:

1. Read this PROGRESS.md for context
2. Read AGENTS.md for project guidelines
3. Run `npm run dev` to start local server
4. Test the complete workflow end-to-end

### Optional Enhancements (Future)

1. [ ] Add mini column headers for each weekly section in spreadsheet
2. [ ] Add export filename customization
3. [ ] Add dark mode support
4. [ ] Add progress indicator during file generation

---

## Changelog

| Date | Change | Details |
|------|--------|---------|
| 2026-01-09 | Initial platform complete | CSV upload, PPTX/XLSX generation, deployment |
| 2026-01-09 | Master Spreadsheet spec finalized | Two sheets, formulas, budget tracking |
| 2026-01-09 | PROGRESS.md created | Development tracking file |
| 2026-01-09 | Master spreadsheet feature complete | Create master, merge pending, formula support |
| 2026-01-09 | Fixed row count bug | Removed 1000-row for-loops in master-generator.ts |
| 2026-01-09 | UI redesign | Two-section layout, SGA logo, removed nav buttons |
| 2026-01-09 | Spreadsheet styling | Yellow remaining budget row, blue subtotal row |
| 2026-01-09 | Code cleanup | Removed debug console.log statements |

---

*This file is updated at the end of each development session.*

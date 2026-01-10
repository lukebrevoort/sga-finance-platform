# Dark Mode Analysis for src/app/page.tsx

This document outlines the components and elements in `src/app/page.tsx` that require dark mode styling updates. Currently, the file uses hardcoded light-mode classes (e.g., `bg-white`, `text-gray-900`).

## Imported Components
The following imported components likely contain their own styling and will also need deep-dive analysis for dark mode compatibility:
- `FileUpload` (`@/components/file-upload`)
- `CSVPreview` (`@/components/csv-preview`)
- `DownloadButton` (`@/components/download-button`)
- `CreateMasterForm` (`@/components/create-master-form`)
- `MergeMasterForm` (`@/components/merge-master-form`)

## Page-Level Elements Requiring Update

### 1. Global & Header
- **Main Heading**: `text-gray-600` (Subtitle) needs `dark:text-gray-400`.
- **Title**: `text-[#A32638]` is brand color, check contrast against dark background.

### 2. Senate Presentations Section
- **Container**: `bg-white` needs `dark:bg-gray-800` or `dark:bg-neutral-900`.
- **Header Area**: 
  - `bg-gray-50/50` needs `dark:bg-gray-800/50`.
  - `border-gray-100` needs `dark:border-gray-700`.
  - Text: `text-gray-900` -> `dark:text-gray-100`, `text-gray-600` -> `dark:text-gray-400`.
- **Upload Step**:
  - `text-gray-900` headings, `text-gray-500` descriptions.
- **Error State**:
  - `bg-red-50 border-red-200` needs `dark:bg-red-900/20 dark:border-red-900/50`.
  - Text: `text-red-800`, `text-red-700` needs lightening for dark mode (e.g., `dark:text-red-200`).
- **Ready State**:
  - `border-gray-100` needs update.
  - Reset Button: `bg-gray-100 text-gray-600` needs `dark:bg-gray-700 dark:text-gray-200`.
- **Warning Box**:
  - `bg-yellow-50 border-yellow-200` needs `dark:bg-yellow-900/20 dark:border-yellow-900/50`.
  - Text colors (`text-yellow-800`, etc.) need adjustment.
- **Preview Table Container**:
  - `bg-gray-50 border-gray-200` container.
  - Header `bg-gray-100/50`.

### 3. Sunday Meeting Section
- **Dividers**: `bg-gray-300` needs `dark:bg-gray-700`.
- **Icon**: `bg-blue-50 text-blue-700` needs `dark:bg-blue-900/30 dark:text-blue-300`.
- **Cards (Merge/Create Forms)**:
  - `bg-white border-gray-200` needs `dark:bg-gray-800 dark:border-gray-700`.

### 4. Master Spreadsheet Guide (Blue Box)
- **Container**: `bg-blue-50 border-blue-100` needs `dark:bg-blue-900/20 dark:border-blue-900/30`.
- **Text**: Heavily uses `text-blue-900`, `text-blue-800`, `text-blue-700/90`. These will be illegible on dark backgrounds and need mapping to lighter blue/gray shades (e.g., `dark:text-blue-100`).

## Action Plan
1. Update `src/app/globals.css` to ensure base dark background is set.
2. Update `src/app/page.tsx` with `dark:` utility classes for all listed elements.
3. Systematically update the imported components.

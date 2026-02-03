/**
 * PowerPoint Generator for SGA Budget Approvals
 *
 * Generates branded slideshows for presenting approved budget requests to Senate.
 * Uses PptxGenJS for document generation with Stevens SGA branding.
 */

import PptxGenJS from 'pptxgenjs';
import { BudgetRequest } from '@/types/budget-request';
import type { PresentationRequest } from '@/types/presentation-request';
import { BRANDING } from '@/constants/branding';

// ============================================================================
// Constants
// ============================================================================

const MAX_DESCRIPTION_LENGTH = 200;

/** Badge colors for different finance routes */
const FINANCE_ROUTE_COLORS: Record<string, { bg: string; text: string }> = {
  'Auto-Approve': { bg: '#10B981', text: '#FFFFFF' },    // Green
  'Budget Review': { bg: '#F59E0B', text: '#FFFFFF' },   // Amber
  'Sunday Meeting': { bg: '#3B82F6', text: '#FFFFFF' },  // Blue
};

/** Badge colors for request types */
const REQUEST_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'AFR': { bg: '#8B5CF6', text: '#FFFFFF' },             // Purple
  'Reallocation': { bg: '#06B6D4', text: '#FFFFFF' },    // Cyan
};

/** Badge colors for approval status */
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Approved': { bg: '#10B981', text: '#FFFFFF' },        // Green
  'Denied': { bg: '#EF4444', text: '#FFFFFF' },          // Red
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a number as USD currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Truncate text to max length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength - 3).trim() + '...';
}

/**
 * Format current date for title slide
 */
function formatCurrentDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get the display name for an organization (with numbering if applicable)
 */
function getDisplayName(request: BudgetRequest): string {
  return request.displayName || request.organizationName;
}

// ============================================================================
// Slide Creation Functions
// ============================================================================

/**
 * Create the title slide with SGA branding
 */
function createTitleSlide(pptx: PptxGenJS): void {
  const slide = pptx.addSlide();

  // Stevens Red header bar
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: 1.2,
    fill: { color: BRANDING.colors.primary.replace('#', '') },
  });

  // Main title
  slide.addText('SGA Budget Approvals', {
    x: 0.5,
    y: 1.8,
    w: 9,
    h: 1,
    fontSize: 44,
    fontFace: BRANDING.fonts.heading,
    bold: true,
    color: BRANDING.colors.secondary.replace('#', ''),
    align: 'center',
  });

  // Subtitle with date
  slide.addText(formatCurrentDate(), {
    x: 0.5,
    y: 2.8,
    w: 9,
    h: 0.5,
    fontSize: 20,
    fontFace: BRANDING.fonts.body,
    color: BRANDING.colors.textMuted.replace('#', ''),
    align: 'center',
  });

  // Stevens SGA text at bottom
  slide.addText('Stevens Student Government Association', {
    x: 0.5,
    y: 4.8,
    w: 9,
    h: 0.4,
    fontSize: 14,
    fontFace: BRANDING.fonts.body,
    color: BRANDING.colors.primary.replace('#', ''),
    align: 'center',
  });

  // Bottom accent bar
  slide.addShape('rect', {
    x: 0,
    y: 5.4,
    w: '100%',
    h: 0.225,
    fill: { color: BRANDING.colors.primary.replace('#', '') },
  });
}

/**
 * Create a budget request slide
 */
function createRequestSlide(pptx: PptxGenJS, request: BudgetRequest, index: number, total: number): void {
  const slide = pptx.addSlide();

  // Header bar with Stevens Red
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: 0.8,
    fill: { color: BRANDING.colors.primary.replace('#', '') },
  });

  // Slide counter in header
  slide.addText(`${index + 1} of ${total}`, {
    x: 8.5,
    y: 0.25,
    w: 1.2,
    h: 0.3,
    fontSize: 12,
    fontFace: BRANDING.fonts.body,
    color: 'FFFFFF',
    align: 'right',
  });

  // Organization name (main heading)
  const displayName = getDisplayName(request);
  slide.addText(displayName, {
    x: 0.5,
    y: 1.0,
    w: 9,
    h: 0.7,
    fontSize: 32,
    fontFace: BRANDING.fonts.heading,
    bold: true,
    color: BRANDING.colors.secondary.replace('#', ''),
    align: 'left',
    valign: 'middle',
  });

  // Amount (prominent display)
  slide.addText(formatCurrency(request.amount), {
    x: 0.5,
    y: 1.7,
    w: 9,
    h: 0.6,
    fontSize: 28,
    fontFace: BRANDING.fonts.heading,
    bold: true,
    color: BRANDING.colors.primary.replace('#', ''),
    align: 'left',
    valign: 'middle',
  });

  // Badges row (Finance Route + Request Type)
  const badgeY = 2.4;
  const badgeHeight = 0.35;
  const badgeFontSize = 11;

  // Finance Route badge
  const routeColors = FINANCE_ROUTE_COLORS[request.financeRoute] || { bg: '9CA3AF', text: 'FFFFFF' };
  slide.addShape('roundRect', {
    x: 0.5,
    y: badgeY,
    w: 1.6,
    h: badgeHeight,
    fill: { color: routeColors.bg.replace('#', '') },
    rectRadius: 0.1,
  });
  slide.addText(request.financeRoute, {
    x: 0.5,
    y: badgeY,
    w: 1.6,
    h: badgeHeight,
    fontSize: badgeFontSize,
    fontFace: BRANDING.fonts.body,
    bold: true,
    color: routeColors.text.replace('#', ''),
    align: 'center',
    valign: 'middle',
  });

  // Request Type badge
  const typeColors = REQUEST_TYPE_COLORS[request.requestType] || { bg: '9CA3AF', text: 'FFFFFF' };
  slide.addShape('roundRect', {
    x: 2.2,
    y: badgeY,
    w: 1.4,
    h: badgeHeight,
    fill: { color: typeColors.bg.replace('#', '') },
    rectRadius: 0.1,
  });
  slide.addText(request.requestType, {
    x: 2.2,
    y: badgeY,
    w: 1.4,
    h: badgeHeight,
    fontSize: badgeFontSize,
    fontFace: BRANDING.fonts.body,
    bold: true,
    color: typeColors.text.replace('#', ''),
    align: 'center',
    valign: 'middle',
  });

  // Divider line
  slide.addShape('rect', {
    x: 0.5,
    y: 2.95,
    w: 9,
    h: 0.02,
    fill: { color: BRANDING.colors.lightGray.replace('#', '') },
  });

  // Description label
  slide.addText('Description', {
    x: 0.5,
    y: 3.1,
    w: 9,
    h: 0.3,
    fontSize: 12,
    fontFace: BRANDING.fonts.body,
    bold: true,
    color: BRANDING.colors.textMuted.replace('#', ''),
    align: 'left',
  });

  // Description text (truncated)
  const truncatedDescription = truncateText(request.description, MAX_DESCRIPTION_LENGTH);
  slide.addText(truncatedDescription || 'No description provided.', {
    x: 0.5,
    y: 3.4,
    w: 9,
    h: 1.6,
    fontSize: 16,
    fontFace: BRANDING.fonts.body,
    color: BRANDING.colors.textDark.replace('#', ''),
    align: 'left',
    valign: 'top',
    wrap: true,
  });

  // Bottom accent bar
  slide.addShape('rect', {
    x: 0,
    y: 5.4,
    w: '100%',
    h: 0.225,
    fill: { color: BRANDING.colors.primary.replace('#', '') },
  });
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Generate a PowerPoint slideshow for approved budget requests
 *
 * @param requests - Array of approved budget requests to include in the slideshow
 * @returns Promise<Buffer> - The generated PPTX file as a Buffer
 *
 * @example
 * ```typescript
 * const requests = [{ organizationName: 'SGA', amount: 500, ... }];
 * const buffer = await generatePPTX(requests);
 * // Save or send the buffer as a .pptx file
 * ```
 */
export async function generatePPTX(requests: BudgetRequest[]): Promise<Buffer> {
  // Create new presentation
  const pptx = new PptxGenJS();

  // Set presentation properties
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = 'SGA Budget Approvals';
  pptx.author = 'SGA Finance Department';
  pptx.company = 'Stevens Student Government Association';
  pptx.subject = 'Budget Request Approvals for Senate Presentation';

  // Set default slide background
  pptx.defineSlideMaster({
    title: 'SGA_MASTER',
    background: { color: 'FFFFFF' },
  });

  // Create title slide
  createTitleSlide(pptx);

  // Create a slide for each request
  requests.forEach((request, index) => {
    createRequestSlide(pptx, request, index, requests.length);
  });

  // Generate the PPTX file
  const output = await pptx.write({ outputType: 'nodebuffer' });

  // Ensure we return a Buffer
  if (Buffer.isBuffer(output)) {
    return output;
  }

  // Handle ArrayBuffer or other types
  if (output instanceof ArrayBuffer) {
    return Buffer.from(output);
  }

  // Handle Uint8Array
  if (output instanceof Uint8Array) {
    return Buffer.from(output);
  }

  throw new Error('Unexpected output type from PptxGenJS');
}

// ============================================================================
// New: Presentation Request Slide Functions (for XLSX-to-PPTX workflow)
// ============================================================================

/**
 * Create a title slide for weekly presentation
 */
function createWeeklyTitleSlide(pptx: PptxGenJS, weekDate: string): void {
  const slide = pptx.addSlide();

  // Stevens Red header bar
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: 1.2,
    fill: { color: BRANDING.colors.primary.replace('#', '') },
  });

  // Main title
  slide.addText('SGA Budget Approvals', {
    x: 0.5,
    y: 1.8,
    w: 9,
    h: 1,
    fontSize: 44,
    fontFace: BRANDING.fonts.heading,
    bold: true,
    color: BRANDING.colors.secondary.replace('#', ''),
    align: 'center',
  });

  // Subtitle with week date
  slide.addText(`Week of ${weekDate}`, {
    x: 0.5,
    y: 2.8,
    w: 9,
    h: 0.5,
    fontSize: 24,
    fontFace: BRANDING.fonts.body,
    color: BRANDING.colors.textMuted.replace('#', ''),
    align: 'center',
  });

  // Stevens SGA text at bottom
  slide.addText('Stevens Student Government Association', {
    x: 0.5,
    y: 4.8,
    w: 9,
    h: 0.4,
    fontSize: 14,
    fontFace: BRANDING.fonts.body,
    color: BRANDING.colors.primary.replace('#', ''),
    align: 'center',
  });

  // Bottom accent bar
  slide.addShape('rect', {
    x: 0,
    y: 5.4,
    w: '100%',
    h: 0.225,
    fill: { color: BRANDING.colors.primary.replace('#', '') },
  });
}

/**
 * Create a presentation request slide with status badge and amended amount display
 */
function createPresentationRequestSlide(
  pptx: PptxGenJS, 
  request: PresentationRequest, 
  index: number, 
  total: number
): void {
  const slide = pptx.addSlide();
  
  // Determine if denied (affects styling)
  const isDenied = request.status === 'Denied';

  // Header bar with Stevens Red
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: '100%',
    h: 0.8,
    fill: { color: BRANDING.colors.primary.replace('#', '') },
  });

  // Slide counter in header
  slide.addText(`${index + 1} of ${total}`, {
    x: 8.5,
    y: 0.25,
    w: 1.2,
    h: 0.3,
    fontSize: 12,
    fontFace: BRANDING.fonts.body,
    color: 'FFFFFF',
    align: 'right',
  });

  // Organization name (main heading)
  slide.addText(request.displayName, {
    x: 0.5,
    y: 1.0,
    w: 7.5,
    h: 0.7,
    fontSize: 32,
    fontFace: BRANDING.fonts.heading,
    bold: true,
    color: BRANDING.colors.secondary.replace('#', ''),
    align: 'left',
    valign: 'middle',
  });

  // Status badge (top right, prominent)
  const statusColors = STATUS_COLORS[request.status] || { bg: '9CA3AF', text: 'FFFFFF' };
  slide.addShape('roundRect', {
    x: 8.0,
    y: 1.1,
    w: 1.5,
    h: 0.45,
    fill: { color: statusColors.bg.replace('#', '') },
    rectRadius: 0.1,
  });
  slide.addText(request.status.toUpperCase(), {
    x: 8.0,
    y: 1.1,
    w: 1.5,
    h: 0.45,
    fontSize: 14,
    fontFace: BRANDING.fonts.body,
    bold: true,
    color: statusColors.text.replace('#', ''),
    align: 'center',
    valign: 'middle',
  });

  // Amount display - shows "Requested → Final" if amended, otherwise just "Final"
  let amountY = 1.7;
  
  if (request.wasAmended && request.requestedAmount !== request.finalAmount) {
    // Show "Requested: $X → Final: $Y" format
    slide.addText(`Requested: ${formatCurrency(request.requestedAmount)}  →  Final: ${formatCurrency(request.finalAmount)}`, {
      x: 0.5,
      y: amountY,
      w: 9,
      h: 0.5,
      fontSize: 22,
      fontFace: BRANDING.fonts.heading,
      bold: true,
      color: isDenied ? 'EF4444' : BRANDING.colors.primary.replace('#', ''),
      align: 'left',
      valign: 'middle',
    });
  } else {
    // Show just "Final: $X" for non-amended requests
    const amountText = isDenied 
      ? `Requested: ${formatCurrency(request.requestedAmount)}` 
      : `Final: ${formatCurrency(request.finalAmount)}`;
    slide.addText(amountText, {
      x: 0.5,
      y: amountY,
      w: 9,
      h: 0.5,
      fontSize: 26,
      fontFace: BRANDING.fonts.heading,
      bold: true,
      color: isDenied ? 'EF4444' : BRANDING.colors.primary.replace('#', ''),
      align: 'left',
      valign: 'middle',
    });
  }

  // Badges row (Finance Route + Request Type)
  const badgeY = 2.35;
  const badgeHeight = 0.35;
  const badgeFontSize = 11;

  // Finance Route badge
  const routeColors = FINANCE_ROUTE_COLORS[request.financeRoute] || { bg: '9CA3AF', text: 'FFFFFF' };
  slide.addShape('roundRect', {
    x: 0.5,
    y: badgeY,
    w: 1.6,
    h: badgeHeight,
    fill: { color: routeColors.bg.replace('#', '') },
    rectRadius: 0.1,
  });
  slide.addText(request.financeRoute, {
    x: 0.5,
    y: badgeY,
    w: 1.6,
    h: badgeHeight,
    fontSize: badgeFontSize,
    fontFace: BRANDING.fonts.body,
    bold: true,
    color: routeColors.text.replace('#', ''),
    align: 'center',
    valign: 'middle',
  });

  // Request Type badge
  const typeColors = REQUEST_TYPE_COLORS[request.requestType] || { bg: '9CA3AF', text: 'FFFFFF' };
  slide.addShape('roundRect', {
    x: 2.2,
    y: badgeY,
    w: 1.4,
    h: badgeHeight,
    fill: { color: typeColors.bg.replace('#', '') },
    rectRadius: 0.1,
  });
  slide.addText(request.requestType, {
    x: 2.2,
    y: badgeY,
    w: 1.4,
    h: badgeHeight,
    fontSize: badgeFontSize,
    fontFace: BRANDING.fonts.body,
    bold: true,
    color: typeColors.text.replace('#', ''),
    align: 'center',
    valign: 'middle',
  });

  // Divider line
  slide.addShape('rect', {
    x: 0.5,
    y: 2.9,
    w: 9,
    h: 0.02,
    fill: { color: BRANDING.colors.lightGray.replace('#', '') },
  });

  // Description section - only show if description exists
  if (request.description && request.description.trim()) {
    // Description label
    slide.addText('Description', {
      x: 0.5,
      y: 3.05,
      w: 9,
      h: 0.3,
      fontSize: 12,
      fontFace: BRANDING.fonts.body,
      bold: true,
      color: BRANDING.colors.textMuted.replace('#', ''),
      align: 'left',
    });

    // Description text (truncated)
    const truncatedDescription = truncateText(request.description, MAX_DESCRIPTION_LENGTH);
    slide.addText(truncatedDescription, {
      x: 0.5,
      y: 3.35,
      w: 9,
      h: 1.7,
      fontSize: 16,
      fontFace: BRANDING.fonts.body,
      color: BRANDING.colors.textDark.replace('#', ''),
      align: 'left',
      valign: 'top',
      wrap: true,
    });
  }

  // Bottom accent bar
  slide.addShape('rect', {
    x: 0,
    y: 5.4,
    w: '100%',
    h: 0.225,
    fill: { color: BRANDING.colors.primary.replace('#', '') },
  });
}

/**
 * Generate a PowerPoint slideshow from PresentationRequest array (XLSX-to-PPTX workflow)
 * 
 * This is the new workflow where we generate PPTX from a completed weekly spreadsheet.
 * Shows both Approved and Denied requests with status badges.
 *
 * @param requests - Array of PresentationRequest objects from the weekly spreadsheet
 * @param weekDate - The week date string (e.g., "2/1") for the title slide
 * @returns Promise<Buffer> - The generated PPTX file as a Buffer
 */
export async function generatePPTXFromSpreadsheet(
  requests: PresentationRequest[],
  weekDate: string
): Promise<Buffer> {
  // Create new presentation
  const pptx = new PptxGenJS();

  // Set presentation properties
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = `SGA Budget Approvals - Week of ${weekDate}`;
  pptx.author = 'SGA Finance Department';
  pptx.company = 'Stevens Student Government Association';
  pptx.subject = `Budget Request Approvals for Week of ${weekDate}`;

  // Set default slide background
  pptx.defineSlideMaster({
    title: 'SGA_MASTER',
    background: { color: 'FFFFFF' },
  });

  // Create title slide with week date
  createWeeklyTitleSlide(pptx, weekDate);

  // Create a slide for each request
  requests.forEach((request, index) => {
    createPresentationRequestSlide(pptx, request, index, requests.length);
  });

  // Generate the PPTX file
  const output = await pptx.write({ outputType: 'nodebuffer' });

  // Ensure we return a Buffer
  if (Buffer.isBuffer(output)) {
    return output;
  }

  // Handle ArrayBuffer or other types
  if (output instanceof ArrayBuffer) {
    return Buffer.from(output);
  }

  // Handle Uint8Array
  if (output instanceof Uint8Array) {
    return Buffer.from(output);
  }

  throw new Error('Unexpected output type from PptxGenJS');
}

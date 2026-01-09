/**
 * Stevens SGA branding constants
 */

export const BRANDING = {
  colors: {
    primary: '#A32638',      // Stevens Red
    secondary: '#1E1E1E',    // Dark Gray
    accent: '#FFFFFF',       // White
    background: '#F5F5F5',   // Light Gray
    lightGray: '#E5E5E5',    // Border/divider color
    textDark: '#333333',     // Primary text
    textMuted: '#666666',    // Secondary text
  },
  fonts: {
    heading: 'Arial',
    body: 'Arial',
  },
  slide: {
    width: 10,               // inches
    height: 5.625,           // inches (16:9 ratio)
  },
} as const;

export type BrandingColors = typeof BRANDING.colors;

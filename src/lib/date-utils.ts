/**
 * Date utilities for SGA Finance Platform
 * Handles meeting date calculations
 */

/**
 * Get the next Sunday from a given date
 * If the given date is already Sunday, returns that same date
 * 
 * @param fromDate - Starting date (defaults to today)
 * @returns Date object representing the next Sunday
 */
export function getNextSunday(fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  if (dayOfWeek === 0) {
    // Already Sunday, return same date
    return date;
  }
  
  // Calculate days until next Sunday
  const daysUntilSunday = 7 - dayOfWeek;
  date.setDate(date.getDate() + daysUntilSunday);
  
  return date;
}

/**
 * Format a date as a readable meeting date string
 * Example: "Sunday, January 11, 2026"
 * 
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatMeetingDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date as a short meeting date string
 * Example: "1/11/26"
 * 
 * @param date - Date to format
 * @returns Short formatted date string
 */
export function formatMeetingDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  });
}

/**
 * Parse a date string in various formats
 * Supports ISO format and common US formats
 * 
 * @param dateString - Date string to parse
 * @returns Date object or null if parsing fails
 */
export function parseDateString(dateString: string): Date | null {
  // Try ISO format first
  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  // Try MM/DD/YYYY format
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10) - 1; // Months are 0-indexed
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    
    // Handle 2-digit years
    if (year < 100) {
      year += 2000;
    }
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

/**
 * Get the suggested next meeting date as an ISO string (YYYY-MM-DD)
 * Useful for date input default values
 * 
 * @returns ISO date string for next Sunday
 */
export function getNextSundayISO(): string {
  const nextSunday = getNextSunday();
  return nextSunday.toISOString().split('T')[0];
}

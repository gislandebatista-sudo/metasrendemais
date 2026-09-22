import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as a percentage string with at most 3 decimal places.
 * Trailing zeros are removed.
 * E.g. 75.54 → "75,54", 100 → "100", 82.2734444 → "82,273"
 */
export function formatPercent(value: number): string {
  const str = parseFloat(value.toFixed(3)).toString();
  // Replace dot with comma for Brazilian locale
  return str.replace('.', ',');
}

/**
 * Formats a date string (YYYY-MM-DD) to Brazilian locale format (DD/MM/YYYY)
 * without timezone conversion issues.
 * This is important because date-only strings from PostgreSQL are in UTC,
 * and using new Date() can shift the date due to timezone offset.
 */
export function formatDateBR(dateString: string | undefined): string {
  if (!dateString) return '';
  
  // Parse the date parts directly from the string to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/**
 * Creates a Date object from a YYYY-MM-DD string without timezone shift.
 * Sets time to noon to avoid any edge cases with timezone conversions.
 */
export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

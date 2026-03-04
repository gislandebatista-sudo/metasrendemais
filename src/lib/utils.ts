import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as a percentage string without any rounding.
 * Removes trailing zeros but keeps all meaningful decimal places.
 * E.g. 75.54 → "75,54", 100 → "100", 19.2400 → "19,24"
 */
export function formatPercent(value: number): string {
  // Use a high precision to avoid floating point display issues
  const str = parseFloat(value.toFixed(10)).toString();
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

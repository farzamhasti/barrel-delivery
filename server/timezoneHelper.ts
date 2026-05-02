/**
 * Timezone helper for Ontario time (EST/EDT)
 * Ontario observes Eastern Time: UTC-5 (EST) or UTC-4 (EDT)
 */

const ONTARIO_TIMEZONE = 'America/Toronto';

/**
 * Convert a datetime-local string (YYYY-MM-DDTHH:MM) to a Date object in Ontario timezone
 * The datetime-local input represents the local time the user sees in their browser
 * We need to convert it to UTC for storage
 * 
 * @param datetimeLocalString - Format: YYYY-MM-DDTHH:MM
 * @returns Date object representing the Ontario time in UTC
 */
export function convertOntarioTimeToUTC(datetimeLocalString: string): Date {
  // Parse the datetime-local string
  const [datePart, timePart] = datetimeLocalString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  // Create a date in Ontario timezone
  // The Intl API will help us handle DST correctly
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ONTARIO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Create a temporary date and adjust for Ontario timezone
  // We create a date assuming the input is in Ontario local time
  const tempDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  // Get the UTC offset for Ontario on this date (handles DST)
  const parts = formatter.formatToParts(tempDate);
  const formattedYear = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
  const formattedMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
  const formattedDay = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
  const formattedHours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const formattedMinutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  // Calculate the offset
  const offset = tempDate.getTime() - new Date(formattedYear, formattedMonth - 1, formattedDay, formattedHours, formattedMinutes).getTime();

  // Apply the offset to get the correct UTC time
  const utcDate = new Date(tempDate.getTime() - offset);

  return utcDate;
}

/**
 * Convert a UTC Date to Ontario local time string (YYYY-MM-DDTHH:MM)
 * 
 * @param utcDate - Date object in UTC
 * @returns String in format YYYY-MM-DDTHH:MM representing Ontario local time
 */
export function convertUTCToOntarioTime(utcDate: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ONTARIO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Get current time in Ontario timezone as a Date object
 * 
 * @returns Current time in Ontario timezone as UTC Date
 */
export function getNowInOntarioTime(): Date {
  const now = new Date();
  return convertOntarioTimeToUTC(convertUTCToOntarioTime(now));
}

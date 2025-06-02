import { Timestamp } from 'firebase/firestore';

/**
 * Enterprise-grade timestamp utilities to handle all date/time operations
 * and eliminate "Invalid time value" console errors
 */

export interface SafeTimestamp {
  toDate(): Date;
  toMillis(): number;
  isValid(): boolean;
  toString(): string;
}

export type TimestampInput = 
  | Timestamp 
  | Date 
  | string 
  | number 
  | null 
  | undefined
  | { toDate?: () => Date; seconds?: number; nanoseconds?: number };

/**
 * Safely converts any timestamp input to a valid Date object
 */
export function safeTimestampToDate(timestamp: TimestampInput): Date {
  try {
    // Handle null/undefined
    if (!timestamp) {
      return new Date();
    }

    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return isValidDate(date) ? date : new Date();
    }

    // Handle Firestore Timestamp-like objects with seconds/nanoseconds
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      const date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
      return isValidDate(date) ? date : new Date();
    }

    // Handle JavaScript Date objects
    if (timestamp instanceof Date) {
      return isValidDate(timestamp) ? timestamp : new Date();
    }

    // Handle Unix timestamps (numbers)
    if (typeof timestamp === 'number') {
      // Check if it's in seconds or milliseconds
      const date = timestamp > 1e10 ? new Date(timestamp) : new Date(timestamp * 1000);
      return isValidDate(date) ? date : new Date();
    }

    // Handle ISO strings
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isValidDate(date) ? date : new Date();
    }

    // Fallback to current date
    return new Date();
  } catch (error) {
    console.warn('Timestamp conversion error:', error, 'Input:', timestamp);
    return new Date();
  }
}

/**
 * Checks if a Date object is valid
 */
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Safely formats a timestamp to a human-readable string
 */
export function formatTimestamp(
  timestamp: TimestampInput,
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const date = safeTimestampToDate(timestamp);
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };

    return date.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.warn('Timestamp formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Safely formats a timestamp to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: TimestampInput): string {
  try {
    const date = safeTimestampToDate(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // If the date is in the future or too far in the past, show absolute date
    if (diffMs < 0 || diffMs > 365 * 24 * 60 * 60 * 1000) {
      return formatTimestamp(date, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else if (diffWeeks < 4) {
      return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
    } else if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
    } else {
      return formatTimestamp(date, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (error) {
    console.warn('Relative time formatting error:', error);
    return 'Unknown time';
  }
}

/**
 * Safely calculates time remaining until a deadline
 */
export function formatTimeRemaining(deadline: TimestampInput): string {
  try {
    const deadlineDate = safeTimestampToDate(deadline);
    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'Expired';
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} left`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} left`;
    } else {
      return `${diffSeconds} second${diffSeconds === 1 ? '' : 's'} left`;
    }
  } catch (error) {
    console.warn('Time remaining calculation error:', error);
    return 'Unknown';
  }
}

/**
 * Safely converts timestamp to ISO string
 */
export function toISOString(timestamp: TimestampInput): string {
  try {
    return safeTimestampToDate(timestamp).toISOString();
  } catch (error) {
    console.warn('ISO string conversion error:', error);
    return new Date().toISOString();
  }
}

/**
 * Safely gets Unix timestamp in milliseconds
 */
export function toUnixTimestamp(timestamp: TimestampInput): number {
  try {
    return safeTimestampToDate(timestamp).getTime();
  } catch (error) {
    console.warn('Unix timestamp conversion error:', error);
    return Date.now();
  }
}

/**
 * Creates a safe timestamp wrapper for better error handling
 */
export function createSafeTimestamp(input: TimestampInput): SafeTimestamp {
  const date = safeTimestampToDate(input);
  
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    isValid: () => isValidDate(date),
    toString: () => formatTimestamp(date)
  };
}

/**
 * Validates if a timestamp is within a reasonable range
 */
export function isReasonableTimestamp(timestamp: TimestampInput): boolean {
  try {
    const date = safeTimestampToDate(timestamp);
    const now = Date.now();
    const tenYearsAgo = now - (10 * 365 * 24 * 60 * 60 * 1000);
    const tenYearsFromNow = now + (10 * 365 * 24 * 60 * 60 * 1000);
    
    const time = date.getTime();
    return time >= tenYearsAgo && time <= tenYearsFromNow;
  } catch {
    return false;
  }
}

/**
 * Formats timestamp for campaign deadlines with countdown
 */
export function formatCampaignDeadline(deadline: TimestampInput): {
  formatted: string;
  timeRemaining: string;
  isExpired: boolean;
  urgency: 'high' | 'medium' | 'low';
} {
  try {
    const deadlineDate = safeTimestampToDate(deadline);
    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();
    const isExpired = diffMs <= 0;
    
    const formatted = formatTimestamp(deadlineDate, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const timeRemaining = formatTimeRemaining(deadline);
    
    let urgency: 'high' | 'medium' | 'low' = 'low';
    if (isExpired) {
      urgency = 'high';
    } else {
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays <= 1) urgency = 'high';
      else if (diffDays <= 7) urgency = 'medium';
    }
    
    return {
      formatted,
      timeRemaining,
      isExpired,
      urgency
    };
  } catch (error) {
    console.warn('Campaign deadline formatting error:', error);
    return {
      formatted: 'Invalid Date',
      timeRemaining: 'Unknown',
      isExpired: true,
      urgency: 'high'
    };
  }
}

/**
 * Batch processes multiple timestamps safely
 */
export function batchFormatTimestamps(
  timestamps: TimestampInput[],
  options?: Intl.DateTimeFormatOptions
): string[] {
  return timestamps.map(timestamp => formatTimestamp(timestamp, options));
}

// Export commonly used timestamp formats
export const TIMESTAMP_FORMATS = {
  SHORT_DATE: { month: 'short', day: 'numeric' } as Intl.DateTimeFormatOptions,
  LONG_DATE: { month: 'long', day: 'numeric', year: 'numeric' } as Intl.DateTimeFormatOptions,
  DATE_TIME: { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  } as Intl.DateTimeFormatOptions,
  FULL_DATE_TIME: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  } as Intl.DateTimeFormatOptions
};

// Utility for debugging timestamp issues
export function debugTimestamp(timestamp: TimestampInput): void {
  console.group('Timestamp Debug');
  console.log('Input:', timestamp);
  console.log('Type:', typeof timestamp);
  console.log('Is Firestore Timestamp:', timestamp && typeof timestamp === 'object' && 'toDate' in timestamp);
  console.log('Safe Date:', safeTimestampToDate(timestamp));
  console.log('Is Valid:', isValidDate(safeTimestampToDate(timestamp)));
  console.log('Formatted:', formatTimestamp(timestamp));
  console.groupEnd();
}
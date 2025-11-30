/**
 * Utility functions for the application
 */

/**
 * Clean data by removing undefined and null values
 */
export function cleanData(data: any, dbType?: 'firestore' | 'mongodb' | 'postgres'): any {
  const cleaned: any = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip null/undefined for all databases
    if (value === undefined || value === null) continue;

    // Database-specific rules
    if (dbType === 'firestore' && value === '') continue;
    if (dbType === 'mongodb' && key === '_id') continue;

    cleaned[key] = value;
  }

  return cleaned;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate a random ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    backoff?: number;
    onRetry?: (error: any, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, backoff = 1000, onRetry } = options;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      if (onRetry) onRetry(error, i + 1);
      await delay(backoff * Math.pow(2, i));
    }
  }

  throw new Error('Retry failed');
}

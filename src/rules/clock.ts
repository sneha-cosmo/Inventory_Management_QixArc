/**
 * Central Injectable Clock
 * Provides a single source of time for all date comparisons, expiry calculations,
 * and stock aging in the application. Eliminates hardcoded literal dates.
 */

let injectedDate: Date | null = null;

export const Clock = {
  /**
   * Sets the current clock to a specific date (used for deterministic testing or historical auditing).
   */
  setCurrentDate(date: Date | string): void {
    injectedDate = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  },

  /**
   * Resets the clock to use the actual system current date.
   */
  resetClock(): void {
    injectedDate = null;
  },

  /**
   * Returns the current date (either injected or real system date).
   */
  getCurrentDate(): Date {
    return injectedDate ? new Date(injectedDate.getTime()) : new Date();
  },

  /**
   * Returns the current date formatted as YYYY-MM-DD.
   */
  getCurrentDateString(): string {
    const d = this.getCurrentDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Calculates the difference in integer calendar days between a target date and the base date (defaults to current clock).
   * Positive value = targetDate is in the future.
   * Zero or negative = targetDate is today or in the past.
   */
  diffInDays(targetDate: string | Date, baseDate?: Date): number {
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    const base = baseDate || this.getCurrentDate();

    // Normalize both dates to midnight UTC to prevent time zone drift
    const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
    const utcBase = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate());

    const diffMs = utcTarget - utcBase;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
};

/**
 * Central Injectable Clock
 * Provides a single source of time for all date comparisons, expiry calculations,
 * stock aging, forecasts, and period dropdowns in the application. Eliminates hardcoded literal dates.
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
    return this.formatDate(d);
  },

  /**
   * Returns the current year and month as YYYY-MM.
   */
  getCurrentYearMonth(): string {
    const d = this.getCurrentDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  },

  /**
   * Formats a date object or string into YYYY-MM-DD.
   */
  formatDate(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Formats a date object into YYYY-MM-DD HH:mm:ss.
   */
  formatDateTime(d: Date | string = this.getCurrentDate()): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const secs = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
  },

  /**
   * Offsets days from baseDate (or current clock) and returns a new Date.
   */
  offsetDays(days: number, baseDate?: Date): Date {
    const base = baseDate ? new Date(baseDate.getTime()) : this.getCurrentDate();
    base.setDate(base.getDate() + days);
    return base;
  },

  /**
   * Offsets days from baseDate (or current clock) and returns YYYY-MM-DD string.
   */
  offsetDaysString(days: number, baseDate?: Date): string {
    return this.formatDate(this.offsetDays(days, baseDate));
  },

  /**
   * Offsets months from baseDate (or current clock) and returns YYYY-MM string.
   */
  offsetMonthsString(months: number, baseDate?: Date): string {
    const base = baseDate ? new Date(baseDate.getTime()) : this.getCurrentDate();
    base.setMonth(base.getMonth() + months);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  },

  /**
   * Returns list of recent months (e.g. for last 6 months trend / period filters)
   * in format { key: 'YYYY-MM', label: 'Month YYYY', monthName: 'Jan' }
   */
  getRecentMonths(count: number = 6, baseDate?: Date): Array<{ key: string; label: string; monthCode: string; monthName: string; year: number }> {
    const results: Array<{ key: string; label: string; monthCode: string; monthName: string; year: number }> = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const base = baseDate ? new Date(baseDate.getTime()) : this.getCurrentDate();

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthCode = String(monthNum).padStart(2, '0');
      const key = `${year}-${monthCode}`;
      const monthName = monthNames[d.getMonth()];
      results.push({
        key,
        label: `${monthName} ${year}`,
        monthCode,
        monthName,
        year
      });
    }
    return results;
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

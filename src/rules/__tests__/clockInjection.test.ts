import { describe, it, expect, beforeEach } from 'vitest';
import { Clock } from '../clock';
import { classifyExpiry } from '../expiry';
import { computeInvoiceStatus } from '../invoice';

describe('Central Injectable Clock Verification', () => {
  beforeEach(() => {
    Clock.resetClock();
  });

  it('Default clock returns current real date', () => {
    const now = new Date();
    const clockDate = Clock.getCurrentDate();
    expect(Math.abs(clockDate.getTime() - now.getTime())).toBeLessThan(1000);
  });

  it('Injected clock changes expiry calculations deterministically', () => {
    const fixedBatchExpiry = '2026-06-10';

    // When Clock is injected as 2026-06-01 (9 days left -> Near Expiry)
    Clock.setCurrentDate(new Date('2026-06-01T00:00:00Z'));
    const classification1 = classifyExpiry(fixedBatchExpiry);
    expect(classification1.diffDays).toBe(9);
    expect(classification1.status).toBe('Near Expiry');

    // When Clock is moved forward to 2026-06-05 (5 days left -> Critical)
    Clock.setCurrentDate(new Date('2026-06-05T00:00:00Z'));
    const classification2 = classifyExpiry(fixedBatchExpiry);
    expect(classification2.diffDays).toBe(5);
    expect(classification2.status).toBe('Critical');

    // When Clock is moved to expiry day 2026-06-10 (0 days left -> Expired)
    Clock.setCurrentDate(new Date('2026-06-10T00:00:00Z'));
    const classification3 = classifyExpiry(fixedBatchExpiry);
    expect(classification3.diffDays).toBe(0);
    expect(classification3.status).toBe('Expired');

    // When Clock is moved past expiry 2026-06-15 (-5 days -> Expired)
    Clock.setCurrentDate(new Date('2026-06-15T00:00:00Z'));
    const classification4 = classifyExpiry(fixedBatchExpiry);
    expect(classification4.diffDays).toBe(-5);
    expect(classification4.status).toBe('Expired');
  });

  it('Injected clock changes invoice overdue computation without component reloads', () => {
    const dueDate = '2026-06-15';

    // Prior to due date: unpaid status
    Clock.setCurrentDate(new Date('2026-06-10T00:00:00Z'));
    expect(computeInvoiceStatus(1000, 0, dueDate)).toBe('unpaid');

    // After due date: overdue status
    Clock.setCurrentDate(new Date('2026-06-16T00:00:00Z'));
    expect(computeInvoiceStatus(1000, 0, dueDate)).toBe('overdue');

    // Once fully paid, stays paid regardless of clock
    expect(computeInvoiceStatus(1000, 1000, dueDate)).toBe('paid');
  });

  it('Resetting clock restores real-time execution', () => {
    Clock.setCurrentDate(new Date('2020-01-01T00:00:00Z'));
    expect(Clock.getCurrentDate().getUTCFullYear()).toBe(2020);

    Clock.resetClock();
    expect(Clock.getCurrentDate().getUTCFullYear()).toBeGreaterThanOrEqual(2025);
  });
});

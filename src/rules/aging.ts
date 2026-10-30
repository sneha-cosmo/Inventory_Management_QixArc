/**
 * Pure Domain Rules: Inventory Stock Aging and Dead Stock Classification
 */
import { Clock } from './clock';

export type AgingBucket = '0-30' | '31-90' | '91-180' | '180+';

/**
 * Categorizes inventory items into standardized aging buckets:
 * - 0-30: Active / Fast-moving
 * - 31-90: Slow-moving
 * - 91-180: Lagging / Dormant
 * - 180+: Dead Stock (Obsolete)
 */
export function classifyStockAging(daysSinceMovement: number): AgingBucket {
  const days = Math.max(0, Number(daysSinceMovement) || 0);
  if (days <= 30) return '0-30';
  if (days <= 90) return '31-90';
  if (days <= 180) return '91-180';
  return '180+';
}

/**
 * Calculates days since last movement using the centralized Clock.
 */
export function calculateDaysSinceMovement(lastMovementDateStr: string, baseDate?: Date): number {
  if (!lastMovementDateStr) return 0;
  const days = Clock.diffInDays(lastMovementDateStr, baseDate);
  // Last movement was in the past, so days elapsed is positive
  return Math.max(0, -days);
}

/**
 * Checks whether an item qualifies as Dead Stock (180+ days without movement).
 */
export function isDeadStock(daysSinceMovement: number): boolean {
  return Number(daysSinceMovement) >= 180;
}

/**
 * Pure Domain Rules: Batch Expiry Classification & Health Bands
 */
import { Clock } from './clock';

export type ExpiryBand = 'Expired' | 'Critical' | 'Near Expiry' | 'Healthy';

export interface ExpiryClassification {
  status: ExpiryBand;
  diffDays: number;
  label: string;
  badgeClass: string;
}

/**
 * Classifies batch expiry based on the single injectable Clock:
 * - Expired: diffDays <= 0
 * - Critical: 1 <= diffDays <= 7 (exactly 7 days left is Critical)
 * - Near Expiry: 8 <= diffDays <= 30
 * - Healthy: diffDays > 30
 */
export function classifyExpiry(
  expiryDateStr: string,
  baseDate?: Date
): ExpiryClassification {
  if (!expiryDateStr) {
    return {
      status: 'Expired',
      diffDays: 0,
      label: 'Invalid Date',
      badgeClass: 'bg-red-100 text-red-700 border-red-300'
    };
  }

  const diffDays = Clock.diffInDays(expiryDateStr, baseDate);

  if (diffDays <= 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      status: 'Expired',
      diffDays,
      label: daysAgo === 0 ? 'Expires Today' : `Expired (${daysAgo}d ago)`,
      badgeClass: 'bg-red-100 text-red-700 border-red-300 font-bold'
    };
  }

  if (diffDays <= 7) {
    return {
      status: 'Critical',
      diffDays,
      label: `Critical (${diffDays}d left)`,
      badgeClass: 'bg-red-50 text-red-600 border-red-200 font-bold'
    };
  }

  if (diffDays <= 30) {
    return {
      status: 'Near Expiry',
      diffDays,
      label: `Near Expiry (${diffDays}d left)`,
      badgeClass: 'bg-orange-50 text-orange-600 border-orange-200 font-medium'
    };
  }

  return {
    status: 'Healthy',
    diffDays,
    label: `Healthy (${diffDays}d left)`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
  };
}

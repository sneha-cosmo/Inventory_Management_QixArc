/**
 * Pure Domain Rules: Invoice Numbering Validation and Status Lifecycle
 */
import { Clock } from './clock';

export type InvoiceLifecycleStatus = 'draft' | 'unpaid' | 'partial' | 'paid' | 'overdue' | 'void';

/**
 * Validates invoice numbering format:
 * - Maximum 16 characters
 * - Letters, digits, "/" and "-" only
 */
export const INVOICE_NUMBER_REGEX = /^[A-Za-z0-9/-]{1,16}$/;

export function validateInvoiceNumber(invNumber: string): { valid: boolean; error?: string } {
  if (!invNumber || typeof invNumber !== 'string') {
    return { valid: false, error: 'Invoice number is required.' };
  }

  const trimmed = invNumber.trim();
  if (trimmed.length > 16) {
    return { valid: false, error: `Invoice number must not exceed 16 characters (current: ${trimmed.length}).` };
  }

  if (!INVOICE_NUMBER_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Invoice number can only contain alphanumeric characters, "/" and "-".'
    };
  }

  return { valid: true };
}

/**
 * Computes dynamic invoice status following payments and due date:
 * - Paid: paidAmount >= totalAmount
 * - Overdue: dueDate is in the past and unpaid balance remains
 * - Partial: paidAmount > 0 but less than totalAmount (and dueDate not passed)
 * - Unpaid: no payments recorded and dueDate not passed
 * Preserves 'draft' and 'void' when explicitly set.
 */
export function computeInvoiceStatus(
  totalAmount: number,
  paidAmount: number,
  dueDateStr: string,
  currentStatus?: InvoiceLifecycleStatus,
  baseDate?: Date
): InvoiceLifecycleStatus {
  if (currentStatus === 'void') return 'void';
  if (currentStatus === 'draft' && paidAmount <= 0) return 'draft';

  const total = Number(totalAmount) || 0;
  const paid = Math.max(0, Number(paidAmount) || 0);

  if (paid >= total && total > 0) {
    return 'paid';
  }

  // Check if past due date using central Clock
  const daysDiff = Clock.diffInDays(dueDateStr, baseDate);
  const isPastDue = daysDiff < 0;

  if (isPastDue) {
    return 'overdue';
  }

  if (paid > 0) {
    return 'partial';
  }

  return 'unpaid';
}

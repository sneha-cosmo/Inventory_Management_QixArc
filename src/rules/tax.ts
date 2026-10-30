/**
 * Pure Domain Rules: GST Tax Computation, GSTIN Validation, and HSN Requirements
 */

export interface GstCalculation {
  taxableAmount: number;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
  isIntraState: boolean;
}

export type TurnoverBand = 'up_to_5_cr' | 'above_5_cr';

export interface TaxSettings {
  turnoverBand: TurnoverBand;
  homeStateCode: string; // E.g. '27' for Maharashtra
  homeStateName: string; // E.g. 'Maharashtra'
  hsnThresholds: {
    up_to_5_cr: number; // 4 digits
    above_5_cr: number; // 6 digits
  };
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  turnoverBand: 'up_to_5_cr',
  homeStateCode: '27',
  homeStateName: 'Maharashtra',
  hsnThresholds: {
    up_to_5_cr: 4,
    above_5_cr: 6
  }
};

/**
 * Standard Indian GSTIN regular expression pattern:
 * - 2 digits: State Code (01-38)
 * - 5 letters: PAN entity code
 * - 4 digits: PAN serial
 * - 1 letter: PAN check character
 * - 1 alphanumeric: Entity number of the same PAN in the state
 * - 'Z': Default letter in GSTIN
 * - 1 alphanumeric: Checksum digit
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstin(gstin: string): { valid: boolean; value: string; valueOf: () => boolean } {
  const isValid = !gstin || typeof gstin !== 'string' ? false : GSTIN_REGEX.test(gstin.trim().toUpperCase());
  return {
    valid: isValid,
    value: gstin,
    valueOf: () => isValid
  };
}

/**
 * Calculates GST based on place of supply:
 * - Intra-state (Customer state matches Company state): CGST (rate/2) + SGST (rate/2)
 * - Inter-state (Customer state differs from Company state): IGST (full rate)
 * 
 * Worked example in manual:
 * Rs 10,000 @ 18%:
 * - Intra-state: CGST Rs 900 + SGST Rs 900
 * - Inter-state: IGST Rs 1,800
 */
export function calculateGst(
  taxableAmount: number,
  gstRate: number,
  customerStateOrIsIntra: string | boolean = 'Maharashtra',
  homeState: string = 'Maharashtra'
): GstCalculation {
  const taxable = Math.max(0, Number(taxableAmount) || 0);
  const rate = Math.max(0, Number(gstRate) || 0);
  const isIntraState = typeof customerStateOrIsIntra === 'boolean'
    ? customerStateOrIsIntra
    : (!customerStateOrIsIntra || customerStateOrIsIntra.trim().toLowerCase() === homeState.trim().toLowerCase());

  const totalTax = (taxable * rate) / 100;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isIntraState) {
    cgst = totalTax / 2;
    sgst = totalTax / 2;
  } else {
    igst = totalTax;
  }

  return {
    taxableAmount: taxable,
    rate,
    cgst,
    sgst,
    igst,
    totalTax,
    totalAmount: taxable + totalTax,
    isIntraState
  };
}

/**
 * Determines required HSN digits based on configurable turnover band:
 * - Up to Rs 5 Crore: 4 digits
 * - Above Rs 5 Crore: 6 digits
 */
export function getRequiredHsnDigits(settings: TaxSettings | number = DEFAULT_TAX_SETTINGS): number {
  if (typeof settings === 'number') {
    return settings;
  }
  return settings?.hsnThresholds?.[settings.turnoverBand] ?? 4;
}

/**
 * Validates whether an HSN code conforms to the required minimum digit count.
 */
export function validateHsnCode(
  hsnCode: string,
  settingsOrDigits: TaxSettings | number = DEFAULT_TAX_SETTINGS
): { valid: boolean; requiredDigits: number } {
  const required = typeof settingsOrDigits === 'number'
    ? settingsOrDigits
    : getRequiredHsnDigits(settingsOrDigits);

  if (!hsnCode || typeof hsnCode !== 'string') {
    return { valid: false, requiredDigits: required };
  }
  const digitsOnly = hsnCode.replace(/\D/g, '');
  return {
    valid: digitsOnly.length >= required,
    requiredDigits: required
  };
}

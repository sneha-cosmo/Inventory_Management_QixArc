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

/**
 * Standard Indian GST tax rates list (0%, 0.1%, 0.25%, 1.5%, 3%, 5%, 12%, 18%, 28%).
 */
export const STANDARD_GST_RATES = [0, 0.1, 0.25, 1.5, 3, 5, 12, 18, 28];

/**
 * Common unit to statutory GST Unit Quantity Code (UQC) mapping table.
 */
export const UNIT_TO_UQC_MAP: Record<string, string> = {
  meters: 'MTR',
  meter: 'MTR',
  mtr: 'MTR',
  m: 'MTR',
  pcs: 'PCS',
  pieces: 'PCS',
  piece: 'PCS',
  nos: 'PCS',
  number: 'PCS',
  numbers: 'PCS',
  pk: 'PAC',
  pack: 'PAC',
  packs: 'PAC',
  packet: 'PAC',
  packets: 'PAC',
  kg: 'KGS',
  kgs: 'KGS',
  kilogram: 'KGS',
  kilograms: 'KGS',
  cones: 'CON',
  cone: 'CON',
  rolls: 'ROL',
  roll: 'ROL',
  boxes: 'BOX',
  box: 'BOX',
  litres: 'LTR',
  litre: 'LTR',
  liters: 'LTR',
  liter: 'LTR',
  ltr: 'LTR',
  l: 'LTR',
  pairs: 'PRS',
  pair: 'PRS',
  prs: 'PRS',
  grams: 'GMS',
  gram: 'GMS',
  gms: 'GMS',
  g: 'GMS',
  dozens: 'DOZ',
  dozen: 'DOZ',
  doz: 'DOZ',
  quintal: 'QTL',
  qtl: 'QTL',
  tons: 'TON',
  ton: 'TON',
  tonne: 'TON',
  tonnes: 'TON',
  yards: 'YDS',
  yard: 'YDS',
  yd: 'YDS',
  sqm: 'SQM',
  'sq.m': 'SQM',
  'square meters': 'SQM'
};

/**
 * Maps a colloquial unit name to statutory GST UQC code.
 * Returns the mapped UQC or a warning if unmapped.
 */
export function mapUnitToUqc(unit: string): { uqc?: string; warning?: string } {
  if (!unit || typeof unit !== 'string') return {};
  const cleaned = unit.trim().toLowerCase();

  // If already matches a known valid UQC code in uppercase
  const upper = unit.trim().toUpperCase();
  const knownUqcs = new Set(Object.values(UNIT_TO_UQC_MAP));
  if (knownUqcs.has(upper)) {
    return { uqc: upper };
  }

  const mapped = UNIT_TO_UQC_MAP[cleaned];
  if (mapped) {
    return { uqc: mapped };
  }

  return {
    warning: `Unit '${unit}' could not be mapped to standard GST UQC code (e.g. MTR, PCS, KGS).`
  };
}

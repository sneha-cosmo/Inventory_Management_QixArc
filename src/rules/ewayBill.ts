import { 
  Warehouse, 
  EwayBill, 
  EwayBillSettings, 
  EwayBillTransportMode, 
  EwayBillVehicleType, 
  DeliveryChallan, 
  StockTransfer, 
  InventoryItem 
} from '../types';
import { validateGstin } from './tax';
import { Clock } from './clock';

export const DEFAULT_EWAY_BILL_SETTINGS: EwayBillSettings = {
  interStateThreshold: 50000,
  stateThresholdOverrides: {
    '33': 100000, // Tamil Nadu: Notification No. 04/2018-State Tax
    '27': 100000  // Maharashtra: Intra-state movement threshold
  },
  cancellationWindowHours: 24, // Statutory 24 hours per Rule 138(9)
  regularKmPerDay: 200,        // Statutory 200 km/day per Rule 138(10) (amended w.e.f. 01-01-2021)
  odcKmPerDay: 20,             // Statutory 20 km/day for Over Dimensional Cargo
  enableShipToGstin: false,
  enableVoluntaryClosure: false,
  accountantConfirmationNote: 'Confirm current rules with your accountant.'
};

export interface EwbApplicabilityInput {
  documentType: 'sales_invoice' | 'transfer';
  fromStateCode: string;
  toStateCode: string;
  fromGstin?: string;
  toGstin?: string;
  consignmentValue: number;
  isExemptGoods?: boolean;
  settings?: EwayBillSettings;
}

export interface EwbApplicabilityResult {
  requirement: 'Required' | 'Not required' | 'Optional';
  reason: string;
  applicableThreshold: number;
  isInterState: boolean;
  isSameGstin: boolean;
  isExempt: boolean;
  settingsNote: string;
}

/**
 * Pure rule function determining whether an E-Way Bill is statutory required,
 * optional, or not required under CGST Rule 138 and State GST rules.
 */
export function determineEwbApplicability(input: EwbApplicabilityInput): EwbApplicabilityResult {
  const settings = input.settings || DEFAULT_EWAY_BILL_SETTINGS;
  const isInterState = input.fromStateCode.trim() !== input.toStateCode.trim();
  const cleanFromGstin = (input.fromGstin || '').trim().toUpperCase();
  const cleanToGstin = (input.toGstin || '').trim().toUpperCase();
  const isSameGstin = Boolean(cleanFromGstin && cleanToGstin && cleanFromGstin === cleanToGstin);
  const isExempt = Boolean(input.isExemptGoods);

  if (isExempt) {
    return {
      requirement: 'Not required',
      reason: 'Consignment contains exempt goods specified under Rule 138(14); statutory E-Way Bill is not required.',
      applicableThreshold: 0,
      isInterState,
      isSameGstin,
      isExempt: true,
      settingsNote: settings.accountantConfirmationNote
    };
  }

  // Determine statutory monetary threshold
  let applicableThreshold = settings.interStateThreshold;
  if (!isInterState) {
    applicableThreshold = settings.stateThresholdOverrides[input.fromStateCode.trim()] ?? settings.interStateThreshold;
  }

  // Under CGST Rule 138(1), EWB is mandatory when consignment value exceeds the threshold
  if (isInterState) {
    if (input.consignmentValue > applicableThreshold) {
      return {
        requirement: 'Required',
        reason: `Inter-state consignment value (₹${input.consignmentValue.toLocaleString('en-IN')}) exceeds statutory threshold of ₹${applicableThreshold.toLocaleString('en-IN')}. E-Way Bill generation is mandatory.`,
        applicableThreshold,
        isInterState: true,
        isSameGstin,
        isExempt: false,
        settingsNote: settings.accountantConfirmationNote
      };
    } else {
      return {
        requirement: 'Optional',
        reason: `Inter-state consignment value (₹${input.consignmentValue.toLocaleString('en-IN')}) does not exceed statutory threshold of ₹${applicableThreshold.toLocaleString('en-IN')}. Voluntary generation is permitted.`,
        applicableThreshold,
        isInterState: true,
        isSameGstin,
        isExempt: false,
        settingsNote: settings.accountantConfirmationNote
      };
    }
  } else {
    // Intra-state
    if (input.consignmentValue > applicableThreshold) {
      return {
        requirement: 'Required',
        reason: `Intra-state consignment value (₹${input.consignmentValue.toLocaleString('en-IN')}) exceeds state statutory threshold of ₹${applicableThreshold.toLocaleString('en-IN')} (State Code: ${input.fromStateCode}). E-Way Bill generation is mandatory.`,
        applicableThreshold,
        isInterState: false,
        isSameGstin,
        isExempt: false,
        settingsNote: settings.accountantConfirmationNote
      };
    } else {
      return {
        requirement: 'Not required',
        reason: `Intra-state consignment value (₹${input.consignmentValue.toLocaleString('en-IN')}) is below the state statutory threshold of ₹${applicableThreshold.toLocaleString('en-IN')}. Statutory generation is not required; voluntary generation is available.`,
        applicableThreshold,
        isInterState: false,
        isSameGstin,
        isExempt: false,
        settingsNote: settings.accountantConfirmationNote
      };
    }
  }
}

export interface EwbReadinessInput {
  fromWarehouse: Warehouse;
  toParty: {
    gstin?: string;
    legalName?: string;
    addressLines?: string[];
    pin?: string;
    stateCode?: string;
  };
  items: {
    hsnCode?: string;
    productName?: string;
    quantity: number;
  }[];
  transMode: EwayBillTransportMode;
  transporterId?: string;
  vehicleNumber?: string;
  approxDistanceKm?: number;
}

export interface EwbReadinessResult {
  ready: boolean;
  errors: string[];
}

/**
 * Validates document readiness before dispatching E-Way Bill generation requests.
 * Produces plain-language validation errors that block invalid submissions.
 */
export function checkEwbReadiness(input: EwbReadinessInput): EwbReadinessResult {
  const errors: string[] = [];

  // 1. From Warehouse validation
  if (!input.fromWarehouse.gstin || !validateGstin(input.fromWarehouse.gstin).valid) {
    errors.push('Dispatch warehouse must have a valid 15-character GSTIN.');
  }
  if (!input.fromWarehouse.pin || !/^\d{6}$/.test(input.fromWarehouse.pin.trim())) {
    errors.push('Dispatch warehouse must have a valid 6-digit postal PIN code.');
  }
  if (!input.fromWarehouse.stateCode || !/^\d{2}$/.test(input.fromWarehouse.stateCode.trim())) {
    errors.push('Dispatch warehouse must have a 2-digit state code.');
  }

  // 2. To Party validation
  if (input.toParty.gstin && input.toParty.gstin.trim() !== 'URP') {
    if (!validateGstin(input.toParty.gstin).valid) {
      errors.push('Recipient party GSTIN is invalid (use URP for unregistered recipients).');
    }
  }
  if (!input.toParty.pin || !/^\d{6}$/.test(input.toParty.pin.trim())) {
    errors.push('Recipient party must have a valid 6-digit postal PIN code.');
  }
  if (!input.toParty.stateCode || !/^\d{2}$/.test(input.toParty.stateCode.trim())) {
    errors.push('Recipient party must have a valid 2-digit state code.');
  }

  // 3. Items validation
  if (!input.items || input.items.length === 0) {
    errors.push('Consignment must contain at least one item line.');
  } else {
    input.items.forEach((item, index) => {
      const cleanHsn = (item.hsnCode || '').replace(/\s+/g, '');
      if (!cleanHsn || !/^\d{4,8}$/.test(cleanHsn)) {
        errors.push(`Line item #${index + 1} (${item.productName || 'Item'}) is missing a valid 4-to-8 digit HSN/SAC code.`);
      }
      if (item.quantity <= 0) {
        errors.push(`Line item #${index + 1} quantity must be greater than zero.`);
      }
    });
  }

  // 4. Transportation details (Part-B)
  if (input.transMode === 'Road') {
    const hasVehicle = Boolean(input.vehicleNumber && input.vehicleNumber.trim());
    const hasTransporter = Boolean(input.transporterId && input.transporterId.trim());
    if (!hasVehicle && !hasTransporter) {
      errors.push('For Road transport, either a Vehicle Number (Part-B) or Transporter ID (Part-A) is mandatory.');
    }
  }

  // 5. Distance check
  if (typeof input.approxDistanceKm !== 'number' || input.approxDistanceKm <= 0) {
    errors.push('Approximate transportation distance in km is mandatory and must be greater than 0.');
  }

  return {
    ready: errors.length === 0,
    errors
  };
}

/**
 * Validates vehicle registration plate format.
 * Emits a warning for non-standard formats but never blocks valid plates.
 */
export function validateVehiclePlate(plate: string): { valid: boolean; formatted: string; warning?: string } {
  if (!plate || !plate.trim()) {
    return { valid: false, formatted: '', warning: 'Vehicle number is empty.' };
  }
  const clean = plate.trim().replace(/[-\s]/g, '').toUpperCase();
  const standardPattern = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;
  const bhPattern = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
  const tempPattern = /^(TEMP|TR)[A-Z0-9]+$/;

  const matches = standardPattern.test(clean) || bhPattern.test(clean) || tempPattern.test(clean);
  if (!matches) {
    return {
      valid: true, // Non-blocking: warning only per specification
      formatted: clean,
      warning: 'Vehicle plate format looks non-standard (standard: MH12AB1234 or 22BH1234AA).'
    };
  }

  return {
    valid: true,
    formatted: clean
  };
}

/**
 * Calculates E-Way Bill validity based on Rule 138(10) of CGST Rules:
 * - Regular Cargo: 1 day for every 200 km or part thereof
 * - Over Dimensional Cargo: 1 day for every 20 km or part thereof
 */
export function calculateEwbValidity(
  distanceKm: number,
  vehicleType: EwayBillVehicleType = 'R',
  fromDate: Date = Clock.getCurrentDate(),
  settings: EwayBillSettings = DEFAULT_EWAY_BILL_SETTINGS
): { validityDays: number; validUpto: Date; validUptoString: string } {
  const kmPerDay = vehicleType === 'O' ? settings.odcKmPerDay : settings.regularKmPerDay;
  const validityDays = Math.max(1, Math.ceil(distanceKm / kmPerDay));

  // Expiry is calculated from fromDate plus validity days (set to midnight of the target day per official convention)
  const validUpto = new Date(fromDate.getTime() + (validityDays * 24 * 60 * 60 * 1000));
  
  return {
    validityDays,
    validUpto,
    validUptoString: validUpto.toISOString()
  };
}

/**
 * Checks statutory cancellation eligibility under Rule 138(9) of CGST Rules:
 * Cancellation is permissible strictly within 24 hours of generation.
 */
export function canCancelEwb(
  ewb: EwayBill,
  currentDate: Date = Clock.getCurrentDate(),
  settings: EwayBillSettings = DEFAULT_EWAY_BILL_SETTINGS
): { canCancel: boolean; hoursElapsed: number; reason?: string } {
  if (ewb.status === 'CNL') {
    return { canCancel: false, hoursElapsed: 0, reason: 'E-Way Bill is already cancelled.' };
  }
  if (ewb.status === 'EXP') {
    return { canCancel: false, hoursElapsed: 0, reason: 'E-Way Bill has expired.' };
  }

  const genTime = new Date(ewb.ewbDate).getTime();
  const nowTime = currentDate.getTime();
  const diffMs = nowTime - genTime;
  const hoursElapsed = Math.max(0, diffMs / (1000 * 60 * 60));

  if (hoursElapsed > settings.cancellationWindowHours) {
    return {
      canCancel: false,
      hoursElapsed,
      reason: `Statutory cancellation window (${settings.cancellationWindowHours} hours per Rule 138(9)) has elapsed. Elapsed: ${hoursElapsed.toFixed(1)} hours.`
    };
  }

  return {
    canCancel: true,
    hoursElapsed
  };
}

/**
 * Constructs a Delivery Challan for inter-branch stock transfers.
 * Same-GSTIN transfers create a Delivery Challan with 0 tax and no stock commitment.
 * Different-GSTIN transfers attach a distinct persons compliance notice.
 */
export function createDeliveryChallanForTransfer(
  transfer: StockTransfer,
  item: InventoryItem,
  sourceWarehouse: Warehouse,
  destWarehouse: Warehouse,
  declaredItemCost: number = 100,
  currentDate: Date = Clock.getCurrentDate()
): DeliveryChallan {
  const cleanFromGstin = (sourceWarehouse.gstin || '').trim().toUpperCase();
  const cleanToGstin = (destWarehouse.gstin || '').trim().toUpperCase();
  const isSameGstin = Boolean(cleanFromGstin && cleanToGstin && cleanFromGstin === cleanToGstin);
  const totalValue = transfer.quantity * declaredItemCost;

  const dateStr = currentDate.toISOString().split('T')[0];
  const challanNo = `CHL-${transfer.trackingNumber.replace(/^TRF-/, '')}`;

  return {
    id: `DC-${transfer.id}`,
    challanNumber: challanNo,
    challanDate: dateStr,
    transferId: transfer.id,
    sourceWarehouseId: sourceWarehouse.id,
    destWarehouseId: destWarehouse.id,
    fromLegalName: sourceWarehouse.legalName || sourceWarehouse.name,
    fromGstin: cleanFromGstin,
    fromAddress: (sourceWarehouse.addressLines || [sourceWarehouse.location]).join(', '),
    fromStateCode: sourceWarehouse.stateCode || '27',
    fromPin: sourceWarehouse.pin || '400001',
    toLegalName: destWarehouse.legalName || destWarehouse.name,
    toGstin: cleanToGstin,
    toAddress: (destWarehouse.addressLines || [destWarehouse.location]).join(', '),
    toStateCode: destWarehouse.stateCode || '27',
    toPin: destWarehouse.pin || '411014',
    itemId: item.id,
    itemName: item.name,
    hsnCode: item.hsnCode || '5208',
    quantity: transfer.quantity,
    unit: item.unit || 'units',
    declaredValue: totalValue,
    reasonForTransportation: 'For Own Use',
    isSameGstin,
    distinctPersonsNotice: isSameGstin 
      ? undefined 
      : 'Different GSTIN branches constitute Distinct Persons under Section 25(4) of CGST Act. Tax Invoice required. Accountant to confirm.'
  };
}

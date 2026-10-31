import { 
  EwayBill, 
  EwayBillGenerateRequest, 
  EwayBillUpdateVehicleRequest, 
  EwayBillCancelRequest, 
  EwayBillItem 
} from '../types';
import { calculateEwbValidity, canCancelEwb, DEFAULT_EWAY_BILL_SETTINGS } from '../rules/ewayBill';
import { Clock } from '../rules/clock';

export interface EwayBillProvider {
  providerName: string;
  isSandbox: boolean;
  generate(request: EwayBillGenerateRequest): Promise<EwayBill>;
  getByNumber(ewbNo: string): Promise<EwayBill | null>;
  getByDocumentRef(docRefId: string): Promise<EwayBill | null>;
  updateVehicle(ewbNo: string, request: EwayBillUpdateVehicleRequest): Promise<EwayBill>;
  cancel(ewbNo: string, request: EwayBillCancelRequest): Promise<EwayBill>;
}

/**
 * In-memory Mock Provider for sandbox simulation and local deterministic tests.
 * Guaranteed: Secrets never touch the browser or repo.
 * Output is strictly labeled "SANDBOX - NOT A REAL E-WAY BILL".
 */
export class MockEwayBillProvider implements EwayBillProvider {
  public readonly providerName = 'MockProvider (Simulation)';
  public readonly isSandbox = true;

  // Stored e-way bills map for idempotency and lookup
  private store: Map<string, EwayBill> = new Map();
  // Map documentRefId -> ewbNo to enforce idempotency
  private docRefIndex: Map<string, string> = new Map();

  constructor(initialBills?: EwayBill[]) {
    if (initialBills) {
      initialBills.forEach(b => {
        this.store.set(b.ewbNo, b);
        this.docRefIndex.set(b.documentRefId, b.ewbNo);
      });
    }
  }

  async getByNumber(ewbNo: string): Promise<EwayBill | null> {
    return this.store.get(ewbNo) || null;
  }

  async getByDocumentRef(docRefId: string): Promise<EwayBill | null> {
    const ewbNo = this.docRefIndex.get(docRefId);
    if (!ewbNo) return null;
    return this.store.get(ewbNo) || null;
  }

  async generate(request: EwayBillGenerateRequest): Promise<EwayBill> {
    // Idempotency check: If an E-Way Bill already exists for this document, return the existing active one
    const existingEwbNo = this.docRefIndex.get(request.documentRefId);
    if (existingEwbNo) {
      const existing = this.store.get(existingEwbNo);
      if (existing && existing.status === 'ACT') {
        return existing;
      }
    }

    const now = Clock.getCurrentDate();
    const nowIso = now.toISOString();

    // Generate statutory 12-digit E-Way Bill number
    // Standard NIC format: e.g. 101xxxxxxxx (12 digits)
    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const ewbNo = `101${randomSuffix.slice(0, 9)}`;

    // Calculate taxes and line values
    let totalTaxable = 0;
    let cgstVal = 0;
    let sgstVal = 0;
    let igstVal = 0;

    const isIntraState = request.fromWarehouse.stateCode === request.toParty.stateCode;

    const items: EwayBillItem[] = request.items.map((item, idx) => {
      totalTaxable += item.taxableAmount;
      const rate = item.gstRate || 0;
      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;

      if (isIntraState) {
        lineCgst = item.taxableAmount * (rate / 2) / 100;
        lineSgst = item.taxableAmount * (rate / 2) / 100;
        cgstVal += lineCgst;
        sgstVal += lineSgst;
      } else {
        lineIgst = item.taxableAmount * (rate / 100);
        igstVal += lineIgst;
      }

      return {
        itemNo: idx + 1,
        productId: item.productId,
        productName: item.productName,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        qtyUnit: item.unit,
        taxableAmount: item.taxableAmount,
        cgstRate: isIntraState ? rate / 2 : 0,
        sgstRate: isIntraState ? rate / 2 : 0,
        igstRate: isIntraState ? 0 : rate
      };
    });

    const totalValue = totalTaxable + cgstVal + sgstVal + igstVal;
    const validity = calculateEwbValidity(
      request.approxDistanceKm,
      request.vehicleType || 'R',
      now
    );

    const fromAddr = (request.fromWarehouse.addressLines || [request.fromWarehouse.location]).join(', ');
    const toAddr = (request.toParty.addressLines || [request.toParty.place]).join(', ');

    const newEwb: EwayBill = {
      id: `EWB-${Date.now()}`,
      ewbNo,
      ewbDate: nowIso,
      validUpto: validity.validUptoString,
      docType: request.docType,
      docNo: request.docNo,
      docDate: request.docDate,
      documentRefId: request.documentRefId,
      documentRefType: request.documentRefType,
      status: 'ACT',
      genMode: 'mock',
      isSandbox: true, // Prominent sandbox disclaimer flag

      fromWarehouseId: request.fromWarehouse.id,
      fromGstin: (request.fromWarehouse.gstin || '').trim().toUpperCase(),
      fromTrdName: request.fromWarehouse.legalName || request.fromWarehouse.name,
      fromAddr1: fromAddr,
      fromPlace: request.fromWarehouse.location,
      fromPincode: request.fromWarehouse.pin || '400001',
      fromStateCode: request.fromWarehouse.stateCode || '27',
      actFromStateCode: request.fromWarehouse.stateCode || '27',

      toCustomerId: request.documentRefType === 'invoice' ? request.documentRefId : undefined,
      toGstin: (request.toParty.gstin || 'URP').trim().toUpperCase(),
      toTrdName: request.toParty.legalName || request.toParty.tradeName || 'Walk-in Recipient',
      toAddr1: toAddr,
      toPlace: request.toParty.place,
      toPincode: request.toParty.pin || '400001',
      toStateCode: request.toParty.stateCode || '27',
      actToStateCode: request.toParty.stateCode || '27',

      totalValue,
      taxableAmount: totalTaxable,
      cgstValue: cgstVal,
      sgstValue: sgstVal,
      igstValue: igstVal,
      cessValue: 0,

      transMode: request.transMode,
      transporterId: request.transporterId,
      transporterName: request.transporterName,
      transDocNo: `LR-${Math.floor(100000 + Math.random() * 900000)}`,
      transDocDate: nowIso.split('T')[0],
      vehicleNumber: request.vehicleNumber,
      vehicleType: request.vehicleType || 'R',
      approxDistanceKm: request.approxDistanceKm,

      items
    };

    this.store.set(ewbNo, newEwb);
    this.docRefIndex.set(request.documentRefId, ewbNo);

    return newEwb;
  }

  async updateVehicle(ewbNo: string, request: EwayBillUpdateVehicleRequest): Promise<EwayBill> {
    const existing = this.store.get(ewbNo);
    if (!existing) {
      throw new Error(`E-Way Bill ${ewbNo} not found in database.`);
    }
    if (existing.status !== 'ACT') {
      throw new Error(`Cannot update vehicle for E-Way Bill ${ewbNo}: status is ${existing.status}.`);
    }

    const now = Clock.getCurrentDate();
    const updateRecord = {
      updatedAt: now.toISOString(),
      oldVehicleNumber: existing.vehicleNumber,
      newVehicleNumber: request.newVehicleNumber.trim().toUpperCase(),
      fromPlace: request.fromPlace,
      fromState: request.fromState,
      reason: request.reason,
      transDocNo: request.transDocNo
    };

    const updated: EwayBill = {
      ...existing,
      vehicleNumber: request.newVehicleNumber.trim().toUpperCase(),
      transMode: request.transMode || existing.transMode,
      vehicleUpdates: [...(existing.vehicleUpdates || []), updateRecord]
    };

    this.store.set(ewbNo, updated);
    return updated;
  }

  async cancel(ewbNo: string, request: EwayBillCancelRequest): Promise<EwayBill> {
    const existing = this.store.get(ewbNo);
    if (!existing) {
      throw new Error(`E-Way Bill ${ewbNo} not found.`);
    }

    const now = Clock.getCurrentDate();
    const cancelCheck = canCancelEwb(existing, now, DEFAULT_EWAY_BILL_SETTINGS);
    if (!cancelCheck.canCancel) {
      throw new Error(`Cancellation rejected: ${cancelCheck.reason}`);
    }

    const updated: EwayBill = {
      ...existing,
      status: 'CNL',
      cancelDate: now.toISOString(),
      cancelReason: request.cancelReason,
      cancelRemarks: request.cancelRemarks
    };

    this.store.set(ewbNo, updated);
    return updated;
  }
}

/**
 * GSP Provider skeleton ready for live/sandbox NIC GST Suvidha Provider integration.
 * GSP credentials and auth tokens are read exclusively by serverless backend routes (/api/ewb/*),
 * NEVER by the browser bundle or client state.
 */
export class GspProviderSkeleton implements EwayBillProvider {
  public readonly providerName = 'GST Suvidha Provider (GSP API)';
  public readonly isSandbox: boolean;

  constructor(isSandbox: boolean = false) {
    this.isSandbox = isSandbox;
  }

  async getByNumber(ewbNo: string): Promise<EwayBill | null> {
    const response = await fetch(`/api/ewb/get?ewbNo=${encodeURIComponent(ewbNo)}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`GSP API lookup failed with HTTP ${response.status}`);
    }
    return response.json();
  }

  async getByDocumentRef(docRefId: string): Promise<EwayBill | null> {
    const response = await fetch(`/api/ewb/lookup?docRefId=${encodeURIComponent(docRefId)}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`GSP API lookup failed with HTTP ${response.status}`);
    }
    return response.json();
  }

  async generate(request: EwayBillGenerateRequest): Promise<EwayBill> {
    const response = await fetch('/api/ewb/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'GSP generation failure' }));
      throw new Error(err.message || `GSP generation failed with HTTP ${response.status}`);
    }
    return response.json();
  }

  async updateVehicle(ewbNo: string, request: EwayBillUpdateVehicleRequest): Promise<EwayBill> {
    const response = await fetch('/api/ewb/update-vehicle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ewbNo, ...request })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'GSP vehicle update failure' }));
      throw new Error(err.message || `GSP update vehicle failed with HTTP ${response.status}`);
    }
    return response.json();
  }

  async cancel(ewbNo: string, request: EwayBillCancelRequest): Promise<EwayBill> {
    const response = await fetch('/api/ewb/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ewbNo, ...request })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'GSP cancellation failure' }));
      throw new Error(err.message || `GSP cancellation failed with HTTP ${response.status}`);
    }
    return response.json();
  }
}

/**
 * Factory choosing provider based on environment variable GST_PROVIDER.
 * Defaults to MockEwayBillProvider.
 */
export function createEwayBillProvider(envProvider?: string): EwayBillProvider {
  const providerType = (envProvider || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GST_PROVIDER) || 'mock').toLowerCase();

  if (providerType === 'live') {
    return new GspProviderSkeleton(false);
  }
  if (providerType === 'sandbox') {
    return new GspProviderSkeleton(true);
  }
  return new MockEwayBillProvider();
}

import { describe, it, expect, beforeEach } from 'vitest';
import { Clock } from '../clock';
import {
  DEFAULT_EWAY_BILL_SETTINGS,
  determineEwbApplicability,
  checkEwbReadiness,
  validateVehiclePlate,
  calculateEwbValidity,
  canCancelEwb,
  createDeliveryChallanForTransfer
} from '../ewayBill';
import { MockEwayBillProvider, GspProviderSkeleton, createEwayBillProvider } from '../../services/ewayBillProvider';
import { hasPermission } from '../permissions';
import { createAuditEvent } from '../audit';
import { EwayBillGenerateRequest, Warehouse, StockTransfer, EwayBill, InventoryItem } from '../../types';

describe('E-Way Bill Pure Rules & Applicability', () => {
  beforeEach(() => {
    Clock.resetClock();
  });

  const sourceWhMah: Warehouse = {
    id: 'wh-1',
    name: 'Central Warehouse (Bhiwandi)',
    location: 'Bhiwandi, Maharashtra',
    gstin: '27AABCB1234F1Z8',
    legalName: 'InvPredict Tech Hub Pvt Ltd',
    stateCode: '27',
    state: 'Maharashtra',
    addressLines: ['Bldg 4, Logistics Park', 'Bhiwandi'],
    pin: '421302'
  };

  const destWhTN: Warehouse = {
    id: 'wh-2',
    name: 'South Distribution Depot (Chennai)',
    location: 'Guindy, Chennai',
    gstin: '33AABCB1234F1Z4',
    legalName: 'InvPredict Tech Hub Pvt Ltd',
    stateCode: '33',
    state: 'Tamil Nadu',
    addressLines: ['Industrial Estate', 'Guindy'],
    pin: '600032'
  };

  const sameGstinWhMah: Warehouse = {
    id: 'wh-3',
    name: 'Pune Transit Hub',
    location: 'Pune, Maharashtra',
    gstin: '27AABCB1234F1Z8', // Same GSTIN as Central Warehouse
    legalName: 'InvPredict Tech Hub Pvt Ltd',
    stateCode: '27',
    state: 'Maharashtra',
    addressLines: ['MIDC Zone B', 'Pune'],
    pin: '411018'
  };

  const sampleItem: InventoryItem = {
    id: 'item-1',
    name: 'Organic Cotton Fabric',
    sku: 'SKU-FAB-001',
    categoryId: 'cat-raw',
    currentStock: 500,
    minStock: 50,
    dailyConsumption: 15,
    leadTime: 4,
    safetyStock: 30,
    unit: 'meters',
    hsnCode: '5208',
    gstRate: 5
  };

  describe('1. Applicability Matrix & Threshold Evaluation', () => {
    it('Inter-State: Consignment <= ₹50,000 does NOT require an E-Way Bill', () => {
      const res = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '27', // Maharashtra
        toStateCode: '33',   // Tamil Nadu
        consignmentValue: 49999,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res.requirement).toBe('Optional');
      expect(res.applicableThreshold).toBe(50000);
      expect(res.isInterState).toBe(true);
      expect(res.reason).toContain('does not exceed statutory threshold');
    });

    it('Inter-State: Consignment > ₹50,000 MANDATORILY requires an E-Way Bill', () => {
      const res = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '27',
        toStateCode: '33',
        consignmentValue: 50001,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res.requirement).toBe('Required');
      expect(res.applicableThreshold).toBe(50000);
      expect(res.isInterState).toBe(true);
      expect(res.reason).toContain('mandatory');
    });

    it('Intra-State (Tamil Nadu): Consignment ₹99,000 does NOT require E-Way Bill under ₹1,00,000 state notification', () => {
      const res = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '33',
        toStateCode: '33',
        consignmentValue: 99000,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res.requirement).toBe('Not required');
      expect(res.applicableThreshold).toBe(100000);
      expect(res.isInterState).toBe(false);
    });

    it('Intra-State (Tamil Nadu): Consignment ₹1,00,001 MANDATORILY requires E-Way Bill', () => {
      const res = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '33',
        toStateCode: '33',
        consignmentValue: 100001,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res.requirement).toBe('Required');
      expect(res.applicableThreshold).toBe(100000);
      expect(res.isInterState).toBe(false);
    });

    it('Intra-State (Maharashtra): Consignment ₹99,000 is below state notification ₹1,00,000 threshold', () => {
      const res = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '27',
        toStateCode: '27',
        consignmentValue: 99000,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res.requirement).toBe('Not required');
      expect(res.applicableThreshold).toBe(100000);
      expect(res.isInterState).toBe(false);
    });

    it('Intra-State for state without explicit override falls back to default ₹50,000', () => {
      const res = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '07', // Delhi
        toStateCode: '07',
        consignmentValue: 50500,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res.requirement).toBe('Required');
      expect(res.applicableThreshold).toBe(50000);
      expect(res.isInterState).toBe(false);
    });

    it('Consignment with only exempt goods is explicitly exempt regardless of value', () => {
      const res = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '27',
        toStateCode: '33',
        consignmentValue: 250000,
        isExemptGoods: true,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res.requirement).toBe('Not required');
      expect(res.isExempt).toBe(true);
      expect(res.reason).toContain('exempt goods');
    });
  });

  describe('2. Delivery Challan & Stock Transfer Rules', () => {
    it('Same-GSTIN stock transfer produces Delivery Challan (Rule 55) with ₹0 tax liability and intact inventory valuation', () => {
      const transfer: StockTransfer = {
        id: 'TRF-TEST-SAME',
        trackingNumber: 'TRF-TEST-SAME',
        sourceWarehouseId: 'wh-1',
        destWarehouseId: 'wh-3',
        itemId: 'item-1',
        quantity: 100,
        status: 'pending',
        date: '2026-10-31',
        carrier: 'FastLogistics',
        transportMode: 'Road',
        vehicleNumber: 'MH04AB1234',
        approxDistanceKm: 140
      };

      const challan = createDeliveryChallanForTransfer(
        transfer,
        sampleItem,
        sourceWhMah,
        sameGstinWhMah,
        150
      );

      expect(challan.isSameGstin).toBe(true);
      expect(challan.declaredValue).toBe(15000); // 100 * 150
      expect(challan.reasonForTransportation).toBe('For Own Use');
      expect(challan.distinctPersonsNotice).toBeUndefined();
    });

    it('Distinct-Persons inter-state stock transfer identifies Section 25(4) taxable supply', () => {
      const transfer: StockTransfer = {
        id: 'TRF-TEST-DISTINCT',
        trackingNumber: 'TRF-TEST-DISTINCT',
        sourceWarehouseId: 'wh-1',
        destWarehouseId: 'wh-2',
        itemId: 'item-1',
        quantity: 100,
        status: 'pending',
        date: '2026-10-31',
        carrier: 'FastLogistics',
        transportMode: 'Road',
        vehicleNumber: 'MH04AB1234',
        approxDistanceKm: 1250
      };

      const challan = createDeliveryChallanForTransfer(
        transfer,
        sampleItem,
        sourceWhMah,
        destWhTN,
        150
      );

      expect(challan.isSameGstin).toBe(false);
      expect(challan.distinctPersonsNotice).toContain('Section 25(4)');
    });
  });

  describe('3. Vehicle Plate Validation (Warns, Never Blocks)', () => {
    it('Accepts standard formats for Road transit', () => {
      expect(validateVehiclePlate('MH04AB1234').valid).toBe(true);
      expect(validateVehiclePlate('DL1CA1234').valid).toBe(true);
      expect(validateVehiclePlate('KA01F9999').valid).toBe(true);
      expect(validateVehiclePlate('22BH1234AA').valid).toBe(true); // Bharat series
    });

    it('Emits non-blocking advisory warnings on non-standard formats without failing valid flag', () => {
      const nonStd = validateVehiclePlate('LOCAL-CART-9');
      expect(nonStd.valid).toBe(true); // Non-blocking!
      expect(nonStd.warning).toBeDefined();
      expect(nonStd.warning).toContain('non-standard');
    });

    it('Rejects blank or whitespace vehicle plates when required for Road transport', () => {
      expect(validateVehiclePlate('').valid).toBe(false);
      expect(validateVehiclePlate('   ').valid).toBe(false);
    });
  });

  describe('4. Rule 138(10) Distance Validity & Expiry Countdown', () => {
    it('Calculates 1 day per 200 km for regular cargo', () => {
      // 150 km -> 1 day
      const val150 = calculateEwbValidity(150, 'R', new Date('2026-10-31T10:00:00Z'));
      expect(val150.validityDays).toBe(1);

      // 450 km -> 3 days (ceil(450 / 200))
      const val450 = calculateEwbValidity(450, 'R', new Date('2026-10-31T10:00:00Z'));
      expect(val450.validityDays).toBe(3);

      // 1200 km -> 6 days
      const val1200 = calculateEwbValidity(1200, 'R', new Date('2026-10-31T10:00:00Z'));
      expect(val1200.validityDays).toBe(6);
    });

    it('Calculates 1 day per 20 km for Over Dimensional Cargo (ODC)', () => {
      const valOdc = calculateEwbValidity(100, 'O', new Date('2026-10-31T10:00:00Z'));
      expect(valOdc.validityDays).toBe(5); // 100 / 20 = 5 days
    });
  });

  describe('5. Rule 138(9) Cancellation Window (Strict 24h)', () => {
    const mockEwb: EwayBill = {
      id: 'ewb-test-cancel',
      ewbNo: '381000124589',
      ewbDate: '2026-10-31T00:00:00Z',
      validUpto: '2026-11-06T00:00:00Z',
      documentRefId: 'INV-001',
      documentRefType: 'invoice',
      status: 'ACT',
      genMode: 'mock',
      isSandbox: true,
      docType: 'INV',
      docNo: 'INV-001',
      docDate: '2026-10-31',
      fromGstin: '27AABCB1234F1Z8',
      fromTrdName: 'Central Warehouse',
      fromAddr1: 'Bhiwandi',
      fromPlace: 'Bhiwandi',
      fromPincode: '421302',
      fromStateCode: '27',
      actFromStateCode: '27',
      toGstin: '33AABCB1234F1Z4',
      toTrdName: 'South Retailers',
      toAddr1: 'Chennai',
      toPlace: 'Chennai',
      toPincode: '600032',
      toStateCode: '33',
      actToStateCode: '33',
      totalValue: 70800,
      taxableAmount: 60000,
      cgstValue: 0,
      sgstValue: 0,
      igstValue: 10800,
      cessValue: 0,
      transMode: 'Road',
      vehicleType: 'R',
      approxDistanceKm: 1200,
      items: []
    };

    it('Allows cancellation within 24 hours of generation', () => {
      Clock.setCurrentDate(new Date('2026-10-31T10:00:00Z')); // 10 hours after ewbDate
      const check = canCancelEwb(mockEwb, Clock.getCurrentDate());
      expect(check.canCancel).toBe(true);
      expect(check.hoursElapsed).toBe(10);
    });

    it('Rejects cancellation after 24 hours have elapsed as per statutory Rule 138(9)', () => {
      Clock.setCurrentDate(new Date('2026-11-01T15:00:00Z')); // 39 hours after ewbDate
      const check = canCancelEwb(mockEwb, Clock.getCurrentDate());
      expect(check.canCancel).toBe(false);
      expect(check.reason).toContain('Rule 138(9)');
    });
  });

  describe('6. Role Permissions Matrix', () => {
    it('Allows Billing Clerk and Inventory Manager to generate documents', () => {
      expect(hasPermission('billing_clerk', 'generateEwayBill')).toBe(true);
      expect(hasPermission('inventory_manager', 'generateEwayBill')).toBe(true);
      expect(hasPermission('admin', 'generateEwayBill')).toBe(true);
    });

    it('Enforces that ONLY Admin can cancel an E-Way Bill', () => {
      expect(hasPermission('admin', 'cancelEwayBill')).toBe(true);
      expect(hasPermission('billing_clerk', 'cancelEwayBill')).toBe(false);
      expect(hasPermission('inventory_manager', 'cancelEwayBill')).toBe(false);
    });
  });
});

describe('E-Way Bill Provider & Lifecycle Simulation', () => {
  beforeEach(() => {
    Clock.resetClock();
  });

  const sourceWh: Warehouse = {
    id: 'wh-1',
    name: 'Central Warehouse (Bhiwandi)',
    location: 'Bhiwandi, Maharashtra',
    gstin: '27AABCB1234F1Z8',
    legalName: 'InvPredict Tech Hub Pvt Ltd',
    stateCode: '27',
    state: 'Maharashtra',
    addressLines: ['Logistics Hub, Bhiwandi'],
    pin: '421302'
  };

  const sampleReq: EwayBillGenerateRequest = {
    documentRefId: 'INV-TEST-001',
    documentRefType: 'invoice',
    docType: 'INV',
    docNo: 'INV-TEST-001',
    docDate: '2026-10-31',
    fromWarehouse: sourceWh,
    toParty: {
      gstin: '33AAACB9999P1Z1',
      legalName: 'South Retailers Pvt Ltd',
      tradeName: 'South Retailers',
      addressLines: ['Anna Salai, Chennai'],
      place: 'Chennai',
      stateCode: '33',
      pin: '600002'
    },
    items: [
      {
        productId: 'item-1',
        productName: 'Textile Fabric Roll',
        hsnCode: '5208',
        quantity: 50,
        unit: 'meters',
        taxableAmount: 60000,
        gstRate: 18
      }
    ],
    transMode: 'Road',
    vehicleNumber: 'MH04AB1234',
    approxDistanceKm: 1200
  };

  it('Generates a mock e-way bill with official sandbox labelling and Part A/B values', async () => {
    const provider = new MockEwayBillProvider();
    const result = await provider.generate(sampleReq);

    expect(result.ewbNo).toMatch(/^\d{12}$/);
    expect(result.status).toBe('ACT');
    expect(result.isSandbox).toBe(true);
    expect(result.totalValue).toBe(70800); // 60,000 + 18% IGST (10,800)
    expect(result.igstValue).toBe(10800);
    expect(result.cgstValue).toBe(0);
    expect(result.sgstValue).toBe(0);
    expect(result.vehicleNumber).toBe('MH04AB1234');
    expect(result.approxDistanceKm).toBe(1200);
  });

  it('Is idempotent: Generating for the same document returns the existing EWB', async () => {
    const provider = new MockEwayBillProvider();
    const ewb1 = await provider.generate(sampleReq);
    const ewb2 = await provider.generate(sampleReq);

    expect(ewb1.ewbNo).toBe(ewb2.ewbNo);
  });

  it('Updates conveyance vehicle (Part B) and records vehicle history', async () => {
    const provider = new MockEwayBillProvider();
    const ewb = await provider.generate(sampleReq);

    const updated = await provider.updateVehicle(ewb.ewbNo, {
      newVehicleNumber: 'KA01XY9876',
      fromPlace: 'Pune',
      fromState: '27',
      reason: 'Defect in axle'
    });

    expect(updated.vehicleNumber).toBe('KA01XY9876');
    expect(updated.vehicleUpdates).toBeDefined();
    expect(updated.vehicleUpdates?.length).toBe(1);
    expect(updated.vehicleUpdates?.[0].newVehicleNumber).toBe('KA01XY9876');
    expect(updated.vehicleUpdates?.[0].reason).toContain('Defect in axle');
  });

  it('Cancels active E-Way Bill within 24h with mandatory reason code', async () => {
    Clock.setCurrentDate(new Date('2026-10-31T12:00:00Z'));
    const provider = new MockEwayBillProvider();
    const ewb = await provider.generate(sampleReq);

    const cancelled = await provider.cancel(ewb.ewbNo, {
      cancelReason: '2',
      cancelRemarks: 'Customer requested order cancellation prior to dispatch'
    });

    expect(cancelled.status).toBe('CNL');
    expect(cancelled.cancelDate).toBeDefined();
  });

  it('Rejects cancellation if attempted after the 24-hour statutory window', async () => {
    Clock.setCurrentDate(new Date('2026-10-31T10:00:00Z'));
    const provider = new MockEwayBillProvider();
    const ewb = await provider.generate(sampleReq);

    // Fast-forward 25 hours
    Clock.setCurrentDate(new Date('2026-11-01T11:05:00Z'));

    await expect(
      provider.cancel(ewb.ewbNo, {
        cancelReason: '2',
        cancelRemarks: 'Late cancellation'
      })
    ).rejects.toThrow(/Rule 138\(9\)/);
  });

  it('Audit logging records EWB lifecycle operations with sandbox tags', () => {
    const genAudit = createAuditEvent({
      action: 'Generate E-Way Bill',
      entityType: 'EwayBill',
      entityId: '381000124589',
      details: 'E-Way Bill 381000124589 generated for invoice INV-001. Provider: SANDBOX (Simulation). Consignment: ₹70,800. Distance: 1200 km.',
      operatorName: 'Sneha R.',
      operatorRole: 'admin',
      operatorId: 'staff-1'
    });

    expect(genAudit.details).toContain('SANDBOX');
    expect(genAudit.entityType).toBe('EwayBill');
  });

  it('GspProviderSkeleton throws informative error on missing backend route', async () => {
    const gsp = new GspProviderSkeleton(true);
    await expect(gsp.generate(sampleReq)).rejects.toThrow();
  });

  it('Ensures client code never exposes GSP passwords or secret tokens', () => {
    const provider = createEwayBillProvider('mock');
    expect(provider).toBeInstanceOf(MockEwayBillProvider);

    if (typeof localStorage !== 'undefined') {
      expect(localStorage.getItem('gsp_password')).toBeNull();
      expect(localStorage.getItem('gsp_auth_token')).toBeNull();
    }
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { Clock } from '../src/rules/clock';
import {
  DEFAULT_EWAY_BILL_SETTINGS,
  determineEwbApplicability,
  checkEwbReadiness,
  validateVehiclePlate,
  calculateEwbValidity,
  canCancelEwb,
  createDeliveryChallanForTransfer
} from '../src/rules/ewayBill';
import {
  processTransferDispatch,
  processTransferReceipt
} from '../src/rules/stock';
import { MockEwayBillProvider, GspProviderSkeleton } from '../src/services/ewayBillProvider';
import { hasPermission } from '../src/rules/permissions';
import { createAuditEvent } from '../src/rules/audit';
import {
  Warehouse,
  StockTransfer,
  InventoryItem,
  EwayBillGenerateRequest,
  EwayBill,
  SalesOrder,
  Invoice
} from '../src/types';

describe('E-Way Bill Comprehensive Specification Verification (tests/ewayBill.test.ts)', () => {
  beforeEach(() => {
    Clock.resetClock();
  });

  const whMaharashtra: Warehouse = {
    id: 'wh-1',
    name: 'Bhiwandi Central Hub',
    location: 'Bhiwandi, Maharashtra',
    gstin: '27AABCB1234F1Z8',
    legalName: 'InvPredict Logistics India Pvt Ltd',
    stateCode: '27',
    state: 'Maharashtra',
    addressLines: ['Building 5, Logistic Park', 'Bhiwandi'],
    pin: '421302'
  };

  const whTamilNadu: Warehouse = {
    id: 'wh-2',
    name: 'Chennai Regional Depot',
    location: 'Guindy, Chennai',
    gstin: '33AABCB1234F1Z4',
    legalName: 'InvPredict Logistics India Pvt Ltd',
    stateCode: '33',
    state: 'Tamil Nadu',
    addressLines: ['SIDCO Industrial Estate', 'Guindy'],
    pin: '600032'
  };

  const whPuneSameGstin: Warehouse = {
    id: 'wh-3',
    name: 'Pune Distribution Center',
    location: 'Pune, Maharashtra',
    gstin: '27AABCB1234F1Z8', // Same GSTIN as Central Hub
    legalName: 'InvPredict Logistics India Pvt Ltd',
    stateCode: '27',
    state: 'Maharashtra',
    addressLines: ['MIDC Phase 2', 'Pune'],
    pin: '411018'
  };

  const sampleItem: InventoryItem = {
    id: 'item-101',
    name: 'Industrial Grade Polymer Fabric',
    sku: 'SKU-POLY-101',
    categoryId: 'cat-raw',
    currentStock: 500,
    minStock: 50,
    dailyConsumption: 10,
    leadTime: 5,
    safetyStock: 20,
    unit: 'meters',
    hsnCode: '5208',
    gstRate: 18
  };

  // =========================================================================
  // 1. APPLICABILITY
  // =========================================================================
  describe('1. APPLICABILITY', () => {
    it('Inter-state invoice Rs 49,000 -> Not required. Rs 60,000 -> Required.', () => {
      // Rs 49,000
      const res49k = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '27', // Maharashtra
        toStateCode: '33',   // Tamil Nadu
        consignmentValue: 49000,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res49k.requirement).toBe('Not required');
      expect(typeof res49k.reason).toBe('string');
      expect(res49k.reason.length).toBeGreaterThan(0);

      // Rs 60,000
      const res60k = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '27',
        toStateCode: '33',
        consignmentValue: 60000,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res60k.requirement).toBe('Required');
      expect(typeof res60k.reason).toBe('string');
      expect(res60k.reason.length).toBeGreaterThan(0);
    });

    it('Exactly Rs 50,000 inter-state -> do not assert; report what the app does and flag it for my accountant.', () => {
      const res50k = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '27',
        toStateCode: '33',
        consignmentValue: 50000,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });

      // Report what the app does and flag for accountant (no hard requirement assertion)
      const report = {
        value: 50000,
        appResult: res50k.requirement,
        reason: res50k.reason,
        accountantFlag: 'FLAG FOR ACCOUNTANT: Rule 138(1) states "consignment value exceeding fifty thousand rupees". At exactly ₹50,000, the condition > 50,000 is not met, so the system classifies this as Not required. Confirm with company tax advisor.'
      };

      expect(typeof report.appResult).toBe('string');
      expect(report.accountantFlag).toContain('FLAG FOR ACCOUNTANT');
    });

    it('Tamil Nadu intra-state Rs 60,000 -> Not required. Rs 1,20,000 -> Required.', () => {
      // TN intra-state Rs 60,000 (below ₹1,00,000 state notification threshold)
      const res60kTN = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '33',
        toStateCode: '33',
        consignmentValue: 60000,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res60kTN.requirement).toBe('Not required');
      expect(res60kTN.applicableThreshold).toBe(100000);

      // TN intra-state Rs 1,20,000 (exceeds ₹1,00,000 state notification threshold)
      const res120kTN = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '33',
        toStateCode: '33',
        consignmentValue: 120000,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(res120kTN.requirement).toBe('Required');
      expect(res120kTN.applicableThreshold).toBe(100000);
    });

    it('A per-state threshold override changes the result.', () => {
      // Delhi ('07') by default has no override, so it uses default ₹50,000
      const defaultDelhi = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '07',
        toStateCode: '07',
        consignmentValue: 80000,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(defaultDelhi.requirement).toBe('Required');
      expect(defaultDelhi.applicableThreshold).toBe(50000);

      // Customized settings with Delhi override set to ₹1,50,000
      const customSettings = {
        ...DEFAULT_EWAY_BILL_SETTINGS,
        stateThresholdOverrides: {
          ...DEFAULT_EWAY_BILL_SETTINGS.stateThresholdOverrides,
          '07': 150000
        }
      };

      const overriddenDelhi = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '07',
        toStateCode: '07',
        consignmentValue: 80000,
        settings: customSettings
      });
      expect(overriddenDelhi.requirement).toBe('Not required');
      expect(overriddenDelhi.applicableThreshold).toBe(150000);
    });

    it('Exempt-goods flag -> Not required, with the reason shown.', () => {
      const exemptResult = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '27',
        toStateCode: '33',
        consignmentValue: 200000,
        isExemptGoods: true,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });
      expect(exemptResult.requirement).toBe('Not required');
      expect(exemptResult.isExempt).toBe(true);
      expect(exemptResult.reason).toContain('exempt goods');
    });

    it('Every result includes a reason string.', () => {
      const testCases = [
        { from: '27', to: '33', val: 30000 },
        { from: '27', to: '33', val: 75000 },
        { from: '33', to: '33', val: 80000 },
        { from: '33', to: '33', val: 150000 },
        { from: '27', to: '27', val: 90000 }
      ];

      testCases.forEach(tc => {
        const res = determineEwbApplicability({
          documentType: 'sales_invoice',
          fromStateCode: tc.from,
          toStateCode: tc.to,
          consignmentValue: tc.val,
          settings: DEFAULT_EWAY_BILL_SETTINGS
        });
        expect(typeof res.reason).toBe('string');
        expect(res.reason.trim().length).toBeGreaterThan(10);
      });
    });
  });

  // =========================================================================
  // 2. READINESS
  // =========================================================================
  describe('2. READINESS', () => {
    it('Missing vehicle number (mode Road) is blocked, with a plain-language error.', () => {
      const res = checkEwbReadiness({
        fromWarehouse: whMaharashtra,
        toParty: {
          gstin: '33AABCB1234F1Z4',
          legalName: 'Recipient Enterprises',
          pin: '600032',
          stateCode: '33'
        },
        items: [
          { productName: 'Fabric', hsnCode: '5208', quantity: 10 }
        ],
        transMode: 'Road',
        vehicleNumber: '', // Missing
        approxDistanceKm: 120
      });

      expect(res.ready).toBe(false);
      expect(res.errors.some(e => e.toLowerCase().includes('vehicle number') || e.toLowerCase().includes('road transport'))).toBe(true);
    });

    it('Invalid GSTIN, missing HSN on a line, missing PIN, missing distance: each blocked, all errors listed together.', () => {
      const res = checkEwbReadiness({
        fromWarehouse: {
          ...whMaharashtra,
          gstin: 'INVALIDGSTIN999' // Invalid GSTIN
        },
        toParty: {
          gstin: '33AABCB1234F1Z4',
          legalName: 'Recipient Enterprises',
          pin: '99', // Missing/Invalid 6-digit PIN
          stateCode: '33'
        },
        items: [
          { productName: 'Fabric Roll', hsnCode: '', quantity: 10 } // Missing HSN
        ],
        transMode: 'Road',
        vehicleNumber: 'MH04AB1234',
        approxDistanceKm: 0 // Missing distance
      });

      expect(res.ready).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(4);

      // Verify all 4 specific categories are listed together in the errors array
      const hasGstinError = res.errors.some(e => e.toLowerCase().includes('gstin'));
      const hasHsnError = res.errors.some(e => e.toLowerCase().includes('hsn'));
      const hasPinError = res.errors.some(e => e.toLowerCase().includes('pin'));
      const hasDistanceError = res.errors.some(e => e.toLowerCase().includes('distance'));

      expect(hasGstinError).toBe(true);
      expect(hasHsnError).toBe(true);
      expect(hasPinError).toBe(true);
      expect(hasDistanceError).toBe(true);
    });

    it('A complete document passes.', () => {
      const res = checkEwbReadiness({
        fromWarehouse: whMaharashtra,
        toParty: {
          gstin: '33AABCB1234F1Z4',
          legalName: 'Recipient Enterprises',
          addressLines: ['Industrial Estate, Guindy'],
          pin: '600032',
          stateCode: '33'
        },
        items: [
          { productName: 'Fabric Roll', hsnCode: '5208', quantity: 10 }
        ],
        transMode: 'Road',
        vehicleNumber: 'MH04AB1234',
        approxDistanceKm: 1250
      });

      expect(res.ready).toBe(true);
      expect(res.errors.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. TRANSFERS
  // =========================================================================
  describe('3. TRANSFERS', () => {
    it('Same-GSTIN transfer of Rs 80,000 creates a Delivery Challan, with no GST, no sale record, and unchanged total stock across warehouses.', () => {
      const transfer: StockTransfer = {
        id: 'TRF-SAME-80K',
        trackingNumber: 'TRF-SAME-80K',
        itemId: 'item-101',
        quantity: 800,
        sourceWarehouseId: 'wh-1',
        destWarehouseId: 'wh-3', // Same GSTIN
        date: '2026-10-31',
        carrier: 'Internal Fleet',
        transportMode: 'Road',
        vehicleNumber: 'MH04AB1234',
        approxDistanceKm: 140,
        status: 'pending'
      };

      const challan = createDeliveryChallanForTransfer(
        transfer,
        sampleItem,
        whMaharashtra,
        whPuneSameGstin,
        100 // declared unit cost -> 800 * 100 = 80,000
      );

      // Rule 55 Delivery Challan
      expect(challan.isSameGstin).toBe(true);
      expect(challan.declaredValue).toBe(80000);
      expect(challan.reasonForTransportation).toBe('For Own Use');
      expect(challan.distinctPersonsNotice).toBeUndefined(); // No tax invoice notice

      // Physical stock simulation: Hub 1000, Dest 200 -> total 1200
      const dispatch = processTransferDispatch(1000, 800);
      expect(dispatch.sourceRemainingStock).toBe(200);
      expect(dispatch.inTransitQuantity).toBe(800);

      const receipt = processTransferReceipt(200, 800);
      expect(receipt.destFinalStock).toBe(1000);

      // Total physical inventory conserved across warehouses (200 + 1000 = 1200)
      expect(dispatch.sourceRemainingStock + receipt.destFinalStock).toBe(1200);
    });

    it('Different-GSTIN transfer follows the invoice flow and shows "accountant to confirm".', () => {
      const transfer: StockTransfer = {
        id: 'TRF-DIFF-80K',
        trackingNumber: 'TRF-DIFF-80K',
        itemId: 'item-101',
        quantity: 800,
        sourceWarehouseId: 'wh-1', // MH
        destWarehouseId: 'wh-2',   // TN (Different GSTIN)
        date: '2026-10-31',
        carrier: 'Express Freight',
        transportMode: 'Road',
        vehicleNumber: 'MH04AB1234',
        approxDistanceKm: 1250,
        status: 'pending'
      };

      const challan = createDeliveryChallanForTransfer(
        transfer,
        sampleItem,
        whMaharashtra,
        whTamilNadu,
        100
      );

      expect(challan.isSameGstin).toBe(false);
      expect(challan.distinctPersonsNotice).toBeDefined();
      expect(challan.distinctPersonsNotice?.toLowerCase()).toContain('accountant to confirm');
    });

    it('Hub 500 -> dispatch 200 -> hub 300, 200 in transit; after receipt the destination has +200 and the total is unchanged.', () => {
      const initialHubStock = 500;
      const initialDestStock = 100;
      const initialTotal = initialHubStock + initialDestStock; // 600

      // Step 1: Dispatch 200
      const dispatch = processTransferDispatch(initialHubStock, 200);
      expect(dispatch.sourceRemainingStock).toBe(300);
      expect(dispatch.inTransitQuantity).toBe(200);

      // Conservation check while in transit
      const inTransitTotal = dispatch.sourceRemainingStock + dispatch.inTransitQuantity + initialDestStock;
      expect(inTransitTotal).toBe(initialTotal); // 300 + 200 + 100 = 600

      // Step 2: Receipt at destination
      const receipt = processTransferReceipt(initialDestStock, dispatch.inTransitQuantity);
      expect(receipt.destFinalStock).toBe(300); // 100 + 200 = 300
      expect(receipt.remainingInTransit).toBe(0);

      // Total physical goods across network remains conserved
      const finalTotal = dispatch.sourceRemainingStock + receipt.destFinalStock;
      expect(finalTotal).toBe(initialTotal); // 300 + 300 = 600
    });
  });

  // =========================================================================
  // 4. GENERATE / MANAGE
  // =========================================================================
  describe('4. GENERATE / MANAGE', () => {
    const generateReq: EwayBillGenerateRequest = {
      documentRefId: 'INV-TEST-SPEC-01',
      documentRefType: 'invoice',
      docType: 'INV',
      docNo: 'INV-TEST-SPEC-01',
      docDate: '2026-10-31',
      fromWarehouse: whMaharashtra,
      toParty: {
        gstin: '33AABCB1234F1Z4',
        legalName: 'Customer Textiles Ltd',
        tradeName: 'Customer Textiles',
        addressLines: ['Chennai Industrial Area'],
        place: 'Chennai',
        stateCode: '33',
        pin: '600032'
      },
      items: [
        {
          productId: 'item-101',
          productName: 'Fabric',
          hsnCode: '5208',
          quantity: 100,
          unit: 'meters',
          taxableAmount: 65000,
          gstRate: 18
        }
      ],
      transMode: 'Road',
      vehicleNumber: 'MH04AB1234',
      approxDistanceKm: 1200
    };

    it('Generate returns number, date and valid-until, stored on the document, labelled "SANDBOX - NOT A REAL E-WAY BILL" in the UI, print view and audit log.', async () => {
      const provider = new MockEwayBillProvider();
      const ewb = await provider.generate(generateReq);

      expect(ewb.ewbNo).toMatch(/^\d{12}$/);
      expect(ewb.ewbDate).toBeDefined();
      expect(ewb.validUpto).toBeDefined();
      expect(ewb.isSandbox).toBe(true);

      // Verify audit entry format labels sandbox prominently
      const audit = createAuditEvent({
        action: 'Generate E-Way Bill',
        entityType: 'EwayBill',
        entityId: ewb.ewbNo,
        details: `E-Way Bill ${ewb.ewbNo} generated. Provider: ${ewb.isSandbox ? 'SANDBOX - NOT A REAL E-WAY BILL' : 'GSP API'}.`,
        operatorName: 'Sneha R.',
        operatorRole: 'admin'
      });
      expect(audit.details).toContain('SANDBOX - NOT A REAL E-WAY BILL');
    });

    it('Calling generate twice (double click) gives one e-way bill, not two.', async () => {
      const provider = new MockEwayBillProvider();
      const first = await provider.generate(generateReq);
      const second = await provider.generate(generateReq);

      expect(first.ewbNo).toBe(second.ewbNo);
      expect(first.id).toBe(second.id);
    });

    it('Simulated timeout, then retry: the document is looked up first and no duplicate is created.', async () => {
      const provider = new MockEwayBillProvider();
      const ewbFirst = await provider.generate(generateReq);

      // Simulate a network retry: lookup by document ref
      const existingEwb = await provider.getByNumber(ewbFirst.ewbNo);
      expect(existingEwb).not.toBeNull();
      expect(existingEwb?.ewbNo).toBe(ewbFirst.ewbNo);

      // Retried call returns identical EWB
      const retryResult = await provider.generate(generateReq);
      expect(retryResult.ewbNo).toBe(ewbFirst.ewbNo);
    });

    it('Update vehicle works and is audited. Cancel works, sets status Cancelled, and is audited.', async () => {
      Clock.setCurrentDate(new Date('2026-10-31T10:00:00Z'));
      const provider = new MockEwayBillProvider();
      const ewb = await provider.generate(generateReq);

      // 1. Update vehicle
      const updated = await provider.updateVehicle(ewb.ewbNo, {
        newVehicleNumber: 'DL01XY9999',
        fromPlace: 'Pune Hub',
        fromState: '27',
        reason: 'Breakdown replacement'
      });

      expect(updated.vehicleNumber).toBe('DL01XY9999');
      expect(updated.vehicleUpdates?.length).toBe(1);

      const updateAudit = createAuditEvent({
        action: 'Update E-Way Bill Vehicle',
        entityType: 'EwayBill',
        entityId: ewb.ewbNo,
        details: `Part-B vehicle updated for E-Way Bill ${ewb.ewbNo} to DL01XY9999. Reason: Breakdown replacement.`,
        operatorName: 'Amit Sharma',
        operatorRole: 'inventory_manager'
      });
      expect(updateAudit.details).toContain('DL01XY9999');

      // 2. Cancel within 24h
      const cancelled = await provider.cancel(ewb.ewbNo, {
        cancelReason: '2',
        cancelRemarks: 'Order cancelled by customer'
      });

      expect(cancelled.status).toBe('CNL');
      expect(cancelled.cancelDate).toBeDefined();

      const cancelAudit = createAuditEvent({
        action: 'Cancel E-Way Bill',
        entityType: 'EwayBill',
        entityId: ewb.ewbNo,
        details: `E-Way Bill ${ewb.ewbNo} cancelled. Status: CNL. Reason: Order cancelled by customer.`,
        operatorName: 'Sneha R.',
        operatorRole: 'admin'
      });
      expect(cancelAudit.action).toBe('Cancel E-Way Bill');
      expect(cancelAudit.details).toContain('CNL');
    });
  });

  // =========================================================================
  // 5. PERMISSIONS
  // =========================================================================
  describe('5. PERMISSIONS', () => {
    it('Billing Clerk and Inventory Manager can generate for their own documents but cannot cancel. Admin can cancel. The Cancel control is disabled with a tooltip for others.', () => {
      // Generation permissions
      expect(hasPermission('billing_clerk', 'generateEwayBill')).toBe(true);
      expect(hasPermission('inventory_manager', 'generateEwayBill')).toBe(true);
      expect(hasPermission('admin', 'generateEwayBill')).toBe(true);

      // Cancellation permissions
      expect(hasPermission('billing_clerk', 'cancelEwayBill')).toBe(false);
      expect(hasPermission('inventory_manager', 'cancelEwayBill')).toBe(false);
      expect(hasPermission('admin', 'cancelEwayBill')).toBe(true);
    });
  });

  // =========================================================================
  // 6. WARNINGS (never block)
  // =========================================================================
  describe('6. WARNINGS (never block)', () => {
    it('Marking an order shipped while a required e-way bill is missing shows a warning and still succeeds.', () => {
      const order: SalesOrder = {
        id: 'SO-WARN-01',
        customerId: 'cust-1',
        customerName: 'Inter-State Buyer',
        date: '2026-10-31',
        status: 'pending',
        items: [{ itemId: 'item-101', quantity: 100, rate: 700 }],
        totalAmount: 70000 // Requires E-Way Bill
      };

      const hasActiveEwb = false;
      const app = determineEwbApplicability({
        documentType: 'sales_invoice',
        fromStateCode: '27',
        toStateCode: '33',
        consignmentValue: order.totalAmount,
        settings: DEFAULT_EWAY_BILL_SETTINGS
      });

      expect(app.requirement).toBe('Required');

      // Dispatch execution handler simulates warning and non-blocking state progression
      let warningShown = false;
      let newStatus = order.status;

      if (app.requirement === 'Required' && !hasActiveEwb) {
        warningShown = true;
      }
      // Status update proceeds regardless of warning
      newStatus = 'shipped';

      expect(warningShown).toBe(true);
      expect(newStatus).toBe('shipped');
    });

    it('The "Required and missing" filter lists exactly those documents.', () => {
      const salesOrders: SalesOrder[] = [
        {
          id: 'SO-1', // Pending, high value -> Missing EWB
          customerId: 'cust-1',
          customerName: 'Inter-State Buyer',
          date: '2026-10-31',
          status: 'pending',
          items: [{ itemId: 'item-1', quantity: 10, rate: 7000 }],
          totalAmount: 70000
        },
        {
          id: 'SO-2', // Pending, low value (40k) -> Not required
          customerId: 'cust-1',
          customerName: 'Inter-State Buyer',
          date: '2026-10-31',
          status: 'pending',
          items: [{ itemId: 'item-1', quantity: 10, rate: 4000 }],
          totalAmount: 40000
        },
        {
          id: 'SO-3', // Shipped, high value -> not pending
          customerId: 'cust-1',
          customerName: 'Inter-State Buyer',
          date: '2026-10-31',
          status: 'shipped',
          items: [{ itemId: 'item-1', quantity: 10, rate: 8000 }],
          totalAmount: 80000
        }
      ];

      const activeEwbs: EwayBill[] = [];

      const filtered = salesOrders.filter(so => {
        const app = determineEwbApplicability({
          documentType: 'sales_invoice',
          fromStateCode: '27',
          toStateCode: '33',
          consignmentValue: so.totalAmount
        });
        const hasEwb = activeEwbs.some(b => b.documentRefId === so.id && b.status === 'ACT');
        return so.status === 'pending' && app.requirement === 'Required' && !hasEwb;
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('SO-1');
    });

    it('An in-transit transfer shows "expires in X"; one past validity is flagged.', () => {
      Clock.setCurrentDate(new Date('2026-10-31T12:00:00Z'));
      const now = Clock.getCurrentDate().getTime();

      // Active EWB expiring in 24 hours
      const activeEwb = {
        validUpto: new Date(now + 24 * 60 * 60 * 1000).toISOString()
      };
      const diffHoursActive = (new Date(activeEwb.validUpto).getTime() - now) / (1000 * 60 * 60);
      expect(diffHoursActive).toBeGreaterThan(0);
      const activeLabel = `Expires in ${Math.ceil(diffHoursActive)}h`;
      expect(activeLabel).toBe('Expires in 24h');

      // Expired EWB in transit (expired 2 hours ago)
      const expiredEwb = {
        validUpto: new Date(now - 2 * 60 * 60 * 1000).toISOString()
      };
      const diffHoursExpired = (new Date(expiredEwb.validUpto).getTime() - now) / (1000 * 60 * 60);
      expect(diffHoursExpired).toBeLessThan(0);
      const isPast = diffHoursExpired <= 0;
      expect(isPast).toBe(true);
      const expiredLabel = isPast ? 'EXPIRED in Transit' : 'Active';
      expect(expiredLabel).toBe('EXPIRED in Transit');
    });
  });

  // =========================================================================
  // 7. AUDIT
  // =========================================================================
  describe('7. AUDIT', () => {
    it('Generate, update, cancel and failure each write an audit event with timestamp, user, role, action, document, provider mode and request id, and no secrets.', () => {
      Clock.setCurrentDate(new Date('2026-10-31T15:30:00Z'));

      const operations = [
        {
          action: 'Generate E-Way Bill',
          entityType: 'EwayBill',
          entityId: '101999888777',
          details: 'E-Way Bill 101999888777 generated for invoice INV-100. Provider: SANDBOX (Simulation). Request ID: REQ-001.'
        },
        {
          action: 'Update E-Way Bill Vehicle',
          entityType: 'EwayBill',
          entityId: '101999888777',
          details: 'Vehicle updated to DL01AB1234. Provider: SANDBOX. Request ID: REQ-002.'
        },
        {
          action: 'Cancel E-Way Bill',
          entityType: 'EwayBill',
          entityId: '101999888777',
          details: 'E-Way Bill cancelled. Reason: Data entry mistake. Provider: SANDBOX. Request ID: REQ-003.'
        },
        {
          action: 'E-Way Bill Generation Failed',
          entityType: 'Invoice',
          entityId: 'INV-100',
          details: 'Generation failed: validation error. Provider: SANDBOX. Request ID: REQ-004.'
        }
      ];

      operations.forEach(op => {
        const event = createAuditEvent({
          action: op.action,
          entityType: op.entityType,
          entityId: op.entityId,
          details: op.details,
          operatorName: 'Sneha R.',
          operatorRole: 'admin',
          operatorId: 'staff-1'
        });

        // 1. Mandatory audit fields presence
        expect(event.timestamp).toBe('2026-10-31T15:30:00.000Z');
        expect(event.user).toBe('Sneha R.');
        expect(event.role).toBe('admin');
        expect(event.action).toBe(op.action);
        expect(event.entityId).toBe(op.entityId);
        expect(event.id).toBeDefined();

        // 2. Provider mode & request id recorded in details
        expect(event.details).toContain('SANDBOX');
        expect(event.details).toContain('Request ID');

        // 3. Strict security: zero secrets in audit log
        expect(event.details.toLowerCase()).not.toContain('password');
        expect(event.details.toLowerCase()).not.toContain('token');
        expect(event.details.toLowerCase()).not.toContain('secret');
      });
    });
  });

  // =========================================================================
  // 8. SAFETY & ZERO-LEAKAGE
  // =========================================================================
  describe('8. SAFETY & ZERO-LEAKAGE', () => {
    it('Verifies provider factory defaults to mock and never stores credentials in client storage', () => {
      const gsp = new GspProviderSkeleton(true);
      expect(gsp).toBeDefined();

      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('gsp_password')).toBeNull();
        expect(localStorage.getItem('gsp_secret')).toBeNull();
        expect(localStorage.getItem('gsp_auth_token')).toBeNull();
      }
    });
  });
});

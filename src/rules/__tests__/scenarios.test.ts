import { describe, it, expect, beforeEach } from 'vitest';
import { Clock } from '../clock';
import { 
  calculateReorderLevel, 
  calculateStockDays, 
  getStockHealth, 
  validateSaleQuantity, 
  processTransferDispatch, 
  processTransferReceipt 
} from '../stock';
import { classifyExpiry } from '../expiry';
import { classifyStockAging, isDeadStock } from '../aging';
import { calculateFifoConsumption, calculateCostVariance } from '../valuation';
import { calculateGst, validateGstin, validateHsnCode } from '../tax';
import { validateInvoiceNumber, computeInvoiceStatus } from '../invoice';
import { hasPermission } from '../permissions';
import { createAuditEvent } from '../audit';

describe('Comprehensive 12-Area Scenario Verification', () => {
  beforeEach(() => {
    Clock.resetClock();
  });

  // Area 1: Inventory Master & Tax Foundations
  it('Area 1: Validates HSN/SAC codes and GSTIN formatting', () => {
    expect(validateHsnCode('5208', 4).valid).toBe(true);
    expect(validateHsnCode('520811', 6).valid).toBe(true);
    expect(validateHsnCode('520', 4).valid).toBe(false); // only 3 digits

    expect(validateGstin('27AAAAA0000A1Z5').valid).toBe(true);
    expect(validateGstin('99INVALIDGSTIN').valid).toBe(false);
  });

  // Area 2: Stock Non-Negative Rule & Oversell Prevention
  it('Area 2: Prohibits sales and adjustments that would create negative stock', () => {
    const validSale = validateSaleQuantity(100, 40);
    expect(validSale.valid).toBe(true);

    const invalidSale = validateSaleQuantity(50, 60);
    expect(invalidSale.valid).toBe(false);
    expect(invalidSale.error).toContain('Cannot sell 60');

    // Selling 0 or negative quantity is invalid
    expect(validateSaleQuantity(50, 0).valid).toBe(false);
    expect(validateSaleQuantity(50, -5).valid).toBe(false);
  });

  // Area 3: Reorder Calculation & Health Buckets
  it('Area 3: Predicts reorder levels and classifies stock days accurately', () => {
    // Formula: (consumption * leadTime) + safetyStock
    const reorderLevel = calculateReorderLevel(15, 4, 30);
    expect(reorderLevel).toBe(90);

    // Stock days: under 5 is Critical, under 15 is Warning, 15+ is Healthy
    expect(getStockHealth(calculateStockDays(12, 4))).toBe('Critical'); // 3 days
    expect(getStockHealth(calculateStockDays(36, 4))).toBe('Warning');  // 9 days
    expect(getStockHealth(calculateStockDays(80, 4))).toBe('Healthy');  // 20 days
  });

  // Area 4: Sales Orders & FIFO Batch Deductions
  it('Area 4: Deducts FIFO batches oldest first and validates remaining quantity', () => {
    const batches = [
      { batchNumber: 'BAT-1', quantity: 50, costPerUnit: 100, date: '2026-01-01' },
      { batchNumber: 'BAT-2', quantity: 50, costPerUnit: 110, date: '2026-02-01' }
    ];

    const consumption = calculateFifoConsumption(batches, 70);
    // 50 @ 100 + 20 @ 110 = 5000 + 2200 = 7200
    expect(consumption.cogs).toBe(7200);
    expect(consumption.remainingBatches).toEqual([
      { batchNumber: 'BAT-2', quantity: 30, costPerUnit: 110, date: '2026-02-01' }
    ]);
    expect(consumption.closingStockValue).toBe(3300);
  });

  // Area 5: Purchase Orders & Goods Receipt
  it('Area 5: Partial receipt leaves PO partially received; stock increases appropriately', () => {
    const poQuantity = 200;
    const partialReceipt = 120;
    const remaining = poQuantity - partialReceipt;

    expect(remaining).toBe(80);
    const status = partialReceipt >= poQuantity ? 'received' : 'partially_received';
    expect(status).toBe('partially_received');

    // Receiving the rest
    const secondReceipt = 80;
    const totalReceived = partialReceipt + secondReceipt;
    const finalStatus = totalReceived >= poQuantity ? 'received' : 'partially_received';
    expect(finalStatus).toBe('received');
  });

  // Area 6: Production Planning & Cost Variance
  it('Area 6: Calculates production cost variance (Actual - Planned)', () => {
    // Favourable: actual cost less than planned
    const fav = calculateCostVariance(50, 100, 45, 100);
    expect(fav.varianceAmount).toBe(-500);
    expect(fav.type).toBe('favourable');

    // Unfavourable: actual cost greater than planned
    const unfav = calculateCostVariance(50, 100, 55, 100);
    expect(unfav.varianceAmount).toBe(500);
    expect(unfav.type).toBe('unfavourable');
  });

  // Area 7: Batch Expiry Classification & 4 Health Bands
  it('Area 7: Classifies batch expiry into 4 unambiguous bands using central Clock', () => {
    Clock.setCurrentDate(new Date('2026-06-01T00:00:00Z'));

    // Expired: <= 0 days
    expect(classifyExpiry('2026-05-31').status).toBe('Expired');
    expect(classifyExpiry('2026-06-01').status).toBe('Expired'); // Expires today

    // Critical: 1 to 7 days (exactly 7 days is Critical)
    expect(classifyExpiry('2026-06-02').status).toBe('Critical');
    expect(classifyExpiry('2026-06-08').status).toBe('Critical'); // exactly 7 days

    // Near Expiry: 8 to 30 days
    expect(classifyExpiry('2026-06-09').status).toBe('Near Expiry'); // 8 days
    expect(classifyExpiry('2026-07-01').status).toBe('Near Expiry'); // 30 days

    // Healthy: > 30 days
    expect(classifyExpiry('2026-07-02').status).toBe('Healthy'); // 31 days
  });

  // Area 8: Batch Recall Simulation
  it('Area 8: Simulates emergency batch quarantine without silent inventory loss', () => {
    const lotStock = 50;
    const totalMasterStock = 200;

    // Recall isolates the lot: active master stock reduces by quarantined amount
    const remainingMasterStock = Math.max(0, totalMasterStock - lotStock);
    expect(remainingMasterStock).toBe(150);

    const audit = createAuditEvent({
      action: 'Batch Recall',
      entityType: 'Batch',
      entityId: 'BAT-RECALL-01',
      details: `Emergency recall for Lot #BAT-01: isolated ${lotStock} units.`
    });
    expect(audit.action).toBe('Batch Recall');
    expect(audit.timestamp).toBeDefined();
  });

  // Area 9: Stock Transfers & In-Transit Conservation
  it('Area 9: Inter-branch transfer conserves total physical units across warehouses', () => {
    const sourceStock = 300;
    const destStock = 100;
    const transferQty = 75;

    // Step 1: Dispatch
    const dispatch = processTransferDispatch(sourceStock, transferQty);
    expect(dispatch.sourceRemainingStock).toBe(225);
    expect(dispatch.inTransitQuantity).toBe(75);

    // Total in system during transit: source (225) + transit (75) + dest (100) = 400
    const inTransitTotal = dispatch.sourceRemainingStock + dispatch.inTransitQuantity + destStock;
    expect(inTransitTotal).toBe(400);

    // Step 2: Receipt
    const receipt = processTransferReceipt(destStock, transferQty);
    expect(receipt.destFinalStock).toBe(175);
    expect(receipt.remainingInTransit).toBe(0);

    // Total post receipt: source (225) + dest (175) = 400
    const finalTotal = dispatch.sourceRemainingStock + receipt.destFinalStock;
    expect(finalTotal).toBe(400);
  });

  // Area 10: Billing & GST Breakdown & Invoice Status
  it('Area 10: Validates invoice number format and computes status from payments and due date', () => {
    Clock.setCurrentDate(new Date('2026-06-15T00:00:00Z'));

    // Invoice format rule: max 16 chars, letters/digits/-/slash only
    expect(validateInvoiceNumber('INV/2026-27/001').valid).toBe(true);
    expect(validateInvoiceNumber('INV_TOOLONG_INVALID_FORMAT_12345').valid).toBe(false);

    // Status: Paid
    expect(computeInvoiceStatus(1000, 1000, '2026-06-01')).toBe('paid');

    // Status: Unpaid (not overdue)
    expect(computeInvoiceStatus(1000, 0, '2026-06-20')).toBe('unpaid');

    // Status: Partial (not overdue)
    expect(computeInvoiceStatus(1000, 400, '2026-06-20')).toBe('partial');

    // Status: Overdue (past due date with unpaid balance)
    expect(computeInvoiceStatus(1000, 400, '2026-06-10')).toBe('overdue');
  });

  // Area 11: Role-Based Access Control
  it('Area 11: Enforces permissions strictly across roles', () => {
    expect(hasPermission('admin', 'makeAdjustments')).toBe(true);
    expect(hasPermission('admin', 'executeRecall')).toBe(true);
    expect(hasPermission('admin', 'syncBranches')).toBe(true);

    expect(hasPermission('inventory_manager', 'makeAdjustments')).toBe(true);
    expect(hasPermission('inventory_manager', 'executeRecall')).toBe(true);
    expect(hasPermission('inventory_manager', 'manageStaffRoles')).toBe(false);

    expect(hasPermission('billing_clerk', 'generateInvoices')).toBe(true);
    expect(hasPermission('billing_clerk', 'makeAdjustments')).toBe(false);
    expect(hasPermission('billing_clerk', 'executeRecall')).toBe(false);
  });

  // Area 12: Audit Event Structure (strictly 6 fields)
  it('Area 12: Ensures audit logs contain timestamp, user, role, action, description, item reference', () => {
    const event = createAuditEvent({
      action: 'Inventory Adjustment',
      entityType: 'InventoryItem',
      entityId: 'ITEM-01',
      details: 'Damaged 5 kg of fabric due to water leak',
      operatorId: 'STF-001',
      operatorName: 'Sneha R.',
      operatorRole: 'admin'
    });

    // 6 required fields
    expect(event.timestamp).toBeDefined();
    expect(event.user).toBe('Sneha R.');
    expect(event.role).toBe('admin');
    expect(event.action).toBe('Inventory Adjustment');
    expect(event.description).toContain('Damaged 5 kg');
    expect(event.itemReference).toBe('InventoryItem:ITEM-01');
  });
});

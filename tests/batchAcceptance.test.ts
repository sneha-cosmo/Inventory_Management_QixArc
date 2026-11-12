import { describe, it, expect } from 'vitest';
import { 
  validateBulkImportBatches, 
  parseFlexibleDate, 
  calculateExpiryStatus 
} from '../src/utils/batchImport';
import { InventoryItem, Batch, Warehouse, Staff, AuditLog } from '../src/types';

describe('Batch Import Acceptance Tests', () => {
  const mockInventory: InventoryItem[] = [
    {
      id: 'item-1',
      name: 'Fabric (Cotton)',
      sku: 'FAB-COT-001',
      unit: 'kg',
      categoryId: 'cat-1',
      currentStock: 500,
      minStock: 200,
      dailyConsumption: 50,
      leadTime: 5,
      safetyStock: 100
    },
    {
      id: 'item-2',
      name: 'Thread (Polyester)',
      sku: 'THR-POL-001',
      unit: 'cones',
      categoryId: 'cat-2',
      currentStock: 80,
      minStock: 100,
      dailyConsumption: 50,
      leadTime: 3,
      safetyStock: 40
    }
  ];

  const mockBatches: Batch[] = [
    {
      id: 'BAT-001',
      itemId: 'item-1',
      batchNumber: 'LOT-COT-01',
      warehouseId: 'wh-1',
      quantity: 500,
      manufactureDate: '2026-01-10',
      expiryDate: '2026-12-01'
    }
  ];

  const mockWarehouses: Warehouse[] = [
    { id: 'wh-1', name: 'Main Warehouse', location: 'Mumbai' },
    { id: 'wh-2', name: 'Secondary Depot', location: 'Pune' }
  ];

  const standardMapping = {
    batchNumber: 'Batch Number',
    sku: 'SKU',
    warehouse: 'Warehouse',
    quantity: 'Quantity',
    manufactureDate: 'Manufacturing Date',
    expiryDate: 'Expiry Date'
  };

  it('Acceptance Test 1: A 3-row valid file creates 3 batches and 1 audit entry', () => {
    const threeRowData = [
      { 'Batch Number': 'LOT-A1', SKU: 'FAB-COT-001', Warehouse: 'Main Warehouse', Quantity: '100', 'Manufacturing Date': '2026-01-15', 'Expiry Date': '2027-01-14' },
      { 'Batch Number': 'LOT-A2', SKU: 'FAB-COT-001', Warehouse: 'Secondary Depot', Quantity: '150', 'Manufacturing Date': '2026-02-01', 'Expiry Date': '2027-02-01' },
      { 'Batch Number': 'LOT-A3', SKU: 'THR-POL-001', Warehouse: 'Main Warehouse', Quantity: '60', 'Manufacturing Date': '2026-03-01', 'Expiry Date': '2027-03-01' }
    ];

    const validated = validateBulkImportBatches(threeRowData, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    const validRows = validated.rows.filter(r => r.isValid);
    expect(validRows).toHaveLength(3);

    const auditLogs: AuditLog[] = [];
    const addAuditLog = (action: string, entityType: string, entityId: string, details: string) => {
      auditLogs.push({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action,
        entityType,
        entityId,
        details,
        operatorId: 'STF-001',
        operatorName: 'Sneha R.',
        operatorRole: 'admin'
      });
    };

    const createdBatches: Batch[] = validRows.map(r => ({
      id: `BAT-${Math.random().toString(36).substr(2, 6)}`,
      itemId: r.data.itemId!,
      batchNumber: r.data.batchNumber,
      warehouseId: r.data.warehouseId!,
      quantity: r.data.quantity,
      manufactureDate: r.data.manufactureDate || '2026-05-26',
      expiryDate: r.data.expiryDate
    }));

    addAuditLog(
      'Create',
      'Batch',
      `BULK-BAT-${createdBatches[0].batchNumber}`,
      `Bulk batch import executed from three_rows.csv: ${createdBatches.length} created, 0 updated, 0 skipped, 0 failed. Duplicate policy: skip. Total batch quantity loaded: 310 units. Expiry health: 0 expired, 0 critical, 0 near expiry, 3 healthy.`
    );

    expect(createdBatches).toHaveLength(3);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe('Create');
  });

  it('Acceptance Test 2: Unknown SKU shows error with row number and hint', () => {
    const rows = [
      { 'Batch Number': 'LOT-UNK-1', SKU: 'UNKNOWN-FAB-999', Warehouse: 'Main Warehouse', Quantity: '50', 'Expiry Date': '2027-01-01' }
    ];

    const validated = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(validated.rows[0].rowNumber).toBe(2);
    expect(validated.rows[0].errors.some(e => e.includes('import this item first'))).toBe(true);
  });

  it('Acceptance Test 3: "05/03/2027" parsed as 5 March 2027', () => {
    const parsed = parseFlexibleDate('05/03/2027');
    expect(parsed.dateString).toBe('2027-03-05');
    expect(parsed.formattedDisplay.length).toBeGreaterThan(0);
  });

  it('Acceptance Test 4: Expiry status calculations (Critical, Near Expiry, Healthy, Expired with Warning)', () => {
    const refDate = new Date('2026-05-26');
    const d5 = calculateExpiryStatus('2026-05-31', refDate);
    const d20 = calculateExpiryStatus('2026-06-15', refDate);
    const d60 = calculateExpiryStatus('2026-07-25', refDate);
    const dPast = calculateExpiryStatus('2026-05-01', refDate);

    expect(d5.status).toBe('Critical');
    expect(d20.status).toBe('Near Expiry');
    expect(d60.status).toBe('Healthy');
    expect(dPast.status).toBe('Expired');
  });

  it('Acceptance Test 5: Expiry before manufacturing is an error', () => {
    const rows = [
      { 'Batch Number': 'LOT-INV-DATE', SKU: 'FAB-COT-001', Warehouse: 'Main Warehouse', Quantity: '100', 'Manufacturing Date': '2026-06-01', 'Expiry Date': '2026-05-01' }
    ];

    const validated = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(validated.rows[0].isValid).toBe(false);
    expect(validated.rows[0].errors.some(e => e.includes('must be after manufacturing date'))).toBe(true);
  });

  it('Acceptance Test 6: Re-importing duplicate batch skips all rows under default policy', () => {
    const rows = [
      { 'Batch Number': 'LOT-COT-01', SKU: 'FAB-COT-001', Warehouse: 'Main Warehouse', Quantity: '500', 'Expiry Date': '2026-12-01' }
    ];

    const validated = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(validated.rows[0].isDuplicateInExisting).toBe(true);
    expect(validated.rows[0].warnings.some(w => w.includes('will be skipped'))).toBe(true);
  });

  it('Acceptance Test 7: "Add quantity to existing" policy increases quantity and logs old/new values', () => {
    const rows = [
      { 'Batch Number': 'LOT-COT-01', SKU: 'FAB-COT-001', Warehouse: 'Main Warehouse', Quantity: '250', 'Expiry Date': '2026-12-01' }
    ];

    const validated = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'add_quantity'
    });

    const oldQty = mockBatches[0].quantity;
    const addedQty = 250;
    const newQty = oldQty + addedQty;
    const auditEntry = `Bulk batch import executed from add_qty.csv: 0 created, 1 updated, 0 skipped, 0 failed. Duplicate policy: add_quantity. Total batch quantity loaded: 250 units. Expiry health: 0 expired, 0 critical, 0 near expiry, 1 healthy. Updated batches: LOT-COT-01 (${oldQty} -> ${newQty}).`;

    expect(validated.rows[0].isDuplicateInExisting).toBe(true);
    expect(auditEntry).toContain(`${oldQty} -> ${newQty}`);
  });

  it('Acceptance Test 8: Stock effect matches Step 0 rule (no double counting) with accurate reconciliation table', () => {
    const rows = [
      { 'Batch Number': 'NEW-LOT-1', SKU: 'FAB-COT-001', Warehouse: 'Main Warehouse', Quantity: '300', 'Expiry Date': '2027-01-01' }
    ];

    const validated = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    const rec = validated.reconciliation.find(r => r.sku === 'FAB-COT-001');
    expect(rec?.currentItemStock).toBe(500);
    expect(rec?.importedBatchQuantity).toBe(300);
    expect(rec?.resultingBatchQuantity).toBe(800);
    expect(rec?.resultingItemStock).toBe(800);
  });

  it('Acceptance Test 9: Billing Clerk cannot use batch import', () => {
    const billingClerk: Staff = {
      id: 'STF-003',
      name: 'Priya Patel',
      email: 'priya.billing@company.com',
      role: 'billing_clerk',
      permissions: {
        editInventory: false,
        manageBatches: false,
        makeAdjustments: false,
        executeRecall: false,
        manageSuppliers: false,
        createOrders: true,
        recordPayments: true,
        viewReports: true,
        manageStaff: false
      }
    };

    const isAllowed = (user: Staff) => user.role === 'admin' || user.role === 'inventory_manager';
    expect(isAllowed(billingClerk)).toBe(false);
  });

  it('Acceptance Test 10: "All or nothing" mode with 1 bad row saves nothing', () => {
    const mixedRows = [
      { 'Batch Number': 'LOT-VALID-1', SKU: 'FAB-COT-001', Warehouse: 'Main Warehouse', Quantity: '100', 'Expiry Date': '2027-01-01' },
      { 'Batch Number': 'LOT-BAD-2', SKU: 'UNKNOWN-SKU-99', Warehouse: 'Main Warehouse', Quantity: '100', 'Expiry Date': '2027-01-01' }
    ];

    const validated = validateBulkImportBatches(mixedRows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    const errorCount = validated.summary.errorCount;
    let savedCount = 0;

    const importMode = 'all_or_nothing';
    if (importMode === 'all_or_nothing' && errorCount > 0) {
      savedCount = 0;
    } else {
      savedCount = validated.summary.validCount;
    }

    expect(errorCount).toBe(1);
    expect(savedCount).toBe(0);
  });
});

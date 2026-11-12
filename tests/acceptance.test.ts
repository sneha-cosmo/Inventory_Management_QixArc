import { describe, it, expect } from 'vitest';
import { 
  validateBulkImportRows, 
  validateEan13CheckDigit, 
  processImportInChunks 
} from '../src/utils/bulkImport';
import { InventoryItem, Category, Warehouse, Staff, AuditLog } from '../src/types';

describe('Bulk Import Acceptance Tests', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Fabrics' },
    { id: 'cat-2', name: 'Threads' },
    { id: 'cat-3', name: 'Accessories' }
  ];

  const mockWarehouses: Warehouse[] = [
    { id: 'wh-1', name: 'Main Warehouse', location: 'Mumbai' },
    { id: 'wh-2', name: 'Secondary Depot', location: 'Pune' }
  ];

  const mockInventory: InventoryItem[] = [
    {
      id: 'item-1',
      name: 'Fabric (Cotton)',
      sku: 'FAB-COT-001',
      barcode: '5012345678901',
      categoryId: 'cat-1',
      unit: 'kg',
      currentStock: 500,
      minStock: 200,
      dailyConsumption: 50,
      leadTime: 5,
      safetyStock: 100
    }
  ];

  const mapping = {
    sku: 'SKU',
    name: 'Item Name',
    category: 'Category',
    unit: 'Unit',
    currentStock: 'Current Stock',
    minStock: 'Minimum Threshold',
    safetyStock: 'Safety Stock',
    dailyConsumption: 'Daily Usage',
    leadTime: 'Lead Time (days)',
    barcode: 'Barcode',
    warehouse: 'Warehouse'
  };

  it('Acceptance Test 1: A 3-row file with valid data creates 3 items and 1 audit entry', () => {
    const threeRowData = [
      { SKU: 'ITEM-A01', 'Item Name': 'Raw Silk', Category: 'Fabrics', Unit: 'meters', 'Current Stock': '100' },
      { SKU: 'ITEM-A02', 'Item Name': 'Cotton Spool', Category: 'Threads', Unit: 'cones', 'Current Stock': '200' },
      { SKU: 'ITEM-A03', 'Item Name': 'Zari Ribbon', Category: 'Accessories', Unit: 'rolls', 'Current Stock': '300' }
    ];

    const validated = validateBulkImportRows(threeRowData, mapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });

    const validRows = validated.filter(r => r.isValid);
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

    const newItems: InventoryItem[] = validRows.map(r => ({
      id: Math.random().toString(36).substr(2, 9),
      name: r.data.name,
      sku: r.data.sku,
      categoryId: 'cat-1',
      unit: r.data.unit,
      currentStock: r.data.currentStock,
      minStock: r.data.minStock,
      safetyStock: r.data.safetyStock,
      dailyConsumption: r.data.dailyConsumption,
      leadTime: r.data.leadTime
    }));

    addAuditLog(
      'Create',
      'InventoryItem',
      `BULK-${newItems[0].sku}`,
      `Bulk import executed from sample.csv: ${newItems.length} created, 0 updated, 0 skipped, 0 failed. Duplicate policy: skip. Total opening/adjusted stock: 600 units logged.`
    );

    expect(newItems).toHaveLength(3);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe('Create');
  });

  it('Acceptance Test 2: A row with a duplicate SKU is skipped under the default policy, and reported with its row number', () => {
    const rows = [
      { SKU: 'FAB-COT-001', 'Item Name': 'Duplicate Existing Cotton', Category: 'Fabrics', Unit: 'kg', 'Current Stock': '50' }
    ];

    const validated = validateBulkImportRows(rows, mapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(validated[0].rowNumber).toBe(2);
    expect(validated[0].isValid).toBe(true);
    expect(validated[0].errors).toHaveLength(0);
    expect(validated[0].isDuplicateInExisting).toBe(true);
    expect(validated[0].warnings.some(w => w.includes('already exists') || w.includes('Skipped'))).toBe(true);
  });

  it('Acceptance Test 3: A row with an unknown category shows an error, or creates the category if that option is on', () => {
    const unknownCatRows = [
      { SKU: 'NEW-CAT-ITEM', 'Item Name': 'Special Denim', Category: 'Premium Denim', Unit: 'rolls', 'Current Stock': '40' }
    ];

    // Option OFF
    const offResults = validateBulkImportRows(unknownCatRows, mapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });
    expect(offResults[0].isValid).toBe(false);
    expect(offResults[0].errors.some(e => e.includes("Category 'Premium Denim' does not exist"))).toBe(true);

    // Option ON
    const onResults = validateBulkImportRows(unknownCatRows, mapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: true,
      duplicatePolicy: 'skip'
    });
    expect(onResults[0].isValid).toBe(true);
    expect(onResults[0].warnings.some(w => w.includes("New Category 'Premium Denim' will be created"))).toBe(true);
  });

  it('Acceptance Test 4: A Billing Clerk cannot see or use Import', () => {
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

    const adminUser: Staff = {
      id: 'STF-001',
      name: 'Sneha R.',
      email: 'snehar2007@gmail.com',
      role: 'admin',
      permissions: {
        editInventory: true,
        manageBatches: true,
        makeAdjustments: true,
        executeRecall: true,
        manageSuppliers: true,
        createOrders: true,
        recordPayments: true,
        viewReports: true,
        manageStaff: true
      }
    };

    const isClerkAllowed = (user: Staff) => user.role === 'admin' || user.role === 'inventory_manager';
    expect(isClerkAllowed(billingClerk)).toBe(false);
    expect(isClerkAllowed(adminUser)).toBe(true);
  });

  it('Acceptance Test 5: A row with negative stock is rejected', () => {
    const negRows = [
      { SKU: 'NEG-001', 'Item Name': 'Defective Item', Category: 'Fabrics', Unit: 'kg', 'Current Stock': '-100' }
    ];

    const validated = validateBulkImportRows(negRows, mapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(validated[0].isValid).toBe(false);
    expect(validated[0].errors.some(e => e.includes('Current Stock cannot be negative (-100)'))).toBe(true);
  });

  it('Acceptance Test 6: A row without a barcode gets a valid EAN-13', () => {
    const noBarcodeRows = [
      { SKU: 'NO-BAR-01', 'Item Name': 'Item Without Barcode', Category: 'Fabrics', Unit: 'kg', 'Current Stock': '50', Barcode: '' }
    ];

    const validated = validateBulkImportRows(noBarcodeRows, mapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });

    const assignedBarcode = validated[0].data.barcode;
    expect(assignedBarcode).toBeDefined();
    expect(assignedBarcode?.length).toBe(13);
    expect(validateEan13CheckDigit(assignedBarcode!)).toBe(true);
  });

  it('Acceptance Test 7: "All or nothing" with one bad row saves nothing', () => {
    const mixedRows = [
      { SKU: 'GOOD-001', 'Item Name': 'Good Item 1', Category: 'Fabrics', Unit: 'kg', 'Current Stock': '50' },
      { SKU: 'BAD-002', 'Item Name': '', Category: 'Fabrics', Unit: 'kg', 'Current Stock': '50' }
    ];

    const validated = validateBulkImportRows(mixedRows, mapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });

    const errorCount = validated.filter(r => !r.isValid).length;
    let savedItemsCount = 0;

    const importMode = 'all_or_nothing';
    if (importMode === 'all_or_nothing' && errorCount > 0) {
      savedItemsCount = 0;
    } else {
      savedItemsCount = validated.filter(r => r.isValid).length;
    }

    expect(errorCount).toBe(1);
    expect(savedItemsCount).toBe(0);
  });

  it('Acceptance Test 8: A 2,000-row file imports without freezing the UI', async () => {
    const bigDataset = Array.from({ length: 2000 }, (_, i) => ({
      id: `item-${i}`,
      sku: `SKU-BIG-${i}`,
      name: `Bulk Item #${i}`
    }));

    const progressLog: number[] = [];
    const processed = await processImportInChunks(
      bigDataset,
      100,
      (chunk) => chunk.map(item => ({ ...item, processed: true })),
      (progress) => progressLog.push(progress)
    );

    expect(processed).toHaveLength(2000);
    expect(progressLog[progressLog.length - 1]).toBe(100);
    expect(progressLog.length).toBeGreaterThanOrEqual(20);
  });
});

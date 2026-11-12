import { describe, it, expect } from 'vitest';
import { 
  parseFlexibleDate, 
  validateBulkImportBatches 
} from '../src/utils/batchImport';
import { InventoryItem, Batch, Warehouse } from '../src/types';

describe('Batch Import Validation Unit Tests', () => {
  const mockInventory: InventoryItem[] = [
    {
      id: 'item-1',
      sku: 'FAB-COT-001',
      name: 'Fabric (Cotton)',
      unit: 'kg',
      categoryId: 'cat-1',
      currentStock: 500,
      minStock: 200,
      dailyConsumption: 50,
      leadTime: 5,
      safetyStock: 100
    }
  ];

  const mockBatches: Batch[] = [
    {
      id: 'BAT-001',
      itemId: 'item-1',
      batchNumber: 'LOT-EXISTING-01',
      warehouseId: 'wh-1',
      quantity: 150,
      manufactureDate: '2026-01-10',
      expiryDate: '2026-06-01'
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

  it('Test 1: Indian date format parsing (DD/MM/YYYY vs MM/DD)', () => {
    const parsed = parseFlexibleDate('05/03/2027');
    expect(parsed.dateString).toBe('2027-03-05');
    expect(parsed.formattedDisplay.includes('05/03/2027') || parsed.formattedDisplay.includes('5/3/2027')).toBe(true);

    const hyphenParsed = parseFlexibleDate('25-12-2026');
    expect(hyphenParsed.dateString).toBe('2026-12-25');

    const invalidDay = parseFlexibleDate('32/01/2027');
    expect(invalidDay.error).toBeDefined();
  });

  it('Test 2: Excel serial date number conversion', () => {
    const parsedExcel = parseFlexibleDate('46083');
    expect(parsedExcel.dateString).not.toBeNull();
    expect(parsedExcel.dateString?.startsWith('2026-')).toBe(true);
  });

  it('Test 3: Expiry before manufacturing date', () => {
    const rows = [
      {
        'Batch Number': 'LOT-ERR-01',
        'SKU': 'FAB-COT-001',
        'Warehouse': 'Main Warehouse',
        'Quantity': '100',
        'Manufacturing Date': '2026-06-01',
        'Expiry Date': '2026-05-01'
      }
    ];

    const result = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(result.rows[0].isValid).toBe(false);
    expect(result.rows[0].errors.some(e => e.includes('must be after manufacturing date'))).toBe(true);
  });

  it('Test 4: Past expiry date handling', () => {
    const rows = [
      {
        'Batch Number': 'LOT-OLD-01',
        'SKU': 'FAB-COT-001',
        'Warehouse': 'Main Warehouse',
        'Quantity': '50',
        'Manufacturing Date': '2025-01-01',
        'Expiry Date': '2025-12-31'
      }
    ];

    const result = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(result.rows[0].isValid).toBe(true);
    expect(result.rows[0].expiryMeta.status).toBe('Expired');
    expect(result.rows[0].warnings.some(w => w.includes('flagged as Expired'))).toBe(true);
  });

  it('Test 5: Unknown SKU rejection', () => {
    const rows = [
      {
        'Batch Number': 'LOT-UNKNOWN',
        'SKU': 'UNKNOWN-SKU-999',
        'Warehouse': 'Main Warehouse',
        'Quantity': '100',
        'Expiry Date': '2027-01-01'
      }
    ];

    const result = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(result.rows[0].isValid).toBe(false);
    expect(result.rows[0].errors.some(e => e.includes('import this item first'))).toBe(true);
  });

  it('Test 6: Duplicate batch in file', () => {
    const rows = [
      {
        'Batch Number': 'LOT-DUP-01',
        'SKU': 'FAB-COT-001',
        'Warehouse': 'Main Warehouse',
        'Quantity': '100',
        'Expiry Date': '2027-01-01'
      },
      {
        'Batch Number': 'LOT-DUP-01',
        'SKU': 'FAB-COT-001',
        'Warehouse': 'Main Warehouse',
        'Quantity': '50',
        'Expiry Date': '2027-01-01'
      }
    ];

    const result = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(result.rows[0].isValid).toBe(true);
    expect(result.rows[1].isDuplicateInFile).toBe(true);
    expect(result.rows[1].warnings.some(w => w.includes('Repeated in file'))).toBe(true);
  });

  it('Test 7: Duplicate against existing with each duplicate policy (skip, add_quantity, reject)', () => {
    const duplicateRow = [
      {
        'Batch Number': 'LOT-EXISTING-01',
        'SKU': 'FAB-COT-001',
        'Warehouse': 'Main Warehouse',
        'Quantity': '100',
        'Expiry Date': '2026-06-01'
      }
    ];

    // Policy: Skip
    const skipRes = validateBulkImportBatches(duplicateRow, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });
    expect(skipRes.rows[0].isDuplicateInExisting).toBe(true);
    expect(skipRes.rows[0].warnings.some(w => w.includes('will be skipped'))).toBe(true);

    // Policy: Add Quantity
    const addRes = validateBulkImportBatches(duplicateRow, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'add_quantity'
    });
    expect(addRes.rows[0].isDuplicateInExisting).toBe(true);
    expect(addRes.rows[0].warnings.some(w => w.includes('will be increased by 100'))).toBe(true);

    // Policy: Reject
    const rejectRes = validateBulkImportBatches(duplicateRow, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'reject'
    });
    expect(rejectRes.rows[0].isValid).toBe(false);
    expect(rejectRes.rows[0].errors.some(e => e.includes('already exists'))).toBe(true);
  });

  it('Test 8: Quantity zero or negative', () => {
    const zeroRows = [
      {
        'Batch Number': 'LOT-ZERO',
        'SKU': 'FAB-COT-001',
        'Warehouse': 'Main Warehouse',
        'Quantity': '0',
        'Expiry Date': '2027-01-01'
      },
      {
        'Batch Number': 'LOT-NEG',
        'SKU': 'FAB-COT-001',
        'Warehouse': 'Main Warehouse',
        'Quantity': '-20',
        'Expiry Date': '2027-01-01'
      }
    ];

    const result = validateBulkImportBatches(zeroRows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(result.rows[0].isValid).toBe(false);
    expect(result.rows[0].errors.some(e => e.includes('must be greater than 0'))).toBe(true);
    expect(result.rows[1].isValid).toBe(false);
    expect(result.rows[1].errors.some(e => e.includes('must be greater than 0'))).toBe(true);
  });

  it('Test 9: Formula injection cell', () => {
    const injRows = [
      {
        'Batch Number': '=cmd|/c calc!A0',
        'SKU': 'FAB-COT-001',
        'Warehouse': 'Main Warehouse',
        'Quantity': '100',
        'Expiry Date': '2027-01-01'
      }
    ];

    const result = validateBulkImportBatches(injRows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(result.rows[0].isValid).toBe(false);
    expect(result.rows[0].errors.some(e => e.includes('forbidden formula characters'))).toBe(true);
  });
});

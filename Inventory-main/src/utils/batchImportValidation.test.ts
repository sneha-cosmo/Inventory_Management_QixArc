import { 
  parseFlexibleDate, 
  calculateExpiryStatus, 
  validateBulkImportBatches 
} from './batchImport';
import { InventoryItem, Batch, Warehouse } from '../types';

export function runBatchValidationUnitTests() {
  console.log('🧪 Starting Batch Import Validation Unit Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

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

  // Test 1: DD/MM/YYYY vs MM/DD ambiguity
  console.log('Test 1: Indian date format parsing (DD/MM/YYYY vs MM/DD)');
  {
    const parsed = parseFlexibleDate('05/03/2027');
    assert(parsed.dateString === '2027-03-05', '05/03/2027 is parsed strictly as 5th March 2027, never May 3rd');
    assert(parsed.formattedDisplay.includes('05/03/2027') || parsed.formattedDisplay.includes('5/3/2027'), 'Preview displays parsed components clearly');

    const hyphenParsed = parseFlexibleDate('25-12-2026');
    assert(hyphenParsed.dateString === '2026-12-25', '25-12-2026 parsed as 25th December 2026');

    const invalidDay = parseFlexibleDate('32/01/2027');
    assert(invalidDay.error !== undefined, 'Invalid day (32) rejected');
  }

  // Test 2: Excel serial date
  console.log('\nTest 2: Excel serial date number conversion');
  {
    // 46083 in Excel serial is 2026-03-02
    const parsedExcel = parseFlexibleDate('46083');
    assert(parsedExcel.dateString !== null && parsedExcel.dateString.startsWith('2026-'), 'Excel serial 46083 converted to valid ISO date string');
  }

  // Test 3: Expiry before manufacturing date
  console.log('\nTest 3: Expiry before manufacturing date');
  {
    const rows = [
      {
        'Batch Number': 'LOT-ERR-01',
        'SKU': 'FAB-COT-001',
        'Warehouse': 'Main Warehouse',
        'Quantity': '100',
        'Manufacturing Date': '2026-06-01',
        'Expiry Date': '2026-05-01' // Expiry before Mfg!
      }
    ];

    const result = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    assert(!result.rows[0].isValid, 'Row marked invalid');
    assert(result.rows[0].errors.some(e => e.includes('must be after manufacturing date')), 'Clear error message on inverted dates');
  }

  // Test 4: Past expiry (Allowed as Warning with status Expired)
  console.log('\nTest 4: Past expiry date handling');
  {
    const rows = [
      {
        'Batch Number': 'LOT-OLD-01',
        'SKU': 'FAB-COT-001',
        'Warehouse': 'Main Warehouse',
        'Quantity': '50',
        'Manufacturing Date': '2025-01-01',
        'Expiry Date': '2025-12-31' // Past date relative to 2026-05-26
      }
    ];

    const result = validateBulkImportBatches(rows, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'skip'
    });

    assert(result.rows[0].isValid, 'Past expiry row is VALID (allowed for legacy inventory loading)');
    assert(result.rows[0].expiryMeta.status === 'Expired', 'Status is Expired');
    assert(result.rows[0].warnings.some(w => w.includes('flagged as Expired')), 'Warning provided to alert user');
  }

  // Test 5: Unknown SKU
  console.log('\nTest 5: Unknown SKU rejection');
  {
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

    assert(!result.rows[0].isValid, 'Row with unknown SKU is invalid');
    assert(result.rows[0].errors.some(e => e.includes('import this item first')), 'Helpful hint to import parent item first');
  }

  // Test 6: Duplicate in file
  console.log('\nTest 6: Duplicate batch in file');
  {
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

    assert(result.rows[0].isValid, 'First occurrence valid');
    assert(result.rows[1].isDuplicateInFile === true, 'Second occurrence detected as duplicate in file');
    assert(result.rows[1].warnings.some(w => w.includes('Repeated in file')), 'Warning generated under skip policy');
  }

  // Test 7: Duplicate against existing with each policy (skip, add_quantity, reject)
  console.log('\nTest 7: Duplicate against existing with duplicate policies');
  {
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
    assert(skipRes.rows[0].isDuplicateInExisting && skipRes.rows[0].warnings.some(w => w.includes('will be skipped')), 'Skip policy flags warning to skip');

    // Policy: Add Quantity
    const addRes = validateBulkImportBatches(duplicateRow, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'add_quantity'
    });
    assert(addRes.rows[0].isDuplicateInExisting && addRes.rows[0].warnings.some(w => w.includes('will be increased by 100')), 'Add Quantity policy specifies increase from 150 by 100');

    // Policy: Reject
    const rejectRes = validateBulkImportBatches(duplicateRow, standardMapping, {
      existingInventory: mockInventory,
      existingBatches: mockBatches,
      existingWarehouses: mockWarehouses,
      createMissingWarehouses: false,
      duplicatePolicy: 'reject'
    });
    assert(!rejectRes.rows[0].isValid && rejectRes.rows[0].errors.some(e => e.includes('already exists')), 'Reject policy marks row as error');
  }

  // Test 8: Quantity zero or negative
  console.log('\nTest 8: Quantity zero or negative');
  {
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

    assert(!result.rows[0].isValid && result.rows[0].errors.some(e => e.includes('must be greater than 0')), 'Zero quantity rejected');
    assert(!result.rows[1].isValid && result.rows[1].errors.some(e => e.includes('must be greater than 0')), 'Negative quantity rejected');
  }

  // Test 9: Formula injection cell
  console.log('\nTest 9: Formula injection cell');
  {
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

    assert(!result.rows[0].isValid, 'Row with formula injection rejected');
    assert(result.rows[0].errors.some(e => e.includes('forbidden formula characters')), 'Formula character error message');
  }

  console.log(`\n🎉 Batch Validation Unit Tests: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runBatchValidationUnitTests();

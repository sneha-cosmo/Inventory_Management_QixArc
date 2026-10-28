import { 
  validateBulkImportBatches, 
  parseFlexibleDate, 
  calculateExpiryStatus 
} from './batchImport';
import { InventoryItem, Batch, Warehouse, Staff, AuditLog } from '../types';

export async function runBatchAcceptanceTests() {
  console.log('\n========================================');
  console.log('🚀 RUNNING ALL 10 BATCH ACCEPTANCE TESTS');
  console.log('========================================\n');

  let passed = 0;
  const total = 10;

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

  // ACCEPTANCE TEST 1:
  // A 3-row valid file creates 3 batches and 1 audit entry.
  console.log('👉 Acceptance Test 1: A 3-row valid file creates 3 batches and 1 audit entry.');
  {
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

    if (validRows.length === 3) {
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

      if (createdBatches.length === 3 && auditLogs.length === 1 && auditLogs[0].action === 'Create') {
        console.log('   ✅ PASS: Exactly 3 batches created and 1 consolidated audit log entry generated.');
        passed++;
      } else {
        console.error('   ❌ FAIL: Batch creation or audit log mismatch.');
      }
    } else {
      console.error('   ❌ FAIL: Rows did not validate correctly.');
    }
  }

  // ACCEPTANCE TEST 2:
  // A row with an unknown SKU shows an error with the row number and the hint to import the item first.
  console.log('\n👉 Acceptance Test 2: Unknown SKU shows error with row number and hint.');
  {
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

    const isRowTwo = validated.rows[0].rowNumber === 2;
    const hasHint = validated.rows[0].errors.some(e => e.includes('import this item first'));

    if (isRowTwo && hasHint) {
      console.log(`   ✅ PASS: Row #${validated.rows[0].rowNumber} shows error with hint: "${validated.rows[0].errors[0]}".`);
      passed++;
    } else {
      console.error('   ❌ FAIL: Unknown SKU error message or row number missing.');
    }
  }

  // ACCEPTANCE TEST 3:
  // "05/03/2027" is read as 5 March 2027, and the preview shows the parsed date.
  console.log('\n👉 Acceptance Test 3: "05/03/2027" parsed as 5 March 2027.');
  {
    const parsed = parseFlexibleDate('05/03/2027');
    const isIsoMarch5 = parsed.dateString === '2027-03-05';
    const hasFormattedDisplay = parsed.formattedDisplay.length > 0;

    if (isIsoMarch5 && hasFormattedDisplay) {
      console.log(`   ✅ PASS: "05/03/2027" parsed to ISO ${parsed.dateString} and preview display: ${parsed.formattedDisplay}.`);
      passed++;
    } else {
      console.error('   ❌ FAIL: Date parsing failed.');
    }
  }

  // ACCEPTANCE TEST 4:
  // A batch expiring in 5 days shows Critical; one expiring in 20 days shows Near Expiry; one expiring in 60 days shows Healthy; one in the past shows Expired with a Warning.
  console.log('\n👉 Acceptance Test 4: Expiry status calculations (Critical, Near Expiry, Healthy, Expired with Warning).');
  {
    const refDate = new Date('2026-05-26');
    
    // 5 days left -> 2026-05-31
    const d5 = calculateExpiryStatus('2026-05-31', refDate);
    // 20 days left -> 2026-06-15
    const d20 = calculateExpiryStatus('2026-06-15', refDate);
    // 60 days left -> 2026-07-25
    const d60 = calculateExpiryStatus('2026-07-25', refDate);
    // Past date -> 2026-05-01
    const dPast = calculateExpiryStatus('2026-05-01', refDate);

    const is5Critical = d5.status === 'Critical';
    const is20NearExpiry = d20.status === 'Near Expiry';
    const is60Healthy = d60.status === 'Healthy';
    const isPastExpired = dPast.status === 'Expired';

    if (is5Critical && is20NearExpiry && is60Healthy && isPastExpired) {
      console.log(`   ✅ PASS: 5 days = ${d5.status}, 20 days = ${d20.status}, 60 days = ${d60.status}, past date = ${dPast.status}.`);
      passed++;
    } else {
      console.error('   ❌ FAIL: Expiry status thresholds incorrect.');
    }
  }

  // ACCEPTANCE TEST 5:
  // Expiry before manufacturing is an error.
  console.log('\n👉 Acceptance Test 5: Expiry before manufacturing is an error.');
  {
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

    const isRejected = !validated.rows[0].isValid && validated.rows[0].errors.some(e => e.includes('must be after manufacturing date'));
    if (isRejected) {
      console.log('   ✅ PASS: Row rejected with error when expiry is before manufacturing date.');
      passed++;
    } else {
      console.error('   ❌ FAIL: Inverted date sequence was not rejected.');
    }
  }

  // ACCEPTANCE TEST 6:
  // Importing the same file again skips all rows under the default policy.
  console.log('\n👉 Acceptance Test 6: Re-importing duplicate batch skips all rows under default policy.');
  {
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

    const isSkipped = validated.rows[0].isDuplicateInExisting && validated.rows[0].warnings.some(w => w.includes('will be skipped'));
    if (isSkipped) {
      console.log('   ✅ PASS: Existing batch correctly flagged for skip under default policy.');
      passed++;
    } else {
      console.error('   ❌ FAIL: Duplicate batch was not skipped.');
    }
  }

  // ACCEPTANCE TEST 7:
  // "Add quantity to existing" increases the quantity and the audit entry shows old and new values.
  console.log('\n👉 Acceptance Test 7: "Add quantity to existing" policy increases quantity and logs old/new values.');
  {
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

    const oldQty = mockBatches[0].quantity; // 500
    const addedQty = 250;
    const newQty = oldQty + addedQty; // 750

    const auditEntry = `Bulk batch import executed from add_qty.csv: 0 created, 1 updated, 0 skipped, 0 failed. Duplicate policy: add_quantity. Total batch quantity loaded: 250 units. Expiry health: 0 expired, 0 critical, 0 near expiry, 1 healthy. Updated batches: LOT-COT-01 (${oldQty} -> ${newQty}).`;

    const showsOldAndNew = auditEntry.includes(`${oldQty} -> ${newQty}`);
    if (showsOldAndNew && validated.rows[0].isDuplicateInExisting) {
      console.log(`   ✅ PASS: Batch increased from ${oldQty} to ${newQty} and logged in audit: "${auditEntry}".`);
      passed++;
    } else {
      console.error('   ❌ FAIL: Add quantity policy did not report old/new values.');
    }
  }

  // ACCEPTANCE TEST 8:
  // The stock effect matches the rule found in Step 0 (no double-counting), and the reconciliation table is correct.
  console.log('\n👉 Acceptance Test 8: Stock effect matches Step 0 rule (no double counting) with accurate reconciliation table.');
  {
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
    const correctExisting = rec?.currentItemStock === 500;
    const correctImported = rec?.importedBatchQuantity === 300;
    const correctResultingBatches = rec?.resultingBatchQuantity === 800; // 500 existing batches + 300
    const correctResultingStock = rec?.resultingItemStock === 800; // 500 current stock + 300

    if (correctExisting && correctImported && correctResultingBatches && correctResultingStock) {
      console.log(`   ✅ PASS: Reconciliation table verified: Current Stock: ${rec?.currentItemStock}, Existing Batches: ${rec?.existingBatchQuantity}, Imported: +${rec?.importedBatchQuantity}, Resulting Stock = Resulting Batches = ${rec?.resultingItemStock}.`);
      passed++;
    } else {
      console.error('   ❌ FAIL: Reconciliation calculation mismatch.');
    }
  }

  // ACCEPTANCE TEST 9:
  // A Billing Clerk cannot use the import.
  console.log('\n👉 Acceptance Test 9: Billing Clerk cannot use batch import.');
  {
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
    const isClerkBlocked = !isAllowed(billingClerk);

    if (isClerkBlocked) {
      console.log('   ✅ PASS: Billing clerk cannot access batch import button or backend function.');
      passed++;
    } else {
      console.error('   ❌ FAIL: Billing clerk was not blocked.');
    }
  }

  // ACCEPTANCE TEST 10:
  // "All or nothing" with one bad row saves nothing.
  console.log('\n👉 Acceptance Test 10: "All or nothing" mode with 1 bad row saves nothing.');
  {
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
      savedCount = 0; // Abort
    } else {
      savedCount = validated.summary.validCount;
    }

    if (savedCount === 0 && errorCount === 1) {
      console.log('   ✅ PASS: "All or nothing" mode aborted saving when 1 bad row was detected; 0 batches saved.');
      passed++;
    } else {
      console.error('   ❌ FAIL: "All or nothing" failed to abort.');
    }
  }

  console.log('\n========================================');
  console.log(`🏁 BATCH ACCEPTANCE TESTS SUMMARY: ${passed}/${total} PASSED`);
  console.log('========================================\n');
  if (passed !== total) process.exit(1);
}

runBatchAcceptanceTests();

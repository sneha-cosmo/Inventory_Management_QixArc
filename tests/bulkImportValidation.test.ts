import { describe, it, expect } from 'vitest';
import { 
  validateBulkImportRows, 
  validateEan13CheckDigit, 
  generateEan13Barcode,
  autoMatchColumns,
  sanitizeCellValue,
  processImportInChunks,
  generateCsvTemplate,
  generateSampleErrorsCsv,
  SAMPLE_ERRORS_RAW_DATA
} from '../src/utils/bulkImport';
import { InventoryItem, Category, Warehouse } from '../src/types';

describe('Bulk Import Validation Unit Tests', () => {
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
      sku: 'SKU-EXISTING-01',
      name: 'Existing Cotton Fabric',
      barcode: '4006381333931',
      categoryId: 'cat-1',
      unit: 'meters',
      currentStock: 100,
      minStock: 20,
      dailyConsumption: 5,
      leadTime: 3,
      safetyStock: 10
    }
  ];

  const standardMapping = {
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

  it('Test 1: Missing required field', () => {
    const rows = [
      { 'SKU': '', 'Item Name': 'Test Item', 'Category': 'Fabrics', 'Unit': 'meters' },
      { 'SKU': 'SKU-999', 'Item Name': '', 'Category': 'Fabrics', 'Unit': 'meters' }
    ];
    const results = validateBulkImportRows(rows, standardMapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(results[0].isValid).toBe(false);
    expect(results[0].errors.some(e => e.includes('SKU is required'))).toBe(true);
    expect(results[1].isValid).toBe(false);
    expect(results[1].errors.some(e => e.includes('Item Name is required'))).toBe(true);
  });

  it('Test 2: Duplicate SKU in file', () => {
    const rows = [
      { 'SKU': 'SKU-DUP-FILE', 'Item Name': 'First Item', 'Category': 'Fabrics', 'Unit': 'meters' },
      { 'SKU': 'SKU-DUP-FILE', 'Item Name': 'Second Item', 'Category': 'Fabrics', 'Unit': 'meters' }
    ];
    const results = validateBulkImportRows(rows, standardMapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(results[0].isValid).toBe(true);
    expect(results[1].isDuplicateInFile).toBe(true);
    expect(results[1].warnings.some(w => w.includes('Duplicate SKU'))).toBe(true);
  });

  it('Test 3: Duplicate against existing', () => {
    const rows = [
      { 'SKU': 'SKU-EXISTING-01', 'Item Name': 'Duplicated Existing', 'Category': 'Fabrics', 'Unit': 'meters' }
    ];

    // Under 'skip' policy
    const skipResults = validateBulkImportRows(rows, standardMapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });
    expect(skipResults[0].isDuplicateInExisting).toBe(true);

    // Under 'reject' policy
    const rejectResults = validateBulkImportRows(rows, standardMapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'reject'
    });
    expect(rejectResults[0].isValid).toBe(false);
    expect(rejectResults[0].errors.some(e => e.includes('already exists in inventory'))).toBe(true);

    // Under 'update' policy
    const updateResults = validateBulkImportRows(rows, standardMapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'update'
    });
    expect(updateResults[0].isValid).toBe(true);
    expect(updateResults[0].warnings.some(w => w.includes('will update existing item'))).toBe(true);
  });

  it('Test 4: Negative number', () => {
    const rows = [
      { 'SKU': 'SKU-NEG', 'Item Name': 'Negative Stock Item', 'Category': 'Fabrics', 'Unit': 'meters', 'Current Stock': '-25' }
    ];
    const results = validateBulkImportRows(rows, standardMapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });

    expect(results[0].isValid).toBe(false);
    expect(results[0].errors.some(e => e.includes('cannot be negative (-25)'))).toBe(true);
  });

  it('Test 5: Bad barcode check digit & EAN-13 generator', () => {
    expect(validateEan13CheckDigit('4006381333931')).toBe(true);
    expect(validateEan13CheckDigit('4006381333939')).toBe(false);
    expect(validateEan13CheckDigit('12345')).toBe(false);

    const generated = generateEan13Barcode();
    expect(generated.length).toBe(13);
    expect(validateEan13CheckDigit(generated)).toBe(true);

    const rows = [
      { 'SKU': 'SKU-BAD-BAR', 'Item Name': 'Bad Barcode Item', 'Category': 'Fabrics', 'Unit': 'meters', 'Barcode': '4006381333939' }
    ];
    const results = validateBulkImportRows(rows, standardMapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });
    expect(results[0].isValid).toBe(false);
    expect(results[0].errors.some(e => e.includes('invalid EAN-13 check digit'))).toBe(true);
  });

  it('Test 6: Unknown category', () => {
    const rows = [
      { 'SKU': 'SKU-NEW-CAT', 'Item Name': 'Silk Scarf', 'Category': 'Silks & Satins', 'Unit': 'pcs' }
    ];
    
    // When createMissingCategoriesWarehouses = false
    const resultsNoCreate = validateBulkImportRows(rows, standardMapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });
    expect(resultsNoCreate[0].isValid).toBe(false);
    expect(resultsNoCreate[0].errors.some(e => e.includes("Category 'Silks & Satins' does not exist"))).toBe(true);

    // When createMissingCategoriesWarehouses = true
    const resultsWithCreate = validateBulkImportRows(rows, standardMapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: true,
      duplicatePolicy: 'skip'
    });
    expect(resultsWithCreate[0].isValid).toBe(true);
    expect(resultsWithCreate[0].warnings.some(w => w.includes('New Category'))).toBe(true);
  });

  it('Test 7: Formula injection cell', () => {
    const formulaInjections = [
      '=SUM(A1:A10)',
      '+cmd|/c calc!A0',
      '@2+3',
      '-@cmd|calc'
    ];

    for (const injected of formulaInjections) {
      const sanitizedRes = sanitizeCellValue(injected);
      expect(sanitizedRes.hasFormulaInjection).toBe(true);
    }

    const normalNegative = sanitizeCellValue('-50');
    expect(normalNegative.hasFormulaInjection).toBe(false);

    const rows = [
      { 'SKU': 'SKU-INJ', 'Item Name': '=cmd|/c calc', 'Category': 'Fabrics', 'Unit': 'meters' }
    ];
    const results = validateBulkImportRows(rows, standardMapping, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'skip'
    });
    expect(results[0].isValid).toBe(false);
    expect(results[0].errors.some(e => e.includes('contains forbidden formula characters'))).toBe(true);
  });

  it('Test 8: Chunk processing for 2,000 items', async () => {
    const largeDataset = Array.from({ length: 2000 }, (_, i) => ({ id: i }));
    const progressUpdates: number[] = [];
    const finalResults = await processImportInChunks(
      largeDataset,
      100,
      (chunk) => chunk.map(c => c.id * 2),
      (progress) => progressUpdates.push(progress)
    );

    expect(finalResults).toHaveLength(2000);
    expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
  });

  it('Test 9: Sample file with deliberate errors and barcode generation', () => {
    const sampleCsv = generateSampleErrorsCsv();
    const lines = sampleCsv.split('\r\n');
    expect(lines.length).toBeGreaterThanOrEqual(13);
    
    const templateHeaders = generateCsvTemplate().split('\r\n')[0].split(',');
    const sampleHeaders = lines[0].split(',');
    expect(sampleHeaders.length).toBe(templateHeaders.length + 1);
    expect(sampleHeaders[sampleHeaders.length - 1].replace(/^"|"$/g, '')).toBe('Expected Result');

    const allEmptyBarcodes = SAMPLE_ERRORS_RAW_DATA.every(r => r['Barcode'] === '');
    expect(allEmptyBarcodes).toBe(true);

    const mappingWithExtraCol = autoMatchColumns(sampleHeaders.map(h => h.replace(/^"|"$/g, '')));
    expect('Expected Result' in mappingWithExtraCol).toBe(false);
    expect(Object.values(mappingWithExtraCol).includes('Expected Result')).toBe(false);

    const sampleValidation = validateBulkImportRows(SAMPLE_ERRORS_RAW_DATA, mappingWithExtraCol, {
      existingInventory: mockInventory,
      existingCategories: mockCategories,
      existingWarehouses: mockWarehouses,
      createMissingCategoriesWarehouses: false,
      duplicatePolicy: 'reject'
    });

    expect(sampleValidation).toHaveLength(SAMPLE_ERRORS_RAW_DATA.length);

    const allReceivedValidEan = sampleValidation.every(r => {
      const b = r.data.barcode;
      return b && b.length === 13 && /^\d{13}$/.test(b) && validateEan13CheckDigit(b) && !/^(\d)\1{12}$/.test(b);
    });
    expect(allReceivedValidEan).toBe(true);

    const valid1 = sampleValidation.find(r => r.data.sku === 'TEST-VALID-001');
    expect(valid1?.isValid).toBe(true);

    const barcodeRow = sampleValidation.find(r => r.data.sku === 'TEST-BARCODE-002');
    expect(barcodeRow?.isValid).toBe(false);
    expect(barcodeRow?.errors).toContain('Unit of measure is required');

    const lengthRow = sampleValidation.find(r => r.data.sku === 'TEST-LENGTH-003');
    expect(lengthRow?.isValid).toBe(false);
    expect(lengthRow?.errors.some(e => e.includes('Lead Time cannot be negative'))).toBe(true);

    const noBarcodeRow = sampleValidation.find(r => r.data.sku === 'TEST-NOBARCODE-004');
    expect(noBarcodeRow?.isValid).toBe(true);

    const missingRow = sampleValidation.find(r => r.data.sku === 'TEST-MISSING-005');
    expect(missingRow?.isValid).toBe(false);
    expect(missingRow?.errors).toContain('Item Name is required');

    const dupRows = sampleValidation.filter(r => r.data.sku === 'TEST-DUP-006');
    expect(dupRows[0]?.isValid).toBe(true);
    expect(dupRows[1]?.isValid).toBe(false);
    expect(dupRows[1]?.isDuplicateInFile).toBe(true);

    const negRow = sampleValidation.find(r => r.data.sku === 'TEST-NEG-007');
    expect(negRow?.isValid).toBe(false);
    expect(negRow?.errors.some(e => e.includes('Current Stock cannot be negative (-5)'))).toBe(true);

    const textRow = sampleValidation.find(r => r.data.sku === 'TEST-TEXT-008');
    expect(textRow?.isValid).toBe(false);
    expect(textRow?.errors).toContain('Unit Cost must be a valid number');

    const catRow = sampleValidation.find(r => r.data.sku === 'TEST-CAT-009');
    expect(catRow?.isValid).toBe(false);
    expect(catRow?.errors.some(e => e.includes("Category 'Spaceships' does not exist"))).toBe(true);

    const whRow = sampleValidation.find(r => r.data.sku === 'TEST-WH-010');
    expect(whRow?.isValid).toBe(false);
    expect(whRow?.errors.some(e => e.includes("Warehouse 'Nowhere Depot' does not exist"))).toBe(true);

    const formulaRow = sampleValidation.find(r => r.data.sku === 'TEST-FORMULA-011');
    expect(formulaRow?.isValid).toBe(false);
    expect(formulaRow?.errors.some(e => e.includes('contains forbidden formula characters'))).toBe(true);
  });
});

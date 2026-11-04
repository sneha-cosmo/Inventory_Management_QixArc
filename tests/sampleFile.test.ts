import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import {
  generateBlankTemplateCsv,
  generateSampleFile,
  getSampleFileName,
  pickDistinctProducts,
  BLANK_TEMPLATE_HEADERS,
  SAMPLE_PRODUCTS_POOL
} from '../src/features/import/sampleFile';
import {
  autoMatchColumns,
  validateBulkImportRows,
  validateEan13CheckDigit,
  calculateEan13CheckDigit
} from '../src/utils/bulkImport';
import {
  DEFAULT_TAX_SETTINGS,
  TaxSettings,
  STANDARD_GST_RATES,
  UNIT_TO_UQC_MAP
} from '../src/rules/tax';
import { Clock } from '../src/rules/clock';
import { Category, Warehouse, InventoryItem } from '../src/types';

describe('Inventory Sample File & Blank Template (tests/sampleFile.test.ts)', () => {
  const storeCategories: Category[] = [
    { id: 'cat-1', name: 'Fabrics' },
    { id: 'cat-2', name: 'Trims' },
    { id: 'cat-3', name: 'Packaging' },
    { id: 'cat-4', name: 'Thread' },
    { id: 'cat-5', name: 'Finished Goods' },
    { id: 'cat-6', name: 'Accessories' },
    { id: 'cat-7', name: 'Threads' }
  ];

  const storeWarehouses: Warehouse[] = [
    {
      id: 'wh-1',
      name: 'Main Warehouse',
      location: 'Mumbai, Maharashtra',
      gstin: '27AAAAA0000A1Z5',
      legalName: 'InvPredict Manufacturing Central Hub',
      addressLines: ['Plot 12, Industrial Area, Andheri East'],
      stateCode: '27',
      state: 'Maharashtra',
      pin: '400001',
      isIncomplete: false
    },
    {
      id: 'wh-2',
      name: 'Secondary Depot',
      location: 'Pune, Maharashtra',
      gstin: '27AAAAA0000A1Z5',
      legalName: 'InvPredict Regional Logistics Depot',
      addressLines: ['Sector 4, MIDC, Viman Nagar'],
      stateCode: '27',
      state: 'Maharashtra',
      pin: '411014',
      isIncomplete: false
    }
  ];

  describe('1. Fixed 30-Item Product Pool Integrity', () => {
    it('contains exactly 30 realistic products covering fabrics, trims, packaging, thread, finished goods', () => {
      expect(SAMPLE_PRODUCTS_POOL).toHaveLength(30);

      const categories = new Set(SAMPLE_PRODUCTS_POOL.map(p => p.category));
      expect(categories).toContain('Fabrics');
      expect(categories).toContain('Trims');
      expect(categories).toContain('Packaging');
      expect(categories).toContain('Thread');
      expect(categories).toContain('Finished Goods');

      // 6 products per category
      const counts: Record<string, number> = {};
      for (const p of SAMPLE_PRODUCTS_POOL) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
      expect(counts['Fabrics']).toBe(6);
      expect(counts['Trims']).toBe(6);
      expect(counts['Packaging']).toBe(6);
      expect(counts['Thread']).toBe(6);
      expect(counts['Finished Goods']).toBe(6);
    });

    it('guarantees unique SKUs and valid 13-digit EAN-13 barcodes with mathematical check digits', () => {
      const skus = new Set<string>();
      const barcodes = new Set<string>();

      for (const item of SAMPLE_PRODUCTS_POOL) {
        expect(skus.has(item.sku)).toBe(false);
        skus.add(item.sku);

        const checkDigit = calculateEan13CheckDigit(item.barcode12);
        const fullBarcode = `${item.barcode12}${checkDigit}`;
        expect(fullBarcode).toHaveLength(13);
        expect(validateEan13CheckDigit(fullBarcode)).toBe(true);
        expect(barcodes.has(fullBarcode)).toBe(false);
        barcodes.add(fullBarcode);

        // Verify valid GST rate
        expect(STANDARD_GST_RATES).toContain(item.gstRate);

        // Verify statutory UQC mapping
        expect(item.uqc).toBe(UNIT_TO_UQC_MAP[item.unit.toLowerCase()]);

        // Verify base sensible prices and stock
        expect(item.baseCost).toBeLessThan(item.baseSellingPrice);
        expect(item.baseStock).toBeGreaterThan(0);
      }
    });
  });

  describe('2. Predictable Picking with Injected RNG', () => {
    it('produces identical deterministic output when given a fixed RNG', () => {
      // Deterministic PRNG
      let seed = 42;
      const deterministicRng = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      const file1 = generateSampleFile({
        categories: storeCategories,
        warehouses: storeWarehouses,
        rng: deterministicRng
      });

      // Reset same seed
      seed = 42;
      const file2 = generateSampleFile({
        categories: storeCategories,
        warehouses: storeWarehouses,
        rng: deterministicRng
      });

      expect(file1).toBe(file2);
    });

    it('picks between 3 and 8 distinct products', () => {
      for (let i = 0; i < 50; i++) {
        const picked = pickDistinctProducts(SAMPLE_PRODUCTS_POOL, Math.random);
        expect(picked.length).toBeGreaterThanOrEqual(3);
        expect(picked.length).toBeLessThanOrEqual(8);

        // All items picked in a single file must be strictly distinct
        const pickedSkus = new Set(picked.map(p => p.sku));
        expect(pickedSkus.size).toBe(picked.length);
      }
    });
  });

  describe('3. Blank Template Verification', () => {
    it('generates a header-only template that imports 0 rows with no errors', () => {
      const blankCsv = generateBlankTemplateCsv();
      expect(blankCsv).toContain('SKU,Item Name,Barcode');
      expect(blankCsv.trim().split('\r\n')).toHaveLength(1);

      const parsed = Papa.parse<Record<string, string>>(blankCsv, {
        header: true,
        skipEmptyLines: 'greedy'
      });

      expect(parsed.errors).toHaveLength(0);
      expect(parsed.data).toHaveLength(0);

      const mapping = autoMatchColumns(parsed.meta.fields || []);
      const validated = validateBulkImportRows(parsed.data, mapping, {
        existingInventory: [],
        existingCategories: storeCategories,
        existingWarehouses: storeWarehouses,
        createMissingCategoriesWarehouses: false,
        duplicatePolicy: 'skip'
      });

      expect(validated).toHaveLength(0);
    });
  });

  describe('4. 200 Generated Files Import into Empty Store with 0 Errors and 0 Warnings', () => {
    it('runs 200 randomized generated files with 0 errors, 0 warnings, and sensible values', () => {
      const fileCount = 200;
      let totalItemsImported = 0;
      const seenSkusAcrossAllFiles = new Set<string>();

      for (let i = 0; i < fileCount; i++) {
        const sampleCsv = generateSampleFile({
          categories: storeCategories,
          warehouses: storeWarehouses,
          taxSettings: DEFAULT_TAX_SETTINGS
        });

        const parsed = Papa.parse<Record<string, string>>(sampleCsv, {
          header: true,
          skipEmptyLines: 'greedy'
        });

        expect(parsed.errors).toHaveLength(0);
        expect(parsed.data.length).toBeGreaterThanOrEqual(3);
        expect(parsed.data.length).toBeLessThanOrEqual(8);
        totalItemsImported += parsed.data.length;

        const headers = parsed.meta.fields || [];
        const mapping = autoMatchColumns(headers);

        const validated = validateBulkImportRows(parsed.data, mapping, {
          existingInventory: [],
          existingCategories: storeCategories,
          existingWarehouses: storeWarehouses,
          createMissingCategoriesWarehouses: false,
          duplicatePolicy: 'skip',
          taxSettings: DEFAULT_TAX_SETTINGS
        });

        expect(validated).toHaveLength(parsed.data.length);

        const skusInThisFile = new Set<string>();

        for (const row of validated) {
          // Zero errors, zero warnings
          expect(row.isValid).toBe(true);
          expect(row.errors).toEqual([]);
          expect(row.warnings).toEqual([]);

          // No repeated SKU in the same file
          expect(skusInThisFile.has(row.data.sku)).toBe(false);
          skusInThisFile.add(row.data.sku);
          seenSkusAcrossAllFiles.add(row.data.sku);

          // Sensible numbers
          expect(row.data.unitCost).toBeDefined();
          expect(row.data.sellingPrice).toBeDefined();
          expect(row.data.unitCost!).toBeLessThan(row.data.sellingPrice!); // cost < selling price
          expect(row.data.minStock).toBeLessThan(row.data.currentStock); // min threshold < current stock
          expect(row.data.safetyStock).toBeLessThan(row.data.currentStock); // safety stock < current stock
          expect(row.data.safetyStock).toBeLessThanOrEqual(row.data.minStock);

          // Barcode check digit must be mathematically valid
          expect(validateEan13CheckDigit(row.data.barcode)).toBe(true);

          // HSN digits must match threshold (4 digits for default up_to_5_cr)
          expect(row.data.hsnCode).toHaveLength(4);

          // GST rate must be in standard list
          expect(STANDARD_GST_RATES).toContain(row.data.gstRate);

          // Warehouse must match one of storeWarehouses
          expect(storeWarehouses.some(w => w.name === row.data.warehouse)).toBe(true);
        }
      }

      // Across 200 files, we should see items repeating across files
      expect(totalItemsImported).toBeGreaterThan(600);
      expect(seenSkusAcrossAllFiles.size).toBeGreaterThanOrEqual(25);
    });
  });

  describe('5. Shared Products Across Files Without In-File Repeats', () => {
    it('allows two files to share products while never repeating a SKU in one file', () => {
      // Pick 2 files with Math.random
      const file1 = generateSampleFile({ categories: storeCategories, warehouses: storeWarehouses });
      const file2 = generateSampleFile({ categories: storeCategories, warehouses: storeWarehouses });

      const parsed1 = Papa.parse<Record<string, string>>(file1, { header: true, skipEmptyLines: 'greedy' });
      const parsed2 = Papa.parse<Record<string, string>>(file2, { header: true, skipEmptyLines: 'greedy' });

      const skus1 = parsed1.data.map(r => r.SKU);
      const skus2 = parsed2.data.map(r => r.SKU);

      // Unique within file 1
      expect(new Set(skus1).size).toBe(skus1.length);
      // Unique within file 2
      expect(new Set(skus2).size).toBe(skus2.length);
    });
  });

  describe('6. Duplicate SKUs Notice Display in Skip Mode', () => {
    it('shows "Skipped - SKU already exists" as a notice without errors when importing an existing SKU', () => {
      const existingInventory: InventoryItem[] = [
        {
          id: 'item-existing-1',
          name: '100% Combed Cotton Poplin 40s',
          sku: 'FAB-COT-101',
          barcode: '8901001000018',
          categoryId: 'cat-1',
          currentStock: 100,
          minStock: 20,
          dailyConsumption: 5,
          leadTime: 5,
          safetyStock: 10,
          unit: 'meters'
        }
      ];

      const rowToImport = {
        SKU: 'FAB-COT-101',
        'Item Name': '100% Combed Cotton Poplin 40s',
        Barcode: '8901001000018',
        Category: 'Fabrics',
        Unit: 'meters',
        'Current Stock': '150',
        'Minimum Threshold': '30',
        'Lead Time (days)': '5',
        Warehouse: 'Main Warehouse'
      };

      const mapping = autoMatchColumns(Object.keys(rowToImport));

      const validated = validateBulkImportRows([rowToImport], mapping, {
        existingInventory,
        existingCategories: storeCategories,
        existingWarehouses: storeWarehouses,
        createMissingCategoriesWarehouses: false,
        duplicatePolicy: 'skip'
      });

      expect(validated).toHaveLength(1);
      const row = validated[0];
      expect(row.isValid).toBe(true);
      expect(row.errors).toHaveLength(0);
      expect(row.isDuplicateInExisting).toBe(true);
      expect(row.warnings).toContain('Skipped - SKU already exists');
    });
  });

  describe('7. Aggregate Turnover and HSN Length Setting', () => {
    it('slices HSN to 6 digits for turnover > ₹5 Cr and 4 digits for turnover ≤ ₹5 Cr', () => {
      const upTo5Cr: TaxSettings = {
        ...DEFAULT_TAX_SETTINGS,
        turnoverBand: 'up_to_5_cr'
      };
      const above5Cr: TaxSettings = {
        ...DEFAULT_TAX_SETTINGS,
        turnoverBand: 'above_5_cr'
      };

      const csvUpTo5Cr = generateSampleFile({
        categories: storeCategories,
        warehouses: storeWarehouses,
        taxSettings: upTo5Cr,
        pickCount: 4
      });
      const parsed4 = Papa.parse<Record<string, string>>(csvUpTo5Cr, { header: true, skipEmptyLines: 'greedy' });
      for (const row of parsed4.data) {
        expect(row['HSN/SAC'].length).toBe(4);
      }

      const csvAbove5Cr = generateSampleFile({
        categories: storeCategories,
        warehouses: storeWarehouses,
        taxSettings: above5Cr,
        pickCount: 4
      });
      const parsed6 = Papa.parse<Record<string, string>>(csvAbove5Cr, { header: true, skipEmptyLines: 'greedy' });
      for (const row of parsed6.data) {
        expect(row['HSN/SAC'].length).toBe(6);
      }
    });
  });

  describe('8. Filename from Clock', () => {
    it('generates filename format inventory_sample_<date-time from Clock>.csv', () => {
      Clock.setCurrentDate(new Date('2026-11-04T15:45:30'));
      const filename = getSampleFileName(Clock);
      expect(filename).toBe('inventory_sample_2026-11-04_15-45-30.csv');
      Clock.resetClock();
    });
  });
});

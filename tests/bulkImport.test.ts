import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import {
  generateCsvTemplate,
  autoMatchColumns,
  validateBulkImportRows,
  suggestEan13CheckDigit,
  calculateEan13CheckDigit,
  validateEan13CheckDigit
} from '../src/utils/bulkImport';
import {
  DEFAULT_TAX_SETTINGS,
  TaxSettings,
  mapUnitToUqc
} from '../src/rules/tax';
import { Category, Warehouse } from '../src/types';

describe('Inventory Bulk Import Hardening & Compliance (tests/bulkImport.test.ts)', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Fabrics' },
    { id: 'cat-2', name: 'Accessories' }
  ];

  const mockWarehouses: Warehouse[] = [
    {
      id: 'wh-1',
      name: 'Main Warehouse',
      location: 'Bhiwandi, Maharashtra',
      gstin: '27AABCB1234F1Z8',
      legalName: 'InvPredict Logistics India Pvt Ltd',
      addressLines: ['Plot 42, Bhiwandi Logistics Park'],
      stateCode: '27',
      state: 'Maharashtra',
      pin: '421302',
      isIncomplete: false
    },
    {
      id: 'wh-2',
      name: 'Secondary Depot',
      location: 'Pune, Maharashtra',
      gstin: '27AABCB1234F1Z8',
      legalName: 'InvPredict Logistics India Pvt Ltd',
      addressLines: ['Gate 5, Chakan MIDC Phase 2'],
      stateCode: '27',
      state: 'Maharashtra',
      pin: '410501',
      isIncomplete: false
    }
  ];

  // 1. Template Generation and Unchanged Import Verification
  describe('1. Downloadable Template Verification', () => {
    it('generates a CSV template that imports unchanged with 0 errors and 0 warnings', () => {
      const csv = generateCsvTemplate();
      expect(csv).toContain('HSN/SAC');
      expect(csv).toContain('GST Rate (%)');
      expect(csv).toContain('UQC');
      expect(csv).toContain('8901234567890');
      expect(csv).toContain('8909876543210');

      // Must not contain the old invalid barcodes
      expect(csv).not.toContain('8901234567897');
      expect(csv).not.toContain('8909876543217');

      // Parse with PapaParse
      const parseResult = Papa.parse<Record<string, string>>(csv, {
        header: true,
        skipEmptyLines: 'greedy'
      });

      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.data.length).toBe(2);

      const headers = parseResult.meta.fields || [];
      const mapping = autoMatchColumns(headers);

      // Verify column mappings
      expect(mapping.sku).toBe('SKU');
      expect(mapping.name).toBe('Item Name');
      expect(mapping.barcode).toBe('Barcode');
      expect(mapping.hsnCode).toBe('HSN/SAC');
      expect(mapping.gstRate).toBe('GST Rate (%)');
      expect(mapping.uqc).toBe('UQC');

      // Validate against the base categories and warehouses
      const validated = validateBulkImportRows(parseResult.data, mapping, {
        existingInventory: [],
        existingCategories: mockCategories,
        existingWarehouses: mockWarehouses,
        createMissingCategoriesWarehouses: false,
        duplicatePolicy: 'skip',
        taxSettings: DEFAULT_TAX_SETTINGS
      });

      expect(validated).toHaveLength(2);
      expect(validated[0].isValid).toBe(true);
      expect(validated[0].errors).toEqual([]);
      expect(validated[0].warnings).toEqual([]);
      expect(validated[0].data.barcode).toBe('8901234567890');
      expect(validated[0].data.hsnCode).toBe('5208');
      expect(validated[0].data.gstRate).toBe(5);
      expect(validated[0].data.uqc).toBe('MTR');

      expect(validated[1].isValid).toBe(true);
      expect(validated[1].errors).toEqual([]);
      expect(validated[1].warnings).toEqual([]);
      expect(validated[1].data.barcode).toBe('8909876543210');
      expect(validated[1].data.hsnCode).toBe('9606');
      expect(validated[1].data.gstRate).toBe(18);
      expect(validated[1].data.uqc).toBe('PCS');
    });

    it('confirms mathematical EAN-13 check digit 0 for 8901234567890 and 8909876543210', () => {
      expect(calculateEan13CheckDigit('890123456789')).toBe(0);
      expect(validateEan13CheckDigit('8901234567890')).toBe(true);

      expect(calculateEan13CheckDigit('890987654321')).toBe(0);
      expect(validateEan13CheckDigit('8909876543210')).toBe(true);

      // Verify the old barcodes were indeed invalid check digits
      expect(calculateEan13CheckDigit('890123456789')).not.toBe(7);
      expect(calculateEan13CheckDigit('890987654321')).not.toBe(7);
    });
  });

  // 2. HSN/SAC, GST Rate (%), and UQC Mapping
  describe('2. Tax and UQC Statutory Field Validation', () => {
    const baseRow = {
      SKU: 'TEST-ITEM-1',
      'Item Name': 'Test Item Name',
      Category: 'Fabrics',
      Unit: 'meters',
      'Current Stock': '10',
      'Minimum Threshold': '5',
      'Lead Time (days)': '3',
      Warehouse: 'Main Warehouse'
    };

    const mapping = {
      sku: 'SKU',
      name: 'Item Name',
      category: 'Category',
      unit: 'Unit',
      hsnCode: 'HSN/SAC',
      gstRate: 'GST Rate (%)',
      uqc: 'UQC',
      barcode: 'Barcode',
      currentStock: 'Current Stock',
      minStock: 'Minimum Threshold',
      leadTime: 'Lead Time (days)',
      warehouse: 'Warehouse'
    };

    it('enforces 4 digits for turnover ≤ ₹5 Cr and 6 digits for turnover > ₹5 Cr', () => {
      const upTo5CrSettings: TaxSettings = {
        ...DEFAULT_TAX_SETTINGS,
        turnoverBand: 'up_to_5_cr'
      };

      const above5CrSettings: TaxSettings = {
        ...DEFAULT_TAX_SETTINGS,
        turnoverBand: 'above_5_cr'
      };

      // 4-digit HSN under ≤ ₹5 Cr: valid
      const res4Under5Cr = validateBulkImportRows(
        [{ ...baseRow, 'HSN/SAC': '5208' }],
        mapping,
        {
          existingCategories: mockCategories,
          existingWarehouses: mockWarehouses,
          taxSettings: upTo5CrSettings
        }
      );
      expect(res4Under5Cr[0].isValid).toBe(true);
      expect(res4Under5Cr[0].data.hsnCode).toBe('5208');

      // 2-digit HSN under ≤ ₹5 Cr: invalid
      const res2Under5Cr = validateBulkImportRows(
        [{ ...baseRow, 'HSN/SAC': '52' }],
        mapping,
        {
          existingCategories: mockCategories,
          existingWarehouses: mockWarehouses,
          taxSettings: upTo5CrSettings
        }
      );
      expect(res2Under5Cr[0].isValid).toBe(false);
      expect(res2Under5Cr[0].errors[0]).toContain('must have at least 4 digits');

      // 4-digit HSN under > ₹5 Cr: invalid (needs 6 digits)
      const res4Above5Cr = validateBulkImportRows(
        [{ ...baseRow, 'HSN/SAC': '5208' }],
        mapping,
        {
          existingCategories: mockCategories,
          existingWarehouses: mockWarehouses,
          taxSettings: above5CrSettings
        }
      );
      expect(res4Above5Cr[0].isValid).toBe(false);
      expect(res4Above5Cr[0].errors[0]).toContain('must have at least 6 digits');

      // 6-digit HSN under > ₹5 Cr: valid
      const res6Above5Cr = validateBulkImportRows(
        [{ ...baseRow, 'HSN/SAC': '520810' }],
        mapping,
        {
          existingCategories: mockCategories,
          existingWarehouses: mockWarehouses,
          taxSettings: above5CrSettings
        }
      );
      expect(res6Above5Cr[0].isValid).toBe(true);
      expect(res6Above5Cr[0].data.hsnCode).toBe('520810');
    });

    it('validates GST rate numeric values and warns if rate is not in standard list', () => {
      // Standard rate: 18%
      const resStandard = validateBulkImportRows(
        [{ ...baseRow, 'GST Rate (%)': '18' }],
        mapping,
        { existingCategories: mockCategories, existingWarehouses: mockWarehouses }
      );
      expect(resStandard[0].isValid).toBe(true);
      expect(resStandard[0].data.gstRate).toBe(18);
      expect(resStandard[0].warnings.filter(w => w.includes('GST Rate'))).toHaveLength(0);

      // Non-standard rate: 15% (produces warning, not error)
      const resNonStandard = validateBulkImportRows(
        [{ ...baseRow, 'GST Rate (%)': '15' }],
        mapping,
        { existingCategories: mockCategories, existingWarehouses: mockWarehouses }
      );
      expect(resNonStandard[0].isValid).toBe(true);
      expect(resNonStandard[0].data.gstRate).toBe(15);
      expect(resNonStandard[0].warnings.some(w => w.includes('15% is not in standard GST rates'))).toBe(true);

      // Non-numeric rate: invalid (produces error)
      const resInvalid = validateBulkImportRows(
        [{ ...baseRow, 'GST Rate (%)': 'tax-free' }],
        mapping,
        { existingCategories: mockCategories, existingWarehouses: mockWarehouses }
      );
      expect(resInvalid[0].isValid).toBe(false);
      expect(resInvalid[0].errors[0]).toContain('GST Rate (%) must be a valid non-negative number');
    });

    it('maps common units to GST UQC codes (meters -> MTR, pcs -> PCS, kg -> KGS) and warns on unmapped units', () => {
      // meters -> MTR
      expect(mapUnitToUqc('meters').uqc).toBe('MTR');
      expect(mapUnitToUqc('meter').uqc).toBe('MTR');

      // pcs -> PCS
      expect(mapUnitToUqc('pcs').uqc).toBe('PCS');
      expect(mapUnitToUqc('pieces').uqc).toBe('PCS');

      // kg -> KGS
      expect(mapUnitToUqc('kg').uqc).toBe('KGS');
      expect(mapUnitToUqc('kilograms').uqc).toBe('KGS');

      // In validation row without explicit UQC:
      const resAutoUqc = validateBulkImportRows(
        [{ ...baseRow, Unit: 'meters' }],
        mapping,
        { existingCategories: mockCategories, existingWarehouses: mockWarehouses }
      );
      expect(resAutoUqc[0].data.uqc).toBe('MTR');
      expect(resAutoUqc[0].warnings.filter(w => w.includes('UQC'))).toHaveLength(0);

      // Unmapped unit: produces warning
      const resUnknownUnit = validateBulkImportRows(
        [{ ...baseRow, Unit: 'gadget-units' }],
        mapping,
        { existingCategories: mockCategories, existingWarehouses: mockWarehouses }
      );
      expect(resUnknownUnit[0].isValid).toBe(true);
      expect(resUnknownUnit[0].warnings.some(w => w.includes('could not be mapped to standard GST UQC code'))).toBe(true);
    });
  });

  // 3. Incomplete Warehouse Creation
  describe('3. Incomplete Warehouse Auto-Creation and Flagging', () => {
    const rowWithNewWh = {
      SKU: 'FAB-WOOL-01',
      'Item Name': 'Merino Wool Yarn',
      Category: 'Fabrics',
      Unit: 'kg',
      Warehouse: 'Kolkata Regional Warehouse'
    };

    const mapping = {
      sku: 'SKU',
      name: 'Item Name',
      category: 'Category',
      unit: 'Unit',
      warehouse: 'Warehouse'
    };

    it('flags row with review warning when warehouse does not exist and createMissing is enabled', () => {
      const res = validateBulkImportRows(
        [rowWithNewWh],
        mapping,
        {
          existingCategories: mockCategories,
          existingWarehouses: mockWarehouses,
          createMissingCategoriesWarehouses: true
        }
      );

      expect(res[0].isValid).toBe(true);
      expect(res[0].warnings.some(w => 
        w.includes("New Warehouse 'Kolkata Regional Warehouse' will be created as incomplete (no GSTIN, address, state code or PIN)")
      )).toBe(true);
    });

    it('rejects row when warehouse does not exist and createMissing is disabled', () => {
      const res = validateBulkImportRows(
        [rowWithNewWh],
        mapping,
        {
          existingCategories: mockCategories,
          existingWarehouses: mockWarehouses,
          createMissingCategoriesWarehouses: false
        }
      );

      expect(res[0].isValid).toBe(false);
      expect(res[0].errors[0]).toContain("Warehouse 'Kolkata Regional Warehouse' does not exist");
    });
  });

  // 4. Barcode Check Digit and Correction Logic
  describe('4. Barcode Validation, Check Digit Repair, and Non-EAN Formats', () => {
    const baseRow = {
      SKU: 'BTN-001',
      'Item Name': 'Button Pack',
      Category: 'Accessories',
      Unit: 'pcs',
      Warehouse: 'Main Warehouse'
    };

    const mapping = {
      sku: 'SKU',
      name: 'Item Name',
      category: 'Category',
      unit: 'Unit',
      barcode: 'Barcode',
      warehouse: 'Warehouse'
    };

    it('suggests correct EAN-13 check digit and emits error for 13-digit code with wrong check digit', () => {
      // 8901234567897 has wrong check digit (correct is 0)
      const res = validateBulkImportRows(
        [{ ...baseRow, Barcode: '8901234567897' }],
        mapping,
        { existingCategories: mockCategories, existingWarehouses: mockWarehouses }
      );

      expect(res[0].isValid).toBe(false);
      expect(res[0].data.barcodeCheckFailed).toBe(true);
      expect(res[0].data.suggestedBarcode).toBe('8901234567890');
      expect(res[0].errors[0]).toContain("Barcode '8901234567897' has invalid EAN-13 check digit. Suggested: 8901234567890");

      // Test suggestEan13CheckDigit function directly
      expect(suggestEan13CheckDigit('8901234567897')).toBe('8901234567890');
      expect(suggestEan13CheckDigit('8909876543217')).toBe('8909876543210');
    });

    it('treats non-13-digit barcode formats as a Warning rather than an Error', () => {
      // 8-digit EAN-8 or custom internal SKU barcode
      const resNon13 = validateBulkImportRows(
        [{ ...baseRow, Barcode: '12345678' }],
        mapping,
        { existingCategories: mockCategories, existingWarehouses: mockWarehouses }
      );

      expect(resNon13[0].isValid).toBe(true);
      expect(resNon13[0].errors).toHaveLength(0);
      expect(resNon13[0].warnings.some(w => w.includes('is not standard 13-digit EAN-13 (non-EAN format)'))).toBe(true);
    });

    it('rejects barcodes with 13 identical repeated digits', () => {
      const resRepeated = validateBulkImportRows(
        [{ ...baseRow, Barcode: '1111111111111' }],
        mapping,
        { existingCategories: mockCategories, existingWarehouses: mockWarehouses }
      );

      expect(resRepeated[0].isValid).toBe(false);
      expect(resRepeated[0].errors[0]).toContain("cannot consist of repeated digits");
    });
  });
});

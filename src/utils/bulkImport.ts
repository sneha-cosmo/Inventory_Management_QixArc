import { InventoryItem, Category, Warehouse } from '../types';

export interface RawRowData {
  [header: string]: any;
}

export type DuplicatePolicy = 'skip' | 'update' | 'reject';
export type ImportMode = 'valid_only' | 'all_or_nothing';

export interface TargetFieldDef {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number';
  aliases: string[];
}

export const TARGET_FIELDS: TargetFieldDef[] = [
  { key: 'sku', label: 'SKU', required: true, type: 'string', aliases: ['sku', 'itemcode', 'item_code', 'code', 'productcode', 'product_code', 'itemno', 'item_no'] },
  { key: 'name', label: 'Item Name', required: true, type: 'string', aliases: ['name', 'itemname', 'item_name', 'productname', 'product_name', 'item', 'title', 'product'] },
  { key: 'barcode', label: 'Barcode', required: false, type: 'string', aliases: ['barcode', 'ean', 'ean13', 'upc', 'gtin', 'bar_code'] },
  { key: 'description', label: 'Description', required: false, type: 'string', aliases: ['description', 'desc', 'details', 'itemdesc', 'item_desc', 'notes'] },
  { key: 'category', label: 'Category', required: true, type: 'string', aliases: ['category', 'categoryname', 'category_name', 'categoryid', 'category_id', 'group', 'type'] },
  { key: 'unit', label: 'Unit', required: true, type: 'string', aliases: ['unit', 'uom', 'measurement', 'unitofmeasure', 'unit_of_measure', 'units'] },
  { key: 'unitCost', label: 'Unit Cost', required: false, type: 'number', aliases: ['unitcost', 'unit_cost', 'cost', 'costprice', 'cost_price', 'rate', 'purchaseprice', 'purchase_price'] },
  { key: 'sellingPrice', label: 'Selling Price', required: false, type: 'number', aliases: ['sellingprice', 'selling_price', 'price', 'salesprice', 'sales_price', 'mrp', 'rate_sell'] },
  { key: 'currentStock', label: 'Current Stock', required: false, type: 'number', aliases: ['currentstock', 'current_stock', 'stock', 'qty', 'quantity', 'initialstock', 'openingstock', 'balance'] },
  { key: 'minStock', label: 'Minimum Threshold', required: false, type: 'number', aliases: ['minstock', 'min_stock', 'minimumthreshold', 'threshold', 'reorderpoint', 'reorder_level', 'min_qty', 'minthreshold'] },
  { key: 'safetyStock', label: 'Safety Stock', required: false, type: 'number', aliases: ['safetystock', 'safety_stock', 'buffer', 'safetylevel', 'bufferstock', 'buffer_stock'] },
  { key: 'dailyConsumption', label: 'Daily Usage', required: false, type: 'number', aliases: ['dailyconsumption', 'daily_consumption', 'dailyusage', 'daily_usage', 'consumption', 'burn_rate', 'burnrate', 'usage'] },
  { key: 'leadTime', label: 'Lead Time (days)', required: false, type: 'number', aliases: ['leadtime', 'lead_time', 'leadtimedays', 'lead_time_days', 'days', 'delivery_time'] },
  { key: 'warehouse', label: 'Warehouse', required: false, type: 'string', aliases: ['warehouse', 'warehousename', 'warehouse_name', 'location', 'depot', 'site', 'facility'] }
];

export interface ValidatedRow {
  rowNumber: number; // 1-based (file line)
  raw: Record<string, string>;
  data: {
    sku: string;
    name: string;
    barcode: string;
    description?: string;
    category: string;
    unit: string;
    unitCost?: number;
    sellingPrice?: number;
    currentStock: number;
    minStock: number;
    safetyStock: number;
    dailyConsumption: number;
    leadTime: number;
    warehouse?: string;
  };
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicateInFile?: boolean;
  isDuplicateInExisting?: boolean;
}

/**
 * Calculate EAN-13 check digit for the first 12 digits.
 */
export function calculateEan13CheckDigit(twelveDigits: string): number {
  if (!/^\d{12}$/.test(twelveDigits)) {
    throw new Error('Input must be exactly 12 digits');
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelveDigits[i], 10);
    // Odd index in 1-based is even index in 0-based: weight is 1. Even index in 1-based: weight is 3.
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Validates whether a barcode is a valid 13-digit numeric code.
 * Requirements:
 * - Exactly 13 numeric digits (0-9).
 * - EAN-13 check digit is NOT validated.
 * - Barcodes consisting entirely of the same repeated digit (e.g., '1111111111111' or '0000000000000') are rejected.
 * - Non-numeric characters or fewer/more than 13 digits are rejected.
 */
export function validateEan13CheckDigit(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const cleaned = code.trim();
  if (!/^\d{13}$/.test(cleaned)) return false;
  if (/^(\d)\1{12}$/.test(cleaned)) return false;
  return true;
}

export const validateBarcode = validateEan13CheckDigit;

/**
 * Generates a valid random 13-digit EAN barcode with a standard GS1 country prefix (e.g. 890 for India).
 */
export function generateEan13Barcode(prefix: string = '890'): string {
  // Pad or slice prefix to ensure valid base
  let body = prefix.replace(/\D/g, '');
  while (body.length < 12) {
    body += Math.floor(Math.random() * 10).toString();
  }
  body = body.substring(0, 12);
  const checkDigit = calculateEan13CheckDigit(body);
  const barcode = `${body}${checkDigit}`;

  // Ensure barcode contains exactly 13 numeric digits and does not consist entirely of the same repeated digit
  if (/^(\d)\1{12}$/.test(barcode)) {
    return generateEan13Barcode(prefix);
  }

  return barcode;
}

/**
 * Normalize header text for fuzzy matching.
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Auto-match headers to TARGET_FIELDS.
 */
export function autoMatchColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalizeHeader(h) }));

  for (const field of TARGET_FIELDS) {
    const matched = normalizedHeaders.find(nh => {
      if (nh.normalized === normalizeHeader(field.key) || nh.normalized === normalizeHeader(field.label)) {
        return true;
      }
      return field.aliases.some(alias => nh.normalized === normalizeHeader(alias));
    });

    if (matched) {
      mapping[field.key] = matched.original;
    }
  }

  return mapping;
}

/**
 * Formula Injection Defense:
 * Checks if a text value starts with formula characters (=, +, -, @) or excessive length.
 */
export function sanitizeCellValue(val: any): { sanitized: string; hasFormulaInjection: boolean } {
  if (val === null || val === undefined) {
    return { sanitized: '', hasFormulaInjection: false };
  }
  let str = String(val).trim();
  
  // Spreadsheet formula injection check
  const formulaPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  const hasFormulaInjection = formulaPrefixes.some(p => str.startsWith(p));
  
  // If numeric negative number like -5, don't flag as injection if purely numeric
  if (str.startsWith('-') || str.startsWith('+')) {
    const isNum = !isNaN(Number(str)) && str.trim().length > 0;
    if (isNum) {
      return { sanitized: str, hasFormulaInjection: false };
    }
  }

  // Cap string length to 1000 chars
  if (str.length > 1000) {
    str = str.substring(0, 1000);
  }

  return { sanitized: str, hasFormulaInjection };
}

export interface ValidationContext {
  existingInventory: InventoryItem[];
  existingCategories: Category[];
  existingWarehouses: Warehouse[];
  createMissingCategoriesWarehouses: boolean;
  duplicatePolicy: DuplicatePolicy;
}

/**
 * Validate parsed raw rows according to business rules.
 */
export function validateBulkImportRows(
  rawRows: RawRowData[],
  columnMapping: Record<string, string>,
  context: ValidationContext
): ValidatedRow[] {
  const {
    existingInventory,
    existingCategories,
    existingWarehouses,
    createMissingCategoriesWarehouses,
    duplicatePolicy
  } = context;

  const existingSkuMap = new Map<string, InventoryItem>();
  const existingBarcodeMap = new Map<string, InventoryItem>();
  
  for (const item of existingInventory) {
    if (item.sku) existingSkuMap.set(item.sku.trim().toUpperCase(), item);
    if (item.barcode) existingBarcodeMap.set(item.barcode.trim(), item);
  }

  const fileSkus = new Set<string>();
  const fileBarcodes = new Set<string>();

  const categoryNameMap = new Map<string, Category>();
  for (const cat of existingCategories) {
    categoryNameMap.set(cat.name.trim().toLowerCase(), cat);
    categoryNameMap.set(cat.id.trim().toLowerCase(), cat);
  }

  const warehouseNameMap = new Map<string, Warehouse>();
  for (const wh of existingWarehouses) {
    warehouseNameMap.set(wh.name.trim().toLowerCase(), wh);
    warehouseNameMap.set(wh.id.trim().toLowerCase(), wh);
  }

  const results: ValidatedRow[] = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const rawRow = rawRows[idx];
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header row
    const errors: string[] = [];
    const warnings: string[] = [];

    // Helper to get raw value mapped to target field
    const getValue = (fieldKey: string): string => {
      const header = columnMapping[fieldKey];
      if (!header || !(header in rawRow)) return '';
      const rawVal = rawRow[header];
      const { sanitized, hasFormulaInjection } = sanitizeCellValue(rawVal);
      if (hasFormulaInjection) {
        errors.push(`Cell '${header}' contains forbidden formula characters (=, +, -, @)`);
      }
      return sanitized;
    };

    const rawSku = getValue('sku');
    const rawName = getValue('name');
    const rawCategory = getValue('category');
    const rawUnit = getValue('unit');
    const rawBarcode = getValue('barcode');
    const rawDescription = getValue('description');
    const rawWarehouse = getValue('warehouse');

    const rawCurrentStock = getValue('currentStock');
    const rawMinStock = getValue('minStock');
    const rawSafetyStock = getValue('safetyStock');
    const rawDailyConsumption = getValue('dailyConsumption');
    const rawLeadTime = getValue('leadTime');
    const rawUnitCost = getValue('unitCost');
    const rawSellingPrice = getValue('sellingPrice');

    // 1. Required fields
    if (!rawSku) {
      errors.push('SKU is required');
    }
    if (!rawName) {
      errors.push('Item Name is required');
    }
    if (!rawCategory) {
      errors.push('Category is required');
    }
    if (!rawUnit) {
      errors.push('Unit of measure is required');
    }

    // 2. Numbers and Non-negative validation
    const parseNumber = (val: string, fieldName: string, defaultValue = 0): number => {
      if (!val) return defaultValue;
      const num = Number(val);
      if (isNaN(num)) {
        errors.push(`${fieldName} must be a valid number`);
        return defaultValue;
      }
      if (num < 0) {
        errors.push(`${fieldName} cannot be negative (${num})`);
      }
      return num;
    };

    const currentStock = parseNumber(rawCurrentStock, 'Current Stock', 0);
    const minStock = parseNumber(rawMinStock, 'Minimum Threshold', 0);
    const safetyStock = parseNumber(rawSafetyStock, 'Safety Stock', 0);
    const dailyConsumption = parseNumber(rawDailyConsumption, 'Daily Usage', 0);
    const leadTime = parseNumber(rawLeadTime, 'Lead Time', 0);
    const unitCost = rawUnitCost ? parseNumber(rawUnitCost, 'Unit Cost', 0) : undefined;
    const sellingPrice = rawSellingPrice ? parseNumber(rawSellingPrice, 'Selling Price', 0) : undefined;

    // 3. Duplicate checks
    const normalizedSku = rawSku.toUpperCase();
    let isDuplicateInFile = false;
    let isDuplicateInExisting = false;

    if (normalizedSku) {
      if (fileSkus.has(normalizedSku)) {
        isDuplicateInFile = true;
        if (duplicatePolicy === 'reject') {
          errors.push(`Duplicate SKU '${rawSku}' in file`);
        } else if (duplicatePolicy === 'update') {
          warnings.push(`Duplicate SKU '${rawSku}' in file (will overwrite previous entry)`);
        } else {
          warnings.push(`Duplicate SKU '${rawSku}' in file (will be skipped)`);
        }
      } else {
        fileSkus.add(normalizedSku);
      }

      if (existingSkuMap.has(normalizedSku)) {
        isDuplicateInExisting = true;
        if (duplicatePolicy === 'reject') {
          errors.push(`SKU '${rawSku}' already exists in inventory master`);
        } else if (duplicatePolicy === 'update') {
          warnings.push(`SKU '${rawSku}' exists in inventory master (will update existing item)`);
        } else {
          warnings.push(`SKU '${rawSku}' already exists in inventory (will be skipped)`);
        }
      }
    }

    // 4. Barcode validation & generation
    let finalBarcode = rawBarcode;
    if (finalBarcode) {
      // Validate provided barcode
      if (!validateEan13CheckDigit(finalBarcode)) {
        // Check if length is 13 or check digit fails
        if (finalBarcode.length !== 13 || !/^\d+$/.test(finalBarcode)) {
          errors.push(`Barcode '${finalBarcode}' must be 13 digits`);
        } else {
          errors.push(`Barcode '${finalBarcode}' has invalid EAN-13 check digit`);
        }
      } else {
        // Check duplicate barcode
        if (fileBarcodes.has(finalBarcode)) {
          if (duplicatePolicy === 'reject') {
            errors.push(`Duplicate Barcode '${finalBarcode}' in file`);
          } else {
            warnings.push(`Duplicate Barcode '${finalBarcode}' in file`);
          }
        } else {
          fileBarcodes.add(finalBarcode);
        }

        if (existingBarcodeMap.has(finalBarcode) && existingBarcodeMap.get(finalBarcode)?.sku !== rawSku) {
          if (duplicatePolicy === 'reject') {
            errors.push(`Barcode '${finalBarcode}' is already assigned to SKU '${existingBarcodeMap.get(finalBarcode)?.sku}'`);
          } else {
            warnings.push(`Barcode '${finalBarcode}' is already in use by another item`);
          }
        }
      }
    } else {
      // Auto-generate barcode when missing
      let generated = generateEan13Barcode();
      let attempts = 0;
      while ((fileBarcodes.has(generated) || existingBarcodeMap.has(generated)) && attempts < 50) {
        generated = generateEan13Barcode();
        attempts++;
      }
      finalBarcode = generated;
      fileBarcodes.add(finalBarcode);
      warnings.push(`No barcode provided; generated EAN-13: ${finalBarcode}`);
    }

    // 5. Category verification
    if (rawCategory) {
      const match = categoryNameMap.get(rawCategory.toLowerCase());
      if (!match && !createMissingCategoriesWarehouses) {
        errors.push(`Category '${rawCategory}' does not exist (enable 'Create missing' to auto-add)`);
      } else if (!match && createMissingCategoriesWarehouses) {
        warnings.push(`New Category '${rawCategory}' will be created`);
      }
    }

    // 6. Warehouse verification
    if (rawWarehouse) {
      const whMatch = warehouseNameMap.get(rawWarehouse.toLowerCase());
      if (!whMatch && !createMissingCategoriesWarehouses) {
        errors.push(`Warehouse '${rawWarehouse}' does not exist (enable 'Create missing' to auto-add)`);
      } else if (!whMatch && createMissingCategoriesWarehouses) {
        warnings.push(`New Warehouse '${rawWarehouse}' will be created`);
      }
    }

    // Determine validity
    const isValid = errors.length === 0;

    results.push({
      rowNumber,
      raw: rawRow as Record<string, string>,
      data: {
        sku: rawSku,
        name: rawName,
        barcode: finalBarcode,
        description: rawDescription || undefined,
        category: rawCategory,
        unit: rawUnit,
        unitCost,
        sellingPrice,
        currentStock,
        minStock,
        safetyStock,
        dailyConsumption,
        leadTime,
        warehouse: rawWarehouse || undefined
      },
      isValid,
      errors,
      warnings,
      isDuplicateInFile,
      isDuplicateInExisting
    });
  }

  return results;
}

/**
 * Generate CSV template string for bulk import.
 */
export function generateCsvTemplate(): string {
  const headers = [
    'SKU',
    'Item Name',
    'Barcode',
    'Description',
    'Category',
    'Unit',
    'Unit Cost',
    'Selling Price',
    'Current Stock',
    'Minimum Threshold',
    'Safety Stock',
    'Daily Usage',
    'Lead Time (days)',
    'Warehouse'
  ];

  const exampleRows = [
    [
      'FAB-SILK-001',
      'Raw Mulberry Silk',
      '8901234567897',
      'Premium 100% natural mulberry silk fabric roll',
      'Fabrics',
      'meters',
      '450.00',
      '680.00',
      '250',
      '50',
      '30',
      '15',
      '7',
      'Main Warehouse'
    ],
    [
      'BTN-MET-002',
      'Antique Brass Shank Buttons 20mm',
      '8909876543217',
      'Cast brass metal shank buttons for outerwear',
      'Accessories',
      'pcs',
      '6.50',
      '12.00',
      '3500',
      '1000',
      '500',
      '150',
      '10',
      'Secondary Depot'
    ]
  ];

  const csvContent = [
    headers.join(','),
    ...exampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  return csvContent;
}

/**
 * Sample rows demonstrating all error and edge cases for testing and verification.
 * Note: Barcode field is strictly left empty across all rows to exercise the system's
 * automatic barcode-generation logic without hardcoded values.
 */
export const SAMPLE_ERRORS_RAW_DATA: RawRowData[] = [
  {
    'SKU': 'TEST-VALID-001',
    'Item Name': 'Valid Cotton Fabric',
    'Barcode': '',
    'Description': 'Fully valid cotton fabric roll',
    'Category': 'Fabrics',
    'Unit': 'meters',
    'Unit Cost': '100',
    'Selling Price': '150',
    'Current Stock': '50',
    'Minimum Threshold': '10',
    'Safety Stock': '5',
    'Daily Usage': '2',
    'Lead Time (days)': '5',
    'Warehouse': 'Main Warehouse',
    'Expected Result': 'Valid'
  },
  {
    'SKU': 'TEST-BARCODE-002',
    'Item Name': 'Polyester Thread Spool',
    'Barcode': '',
    'Description': 'Sample thread with missing unit',
    'Category': 'Threads',
    'Unit': '',
    'Unit Cost': '20',
    'Selling Price': '35',
    'Current Stock': '100',
    'Minimum Threshold': '20',
    'Safety Stock': '10',
    'Daily Usage': '5',
    'Lead Time (days)': '3',
    'Warehouse': 'Main Warehouse',
    'Expected Result': 'Unit of measure is required'
  },
  {
    'SKU': 'TEST-LENGTH-003',
    'Item Name': 'Brass Metal Zipper',
    'Barcode': '',
    'Description': 'Sample zipper with negative lead time',
    'Category': 'Accessories',
    'Unit': 'pcs',
    'Unit Cost': '15',
    'Selling Price': '25',
    'Current Stock': '200',
    'Minimum Threshold': '50',
    'Safety Stock': '20',
    'Daily Usage': '10',
    'Lead Time (days)': '-3',
    'Warehouse': 'Secondary Depot',
    'Expected Result': 'Lead Time cannot be negative (-3)'
  },
  {
    'SKU': 'TEST-NOBARCODE-004',
    'Item Name': 'Silk Ribbons Assorted',
    'Barcode': '',
    'Description': 'Valid ribbons receiving auto barcode',
    'Category': 'Accessories',
    'Unit': 'rolls',
    'Unit Cost': '45',
    'Selling Price': '70',
    'Current Stock': '80',
    'Minimum Threshold': '15',
    'Safety Stock': '10',
    'Daily Usage': '3',
    'Lead Time (days)': '4',
    'Warehouse': 'Main Warehouse',
    'Expected Result': 'Valid'
  },
  {
    'SKU': 'TEST-MISSING-005',
    'Item Name': '',
    'Barcode': '',
    'Description': 'Item with missing item name',
    'Category': 'Fabrics',
    'Unit': 'meters',
    'Unit Cost': '60',
    'Selling Price': '90',
    'Current Stock': '100',
    'Minimum Threshold': '20',
    'Safety Stock': '10',
    'Daily Usage': '4',
    'Lead Time (days)': '5',
    'Warehouse': 'Main Warehouse',
    'Expected Result': 'Item Name is required'
  },
  {
    'SKU': 'TEST-DUP-006',
    'Item Name': 'Cotton Canvas First Entry',
    'Barcode': '',
    'Description': 'First entry for duplicate check',
    'Category': 'Fabrics',
    'Unit': 'meters',
    'Unit Cost': '80',
    'Selling Price': '120',
    'Current Stock': '60',
    'Minimum Threshold': '15',
    'Safety Stock': '10',
    'Daily Usage': '2',
    'Lead Time (days)': '6',
    'Warehouse': 'Main Warehouse',
    'Expected Result': 'Valid'
  },
  {
    'SKU': 'TEST-DUP-006',
    'Item Name': 'Cotton Canvas Duplicate Entry',
    'Barcode': '',
    'Description': 'Second entry with duplicate SKU in file',
    'Category': 'Fabrics',
    'Unit': 'meters',
    'Unit Cost': '80',
    'Selling Price': '120',
    'Current Stock': '60',
    'Minimum Threshold': '15',
    'Safety Stock': '10',
    'Daily Usage': '2',
    'Lead Time (days)': '6',
    'Warehouse': 'Main Warehouse',
    'Expected Result': "Duplicate SKU 'TEST-DUP-006' in file"
  },
  {
    'SKU': 'TEST-NEG-007',
    'Item Name': 'Linen Fabric Roll',
    'Barcode': '',
    'Description': 'Negative current stock test',
    'Category': 'Fabrics',
    'Unit': 'meters',
    'Unit Cost': '120',
    'Selling Price': '180',
    'Current Stock': '-5',
    'Minimum Threshold': '10',
    'Safety Stock': '5',
    'Daily Usage': '1',
    'Lead Time (days)': '7',
    'Warehouse': 'Secondary Depot',
    'Expected Result': 'Current Stock cannot be negative (-5)'
  },
  {
    'SKU': 'TEST-TEXT-008',
    'Item Name': 'Elastic Band 1 inch',
    'Barcode': '',
    'Description': 'Non-numeric unit cost test',
    'Category': 'Accessories',
    'Unit': 'meters',
    'Unit Cost': 'abc',
    'Selling Price': '25',
    'Current Stock': '150',
    'Minimum Threshold': '30',
    'Safety Stock': '20',
    'Daily Usage': '5',
    'Lead Time (days)': '4',
    'Warehouse': 'Main Warehouse',
    'Expected Result': 'Unit Cost must be a valid number'
  },
  {
    'SKU': 'TEST-CAT-009',
    'Item Name': 'Titanium Alloy Weave',
    'Barcode': '',
    'Description': 'Unknown category test',
    'Category': 'Spaceships',
    'Unit': 'rolls',
    'Unit Cost': '500',
    'Selling Price': '800',
    'Current Stock': '10',
    'Minimum Threshold': '2',
    'Safety Stock': '1',
    'Daily Usage': '1',
    'Lead Time (days)': '14',
    'Warehouse': 'Main Warehouse',
    'Expected Result': "Category 'Spaceships' does not exist (enable 'Create missing' to auto-add)"
  },
  {
    'SKU': 'TEST-WH-010',
    'Item Name': 'Rayon Viscose Blend',
    'Barcode': '',
    'Description': 'Unknown warehouse test',
    'Category': 'Fabrics',
    'Unit': 'meters',
    'Unit Cost': '75',
    'Selling Price': '110',
    'Current Stock': '40',
    'Minimum Threshold': '10',
    'Safety Stock': '5',
    'Daily Usage': '2',
    'Lead Time (days)': '5',
    'Warehouse': 'Nowhere Depot',
    'Expected Result': "Warehouse 'Nowhere Depot' does not exist (enable 'Create missing' to auto-add)"
  },
  {
    'SKU': 'TEST-FORMULA-011',
    'Item Name': '=1+1',
    'Barcode': '',
    'Description': 'Formula injection test',
    'Category': 'Fabrics',
    'Unit': 'meters',
    'Unit Cost': '50',
    'Selling Price': '80',
    'Current Stock': '20',
    'Minimum Threshold': '5',
    'Safety Stock': '2',
    'Daily Usage': '1',
    'Lead Time (days)': '3',
    'Warehouse': 'Main Warehouse',
    'Expected Result': "Cell 'Item Name' contains forbidden formula characters (=, +, -, @)"
  }
];

/**
 * Generate sample CSV string with deliberate errors and an Expected Result column.
 */
export function generateSampleErrorsCsv(): string {
  const headers = [
    'SKU',
    'Item Name',
    'Barcode',
    'Description',
    'Category',
    'Unit',
    'Unit Cost',
    'Selling Price',
    'Current Stock',
    'Minimum Threshold',
    'Safety Stock',
    'Daily Usage',
    'Lead Time (days)',
    'Warehouse',
    'Expected Result'
  ];

  const lines = [
    headers.join(','),
    ...SAMPLE_ERRORS_RAW_DATA.map(row => 
      headers.map(h => {
        const val = row[h] !== undefined ? String(row[h]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];

  return lines.join('\r\n');
}

/**
 * Generate CSV containing rows with errors.
 */
export function generateErrorsCsv(rows: ValidatedRow[]): string {
  const errorRows = rows.filter(r => !r.isValid);
  if (errorRows.length === 0) return '';

  const headers = [
    'Row Number',
    'Error Details',
    'SKU',
    'Item Name',
    'Barcode',
    'Description',
    'Category',
    'Unit',
    'Unit Cost',
    'Selling Price',
    'Current Stock',
    'Minimum Threshold',
    'Safety Stock',
    'Daily Usage',
    'Lead Time (days)',
    'Warehouse'
  ];

  const lines = [
    headers.join(','),
    ...errorRows.map(r => {
      const cols = [
        r.rowNumber.toString(),
        r.errors.join('; '),
        r.data.sku || '',
        r.data.name || '',
        r.data.barcode || '',
        r.data.description || '',
        r.data.category || '',
        r.data.unit || '',
        r.data.unitCost?.toString() || '',
        r.data.sellingPrice?.toString() || '',
        r.data.currentStock.toString(),
        r.data.minStock.toString(),
        r.data.safetyStock.toString(),
        r.data.dailyConsumption.toString(),
        r.data.leadTime.toString(),
        r.data.warehouse || ''
      ];
      return cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
    })
  ];

  return lines.join('\r\n');
}

/**
 * Chunked import executor so the browser remains responsive for large uploads (up to 5,000 rows).
 */
export async function processImportInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processChunk: (chunk: T[], offset: number) => Promise<R[]> | R[],
  onProgress: (progressPercent: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const total = items.length;
  if (total === 0) return results;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await processChunk(chunk, i);
    results.push(...chunkResults);
    
    const progress = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
    onProgress(progress);

    // Yield back to event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}

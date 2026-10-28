import { Batch, InventoryItem, Warehouse } from '../types';
import { sanitizeCellValue } from './bulkImport';

export type BatchDuplicatePolicy = 'skip' | 'add_quantity' | 'reject';
export type BatchImportMode = 'valid_only' | 'all_or_nothing';
export type ExpiryStatus = 'Expired' | 'Critical' | 'Near Expiry' | 'Healthy';

export interface BatchTargetFieldDef {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number';
  aliases: string[];
}

export const BATCH_TARGET_FIELDS: BatchTargetFieldDef[] = [
  { key: 'batchNumber', label: 'Batch Number', required: true, type: 'string', aliases: ['batchnumber', 'batch_number', 'batch', 'lot', 'lotnumber', 'lot_number', 'lot_no', 'batch_no', 'batchno', 'lotno'] },
  { key: 'sku', label: 'SKU', required: true, type: 'string', aliases: ['sku', 'itemcode', 'item_code', 'productcode', 'product_code', 'code', 'itemno'] },
  { key: 'warehouse', label: 'Warehouse', required: true, type: 'string', aliases: ['warehouse', 'warehousename', 'warehouse_name', 'location', 'depot', 'site', 'facility'] },
  { key: 'quantity', label: 'Quantity', required: true, type: 'number', aliases: ['quantity', 'qty', 'stock', 'units', 'count', 'batch_qty', 'batchquantity'] },
  { key: 'manufactureDate', label: 'Manufacturing Date', required: false, type: 'string', aliases: ['manufacturedate', 'manufacture_date', 'mfgdate', 'mfg_date', 'mfg', 'mfg_dt', 'productiondate', 'prod_date'] },
  { key: 'expiryDate', label: 'Expiry Date', required: true, type: 'string', aliases: ['expirydate', 'expiry_date', 'expdate', 'exp_date', 'exp', 'expiration', 'expirationdate', 'expiry'] },
  { key: 'batchId', label: 'Batch ID', required: false, type: 'string', aliases: ['batchid', 'batch_id', 'id', 'system_id'] }
];

/**
 * Standard reference date matching existing application state context (2026-05-26).
 */
export const APP_REFERENCE_DATE = new Date('2026-05-26');

/**
 * Expiry status calculator using the exact existing application business rules.
 */
export function calculateExpiryStatus(expiryDateStr: string, referenceDate: Date = APP_REFERENCE_DATE): {
  diffDays: number;
  status: ExpiryStatus;
  statusLabel: string;
  label: string;
  badgeClass: string;
} {
  const expiryTime = new Date(expiryDateStr).getTime();
  const refTime = referenceDate.getTime();
  
  if (isNaN(expiryTime)) {
    return {
      diffDays: 0,
      status: 'Expired',
      statusLabel: 'Invalid Date',
      label: 'Invalid Date',
      badgeClass: 'bg-red-100 text-red-700 border-red-300'
    };
  }

  const diffTime = expiryTime - refTime;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    const statusLabel = `Expired (${Math.abs(diffDays)}d ago)`;
    return {
      diffDays,
      status: 'Expired',
      statusLabel,
      label: statusLabel,
      badgeClass: 'bg-red-100 text-red-700 border-red-300 font-bold'
    };
  } else if (diffDays <= 7) {
    const statusLabel = `Critical (${diffDays}d left)`;
    return {
      diffDays,
      status: 'Critical',
      statusLabel,
      label: statusLabel,
      badgeClass: 'bg-red-50 text-red-600 border-red-200 font-bold'
    };
  } else if (diffDays <= 30) {
    const statusLabel = `Near Expiry (${diffDays}d left)`;
    return {
      diffDays,
      status: 'Near Expiry',
      statusLabel,
      label: statusLabel,
      badgeClass: 'bg-orange-50 text-orange-600 border-orange-200 font-medium'
    };
  } else {
    const statusLabel = `Healthy (${diffDays}d left)`;
    return {
      diffDays,
      status: 'Healthy',
      statusLabel,
      label: statusLabel,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
    };
  }
}

/**
 * Flexible date parser for YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY (Indian format) and Excel date serials.
 * Never guesses MM/DD.
 */
export function parseFlexibleDate(val: any): {
  dateString: string | null;
  formattedDisplay: string;
  error?: string;
} {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { dateString: null, formattedDisplay: '', error: 'Date is empty' };
  }

  const trimmed = String(val).trim();

  // 1. Check if numeric Excel serial number (e.g. 46083)
  if (/^\d{4,6}(\.\d+)?$/.test(trimmed)) {
    const serial = parseFloat(trimmed);
    // Excel bug: 1900 leap year offset
    const utcDays = serial - 25569;
    const dateObj = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      const isoStr = `${year}-${month}-${day}`;
      return { dateString: isoStr, formattedDisplay: isoStr };
    }
  }

  // 2. ISO format YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { dateString: null, formattedDisplay: trimmed, error: `Invalid calendar date: ${trimmed}` };
    }
    const isoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { dateString: isoStr, formattedDisplay: isoStr };
  }

  // 3. Indian format DD/MM/YYYY or DD-MM-YYYY
  const indianMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (indianMatch) {
    const day = parseInt(indianMatch[1], 10);
    const month = parseInt(indianMatch[2], 10);
    const year = parseInt(indianMatch[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { dateString: null, formattedDisplay: trimmed, error: `Invalid day/month in date: ${trimmed}` };
    }

    // Check specific days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      return { dateString: null, formattedDisplay: trimmed, error: `Invalid day (${day}) for month ${month} in year ${year}` };
    }

    const isoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { dateString: isoStr, formattedDisplay: `${isoStr} (${day}/${month}/${year})` };
  }

  return { dateString: null, formattedDisplay: trimmed, error: `Unrecognized or ambiguous date format: '${trimmed}'. Accepted: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY` };
}

export interface ValidatedBatchRow {
  rowNumber: number; // 1-based (file line)
  raw: Record<string, string>;
  data: {
    batchNumber: string;
    sku: string;
    itemId?: string;
    itemName?: string;
    itemUnit?: string;
    warehouse: string;
    warehouseId?: string;
    quantity: number;
    manufactureDate?: string;
    expiryDate: string;
    batchId?: string;
  };
  parsedDates: {
    mfgDisplay: string;
    expDisplay: string;
  };
  expiryMeta: {
    status: ExpiryStatus;
    diffDays: number;
    badgeClass: string;
    label: string;
  };
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicateInFile?: boolean;
  isDuplicateInExisting?: boolean;
  existingBatch?: Batch;
}

export interface BatchValidationContext {
  existingInventory: InventoryItem[];
  existingBatches: Batch[];
  existingWarehouses: Warehouse[];
  createMissingWarehouses: boolean;
  duplicatePolicy: BatchDuplicatePolicy;
  referenceDate?: Date;
}

export interface SkuReconciliationRow {
  sku: string;
  itemName: string;
  unit: string;
  currentItemStock: number;
  existingBatchQuantity: number;
  importedBatchQuantity: number;
  resultingBatchQuantity: number;
  resultingItemStock: number;
  hasDiscrepancy: boolean;
  discrepancyAmount: number;
}

/**
 * Validate parsed raw batch rows according to all business rules.
 */
export function validateBulkImportBatches(
  rawRows: Record<string, any>[],
  columnMapping: Record<string, string>,
  context: BatchValidationContext
): {
  rows: ValidatedBatchRow[];
  reconciliation: SkuReconciliationRow[];
  summary: {
    validCount: number;
    warningCount: number;
    errorCount: number;
    expiredCount: number;
    criticalCount: number;
    nearExpiryCount: number;
    healthyCount: number;
    totalImportQuantity: number;
  };
} {
  const {
    existingInventory,
    existingBatches,
    existingWarehouses,
    createMissingWarehouses,
    duplicatePolicy,
    referenceDate = APP_REFERENCE_DATE
  } = context;

  // SKU lookup map
  const skuToItemMap = new Map<string, InventoryItem>();
  for (const item of existingInventory) {
    if (item.sku) {
      skuToItemMap.set(item.sku.trim().toUpperCase(), item);
    }
  }

  // Warehouse lookup map
  const warehouseMap = new Map<string, Warehouse>();
  for (const wh of existingWarehouses) {
    warehouseMap.set(wh.name.trim().toLowerCase(), wh);
    warehouseMap.set(wh.id.trim().toLowerCase(), wh);
  }

  // Existing batches composite map: batchNumber__sku__warehouseId
  const existingCompositeMap = new Map<string, Batch>();
  for (const b of existingBatches) {
    const parentItem = existingInventory.find(i => i.id === b.itemId);
    const skuKey = parentItem?.sku ? parentItem.sku.trim().toUpperCase() : '';
    const compositeKey = `${b.batchNumber.trim().toUpperCase()}__${skuKey}__${b.warehouseId.toLowerCase()}`;
    existingCompositeMap.set(compositeKey, b);
  }

  const fileCompositeSet = new Set<string>();
  const validatedRows: ValidatedBatchRow[] = [];

  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let expiredCount = 0;
  let criticalCount = 0;
  let nearExpiryCount = 0;
  let healthyCount = 0;
  let totalImportQuantity = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const rawRow = rawRows[idx];
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header
    const errors: string[] = [];
    const warnings: string[] = [];

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

    const rawBatchNumber = getValue('batchNumber');
    const rawSku = getValue('sku');
    const rawWarehouse = getValue('warehouse');
    const rawQuantity = getValue('quantity');
    const rawMfgDate = getValue('manufactureDate');
    const rawExpDate = getValue('expiryDate');
    const rawBatchId = getValue('batchId');

    // 1. Required field checks
    if (!rawBatchNumber) errors.push('Batch Number is required');
    if (!rawSku) errors.push('SKU is required');
    if (!rawWarehouse) errors.push('Warehouse is required');
    if (!rawExpDate) errors.push('Expiry Date is required');

    // 2. Parent SKU match check
    let matchedItem: InventoryItem | undefined;
    if (rawSku) {
      matchedItem = skuToItemMap.get(rawSku.trim().toUpperCase());
      if (!matchedItem) {
        errors.push(`SKU '${rawSku}' not found in inventory master (import this item first)`);
      }
    }

    // 3. Warehouse verification
    let resolvedWarehouseId: string | undefined;
    if (rawWarehouse) {
      const whMatch = warehouseMap.get(rawWarehouse.trim().toLowerCase());
      if (whMatch) {
        resolvedWarehouseId = whMatch.id;
      } else if (createMissingWarehouses) {
        resolvedWarehouseId = `wh-${rawWarehouse.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        warnings.push(`New Warehouse '${rawWarehouse}' will be created`);
      } else {
        errors.push(`Warehouse '${rawWarehouse}' does not exist (enable 'Create missing' to auto-add)`);
      }
    }

    // 4. Quantity validation (> 0)
    let quantity = 0;
    if (!rawQuantity) {
      errors.push('Quantity is required');
    } else {
      const num = Number(rawQuantity);
      if (isNaN(num)) {
        errors.push(`Quantity must be a valid number, got '${rawQuantity}'`);
      } else if (num <= 0) {
        errors.push(`Quantity must be greater than 0, got ${num}`);
      } else {
        quantity = num;
      }
    }

    // 5. Date parsing & validation
    let parsedMfg: { dateString: string | null; formattedDisplay: string; error?: string } = {
      dateString: null,
      formattedDisplay: ''
    };
    if (rawMfgDate) {
      parsedMfg = parseFlexibleDate(rawMfgDate);
      if (parsedMfg.error) {
        errors.push(`Mfg Date error: ${parsedMfg.error}`);
      }
    }

    const parsedExp = parseFlexibleDate(rawExpDate);
    if (parsedExp.error) {
      errors.push(`Expiry Date error: ${parsedExp.error}`);
    }

    // Chronological order: Expiry must be after Manufacturing date
    if (parsedMfg.dateString && parsedExp.dateString) {
      const mfgTime = new Date(parsedMfg.dateString).getTime();
      const expTime = new Date(parsedExp.dateString).getTime();
      if (expTime <= mfgTime) {
        errors.push(`Expiry date (${parsedExp.dateString}) must be after manufacturing date (${parsedMfg.dateString})`);
      }
    }

    // Expiry status calculation & past expiry warning
    let expiryMeta = {
      status: 'Healthy' as ExpiryStatus,
      diffDays: 999,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Healthy'
    };

    if (parsedExp.dateString) {
      expiryMeta = calculateExpiryStatus(parsedExp.dateString, referenceDate);
      if (expiryMeta.status === 'Expired') {
        warnings.push(`Expiry date is in the past (${parsedExp.dateString}) - flagged as Expired`);
      }
    }

    // 6. Duplicate detection (Batch Number + SKU + Warehouse)
    let isDuplicateInFile = false;
    let isDuplicateInExisting = false;
    let existingBatchMatch: Batch | undefined;

    if (rawBatchNumber && rawSku && (resolvedWarehouseId || rawWarehouse)) {
      const compositeKey = `${rawBatchNumber.trim().toUpperCase()}__${rawSku.trim().toUpperCase()}__${(resolvedWarehouseId || rawWarehouse).toLowerCase()}`;

      if (fileCompositeSet.has(compositeKey)) {
        isDuplicateInFile = true;
        if (duplicatePolicy === 'reject') {
          errors.push(`Duplicate batch '${rawBatchNumber}' for SKU '${rawSku}' in this file`);
        } else if (duplicatePolicy === 'add_quantity') {
          warnings.push(`Repeated in file (quantities will be combined under Add Quantity policy)`);
        } else {
          warnings.push(`Repeated in file (will be skipped under Skip policy)`);
        }
      } else {
        fileCompositeSet.add(compositeKey);
      }

      existingBatchMatch = existingCompositeMap.get(compositeKey);
      if (existingBatchMatch) {
        isDuplicateInExisting = true;
        if (duplicatePolicy === 'reject') {
          errors.push(`Batch '${rawBatchNumber}' for SKU '${rawSku}' already exists in warehouse`);
        } else if (duplicatePolicy === 'add_quantity') {
          warnings.push(`Batch exists (existing qty ${existingBatchMatch.quantity} will be increased by ${quantity})`);
        } else {
          warnings.push(`Batch '${rawBatchNumber}' already exists (will be skipped)`);
        }
      }
    }

    const isValid = errors.length === 0;

    if (isValid) {
      validCount++;
      totalImportQuantity += quantity;
      if (expiryMeta.status === 'Expired') expiredCount++;
      else if (expiryMeta.status === 'Critical') criticalCount++;
      else if (expiryMeta.status === 'Near Expiry') nearExpiryCount++;
      else healthyCount++;
      
      if (warnings.length > 0) warningCount++;
    } else {
      errorCount++;
    }

    validatedRows.push({
      rowNumber,
      raw: rawRow as Record<string, string>,
      data: {
        batchNumber: rawBatchNumber,
        sku: rawSku,
        itemId: matchedItem?.id,
        itemName: matchedItem?.name,
        itemUnit: matchedItem?.unit,
        warehouse: rawWarehouse,
        warehouseId: resolvedWarehouseId,
        quantity,
        manufactureDate: parsedMfg.dateString || undefined,
        expiryDate: parsedExp.dateString || rawExpDate,
        batchId: rawBatchId || undefined
      },
      parsedDates: {
        mfgDisplay: parsedMfg.formattedDisplay,
        expDisplay: parsedExp.formattedDisplay
      },
      expiryMeta,
      isValid,
      errors,
      warnings,
      isDuplicateInFile,
      isDuplicateInExisting,
      existingBatch: existingBatchMatch
    });
  }

  // Calculate per-SKU reconciliation
  const reconciliationMap = new Map<string, {
    sku: string;
    itemName: string;
    unit: string;
    currentItemStock: number;
    existingBatchQty: number;
    importedBatchQty: number;
  }>();

  // Populate from existing items that appear in validated rows
  for (const r of validatedRows) {
    if (!r.data.sku || !r.data.itemId) continue;
    const normSku = r.data.sku.toUpperCase();
    if (!reconciliationMap.has(normSku)) {
      const item = existingInventory.find(i => i.id === r.data.itemId);
      const existingBatchesTotal = existingBatches
        .filter(b => b.itemId === r.data.itemId && !b.recalled)
        .reduce((sum, b) => sum + b.quantity, 0);

      reconciliationMap.set(normSku, {
        sku: normSku,
        itemName: item?.name || r.data.itemName || normSku,
        unit: item?.unit || r.data.itemUnit || 'units',
        currentItemStock: item?.currentStock || 0,
        existingBatchQty: existingBatchesTotal,
        importedBatchQty: 0
      });
    }

    if (r.isValid) {
      const rec = reconciliationMap.get(normSku)!;
      rec.importedBatchQty += r.data.quantity;
    }
  }

  const reconciliation: SkuReconciliationRow[] = Array.from(reconciliationMap.values()).map(rec => {
    const resultingBatchQuantity = rec.existingBatchQty + rec.importedBatchQty;
    // Step 0 rule: Item stock is the sum of its batches, so importing batches increases item stock
    const resultingItemStock = rec.currentItemStock + rec.importedBatchQty;
    const hasDiscrepancy = resultingItemStock !== resultingBatchQuantity;
    const discrepancyAmount = resultingBatchQuantity - resultingItemStock;

    return {
      sku: rec.sku,
      itemName: rec.itemName,
      unit: rec.unit,
      currentItemStock: rec.currentItemStock,
      existingBatchQuantity: rec.existingBatchQty,
      importedBatchQuantity: rec.importedBatchQty,
      resultingBatchQuantity,
      resultingItemStock,
      hasDiscrepancy,
      discrepancyAmount
    };
  });

  return {
    rows: validatedRows,
    reconciliation,
    summary: {
      validCount,
      warningCount,
      errorCount,
      expiredCount,
      criticalCount,
      nearExpiryCount,
      healthyCount,
      totalImportQuantity
    }
  };
}

/**
 * Generate standard CSV template for Batch Import.
 */
export function generateBatchCsvTemplate(): string {
  const headers = [
    'Batch Number',
    'SKU',
    'Warehouse',
    'Quantity',
    'Manufacturing Date',
    'Expiry Date',
    'Batch ID'
  ];

  const exampleRows = [
    [
      'BAT-COT-26D',
      'FAB-COT-001',
      'Main Warehouse',
      '300',
      '2026-01-15',
      '2027-01-14',
      ''
    ],
    [
      'BAT-THR-26C',
      'THR-POL-001',
      'Secondary Depot',
      '120',
      '15/02/2026',
      '14/02/2027',
      ''
    ]
  ];

  const csvContent = [
    headers.join(','),
    ...exampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  return csvContent;
}

/**
 * Generate CSV containing batch rows with validation errors.
 */
export function generateBatchErrorsCsv(rows: ValidatedBatchRow[]): string {
  const errorRows = rows.filter(r => !r.isValid);
  if (errorRows.length === 0) return '';

  const headers = [
    'Row Number',
    'Error Details',
    'Batch Number',
    'SKU',
    'Warehouse',
    'Quantity',
    'Manufacturing Date',
    'Expiry Date',
    'Batch ID'
  ];

  const lines = [
    headers.join(','),
    ...errorRows.map(r => {
      const cols = [
        r.rowNumber.toString(),
        r.errors.join('; '),
        r.data.batchNumber || '',
        r.data.sku || '',
        r.data.warehouse || '',
        r.data.quantity.toString(),
        r.data.manufactureDate || '',
        r.data.expiryDate || '',
        r.data.batchId || ''
      ];
      return cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
    })
  ];

  return lines.join('\r\n');
}

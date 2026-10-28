import React, { useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  Edit3, 
  ShieldAlert, 
  Check, 
  Layers, 
  Barcode as BarcodeIcon, 
  HelpCircle,
  FileText,
  Trash2,
  Lock,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

import { 
  TARGET_FIELDS, 
  RawRowData, 
  ValidatedRow, 
  DuplicatePolicy, 
  ImportMode, 
  autoMatchColumns, 
  validateBulkImportRows, 
  generateCsvTemplate, 
  generateSampleErrorsCsv,
  generateErrorsCsv,
  processImportInChunks
} from '../utils/bulkImport';
import { InventoryItem, Category, Warehouse, Staff } from '../types';
import { Language, LOCALES, tText } from '../locales';

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
  categories: Category[];
  warehouses: Warehouse[];
  currentUser: Staff;
  language?: Language;
  developerToolsEnabled?: boolean;
  onImportComplete: (payload: {
    itemsToCreate: InventoryItem[];
    itemsToUpdate: InventoryItem[];
    newCategories: string[];
    newWarehouses: string[];
    openingStockMap: Record<string, { warehouseId: string; quantity: number }>;
    duplicatePolicy: DuplicatePolicy;
    fileName: string;
    counts: {
      created: number;
      updated: number;
      skipped: number;
      failed: number;
    };
  }) => void;
}

export default function BulkImportModal({
  open,
  onOpenChange,
  inventory,
  categories,
  warehouses,
  currentUser,
  language = 'en',
  developerToolsEnabled = false,
  onImportComplete
}: BulkImportModalProps) {
  const t = LOCALES[language];
  
  // Re-verify clearance
  const isAuthorized = currentUser.role === 'admin' || currentUser.role === 'inventory_manager';

  // Modal Step: 1 (Upload), 2 (Map), 3 (Review), 4 (Done)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Upload state
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRowData[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Mapping state
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Step 3: Review state
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>('skip');
  const [importMode, setImportMode] = useState<ImportMode>('valid_only');
  const [createMissing, setCreateMissing] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'warnings' | 'errors'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  
  // Inline edit state
  const [editingRow, setEditingRow] = useState<ValidatedRow | null>(null);

  // Step 4: Import execution state
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    totalStockAdded: number;
  } | null>(null);

  // Reset modal state
  const handleReset = () => {
    setCurrentStep(1);
    setFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setUploadError(null);
    setColumnMapping({});
    setDuplicatePolicy('skip');
    setImportMode('valid_only');
    setCreateMissing(true);
    setActiveFilter('all');
    setSearchFilter('');
    setEditingRow(null);
    setImportProgress(0);
    setIsImporting(false);
    setSummary(null);
  };

  const handleClose = () => {
    if (isImporting) return; // Prevent closing while processing
    onOpenChange(false);
    setTimeout(handleReset, 300);
  };

  // Step 1: Parse file
  const handleFileSelected = (selectedFile: File) => {
    setUploadError(null);

    // Limit checks: 5 MB max
    const MAX_SIZE = 5 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setUploadError(
        language === 'ta'
          ? "கோப்பு அளவு 5 MB ஐ விட அதிகமாக உள்ளது. தயவுசெய்து சிறிய கோப்பைத் தேர்ந்தெடுக்கவும்."
          : `File size exceeds 5 MB limit (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB). Please upload a smaller file.`
      );
      return;
    }

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setUploadError(
        language === 'ta' 
          ? "ஆதரிக்கப்படாத கோப்பு வடிவம். .csv, .xlsx, அல்லது .xls கோப்புகளை மட்டுமே பதிவேற்றவும்."
          : "Unsupported file format. Please upload a .csv, .xlsx, or .xls file."
      );
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    if (ext === 'csv') {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          setIsParsing(false);
          const fields = results.meta.fields || [];
          const data = (results.data as RawRowData[]).filter(r => Object.values(r).some(v => v !== null && v !== ''));

          if (data.length > 5000) {
            setUploadError(
              language === 'ta'
                ? `கோப்பு 5,000 வரிகளை விட அதிகமாக உள்ளது (${data.length.toLocaleString()} வரிகள்). தயவுசெய்து 5,000 வரிகளுக்குள் உள்ள கோப்பை பதிவேற்றவும்.`
                : `File exceeds maximum 5,000 rows limit (${data.length.toLocaleString()} rows). Please trim your file.`
            );
            return;
          }

          if (data.length === 0) {
            setUploadError(
              language === 'ta' ? "கோப்பில் தரவு வரிகள் எதுவும் இல்லை." : "The uploaded file does not contain any data rows."
            );
            return;
          }

          setRawHeaders(fields);
          setRawRows(data);
          const initialMapping = autoMatchColumns(fields);
          setColumnMapping(initialMapping);
          setCurrentStep(2);
        },
        error: (err) => {
          setIsParsing(false);
          setUploadError(`Failed to parse CSV: ${err.message}`);
        }
      });
    } else {
      // Excel parse (.xlsx, .xls)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<RawRowData>(worksheet, { defval: '' });

          setIsParsing(false);
          if (jsonData.length > 5000) {
            setUploadError(
              language === 'ta'
                ? `கோப்பு 5,000 வரிகளை விட அதிகமாக உள்ளது (${jsonData.length.toLocaleString()} வரிகள்).`
                : `File exceeds maximum 5,000 rows limit (${jsonData.length.toLocaleString()} rows).`
            );
            return;
          }

          if (jsonData.length === 0) {
            setUploadError(language === 'ta' ? "கோப்பில் தரவு எதுவும் இல்லை." : "The worksheet contains no data rows.");
            return;
          }

          const headers = Object.keys(jsonData[0] || {});
          setRawHeaders(headers);
          setRawRows(jsonData);
          const initialMapping = autoMatchColumns(headers);
          setColumnMapping(initialMapping);
          setCurrentStep(2);
        } catch (err: any) {
          setIsParsing(false);
          setUploadError(`Failed to parse Excel file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const csv = generateCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventory_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download sample CSV with deliberate errors for testing
  const handleDownloadSampleErrors = () => {
    const csv = generateSampleErrorsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventory_sample_errors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Required fields mapped check
  const requiredFields = useMemo(() => TARGET_FIELDS.filter(f => f.required), []);
  const allRequiredMapped = useMemo(() => {
    return requiredFields.every(rf => Boolean(columnMapping[rf.key]));
  }, [requiredFields, columnMapping]);

  // Validation execution for Step 3
  const validatedRows: ValidatedRow[] = useMemo(() => {
    if (rawRows.length === 0) return [];
    return validateBulkImportRows(rawRows, columnMapping, {
      existingInventory: inventory,
      existingCategories: categories,
      existingWarehouses: warehouses,
      createMissingCategoriesWarehouses: createMissing,
      duplicatePolicy
    });
  }, [rawRows, columnMapping, inventory, categories, warehouses, createMissing, duplicatePolicy]);

  // Counts
  const validCount = useMemo(() => validatedRows.filter(r => r.isValid).length, [validatedRows]);
  const warningCount = useMemo(() => validatedRows.filter(r => r.isValid && r.warnings.length > 0).length, [validatedRows]);
  const errorCount = useMemo(() => validatedRows.filter(r => !r.isValid).length, [validatedRows]);

  // Download Errors CSV
  const handleDownloadErrors = () => {
    const csv = generateErrorsCsv(validatedRows);
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `import_errors_${file?.name || 'file'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered rows for review table
  const displayedRows = useMemo(() => {
    return validatedRows.filter(row => {
      // Tab filter
      if (activeFilter === 'valid' && (!row.isValid || row.warnings.length > 0)) return false;
      if (activeFilter === 'warnings' && (!row.isValid || row.warnings.length === 0)) return false;
      if (activeFilter === 'errors' && row.isValid) return false;

      // Text search
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const matchSku = row.data.sku.toLowerCase().includes(q);
        const matchName = row.data.name.toLowerCase().includes(q);
        const matchCat = row.data.category.toLowerCase().includes(q);
        const matchError = row.errors.some(e => e.toLowerCase().includes(q));
        const matchWarning = row.warnings.some(w => w.toLowerCase().includes(q));
        return matchSku || matchName || matchCat || matchError || matchWarning;
      }
      return true;
    });
  }, [validatedRows, activeFilter, searchFilter]);

  // Inline edit save
  const handleSaveInlineEdit = (updatedRow: ValidatedRow) => {
    const index = rawRows.findIndex((_, i) => i + 2 === updatedRow.rowNumber);
    if (index !== -1) {
      const newRawRows = [...rawRows];
      const targetRaw = { ...newRawRows[index] };
      
      // Update raw columns based on mapping
      if (columnMapping.sku) targetRaw[columnMapping.sku] = updatedRow.data.sku;
      if (columnMapping.name) targetRaw[columnMapping.name] = updatedRow.data.name;
      if (columnMapping.barcode) targetRaw[columnMapping.barcode] = updatedRow.data.barcode;
      if (columnMapping.category) targetRaw[columnMapping.category] = updatedRow.data.category;
      if (columnMapping.unit) targetRaw[columnMapping.unit] = updatedRow.data.unit;
      if (columnMapping.currentStock) targetRaw[columnMapping.currentStock] = updatedRow.data.currentStock.toString();
      if (columnMapping.minStock) targetRaw[columnMapping.minStock] = updatedRow.data.minStock.toString();
      if (columnMapping.safetyStock) targetRaw[columnMapping.safetyStock] = updatedRow.data.safetyStock.toString();
      if (columnMapping.dailyConsumption) targetRaw[columnMapping.dailyConsumption] = updatedRow.data.dailyConsumption.toString();
      if (columnMapping.leadTime) targetRaw[columnMapping.leadTime] = updatedRow.data.leadTime.toString();
      if (columnMapping.warehouse && updatedRow.data.warehouse) targetRaw[columnMapping.warehouse] = updatedRow.data.warehouse;

      newRawRows[index] = targetRaw;
      setRawRows(newRawRows);
    }
    setEditingRow(null);
  };

  // Can import check
  const canImport = useMemo(() => {
    if (isImporting) return false;
    if (validCount === 0) return false;
    if (importMode === 'all_or_nothing' && errorCount > 0) return false;
    return true;
  }, [isImporting, validCount, importMode, errorCount]);

  // Execute Step 4: Import
  const handleExecuteImport = async () => {
    // Re-check clearance
    if (!isAuthorized) {
      alert(t.permissionDeniedImport);
      return;
    }

    if (!canImport) return;

    setIsImporting(true);
    setCurrentStep(4);
    setImportProgress(0);

    const rowsToProcess = importMode === 'all_or_nothing'
      ? validatedRows
      : validatedRows.filter(r => r.isValid);

    // Group into new items vs updated items vs skipped
    const existingSkuMap = new Map<string, InventoryItem>();
    inventory.forEach(item => existingSkuMap.set(item.sku.trim().toUpperCase(), item));

    const itemsToCreate: InventoryItem[] = [];
    const itemsToUpdate: InventoryItem[] = [];
    let skipped = 0;
    let failed = errorCount;
    let totalStockAdded = 0;

    const newCategoriesSet = new Set<string>();
    const newWarehousesSet = new Set<string>();
    const openingStockMap: Record<string, { warehouseId: string; quantity: number }> = {};

    const existingCatNames = new Set(categories.map(c => c.name.toLowerCase()));
    const existingWhNames = new Set(warehouses.map(w => w.name.toLowerCase()));

    // Process chunked
    await processImportInChunks(
      rowsToProcess,
      100,
      (chunk) => {
        for (const row of chunk) {
          if (!row.isValid) {
            failed++;
            continue;
          }

          const normSku = row.data.sku.trim().toUpperCase();
          const existingItem = existingSkuMap.get(normSku);

          if (existingItem) {
            if (duplicatePolicy === 'skip') {
              skipped++;
              continue;
            } else if (duplicatePolicy === 'update') {
              // Prepare update
              const updatedItem: InventoryItem = {
                ...existingItem,
                name: row.data.name,
                barcode: row.data.barcode || existingItem.barcode,
                unit: row.data.unit,
                currentStock: row.data.currentStock,
                minStock: row.data.minStock,
                safetyStock: row.data.safetyStock,
                dailyConsumption: row.data.dailyConsumption,
                leadTime: row.data.leadTime,
                description: row.data.description || existingItem.description
              };
              itemsToUpdate.push(updatedItem);
              totalStockAdded += Math.max(0, row.data.currentStock - existingItem.currentStock);
              continue;
            }
          }

          // Check categories & warehouses
          const catName = row.data.category.trim();
          if (!existingCatNames.has(catName.toLowerCase()) && createMissing) {
            newCategoriesSet.add(catName);
          }

          const whName = row.data.warehouse?.trim();
          if (whName && !existingWhNames.has(whName.toLowerCase()) && createMissing) {
            newWarehousesSet.add(whName);
          }

          // Create new InventoryItem with matching defaults
          const newItemId = Math.random().toString(36).substr(2, 9);
          
          // Match or assign categoryId
          const matchedCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          const catId = matchedCat?.id || `cat-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

          const newItem: InventoryItem = {
            id: newItemId,
            name: row.data.name,
            sku: row.data.sku,
            barcode: row.data.barcode,
            categoryId: catId,
            unit: row.data.unit,
            currentStock: row.data.currentStock,
            minStock: row.data.minStock,
            safetyStock: row.data.safetyStock,
            dailyConsumption: row.data.dailyConsumption,
            leadTime: row.data.leadTime,
            description: row.data.description,
            hsnCode: '9987',
            gstRate: 18
          };

          itemsToCreate.push(newItem);
          totalStockAdded += row.data.currentStock;

          // Target warehouse if specified
          if (whName) {
            const matchedWh = warehouses.find(w => w.name.toLowerCase() === whName.toLowerCase());
            const whId = matchedWh?.id || `wh-${whName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            openingStockMap[newItemId] = { warehouseId: whId, quantity: row.data.currentStock };
          }
        }
        return chunk;
      },
      (percent) => {
        setImportProgress(percent);
      }
    );

    const counts = {
      created: itemsToCreate.length,
      updated: itemsToUpdate.length,
      skipped,
      failed
    };

    setSummary({
      ...counts,
      totalStockAdded
    });

    setIsImporting(false);

    // Call external handler to save all changes and write the single audit log
    onImportComplete({
      itemsToCreate,
      itemsToUpdate,
      newCategories: Array.from(newCategoriesSet),
      newWarehouses: Array.from(newWarehousesSet),
      openingStockMap,
      duplicatePolicy,
      fileName: file?.name || 'bulk_import.csv',
      counts
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200">
          {/* Header & Step Tracker */}
          <div className="bg-slate-50 border-b border-slate-200 p-6 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="text-indigo-600 w-5 h-5" />
                  {t.bulkImportTitle}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-0.5">
                  {t.bulkImportDesc}
                </DialogDescription>
              </div>

              {/* Clearance Badge */}
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full text-xs font-semibold text-indigo-700">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{currentUser.role === 'admin' ? 'Admin Authorized' : 'Manager Authorized'}</span>
              </div>
            </div>

            {/* Stepper Wizard Bar */}
            <div className="grid grid-cols-4 gap-2 mt-6">
              {[
                { step: 1, title: t.stepUpload },
                { step: 2, title: t.stepMap },
                { step: 3, title: t.stepReview },
                { step: 4, title: t.stepDone }
              ].map(({ step, title }) => {
                const isActive = currentStep === step;
                const isPassed = currentStep > step;
                return (
                  <div 
                    key={step} 
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : isPassed 
                        ? 'bg-white text-indigo-900 border-indigo-200' 
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive 
                        ? 'bg-white text-indigo-600' 
                        : isPassed 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isPassed ? <Check size={12} strokeWidth={3} /> : step}
                    </div>
                    <span className="truncate">{title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1 min-h-[420px]">
            {/* STEP 1: UPLOAD */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 text-sm text-red-700">
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">{language === 'ta' ? "பதிவேற்ற பிழை" : "Upload Error"}</p>
                      <p className="text-xs text-red-600 mt-0.5">{uploadError}</p>
                    </div>
                  </div>
                )}

                {/* Dropzone */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      handleFileSelected(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])} 
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                    className="hidden" 
                  />
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600 flex items-center justify-center mb-4 transition-all">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {t.dragAndDrop}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    {t.fileLimits}
                  </p>

                  <Button type="button" variant="outline" className="mt-5 rounded-xl border-indigo-200 text-indigo-700 font-semibold group-hover:bg-white shadow-xs">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {language === 'ta' ? "கோப்பைத் தேர்ந்தெடுங்கள்" : "Browse Files"}
                  </Button>
                </div>

                {/* Download Template & Quick Info */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <Download className="text-indigo-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {language === 'ta' ? "மாதிரி CSV கோப்பை பதிவிறக்குங்கள்" : "Need the standard import format?"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {language === 'ta' ? "அனைத்து நெடுவரிசைகள் மற்றும் உதாரண தரவுகளுடன் கூடிய வார்ப்புரு." : "Includes all inventory fields with 2 realistic pre-filled example items."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5 shrink-0">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleDownloadTemplate}
                      className="rounded-xl border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold shrink-0"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      {t.downloadTemplate}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownloadSampleErrors}
                      className="rounded-xl border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold shrink-0 text-xs shadow-2xs"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                      Download sample file with errors
                    </Button>
                  </div>
                </div>

                {/* Supported Columns Guide */}
                <div className="text-[11px] text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-700">Supported Headers: </span>
                  SKU, Item Name, Barcode, Description, Category, Unit, Unit Cost, Selling Price, Current Stock, Minimum Threshold, Safety Stock, Daily Usage, Lead Time (days), Warehouse.
                </div>
              </div>
            )}

            {/* STEP 2: MAP COLUMNS */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950">
                      {language === 'ta' ? "நெடுவரிசைகளை பொருத்துங்கள்" : "Map Spreadsheet Headers to Master Fields"}
                    </h4>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      {language === 'ta' ? "தேவையான 4 புலங்களை (* அடையாளம்) கட்டாயம் பொருத்த வேண்டும்." : "Headers have been auto-matched. Verify or re-assign columns before continuing."}
                    </p>
                  </div>
                  <div className="text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 self-start sm:self-auto">
                    {language === 'ta' ? "கண்டறியப்பட்ட வரிகள்:" : "Total File Rows:"} <span className="font-bold text-indigo-600">{rawRows.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TARGET_FIELDS.map((field) => {
                    const isMapped = Boolean(columnMapping[field.key]);
                    return (
                      <div 
                        key={field.key} 
                        className={`p-3.5 rounded-xl border transition-all ${
                          isMapped 
                            ? 'bg-white border-slate-200 shadow-2xs' 
                            : field.required 
                            ? 'bg-red-50/40 border-red-200' 
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {field.label}
                            {field.required && (
                              <span className="text-red-500 font-extrabold text-sm leading-none" title="Required">*</span>
                            )}
                          </Label>
                          {field.required ? (
                            <Badge variant={isMapped ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                              {isMapped ? 'Mapped' : 'Required'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-500 px-1.5 py-0">
                              Optional
                            </Badge>
                          )}
                        </div>

                        <select
                          value={columnMapping[field.key] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setColumnMapping(prev => ({
                              ...prev,
                              [field.key]: val
                            }));
                          }}
                          className={`w-full h-9 rounded-lg text-xs font-medium px-2.5 border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            field.required && !isMapped 
                              ? 'border-red-300 text-red-600' 
                              : 'border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="">-- {language === 'ta' ? "பொருத்தப்படவில்லை" : "Not Mapped"} --</option>
                          {rawHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & VALIDATE */}
            {currentStep === 3 && (
              <div className="space-y-5">
                {/* Status Summary KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{language === 'ta' ? "மொத்த வரிகள்" : "Total Rows"}</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-0.5">{validatedRows.length}</p>
                  </div>
                  <div className="bg-green-50/50 p-3.5 rounded-xl border border-green-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-green-700 uppercase tracking-wider">{language === 'ta' ? "செல்லுபடியாகும்" : "Valid Rows"}</p>
                    <p className="text-xl font-extrabold text-green-600 mt-0.5">{validCount}</p>
                  </div>
                  <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">{language === 'ta' ? "எச்சரிக்கைகள்" : "Warnings"}</p>
                    <p className="text-xl font-extrabold text-amber-600 mt-0.5">{warningCount}</p>
                  </div>
                  <div className="bg-red-50/50 p-3.5 rounded-xl border border-red-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">{language === 'ta' ? "பிழைகள்" : "Errors"}</p>
                    <p className="text-xl font-extrabold text-red-600 mt-0.5">{errorCount}</p>
                  </div>
                </div>

                {/* Configuration Bar: Duplicate Policy, Missing Warehouses, Import Mode */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Duplicate Policy */}
                    <div>
                      <Label className="text-xs font-bold text-slate-700 block mb-1">
                        {t.duplicatePolicy}
                      </Label>
                      <select
                        value={duplicatePolicy}
                        onChange={(e) => setDuplicatePolicy(e.target.value as DuplicatePolicy)}
                        className="w-full h-8 text-xs font-medium rounded-lg border border-slate-200 bg-white px-2 focus:ring-indigo-500"
                      >
                        <option value="skip">{t.skipDuplicates}</option>
                        <option value="update">{t.updateExisting}</option>
                        <option value="reject">{t.rejectFile}</option>
                      </select>
                    </div>

                    {/* Import Mode */}
                    <div>
                      <Label className="text-xs font-bold text-slate-700 block mb-1">
                        {t.importMode}
                      </Label>
                      <select
                        value={importMode}
                        onChange={(e) => setImportMode(e.target.value as ImportMode)}
                        className="w-full h-8 text-xs font-medium rounded-lg border border-slate-200 bg-white px-2 focus:ring-indigo-500"
                      >
                        <option value="valid_only">{t.importValidOnly}</option>
                        <option value="all_or_nothing">{t.allOrNothing}</option>
                      </select>
                    </div>

                    {/* Create Missing Categories / Warehouses */}
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none h-8">
                        <input
                          type="checkbox"
                          checked={createMissing}
                          onChange={(e) => setCreateMissing(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                        />
                        <span>{t.createMissing}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs & Search & Download Errors */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveFilter('all')}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                        activeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      All ({validatedRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('valid')}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                        activeFilter === 'valid' ? 'bg-green-600 text-white shadow-2xs' : 'text-slate-500 hover:text-green-700'
                      }`}
                    >
                      Valid ({validCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('warnings')}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                        activeFilter === 'warnings' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-500 hover:text-amber-700'
                      }`}
                    >
                      Warnings ({warningCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('errors')}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                        activeFilter === 'errors' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-500 hover:text-red-700'
                      }`}
                    >
                      Errors ({errorCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      placeholder={language === 'ta' ? "முன்னோட்டத்தை வடிகட்டு..." : "Filter preview table..."}
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="h-8 text-xs rounded-lg max-w-[200px]"
                    />
                    {errorCount > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadErrors}
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 font-bold shrink-0"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        {t.downloadErrorsCsv}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Review Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-12 text-center text-xs">#</TableHead>
                        <TableHead className="w-20 text-xs">Status</TableHead>
                        <TableHead className="text-xs">SKU</TableHead>
                        <TableHead className="text-xs">Item Name</TableHead>
                        <TableHead className="text-xs">Barcode</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">Stock</TableHead>
                        <TableHead className="text-xs">Issues / Notes</TableHead>
                        <TableHead className="w-14 text-right text-xs">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-24 text-center text-xs text-slate-400">
                            {language === 'ta' ? "பொருந்தும் பொருட்கள் எதுவும் இல்லை" : "No rows match the selected filter."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedRows.map((row) => (
                          <TableRow 
                            key={row.rowNumber}
                            className={!row.isValid ? 'bg-red-50/40' : row.warnings.length > 0 ? 'bg-amber-50/20' : ''}
                          >
                            <TableCell className="text-center font-mono text-xs text-slate-500 font-semibold">
                              {row.rowNumber}
                            </TableCell>
                            <TableCell>
                              {!row.isValid ? (
                                <Badge variant="destructive" className="text-[10px] py-0">
                                  Error
                                </Badge>
                              ) : row.warnings.length > 0 ? (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] py-0">
                                  Warning
                                </Badge>
                              ) : (
                                <Badge className="bg-green-600 hover:bg-green-700 text-white text-[10px] py-0">
                                  Valid
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-slate-800">
                              {row.data.sku || <span className="text-red-500 italic">Missing</span>}
                            </TableCell>
                            <TableCell className="font-medium text-xs max-w-[150px] truncate">
                              {row.data.name || <span className="text-red-500 italic">Missing</span>}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-600">
                              {row.data.barcode}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.data.category || <span className="text-red-500 italic">Missing</span>}
                            </TableCell>
                            <TableCell className="text-xs font-bold">
                              {row.data.currentStock} {row.data.unit}
                            </TableCell>
                            <TableCell className="text-[11px] max-w-[220px]">
                              {row.errors.length > 0 && (
                                <p className="text-red-600 font-medium truncate" title={row.errors.join('; ')}>
                                  {row.errors[0]}
                                </p>
                              )}
                              {row.warnings.length > 0 && row.errors.length === 0 && (
                                <p className="text-amber-700 font-medium truncate" title={row.warnings.join('; ')}>
                                  {row.warnings[0]}
                                </p>
                              )}
                              {row.errors.length === 0 && row.warnings.length === 0 && (
                                <span className="text-green-600 text-xs">Ready</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingRow(row)}
                                className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                title="Edit row data inline"
                              >
                                <Edit3 size={13} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* STEP 4: IMPORT EXECUTION & SUMMARY */}
            {currentStep === 4 && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-6">
                {isImporting ? (
                  <div className="w-full max-w-md space-y-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto animate-pulse">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">
                        {language === 'ta' ? "பொருட்களை இறக்குமதி செய்கிறது..." : "Importing Inventory Items..."}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {language === 'ta' ? "தொகுதி தொகுதியாக செயலாக்கப்படுகிறது, பக்கத்தை மூட வேண்டாம்." : "Processing rows in batches. Please do not close this window."}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                      <motion.div 
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${importProgress}%` }}
                        transition={{ ease: "easeInOut" }}
                      />
                    </div>
                    <p className="text-xs font-mono font-bold text-indigo-700">{importProgress}% Completed</p>
                  </div>
                ) : (
                  <div className="w-full max-w-xl space-y-6">
                    <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xl">
                        {language === 'ta' ? "இறக்குமதி வெற்றிகரமாக முடிந்தது!" : "Import Completed Successfully!"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {language === 'ta' 
                          ? "சரக்கு முதன்மை பட்டியல் மற்றும் தணிக்கைப் பதிவு வெற்றிகரமாக புதுப்பிக்கப்பட்டது." 
                          : "Inventory master list has been updated and a full audit entry was recorded."}
                      </p>
                    </div>

                    {/* Summary Badges */}
                    {summary && (
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'ta' ? "உருவாக்கப்பட்டது" : "Created"}</p>
                          <p className="text-2xl font-extrabold text-green-600 mt-0.5">{summary.created}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'ta' ? "புதுப்பிக்கப்பட்டது" : "Updated"}</p>
                          <p className="text-2xl font-extrabold text-indigo-600 mt-0.5">{summary.updated}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'ta' ? "தவிர்க்கப்பட்டது" : "Skipped"}</p>
                          <p className="text-2xl font-extrabold text-amber-600 mt-0.5">{summary.skipped}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === 'ta' ? "தோல்வி" : "Failed"}</p>
                          <p className="text-2xl font-extrabold text-red-500 mt-0.5">{summary.failed}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-xl text-left text-xs text-indigo-900 flex items-start gap-2.5">
                      <Layers className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Opening Stock Allocated: </span>
                        {summary?.totalStockAdded.toLocaleString()} total units assigned across warehouses with live stock health status calculated.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-row justify-between items-center w-full">
            <div>
              {currentStep > 1 && currentStep < 4 && !isImporting && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                  className="rounded-xl border-slate-200 text-slate-700 font-bold"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  {language === 'ta' ? "பின்செல்" : "Back"}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 4 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handleClose}
                  className="rounded-xl text-slate-500 font-semibold"
                >
                  {language === 'ta' ? "ரத்துசெய்" : "Cancel"}
                </Button>
              )}

              {/* Step 2 -> Step 3 */}
              {currentStep === 2 && (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={!allRequiredMapped}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {language === 'ta' ? "சரிபார்த்தலுக்கு செல்க" : "Review & Validate"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}

              {/* Step 3 -> Step 4 (Execute Import) */}
              {currentStep === 3 && (
                <Button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={!canImport}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {importMode === 'all_or_nothing' && errorCount > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <Lock size={14} /> All or Nothing Blocked
                    </span>
                  ) : (
                    <>
                      {language === 'ta' ? "இறக்குமதியை உறுதிசெய்" : "Import"} ({validCount} {language === 'ta' ? "பொருட்கள்" : "Items"})
                    </>
                  )}
                </Button>
              )}

              {/* Step 4 -> Done */}
              {currentStep === 4 && !isImporting && (
                <Button
                  type="button"
                  onClick={handleClose}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-6 shadow-sm"
                >
                  {language === 'ta' ? "முடிந்தது" : "Done"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Row Quick Edit Sub-Dialog */}
      {editingRow && (
        <Dialog open={Boolean(editingRow)} onOpenChange={(open) => !open && setEditingRow(null)}>
          <DialogContent className="sm:max-w-[480px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="text-indigo-600 w-4 h-4" />
                Edit Row #{editingRow.rowNumber} Data
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Fix missing fields, negative stock, or barcodes inline to make this row valid.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">SKU *</Label>
                  <Input 
                    value={editingRow.data.sku} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, sku: e.target.value }
                    })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Item Name *</Label>
                  <Input 
                    value={editingRow.data.name} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, name: e.target.value }
                    })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Category *</Label>
                  <Input 
                    value={editingRow.data.category} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, category: e.target.value }
                    })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit *</Label>
                  <Input 
                    value={editingRow.data.unit} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, unit: e.target.value }
                    })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Current Stock</Label>
                  <Input 
                    type="number"
                    value={editingRow.data.currentStock} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, currentStock: Math.max(0, Number(e.target.value)) }
                    })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Barcode (13-digit EAN)</Label>
                  <Input 
                    value={editingRow.data.barcode} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, barcode: e.target.value }
                    })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingRow(null)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={() => handleSaveInlineEdit(editingRow)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Save & Re-validate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

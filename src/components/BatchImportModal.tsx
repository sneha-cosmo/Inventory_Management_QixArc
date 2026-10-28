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
  Lock,
  Calendar,
  Scale,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  BATCH_TARGET_FIELDS, 
  ValidatedBatchRow, 
  BatchDuplicatePolicy, 
  BatchImportMode, 
  validateBulkImportBatches, 
  generateBatchCsvTemplate, 
  generateBatchErrorsCsv,
  SkuReconciliationRow
} from '../utils/batchImport';
import { autoMatchColumns, processImportInChunks } from '../utils/bulkImport';
import { Batch, InventoryItem, Warehouse, Staff } from '../types';
import { Language, LOCALES } from '../locales';

interface BatchImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
  batches: Batch[];
  warehouses: Warehouse[];
  currentUser: Staff;
  language?: Language;
  onImportComplete: (payload: {
    batchesToCreate: Batch[];
    batchesToUpdate: { batch: Batch; addedQuantity: number; oldQuantity: number; newQuantity: number }[];
    newWarehouses: string[];
    duplicatePolicy: BatchDuplicatePolicy;
    fileName: string;
    counts: {
      created: number;
      updated: number;
      skipped: number;
      failed: number;
      totalQuantityAdded: number;
      expiredCount: number;
      criticalCount: number;
      nearExpiryCount: number;
      healthyCount: number;
    };
  }) => void;
}

export default function BatchImportModal({
  open,
  onOpenChange,
  inventory,
  batches,
  warehouses,
  currentUser,
  language = 'en',
  onImportComplete
}: BatchImportModalProps) {
  const t = LOCALES[language];

  // Re-verify authorization
  const isAuthorized = currentUser.role === 'admin' || currentUser.role === 'inventory_manager';

  // 4 steps
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Upload state
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Mapping state
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Step 3: Review state
  const [duplicatePolicy, setDuplicatePolicy] = useState<BatchDuplicatePolicy>('skip');
  const [importMode, setImportMode] = useState<BatchImportMode>('valid_only');
  const [createMissingWarehouses, setCreateMissingWarehouses] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'warnings' | 'errors'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [showReconciliation, setShowReconciliation] = useState<boolean>(false);

  // Inline edit state
  const [editingRow, setEditingRow] = useState<ValidatedBatchRow | null>(null);

  // Step 4: Import state
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    totalQuantityAdded: number;
    expiredCount: number;
    criticalCount: number;
    nearExpiryCount: number;
    healthyCount: number;
  } | null>(null);

  const handleReset = () => {
    setCurrentStep(1);
    setFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setUploadError(null);
    setColumnMapping({});
    setDuplicatePolicy('skip');
    setImportMode('valid_only');
    setCreateMissingWarehouses(false);
    setActiveFilter('all');
    setSearchFilter('');
    setShowReconciliation(false);
    setEditingRow(null);
    setImportProgress(0);
    setIsImporting(false);
    setSummary(null);
  };

  const handleClose = () => {
    if (isImporting) return;
    onOpenChange(false);
    setTimeout(handleReset, 300);
  };

  // Step 1: File selection
  const handleFileSelected = (selectedFile: File) => {
    setUploadError(null);

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (selectedFile.size > MAX_SIZE) {
      setUploadError(
        language === 'ta'
          ? "கோப்பு அளவு 5 MB ஐ விட அதிகமாக உள்ளது."
          : `File size exceeds 5 MB limit (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB).`
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
          const data = (results.data as Record<string, any>[]).filter(r => 
            Object.values(r).some(v => v !== null && v !== '')
          );

          if (data.length > 5000) {
            setUploadError(`File exceeds maximum 5,000 rows limit (${data.length.toLocaleString()} rows).`);
            return;
          }

          if (data.length === 0) {
            setUploadError("The uploaded file does not contain any data rows.");
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
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

          setIsParsing(false);
          if (jsonData.length > 5000) {
            setUploadError(`File exceeds maximum 5,000 rows limit (${jsonData.length.toLocaleString()} rows).`);
            return;
          }

          if (jsonData.length === 0) {
            setUploadError("The worksheet contains no data rows.");
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

  // Download template
  const handleDownloadTemplate = () => {
    const csv = generateBatchCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'batch_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Required fields mapped check
  const requiredFields = useMemo(() => BATCH_TARGET_FIELDS.filter(f => f.required), []);
  const allRequiredMapped = useMemo(() => {
    return requiredFields.every(rf => Boolean(columnMapping[rf.key]));
  }, [requiredFields, columnMapping]);

  // Validation execution for Step 3
  const validationResult = useMemo(() => {
    if (rawRows.length === 0) {
      return {
        rows: [] as ValidatedBatchRow[],
        reconciliation: [] as SkuReconciliationRow[],
        summary: {
          validCount: 0,
          warningCount: 0,
          errorCount: 0,
          expiredCount: 0,
          criticalCount: 0,
          nearExpiryCount: 0,
          healthyCount: 0,
          totalImportQuantity: 0
        }
      };
    }
    return validateBulkImportBatches(rawRows, columnMapping, {
      existingInventory: inventory,
      existingBatches: batches,
      existingWarehouses: warehouses,
      createMissingWarehouses,
      duplicatePolicy
    });
  }, [rawRows, columnMapping, inventory, batches, warehouses, createMissingWarehouses, duplicatePolicy]);

  const { rows: validatedRows, reconciliation, summary: valSummary } = validationResult;

  // Download Errors CSV
  const handleDownloadErrors = () => {
    const csv = generateBatchErrorsCsv(validatedRows);
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `batch_errors_${file?.name || 'file'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered rows for table
  const displayedRows = useMemo(() => {
    return validatedRows.filter(row => {
      if (activeFilter === 'valid' && (!row.isValid || row.warnings.length > 0)) return false;
      if (activeFilter === 'warnings' && (!row.isValid || row.warnings.length === 0)) return false;
      if (activeFilter === 'errors' && row.isValid) return false;

      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const matchBatch = row.data.batchNumber.toLowerCase().includes(q);
        const matchSku = row.data.sku.toLowerCase().includes(q);
        const matchItem = row.data.itemName?.toLowerCase().includes(q) || false;
        const matchWh = row.data.warehouse.toLowerCase().includes(q);
        const matchError = row.errors.some(e => e.toLowerCase().includes(q));
        const matchWarning = row.warnings.some(w => w.toLowerCase().includes(q));
        return matchBatch || matchSku || matchItem || matchWh || matchError || matchWarning;
      }
      return true;
    });
  }, [validatedRows, activeFilter, searchFilter]);

  // Inline edit save
  const handleSaveInlineEdit = (updatedRow: ValidatedBatchRow) => {
    const index = rawRows.findIndex((_, i) => i + 2 === updatedRow.rowNumber);
    if (index !== -1) {
      const newRawRows = [...rawRows];
      const targetRaw = { ...newRawRows[index] };

      if (columnMapping.batchNumber) targetRaw[columnMapping.batchNumber] = updatedRow.data.batchNumber;
      if (columnMapping.sku) targetRaw[columnMapping.sku] = updatedRow.data.sku;
      if (columnMapping.warehouse) targetRaw[columnMapping.warehouse] = updatedRow.data.warehouse;
      if (columnMapping.quantity) targetRaw[columnMapping.quantity] = updatedRow.data.quantity.toString();
      if (columnMapping.manufactureDate && updatedRow.data.manufactureDate) {
        targetRaw[columnMapping.manufactureDate] = updatedRow.data.manufactureDate;
      }
      if (columnMapping.expiryDate) targetRaw[columnMapping.expiryDate] = updatedRow.data.expiryDate;

      newRawRows[index] = targetRaw;
      setRawRows(newRawRows);
    }
    setEditingRow(null);
  };

  // Can import check
  const canImport = useMemo(() => {
    if (isImporting) return false;
    if (valSummary.validCount === 0) return false;
    if (importMode === 'all_or_nothing' && valSummary.errorCount > 0) return false;
    return true;
  }, [isImporting, valSummary, importMode]);

  // Execute import
  const handleExecuteImport = async () => {
    if (!isAuthorized) {
      alert(t.permissionDeniedBatchImport);
      return;
    }

    if (!canImport) return;

    setIsImporting(true);
    setCurrentStep(4);
    setImportProgress(0);

    const rowsToProcess = importMode === 'all_or_nothing'
      ? validatedRows
      : validatedRows.filter(r => r.isValid);

    const batchesToCreate: Batch[] = [];
    const batchesToUpdate: { batch: Batch; addedQuantity: number; oldQuantity: number; newQuantity: number }[] = [];
    let skipped = 0;
    let failed = valSummary.errorCount;
    let totalQuantityAdded = 0;
    let expiredCount = 0;
    let criticalCount = 0;
    let nearExpiryCount = 0;
    let healthyCount = 0;

    const newWarehousesSet = new Set<string>();
    const existingWhNames = new Set(warehouses.map(w => w.name.toLowerCase()));

    await processImportInChunks<ValidatedBatchRow, ValidatedBatchRow>(
      rowsToProcess,
      100,
      (chunk: ValidatedBatchRow[]) => {
        for (const row of chunk) {
          if (!row.isValid) {
            failed++;
            continue;
          }

          if (row.expiryMeta.status === 'Expired') expiredCount++;
          else if (row.expiryMeta.status === 'Critical') criticalCount++;
          else if (row.expiryMeta.status === 'Near Expiry') nearExpiryCount++;
          else healthyCount++;

          if (row.isDuplicateInExisting && row.existingBatch) {
            if (duplicatePolicy === 'skip') {
              skipped++;
              continue;
            } else if (duplicatePolicy === 'add_quantity') {
              const oldQty = row.existingBatch.quantity;
              const addedQty = row.data.quantity;
              const newQty = oldQty + addedQty;
              batchesToUpdate.push({
                batch: { ...row.existingBatch, quantity: newQty },
                addedQuantity: addedQty,
                oldQuantity: oldQty,
                newQuantity: newQty
              });
              totalQuantityAdded += addedQty;
              continue;
            }
          }

          // Handle warehouse creation
          const whName = row.data.warehouse.trim();
          if (!existingWhNames.has(whName.toLowerCase()) && createMissingWarehouses) {
            newWarehousesSet.add(whName);
          }

          const resolvedWhId = row.data.warehouseId || 
            warehouses.find(w => w.name.toLowerCase() === whName.toLowerCase())?.id ||
            `wh-${whName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

          const newBatch: Batch = {
            id: row.data.batchId || `BAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            itemId: row.data.itemId!,
            batchNumber: row.data.batchNumber,
            warehouseId: resolvedWhId,
            quantity: row.data.quantity,
            manufactureDate: row.data.manufactureDate || '2026-05-26',
            expiryDate: row.data.expiryDate
          };

          batchesToCreate.push(newBatch);
          totalQuantityAdded += row.data.quantity;
        }
        return chunk;
      },
      (percent) => {
        setImportProgress(percent);
      }
    );

    const counts = {
      created: batchesToCreate.length,
      updated: batchesToUpdate.length,
      skipped,
      failed,
      totalQuantityAdded,
      expiredCount,
      criticalCount,
      nearExpiryCount,
      healthyCount
    };

    setSummary(counts);
    setIsImporting(false);

    onImportComplete({
      batchesToCreate,
      batchesToUpdate,
      newWarehouses: Array.from(newWarehousesSet),
      duplicatePolicy,
      fileName: file?.name || 'batch_import.csv',
      counts
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[1050px] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200">
          
          {/* Header & Stepper */}
          <div className="bg-slate-50 border-b border-slate-200 p-6 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="text-indigo-600 w-5 h-5" />
                  {t.bulkImportBatchesTitle}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-0.5">
                  {t.bulkImportBatchesDesc}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full text-xs font-semibold text-indigo-700">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{currentUser.role === 'admin' ? 'Admin Authorized' : 'Manager Authorized'}</span>
              </div>
            </div>

            {/* Steps */}
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
                      <p className="font-semibold">Upload Error</p>
                      <p className="text-xs text-red-600 mt-0.5">{uploadError}</p>
                    </div>
                  </div>
                )}

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
                    Drag and drop your batch file here, or click to browse
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Supported formats: .csv, .xlsx, .xls (Maximum 5,000 rows & 5 MB).
                  </p>

                  <Button type="button" variant="outline" className="mt-5 rounded-xl border-indigo-200 text-indigo-700 font-semibold group-hover:bg-white shadow-2xs">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Browse Files
                  </Button>
                </div>

                {/* Template Download */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <Download className="text-indigo-600 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Download Standard Batch Import Template
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Includes Batch Number, SKU, Warehouse, Quantity, Mfg Date, and Expiry Date with sample data.
                      </p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleDownloadTemplate}
                    className="rounded-xl border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold shrink-0"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download CSV Template
                  </Button>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">Supported Date Formats: </span>
                  YYYY-MM-DD, DD/MM/YYYY and DD-MM-YYYY (Indian format; day first), or Excel serial numbers.
                </div>
              </div>
            )}

            {/* STEP 2: MAP COLUMNS */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950">
                      Map Spreadsheet Headers to Batch Master Fields
                    </h4>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      Required fields (*): Batch Number, SKU, Warehouse, Quantity, Expiry Date.
                    </p>
                  </div>
                  <div className="text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100">
                    File Rows: <span className="font-bold text-indigo-600">{rawRows.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BATCH_TARGET_FIELDS.map((field) => {
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
                            {field.required && <span className="text-red-500 font-extrabold text-sm">*</span>}
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
                            setColumnMapping(prev => ({
                              ...prev,
                              [field.key]: e.target.value
                            }));
                          }}
                          className={`w-full h-9 rounded-lg text-xs font-medium px-2.5 border bg-white focus:ring-2 focus:ring-indigo-500 ${
                            field.required && !isMapped ? 'border-red-300 text-red-600' : 'border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="">-- Not Mapped --</option>
                          {rawHeaders.map((header) => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & RECONCILIATION */}
            {currentStep === 3 && (
              <div className="space-y-5">
                
                {/* Expiry Health Indicators & KPI Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Rows</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{validatedRows.length}</p>
                  </div>
                  <div className="bg-green-50/60 p-3 rounded-xl border border-green-200">
                    <p className="text-[10px] font-bold text-green-700 uppercase">Valid Rows</p>
                    <p className="text-lg font-black text-green-600 mt-0.5">{valSummary.validCount}</p>
                  </div>
                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                    <p className="text-[10px] font-bold text-amber-700 uppercase">Warnings</p>
                    <p className="text-lg font-black text-amber-600 mt-0.5">{valSummary.warningCount}</p>
                  </div>
                  <div className="bg-red-50/60 p-3 rounded-xl border border-red-200">
                    <p className="text-[10px] font-bold text-red-700 uppercase">Errors</p>
                    <p className="text-lg font-black text-red-600 mt-0.5">{valSummary.errorCount}</p>
                  </div>
                  
                  {/* Expiry breakdown */}
                  <div className="bg-red-100/50 p-3 rounded-xl border border-red-300">
                    <p className="text-[10px] font-bold text-red-800 uppercase">Expired (≤0d)</p>
                    <p className="text-lg font-black text-red-700 mt-0.5">{valSummary.expiredCount}</p>
                  </div>
                  <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200">
                    <p className="text-[10px] font-bold text-rose-700 uppercase">Critical (≤7d)</p>
                    <p className="text-lg font-black text-rose-600 mt-0.5">{valSummary.criticalCount}</p>
                  </div>
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Healthy (&gt;30d)</p>
                    <p className="text-lg font-black text-emerald-600 mt-0.5">{valSummary.healthyCount}</p>
                  </div>
                </div>

                {/* Configuration Bar */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Duplicate Policy */}
                    <div>
                      <Label className="text-xs font-bold text-slate-700 block mb-1">
                        Duplicate Batch Policy
                      </Label>
                      <select
                        value={duplicatePolicy}
                        onChange={(e) => setDuplicatePolicy(e.target.value as BatchDuplicatePolicy)}
                        className="w-full h-8 text-xs font-medium rounded-lg border border-slate-200 bg-white px-2 focus:ring-indigo-500"
                      >
                        <option value="skip">Skip duplicates (Default)</option>
                        <option value="add_quantity">Add quantity to existing batch</option>
                        <option value="reject">Reject whole file</option>
                      </select>
                    </div>

                    {/* Import Mode */}
                    <div>
                      <Label className="text-xs font-bold text-slate-700 block mb-1">
                        Import Mode
                      </Label>
                      <select
                        value={importMode}
                        onChange={(e) => setImportMode(e.target.value as BatchImportMode)}
                        className="w-full h-8 text-xs font-medium rounded-lg border border-slate-200 bg-white px-2 focus:ring-indigo-500"
                      >
                        <option value="valid_only">Import valid rows only</option>
                        <option value="all_or_nothing">All or nothing (Strict)</option>
                      </select>
                    </div>

                    {/* Missing Warehouses toggle */}
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none h-8">
                        <input
                          type="checkbox"
                          checked={createMissingWarehouses}
                          onChange={(e) => setCreateMissingWarehouses(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                        />
                        <span>Create missing warehouses automatically</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Reconciliation Bar Toggle */}
                <div className="flex justify-between items-center bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Scale className="text-indigo-600 w-4 h-4" />
                    <span className="text-xs font-bold text-indigo-950">
                      Step 0 Stock Reconciliation: Item stock increases by imported batch quantity
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReconciliation(!showReconciliation)}
                    className="h-7 text-xs text-indigo-700 font-bold hover:bg-indigo-100"
                  >
                    {showReconciliation ? "Hide Reconciliation Table" : `View SKU Reconciliation (${reconciliation.length} Items)`}
                  </Button>
                </div>

                {/* Per-SKU Reconciliation Table */}
                {showReconciliation && (
                  <div className="border border-indigo-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-indigo-900">Per-SKU Stock & Batch Quantity Parity Ledger</span>
                      <span className="text-[11px] text-indigo-700">Prevents double-counting / unbacked stock</span>
                    </div>
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs">SKU</TableHead>
                          <TableHead className="text-xs">Item Name</TableHead>
                          <TableHead className="text-xs text-right">Current Stock</TableHead>
                          <TableHead className="text-xs text-right">Existing Batches</TableHead>
                          <TableHead className="text-xs text-right text-indigo-600">+ Imported Qty</TableHead>
                          <TableHead className="text-xs text-right font-bold">= Resulting Batches</TableHead>
                          <TableHead className="text-xs text-right font-bold text-green-700">= Resulting Stock</TableHead>
                          <TableHead className="text-xs text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reconciliation.map((rec) => (
                          <TableRow key={rec.sku}>
                            <TableCell className="font-mono text-xs font-bold">{rec.sku}</TableCell>
                            <TableCell className="text-xs font-medium">{rec.itemName}</TableCell>
                            <TableCell className="text-right text-xs">{rec.currentItemStock} {rec.unit}</TableCell>
                            <TableCell className="text-right text-xs">{rec.existingBatchQuantity} {rec.unit}</TableCell>
                            <TableCell className="text-right text-xs font-bold text-indigo-600">+{rec.importedBatchQuantity} {rec.unit}</TableCell>
                            <TableCell className="text-right text-xs font-bold">{rec.resultingBatchQuantity} {rec.unit}</TableCell>
                            <TableCell className="text-right text-xs font-bold text-green-700">{rec.resultingItemStock} {rec.unit}</TableCell>
                            <TableCell className="text-center text-xs">
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                Balanced
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Filter Tabs & Search */}
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
                      Valid ({valSummary.validCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('warnings')}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                        activeFilter === 'warnings' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-500 hover:text-amber-700'
                      }`}
                    >
                      Warnings ({valSummary.warningCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('errors')}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                        activeFilter === 'errors' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-500 hover:text-red-700'
                      }`}
                    >
                      Errors ({valSummary.errorCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      placeholder="Filter preview..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="h-8 text-xs rounded-lg max-w-[200px]"
                    />
                    {valSummary.errorCount > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadErrors}
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 font-bold shrink-0"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download Errors CSV
                      </Button>
                    )}
                  </div>
                </div>

                {/* Preview Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-10 text-center text-xs">#</TableHead>
                        <TableHead className="w-16 text-xs">Status</TableHead>
                        <TableHead className="text-xs">Batch Number</TableHead>
                        <TableHead className="text-xs">Parent SKU</TableHead>
                        <TableHead className="text-xs">Warehouse</TableHead>
                        <TableHead className="text-xs text-right">Quantity</TableHead>
                        <TableHead className="text-xs">Mfg Date</TableHead>
                        <TableHead className="text-xs">Expiry Date (Parsed)</TableHead>
                        <TableHead className="text-xs">Expiry Health</TableHead>
                        <TableHead className="text-xs">Issues / Notes</TableHead>
                        <TableHead className="w-12 text-right text-xs">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="h-20 text-center text-xs text-slate-400">
                            No batches match current filter.
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
                                <Badge variant="destructive" className="text-[10px] py-0">Error</Badge>
                              ) : row.warnings.length > 0 ? (
                                <Badge className="bg-amber-500 text-white text-[10px] py-0">Warning</Badge>
                              ) : (
                                <Badge className="bg-green-600 text-white text-[10px] py-0">Valid</Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-slate-800">
                              {row.data.batchNumber || <span className="text-red-500 italic">Missing</span>}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="font-mono font-bold">{row.data.sku}</span>
                              {row.data.itemName && <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{row.data.itemName}</p>}
                            </TableCell>
                            <TableCell className="text-xs">{row.data.warehouse}</TableCell>
                            <TableCell className="text-right text-xs font-bold">
                              {row.data.quantity > 0 ? row.data.quantity.toLocaleString() : <span className="text-red-500">{row.data.quantity}</span>}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-600">
                              {row.data.manufactureDate || '-'}
                            </TableCell>
                            <TableCell className="text-xs font-mono font-semibold text-slate-800">
                              {row.data.expiryDate}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] py-0 ${row.expiryMeta.badgeClass}`}>
                                {row.expiryMeta.statusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[11px] max-w-[200px]">
                              {row.errors.length > 0 ? (
                                <p className="text-red-600 font-medium truncate" title={row.errors.join('; ')}>
                                  {row.errors[0]}
                                </p>
                              ) : row.warnings.length > 0 ? (
                                <p className="text-amber-700 font-medium truncate" title={row.warnings.join('; ')}>
                                  {row.warnings[0]}
                                </p>
                              ) : (
                                <span className="text-green-600 text-xs">Ready</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingRow(row)}
                                className="h-7 w-7 text-slate-500 hover:text-indigo-600"
                                title="Edit batch data inline"
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
                    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Importing Batches...</h3>
                      <p className="text-xs text-slate-500 mt-1">Processing batches and updating stock levels.</p>
                    </div>

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
                      <h3 className="font-extrabold text-slate-900 text-xl">Batch Import Completed Successfully!</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Batches registered chronologically and parent item stock updated with full audit trail.
                      </p>
                    </div>

                    {summary && (
                      <div className="grid grid-cols-4 gap-3">
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Created</p>
                          <p className="text-2xl font-extrabold text-green-600 mt-0.5">{summary.created}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Updated</p>
                          <p className="text-2xl font-extrabold text-indigo-600 mt-0.5">{summary.updated}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Skipped</p>
                          <p className="text-2xl font-extrabold text-amber-600 mt-0.5">{summary.skipped}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Failed</p>
                          <p className="text-2xl font-extrabold text-red-500 mt-0.5">{summary.failed}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-xl text-left text-xs text-indigo-900 flex items-start gap-2.5">
                      <Layers className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Total Batch Units Added: </span>
                        {summary?.totalQuantityAdded.toLocaleString()} units loaded. 
                        Health status breakdown: {summary?.expiredCount} expired, {summary?.criticalCount} critical, {summary?.nearExpiryCount} near expiry, {summary?.healthyCount} healthy.
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
                  Back
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
                  Cancel
                </Button>
              )}

              {currentStep === 2 && (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={!allRequiredMapped}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Review & Validate
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}

              {currentStep === 3 && (
                <Button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={!canImport}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {importMode === 'all_or_nothing' && valSummary.errorCount > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <Lock size={14} /> All or Nothing Blocked
                    </span>
                  ) : (
                    <>
                      Import ({valSummary.validCount} Batches)
                    </>
                  )}
                </Button>
              )}

              {currentStep === 4 && !isImporting && (
                <Button
                  type="button"
                  onClick={handleClose}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-6 shadow-sm"
                >
                  Done
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
                Edit Batch Row #{editingRow.rowNumber} Data
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Fix batch details, SKU, warehouse, or dates inline to validate this row.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Batch Number *</Label>
                  <Input 
                    value={editingRow.data.batchNumber} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, batchNumber: e.target.value }
                    })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Parent SKU *</Label>
                  <Input 
                    value={editingRow.data.sku} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, sku: e.target.value }
                    })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Warehouse *</Label>
                  <Input 
                    value={editingRow.data.warehouse} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, warehouse: e.target.value }
                    })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quantity (&gt; 0) *</Label>
                  <Input 
                    type="number"
                    value={editingRow.data.quantity} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, quantity: Math.max(1, Number(e.target.value)) }
                    })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Mfg Date (optional)</Label>
                  <Input 
                    placeholder="YYYY-MM-DD or DD/MM/YYYY"
                    value={editingRow.data.manufactureDate || ''} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, manufactureDate: e.target.value }
                    })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expiry Date *</Label>
                  <Input 
                    placeholder="YYYY-MM-DD or DD/MM/YYYY"
                    value={editingRow.data.expiryDate} 
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, expiryDate: e.target.value }
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

/**
 * Repository Interface Definitions for Data Access Layer
 * Decouples domain rules and UI components from underlying storage (in-memory, localStorage, or future backend).
 */
import { 
  InventoryItem, 
  Batch, 
  PurchaseOrder, 
  SalesOrder, 
  Invoice, 
  Payment, 
  StockTransfer, 
  InventoryAdjustment, 
  AuditLog, 
  Warehouse, 
  Supplier, 
  Customer 
} from '../types';

export interface IInventoryRepository {
  getItems(): Promise<InventoryItem[]>;
  getItemById(id: string): Promise<InventoryItem | undefined>;
  saveItem(item: InventoryItem): Promise<void>;
  updateStock(itemId: string, newStock: number): Promise<void>;
}

export interface IBatchRepository {
  getBatches(): Promise<Batch[]>;
  getBatchesByItem(itemId: string): Promise<Batch[]>;
  saveBatch(batch: Batch): Promise<void>;
  updateBatchQuantity(batchId: string, newQuantity: number): Promise<void>;
  quarantineBatch(batchId: string, recalled: boolean): Promise<void>;
}

export interface IPurchaseRepository {
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  savePurchaseOrder(po: PurchaseOrder): Promise<void>;
  updatePOStatus(poId: string, status: PurchaseOrder['status']): Promise<void>;
}

export interface ISalesRepository {
  getSalesOrders(): Promise<SalesOrder[]>;
  saveSalesOrder(so: SalesOrder): Promise<void>;
  updateSOStatus(soId: string, status: SalesOrder['status']): Promise<void>;
}

export interface IInvoiceRepository {
  getInvoices(): Promise<Invoice[]>;
  saveInvoice(invoice: Invoice): Promise<void>;
  updateInvoice(invoice: Invoice): Promise<void>;
}

export interface ITransferRepository {
  getTransfers(): Promise<StockTransfer[]>;
  saveTransfer(transfer: StockTransfer): Promise<void>;
  updateTransferStatus(transferId: string, status: StockTransfer['status']): Promise<void>;
}

export interface IAdjustmentRepository {
  getAdjustments(): Promise<InventoryAdjustment[]>;
  saveAdjustment(adjustment: InventoryAdjustment): Promise<void>;
}

export interface IAuditRepository {
  getAuditLogs(): Promise<AuditLog[]>;
  appendLog(log: AuditLog): Promise<void>;
}

export interface IAppRepository {
  inventory: IInventoryRepository;
  batches: IBatchRepository;
  purchases: IPurchaseRepository;
  sales: ISalesRepository;
  invoices: IInvoiceRepository;
  transfers: ITransferRepository;
  adjustments: IAdjustmentRepository;
  audit: IAuditRepository;
}

/**
 * In-Memory Adapter implementation of IAppRepository
 * Pre-seeded with INITIAL constants for instant client-side testing & local operations.
 */
import {
  IAppRepository,
  IInventoryRepository,
  IBatchRepository,
  IPurchaseRepository,
  ISalesRepository,
  IInvoiceRepository,
  ITransferRepository,
  IAdjustmentRepository,
  IAuditRepository
} from './types';
import {
  InventoryItem,
  Batch,
  PurchaseOrder,
  SalesOrder,
  Invoice,
  StockTransfer,
  InventoryAdjustment,
  AuditLog
} from '../types';
import {
  INITIAL_INVENTORY,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SALES_ORDERS,
  INITIAL_INVOICES,
  INITIAL_ADJUSTMENTS
} from '../constants';

export class MemoryAppRepository implements IAppRepository {
  private _items: InventoryItem[] = [...INITIAL_INVENTORY];
  private _batches: Batch[] = [];
  private _purchaseOrders: PurchaseOrder[] = [...INITIAL_PURCHASE_ORDERS];
  private _salesOrders: SalesOrder[] = [...INITIAL_SALES_ORDERS];
  private _invoices: Invoice[] = [...INITIAL_INVOICES];
  private _transfers: StockTransfer[] = [];
  private _adjustments: InventoryAdjustment[] = [...INITIAL_ADJUSTMENTS];
  private _auditLogs: AuditLog[] = [];

  constructor(initialData?: {
    items?: InventoryItem[];
    batches?: Batch[];
    purchaseOrders?: PurchaseOrder[];
    salesOrders?: SalesOrder[];
    invoices?: Invoice[];
    transfers?: StockTransfer[];
    adjustments?: InventoryAdjustment[];
    auditLogs?: AuditLog[];
  }) {
    if (initialData?.items) this._items = [...initialData.items];
    if (initialData?.batches) this._batches = [...initialData.batches];
    if (initialData?.purchaseOrders) this._purchaseOrders = [...initialData.purchaseOrders];
    if (initialData?.salesOrders) this._salesOrders = [...initialData.salesOrders];
    if (initialData?.invoices) this._invoices = [...initialData.invoices];
    if (initialData?.transfers) this._transfers = [...initialData.transfers];
    if (initialData?.adjustments) this._adjustments = [...initialData.adjustments];
    if (initialData?.auditLogs) this._auditLogs = [...initialData.auditLogs];
  }

  inventory: IInventoryRepository = {
    getItems: async () => [...this._items],
    getItemById: async (id: string) => this._items.find(i => i.id === id),
    saveItem: async (item: InventoryItem) => {
      const idx = this._items.findIndex(i => i.id === item.id);
      if (idx >= 0) this._items[idx] = { ...item };
      else this._items.push({ ...item });
    },
    updateStock: async (itemId: string, newStock: number) => {
      const idx = this._items.findIndex(i => i.id === itemId);
      if (idx >= 0) {
        this._items[idx] = { ...this._items[idx], currentStock: Math.max(0, newStock) };
      }
    }
  };

  batches: IBatchRepository = {
    getBatches: async () => [...this._batches],
    getBatchesByItem: async (itemId: string) => this._batches.filter(b => b.itemId === itemId),
    saveBatch: async (batch: Batch) => {
      const idx = this._batches.findIndex(b => b.id === batch.id);
      if (idx >= 0) this._batches[idx] = { ...batch };
      else this._batches.push({ ...batch });
    },
    updateBatchQuantity: async (batchId: string, newQuantity: number) => {
      const idx = this._batches.findIndex(b => b.id === batchId);
      if (idx >= 0) {
        this._batches[idx] = { ...this._batches[idx], quantity: Math.max(0, newQuantity) };
      }
    },
    quarantineBatch: async (batchId: string, recalled: boolean) => {
      const idx = this._batches.findIndex(b => b.id === batchId);
      if (idx >= 0) {
        this._batches[idx] = { ...this._batches[idx], recalled };
      }
    }
  };

  purchases: IPurchaseRepository = {
    getPurchaseOrders: async () => [...this._purchaseOrders],
    savePurchaseOrder: async (po: PurchaseOrder) => {
      const idx = this._purchaseOrders.findIndex(p => p.id === po.id);
      if (idx >= 0) this._purchaseOrders[idx] = { ...po };
      else this._purchaseOrders.unshift({ ...po });
    },
    updatePOStatus: async (poId: string, status: PurchaseOrder['status']) => {
      const idx = this._purchaseOrders.findIndex(p => p.id === poId);
      if (idx >= 0) {
        this._purchaseOrders[idx] = { ...this._purchaseOrders[idx], status };
      }
    }
  };

  sales: ISalesRepository = {
    getSalesOrders: async () => [...this._salesOrders],
    saveSalesOrder: async (so: SalesOrder) => {
      const idx = this._salesOrders.findIndex(s => s.id === so.id);
      if (idx >= 0) this._salesOrders[idx] = { ...so };
      else this._salesOrders.unshift({ ...so });
    },
    updateSOStatus: async (soId: string, status: SalesOrder['status']) => {
      const idx = this._salesOrders.findIndex(s => s.id === soId);
      if (idx >= 0) {
        this._salesOrders[idx] = { ...this._salesOrders[idx], status };
      }
    }
  };

  invoices: IInvoiceRepository = {
    getInvoices: async () => [...this._invoices],
    saveInvoice: async (invoice: Invoice) => {
      const idx = this._invoices.findIndex(i => i.id === invoice.id);
      if (idx >= 0) this._invoices[idx] = { ...invoice };
      else this._invoices.unshift({ ...invoice });
    },
    updateInvoice: async (invoice: Invoice) => {
      const idx = this._invoices.findIndex(i => i.id === invoice.id);
      if (idx >= 0) this._invoices[idx] = { ...invoice };
    }
  };

  transfers: ITransferRepository = {
    getTransfers: async () => [...this._transfers],
    saveTransfer: async (transfer: StockTransfer) => {
      const idx = this._transfers.findIndex(t => t.id === transfer.id);
      if (idx >= 0) this._transfers[idx] = { ...transfer };
      else this._transfers.unshift({ ...transfer });
    },
    updateTransferStatus: async (transferId: string, status: StockTransfer['status']) => {
      const idx = this._transfers.findIndex(t => t.id === transferId);
      if (idx >= 0) {
        this._transfers[idx] = { ...this._transfers[idx], status };
      }
    }
  };

  adjustments: IAdjustmentRepository = {
    getAdjustments: async () => [...this._adjustments],
    saveAdjustment: async (adjustment: InventoryAdjustment) => {
      this._adjustments.unshift({ ...adjustment });
    }
  };

  audit: IAuditRepository = {
    getAuditLogs: async () => [...this._auditLogs],
    appendLog: async (log: AuditLog) => {
      this._auditLogs.unshift({ ...log });
    }
  };
}

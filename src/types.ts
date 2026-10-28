export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  category: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Batch {
  id: string;
  itemId: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  warehouseId: string;
  recalled?: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  unit: string;
  currentStock: number; // Total across all warehouses
  minStock: number;
  dailyConsumption: number;
  leadTime: number;
  safetyStock: number;
  description?: string;
  image?: string;
  hsnCode?: string;
  gstRate?: number; // E.g. 0, 5, 12, 18, 28
  variants?: {
    size?: string;
    color?: string;
    [key: string]: any;
  };
}

export interface StockLevel {
  itemId: string;
  warehouseId: string;
  quantity: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  date: string;
  status: 'pending' | 'received' | 'cancelled';
  items: {
    itemId: string;
    quantity: number;
    rate: number;
  }[];
  totalAmount: number;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  email: string;
  address?: string;
  gstin?: string;
  state?: string;
}

export interface Invoice {
  id: string;
  orderId: string; // Refers to SalesOrder or PurchaseOrder id
  orderType: 'sales' | 'purchase';
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'unpaid' | 'partial' | 'paid' | 'overdue' | 'void';
  irn?: string;
  ackNumber?: string;
  ackDate?: string;
  irnGenerated?: boolean;
  cgst?: number;
  sgst?: number;
  igst?: number;
  taxableAmount?: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  date: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'check' | 'other';
  reference?: string;
}

export interface SalesOrder {
  id: string;
  customerId: string;
  customerName: string; // Keeping for legacy/convenience
  date: string;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  items: {
    itemId: string;
    quantity: number;
    rate: number;
  }[];
  totalAmount: number;
}

export interface InventoryAdjustment {
  id: string;
  itemId: string;
  warehouseId: string;
  type: 'damage' | 'theft' | 'return' | 'correction';
  quantity: number; // positive for addition, negative for deduction
  date: string;
  reason: string;
  disposition?: 'Quarantined' | 'Scrapped' | 'Returned to Supplier' | 'Sold at Discount' | 'Repaired';
  severity?: 'Minor' | 'Moderate' | 'Severe' | 'Total Loss';
}

export interface StockTransfer {
  id: string;
  itemId: string;
  quantity: number;
  sourceWarehouseId: string;
  destWarehouseId: string;
  date: string;
  status: 'pending' | 'transit' | 'received' | 'cancelled';
  trackingNumber: string;
  carrier: string;
  notes?: string;
}

export interface BranchSyncStatus {
  warehouseId: string;
  lastSyncedAt: string;
  syncStatus: 'synced' | 'pending_sync' | 'error' | 'syncing';
  unresolvedChangesCount: number;
  latencyMs: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
}

export interface ProductionItem {
  id: string;
  itemId: string;
  itemName: string;
  plannedQty: number;
  plannedRate: number;
  actualQty?: number;
  actualRate?: number;
}

export interface ProductionOrder {
  id: string;
  date: string;
  items: ProductionItem[];
  status: 'planned' | 'completed';
}

export interface ReorderPrediction {
  itemId: string;
  itemName: string;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  needsReorder: boolean;
}

export interface VarianceAnalysis {
  itemId: string;
  itemName: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  status: 'profit' | 'loss' | 'neutral';
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'inventory_manager' | 'billing_clerk' | 'staff_viewer';
  lastActive?: string;
  permissions: {
    editInventory: boolean;
    manageBatches: boolean;
    makeAdjustments: boolean;
    executeRecall: boolean;
    manageSuppliers: boolean;
    createOrders: boolean;
    recordPayments: boolean;
    viewReports: boolean;
    manageStaff: boolean;
  };
}

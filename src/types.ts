export interface Warehouse {
  id: string;
  name: string;
  location: string;
  legalName?: string;
  gstin?: string;
  addressLines?: string[];
  stateCode?: string; // E.g. '27' for Maharashtra
  state?: string;
  pin?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  category: string;
  legalName?: string;
  gstin?: string;
  addressLines?: string[];
  stateCode?: string;
  state?: string;
  pin?: string;
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
  uqc?: string; // Unit Quantity Code (e.g., KGS, MTR, PCS, NOS)
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

export interface PurchaseOrderItem {
  itemId: string;
  quantity: number;
  rate: number;
  receivedQuantity?: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  date: string;
  status: 'draft' | 'pending' | 'partially_received' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  destinationWarehouseId?: string;
  receivedDate?: string;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  email: string;
  address?: string;
  legalName?: string;
  addressLines?: string[];
  gstin?: string;
  stateCode?: string;
  state?: string;
  pin?: string;
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
  transporterId?: string;
  transporterName?: string;
  transportMode?: 'Road' | 'Rail' | 'Air' | 'Ship';
  vehicleNumber?: string;
  approxDistanceKm?: number;
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

export type EwayBillStatus = 'ACT' | 'CNL' | 'EXP';
export type EwayBillDocType = 'INV' | 'CHL' | 'BIL';
export type EwayBillTransportMode = 'Road' | 'Rail' | 'Air' | 'Ship';
export type EwayBillVehicleType = 'R' | 'O'; // R = Regular, O = Over Dimensional Cargo

export interface EwayBillItem {
  itemNo: number;
  productId?: string;
  productName: string;
  hsnCode: string;
  quantity: number;
  qtyUnit: string;
  taxableAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate?: number;
}

export interface EwayBill {
  id: string;
  ewbNo: string; // 12-digit e-way bill number
  ewbDate: string; // ISO string or statutory format
  validUpto: string; // ISO string
  docType: EwayBillDocType;
  docNo: string;
  docDate: string;
  documentRefId: string; // Invoice ID or StockTransfer ID
  documentRefType: 'invoice' | 'transfer';
  status: EwayBillStatus;
  genMode: 'mock' | 'sandbox' | 'live';
  isSandbox: boolean; // Flag showing "SANDBOX - NOT A REAL E-WAY BILL"
  
  // From details (Dispatching Warehouse)
  fromWarehouseId?: string;
  fromGstin: string;
  fromTrdName: string;
  fromAddr1: string;
  fromPlace: string;
  fromPincode: string;
  fromStateCode: string;
  actFromStateCode: string;

  // To details (Recipient Customer or Receiving Warehouse)
  toCustomerId?: string;
  toWarehouseId?: string;
  toGstin: string;
  toTrdName: string;
  toAddr1: string;
  toPlace: string;
  toPincode: string;
  toStateCode: string;
  actToStateCode: string;

  // Values & Taxes
  totalValue: number;
  taxableAmount: number;
  cgstValue: number;
  sgstValue: number;
  igstValue: number;
  cessValue: number;

  // Transport details (Part-B)
  transMode: EwayBillTransportMode;
  transporterId?: string;
  transporterName?: string;
  transDocNo?: string;
  transDocDate?: string;
  vehicleNumber?: string;
  vehicleType: EwayBillVehicleType;
  approxDistanceKm: number;

  // Cancellation details
  cancelDate?: string;
  cancelReason?: string; // '1: Duplicate' | '2: Order Cancelled' | '3: Data Entry Mistake' | '4: Others'
  cancelRemarks?: string;

  // Vehicle update history
  vehicleUpdates?: {
    updatedAt: string;
    oldVehicleNumber?: string;
    newVehicleNumber: string;
    fromPlace: string;
    fromState: string;
    reason: string;
    transDocNo?: string;
  }[];

  items: EwayBillItem[];
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string; // E.g. CHL-2026-001
  challanDate: string;
  transferId: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  fromLegalName: string;
  fromGstin: string;
  fromAddress: string;
  fromStateCode: string;
  fromPin: string;
  toLegalName: string;
  toGstin: string;
  toAddress: string;
  toStateCode: string;
  toPin: string;
  itemId: string;
  itemName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  declaredValue: number;
  reasonForTransportation: 'Supply' | 'For Own Use' | 'Job Work' | 'Others';
  isSameGstin: boolean;
  distinctPersonsNotice?: string;
}

export interface EwayBillSettings {
  interStateThreshold: number; // Default 50,000
  stateThresholdOverrides: Record<string, number>; // State code -> threshold (e.g. '33': 100,000 for TN)
  cancellationWindowHours: number; // Default 24 hours
  regularKmPerDay: number; // Default 200 km/day
  odcKmPerDay: number; // Default 20 km/day
  enableShipToGstin: boolean; // Optional toggle, default false
  enableVoluntaryClosure: boolean; // Optional toggle, default false
  accountantConfirmationNote: string; // "Confirm current rules with your accountant."
}

export interface EwayBillGenerateRequest {
  documentRefId: string;
  documentRefType: 'invoice' | 'transfer';
  docType: EwayBillDocType;
  docNo: string;
  docDate: string;
  fromWarehouse: Warehouse;
  toParty: {
    gstin?: string;
    legalName?: string;
    tradeName?: string;
    addressLines?: string[];
    place: string;
    stateCode: string;
    pin: string;
  };
  items: {
    productId?: string;
    productName: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    taxableAmount: number;
    gstRate: number;
  }[];
  transMode: EwayBillTransportMode;
  transporterId?: string;
  transporterName?: string;
  vehicleNumber?: string;
  vehicleType?: EwayBillVehicleType;
  approxDistanceKm: number;
  isExemptGoods?: boolean;
}

export interface EwayBillUpdateVehicleRequest {
  newVehicleNumber: string;
  fromPlace: string;
  fromState: string;
  reason: string;
  transDocNo?: string;
  transMode?: EwayBillTransportMode;
}

export interface EwayBillCancelRequest {
  cancelReason: string; // '1' | '2' | '3' | '4'
  cancelRemarks: string;
}


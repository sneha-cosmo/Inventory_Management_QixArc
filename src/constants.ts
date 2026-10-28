import { InventoryItem, ProductionOrder, Warehouse, Category, Customer, Invoice, Payment, SalesOrder, Supplier, PurchaseOrder, InventoryAdjustment } from './types';

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: '1',
    name: 'Fabric (Cotton)',
    sku: 'FAB-COT-001',
    barcode: '5012345678901',
    categoryId: 'cat-1',
    currentStock: 500,
    minStock: 200,
    dailyConsumption: 50,
    leadTime: 5,
    safetyStock: 100,
    unit: 'kg',
    hsnCode: '5208',
    gstRate: 5
  },
  {
    id: '2',
    name: 'Thread (Polyester)',
    sku: 'THR-POL-001',
    barcode: '5012345678902',
    categoryId: 'cat-2',
    currentStock: 80,
    minStock: 100,
    dailyConsumption: 50,
    leadTime: 3,
    safetyStock: 40,
    unit: 'cones',
    hsnCode: '5401',
    gstRate: 12
  },
  {
    id: '3',
    name: 'Buttons (Standard)',
    sku: 'BTN-STD-001',
    barcode: '5012345678903',
    categoryId: 'cat-3',
    currentStock: 2000,
    minStock: 500,
    dailyConsumption: 200,
    leadTime: 7,
    safetyStock: 300,
    unit: 'pcs',
    hsnCode: '9606',
    gstRate: 18
  },
  {
    id: '4',
    name: 'Golden Zari Lace',
    sku: 'LAC-ZAR-001',
    barcode: '5012345678904',
    categoryId: 'cat-3',
    currentStock: 450,
    minStock: 50,
    dailyConsumption: 0,
    leadTime: 10,
    safetyStock: 10,
    unit: 'meters',
    hsnCode: '5808',
    gstRate: 12
  },
  {
    id: '5',
    name: 'Heavy Denim Roll (14oz)',
    sku: 'DEN-14O-001',
    barcode: '5012345678905',
    categoryId: 'cat-1',
    currentStock: 120,
    minStock: 80,
    dailyConsumption: 0,
    leadTime: 12,
    safetyStock: 20,
    unit: 'meters',
    hsnCode: '5209',
    gstRate: 5
  },
  {
    id: '6',
    name: 'Premium Nickel Rivets',
    sku: 'RIV-NIK-001',
    barcode: '5012345678906',
    categoryId: 'cat-3',
    currentStock: 8000,
    minStock: 2000,
    dailyConsumption: 1,
    leadTime: 15,
    safetyStock: 100,
    unit: 'pcs',
    hsnCode: '7318',
    gstRate: 18
  }
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'Main Warehouse', location: 'Mumbai' },
  { id: 'wh-2', name: 'Secondary Depot', location: 'Pune' }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Fabrics' },
  { id: 'cat-2', name: 'Threads' },
  { id: 'cat-3', name: 'Accessories' }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'Elite Apparels', email: 'billing@elite.com', contact: '+91 98765 43210', address: 'Bandra, Mumbai, MH', state: 'Maharashtra', gstin: '27AAAAA1111A1Z1' },
  { id: 'cust-2', name: 'Global Textiles', email: 'finance@global.com', contact: '+91 91234 56789', address: 'Viman Nagar, Pune, MH', state: 'Maharashtra', gstin: '27BBBBB2222B2Z2' },
  { id: 'cust-3', name: 'Karnat Apparel Hub', email: 'contact@karnathub.com', contact: '+91 93333 44444', address: 'Indiranagar, Bengaluru, KA', state: 'Karnataka', gstin: '29CCCCC3333C3Z3' }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'INV-001',
    orderId: 'SO-001',
    orderType: 'sales',
    date: '2024-05-10',
    dueDate: '2024-05-24',
    totalAmount: 26250,
    paidAmount: 26250,
    status: 'paid',
    taxableAmount: 25000,
    cgst: 625,
    sgst: 625,
    igst: 0,
    irnGenerated: true,
    irn: '5f89c6742a1b90c375d8ebd14e8fbf3a47bce12745a90d81eefc54bdc82ef941',
    ackNumber: '1029384756',
    ackDate: '2024-05-10 10:45:00'
  },
  {
    id: 'INV-002',
    orderId: 'SO-002',
    orderType: 'sales',
    date: '2024-05-12',
    dueDate: '2024-05-26',
    totalAmount: 20720,
    paidAmount: 5000,
    status: 'partial',
    taxableAmount: 18500,
    cgst: 1110,
    sgst: 1110,
    igst: 0
  }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'PAY-001',
    invoiceId: 'INV-001',
    date: '2024-05-11',
    amount: 26250,
    method: 'bank_transfer',
    reference: 'TXN12345678'
  },
  {
    id: 'PAY-002',
    invoiceId: 'INV-002',
    date: '2024-05-13',
    amount: 5000,
    method: 'cash'
  }
];

export const INITIAL_SALES_ORDERS: SalesOrder[] = [
  {
    id: 'SO-001',
    customerId: 'cust-1',
    customerName: 'Elite Apparels',
    date: '2024-05-10',
    status: 'delivered',
    items: [{ itemId: '1', quantity: 100, rate: 250 }],
    totalAmount: 26250
  },
  {
    id: 'SO-002',
    customerId: 'cust-2',
    customerName: 'Global Textiles',
    date: '2024-05-12',
    status: 'shipped',
    items: [{ itemId: '2', quantity: 185, rate: 100 }],
    totalAmount: 20720
  }
];

export const INITIAL_ORDERS: ProductionOrder[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'Cotton Fields India', contact: '+91 94444 55555', email: 'sales@cottonfields.in', category: 'Fabrics' },
  { id: 'sup-2', name: 'Ace Thread Distributors', contact: '+91 95555 66666', email: 'orders@acethreads.com', category: 'Threads' },
  { id: 'sup-3', name: 'Standard Button Co.', contact: '+91 96666 77777', email: 'info@standardbuttons.com', category: 'Accessories' }
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-001',
    supplierId: 'sup-1',
    date: '2026-05-15',
    status: 'received',
    items: [
      { itemId: '1', quantity: 300, rate: 135 }
    ],
    totalAmount: 40500
  },
  {
    id: 'PO-002',
    supplierId: 'sup-2',
    date: '2026-05-18',
    status: 'received',
    items: [
      { itemId: '2', quantity: 50, rate: 55 }
    ],
    totalAmount: 2750
  },
  {
    id: 'PO-003',
    supplierId: 'sup-3',
    date: '2026-05-22',
    status: 'received',
    items: [
      { itemId: '3', quantity: 1500, rate: 8 }
    ],
    totalAmount: 12000
  }
];

export const INITIAL_ADJUSTMENTS: InventoryAdjustment[] = [
  { id: 'ADJ-001', itemId: '1', warehouseId: 'wh-1', type: 'damage', quantity: -15, date: '2026-05-10', reason: 'Water damage during severe rain at Mumbai Main Warehouse', severity: 'Severe', disposition: 'Quarantined' },
  { id: 'ADJ-002', itemId: '3', warehouseId: 'wh-2', type: 'damage', quantity: -50, date: '2026-05-14', reason: 'Pest infestation in secondary bin at Pune', severity: 'Total Loss', disposition: 'Scrapped' },
  { id: 'ADJ-003', itemId: '4', warehouseId: 'wh-2', type: 'damage', quantity: -10, date: '2026-05-22', reason: 'Friction tear during inter-depot transit', severity: 'Minor', disposition: 'Sold at Discount' },
  { id: 'ADJ-004', itemId: '2', warehouseId: 'wh-1', type: 'return', quantity: 20, date: '2026-05-25', reason: 'Unused thread spool core return' }
];



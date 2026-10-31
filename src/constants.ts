import { InventoryItem, ProductionOrder, Warehouse, Category, Customer, Invoice, Payment, SalesOrder, Supplier, PurchaseOrder, InventoryAdjustment, EwayBill } from './types';

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
    uqc: 'KGS',
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
    uqc: 'CON',
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
    uqc: 'PCS',
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
    uqc: 'MTR',
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
    uqc: 'MTR',
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
    uqc: 'PCS',
    hsnCode: '7318',
    gstRate: 18
  }
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  { 
    id: 'wh-1', 
    name: 'Main Warehouse', 
    location: 'Mumbai',
    legalName: 'InvPredict Manufacturing Central Hub',
    gstin: '27AAAAA0000A1Z5',
    addressLines: ['Plot 12, Industrial Area, Andheri East'],
    stateCode: '27',
    state: 'Maharashtra',
    pin: '400001'
  },
  { 
    id: 'wh-2', 
    name: 'Secondary Depot', 
    location: 'Pune',
    legalName: 'InvPredict Regional Logistics Depot',
    gstin: '27AAAAA0000A1Z5',
    addressLines: ['Sector 4, MIDC, Viman Nagar'],
    stateCode: '27',
    state: 'Maharashtra',
    pin: '411014'
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Fabrics' },
  { id: 'cat-2', name: 'Threads' },
  { id: 'cat-3', name: 'Accessories' }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { 
    id: 'cust-1', 
    name: 'Elite Apparels', 
    legalName: 'Elite Apparels Private Limited',
    email: 'billing@elite.com', 
    contact: '+91 98765 43210', 
    address: 'Bandra, Mumbai, MH', 
    addressLines: ['402 Business Point, Turner Road, Bandra West'],
    state: 'Maharashtra', 
    stateCode: '27',
    pin: '400050',
    gstin: '27AAAAA1111A1Z1' 
  },
  { 
    id: 'cust-2', 
    name: 'Global Textiles', 
    legalName: 'Global Textiles LLP',
    email: 'finance@global.com', 
    contact: '+91 91234 56789', 
    address: 'Viman Nagar, Pune, MH', 
    addressLines: ['Suite 10, Commerce Towers, Viman Nagar'],
    state: 'Maharashtra', 
    stateCode: '27',
    pin: '411014',
    gstin: '27BBBBB2222B2Z2' 
  },
  { 
    id: 'cust-3', 
    name: 'Karnat Apparel Hub', 
    legalName: 'Karnat Apparel Hub Enterprises',
    email: 'contact@karnathub.com', 
    contact: '+91 93333 44444', 
    address: 'Indiranagar, Bengaluru, KA', 
    addressLines: ['12 100ft Road, HAL 2nd Stage, Indiranagar'],
    state: 'Karnataka', 
    stateCode: '29',
    pin: '560038',
    gstin: '29CCCCC3333C3Z3' 
  }
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

export const INITIAL_ORDERS: ProductionOrder[] = [
  {
    id: 'ORD-2026-001',
    date: '2026-05-15',
    status: 'completed',
    items: [
      {
        id: 'pi-1',
        itemId: '1',
        itemName: 'Fabric (Cotton)',
        plannedQty: 100,
        plannedRate: 40,
        actualQty: 110,
        actualRate: 40
      }
    ]
  },
  {
    id: 'ORD-2026-002',
    date: '2026-05-20',
    status: 'completed',
    items: [
      {
        id: 'pi-2',
        itemId: '2',
        itemName: 'Thread (Polyester)',
        plannedQty: 50,
        plannedRate: 35,
        actualQty: 48,
        actualRate: 35
      }
    ]
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { 
    id: 'sup-1', 
    name: 'Cotton Fields India', 
    legalName: 'Cotton Fields India Pvt Ltd',
    contact: '+91 94444 55555', 
    email: 'sales@cottonfields.in', 
    category: 'Fabrics',
    gstin: '27AAAAA9999A1Z9',
    stateCode: '27',
    state: 'Maharashtra',
    pin: '400018',
    addressLines: ['Textile Park, Lower Parel, Mumbai']
  },
  { 
    id: 'sup-2', 
    name: 'Ace Thread Distributors', 
    legalName: 'Ace Thread Distributors Co.',
    contact: '+91 95555 66666', 
    email: 'orders@acethreads.com', 
    category: 'Threads',
    gstin: '27BBBBB8888B1Z8',
    stateCode: '27',
    state: 'Maharashtra',
    pin: '411001',
    addressLines: ['Camp Industrial Estate, Pune']
  },
  { 
    id: 'sup-3', 
    name: 'Standard Button Co.', 
    legalName: 'Standard Button & Fastener Ltd',
    contact: '+91 96666 77777', 
    email: 'info@standardbuttons.com', 
    category: 'Accessories',
    gstin: '29CCCCC7777C1Z7',
    stateCode: '29',
    state: 'Karnataka',
    pin: '560002',
    addressLines: ['Peenya Industrial Area, Bengaluru']
  }
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

export const INITIAL_EWAY_BILLS: EwayBill[] = [
  {
    id: 'EWB-001',
    ewbNo: '101928374650',
    ewbDate: '2026-05-27T10:00:00.000Z',
    validUpto: '2026-05-29T23:59:59.000Z',
    docType: 'CHL',
    docNo: 'CHL-AWB-109038',
    docDate: '2026-05-27',
    documentRefId: 'TRF-002',
    documentRefType: 'transfer',
    status: 'ACT',
    genMode: 'mock',
    isSandbox: true,
    fromWarehouseId: 'wh-2',
    fromGstin: '27AAAAA0000A1Z5',
    fromTrdName: 'InvPredict Regional Logistics Depot',
    fromAddr1: 'Sector 4, MIDC, Viman Nagar',
    fromPlace: 'Pune',
    fromPincode: '411014',
    fromStateCode: '27',
    actFromStateCode: '27',
    toWarehouseId: 'wh-1',
    toGstin: '27AAAAA0000A1Z5',
    toTrdName: 'InvPredict Manufacturing Central Hub',
    toAddr1: 'Plot 12, Industrial Area, Andheri East',
    toPlace: 'Mumbai',
    toPincode: '400001',
    toStateCode: '27',
    actToStateCode: '27',
    totalValue: 12000,
    taxableAmount: 12000,
    cgstValue: 0,
    sgstValue: 0,
    igstValue: 0,
    cessValue: 0,
    transMode: 'Road',
    transporterName: 'Delhivery Surface Logistics',
    vehicleNumber: 'MH14CD5678',
    vehicleType: 'R',
    approxDistanceKm: 150,
    items: [
      {
        itemNo: 1,
        productId: '4',
        productName: 'Golden Border Lace',
        hsnCode: '5808',
        quantity: 100,
        qtyUnit: 'meters',
        taxableAmount: 12000,
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0
      }
    ]
  }
];




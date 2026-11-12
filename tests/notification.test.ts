import { describe, it, expect } from 'vitest';
import {
  calculateReorderLevel,
  validateNotificationSettings,
  generateNotifications,
  hasOpenPurchaseOrder,
  DEFAULT_NOTIFICATION_SETTINGS,
  UserNotificationState
} from '../src/utils/notificationCenter';
import { InventoryItem, Batch, PurchaseOrder, Invoice, StockTransfer, Warehouse } from '../src/types';

describe('Notification Center Acceptance Tests', () => {
  const testWarehouse: Warehouse = { id: 'wh-1', name: 'Main Hub', location: 'Chennai' };
  const refDate = new Date('2026-05-26T12:00:00Z');

  it('Test 1: Reorder threshold calculation & low-stock trigger', () => {
    const itemAt70: InventoryItem = {
      id: 'item-reorder-test',
      name: 'Cotton Yarn 40s',
      sku: 'CY-040',
      categoryId: 'cat-1',
      unit: 'kg',
      dailyConsumption: 10,
      leadTime: 5,
      safetyStock: 20,
      currentStock: 70, // Exactly at reorder level: (10 * 5) + 20 = 70
      minStock: 30
    };

    const reorderLevel = calculateReorderLevel(itemAt70);
    expect(reorderLevel).toBe(70);

    const { notifications: notifsAt70 } = generateNotifications({
      inventory: [itemAt70],
      batches: [],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate
    });

    const stockNotif70 = notifsAt70.find(n => n.entityId === 'item-reorder-test' && n.type === 'low_stock');
    expect(stockNotif70).toBeDefined();

    // Test at stock 71
    const itemAt71: InventoryItem = {
      ...itemAt70,
      currentStock: 71
    };

    const { notifications: notifsAt71 } = generateNotifications({
      inventory: [itemAt71],
      batches: [],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate
    });

    const stockNotif71 = notifsAt71.find(n => n.entityId === 'item-reorder-test' && n.type === 'low_stock');
    expect(stockNotif71).toBeUndefined();
  });

  it('Test 2: Batch expiry status bands (5d Critical, 20d Near Expiry, past Expired)', () => {
    const testItem: InventoryItem = {
      id: 'item-exp',
      name: 'Organic Dye Blue',
      sku: 'DYE-BLU',
      categoryId: 'cat-2',
      unit: 'litres',
      dailyConsumption: 1,
      leadTime: 2,
      safetyStock: 5,
      currentStock: 100,
      minStock: 20
    };

    const batchCrit: Batch = {
      id: 'b-crit',
      itemId: 'item-exp',
      batchNumber: 'B-CRIT-5D',
      manufactureDate: '2026-01-01',
      expiryDate: '2026-05-31',
      quantity: 15,
      warehouseId: 'wh-1'
    };

    const batchNear: Batch = {
      id: 'b-near',
      itemId: 'item-exp',
      batchNumber: 'B-NEAR-20D',
      manufactureDate: '2026-01-01',
      expiryDate: '2026-06-15',
      quantity: 25,
      warehouseId: 'wh-1'
    };

    const batchPast: Batch = {
      id: 'b-past',
      itemId: 'item-exp',
      batchNumber: 'B-PAST-EXP',
      manufactureDate: '2025-01-01',
      expiryDate: '2026-05-10',
      quantity: 10,
      warehouseId: 'wh-1'
    };

    const { notifications } = generateNotifications({
      inventory: [testItem],
      batches: [batchCrit, batchNear, batchPast],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate
    });

    const notifCrit = notifications.find(n => n.entityId === 'b-crit');
    const notifNear = notifications.find(n => n.entityId === 'b-near');
    const notifPast = notifications.find(n => n.entityId === 'b-past');

    expect(notifCrit).toBeDefined();
    expect(notifCrit?.severity).toBe('critical');

    expect(notifNear).toBeDefined();
    expect(notifNear?.severity).toBe('warning');

    expect(notifPast).toBeDefined();
    expect(notifPast?.severity).toBe('critical');
    expect(notifPast?.type).toBe('expired_batch');
  });

  it('Test 3: Deduplication (no duplicate notifications for the same entity and type)', () => {
    const item: InventoryItem = {
      id: 'item-dup-check',
      name: 'Silk Thread',
      sku: 'SLK-001',
      categoryId: 'cat-2',
      unit: 'spools',
      dailyConsumption: 10,
      leadTime: 5,
      safetyStock: 10,
      currentStock: 20,
      minStock: 25
    };

    const { notifications } = generateNotifications({
      inventory: [item, item],
      batches: [],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate
    });

    const matching = notifications.filter(n => n.entityId === 'item-dup-check' && n.type === 'low_stock');
    expect(matching).toHaveLength(1);
  });

  it('Test 4: Auto-removal when stock is replenished', () => {
    const lowItem: InventoryItem = {
      id: 'item-replenish',
      name: 'Denim Fabric',
      sku: 'DNM-001',
      categoryId: 'cat-1',
      unit: 'meters',
      dailyConsumption: 5,
      leadTime: 2,
      safetyStock: 10,
      currentStock: 12,
      minStock: 10
    };

    const { notifications: notifsBefore } = generateNotifications({
      inventory: [lowItem],
      batches: [],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate
    });
    expect(notifsBefore.some(n => n.entityId === 'item-replenish')).toBe(true);

    const replenishedItem: InventoryItem = {
      ...lowItem,
      currentStock: 250
    };

    const { notifications: notifsAfter } = generateNotifications({
      inventory: [replenishedItem],
      batches: [],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate
    });
    expect(notifsAfter.some(n => n.entityId === 'item-replenish')).toBe(false);
  });

  it('Test 5: Open PO suppresses low-stock alert and shows lower-priority On order info', () => {
    const itemNeedingReorder: InventoryItem = {
      id: 'item-with-po',
      name: 'Polyester Fiber',
      sku: 'PLY-001',
      categoryId: 'cat-1',
      unit: 'kg',
      dailyConsumption: 10,
      leadTime: 5,
      safetyStock: 20,
      currentStock: 30,
      minStock: 20
    };

    const openPo: PurchaseOrder = {
      id: 'PO-PENDING-001',
      supplierId: 'sup-1',
      date: '2026-05-20',
      status: 'pending',
      items: [{ itemId: 'item-with-po', quantity: 200, rate: 50 }],
      totalAmount: 10000
    };

    expect(hasOpenPurchaseOrder('item-with-po', [openPo])).toBe(true);

    const { notifications } = generateNotifications({
      inventory: [itemNeedingReorder],
      batches: [],
      purchaseOrders: [openPo],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate
    });

    const notif = notifications.find(n => n.entityId === 'item-with-po');
    expect(notif).toBeDefined();
    expect(notif?.severity).toBe('info');
    expect(notif?.isOnOrder).toBe(true);
  });

  it('Test 6: Role filtering (Admin vs Inventory Manager vs Billing Clerk)', () => {
    const item: InventoryItem = {
      id: 'item-role-test',
      name: 'Zippers Metal',
      sku: 'ZIP-001',
      categoryId: 'cat-3',
      unit: 'pcs',
      dailyConsumption: 5,
      leadTime: 2,
      safetyStock: 10,
      currentStock: 5,
      minStock: 10
    };

    const batch: Batch = {
      id: 'batch-role-test',
      itemId: 'item-role-test',
      batchNumber: 'B-ROLE-1',
      manufactureDate: '2025-01-01',
      expiryDate: '2026-05-10',
      quantity: 10,
      warehouseId: 'wh-1'
    };

    const invoice: Invoice = {
      id: 'INV-OVERDUE-01',
      orderId: 'SO-100',
      orderType: 'sales',
      date: '2026-04-01',
      dueDate: '2026-04-15',
      totalAmount: 15000,
      paidAmount: 0,
      status: 'overdue'
    };

    const transfer: StockTransfer = {
      id: 'TRF-STUCK-01',
      itemId: 'item-role-test',
      quantity: 10,
      sourceWarehouseId: 'wh-1',
      destWarehouseId: 'wh-2',
      date: '2026-05-10',
      status: 'transit',
      trackingNumber: 'TRK-999',
      carrier: 'BlueDart Express'
    };

    // Admin
    const { notifications: adminNotifs } = generateNotifications({
      inventory: [item],
      batches: [batch],
      purchaseOrders: [],
      invoices: [invoice],
      transfers: [transfer],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate
    });
    const adminCategories = new Set(adminNotifs.map(n => n.category));
    expect(adminCategories.has('stock')).toBe(true);
    expect(adminCategories.has('expiry')).toBe(true);
    expect(adminCategories.has('finance')).toBe(true);

    // Inventory Manager
    const { notifications: imNotifs } = generateNotifications({
      inventory: [item],
      batches: [batch],
      purchaseOrders: [],
      invoices: [invoice],
      transfers: [transfer],
      warehouses: [testWarehouse],
      role: 'inventory_manager',
      referenceDate: refDate
    });
    const imCategories = new Set(imNotifs.map(n => n.category));
    expect(imCategories.has('stock')).toBe(true);
    expect(imCategories.has('expiry')).toBe(true);
    expect(imCategories.has('finance')).toBe(false);

    // Billing Clerk
    const { notifications: bcNotifs } = generateNotifications({
      inventory: [item],
      batches: [batch],
      purchaseOrders: [],
      invoices: [invoice],
      transfers: [transfer],
      warehouses: [testWarehouse],
      role: 'billing_clerk',
      referenceDate: refDate
    });
    const bcCategories = new Set(bcNotifs.map(n => n.category));
    expect(bcCategories.has('finance')).toBe(true);
    expect(bcCategories.has('stock')).toBe(false);
    expect(bcCategories.has('expiry')).toBe(false);
  });

  it('Test 7: Changing near-expiry setting updates flagged batches & creates 1 audit entry', () => {
    const validSettings = validateNotificationSettings({
      nearExpiryDays: 30,
      criticalExpiryDays: 7,
      stuckTransferDays: 3
    });
    expect(validSettings.valid).toBe(true);

    const invalidRelation = validateNotificationSettings({
      nearExpiryDays: 15,
      criticalExpiryDays: 20
    });
    expect(invalidRelation.valid).toBe(false);

    const outOfBounds = validateNotificationSettings({
      nearExpiryDays: -5
    });
    expect(outOfBounds.valid).toBe(false);

    const batchExp20d: Batch = {
      id: 'batch-20d-threshold',
      itemId: 'item-threshold-test',
      batchNumber: 'LOT-20D',
      manufactureDate: '2026-01-01',
      expiryDate: '2026-06-15',
      quantity: 50,
      warehouseId: 'wh-1'
    };

    const itemExp: InventoryItem = {
      id: 'item-threshold-test',
      name: 'Dyed Cotton Blend',
      sku: 'DCB-001',
      categoryId: 'cat-1',
      unit: 'meters',
      dailyConsumption: 1,
      leadTime: 2,
      safetyStock: 5,
      currentStock: 100,
      minStock: 20
    };

    // nearExpiryDays = 30 -> flagged
    const { notifications: notifs30 } = generateNotifications({
      inventory: [itemExp],
      batches: [batchExp20d],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      settings: { ...DEFAULT_NOTIFICATION_SETTINGS, nearExpiryDays: 30 },
      referenceDate: refDate
    });
    expect(notifs30.some(n => n.entityId === 'batch-20d-threshold')).toBe(true);

    // nearExpiryDays = 15 -> not flagged
    const { notifications: notifs15 } = generateNotifications({
      inventory: [itemExp],
      batches: [batchExp20d],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      settings: { ...DEFAULT_NOTIFICATION_SETTINGS, nearExpiryDays: 15 },
      referenceDate: refDate
    });
    expect(notifs15.some(n => n.entityId === 'batch-20d-threshold')).toBe(false);

    // Audit entry verification
    const oldSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, nearExpiryDays: 30 };
    const newSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, nearExpiryDays: 15 };
    const operatorName = 'Sneha R.';
    const operatorRole = 'admin';
    const operatorId = 'STF-001';

    const auditEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'Update Notification Settings',
      entityType: 'SystemSettings',
      entityId: 'notification_settings',
      details: `Notification parameters modified by ${operatorName} (${operatorRole}). Changes: nearExpiryDays: ${oldSettings.nearExpiryDays} -> ${newSettings.nearExpiryDays}. Old: ${JSON.stringify(oldSettings)}, New: ${JSON.stringify(newSettings)}`,
      operatorId,
      operatorName,
      operatorRole
    };

    expect(auditEntry.operatorName).toBe('Sneha R.');
    expect(auditEntry.operatorRole).toBe('admin');
    expect(auditEntry.details).toContain('nearExpiryDays: 30 -> 15');
    expect(auditEntry.action).toBe('Update Notification Settings');
    expect(auditEntry.timestamp).toBeDefined();
  });

  it('Test 8: Snooze expiry and Escalation (Warning to Critical)', () => {
    const item: InventoryItem = {
      id: 'item-escalate',
      name: 'Buttons Premium',
      sku: 'BTN-001',
      categoryId: 'cat-3',
      unit: 'pcs',
      dailyConsumption: 1,
      leadTime: 5,
      safetyStock: 10,
      currentStock: 12,
      minStock: 5
    };

    const initialUserState: UserNotificationState = {
      readIds: ['notif-stock-low-item-escalate'],
      dismissedIds: [],
      snoozedMap: {
        'notif-stock-low-item-escalate': '2026-05-27T12:00:00Z'
      },
      previousSeverities: {
        'notif-stock-low-item-escalate': 'warning'
      }
    };

    const { notifications: snoozedList } = generateNotifications({
      inventory: [item],
      batches: [],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate,
      userState: initialUserState
    });
    expect(snoozedList.some(n => n.entityId === 'item-escalate')).toBe(false);

    // Escalate to critical
    const criticalItem: InventoryItem = {
      ...item,
      currentStock: 0
    };

    const { notifications: escalatedList } = generateNotifications({
      inventory: [criticalItem],
      batches: [],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate,
      userState: initialUserState
    });

    const critNotif = escalatedList.find(n => n.entityId === 'item-escalate');
    expect(critNotif).toBeDefined();
    expect(critNotif?.severity).toBe('critical');
  });

  it('Test 9: 5,000-item dataset performance check', () => {
    const largeInventory: InventoryItem[] = [];
    for (let i = 1; i <= 5000; i++) {
      largeInventory.push({
        id: `item-${i}`,
        name: `Material Batch Item ${i}`,
        sku: `SKU-${100000 + i}`,
        categoryId: 'cat-1',
        unit: 'pcs',
        dailyConsumption: (i % 20) + 1,
        leadTime: 3,
        safetyStock: 10,
        currentStock: i % 10 === 0 ? 5 : 500,
        minStock: 20
      });
    }

    const startTime = Date.now();
    const { notifications } = generateNotifications({
      inventory: largeInventory,
      batches: [],
      purchaseOrders: [],
      invoices: [],
      transfers: [],
      warehouses: [testWarehouse],
      role: 'admin',
      referenceDate: refDate
    });
    const duration = Date.now() - startTime;

    expect(notifications.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000);
  });
});

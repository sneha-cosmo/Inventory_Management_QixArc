import {
  InventoryItem,
  Batch,
  PurchaseOrder,
  Invoice,
  StockTransfer,
  Warehouse,
  Staff
} from '../types';
import { calculateExpiryStatus, APP_REFERENCE_DATE } from './batchImport';

export type NotificationType =
  | 'out_of_stock'
  | 'low_stock'
  | 'expired_batch'
  | 'expiring_soon_batch'
  | 'overdue_invoice'
  | 'stuck_transfer';

export type NotificationCategory = 'stock' | 'expiry' | 'finance';

export type NotificationSeverity = 'critical' | 'warning' | 'info';

export interface NotificationAction {
  label: string;
  actionType: 'item_details' | 'stock_adjustment' | 'batch_view' | 'reorder_po' | 'invoice_view' | 'transfer_view';
  targetTab: string;
  searchQuery?: string;
  entityId: string;
  metadata?: Record<string, any>;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  description: string;
  skuOrDocRef: string;
  entityId: string;
  warehouseId?: string;
  warehouseName?: string;
  timestamp: string;
  ageDays: number;
  ageText: string;
  isOnOrder?: boolean;
  action: NotificationAction;
}

export interface NotificationSettings {
  nearExpiryDays: number; // default: 30
  criticalExpiryDays: number; // default: 7
  stuckTransferDays: number; // default: 3
  enableLowStock: boolean;
  enableOutOfStock: boolean;
  enableExpiredBatch: boolean;
  enableExpiringSoon: boolean;
  enableOverdueInvoice: boolean;
  enableStuckTransfer: boolean;
  developerToolsEnabled?: boolean; // Developer tools toggle (default: false)
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  nearExpiryDays: 30,
  criticalExpiryDays: 7,
  stuckTransferDays: 3,
  enableLowStock: true,
  enableOutOfStock: true,
  enableExpiredBatch: true,
  enableExpiringSoon: true,
  enableOverdueInvoice: true,
  enableStuckTransfer: true,
  developerToolsEnabled: false,
};

export interface UserNotificationState {
  readIds: string[];
  dismissedIds: string[];
  snoozedMap: Record<string, string>; // notifId -> ISO timestamp until which it's snoozed
  previousSeverities: Record<string, NotificationSeverity>;
}

export const INITIAL_USER_NOTIFICATION_STATE: UserNotificationState = {
  readIds: [],
  dismissedIds: [],
  snoozedMap: {},
  previousSeverities: {},
};

/**
 * Validates settings to ensure sensible ranges, integer types, and critical < near expiry
 */
export function validateNotificationSettings(settings: Partial<NotificationSettings>): {
  valid: boolean;
  errors: string[];
  sanitized: NotificationSettings;
} {
  const errors: string[] = [];
  const current = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings };

  const nearExp = Math.round(Number(current.nearExpiryDays));
  const critExp = Math.round(Number(current.criticalExpiryDays));
  const stuckTrf = Math.round(Number(current.stuckTransferDays));

  if (isNaN(nearExp) || nearExp < 1 || nearExp > 365) {
    errors.push('Near-expiry days must be an integer between 1 and 365 days');
  }

  if (isNaN(critExp) || critExp < 1 || critExp > 180) {
    errors.push('Critical-expiry days must be an integer between 1 and 180 days');
  }

  if (critExp >= nearExp) {
    errors.push('Critical-expiry days must be strictly lower than near-expiry days');
  }

  if (isNaN(stuckTrf) || stuckTrf < 1 || stuckTrf > 90) {
    errors.push('Stuck transfer days must be an integer between 1 and 90 days');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      ...current,
      nearExpiryDays: isNaN(nearExp) ? 30 : nearExp,
      criticalExpiryDays: isNaN(critExp) ? 7 : critExp,
      stuckTransferDays: isNaN(stuckTrf) ? 3 : stuckTrf,
    }
  };
}

/**
 * Calculates stock reorder point using existing formula:
 * (dailyConsumption * leadTime) + (safetyStock * multiplier)
 */
export function calculateReorderLevel(
  item: InventoryItem,
  multiplier: number = 1.0
): number {
  const level = (item.dailyConsumption * item.leadTime) + (item.safetyStock * multiplier);
  return parseFloat(level.toFixed(1));
}

/**
 * Check if an item has an active/open Purchase Order
 * (pending, ordered, or partially received)
 */
export function hasOpenPurchaseOrder(
  itemId: string,
  purchaseOrders: PurchaseOrder[]
): boolean {
  return purchaseOrders.some(po => {
    const isOrderOpen = po.status === 'pending' || (po as any).status === 'ordered' || (po as any).status === 'partially_received';
    if (!isOrderOpen) return false;
    return po.items.some(pi => pi.itemId === itemId && pi.quantity > 0);
  });
}

/**
 * Checks if a role is allowed to see a particular category of notification
 */
export function isAllowedNotificationCategory(
  role: Staff['role'] | string,
  category: NotificationCategory
): boolean {
  if (role === 'admin') return true;
  if (role === 'inventory_manager') {
    return category === 'stock' || category === 'expiry';
  }
  if (role === 'billing_clerk') {
    return category === 'finance';
  }
  return false;
}

/**
 * Pure generator that computes notifications from raw application state
 */
export function generateNotifications(params: {
  inventory: InventoryItem[];
  batches: Batch[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  transfers: StockTransfer[];
  warehouses: Warehouse[];
  role: Staff['role'] | string;
  settings?: NotificationSettings;
  referenceDate?: Date;
  userState?: UserNotificationState;
}): {
  notifications: AppNotification[];
  updatedUserState: UserNotificationState;
} {
  const {
    inventory,
    batches,
    purchaseOrders,
    invoices,
    transfers,
    warehouses,
    role,
    settings = DEFAULT_NOTIFICATION_SETTINGS,
    referenceDate = APP_REFERENCE_DATE,
    userState = INITIAL_USER_NOTIFICATION_STATE
  } = params;

  const warehouseMap = new Map<string, string>();
  warehouses.forEach(w => warehouseMap.set(w.id, w.name));

  const rawNotifications: AppNotification[] = [];
  const refTime = referenceDate.getTime();
  const seenKeys = new Set<string>();

  const pushUniqueNotification = (notif: AppNotification) => {
    const key = `${notif.type}::${notif.entityId}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      rawNotifications.push(notif);
    }
  };

  // Helper to calculate days difference
  const getDaysAgo = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return 0;
    return Math.max(0, Math.floor((refTime - time) / (1000 * 60 * 60 * 24)));
  };

  // 1 & 2. STOCK NOTIFICATIONS (Out of stock, Low stock, Days-of-stock)
  if (isAllowedNotificationCategory(role, 'stock')) {
    // Process items in chunks or loop efficiently
    for (let i = 0; i < inventory.length; i++) {
      const item = inventory[i];
      const reorderLevel = calculateReorderLevel(item);
      const isOut = item.currentStock <= 0;
      const isOpenPoExisting = hasOpenPurchaseOrder(item.id, purchaseOrders);

      // Days of stock: currentStock / dailyConsumption
      const hasDailyUsage = item.dailyConsumption > 0;
      const daysOfStock = hasDailyUsage ? item.currentStock / item.dailyConsumption : 999;

      if (isOut) {
        if (settings.enableOutOfStock) {
          pushUniqueNotification({
            id: `notif-stock-out-${item.id}`,
            type: 'out_of_stock',
            category: 'stock',
            severity: 'critical',
            title: `Out of Stock: ${item.name}`,
            description: `Stock reached 0 units. Minimum safety stock is ${item.safetyStock} ${item.unit}.`,
            skuOrDocRef: item.sku,
            entityId: item.id,
            timestamp: referenceDate.toISOString(),
            ageDays: 0,
            ageText: 'Immediate action',
            isOnOrder: isOpenPoExisting,
            action: {
              label: isOpenPoExisting ? 'View PO on Order' : 'Reorder Now',
              actionType: isOpenPoExisting ? 'item_details' : 'reorder_po',
              targetTab: isOpenPoExisting ? 'purchase' : 'purchase',
              searchQuery: item.sku,
              entityId: item.id,
              metadata: {
                itemId: item.id,
                recommendedQty: Math.max(item.safetyStock * 2, reorderLevel),
                itemName: item.name
              }
            }
          });
        }
      } else {
        // Low Stock condition:
        // When item has a configured reorder level (> 0), the reorder threshold is currentStock <= reorderLevel.
        // When reorder level is 0/unconfigured, stock-days band (daysOfStock < 15) serves as the trigger.
        const isBelowReorder = reorderLevel > 0 
          ? item.currentStock <= reorderLevel 
          : (hasDailyUsage && daysOfStock < 15);

        if (isBelowReorder && settings.enableLowStock) {
          // If there is an open purchase order, suppress warning or show as low-priority "On order" info row
          if (isOpenPoExisting) {
            pushUniqueNotification({
              id: `notif-stock-onorder-${item.id}`,
              type: 'low_stock',
              category: 'stock',
              severity: 'info',
              title: `Replenishment On Order: ${item.name}`,
              description: `Current stock: ${item.currentStock} ${item.unit} (Reorder level: ${reorderLevel}). An open PO is already pending.`,
              skuOrDocRef: item.sku,
              entityId: item.id,
              timestamp: referenceDate.toISOString(),
              ageDays: 0,
              ageText: 'PO in progress',
              isOnOrder: true,
              action: {
                label: 'View Open PO',
                actionType: 'reorder_po',
                targetTab: 'purchase',
                searchQuery: item.sku,
                entityId: item.id
              }
            });
          } else {
            // Determine severity: under 5 days of stock or stock <= minStock is Critical, else Warning
            const isCritical = (hasDailyUsage && daysOfStock < 5) || (item.minStock > 0 && item.currentStock <= item.minStock);
            const severity: NotificationSeverity = isCritical ? 'critical' : 'warning';
            const daysLabel = hasDailyUsage ? ` (~${Math.floor(daysOfStock)} days of stock left)` : '';

            pushUniqueNotification({
              id: `notif-stock-low-${item.id}`,
              type: 'low_stock',
              category: 'stock',
              severity,
              title: isCritical ? `Critical Stock: ${item.name}` : `Low Stock: ${item.name}`,
              description: `Current stock: ${item.currentStock} ${item.unit} at or below reorder point of ${reorderLevel}${daysLabel}.`,
              skuOrDocRef: item.sku,
              entityId: item.id,
              timestamp: referenceDate.toISOString(),
              ageDays: 0,
              ageText: isCritical ? 'Under 5d stock' : 'Under reorder pt',
              isOnOrder: false,
              action: {
                label: 'Reorder Now',
                actionType: 'reorder_po',
                targetTab: 'purchase',
                searchQuery: item.sku,
                entityId: item.id,
                metadata: {
                  itemId: item.id,
                  recommendedQty: Math.max(1, reorderLevel - item.currentStock),
                  itemName: item.name
                }
              }
            });
          }
        }
      }
    }
  }

  // 3 & 4. BATCH EXPIRY NOTIFICATIONS (Expired, Critical, Near Expiry)
  if (isAllowedNotificationCategory(role, 'expiry')) {
    const itemMap = new Map<string, InventoryItem>();
    inventory.forEach(i => itemMap.set(i.id, i));

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      if (batch.quantity <= 0) continue; // Skip exhausted batches

      const expiryMeta = calculateExpiryStatus(batch.expiryDate, referenceDate);
      const parentItem = itemMap.get(batch.itemId);
      const whName = warehouseMap.get(batch.warehouseId) || batch.warehouseId;
      const sku = parentItem ? parentItem.sku : batch.itemId;
      const itemName = parentItem ? parentItem.name : batch.batchNumber;

      if (expiryMeta.status === 'Expired') {
        if (settings.enableExpiredBatch) {
          const daysPast = Math.abs(expiryMeta.diffDays);
          pushUniqueNotification({
            id: `notif-batch-expired-${batch.id}`,
            type: 'expired_batch',
            category: 'expiry',
            severity: 'critical',
            title: `Expired Batch: ${batch.batchNumber}`,
            description: `${itemName} expired ${daysPast}d ago (${batch.quantity} units in ${whName}). Must be quarantined or disposed.`,
            skuOrDocRef: `${sku} • ${batch.batchNumber}`,
            entityId: batch.id,
            warehouseId: batch.warehouseId,
            warehouseName: whName,
            timestamp: batch.expiryDate,
            ageDays: daysPast,
            ageText: `${daysPast}d overdue`,
            action: {
              label: 'View Batches',
              actionType: 'batch_view',
              targetTab: 'batches',
              searchQuery: batch.batchNumber,
              entityId: batch.id
            }
          });
        }
      } else if (expiryMeta.diffDays <= settings.nearExpiryDays) {
        if (settings.enableExpiringSoon) {
          // Critical if under criticalExpiryDays (default 7), Warning if under nearExpiryDays (default 30)
          const isCritical = expiryMeta.diffDays <= settings.criticalExpiryDays;
          const severity: NotificationSeverity = isCritical ? 'critical' : 'warning';

          pushUniqueNotification({
            id: `notif-batch-expiring-${batch.id}`,
            type: 'expiring_soon_batch',
            category: 'expiry',
            severity,
            title: isCritical ? `Batch Expiring Imminently: ${batch.batchNumber}` : `Batch Expiring Soon: ${batch.batchNumber}`,
            description: `${itemName} will expire in ${expiryMeta.diffDays} days (${batch.quantity} units at ${whName}). Priority dispatch required.`,
            skuOrDocRef: `${sku} • ${batch.batchNumber}`,
            entityId: batch.id,
            warehouseId: batch.warehouseId,
            warehouseName: whName,
            timestamp: batch.expiryDate,
            ageDays: expiryMeta.diffDays,
            ageText: `${expiryMeta.diffDays}d left`,
            action: {
              label: 'Inspect Batch',
              actionType: 'batch_view',
              targetTab: 'batches',
              searchQuery: batch.batchNumber,
              entityId: batch.id
            }
          });
        }
      }
    }
  }

  // 5. OVERDUE INVOICES (Admin and Billing Clerk only)
  if (isAllowedNotificationCategory(role, 'finance') && settings.enableOverdueInvoice) {
    for (let inv = 0; inv < invoices.length; inv++) {
      const invoice = invoices[inv];
      const isPaid = invoice.status === 'paid' || invoice.status === 'void';
      if (isPaid) continue;

      const dueTime = new Date(invoice.dueDate).getTime();
      const isPastDue = !isNaN(dueTime) && dueTime < refTime;
      const isOverdue = invoice.status === 'overdue' || isPastDue;

      if (isOverdue) {
        const daysOverdue = getDaysAgo(invoice.dueDate);
        const unpaidAmount = Math.max(0, invoice.totalAmount - (invoice.paidAmount || 0));

        pushUniqueNotification({
          id: `notif-invoice-overdue-${invoice.id}`,
          type: 'overdue_invoice',
          category: 'finance',
          severity: daysOverdue > 14 ? 'critical' : 'warning',
          title: `Overdue Invoice: ${invoice.id}`,
          description: `Outstanding balance ₹${unpaidAmount.toLocaleString()} is ${daysOverdue} days past due date (${invoice.dueDate}).`,
          skuOrDocRef: invoice.id,
          entityId: invoice.id,
          timestamp: invoice.dueDate,
          ageDays: daysOverdue,
          ageText: `${daysOverdue}d overdue`,
          action: {
            label: 'View Invoice',
            actionType: 'invoice_view',
            targetTab: 'billing',
            searchQuery: invoice.id,
            entityId: invoice.id
          }
        });
      }
    }
  }

  // 6. STUCK IN TRANSIT TRANSFERS (Admin and Inventory Manager)
  if (isAllowedNotificationCategory(role, 'stock') && settings.enableStuckTransfer) {
    for (let trf = 0; trf < transfers.length; trf++) {
      const transfer = transfers[trf];
      if (transfer.status === 'transit') {
        const daysInTransit = getDaysAgo(transfer.date);
        if (daysInTransit >= settings.stuckTransferDays) {
          const fromWh = warehouseMap.get(transfer.sourceWarehouseId) || transfer.sourceWarehouseId;
          const toWh = warehouseMap.get(transfer.destWarehouseId) || transfer.destWarehouseId;
          const isCritical = daysInTransit > 7;

          pushUniqueNotification({
            id: `notif-transfer-stuck-${transfer.id}`,
            type: 'stuck_transfer',
            category: 'stock',
            severity: isCritical ? 'critical' : 'warning',
            title: `Transfer Delayed in Transit: ${transfer.trackingNumber || transfer.id}`,
            description: `${transfer.quantity} items moving from ${fromWh} to ${toWh} in transit for ${daysInTransit} days (threshold: ${settings.stuckTransferDays}d).`,
            skuOrDocRef: transfer.trackingNumber || transfer.id,
            entityId: transfer.id,
            warehouseId: transfer.sourceWarehouseId,
            warehouseName: fromWh,
            timestamp: transfer.date,
            ageDays: daysInTransit,
            ageText: `${daysInTransit}d in transit`,
            action: {
              label: 'Track Transfer',
              actionType: 'transfer_view',
              targetTab: 'branch_sync',
              searchQuery: transfer.trackingNumber || transfer.id,
              entityId: transfer.id
            }
          });
        }
      }
    }
  }

  // Handle Escalation & Snooze / Read / Dismiss states
  const updatedReadIds = new Set(userState.readIds);
  const updatedSnoozedMap = { ...userState.snoozedMap };
  const newPreviousSeverities = { ...userState.previousSeverities };

  // Check for escalations (Warning -> Critical): mark unread again and cancel snooze!
  for (const notif of rawNotifications) {
    const prevSev = userState.previousSeverities[notif.id];
    if (prevSev === 'warning' && notif.severity === 'critical') {
      // Escalation occurred!
      updatedReadIds.delete(notif.id);
      delete updatedSnoozedMap[notif.id];
    }
    newPreviousSeverities[notif.id] = notif.severity;
  }

  // Clean up userState for cleared conditions
  const activeIds = new Set(rawNotifications.map(n => n.id));
  const dismissedSet = new Set(userState.dismissedIds);

  // Filter out dismissed and currently snoozed notifications
  const nowIso = referenceDate.toISOString();
  const visibleNotifications = rawNotifications.filter(notif => {
    // If dismissed, skip
    if (dismissedSet.has(notif.id)) return false;

    // If snoozed and snooze has not expired yet, skip
    const snoozeUntil = updatedSnoozedMap[notif.id];
    if (snoozeUntil) {
      if (new Date(snoozeUntil).getTime() > refTime) {
        return false;
      } else {
        // Snooze expired, remove from snooze map
        delete updatedSnoozedMap[notif.id];
      }
    }

    return true;
  });

  // Sort by severity (critical > warning > info), then by age (highest ageDays or newest)
  const severityRank: Record<NotificationSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2
  };

  visibleNotifications.sort((a, b) => {
    const rankDiff = severityRank[a.severity] - severityRank[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return b.ageDays - a.ageDays;
  });

  // Clean stale readIds and previousSeverities
  const finalReadIds = Array.from(updatedReadIds).filter(id => activeIds.has(id));

  return {
    notifications: visibleNotifications,
    updatedUserState: {
      readIds: finalReadIds,
      dismissedIds: Array.from(dismissedSet),
      snoozedMap: updatedSnoozedMap,
      previousSeverities: newPreviousSeverities
    }
  };
}

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  History,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  ClipboardList,
  CheckCircle2,
  Settings2,
  Trash2,
  Truck,
  ShoppingCart,
  Store,
  BarChart3,
  Layers,
  ShieldCheck,
  QrCode,
  ArrowLeftRight,
  Clock,
  Maximize,
  Scan,
  Barcode,
  Printer,
  FileText,
  X,
  ShieldAlert,
  Calendar,
  Search,
  Users,
  Lock,
  Shield,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

import { 
  Warehouse, 
  Supplier, 
  Category, 
  Batch, 
  PurchaseOrder, 
  SalesOrder, 
  InventoryAdjustment, 
  AuditLog,
  InventoryItem, 
  ProductionOrder, 
  ProductionItem, 
  ReorderPrediction, 
  VarianceAnalysis,
  Customer,
  Invoice,
  Payment,
  Staff,
  StockTransfer,
  BranchSyncStatus,
  StockLevel
} from './types';
import { 
  INITIAL_INVENTORY, 
  INITIAL_ORDERS, 
  INITIAL_WAREHOUSES, 
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_SALES_ORDERS,
  INITIAL_SUPPLIERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_ADJUSTMENTS
} from './constants';

import { LOCALES, Language, tText } from './locales';

import FinancialReportsPage from './components/FinancialReportsPage';
import CustomerHistoryDialog from './components/CustomerHistoryDialog';
import DeadStockDamagedPage from './components/DeadStockDamagedPage';
import BranchSyncTransferPage from './components/BranchSyncTransferPage';
import TallySyncPanel from './components/TallySyncPanel';
import SplitMergePanel from './components/SplitMergePanel';
import EasyTaxFilingPanel from './components/EasyTaxFilingPanel';
import RoleStaffManagementPanel from './components/RoleStaffManagementPanel';
import BulkImportModal from './components/BulkImportModal';
import { DuplicatePolicy } from './utils/bulkImport';
import BatchImportModal from './components/BatchImportModal';
import { BatchDuplicatePolicy } from './utils/batchImport';
import { NotificationCenterPanel } from './components/NotificationCenterPanel';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  UserNotificationState,
  INITIAL_USER_NOTIFICATION_STATE,
  generateNotifications,
  AppNotification
} from './utils/notificationCenter';

const INITIAL_BATCHES: Batch[] = [
  {
    id: 'BAT-001',
    itemId: '1',
    batchNumber: 'BAT-COT-26A',
    manufactureDate: '2026-01-10',
    expiryDate: '2026-06-01', // Critical warning (< 7 days)
    quantity: 150,
    warehouseId: 'wh-1'
  },
  {
    id: 'BAT-002',
    itemId: '1',
    batchNumber: 'BAT-COT-26B',
    manufactureDate: '2026-02-15',
    expiryDate: '2026-06-10', // Near warning (< 15 days)
    quantity: 200,
    warehouseId: 'wh-1'
  },
  {
    id: 'BAT-003',
    itemId: '1',
    batchNumber: 'BAT-COT-26C',
    manufactureDate: '2026-04-01',
    expiryDate: '2026-12-05', // Healthy
    quantity: 150,
    warehouseId: 'wh-2'
  },
  {
    id: 'BAT-004',
    itemId: '2',
    batchNumber: 'BAT-THR-26A',
    manufactureDate: '2025-11-20',
    expiryDate: '2026-05-12', // Expired
    quantity: 30,
    warehouseId: 'wh-1'
  },
  {
    id: 'BAT-005',
    itemId: '2',
    batchNumber: 'BAT-THR-26B',
    manufactureDate: '2026-03-01',
    expiryDate: '2026-06-25', // Warning Warning (< 30 days)
    quantity: 50,
    warehouseId: 'wh-2'
  },
  {
    id: 'BAT-006',
    itemId: '3',
    batchNumber: 'BAT-BTN-26A',
    manufactureDate: '2026-01-05',
    expiryDate: '2026-07-20', // Healthy
    quantity: 1200,
    warehouseId: 'wh-1'
  },
  {
    id: 'BAT-007',
    itemId: '3',
    batchNumber: 'BAT-BTN-26B',
    manufactureDate: '2026-03-10',
    expiryDate: '2027-03-10', // Healthy
    quantity: 800,
    warehouseId: 'wh-2'
  }
];

export const INITIAL_STAFF: Staff[] = [
  {
    id: 'STF-001',
    name: 'Sneha R.',
    email: 'snehar2007@gmail.com',
    role: 'admin',
    lastActive: '2026-05-28 17:15',
    permissions: {
      editInventory: true,
      manageBatches: true,
      makeAdjustments: true,
      executeRecall: true,
      manageSuppliers: true,
      createOrders: true,
      recordPayments: true,
      viewReports: true,
      manageStaff: true
    }
  },
  {
    id: 'STF-002',
    name: 'Amit Sharma',
    email: 'amit.inventory@company.com',
    role: 'inventory_manager',
    lastActive: '2026-05-28 16:30',
    permissions: {
      editInventory: true,
      manageBatches: true,
      makeAdjustments: true,
      executeRecall: true,
      manageSuppliers: true,
      createOrders: false,
      recordPayments: false,
      viewReports: false,
      manageStaff: false
    }
  },
  {
    id: 'STF-003',
    name: 'Priya Patel',
    email: 'priya.billing@company.com',
    role: 'billing_clerk',
    lastActive: '2026-05-28 17:01',
    permissions: {
      editInventory: false,
      manageBatches: false,
      makeAdjustments: false,
      executeRecall: false,
      manageSuppliers: false,
      createOrders: true,
      recordPayments: true,
      viewReports: true,
      manageStaff: false
    }
  },
  {
    id: 'STF-004',
    name: 'Rohan Das',
    email: 'rohan.viewer@company.com',
    role: 'staff_viewer',
    lastActive: '2026-05-27 11:20',
    permissions: {
      editInventory: false,
      manageBatches: false,
      makeAdjustments: false,
      executeRecall: false,
      manageSuppliers: false,
      createOrders: false,
      recordPayments: false,
      viewReports: false,
      manageStaff: false
    }
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-1',
    timestamp: '2026-05-28T17:15:00.000Z',
    action: 'Create Sales Order',
    entityType: 'SalesOrder',
    entityId: 'SO-001',
    details: 'SO created for customer Tech Solutions Ltd. GST Calculated: ₹14,500.00 (CGST+SGST). Invoice INV-2026-001 generated.',
    operatorId: 'STF-003',
    operatorName: 'Priya Patel',
    operatorRole: 'billing_clerk'
  },
  {
    id: 'LOG-2',
    timestamp: '2026-05-28T16:45:00.000Z',
    action: 'Batch Recall',
    entityType: 'Batch',
    entityId: 'BAT-002',
    details: 'Emergency product recall initiated for Lot #BAT-SHR-26A. Quarantined 500 items from active supply lines.',
    operatorId: 'STF-002',
    operatorName: 'Amit Sharma',
    operatorRole: 'inventory_manager'
  },
  {
    id: 'LOG-3',
    timestamp: '2026-05-28T14:30:00.000Z',
    action: 'Inventory Adjustment',
    entityType: 'InventoryAdjustment',
    entityId: 'adj-1',
    details: 'DAMAGE correction of -45 kg for Cotton Yarn in Central Warehouse due to high humidity levels.',
    operatorId: 'STF-002',
    operatorName: 'Amit Sharma',
    operatorRole: 'inventory_manager'
  },
  {
    id: 'LOG-4',
    timestamp: '2026-05-27T11:20:00.000Z',
    action: 'Add Batch',
    entityType: 'Batch',
    entityId: 'BAT-005',
    details: 'Batch LOT-BTN-26A created with 1,200 units of Finished Buttons.',
    operatorId: 'STF-001',
    operatorName: 'Sneha R.',
    operatorRole: 'admin'
  }
];

export default function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [orders, setOrders] = useState<ProductionOrder[]>(INITIAL_ORDERS);
  const [adaptiveSettings, setAdaptiveSettings] = useState<Record<string, number>>({});
  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(INITIAL_SALES_ORDERS);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>(INITIAL_ADJUSTMENTS);
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [staff, setStaff] = useState<Staff[]>(INITIAL_STAFF);
  const [currentStaffId, setCurrentStaffId] = useState<string>('STF-001');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [activeTab, setActiveTab] = useState('overview');
  const [reportsSubTab, setReportsSubTab] = useState('p_n_l');
  const [language, setLanguage] = useState<Language>('en');
  const t = LOCALES[language];

  // Distribution, Logistics and Cloud sync States
  const [stockLevels, setStockLevels] = useState<StockLevel[]>(() => {
    const initial: StockLevel[] = [];
    INITIAL_INVENTORY.forEach(item => {
      const q1 = Math.round(item.currentStock * 0.6);
      const q2 = item.currentStock - q1;
      initial.push({ itemId: item.id, warehouseId: 'wh-1', quantity: q1 });
      initial.push({ itemId: item.id, warehouseId: 'wh-2', quantity: q2 });
    });
    return initial;
  });

  const [transfers, setTransfers] = useState<StockTransfer[]>([
    {
      id: 'TRF-001',
      itemId: '1',
      quantity: 50,
      sourceWarehouseId: 'wh-1',
      destWarehouseId: 'wh-2',
      date: '2026-05-20',
      status: 'received',
      trackingNumber: 'TRF-AWB-823901',
      carrier: 'Blue Dart India',
      notes: 'Cotton Fiber balance realignment'
    },
    {
      id: 'TRF-002',
      itemId: '4',
      quantity: 100,
      sourceWarehouseId: 'wh-2',
      destWarehouseId: 'wh-1',
      date: '2026-05-27',
      status: 'transit',
      trackingNumber: 'TRF-AWB-109038',
      carrier: 'Delhivery Surface Logistics',
      notes: 'Golden lace urgent deployment for Mumbai sewing factory'
    }
  ]);

  const [syncStatuses, setSyncStatuses] = useState<BranchSyncStatus[]>([
    {
      warehouseId: 'wh-1',
      lastSyncedAt: '2026-05-29 02:15:00',
      syncStatus: 'synced',
      unresolvedChangesCount: 0,
      latencyMs: 38
    },
    {
      warehouseId: 'wh-2',
      lastSyncedAt: '2026-05-29 02:12:00',
      syncStatus: 'synced',
      unresolvedChangesCount: 0,
      latencyMs: 45
    }
  ]);
  
  const currentUser = useMemo(() => {
    return staff.find(s => s.id === currentStaffId) || staff[0];
  }, [staff, currentStaffId]);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [userNotificationStates, setUserNotificationStates] = useState<Record<string, UserNotificationState>>({});
  const [preloadedPOItem, setPreloadedPOItem] = useState<{ itemId: string; quantity: number } | null>(null);

  const currentUserNotifState = userNotificationStates[currentUser.id] || INITIAL_USER_NOTIFICATION_STATE;

  const { notifications } = useMemo(() => {
    return generateNotifications({
      inventory,
      batches,
      purchaseOrders,
      invoices,
      transfers,
      warehouses,
      role: currentUser.role,
      settings: notificationSettings,
      userState: currentUserNotifState
    });
  }, [inventory, batches, purchaseOrders, invoices, transfers, warehouses, currentUser.role, notificationSettings, currentUserNotifState]);

  const handleUpdateUserState = (nextState: UserNotificationState) => {
    setUserNotificationStates(prev => ({
      ...prev,
      [currentUser.id]: nextState
    }));
  };

  const handleSaveNotificationSettings = (newSettings: NotificationSettings) => {
    const old = notificationSettings;
    setNotificationSettings(newSettings);

    const changes: string[] = [];
    if (old.nearExpiryDays !== newSettings.nearExpiryDays) {
      changes.push(`nearExpiryDays: ${old.nearExpiryDays} -> ${newSettings.nearExpiryDays}`);
    }
    if (old.criticalExpiryDays !== newSettings.criticalExpiryDays) {
      changes.push(`criticalExpiryDays: ${old.criticalExpiryDays} -> ${newSettings.criticalExpiryDays}`);
    }
    if (old.stuckTransferDays !== newSettings.stuckTransferDays) {
      changes.push(`stuckTransferDays: ${old.stuckTransferDays} -> ${newSettings.stuckTransferDays}`);
    }
    if (old.enableLowStock !== newSettings.enableLowStock) {
      changes.push(`enableLowStock: ${old.enableLowStock} -> ${newSettings.enableLowStock}`);
    }
    if (old.enableOutOfStock !== newSettings.enableOutOfStock) {
      changes.push(`enableOutOfStock: ${old.enableOutOfStock} -> ${newSettings.enableOutOfStock}`);
    }
    if (old.enableExpiredBatch !== newSettings.enableExpiredBatch) {
      changes.push(`enableExpiredBatch: ${old.enableExpiredBatch} -> ${newSettings.enableExpiredBatch}`);
    }
    if (old.enableExpiringSoon !== newSettings.enableExpiringSoon) {
      changes.push(`enableExpiringSoon: ${old.enableExpiringSoon} -> ${newSettings.enableExpiringSoon}`);
    }
    if (old.enableOverdueInvoice !== newSettings.enableOverdueInvoice) {
      changes.push(`enableOverdueInvoice: ${old.enableOverdueInvoice} -> ${newSettings.enableOverdueInvoice}`);
    }
    if (old.enableStuckTransfer !== newSettings.enableStuckTransfer) {
      changes.push(`enableStuckTransfer: ${old.enableStuckTransfer} -> ${newSettings.enableStuckTransfer}`);
    }

    const details = changes.length > 0 
      ? `Notification parameters modified by ${currentUser.name} (${currentUser.role}). Changes: ${changes.join(', ')}. Old: ${JSON.stringify(old)}, New: ${JSON.stringify(newSettings)}`
      : `Notification parameters reaffirmed by ${currentUser.name} (${currentUser.role}). No value changes.`;

    addAuditLog('Update Notification Settings', 'SystemSettings', 'notification_settings', details);
  };

  const handleNotificationActionNavigate = (action: AppNotification['action']) => {
    if (action.actionType === 'reorder_po') {
      setActiveTab('purchase');
      if (action.metadata?.itemId) {
        setPreloadedPOItem({
          itemId: action.metadata.itemId,
          quantity: action.metadata.recommendedQty || 100
        });
      }
    } else if (action.actionType === 'item_details' || action.actionType === 'stock_adjustment') {
      setActiveTab(action.targetTab || 'inventory_mgmt');
      if (action.searchQuery) {
        setSearchQuery(action.searchQuery);
      }
    } else if (action.actionType === 'batch_view') {
      setActiveTab('batches');
      if (action.searchQuery) {
        setSearchQuery(action.searchQuery);
      }
    } else if (action.actionType === 'invoice_view') {
      setActiveTab('billing');
      if (action.searchQuery) {
        setSearchQuery(action.searchQuery);
      }
    } else if (action.actionType === 'transfer_view') {
      setActiveTab('branch_sync');
      if (action.searchQuery) {
        setSearchQuery(action.searchQuery);
      }
    } else {
      setActiveTab(action.targetTab || 'overview');
    }
  };

  const checkPermission = (perm: keyof Staff['permissions']): boolean => {
    return currentUser.permissions[perm];
  };
  const [searchQuery, setSearchQuery] = useState('');

  // Calculations
  const reorderPredictions = useMemo((): ReorderPrediction[] => {
    return inventory.map(item => {
      const multiplier = adaptiveSettings[item.id] || 1.0;
      const reorderLevel = (item.dailyConsumption * item.leadTime) + (item.safetyStock * multiplier);
      const reorderQuantity = Math.max(0, reorderLevel - item.currentStock);
      return {
        itemId: item.id,
        itemName: item.name,
        currentStock: item.currentStock,
        reorderLevel: parseFloat(reorderLevel.toFixed(1)),
        reorderQuantity: parseFloat(reorderQuantity.toFixed(1)),
        needsReorder: item.currentStock < reorderLevel
      };
    });
  }, [inventory, adaptiveSettings]);

  const varianceAnalysis = useMemo((): VarianceAnalysis[] => {
    const analysisMap = new Map<string, { planned: number; actual: number }>();
    
    orders.filter(o => o.status === 'completed').forEach(order => {
      order.items.forEach(item => {
        const current = analysisMap.get(item.itemId) || { planned: 0, actual: 0 };
        analysisMap.set(item.itemId, {
          planned: current.planned + (item.plannedQty * item.plannedRate),
          actual: current.actual + ((item.actualQty || 0) * (item.actualRate || 0))
        });
      });
    });

    return Array.from(analysisMap.entries()).map(([itemId, data]) => {
      const itemName = inventory.find(i => i.id === itemId)?.name || 'Unknown';
      const variance = data.actual - data.planned;
      return {
        itemId,
        itemName,
        plannedAmount: data.planned,
        actualAmount: data.actual,
        variance,
        status: variance > 0 ? 'loss' : variance < 0 ? 'profit' : 'neutral'
      };
    });
  }, [orders, inventory]);

  const totalStats = useMemo(() => {
    const totalPlanned = varianceAnalysis.reduce((sum, v) => sum + v.plannedAmount, 0);
    const totalActual = varianceAnalysis.reduce((sum, v) => sum + v.actualAmount, 0);
    const totalVariance = totalActual - totalPlanned;
    const itemsToReorder = reorderPredictions.filter(p => p.needsReorder).length;
    
    const totalSales = salesOrders.reduce((sum, so) => sum + so.totalAmount, 0);
    const totalPurchases = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
    const netProfit = totalSales - (totalPurchases + totalActual);

    return {
      totalPlanned,
      totalActual,
      totalVariance,
      itemsToReorder,
      totalSales,
      totalPurchases,
      netProfit
    };
  }, [varianceAnalysis, reorderPredictions, salesOrders, purchaseOrders]);

  // Handlers
  const addAuditLog = (action: string, entityType: string, entityId: string, details: string) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      entityType,
      entityId,
      details,
      operatorId: currentUser?.id,
      operatorName: currentUser?.name,
      operatorRole: currentUser?.role
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  const handleAddPlannedOrder = (newOrder: ProductionOrder) => {
    setOrders([newOrder, ...orders]);
    addAuditLog('Create Production Plan', 'ProductionOrder', newOrder.id, `Planned production for ${newOrder.items[0].itemName}`);
  };

  const handleUpdateActuals = (orderId: string, actualItems: { itemId: string, actualQty: number, actualRate: number }[]) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        const updatedItems = order.items.map(item => {
          const actual = actualItems.find(ai => ai.itemId === item.itemId);
          if (actual) {
            return { ...item, actualQty: actual.actualQty, actualRate: actual.actualRate };
          }
          return item;
        });
        return { ...order, items: updatedItems, status: 'completed' as const };
      }
      return order;
    });
    setOrders(updatedOrders);

    // Update inventory
    const updatedInventory = inventory.map(invItem => {
      const consumed = actualItems.find(ai => ai.itemId === invItem.id)?.actualQty || 0;
      if (consumed > 0) {
        addAuditLog('Stock Deduction', 'InventoryItem', invItem.id, `Consumed ${consumed} ${invItem.unit} for Order ${orderId}`);
      }
      return {
        ...invItem,
        currentStock: Math.max(0, invItem.currentStock - consumed)
      };
    });
    setInventory(updatedInventory);
    addAuditLog('Complete Production Order', 'ProductionOrder', orderId, `Actual consumption recorded for order ${orderId}`);
  };

  const handleUpdateStock = (itemId: string, newStock: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    const diff = newStock - item.currentStock;

    setInventory(inventory.map(item => 
      item.id === itemId ? { ...item, currentStock: newStock } : item
    ));

    // Update individual warehouse stock levels
    setStockLevels(prevLevels => {
      let found = false;
      const next = prevLevels.map(sl => {
        if (sl.itemId === itemId && sl.warehouseId === 'wh-1') {
          found = true;
          return { ...sl, quantity: Math.max(0, sl.quantity + diff) };
        }
        return sl;
      });
      if (!found) {
        next.push({ itemId, warehouseId: 'wh-1', quantity: newStock });
      }
      return next;
    });

    addAuditLog('Manual Stock Adjustment', 'InventoryItem', itemId, `Stock updated from ${item.currentStock} to ${newStock}`);
  };

  const handleAddItem = (newItem: InventoryItem) => {
    setInventory([...inventory, newItem]);

    // Seed stock levels for the new item across warehouses (60% main, 40% secondary)
    const q1 = Math.round(newItem.currentStock * 0.6);
    const q2 = newItem.currentStock - q1;
    setStockLevels(prev => [
      ...prev,
      { itemId: newItem.id, warehouseId: 'wh-1', quantity: q1 },
      { itemId: newItem.id, warehouseId: 'wh-2', quantity: q2 }
    ]);

    addAuditLog('Add New Item', 'InventoryItem', newItem.id, `Item ${newItem.name} added to master list`);
  };

  const handleBulkImport = (payload: {
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
  }) => {
    // Business Rule 1: Re-check role inside the import function
    if (currentUser.role !== 'admin' && currentUser.role !== 'inventory_manager') {
      alert("Unauthorized: Only Admin and Inventory Manager clearance can execute bulk imports.");
      return;
    }

    const { itemsToCreate, itemsToUpdate, newCategories, newWarehouses, openingStockMap, duplicatePolicy, fileName, counts } = payload;

    // 1. Add missing categories if any were created
    if (newCategories.length > 0) {
      const createdCats: Category[] = newCategories.map(catName => ({
        id: `cat-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: catName
      }));
      setCategories(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const toAdd = createdCats.filter(c => !existingIds.has(c.id));
        return [...prev, ...toAdd];
      });
    }

    // 2. Add missing warehouses if any were created
    if (newWarehouses.length > 0) {
      const createdWhs: Warehouse[] = newWarehouses.map(whName => ({
        id: `wh-${whName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: whName,
        location: 'Auto-created Depot'
      }));
      setWarehouses(prev => {
        const existingIds = new Set(prev.map(w => w.id));
        const toAdd = createdWhs.filter(w => !existingIds.has(w.id));
        return [...prev, ...toAdd];
      });
    }

    // 3. Update existing items in inventory & add newly created
    const updatedMap = new Map<string, InventoryItem>();
    itemsToUpdate.forEach(item => updatedMap.set(item.id, item));

    let nextInventory = inventory.map(item => updatedMap.get(item.id) || item);
    nextInventory = [...nextInventory, ...itemsToCreate];
    setInventory(nextInventory);

    // 4. Seed/update stock levels across warehouses
    setStockLevels(prevLevels => {
      const nextLevels = [...prevLevels];
      
      // Items with explicit warehouse target
      for (const [itemId, info] of Object.entries(openingStockMap)) {
        const existingIdx = nextLevels.findIndex(sl => sl.itemId === itemId && sl.warehouseId === info.warehouseId);
        if (existingIdx !== -1) {
          nextLevels[existingIdx] = { ...nextLevels[existingIdx], quantity: info.quantity };
        } else {
          nextLevels.push({ itemId, warehouseId: info.warehouseId, quantity: info.quantity });
        }
      }

      // Newly created items without explicit warehouse (60% wh-1, 40% wh-2)
      for (const item of itemsToCreate) {
        if (!openingStockMap[item.id]) {
          const q1 = Math.round(item.currentStock * 0.6);
          const q2 = item.currentStock - q1;
          nextLevels.push({ itemId: item.id, warehouseId: 'wh-1', quantity: q1 });
          nextLevels.push({ itemId: item.id, warehouseId: 'wh-2', quantity: q2 });
        }
      }

      return nextLevels;
    });

    // 5. Audit trail: exactly ONE audit entry per import batch using the existing audit function
    const actionType = counts.updated > 0 && counts.created === 0 ? 'Update' : 'Create';
    const totalOpeningStock = itemsToCreate.reduce((s, i) => s + i.currentStock, 0) + 
      itemsToUpdate.reduce((s, i) => s + i.currentStock, 0);

    const description = `Bulk import executed from ${fileName}: ${counts.created} created, ${counts.updated} updated, ${counts.skipped} skipped, ${counts.failed} failed. Duplicate policy: ${duplicatePolicy}. Total opening/adjusted stock: ${totalOpeningStock} units logged.`;
    const itemReference = itemsToCreate.length > 0 
      ? `BULK-${itemsToCreate[0].sku}` 
      : itemsToUpdate.length > 0 
      ? `BULK-${itemsToUpdate[0].sku}` 
      : 'BULK-IMPORT';

    addAuditLog(actionType, 'InventoryItem', itemReference, description);
  };

  const handleBulkImportBatches = (payload: {
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
  }) => {
    // Business Rule 1: Re-check role inside the import function
    if (currentUser.role !== 'admin' && currentUser.role !== 'inventory_manager') {
      alert("Unauthorized: Only Admin and Inventory Manager clearance can execute batch imports.");
      return;
    }

    const { batchesToCreate, batchesToUpdate, newWarehouses, duplicatePolicy, fileName, counts } = payload;

    // 1. Create missing warehouses if any were auto-created
    if (newWarehouses.length > 0) {
      const createdWhs: Warehouse[] = newWarehouses.map(whName => ({
        id: `wh-${whName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: whName,
        location: 'Auto-created Depot'
      }));
      setWarehouses(prev => {
        const existingIds = new Set(prev.map(w => w.id));
        const toAdd = createdWhs.filter(w => !existingIds.has(w.id));
        return [...prev, ...toAdd];
      });
    }

    // 2. Update existing batches and add new batches
    const updatedBatchMap = new Map<string, Batch>();
    batchesToUpdate.forEach(u => updatedBatchMap.set(u.batch.id, u.batch));

    let nextBatches = batches.map(b => updatedBatchMap.get(b.id) || b);
    nextBatches = [...batchesToCreate, ...nextBatches];
    setBatches(nextBatches);

    // 3. Step 0 stock rule: Item stock is the sum of its batches.
    // Increment each item's currentStock by its newly imported batch quantities
    const itemQuantityIncrements = new Map<string, number>();
    const warehouseQuantityIncrements = new Map<string, number>(); // `${itemId}__${warehouseId}`

    for (const b of batchesToCreate) {
      itemQuantityIncrements.set(b.itemId, (itemQuantityIncrements.get(b.itemId) || 0) + b.quantity);
      const whKey = `${b.itemId}__${b.warehouseId}`;
      warehouseQuantityIncrements.set(whKey, (warehouseQuantityIncrements.get(whKey) || 0) + b.quantity);
    }

    for (const u of batchesToUpdate) {
      itemQuantityIncrements.set(u.batch.itemId, (itemQuantityIncrements.get(u.batch.itemId) || 0) + u.addedQuantity);
      const whKey = `${u.batch.itemId}__${u.batch.warehouseId}`;
      warehouseQuantityIncrements.set(whKey, (warehouseQuantityIncrements.get(whKey) || 0) + u.addedQuantity);
    }

    setInventory(prevInv => prevInv.map(item => {
      const inc = itemQuantityIncrements.get(item.id);
      return inc ? { ...item, currentStock: item.currentStock + inc } : item;
    }));

    // Update warehouse stock levels
    setStockLevels(prevLevels => {
      const nextLevels = [...prevLevels];
      for (const [whKey, inc] of warehouseQuantityIncrements.entries()) {
        const [itemId, warehouseId] = whKey.split('__');
        const idx = nextLevels.findIndex(sl => sl.itemId === itemId && sl.warehouseId === warehouseId);
        if (idx !== -1) {
          nextLevels[idx] = { ...nextLevels[idx], quantity: nextLevels[idx].quantity + inc };
        } else {
          nextLevels.push({ itemId, warehouseId, quantity: inc });
        }
      }
      return nextLevels;
    });

    // 4. Single consolidated audit entry
    const actionType = counts.updated > 0 && counts.created === 0 ? 'Update' : 'Create';
    const updatedDetails = batchesToUpdate.length > 0 
      ? ` Updated batches: ${batchesToUpdate.map(u => `${u.batch.batchNumber} (${u.oldQuantity} -> ${u.newQuantity})`).join(', ')}.`
      : '';

    const description = `Bulk batch import executed from ${fileName}: ${counts.created} created, ${counts.updated} updated, ${counts.skipped} skipped, ${counts.failed} failed. Duplicate policy: ${duplicatePolicy}. Total batch quantity loaded: ${counts.totalQuantityAdded} units. Expiry health: ${counts.expiredCount} expired, ${counts.criticalCount} critical, ${counts.nearExpiryCount} near expiry, ${counts.healthyCount} healthy.${updatedDetails}`;

    const itemRef = batchesToCreate.length > 0 
      ? `BULK-BAT-${batchesToCreate[0].batchNumber}` 
      : batchesToUpdate.length > 0 
      ? `BULK-BAT-${batchesToUpdate[0].batch.batchNumber}` 
      : 'BULK-BATCH';

    addAuditLog(actionType, 'Batch', itemRef, description);
  };

  const handleDeleteItem = (id: string) => {
    const item = inventory.find(i => i.id === id);
    setInventory(inventory.filter(i => i.id !== id));
    addAuditLog('Delete Item', 'InventoryItem', id, `Item ${item?.name} removed from master list`);
  };

  const handleGenerateIRN = (invoiceId: string) => {
    const ackNo = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const ackDate = new Date().toISOString().replace('T', ' ').substring(0, 19).replace(/-/g, '/');
    const irn = Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
    
    setInvoices(prevInvoices => prevInvoices.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          irnGenerated: true,
          irn,
          ackNumber: ackNo,
          ackDate
        };
      }
      return inv;
    }));
    addAuditLog('Generate E-Invoice & IRN', 'Invoice', invoiceId, `E-Invoice registered successfully. IRN: ${irn.substring(0, 8)}... created.`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-10 hidden lg:flex">
        <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Package className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">InvPredict</h1>
        </div>
        
        <nav className="flex-1 space-y-1 overflow-y-auto px-6 py-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-4">Main</p>
          <NavButton 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
            icon={<LayoutDashboard size={18} />}
            label={t.dashboard}
          />
          <NavButton 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')}
            icon={<BarChart3 size={18} />}
            label={t.analytics}
          />

          <div className="pt-4 pb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-4">Inventory</p>
          </div>
          <NavButton 
            active={activeTab === 'inventory_mgmt'} 
            onClick={() => setActiveTab('inventory_mgmt')}
            icon={<Package size={18} />}
            label={t.itemMaster}
          />
          <NavButton 
            active={activeTab === 'warehouses'} 
            onClick={() => setActiveTab('warehouses')}
            icon={<Store size={18} />}
            label={t.warehouses}
          />
          <NavButton 
            active={activeTab === 'branch_sync'} 
            onClick={() => setActiveTab('branch_sync')}
            icon={<RefreshCcw size={18} />}
            label={t.branchSync}
          />
          <NavButton 
            active={activeTab === 'adjustments'} 
            onClick={() => setActiveTab('adjustments')}
            icon={<ArrowLeftRight size={18} />}
            label={t.adjustments}
          />
          <NavButton 
            active={activeTab === 'batches'} 
            onClick={() => setActiveTab('batches')}
            icon={<Clock size={18} />}
            label={t.batchTracking}
          />
          <NavButton 
            active={activeTab === 'dead_damaged'} 
            onClick={() => setActiveTab('dead_damaged')}
            icon={<AlertTriangle size={18} />}
            label={t.deadDamagedStock}
          />

          <div className="pt-4 pb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-4">Orders</p>
          </div>
          <NavButton 
            active={activeTab === 'purchase'} 
            onClick={() => setActiveTab('purchase')}
            icon={<Truck size={18} />}
            label={t.purchasePo}
          />
          <NavButton 
            active={activeTab === 'sales'} 
            onClick={() => setActiveTab('sales')}
            icon={<ShoppingCart size={18} />}
            label={t.salesOrders}
          />

          <div className="pt-4 pb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-4">Financials</p>
          </div>
          <NavButton 
            active={activeTab === 'billing'} 
            onClick={() => setActiveTab('billing')}
            icon={<Layers size={18} />}
            label={t.billingPayments}
          />

          <div className="pt-4 pb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-4">Production</p>
          </div>
          <NavButton 
            active={activeTab === 'planning'} 
            onClick={() => setActiveTab('planning')}
            icon={<ClipboardList size={18} />}
            label={t.planning}
          />
          <NavButton 
            active={activeTab === 'consumption'} 
            onClick={() => setActiveTab('consumption')}
            icon={<CheckCircle2 size={18} />}
            label={t.consumption}
          />

          <div className="pt-4 pb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-4">System</p>
          </div>
          <NavButton 
            active={activeTab === 'staff'} 
            onClick={() => setActiveTab('staff')}
            icon={<Users size={18} />}
            label={t.staffPermissions}
          />
          <NavButton 
            active={activeTab === 'audit'} 
            onClick={() => setActiveTab('audit')}
            icon={<ShieldCheck size={18} />}
            label={t.auditLogs}
          />
        </nav>

        <div className="p-6 pt-3 shrink-0 border-t border-gray-100 bg-white">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">{t.systemStatus}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-indigo-900">{t.liveMonitoring}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {activeTab === 'overview' && t.dashboardOverview}
              {activeTab === 'planning' && t.productPlanning}
              {activeTab === 'consumption' && t.actualConsumption}
              {activeTab === 'inventory_mgmt' && t.itemMasterList}
              {activeTab === 'reports' && t.analyticsReports}
              {activeTab === 'warehouses' && t.warehouseManagement}
              {activeTab === 'adjustments' && t.inventoryAdjustments}
              {activeTab === 'batches' && t.batchExpiryTracking}
              {activeTab === 'purchase' && t.purchaseOrders}
              {activeTab === 'sales' && t.salesOrders}
              {activeTab === 'billing' && t.billingPayments}
              {activeTab === 'staff' && t.staffRolePermissions}
              {activeTab === 'audit' && t.systemAuditLogs}
              {activeTab === 'dead_damaged' && t.deadStockDamagedGoods}
            </h2>
            <p className="text-gray-500 mt-1">
              {activeTab === 'overview' && t.realTimeMonitoring}
              {activeTab === 'planning' && t.enterPlannedItems}
              {activeTab === 'consumption' && t.recordActualQuantities}
              {activeTab === 'inventory_mgmt' && t.manageYourItem}
              {activeTab === 'reports' && t.detailedBreakdownOfCost}
              {activeTab === 'warehouses' && t.trackStockAcross}
              {activeTab === 'adjustments' && t.recordStockCorrections}
              {activeTab === 'batches' && t.monitorBatchNumbers}
              {activeTab === 'purchase' && t.manageSuppliers}
              {activeTab === 'sales' && t.trackSalesOrders}
              {activeTab === 'billing' && t.manageInvoices}
              {activeTab === 'staff' && t.configurePermissions}
              {activeTab === 'audit' && t.reviewAllSystem}
              {activeTab === 'dead_damaged' && t.agedObsoleteStock}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Interactive Sandbox Role Switcher */}
            <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-100 px-3 py-1.5 rounded-2xl shadow-sm">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 leading-none">{currentUser.name}</span>
                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5">{currentUser.role.replace('_', ' ')}</span>
              </div>
              <select 
                className="h-8 text-xs font-semibold rounded-xl bg-white border border-indigo-200 text-slate-700 focus:outline-none px-2 py-0.5 cursor-pointer shadow-sm"
                value={currentStaffId}
                onChange={(e) => {
                  const targetStaffId = e.target.value;
                  setCurrentStaffId(targetStaffId);
                  const selectedStaff = staff.find(s => s.id === targetStaffId);
                  if (selectedStaff) {
                    addAuditLog('Role Switch', 'User', selectedStaff.id, `Simulated login changed to ${selectedStaff.name} (Role: ${selectedStaff.role})`);
                  }
                }}
              >
                {staff.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md shadow-indigo-100 select-none">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-xs">
              <button
                onClick={() => {
                  setLanguage('en');
                  addAuditLog('Language Changed', 'System', 'en', 'System language updated to English');
                }}
                className={`px-2.5 py-1 text-[11px] font-extrabold rounded-xl transition-all ${language === 'en' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  setLanguage('ta');
                  addAuditLog('Language Changed', 'System', 'ta', 'மாநில மொழி தமிழுக்கு மாற்றப்பட்டது');
                }}
                className={`px-3 py-1 text-[11px] font-extrabold rounded-xl transition-all ${language === 'ta' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                தமிழ்
              </button>
            </div>

            {/* Notification Center */}
            <NotificationCenterPanel
              notifications={notifications}
              userState={currentUserNotifState}
              onUpdateUserState={handleUpdateUserState}
              currentUser={currentUser}
              language={language}
              onOpenSettings={() => setIsNotificationSettingsOpen(true)}
              onActionNavigate={handleNotificationActionNavigate}
            />

            <ScannerDialog inventory={inventory} onScan={(item) => {
              setActiveTab('inventory_mgmt');
              setSearchQuery(item.sku);
            }} />
            <button 
              onClick={() => setIsNotificationSettingsOpen(true)}
              className="p-3 bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer"
              title={t.notificationSettings}
              aria-label={t.notificationSettings}
            >
              <Settings2 size={20} />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title={t.totalPlannedCost} 
                    value={`₹${totalStats.totalPlanned.toLocaleString()}`}
                    icon={<TrendingUp className="text-blue-600" />}
                  />
                  <StatCard 
                    title={t.totalActualCost} 
                    value={`₹${totalStats.totalActual.toLocaleString()}`}
                    icon={<TrendingUp className="text-indigo-600" />}
                  />
                  <StatCard 
                    title={t.totalVariance} 
                    value={`₹${Math.abs(totalStats.totalVariance).toLocaleString()}`}
                    subtitle={totalStats.totalVariance > 0 ? (language === 'ta' ? "கூடுதல் செலவு (இழப்பு)" : "Extra Cost (Loss)") : (language === 'ta' ? "சேமிப்பு (லாபம்)" : "Savings (Profit)")}
                    trend={totalStats.totalVariance > 0 ? 'down' : 'up'}
                    icon={totalStats.totalVariance > 0 ? <ArrowUpRight className="text-red-600" /> : <ArrowDownRight className="text-green-600" />}
                  />
                  <StatCard 
                    title={t.reorderAlerts} 
                    value={totalStats.itemsToReorder.toString()}
                    subtitle={language === 'ta' ? "மறுஆர்டர் வரம்பிற்கு கீழே உள்ள பொருட்கள்" : "Items below reorder level"}
                    trend={totalStats.itemsToReorder > 0 ? 'down' : 'up'}
                    icon={<AlertTriangle className={totalStats.itemsToReorder > 0 ? "text-amber-600" : "text-green-600"} />}
                  />
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard 
                    title={language === 'ta' ? "மொத்த விற்பனை" : "Total Sales"} 
                    value={`₹${totalStats.totalSales.toLocaleString()}`}
                    subtitle={language === 'ta' ? "விற்பனை ஆர்டர்களிலிருந்து வருவாய்" : "Revenue from Sales Orders"}
                    icon={<ShoppingCart className="text-green-600" />}
                  />
                  <StatCard 
                    title={language === 'ta' ? "மொத்த செலவுகள்" : "Total Costs"} 
                    value={`₹${(totalStats.totalPurchases + totalStats.totalActual).toLocaleString()}`}
                    subtitle={language === 'ta' ? "கொள்முதல் + உற்பத்தி செலவுகள்" : "Purchases + Production Costs"}
                    icon={<Truck className="text-red-600" />}
                  />
                  <StatCard 
                    title={language === 'ta' ? "நிகர லாபம் / இழப்பு" : "Net Profit / Loss"} 
                    value={`₹${Math.abs(totalStats.netProfit).toLocaleString()}`}
                    subtitle={totalStats.netProfit >= 0 ? (language === 'ta' ? "நிகர ஆதாயம்" : "Net Gain") : (language === 'ta' ? "நிகர இழப்பு" : "Net Loss")}
                    trend={totalStats.netProfit >= 0 ? 'up' : 'down'}
                    icon={<ShieldCheck className={totalStats.netProfit >= 0 ? "text-green-600" : "text-red-600"} />}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Variance Chart */}
                  <Card className="lg:col-span-2 shadow-sm border-gray-200">
                    <CardHeader>
                      <CardTitle>Cost Variance by Item</CardTitle>
                      <CardDescription>Comparison of planned vs actual costs</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={varianceAnalysis}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis dataKey="itemName" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                          <Tooltip 
                            cursor={{ fill: '#F3F4F6' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Legend />
                          <Bar name="Planned" dataKey="plannedAmount" fill="#6366F1" radius={[4, 4, 0, 0]} />
                          <Bar name="Actual" dataKey="actualAmount" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Critical Alerts */}
                  <Card className="shadow-sm border-gray-200">
                    <CardHeader>
                      <CardTitle>Critical Reorders</CardTitle>
                      <CardDescription>Immediate action required</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {reorderPredictions.filter(p => p.needsReorder).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <div className="bg-green-100 p-3 rounded-full mb-3">
                            <Package className="text-green-600 w-6 h-6" />
                          </div>
                          <p className="text-sm font-medium text-gray-600">All stock levels healthy</p>
                        </div>
                      ) : (
                        reorderPredictions.filter(p => p.needsReorder).map(p => {
                          const item = inventory.find(i => i.id === p.itemId);
                          const isCritical = item && item.currentStock < item.minStock;
                          return (
                            <div key={p.itemId} className={`p-4 rounded-xl border flex justify-between items-center ${
                              isCritical 
                                ? 'bg-red-50 border-red-100' 
                                : 'bg-orange-50 border-orange-100'
                            }`}>
                              <div>
                                <p className={`font-semibold ${isCritical ? 'text-red-900' : 'text-orange-900'}`}>{p.itemName}</p>
                                <p className={`text-xs ${isCritical ? 'text-red-700' : 'text-orange-700'}`}>Stock: {p.currentStock} | Level: {p.reorderLevel}</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-xs font-bold uppercase ${isCritical ? 'text-red-900' : 'text-orange-900'}`}>Reorder</p>
                                <p className={`text-lg font-bold ${isCritical ? 'text-red-900' : 'text-orange-900'}`}>{p.reorderQuantity}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Inventory Levels Graph */}
                <Card className="shadow-sm border-gray-200">
                  <CardHeader>
                    <CardTitle>Inventory Levels vs Reorder Points</CardTitle>
                    <CardDescription>Current stock compared to calculated reorder levels</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reorderPredictions}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="itemName" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          cursor={{ fill: '#F3F4F6' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend />
                        <Bar name="Current Stock" dataKey="currentStock" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar name="Reorder Level" dataKey="reorderLevel" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'planning' && (
              <PlanningPage inventory={inventory} onAddOrder={handleAddPlannedOrder} language={language} />
            )}

            {activeTab === 'consumption' && (
              <ConsumptionPage orders={orders} onUpdateActuals={handleUpdateActuals} language={language} />
            )}

            {activeTab === 'inventory_mgmt' && (
              <InventoryMgmtPage 
                inventory={inventory} 
                categories={categories}
                warehouses={warehouses}
                currentUser={currentUser}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
                onUpdateStock={handleUpdateStock} 
                onAddItem={handleAddItem}
                onBulkImport={handleBulkImport}
                onDeleteItem={handleDeleteItem}
                language={language}
                developerToolsEnabled={!!notificationSettings.developerToolsEnabled && currentUser.role === 'admin'}
              />
            )}

            {activeTab === 'warehouses' && (
              <WarehousePage 
                warehouses={warehouses} 
                inventory={inventory}
                onAddWarehouse={(w) => {
                  setWarehouses([...warehouses, w]);
                  addAuditLog('Add Warehouse', 'Warehouse', w.id, `Warehouse ${w.name} created at ${w.location}`);
                }}
                language={language}
              />
            )}

            {activeTab === 'adjustments' && (
              <AdjustmentPage 
                adjustments={adjustments}
                inventory={inventory}
                warehouses={warehouses}
                onAddAdjustment={(a) => {
                  if (!checkPermission('makeAdjustments')) {
                    alert("🔒 Security blockade: Your current active profile does not have permission to record manual stock adjustments. Please switch to Amit Sharma or Sneha R. in the header switcher to authorize this correction.");
                    return;
                  }
                  setAdjustments([a, ...adjustments]);
                  // Update inventory stock level
                  setInventory(inventory.map(item => 
                    item.id === a.itemId ? { ...item, currentStock: item.currentStock + a.quantity } : item
                  ));
                  // Update specific warehouse stock level in tracking matrix
                  setStockLevels(prevLevels => {
                    let found = false;
                    const next = prevLevels.map(sl => {
                      if (sl.itemId === a.itemId && sl.warehouseId === a.warehouseId) {
                        found = true;
                        return { ...sl, quantity: Math.max(0, sl.quantity + a.quantity) };
                      }
                      return sl;
                    });
                    if (!found) {
                      next.push({ itemId: a.itemId, warehouseId: a.warehouseId, quantity: Math.max(0, a.quantity) });
                    }
                    return next;
                  });
                  addAuditLog('Inventory Adjustment', 'InventoryAdjustment', a.id, `${a.type.toUpperCase()} of ${a.quantity} for item ${inventory.find(i => i.id === a.itemId)?.name}`);
                }}
                language={language}
              />
            )}

            {activeTab === 'batches' && (
              <BatchPage 
                batches={batches}
                inventory={inventory}
                warehouses={warehouses}
                currentUser={currentUser}
                checkPermission={checkPermission}
                onAddBatch={(b) => {
                  setBatches([b, ...batches]);
                  // Automatically increment item master's stock when raw batch is added
                  setInventory(prevInv => prevInv.map(item => 
                    item.id === b.itemId ? { ...item, currentStock: item.currentStock + b.quantity } : item
                  ));
                  addAuditLog('Add Batch', 'Batch', b.id, `Batch ${b.batchNumber} created with ${b.quantity} ${inventory.find(i => i.id === b.itemId)?.unit} in warehouse.`);
                }}
                onBulkImportBatches={handleBulkImportBatches}
                onRecallBatch={(batchId) => {
                  const targetb = batches.find(b => b.id === batchId);
                  if (!targetb) return;
                  setBatches(prev => prev.map(b => b.id === batchId ? { ...b, recalled: true } : b));
                  // Deduct current stock in master inventory list as they are withdrawn
                  setInventory(prevInv => prevInv.map(item => 
                    item.id === targetb.itemId ? { ...item, currentStock: Math.max(0, item.currentStock - targetb.quantity) } : item
                  ));
                  addAuditLog('Batch Recall', 'Batch', batchId, `Emergency product recall initiated for Lot #${targetb.batchNumber}. Quarantined ${targetb.quantity} items from active supply lines.`);
                }}
                language={language}
              />
            )}

            {activeTab === 'purchase' && (
              <PurchasePage 
                purchaseOrders={purchaseOrders}
                suppliers={suppliers}
                inventory={inventory}
                onAddPO={(po) => {
                  setPurchaseOrders([po, ...purchaseOrders]);
                  addAuditLog('Create Purchase Order', 'PurchaseOrder', po.id, `PO created for supplier ${suppliers.find(s => s.id === po.supplierId)?.name}`);
                }}
                onAddSupplier={(s) => {
                  setSuppliers([...suppliers, s]);
                  addAuditLog('Add Supplier', 'Supplier', s.id, `Supplier ${s.name} added to database`);
                }}
                language={language}
                preloadedPOItem={preloadedPOItem}
                onClearPreloadedPO={() => setPreloadedPOItem(null)}
              />
            )}

            {activeTab === 'sales' && (
              <SalesPage 
                salesOrders={salesOrders}
                inventory={inventory}
                customers={customers}
                invoices={invoices}
                onGenerateIRN={handleGenerateIRN}
                language={language}
                onAddSO={(so) => {
                  // Calculate GST tax parameters
                  const customer = customers.find(c => c.id === so.customerId);
                  const isIntraState = !customer || !customer.state || customer.state.toLowerCase() === 'maharashtra';
                  
                  let taxableAmount = 0;
                  let cgst = 0;
                  let sgst = 0;
                  let igst = 0;

                  so.items.forEach(item => {
                    const invItem = inventory.find(i => i.id === item.itemId);
                    const lineTotal = item.quantity * item.rate;
                    const itemGstRate = invItem?.gstRate ?? 18; // Default 18%
                    
                    taxableAmount += lineTotal;
                    if (isIntraState) {
                      cgst += lineTotal * (itemGstRate / 2) / 100;
                      sgst += lineTotal * (itemGstRate / 2) / 100;
                    } else {
                      igst += lineTotal * itemGstRate / 100;
                    }
                  });

                  const totalTax = cgst + sgst + igst;
                  const finalInvoiceTotal = taxableAmount + totalTax;

                  const updatedSo: SalesOrder = {
                    ...so,
                    totalAmount: finalInvoiceTotal
                  };

                  setSalesOrders([updatedSo, ...salesOrders]);
                  // Calculate FIFO batch deductions synchronously
                  let updatedBatches = [...batches];
                  let fifoDeductionLogDetails = '';
                  so.items.forEach(soldItem => {
                    let quantityToDeduct = soldItem.quantity;
                    const itemObj = inventory.find(i => i.id === soldItem.itemId);
                    const itemName = itemObj?.name || 'Unknown';
                    
                    // Filter and sort active, non-recalled batches of this item buy manufactureDate ascending (oldest first)
                    const itemBatchesIndices = updatedBatches
                      .map((b, index) => ({ b, index }))
                      .filter(entry => entry.b.itemId === soldItem.itemId && !entry.b.recalled && entry.b.quantity > 0)
                      .sort((a, b) => new Date(a.b.manufactureDate).getTime() - new Date(b.b.manufactureDate).getTime());
                    
                    let totalDeductionsForThisItem: { batchNumber: string, qty: number }[] = [];
                    for (const entry of itemBatchesIndices) {
                      if (quantityToDeduct <= 0) break;
                      const batch = updatedBatches[entry.index];
                      if (batch.quantity >= quantityToDeduct) {
                        totalDeductionsForThisItem.push({ batchNumber: batch.batchNumber, qty: quantityToDeduct });
                        updatedBatches[entry.index] = {
                          ...batch,
                          quantity: batch.quantity - quantityToDeduct
                        };
                        quantityToDeduct = 0;
                      } else {
                        totalDeductionsForThisItem.push({ batchNumber: batch.batchNumber, qty: batch.quantity });
                        quantityToDeduct -= batch.quantity;
                        updatedBatches[entry.index] = {
                          ...batch,
                          quantity: 0
                        };
                      }
                    }
                    
                    if (totalDeductionsForThisItem.length > 0) {
                      const itemslog = totalDeductionsForThisItem.map(td => `${td.batchNumber} (-${td.qty} ${itemObj?.unit || ''})`).join(', ');
                      fifoDeductionLogDetails += `[FIFO Auto-Sell from Batches: ${itemslog}] `;
                    }
                    
                    if (quantityToDeduct > 0) {
                      fifoDeductionLogDetails += `[Warning: Oversold limit exceeded active batch stocks by ${quantityToDeduct} ${itemObj?.unit || ''}] `;
                    }
                  });
                  setBatches(updatedBatches);

                  // Deduct stock for sales
                  setInventory(inventory.map(item => {
                    const soldItem = so.items.find(si => si.itemId === item.id);
                    return soldItem ? { ...item, currentStock: Math.max(0, item.currentStock - soldItem.quantity) } : item;
                  }));
                  
                  // Auto-create Invoice
                  const newInvoice: Invoice = {
                    id: `INV-${so.id.split('-')[1] || Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                    orderId: so.id,
                    orderType: 'sales',
                    date: so.date,
                    dueDate: new Date(new Date(so.date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    totalAmount: finalInvoiceTotal,
                    paidAmount: 0,
                    status: 'unpaid',
                    taxableAmount,
                    cgst,
                    sgst,
                    igst,
                    irnGenerated: false
                  };
                  setInvoices([newInvoice, ...invoices]);
                  
                  addAuditLog('Create Sales Order', 'SalesOrder', so.id, `SO created for customer ${so.customerName}. GST Calculated: ₹${totalTax.toFixed(2)} (${isIntraState ? 'CGST+SGST' : 'IGST'}). Invoice ${newInvoice.id} generated. ${fifoDeductionLogDetails}`);
                }}
              />
            )}

            {activeTab === 'billing' && (
              <BillingPage 
                invoices={invoices}
                setInvoices={setInvoices}
                payments={payments}
                customers={customers}
                salesOrders={salesOrders}
                setSalesOrders={setSalesOrders}
                inventory={inventory}
                purchaseOrders={purchaseOrders}
                suppliers={suppliers}
                onGenerateIRN={handleGenerateIRN}
                language={language}
                onAddPayment={(p) => {
                  setPayments([p, ...payments]);
                  // Update Invoice paid amount
                  setInvoices(invoices.map(inv => {
                    if (inv.id === p.invoiceId) {
                      const newPaidAmount = inv.paidAmount + p.amount;
                      let newStatus: Invoice['status'] = inv.status;
                      if (newPaidAmount >= inv.totalAmount) newStatus = 'paid';
                      else if (newPaidAmount > 0) newStatus = 'partial';
                      return { ...inv, paidAmount: newPaidAmount, status: newStatus };
                    }
                    return inv;
                  }));
                  addAuditLog('Record Payment', 'Payment', p.id, `Payment of ₹${p.amount} received for invoice ${p.invoiceId}`);
                }}
                onAddCustomer={(c) => {
                  setCustomers([...customers, c]);
                  addAuditLog('Add Customer', 'Customer', c.id, `Customer ${c.name} added to database`);
                }}
                addAuditLog={addAuditLog}
                checkPermission={checkPermission}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogPage logs={auditLogs} language={language} />
            )}

            {activeTab === 'staff' && (
              checkPermission('manageStaff') ? (
                <RoleStaffManagementPanel 
                  staff={staff} 
                  onUpdateStaff={setStaff} 
                  onAddStaff={(newS) => {
                    setStaff([...staff, newS]);
                    addAuditLog('Onboard Staff', 'Staff', newS.id, `Onboarded new staff member ${newS.name} with role '${newS.role}'`);
                  }}
                  addAuditLog={addAuditLog}
                  language={language}
                  onSimulateSwitchUser={(staffId) => {
                    setCurrentStaffId(staffId);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-3xl p-8 text-center max-w-xl mx-auto shadow-sm">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
                    <Lock size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Access Restricted</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                    You do not have the required <span className="font-bold text-red-650">Manage Staff</span> permission to administer employee profile roles or credentials.
                  </p>
                  <p className="text-[11px] text-indigo-550 font-semibold mt-4">
                    Switch to "Sneha R. (Admin)" in the top right header to unlock.
                  </p>
                </div>
              )
            )}

            {activeTab === 'reports' && (
              <FinancialReportsPage 
                inventory={inventory}
                salesOrders={salesOrders}
                purchaseOrders={purchaseOrders}
                orders={orders}
                customers={customers}
                varianceAnalysis={varianceAnalysis}
                batches={batches}
                categories={categories}
                language={language}
                adaptiveSettings={adaptiveSettings}
                onApplyAdaptiveSettings={setAdaptiveSettings}
              />
            )}

            {activeTab === 'dead_damaged' && (
              <DeadStockDamagedPage 
                inventory={inventory}
                adjustments={adjustments}
                warehouses={warehouses}
                categories={categories}
                salesOrders={salesOrders}
                orders={orders}
                purchaseOrders={purchaseOrders}
                onAddAdjustment={(a) => {
                  if (!checkPermission('makeAdjustments')) {
                    alert("🔒 Security blockade: Your current active profile does not have permission to record stock adjustments or damage incidents. Please switch to Amit Sharma or Sneha R. in the header switcher.");
                    return;
                  }
                  setAdjustments([a, ...adjustments]);
                  setInventory(inventory.map(item => 
                    item.id === a.itemId ? { ...item, currentStock: item.currentStock + a.quantity } : item
                  ));
                  // Sync warehouse stock matrix
                  setStockLevels(prevLevels => {
                    let found = false;
                    const next = prevLevels.map(sl => {
                      if (sl.itemId === a.itemId && sl.warehouseId === a.warehouseId) {
                        found = true;
                        return { ...sl, quantity: Math.max(0, sl.quantity + a.quantity) };
                      }
                      return sl;
                    });
                    if (!found) {
                      next.push({ itemId: a.itemId, warehouseId: a.warehouseId, quantity: Math.max(0, a.quantity) });
                    }
                    return next;
                  });
                  addAuditLog('Inventory Adjustment', 'InventoryAdjustment', a.id, `${a.type.toUpperCase()} of ${a.quantity} for item ${inventory.find(i => i.id === a.itemId)?.name}`);
                }}
                onUpdateAdjustmentDisposition={(adjId, disposition) => {
                  setAdjustments(prevAdjustments => prevAdjustments.map(adj => {
                    if (adj.id === adjId) {
                      if (disposition === 'Repaired' && adj.disposition !== 'Repaired') {
                        const restoreQty = Math.abs(adj.quantity);
                        setInventory(prevInventory => prevInventory.map(item => 
                          item.id === adj.itemId ? { ...item, currentStock: item.currentStock + restoreQty } : item
                        ));
                        // Sync specific warehouse stock mapping
                        setStockLevels(prevLevels => prevLevels.map(sl => {
                          if (sl.itemId === adj.itemId && sl.warehouseId === adj.warehouseId) {
                            return { ...sl, quantity: sl.quantity + restoreQty };
                          }
                          return sl;
                        }));
                        addAuditLog('Restore Repaired Stock', 'InventoryAdjustment', adjId, `Repaired and restored ${restoreQty} units of ${inventory.find(i => i.id === adj.itemId)?.name} back to master stock.`);
                      } else {
                        addAuditLog('Update Damage Disposition', 'InventoryAdjustment', adjId, `Damage status changed as resolved under disposition: ${disposition}`);
                      }
                      return { ...adj, disposition };
                    }
                    return adj;
                  }));
                }}
              />
            )}

            {activeTab === 'branch_sync' && (
              <BranchSyncTransferPage 
                inventory={inventory}
                warehouses={warehouses}
                stockLevels={stockLevels}
                transfers={transfers}
                syncStatuses={syncStatuses}
                onAddWarehouse={(w) => {
                  setWarehouses([...warehouses, w]);
                  setStockLevels(prev => {
                    const next = [...prev];
                    inventory.forEach(item => {
                      next.push({ itemId: item.id, warehouseId: w.id, quantity: 0 });
                    });
                    return next;
                  });
                  setSyncStatuses(prev => [
                    ...prev,
                    {
                      warehouseId: w.id,
                      lastSyncedAt: 'Never Synced',
                      syncStatus: 'pending_sync',
                      unresolvedChangesCount: 0,
                      latencyMs: 50
                    }
                  ]);
                  addAuditLog('Add Warehouse', 'Warehouse', w.id, `Warehouse ${w.name} created at ${w.location}`);
                }}
                onAddTransfer={(t) => {
                  setTransfers([t, ...transfers]);
                  addAuditLog('Add Stock Transfer', 'StockTransfer', t.id, `Stock transfer ${t.trackingNumber} initiated for ${t.quantity} items from ${warehouses.find(w => w.id === t.sourceWarehouseId)?.name} to ${warehouses.find(w => w.id === t.destWarehouseId)?.name}`);
                }}
                onUpdateTransferStatus={(transferId, status) => {
                  setTransfers(prevTransfers => prevTransfers.map(trf => {
                    if (trf.id === transferId) {
                      const prevStatus = trf.status;
                      
                      // Perform physical stock distribution updates
                      if (status === 'transit' && prevStatus === 'pending') {
                        setStockLevels(prevLevels => prevLevels.map(sl => {
                          if (sl.itemId === trf.itemId && sl.warehouseId === trf.sourceWarehouseId) {
                            return { ...sl, quantity: Math.max(0, sl.quantity - trf.quantity) };
                          }
                          return sl;
                        }));
                        addAuditLog('Stock Transfer Dispatched', 'StockTransfer', trf.id, `Dispatched shipment ${trf.trackingNumber} containing ${trf.quantity} units from ${warehouses.find(w => w.id === trf.sourceWarehouseId)?.name}.`);
                      }
                      else if (status === 'received' && prevStatus === 'transit') {
                        setStockLevels(prevLevels => prevLevels.map(sl => {
                          if (sl.itemId === trf.itemId && sl.warehouseId === trf.destWarehouseId) {
                            return { ...sl, quantity: sl.quantity + trf.quantity };
                          }
                          return sl;
                        }));
                        addAuditLog('Stock Transfer Received', 'StockTransfer', trf.id, `Verified check-in of ${trf.quantity} units for shipment ${trf.trackingNumber} at ${warehouses.find(w => w.id === trf.destWarehouseId)?.name}.`);
                      }
                      else if (status === 'cancelled' && prevStatus === 'transit') {
                        setStockLevels(prevLevels => prevLevels.map(sl => {
                          if (sl.itemId === trf.itemId && sl.warehouseId === trf.sourceWarehouseId) {
                            return { ...sl, quantity: sl.quantity + trf.quantity };
                          }
                          return sl;
                        }));
                        addAuditLog('Stock Transfer Aborted', 'StockTransfer', trf.id, `Aborted shipment ${trf.trackingNumber}; restored ${trf.quantity} units back to ${warehouses.find(w => w.id === trf.sourceWarehouseId)?.name}.`);
                      }
                      else if (status === 'cancelled' && prevStatus === 'pending') {
                        addAuditLog('Stock Transfer Cancelled', 'StockTransfer', trf.id, `Cancelled pending transfer order ${trf.trackingNumber}.`);
                      }
                      return { ...trf, status };
                    }
                    return trf;
                  }));
                }}
                onSyncBranch={(whId) => {
                  setSyncStatuses(prev => prev.map(s => {
                    if (s.warehouseId === whId) {
                      return {
                        ...s,
                        lastSyncedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
                        syncStatus: 'synced',
                        unresolvedChangesCount: 0
                      };
                    }
                    return s;
                  }));
                  addAuditLog('Branch Re-Sync', 'Warehouse', whId, `Manual parity synchronization triggered for branch ${warehouses.find(w => w.id === whId)?.name}`);
                }}
                onSyncAllBranches={() => {
                  setSyncStatuses(prev => prev.map(s => {
                    return {
                      ...s,
                      lastSyncedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
                      syncStatus: 'synced',
                      unresolvedChangesCount: 0
                    };
                  }));
                  addAuditLog('Global Branch Sync', 'Warehouse', 'ALL', 'Dispatched multi-branch sync requests to regional cloud buffers; all hubs report 100% database parity.');
                }}
                checkPermission={(perm) => checkPermission(perm as any)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
        settings={notificationSettings}
        onSave={handleSaveNotificationSettings}
        currentUser={currentUser}
        language={language}
      />
    </div>
  );
}

// --- Sub-Pages ---

function PlanningPage({ inventory, onAddOrder, language = 'en' }: { inventory: InventoryItem[], onAddOrder: (order: ProductionOrder) => void, language?: Language }) {
  const [orderId, setOrderId] = useState('');
  const [itemName, setItemName] = useState('');
  const [plannedQty, setPlannedQty] = useState('');
  const [plannedRate, setPlannedRate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName) {
      alert(language === 'ta' ? "தயாரிப்பு பெயர் உள்ளிடவும்" : "Please enter an item name.");
      return;
    }
    
    // Try to find matching item in inventory to link ID
    const item = inventory.find(i => i.name.toLowerCase() === itemName.toLowerCase());

    const newOrder: ProductionOrder = {
      id: orderId || `ORD-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      status: 'planned',
      items: [{
        id: Math.random().toString(36).substr(2, 9),
        itemId: item?.id || itemName.toLowerCase().replace(/\s+/g, '-'),
        itemName: itemName,
        plannedQty: Number(plannedQty),
        plannedRate: Number(plannedRate),
      }]
    };

    onAddOrder(newOrder);
    setOrderId('');
    setItemName('');
    setPlannedQty('');
    setPlannedRate('');
    alert(language === 'ta' ? "தயாரிப்பு திட்டம் வெற்றிகரமாக உருவாக்கப்பட்டது!" : "Production plan created successfully!");
  };

  return (
    <Card className="shadow-sm border-gray-200 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{tText("Create Production Plan", language)}</CardTitle>
        <CardDescription>{tText("Define the expected quantities and costs for a new production run.", language)}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="orderId">{tText("Order ID", language)}</Label>
              <Input id="orderId" placeholder="e.g. ORD-001" value={orderId} onChange={e => setOrderId(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemName">{tText("Item Name", language)}</Label>
              <Input id="itemName" placeholder="e.g. Fabric (Cotton)" value={itemName} onChange={e => setItemName(e.target.value)} required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="plannedQty">{tText("Planned Quantity", language)}</Label>
              <Input id="plannedQty" type="number" placeholder="e.g. 100" value={plannedQty} onChange={e => setPlannedQty(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plannedRate">{tText("Planned Rate", language)} (₹)</Label>
              <Input id="plannedRate" type="number" placeholder="e.g. 250" value={plannedRate} onChange={e => setPlannedRate(e.target.value)} required />
            </div>
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg font-bold">
            {tText("Add Planned Item", language)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ConsumptionPage({ orders, onUpdateActuals, language = 'en' }: { orders: ProductionOrder[], onUpdateActuals: (id: string, items: any[]) => void, language?: Language }) {
  const [orderId, setOrderId] = useState('');
  const [itemName, setItemName] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [actualRate, setActualRate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find the order by ID
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      alert(language === 'ta' ? "ஆணை ஐடி கிடைக்கவில்லை!" : "Order ID not found. Please check and try again.");
      return;
    }

    if (order.status === 'completed') {
      alert(language === 'ta' ? "இந்த ஆணை ஏற்கனவே முடிவடைந்தது!" : "This order is already completed.");
      return;
    }

    // Find the item within the order by name
    const item = order.items.find(i => i.itemName.toLowerCase() === itemName.toLowerCase());
    if (!item) {
      alert(language === 'ta' ? `பொருள் "${itemName}" ஆணை ${orderId}-ல் இல்லை.` : `Item "${itemName}" not found in Order ${orderId}.`);
      return;
    }

    const actualItems = [{
      itemId: item.itemId,
      actualQty: Number(actualQty),
      actualRate: Number(actualRate)
    }];

    onUpdateActuals(orderId, actualItems);
    setOrderId('');
    setItemName('');
    setActualQty('');
    setActualRate('');
    alert(language === 'ta' ? "சரக்கு பயன்பாடு வெற்றிகரமாக பதிவுசெய்யப்பட்டது!" : "Consumption recorded and order completed!");
  };

  return (
    <Card className="shadow-sm border-gray-200 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{tText("Record Actual Consumption", language)}</CardTitle>
        <CardDescription>{tText("Define the expected quantities and costs for a new production run.", language)}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="orderId">{tText("Order ID", language)}</Label>
              <Input id="orderId" placeholder="e.g. ORD-001" value={orderId} onChange={e => setOrderId(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemName">{tText("Item Name", language)}</Label>
              <Input id="itemName" placeholder="e.g. Fabric (Cotton)" value={itemName} onChange={e => setItemName(e.target.value)} required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="actualQty">{tText("Actual Quantity Used", language)}</Label>
              <Input id="actualQty" type="number" placeholder="e.g. 110" value={actualQty} onChange={e => setActualQty(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualRate">{tText("Actual Rate (₹)", language)}</Label>
              <Input id="actualRate" type="number" placeholder="e.g. 260" value={actualRate} onChange={e => setActualRate(e.target.value)} required />
            </div>
          </div>

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg font-bold">
            {tText("Record & Submit Consumption", language)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function InventoryMgmtPage({ 
  inventory, 
  categories, 
  warehouses,
  currentUser,
  searchQuery, 
  onClearSearch, 
  onUpdateStock, 
  onAddItem, 
  onBulkImport,
  onDeleteItem, 
  language = 'en',
  developerToolsEnabled = false
}: { 
  inventory: InventoryItem[], 
  categories: Category[],
  warehouses: Warehouse[],
  currentUser: Staff,
  searchQuery: string,
  onClearSearch: () => void,
  onUpdateStock: (id: string, stock: number) => void,
  onAddItem: (item: InventoryItem) => void,
  onBulkImport: (payload: any) => void,
  onDeleteItem: (id: string) => void,
  language?: Language,
  developerToolsEnabled?: boolean
}) {
  const [importOpen, setImportOpen] = useState(false);
  const canImport = currentUser.role === 'admin' || currentUser.role === 'inventory_manager';

  const filteredInventory = inventory.filter(item => 
    !searchQuery || 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {searchQuery ? (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl">
            <span className="text-sm font-medium text-indigo-700">{language === 'ta' ? "வடிகட்டப்பட்டது:" : "Filtering by:"} <span className="font-bold">{searchQuery}</span></span>
            <button 
              onClick={onClearSearch}
              className="ml-2 p-1 hover:bg-indigo-100 rounded-full text-indigo-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : <div />}
        <div className="flex items-center gap-2.5">
          {canImport ? (
            <Button 
              onClick={() => setImportOpen(true)}
              variant="outline" 
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 rounded-xl font-bold shadow-2xs"
            >
              <UploadCloud className="mr-2 h-4 w-4 text-indigo-600" /> {language === 'ta' ? "இறக்குமதி" : "Import"}
            </Button>
          ) : (
            <div title={language === 'ta' ? "நிர்வாகி மற்றும் சரக்கு மேலாளர் மட்டுமே பொருட்களை இறக்குமதி செய்ய முடியும்." : "Only Admin and Inventory Manager can import inventory items."}>
              <Button 
                variant="outline" 
                disabled 
                className="rounded-xl border-dashed border-slate-300 text-slate-400 cursor-not-allowed opacity-60"
              >
                <UploadCloud className="mr-2 h-4 w-4" /> {language === 'ta' ? "இறக்குமதி" : "Import"}
              </Button>
            </div>
          )}
          <AddItemDialog onAdd={onAddItem} categories={categories} />
          <BulkImportModal
            open={importOpen}
            onOpenChange={setImportOpen}
            inventory={inventory}
            categories={categories}
            warehouses={warehouses}
            currentUser={currentUser}
            language={language}
            developerToolsEnabled={developerToolsEnabled}
            onImportComplete={onBulkImport}
          />
        </div>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle>{tText("Item Master List", language)}</CardTitle>
          <CardDescription>{tText("Manage your item master, SKUs, and categories.", language)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tText("SKU / Barcode", language)}</TableHead>
                <TableHead>{tText("Item Name", language)}</TableHead>
                <TableHead>{tText("Category", language)}</TableHead>
                <TableHead>{language === 'ta' ? "தற்போதைய இருப்பு" : "Stock Level"}</TableHead>
                <TableHead>{language === 'ta' ? "பாதுகாப்பு வரம்பு" : "Min Stock"}</TableHead>
                <TableHead className="text-right">{tText("Actions", language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                    {language === 'ta' ? "தேடலுக்கு பொருந்தும் பொருட்கள் எதுவும் இல்லை." : "No items found matching your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-mono text-xs text-gray-500">{item.sku}</p>
                        <BarcodeDisplay value={item.barcode || 'N/A'} />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-gray-50">
                        {categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          item.currentStock < item.minStock ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                          item.currentStock < item.minStock * 1.5 ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 
                          'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                        }`} />
                        <span className={`font-bold ${
                          item.currentStock < item.minStock ? 'text-red-600' : 
                          item.currentStock < item.minStock * 1.5 ? 'text-orange-600' : 
                          'text-green-600'
                        }`}>
                          {item.currentStock}
                        </span>
                        <span className="text-xs text-gray-400">{item.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.minStock}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <UpdateStockDialog item={item} onUpdate={onUpdateStock} />
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDeleteItem(item.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// --- New Sub-Pages ---

function WarehousePage({ warehouses, inventory, onAddWarehouse, language = 'en' }: { 
  warehouses: Warehouse[], 
  inventory: InventoryItem[],
  onAddWarehouse: (w: Warehouse) => void,
  language?: Language
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddWarehouse({ id: `wh-${Date.now()}`, name, location });
    setOpen(false);
    setName('');
    setLocation('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="bg-indigo-600 text-white rounded-xl font-bold" />}>
            <Plus className="mr-2 h-4 w-4" /> {language === 'ta' ? "புதிய கிடங்கைச் சேர்க்க" : "Add Warehouse"}
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader><DialogTitle>{language === 'ta' ? "புதிய கிடங்கு சேர்க்க" : "Add New Warehouse"}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>{tText("Warehouse Name", language)}</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>{language === 'ta' ? "இருப்பிடம்" : "Location"}</Label><Input value={location} onChange={e => setLocation(e.target.value)} required /></div>
              </div>
              <DialogFooter><Button type="submit" className="w-full bg-indigo-600 text-white font-bold">{language === 'ta' ? "உருவாக்கு" : "Create Warehouse"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {warehouses.map(wh => (
          <Card key={wh.id} className="shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{wh.name}</CardTitle>
                <CardDescription>{wh.location}</CardDescription>
              </div>
              <Store className="text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{language === 'ta' ? "விரைவான புள்ளிவிவரங்கள்" : "Quick Stats"}</p>
                <div className="flex justify-between text-sm">
                  <span>{language === 'ta' ? "மொத்த பொருட்கள்:" : "Total Items:"}</span>
                  <span className="font-bold">{inventory.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{language === 'ta' ? "திறன் நிலை:" : "Capacity:"}</span>
                  <span className="text-green-600 font-bold">{language === 'ta' ? "உகந்தது" : "Optimal"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdjustmentPage({ adjustments, inventory, warehouses, onAddAdjustment, language = 'en' }: {
  adjustments: InventoryAdjustment[],
  inventory: InventoryItem[],
  warehouses: Warehouse[],
  onAddAdjustment: (a: InventoryAdjustment) => void,
  language?: Language
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    itemId: '',
    warehouseId: warehouses[0]?.id || '',
    type: 'correction' as any,
    quantity: '',
    reason: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAdjustment({
      id: `ADJ-${Date.now()}`,
      itemId: formData.itemId,
      warehouseId: formData.warehouseId,
      type: formData.type,
      quantity: Number(formData.quantity),
      date: new Date().toISOString().split('T')[0],
      reason: formData.reason
    });
    setOpen(false);
    setFormData({ itemId: '', warehouseId: warehouses[0]?.id || '', type: 'correction', quantity: '', reason: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="bg-indigo-600 text-white rounded-xl font-bold" />}>
            <Plus className="mr-2 h-4 w-4" /> {language === 'ta' ? "புதிய சரக்கு திருத்தம்" : "New Adjustment"}
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader><DialogTitle>{language === 'ta' ? "சரக்கு அளவு சரிசெய்தல்" : "Inventory Adjustment"}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{language === 'ta' ? "உருப்படி / தயாரிப்பு" : "Item"}</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.itemId} onChange={e => setFormData({...formData, itemId: e.target.value})} required>
                    <option value="">{language === 'ta' ? "-- உருப்படியைத் தேர்ந்தெடுக்கவும் --" : "-- Select Item --"}</option>
                    {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ta' ? "வகை" : "Type"}</Label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                      <option value="correction">{language === 'ta' ? "திருத்தம்" : "Correction"}</option>
                      <option value="damage">{language === 'ta' ? "சேதம்" : "Damage"}</option>
                      <option value="theft">{language === 'ta' ? "திருட்டு" : "Theft"}</option>
                      <option value="return">{language === 'ta' ? "திரும்பப் பெறுதல்" : "Return"}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ta' ? "அளவு (+/-)" : "Quantity (+/-)"}</Label>
                    <Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-2"><Label>{tText("Reason", language)}</Label><Input value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required /></div>
              </div>
              <DialogFooter><Button type="submit" className="w-full bg-indigo-600 text-white font-bold">{language === 'ta' ? "சரிசெய்தலைச் சேமி" : "Record Adjustment"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader><CardTitle>{tText("Adjustment History", language)}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tText("Date", language)}</TableHead>
                <TableHead>{tText("Item", language)}</TableHead>
                <TableHead>{tText("Type", language)}</TableHead>
                <TableHead>{tText("Quantity", language)}</TableHead>
                <TableHead>{tText("Reason", language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.map(adj => (
                <TableRow key={adj.id}>
                  <TableCell>{adj.date}</TableCell>
                  <TableCell className="font-medium">{inventory.find(i => i.id === adj.itemId)?.name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{adj.type}</Badge></TableCell>
                  <TableCell className={adj.quantity > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">{adj.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BatchPage({ 
  batches, 
  inventory, 
  warehouses, 
  currentUser,
  onAddBatch, 
  onBulkImportBatches,
  onRecallBatch, 
  checkPermission, 
  language = 'en' 
}: {
  batches: Batch[],
  inventory: InventoryItem[],
  warehouses: Warehouse[],
  currentUser: Staff,
  onAddBatch: (b: Batch) => void,
  onBulkImportBatches: (payload: any) => void,
  onRecallBatch: (id: string) => void,
  checkPermission: (perm: keyof Staff['permissions']) => boolean,
  language?: Language
}) {
  const [open, setOpen] = useState(false);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const canImportBatches = currentUser.role === 'admin' || currentUser.role === 'inventory_manager';

  const [formData, setFormData] = useState({ 
    itemId: inventory[0]?.id || '', 
    batchNumber: '', 
    manufactureDate: '2026-05-26', 
    expiryDate: '', 
    quantity: '', 
    warehouseId: warehouses[0]?.id || '' 
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [itemFilter, setItemFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'expired' | 'urgent' | 'low' | 'attention' | 'optimal' | 'recalled'
  const [sandboxItemId, setSandboxItemId] = useState(inventory[0]?.id || '1');

  // Helper to generate dynamic batch numbers
  const handleAutoGenerateBatchNumber = () => {
    const selectedItem = inventory.find(i => i.id === formData.itemId);
    const prefix = selectedItem ? selectedItem.sku.split('-')[0].substring(0, 3).toUpperCase() : 'LOT';
    const cleanDate = new Date().toISOString().split('T')[0].replace(/-/g, '').substring(2, 8);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setFormData(prev => ({
      ...prev,
      batchNumber: `BAT-${prefix}-${cleanDate}-${randomSuffix}`
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkPermission('manageBatches')) {
      alert("🔒 Security Gate Blocked: Your active profile does not possess 'Manage Batches & Mfg' clearance level. Select Amit Sharma (Manager) or Sneha R (Admin) in the top right to execute.");
      return;
    }
    if (!formData.itemId) return;
    
    // Auto-fill manufactureDate if empty
    const mDate = formData.manufactureDate || '2026-05-26';
    onAddBatch({ 
      id: `BAT-${Date.now()}`, 
      itemId: formData.itemId,
      batchNumber: formData.batchNumber || `BAT-LOT-${Math.floor(Math.random() * 10000)}`,
      manufactureDate: mDate,
      expiryDate: formData.expiryDate || '2026-11-26',
      quantity: Number(formData.quantity) || 0,
      warehouseId: formData.warehouseId
    });
    
    setOpen(false);
    setFormData({ 
      itemId: inventory[0]?.id || '', 
      batchNumber: '', 
      manufactureDate: '2026-05-26', 
      expiryDate: '', 
      quantity: '', 
      warehouseId: warehouses[0]?.id || '' 
    });
  };

  // Base reference date matching context: 2026-05-26
  const REFERENCE_DATE = new Date('2026-05-26');

  // Compute stats and enrich batches with helper warning metrics
  const enrichedBatches = useMemo(() => {
    return batches.map(batch => {
      const manufacturingTime = new Date(batch.manufactureDate).getTime();
      const expiryTime = new Date(batch.expiryDate).getTime();
      
      const diffTime = expiryTime - REFERENCE_DATE.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let statusLabel: 'Expired' | 'Urgent' | 'Low' | 'Attention' | 'Optimal' = 'Optimal';
      let badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      
      if (diffDays <= 0) {
        statusLabel = 'Expired';
        badgeClass = 'bg-red-100 text-red-700 border border-red-300 font-bold animate-pulse';
      } else if (diffDays <= 7) {
        statusLabel = 'Urgent';
        badgeClass = 'bg-red-50 text-red-600 border border-red-200 animate-pulse';
      } else if (diffDays <= 15) {
        statusLabel = 'Low';
        badgeClass = 'bg-orange-50 text-orange-600 border border-orange-200';
      } else if (diffDays <= 30) {
        statusLabel = 'Attention';
        badgeClass = 'bg-amber-50 text-amber-600 border border-amber-200';
      }
      
      return {
        ...batch,
        diffDays,
        statusLabel,
        badgeClass
      };
    });
  }, [batches]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalLots = enrichedBatches.length;
    let expiredUrgentCount = 0; // <= 7 days
    let cautionCount = 0; // 8 to 30 days
    let healthyCount = 0; // > 30 days
    let recalledCount = 0;

    enrichedBatches.forEach(b => {
      if (b.recalled) {
        recalledCount++;
      } else {
        if (b.diffDays <= 7) {
          expiredUrgentCount++;
        } else if (b.diffDays <= 30) {
          cautionCount++;
        } else {
          healthyCount++;
        }
      }
    });

    return { totalLots, expiredUrgentCount, cautionCount, healthyCount, recalledCount };
  }, [enrichedBatches]);

  // Handle Filtering
  const filteredBatches = useMemo(() => {
    return enrichedBatches.filter(b => {
      const item = inventory.find(i => i.id === b.itemId);
      const itemName = item?.name || '';
      
      // Search matching batch number or item name
      const matchesSearch = b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            itemName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesItem = itemFilter === 'all' || b.itemId === itemFilter;
      
      let matchesStatus = true;
      if (statusFilter === 'expired') matchesStatus = b.diffDays <= 0 && !b.recalled;
      else if (statusFilter === 'urgent') matchesStatus = b.diffDays > 0 && b.diffDays <= 7 && !b.recalled;
      else if (statusFilter === 'low') matchesStatus = b.diffDays > 7 && b.diffDays <= 15 && !b.recalled;
      else if (statusFilter === 'attention') matchesStatus = b.diffDays > 15 && b.diffDays <= 30 && !b.recalled;
      else if (statusFilter === 'optimal') matchesStatus = b.diffDays > 30 && !b.recalled;
      else if (statusFilter === 'recalled') matchesStatus = !!b.recalled;

      return matchesSearch && matchesItem && matchesStatus;
    });
  }, [enrichedBatches, searchQuery, itemFilter, statusFilter, inventory]);

  // FIFO scheduler timeline view calculation for sandbox
  const fifoItemBatches = useMemo(() => {
    return enrichedBatches
      .filter(b => b.itemId === sandboxItemId)
      .sort((a, b) => new Date(a.manufactureDate).getTime() - new Date(b.manufactureDate).getTime());
  }, [enrichedBatches, sandboxItemId]);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Critical Notifications panel */}
      {stats.expiredUrgentCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-900 p-4 rounded-2xl shadow-sm">
          <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 animate-bounce" />
          <div className="flex-1 text-xs">
            <span className="font-bold">CRITICAL EXPIRY ALERT:</span> There are <span className="font-extrabold">{stats.expiredUrgentCount} batch(es)</span> that are currently expired or expiring within 7 days. Review and recall or prioritize immediate dispatch!
          </div>
        </div>
      )}

      {/* Top statistics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase">{language === 'ta' ? "மொத்த தொகுதிகள்" : "Total Lot Registers"}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-gray-900">{stats.totalLots}</div>
            <p className="text-[10px] text-gray-400 mt-0.5">{language === 'ta' ? "அனைத்து கிடங்குகளிலும்" : "Across all warehouses"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 bg-white">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xs font-semibold text-gray-500 uppercase">{language === 'ta' ? "காலாவதியானவை & அவசரமானவை" : "Expired & Urgent"}</CardTitle>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-600">{stats.expiredUrgentCount}</div>
            <p className="text-[10px] text-red-500 font-medium mt-0.5">{language === 'ta' ? "காலாவதி தூரம் ≤ 7 நாட்கள்" : "Expires in ≤ 7 days"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase">{language === 'ta' ? "வரவிருக்கும் எச்சரிக்கைகள்" : "Upcoming Alerts"}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-orange-500">{stats.cautionCount}</div>
            <p className="text-[10px] text-orange-500 font-medium mt-0.5">{language === 'ta' ? "எச்சரிக்கை வரம்பு (8 - 30 நாட்கள்)" : "Expiry warning (8 - 30 days)"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 bg-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase">{language === 'ta' ? "உகந்த தொகுதிகள்" : "Optimal Batches"}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{stats.healthyCount}</div>
            <p className="text-[10px] text-emerald-500 font-medium mt-0.5">{language === 'ta' ? "பாதுகாப்பான நிலை (> 30 நாட்கள்)" : "Safe status (> 30 days)"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 bg-white border-l-4 border-l-rose-500 bg-rose-50/20">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase">{language === 'ta' ? "திரும்பப் பெறப்பட்டவை" : "Quarantined / Recalled"}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-800">{stats.recalledCount}</div>
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">{language === 'ta' ? "விற்பனை தற்காலிக நிறுத்தம்" : "Withdrawn from sales pipelines"}</p>
          </CardContent>
        </Card>
      </div>

      {/* FIFO Auto-Sell interactive sandbox simulator */}
      <Card className="shadow-sm border-gray-200 bg-gradient-to-tr from-slate-50 to-indigo-50/30">
        <CardHeader className="pb-3">
          <div className="lg:flex justify-between items-center">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                FIFO Interactive Auto-Sell Simulator
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Indian standard supply chain auto-deduct scheduler. Highlight oldest batch to be sold first chronologically.
              </CardDescription>
            </div>
            <div className="mt-2 lg:mt-0 flex gap-2">
              <label className="text-xs text-slate-500 self-center font-semibold">Select Item:</label>
              <select 
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                value={sandboxItemId}
                onChange={e => setSandboxItemId(e.target.value)}
              >
                {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            {fifoItemBatches.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-3 italic">No active batches recorded for this item. Add some batches above to simulate FIFO rules.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Chronological FIFO Dispatch Schedule:</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    Sorted by oldest manufacture date
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                  {fifoItemBatches.map((batch, index) => {
                    const isNextToSell = !batch.recalled && batch.quantity > 0 && 
                      fifoItemBatches.findIndex(b => !b.recalled && b.quantity > 0) === index;
                    
                    return (
                      <div 
                        key={batch.id} 
                        className={`relative p-3 rounded-xl border p-3 flex flex-col justify-between transition-all ${
                          batch.recalled 
                            ? 'bg-rose-50/50 border-rose-200 opacity-60' 
                            : batch.quantity === 0
                            ? 'bg-slate-50 border-slate-200 opacity-50'
                            : isNextToSell
                            ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-600 ring-offset-1'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isNextToSell && (
                          <span className="absolute -top-2.5 left-3 px-2 py-0.5 text-[9px] font-black tracking-wider uppercase rounded-full bg-indigo-600 text-white shadow-sm flex items-center gap-1 animate-pulse">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Next to Sell
                          </span>
                        )}
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-xs font-bold text-slate-900">{batch.batchNumber}</span>
                            {batch.recalled ? (
                              <span className="text-[8px] font-extrabold uppercase bg-rose-200 text-rose-800 px-1 rounded-md">Recalled</span>
                            ) : batch.quantity === 0 ? (
                              <span className="text-[8px] font-bold uppercase bg-slate-200 text-slate-500 px-1 rounded-md">Depleted</span>
                            ) : (
                              <span className="text-[9px] font-extrabold text-slate-400 font-mono">Pos #{index + 1}</span>
                            )}
                          </div>
                          
                          <div className="mt-2 space-y-1 text-[10px]">
                            <div className="flex justify-between text-slate-500">
                              <span>Lot Stock:</span>
                              <span className="font-bold text-slate-800">{batch.quantity} {inventory.find(i => i.id === batch.itemId)?.unit}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Mfg Date:</span>
                              <span className="font-medium text-slate-800">{batch.manufactureDate}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Expiry:</span>
                              <span className="font-medium text-slate-800">{batch.expiryDate}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className={`text-[9px] font-bold uppercase ${
                            batch.diffDays <= 0 ? 'text-red-600' : batch.diffDays <= 7 ? 'text-red-500' : 'text-slate-500'
                          }`}>
                            {batch.diffDays <= 0 ? 'Expired' : `Exp in ${batch.diffDays}D`}
                          </span>
                          <span className="text-[8px] text-slate-400">
                            {warehouses.find(w => w.id === batch.warehouseId)?.name.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main inventory batch view and controls */}
      <div className="flex flex-col gap-4">
        
        {/* Controls, Filters & Searching */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search Lot Number or Item Name..." 
                className="pl-9 h-10 w-full rounded-xl"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Filter by Item */}
            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              value={itemFilter}
              onChange={e => setItemFilter(e.target.value)}
            >
              <option value="all">-- All Products (Stock View) --</option>
              {inventory.map(i => (
                <option key={i.id} value={i.id}>{i.name} (Active: {i.currentStock} {i.unit})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Import Batches Button */}
            {canImportBatches ? (
              <Button 
                onClick={() => setBatchImportOpen(true)}
                variant="outline" 
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 rounded-xl font-bold shadow-2xs h-10 px-4"
              >
                <UploadCloud className="mr-2 h-4 w-4 text-indigo-600" /> {language === 'ta' ? "தொகுதிகள் இறக்குமதி" : "Import Batches"}
              </Button>
            ) : (
              <div title={language === 'ta' ? "நிர்வாகி மற்றும் சரக்கு மேலாளர் மட்டுமே தொகுதிகளை இறக்குமதி செய்ய முடியும்." : "Only Admin and Inventory Manager can import batches."}>
                <Button 
                  variant="outline" 
                  disabled 
                  className="rounded-xl border-dashed border-slate-300 text-slate-400 cursor-not-allowed opacity-60 h-10 px-4"
                >
                  <UploadCloud className="mr-2 h-4 w-4" /> {language === 'ta' ? "தொகுதிகள் இறக்குமதி" : "Import Batches"}
                </Button>
              </div>
            )}

            <BatchImportModal
              open={batchImportOpen}
              onOpenChange={setBatchImportOpen}
              inventory={inventory}
              batches={batches}
              warehouses={warehouses}
              currentUser={currentUser}
              language={language}
              onImportComplete={onBulkImportBatches}
            />
            
            {/* Add Batch Button */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="bg-indigo-600 text-white rounded-xl h-10 px-4" />}>
                <Plus className="mr-2 h-4 w-4" /> Assign Batch Lot
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Assign Batch / Lot Number</DialogTitle>
                    <CardDescription>Assign new manufacturing and expiration records to track inventories chronologically.</CardDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 text-slate-800">
                    
                    <div className="space-y-1.5">
                      <Label>Target Inventory Item</Label>
                      <select 
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-[#1A1A1A]" 
                        value={formData.itemId} 
                        onChange={e => setFormData({...formData, itemId: e.target.value})} 
                        required
                      >
                        <option value="">-- Select Item --</option>
                        {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label>Batch / Lot Number</Label>
                        <button 
                          type="button" 
                          onClick={handleAutoGenerateBatchNumber}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <QrCode className="w-3.5 h-3.5" /> Auto-Generate
                        </button>
                      </div>
                      <Input 
                        placeholder="e.g. BAT-COT-26A" 
                        value={formData.batchNumber} 
                        onChange={e => setFormData({...formData, batchNumber: e.target.value})} 
                        required 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Manufacture Date</Label>
                        <Input 
                          type="date" 
                          value={formData.manufactureDate} 
                          onChange={e => setFormData({...formData, manufactureDate: e.target.value})} 
                          required 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Expiry Date</Label>
                        <Input 
                          type="date" 
                          value={formData.expiryDate} 
                          onChange={e => setFormData({...formData, expiryDate: e.target.value})} 
                          required 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Receivable Quantity</Label>
                        <Input 
                          type="number" 
                          placeholder="e.g. 150"
                          value={formData.quantity} 
                          onChange={e => setFormData({...formData, quantity: e.target.value})} 
                          required 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Destination Warehouse</Label>
                        <select 
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-[#1A1A1A]" 
                          value={formData.warehouseId} 
                          onChange={e => setFormData({...formData, warehouseId: e.target.value})} 
                          required
                        >
                          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                    </div>

                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full bg-indigo-600 text-white rounded-xl">Assign & Add to Stock</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Expiry alerts & Group Filters Tab list */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 border-b border-gray-100">
          {[
            { id: 'all', label: 'All Lots', count: enrichedBatches.length },
            { id: 'expired', label: 'Expired', count: enrichedBatches.filter(b => b.diffDays <= 0 && !b.recalled).length, color: 'text-red-700 bg-red-50' },
            { id: 'urgent', label: 'Urgent (≤7d)', count: enrichedBatches.filter(b => b.diffDays > 0 && b.diffDays <= 7 && !b.recalled).length, color: 'text-rose-600 bg-rose-50' },
            { id: 'low', label: 'Low Expiry (≤15d)', count: enrichedBatches.filter(b => b.diffDays > 7 && b.diffDays <= 15 && !b.recalled).length, color: 'text-orange-600 bg-orange-50' },
            { id: 'attention', label: 'Caution (≤30d)', count: enrichedBatches.filter(b => b.diffDays > 15 && b.diffDays <= 30 && !b.recalled).length, color: 'text-amber-600 bg-amber-50' },
            { id: 'optimal', label: 'Optimal (>30d)', count: enrichedBatches.filter(b => b.diffDays > 30 && !b.recalled).length, color: 'text-emerald-600 bg-emerald-50' },
            { id: 'recalled', label: 'Quarantined', count: enrichedBatches.filter(b => b.recalled).length, color: 'text-slate-700 bg-slate-100' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <span className={statusFilter === tab.id ? 'text-white' : tab.color || 'text-indigo-600 font-bold'}>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.25 rounded-md ${
                statusFilter === tab.id ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Master batch-level stock table */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-600">Lot/Batch Number</TableHead>
                  <TableHead className="font-bold text-xs text-slate-600">Product Item</TableHead>
                  <TableHead className="font-bold text-xs text-slate-600">Warehouse</TableHead>
                  <TableHead className="font-bold text-xs text-slate-600 text-right">Available Stock</TableHead>
                  <TableHead className="font-bold text-xs text-slate-600">Mfg Date</TableHead>
                  <TableHead className="font-bold text-xs text-slate-600">Expiry Date</TableHead>
                  <TableHead className="font-bold text-xs text-slate-600">Health Warning Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-600 text-center">Safety Action Action-Line</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-400 py-8 italic text-xs">
                      No matching batch or lot records found matching active filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatches.map(batch => {
                    const item = inventory.find(i => i.id === batch.itemId);
                    const unitLabel = item?.unit || 'units';
                    
                    return (
                      <TableRow key={batch.id} className={batch.recalled ? 'bg-rose-50/20' : ''}>
                        
                        {/* Lot name */}
                        <TableCell className="font-mono font-bold text-slate-900 text-xs flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          {batch.batchNumber}
                        </TableCell>
                        
                        {/* Item */}
                        <TableCell className="font-medium text-xs text-slate-800">
                          {item?.name}
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item?.sku}</p>
                        </TableCell>
                        
                        {/* Location */}
                        <TableCell className="text-xs text-slate-600">
                          {warehouses.find(w => w.id === batch.warehouseId)?.name || 'Central Unit'}
                        </TableCell>
                        
                        {/* Batch-level Stock View with health coloring */}
                        <TableCell className="text-right text-xs font-bold font-mono">
                          {batch.recalled ? (
                            <span className="text-rose-700 line-through">₹{batch.quantity.toLocaleString()}</span>
                          ) : (
                            <span className={
                              batch.quantity === 0 ? 'text-gray-400' :
                              batch.quantity <= 50 ? 'text-orange-600' : 'text-slate-800'
                            }>
                              {batch.quantity.toLocaleString()} {unitLabel}
                            </span>
                          )}
                        </TableCell>
                        
                        {/* Mfg Date */}
                        <TableCell className="text-xs text-slate-600 font-mono">
                          {batch.manufactureDate}
                        </TableCell>
                        
                        {/* Expiry Date */}
                        <TableCell className="text-xs text-slate-600 font-mono">
                          {batch.expiryDate}
                        </TableCell>
                        
                        {/* Expiry Alert Warnings Health Indicator per prompt rule */}
                        <TableCell>
                          {batch.recalled ? (
                            <span className="inline-flex px-2 py-0.5 text-[10px] font-black rounded-lg border bg-rose-200 text-rose-950 border-rose-400 uppercase">
                              RECALLED
                            </span>
                          ) : (
                            <Badge className={`capitalize py-0.5 ${batch.badgeClass}`}>
                              {batch.statusLabel === 'Expired' && `🚨 Expired (${Math.abs(batch.diffDays)}d ago)`}
                              {batch.statusLabel === 'Urgent' && `⚠️ Urgent! (${batch.diffDays}d left)`}
                              {batch.statusLabel === 'Low' && `⚠️ Low (${batch.diffDays}d left)`}
                              {batch.statusLabel === 'Attention' && `💡 Attention (${batch.diffDays}d left)`}
                              {batch.statusLabel === 'Optimal' && `✅ Optimal (${batch.diffDays}d left)`}
                            </Badge>
                          )}
                        </TableCell>
                        
                        {/* Recall Specific Batch Action */}
                        <TableCell className="text-center">
                          {batch.recalled ? (
                            <div className="text-[11px] font-black text-rose-800 bg-rose-100/50 border border-rose-200 px-3 py-1 rounded-xl flex items-center justify-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-rose-700 flex-shrink-0 animate-pulse" />
                              Quarantined & Pulled
                            </div>
                          ) : (
                            <Button 
                              onClick={() => {
                                if (!checkPermission('executeRecall')) {
                                  alert("🔒 Security blockade: Your current active profile does not have permission to trigger emergency product recalls. Please switch to Amit Sharma or Sneha R. in the header switcher to authorize this quarantine.");
                                  return;
                                }
                                if (window.confirm(`Warning: Are you absolutely sure you want to recall and quarantine all ${batch.quantity} units of Batch Lot #${batch.batchNumber}? This stock will be safely isolated immediately.`)) {
                                  onRecallBatch(batch.id);
                                }
                              }}
                              className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-xs h-8 px-3 border border-rose-200 select-none shadow-none"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Recall Lot
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function PurchasePage({ 
  purchaseOrders, 
  suppliers, 
  inventory, 
  onAddPO, 
  onAddSupplier, 
  language = 'en',
  preloadedPOItem,
  onClearPreloadedPO
}: {
  purchaseOrders: PurchaseOrder[],
  suppliers: Supplier[],
  inventory: InventoryItem[],
  onAddPO: (po: PurchaseOrder) => void,
  onAddSupplier: (s: Supplier) => void,
  language?: Language,
  preloadedPOItem?: { itemId: string; quantity: number } | null,
  onClearPreloadedPO?: () => void
}) {
  const [openPO, setOpenPO] = useState(false);
  const [openSup, setOpenSup] = useState(false);
  const [poData, setPoData] = useState({ supplierId: '', itemId: '', quantity: '', rate: '' });
  const [supData, setSupData] = useState({ name: '', contact: '', email: '', category: '' });

  useEffect(() => {
    if (preloadedPOItem?.itemId) {
      const targetItem = inventory.find(i => i.id === preloadedPOItem.itemId);
      const supplier = suppliers.find(s => s.category === targetItem?.categoryId) || suppliers[0];
      setPoData({
        supplierId: supplier ? supplier.id : '',
        itemId: preloadedPOItem.itemId,
        quantity: String(preloadedPOItem.quantity || 100),
        rate: '50'
      });
      setOpenPO(true);
      if (onClearPreloadedPO) {
        onClearPreloadedPO();
      }
    }
  }, [preloadedPOItem, inventory, suppliers, onClearPreloadedPO]);

  const handlePOSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(poData.quantity) * Number(poData.rate);
    onAddPO({
      id: `PO-${Date.now()}`,
      supplierId: poData.supplierId,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      items: [{ itemId: poData.itemId, quantity: Number(poData.quantity), rate: Number(poData.rate) }],
      totalAmount: total
    });
    setOpenPO(false);
    setPoData({ supplierId: '', itemId: '', quantity: '', rate: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setOpenSup(true)} className="rounded-xl font-bold">{language === 'ta' ? "முன்னோடி சப்ளையர்கள்" : "Manage Suppliers"}</Button>
        <Button onClick={() => setOpenPO(true)} className="bg-indigo-600 text-white rounded-xl font-bold"><Plus className="mr-2 h-4 w-4" /> {language === 'ta' ? "ஆணை உருவாக்கு" : "Create PO"}</Button>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader><CardTitle>{tText("Purchase Orders", language)}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tText("PO #", language)}</TableHead>
                <TableHead>{language === 'ta' ? "வழங்குநர்" : "Supplier"}</TableHead>
                <TableHead>{tText("Date", language)}</TableHead>
                <TableHead>{tText("Total", language)}</TableHead>
                <TableHead>{tText("Status", language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map(po => (
                <TableRow key={po.id}>
                  <TableCell className="font-bold">{po.id}</TableCell>
                  <TableCell>{suppliers.find(s => s.id === po.supplierId)?.name || 'Unknown'}</TableCell>
                  <TableCell>{po.date}</TableCell>
                  <TableCell>₹{po.totalAmount.toLocaleString()}</TableCell>
                  <TableCell><Badge className="bg-amber-100 text-amber-700 capitalize">{po.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PO Dialog */}
      <Dialog open={openPO} onOpenChange={setOpenPO}>
        <DialogContent>
          <form onSubmit={handlePOSubmit}>
            <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={poData.supplierId} onChange={e => setPoData({...poData, supplierId: e.target.value})} required>
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Item</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={poData.itemId} onChange={e => setPoData({...poData, itemId: e.target.value})} required>
                  <option value="">-- Select Item --</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={poData.quantity} onChange={e => setPoData({...poData, quantity: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Rate (₹)</Label><Input type="number" value={poData.rate} onChange={e => setPoData({...poData, rate: e.target.value})} required /></div>
              </div>
            </div>
            <DialogFooter><Button type="submit" className="w-full bg-indigo-600 text-white">Generate PO</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={openSup} onOpenChange={setOpenSup}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Supplier Management</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={supData.name} onChange={e => setSupData({...supData, name: e.target.value})} /></div>
              <div className="space-y-2"><Label>Category</Label><Input value={supData.category} onChange={e => setSupData({...supData, category: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contact</Label><Input value={supData.contact} onChange={e => setSupData({...supData, contact: e.target.value})} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={supData.email} onChange={e => setSupData({...supData, email: e.target.value})} /></div>
            </div>
            <Button className="w-full bg-indigo-600 text-white" onClick={() => {
              onAddSupplier({ id: `SUP-${Date.now()}`, ...supData });
              setSupData({ name: '', contact: '', email: '', category: '' });
            }}>Add Supplier</Button>
            <Separator />
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {suppliers.map(s => (
                <div key={s.id} className="p-2 border rounded-lg flex justify-between items-center">
                  <div><p className="font-bold text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.category}</p></div>
                  <Badge variant="outline">{s.contact}</Badge>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SalesPage({ salesOrders, inventory, customers, invoices, onGenerateIRN, onAddSO, language = 'en' }: {
  salesOrders: SalesOrder[],
  inventory: InventoryItem[],
  customers: Customer[],
  invoices: Invoice[],
  onGenerateIRN: (invoiceId: string) => void,
  onAddSO: (so: SalesOrder) => void,
  language?: Language
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ customerId: '', itemId: '', quantity: '', rate: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === formData.customerId);
    const total = Number(formData.quantity) * Number(formData.rate);
    const soId = `SO-${Date.now()}`;
    onAddSO({
      id: soId,
      customerId: formData.customerId,
      customerName: customer?.name || 'Walk-in Customer',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      items: [{ itemId: formData.itemId, quantity: Number(formData.quantity), rate: Number(formData.rate) }],
      totalAmount: total
    });
    setOpen(false);
    setFormData({ customerId: '', itemId: '', quantity: '', rate: '' });
  };

  const handleBarcodeScan = (scannedItem: InventoryItem) => {
    setFormData({
      ...formData,
      itemId: scannedItem.id,
      rate: '100'
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        <ScannerDialog 
          inventory={inventory} 
          onScan={handleBarcodeScan} 
          trigger={<Button variant="outline" className="rounded-xl border-dashed border-2 hover:border-indigo-400 hover:bg-indigo-50 font-bold"><Scan className="mr-2 h-4 w-4" /> {language === 'ta' ? "விற்பனை செய்ய ஸ்கேன் செய்க" : "Scan to Sell"}</Button>}
        />
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 text-white rounded-xl font-bold"><Plus className="mr-2 h-4 w-4" /> {language === 'ta' ? "புதிய விற்பனை ஆணை" : "New Sales Order"}</Button>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader><CardTitle>{tText("Sales Orders", language)}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tText("SO #", language)}</TableHead>
                <TableHead>{language === 'ta' ? "வாடிக்கையாளர்" : "Customer"}</TableHead>
                <TableHead>{tText("Date", language)}</TableHead>
                <TableHead>{tText("Total", language)}</TableHead>
                <TableHead>{tText("Status", language)}</TableHead>
                <TableHead className="text-right">{tText("Actions", language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesOrders.map(so => (
                <TableRow key={so.id}>
                  <TableCell className="font-bold">{so.id}</TableCell>
                  <TableCell>{so.customerName}</TableCell>
                  <TableCell>{so.date}</TableCell>
                  <TableCell>₹{so.totalAmount.toLocaleString()}</TableCell>
                  <TableCell><Badge className="bg-blue-100 text-blue-700 capitalize">{so.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <ViewInvoiceDialog 
                      trigger={<Button variant="ghost" size="sm" className="text-indigo-600 font-bold"><FileText className="w-4 h-4 mr-1" /> {language === 'ta' ? "காண்க" : "View"}</Button>}
                      invoice={invoices.find(inv => inv.orderId === so.id)}
                      order={so}
                      customer={customers.find(c => c.id === so.customerId)}
                      inventory={inventory}
                      onGenerateIRN={onGenerateIRN}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <select 
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.customerId}
                  onChange={e => setFormData({...formData, customerId: e.target.value})}
                  required
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Item</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.itemId} onChange={e => setFormData({...formData, itemId: e.target.value})} required>
                  <option value="">-- Select Item --</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Rate (₹)</Label><Input type="number" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} required /></div>
              </div>
            </div>
            <DialogFooter><Button type="submit" className="w-full bg-indigo-600 text-white">Create SO & Invoice</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BillingPage({ 
  invoices, 
  setInvoices,
  payments, 
  customers, 
  salesOrders, 
  setSalesOrders,
  inventory, 
  purchaseOrders,
  suppliers,
  onGenerateIRN, 
  onAddPayment, 
  onAddCustomer,
  addAuditLog,
  checkPermission,
  language = 'en'
}: {
  invoices: Invoice[],
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>,
  payments: Payment[],
  customers: Customer[],
  salesOrders: SalesOrder[],
  setSalesOrders: React.Dispatch<React.SetStateAction<SalesOrder[]>>,
  inventory: InventoryItem[],
  purchaseOrders: PurchaseOrder[],
  suppliers: Supplier[],
  onGenerateIRN: (invoiceId: string) => void,
  onAddPayment: (p: Payment) => void,
  onAddCustomer: (c: Customer) => void,
  addAuditLog: (action: string, entityType: string, entityId: string, details: string) => void,
  checkPermission: (perm: string) => boolean,
  language?: Language
}) {
  const [billingTab, setBillingTab] = useState('invoices');
  const [openPayment, setOpenPayment] = useState(false);
  const [openCustomer, setOpenCustomer] = useState(false);

  const stats = {
    totalOutstanding: invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
    totalReceived: payments.reduce((sum, p) => sum + p.amount, 0),
    overdueInvoices: invoices.filter(i => i.status === 'unpaid' && new Date(i.dueDate) < new Date()).length
  };

  const gstSummary = useMemo(() => {
    let salesCount = 0;
    let b2bSalesTaxable = 0;
    let b2cSalesTaxable = 0;
    let cgstTax = 0;
    let sgstTax = 0;
    let igstTax = 0;
    let totalTaxCollected = 0;

    const slabBreakdown: Record<number, { taxable: number, tax: number }> = {
      0: { taxable: 0, tax: 0 },
      5: { taxable: 0, tax: 0 },
      12: { taxable: 0, tax: 0 },
      18: { taxable: 0, tax: 0 },
      28: { taxable: 0, tax: 0 }
    };

    invoices.forEach(inv => {
      if (inv.orderType === 'sales') {
        salesCount++;
        const order = salesOrders.find(so => so.id === inv.orderId);
        const cust = customers.find(c => c.id === order?.customerId);
        
        const subtotal = inv.taxableAmount ?? inv.totalAmount / 1.18;
        const central = inv.cgst ?? 0;
        const state = inv.sgst ?? 0;
        const integrated = inv.igst ?? 0;
        const taxVal = central + state + integrated;

        if (cust?.gstin) {
          b2bSalesTaxable += subtotal;
        } else {
          b2cSalesTaxable += subtotal;
        }

        cgstTax += central;
        sgstTax += state;
        igstTax += integrated;
        totalTaxCollected += taxVal;

        if (order) {
          order.items.forEach(item => {
            const invItem = inventory.find(i => i.id === item.itemId);
            const r = invItem?.gstRate ?? 18;
            const line = item.quantity * item.rate;
            const lineTax = line * r / 100;
            if (slabBreakdown[r]) {
              slabBreakdown[r].taxable += line;
              slabBreakdown[r].tax += lineTax;
            }
          });
        }
      }
    });

    return {
      salesCount,
      b2bSalesTaxable,
      b2cSalesTaxable,
      cgstTax,
      sgstTax,
      igstTax,
      totalTaxCollected,
      slabBreakdown
    };
  }, [invoices, salesOrders, customers, inventory]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Outstanding" 
          value={`₹${stats.totalOutstanding.toLocaleString()}`}
          subtitle="Amount yet to be collected"
          trend="down"
          icon={<History className="text-red-600" />}
        />
        <StatCard 
          title="Total Cash Received" 
          value={`₹${stats.totalReceived.toLocaleString()}`}
          subtitle="Direct collection amount"
          trend="up"
          icon={<ArrowUpRight className="text-green-600" />}
        />
        <StatCard 
          title="Overdue Accounts" 
          value={stats.overdueInvoices.toString()}
          subtitle="Active alerts for overdue bills"
          trend={stats.overdueInvoices > 0 ? "down" : "up"}
          icon={<AlertTriangle className={stats.overdueInvoices > 0 ? "text-red-600" : "text-gray-400"} />}
        />
      </div>

      <div className="flex justify-between items-center bg-white p-2 border border-gray-200 rounded-2xl shadow-sm">
        <div className="flex gap-1 overflow-x-auto">
          <SubTab active={billingTab === 'invoices'} onClick={() => setBillingTab('invoices')} label="Invoices" />
          <SubTab active={billingTab === 'payments'} onClick={() => setBillingTab('payments')} label="Payment History" />
          <SubTab active={billingTab === 'customers'} onClick={() => setBillingTab('customers')} label="Customers" />
          <SubTab active={billingTab === 'gst'} onClick={() => setBillingTab('gst')} label="GST Portal & Reports" />
          <SubTab active={billingTab === 'tally_sync'} onClick={() => setBillingTab('tally_sync')} label="Tally ERP Sync" />
          <SubTab active={billingTab === 'split_merge'} onClick={() => setBillingTab('split_merge')} label="Split / Merge" />
        </div>
        <div className="flex gap-2">
          {billingTab === 'customers' ? (
            <Button onClick={() => setOpenCustomer(true)} className="bg-indigo-600 text-white rounded-xl"><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
          ) : billingTab === 'gst' ? (
            <div className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center">
              GSTR-1 COMPLIANT
            </div>
          ) : billingTab === 'tally_sync' ? (
            <div className="text-xs bg-indigo-50 text-indigo-700 font-mono font-bold px-3 py-1.5 rounded-xl border border-indigo-250 flex items-center">
              ODBC GATEWAY ACTIVE
            </div>
          ) : billingTab === 'split_merge' ? (
            <div className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center">
              POS BILL CONSOLE
            </div>
          ) : (
            <Button onClick={() => setOpenPayment(true)} className="bg-indigo-600 text-white rounded-xl"><Plus className="mr-2 h-4 w-4" /> Record Payment</Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={billingTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {billingTab === 'invoices' && (
            <Card className="shadow-sm border-gray-200">
              <CardHeader><CardTitle>Sales Invoices</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(inv => {
                      const order = salesOrders.find(so => so.id === inv.orderId);
                      const customer = customers.find(c => c.id === order?.customerId);
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-bold">{inv.id}</TableCell>
                          <TableCell className="text-xs">{inv.orderId}</TableCell>
                          <TableCell>{customer?.name || "Multiple"}</TableCell>
                          <TableCell className="text-sm">{inv.dueDate}</TableCell>
                          <TableCell>₹{inv.totalAmount.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">₹{inv.paidAmount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={`capitalize ${
                              inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                              inv.status === 'unpaid' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <ViewInvoiceDialog 
                              trigger={<Button variant="ghost" size="sm" className="text-indigo-600"><Printer className="w-4 h-4 mr-1" /> Print</Button>}
                              invoice={inv}
                              order={order}
                              customer={customer}
                              inventory={inventory}
                              onGenerateIRN={onGenerateIRN}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {billingTab === 'payments' && (
            <Card className="shadow-sm border-gray-200">
              <CardHeader><CardTitle>Cash Book / Payment Register</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => {
                      const invoice = invoices.find(inv => inv.id === p.invoiceId);
                      const order = salesOrders.find(so => so.id === invoice?.orderId);
                      const customer = customers.find(c => c.id === order?.customerId);
                      return (
                        <TableRow key={p.id}>
                          <TableCell>{p.date}</TableCell>
                          <TableCell className="font-mono text-xs">{p.id}</TableCell>
                          <TableCell className="font-bold">{p.invoiceId}</TableCell>
                          <TableCell>{customer?.name || 'Walk-in'}</TableCell>
                          <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
                          <TableCell className="font-bold text-green-600">₹{p.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {billingTab === 'customers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customers.map(c => (
                <Card key={c.id} className="shadow-sm border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-bold">{c.name}</CardTitle>
                    <div className="p-2 bg-indigo-50 rounded-lg"><History className="w-4 h-4 text-indigo-600" /></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Contact Details</p>
                        <p className="text-sm font-medium">{c.email}</p>
                        <p className="text-sm text-gray-500">{c.contact}</p>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Total Invoiced</p>
                          <p className="font-bold">₹{invoices.filter(inv => {
                            const so = salesOrders.find(o => o.id === inv.orderId);
                            return so?.customerId === c.id;
                          }).reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Balance</p>
                          <p className="font-bold text-red-600">₹{invoices.filter(inv => {
                            const so = salesOrders.find(o => o.id === inv.orderId);
                            return so?.customerId === c.id;
                          }).reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <CustomerHistoryDialog 
                        customer={c}
                        invoices={invoices}
                        payments={payments}
                        salesOrders={salesOrders}
                        inventory={inventory}
                        trigger={
                          <Button variant="outline" className="w-full text-xs h-8">View Purchase History & Ledger</Button>
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {billingTab === 'gst' && (
            <EasyTaxFilingPanel 
              inventory={inventory}
              customers={customers}
              salesOrders={salesOrders}
              invoices={invoices}
              purchaseOrders={purchaseOrders}
              suppliers={suppliers}
              language={language}
              addAuditLog={addAuditLog}
            />
          )}

          {billingTab === 'tally_sync' && (
            <TallySyncPanel 
              invoices={invoices}
              payments={payments}
              purchaseOrders={purchaseOrders}
              customers={customers}
              suppliers={suppliers}
              salesOrders={salesOrders}
              onAddAuditLog={addAuditLog}
              checkPermission={checkPermission}
            />
          )}

          {billingTab === 'split_merge' && (
            <SplitMergePanel 
              inventory={inventory}
              customers={customers}
              salesOrders={salesOrders}
              invoices={invoices}
              setSalesOrders={setSalesOrders}
              setInvoices={setInvoices}
              addAuditLog={addAuditLog}
              language={language}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <AddPaymentDialog open={openPayment} onOpenChange={setOpenPayment} invoices={invoices} onAdd={onAddPayment} />
      <AddCustomerDialog open={openCustomer} onOpenChange={setOpenCustomer} onAdd={onAddCustomer} />
    </div>
  );
}

function SubTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
        active ? 'bg-[#F8F9FA] text-indigo-600 shadow-inner' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

function AddPaymentDialog({ open, onOpenChange, invoices, onAdd }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
  onAdd: (p: Payment) => void;
}) {
  const [formData, setFormData] = useState({ invoiceId: '', amount: '', method: 'bank_transfer' as any, reference: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: `PAY-${Date.now()}`,
      invoiceId: formData.invoiceId,
      date: new Date().toISOString().split('T')[0],
      amount: Number(formData.amount),
      method: formData.method,
      reference: formData.reference
    });
    onOpenChange(false);
    setFormData({ invoiceId: '', amount: '', method: 'bank_transfer', reference: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>Receive Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Invoice</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.invoiceId} onChange={e => {
                const inv = invoices.find(i => i.id === e.target.value);
                setFormData({...formData, invoiceId: e.target.value, amount: inv ? (inv.totalAmount - inv.paidAmount).toString() : ''});
              }} required>
                <option value="">-- Choose Invoice --</option>
                {invoices.filter(i => i.status !== 'paid').map(i => <option key={i.id} value={i.id}>{i.id} (Bal: ₹{(i.totalAmount - i.paidAmount).toLocaleString()})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount Received (₹)</Label><Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required /></div>
              <div className="space-y-2">
                <Label>Method</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.method} onChange={e => setFormData({...formData, method: e.target.value as any})}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-2"><Label>Reference # / Notes</Label><Input value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="e.g. UTR Number" /></div>
          </div>
          <DialogFooter><Button type="submit" className="w-full bg-indigo-600 text-white">Record & Sync Balance</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCustomerDialog({ open, onOpenChange, onAdd }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (c: Customer) => void;
}) {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    contact: '', 
    address: '',
    gstin: '',
    state: 'Maharashtra'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: `cust-${Date.now()}`,
      ...formData
    });
    onOpenChange(false);
    setFormData({ name: '', email: '', contact: '', address: '', gstin: '', state: 'Maharashtra' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>Register New Customer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Business Name</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required /></div>
              <div className="space-y-2"><Label>Primary Contact</Label><Input value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} required /></div>
            </div>
            <div className="space-y-2"><Label>Billing Address</Label><Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GSTIN Number</Label>
                <Input 
                  placeholder="e.g. 27AAAAA1111A1Z1" 
                  value={formData.gstin} 
                  onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})} 
                  maxLength={15}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Billing State</Label>
                <select
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.state}
                  onChange={e => setFormData({...formData, state: e.target.value})}
                  required
                >
                  <option value="Maharashtra">Maharashtra (27 - MH)</option>
                  <option value="Karnataka">Karnataka (29 - KA)</option>
                  <option value="Delhi">Delhi (07 - DL)</option>
                  <option value="Tamil Nadu">Tamil Nadu (33 - TN)</option>
                  <option value="Gujarat">Gujarat (24 - GJ)</option>
                  <option value="Uttar Pradesh">Uttar Pradesh (09 - UP)</option>
                  <option value="West Bengal">West Bengal (19 - WB)</option>
                  <option value="Telangana">Telangana (36 - TS)</option>
                  <option value="Rajasthan">Rajasthan (08 - RJ)</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter><Button type="submit" className="w-full bg-indigo-600 text-white">Add Customer Profile</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AuditLogPage({ logs, language = 'en' }: { logs: AuditLog[], language?: Language }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.operatorName && log.operatorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.operatorId && log.operatorId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = 
        roleFilter === 'all' || 
        log.operatorRole === roleFilter ||
        (roleFilter === 'system' && !log.operatorId);

      const matchesAction =
        actionFilter === 'all' ||
        log.action.toLowerCase().includes(actionFilter.toLowerCase()) ||
        (log.entityType && log.entityType.toLowerCase().includes(actionFilter.toLowerCase()));

      return matchesSearch && matchesRole && matchesAction;
    });
  }, [logs, searchTerm, roleFilter, actionFilter]);

  // Compute activity telemetry
  const stats = useMemo(() => {
    let critical = 0;
    const operatorCounts: Record<string, number> = {};

    filteredLogs.forEach(log => {
      const act = log.action.toLowerCase();
      const det = log.details.toLowerCase();
      if (
        act.includes('recall') || 
        act.includes('quarantine') || 
        act.includes('revoke') || 
        det.includes('quarantined') ||
        act.includes('adjustment') ||
        act.includes('role')
      ) {
        critical++;
      }

      const opName = log.operatorName || 'System Automated';
      operatorCounts[opName] = (operatorCounts[opName] || 0) + 1;
    });

    let topOperator = 'None';
    let maxCount = 0;
    Object.entries(operatorCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topOperator = name;
      }
    });

    return {
      total: filteredLogs.length,
      critical,
      topOperator: maxCount > 0 ? `${topOperator} (${maxCount} ops)` : 'None',
      operatorCounts
    };
  }, [filteredLogs]);

  // Map operator counts for visual chart
  const chartData = useMemo(() => {
    return Object.entries(stats.operatorCounts).map(([name, count]) => ({
      name: name.replace(' (Admin)', '').replace(' R.', '.').split(' ')[0],
      Actions: count as number,
      fullName: name
    })).sort((a, b) => (b.Actions as number) - (a.Actions as number));
  }, [stats.operatorCounts]);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'inventory_manager':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'billing_clerk':
        return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      case 'staff_viewer':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  const getActionBadgeStyle = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('recall') || act.includes('quarantine') || act.includes('revoke')) {
      return 'bg-rose-50 text-rose-700 border-rose-100';
    }
    if (act.includes('adjustment') || act.includes('damage') || act.includes('correction')) {
      return 'bg-amber-50 text-amber-700 border-amber-100';
    }
    if (act.includes('onboard') || act.includes('permissions') || act.includes('role')) {
      return 'bg-purple-50 text-purple-700 border-purple-100';
    }
    if (act.includes('create') || act.includes('add') || act.includes('order')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    }
    return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  return (
    <div className="space-y-6 text-[#1A1A1A]">
      {/* Bento Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{language === 'ta' ? "மொத்த தணிக்கை பதிவுகள்" : "Total Trace Logs"}</p>
            <h4 className="text-2xl font-black mt-1 text-slate-800">{stats.total} <span className="text-xs font-normal text-slate-400">{language === 'ta' ? "செயல்கள்" : "actions"}</span></h4>
            <p className="text-[10px] text-slate-500 mt-1">{language === 'ta' ? "செயலில் உள்ள வடிகட்டிகளின் கீழ்" : "Found under active filters"}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ClipboardList size={22} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{language === 'ta' ? "மிகவும் செயலில் உள்ள ஊழியர்" : "Top Active Employee"}</p>
            <h4 className="text-lg font-bold mt-1 text-slate-800 truncate max-w-[200px]" title={stats.topOperator}>{stats.topOperator}</h4>
            <p className="text-[10px] text-slate-500 mt-1">{language === 'ta' ? "அதிகபட்ச செயல்களை முடித்துள்ளார்" : "Completed highest actions count"}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{language === 'ta' ? "பாதுகாப்பு மற்றும் முக்கியமான நிகழ்வுகள்" : "Security & Critical Events"}</p>
            <h4 className="text-2xl font-black mt-1 text-red-600">{stats.critical} <span className="text-xs font-normal text-slate-400">{language === 'ta' ? "தணிக்கைகள்" : "audits"}</span></h4>
            <p className="text-[10px] text-slate-500 mt-1">{language === 'ta' ? "திரும்பப் பெறுதல், அனுமதி மாற்றங்கள்" : "Recalls, role reassignments & adjustments"}</p>
          </div>
          <div className="p-3 bg-red-50 text-red-500 rounded-xl">
            <ShieldAlert size={22} />
          </div>
        </div>
      </div>

      {/* Advanced Filters section */}
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search by Action, Employee Name, Audit ID or details..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50/50 border-gray-200 rounded-xl text-xs h-9"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              className="h-9 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-slate-700 px-3 py-1 cursor-pointer"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="all">🛡️ All Security Clearances</option>
              <option value="admin">Admin Level</option>
              <option value="inventory_manager">Inventory Manager</option>
              <option value="billing_clerk">Billing Clerk</option>
              <option value="staff_viewer">Staff Viewer</option>
              <option value="system">System Automated</option>
            </select>

            <select
              className="h-9 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-slate-700 px-3 py-1 cursor-pointer"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="all">⚡ All Action Categories</option>
              <option value="recall">Product Recalls</option>
              <option value="adjustment">Stock Adjustments</option>
              <option value="staff">Staff/Role Management</option>
              <option value="order">Sales & Purchase</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Dual Column Layout: Audits Table / Graphic breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main interactive Table listing */}
        <Card className="shadow-sm border-gray-200 lg:col-span-2 bg-white">
          <CardHeader className="pb-3 border-b border-gray-50">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Chronological Employee Activity Stream
            </CardTitle>
            <CardDescription className="text-xs">
              Continuous live history of operations completed by registered employees.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="font-medium text-xs">No matching action logs found</p>
                <p className="text-[10px] text-gray-400 mt-1">Try broadening your search keywords or resetting filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] text-slate-600 uppercase tracking-wider py-2">Timestamp</TableHead>
                      <TableHead className="font-bold text-[10px] text-slate-600 uppercase tracking-wider">Employee / Role</TableHead>
                      <TableHead className="font-bold text-[10px] text-slate-600 uppercase tracking-wider">Operation / ID</TableHead>
                      <TableHead className="font-bold text-[10px] text-slate-600 uppercase tracking-wider">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map(log => {
                      const operatorInitials = log.operatorName 
                        ? log.operatorName.split(' ').map(n => n[0]).join('') 
                        : 'SYS';

                      return (
                        <TableRow key={log.id} className="hover:bg-slate-50/50 align-top">
                          {/* Timestamp */}
                          <TableCell className="py-4 text-[10px] font-medium text-slate-400 font-mono w-24">
                            {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            <div className="text-[9px] mt-0.5">{new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                          </TableCell>

                          {/* Employee Identity */}
                          <TableCell className="py-4 w-44">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center border ${
                                log.operatorId ? 'bg-indigo-55 bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-500'
                              }`}>
                                {operatorInitials}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-slate-800 leading-tight">
                                  {log.operatorName || 'System Service'}
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                  {log.operatorId || 'AUTOMATED'}
                                </div>
                                {log.operatorRole && (
                                  <Badge className={`text-[8px] font-bold tracking-widest uppercase border mt-1 px-1.5 py-0.5 pointer-events-none rounded-md ${getRoleBadgeStyle(log.operatorRole)}`}>
                                    {log.operatorRole.replace('_', ' ')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Operation Type / ID */}
                          <TableCell className="py-4 w-44">
                            <Badge className={`text-[9px] font-bold border rounded-lg px-2 py-0.5 pointer-events-none ${getActionBadgeStyle(log.action)}`}>
                              {log.action}
                            </Badge>
                            <div className="text-[9px] text-indigo-600 font-bold font-mono mt-1.5">
                              {log.entityType}: {log.entityId}
                            </div>
                          </TableCell>

                          {/* Full Audit Details */}
                          <TableCell className="py-4">
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                              {log.details}
                            </p>
                            <span className="text-[9px] font-mono text-gray-300 block mt-1.5">Log ID: {log.id}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column sidebar: Analytical Breakdown charts */}
        <div className="space-y-6 lg:col-span-1">
          {/* Chart visualizers */}
          <Card className="shadow-sm border-gray-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Active Actions by Employee
              </CardTitle>
              <CardDescription className="text-[10px]">
                Distribution of operations matching current criteria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">No chart data matching search filters.</div>
              ) : (
                <div className="space-y-4">
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ left: -15, right: 5, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" style={{ fontSize: '9px', fontWeight: 'bold' }} stroke="#94A3B8" />
                        <YAxis tickLine={false} style={{ fontSize: '9px' }} width={25} stroke="#94A3B8" />
                        <Tooltip 
                          cursor={{ fill: '#F8FAFC' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-slate-800 text-white p-2 rounded-lg text-[10px] shadow-lg border border-slate-700">
                                  <p className="font-bold">{item.fullName}</p>
                                  <p className="mt-0.5">{item.Actions} actions recorded</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="Actions" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Leaderboard layout list */}
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Activity Rankings</h5>
                    {chartData.map((item, idx) => (
                      <div key={item.fullName} className="flex justify-between items-center text-xs py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-300 w-4">#{idx + 1}</span>
                          <span className="font-bold text-slate-700">{item.fullName}</span>
                        </div>
                        <Badge className="bg-slate-100 hover:bg-slate-100 text-slate-800 text-[10px] font-bold py-0 rounded">
                          {item.Actions} ops
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick tips box */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs space-y-2">
            <h5 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Organizational Integrity Guide
            </h5>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              Every sensitive inventory modification (damage report, stock write-off, or raw ingredients lot quarantine) is instantly stamped with the logged employee's context. 
            </p>
            <p className="text-[11px] text-indigo-850 leading-relaxed font-semibold">
              Tip: Switch roles using the profile switcher in the top right to log activities under different employee accounts!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function StatCard({ title, value, subtitle, trend, icon }: { title: string; value: string; subtitle?: string; trend?: 'up' | 'down'; icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm border-gray-200 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        {icon}
      </div>
      <CardHeader className="pb-2">
        <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{title}</CardDescription>
        <CardTitle className="text-2xl font-bold">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        {subtitle && (
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
              {subtitle}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddItemDialog({ onAdd, categories }: { onAdd: (item: InventoryItem) => void, categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: categories[0]?.id || '',
    currentStock: '',
    minStock: '',
    dailyConsumption: '',
    leadTime: '',
    safetyStock: '',
    unit: 'kg',
    description: '',
    hsnCode: '',
    gstRate: '18'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: InventoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      sku: formData.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      barcode: formData.barcode,
      categoryId: formData.categoryId,
      currentStock: Number(formData.currentStock),
      minStock: Number(formData.minStock),
      dailyConsumption: Number(formData.dailyConsumption),
      leadTime: Number(formData.leadTime),
      safetyStock: Number(formData.safetyStock),
      unit: formData.unit,
      description: formData.description,
      hsnCode: formData.hsnCode || '9987',
      gstRate: Number(formData.gstRate)
    };
    onAdd(newItem);
    setOpen(false);
    setFormData({ 
      name: '', sku: '', barcode: '', categoryId: categories[0]?.id || '', 
      currentStock: '', minStock: '', dailyConsumption: '', leadTime: '', 
      safetyStock: '', unit: 'kg', description: '', hsnCode: '', gstRate: '18'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl" />}>
        <>
          <Plus className="mr-2 h-4 w-4" /> Add New Item
        </>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
            <DialogDescription>Enter the parameters for a new item in your master list.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input placeholder="e.g. Fabric (Cotton)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Internal SKU</Label>
                <Input placeholder="e.g. SKU-123" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Barcode (EAN/UPC)</Label>
                <div className="flex gap-2">
                  <Input placeholder="Barcode" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                  <Button type="button" variant="outline" size="icon" title="Generate Barcode" onClick={() => setFormData({...formData, barcode: Math.floor(Math.random() * 1000000000000).toString()})}>
                    <Barcode size={16} />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select 
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="kg, pcs, etc." required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>HSN / SAC Code</Label>
                <Input placeholder="e.g. 5208" value={formData.hsnCode} onChange={e => setFormData({...formData, hsnCode: e.target.value})} maxLength={8} />
              </div>
              <div className="space-y-2">
                <Label>GST Tax Slab</Label>
                <select 
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-[#1A1A1A]"
                  value={formData.gstRate}
                  onChange={e => setFormData({...formData, gstRate: e.target.value})}
                  required
                >
                  <option value="0">0% (Nil Rated)</option>
                  <option value="5">5% (Fabric, Raw Materials)</option>
                  <option value="12">12% (Processed Goods)</option>
                  <option value="18">18% (Standard Services/Items)</option>
                  <option value="28">28% (Luxury/Demerit)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <Input type="number" placeholder="0" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Minimum Stock</Label>
                <Input type="number" placeholder="0" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Daily Cons.</Label>
                <Input type="number" placeholder="0" value={formData.dailyConsumption} onChange={e => setFormData({...formData, dailyConsumption: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Lead Time (d)</Label>
                <Input type="number" placeholder="0" value={formData.leadTime} onChange={e => setFormData({...formData, leadTime: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Safety Stocks</Label>
                <Input type="number" placeholder="0" value={formData.safetyStock} onChange={e => setFormData({...formData, safetyStock: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Product details, variants, etc." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full bg-indigo-600 text-white">Create Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UpdateStockDialog({ item, onUpdate }: { item: InventoryItem; onUpdate: (id: string, stock: number) => void }) {
  const [open, setOpen] = useState(false);
  const [stock, setStock] = useState(item.currentStock.toString());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" />}>
        Adjust Stock
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Stock: {item.name}</DialogTitle>
          <DialogDescription>
            Manually adjust the current physical stock level.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="stock">Current Stock ({item.unit})</Label>
            <Input id="stock" type="number" value={stock} onChange={e => setStock(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => { onUpdate(item.id, Number(stock)); setOpen(false); }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            Confirm Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BarcodeDisplay({ value }: { value: string }) {
  if (value === 'N/A') return <span className="text-[10px] text-gray-400 italic">No Barcode</span>;
  
  return (
    <div className="flex flex-col gap-0.5 group cursor-pointer" title={`Barcode: ${value}`}>
      <div className="flex gap-[1px] h-3 bg-white px-1 py-0.5 rounded-sm overflow-hidden group-hover:h-5 transition-all">
        {value.split('').map((char, i) => (
          <div 
            key={i} 
            className="bg-black" 
            style={{ 
              width: (parseInt(char, 10) % 3 + 1) + 'px',
              opacity: (i % 2 === 0 ? 1 : 0.4) 
            }} 
          />
        ))}
      </div>
      <span className="text-[9px] font-mono text-gray-400 group-hover:text-indigo-600 transition-colors uppercase">{value}</span>
    </div>
  );
}

function ScannerDialog({ inventory, onScan, trigger }: { 
  inventory: InventoryItem[], 
  onScan: (item: InventoryItem) => void,
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');

  const handleScan = (code: string) => {
    const item = inventory.find(i => i.barcode === code || i.id === code || i.sku === code);
    if (item) {
      onScan(item);
      setOpen(false);
      setManualCode('');
      setError('');
    } else {
      setError('Item not found for code: ' + code);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger || <button className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95" />}>
        {!trigger ? (
          <>
            <Scan size={20} />
            <span className="text-sm font-semibold pr-1">Finder</span>
          </>
        ) : undefined}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="text-indigo-600" /> Smart Barcode Scanner
          </DialogTitle>
          <DialogDescription>
            Scan a barcode or enter the code manually to quickly find an item in your inventory.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-8 space-y-6">
          <div className="relative aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-[1px]" />
            <div className="relative z-10 w-48 h-0.5 bg-red-500 animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
            <div className="relative z-10 p-6 bg-white shadow-xl rounded-full mb-4">
              <Maximize className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
            <p className="relative z-10 text-xs font-bold text-gray-400 uppercase tracking-widest">Awaiting Video Link...</p>
            
            <div className="absolute bottom-4 flex gap-2 z-20">
              <Button size="sm" variant="secondary" className="text-[10px] h-7 rounded-full bg-white/80" onClick={() => handleScan('5012345678901')}>Simulate FAB-001</Button>
              <Button size="sm" variant="secondary" className="text-[10px] h-7 rounded-full bg-white/80" onClick={() => handleScan('5012345678902')}>Simulate THR-001</Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Input 
                placeholder="Type Barcode / SKU manually..." 
                value={manualCode} 
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan(manualCode)}
                className="rounded-xl h-12 pl-12 focus:ring-indigo-500"
              />
              <Barcode className="absolute left-4 top-3.5 text-gray-300 w-5 h-5" />
              <Button 
                onClick={() => handleScan(manualCode)}
                className="absolute right-1 top-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4"
              >
                Find Item
              </Button>
            </div>
            {error && <p className="text-xs text-red-500 font-medium px-2">{error}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewInvoiceDialog({ invoice, order, customer, inventory, trigger, onGenerateIRN }: {
  invoice?: Invoice;
  order?: SalesOrder;
  customer?: Customer;
  inventory: InventoryItem[];
  trigger: React.ReactNode;
  onGenerateIRN?: (invoiceId: string) => void;
}) {
  if (!invoice || !order) return null;

  const taxableAmount = invoice.taxableAmount ?? order.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const customerState = customer?.state || 'Maharashtra';
  const isIntraState = customerState.toLowerCase() === 'maharashtra';
  const cgst = invoice.cgst ?? (isIntraState ? (invoice.totalAmount - taxableAmount) / 2 : 0);
  const sgst = invoice.sgst ?? (isIntraState ? (invoice.totalAmount - taxableAmount) / 2 : 0);
  const igst = invoice.igst ?? (!isIntraState ? (invoice.totalAmount - taxableAmount) : 0);

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[750px] bg-white border-0 shadow-2xl p-0">
        <div className="p-8 space-y-6 max-h-[90vh] overflow-y-auto print:p-0 print:max-h-none">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                  <Package className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-xl tracking-tighter">InvPredict</span>
              </div>
              <p className="text-xs text-indigo-900 font-bold">GSTIN: 27AAAAA0000A1Z5 (MH)</p>
              <p className="text-xs text-gray-400">123 Industrial Hub, Cyber City, Mumbai, India</p>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-black text-indigo-900 uppercase tracking-tight">Invoice</h1>
              <p className="text-gray-500 font-bold"># {invoice.id}</p>
            </div>
          </div>

          <Separator className="bg-gray-100" />

          {/* E-Invoicing Registration Section */}
          {invoice.irnGenerated ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-4 items-center">
              <div className="bg-white p-2 border border-gray-200 rounded-xl shadow-sm flex-shrink-0">
                <div className="w-16 h-16 grid grid-cols-4 gap-1 p-1 bg-black">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className={`rounded-sm ${i % 3 === 0 || i % 5 === 1 ? 'bg-white' : 'bg-black'}`} />
                  ))}
                </div>
                <p className="text-[7px] text-center font-bold text-zinc-500 font-mono mt-1">IRP SIGNED</p>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">E-Invoice / IRN Active</span>
                  <span className="text-xs text-gray-500 font-medium">Ack No: <strong className="text-gray-800">{invoice.ackNumber}</strong></span>
                  <span className="text-xs text-gray-500 font-medium">Ack Date: <strong className="text-gray-800">{invoice.ackDate}</strong></span>
                </div>
                <p className="text-[10px] text-gray-600 font-mono break-all line-clamp-1" title={invoice.irn}>
                  <strong>IRN:</strong> {invoice.irn}
                </p>
                <p className="text-[9px] text-gray-400">This invoice document is cryptographically signed at the NIC portal and is status-compliant under GSTR-1 frameworks.</p>
              </div>
            </div>
          ) : (
            onGenerateIRN && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" /> IRP E-Invoicing Registration Pending
                  </h4>
                  <p className="text-[11px] text-indigo-700 mt-0.5">Generate IRN on GSTR portal block to obtain digit signature and IRN reference.</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => onGenerateIRN(invoice.id)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-1.5 rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Register E-Invoice
                </Button>
              </div>
            )
          )}

          {/* Billing Info */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-2">Bill To</p>
              <h3 className="font-bold text-lg text-gray-900">{customer?.name || order.customerName}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{customer?.address || 'No address provided'}</p>
              <div className="mt-2 text-sm text-gray-500 space-y-0.5">
                <p>Email: {customer?.email || 'N/A'}</p>
                <p>Contact: {customer?.contact || 'N/A'}</p>
                {customer?.gstin && <p className="font-bold text-indigo-900">GSTIN: {customer.gstin} ({customerState})</p>}
                {!customer?.gstin && <p className="text-[11px] text-amber-600 italic">Unregistered Consumer (B2C)</p>}
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between border-b pb-2 border-gray-200">
                <span className="text-gray-500 text-xs font-medium">Invoice Date</span>
                <span className="text-gray-900 text-xs font-bold">{invoice.date}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-gray-200">
                <span className="text-gray-500 text-xs font-medium">Due Date</span>
                <span className="text-gray-900 text-xs font-bold">{invoice.dueDate}</span>
              </div>
              <div className="flex justify-between border-b pb-2 border-gray-200">
                <span className="text-gray-500 text-xs font-medium">Sales Order</span>
                <span className="text-gray-900 text-xs font-bold">{invoice.orderId}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500 text-xs font-medium">Place of Supply</span>
                <span className="text-gray-900 text-xs font-bold">{customerState}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500 text-xs font-medium">Status</span>
                <Badge className={`h-5 text-[10px] ${
                  invoice.status === 'paid' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {invoice.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-gray-500">Item Description</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 text-center">HSN/SAC</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 text-center">Rate (%)</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 text-center">Qty</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 text-right">Taxable Rate</TableHead>
                  <TableHead className="text-xs font-bold text-gray-500 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, idx) => {
                  const invItem = inventory.find(i => i.id === item.itemId);
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-bold text-gray-900">{invItem?.name || 'Unknown Item'}</div>
                        <div className="text-[10px] text-gray-400 font-mono uppercase">{invItem?.sku || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">{invItem?.hsnCode || '9987'}</TableCell>
                      <TableCell className="text-center text-xs">{invItem?.gstRate ?? 18}%</TableCell>
                      <TableCell className="text-center font-medium text-xs">{item.quantity} {invItem?.unit}</TableCell>
                      <TableCell className="text-right text-xs">₹{item.rate.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-xs">₹{(item.quantity * item.rate).toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Taxable Amount</span>
                <span>₹{taxableAmount.toLocaleString()}</span>
              </div>
              {cgst > 0 && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Central Tax (CGST)</span>
                  <span>₹{cgst.toLocaleString()}</span>
                </div>
              )}
              {sgst > 0 && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>State Tax (SGST)</span>
                  <span>₹{sgst.toLocaleString()}</span>
                </div>
              )}
              {igst > 0 && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Integrated Tax (IGST)</span>
                  <span>₹{igst.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-indigo-900 text-xs font-bold bg-indigo-50/50 p-2 rounded-xl">
                <span>Total GST Tax Component</span>
                <span>₹{(cgst + sgst + igst).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-1">
                <span className="text-base font-bold text-gray-900">Grand Total (Inclusive of Tax)</span>
                <span className="text-xl font-black text-indigo-600">₹{invoice.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold p-2 bg-green-50 text-emerald-700 rounded-xl">
                <span>Amount Paid</span>
                <span>₹{invoice.paidAmount.toLocaleString()}</span>
              </div>
              {invoice.totalAmount - invoice.paidAmount > 0 && (
                <div className="flex justify-between text-xs font-bold p-2 bg-red-50 text-red-700 rounded-xl">
                  <span>Balance Due</span>
                  <span>₹{(invoice.totalAmount - invoice.paidAmount).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 sm:justify-between items-center">
            <p className="text-[10px] text-gray-400 italic">This is an IRP and GST-compliant computer generated invoice.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl border-gray-200 h-9" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
              <Button className="bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 h-9 text-xs">
                Email Customer
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StaffPage({ 
  staff, 
  onUpdateStaff, 
  onAddStaff,
  addAuditLog,
  language = 'en'
}: { 
  staff: Staff[], 
  onUpdateStaff: (staffList: Staff[]) => void, 
  onAddStaff: (s: Staff) => void,
  addAuditLog: (action: string, entityType: string, entityId: string, details: string) => void,
  language?: Language
}) {
  const [open, setOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'staff_viewer' as Staff['role']
  });

  const getRoleDefaults = (role: Staff['role']): Staff['permissions'] => {
    switch (role) {
      case 'admin':
        return {
          editInventory: true,
          manageBatches: true,
          makeAdjustments: true,
          executeRecall: true,
          manageSuppliers: true,
          createOrders: true,
          recordPayments: true,
          viewReports: true,
          manageStaff: true
        };
      case 'inventory_manager':
        return {
          editInventory: true,
          manageBatches: true,
          makeAdjustments: true,
          executeRecall: true,
          manageSuppliers: true,
          createOrders: false,
          recordPayments: false,
          viewReports: false,
          manageStaff: false
        };
      case 'billing_clerk':
        return {
          editInventory: false,
          manageBatches: false,
          makeAdjustments: false,
          executeRecall: false,
          manageSuppliers: false,
          createOrders: true,
          recordPayments: true,
          viewReports: true,
          manageStaff: false
        };
      case 'staff_viewer':
      default:
        return {
          editInventory: false,
          manageBatches: false,
          makeAdjustments: false,
          executeRecall: false,
          manageSuppliers: false,
          createOrders: false,
          recordPayments: false,
          viewReports: false,
          manageStaff: false
        };
    }
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;

    const freshS: Staff = {
      id: `STF-${Date.now()}`,
      name: newStaff.name,
      email: newStaff.email,
      role: newStaff.role,
      lastActive: 'Just joined',
      permissions: getRoleDefaults(newStaff.role)
    };

    onAddStaff(freshS);
    setOpen(false);
    setNewStaff({ name: '', email: '', role: 'staff_viewer' });
  };

  const handleTogglePermission = (staffId: string, permKey: keyof Staff['permissions']) => {
    const updated = staff.map(s => {
      if (s.id === staffId) {
        const nextVal = !s.permissions[permKey];
        const detailStr = `Updated permission [${permKey}] to ${nextVal ? 'ALLOWED' : 'REVOKED'} for ${s.name}`;
        addAuditLog('Staff Permissions Update', 'Staff', staffId, detailStr);

        return {
          ...s,
          permissions: {
            ...s.permissions,
            [permKey]: nextVal
          }
        };
      }
      return s;
    });
    onUpdateStaff(updated);
  };

  const handleRoleChange = (staffId: string, nextRole: Staff['role']) => {
    const updated = staff.map(s => {
      if (s.id === staffId) {
        addAuditLog('Staff Role Reassignment', 'Staff', staffId, `Changed role of ${s.name} from '${s.role}' to '${nextRole}'. Reloaded system security defaults.`);
        return {
          ...s,
          role: nextRole,
          permissions: getRoleDefaults(nextRole)
        };
      }
      return s;
    });
    onUpdateStaff(updated);
  };

  // Compute permission metrics for visualization
  const chartData = useMemo(() => {
    const counts = {
      editInventory: 0,
      manageBatches: 0,
      makeAdjustments: 0,
      executeRecall: 0,
      manageSuppliers: 0,
      createOrders: 0,
      recordPayments: 0,
      viewReports: 0,
      manageStaff: 0
    };

    staff.forEach(s => {
      Object.keys(counts).forEach(k => {
        const key = k as keyof Staff['permissions'];
        if (s.permissions[key]) {
          counts[key]++;
        }
      });
    });

    return [
      { name: 'Edit Items', Staff: counts.editInventory },
      { name: 'Mfg Batches', Staff: counts.manageBatches },
      { name: 'Stock Adjust', Staff: counts.makeAdjustments },
      { name: 'Recall Lots', Staff: counts.executeRecall },
      { name: 'Supplier Admin', Staff: counts.manageSuppliers },
      { name: 'Issue Orders', Staff: counts.createOrders },
      { name: 'Collect PMT', Staff: counts.recordPayments },
      { name: 'Reports', Staff: counts.viewReports }
    ];
  }, [staff]);

  return (
    <div className="space-y-6 text-[#1A1A1A]">
      {/* Dynamic Critical Notifications panel */}
      <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-150 text-indigo-900 p-4 rounded-2xl shadow-sm">
        <Lock className="w-5 h-5 text-indigo-600 flex-shrink-0 animate-pulse" />
        <div className="text-xs">
          <span className="font-bold">SECURITY ENVIRONMENT SIMULATION:</span> Toggle permissions or change roles directly. Use the profile switcher in the top right header to toggle active employee contexts and observe instantaneous, real-time feature blockades!
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics and Visualizer */}
        <Card className="shadow-sm border-gray-200 lg:col-span-1 bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Security Clearance Matrix
            </CardTitle>
            <CardDescription className="text-xs">
              Staff counts possessing specific system level access clearances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: -10, top: 0, right: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#EEF2F6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="Staff" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Staff Administration & Roster */}
        <Card className="shadow-sm border-gray-200 lg:col-span-2 bg-white">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">{language === 'ta' ? "பணியாளர்கள் & விபரம்" : "Staff & Organization Roster"}</CardTitle>
              <CardDescription className="text-xs">{language === 'ta' ? "அனுமதிகளை நிர்வகிக்க அல்லது ஊழியர்களை ஊக்குவிக்க" : "Toggle fine-grained credentials or promote staff below."}</CardDescription>
            </div>
            {/* Create Staff Profile Button */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="bg-indigo-600 text-white rounded-xl text-xs h-9 font-bold" />}>
                <Plus className="w-3.5 h-3.5 mr-1" /> {language === 'ta' ? "பணியாளரை சேர்க்க" : "Onboard Staff"}
              </DialogTrigger>
              <DialogContent className="max-w-md text-slate-800">
                <form onSubmit={handleCreateStaff}>
                  <DialogHeader>
                    <DialogTitle>Onboard Organization Staff</DialogTitle>
                    <CardDescription>Creates an enterprise account profile with pre-mapped security role scopes.</CardDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <Label>Full Employee Name</Label>
                      <Input 
                        placeholder="e.g. Sandeep Varma" 
                        value={newStaff.name} 
                        onChange={e => setNewStaff({...newStaff, name: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Company Email Address</Label>
                      <Input
                        type="email"
                        placeholder="e.g. sandeep@enterprise.com" 
                        value={newStaff.email} 
                        onChange={e => setNewStaff({...newStaff, email: e.target.value})} 
                        required 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Operational Role Base</Label>
                      <select 
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-[#1A1A1A]"
                        value={newStaff.role}
                        onChange={e => setNewStaff({...newStaff, role: e.target.value as Staff['role']})}
                        required
                      >
                        <option value="admin">Super Admin (All Permissions)</option>
                        <option value="inventory_manager">Inventory Manager (Stock & Batches)</option>
                        <option value="billing_clerk">Billing Clerk (Payments & General Sales)</option>
                        <option value="staff_viewer">Staff Viewer (Read Only View access)</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full bg-indigo-600 text-white rounded-xl">Onboard Staff Profile</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-600">Employee Details</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">Role Base Level</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-center">Edit Items</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-center">Mfg Batches</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-center">Batch Recall</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-center">Stock Adjust</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-center">Billing/PMT</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-center">Staff Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map(member => (
                    <TableRow key={member.id} className="hover:bg-slate-50/50">
                      <TableCell className="py-3">
                        <div className="font-bold text-xs text-slate-900">{member.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{member.email}</div>
                        <div className="text-[9px] text-indigo-505 text-indigo-500 font-medium mt-0.5">Last: {member.lastActive}</div>
                      </TableCell>
                      <TableCell>
                        <select
                          className="h-7 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-700 px-1 py-0.5"
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as Staff['role'])}
                        >
                          <option value="admin">Admin</option>
                          <option value="inventory_manager">Manager</option>
                          <option value="billing_clerk">Billing Clerk</option>
                          <option value="staff_viewer">Staff Viewer</option>
                        </select>
                      </TableCell>
                      
                      {/* Checkboxes for direct granularity tweak */}
                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          checked={member.permissions.editInventory}
                          onChange={() => handleTogglePermission(member.id, 'editInventory')}
                          disabled={member.role === 'admin'}
                          className="h-3.5 w-3.5 cursor-pointer accent-indigo-600 disabled:opacity-40"
                        />
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          checked={member.permissions.manageBatches}
                          onChange={() => handleTogglePermission(member.id, 'manageBatches')}
                          disabled={member.role === 'admin'}
                          className="h-3.5 w-3.5 cursor-pointer accent-indigo-600 disabled:opacity-40"
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          checked={member.permissions.executeRecall}
                          onChange={() => handleTogglePermission(member.id, 'executeRecall')}
                          disabled={member.role === 'admin'}
                          className="h-3.5 w-3.5 cursor-pointer accent-indigo-600 disabled:opacity-40"
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          checked={member.permissions.makeAdjustments}
                          onChange={() => handleTogglePermission(member.id, 'makeAdjustments')}
                          disabled={member.role === 'admin'}
                          className="h-3.5 w-3.5 cursor-pointer accent-indigo-600 disabled:opacity-40"
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          checked={member.permissions.recordPayments}
                          onChange={() => handleTogglePermission(member.id, 'recordPayments')}
                          disabled={member.role === 'admin'}
                          className="h-3.5 w-3.5 cursor-pointer accent-indigo-600 disabled:opacity-40"
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <input 
                          type="checkbox" 
                          checked={member.permissions.manageStaff}
                          onChange={() => handleTogglePermission(member.id, 'manageStaff')}
                          disabled={member.role === 'admin'}
                          className="h-3.5 w-3.5 cursor-pointer accent-indigo-600 disabled:opacity-40"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

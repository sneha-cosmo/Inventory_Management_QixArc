import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Users,
  Grid,
  FileText,
  DollarSign,
  UserPlus,
  RefreshCw,
  Columns,
  Coins,
  Combine,
  Split,
  ChevronRight,
  Utensils,
  Maximize2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { InventoryItem, Customer, SalesOrder, Invoice } from '../types';

export interface TableOrder {
  id: string; // e.g., 'T-1'
  tableName: string; // e.g., 'Table 1 (Premium)'
  status: 'free' | 'occupied';
  customerId: string;
  customerName: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    rate: number;
  }[];
  date: string;
}

interface SplitMergePanelProps {
  inventory: InventoryItem[];
  customers: Customer[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  setSalesOrders: React.Dispatch<React.SetStateAction<SalesOrder[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  addAuditLog: (action: string, entityType: string, entityId: string, details: string) => void;
  language?: string;
}

// Seed mock dining tables for a high fidelity immersive interactive terminal
const INITIAL_TABLES: TableOrder[] = [
  {
    id: 'T-1',
    tableName: 'Lounge Table 1',
    status: 'occupied',
    customerId: 'cust-1',
    customerName: 'Elite Apparels',
    items: [
      { itemId: '1', itemName: 'Fabric (Cotton)', quantity: 20, rate: 130 },
      { itemId: '3', itemName: 'Buttons (Standard)', quantity: 150, rate: 8 }
    ],
    date: '2026-05-29'
  },
  {
    id: 'T-2',
    tableName: 'Seating Deck 2',
    status: 'occupied',
    customerId: 'cust-2',
    customerName: 'Global Textiles',
    items: [
      { itemId: '2', itemName: 'Thread (Polyester)', quantity: 35, rate: 55 },
      { itemId: '1', itemName: 'Fabric (Cotton)', quantity: 10, rate: 130 }
    ],
    date: '2026-05-29'
  },
  {
    id: 'T-3',
    tableName: 'Executive Suite A',
    status: 'free',
    customerId: '',
    customerName: '',
    items: [],
    date: '2026-05-29'
  },
  {
    id: 'T-4',
    tableName: 'Lounge Table 4',
    status: 'occupied',
    customerId: 'cust-1',
    customerName: 'Elite Apparels',
    items: [
      { itemId: '3', itemName: 'Buttons (Standard)', quantity: 400, rate: 8 }
    ],
    date: '2026-05-29'
  },
  {
    id: 'T-5',
    tableName: 'VIP Lounge 5',
    status: 'free',
    customerId: '',
    customerName: '',
    items: [],
    date: '2026-05-29'
  },
  {
    id: 'T-6',
    tableName: 'Standard Table 6',
    status: 'free',
    customerId: '',
    customerName: '',
    items: [],
    date: '2026-05-29'
  }
];

export default function SplitMergePanel({
  inventory,
  customers,
  salesOrders,
  invoices,
  setSalesOrders,
  setInvoices,
  addAuditLog,
  language = 'en'
}: SplitMergePanelProps) {
  // Local persistence of active seating layout database
  const [tables, setTables] = useState<TableOrder[]>(() => {
    const saved = localStorage.getItem('inventory_billing_tables');
    return saved ? JSON.parse(saved) : INITIAL_TABLES;
  });

  const saveTables = (newTables: TableOrder[]) => {
    setTables(newTables);
    localStorage.setItem('inventory_billing_tables', JSON.stringify(newTables));
  };

  // State controls for active selected table
  const [selectedTableId, setSelectedTableId] = useState<string>('T-1');

  // Form Adding Items inside specific Table Order
  const [newItemId, setNewItemId] = useState(inventory[0]?.id || '');
  const [newItemQty, setNewItemIdQty] = useState('10');
  const [newItemRate, setNewItemIdRate] = useState('100');

  // Dialog & Selection for "Merge Bill/Table" modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string>('');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // Dialog & State for "Split Bill Dialog"
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitSourceId, setSplitSourceId] = useState<string>('');
  const [splitWayCount, setSplitWayCount] = useState<number>(2); // Equal Split size
  
  // Custom item-split allocation weights state
  const [customSplitItems, setCustomSplitItems] = useState<Record<string, number>>({}); 

  // Form check out state
  const [checkoutCustomerId, setCheckoutCustomerId] = useState(customers[0]?.id || '');

  // Helper selectors
  const activeSelectedTable = useMemo(() => {
    return tables.find(t => t.id === selectedTableId);
  }, [tables, selectedTableId]);

  // Compute Active selected table total
  const selectedTableFinancials = useMemo(() => {
    if (!activeSelectedTable) return { subtotal: 0, tax: 0, total: 0 };
    let subtotal = 0;
    activeSelectedTable.items.forEach(it => {
      subtotal += it.quantity * it.rate;
    });
    // Assume 18% IGST general reference rate computed
    const tax = parseFloat((subtotal * 0.18).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));
    return { subtotal, tax, total };
  }, [activeSelectedTable]);

  // Handle setting a table context to occupied with a customer
  const handleOccupiedTable = (tableId: string, customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;

    const targetTable = tables.find(t => t.id === tableId);

    const updated = tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'occupied' as const,
          customerId,
          customerName: cust.name,
          date: new Date().toISOString().split('T')[0]
        };
      }
      return t;
    });
    saveTables(updated);
    addAuditLog('Occupied Table', 'TableOrder', tableId, `${targetTable?.tableName || 'Table'} assigned to customer ${cust.name}`);
  };

  const handleFreeTable = (tableId: string) => {
    const targetTable = tables.find(t => t.id === tableId);
    const updated = tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'free' as const,
          customerId: '',
          customerName: '',
          items: []
        };
      }
      return t;
    });
    saveTables(updated);
    addAuditLog('Released Table Order', 'TableOrder', tableId, `${targetTable?.tableName || 'Table'} bill cleared and released to Free inventory state`);
  };

  // Add Item to Table
  const handleAddItemToTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedTable || activeSelectedTable.status === 'free') {
      alert('You must occupy the table with a customer first before building their bill!');
      return;
    }

    const item = inventory.find(i => i.id === newItemId);
    if (!item) return;

    const qty = Number(newItemQty);
    const rate = Number(newItemRate);
    if (isNaN(qty) || isNaN(rate) || qty <= 0 || rate <= 0) {
      alert('Please enter valid quantities and pricing rates.');
      return;
    }

    // Check if item already exists in this table's orders, append if so, else add new
    let itemAlreadyExist = false;
    const updatedItems = activeSelectedTable.items.map(it => {
      if (it.itemId === item.id) {
        itemAlreadyExist = true;
        return { ...it, quantity: it.quantity + qty };
      }
      return it;
    });

    const finalItemsList = itemAlreadyExist 
      ? updatedItems 
      : [...activeSelectedTable.items, { itemId: item.id, itemName: item.name, quantity: qty, rate }];

    const updatedTables = tables.map(t => {
      if (t.id === selectedTableId) {
        return { ...t, items: finalItemsList };
      }
      return t;
    });

    saveTables(updatedTables);
    setNewItemIdQty('10');
  };

  // Remove Item line
  const handleRemoveItemFromTable = (itemId: string) => {
    if (!activeSelectedTable) return;
    const filtered = activeSelectedTable.items.filter(it => it.itemId !== itemId);
    const updatedTables = tables.map(t => {
      if (t.id === selectedTableId) {
        return { ...t, items: filtered };
      }
      return t;
    });
    saveTables(updatedTables);
  };

  // ===============================================
  // CORE OPERATION 1: MERGE TABLES / MERGE BILLS
  // ===============================================
  const executeMergeTables = () => {
    if (!mergeSourceId || !mergeTargetId) {
      alert('Please choose distinct source and destination tables to combine.');
      return;
    }
    if (mergeSourceId === mergeTargetId) {
      alert('Source and destination tables must be different fields!');
      return;
    }

    const source = tables.find(t => t.id === mergeSourceId);
    const target = tables.find(t => t.id === mergeTargetId);

    if (!source || !target) return;
    if (source.items.length === 0) {
      alert('Source table has no active order lines to combine.');
      return;
    }

    if (target.status === 'free') {
      // Prompt user or automatically transfer ownership
      const confirmMerge = window.confirm(`Target ${target.tableName} is empty. Merge will copy all billings and transfer guest tracking to ${source.customerName}. Proceed?`);
      if (!confirmMerge) return;
    }

    // Combine order items
    const consolidatedItems = [...target.items];
    source.items.forEach(sourceIt => {
      const matchIndex = consolidatedItems.findIndex(tIt => tIt.itemId === sourceIt.itemId);
      if (matchIndex > -1) {
        consolidatedItems[matchIndex] = {
          ...consolidatedItems[matchIndex],
          quantity: consolidatedItems[matchIndex].quantity + sourceIt.quantity
        };
      } else {
        consolidatedItems.push({ ...sourceIt });
      }
    });

    // Update seating states
    const updatedTables = tables.map(t => {
      if (t.id === mergeTargetId) {
        return {
          ...t,
          status: 'occupied' as const,
          customerId: target.customerId || source.customerId,
          customerName: target.customerName || source.customerName,
          items: consolidatedItems
        };
      }
      if (t.id === mergeSourceId) {
        return {
          ...t,
          status: 'free' as const,
          customerId: '',
          customerName: '',
          items: []
        };
      }
      return t;
    });

    saveTables(updatedTables);
    setShowMergeModal(false);
    setSelectedTableId(mergeTargetId);

    addAuditLog(
      'Merge Seating Bills', 
      'TableOrder', 
      mergeTargetId, 
      `Combined orders of ${source.tableName} into ${target.tableName}. Released source table back to free list.`
    );
  };


  // ===============================================
  // CORE OPERATION 2: BILL SPLITTING (EQUAL OR ITEM-SPLIT)
  // ===============================================
  
  // Execute Equal Splits: directly converts and saves multiple sub-tickets to main billing system!
  const executeEqualWaysSplitBilling = () => {
    const sourceTable = tables.find(t => t.id === splitSourceId);
    if (!sourceTable || sourceTable.items.length === 0) return;

    if (splitWayCount < 2 || splitWayCount > 10) {
      alert('Split weight must be between 2 and 10 shares.');
      return;
    }

    // Splitting means we divided the subtotal amount equally. Let's create N drafts/paid invoices
    const baseTotal = sourceTable.items.reduce((sum, it) => sum + (it.quantity * it.rate), 0);
    const individualSubtotal = baseTotal / splitWayCount;
    const individualTax = parseFloat((individualSubtotal * 0.18).toFixed(2));
    const individualTotal = parseFloat((individualSubtotal + individualTax).toFixed(2));

    const newSalesOrders: SalesOrder[] = [];
    const newInvoices: Invoice[] = [];

    const now = new Date().toISOString().split('T')[0];
    const customer = customers.find(c => c.id === sourceTable.customerId) || customers[0];

    for (let i = 1; i <= splitWayCount; i++) {
      const soId = `SO-SPLIT-${Date.now()}-${i}`;
      const invId = `INV-SPLIT-${Date.now()}-${i}`;

      const so: SalesOrder = {
        id: soId,
        customerId: customer?.id || 'cust-1',
        customerName: `${customer?.name || 'Walk-in'} (Split ${i}/${splitWayCount})`,
        date: now,
        status: 'delivered',
        items: sourceTable.items.map(it => ({
          itemId: it.itemId,
          quantity: parseFloat((it.quantity / splitWayCount).toFixed(2)),
          rate: it.rate
        })),
        totalAmount: individualTotal
      };

      const inv: Invoice = {
        id: invId,
        orderId: soId,
        orderType: 'sales',
        date: now,
        dueDate: now,
        totalAmount: individualTotal,
        paidAmount: 0,
        status: 'unpaid',
        taxableAmount: parseFloat(individualSubtotal.toFixed(2)),
        igst: individualTax,
        cgst: 0,
        sgst: 0,
        irnGenerated: false
      };

      newSalesOrders.push(so);
      newInvoices.push(inv);
    }

    // Publish to central master system states
    setSalesOrders(prev => [...newSalesOrders, ...prev]);
    setInvoices(prev => [...newInvoices, ...prev]);

    // Clear original table
    const updatedTables = tables.map(t => {
      if (t.id === splitSourceId) {
        return {
          ...t,
          status: 'free' as const,
          customerId: '',
          customerName: '',
          items: []
        };
      }
      return t;
    });
    saveTables(updatedTables);
    setShowSplitModal(false);

    addAuditLog(
      'Equally Split Bill',
      'Invoice',
      splitSourceId,
      `Split table ${sourceTable.tableName} guest ticket equally into ${splitWayCount} sub-bills of ₹${individualTotal.toLocaleString()} each and written to live transactions.`
    );

    alert(`Successfully split this bill into ${splitWayCount} equal invoices! These are now cased as independent live unpaid accounts in the Invoice system.`);
  };

  // Custom Item Split (Separate selective items into a new sub-bill)
  const executeItemizedSplit = () => {
    const sourceTable = tables.find(t => t.id === splitSourceId);
    if (!sourceTable) return;

    // We fetch which quantities are being allocated to Split B
    const originalKeptItems: typeof sourceTable.items = [];
    const splitMovedItems: typeof sourceTable.items = [];

    sourceTable.items.forEach(it => {
      const splitQty = customSplitItems[it.itemId] || 0;
      const keepQty = it.quantity - splitQty;

      if (keepQty > 0) {
        originalKeptItems.push({
          ...it,
          quantity: keepQty
        });
      }

      if (splitQty > 0) {
        splitMovedItems.push({
          ...it,
          quantity: splitQty
        });
      }
    });

    if (splitMovedItems.length === 0) {
      alert('Specify more than 0 items to allocate into the split bill section.');
      return;
    }

    // We look for a available free table or create an independent temporary ticket in Seating deck
    // To represent this split-item bill. Let's find first available Free Table to place Split.
    const freeTable = tables.find(t => t.status === 'free');
    if (!freeTable) {
      alert('Splitting items require at least 1 Free Table in the grid to hold the new generated split bill. Please release or cash out another station first!');
      return;
    }

    const updatedTables = tables.map(t => {
      // Keep remaining pieces in original table
      if (t.id === splitSourceId) {
        return {
          ...t,
          items: originalKeptItems
        };
      }
      // Put split pieces in empty target table
      if (t.id === freeTable.id) {
        return {
          ...t,
          status: 'occupied' as const,
          customerId: sourceTable.customerId,
          customerName: `${sourceTable.customerName} (Split Share)`,
          items: splitMovedItems,
          date: sourceTable.date
        };
      }
      return t;
    });

    saveTables(updatedTables);
    setSelectedTableId(splitSourceId);
    setCustomSplitItems({});
    setShowSplitModal(false);

    addAuditLog(
      'Itemized Split Bill',
      'TableOrder',
      freeTable.id,
      `Separated matching items of ${sourceTable.tableName} into a new guest bill placed at ${freeTable.tableName}.`
    );

    alert(`Success! Split items moved from ${sourceTable.tableName} to ${freeTable.tableName}.`);
  };

  // ===============================================
  // CORE OPERATION 3: CASH OUT / COMMIT TO CENTRAL INVOICING
  // ===============================================
  const handleCashOutToInvoicing = () => {
    if (!activeSelectedTable || activeSelectedTable.items.length === 0) {
      alert('Selected dining station has no items to check out!');
      return;
    }

    // 1. Calculate GST tax details
    const targetCustomer = customers.find(c => c.id === activeSelectedTable.customerId) || customers[0];
    const isIntraState = !targetCustomer || !targetCustomer.state || targetCustomer.state.toLowerCase() === 'maharashtra';
    
    let taxableAmount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    activeSelectedTable.items.forEach(item => {
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

    const soId = `SO-TABLE-${Date.now()}`;
    const invId = `INV-TABLE-${Date.now()}`;

    // Create the SalesOrder structure
    const so: SalesOrder = {
      id: soId,
      customerId: targetCustomer.id,
      customerName: activeSelectedTable.customerName,
      date: new Date().toISOString().split('T')[0],
      status: 'delivered',
      items: activeSelectedTable.items.map(it => ({
        itemId: it.itemId,
        quantity: it.quantity,
        rate: it.rate
      })),
      totalAmount: finalInvoiceTotal
    };

    // Create corresponding Invoice structure
    const inv: Invoice = {
      id: invId,
      orderId: soId,
      orderType: 'sales',
      date: so.date,
      dueDate: new Date(new Date(so.date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalAmount: finalInvoiceTotal,
      paidAmount: finalInvoiceTotal, // Mark as fully settled paid!
      status: 'paid', // Directly mark as settled fully paid POS ticket!
      taxableAmount,
      cgst,
      sgst,
      igst,
      irnGenerated: true,
      irn: `887b40bc6aef01fdcf375${Date.now().toString().substring(4)}`
    };

    // Update central states
    setSalesOrders(prev => [so, ...prev]);
    setInvoices(prev => [inv, ...prev]);

    // Free the table
    handleFreeTable(selectedTableId);

    // Save in audit logs
    addAuditLog(
      'Table Check-out Paid', 
      'Invoice', 
      invId, 
      `Direct POS sales checkout for ${activeSelectedTable.tableName}. Invoiced, received cash payments of ₹${finalInvoiceTotal.toLocaleString()} and settled transaction.`
    );

    alert(`Successfully generated Paid POS Invoice ${invId} for ${targetCustomer.name}! Table has been cleared and reset.`);
  };


  return (
    <div className="space-y-6 text-[#1A1A1A]">
      
      {/* Top Description/Header Helper banner */}
      <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <Utensils className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h5 className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              Split Billing & Table Merge Matrix
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-extrabold uppercase py-0 active-none">
                POS Optimizer Active
              </Badge>
            </h5>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-3xl">
              Simulate point-of-sale layout seating and order drafts. Partition tables among multiple payers equally, move item lines between tables, combine distinct tables for group invoicing, and checkout directly into master standard transactions ledger with integrated GST formulas.
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-end md:self-center">
          <Button 
            onClick={() => {
              if (tables.length > 0) {
                // Pre-populate merge
                const occupied = tables.filter(t => t.status === 'occupied');
                if (occupied.length >= 2) {
                  setMergeSourceId(occupied[0].id);
                  setMergeTargetId(occupied[1].id);
                } else if (tables.length >= 2) {
                  setMergeSourceId(tables[0].id);
                  setMergeTargetId(tables[1].id);
                }
              }
              setShowMergeModal(true);
            }} 
            variant="outline" 
            size="xs"
            className="text-[10px] h-8.5 font-bold border-indigo-200 hover:bg-slate-100 text-indigo-700 rounded-xl cursor-pointer"
          >
            <Combine className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Merge Tables
          </Button>

          <Button 
            onClick={() => {
              setSplitSourceId(selectedTableId);
              setShowSplitModal(true);
            }} 
            variant="outline" 
            size="xs"
            className="text-[10px] h-8.5 font-bold border-indigo-200 hover:bg-slate-100 text-indigo-700 rounded-xl cursor-pointer"
          >
            <Split className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Split Guest Bill
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Grid: Seating / Draft Ledger Stations */}
        <div className="lg:col-span-1 space-y-5">
          <Card className="border-slate-200 shadow-sm bg-white rounded-3xl">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-indigo-600" /> Seating / Station Map (POS)
              </CardTitle>
              <CardDescription className="text-[10px]">Select a station to manage pending billing drafts.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3.5">
                {tables.map(t => {
                  const billSum = t.items.reduce((sum, it) => sum + (it.quantity * it.rate), 0);
                  const isSelected = t.id === selectedTableId;
                  const isOccupied = t.status === 'occupied';

                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTableId(t.id)}
                      className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all relative ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500' 
                          : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-bold text-slate-800">{t.tableName}</span>
                        <div className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      </div>
                      
                      <div className="mt-2 text-[10px] space-y-1 w-full">
                        {isOccupied ? (
                          <>
                            <div className="text-slate-805 font-medium truncate">{t.customerName}</div>
                            <div className="font-mono font-bold text-slate-900 mt-1 flex items-center justify-between">
                              <span>Bill Items: {t.items.length}</span>
                              <Badge className="bg-rose-50 text-rose-650 px-1 hover:bg-rose-50 text-[9px] font-black">
                                ₹{billSum.toLocaleString()}
                              </Badge>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-slate-400">Available Free</div>
                            <div className="text-slate-450 mt-1">₹0.00 base</div>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> {tables.filter(t => t.status === 'free').length} Stations Free
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" /> {tables.filter(t => t.status === 'occupied').length} Guests Occupied
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Assign Guest Form if table free */}
          {activeSelectedTable && activeSelectedTable.status === 'free' && (
            <Card className="border-dashed border-gray-300 bg-slate-50 rounded-3xl">
              <CardContent className="p-5 text-center space-y-4">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="space-y-1 text-center">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Table is Free/Empty</h4>
                  <p className="text-[10px] text-slate-500">Pick a registered company/customer billing profile to sit.</p>
                </div>

                <div className="space-y-3.5 max-w-xs mx-auto">
                  <select
                    id="occupy-item-select"
                    value={checkoutCustomerId}
                    onChange={(e) => setCheckoutCustomerId(e.target.value)}
                    className="w-full text-xs h-9 bg-white border border-slate-200 px-2 rounded-xl outline-hidden text-slate-705"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <Button 
                    onClick={() => handleOccupiedTable(selectedTableId, checkoutCustomerId || customers[0]?.id)}
                    size="xs" 
                    className="w-full h-8.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Set Active Guest
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>


        {/* Right Columns: Active station Billing statement breakdown */}
        <div className="lg:col-span-2 space-y-5">
          {activeSelectedTable && (
            <Card className="border-slate-200 shadow-sm bg-white rounded-3xl">
              
              {/* Header block with station summary */}
              <div className="p-4.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                      {activeSelectedTable.id}
                    </Badge>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {activeSelectedTable.tableName} Invoice Draft
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {activeSelectedTable.status === 'occupied' 
                      ? `Guest Owner: ${activeSelectedTable.customerName} (Assigned: ${activeSelectedTable.date})`
                      : 'Station is empty - pending occupant check-in'
                    }
                  </p>
                </div>
                
                {activeSelectedTable.status === 'occupied' && (
                  <Button 
                    onClick={() => handleFreeTable(selectedTableId)}
                    variant="outline" 
                    size="xs"
                    className="text-[10px] font-bold h-7.5 text-rose-650 border-rose-100 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    Clear Bill
                  </Button>
                )}
              </div>

              {/* Items Table container */}
              <CardContent className="p-0">
                {activeSelectedTable.items.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-400 font-semibold space-y-2.5">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                    <div>Selected guest has not ordered any material items.</div>
                    {activeSelectedTable.status === 'occupied' && (
                      <p className="text-[10px] text-slate-400/90 font-medium">Use the "Add order lines" form below to build their bill items.</p>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold pl-6 text-xs">Material Description</TableHead>
                        <TableHead className="font-bold text-xs text-right">Units Ordered</TableHead>
                        <TableHead className="font-bold text-xs text-right">Per-unit Cost</TableHead>
                        <TableHead className="font-bold text-xs text-right">Line Total</TableHead>
                        <TableHead className="font-bold text-xs text-center pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeSelectedTable.items.map(it => {
                        const lineVal = it.quantity * it.rate;
                        return (
                          <TableRow key={it.itemId} className="hover:bg-slate-50/10 text-xs">
                            <TableCell className="pl-6 py-2.5 font-bold text-slate-750">{it.itemName}</TableCell>
                            <TableCell className="text-right py-2.5 font-mono">{it.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right py-2.5 font-mono">₹{it.rate.toLocaleString()}</TableCell>
                            <TableCell className="text-right py-2.5 font-mono font-bold text-slate-900">₹{lineVal.toLocaleString()}</TableCell>
                            <TableCell className="text-center py-2.5 pr-6">
                              <Button 
                                onClick={() => handleRemoveItemFromTable(it.itemId)}
                                variant="ghost" 
                                size="xs"
                                className="h-7 w-7 p-0 text-red-500 rounded-lg hover:bg-red-50 cursor-pointer"
                                title="Strike item"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>

              {/* Bottom calculations & Checkout block */}
              {activeSelectedTable.items.length > 0 && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Financial breakdowns */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Items Subtotal:</span>
                        <span className="font-mono">₹{selectedTableFinancials.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Simulated Tax (GST @ 18%):</span>
                        <span className="font-mono">₹{selectedTableFinancials.tax.toLocaleString()}</span>
                      </div>
                      <Separator className="my-1 border-slate-100" />
                      <div className="flex justify-between text-slate-800 font-black text-xs uppercase">
                        <span>Consolidated Ticket Total:</span>
                        <span className="font-mono text-indigo-700">₹{selectedTableFinancials.total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Check out buttons */}
                    <div className="flex flex-col justify-end gap-2.5">
                      <Button 
                        onClick={handleCashOutToInvoicing}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9.5 text-xs rounded-xl cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Cash Out & Generate Paid Live Invoice
                      </Button>
                      <p className="text-[9px] text-center text-slate-450 font-medium">
                        Marks ticket as settled Paid and records matching Sales/Invoice entry in master ledgers.
                      </p>
                    </div>

                  </div>
                </div>
              )}

              {/* Add Sales Item Form Container inside Table */}
              {activeSelectedTable.status === 'occupied' && (
                <div className="p-4.5 border-t border-slate-100 bg-slate-50/10">
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-3">Add Order Material Line</h4>
                  <form onSubmit={handleAddItemToTable} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-400 uppercase">Material Item</Label>
                      <select
                        id="form-add-item"
                        value={newItemId}
                        onChange={(e) => {
                          setNewItemId(e.target.value);
                          const matchingItem = inventory.find(i => i.id === e.target.value);
                          // Provide standard benchmark values
                          setNewItemIdRate(matchingItem ? '100' : '100');
                        }}
                        className="w-full text-xs h-8.5 bg-white border border-slate-200 px-2 rounded-lg outline-hidden text-slate-700 focus:border-indigo-400 transition"
                      >
                        {inventory.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} (Stock: {item.currentStock})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-400 uppercase">Quantity</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={newItemQty}
                        onChange={(e) => setNewItemIdQty(e.target.value)}
                        className="h-8.5 text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-400 uppercase">Rate (₹)</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={newItemRate}
                        onChange={(e) => setNewItemIdRate(e.target.value)}
                        className="h-8.5 text-xs"
                        required
                      />
                    </div>

                    <div className="flex items-end">
                      <Button 
                        type="submit" 
                        size="xs" 
                        className="w-full h-8.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer"
                      >
                        <Plus size={12} className="mr-0.5" /> Append To Bill
                      </Button>
                    </div>
                  </form>
                </div>
              )}

            </Card>
          )}
        </div>

      </div>


      {/* ========================================================
          MODAL DIALOG: MERGE SEATING TABLES
          ======================================================== */}
      <Dialog open={showMergeModal} onOpenChange={setShowMergeModal}>
        <DialogContent className="max-w-md bg-white p-6 rounded-3xl border border-slate-250 select-none text-xs">
          <DialogHeader className="space-y-1.5 text-left border-b border-slate-100 pb-3">
            <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Combine className="w-4 h-4 text-indigo-650" /> Merge Tables POS Hub
            </DialogTitle>
            <CardDescription className="text-[10px]">
              Combine items and billings of two occupied dining registers into a single destination terminal.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4.5 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase">1. Choose Source Table (Bill is moved)</Label>
              <select
                value={mergeSourceId}
                onChange={(e) => setMergeSourceId(e.target.value)}
                className="w-full text-xs h-10 border border-slate-200 px-3 bg-slate-50 rounded-xl outline-hidden focus:border-indigo-400 font-sans"
              >
                <option value="">-- Choose From Source --</option>
                {tables.filter(t => t.status === 'occupied').map(t => (
                  <option key={t.id} value={t.id}>
                    {t.tableName} - {t.customerName} (₹{t.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase">2. Choose Destination Table (Merges target)</Label>
              <select
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                className="w-full text-xs h-10 border border-slate-200 px-3 bg-slate-50 rounded-xl outline-hidden focus:border-indigo-400 font-sans"
              >
                <option value="">-- Choose Target Deck --</option>
                {/* Free or occupied targets can be chosen */}
                {tables.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.tableName} {t.status === 'occupied' ? `[Occupied by ${t.customerName}]` : '[Guest Deck Free]'}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-50 border border-slate-100 text-[10px] text-slate-500 p-3 rounded-2xl leading-relaxed font-semibold">
              Warning: Combining is a final ledger operation. Items from Source will be moved. Source Table will then instantly release and return back to "Free / Available" state.
            </div>
          </div>

          <DialogFooter className="flex gap-2.5 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowMergeModal(false)}
              className="px-4.5 h-9 text-xs font-bold border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"
            >
              Close
            </Button>
            <Button 
              onClick={executeMergeTables}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4.5 h-9 text-xs font-bold rounded-xl cursor-pointer"
            >
              Confirm Merge Operations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ========================================================
          MODAL DIALOG: SPLIT ACTIVE GUEST BILL
          ======================================================== */}
      <Dialog open={showSplitModal} onOpenChange={setShowSplitModal}>
        <DialogContent className="max-w-lg bg-white p-6 rounded-3xl border border-slate-250 select-none text-xs">
          
          <DialogHeader className="space-y-1.5 text-left border-b border-slate-100 pb-3">
            <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Split className="w-4 h-4 text-indigo-650" /> Split Guest Ticket
            </DialogTitle>
            <CardDescription className="text-[10px]">
              Select a station and partition their values. Choose equal payouts or custom item drag assignments.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            
            {/* Select source table */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase">Seating ticket to partition</Label>
              <select
                value={splitSourceId}
                onChange={(e) => {
                  setSplitSourceId(e.target.value);
                  setCustomSplitItems({});
                }}
                className="w-full text-xs h-10 border border-slate-200 px-3 bg-slate-50 rounded-xl outline-hidden focus:border-indigo-400 font-sans"
              >
                <option value="">-- Choose Seating Log --</option>
                {tables.filter(t => t.status === 'occupied' && t.items.length > 0).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.tableName} - occupied by {t.customerName} (₹{t.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* If valid split selected, render option styles: Equal vs Itemized */}
            {splitSourceId && tables.find(t => t.id === splitSourceId) && (
              <div className="space-y-5">
                
                {/* Style A: Equal Ways Split */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-indigo-600" />
                    <h5 className="font-bold text-slate-800 text-xs">Option 1: Equal Ways Bill Split</h5>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Generates N identical direct split invoices in central system ledger. Settle separately!
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="space-y-1 flex-1">
                      <Label className="text-[9px] font-bold text-slate-400 uppercase">Division Shares</Label>
                      <Input
                        type="number"
                        min="2"
                        max="10"
                        value={splitWayCount}
                        onChange={(e) => setSplitWayCount(Number(e.target.value))}
                        className="h-8.5 text-xs bg-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={executeEqualWaysSplitBilling}
                        className="h-8.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4.5 rounded-lg cursor-pointer"
                      >
                        Split equally
                      </Button>
                    </div>
                  </div>
                  {splitSourceId && (
                    <div className="text-[9px] text-slate-450 font-medium">
                      Estimated individual share cost: <span className="font-bold text-indigo-700">₹{(tables.find(t => t.id === splitSourceId)!.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0) / (splitWayCount || 1) * 1.18).toFixed(2)}</span> (incl GST)
                    </div>
                  )}
                </div>

                {/* Style B: Partial Itemized Split */}
                <div className="border border-slate-200 p-4 rounded-2xl space-y-3.5 bg-slate-50/20">
                  <div className="flex items-center gap-2">
                    <Columns className="w-4 h-4 text-indigo-600" />
                    <h5 className="font-bold text-slate-800 text-xs">Option 2: Item-by-item Custom Split</h5>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Pull specific item counts out and transfer them to another vacant guest station.
                  </p>

                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-white p-2.5">
                    {tables.find(t => t.id === splitSourceId)!.items.map(it => {
                      const currentVal = customSplitItems[it.itemId] || 0;
                      return (
                        <div key={it.itemId} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-50">
                          <span className="font-bold text-slate-700">{it.itemName}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">({it.quantity} avail)</span>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                className="h-6 w-6 p-0 rounded-md cursor-pointer"
                                onClick={() => {
                                  const next = Math.max(0, currentVal - 5);
                                  setCustomSplitItems({ ...customSplitItems, [it.itemId]: next });
                                }}
                              >
                                -
                              </Button>
                              <span className="font-mono font-bold text-slate-800 w-8 text-center">{currentVal}</span>
                              <Button
                                variant="outline"
                                className="h-6 w-6 p-0 rounded-md cursor-pointer"
                                onClick={() => {
                                  const next = Math.min(it.quantity, currentVal + 5);
                                  setCustomSplitItems({ ...customSplitItems, [it.itemId]: next });
                                }}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end">
                    <Button
                      onClick={executeItemizedSplit}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold h-8.5 rounded-lg text-xs cursor-pointer"
                    >
                      Extract Split Items
                    </Button>
                  </div>
                </div>

              </div>
            )}

          </div>

          <DialogFooter className="flex sm:justify-end border-t border-slate-100 pt-3">
            <Button 
              variant="outline" 
              onClick={() => setShowSplitModal(false)}
              className="px-4.5 h-9 text-xs font-bold border-gray-200 hover:bg-slate-55 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

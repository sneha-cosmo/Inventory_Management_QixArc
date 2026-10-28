import React, { useMemo, useState } from 'react';
import { 
  ArrowLeftRight, 
  RefreshCcw, 
  MapPin, 
  Building2, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Plus, 
  Search, 
  Truck, 
  Hourglass, 
  CheckCircle2, 
  XSquare,
  FileSpreadsheet,
  Globe2,
  GitCompare,
  HelpCircle,
  TrendingUp,
  Sliders,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';
import { InventoryItem, Warehouse, StockLevel, StockTransfer, BranchSyncStatus } from '../types';

interface BranchSyncTransferPageProps {
  inventory: InventoryItem[];
  warehouses: Warehouse[];
  stockLevels: StockLevel[];
  transfers: StockTransfer[];
  syncStatuses: BranchSyncStatus[];
  onAddWarehouse: (w: Warehouse) => void;
  onAddTransfer: (t: StockTransfer) => void;
  onUpdateTransferStatus: (transferId: string, status: StockTransfer['status']) => void;
  onSyncBranch: (warehouseId: string) => void;
  onSyncAllBranches: () => void;
  checkPermission: (perm: string) => boolean;
}

export default function BranchSyncTransferPage({
  inventory,
  warehouses,
  stockLevels,
  transfers,
  syncStatuses,
  onAddWarehouse,
  onAddTransfer,
  onUpdateTransferStatus,
  onSyncBranch,
  onSyncAllBranches,
  checkPermission
}: BranchSyncTransferPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<'transfers' | 'matrix' | 'sync'>('transfers');
  const [searchQuery, setSearchQuery] = useState('');
  const [openTransferDialog, setOpenTransferDialog] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([
    'System init: Connected local database gateway to regional multi-branch servers.',
    'Ledger audit checklist verified for Mumbai (wh-1) and Pune (wh-2).'
  ]);

  // Transfer Form State
  const [newTransfer, setNewTransfer] = useState({
    itemId: '',
    sourceWarehouseId: '',
    destWarehouseId: '',
    quantity: '',
    carrier: '',
    notes: ''
  });

  const [filterSourceWh, setFilterSourceWh] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Multi-branch Sync Simulation
  const handlePerformSyncAll = () => {
    if (!checkPermission('editInventory')) {
      alert("🔒 Security notification: Your role doesn't authorize starting global multi-node synchronization cycles. Contact the regional coordinator.");
      return;
    }
    setSyncingAll(true);
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ⚡ Initiating Global synchronized reconciliation cycle...`,
      ...prev
    ]);

    setTimeout(() => {
      onSyncAllBranches();
      setSyncingAll(false);
      setSyncLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ✅ Global Sync complete: Synchronized catalog schemas, verified hash keys, updated regional storage profiles. Inter-depot parity is 100%.`,
        `[${new Date().toLocaleTimeString()}] 📍 Mumbai: Latency 38ms | Status: ACTIVE`,
        `[${new Date().toLocaleTimeString()}] 📍 Pune: Latency 45ms | Status: ACTIVE`,
        ...prev
      ]);
      alert("🌀 Deep parity synchronization complete! Remote regional branches are successfully synced with local headquarters.");
    }, 1800);
  };

  const handlePerformSyncSingle = (whId: string, whName: string) => {
    onSyncBranch(whId);
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ⚡ Reconnecting branch cluster [${whName}] - validating local transaction buffer...`,
      `[${new Date().toLocaleTimeString()}] ✅ Parity established for [${whName}]. Transaction ledger successfully verified with central hub.`,
      ...prev
    ]);
    alert(`🌀 Regional branch [${whName}] sync complete! Local on-hand changes pushed to regional API.`);
  };

  // Create Custom Warehouse / Node Registration
  const [openNewBranchDialog, setOpenNewBranchDialog] = useState(false);
  const [newBranchForm, setNewBranchForm] = useState({ name: '', location: '' });

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchForm.name || !newBranchForm.location) return;

    onAddWarehouse({
      id: `wh-${Date.now()}`,
      name: newBranchForm.name,
      location: newBranchForm.location
    });

    setOpenNewBranchDialog(false);
    setNewBranchForm({ name: '', location: '' });
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] 🏢 Registered new node: "${newBranchForm.name}" at location "${newBranchForm.location}". Intraday sync initialized.`,
      ...prev
    ]);
    alert(`🏢 New branch node successfully provisioned. Regional connection set to 'Pending Sync'.`);
  };

  // Handle Transfer Submit
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = Number(newTransfer.quantity);
    if (!newTransfer.itemId || !newTransfer.sourceWarehouseId || !newTransfer.destWarehouseId || qtyNum <= 0) {
      alert("⚠️ Valid physical details required: please choose items and enter a positive quantity.");
      return;
    }

    if (newTransfer.sourceWarehouseId === newTransfer.destWarehouseId) {
      alert("⚠️ Invalid path: Source and Destination branches must be different.");
      return;
    }

    // Live validation check: check source warehouse stocklevel
    const currentStockLevel = stockLevels.find(
      sl => sl.itemId === newTransfer.itemId && sl.warehouseId === newTransfer.sourceWarehouseId
    )?.quantity || 0;

    const item = inventory.find(i => i.id === newTransfer.itemId);
    const itemName = item?.name || 'Item';

    if (currentStockLevel < qtyNum) {
      alert(`⚠️ Insufficient stock: ${itemName} only has ${currentStockLevel} ${item?.unit || 'units'} available at ${warehouses.find(w => w.id === newTransfer.sourceWarehouseId)?.name || 'Source'}, unable to transfer ${qtyNum}.`);
      return;
    }

    const serialNum = `TRF-AWB-${Math.floor(100000 + Math.random() * 900000)}`;
    onAddTransfer({
      id: `TRF-${Date.now()}`,
      itemId: newTransfer.itemId,
      quantity: qtyNum,
      sourceWarehouseId: newTransfer.sourceWarehouseId,
      destWarehouseId: newTransfer.destWarehouseId,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      trackingNumber: serialNum,
      carrier: newTransfer.carrier || 'Express Inland Logistics',
      notes: newTransfer.notes
    });

    setOpenTransferDialog(false);
    setNewTransfer({
      itemId: '',
      sourceWarehouseId: '',
      destWarehouseId: '',
      quantity: '',
      carrier: '',
      notes: ''
    });

    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] 📤 Created transfer request ${serialNum} for ${qtyNum}x of ${itemName}. Standing in verification queue.`,
      ...prev
    ]);
    alert(`📤 Stock transfer initiated! Shipment created in "Pending" status under ${serialNum}. Click "Dispatch" to release cargo.`);
  };

  // Get stock level for an item in a warehouse safely
  const getStockLevel = (itemId: string, warehouseId: string) => {
    return stockLevels.find(sl => sl.itemId === itemId && sl.warehouseId === warehouseId)?.quantity || 0;
  };

  // Filter transfers ledger list
  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      const matchesSearch = inventory.find(i => i.id === t.itemId)?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            inventory.find(i => i.id === t.itemId)?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSource = filterSourceWh === 'all' || t.sourceWarehouseId === filterSourceWh;
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;

      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [transfers, inventory, searchQuery, filterSourceWh, filterStatus]);

  // Aggregate stats
  const transferStats = useMemo(() => {
    const transitCount = transfers.filter(t => t.status === 'transit').length;
    const pendingCount = transfers.filter(t => t.status === 'pending').length;
    const completedCount = transfers.filter(t => t.status === 'received').length;

    // Calculate total capital transit estimation
    const transitValue = transfers.filter(t => t.status === 'transit').reduce((sum, t) => {
      let defaultCost = 100;
      if (t.itemId === '1') defaultCost = 135;
      else if (t.itemId === '2') defaultCost = 55;
      else if (t.itemId === '3') defaultCost = 8;
      else if (t.itemId === '4') defaultCost = 45;
      else if (t.itemId === '5') defaultCost = 180;
      else if (t.itemId === '6') defaultCost = 3;

      return sum + (t.quantity * defaultCost);
    }, 0);

    return {
      transitCount,
      pendingCount,
      completedCount,
      transitValue
    };
  }, [transfers]);

  // Matrix item view with searchable filters
  const matrixItems = useMemo(() => {
    return inventory.filter(item => {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [inventory, searchQuery]);

  // Chart data: stock level by warehouse
  const chartWarehouseStockData = useMemo(() => {
    return warehouses.map(wh => {
      const whTotalStock = stockLevels
        .filter(sl => sl.warehouseId === wh.id)
        .reduce((sum, sl) => sum + sl.quantity, 0);

      // Value estimation
      const whValue = stockLevels
        .filter(sl => sl.warehouseId === wh.id)
        .reduce((sum, sl) => {
          let defaultCost = 100;
          if (sl.itemId === '1') defaultCost = 135;
          else if (sl.itemId === '2') defaultCost = 55;
          else if (sl.itemId === '3') defaultCost = 8;
          else if (sl.itemId === '4') defaultCost = 45;
          else if (sl.itemId === '5') defaultCost = 180;
          else if (sl.itemId === '6') defaultCost = 3;
          return sum + (sl.quantity * defaultCost);
        }, 0);

      return {
        name: wh.name,
        'Stock Count': whTotalStock,
        'Asset Value (₹)': whValue
      };
    });
  }, [warehouses, stockLevels]);

  return (
    <div className="space-y-6 text-[#1A1A1A]">
      {/* Informative Status Notification Area */}
      <div className="bg-[#EEEFFB] border border-indigo-200 p-4 rounded-3xl flex items-start gap-3 shadow-xs">
        <Globe2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed">
          <span className="font-bold">MULTI-BRANCH SYNCHRONIZATION HUB:</span> Manage individual stock counts per warehouse dynamically, issue audit checks, and initialize secure inter-branch physical stock transfers. Monitor transit timelines and establish instant central ERP ledger reconciliation.
        </div>
      </div>

      {/* Primary tab switcher */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-gray-200 rounded-3xl p-4 gap-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dashboard:</span>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
            <button 
              onClick={() => setActiveSubTab('transfers')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${activeSubTab === 'transfers' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Truck className="w-3.5 h-3.5" /> Transfer Logistics
            </button>
            <button 
              onClick={() => setActiveSubTab('matrix')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${activeSubTab === 'matrix' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Layers className="w-3.5 h-3.5" /> Stock Distribution Matrix
            </button>
            <button 
              onClick={() => setActiveSubTab('sync')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${activeSubTab === 'sync' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Cloud Branch Sync Status
            </button>
          </div>
        </div>

        {/* Sync Controls or Search Bar */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search SKU, name, airway bill..."
              className="pl-9 h-9 rounded-2xl border-slate-200 text-xs w-full"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <Button 
            onClick={handlePerformSyncAll}
            disabled={syncingAll}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-3.5 shadow-sm"
          >
            <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${syncingAll ? 'animate-spin' : ''}`} /> Sync Nodes
          </Button>
        </div>
      </div>

      {/* LOGISTICS & TRANSFER TAB */}
      {activeSubTab === 'transfers' && (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Card className="shadow-xs border-gray-200 bg-white">
              <CardContent className="pt-5 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">In-Transit Shipments</p>
                <h3 className="text-3xl font-black text-amber-500">{transferStats.transitCount} <span className="text-xs font-normal text-slate-500">In route</span></h3>
                <p className="text-[10px] text-gray-500 font-medium">Under active logistics dispatch</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-gray-200 bg-white">
              <CardContent className="pt-5 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Dispatch Approval</p>
                <h3 className="text-3xl font-black text-rose-500">{transferStats.pendingCount} <span className="text-xs font-normal text-slate-500">Unapproved</span></h3>
                <p className="text-[10px] text-indigo-600 font-bold font-sans">Awaiting picklist dispatch</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-gray-200 bg-white">
              <CardContent className="pt-5 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed Receipts This Month</p>
                <h3 className="text-3xl font-black text-emerald-600">{transferStats.completedCount} <span className="text-xs font-normal text-slate-500">Orders</span></h3>
                <p className="text-[10px] text-emerald-500 font-semibold uppercase">Ledger successfully balanced</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-gray-200 bg-white">
              <CardContent className="pt-5 space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-sans">Total Assets In Transit</p>
                <h3 className="text-3xl font-black text-slate-800">₹{transferStats.transitValue.toLocaleString('en-IN')}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <TrendingUp size={12} className="text-indigo-600" />
                  <span className="text-[10px] text-indigo-600 font-bold">Consolidated regional inventory value</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-3 bg-white border border-gray-200 p-4 rounded-3xl shadow-xs">
            <div className="flex flex-wrap gap-2">
              <select
                className="text-xs border border-slate-200 rounded-xl bg-white font-bold px-3 py-1.5 text-slate-600 cursor-pointer h-9"
                value={filterSourceWh}
                onChange={e => setFilterSourceWh(e.target.value)}
              >
                <option value="all">All Source Branches</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>

              <select
                className="text-xs border border-slate-200 rounded-xl bg-white font-bold px-3 py-1.5 text-slate-600 cursor-pointer h-9"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Picklist</option>
                <option value="transit">In Transit</option>
                <option value="received">Received / Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Dialog Trigger to dispatch new transfer */}
            <Dialog open={openTransferDialog} onOpenChange={setOpenTransferDialog}>
              <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs py-1.5 px-3 h-9 shadow-sm" />}>
                <Plus size={16} className="mr-1.5" /> Create Stock Transfer
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white">
                <form onSubmit={handleTransferSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-slate-800 text-sm font-black uppercase tracking-wide flex items-center gap-2">
                      <ArrowLeftRight className="w-5 h-5 text-indigo-600" /> New Stock Transfer Order
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Transfer physical raw materials or accessories securely between warehouses. Stocks will be deducted from the origin branch and posted to transit log.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4 text-xs">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Select Item to Move</Label>
                      <select 
                        className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
                        value={newTransfer.itemId}
                        onChange={e => setNewTransfer({ ...newTransfer, itemId: e.target.value })}
                        required
                      >
                        <option value="">-- Choose Inventory Item --</option>
                        {inventory.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.sku}) | Total Hand: {item.currentStock} {item.unit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-700">Source Branch / Depot</Label>
                        <select 
                          className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                          value={newTransfer.sourceWarehouseId}
                          onChange={e => setNewTransfer({ ...newTransfer, sourceWarehouseId: e.target.value })}
                          required
                        >
                          <option value="">-- Select Source --</option>
                          {warehouses.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.location})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-700">Dest Branch / Depot</Label>
                        <select 
                          className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                          value={newTransfer.destWarehouseId}
                          onChange={e => setNewTransfer({ ...newTransfer, destWarehouseId: e.target.value })}
                          required
                        >
                          <option value="">-- Select Destination --</option>
                          {warehouses.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.location})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-700">Transfer Quantity</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            className="h-9 rounded-xl border-slate-200 text-xs font-bold"
                            placeholder="Qty to ship"
                            value={newTransfer.quantity}
                            onChange={e => setNewTransfer({ ...newTransfer, quantity: e.target.value })}
                            required
                          />
                          {newTransfer.itemId && newTransfer.sourceWarehouseId && (
                            <div className="absolute right-3 top-2.5 text-[9px] text-zinc-500 font-bold">
                              Available: {getStockLevel(newTransfer.itemId, newTransfer.sourceWarehouseId)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-bold text-slate-700">Registered Carrier Provider</Label>
                        <Input 
                          placeholder="E.g., Blue Dart, Delhivery"
                          className="h-9 rounded-xl border-slate-200 text-xs"
                          value={newTransfer.carrier}
                          onChange={e => setNewTransfer({ ...newTransfer, carrier: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Internal Logistic Notes</Label>
                      <Input 
                        placeholder="E.g. Inter-company transfer with waybill credit validation"
                        className="h-9 rounded-xl border-slate-200 text-xs"
                        value={newTransfer.notes}
                        onChange={e => setNewTransfer({ ...newTransfer, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" className="rounded-xl text-xs h-9" onClick={() => setOpenTransferDialog(false)}>Cancel</Button>
                    <Button type="submit" className="bg-indigo-600 text-white rounded-xl text-xs h-9 font-bold px-4">Create order</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Transfers data table */}
          <Card className="shadow-xs border-gray-200 bg-white">
            <CardHeader className="pb-3 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Transport Orders Ledger & Waybills</CardTitle>
                <CardDescription className="text-xs text-slate-500">List of physical shipments requested between Mumbai, Pune, and regional nodes.</CardDescription>
              </div>
              <Badge className="bg-slate-100 text-slate-800 font-mono text-[9px] py-1 border-slate-200 hover:bg-slate-100">
                Found {filteredTransfers.length} Transfers
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Date & Tracking Code</TableHead>
                    <TableHead className="font-bold text-xs">Item Details</TableHead>
                    <TableHead className="font-bold text-xs">Route (Source ➔ Destination)</TableHead>
                    <TableHead className="font-bold text-xs text-center">Shipped Quantity</TableHead>
                    <TableHead className="font-bold text-xs">Logistics & Notes</TableHead>
                    <TableHead className="font-bold text-xs text-center">Transit Status</TableHead>
                    <TableHead className="font-bold text-xs text-right pr-6">Reconcile Controls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                        No inter-branch transfers matches search filters. Choose "Create Stock Transfer" to issue cargo movements.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransfers.map(trf => {
                      const item = inventory.find(i => i.id === trf.itemId);
                      const sourceName = warehouses.find(w => w.id === trf.sourceWarehouseId)?.name || 'Central Origin';
                      const destName = warehouses.find(w => w.id === trf.destWarehouseId)?.name || 'Receiver Depot';

                      return (
                        <TableRow key={trf.id} className="hover:bg-slate-50/20 text-xs">
                          <TableCell className="py-3">
                            <span className="text-[10px] text-slate-400 font-bold block">{trf.date}</span>
                            <span className="font-mono font-extrabold text-[#111827] mt-0.5 block">{trf.trackingNumber}</span>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="font-bold text-slate-800 block">{item?.name || 'Unknown Item'}</span>
                            <span className="text-[10px] text-indigo-600 font-mono font-medium block mt-0.5">{item?.sku || 'N/A'}</span>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                              <span className="text-indigo-600">{sourceName}</span>
                              <span className="text-slate-400 text-[10px]">➔</span>
                              <span className="text-teal-600">{destName}</span>
                            </div>
                            <span className="text-[9px] text-gray-400 block mt-0.5">Vehicle Carrier: {trf.carrier}</span>
                          </TableCell>
                          <TableCell className="text-center font-black text-slate-800 text-sm">
                            {trf.quantity} <span className="text-[10px] font-normal text-slate-400 font-sans">{item?.unit}</span>
                          </TableCell>
                          <TableCell className="py-3 max-w-[150px] truncate italic text-slate-500 text-[11px]">
                            {trf.notes ? `"${trf.notes}"` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-[9px] font-black tracking-wide py-0.5 px-2 rounded-md ${
                              trf.status === 'pending' ? 'bg-zinc-100 text-zinc-800 border-zinc-200' :
                              trf.status === 'transit' ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' :
                              trf.status === 'received' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              'bg-rose-100 text-rose-800 border-rose-200'
                            }`}>
                              {trf.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right pr-6">
                            <div className="flex justify-end gap-1.5">
                              {trf.status === 'pending' && (
                                <>
                                  <Button 
                                    size="xs" 
                                    className="h-7 text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1"
                                    onClick={() => {
                                      onUpdateTransferStatus(trf.id, 'transit');
                                      setSyncLogs(prev => [
                                        `[${new Date().toLocaleTimeString()}] 🚚 Dispatched cargo truck. Transfer ${trf.trackingNumber} status is now IN TRANSIT.`,
                                        ...prev
                                      ]);
                                    }}
                                  >
                                    <Play size={10} /> Dispatch
                                  </Button>
                                  <Button 
                                    size="xs" 
                                    variant="outline" 
                                    className="h-7 text-[10px] text-rose-600 border-rose-200 hover:bg-rose-50 h-7 rounded-lg"
                                    onClick={() => {
                                      onUpdateTransferStatus(trf.id, 'cancelled');
                                      setSyncLogs(prev => [
                                        `[${new Date().toLocaleTimeString()}] ❌ Cancelled pending transfer request ${trf.trackingNumber}.`,
                                        ...prev
                                      ]);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}

                              {trf.status === 'transit' && (
                                <Button 
                                  size="xs" 
                                  className="h-7 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1"
                                  onClick={() => {
                                    onUpdateTransferStatus(trf.id, 'received');
                                    setSyncLogs(prev => [
                                      `[${new Date().toLocaleTimeString()}] ✅ Verified receipt for transfer ${trf.trackingNumber}. Destination stock increased, ledger updated.`,
                                      ...prev
                                    ]);
                                  }}
                                >
                                  <CheckCircle2 size={10} /> Confirm Receipt
                                </Button>
                              )}

                              {trf.status === 'received' && (
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mr-2">
                                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Balanced
                                </span>
                              )}

                              {trf.status === 'cancelled' && (
                                <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1.5 mr-2">
                                  <XSquare className="w-4 h-4 text-rose-400" /> Cancelled
                                </span>
                              )}
                            </div>
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
      )}

      {/* STOCK MATRICE TABLE */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="shadow-xs border-gray-200 lg:col-span-2 bg-white">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Branch Stock Allocation Ledger</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Exact physical balances stacked at each warehouse location. Run comparative reports to balance excess.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Product Info & SKU</TableHead>
                      <TableHead className="font-bold text-xs">Total Unified Stock</TableHead>
                      {warehouses.map(wh => (
                        <TableHead key={wh.id} className="font-bold text-xs text-center text-indigo-700">{wh.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrixItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2 + warehouses.length} className="text-center py-12 text-slate-400 text-xs">
                          No items match search criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      matrixItems.map(item => (
                        <TableRow key={item.id} className="hover:bg-slate-50/20 text-xs">
                          <TableCell className="py-3">
                            <span className="font-bold text-slate-800 block">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono font-medium block mt-0.5">{item.sku}</span>
                          </TableCell>
                          
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5 font-sans font-extrabold text-[#111827]">
                              {item.currentStock} {item.unit}
                              {item.currentStock < item.minStock && (
                                <Badge variant="secondary" className="bg-red-50 text-red-600 text-[8px] font-bold py-0 rounded space-x-1 border-red-100">
                                  CRITICAL
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {warehouses.map(wh => {
                            const whStock = getStockLevel(item.id, wh.id);
                            const percent = item.currentStock > 0 ? (whStock / item.currentStock) * 100 : 0;
                            return (
                              <TableCell key={wh.id} className="text-center py-3 border-l border-slate-50">
                                <span className="font-black text-slate-800 block text-xs">{whStock} <span className="text-[10px] font-normal text-slate-400 font-sans">{item.unit}</span></span>
                                <span className="text-[9px] text-[#2563EB] font-mono mt-0.5 block font-bold">
                                  {Math.round(percent)}% share
                                </span>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-6 lg:col-span-1">
              {/* Warehouse stock percentage chart */}
              <Card className="shadow-xs border-gray-200 bg-white">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest">Depot Volumes & Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-60 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartWarehouseStockData} margin={{ left: -10, right: 5, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" style={{ fontSize: '9px', fontWeight: 'bold' }} stroke="#94A3B8" />
                        <YAxis tickLine={false} style={{ fontSize: '9px' }} stroke="#94A3B8" />
                        <Tooltip contentStyle={{ border: '1px solid #E2E8F0', padding: '8px', borderRadius: '8px', fontSize: '10px' }} />
                        <Bar dataKey="Stock Count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Redistribution guidelines */}
              <Card className="shadow-xs border-indigo-100 bg-indigo-50/25 border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-700" /> Redistribution Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-indigo-950 space-y-3 leading-relaxed">
                  <p>
                    <span className="font-black">Excess Stock balancing:</span> If Mumbai inventory is above 80% on master fibers, consider a stock transfer of 20% to Pune Secondary depot to minimize lead times on apparel assembly lines.
                  </p>
                  <p>
                    <span className="font-black">Freight Consolidated Rule:</span> Set transporters to shipping twice weekly to save logistic surcharge fee matrix. Use internal airway tracking numbers on invoices.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* CLOUD MULTI-BRANCH SYNC TAB */}
      {activeSubTab === 'sync' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: Branch online monitoring */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center bg-white border border-gray-210 p-4 rounded-3xl shadow-xs">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Connected Regional Node Registries</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Physical regional factories, branches, and retail depots currently coupled to central ERP databases.</p>
                </div>

                <Dialog open={openNewBranchDialog} onOpenChange={setOpenNewBranchDialog}>
                  <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs py-1.5 px-3 h-8 shadow-xs" />}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Register Regional Node
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-white">
                    <form onSubmit={handleCreateBranch}>
                      <DialogHeader>
                        <DialogTitle className="text-slate-800 text-sm font-black uppercase tracking-wide flex items-center gap-1.5">
                          <Building2 className="w-5 h-5 text-indigo-600" /> Register Regional Branch Node
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 font-sans">
                          Establish a secure regional node configuration. A cloud sync ledger is provisioned automatically with independent safe stock quantities.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4 text-xs">
                        <div className="space-y-1.5">
                          <Label className="font-bold text-slate-700">Branch Name</Label>
                          <Input 
                            placeholder="E.g., North Regional Depot, New Delhi Hub" 
                            className="h-9 rounded-xl border-slate-200 text-xs text-slate-800 font-bold"
                            value={newBranchForm.name}
                            onChange={e => setNewBranchForm({ ...newBranchForm, name: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="font-bold text-slate-700">Hub Location / Zone</Label>
                          <Input 
                            placeholder="E.g., New Delhi NCR" 
                            className="h-9 rounded-xl border-slate-200 text-xs"
                            value={newBranchForm.location}
                            onChange={e => setNewBranchForm({ ...newBranchForm, location: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl h-9" onClick={() => setOpenNewBranchDialog(false)}>Cancel</Button>
                        <Button type="submit" className="bg-indigo-600 text-white rounded-xl h-9">Create Connection</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {warehouses.map(wh => {
                  const statusObj = syncStatuses.find(s => s.warehouseId === wh.id) || {
                    warehouseId: wh.id,
                    lastSyncedAt: new Date().toLocaleDateString(),
                    syncStatus: 'synced',
                    unresolvedChangesCount: 0,
                    latencyMs: 42
                  };

                  return (
                    <Card key={wh.id} className="shadow-xs border-gray-200 bg-white relative overflow-hidden">
                      {statusObj.syncStatus === 'synced' && (
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
                      )}
                      {statusObj.syncStatus === 'syncing' && (
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500 animate-pulse" />
                      )}
                      {statusObj.syncStatus === 'pending_sync' && (
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-500" />
                      )}

                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-sm font-black text-slate-800">{wh.name}</CardTitle>
                            <CardDescription className="text-[11px] flex items-center gap-1 mt-0.5">
                              <MapPin className="text-zinc-500 w-3 h-3" /> {wh.location}
                            </CardDescription>
                          </div>
                          
                          <Badge className={`text-[9px] font-black tracking-wider py-0.5 px-2 rounded-md ${
                            statusObj.syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            statusObj.syncStatus === 'syncing' ? 'bg-indigo-50 text-indigo-800 border-indigo-200 animate-pulse' :
                            'bg-yellow-50 text-yellow-800 border-yellow-200'
                          }`}>
                            {statusObj.syncStatus.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-2 text-xs space-y-3">
                        <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-500">
                          <div className="flex justify-between">
                            <span>Connection Health:</span>
                            <span className="font-bold text-emerald-600 flex items-center gap-1">
                              ● ACTIVE (ONLINE)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sync Latency:</span>
                            <span className="font-bold text-slate-700">{statusObj.latencyMs}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Unsynced Ledger:</span>
                            <span className={`font-bold ${statusObj.unresolvedChangesCount > 0 ? 'text-amber-500' : 'text-slate-600'}`}>{statusObj.unresolvedChangesCount} pending write-offs</span>
                          </div>
                          <div className="flex justify-between">
                            <span>System Parity Key:</span>
                            <span className="font-bold text-slate-400">HASH-WMS-{wh.id.toUpperCase()}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1 text-[11px]">
                          <span className="text-slate-400 font-sans font-medium">Last Sync: {statusObj.lastSyncedAt}</span>
                          <Button 
                            variant="outline" 
                            size="xs" 
                            className="h-7 text-[10px] font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => handlePerformSyncSingle(wh.id, wh.name)}
                          >
                            <RefreshCcw className="w-3 h-3 mr-1" /> Recontile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Right column: Terminal Sync trace logs */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-xs border-gray-200 bg-white">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-600" /> ERP Central Sync Trace Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="bg-zinc-950 rounded-2xl p-4 font-mono text-[10px] text-zinc-300 space-y-2 h-72 overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700">
                    {syncLogs.map((log, index) => (
                      <div key={index} className="border-b border-zinc-900/50 pb-1 last:border-0 last:pb-0">
                        {log}
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2.5 font-sans leading-relaxed flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 animate-spin" /> Live gateway trace logging connected via secure regional RPC.
                  </div>
                </CardContent>
              </Card>

              {/* Secure cloud parity card details */}
              <Card className="shadow-xs border-amber-200 bg-amber-50/20 border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <AlertTriangle className="w-4 h-4 text-amber-700 animate-bounce" /> Multi-site Failover Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-amber-950 space-y-2.5 leading-relaxed">
                  <p>
                    <span className="font-bold">Automated Re-queue:</span> If an inter-depot node suffers temporary broadband disconnects, transfers remain stored in local IndexedDB queues automatically.
                  </p>
                  <p>
                    <span className="font-bold">Sync Resolution Order:</span> Central headquarter rules prevail in timestamps collisions. Branch counts are reconciled directly with stocktaking audits.
                  </p>
                </CardContent>
              </Card>
            </div>
            
          </div>
        </div>
      )}
      
    </div>
  );
}

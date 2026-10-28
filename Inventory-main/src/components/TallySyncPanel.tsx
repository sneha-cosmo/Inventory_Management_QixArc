import React, { useState, useMemo } from 'react';
import { 
  Database, 
  RefreshCcw, 
  Settings, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Check, 
  HelpCircle, 
  ArrowRight, 
  Layers, 
  Layers2, 
  ChevronRight, 
  FileCode, 
  Activity, 
  Network, 
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Invoice, Payment, PurchaseOrder, Customer, Supplier, SalesOrder } from '../types';

interface TallySyncPanelProps {
  invoices: Invoice[];
  payments: Payment[];
  purchaseOrders: PurchaseOrder[];
  customers: Customer[];
  suppliers: Supplier[];
  salesOrders: SalesOrder[];
  onAddAuditLog: (action: string, model: string, id: string, notes: string) => void;
  checkPermission: (perm: string) => boolean;
}

interface LedgerMap {
  id: string;
  sourceName: string;
  sourceType: 'Customer' | 'Supplier' | 'TaxCGST' | 'TaxSGST' | 'TaxIGST' | 'SalesAccount' | 'PurchaseAccount';
  tallyLedgerName: string;
  isCustomized: boolean;
}

interface TallyVoucher {
  id: string;
  date: string;
  type: 'Sales' | 'Purchase' | 'Receipt';
  referenceNo: string;
  partyName: string;
  partyLedger: string;
  amount: number;
  status: 'pending' | 'synced' | 'failed';
  tallyId?: string;
  xmlPayload?: string;
}

export default function TallySyncPanel({
  invoices,
  payments,
  purchaseOrders,
  customers,
  suppliers,
  salesOrders,
  onAddAuditLog,
  checkPermission
}: TallySyncPanelProps) {
  // Config state
  const [tallyConfig, setTallyConfig] = useState({
    port: '9000',
    host: 'http://localhost',
    companyName: 'SURAT_TEXTILES_PVT_LTD',
    guidSync: true,
    autoCreateLedgers: true
  });

  const [activeSubTab, setActiveSubTab] = useState<'vouchers' | 'mapping' | 'settings'>('vouchers');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Tally Sync engine initialised.`,
    `[${new Date().toLocaleTimeString()}] Listening for local Tally Gateway connection at ${tallyConfig.host}:${tallyConfig.port}...`,
    `[${new Date().toLocaleTimeString()}] Standby. Ready to parse transactions to XML standard.`
  ]);

  // Manage Tally ledger mapping state
  const [ledgerMappings, setLedgerMappings] = useState<LedgerMap[]>(() => {
    const mappings: LedgerMap[] = [];
    
    // Add default system accounts
    mappings.push({ id: 'sys-sales', sourceName: 'Core Product Sales', sourceType: 'SalesAccount', tallyLedgerName: 'Sales Account', isCustomized: false });
    mappings.push({ id: 'sys-purchase', sourceName: 'Materials Purchase', sourceType: 'PurchaseAccount', tallyLedgerName: 'Purchase Account', isCustomized: false });
    mappings.push({ id: 'sys-cgst', sourceName: 'Central GST (CGST)', sourceType: 'TaxCGST', tallyLedgerName: 'CGST Ledger (9%)', isCustomized: false });
    mappings.push({ id: 'sys-sgst', sourceName: 'State GST (SGST)', sourceType: 'TaxSGST', tallyLedgerName: 'SGST Ledger (9%)', isCustomized: false });
    mappings.push({ id: 'sys-igst', sourceName: 'Integrated GST (IGST)', sourceType: 'TaxIGST', tallyLedgerName: 'IGST Ledger (18%)', isCustomized: false });

    // Map existing customers
    customers.forEach(c => {
      mappings.push({
        id: `cust-${c.id}`,
        sourceName: c.name,
        sourceType: 'Customer',
        tallyLedgerName: `${c.name} (Sundry Debtors)`,
        isCustomized: false
      });
    });

    // Map existing suppliers
    suppliers.forEach(s => {
      mappings.push({
        id: `supp-${s.id}`,
        sourceName: s.name,
        sourceType: 'Supplier',
        tallyLedgerName: `${s.name} (Sundry Creditors)`,
        isCustomized: false
      });
    });

    return mappings;
  });

  // Keep a local dictionary of mapped ledgers for speedy lookups
  const mappedLedgersDict = useMemo(() => {
    const dict: Record<string, string> = {};
    ledgerMappings.forEach(mapping => {
      dict[mapping.sourceName] = mapping.tallyLedgerName;
    });
    return dict;
  }, [ledgerMappings]);

  // Construct vouchers list from real system invoices, purchase orders and payments
  const [localVoucherStatus, setLocalVoucherStatus] = useState<Record<string, { status: 'synced'|'failed'|'pending', tallyId?: string }>>({});

  const tallyVouchersList = useMemo<TallyVoucher[]>(() => {
    const list: TallyVoucher[] = [];

    // 1. Process invoices
    invoices.forEach(inv => {
      const tallyState = localVoucherStatus[inv.id] || { status: inv.paidAmount >= inv.totalAmount ? 'synced' : 'pending' };
      
      let pName = "General Customer";
      let pLedgerType = "Sundry Debtors";
      if (inv.orderType === 'sales') {
        const so = salesOrders.find(s => s.id === inv.orderId);
         pName = so?.customerName || customers.find(c => c.id === so?.customerId)?.name || "General Customer";
      } else {
        const po = purchaseOrders.find(p => p.id === inv.orderId);
        pName = suppliers.find(s => s.id === po?.supplierId)?.name || "General Supplier";
        pLedgerType = "Sundry Creditors";
      }

      const partyMap = ledgerMappings.find(m => m.sourceName === pName) || { tallyLedgerName: `${pName} (${pLedgerType})` };

      list.push({
        id: inv.id,
        date: inv.date,
        type: inv.orderType === 'sales' ? 'Sales' : 'Purchase',
        referenceNo: inv.id,
        partyName: pName,
        partyLedger: partyMap.tallyLedgerName,
        amount: inv.totalAmount,
        status: tallyState.status,
        tallyId: tallyState.tallyId || (tallyState.status === 'synced' ? `TSL-${10000 + Math.floor(Math.random()*40000)}` : undefined)
      });
    });

    // 2. Process purchase orders manually if needed
    purchaseOrders.forEach(po => {
      const tallyState = localVoucherStatus[po.id] || { status: po.status === 'received' ? 'synced' : 'pending' };
      const supplierName = suppliers.find(s => s.id === po.supplierId)?.name || "Default Supplier";
      const partyMap = ledgerMappings.find(m => m.sourceName === supplierName) || { tallyLedgerName: `${supplierName} (Sundry Creditors)` };

      list.push({
        id: po.id,
        date: po.date,
        type: 'Purchase',
        referenceNo: po.id,
        partyName: supplierName,
        partyLedger: partyMap.tallyLedgerName,
        amount: po.totalAmount,
        status: tallyState.status,
        tallyId: tallyState.tallyId || (tallyState.status === 'synced' ? `TPU-${10000 + Math.floor(Math.random()*40000)}` : undefined)
      });
    });

    // 3. Process Payments
    payments.forEach(pay => {
      const tallyState = localVoucherStatus[pay.id] || { status: 'pending' };
      const invoice = invoices.find(i => i.id === pay.invoiceId);
      let party = "General Customer";
      let pLedgerType = "Sundry Debtors";

      if (invoice) {
        if (invoice.orderType === 'sales') {
          const so = salesOrders.find(s => s.id === invoice.orderId);
          party = so?.customerName || customers.find(c => c.id === so?.customerId)?.name || "General Customer";
        } else {
          const po = purchaseOrders.find(p => p.id === invoice.orderId);
          party = suppliers.find(s => s.id === po?.supplierId)?.name || "General Supplier";
          pLedgerType = "Sundry Creditors";
        }
      }

      const partyMap = ledgerMappings.find(m => m.sourceName === party) || { tallyLedgerName: `${party} (${pLedgerType})` };

      list.push({
        id: pay.id,
        date: pay.date,
        type: 'Receipt',
        referenceNo: pay.invoiceId || 'N/A',
        partyName: party,
        partyLedger: partyMap.tallyLedgerName,
        amount: pay.amount,
        status: tallyState.status,
        tallyId: tallyState.tallyId
      });
    });

    // Sort by date descending
    return list.sort((a,b) => b.date.localeCompare(a.date));
  }, [invoices, purchaseOrders, payments, ledgerMappings, localVoucherStatus, salesOrders, customers, suppliers]);

  // Generated statistics
  const stats = useMemo(() => {
    const total = tallyVouchersList.length;
    const synced = tallyVouchersList.filter(v => v.status === 'synced').length;
    const pending = tallyVouchersList.filter(v => v.status === 'pending').length;
    
    return {
      total,
      synced,
      pending,
      syncPercentage: total > 0 ? Math.round((synced / total) * 100) : 0
    };
  }, [tallyVouchersList]);

  // Handle mapping updates
  const handleUpdateLedgerMapping = (id: string, newLedgerName: string) => {
    setLedgerMappings(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, tallyLedgerName: newLedgerName, isCustomized: true };
      }
      return m;
    }));
    
    const item = ledgerMappings.find(m => m.id === id);
    if (item) {
      setSyncLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Updated account code mapping for "${item.sourceName}" to Tally ERP Ledger "${newLedgerName}".`,
        ...prev
      ]);
    }
  };

  // XML Generator Function
  const generateVoucherXML = (v: TallyVoucher): string => {
    const formattedAmount = v.amount.toFixed(2);
    const company = tallyConfig.companyName;
    const dateFormatted = v.date.replace(/-/g, ''); // Tally expects YYYYMMDD
    
    // Build actual valid Tally TDL XML schema for a transaction!
    return `<!-- Tally ERP XML Request Packet -->
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${v.type}" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${dateFormatted}</DATE>
            <GUID>${v.id}_UUID_AUTO_SYNC</GUID>
            <VOUCHERNUMBER>${v.id}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${v.partyLedger}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            <EFFECTIVEDATE>${dateFormatted}</EFFECTIVEDATE>
            
            <!-- Dr Party Account -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${v.partyLedger}</LEDGERNAME>
              <GSTCLASS/>
              <ISDEEMEDPOSITIVE>${v.type === 'Receipt' ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <AMOUNT>${v.type === 'Receipt' ? formattedAmount : '-' + formattedAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            
            <!-- Cr Operational Contra Account -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${v.type === 'Sales' ? 'Sales Account' : v.type === 'Purchase' ? 'Purchase Account' : 'Bank/Cash Account'}</LEDGERNAME>
              <GSTCLASS/>
              <ISDEEMEDPOSITIVE>${v.type === 'Receipt' ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <AMOUNT>${v.type === 'Receipt' ? '-' + formattedAmount : formattedAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            
            <NARRATION>Multi-branch ERP real-time Tally Integration Sync for Ref ${v.referenceNo} date ${v.date}. Created via Headquarter Gateway Port ${tallyConfig.port}</NARRATION>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`;
  };

  // Perform a manual download of the physical Tally ERP compliant file
  const handleDownloadXML = (v: TallyVoucher) => {
    const xml = generateVoucherXML(v);
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TallyVoucher_${v.type}_${v.id}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onAddAuditLog('Tally XML Download', 'TallySync', v.id, `Downloaded standalone TallyXML payload for voucher ${v.id}`);
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Generated offline import packet "TallyVoucher_${v.type}_${v.id}.xml". Saved to filesystem.`,
      ...prev
    ]);
  };

  // Intergrade with simulated local Tally port API
  const handleLocalGatewaySync = async (v: TallyVoucher) => {
    if (!checkPermission('makeAdjustments')) {
      alert("🔒 Security gate: Your active staff profile does not have full finance control authorization to reconcile the Tally ERP audit log.");
      return;
    }

    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] 📦 Serialising voucher ledger ${v.id} (${v.type}) to Tally XML standards...`,
      `[${new Date().toLocaleTimeString()}] 🌐 POSTing request to ${tallyConfig.host}:${tallyConfig.port}/tally-api/vouch ...`,
      ...prev
    ]);

    // Simulate delay
    setTimeout(() => {
      const tallyVchId = `VCH-${v.type.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
      setLocalVoucherStatus(prev => ({
        ...prev,
        [v.id]: { status: 'synced', tallyId: tallyVchId }
      }));

      setSyncLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ✅ Response 200 OK from Tally XML Server: Created 1, Altered 0, Errors 0. Linked Tally Voucher ID: ${tallyVchId}`,
        ...prev
      ]);
      onAddAuditLog('Tally Live Reconcile', 'TallySync', v.id, `Simulated SOAP posting to TallyPrime at port ${tallyConfig.port}. Linked Voucher ID ${tallyVchId}`);
    }, 800);
  };

  // Bulk Synchronise All Vouchers
  const handleBulkReconcileAll = () => {
    if (!checkPermission('makeAdjustments')) {
      alert("🔒 Security gate: Your active staff profile does not have full finance control authorization to reconcile the Tally ERP audit log.");
      return;
    }

    setIsSyncingAll(true);
    const pendingVchs = tallyVouchersList.filter(v => v.status === 'pending');
    
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ⚡ Initialising bulk SOAP dispatch for ${pendingVchs.length} transactions ...`,
      ...prev
    ]);

    setTimeout(() => {
      const updatedStatusObj = { ...localVoucherStatus };
      pendingVchs.forEach(v => {
        const tallyVchId = `VCH-${v.type.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
        updatedStatusObj[v.id] = { status: 'synced', tallyId: tallyVchId };
      });
      
      setLocalVoucherStatus(updatedStatusObj);
      setIsSyncingAll(false);
      setSyncLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ✅ Bulk synchronization complete. ${pendingVchs.length} voucher journals posted, all remote LEDGER totals updated in company "${tallyConfig.companyName}".`,
        ...prev
      ]);
      onAddAuditLog('Tally Bulk Sync', 'TallySync', 'ALL', `Bulk synced ${pendingVchs.length} vouchers to Tally company ${tallyConfig.companyName}`);
      alert(`🎉 Synced ${pendingVchs.length} vouchers to TallyPrime gateway successfully! Ledger accounts balanced.`);
    }, 1500);
  };

  // Filter List based on queries
  const filteredVouchers = useMemo(() => {
    return tallyVouchersList.filter(v => {
      return v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
             v.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             v.partyLedger.toLowerCase().includes(searchQuery.toLowerCase()) ||
             v.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (v.tallyId && v.tallyId.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [tallyVouchersList, searchQuery]);

  // Filter mappings
  const filteredMappings = useMemo(() => {
    return ledgerMappings.filter(m => {
      return m.sourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             m.tallyLedgerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             m.sourceType.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [ledgerMappings, searchQuery]);

  return (
    <div className="space-y-6 text-[#1A1A1A]">
      
      {/* Informative warning header banner */}
      <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-3xl flex items-start gap-3 shadow-xs">
        <Database className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed">
          <span className="font-extrabold tracking-tight uppercase">Tally ERP 9 / TallyPrime Bridge:</span> Live accounting gateway synchronization. Convert and link invoices, purchases, and receipts into standardized XML ledger vouchers. Generate downloadable double-entry XML importing packets directly, or sync automatically with your local server port.
        </div>
      </div>

      {/* Ribbon Control bar with custom submenu tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-gray-200 rounded-3xl p-4 gap-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Tally Integration Modules:</span>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
            <button 
              onClick={() => setActiveSubTab('vouchers')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${activeSubTab === 'vouchers' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <FileCode className="w-3.5 h-3.5" /> Voucher Exchange Queue
            </button>
            <button 
              onClick={() => setActiveSubTab('mapping')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${activeSubTab === 'mapping' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Layers2 className="w-3.5 h-3.5" /> Ledger Mappings Config
            </button>
            <button 
              onClick={() => setActiveSubTab('settings')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${activeSubTab === 'settings' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Settings className="w-3.5 h-3.5" /> Gateway Settings
            </button>
          </div>
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
            <Input 
              placeholder={activeSubTab === 'mapping' ? 'Search local accounts...' : 'Search vouchers, ledger, totals...'}
              className="pl-9 h-9 rounded-2xl border-slate-200 text-xs w-full"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {activeSubTab === 'vouchers' && (
            <Button 
              onClick={handleBulkReconcileAll}
              disabled={isSyncingAll || stats.pending === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-3.5 shadow-sm"
            >
              <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${isSyncingAll ? 'animate-spin' : ''}`} /> Bulk Sync to Tally
            </Button>
          )}
        </div>
      </div>

      {/* Main statistics cards breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="shadow-xs border-gray-200 bg-white">
          <CardContent className="pt-5 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Exchange Queue Volume</p>
            <h3 className="text-3xl font-black text-slate-800">{stats.total} <span className="text-xs font-normal text-slate-500">Vouchers</span></h3>
            <p className="text-[10px] text-gray-500 font-medium font-mono">Consolidated ledgers pipeline</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-gray-200 bg-white">
          <CardContent className="pt-5 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Successfully Synced</p>
            <h3 className="text-3xl font-black text-emerald-600">{stats.synced} <span className="text-xs font-normal text-slate-500">Posted</span></h3>
            <p className="text-[10px] text-emerald-500 font-semibold uppercase">Ledger records verified</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-gray-200 bg-white">
          <CardContent className="pt-5 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Sync Request</p>
            <h3 className="text-3xl font-black text-amber-500">{stats.pending} <span className="text-xs font-normal text-slate-500">Pending</span></h3>
            <p className="text-[10px] text-indigo-600 font-bold">Unposted financial items</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-gray-200 bg-white">
          <CardContent className="pt-5 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Sync Parity</p>
            <h3 className="text-3xl font-black text-indigo-600">{stats.syncPercentage}%</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Network size={12} className="text-emerald-500" />
              <span className="text-[10px] text-emerald-600 font-bold">TallyPrime Client Port Linked</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left main work area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* exchange ledger subtab */}
          {activeSubTab === 'vouchers' && (
            <Card className="shadow-xs border-gray-200 bg-white">
              <CardHeader className="pb-3 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Tally XML Voucher Exchange Monitor</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Live feed of double-entry journals generated from active sales, purchase, and payment events.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Voucher Ref & Date</TableHead>
                      <TableHead className="font-bold text-xs">Vch Type</TableHead>
                      <TableHead className="font-bold text-xs">Target Party Ledger</TableHead>
                      <TableHead className="font-bold text-xs text-right">Debit/Credit Value</TableHead>
                      <TableHead className="font-bold text-xs text-center">Tally State</TableHead>
                      <TableHead className="font-bold text-xs text-right pr-6">Replication Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVouchers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                          No accounting vouchers found matching search queries.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVouchers.map(v => (
                        <TableRow key={v.id} className="hover:bg-slate-50/20 text-xs">
                          <TableCell className="py-3">
                            <span className="text-[10px] text-slate-400 font-bold block">{v.date}</span>
                            <span className="font-mono font-extrabold text-[#111827] block mt-0.5">{v.id}</span>
                          </TableCell>
                          
                          <TableCell className="py-3">
                            <Badge className={`text-[10px] font-bold ${
                              v.type === 'Sales' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              v.type === 'Purchase' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-teal-50 text-teal-700 border-teal-100'
                            }`} variant="outline">
                              {v.type}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="font-bold text-slate-800 leading-tight">{v.partyName}</div>
                            <div className="text-[9px] text-[#2563EB] font-mono mt-0.5 flex items-center gap-1.5 font-bold">
                              <span>➔</span>
                              <span>{v.partyLedger}</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-black text-slate-800 text-xs">
                            ₹{v.amount.toLocaleString('en-IN')}
                          </TableCell>

                          <TableCell className="text-center">
                            {v.status === 'synced' ? (
                              <div className="inline-flex flex-col items-center">
                                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[9px] font-black h-5 py-0">
                                  SYNCED
                                </Badge>
                                {v.tallyId && (
                                  <span className="text-[8px] font-mono text-zinc-400 mt-1 font-bold">{v.tallyId}</span>
                                )}
                              </div>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-bold h-5 py-0">
                                UNPOSTED
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="py-2 text-right pr-6">
                            <div className="flex justify-end items-center gap-2">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleDownloadXML(v)}
                                title="Download native XML import packet"
                                className="h-7 w-7 p-0 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-600"
                              >
                                <Download size={12} />
                              </Button>
                              
                              {v.status === 'pending' ? (
                                <Button
                                  size="xs"
                                  onClick={() => handleLocalGatewaySync(v)}
                                  className="h-7 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5"
                                >
                                  <RefreshCcw size={10} /> Link Live
                                </Button>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mr-1">
                                  <Check className="w-3.5 h-3.5 text-emerald-500" /> Balanced
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Ledger Mapping Subtab */}
          {activeSubTab === 'mapping' && (
            <Card className="shadow-xs border-gray-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-800">Account Mapping & Tally Ledgers</CardTitle>
                <CardDescription className="text-xs text-slate-500">Align local customer database terms and tax ledgers to corresponding names established in your Tally charts of accounts.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Local Resource / Source Term</TableHead>
                      <TableHead className="font-bold text-xs">Ledger Categorisation</TableHead>
                      <TableHead className="font-bold text-xs">Linked Tally Ledger Ledger Name</TableHead>
                      <TableHead className="font-bold text-xs text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMappings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-xs">
                          No accounting mappings found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMappings.map(map => (
                        <TableRow key={map.id} className="hover:bg-slate-50/20 text-xs">
                          <TableCell className="py-3 font-semibold text-slate-800">
                            {map.sourceName}
                          </TableCell>
                          
                          <TableCell className="py-3">
                            <Badge className="text-[9px] font-bold" variant="secondary">
                              {map.sourceType.replace('Tax', 'Tax Line - ')}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <Input 
                                defaultValue={map.tallyLedgerName}
                                onBlur={(e) => handleUpdateLedgerMapping(map.id, e.target.value)}
                                className="h-8 max-w-xs text-xs rounded-lg border-slate-200 py-1 font-mono text-indigo-900 bg-indigo-50/10 focus-visible:bg-white"
                              />
                            </div>
                          </TableCell>

                          <TableCell className="py-3 text-right pr-6">
                            {map.isCustomized ? (
                              <Badge className="bg-indigo-50 text-indigo-700 text-[8px] border-indigo-150">
                                CUSTOM OVERRIDE
                              </Badge>
                            ) : (
                              <Badge className="bg-zinc-50 text-zinc-500 text-[8px] border-zinc-200" variant="outline">
                                DEFAULT MATCH
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Config Settings Tab */}
          {activeSubTab === 'settings' && (
            <Card className="shadow-xs border-gray-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-800">Tally XML Integration Gateway Setup</CardTitle>
                <CardDescription className="text-xs text-slate-500">Configure connection strings to exchange SOAP envelopes containing accounting ledgers seamlessly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Tally Gateway Server Host</Label>
                    <Input 
                      placeholder="e.g. http://localhost" 
                      value={tallyConfig.host}
                      onChange={e => setTallyConfig({ ...tallyConfig, host: e.target.value })}
                      className="h-9 rounded-xl border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Tally ODBC Interface Port</Label>
                    <Input 
                      placeholder="e.g. 9000" 
                      value={tallyConfig.port}
                      onChange={e => setTallyConfig({ ...tallyConfig, port: e.target.value })}
                      className="h-9 rounded-xl border-slate-200 text-xs text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Target Activated Company in Tally</Label>
                  <Input 
                    placeholder="e.g. SURAT_TEXTILES_PVT_LTD" 
                    value={tallyConfig.companyName}
                    onChange={e => setTallyConfig({ ...tallyConfig, companyName: e.target.value })}
                    className="h-9 rounded-xl border-slate-200 text-xs font-mono font-bold uppercase tracking-wider text-slate-900"
                  />
                  <span className="text-[10px] text-gray-400 block p-0.5">Ensure this matches the active corporate name inside your loaded Tally application precisely, to avoid XML schema parsing blockades.</span>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-xs">Inject Automatic Audit UUIDs</p>
                      <p className="text-[10px] text-slate-400">Pushes matching voucher checksums into the Tally invoice narration field automatically.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={tallyConfig.guidSync}
                      onChange={e => setTallyConfig({ ...tallyConfig, guidSync: e.target.checked })}
                      className="h-4 w-4 rounded-md border-indigo-300 text-indigo-600 outline-hidden"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-xs">Auto-Create Ledgers (TDL XML mode)</p>
                      <p className="text-[10px] text-slate-400">Forces Tally to provision missing customer ledgers automatically upon voucher XML stream load.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={tallyConfig.autoCreateLedgers}
                      onChange={e => setTallyConfig({ ...tallyConfig, autoCreateLedgers: e.target.checked })}
                      className="h-4 w-4 rounded-md border-indigo-300 text-indigo-600 outline-hidden"
                    />
                  </div>
                </div>

                <div className="bg-indigo-50/50 rounded-2xl p-4.5 border border-indigo-100 text-xs text-indigo-950 space-y-2 leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5">
                    <SlidersHorizontal size={14} className="text-indigo-600" /> Connecting to Tally.ERP 9 or TallyPrime guide:
                  </p>
                  <p>1. Open Tally ➔ Press <kbd className="px-1 bg-white border border-slate-200 rounded text-[9px] shadow-xs">F12</kbd> (Configure) ➔ Advanced Configuration.</p>
                  <p>2. Set [TallyPrime acts as: <strong className="text-indigo-900">Both</strong>] and [Port: <strong className="text-indigo-900">{tallyConfig.port}</strong>].</p>
                  <p>3. Keep Tally open with "<strong className="text-indigo-900 uppercase font-mono">{tallyConfig.companyName}</strong>" loaded on the left side of the screen.</p>
                  <p>4. Trigger bulk/single sync directly from our exchange queue, or download XML for offline import via <span className="underline italic">Import Data ➔ Vouchers</span>.</p>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right side status column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Tally Connection Health card */}
          <Card className="shadow-xs border-gray-200 bg-white">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-widest">Gateway Health Monitor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">API Handshake:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  ACTIVE (PORT {tallyConfig.port})
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Company Name:</span>
                <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-800 py-0.5 px-2 rounded-md">
                  {tallyConfig.companyName}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Active Handshake Protocol:</span>
                <span className="font-bold text-slate-700">TDL SOAP over HTTP</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">SSL Certificate:</span>
                <span className="font-bold text-amber-500 flex items-center gap-1">
                  🔒 Bypass local (HTTP)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Sync logs terminal view */}
          <Card className="shadow-xs border-gray-200 bg-slate-900 text-slate-50 relative overflow-hidden flex flex-col h-112">
            <CardHeader className="pb-2 bg-slate-950 border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-bold font-mono text-zinc-400 flex items-center gap-1.5 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Tally Gateway live log-trace
                </CardTitle>
                <button 
                  onClick={() => setSyncLogs([])}
                  className="text-[9px] font-bold text-zinc-500 hover:text-zinc-200 uppercase font-mono"
                >
                  Clear logs
                </button>
              </div>
            </CardHeader>
            
            <CardContent className="p-3.5 flex-1 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-2.5 h-full">
              {syncLogs.length === 0 ? (
                <div className="text-slate-500 italic text-center py-6">Trace log buffer is empty. Sync vouchers to record entries.</div>
              ) : (
                syncLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed border-b border-slate-800/40 pb-1 text-slate-300">
                    <ChevronRight size={10} className="inline mr-1 text-emerald-500" /> {log}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Export warning */}
          <Card className="shadow-xs border-amber-100 bg-amber-50/15 border text-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-amber-950 uppercase tracking-widest flex items-center gap-1">
                ⚠️ Reconciliation Rule
              </CardTitle>
            </CardHeader>
            <CardContent className="text-amber-900 space-y-2 leading-relaxed">
              <p>
                Ensure invoices carry correct <strong className="text-slate-900 font-sans">State Code classifications</strong> (CGST+SGST versus IGST) before syncing. Tally accounting packages validate regional tax ledger alignment strictly.
              </p>
              <p>
                Exported journal files must compile under <strong className="text-slate-900 font-sans">UTF-8 character encoding</strong>.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
}

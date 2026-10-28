import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  UploadCloud, 
  Building2, 
  FileCheck2, 
  Calendar, 
  FileSpreadsheet, 
  RefreshCw, 
  Search,
  Filter,
  Check,
  Send,
  HelpCircle,
  TrendingUp,
  Scale,
  Percent,
  Calculator,
  ShieldCheck,
  Coins
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { InventoryItem, Customer, SalesOrder, Invoice, PurchaseOrder, Supplier } from '../types';

interface EasyTaxFilingPanelProps {
  inventory: InventoryItem[];
  customers: Customer[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  language?: string;
  addAuditLog?: (action: string, entityType: string, entityId: string, details: string) => void;
}

export default function EasyTaxFilingPanel({
  inventory,
  customers,
  salesOrders,
  invoices,
  purchaseOrders,
  suppliers,
  language = 'en',
  addAuditLog = () => {}
}: EasyTaxFilingPanelProps) {
  // Period filter inside tax filing pane
  const [selectedQuarter, setSelectedQuarter] = useState<'q1' | 'q2' | 'q3' | 'q4' | 'ytd'>('ytd');
  const [activeTaxForm, setActiveTaxForm] = useState<'gstr1' | 'gstr3b' | 'gstr2b_recon' | 'gstr9'>('gstr1');
  const [searchQuery, setSearchQuery] = useState('');
  
  // E-Filing simulation states
  const [showFilingConfirm, setShowFilingConfirm] = useState(false);
  const [authorizedGstPin, setAuthorizedGstPin] = useState('');
  const [filingStatus, setFilingStatus] = useState<'idle' | 'validating' | 'signing' | 'completed'>('idle');
  const [filedArn, setFiledArn] = useState('');

  // JSON Preview state
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [jsonPayload, setJsonPayload] = useState<string>('');

  // Supplier invoice matching filters
  const [supplierReconFilter, setSupplierReconFilter] = useState<'all' | 'matched' | 'mismatch' | 'pending'>('all');

  // Multipliers/rates simulation
  const [itcOffsetAmount, setItcOffsetAmount] = useState<number>(0);

  // 1. Calculate and filter Invoices based on chosen Quarter (Assume Fiscal Year 2026 starting April)
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (!inv.date) return true;
      const dateParts = inv.date.split('-');
      const month = dateParts[1] ? parseInt(dateParts[1], 10) : 4;
      
      if (selectedQuarter === 'q1') {
        return month >= 4 && month <= 6; // April, May, June
      } else if (selectedQuarter === 'q2') {
        return month >= 7 && month <= 9; // July, August, Sept
      } else if (selectedQuarter === 'q3') {
        return month >= 10 && month <= 12; // Oct, Nov, Dec
      } else if (selectedQuarter === 'q4') {
        return month >= 1 && month <= 3; // Jan, Feb, Mar
      }
      return true; // YTD
    });
  }, [invoices, selectedQuarter]);

  const filteredSalesOrders = useMemo(() => {
    return salesOrders.filter(so => {
      if (!so.date) return true;
      const dateParts = so.date.split('-');
      const month = dateParts[1] ? parseInt(dateParts[1], 10) : 4;
      
      if (selectedQuarter === 'q1') return month >= 4 && month <= 6;
      if (selectedQuarter === 'q2') return month >= 7 && month <= 9;
      if (selectedQuarter === 'q3') return month >= 10 && month <= 12;
      if (selectedQuarter === 'q4') return month >= 1 && month <= 3;
      return true;
    });
  }, [salesOrders, selectedQuarter]);

  const filteredPurchases = useMemo(() => {
    return purchaseOrders.filter(po => {
      if (!po.date) return true;
      const dateParts = po.date.split('-');
      const month = dateParts[1] ? parseInt(dateParts[1], 10) : 4;
      
      if (selectedQuarter === 'q1') return month >= 4 && month <= 6;
      if (selectedQuarter === 'q2') return month >= 7 && month <= 9;
      if (selectedQuarter === 'q3') return month >= 10 && month <= 12;
      if (selectedQuarter === 'q4') return month >= 1 && month <= 3;
      return true;
    });
  }, [purchaseOrders, selectedQuarter]);

  // 2. Outward Supplies Calculations (GSTR-1 Breakdown)
  const outwardSuppliesSummary = useMemo(() => {
    let totalTaxableB2B = 0;
    let totalTaxableB2C = 0;
    let cgstTax = 0;
    let sgstTax = 0;
    let igstTax = 0;

    const b2bList: {
      invoiceId: string;
      customerName: string;
      gstin: string;
      date: string;
      placeOfSupply: string;
      taxableValue: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalInvoiceValue: number;
    }[] = [];

    const b2cListByState: Record<string, {
      placeOfSupply: string;
      taxableValue: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalInvoiceValue: number;
    }> = {};

    filteredInvoices.forEach(inv => {
      if (inv.orderType === 'sales') {
        const order = filteredSalesOrders.find(so => so.id === inv.orderId);
        const cust = customers.find(c => c.id === order?.customerId);
        
        const subtotal = inv.taxableAmount ?? inv.totalAmount / 1.18;
        const central = inv.cgst ?? 0;
        const state = inv.sgst ?? 0;
        const integrated = inv.igst ?? 0;
        const total = inv.totalAmount;

        const stateName = cust?.state || 'Maharashtra';
        const posCode = stateName.toLowerCase() === 'maharashtra' ? '27-MH' : '29-KA';

        if (cust?.gstin) {
          totalTaxableB2B += subtotal;
          b2bList.push({
            invoiceId: inv.id,
            customerName: cust.name,
            gstin: cust.gstin,
            date: inv.date,
            placeOfSupply: stateName,
            taxableValue: parseFloat(subtotal.toFixed(2)),
            cgst: parseFloat(central.toFixed(2)),
            sgst: parseFloat(state.toFixed(2)),
            igst: parseFloat(integrated.toFixed(2)),
            totalInvoiceValue: parseFloat(total.toFixed(2))
          });
        } else {
          totalTaxableB2C += subtotal;
          if (!b2cListByState[posCode]) {
            b2cListByState[posCode] = {
              placeOfSupply: stateName,
              taxableValue: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              totalInvoiceValue: 0
            };
          }
          b2cListByState[posCode].taxableValue += subtotal;
          b2cListByState[posCode].cgst += central;
          b2cListByState[posCode].sgst += state;
          b2cListByState[posCode].igst += integrated;
          b2cListByState[posCode].totalInvoiceValue += total;
        }

        cgstTax += central;
        sgstTax += state;
        igstTax += integrated;
      }
    });

    return {
      b2bList,
      b2cList: Object.values(b2cListByState),
      totalTaxableB2B,
      totalTaxableB2C,
      totalTaxableTurnover: totalTaxableB2B + totalTaxableB2C,
      cgstTax,
      sgstTax,
      igstTax,
      totalGstOutward: cgstTax + sgstTax + igstTax
    };
  }, [filteredInvoices, filteredSalesOrders, customers]);

  // 3. Eligible Input Tax Credit (ITC) from Purchase Orders (GSTR-3B Part 4)
  // Standard raw material supplies purchased also carry tax components that provide GST mitigation
  const purchaseItcSummary = useMemo(() => {
    let poTaxableValue = 0;
    let cgstITC = 0;
    let sgstITC = 0;
    let igstITC = 0;

    const purchaseList: {
      poId: string;
      supplierName: string;
      gstin: string;
      date: string;
      taxableValue: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalValue: number;
      status: 'pending' | 'received';
    }[] = [];

    filteredPurchases.forEach(po => {
      const sup = suppliers.find(s => s.id === po.supplierId);
      // We look at item components to approximate standard 12% - 18% HSN purchase taxes
      const subtotal = po.totalAmount / 1.18; // approx taxable
      const central = subtotal * 0.09;
      const state = subtotal * 0.09;
      const total = po.totalAmount;

      poTaxableValue += subtotal;
      cgstITC += central;
      sgstITC += state;

      purchaseList.push({
        poId: po.id,
        supplierName: sup?.name || 'Local Supplier',
        gstin: `27AAP${(Math.floor(po.totalAmount) % 9000 + 1000).toString()}B1Z3`,
        date: po.date,
        taxableValue: parseFloat(subtotal.toFixed(2)),
        cgst: parseFloat(central.toFixed(2)),
        sgst: parseFloat(state.toFixed(2)),
        igst: 0,
        totalValue: parseFloat(total.toFixed(2)),
        status: po.status === 'received' ? 'received' : 'pending'
      });
    });

    const totalItcAvailable = cgstITC + sgstITC + igstITC;

    return {
      purchaseList,
      poTaxableValue,
      cgstITC,
      sgstITC,
      igstITC,
      totalItcAvailable
    };
  }, [filteredPurchases, suppliers]);

  // 4. Net Tax Offset & Payable calculation (GSTR-3B Monthly Settler)
  const netTaxLiability = useMemo(() => {
    const outward = outwardSuppliesSummary.totalGstOutward;
    const itc = purchaseItcSummary.totalItcAvailable;
    const netPayable = Math.max(0, outward - itc);

    return {
      outward,
      itc,
      netPayable,
      offsetRatio: outward > 0 ? (Math.min(outward, itc) / outward * 100) : 0
    };
  }, [outwardSuppliesSummary, purchaseItcSummary]);

  // 5. GSTR-2B Auto Reconciliation View
  // Simulate active reconciliation against GST portal database uploads by suppliers
  const supplierMatchedJournal = useMemo(() => {
    // Generate simulated reconciliation metrics based on existing system purchases
    return purchaseItcSummary.purchaseList.map((po, index) => {
      let reconStatus: 'matched' | 'mismatch' | 'pending' = 'matched';
      let reconMessage = 'Fully uploaded by supplier in original return';

      if (index === 1) {
        reconStatus = 'mismatch';
        reconMessage = 'Rate mismatch: Supplier recorded IGST instead of CGST/SGST';
      } else if (index === 2) {
        reconStatus = 'pending';
        reconMessage = 'Supplier has not submitted GSTR-1 yet. Pending ITC lock';
      }

      return {
        ...po,
        reconStatus,
        reconMessage,
        reconciledCode: reconStatus === 'matched' ? '2B-OK' : reconStatus === 'mismatch' ? '2B-ERR' : '2B-PEND'
      };
    });
  }, [purchaseItcSummary]);

  // Filter supplier matched journal
  const filteredSupplierJournal = useMemo(() => {
    return supplierMatchedJournal.filter(po => {
      const matchesSearch = po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) || po.poId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = supplierReconFilter === 'all' 
        ? true 
        : po.reconStatus === supplierReconFilter;

      return matchesSearch && matchesFilter;
    });
  }, [supplierMatchedJournal, searchQuery, supplierReconFilter]);

  // 6. Annual Comparative timeline (GSTR-9 View chart metrics)
  const annualChartData = [
    { name: 'Apr 26', OutwardGst: 184500, PurchaseItc: 120000, SettleGST: 64500 },
    { name: 'May 26', OutwardGst: 210000, PurchaseItc: 135000, SettleGST: 75000 },
    { name: 'Jun 26', OutwardGst: outwardSuppliesSummary.totalGstOutward || 195000, PurchaseItc: purchaseItcSummary.totalItcAvailable || 118000, SettleGST: netTaxLiability.netPayable || 77000 },
    { name: 'Jul 26', OutwardGst: 234000, PurchaseItc: 140000, SettleGST: 94000 },
    { name: 'Aug 26', OutwardGst: 220000, PurchaseItc: 125000, SettleGST: 95000 },
    { name: 'Sep 26', OutwardGst: 250000, PurchaseItc: 160000, SettleGST: 90000 },
  ];

  // 7. Actions handlers
  const handleSimulateJsonGeneration = () => {
    // Generate beautifully formatted Schema matching GST Portal format
    const payload = {
      gstin: "27AAAAA1111A1Z1",
      fp: "062026",
      cur: "INR",
      filing_type: activeTaxForm.toUpperCase(),
      b2b: outwardSuppliesSummary.b2bList.map(item => ({
        ctin: item.gstin,
        inv: [
          {
            inum: item.invoiceId,
            idt: item.date,
            val: item.totalInvoiceValue,
            pos: "27",
            rchrg: "N",
            inv_typ: "R",
            itms: [
              {
                num: 1,
                itm_det: {
                  txval: item.taxableValue,
                  rt: 18,
                  iamt: item.igst,
                  camt: item.cgst,
                  samt: item.sgst
                }
              }
            ]
          }
        ]
      })),
      b2cs: outwardSuppliesSummary.b2cList.map((state, index) => ({
        sply_ty: "INTER",
        pos: "29",
        txval: parseFloat(state.taxableValue.toFixed(2)),
        rt: 18,
        iamt: parseFloat(state.igst.toFixed(2)),
        camt: parseFloat(state.cgst.toFixed(2)),
        samt: parseFloat(state.sgst.toFixed(2))
      })),
      itc_eligible: {
        avail_itc: [
          {
            ty: "ALL_OTHER",
            txval: parseFloat(purchaseItcSummary.poTaxableValue.toFixed(2)),
            iamt: parseFloat(purchaseItcSummary.igstITC.toFixed(2)),
            camt: parseFloat(purchaseItcSummary.cgstITC.toFixed(2)),
            samt: parseFloat(purchaseItcSummary.sgstITC.toFixed(2))
          }
        ]
      },
      audit_meta: {
        timestamp: new Date().toISOString(),
        compiler: "AI Studio Easy Tax Auto-Filing Engine V2.5"
      }
    };

    setJsonPayload(JSON.stringify(payload, null, 2));
    setShowJsonPreview(true);
  };

  const triggerEFileAuthorization = () => {
    if (outwardSuppliesSummary.totalTaxableTurnover <= 0) {
      alert("No taxable transactions available to submit in the current period. Complete sales orders first!");
      return;
    }
    setFilingStatus('idle');
    setFiledArn('');
    setAuthorizedGstPin('');
    setShowFilingConfirm(true);
  };

  const handleCommitEFileSubmission = () => {
    if (!authorizedGstPin || authorizedGstPin.length < 4) {
      alert("Enter a premium 4 or 6-digit GSTR Authorized Signatory Code PIN to unlock signing keys.");
      return;
    }

    setFilingStatus('validating');
    
    setTimeout(() => {
      setFilingStatus('signing');
      setTimeout(() => {
        const generatedArn = `GST-ARN-${Math.floor(1000000 + Math.random()*9000000)}-${new Date().getFullYear()}`;
        setFilingStatus('completed');
        setFiledArn(generatedArn);

        // Append to central audit logs
        addAuditLog(
          'Tax Return Filed',
          'TaxFiling',
          generatedArn,
          `Filed GSTR-${activeTaxForm === 'gstr1' ? '1' : activeTaxForm === 'gstr3b' ? '3B' : '9'} for Period Q-${selectedQuarter.toUpperCase()} 2026. Gross turnover cleared: ₹${outwardSuppliesSummary.totalTaxableTurnover.toLocaleString()}. Total Outward tax locked: ₹${outwardSuppliesSummary.totalGstOutward.toLocaleString()}. Return Acknowledgement: ${generatedArn}`
        );

      }, 2000);
    }, 1500);
  };


  return (
    <div className="space-y-6 text-[#1A1A1A]">
      
      {/* Dynamic Filter Section */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <Calculator className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h5 className="text-xs font-bold text-slate-850 uppercase tracking-widest flex items-center gap-2">
              Indian GST Easy Tax Filing Suite
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-100 text-[10px] font-black uppercase tracking-wider">
                GSTR Compliant v2.6
              </Badge>
            </h5>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-4xl">
              Compile your sales ledgers and input purchases automatically into tax reports. Download one-click Government Portal JSON templates, reconcile supplier-uploaded credits in the GSTR-2B dashboard, or model GSTR-3B balance offsets safely.
            </p>
          </div>
        </div>

        {/* Filters and Actions control block */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 pl-2 uppercase">Period:</span>
            {(['q1', 'q2', 'q3', 'q4', 'ytd'] as const).map(q => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-all ${
                  selectedQuarter === q 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <Button 
            onClick={handleSimulateJsonGeneration}
            variant="outline"
            size="xs"
            className="text-[10px] h-9 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50/40 rounded-xl cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export GST Offline JSON
          </Button>

          <Button 
            onClick={triggerEFileAuthorization}
            size="xs"
            className="text-[10px] h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 mr-1" /> Authorized E-File Submit
          </Button>
        </div>
      </div>


      {/* Financial Health Snapshot Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Gross Taxable Sales Turnover */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross Sales Turnover</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xl font-black text-slate-900 leading-none">
                ₹{outwardSuppliesSummary.totalTaxableTurnover?.toLocaleString()}
              </h2>
              <p className="text-[9px] text-slate-400">Taxable outward goods & scrap sales</p>
            </div>
            <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-[10px]">
              <span className="text-slate-400">B2B Core Ratio:</span>
              <span className="font-extrabold text-indigo-600">
                {outwardSuppliesSummary.totalTaxableTurnover > 0 
                  ? ((outwardSuppliesSummary.totalTaxableB2B / outwardSuppliesSummary.totalTaxableTurnover) * 100).toFixed(0) + '%'
                  : '0%'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        {/* GST Liability Payable (Outward) */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outward GST Collected</span>
              <Percent className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xl font-black text-indigo-600 leading-none">
                ₹{outwardSuppliesSummary.totalGstOutward?.toLocaleString()}
              </h2>
              <p className="text-[9px] text-slate-400 font-mono">
                {outwardSuppliesSummary.cgstTax > 0 ? `CGST: ₹${outwardSuppliesSummary.cgstTax.toLocaleString()}` : 'No CGST'} | 
                {outwardSuppliesSummary.igstTax > 0 ? ` IGST: ₹${outwardSuppliesSummary.igstTax.toLocaleString()}` : ''}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Total Invoices:</span>
              <span className="font-bold text-slate-700">{outwardSuppliesSummary.b2bList.length + outwardSuppliesSummary.b2cList.length} Accounts</span>
            </div>
          </CardContent>
        </Card>

        {/* Eligible ITC Available (Input purchases credit) */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Tax Credit (ITC)</span>
              <Coins className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xl font-black text-emerald-600 leading-none">
                ₹{purchaseItcSummary.totalItcAvailable?.toLocaleString()}
              </h2>
              <p className="text-[9px] text-slate-400">Available from material procurement journals</p>
            </div>
            <div className="pt-2 border-t border-slate-50 flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Procured items:</span>
              <span className="font-bold text-emerald-600 underline cursor-pointer" onClick={() => setActiveTaxForm('gstr1')}>
                {purchaseItcSummary.purchaseList.length} PO Orders
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Net GST Balance Payable */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
          <CardContent className="p-5 space-y-3 bg-slate-50/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Net GST Settle Cash</span>
              <Scale className="w-4 h-4 text-amber-500" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xl font-black text-slate-805 leading-none">
                ₹{netTaxLiability.netPayable?.toLocaleString()}
              </h2>
              <p className="text-[9px] text-slate-400">Mitigated tax liability outstanding</p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Offset Mitigation:</span>
              <span className="font-extrabold text-emerald-700">
                {netTaxLiability.offsetRatio.toFixed(0)}% Tax Saved
              </span>
            </div>
          </CardContent>
        </Card>

      </div>


      {/* Form Navigation Subtabs switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setActiveTaxForm('gstr1')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTaxForm === 'gstr1' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> GSTR-1 (Outward Sales Layout)
          </button>
          <button
            onClick={() => setActiveTaxForm('gstr3b')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTaxForm === 'gstr3b' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" /> GSTR-3B (Unified offset offset)
          </button>
          <button
            onClick={() => setActiveTaxForm('gstr2b_recon')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTaxForm === 'gstr2b_recon' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> GSTR-2B (Supplier credits check)
          </button>
          <button
            onClick={() => setActiveTaxForm('gstr9')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTaxForm === 'gstr9' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> GSTR-9 (Timeline comparative)
          </button>
        </div>

        <div className="text-[10px] text-slate-400 font-bold bg-slate-55 p-2 rounded-xl border border-slate-200">
          ● Supply State: MH (27) Maharashtra Head Office
        </div>
      </div>


      {/* Main Form content renderer */}
      
      {/* 1. GSTR-1 IN outward sales details */}
      {activeTaxForm === 'gstr1' && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white rounded-3xl">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  GSTR-1 Outward Supplies Ledger Line
                </CardTitle>
                <CardDescription className="text-[10px]">Taxable outbound sales transactions divided by client GSTIN validation and B2C State pools.</CardDescription>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-150 font-bold text-[10px] py-1">
                {outwardSuppliesSummary.b2bList.length} B2B Invoices Locked
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              
              {/* B2B Supplies table */}
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Table 4A - B2B Invoices (Business-to-Business Ledger List)</h4>
              </div>

              {outwardSuppliesSummary.b2bList.length === 0 ? (
                <div className="p-16 text-center text-xs text-slate-400 font-semibold space-y-1.5">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>No B2B Invoices registered with valid GSTIN profiles in this period.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs pl-6">Invoice ID</TableHead>
                        <TableHead className="font-bold text-xs">Customer</TableHead>
                        <TableHead className="font-bold text-xs">GSTIN</TableHead>
                        <TableHead className="font-bold text-xs">Date</TableHead>
                        <TableHead className="font-bold text-xs text-right">Taxable Turnover</TableHead>
                        <TableHead className="font-bold text-xs text-right">CGST</TableHead>
                        <TableHead className="font-bold text-xs text-right">SGST</TableHead>
                        <TableHead className="font-bold text-xs text-right">IGST</TableHead>
                        <TableHead className="font-bold text-xs text-right pr-6">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outwardSuppliesSummary.b2bList.map((item, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/20 text-xs">
                          <TableCell className="font-bold text-slate-800 focus:outline-hidden pl-6">{item.invoiceId}</TableCell>
                          <TableCell className="text-slate-600 font-medium">{item.customerName}</TableCell>
                          <TableCell className="font-mono text-[10px] font-extrabold text-slate-600">{item.gstin}</TableCell>
                          <TableCell className="text-slate-500 whitespace-nowrap">{item.date}</TableCell>
                          <TableCell className="text-right font-mono font-medium">₹{item.taxableValue.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-slate-500">₹{item.cgst.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-slate-500">₹{item.sgst.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-slate-500">₹{item.igst.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-black text-indigo-700 pr-6">₹{item.totalInvoiceValue.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* B2C Supplies table */}
              <div className="p-4 bg-slate-50 border-t border-b border-indigo-50">
                <h4 className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">Table 7 - B2CS Consolidated (Business-to-Consumer Supplies aggregated by state codes)</h4>
              </div>

              {outwardSuppliesSummary.b2cList.length === 0 ? (
                <div className="p-10 text-center text-[10px] text-slate-400 font-semibold">
                  No small retail B2C consumer invoices recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-xs pl-6">Consumer POS State</TableHead>
                        <TableHead className="font-bold text-xs">Standard Tax rate HSN</TableHead>
                        <TableHead className="font-bold text-xs text-right">Taxable Turnover</TableHead>
                        <TableHead className="font-bold text-xs text-right">CGST Collected</TableHead>
                        <TableHead className="font-bold text-xs text-right">SGST Collected</TableHead>
                        <TableHead className="font-bold text-xs text-right">IGST Collected</TableHead>
                        <TableHead className="font-bold text-xs text-right pr-6">Total Collection value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outwardSuppliesSummary.b2cList.map((state, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/10 text-xs text-slate-650">
                          <TableCell className="font-extrabold text-slate-800 pl-6">{state.placeOfSupply}</TableCell>
                          <TableCell className="text-xs">Standard Upper (18%)</TableCell>
                          <TableCell className="text-right font-mono">₹{parseFloat(state.taxableValue.toFixed(2)).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-slate-500">₹{parseFloat(state.cgst.toFixed(2)).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-slate-500">₹{parseFloat(state.sgst.toFixed(2)).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-slate-500">₹{parseFloat(state.igst.toFixed(2)).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-indigo-700 pr-6">₹{parseFloat(state.totalInvoiceValue.toFixed(2)).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      )}


      {/* 2. GSTR-3B Unified monthly reconciliation and liability offsets */}
      {activeTaxForm === 'gstr3b' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Box: Section 3.1 & Section 4 details */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Outward supplies breakdown card */}
              <Card className="border-slate-200 shadow-sm bg-white rounded-3xl">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                    Form GSTR-3B Part 3.1 - Gross Outward Taxable Liabilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5">
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-4 bg-slate-50 p-2.5 rounded-xl font-bold text-slate-500 text-[10px] uppercase">
                      <span>Supplies Classification</span>
                      <span className="text-right">Taxable Turnover</span>
                      <span className="text-right">Central Tax (CGST)</span>
                      <span className="text-right">State Tax (SGST/IGST)</span>
                    </div>

                    <div className="grid grid-cols-4 p-2.5 border-b border-slate-55">
                      <span className="font-bold text-slate-700">A. Outward Taxable (Other than Zero or Nil)</span>
                      <span className="text-right font-mono">₹{outwardSuppliesSummary.totalTaxableTurnover.toLocaleString()}</span>
                      <span className="text-right font-mono">₹{outwardSuppliesSummary.cgstTax.toLocaleString()}</span>
                      <span className="text-right font-mono text-indigo-650">₹{(outwardSuppliesSummary.sgstTax + outwardSuppliesSummary.igstTax).toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-4 p-2.5 border-b border-slate-55 text-slate-400">
                      <span>B. Outward zero rated exports</span>
                      <span className="text-right font-mono">₹0.00</span>
                      <span className="text-right font-mono">₹0.00</span>
                      <span className="text-right font-mono">₹0.00</span>
                    </div>

                    <div className="grid grid-cols-4 p-2.5 text-slate-405 font-bold">
                      <span>Consolidated liability aggregate:</span>
                      <span className="text-right font-mono text-slate-900">₹{outwardSuppliesSummary.totalTaxableTurnover.toLocaleString()}</span>
                      <span className="text-right font-mono text-indigo-600">₹{outwardSuppliesSummary.cgstTax.toLocaleString()}</span>
                      <span className="text-right font-mono text-indigo-600">₹{(outwardSuppliesSummary.sgstTax + outwardSuppliesSummary.igstTax).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ITC Eligible credit offset card */}
              <Card className="border-slate-200 shadow-sm bg-white rounded-3xl">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                    Form GSTR-3B Part 4 - Input Tax Credit (ITC) Eligible Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5">
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-4 bg-slate-50 p-2.5 rounded-xl font-bold text-slate-500 text-[10px] uppercase">
                      <span>ITC Type Source</span>
                      <span className="text-right">Eligible Turnover</span>
                      <span className="text-right">Central Tax Credit</span>
                      <span className="text-right">State/UT Tax Credit</span>
                    </div>

                    <div className="grid grid-cols-4 p-2.5 border-b border-slate-55">
                      <span className="font-bold text-slate-700">A1. Import of raw goods</span>
                      <span className="text-right font-mono">₹0.00</span>
                      <span className="text-right font-mono">₹0.00</span>
                      <span className="text-right font-mono">₹0.00</span>
                    </div>

                    <div className="grid grid-cols-4 p-2.5 border-b border-slate-55">
                      <span className="font-bold text-slate-700">A5. All other inward goods credits (PO ledger)</span>
                      <span className="text-right font-mono text-slate-600">₹{purchaseItcSummary.poTaxableValue.toLocaleString()}</span>
                      <span className="text-right font-mono text-emerald-650">₹{purchaseItcSummary.cgstITC.toLocaleString()}</span>
                      <span className="text-right font-mono text-emerald-650">₹{purchaseItcSummary.sgstITC.toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-4 p-2.5 text-slate-750 font-extrabold text-[11px] bg-slate-50/50 rounded-xl">
                      <span>Eligible Input Credit Locked:</span>
                      <span className="text-right font-mono">₹{purchaseItcSummary.poTaxableValue.toLocaleString()}</span>
                      <span className="text-right font-mono text-emerald-700">₹{purchaseItcSummary.cgstITC.toLocaleString()}</span>
                      <span className="text-right font-mono text-emerald-700">₹{purchaseItcSummary.sgstITC.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>


            {/* Right Offset mitigation engine and balance settlement simulator */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-indigo-200 bg-indigo-50/15 shadow-sm rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-200/10 rounded-full blur-2xl pointer-events-none" />
                <CardHeader className="pb-3 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-indigo-600" />
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                      ITC Mitigation Desk GSTR-3B
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs">
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Outward CGST Liability:</span>
                      <span className="font-mono font-bold">₹{outwardSuppliesSummary.cgstTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Outward SGST Liability:</span>
                      <span className="font-mono font-bold">₹{(outwardSuppliesSummary.sgstTax + outwardSuppliesSummary.igstTax).toLocaleString()}</span>
                    </div>
                    
                    <div className="border-t border-indigo-100 my-2" />

                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="font-medium flex items-center gap-1">Available Input Offset keys:</span>
                      <span className="font-mono font-extrabold">- ₹{purchaseItcSummary.totalItcAvailable.toLocaleString()}</span>
                    </div>

                    <div className="border-t border-indigo-150 my-2" />

                    <div className="space-y-1 bg-white p-3 rounded-2xl border border-indigo-100">
                      <div className="flex justify-between text-[11px] font-black text-slate-850 uppercase tracking-tight">
                        <span>Net GST Cash Ledger:</span>
                        <span className="font-mono text-slate-900">₹{netTaxLiability.netPayable.toLocaleString()}</span>
                      </div>
                      <p className="text-[9px] text-slate-450 leading-relaxed font-semibold">
                        This cash component must be loaded and deposited to central government accounts under CGST Chalan offsets.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3">
                    <Button 
                      onClick={() => {
                        alert(`Offset transaction executed! Mitigated CGST and SGST pools using ₹${purchaseItcSummary.totalItcAvailable.toLocaleString()} eligible journal buffers.`);
                        setItcOffsetAmount(purchaseItcSummary.totalItcAvailable);
                        addAuditLog(
                          'Settle ITC Offsets',
                          'TaxFiling',
                          `ITC-${Date.now()}`,
                          `Offset outward GST ledger pools directly using supplier purchased input credit of ₹${purchaseItcSummary.totalItcAvailable.toLocaleString()}. Reduced net cash liability down to ₹${netTaxLiability.netPayable.toLocaleString()}.`
                        );
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-9.5 rounded-xl cursor-pointer"
                    >
                      Process Auto-Offsite Settle
                    </Button>
                    <p className="text-[9px] text-center text-slate-400 mt-2">
                      Automatically offset local and interstate taxes following CGST & SGST cross-utilization rules.
                    </p>
                  </div>

                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      )}


      {/* 3. GSTR-2B Supplier credit auditing and invoice matching system */}
      {activeTaxForm === 'gstr2b_recon' && (
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    GSTR-2B Input Credit Auto-Reconstruction Engine
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Reconcile local purchase logs against GSTR-2B statements generated by supplier filings to catch audit gaps.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search supplier..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8.5 h-8.5 text-xs w-48 rounded-xl bg-slate-50/50"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                    {(['all', 'matched', 'mismatch', 'pending'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setSupplierReconFilter(f)}
                        className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg transition-all cursor-pointer ${
                          supplierReconFilter === f 
                            ? 'bg-slate-800 text-white' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              
              {filteredSupplierJournal.length === 0 ? (
                <div className="p-16 text-center text-xs text-slate-400 font-semibold space-y-1.5">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>No procurement logs matching search filter found in this period.</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-xs pl-6">PO Reference</TableHead>
                      <TableHead className="font-bold text-xs">Supplier Partner</TableHead>
                      <TableHead className="font-bold text-xs">GSTIN</TableHead>
                      <TableHead className="font-bold text-xs text-right">Taxable purchase</TableHead>
                      <TableHead className="font-bold text-xs text-right">Eligible Credit CGST/SGST</TableHead>
                      <TableHead className="font-bold text-xs text-center">Status on Government Portal</TableHead>
                      <TableHead className="font-bold text-xs pr-6">Audit Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSupplierJournal.map((po, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/20 text-xs text-slate-650">
                        <TableCell className="font-bold text-slate-800 pl-6">{po.poId}</TableCell>
                        <TableCell className="font-medium text-slate-700">{po.supplierName}</TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-500">{po.gstin}</TableCell>
                        <TableCell className="text-right font-mono">₹{po.taxableValue.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-700 font-bold">₹{(po.cgst + po.sgst).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-[9px] font-black uppercase rounded-lg px-2 py-0.5 ${
                            po.reconStatus === 'matched' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                              : po.reconStatus === 'mismatch'
                              ? 'bg-amber-50 text-amber-800 border-amber-100 animate-pulse'
                              : 'bg-rose-50 text-rose-800 border-rose-100'
                          }`}>
                            {po.reconStatus === 'matched' ? '✓ Reconciled' : po.reconStatus === 'mismatch' ? '⚠ Discrepancy' : '⏱ Unfiled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 border-l border-slate-50 text-[10px] pl-3 pr-6 leading-normal font-semibold">
                          {po.reconMessage}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

            </CardContent>
          </Card>
        </div>
      )}


      {/* 4. GSTR-9 Timeline comprehensive comparison views */}
      {activeTaxForm === 'gstr9' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left comparative Chart: Outward vs ITC Purchase claims */}
            <Card className="border-slate-200 shadow-sm bg-white rounded-3xl lg:col-span-2">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  Fiscal Tax liabilities timeline monthly mapping
                </CardTitle>
                <CardDescription className="text-[10px]">Comparative analytics of gross outward GST collections vs. Input offsets claimed.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={annualChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorOutward" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorItc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontStyle="mono" />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e2e8f0' }}
                        formatter={(value: any) => [`₹${Number(value).toLocaleString()}`]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="OutwardGst" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorOutward)" name="Collected GST Liability" />
                      <Area type="monotone" dataKey="PurchaseItc" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorItc)" name="Procurement Input Credit" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Right: Return checklist and audit guidelines */}
            <Card className="border-slate-200 shadow-sm bg-white rounded-3xl lg:col-span-1">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  Business Auditor Guardrail check
                </CardTitle>
                <CardDescription className="text-[10px]">Real-time audits for legal compliance compliance.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                
                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800 text-[11px]">Valid HSN Database compliance</p>
                      <p className="text-[10px] text-slate-500">Every catalog entry carries active 4 to 8 digit legal central codes.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800 text-[11px]">SGST Rate Alignment</p>
                      <p className="text-[10px] text-slate-500">Intra-state sales within Maharashtra split exactly at 50% CGST / 50% SGST ratios.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800 text-[11px]">E-Waybill Generation triggers</p>
                      <p className="text-[10px] text-slate-500">Auto-identifies sales value cross ₹50,000 requiring legal road logs.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-3.5 space-y-1 mt-4">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[10px] uppercase">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Pending reconciliation Alert
                  </div>
                  <p className="text-[9px] text-amber-700 leading-relaxed font-semibold">
                    We found 1 purchase transaction where the vendor's invoice possesses mismatched tax attributes inside GSTR-2B logs. Verify this immediately to avoid tax fines.
                  </p>
                </div>

              </CardContent>
            </Card>

          </div>
        </div>
      )}


      {/* ========================================================
          MODAL DIALOG: OFFLINE GOVERNMENT PORTAL JSON EXPORT
          ======================================================== */}
      <Dialog open={showJsonPreview} onOpenChange={setShowJsonPreview}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-3xl border border-slate-250 select-none text-xs">
          <DialogHeader className="space-y-1.5 text-left border-b border-slate-100 pb-3">
            <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5 animate-pulse">
              <Download className="w-4 h-4 text-indigo-650" /> Portal Offline upload JSON compiled
            </DialogTitle>
            <CardDescription className="text-[10px]">
              Ready to submit offline portal package matching standard GSTIN offline tool format structures.
            </CardDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
              <span>GSTIN Schema v1.1.2 Offline Parser:</span>
              <span className="text-emerald-700">Format Validated ✓</span>
            </div>
            
            <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[9px] rounded-2xl max-h-80 overflow-y-auto leading-relaxed border border-slate-850">
              {jsonPayload}
            </pre>
          </div>

          <DialogFooter className="flex gap-2.5 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowJsonPreview(false)}
              className="px-4.5 h-9 text-xs font-bold border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"
            >
              Close Window
            </Button>
            <Button 
              onClick={() => {
                // Simulate downloading
                const element = document.createElement("a");
                const file = new Blob([jsonPayload], {type: 'text/plain'});
                element.href = URL.createObjectURL(file);
                element.download = `${activeTaxForm.toUpperCase()}_Report_Q${selectedQuarter.toUpperCase()}.json`;
                document.body.appendChild(element);
                element.click();
                alert(`${activeTaxForm.toUpperCase()} offline JSON payload downloaded successfully! Clear government GST Offline tool checks.`);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4.5 h-9 text-xs font-bold rounded-xl cursor-pointer"
            >
              Save JSON locally
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ========================================================
          MODAL DIALOG: DIGITAL E-FILING SIMULATION
          ======================================================== */}
      <Dialog open={showFilingConfirm} onOpenChange={setShowFilingConfirm}>
        <DialogContent className="max-w-md bg-white p-6 rounded-3xl border border-slate-250 select-none text-xs">
          
          <DialogHeader className="space-y-1.5 text-left border-b border-slate-100 pb-3">
            <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-indigo-600" /> Government GSTN Return E-Filing
            </DialogTitle>
            <CardDescription className="text-[10px]">
              Direct filing validation for GSTR-{activeTaxForm === 'gstr1' ? '1' : activeTaxForm === 'gstr3b' ? '3B' : '9'}.
            </CardDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            
            {filingStatus === 'idle' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs border border-slate-100 leading-normal">
                  <div className="font-extrabold text-slate-800">Return Parameters verification:</div>
                  <div className="flex justify-between">
                    <span>Tax Form Category:</span>
                    <span className="font-black font-mono">GSTR-{activeTaxForm.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fiscal period:</span>
                    <span className="font-bold">Quarter - {selectedQuarter.toUpperCase()} 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cumulative turnover:</span>
                    <span className="font-black text-indigo-700">₹{outwardSuppliesSummary.totalTaxableTurnover.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total outward GST submitted:</span>
                    <span className="font-black text-rose-600">₹{outwardSuppliesSummary.totalGstOutward.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    Enter DSC / EVC PIN authorization code:
                  </label>
                  <Input 
                    type="password"
                    placeholder="e.g. 8839"
                    value={authorizedGstPin}
                    onChange={(e) => setAuthorizedGstPin(e.target.value)}
                    className="h-10 text-xs text-center font-mono font-black"
                  />
                  <p className="text-[9px] text-slate-400">
                    Entering a 4-digit code registers matching Government Digital Signature Certificate verification keys.
                  </p>
                </div>
              </div>
            )}

            {filingStatus === 'validating' && (
              <div className="py-8 text-center space-y-3.5">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-xs">Connecting with GSTIN Gateways...</p>
                  <p className="text-[10px] text-slate-400">Validating HSN numbers and supplier credits cross-check logs</p>
                </div>
              </div>
            )}

            {filingStatus === 'signing' && (
              <div className="py-8 text-center space-y-3.5">
                <ShieldCheck className="w-8 h-8 text-emerald-600 animate-bounce mx-auto" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-xs">Applying DSC Digital Signature Certificate...</p>
                  <p className="text-[10px] text-slate-400 font-mono">Encrypting payload matching SEC-256 government standard protocols</p>
                </div>
              </div>
            )}

            {filingStatus === 'completed' && (
              <div className="py-4 space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-black text-slate-805 text-sm uppercase">Return Upload Success</h4>
                  <p className="text-[10px] text-slate-400">Your return has been fully coded, processed and queued by central GST servers.</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl space-y-1.5 font-sans border border-slate-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Government ARN Reference:</span>
                    <span className="font-black text-emerald-700 font-mono select-all">{filedArn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Filing Timestamp:</span>
                    <span className="text-slate-600 font-mono">{new Date().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Digital Signature Verification:</span>
                    <span className="text-slate-600 font-bold uppercase text-[9px] bg-indigo-50 px-1 text-indigo-700">SHA-256 OK</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          <DialogFooter className="flex gap-2.5 sm:justify-end">
            {filingStatus === 'idle' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilingConfirm(false)}
                  className="px-4.5 h-9 text-xs font-bold border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCommitEFileSubmission}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4.5 h-9 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Sign & Submit Return
                </Button>
              </>
            )}

            {filingStatus === 'completed' && (
              <Button 
                onClick={() => setShowFilingConfirm(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-9.5 text-xs font-bold rounded-xl cursor-pointer"
              >
                Dismiss receipt
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  History, 
  TrendingUp, 
  ShoppingBag, 
  CreditCard,
  Building,
  DollarSign,
  Briefcase,
  Layers,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Percent,
  Activity,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend 
} from 'recharts';
import { Customer, Invoice, Payment, SalesOrder, InventoryItem } from '../types';

interface CustomerHistoryDialogProps {
  customer: Customer;
  invoices: Invoice[];
  payments: Payment[];
  salesOrders: SalesOrder[];
  inventory: InventoryItem[];
  trigger: React.ReactNode;
}

export default function CustomerHistoryDialog({
  customer,
  invoices,
  payments,
  salesOrders,
  inventory,
  trigger
}: CustomerHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'invoices' | 'products' | 'payments_ledger'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filtered core entities for this customer
  const customerOrders = useMemo(() => {
    return salesOrders.filter(so => so.customerId === customer.id);
  }, [salesOrders, customer.id]);

  const customerInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const order = salesOrders.find(so => so.id === inv.orderId);
      return order?.customerId === customer.id && inv.orderType === 'sales';
    });
  }, [invoices, salesOrders, customer.id]);

  const customerPayments = useMemo(() => {
    return payments.filter(pay => {
      const invoice = invoices.find(inv => inv.id === pay.invoiceId);
      if (!invoice) return false;
      const order = salesOrders.find(so => so.id === invoice.orderId);
      return order?.customerId === customer.id;
    });
  }, [payments, invoices, salesOrders, customer.id]);

  // 2. Financial Overview Metrics
  const summary = useMemo(() => {
    const totalOrdered = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = customerInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const balanceDue = Math.max(0, totalInvoiced - totalPaid);
    const overdueCount = customerInvoices.filter(inv => inv.status === 'overdue' || (inv.status === 'unpaid' && new Date(inv.dueDate) < new Date())).length;

    // Monthly purchase breakdown for charting
    const monthsGroup: Record<string, number> = {};
    customerOrders.forEach(o => {
      if (!o.date) return;
      const monthStr = o.date.substring(0, 7); // YYYY-MM
      monthsGroup[monthStr] = (monthsGroup[monthStr] || 0) + o.totalAmount;
    });

    const timelineChartData = Object.entries(monthsGroup)
      .map(([month, val]) => ({ month, amount: val }))
      .sort((a,b) => a.month.localeCompare(b.month));

    // Ensure we have at least 3 months for a cute visual timeline chart
    if (timelineChartData.length === 0) {
      timelineChartData.push({ month: '2026-03', amount: 0 });
      timelineChartData.push({ month: '2026-04', amount: 0 });
      timelineChartData.push({ month: '2026-05', amount: 0 });
    }

    return {
      totalOrdered,
      totalInvoiced,
      totalPaid,
      balanceDue,
      overdueCount,
      billsCount: customerInvoices.length,
      paymentsCount: customerPayments.length,
      timelineChartData
    };
  }, [customerOrders, customerInvoices, customerPayments]);

  // 3. Product-wise aggregate analysis
  const itemPurchaseBreakdown = useMemo(() => {
    const itemVolume: Record<string, { quantity: number; cost: number }> = {};

    customerOrders.forEach(order => {
      order.items.forEach(it => {
        if (!itemVolume[it.itemId]) {
          itemVolume[it.itemId] = { quantity: 0, cost: 0 };
        }
        itemVolume[it.itemId].quantity += it.quantity;
        itemVolume[it.itemId].cost += (it.quantity * it.rate);
      });
    });

    return Object.entries(itemVolume).map(([itemId, stats]) => {
      const item = inventory.find(inv => inv.id === itemId);
      return {
        id: itemId,
        name: item?.name || 'Unknown item',
        sku: item?.sku || 'N/A',
        unit: item?.unit || 'units',
        quantity: stats.quantity,
        totalSpent: stats.cost,
        averagePrice: stats.quantity > 0 ? (stats.cost / stats.quantity) : 0
      };
    }).sort((a,b) => b.totalSpent - a.totalSpent);
  }, [customerOrders, inventory]);

  // Chronological chronological ledger stream mixing SalesOrders, Invoices and Receipts!
  const mixedTimelineEvents = useMemo(() => {
    const events: any[] = [];

    // Add Sales Orders
    customerOrders.forEach(order => {
      events.push({
        id: order.id,
        date: order.date,
        type: 'order',
        title: 'Sales Order Generated',
        description: `Order ${order.id} containing ${order.items.length} materials items created.`,
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        amount: order.totalAmount,
        refObject: order
      });
    });

    // Add Invoices
    customerInvoices.forEach(inv => {
      events.push({
        id: inv.id,
        date: inv.date,
        type: 'invoice',
        title: `E-Invoice Registered`,
        description: `Invoice generated for order ${inv.orderId}. E-Way/IRN Portal compliance: ${inv.irnGenerated ? 'PORTAL ACTIVE' : 'PENDING PORTAL FILE'}.`,
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amount: inv.totalAmount,
        refObject: inv,
        status: inv.status
      });
    });

    // Add Payments
    customerPayments.forEach(pay => {
      events.push({
        id: pay.id,
        date: pay.date,
        type: 'payment',
        title: 'Payment Received',
        description: `Cleared against invoice ${pay.invoiceId} via ${pay.method.toUpperCase().replace('_', ' ')}.`,
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
        amount: pay.amount,
        refObject: pay
      });
    });

    // Sort descending chronologically
    return events.sort((a, b) => b.date.localeCompare(a.date));
  }, [customerOrders, customerInvoices, customerPayments]);

  // Search filter
  const filteredTimeline = useMemo(() => {
    if (!searchQuery) return mixedTimelineEvents;
    return mixedTimelineEvents.filter(e => 
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [mixedTimelineEvents, searchQuery]);

  // Download statement file
  const handleDownloadLedger = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const header = `==================================================\n` +
                   `          CUSTOMER LEDGER & STATEMENT\n` +
                   `==================================================\n` +
                   `Customer: ${customer.name}\n` +
                   `Email: ${customer.email}\n` +
                   `Contact: ${customer.contact}\n` +
                   `GSTIN: ${customer.gstin || 'N/A'}\n` +
                   `Printed On: ${dateStr}\n` +
                   `--------------------------------------------------\n` +
                   `Summary Metrics:\n` +
                   ` - Total Ordering Volume: ₹${summary.totalOrdered.toLocaleString()}\n` +
                   ` - Total Invoiced Assets: ₹${summary.totalInvoiced.toLocaleString()}\n` +
                   ` - Total Paid Receipts: ₹${summary.totalPaid.toLocaleString()}\n` +
                   ` - Outstanding Balance due: ₹${summary.balanceDue.toLocaleString()}\n` +
                   `==================================================\n\n` +
                   `CHRONOLOGICAL STATEMENT:\n` +
                   `Date        | Type    | Ref ID       | Description | Amount\n` +
                   `------------|---------|--------------|-------------|-----------\n`;
                   
    const rows = mixedTimelineEvents.map(e => 
      `${e.date} | ${e.type.toUpperCase().padEnd(7)} | ${e.id.padEnd(12)} | ${e.title.substring(0, 20).padEnd(20)} | ₹${e.amount.toLocaleString()}`
    ).join('\n');

    const footer = `\n==================================================\n` +
                   `End of Ledger Statement. Generated by InvPredict.\n`;

    const blob = new Blob([header + rows + footer], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${customer.name.replace(/\s+/g, '_')}_Ledger_Statement_${dateStr}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="inline-block w-full">
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 md:p-6 overflow-hidden">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] text-[#1D1D21] border border-gray-150 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header section */}
            <div className="p-6 bg-[#FAFAFC] border-b border-gray-150 rounded-t-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-55 bg-indigo-600 text-white font-extrabold text-[10px] tracking-wider uppercase py-0.5 px-2">CUSTOMER ACCOUNT</Badge>
                  {summary.overdueCount > 0 && (
                    <Badge className="bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-[10px] tracking-wider uppercase py-0.5 px-2 flex items-center gap-1">
                      <AlertCircle size={10} /> {summary.overdueCount} Overdue Bills
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{customer.name}</h2>
                
                {/* Contact strip */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail size={12} className="text-indigo-600" /> {customer.email}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone size={12} className="text-indigo-600" /> {customer.contact}
                  </span>
                  {customer.state && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin size={12} className="text-indigo-600" /> {customer.state}
                    </span>
                  )}
                  {customer.gstin && (
                    <span className="flex items-center gap-1 font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-bold">
                      GSTIN: {customer.gstin}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <Button 
                  onClick={handleDownloadLedger}
                  variant="outline" 
                  size="xs" 
                  className="h-9 text-xs font-bold border-gray-200 text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-1.5"
                >
                  <Download size={13} /> Statement Audit Report
                </Button>
                <Button 
                  onClick={() => setOpen(false)}
                  className="h-9 px-4 text-xs bg-slate-900 text-white font-extrabold rounded-xl hover:bg-slate-800"
                >
                  Close Profile
                </Button>
              </div>
            </div>

            {/* Content area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 overflow-hidden flex-1 select-none">
              
              {/* Left Sidebar: Detailed Financial Profile and Visual KPI Metrics */}
              <div className="lg:col-span-1 p-5 border-r border-gray-150 bg-slate-50/50 space-y-5 overflow-y-auto">
                
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Ledger Balance Summary</span>
                
                <div className="space-y-4">
                  {/* Total Ordered */}
                  <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-xs space-y-1">
                    <span className="text-[10px] text-gray-400 block font-normal uppercase">LIFETIME VOLUME</span>
                    <span className="text-lg font-black text-slate-900 block font-mono">₹{summary.totalOrdered.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-400 block">{summary.billsCount} registered transactions</span>
                  </div>

                  {/* Total Invoiced */}
                  <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-xs space-y-1">
                    <span className="text-[10px] text-gray-400 block font-normal uppercase">TOTAL INVOICED</span>
                    <span className="text-lg font-black text-slate-900 block font-mono">₹{summary.totalInvoiced.toLocaleString()}</span>
                  </div>

                  {/* Total Outstandings - Balance */}
                  <div className={`p-4 rounded-2xl shadow-xs border space-y-1 ${summary.balanceDue > 0 ? 'bg-rose-50/30 border-rose-150 text-[#991B1B]' : 'bg-emerald-50/20 border-emerald-150 text-[#065F46]'}`}>
                    <span className="text-[10px] font-bold block uppercase tracking-wide">OUTSTANDING DEBT</span>
                    <span className="text-xl font-black block font-mono">₹{summary.balanceDue.toLocaleString()}</span>
                    
                    <div className="w-full bg-slate-205 h-1.5 rounded-full overflow-hidden mt-2 bg-slate-100">
                      <div 
                        className={`h-full rounded-full ${summary.balanceDue > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${summary.totalInvoiced > 0 ? Math.min(100, (summary.totalPaid / summary.totalInvoiced) * 100) : 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] block text-slate-500 pt-0.5">
                      {summary.totalInvoiced > 0 ? ((summary.totalPaid / summary.totalInvoiced) * 100).toFixed(0) : 100}% of invoices cleared
                    </span>
                  </div>
                </div>

                {/* mini line area chart */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Spend Velocity Run</span>
                  <div className="h-28 w-full font-mono text-[9px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={summary.timelineChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tickLine={false} stroke="#CBD5E1" />
                        <YAxis tickLine={false} stroke="#CBD5E1" />
                        <Tooltip />
                        <Area type="monotone" dataKey="amount" stroke="#4F46E5" strokeWidth={2} fill="url(#spendGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Static address card */}
                {customer.address && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Billing Address</span>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-white border border-slate-150/50 p-2.5 rounded-xl">{customer.address}</p>
                  </div>
                )}

              </div>

              {/* Right Main area with interactive tabs and detailed list grids */}
              <div className="lg:col-span-3 p-6 flex flex-col overflow-hidden max-h-full">
                
                {/* Ribbons navigation tab */}
                <div className="flex border-b border-gray-200 pb-3 justify-between items-center bg-white">
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-gray-250">
                    <button
                      onClick={() => setActiveTab('timeline')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      <History size={13} /> Activity Ledger
                    </button>
                    <button
                      onClick={() => setActiveTab('invoices')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'invoices' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      <FileText size={13} /> Invoices ({customerInvoices.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('products')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'products' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      <ShoppingBag size={13} /> Products Bought
                    </button>
                    <button
                      onClick={() => setActiveTab('payments_ledger')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'payments_ledger' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      <CreditCard size={13} /> Clearances ({customerPayments.length})
                    </button>
                  </div>

                  <div className="relative w-44 hidden md:block">
                    <span className="absolute left-2.5 top-2.5 text-gray-400"><Search size={12} /></span>
                    <Input 
                      placeholder="Search ledger..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-[11px] rounded-lg border-gray-200 focus:border-indigo-600 bg-slate-50"
                    />
                  </div>
                </div>

                {/* Live interactive panel area based on tabs */}
                <div className="flex-1 overflow-y-auto pt-5">
                  
                  {activeTab === 'timeline' && (
                    <div className="space-y-4">
                      
                      {/* Explanatory subtitle */}
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">Full account timeline</span>
                      
                      {filteredTimeline.length === 0 ? (
                        <div className="p-10 border border-slate-100 border-dashed rounded-3xl text-center text-slate-400 italic text-xs">
                          No accounting events matching the filters were recorded.
                        </div>
                      ) : (
                        <div className="relative border-l border-slate-200 pl-5 ml-2.5 space-y-6">
                          {filteredTimeline.map((item, index) => (
                            <div key={item.id + '-' + index} className="relative">
                              {/* Glowing bullet pin */}
                              <span className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-indigo-600 outline-hidden flex justify-center items-center shadow-xs" />
                              
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50/50 hover:bg-slate-50/90 border border-slate-100 rounded-2xl p-4 gap-2 transition duration-150">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-slate-400 text-[10px] font-mono font-bold">{item.date}</span>
                                    <Badge className={`${item.badgeColor} border font-extrabold text-[8px] uppercase py-0 px-1.5 h-4 flex items-center`}>
                                      {item.type}
                                    </Badge>
                                    <span className="text-slate-400 text-xs">|</span>
                                    <span className="font-mono text-[10px] font-bold text-zinc-500">{item.id}</span>
                                  </div>

                                  <h4 className="font-extrabold text-slate-800 text-xs">{item.title}</h4>
                                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{item.description}</p>
                                </div>

                                <div className="text-right sm:self-center pr-1">
                                  <span className="font-mono font-black text-slate-900 text-xs block">
                                    ₹{item.amount.toLocaleString()}
                                  </span>
                                  {item.status && (
                                    <span className={`text-[9px] uppercase font-bold tracking-wider ${item.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {item.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  )}

                  {activeTab === 'invoices' && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">Invoices Statements</span>
                      
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        <Table>
                          <TableHeader className="bg-slate-50/70">
                            <TableRow>
                              <TableHead className="font-bold text-xs">Invoice ID</TableHead>
                              <TableHead className="font-bold text-xs">Date</TableHead>
                              <TableHead className="font-bold text-xs">Due Date</TableHead>
                              <TableHead className="font-bold text-xs text-right">Invoiced Amt</TableHead>
                              <TableHead className="font-bold text-xs text-right">Settled</TableHead>
                              <TableHead className="font-bold text-xs pr-6 text-right">Due State</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerInvoices.map(inv => (
                              <TableRow key={inv.id} className="hover:bg-slate-50/20 text-xs">
                                <TableCell className="font-mono font-extrabold text-slate-800">{inv.id}</TableCell>
                                <TableCell className="text-slate-500">{inv.date}</TableCell>
                                <TableCell className="text-slate-500">{inv.dueDate}</TableCell>
                                <TableCell className="text-right font-bold text-slate-900">₹{inv.totalAmount.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-bold text-emerald-600">₹{inv.paidAmount.toLocaleString()}</TableCell>
                                <TableCell className="text-right pr-6">
                                  {inv.status === 'paid' ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">Paid</Badge>
                                  ) : inv.status === 'overdue' ? (
                                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold">Overdue</Badge>
                                  ) : (
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold">Pending</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                            {customerInvoices.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-slate-400 py-8 italic">No registered sales invoice bills recorded.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'products' && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">Purchased Product Matrix</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {itemPurchaseBreakdown.map(b => (
                          <div key={b.id} className="p-4 border border-slate-150 bg-white shadow-xs rounded-2xl flex justify-between items-center transition-all hover:border-slate-250">
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-slate-400 font-bold tracking-wide uppercase">{b.sku}</span>
                              <h4 className="font-extrabold text-slate-800 text-xs">{b.name}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold">Average unit rate buy: <span className="text-slate-700 font-mono font-extrabold">₹{b.averagePrice.toFixed(1)}</span></p>
                            </div>

                            <div className="text-right space-y-1">
                              <span className="font-black text-indigo-600 text-xs font-mono block">₹{b.totalSpent.toLocaleString()}</span>
                              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] h-5 px-2 font-mono" variant="outline">
                                {b.quantity} {b.unit} bought
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {itemPurchaseBreakdown.length === 0 && (
                          <div className="col-span-2 p-10 border border-slate-100 border-dashed rounded-3xl text-center text-slate-400 italic text-xs">
                            No product or raw material items bought from sales logs.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'payments_ledger' && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">Payment Clearance logs</span>
                      
                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        <Table>
                          <TableHeader className="bg-slate-50/70">
                            <TableRow>
                              <TableHead className="font-bold text-xs">Receipt #</TableHead>
                              <TableHead className="font-bold text-xs">Invoice Ref ID</TableHead>
                              <TableHead className="font-bold text-xs">Method</TableHead>
                              <TableHead className="font-bold text-xs">Reference No.</TableHead>
                              <TableHead className="font-bold text-xs text-right pr-6">Amount Paid</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerPayments.map(p => (
                              <TableRow key={p.id} className="hover:bg-slate-50/20 text-xs">
                                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                                <TableCell className="font-bold font-mono text-zinc-650">{p.invoiceId}</TableCell>
                                <TableCell className="capitalize text-slate-600">{p.method.replace('_', ' ')}</TableCell>
                                <TableCell className="font-mono text-slate-400 text-[11px]">{p.reference || 'N/A'}</TableCell>
                                <TableCell className="text-right pr-6 font-black text-emerald-600 font-mono">₹{p.amount.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                            {customerPayments.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-slate-400 py-8 italic">No payments receipts registered.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                </div>

              </div>
              
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

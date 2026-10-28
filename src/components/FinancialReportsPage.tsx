import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Briefcase, 
  Users, 
  Receipt,
  Download,
  Calendar,
  AlertTriangle,
  Award,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
  Layers,
  FileSpreadsheet,
  Factory,
  Building,
  Target,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  Line,
  AreaChart,
  Area
} from 'recharts';
import { InventoryItem, ProductionOrder, PurchaseOrder, SalesOrder, Customer, VarianceAnalysis, Batch, Category } from '../types';
import { Language, tText } from '../locales';
import FifoValuationPanel from './FifoValuationPanel';
import SalesForecastingPanel from './SalesForecastingPanel';
import CategorySalesPanel from './CategorySalesPanel';
import ProductionReorderHistoryPanel from './ProductionReorderHistoryPanel';
import { History } from 'lucide-react';

interface FinancialReportsPageProps {
  inventory: InventoryItem[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  orders: ProductionOrder[];
  customers: Customer[];
  varianceAnalysis: VarianceAnalysis[];
  batches: Batch[];
  categories: Category[];
  language?: Language;
  adaptiveSettings?: Record<string, number>;
  onApplyAdaptiveSettings?: (settings: Record<string, number>) => void;
}

export default function FinancialReportsPage({
  inventory,
  salesOrders,
  purchaseOrders,
  orders,
  customers,
  varianceAnalysis,
  categories,
  batches,
  language = 'en',
  adaptiveSettings = {},
  onApplyAdaptiveSettings = () => {}
}: FinancialReportsPageProps) {
  const [period, setPeriod] = useState<'all' | 'last30' | 'q1' | 'ytd'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'pnl' | 'margins' | 'customers' | 'variance' | 'production_history' | 'valuation' | 'forecasting' | 'categories'>('pnl');
  const [sortField, setSortField] = useState<'revenue' | 'margin' | 'volume'>('revenue');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // --- Date/Period Filter Logic ---
  const currentYearPrefix = '2026';
  const currentMonthPrefix = '2026-05';

  const filteredSalesOrders = useMemo(() => {
    return salesOrders.filter(so => {
      if (period === 'last30') {
        // Fallback for mock data (include 2024-05 so initial records populate)
        return so.date.startsWith(currentMonthPrefix) || so.date.startsWith('2024-05');
      }
      if (period === 'ytd') {
        return so.date.startsWith(currentYearPrefix) || so.date.startsWith('2024');
      }
      if (period === 'q1') {
        // Simulate quarter range or mock
        return so.date.includes('-01-') || so.date.includes('-02-') || so.date.includes('-03-') || so.date.includes('-04-') || so.date.includes('-05-');
      }
      return true; // 'all'
    });
  }, [salesOrders, period]);

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(po => {
      if (period === 'last30') {
        return po.date.startsWith(currentMonthPrefix) || po.date.startsWith('2026-05') || po.date.startsWith('2024-05');
      }
      if (period === 'ytd') {
        return po.date.startsWith(currentYearPrefix) || po.date.startsWith('2026') || po.date.startsWith('2024');
      }
      if (period === 'q1') {
        return po.date.includes('-01-') || po.date.includes('-02-') || po.date.includes('-03-') || po.date.includes('-04-') || po.date.includes('-05-');
      }
      return true;
    });
  }, [purchaseOrders, period]);

  const filteredProdOrders = useMemo(() => {
    return orders.filter(o => {
      if (period === 'last30') {
        return o.date.startsWith(currentMonthPrefix) || o.date.startsWith('2026-05') || o.date.startsWith('2024-05');
      }
      if (period === 'ytd') {
        return o.date.startsWith(currentYearPrefix) || o.date.startsWith('2024');
      }
      return true;
    });
  }, [orders, period]);

  // --- Dynamic Cost Price mapping ---
  const itemCostsAndASP = useMemo(() => {
    const metricsMap = new Map<string, { costPrice: number; asp: number; volume: number; rawRevenue: number }>();

    inventory.forEach(item => {
      // Base fallback cost price (if no PO context or production context)
      let defaultCost = 100;
      if (item.id === '1') defaultCost = 135;      // Fabric (Cotton)
      else if (item.id === '2') defaultCost = 55;   // Thread
      else if (item.id === '3') defaultCost = 8;    // Buttons

      // Find all PO received items for average purchase cost
      const poItems = filteredPurchaseOrders
        .filter(po => po.status === 'received')
        .flatMap(po => po.items.filter(poi => poi.itemId === item.id));
      const totalPoQty = poItems.reduce((sum, p) => sum + p.quantity, 0);
      const totalPoAmt = poItems.reduce((sum, p) => sum + (p.quantity * p.rate), 0);
      const avgPurchaseRate = totalPoQty > 0 ? (totalPoAmt / totalPoQty) : 0;

      // Find completed manufacturing consumption logs
      const completedProds = filteredProdOrders
        .filter(o => o.status === 'completed')
        .flatMap(o => o.items.filter(oi => oi.itemId === item.id));
      const totalProdQty = completedProds.reduce((sum, p) => sum + (p.actualQty || 0), 0);
      const totalProdAmt = completedProds.reduce((sum, p) => sum + ((p.actualQty || 0) * (p.actualRate || 0)), 0);
      const avgProdRate = totalProdQty > 0 ? (totalProdAmt / totalProdQty) : 0;

      // Weighted average or fallback costing
      const costPrice = avgPurchaseRate || avgProdRate || defaultCost;

      // Sales Volume & ASP calculations
      const itemSales = filteredSalesOrders.flatMap(so => 
        so.items.filter(soi => soi.itemId === item.id).map(soi => ({
          qty: soi.quantity,
          rate: soi.rate,
          total: soi.quantity * soi.rate
        }))
      );
      const volume = itemSales.reduce((sum, s) => sum + s.qty, 0);
      const rawRevenue = itemSales.reduce((sum, s) => sum + s.total, 0);
      const asp = volume > 0 ? (rawRevenue / volume) : (item.id === '1' ? 250 : item.id === '2' ? 100 : item.id === '3' ? 15 : 180);

      metricsMap.set(item.id, { costPrice, asp, volume, rawRevenue });
    });

    return metricsMap;
  }, [inventory, filteredPurchaseOrders, filteredSalesOrders, filteredProdOrders]);

  // --- Profit and Loss Statement Calculations ---
  const pnlMetrics = useMemo(() => {
    // 1. Gross Revenue
    const grossRevenue = filteredSalesOrders.reduce((sum, so) => sum + so.totalAmount, 0);

    // 2. Cost of Goods Sold (COGS)
    let cogs = 0;
    filteredSalesOrders.forEach(so => {
      so.items.forEach(soi => {
        const itemCost = itemCostsAndASP.get(soi.itemId)?.costPrice || 100;
        cogs += (soi.quantity * itemCost);
      });
    });

    // 3. Gross Profit & Margins
    const grossProfit = Math.max(0, grossRevenue - cogs);
    const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    // 4. Operating Expenses (OPEX) - Dynamic simulation based on activities
    // Logistics: proportional to deliveries
    const deliveredCount = filteredSalesOrders.filter(so => so.status === 'delivered' || so.status === 'shipped').length;
    const logisticsExpense = deliveredCount * 450 + (grossRevenue * 0.02); // base package + percentage of volume
    
    // Warehousing storage overhead: base rent + small variable for holding active stock
    const warehousingExpense = 3500 + (inventory.reduce((sum, i) => sum + i.currentStock, 0) * 0.25);
    
    // Administrative overhead (billing, custom staff, compliance audit)
    const adminExpense = 1800 + (orders.length * 150);

    const totalOpex = logisticsExpense + warehousingExpense + adminExpense;

    // 5. Operating Profit (EBITDA)
    const operatingProfit = grossProfit - totalOpex;
    const operatingMargin = grossRevenue > 0 ? (operatingProfit / grossRevenue) * 100 : 0;

    // 6. Tax / GST Allocation (Simulated offset from invoicing taxable amounts)
    // We compute GST collected from items sales, offset by GST inputs on raw material purchases
    let gstCollected = 0;
    filteredSalesOrders.forEach(so => {
      so.items.forEach(soi => {
        const rate = inventory.find(i => i.id === soi.itemId)?.gstRate || 18;
        const lineTotal = soi.quantity * soi.rate;
        gstCollected += lineTotal * (rate / 100);
      });
    });

    let gstPaid = 0;
    filteredPurchaseOrders.forEach(po => {
      po.items.forEach(poi => {
        const rate = inventory.find(i => i.id === poi.itemId)?.gstRate || 18;
        const lineVal = poi.quantity * poi.rate;
        gstPaid += lineVal * (rate / 100);
      });
    });

    const netTaxLiability = Math.max(0, gstCollected - gstPaid);

    // 7. Net Profit & Margin
    const netProfit = operatingProfit - (netTaxLiability * 0.15); // Assume 15% state tax on operational surplus + net GST impact
    const netProfitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return {
      grossRevenue,
      cogs,
      grossProfit,
      grossMargin,
      logisticsExpense,
      warehousingExpense,
      adminExpense,
      totalOpex,
      operatingProfit,
      operatingMargin,
      gstCollected,
      gstPaid,
      netTaxLiability,
      netProfit,
      netProfitMargin
    };
  }, [filteredSalesOrders, filteredPurchaseOrders, itemCostsAndASP, inventory, orders]);

  // --- Product-level Profit Matrix ---
  const productProfitTable = useMemo(() => {
    const list = inventory.map(item => {
      const stats = itemCostsAndASP.get(item.id) || { costPrice: 100, asp: 180, volume: 0, rawRevenue: 0 };
      const revenue = stats.rawRevenue;
      const cogsVal = stats.volume * stats.costPrice;
      const profit = revenue - cogsVal;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        volume: stats.volume,
        unitCost: stats.costPrice,
        unitPrice: stats.asp,
        revenue,
        cogs: cogsVal,
        profit,
        margin
      };
    });

    // Sort
    return list.sort((a, b) => {
      if (sortField === 'revenue') {
        return sortAsc ? a.revenue - b.revenue : b.revenue - a.revenue;
      } else if (sortField === 'margin') {
        return sortAsc ? a.margin - b.margin : b.margin - a.margin;
      } else {
        return sortAsc ? a.volume - b.volume : b.volume - a.volume;
      }
    });
  }, [inventory, itemCostsAndASP, sortField, sortAsc]);

  // --- Customer Profitability Ledger ---
  const customerProfitLedger = useMemo(() => {
    return customers.map(cust => {
      // Find orders
      const custOrders = filteredSalesOrders.filter(so => so.customerId === cust.id);
      const totalSales = custOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      // Calc cumulative COGS for customer purchases
      let custCogs = 0;
      custOrders.forEach(o => {
        o.items.forEach(oi => {
          const ucp = itemCostsAndASP.get(oi.itemId)?.costPrice || 100;
          custCogs += (oi.quantity * ucp);
        });
      });

      const profit = totalSales - custCogs;
      const margin = totalSales > 0 ? (profit / totalSales) * 100 : 0;
      const orderCount = custOrders.length;

      return {
        id: cust.id,
        name: cust.name,
        email: cust.email,
        state: cust.state || 'Maharashtra',
        sales: totalSales,
        cogs: custCogs,
        profit,
        margin,
        orderCount
      };
    }).sort((a, b) => b.sales - a.sales);
  }, [customers, filteredSalesOrders, itemCostsAndASP]);

  // --- Chart Visualizer Formats ---
  const revenueVsCostChartData = useMemo(() => {
    // Generate simulated monthly progression starting from early 2026
    const months = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026'];
    
    // Scale simulation points depending on current filtered operations scale
    const baseRev = pnlMetrics.grossRevenue;
    const baseCogs = pnlMetrics.cogs;
    const baseNet = pnlMetrics.netProfit;

    return months.map((m, idx) => {
      const scaleFactor = 0.65 + (idx * 0.09); // gradual growth simulation
      const monthSales = m === 'May 2026' ? baseRev : baseRev * scaleFactor;
      const monthCogs = m === 'May 2026' ? baseCogs : baseCogs * scaleFactor;
      const opEx = (pnlMetrics.totalOpex / 5) * (0.9 + idx * 0.02);
      const monthProfit = monthSales - (monthCogs + opEx);

      return {
        month: m,
        Revenue: Math.round(monthSales),
        COGS: Math.round(monthCogs),
        'Net Profit': Math.round(monthProfit)
      };
    });
  }, [pnlMetrics]);

  const productMarginChartData = useMemo(() => {
    return productProfitTable.map(p => ({
      name: p.name.split(' ')[0],
      'Margin %': Math.round(p.margin * 10) / 10,
      'Revenue (₹)': p.revenue,
      fullName: p.name
    })).filter(p => p['Revenue (₹)'] > 0 || true);
  }, [productProfitTable]);

  const getMarginBadgeClass = (margin: number) => {
    if (margin <= 0) return 'bg-red-100 text-red-850 border-red-200';
    if (margin < 15) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (margin >= 40) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const formatCurrency = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6 text-[#1A1A1A]">
      {/* Simulation Info Warning Banner */}
      <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-3xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">FINANCIAL STATEMENTS REPORT:</span> Real-time profitability, Cost of Goods Sold (COGS), and operating margins are calculated dynamically below. Every purchase order status, manufacturing actual consumption rate, and completed sales invoice instantly updates the general ledger!
        </div>
      </div>

      {/* Header period control panel */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-gray-200 rounded-3xl p-4 gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Accounting Period:</span>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
            <button 
              onClick={() => setPeriod('all')}
              className={`px-3 py-1 text-[11px] font-bold rounded-xl transition ${period === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              All Time
            </button>
            <button 
              onClick={() => setPeriod('last30')}
              className={`px-3 py-1 text-[11px] font-bold rounded-xl transition ${period === 'last30' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              May 2026 (Live)
            </button>
            <button 
              onClick={() => setPeriod('q1')}
              className={`px-3 py-1 text-[11px] font-bold rounded-xl transition ${period === 'q1' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Q1-Q2 2026
            </button>
            <button 
              onClick={() => setPeriod('ytd')}
              className={`px-3 py-1 text-[11px] font-bold rounded-xl transition ${period === 'ytd' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Year to Date
            </button>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 w-full md:w-auto">
          <button 
            onClick={() => setActiveSubTab('pnl')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${activeSubTab === 'pnl' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Profit & Loss
          </button>
          <button 
            onClick={() => setActiveSubTab('margins')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${activeSubTab === 'margins' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <Layers className="w-3.5 h-3.5" /> Product Margins
          </button>
          <button 
            onClick={() => setActiveSubTab('customers')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${activeSubTab === 'customers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <Users className="w-3.5 h-3.5" /> Customer Value
          </button>
          <button 
            onClick={() => setActiveSubTab('variance')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${activeSubTab === 'variance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Production Variances
          </button>
          <button 
            onClick={() => setActiveSubTab('production_history')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${activeSubTab === 'production_history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <History className="w-3.5 h-3.5" /> Historical Analytics
          </button>
          <button 
            onClick={() => setActiveSubTab('valuation')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${activeSubTab === 'valuation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <Briefcase className="w-3.5 h-3.5" /> FIFO Valuation
          </button>
          <button 
            onClick={() => setActiveSubTab('forecasting')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${activeSubTab === 'forecasting' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Sales Forecasting
          </button>
          <button 
            onClick={() => setActiveSubTab('categories')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${activeSubTab === 'categories' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <Layers className="w-3.5 h-3.5" /> Category Reports
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gross Revenue</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl"><Receipt size={16} /></div>
          </div>
          <h3 className="text-2xl font-black text-slate-800">{formatCurrency(pnlMetrics.grossRevenue)}</h3>
          <p className="text-[10px] text-slate-500 font-medium">Earned across {filteredSalesOrders.length} customer sales orders</p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/10 pointer-events-none rounded-full blur-xl" />
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cost of Sales (COGS)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl"><Factory size={16} /></div>
          </div>
          <h3 className="text-2xl font-black text-slate-800">{formatCurrency(pnlMetrics.cogs)}</h3>
          <p className="text-[10px] text-slate-500 font-medium">Weighted raw material + manufacturing cost</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gross Profit Margin</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl"><Percent size={16} /></div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600">
            {Math.round(pnlMetrics.grossMargin * 10) / 10}%
          </h3>
          <div className="flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className="text-[10px] text-emerald-600 font-bold">{formatCurrency(pnlMetrics.grossProfit)} direct surplus</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Net Surplus Profit</span>
            <div className="p-2 bg-slate-55 bg-indigo-600 text-white rounded-2xl"><DollarSign size={16} /></div>
          </div>
          <h3 className={`text-2xl font-black ${pnlMetrics.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            {formatCurrency(pnlMetrics.netProfit)}
          </h3>
          <div className="flex items-center gap-1">
            <Badge className="text-[9px] font-extrabold uppercase py-0 px-2 pointer-events-none rounded-md bg-indigo-50 text-indigo-700 border-indigo-150">
              Margin {Math.round(pnlMetrics.netProfitMargin * 10) / 10}%
            </Badge>
          </div>
        </div>
      </div>

      {/* --- Tab 1: P&L Statement --- */}
      {activeSubTab === 'pnl' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detailed Statement Table Card */}
          <Card className="shadow-sm border-gray-200 lg:col-span-2 bg-white">
            <CardHeader className="border-b border-gray-50 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Income Statement (P&L Ledger)</CardTitle>
                <CardDescription className="text-xs text-slate-500">Corporate summary of income, direct cost of sales, and general operational overhead expenses.</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold font-mono">INR (₹)</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-650 w-2/3">Accounting Line Item</TableHead>
                    <TableHead className="font-bold text-xs text-slate-650 text-right">Value (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Revenue Segment */}
                  <TableRow className="bg-slate-50/20">
                    <TableCell className="font-extrabold text-xs text-slate-800 py-3 uppercase tracking-wider">I. Operating Gross Revenue</TableCell>
                    <TableCell className="font-extrabold text-xs text-slate-800 text-right py-3">{formatCurrency(pnlMetrics.grossRevenue)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/20">
                    <TableCell className="pl-6 text-xs text-slate-600">Enterprise Product Sales Invoices</TableCell>
                    <TableCell className="text-xs text-slate-600 text-right">{formatCurrency(pnlMetrics.grossRevenue)}</TableCell>
                  </TableRow>

                  {/* COGS Segment */}
                  <TableRow className="bg-slate-50/20">
                    <TableCell className="font-extrabold text-xs text-slate-800 py-3 uppercase tracking-wider">II. Cost of Goods Sold (COGS)</TableCell>
                    <TableCell className="font-extrabold text-xs text-slate-805 text-red-650 text-right py-3">-{formatCurrency(pnlMetrics.cogs)}</TableCell>
                  </TableRow>
                  {inventory.map(item => {
                    const stats = itemCostsAndASP.get(item.id) || { costPrice: 0, volume: 0 };
                    const lineCogs = stats.volume * stats.costPrice;
                    if (lineCogs === 0) return null;
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/20">
                        <TableCell className="pl-6 text-xs text-slate-500 flex items-center gap-1.5">
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                          {item.name} <span className="text-[10px] font-mono text-gray-400">({stats.volume} {item.unit} sold @ {formatCurrency(stats.costPrice)} avg cost)</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 text-right">-{formatCurrency(lineCogs)}</TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Gross Profit Surplus */}
                  <TableRow className="bg-indigo-50/20 border-t border-indigo-100">
                    <TableCell className="font-extrabold text-xs text-indigo-700 py-3 uppercase tracking-wider">III. Gross Contribution Margin surplus</TableCell>
                    <TableCell className="font-extrabold text-xs text-indigo-700 text-right py-3">{formatCurrency(pnlMetrics.grossProfit)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/20">
                    <TableCell className="pl-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Profit Ratio</TableCell>
                    <TableCell className="text-[10px] font-bold text-indigo-500 text-right">{Math.round(pnlMetrics.grossMargin * 100) / 100}%</TableCell>
                  </TableRow>

                  {/* OPEX Segment */}
                  <TableRow className="bg-slate-50/20">
                    <TableCell className="font-extrabold text-xs text-slate-800 py-3 uppercase tracking-wider">IV. Operating Indirect Expenses (OPEX)</TableCell>
                    <TableCell className="font-extrabold text-xs text-red-650 text-right py-3">-{formatCurrency(pnlMetrics.totalOpex)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/20">
                    <TableCell className="pl-6 text-xs text-slate-500 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-slate-400" /> Logistics, Freight, and Order Delivery Fullfilment
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 text-right">-{formatCurrency(pnlMetrics.logisticsExpense)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/20">
                    <TableCell className="pl-6 text-xs text-slate-500 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-slate-400" /> Storage, Real estate depot rental & physical stock holding costs
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 text-right">-{formatCurrency(pnlMetrics.warehousingExpense)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/20">
                    <TableCell className="pl-6 text-xs text-slate-500 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-slate-400" /> Administrative, Accounting tools, Compliance audits & Admin overheads
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 text-right">-{formatCurrency(pnlMetrics.adminExpense)}</TableCell>
                  </TableRow>

                  {/* Operating Surplus */}
                  <TableRow className="bg-slate-100 border-t border-slate-205">
                    <TableCell className="font-extrabold text-xs text-slate-800 py-3 uppercase tracking-wider">V. Operating Earnings (EBITDA Surplus)</TableCell>
                    <TableCell className="font-extrabold text-xs text-slate-800 text-right py-3">{formatCurrency(pnlMetrics.operatingProfit)}</TableCell>
                  </TableRow>

                  {/* Taxes and Offsets */}
                  <TableRow className="bg-slate-50/20">
                    <TableCell className="font-extrabold text-xs text-slate-850 py-3 uppercase tracking-wider">VI. Statutory Taxes & GST Balance</TableCell>
                    <TableCell className="font-extrabold text-xs text-red-600 text-right py-3">-{formatCurrency(pnlMetrics.netTaxLiability * 0.15)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/20">
                    <TableCell className="pl-6 text-xs text-slate-500">GST Output Tax Collected (Sales Liabilities)</TableCell>
                    <TableCell className="text-xs text-slate-500 text-right">+{formatCurrency(pnlMetrics.gstCollected)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/20">
                    <TableCell className="pl-6 text-xs text-slate-500">GST Input Credit Claimed (Purchases Offset)</TableCell>
                    <TableCell className="text-xs text-slate-500 text-right">-{formatCurrency(pnlMetrics.gstPaid)}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/20">
                    <TableCell className="pl-6 text-xs text-slate-500">Net Due GST Settlement Offset</TableCell>
                    <TableCell className="text-xs text-slate-500 text-right">{formatCurrency(pnlMetrics.netTaxLiability)}</TableCell>
                  </TableRow>

                  {/* Net Profit Line */}
                  <TableRow className="bg-indigo-600 border-t border-indigo-700 text-white">
                    <TableCell className="font-black text-xs py-4.5 uppercase tracking-wider pl-4 rounded-l-2xl">VII. Net surplus (Surplus Net Profit)</TableCell>
                    <TableCell className="font-black text-sm text-right py-4.5 pr-4 rounded-r-2xl">{formatCurrency(pnlMetrics.netProfit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Graphical P&L Trends Column */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="shadow-sm border-gray-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Profit Progression Trend
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Visualizing monthly Revenue vs Cost performance logic.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueVsCostChartData} margin={{ left: -10, right: 5, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" style={{ fontSize: '9px', fontWeight: 'bold' }} stroke="#94A3B8" />
                      <YAxis tickLine={false} style={{ fontSize: '9px' }} width={35} stroke="#94A3B8" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', padding: '8px', fontSize: '10px' }}
                      />
                      <Legend style={{ fontSize: '9px' }} />
                      <Area type="monotone" dataKey="Revenue" stroke="#4F46E5" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Net Profit" stroke="#10B981" fillOpacity={1} fill="url(#colorNet)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Expenses Structure breakdown card */}
            <Card className="shadow-sm border-gray-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Expenses Architecture
                </CardTitle>
                <CardDescription className="text-[10px]">Percentage distribution of indirect cost overheads.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Storage & Warehousing Rent</span>
                    <span className="text-slate-800">{formatCurrency(pnlMetrics.warehousingExpense)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(pnlMetrics.warehousingExpense / pnlMetrics.totalOpex) * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Logistics & Delivering Packages</span>
                    <span className="text-slate-800">{formatCurrency(pnlMetrics.logisticsExpense)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(pnlMetrics.logisticsExpense / pnlMetrics.totalOpex) * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Administrative Tools & Offsets</span>
                    <span className="text-slate-800">{formatCurrency(pnlMetrics.adminExpense)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${(pnlMetrics.adminExpense / pnlMetrics.totalOpex) * 100}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* --- Tab 2: Product Margins Analysis --- */}
      {activeSubTab === 'margins' && (
        <div className="space-y-6">
          <Card className="shadow-sm border-gray-200 bg-white">
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Unit Cost Price vs Sales Price Index (Margins Ledger)</CardTitle>
                <CardDescription className="text-xs text-slate-500">Fine-grained margin calculation mapping average actual procurement/manufacturing rate against final customer rate.</CardDescription>
              </div>
              
              {/* Table Sorting controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-bold">Sort By:</span>
                <select
                  className="text-xs h-8 border border-slate-200 rounded-xl bg-slate-50 font-bold px-2.5 py-0.5 cursor-pointer text-slate-700"
                  value={sortField}
                  onChange={e => setSortField(e.target.value as any)}
                >
                  <option value="revenue">Invoiced Profit (INR)</option>
                  <option value="margin">Margin Ratio (%)</option>
                  <option value="volume">Units/Qty Sold</option>
                </select>
                <button
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                  onClick={() => setSortAsc(!sortAsc)}
                  title={sortAsc ? 'Sort Descending' : 'Sort Ascending'}
                >
                  <ArrowUpRight className={`w-4 h-4 text-slate-600 transition ${sortAsc ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Product Details</TableHead>
                    <TableHead className="font-bold text-xs text-center">Volume Sold (Qty)</TableHead>
                    <TableHead className="font-bold text-xs text-right animate-pulse">Avg Cost price (CP)</TableHead>
                    <TableHead className="font-bold text-xs text-right">Avg Selling Rate (ASP)</TableHead>
                    <TableHead className="font-bold text-xs text-right">Gross revenue (₹)</TableHead>
                    <TableHead className="font-bold text-xs text-right">Goods Cost COGS (₹)</TableHead>
                    <TableHead className="font-bold text-xs text-right">Realized surplus profit (₹)</TableHead>
                    <TableHead className="font-bold text-xs text-center">Margin (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productProfitTable.map(prod => (
                    <TableRow key={prod.id} className="hover:bg-slate-50/20">
                      <TableCell className="py-3">
                        <div className="font-bold text-xs text-slate-800">{prod.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{prod.sku}</div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs text-slate-700">
                        {prod.volume} {prod.unit}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-500">
                        {formatCurrency(prod.unitCost)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-600 font-bold">
                        {formatCurrency(prod.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-700 font-medium">
                        {formatCurrency(prod.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-400 font-medium">
                        {formatCurrency(prod.cogs)}
                      </TableCell>
                      <TableCell className={`text-right text-xs font-bold ${prod.profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {formatCurrency(prod.profit)}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Badge variant="outline" className={`text-[10px] font-extrabold px-2.5 py-0.5 shadow-sm rounded-md border ${getMarginBadgeClass(prod.margin)}`}>
                          {Math.round(prod.margin * 10) / 10}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Margins distribution Recharts mapping */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm border-gray-200 bg-white md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-indigo-600" />
                  Product Margin Spread Comparison
                </CardTitle>
                <CardDescription className="text-[10px]">Realized margin ratio percentages for inventory products.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-52 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productMarginChartData} margin={{ left: -10, right: 5, top: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" style={{ fontSize: '9px', fontWeight: 'bold' }} stroke="#94A3B8" />
                      <YAxis tickLine={false} style={{ fontSize: '9px' }} width={25} stroke="#94A3B8" label={{ value: 'Margin %', angle: -90, position: 'insideLeft', style: { fontSize: '8px', fill: '#94A3B8' } }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const p = payload[0].payload;
                            return (
                              <div className="bg-slate-800 text-white p-2.5 rounded-lg text-[10px] shadow-lg border border-slate-700">
                                <p className="font-bold">{p.fullName}</p>
                                <p className="mt-1">Margin Percentage: <span className="text-emerald-400 font-bold">{p['Margin %']}%</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="Margin %" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={25}>
                        {productMarginChartData.map((entry, index) => {
                          const marginVal = entry['Margin %'];
                          const barColor = marginVal <= 15 ? '#F59E0B' : marginVal >= 40 ? '#10B981' : '#4F46E5';
                          return <Bar key={`cell-${index}`} dataKey="Margin %" fill={barColor} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 bg-white md:col-span-1">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-indigo-600" /> Margin Health Legend
                </CardTitle>
                <CardDescription className="text-[10px]">Security levels and threshold indicators.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-3 text-xs leading-relaxed">
                <div className="flex gap-2.5 items-center">
                  <div className="w-4 h-4 bg-emerald-500 rounded-md shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">Gold Star Level (Marg {'>'}= 40%)</p>
                    <p className="text-[10px] text-gray-500">Exceptional profit contributors. Standard accessories line has high margin density.</p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-center">
                  <div className="w-4 h-4 bg-indigo-600 rounded-md shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">Healthy Margin Level (15% - 39%)</p>
                    <p className="text-[10px] text-gray-500">Steady cashflow products. Core Cotton fabrics maintain solid baseline viability.</p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-center">
                  <div className="w-4 h-4 bg-amber-500 rounded-md shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">Warning Level Ratio (1% - 14%)</p>
                    <p className="text-[10px] text-gray-500">Low margins. Consider negotiating raw supplier inputs or raising wholesale list prices.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* --- Tab 3: Customer Value Analysis --- */}
      {activeSubTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="shadow-sm border-gray-200 lg:col-span-2 bg-white">
            <CardHeader className="pb-3 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Customer Value & margin contributions Ledger</CardTitle>
                <CardDescription className="text-xs text-slate-500">Lists corporate clients ranked by their dynamic purchasing revenue vs estimated fulfillment costs.</CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] font-bold bg-indigo-50 text-indigo-700 pointer-events-none rounded-md">Live Roster</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Customer Name</TableHead>
                    <TableHead className="font-bold text-xs text-center">Orders Count</TableHead>
                    <TableHead className="font-bold text-xs text-right">Invoiced Sales (₹)</TableHead>
                    <TableHead className="font-bold text-xs text-right">Est. COGS Cost (₹)</TableHead>
                    <TableHead className="font-bold text-xs text-right">Net Profit Contribution</TableHead>
                    <TableHead className="font-bold text-xs text-center">Realized Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerProfitLedger.map(cust => (
                    <TableRow key={cust.id} className="hover:bg-slate-50/20">
                      <TableCell className="py-3">
                        <div className="font-bold text-xs text-slate-800">{cust.name}</div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">{cust.email} | {cust.state}</div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-slate-600">
                        {cust.orderCount}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-semibold text-slate-800">
                        {formatCurrency(cust.sales)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-slate-400 font-medium">
                        {formatCurrency(cust.cogs)}
                      </TableCell>
                      <TableCell className={`text-right text-xs font-extrabold ${cust.profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {formatCurrency(cust.profit)}
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <Badge className={`text-[10px] font-black border rounded-md px-2.5 py-0.5 pointer-events-none ${
                          cust.margin >= 40 ? 'bg-emerald-50 text-emerald-700 border-emerald-120' : 'bg-indigo-50 text-indigo-700 border-indigo-120'
                        }`}>
                          {Math.round(cust.margin * 10) / 10}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Customer sidebar statistics */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="shadow-sm border-gray-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Wholesaler Contributions
                </CardTitle>
                <CardDescription className="text-[10px]">Revenue split among the corporate clients.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mt-2">
                  {customerProfitLedger.map((cust, idx) => {
                    const totalSalesAll = pnlMetrics.grossRevenue || 1;
                    const share = (cust.sales / totalSalesAll) * 100;

                    return (
                      <div key={cust.id} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <span className="text-[10px] text-indigo-500 font-mono">#{idx+1}</span>
                            {cust.name}
                          </span>
                          <span className="font-mono text-gray-500 text-[10px]">{Math.round(share)}% share</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 flex overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${idx === 0 ? 'bg-indigo-600' : idx === 1 ? 'bg-indigo-400' : 'bg-slate-400'}`}
                            style={{ width: `${share}%` }} 
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Sales: {formatCurrency(cust.sales)}</span>
                          <span>Profit: {formatCurrency(cust.profit)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Invoicing and payment health card */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-5 space-y-3">
              <h5 className="font-bold text-indigo-900 flex items-center gap-1 text-xs">
                <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                Customer Realized Value Guide
              </h5>
              <p className="text-[11px] text-indigo-800 leading-relaxed font-medium">
                Our inventory utilizes FIFO batch accounting. Standard finished accessories sold at retail margins generate rapid operating capital, while textiles act as steady high-volume stabilizers. 
              </p>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                Tip: Issue Sales Orders to experience responsive profitability and margin shifts!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- Tab 4: Production Variances (Original layout content) --- */}
      {activeSubTab === 'variance' && (
        <div className="space-y-6">
          <Card className="shadow-sm border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-800">Material Cost Variance Analysis</CardTitle>
              <CardDescription className="text-xs text-slate-500">Cumulative cost performance by item (Original ledger tracking).</CardDescription>
            </CardHeader>
            <CardContent>
              {varianceAnalysis.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No variance records currently established in system. Plan and complete manufacturer orders under Manufacturing Planner tab to initiate reports.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Planned Amount</TableHead>
                      <TableHead>Actual Amount</TableHead>
                      <TableHead>Variance Action</TableHead>
                      <TableHead>Performance Spread</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varianceAnalysis.map(v => (
                      <TableRow key={v.itemId}>
                        <TableCell className="font-bold text-xs text-slate-800">{v.itemName}</TableCell>
                        <TableCell className="text-xs font-mono">₹{v.plannedAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-xs font-mono">₹{v.actualAmount.toLocaleString()}</TableCell>
                        <TableCell className={`text-xs font-black ${v.variance > 0 ? "text-red-650" : "text-emerald-600"}`}>
                          {v.variance > 0 ? `+₹${v.variance.toLocaleString()}` : `-₹${Math.abs(v.variance).toLocaleString()}`}
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-slate-100 rounded-full h-2 max-w-[150px]">
                            <div 
                              className={`h-2 rounded-full ${v.variance > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${Math.min(100, (Math.abs(v.variance) / (v.plannedAmount || 1)) * 100)}%` }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Original production orders history list */}
          <Card className="shadow-sm border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-800 font-sans">Manufacturing order logs stream</CardTitle>
              <CardDescription className="text-xs text-slate-500">Continuous logs list of established production plans.</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">No manufacturing logs in system history database.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Plan ID</TableHead>
                      <TableHead>Plan Date</TableHead>
                      <TableHead>Operation Status</TableHead>
                      <TableHead>Planned Base Cost</TableHead>
                      <TableHead>Actual Final Cost</TableHead>
                      <TableHead>Cost Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(order => {
                      const planned = order.items.reduce((sum, i) => sum + (i.plannedQty * i.plannedRate), 0);
                      const actual = order.items.reduce((sum, i) => sum + ((i.actualQty || 0) * (i.actualRate || 0)), 0);
                      const variance = actual - planned;
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-bold text-xs text-slate-900">{order.id}</TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium">{order.date}</TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] font-bold py-0.5 rounded-md ${
                              order.status === 'completed' ? "bg-emerald-55 bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                            }`}>
                              {order.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-slate-700">₹{planned.toLocaleString()}</TableCell>
                          <TableCell className="text-xs font-mono text-slate-700">{order.status === 'completed' ? `₹${actual.toLocaleString()}` : '-'}</TableCell>
                          <TableCell className={`text-xs font-bold font-mono ${
                            order.status === 'completed' ? (variance > 0 ? "text-red-650" : "text-emerald-600") : "text-slate-400"
                          }`}>
                            {order.status === 'completed' ? (variance > 0 ? `+₹${variance.toLocaleString()}` : `-₹${Math.abs(variance).toLocaleString()}`) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === 'production_history' && (
        <ProductionReorderHistoryPanel 
          inventory={inventory}
          language={language}
          adaptiveSettings={adaptiveSettings}
          onApplyAdaptiveSettings={onApplyAdaptiveSettings}
        />
      )}

      {activeSubTab === 'valuation' && (
        <FifoValuationPanel 
          inventory={inventory}
          batches={batches}
          purchaseOrders={purchaseOrders}
        />
      )}

      {activeSubTab === 'forecasting' && (
        <SalesForecastingPanel 
          inventory={inventory}
          salesOrders={salesOrders}
        />
      )}

      {activeSubTab === 'categories' && (
        <CategorySalesPanel 
          inventory={inventory}
          salesOrders={salesOrders}
          categories={categories}
        />
      )}
    </div>
  );
}

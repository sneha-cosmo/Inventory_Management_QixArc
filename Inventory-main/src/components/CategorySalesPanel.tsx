import React, { useState, useMemo } from 'react';
import { 
  FolderLock, 
  Sparkles, 
  Layers, 
  HelpCircle, 
  Download, 
  Calendar, 
  TrendingUp, 
  Layers3, 
  AlertTriangle,
  Receipt,
  ShoppingBag,
  Info,
  DollarSign,
  ArrowRight,
  TrendingDown,
  CircleDot,
  Maximize2,
  PieChart as PieIcon,
  Search,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { InventoryItem, SalesOrder, Category } from '../types';

interface CategorySalesPanelProps {
  inventory: InventoryItem[];
  salesOrders: SalesOrder[];
  categories: Category[];
}

const PALETTE = ['#4F46E5', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function CategorySalesPanel({
  inventory,
  salesOrders,
  categories
}: CategorySalesPanelProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'last30' | 'q1' | 'ytd'>('all');

  // 1. Date filter function to filter SalesOrders matching chosen period
  const filteredOrders = useMemo(() => {
    const currentYearPrefix = '2026';
    const currentMonthPrefix = '2026-05';
    
    return salesOrders.filter(so => {
      if (periodFilter === 'last30') {
        return so.date.startsWith(currentMonthPrefix) || so.date.startsWith('2024-05');
      }
      if (periodFilter === 'ytd') {
        return so.date.startsWith(currentYearPrefix) || so.date.startsWith('2024');
      }
      return true; // Use 'all'
    });
  }, [salesOrders, periodFilter]);

  // 2. Map items to their category for easy lookup
  const itemIdToCategoryId = useMemo(() => {
    const map = new Map<string, string>();
    inventory.forEach(item => {
      map.set(item.id, item.categoryId || 'uncategorized');
    });
    return map;
  }, [inventory]);

  // 3. Categorywise Aggregated Calculations
  const categoryAggregates = useMemo(() => {
    const aggregates: Record<string, { revenue: number; volume: number; ordersCount: number }> = {};
    
    // Seed all categories with 0 values to ensure clean layout
    categories.forEach(cat => {
      aggregates[cat.id] = { revenue: 0, volume: 0, ordersCount: 0 };
    });
    aggregates['uncategorized'] = { revenue: 0, volume: 0, ordersCount: 0 };

    // Group sales from orders
    filteredOrders.forEach(order => {
      const orderAddedCategories = new Set<string>();
      
      order.items.forEach(it => {
        const catId = itemIdToCategoryId.get(it.itemId) || 'uncategorized';
        const lineTotal = it.quantity * it.rate;
        
        if (!aggregates[catId]) {
          aggregates[catId] = { revenue: 0, volume: 0, ordersCount: 0 };
        }
        aggregates[catId].revenue += lineTotal;
        aggregates[catId].volume += it.quantity;
        orderAddedCategories.add(catId);
      });

      // Increment raw order frequency check
      orderAddedCategories.forEach(catId => {
        aggregates[catId].ordersCount += 1;
      });
    });

    // Transform into clean list with names
    const results = Object.entries(aggregates).map(([catId, data]) => {
      const catName = catId === 'uncategorized' ? 'Uncategorized' : (categories.find(c => c.id === catId)?.name || 'Direct Miscellaneous');
      return {
        id: catId,
        name: catName,
        revenue: data.revenue,
        volume: data.volume,
        ordersCount: data.ordersCount,
        averageValuePerSale: data.ordersCount > 0 ? (data.revenue / data.ordersCount) : 0
      };
    }).filter(r => r.revenue > 0 || r.id !== 'uncategorized'); // hide uncategorized with no items

    // Sort descending by highest contribution
    return results.sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, categories, itemIdToCategoryId]);

  // 4. Overall metrics across all active categories
  const summaryMetrics = useMemo(() => {
    const totalRev = categoryAggregates.reduce((sum, c) => sum + c.revenue, 0);
    const totalVol = categoryAggregates.reduce((sum, c) => sum + c.volume, 0);
    
    // Calculate best category contribution
    const bestCategory = categoryAggregates[0] || { name: 'None', revenue: 0 };
    const percentageBest = totalRev > 0 ? ((bestCategory.revenue / totalRev) * 100).toFixed(1) : '0';

    return {
      totalRev,
      totalVol,
      bestCategory: bestCategory.name,
      percentageBest,
    };
  }, [categoryAggregates]);

  // 5. Individual Items sales performance table
  const individualItemsSales = useMemo(() => {
    const salesMap: Record<string, { itemId: string; name: string; sku: string; categoryId: string; revenue: number; volume: number; rate: number }> = {};
    
    // Seed default rates & categories
    inventory.forEach(item => {
      salesMap[item.id] = {
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        categoryId: item.categoryId || 'uncategorized',
        revenue: 0,
        volume: 0,
        rate: 150
      };
    });

    // Populate billing counts from salesOrders
    filteredOrders.forEach(order => {
      order.items.forEach(it => {
        if (salesMap[it.itemId]) {
          salesMap[it.itemId].volume += it.quantity;
          salesMap[it.itemId].revenue += (it.quantity * it.rate);
          salesMap[it.itemId].rate = it.rate;
        }
      });
    });

    const list = Object.values(salesMap);

    // Filter by selected category
    let filteredList = list;
    if (selectedCategoryId !== 'all') {
      filteredList = list.filter(item => item.categoryId === selectedCategoryId);
    }

    // Filter by Search Query
    if (searchQuery) {
      filteredList = filteredList.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filteredList.sort((a,b) => b.revenue - a.revenue);
  }, [filteredOrders, inventory, selectedCategoryId, searchQuery]);

  // 6. Alert signals for category-wise stock depletion
  const depletionAlerts = useMemo(() => {
    return categories.map(cat => {
      // Sum stock level of all items in this category
      const catItems = inventory.filter(i => i.categoryId === cat.id);
      const categoryTotalStock = catItems.reduce((sum, i) => sum + i.currentStock, 0);
      const categorySafetyLevel = catItems.reduce((sum, i) => sum + i.safetyStock, 0);
      
      // Sum sales volume for this category in filteredPeriod
      const catSales = categoryAggregates.find(a => a.id === cat.id)?.volume || 0;

      const isUnderstocked = categoryTotalStock < categorySafetyLevel;
      const isHighlyDepleted = categoryTotalStock < (catSales * 0.4); // Less than 40% of standard output pace

      return {
        id: cat.id,
        name: cat.name,
        totalStock: categoryTotalStock,
        safetyLevel: categorySafetyLevel,
        isUnderstocked,
        isHighlyDepleted,
        understockedItemsCount: catItems.filter(i => i.currentStock < i.safetyStock).length,
      };
    }).filter(a => a.isUnderstocked || a.isHighlyDepleted);
  }, [inventory, categories, categoryAggregates]);

  const handleExportCSV = () => {
    const csvHeader = 'Category ID,Category Name,Aggregate Revenue (₹),Volume Units Sold,Associated Invoices,Avg Sale Basket size (₹)\n';
    const csvRows = categoryAggregates.map(c => 
      `"${c.id}","${c.name}",${c.revenue},${c.volume},${c.ordersCount},${c.averageValuePerSale.toFixed(0)}`
    ).join('\n');
    
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Categorywise_Sales_Distribution_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-[#1E1E22]">
      
      {/* Visual Top Ribbon Intro Block */}
      <div className="bg-[#EEF2FF] border border-indigo-150 p-4 rounded-3xl flex items-start gap-3 shadow-xs">
        <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed">
          <span className="font-extrabold uppercase tracking-tight">Enterprise Category Dashboard:</span> Analyze gross revenue breakdowns, volume distributions, and itemized billing weights divided across distinct material categories. Leverage the interactive charts and stock safety ratios below to balance stock pipelines against live market demands.
        </div>
      </div>

      {/* Controller bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Category Filtration Filter</h4>
          <p className="text-[11px] text-slate-400">Evaluate financial sales contribution performance metrics</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Period selector */}
          <div className="flex flex-col gap-1 w-full sm:w-40">
            <span className="text-[9px] uppercase font-bold text-slate-400">Timeline Scope</span>
            <select
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-bold outline-hidden focus:border-indigo-500"
            >
              <option value="all">All Available Records</option>
              <option value="last30">Last 30 Days (May)</option>
              <option value="ytd">Year to Date (YTD)</option>
            </select>
          </div>

          <Button 
            onClick={handleExportCSV}
            variant="outline"
            className="h-9 px-3.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200 font-bold rounded-xl mt-4 sm:mt-0"
          >
            <Download size={13} className="mr-1.5" /> Export Category CSV Statement
          </Button>
        </div>
      </div>

      {/* KPI grid counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total revenue */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross Category Sales</span>
            <span className="text-xl font-black text-slate-900 block font-mono">₹{summaryMetrics.totalRev.toLocaleString()}</span>
            <span className="text-[9.5px] text-slate-400 block">Accumulated over designated timeline</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Receipt size={18} /></div>
        </div>

        {/* Total items volume sold */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Quantity Dispatched</span>
            <span className="text-xl font-black text-slate-900 block font-mono">{summaryMetrics.totalVol.toLocaleString()} Units</span>
            <span className="text-[9.5px] text-slate-400 block">Across all product departments</span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl"><ShoppingBag size={18} /></div>
        </div>

        {/* Best performing category */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Primary Growth Engine</span>
            <span className="text-lg font-black text-slate-900 block truncate">{summaryMetrics.bestCategory}</span>
            <span className="text-[9.5px] text-indigo-600 font-mono font-bold block bg-indigo-50 py-0.5 px-1.5 rounded-md w-fit mt-1">
              Contributed {summaryMetrics.percentageBest}% of total portfolio
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><TrendingUp size={18} /></div>
        </div>

      </div>

      {/* Interactive visual analytical layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Contribution pie chart (left 5 columns) */}
        <Card className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Share of Wallet Value</CardTitle>
            <CardDescription className="text-[11px] text-slate-400">Visual relative revenue contribution metrics per category</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64 w-full text-xs font-sans">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryAggregates}
                    dataKey="revenue"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {categoryAggregates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `₹${Number(value).toLocaleString()}`}
                    contentStyle={{ backgroundColor: '#1E293B', color: '#F1F5F9', borderRadius: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* List with clean colors */}
            <div className="space-y-2 pt-4 border-t border-slate-50">
              {categoryAggregates.map((cat, idx) => {
                const percentage = summaryMetrics.totalRev > 0 ? ((cat.revenue / summaryMetrics.totalRev) * 100).toFixed(1) : '0';
                return (
                  <div key={cat.id} className="flex justify-between items-center text-[11px]">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                      {cat.name}
                    </span>
                    <span className="font-mono text-slate-650 font-bold">
                      ₹{cat.revenue.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Volume vs Revenue group comparison bar chart (right 7 columns) */}
        <Card className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl shadow-xs">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category Velocity Mapping</CardTitle>
            <CardDescription className="text-[11px] text-slate-400">Compare sales revenue vs dispatch sales volume index per department</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-80 w-full text-xs font-sans">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryAggregates} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#4F46E5" fontSize={9} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#14B8A6" fontSize={9} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', color: '#F1F5F9', borderRadius: '12px' }}
                    formatter={(val: any, name: string) => {
                      if (name === 'revenue') return [`₹${Number(val).toLocaleString()}`, 'Total Revenue'];
                      return [`${val} units`, 'Dispatched Volume'];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  
                  <Bar yAxisId="left" dataKey="revenue" name="Category Revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={35} />
                  <Bar yAxisId="right" dataKey="volume" name="Dispatched Volume" fill="#14B8A6" radius={[6, 6, 0, 0]} maxBarSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Detailed Stock warning indicators */}
      {depletionAlerts.length > 0 && (
        <Card className="border-amber-150 bg-amber-50/20 rounded-3xl shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5Packed">
              <AlertTriangle size={15} /> Category-level Understock Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3 text-xs leading-relaxed">
            {depletionAlerts.map(alert => (
              <div key={alert.id} className="p-3 bg-white border border-amber-200/65 rounded-2xl flex flex-col justify-between shadow-xxs">
                <div className="space-y-1">
                  <span className="font-extrabold text-slate-800 font-sans block h-5">{alert.name} Stream</span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {alert.understockedItemsCount} specific items in this category currently stand below configured safety threshold margins.
                  </p>
                </div>
                
                <div className="pt-2 flex justify-between items-center border-t border-slate-50 mt-2">
                  <span className="text-[9px] font-mono text-amber-700 bg-amber-50 py-0.5 px-1.5 rounded-md font-extrabold uppercase">
                    {alert.isHighlyDepleted ? 'HIGH EXPOSURE RISK' : 'SAFETY BREACHED'}
                  </span>
                  <span className="font-bold text-slate-700 font-mono text-[10px]">
                    Stock Level: {alert.totalStock.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Item-wise Category Breakdown Table (Selected filter layout) */}
      <Card className="bg-white border border-slate-200 rounded-3xl shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-sm font-bold text-slate-800">Departmental Item Sales Grid</CardTitle>
            <CardDescription className="text-xs text-slate-500 font-normal">Select a category on the right sidebar filter to query individual item performance metrics inside that segment</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Category Select Filter */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 flex-wrap">
              <button
                onClick={() => setSelectedCategoryId('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedCategoryId === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-650'}`}
              >
                All Departments
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${selectedCategoryId === cat.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-650'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Quick SKU / Name search inside Grid */}
            <div className="relative w-full sm:w-48">
              <span className="absolute left-2.5 top-2.5 text-slate-400"><Search size={12} /></span>
              <Input 
                placeholder="Search Item or SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-[11px] rounded-lg border-gray-200 focus:border-indigo-600 bg-slate-50/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow>
                <TableHead className="font-bold text-xs">SKU</TableHead>
                <TableHead className="font-bold text-xs">Item Name</TableHead>
                <TableHead className="font-bold text-xs text-right">Items Dispatched</TableHead>
                <TableHead className="font-bold text-xs text-right">Selling Price Avg</TableHead>
                <TableHead className="font-bold text-xs text-indigo-800 text-right pr-6">Contribution Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {individualItemsSales.map(item => (
                <TableRow key={item.itemId} className="hover:bg-slate-50/20 text-xs">
                  <TableCell className="font-mono font-extrabold text-slate-800">{item.sku}</TableCell>
                  <TableCell className="font-semibold text-slate-700">{item.name}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-705 text-slate-600">{item.volume.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-600">₹{item.rate.toLocaleString()}</TableCell>
                  <TableCell className="text-right pr-6 font-black text-indigo-600 font-mono">
                    ₹{item.revenue.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {individualItemsSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-10 italic">
                    No matching item sales recorded inside the specified department parameters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}

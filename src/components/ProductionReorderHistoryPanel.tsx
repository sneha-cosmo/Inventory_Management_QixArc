import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Info, 
  Plus, 
  History, 
  Sparkles, 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle2, 
  Activity, 
  HelpCircle,
  Coins,
  ShieldCheck,
  Zap,
  Trash2,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  AreaChart
} from 'recharts';
import { InventoryItem } from '../types';
import { Language } from '../locales';

export interface ProductionHistoryRecord {
  id: string;
  date: string; // e.g. "2026-01-15"
  itemId: string;
  itemName: string;
  plannedQty: number;
  plannedRate: number;
  plannedCost: number;
  actualQty: number;
  actualRate: number;
  actualCost: number;
  variance: number; // actualCost - plannedCost
  variancePercent: number; // (variance / plannedCost) * 100
}

export interface ReorderHistoryRecord {
  id: string;
  date: string; // e.g. "2026-01-01"
  itemId: string;
  itemName: string;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  needsReorder: boolean;
  actualConsumptionObserved: number; // subsequent actual material demand observed during the lead time
  errorRate: number; // ((actualConsumptionObserved - reorderQuantity) / (reorderQuantity || 1)) * 100
}

interface ProductionReorderHistoryPanelProps {
  inventory: InventoryItem[];
  language?: Language;
  adaptiveSettings: Record<string, number>;
  onApplyAdaptiveSettings: (settings: Record<string, number>) => void;
}

// High-fidelity seeded historical production runs (Jan - May 2026)
const DEFAULT_PRODUCTION_HISTORY: ProductionHistoryRecord[] = [
  // Jan 2026
  {
    id: 'PR-202601-01',
    date: '2026-01-15',
    itemId: '1',
    itemName: 'Fabric (Cotton)',
    plannedQty: 180,
    plannedRate: 130,
    plannedCost: 23400,
    actualQty: 194,
    actualRate: 135,
    actualCost: 26190,
    variance: 2790,
    variancePercent: 11.92
  },
  {
    id: 'PR-202601-02',
    date: '2026-01-20',
    itemId: '2',
    itemName: 'Thread (Polyester)',
    plannedQty: 60,
    plannedRate: 50,
    plannedCost: 3000,
    actualQty: 64,
    actualRate: 55,
    actualCost: 3520,
    variance: 520,
    variancePercent: 17.33
  },
  {
    id: 'PR-202601-03',
    date: '2026-01-25',
    itemId: '3',
    itemName: 'Buttons (Standard)',
    plannedQty: 1000,
    plannedRate: 7,
    plannedCost: 7000,
    actualQty: 1050,
    actualRate: 8,
    actualCost: 8400,
    variance: 1400,
    variancePercent: 20.00
  },
  // Feb 2026
  {
    id: 'PR-202602-01',
    date: '2026-02-10',
    itemId: '1',
    itemName: 'Fabric (Cotton)',
    plannedQty: 150,
    plannedRate: 130,
    plannedCost: 19500,
    actualQty: 142,
    actualRate: 132,
    actualCost: 18744,
    variance: -756,
    variancePercent: -3.88
  },
  {
    id: 'PR-202602-02',
    date: '2026-02-18',
    itemId: '2',
    itemName: 'Thread (Polyester)',
    plannedQty: 50,
    plannedRate: 50,
    plannedCost: 2500,
    actualQty: 50,
    actualRate: 52,
    actualCost: 2600,
    variance: 100,
    variancePercent: 4.00
  },
  {
    id: 'PR-202602-03',
    date: '2026-02-25',
    itemId: '3',
    itemName: 'Buttons (Standard)',
    plannedQty: 800,
    plannedRate: 7,
    plannedCost: 5600,
    actualQty: 780,
    actualRate: 7.5,
    actualCost: 5850,
    variance: 250,
    variancePercent: 4.46
  },
  // Mar 2026
  {
    id: 'PR-202603-01',
    date: '2026-03-05',
    itemId: '1',
    itemName: 'Fabric (Cotton)',
    plannedQty: 220,
    plannedRate: 133,
    plannedCost: 29260,
    actualQty: 238,
    actualRate: 138,
    actualCost: 32844,
    variance: 3584,
    variancePercent: 12.25
  },
  {
    id: 'PR-202603-02',
    date: '2026-03-15',
    itemId: '2',
    itemName: 'Thread (Polyester)',
    plannedQty: 70,
    plannedRate: 55,
    plannedCost: 3850,
    actualQty: 78,
    actualRate: 55,
    actualCost: 4290,
    variance: 440,
    variancePercent: 11.43
  },
  {
    id: 'PR-202603-03',
    date: '2026-03-24',
    itemId: '3',
    itemName: 'Buttons (Standard)',
    plannedQty: 1200,
    plannedRate: 8,
    plannedCost: 9600,
    actualQty: 1180,
    actualRate: 8,
    actualCost: 9440,
    variance: -160,
    variancePercent: -1.67
  },
  // Apr 2026
  {
    id: 'PR-202604-12',
    date: '2026-04-12',
    itemId: '1',
    itemName: 'Fabric (Cotton)',
    plannedQty: 200,
    plannedRate: 135,
    plannedCost: 27000,
    actualQty: 195,
    actualRate: 134,
    actualCost: 26130,
    variance: -870,
    variancePercent: -3.22
  },
  {
    id: 'PR-202604-18',
    date: '2026-04-18',
    itemId: '2',
    itemName: 'Thread (Polyester)',
    plannedQty: 65,
    plannedRate: 55,
    plannedCost: 3575,
    actualQty: 62,
    actualRate: 54,
    actualCost: 3348,
    variance: -227,
    variancePercent: -6.35
  },
  {
    id: 'PR-202604-20',
    date: '2026-04-26',
    itemId: '3',
    itemName: 'Buttons (Standard)',
    plannedQty: 1100,
    plannedRate: 8,
    plannedCost: 8800,
    actualQty: 1150,
    actualRate: 8.2,
    actualCost: 9430,
    variance: 630,
    variancePercent: 7.16
  },
  // May 2026
  {
    id: 'PR-202605-04',
    date: '2026-05-14',
    itemId: '1',
    itemName: 'Fabric (Cotton)',
    plannedQty: 300,
    plannedRate: 135,
    plannedCost: 40500,
    actualQty: 315,
    actualRate: 136,
    actualCost: 42840,
    variance: 2340,
    variancePercent: 5.78
  },
  {
    id: 'PR-202605-18',
    date: '2026-05-18',
    itemId: '2',
    itemName: 'Thread (Polyester)',
    plannedQty: 80,
    plannedRate: 55,
    plannedCost: 4400,
    actualQty: 84,
    actualRate: 56,
    actualCost: 4704,
    variance: 304,
    variancePercent: 6.91
  },
  {
    id: 'PR-202605-24',
    date: '2026-05-24',
    itemId: '3',
    itemName: 'Buttons (Standard)',
    plannedQty: 1500,
    plannedRate: 8,
    plannedCost: 12000,
    actualQty: 1540,
    actualRate: 8.1,
    actualCost: 12474,
    variance: 474,
    variancePercent: 3.95
  }
];

// High-fidelity seeded historical reorder prediction feedback logs
const DEFAULT_REORDER_HISTORY: ReorderHistoryRecord[] = [
  // Jan 2026
  {
    id: 'RR-202601-01',
    date: '2026-01-01',
    itemId: '1',
    itemName: 'Fabric (Cotton)',
    currentStock: 250,
    reorderLevel: 350,
    reorderQuantity: 100,
    needsReorder: true,
    actualConsumptionObserved: 124,
    errorRate: 24.00
  },
  {
    id: 'RR-202601-02',
    date: '2026-01-01',
    itemId: '2',
    itemName: 'Thread (Polyester)',
    currentStock: 120,
    reorderLevel: 190,
    reorderQuantity: 70,
    needsReorder: true,
    actualConsumptionObserved: 82,
    errorRate: 17.14
  },
  // Feb 2026
  {
    id: 'RR-202602-01',
    date: '2026-02-01',
    itemId: '1',
    itemName: 'Fabric (Cotton)',
    currentStock: 120,
    reorderLevel: 350,
    reorderQuantity: 230,
    needsReorder: true,
    actualConsumptionObserved: 212,
    errorRate: -7.83
  },
  {
    id: 'RR-202602-02',
    date: '2026-02-01',
    itemId: '2',
    itemName: 'Thread (Polyester)',
    currentStock: 80,
    reorderLevel: 190,
    reorderQuantity: 110,
    needsReorder: true,
    actualConsumptionObserved: 101,
    errorRate: -8.18
  },
  // Mar 2026
  {
    id: 'RR-202603-01',
    date: '2026-03-01',
    itemId: '1',
    itemName: 'Fabric (Cotton)',
    currentStock: 180,
    reorderLevel: 375,
    reorderQuantity: 195,
    needsReorder: true,
    actualConsumptionObserved: 218,
    errorRate: 11.79
  },
  {
    id: 'RR-202603-02',
    date: '2026-03-01',
    itemId: '2',
    itemName: 'Thread (Polyester)',
    currentStock: 95,
    reorderLevel: 190,
    reorderQuantity: 95,
    needsReorder: true,
    actualConsumptionObserved: 110,
    errorRate: 15.79
  },
  // Apr 2026
  {
    id: 'RR-202604-01',
    date: '2026-04-01',
    itemId: '1',
    itemName: 'Fabric (Cotton)',
    currentStock: 210,
    reorderLevel: 375,
    reorderQuantity: 165,
    needsReorder: true,
    actualConsumptionObserved: 162,
    errorRate: -1.82
  },
  {
    id: 'RR-202604-02',
    date: '2026-04-01',
    itemId: '2',
    itemName: 'Thread (Polyester)',
    currentStock: 110,
    reorderLevel: 190,
    reorderQuantity: 80,
    needsReorder: true,
    actualConsumptionObserved: 78,
    errorRate: -2.50
  },
  // May 2026
  {
    id: 'RR-202605-01',
    date: '2026-05-01',
    itemId: '1',
    itemName: 'Fabric (Cotton)',
    currentStock: 100,
    reorderLevel: 400,
    reorderQuantity: 300,
    needsReorder: true,
    actualConsumptionObserved: 326,
    errorRate: 8.67
  },
  {
    id: 'RR-202605-02',
    date: '2026-05-01',
    itemId: '2',
    itemName: 'Thread (Polyester)',
    currentStock: 60,
    reorderLevel: 190,
    reorderQuantity: 130,
    needsReorder: true,
    actualConsumptionObserved: 136,
    errorRate: 4.62
  }
];

export default function ProductionReorderHistoryPanel({
  inventory,
  language = 'en',
  adaptiveSettings,
  onApplyAdaptiveSettings
}: ProductionReorderHistoryPanelProps) {
  // Local active panel division ('production' or 'predictions' or 'closed_loop')
  const [activeTab, setActiveTab] = useState<'production' | 'predictions' | 'adaptive'>('production');

  // Load and store historical production entries to localStorage for client-side persistence
  const [productionHistory, setProductionHistory] = useState<ProductionHistoryRecord[]>(() => {
    const saved = localStorage.getItem('inventory_production_history');
    return saved ? JSON.parse(saved) : DEFAULT_PRODUCTION_HISTORY;
  });

  const [reorderHistory, setReorderHistory] = useState<ReorderHistoryRecord[]>(() => {
    const saved = localStorage.getItem('inventory_reorder_history');
    return saved ? JSON.parse(saved) : DEFAULT_REORDER_HISTORY;
  });

  useEffect(() => {
    localStorage.setItem('inventory_production_history', JSON.stringify(productionHistory));
  }, [productionHistory]);

  useEffect(() => {
    localStorage.setItem('inventory_reorder_history', JSON.stringify(reorderHistory));
  }, [reorderHistory]);

  // Form Adding State: Production Run
  const [showAddProd, setShowAddProd] = useState(false);
  const [prodDate, setProdDate] = useState('2026-05-29');
  const [prodItemId, setProdItemId] = useState(inventory[0]?.id || '1');
  const [plannedQty, setPlannedQty] = useState('');
  const [plannedRate, setPlannedRate] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [actualRate, setActualRate] = useState('');

  // Form Adding State: Reorder Predict Record
  const [showAddPredict, setShowAddPredict] = useState(false);
  const [predictDate, setPredictDate] = useState('2026-05-29');
  const [predictItemId, setPredictItemId] = useState(inventory[0]?.id || '1');
  const [currentStock, setCurrentStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [reorderQuantity, setReorderQuantity] = useState('');
  const [actualCons, setActualCons] = useState('');

  // Item filter for details
  const [filterItemId, setFilterItemId] = useState<string>('all');

  // Reset utilities
  const handleResetData = () => {
    if (window.confirm('Are you sure you want to restore the history logs database back to its factory default prefilled historical points?')) {
      setProductionHistory(DEFAULT_PRODUCTION_HISTORY);
      setReorderHistory(DEFAULT_REORDER_HISTORY);
      onApplyAdaptiveSettings({});
    }
  };

  // Add Production Run Handler
  const handleAddProductionRun = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === prodItemId);
    if (!item) return;

    const pq = Number(plannedQty);
    const pr = Number(plannedRate);
    const aq = Number(actualQty);
    const ar = Number(actualRate);

    if (isNaN(pq) || isNaN(pr) || isNaN(aq) || isNaN(ar) || pq <= 0 || pr <= 0 || aq <= 0 || ar <= 0) {
      alert('Please provide valid positive numbers for quantities and rates.');
      return;
    }

    const plannedCost = pq * pr;
    const actualCost = aq * ar;
    const variance = actualCost - plannedCost;
    const variancePercent = (variance / plannedCost) * 100;

    const newRecord: ProductionHistoryRecord = {
      id: `PR-${Date.now()}`,
      date: prodDate,
      itemId: prodItemId,
      itemName: item.name,
      plannedQty: pq,
      plannedRate: pr,
      plannedCost,
      actualQty: aq,
      actualRate: ar,
      actualCost,
      variance,
      variancePercent: parseFloat(variancePercent.toFixed(2))
    };

    setProductionHistory([newRecord, ...productionHistory]);
    setShowAddProd(false);
    
    // Clear fields
    setPlannedQty('');
    setPlannedRate('');
    setActualQty('');
    setActualRate('');
  };

  // Add Reorder Prediction Feedback handler
  const handleAddReorderRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === predictItemId);
    if (!item) return;

    const cs = Number(currentStock);
    const rl = Number(reorderLevel);
    const rq = Number(reorderQuantity);
    const ac = Number(actualCons);

    if (isNaN(cs) || isNaN(rl) || isNaN(rq) || isNaN(ac) || cs < 0 || rl <= 0 || rq < 0 || ac < 0) {
      alert('Please provide valid positive numerical values.');
      return;
    }

    const errorRate = ((ac - rq) / (rq || 1)) * 100;

    const newRecord: ReorderHistoryRecord = {
      id: `RR-${Date.now()}`,
      date: predictDate,
      itemId: predictItemId,
      itemName: item.name,
      currentStock: cs,
      reorderLevel: rl,
      reorderQuantity: rq,
      needsReorder: cs < rl,
      actualConsumptionObserved: ac,
      errorRate: parseFloat(errorRate.toFixed(2))
    };

    setReorderHistory([newRecord, ...reorderHistory]);
    setShowAddPredict(false);

    // Clear fields
    setCurrentStock('');
    setReorderLevel('');
    setReorderQuantity('');
    setActualCons('');
  };

  const handleDeleteProductionRun = (id: string) => {
    setProductionHistory(productionHistory.filter(r => r.id !== id));
  };

  const handleDeleteReorderRecord = (id: string) => {
    setReorderHistory(reorderHistory.filter(r => r.id !== id));
  };


  // ==========================================
  // MATHEMATICAL ANALYSIS & STATS ENGINES
  // ==========================================

  // Filter history based on selected filterItemId
  const filteredProdHistoryList = useMemo(() => {
    return productionHistory.filter(r => filterItemId === 'all' || r.itemId === filterItemId);
  }, [productionHistory, filterItemId]);

  const filteredReorderHistoryList = useMemo(() => {
    return reorderHistory.filter(r => filterItemId === 'all' || r.itemId === filterItemId);
  }, [reorderHistory, filterItemId]);

  // Calculations for production cost trends
  const productionSummaryStats = useMemo(() => {
    let totalPlanned = 0;
    let totalActual = 0;
    let overrunCount = 0;
    let savingsCount = 0;

    filteredProdHistoryList.forEach(r => {
      totalPlanned += r.plannedCost;
      totalActual += r.actualCost;
      if (r.variance > 0) overrunCount++;
      else if (r.variance < 0) savingsCount++;
    });

    const netVariance = totalActual - totalPlanned;
    const avgVariancePct = filteredProdHistoryList.length > 0 
      ? (filteredProdHistoryList.reduce((sum, r) => sum + r.variancePercent, 0) / filteredProdHistoryList.length)
      : 0;

    return {
      totalPlanned,
      totalActual,
      netVariance,
      avgVariancePct,
      overrunCount,
      savingsCount,
      runsCount: filteredProdHistoryList.length
    };
  }, [filteredProdHistoryList]);

  // Calculations for average variance split by item
  const averageVariancesByItem = useMemo(() => {
    const map: Record<string, { id: string; name: string; sumVariance: number; sumPlanned: number; count: number }> = {};
    
    productionHistory.forEach(r => {
      if (!map[r.itemId]) {
        map[r.itemId] = { id: r.itemId, name: r.itemName, sumVariance: 0, sumPlanned: 0, count: 0 };
      }
      map[r.itemId].sumVariance += r.variance;
      map[r.itemId].sumPlanned += r.plannedCost;
      map[r.itemId].count += 1;
    });

    return Object.values(map).map(item => {
      const averageVariance = item.sumVariance / (item.count || 1);
      const averageVariancePct = item.sumPlanned > 0 ? (item.sumVariance / item.sumPlanned) * 100 : 0;
      return {
        id: item.id,
        name: item.name,
        avgVariance: parseFloat(averageVariance.toFixed(1)),
        avgVariancePct: parseFloat(averageVariancePct.toFixed(1)),
        count: item.count
      };
    });
  }, [productionHistory]);

  // Grouped monthly chart data for Production Planned vs Actual Costs
  const monthlyProductionChartData = useMemo(() => {
    const monthsGroup: Record<string, { month: string; planned: number; actual: number; variance: number }> = {};
    const monthsMap: Record<string, string> = {
      '01': 'Jan 2026',
      '02': 'Feb 2026',
      '03': 'Mar 2026',
      '04': 'Apr 2026',
      '05': 'May 2026',
      '06': 'Jun 2026'
    };

    filteredProdHistoryList.forEach(r => {
      const monthCode = r.date.substring(5, 7);
      const monthLabel = monthsMap[monthCode] || r.date.substring(0, 7);
      
      if (!monthsGroup[monthLabel]) {
        monthsGroup[monthLabel] = { month: monthLabel, planned: 0, actual: 0, variance: 0 };
      }
      monthsGroup[monthLabel].planned += r.plannedCost;
      monthsGroup[monthLabel].actual += r.actualCost;
      monthsGroup[monthLabel].variance += r.variance;
    });

    return Object.values(monthsGroup).sort((a,b) => a.month.localeCompare(b.month));
  }, [filteredProdHistoryList]);

  // Calculations for Reorder Prediction quality
  const predictionAccuracyStats = useMemo(() => {
    let sumAbsoluteError = 0;
    let sumError = 0; // for bias (positive means under-predicted, negative means over-predicted)
    let totalPredictionsValue = 0;
    let totalActualsValue = 0;
    let underPredictedCount = 0;
    let overPredictedCount = 0;

    filteredReorderHistoryList.forEach(r => {
      const absoluteError = Math.abs(r.actualConsumptionObserved - r.reorderQuantity);
      sumAbsoluteError += absoluteError;
      sumError += (r.actualConsumptionObserved - r.reorderQuantity);
      totalPredictionsValue += r.reorderQuantity;
      totalActualsValue += r.actualConsumptionObserved;

      if (r.actualConsumptionObserved > r.reorderQuantity) {
        underPredictedCount++; // observed consumption exceeded reorder amount
      } else if (r.actualConsumptionObserved < r.reorderQuantity) {
        overPredictedCount++; // over-ordered
      }
    });

    const n = filteredReorderHistoryList.length;
    const meanAbsoluteError = n > 0 ? (sumAbsoluteError / n) : 0;
    const trackingSignalBias = n > 0 ? (sumError / n) : 0; // Average bias
    
    // Weighted absolute error percent
    const maePercentageOfAvgDemand = totalActualsValue > 0 
      ? (sumAbsoluteError / totalActualsValue) * 100 
      : 0;

    const overallAccuracyPercent = Math.max(0, 100 - maePercentageOfAvgDemand);

    return {
      n,
      meanAbsoluteError: parseFloat(meanAbsoluteError.toFixed(1)),
      trackingSignalBias: parseFloat(trackingSignalBias.toFixed(1)),
      overallAccuracyPercent: parseFloat(overallAccuracyPercent.toFixed(1)),
      underPredictedCount,
      overPredictedCount
    };
  }, [filteredReorderHistoryList]);

  // Grouped monthly chart data for Reorders Forecast vs Actuals Consumption
  const reorderChartData = useMemo(() => {
    return filteredReorderHistoryList.map(r => ({
      date: r.date,
      itemName: r.itemName,
      predicted: r.reorderQuantity,
      actual: r.actualConsumptionObserved,
      error: r.actualConsumptionObserved - r.reorderQuantity
    })).sort((a,b) => a.date.localeCompare(b.date));
  }, [filteredReorderHistoryList]);


  // ==========================================
  // CLOSED-LOOP SYSTEM: PREDICTION ADAPTER
  // ==========================================

  // Calibrate safety stock modifiers dynamically:
  // This calculates recommendation multipliers for safety stock.
  // Formula: If average prediction under-predicts demand, increase Safety Stock by the under-prediction percentage
  // to serve as a security buffer!
  const calculatedAdaptiveModifiers = useMemo<Record<string, { recommendedMultiplier: number; reason: string; avgUnderPrediction: number }>>(() => {
    const itemsModifiers: Record<string, { recommendedMultiplier: number; reason: string; avgUnderPrediction: number }> = {};
    const groupedDemands: Record<string, { sumError: number; sumPredicted: number; underPredicts: number; totalRuns: number }> = {};

    reorderHistory.forEach(r => {
      if (!groupedDemands[r.itemId]) {
        groupedDemands[r.itemId] = { sumError: 0, sumPredicted: 0, underPredicts: 0, totalRuns: 0 };
      }
      const errorVal = r.actualConsumptionObserved - r.reorderQuantity; 
      groupedDemands[r.itemId].sumError += errorVal;
      groupedDemands[r.itemId].sumPredicted += r.reorderQuantity;
      groupedDemands[r.itemId].totalRuns += 1;
      if (errorVal > 0) {
        groupedDemands[r.itemId].underPredicts += 1;
      }
    });

    inventory.forEach(item => {
      const stats = groupedDemands[item.id];
      if (stats && stats.totalRuns > 0) {
        const netUnderRatio = stats.sumError / (stats.sumPredicted || 1);
        const underRatioPercent = parseFloat((netUnderRatio * 100).toFixed(1));
        const underPercentOfRuns = (stats.underPredicts / stats.totalRuns) * 100;

        // If the system has historically under-predicted demand on average, recommend a buffer modifier
        if (netUnderRatio > 0.02) {
          // Boost safety stock proportionally to buffer against the average deficit
          // e.g. If cotton was under-predicted by 15% on average, safety stock should be boosted by +15% (1.15x)
          const multiplier = parseFloat((1 + netUnderRatio).toFixed(2));
          itemsModifiers[item.id] = {
            recommendedMultiplier: Math.min(1.5, Math.max(1.05, multiplier)),
            reason: `Under-predicted in ${parseFloat(underPercentOfRuns.toFixed(0))}% of past cycles (deficits averaged +${underRatioPercent}% of orders)`,
            avgUnderPrediction: underRatioPercent
          };
        } else {
          itemsModifiers[item.id] = {
            recommendedMultiplier: 1.0,
            reason: 'Past prediction levels are historically safe or conservative.',
            avgUnderPrediction: 0
          };
        }
      } else {
        itemsModifiers[item.id] = {
          recommendedMultiplier: 1.0,
          reason: 'Insufficient past reorder telemetry to calibrate feedback loop.',
          avgUnderPrediction: 0
        };
      }
    });

    return itemsModifiers;
  }, [reorderHistory, inventory]);

  const activeAdaptiveModifiersCount = useMemo(() => {
    return Object.values(adaptiveSettings).filter(val => val > 1.0).length;
  }, [adaptiveSettings]);

  const toggleAdaptiveSettings = () => {
    if (activeAdaptiveModifiersCount > 0) {
      // Clear settings
      onApplyAdaptiveSettings({});
    } else {
      // Apply recommended settings
      const settingsToApply: Record<string, number> = {};
      Object.entries(calculatedAdaptiveModifiers).forEach(([itemId, data]) => {
        const itemData = data as any;
        if (itemData && itemData.recommendedMultiplier > 1.0) {
          settingsToApply[itemId] = itemData.recommendedMultiplier;
        }
      });
      onApplyAdaptiveSettings(settingsToApply);
    }
  };


  return (
    <div className="space-y-6 text-[#1A1A1A]">
      
      {/* Smart diagnostic advice banner */}
      <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <History className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              Closed-Loop Historical Analytics Hub
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-extrabold uppercase py-0 active-none select-none">
                Live Optimizer Loaded
              </Badge>
            </h5>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-3xl">
              Compare forecasted costs against actual production receipts to isolate variances and measure reorder prediction accuracies. Calibrate safety stock models dynamically based on actual historic consumption errors to mitigate stockout risks.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
          <Button 
            onClick={handleResetData}
            variant="outline" 
            size="xs"
            className="text-[10px] h-8.5 font-bold text-slate-500 border-slate-200 hover:bg-slate-55 rounded-xl cursor-pointer"
          >
            <RotateCcw size={12} className="mr-1" /> Factory Reset Logs
          </Button>
        </div>
      </div>

      {/* Main filter, layout tabs, actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-gray-200 rounded-3xl p-4 gap-4 shadow-sm">
        
        {/* Item filter select */}
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider select-none">Filtered Product:</span>
          <select
            value={filterItemId}
            onChange={(e) => setFilterItemId(e.target.value)}
            className="text-xs h-8.5 border border-slate-200 bg-slate-50 font-bold px-3 py-1 cursor-pointer text-slate-700 rounded-xl outline-hidden focus:border-indigo-500 transition-all font-sans"
          >
            <option value="all">All Raw Materials</option>
            {inventory.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        {/* Local segment navigation tabs */}
        <div className="flex bg-slate-100 p-0.5 rounded-2xl border border-slate-200/50 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('production')}
            className={`flex-1 md:flex-initial px-4.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'production' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <Coins className="w-3.5 h-3.5" /> Production Runs Costing
          </button>
          
          <button 
            onClick={() => setActiveTab('predictions')}
            className={`flex-1 md:flex-initial px-4.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'predictions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Reorder Fit & Errors
          </button>
          
          <button 
            onClick={() => setActiveTab('adaptive')}
            className={`flex-1 md:flex-initial px-4.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'adaptive' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            <Zap className="w-3.5 h-3.5 animate-pulse text-amber-500" /> Closed-Loop Optimizer
            {activeAdaptiveModifiersCount > 0 && (
              <span className="bg-amber-500 text-white font-mono font-black text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full">
                {activeAdaptiveModifiersCount}
              </span>
            )}
          </button>
        </div>
      </div>


      {/* ========================================================
          PANEL 1: PRODUCTION RUNS COSTING HISTORICAL ANALYTICS
          ======================================================== */}
      {activeTab === 'production' && (
        <div className="space-y-6">
          
          {/* Production KPI statistics bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Historical Runs</span>
              <h3 className="text-2xl font-black text-slate-800">{productionSummaryStats.runsCount} Jobs</h3>
              <p className="text-[10px] text-slate-500 font-medium">Recorded production cycles</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Cumulative Planned Budget</span>
              <h3 className="text-2xl font-black text-slate-800 font-mono">₹{productionSummaryStats.totalPlanned.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-500 font-medium">Forecasted base raw cost valuation</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Net Cash Cost Variance</span>
              <h3 className={`text-2xl font-black font-mono ${productionSummaryStats.netVariance > 0 ? 'text-red-650' : 'text-emerald-600'}`}>
                {productionSummaryStats.netVariance > 0 ? '+' : ''}₹{productionSummaryStats.netVariance.toLocaleString()}
              </h3>
              <div className="flex items-center gap-1">
                {productionSummaryStats.netVariance > 0 ? (
                  <>
                    <TrendingUp size={12} className="text-red-500" />
                    <span className="text-[10px] text-red-600 font-bold">{productionSummaryStats.overrunCount} cycles overrun spending budget</span>
                  </>
                ) : (
                  <>
                    <TrendingDown size={12} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-bold">Under planned cost by efficiency gain</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Avg Variance Ratio</span>
              <h3 className={`text-2xl font-black ${productionSummaryStats.avgVariancePct > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {productionSummaryStats.avgVariancePct > 0 ? '+' : ''}{productionSummaryStats.avgVariancePct.toFixed(1)}%
              </h3>
              <p className="text-[10px] text-zinc-500 font-medium">
                Average deviation per run from base target cost
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart: Planned vs Actual Costs timeline */}
            <Card className="shadow-sm border-gray-200 bg-white lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Planned vs. Actual Costs Progression (INR)
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Comparing budgeted base material values with real-world recorded procurement totals over time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full mt-2 text-xs">
                  {monthlyProductionChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">No production logs found for selected filters.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyProductionChartData} margin={{ left: -10, right: 5, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="month" style={{ fontSize: '9px', fontWeight: 'bold' }} stroke="#94A3B8" />
                        <YAxis tickLine={false} style={{ fontSize: '9px' }} width={45} stroke="#94A3B8" tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="variance" name="Cash Variance (Diff)" fill="#EEF2F6" radius={[4, 4, 0, 0]} barSize={35}>
                          {monthlyProductionChartData.map((entry, index) => {
                            const isOverrun = entry.variance > 0;
                            return <Bar key={`cell-${index}`} dataKey="variance" fill={isOverrun ? '#FEE2E2' : '#D1FAE5'} />;
                          })}
                        </Bar>
                        <Line type="monotone" dataKey="planned" name="Planned Cost Budget" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="actual" name="Actual Cost Incurred" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6 lg:col-span-1">
              
              {/* Item-wise Average Variance Bar Chart */}
              <Card className="shadow-sm border-gray-200 bg-white">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Percent className="w-4 h-4 text-indigo-600" />
                    Mean cost overruns (%) by item
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    Which materials deviate most from baseline budget plans?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-44 w-full mt-2 text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={averageVariancesByItem} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                        <XAxis type="number" style={{ fontSize: '8px' }} stroke="#94A3B8" tickFormatter={(tick) => `${tick}%`} />
                        <YAxis dataKey="name" type="category" style={{ fontSize: '8px', fontWeight: 'bold' }} width={80} stroke="#94A3B8" />
                        <Tooltip formatter={(value) => [`${value}% override`, 'Avg Variance']} />
                        <Bar dataKey="avgVariancePct" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={14}>
                          {averageVariancesByItem.map((entry, index) => {
                            const isLoss = entry.avgVariancePct > 0;
                            return <Bar key={`cell-${index}`} dataKey="avgVariancePct" fill={isLoss ? '#EF4444' : '#10B981'} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-[9px] text-slate-500 leading-relaxed font-medium mt-1">
                    Red indicators represents cost overruns. Cotton Fabrics currently average an inflation exposure of <span className="font-bold text-red-500">+11.9%</span> over planned baseline budgets.
                  </div>
                </CardContent>
              </Card>

              {/* Add production run button/form trigger */}
              <Card className="shadow-sm border-gray-200 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Manual Log System</span>
                    <Button 
                      onClick={() => setShowAddProd(!showAddProd)}
                      size="xs" 
                      className="px-2 h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100 cursor-pointer"
                    >
                      <Plus size={10} className="mr-0.5" /> {showAddProd ? 'Close Form' : 'Log Production'}
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-[10px]">Add custom historical results manually into standard general ledger.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {showAddProd && (
                    <form onSubmit={handleAddProductionRun} className="space-y-3.5 pt-2 text-xs">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Run Date</Label>
                          <Input 
                            type="date" 
                            value={prodDate} 
                            onChange={(e) => setProdDate(e.target.value)} 
                            className="h-8.5 text-xs text-slate-700 rounded-lg" 
                            required 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Material SKU</Label>
                          <select
                            value={prodItemId}
                            onChange={(e) => setProdItemId(e.target.value)}
                            className="w-full h-8.5 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs text-slate-700 rounded-lg outline-hidden"
                          >
                            {inventory.map(i => (
                              <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Planned Qty</Label>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="150" 
                            value={plannedQty} 
                            onChange={(e) => setPlannedQty(e.target.value)} 
                            className="h-8.5 text-xs" 
                            required 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Planned Rate (₹)</Label>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="130" 
                            value={plannedRate} 
                            onChange={(e) => setPlannedRate(e.target.value)} 
                            className="h-8.5 text-xs" 
                            required 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Actual Qty consumed</Label>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="162" 
                            value={actualQty} 
                            onChange={(e) => setActualQty(e.target.value)} 
                            className="h-8.5 text-xs" 
                            required 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Actual Rate paid (₹)</Label>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="135" 
                            value={actualRate} 
                            onChange={(e) => setActualRate(e.target.value)} 
                            className="h-8.5 text-xs" 
                            required 
                          />
                        </div>
                      </div>

                      <Button type="submit" size="xs" className="w-full h-8.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer">
                        Save Costing Run
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

            </div>

          </div>

          {/* Historical Production Jobs list table */}
          <Card className="shadow-sm border-gray-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-50 flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Historical Costing runs Database</CardTitle>
                <CardDescription className="text-xs text-slate-500">Exhaustive ledger of past completed production cost statements.</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">Total Records: {filteredProdHistoryList.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {filteredProdHistoryList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">No historical jobs registered match selected item.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs pl-6">Job ID / Date</TableHead>
                      <TableHead className="font-bold text-xs">Material Description</TableHead>
                      <TableHead className="font-bold text-xs text-right">Planned Formula</TableHead>
                      <TableHead className="font-bold text-xs text-right">Actual Cost</TableHead>
                      <TableHead className="font-bold text-xs text-right animate-pulse">Variance Incurred</TableHead>
                      <TableHead className="font-bold text-xs text-center">Invoiced Delta %</TableHead>
                      <TableHead className="font-bold text-xs text-center pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdHistoryList.map(item => (
                      <TableRow key={item.id} className="hover:bg-slate-50/20 text-xs">
                        <TableCell className="pl-6 py-3 font-semibold">
                          <div className="text-slate-800 font-mono text-[10px]">{item.id}</div>
                          <div className="text-[10px] text-gray-400 font-medium">{item.date}</div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-750">{item.itemName}</TableCell>
                        <TableCell className="text-right text-slate-500 font-mono">
                          <div>₹{item.plannedCost.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400">({item.plannedQty} units @ ₹{item.plannedRate})</div>
                        </TableCell>
                        <TableCell className="text-right text-slate-800 font-mono font-bold">
                          <div>₹{item.actualCost.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400">({item.actualQty} units @ ₹{item.actualRate})</div>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-black ${item.variance > 0 ? 'text-red-650' : 'text-emerald-600'}`}>
                          {item.variance > 0 ? `+₹${item.variance.toLocaleString()}` : `-₹${Math.abs(item.variance).toLocaleString()}`}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <Badge className={`text-[10px] font-bold py-0 rounded-md border ${
                            item.variance > 0 
                              ? 'bg-red-50 text-red-700 border-red-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {item.variance > 0 ? '+' : ''}{item.variancePercent}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          <Button 
                            onClick={() => handleDeleteProductionRun(item.id)}
                            variant="outline" 
                            size="xs"
                            className="p-1 h-7 text-red-500 border-red-100 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Delete historic record"
                          >
                            <Trash2 size={12} />
                          </Button>
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


      {/* ========================================================
          PANEL 2: REORDER HISTORICAL FIT & ACCURACY telemetries
          ======================================================== */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Evaluated Cycles</span>
              <h3 className="text-2xl font-black text-slate-800">{predictionAccuracyStats.n} Reorders</h3>
              <p className="text-[10px] text-slate-500 font-medium">Historical predictions back-tested</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Core Prediction Fit Accuracy</span>
              <h3 className="text-2xl font-black text-emerald-600 font-sans">{predictionAccuracyStats.overallAccuracyPercent}%</h3>
              <p className="text-[10px] text-slate-500 font-medium">Unified Mean Absolute Fit score</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Mean Absolute Error (MAE)</span>
              <h3 className="text-2xl font-black text-indigo-600 font-mono">{predictionAccuracyStats.meanAbsoluteError} units</h3>
              <p className="text-[10px] text-slate-500 font-medium">Average distance from subsequent actuals</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Forecasting Bias Index</span>
              <h3 className={`text-2xl font-black ${predictionAccuracyStats.trackingSignalBias > 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {predictionAccuracyStats.trackingSignalBias > 0 ? `+${predictionAccuracyStats.trackingSignalBias}` : predictionAccuracyStats.trackingSignalBias}
              </h3>
              <div className="flex items-center gap-1">
                {predictionAccuracyStats.trackingSignalBias > 1 ? (
                  <>
                    <TrendingUp size={12} className="text-amber-500 animate-bounce" />
                    <span className="text-[10px] text-amber-700 font-bold">Historically Under-ordering (Stockout Risk)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-bold">Safe stable bias balance (conservative stock)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Under prediction warning block */}
          {predictionAccuracyStats.underPredictedCount > predictionAccuracyStats.overPredictedCount && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-extrabold">SYSTEMIC UNDER-ORDERING RISK DETECTED:</span> Historical analysis shows past reorder predictions under-estimated actual material needs significantly (<span className="font-bold text-red-650">{predictionAccuracyStats.underPredictedCount} out of {predictionAccuracyStats.n}</span> evaluated cycles). The factory is exposed to production downtime and sudden supplier delays. Adjust safety stock margins instantly in the <span className="underline font-bold cursor-pointer" onClick={() => setActiveTab('adaptive')}>Closed-Loop Optimizer tab</span>.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart: Reorders Forecast vs Actuals observed */}
            <Card className="shadow-sm border-gray-200 bg-white lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Forecasted Reorder Qty vs subsequent actual Consumption
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Did predicted reorder parameters fulfill actual material volume demand subsequently drawn in lead times?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full mt-2 text-xs">
                  {reorderChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">No predictions feedback logs found for selected filter constraints.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reorderChartData} margin={{ left: -10, right: 5, top: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="date" style={{ fontSize: '9px', fontWeight: 'bold' }} stroke="#94A3B8" />
                        <YAxis tickLine={false} style={{ fontSize: '9px' }} width={35} stroke="#94A3B8" />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="predicted" name="Predicted Reorder levels" fill="#99F6E4" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Bar dataKey="actual" name="Actual Consumption Drawn" fill="#818CF8" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6 lg:col-span-1">
              
              {/* Prediction accuracy details card */}
              <Card className="shadow-sm border-gray-200 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Accuracy Diagnostics
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    Understanding forecasting fit diagnostics.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-1 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                    <span className="text-slate-500 font-medium">Evaluated Datapoints:</span>
                    <span className="font-bold text-slate-800">{predictionAccuracyStats.n} records</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                    <span className="text-slate-500 font-medium">Under-predicted occurrences:</span>
                    <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">{predictionAccuracyStats.underPredictedCount} runs</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                    <span className="text-slate-500 font-medium">Over-predicted occurrences:</span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">{predictionAccuracyStats.overPredictedCount} runs</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100">
                    <span className="text-slate-500 font-medium">Systemic Order Deficit:</span>
                    <span className="font-black text-red-650 font-mono">
                      {predictionAccuracyStats.trackingSignalBias > 0 ? `Avg deficit +${predictionAccuracyStats.trackingSignalBias}` : '0 deficit'} units
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-500 font-medium">Average demand distance error:</span>
                    <span className="font-bold text-slate-705 font-mono">{predictionAccuracyStats.meanAbsoluteError} units mae</span>
                  </div>
                </CardContent>
              </Card>

              {/* Add prediction record form */}
              <Card className="shadow-sm border-gray-200 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Add Predict Record</span>
                    <Button 
                      onClick={() => setShowAddPredict(!showAddPredict)}
                      size="xs" 
                      className="px-2 h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100 cursor-pointer"
                    >
                      <Plus size={10} className="mr-0.5" /> {showAddPredict ? 'Close Form' : 'Log Feedback'}
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-[10px]">Audit past predictions accuracy manually for quality checks.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {showAddPredict && (
                    <form onSubmit={handleAddReorderRecord} className="space-y-3.5 pt-2 text-xs">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">Predict Date</Label>
                          <Input 
                            type="date" 
                            value={predictDate} 
                            onChange={(e) => setPredictDate(e.target.value)} 
                            className="h-8.5 text-xs text-slate-705" 
                            required 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-450 uppercase">Item Sku</Label>
                          <select
                            value={predictItemId}
                            onChange={(e) => setPredictItemId(e.target.value)}
                            className="w-full h-8.5 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs text-slate-700 outline-hidden"
                          >
                            {inventory.map(i => (
                              <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-slate-400 uppercase">Stock</Label>
                          <Input type="number" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} className="h-8 py-0 px-2 text-xs" required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-slate-400 uppercase font-sans">ReorderLvl</Label>
                          <Input type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="h-8 py-0 px-2 text-xs" required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-slate-400 uppercase font-sans">Predicted Reorder</Label>
                          <Input type="number" value={reorderQuantity} onChange={(e) => setReorderQuantity(e.target.value)} className="h-8 py-0 px-2 text-xs" required />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-indigo-900 uppercase">Actual subsequent Consumption observed</Label>
                        <Input 
                          type="number" 
                          placeholder="What was consumed in subsequent cycle" 
                          value={actualCons} 
                          onChange={(e) => setActualCons(e.target.value)} 
                          className="h-8.5 text-xs border-indigo-250 font-bold" 
                          required 
                        />
                      </div>

                      <Button type="submit" size="xs" className="w-full h-8.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer">
                        Save Accuracy Audit
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

            </div>

          </div>

          {/* Table: Reorders history records list */}
          <Card className="shadow-sm border-gray-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-50 flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Historical Reorders & Accuracy logs</CardTitle>
                <CardDescription className="text-xs text-slate-500 font-sans">Back-testing accuracy profiles of predictions compiled.</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">Evaluations: {filteredReorderHistoryList.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {filteredReorderHistoryList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">No reorders history logged.</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-xs pl-6">ID / Month</TableHead>
                      <TableHead className="font-bold text-xs">Product Details</TableHead>
                      <TableHead className="font-bold text-xs text-right">Stock At Order Time</TableHead>
                      <TableHead className="font-bold text-xs text-right">Predicted Reorder Qty</TableHead>
                      <TableHead className="font-bold text-xs text-right">Actual material Consumption observed</TableHead>
                      <TableHead className="font-bold text-xs text-center">Prediction Error Delta %</TableHead>
                      <TableHead className="font-bold text-xs text-center pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReorderHistoryList.map(record => (
                      <TableRow key={record.id} className="hover:bg-slate-50/20 text-xs">
                        <TableCell className="pl-6 py-3 font-semibold">
                          <div className="text-slate-800 font-mono text-[10px]">{record.id}</div>
                          <div className="text-[10px] text-gray-400 font-medium">{record.date}</div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-750">{record.itemName}</TableCell>
                        <TableCell className="text-right text-slate-500 font-mono">
                          <div>{record.currentStock} units</div>
                          <div className="text-[10px] text-gray-400">(Reorder trigger level: {record.reorderLevel})</div>
                        </TableCell>
                        <TableCell className="text-right text-indigo-600 font-bold font-mono">
                          {record.reorderQuantity} units
                        </TableCell>
                        <TableCell className="text-right text-slate-800 font-bold font-mono">
                          {record.actualConsumptionObserved} units
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <Badge className={`text-[10px] font-bold py-0.5 rounded-md border ${
                            record.errorRate === 0 
                              ? 'bg-slate-50 text-slate-700 border-slate-205' 
                              : record.errorRate > 0 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {record.errorRate > 0 ? 'Under-predicted ' : 'Over-ordered '} 
                            {Math.abs(record.errorRate)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          <Button 
                            onClick={() => handleDeleteReorderRecord(record.id)}
                            variant="outline" 
                            size="xs"
                            className="p-1 h-7 text-red-500 border-red-100 hover:bg-red-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </Button>
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


      {/* ========================================================
          PANEL 3: CLOSED-LOOP ADAPTIVE REORDER OPTIMIZER
          ======================================================== */}
      {activeTab === 'adaptive' && (
        <div className="space-y-6">

          {/* Informative advice banner about closed-loop optimization */}
          <div className="bg-indigo-950 p-6 rounded-3xl text-zinc-50 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md border border-indigo-900 border-b-indigo-950">
            <div className="space-y-2.5 z-10 max-w-2xl">
              <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Zap size={11} className="text-amber-400 animate-bounce" /> Dynamic Closed-loop Reorder feedback optimizer
              </span>
              <h4 className="text-lg font-bold text-white header-tight leading-6">Evaluate Past Consumptions to Correct Future Reorder Targets</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                If the factory historically under-predicts a raw material's demand, raw reserves sink below thresholds, provoking emergency sourcing cost overruns. Our Closed-Loop Optimizer calculates individual standard deviation error factors, and calibrates **Adaptive Safety Stock Multipliers** to safeguard reserves from stockout risks!
              </p>
            </div>
            
            <div className="z-10 flex flex-col items-stretch sm:items-end flex-shrink-0 w-full sm:w-auto gap-2">
              <Button 
                onClick={toggleAdaptiveSettings}
                className={`h-11 px-5 font-black text-xs uppercase cursor-pointer rounded-2xl transition hover:opacity-90 flex items-center justify-center gap-2 ${
                  activeAdaptiveModifiersCount > 0 
                    ? 'bg-red-650 hover:bg-red-700 text-white border border-red-700' 
                    : 'bg-teal-500 hover:bg-teal-600 text-slate-900 font-sans border-t border-teal-400'
                }`}
              >
                {activeAdaptiveModifiersCount > 0 ? (
                  <>Disable Multipliers</>
                ) : (
                  <>Apply Adaptive Calibration</>
                )}
              </Button>
              <span className="text-[10px] text-indigo-300 font-mono text-center sm:text-right font-medium">
                {activeAdaptiveModifiersCount > 0 ? 'Adaptive Settings Active' : 'Calibrated multipliers standby'}
              </span>
            </div>
            
            <div className="absolute right-0 top-0 w-64 h-64 bg-teal-500/10 pointer-events-none rounded-full blur-3xl" />
          </div>

          {/* Calibration parameters grid */}
          <Card className="shadow-sm border-gray-200 bg-white">
            <CardHeader className="pb-3 border-b border-gray-50 flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-850">Calculated Safety Stock Multiplexers</CardTitle>
                <CardDescription className="text-xs text-slate-500 font-sans">Review dynamic safety stock buffer multiplier recommendation calibrated based on past reorder demand deficits.</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-150">Closed-Loop Matrix</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="font-bold text-xs pl-6">Material Description</TableHead>
                    <TableHead className="font-bold text-xs text-center">Historical Bias</TableHead>
                    <TableHead className="font-bold text-xs text-center">Under-prediction Rate</TableHead>
                    <TableHead className="font-bold text-xs text-center animate-pulse">Recommended Safety Stock Multiplier</TableHead>
                    <TableHead className="font-bold text-xs">Adaptive Calib Status</TableHead>
                    <TableHead className="font-bold text-xs pr-6">Deficit Reason / Multiplier Justification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map(item => {
                    const stats = calculatedAdaptiveModifiers[item.id] || { recommendedMultiplier: 1.0, reason: 'Insufficient reorder history telemetry.', avgUnderPrediction: 0 };
                    const isApplied = (adaptiveSettings[item.id] || 1.0) > 1.0;
                    
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/20 text-xs">
                        <TableCell className="pl-6 py-3 font-extrabold text-slate-800">
                          {item.name}
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.sku}</div>
                        </TableCell>
                        
                        <TableCell className="text-center font-mono font-bold">
                          {stats.avgUnderPrediction > 0 ? (
                            <span className="text-red-500 text-[11px]">Under by +{stats.avgUnderPrediction}% avg</span>
                          ) : (
                            <span className="text-emerald-500 text-[11px]">Stable</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center font-medium text-slate-500">
                          {stats.avgUnderPrediction > 0 ? (
                            <Badge className="bg-red-50 text-red-700 border-red-150 text-[10px]" variant="outline">
                              Risk Warning
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-150 text-[10px]" variant="outline">
                              Low Risk
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {stats.recommendedMultiplier > 1.0 ? (
                            <span className="text-slate-800 font-mono font-black text-sm bg-indigo-50/50 py-1.5 px-3 rounded-lg border border-indigo-100">
                              {stats.recommendedMultiplier}x
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono font-semibold py-1.5 px-3 rounded-lg border border-dashed border-slate-200">
                              1.00x Base
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-3">
                          {isApplied ? (
                            <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-bold uppercase py-0.5">
                              Applied (Active)
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-50 text-slate-550 border-slate-205 text-[10px] font-bold uppercase py-0.5" variant="outline">
                              Standby (Bypassed)
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-slate-500 pr-6 text-[11px] font-medium leading-relaxed max-w-xs py-3">
                          {stats.reason}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Theoretical explanation cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-gray-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Backtesting Safety Stock Calibration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs text-slate-500 leading-relaxed font-medium">
                <p>
                  Industrial supply chains calculate safety thresholds using demand deviations. Standard static formulas like:
                </p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-800 font-bold block">
                  Reorder Level = (Daily Demand * Lead Time) + Safety Stock
                </div>
                <p>
                  Neglecting feedback makes safety stocks brittle to structural supply delays or consumption spikes. With **Closed-Loop Optimizer enabled**, the system intercepts past consumption deficits (MAPE error) and integrates the adaptive modifier:
                </p>
                <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 font-mono text-[10px] text-indigo-900 font-bold block">
                  Adaptive Reorder Level = (Daily Demand * Lead Time) + (Safety Stock * [Calibrated Modifier])
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-650" /> Live Inventory Safety Targets (Simulated Feedback)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h6 className="text-[11px] font-bold text-slate-700 uppercase">Live Buffer Modifiers Applied:</h6>
                  <div className="space-y-1.5">
                    {inventory.map(item => {
                      const multiplier = adaptiveSettings[item.id] || 1.0;
                      return (
                        <div key={item.id} className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-500">{item.name}</span>
                          <span className={`font-mono ${multiplier > 1.0 ? 'text-indigo-600 font-black' : 'text-slate-400 font-medium'}`}>
                            {multiplier > 1.0 ? `${multiplier}x Safety Buffer` : '1.0x Base'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2 text-[11px] text-emerald-900 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-extrabold uppercase">Calibrated Buffer Protection:</span> Adjusting raw fabric and thread stock reserves dynamically safeguards the factory from unexpected supply shortages. The adaptive multipliers protect future production orders!
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      )}

    </div>
  );
}

/**
 * Pure Domain Rules: FIFO Inventory Valuation, Cost Variance Analysis, and Financial Totals
 */

export interface FifoLot {
  batchNumber: string;
  quantity: number;
  rate?: number;
  costPerUnit?: number;
  date?: string;
}

export interface FifoSaleResult {
  cogs: number;
  remainingLots: FifoLot[];
  remainingBatches: FifoLot[];
  closingStockQty: number;
  closingStockValue: number;
  exhaustedLots: { batchNumber: string; deductedQty: number; rate: number }[];
}

/**
 * Calculates FIFO Cost of Goods Sold (COGS) and Closing Stock Value.
 * Worked example in manual:
 * Lot 1: 100 @ Rs 50
 * Lot 2: 100 @ Rs 60
 * Sell 120 units:
 *   100 @ 50 = Rs 5,000
 *   20 @ 60 = Rs 1,200
 *   COGS = Rs 6,200
 *   Closing stock = 80 units @ Rs 60 = Rs 4,800
 */
export function calculateFifoConsumption(
  lots: FifoLot[],
  quantityToSell: number
): FifoSaleResult {
  let remainingToDeduct = Math.max(0, Number(quantityToSell) || 0);
  let cogs = 0;
  const exhaustedLots: { batchNumber: string; deductedQty: number; rate: number }[] = [];
  const remainingLots: FifoLot[] = [];

  for (const lot of lots) {
    const lotRate = lot.rate ?? lot.costPerUnit ?? 0;

    if (remainingToDeduct <= 0) {
      remainingLots.push({ ...lot });
      continue;
    }

    if (lot.quantity <= remainingToDeduct) {
      // Consume entire lot
      cogs += lot.quantity * lotRate;
      exhaustedLots.push({ batchNumber: lot.batchNumber, deductedQty: lot.quantity, rate: lotRate });
      remainingToDeduct -= lot.quantity;
    } else {
      // Consume partial lot
      cogs += remainingToDeduct * lotRate;
      exhaustedLots.push({ batchNumber: lot.batchNumber, deductedQty: remainingToDeduct, rate: lotRate });
      remainingLots.push({
        ...lot,
        quantity: lot.quantity - remainingToDeduct
      });
      remainingToDeduct = 0;
    }
  }

  const closingStockQty = remainingLots.reduce((sum, l) => sum + l.quantity, 0);
  const closingStockValue = remainingLots.reduce((sum, l) => sum + (l.quantity * (l.rate ?? l.costPerUnit ?? 0)), 0);

  return {
    cogs,
    remainingLots,
    remainingBatches: remainingLots,
    closingStockQty,
    closingStockValue,
    exhaustedLots
  };
}

export interface VarianceResult {
  plannedAmount: number;
  actualAmount: number;
  variance: number; // actual - planned
  varianceAmount: number; // alias
  status: 'favourable' | 'unfavourable' | 'neutral';
  type: 'favourable' | 'unfavourable' | 'neutral'; // alias
}

/**
 * Cost Variance Analysis:
 * Planned Cost = Planned Qty x Planned Rate
 * Actual Cost = Actual Qty x Actual Rate
 * Variance = Actual Cost - Planned Cost
 * - If actual > planned: Unfavourable (Cost Overrun / Loss)
 * - If actual < planned: Favourable (Cost Saving / Gain)
 * Worked example in manual:
 * 100 kg @ Rs 40 planned (Rs 4,000) vs 110 kg @ Rs 40 actual (Rs 4,400) = Rs 400 unfavourable.
 */
export function calculateCostVariance(
  plannedQty: number,
  plannedRate: number,
  actualQty: number,
  actualRate: number
): VarianceResult {
  const planned = (Number(plannedQty) || 0) * (Number(plannedRate) || 0);
  const actual = (Number(actualQty) || 0) * (Number(actualRate) || 0);
  const variance = actual - planned;
  const status: 'favourable' | 'unfavourable' | 'neutral' =
    variance > 0 ? 'unfavourable' : variance < 0 ? 'favourable' : 'neutral';

  return {
    plannedAmount: planned,
    actualAmount: actual,
    variance,
    varianceAmount: variance,
    status,
    type: status
  };
}

/**
 * Formats monetary amounts ensuring negative values show an explicit minus sign.
 * E.g., -8280 -> "-₹8,280"
 */
export function formatCurrency(amount: number, currencySymbol: string = '₹'): string {
  const num = Number(amount) || 0;
  const isNegative = num < 0;
  const absFormatted = Math.abs(num).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

  return isNegative ? `-${currencySymbol}${absFormatted}` : `${currencySymbol}${absFormatted}`;
}

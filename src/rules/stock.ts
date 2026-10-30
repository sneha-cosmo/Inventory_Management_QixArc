/**
 * Pure Domain Rules: Inventory Stock, Reorder Point, and Transfer Math
 */

/**
 * Standard Reorder Point Formula:
 * Reorder Level = (Daily Consumption x Lead Time) + Safety Stock
 */
export function calculateReorderLevel(
  dailyConsumption: number,
  leadTime: number,
  safetyStock: number
): number {
  const consumption = Math.max(0, Number(dailyConsumption) || 0);
  const lead = Math.max(0, Number(leadTime) || 0);
  const safety = Math.max(0, Number(safetyStock) || 0);
  return (consumption * lead) + safety;
}

/**
 * Calculates how many days of stock are remaining based on current inventory and daily consumption.
 * Returns Infinity if daily consumption is 0.
 */
export function calculateStockDays(
  currentStock: number,
  dailyConsumption: number
): number {
  const stock = Math.max(0, Number(currentStock) || 0);
  const consumption = Math.max(0, Number(dailyConsumption) || 0);
  if (consumption === 0) return Infinity;
  return Number((stock / consumption).toFixed(1));
}

export type StockHealthStatus = 'Critical' | 'Warning' | 'Healthy' | 'critical' | 'warning' | 'optimal';

/**
 * Determines stock health:
 * - Critical: stock-days < 5 OR current stock <= 0
 * - Warning: stock-days < 15 OR current stock <= reorderLevel
 * - Healthy: stock is healthy and above reorder buffers
 */
export function getStockHealth(
  stockDaysOrCurrentStock: number,
  reorderLevel?: number,
  stockDays?: number
): 'Critical' | 'Warning' | 'Healthy' {
  // If called with single argument (stockDays)
  if (reorderLevel === undefined && stockDays === undefined) {
    const days = Number(stockDaysOrCurrentStock);
    if (days < 5) return 'Critical';
    if (days < 15) return 'Warning';
    return 'Healthy';
  }

  const stock = Math.max(0, Number(stockDaysOrCurrentStock) || 0);
  const reorder = Math.max(0, Number(reorderLevel) || 0);
  const days = Number(stockDays ?? 0);

  if (stock <= 0 || days < 5) {
    return 'Critical';
  }
  if (days < 15 || stock <= reorder) {
    return 'Warning';
  }
  return 'Healthy';
}

/**
 * Validates that sales or order fulfillment never exceeds available stock.
 * Stock must NEVER be negative.
 */
export function validateSaleQuantity(
  availableStock: number,
  requestedQuantity: number
): { valid: boolean; availableStock: number; error?: string } {
  const avail = Math.max(0, Number(availableStock) || 0);
  const req = Number(requestedQuantity) || 0;

  if (req <= 0) {
    return {
      valid: false,
      availableStock: avail,
      error: 'Sale quantity must be greater than zero.'
    };
  }

  if (req > avail) {
    return {
      valid: false,
      availableStock: avail,
      error: `Cannot sell ${req} units; only ${avail} units are available in inventory.`
    };
  }

  return { valid: true, availableStock: avail };
}

/**
 * Transfer Dispatch Rule:
 * Stock leaves source warehouse at dispatch and enters transit.
 * Returns updated source quantity (non-negative) and dispatched quantity.
 */
export function processTransferDispatch(
  sourceStock: number,
  transferQty: number
): {
  success: boolean;
  newSourceStock: number;
  sourceRemainingStock: number;
  inTransitQuantity: number;
  error?: string;
} {
  const current = Math.max(0, Number(sourceStock) || 0);
  const qty = Number(transferQty) || 0;

  if (qty <= 0) {
    return {
      success: false,
      newSourceStock: current,
      sourceRemainingStock: current,
      inTransitQuantity: 0,
      error: 'Transfer quantity must be greater than zero.'
    };
  }

  if (qty > current) {
    return {
      success: false,
      newSourceStock: current,
      sourceRemainingStock: current,
      inTransitQuantity: 0,
      error: `Insufficient stock in source warehouse: requested ${qty}, available ${current}.`
    };
  }

  const remaining = current - qty;
  return {
    success: true,
    newSourceStock: remaining,
    sourceRemainingStock: remaining,
    inTransitQuantity: qty
  };
}

/**
 * Transfer Receipt Rule:
 * In-transit stock is credited to destination warehouse upon verified arrival.
 */
export function processTransferReceipt(
  destinationStock: number,
  transferQty: number
): {
  destFinalStock: number;
  remainingInTransit: number;
  valueOf: () => number;
} {
  const current = Math.max(0, Number(destinationStock) || 0);
  const qty = Math.max(0, Number(transferQty) || 0);
  const finalStock = current + qty;
  return {
    destFinalStock: finalStock,
    remainingInTransit: 0,
    valueOf: () => finalStock
  };
}

import { describe, it, expect } from 'vitest';
import { calculateReorderLevel, calculateStockDays, getStockHealth, processTransferDispatch } from '../stock';
import { calculateFifoConsumption, calculateCostVariance } from '../valuation';
import { calculateGst } from '../tax';

describe('Manual v3.1 Worked Examples Verification', () => {
  it('Reorder Level Formula: (dailyConsumption * leadTime) + safetyStock', () => {
    // Example: Daily consumption = 10, Lead time = 5 days, Safety stock = 20 units
    // Formula: (10 * 5) + 20 = 70 units
    const reorderLevel = calculateReorderLevel(10, 5, 20);
    expect(reorderLevel).toBe(70);

    // Stock-days check:
    // With 40 units on hand: 40 / 10 = 4 days (< 5 days -> Critical)
    const stockDays40 = calculateStockDays(40, 10);
    expect(stockDays40).toBe(4);
    expect(getStockHealth(stockDays40)).toBe('Critical');

    // With 120 units on hand: 120 / 10 = 12 days (< 15 days -> Warning)
    const stockDays120 = calculateStockDays(120, 10);
    expect(stockDays120).toBe(12);
    expect(getStockHealth(stockDays120)).toBe('Warning');

    // With 200 units on hand: 200 / 10 = 20 days (>= 15 days -> Healthy)
    const stockDays200 = calculateStockDays(200, 10);
    expect(stockDays200).toBe(20);
    expect(getStockHealth(stockDays200)).toBe('Healthy');
  });

  it('FIFO Valuation: 100 @ Rs 50 + 100 @ Rs 60, sell 120 -> COGS Rs 6,200, closing Rs 4,800', () => {
    const batches = [
      { batchNumber: 'LOT-A', quantity: 100, costPerUnit: 50, date: '2026-01-01' },
      { batchNumber: 'LOT-B', quantity: 100, costPerUnit: 60, date: '2026-01-15' }
    ];

    const result = calculateFifoConsumption(batches, 120);

    // 100 @ 50 = 5,000; 20 @ 60 = 1,200. Total COGS = 6,200
    expect(result.cogs).toBe(6200);
    // Remaining: 80 @ 60 = 4,800
    expect(result.closingStockValue).toBe(4800);
    expect(result.remainingBatches).toEqual([
      { batchNumber: 'LOT-B', quantity: 80, costPerUnit: 60, date: '2026-01-15' }
    ]);
  });

  it('Cost Variance: 100 kg @ Rs 40 planned vs 110 kg actual = Rs 400 unfavourable', () => {
    // Planned: 100 kg @ Rs 40 = Rs 4,000
    // Actual: 110 kg consumed @ Rs 40 standard = Rs 4,400
    // Variance = Actual - Planned = +400 (Unfavourable)
    const variance = calculateCostVariance(100, 40, 110, 40);
    expect(variance.varianceAmount).toBe(400);
    expect(variance.type).toBe('unfavourable');
  });

  it('GST Calculation: Rs 10,000 @ 18% -> 900 CGST + 900 SGST (intra) or 1,800 IGST (inter)', () => {
    // Intra-state (e.g. MH to MH)
    const intra = calculateGst(10000, 18, true);
    expect(intra.taxableAmount).toBe(10000);
    expect(intra.cgst).toBe(900);
    expect(intra.sgst).toBe(900);
    expect(intra.igst).toBe(0);
    expect(intra.totalTax).toBe(1800);
    expect(intra.totalAmount).toBe(11800);

    // Inter-state (e.g. MH to TN)
    const inter = calculateGst(10000, 18, false);
    expect(inter.taxableAmount).toBe(10000);
    expect(inter.cgst).toBe(0);
    expect(inter.sgst).toBe(0);
    expect(inter.igst).toBe(1800);
    expect(inter.totalTax).toBe(1800);
    expect(inter.totalAmount).toBe(11800);
  });

  it('Stock Transfer: 200 out of a hub of 500 leaves 300, with 200 in transit', () => {
    const dispatch = processTransferDispatch(500, 200);
    expect(dispatch.sourceRemainingStock).toBe(300);
    expect(dispatch.inTransitQuantity).toBe(200);
    // Total physical goods in system remains 500
    expect(dispatch.sourceRemainingStock + dispatch.inTransitQuantity).toBe(500);
  });
});

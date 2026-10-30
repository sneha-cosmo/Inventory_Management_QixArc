# Manual v3.1 vs. InvPredict Application Specification Matrix

This document provides a comprehensive reconciliation of all discrepancies identified between the user manual (v3.1) and the actual application codebase, detailing the initial state, the hardened post-fix state, and concrete architectural recommendations for future development phases.

---

## 1. Executive Summary of Discrepancies & Resolutions

| # | Domain / Feature | Manual v3.1 Specification | Prior Codebase State | Hardened State (Phase 1-5) | Resolution & Recommendation |
|---|---|---|---|---|---|
| **1** | **Temporal Anchor & Dates** | Real-time calendar operations across all inventory forecasting and aging calculations. | Literal hardcoded date `2026-05-26` in `App.tsx`, `2026-05-28` in `DeadStockDamagedPage.tsx`, and `APP_REFERENCE_DATE` in `batchImport.ts`. | Central injectable `Clock` (`src/rules/clock.ts`) governs all date arithmetic, batch days-left, aging, and overdue computations. | **Adopt Clock:** Real system clock by default; injectable clock for deterministic scenario testing and simulations. |
| **2** | **Batch Expiry Classification** | 4 standard bands: Expired ($\le 0$d), Critical ($< 7$d), Near Expiry ($< 30$d), Healthy ($> 30$d). | 5 non-standard bands: Expired, Urgent ($\le 7$d), Low ($\le 15$d), Caution ($\le 30$d), Optimal ($> 30$d), plus Quarantined. | Harmonized into 4 strict bands: **Expired** ($\le 0$d), **Critical** ($1 \le d \le 7$d; exactly 7 days is Critical), **Near Expiry** ($8 \le d \le 30$d), and **Healthy** ($> 30$d), with an explicit **Quarantined** status filter. | **Adopt Harmonized 4 Bands:** Conforms with standard warehouse SOPs while retaining the Quarantined filter for emergency recall workflows. |
| **3** | **Production & Work Orders** | BOM-driven 3-stage Work Orders (Awaiting $\rightarrow$ Active $\rightarrow$ Completed) with multi-level raw material deduction. | Single-item flat planning without BOM explosion or raw-material auto-deduction. | Maintained single-item flat planning with strict unit-rate variance analysis to respect Phase 0 scope boundary (no multi-level BOMs). | **Phase-Gate Multi-level BOM:** Keep flat model until backend database persistence is provisioned; multi-level BOMs in client memory create race conditions. |
| **4** | **Dashboard Metrics & Cost Variance** | Cost Variance item breakdown chart and signed Net Profit/Loss ($-\text{₹}X$ for loss). | Chart was blank due to empty `INITIAL_ORDERS` array; Net Loss stripped minus sign via `Math.abs()`, displaying `8,280` instead of `-₹8,280`. | Seeded representative completed production orders into `INITIAL_ORDERS`; implemented `formatCurrency` to strictly output negative currency with minus sign (`-₹8,280`). Added empty state for charts. | **Adopt Signed Formatting:** Negative numbers must always show an explicit minus sign to avoid financial misinterpretation. |
| **5** | **HSN/SAC & Tax Fields** | Item Master field list lacked HSN and GST rate, though invoices displayed HSN breakdown. | HSN was optionally present in items and invoices; missing Unit Quantity Code (UQC). | Added `uqc`, `hsnCode`, and `gstRate` to `InventoryItem`; added structured address fields (`addressLines`, `stateCode`, `pin`, `legalName`) to Warehouses, Customers, and Suppliers. | **Update Manual:** Add HSN, GST rate, and UQC to Part C Item Master specification as mandatory GST foundations. |
| **6** | **Goods Receipt on Purchase Orders** | Receiving a PO adds stock to the designated warehouse and creates active batch lots; partial receipt leaves PO `Partially Received`. | PO screen had no receipt action or warehouse destination selection; stock and batches never updated upon order arrival. | Added interactive `ReceiveGoodsDialog` to `PurchasePage`, supporting partial receipt, warehouse credit, automated batch creation, and strict 6-field audit event generation. | **Adopt Code Implementation:** PO receiving workflow is essential for closed-loop inventory tracking. |
| **7** | **Stock Oversell Prevention** | Stock is physical and can never be negative; sales exceeding available stock must be blocked. | Negative stock was prevented only visually in some components; form submissions could submit quantities exceeding stock. | Enforced `validateSaleQuantity` domain rule across Sales Order submission, Dialog controls, and adjustment forms. | **Adopt Strict Enforcement:** Zero tolerance for negative physical inventory. |
| **8** | **Mandatory Adjustment Reasons** | All manual stock corrections require an explicit documented justification. | Reason input was optional in some code paths or accepted blank whitespace. | Enforced non-empty trimmed `reason` parameter on all manual adjustments, writing full details to audit log. | **Adopt Strict Enforcement:** Auditing requirement for statutory and ISO stock reconciliations. |
| **9** | **Inter-Branch Stock Transfers** | Stock leaves source at dispatch, sits in transit, and arrives at destination on receipt. Total physical units conserved across network. | Transfers changed status from `pending` to `transit` and `received` without properly reflecting in-transit quantities in central reports. | Implemented pure domain math `processTransferDispatch` and `processTransferReceipt`; verified total physical unit conservation. | **Adopt Pure Rule:** Preserves total inventory asset value across multiple branches. |
| **10** | **Simulation Disclaimers** | Uncertified features must not mislead operators into assuming external regulatory integration. | Barcode scanner, Branch sync, Batch recall, and Tally/GST filing screens implied live external hardware/API links. | Added explicit badges: `Barcode Scanning: Simulation Mode`, `Multi-Branch Cloud Sync: Simulation Mode (In-Memory)`, `Simulated Emergency Recall Workflow`, and `Not certified for official statutory filing`. | **Retain Honest Disclaimers:** Clarifies prototype/simulation boundaries prior to production API certifications. |

---

## 2. Detailed Sectional Analysis (Manual Parts B to J)

### Part B: System Architecture & Setup
- **Manual Spec:** Enterprise client-server inventory platform with persistent centralized relational storage.
- **Code Reality:** Client-side React 18 SPA with in-memory state initialized from `src/constants.ts`.
- **Architectural Shift:** Provisioned repository abstraction layer (`src/repositories/types.ts`) with `MemoryAppRepository` adapter, isolating pure domain rules from storage so that Cloud SQL / Firebase can be plugged in without changing UI code.

### Part C: Item Master & Categorization
- **Manual Spec:** SKU, Name, Category, Unit, Reorder Point, Min Stock, Safety Stock, Lead Time, Daily Consumption.
- **Foundations Added:** Added optional backward-compatible fields: `uqc` (Unit Quantity Code: KGS, MTR, PCS, NOS), `hsnCode` (4 or 6 digits), and `gstRate` (0%, 5%, 12%, 18%, 28%).
- **Recommendation:** Formalize UQC and HSN in the manual v3.2 Item Master definition.

### Part D: Stock Forecasting & Reorder Prediction
- **Manual Spec:** $\text{Reorder Level} = (\text{Daily Consumption} \times \text{Lead Time}) + \text{Safety Stock}$. Stock-days: $<5\text{d}$ Critical, $<15\text{d}$ Warning, $\ge 15\text{d}$ Healthy.
- **Implementation:** Implemented as pure function in `src/rules/stock.ts`. Dashboard and Item Master tables use the exact formula.

### Part E: Batch Tracking, Expiry & Recalls
- **Manual Spec:** 4 bands (Expired $\le 0$, Critical $<7$, Near Expiry $<30$, Healthy $>30$).
- **Reconciliation:** Code now uses `classifyExpiry` from `src/rules/expiry.ts` which treats exactly 7 days left as Critical and $>30$ days as Healthy. Quarantined batches are excluded from active saleable stock.

### Part F: Inter-Branch Stock Transfers
- **Manual Spec:** Multi-branch transfer lifecycle: Draft $\rightarrow$ Dispatched (In Transit) $\rightarrow$ Received (Reconciled).
- **Implementation:** Both `App.tsx` and `BranchSyncTransferPage.tsx` enforce that source stock decreases at dispatch, in-transit is accounted for, and destination stock increases on receipt.

### Part G: Purchase & Procurement
- **Manual Spec:** PO creation, supplier performance tracking, Goods Receipt Note (GRN) with batch allocation.
- **Implementation:** Added full Goods Receipt flow in `PurchasePage` supporting partial receipts and batch lot generation with destination warehouse attribution.

### Part H: Sales & Order Fulfillment
- **Manual Spec:** Customer sales, inventory allocation, FIFO dispatch, and GST billing.
- **Implementation:** Sales orders allocate FIFO lots oldest first (`calculateFifoConsumption`). Tax parameters calculate intra-state (CGST+SGST) vs. inter-state (IGST).

### Part I: Production Cost Variance & Financials
- **Manual Spec:** $\text{Cost Variance} = \text{Actual Cost} - \text{Planned Cost}$. Unfavourable when Actual > Planned.
- **Implementation:** `calculateCostVariance` in `src/rules/valuation.ts`. Seeded representative completed work orders into `INITIAL_ORDERS` so the chart displays real variance data. Negative profit correctly formatted with minus sign.

### Part J: Role-Based Access Control & Audit Trails
- **Manual Spec:** Admin, Inventory Manager, Billing Clerk roles with immutable 6-field audit logging (`timestamp`, `user`, `role`, `action`, `description`, `itemReference`).
- **Implementation:** `src/rules/permissions.ts` and `src/rules/audit.ts` construct and enforce strict 6-field audit records on every critical state modification.

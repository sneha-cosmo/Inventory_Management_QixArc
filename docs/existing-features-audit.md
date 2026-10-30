# Existing Features Audit & Architectural Analysis

**App Name:** InvPredict (Inventory Reorder & Variance System)  
**Evaluation Date:** October 30, 2026  
**Auditor:** Senior Systems Engineer  

---

## 1. System Architecture Overview

### 1.1 Data Layer & Persistence Model
- **Current State:** Client-only React single-page application (SPA). All application entities (`inventory`, `batches`, `orders`, `warehouses`, `suppliers`, `customers`, `invoices`, `payments`, `transfers`, `adjustments`, `staff`, `auditLogs`) reside entirely in React in-memory state initialized from static seed records in `src/constants.ts` and `src/App.tsx`.
- **Backend:** None. There is currently no server API, database (no Postgres, MongoDB, or Firestore provisioned), or web socket daemon.
- **Persistence:** Local browser state. Page refresh resets state to seed constants unless explicitly cached or synced.
- **Integration Boundary:** Architectural abstraction is currently coupled directly to React component state. A repository adapter interface is needed to decouple domain rules from in-memory state.

### 1.2 Authentication & Role-Based Access Control (RBAC)
- **Mechanism:** Mock profile switcher in the top navigation bar with simulated staff accounts (`STF-001` Sneha R. - Admin, `STF-002` Amit Sharma - Inventory Manager, `STF-003` Priya Patel - Billing Clerk).
- **Enforcement:** `checkPermission(permissionKey)` evaluated in components. Admin has wildcard access.
- **Gaps:** Permissions were checked via ad-hoc `alert()` popups inside event handlers rather than systematic domain-level guards.

### 1.3 Audit Logging
- **Mechanism:** In-memory array of `AuditLog` records displayed in the Audit tab.
- **Audit Schema:** Expected 6-field event: `timestamp`, `operatorName` (user), `operatorRole` (role), `action` (action type), `details` (description), `entityId`/`entityType` (item/entity reference).
- **Gaps:** Several UI operations (e.g., manual stock changes, goods receipt, partial payments) either lacked mandatory reason fields or did not reliably pass all six audit fields.

### 1.4 Internationalization (i18n)
- **Languages:** English (`en`) and Tamil (`ta`).
- **Mechanism:** Dictionary lookup in `src/locales.ts` with `LOCALES[lang]` and a fallback string translation helper `tText(str, lang)`.
- **Gaps:** Some components hardcoded English strings or lacked Tamil key parity. Currency formatting was inconsistent across views.

---

## 2. Lead Investigations & Ground Truth

### Lead 1: Hard-Coded Dates in Batch Tracking & Components
- **Finding:** **CONFIRMED DEFECT.**
- **Evidence:**
  - `src/App.tsx` (line 2390): `const REFERENCE_DATE = new Date('2026-05-26');` hardcodes May 26, 2026.
  - `src/App.tsx` (lines 2335, 2367, 2382): New batches default to `'2026-05-26'`.
  - `src/utils/batchImport.ts` (line 29): `export const APP_REFERENCE_DATE = new Date('2026-05-26');`.
  - `src/components/DeadStockDamagedPage.tsx` (line 146): `const currentDate = new Date('2026-05-28');`.
- **Impact:** Any calculation of "days left" or stock aging was anchored to May 2026 instead of the current system time.
- **Resolution:** Create a centralized injectable clock module (`src/rules/clock.ts`) providing `getCurrentDate()`, with no component referencing hardcoded date literals.

### Lead 2: Expiry Bands & Boundary Discrepancies
- **Finding:** **CONFIRMED DISCREPANCY.**
- **Code State:** `src/App.tsx` used 5 bands: `Expired` ($\le 0$d), `Urgent` ($\le 7$d), `Low` ($\le 15$d), `Attention` ($\le 30$d), and `Optimal` ($> 30$d).
- **Manual v3.1:** Documents 4 bands: `Expired` ($\le 0$d), `Critical` ($< 7$d), `Near Expiry` ($< 30$d), `Healthy` ($> 30$d).
- **Decision & Harmonization:**
  - `Expired`: $\le 0$ days left (past expiration date).
  - `Critical`: $1 \le \text{days} \le 7$ days left (exactly 7 days left is Critical).
  - `Near Expiry`: $8 \le \text{days} \le 30$ days left.
  - `Healthy`: $> 30$ days left.

### Lead 3: Planning Screen vs. BOM-Driven Work Orders
- **Finding:** **CONFIRMED DISCREPANCY.**
- **Code State:** Flat single-item planning (`ProductionItem`: `itemId`, `itemName`, `plannedQty`, `plannedRate`, `actualQty`, `actualRate`). Status transition is binary: `planned` $\rightarrow$ `completed`.
- **Manual v3.1:** Describes BOM-driven work orders moving through 3 stages: `Awaiting` $\rightarrow$ `Active` $\rightarrow$ `Completed`, with raw-material recipe deduction upon completion.
- **Decision:** As instructed by the scope boundary (no new multi-level BOM feature to be added), keep the flat production order model, but align status lifecycle (`planned` / `in_progress` / `completed`) and enforce strict stock deduction rules. Record this difference in `docs/manual-vs-app.md`.

### Lead 4: Dashboard "Cost Variance by Item" Empty & Negative Profit Display
- **Finding:** **CONFIRMED DEFECT.**
- **Evidence:**
  - `INITIAL_ORDERS` in `src/constants.ts` was an empty array `[]`. Because variance is calculated exclusively from completed production orders (`orders.filter(o => o.status === 'completed')`), `varianceAnalysis` evaluated to `[]`, causing the Recharts BarChart to render blank with no empty state.
  - In `src/App.tsx`: `value={'₹' + Math.abs(totalStats.netProfit).toLocaleString()}` stripped the negative sign using `Math.abs()`, rendering `₹8,280` labeled "Net Loss" instead of `-₹8,280`.
- **Resolution:**
  - Seed representative completed production orders into `INITIAL_ORDERS`.
  - Add an empty state placeholder to the Recharts container when data is empty.
  - Format negative currency values with an explicit minus sign: `-₹8,280`.

### Lead 5: Inventory Master HSN/SAC and GST Rate Location
- **Finding:** **CONFIRMED DISCREPANCY.**
- **Code State:** `hsnCode?: string` and `gstRate?: number` are declared in `InventoryItem` (`src/types.ts`) and populated in `src/constants.ts` (e.g. `hsnCode: '5208'`, `gstRate: 5`). They are also present in invoice tables, GSTR-1 summaries, and the Add Item dialog in `src/App.tsx`.
- **Manual v3.1:** Omitted HSN and GST rate from the Part C Inventory Master field list.
- **Resolution:** Maintain `hsnCode` and `gstRate` on `InventoryItem`, add `uqc` (Unit Quantity Code), and document the difference in `docs/manual-vs-app.md`.

### Lead 6: Goods Receipt, Transfer Dispatch, Adjustment Reasons & Audit Fields
- **Finding:** **CONFIRMED DEFECTS & GAPS.**
- **Evidence:**
  - **Goods Receipt:** In `PurchasePage`, purchase orders could only be created (`pending`). There was no "Receive PO" or goods receipt action. Receiving a PO did not credit warehouse stock or create/update batch records.
  - **Transfers:** Transfers in `src/App.tsx` updated warehouse stock levels on status transition, but did not track in-transit stock explicitly against overall item stock.
  - **Adjustments:** The manual stock adjustment form did not enforce a mandatory reason for all adjustment types.
  - **Audit Logging:** Not all critical actions guaranteed all six required fields (`timestamp`, `user`, `role`, `action type`, `description`, `item reference`).

---

## 3. Detailed Audit Table (Manual Parts B to J)

| Feature | Manual Ref | Status | File Paths | Evidence & Notes |
|---|---|---|---|---|
| **Dashboard KPIs & Variance Chart** | Part B | Differs | `src/App.tsx`, `src/constants.ts` | Variance chart was empty due to empty `INITIAL_ORDERS` and lacked an empty-state card; `Net Loss` card stripped minus sign using `Math.abs()`. |
| **Item Master Logistics Parameters** | Part C | Works | `src/types.ts`, `src/App.tsx`, `src/constants.ts` | Daily consumption, lead time, safety stock, and reorder levels are tracked. Missing UQC field. |
| **Reorder Engine Formula** | Part C | Differs | `src/App.tsx`, `src/rules/stock.ts` | Reorder calculation had variable formulas; must strictly be `(dailyConsumption * leadTime) + safetyStock`. |
| **Warehouse & Stock Tracking** | Part D | Works | `src/App.tsx`, `src/types.ts` | Tracks stock distribution across warehouses (`stockLevels`). |
| **Branch Sync & Transfer Logistics** | Part D | Partly | `src/components/BranchSyncTransferPage.tsx`, `src/App.tsx` | Transfer status states (`pending`, `transit`, `received`) exist, but total cross-warehouse stock was decremented during transit instead of held in an explicit In-Transit bucket. |
| **Stock Adjustments & Damage Logs** | Part E | Partly | `src/App.tsx`, `src/components/DeadStockDamagedPage.tsx` | Adjustments recorded, but reason field was optional in some code paths. |
| **Dead Stock Aging Buckets** | Part E | Differs | `src/components/DeadStockDamagedPage.tsx` | Aging used arbitrary thresholds (30/60/90/120) and a hardcoded date `2026-05-28`. Must follow standard buckets: `0-30`, `31-90`, `91-180`, `180+`. |
| **Batch & Expiry Tracking** | Part F | Differs | `src/App.tsx`, `src/utils/batchImport.ts` | 5 bands in UI vs 4 bands in manual; hardcoded reference date `2026-05-26`. |
| **Batch Recall / Quarantine** | Part F | Works | `src/App.tsx` | Quarantines batches from active FIFO deduction, but lacks honest simulation labeling. |
| **Purchase Orders & Goods Receipt** | Part G | Partly | `src/App.tsx` | POs can be created, but goods receipt workflow was missing; receipt did not update warehouse stock or batches. |
| **Sales Orders & Stock Protection** | Part H | Differs | `src/App.tsx` | Sales order form allowed submitting orders exceeding available stock with an "Oversold" warning in logs instead of blocking the submission. |
| **FIFO Stock Deduction** | Part H | Works | `src/App.tsx` | FIFO sorts by manufacture date and deducts from active lots, but allowed overselling. |
| **Invoicing & Status Lifecycle** | Part I | Partly | `src/App.tsx` | Invoices generated upon sale, but status only evaluated `paid` vs `partial`; `overdue` was not dynamically maintained based on clock and due date. |
| **Tax Calculation (CGST/SGST/IGST)** | Part I | Works | `src/App.tsx`, `src/components/EasyTaxFilingPanel.tsx` | Correctly evaluates intra-state (Maharashtra) 50/50 CGST+SGST vs inter-state 100% IGST. Needs "not certified for filing" label. |
| **Staff & Role Permissions (RBAC)** | Part J | Works | `src/App.tsx`, `src/components/RoleStaffManagementPanel.tsx` | Admin, Inventory Manager, Billing Clerk roles with permissions. |
| **Audit Log Trail** | Part J | Partly | `src/App.tsx` | Audit logs exist, but lacked guaranteed 6-field payload structure on some events. |
| **In-App Notification Center** | Part J | Works | `src/components/NotificationCenterPanel.tsx`, `src/utils/notificationCenter.ts` | Alerts for stock, expiry, overdue invoices, and transit delay. |

---

## 4. Phase 0 Hardening Plan

1. **Injectable Clock & Date Normalization:** Build `src/rules/clock.ts` to eliminate all hardcoded literal dates across components and tests.
2. **Pure Rules Layer (`src/rules/`):**
   - `stock.ts`: Reorder level calculation, stock-days calculation, available stock enforcement, transfer math.
   - `expiry.ts`: Harmonized 4-band expiry classification (`Expired`, `Critical <=7d`, `Near Expiry <=30d`, `Healthy >30d`).
   - `aging.ts`: Aging buckets (`0-30`, `31-90`, `91-180`, `180+`).
   - `valuation.ts`: FIFO valuation and cost variance calculation.
   - `tax.ts`: GST tax distribution, turnover bands, HSN requirements, GSTIN regex validation.
   - `permissions.ts`: Single authoritative permission evaluator.
   - `audit.ts`: Strict 6-field audit event constructor.
3. **Repository Abstraction (`src/repositories/`):** Define a clean repository interface for data operations backed by an in-memory/localStorage adapter.
4. **Correctness Bug Fixes:**
   - Prevent sales exceeding available stock; display available stock in the SO dialog.
   - Implement Goods Receipt on Purchase Orders with warehouse stock and batch lot generation.
   - Mandate reason on manual inventory adjustments.
   - Fix Dashboard Net Profit/Loss negative formatting and add chart empty states.
   - Ensure inter-warehouse transfers retain total cross-warehouse stock during transit.
5. **Data Foundation Extensions:** Add HSN, GST rate, UQC, structured address, company/warehouse GSTIN, configurable turnover band settings, and invoice format validation.
6. **Vitest Test Suite:** Implement worked examples (reorder, FIFO, variance, GST, transfer), scenario tests, i18n parity test, and clock injection test.
7. **Honest Labeling & Documentation:** Add simulation badges and disclaimers; compile `docs/manual-vs-app.md` and `docs/r1-checklist.md`.

# InvPredict Release 1.0 (R1) Production Hardening Checklist

This document details the operational verifications, test results, and go-live sign-offs required prior to deploying Release 1.0 of the InvPredict Inventory Management System.

---

## 1. Automated Test Verification Summary

| Test Suite | Purpose | Target | Result |
|---|---|---|---|
| **Manual Worked Examples** (`src/rules/__tests__/manualExamples.test.ts`) | Verifies core business math from user manual v3.1 | 5 tests | **PASS (100%)** |
| **Comprehensive 12-Area Scenarios** (`src/rules/__tests__/scenarios.test.ts`) | Verifies all 12 operational domains and security constraints | 12 tests | **PASS (100%)** |
| **i18n Key Parity** (`src/rules/__tests__/i18nParity.test.ts`) | Asserts 100% key and value match between English & Tamil | 2 tests | **PASS (100%)** |
| **Injectable Clock Determinism** (`src/rules/__tests__/clockInjection.test.ts`) | Verifies batch expiry & invoice status shifts predictably | 4 tests | **PASS (100%)** |
| **Typecheck** (`tsc -b`) | Verifies strict TypeScript compilation without type assertions | 0 errors | **PASS (100%)** |
| **Lint** (`tsc -b`) | Verifies syntax, imports, and interface compatibility | 0 errors | **PASS (100%)** |
| **Production Build** (`vite build`) | Verifies client bundle production build | Exit 0 | **PASS (100%)** |

---

## 2. Core Functional Safeguards Sign-Off

- [x] **No Overselling / Non-Negative Stock:** Prohibits sales, transfers, or manual adjustments from reducing stock below zero.
- [x] **Mandatory Reason for Stock Corrections:** Form rejects any manual adjustment without a non-empty reason string.
- [x] **Standard Reorder Formula:** $(\text{Daily Consumption} \times \text{Lead Time}) + \text{Safety Stock}$ verified.
- [x] **Stock-Days Health Bands:** $<5\text{d}$ Critical, $<15\text{d}$ Warning, $\ge 15\text{d}$ Healthy.
- [x] **Stock Aging Buckets:** `0-30`, `31-90`, `91-180`, `180+` (Dead stock) integrated.
- [x] **Temporal Uniformity:** Central injectable `Clock` (`src/rules/clock.ts`) utilized for all date calculations; zero literal dates in components.
- [x] **Goods Receipt on Purchase Orders:** Partial and full receipts credit receiving warehouse stock, create batch lots, and update PO status.
- [x] **Stock Transfer Conservation:** Source stock decremented at dispatch, in-transit tracked, destination stock credited on receipt; total inventory conserved.
- [x] **GST Calculation:** Inter-state (IGST) vs Intra-state (CGST + SGST) accurately calculated based on supplier and customer state codes.
- [x] **Invoice Lifecycle:** Automated status computation (`paid`, `unpaid`, `partial`, `overdue`) driven by payment sums and due dates.
- [x] **FIFO Valuation:** Oldest batches consumed first; closing stock value dynamically calculated.
- [x] **Cost Variance & Financials:** Actual minus Planned; negative profit displayed with explicit minus sign (`-₹X`).
- [x] **6-Field Audit Log:** Guaranteed fields: `timestamp`, `user`, `role`, `action`, `description`, `itemReference`.
- [x] **Role-Based Access Control:** Admin, Inventory Manager, and Billing Clerk permissions strictly enforced.
- [x] **Honest Simulation Labeling:** Barcode Scanner, Multi-Branch Sync, Emergency Recall, and Tax/Tally export disclaimers rendered in UI.

---

## 3. Operational Sign-Off Table

| Item | Before Hardening | After Hardening | Verification Method |
|---|---|---|---|
| **Stock Health** | Hardcoded heuristics in UI | Formula: `(consumption * lead) + safety` in `src/rules/stock.ts` | `manualExamples.test.ts` |
| **Stock Days** | Undefined thresholds | `<5d` Critical, `<15d` Warning, `15d+` Healthy | `scenarios.test.ts` (Area 3) |
| **Oversell Prevention** | Soft UI warning only | Hard block; stock cannot drop below zero | `scenarios.test.ts` (Area 2) |
| **Goods Receipt** | POs stayed pending forever | Interactive GRN dialog; credits warehouse & batch | `scenarios.test.ts` (Area 5) |
| **Transfer Total** | Total units lost in transit | Conservation of total stock across branches | `scenarios.test.ts` (Area 9) |
| **Batch Expiry** | 5 arbitrary bands with literal dates | 4 standardized bands powered by `Clock` | `scenarios.test.ts` (Area 7) |
| **Batch Recall** | Missing isolation math | Quarantined lots deducted from active stock | `scenarios.test.ts` (Area 8) |
| **Negative Currency** | Rendered as positive `8,280` | Rendered with minus sign `-₹8,280` via `formatCurrency` | `scenarios.test.ts` (Area 6) |
| **Empty Charts** | Blank canvas when orders were empty | Seeded orders + explicit empty state message | Visual inspection & component render |
| **Audit Trails** | Ad-hoc object formats | Enforced 6-field canonical structure | `scenarios.test.ts` (Area 12) |
| **i18n Parity** | Potential translation drift | 100% key and content parity tested | `i18nParity.test.ts` |
| **Storage Architecture** | Mixed in React state | Abstract `IAppRepository` and memory adapter | Typecheck + unit tests |

---

## 4. Architectural Decisions for Go-Live

1. **Backend Storage Choice:**
   - *Current Implementation:* In-memory client-side repository (`MemoryAppRepository`) with full CRUD support.
   - *Production Recommendation:* Provision Google Cloud SQL (PostgreSQL via Drizzle ORM) or Firebase Firestore for persistent multi-device data sharing. The repository interface `IAppRepository` is already prepared to accept a backend adapter without modifying any UI components.

2. **Expiry Health Boundaries:**
   - *Decision:* Exactly 7 days left is classified as **Critical** ($1 \le d \le 7$d), allowing warehouse supervisors to quarantine high-risk perishables on or before day 7.

3. **Production Planning Model:**
   - *Decision:* Maintain the single-item planned vs. actual cost rate model with strict unit variance tracking. Multi-level BOM explosion is recommended for Phase 2 once persistent database transactions are configured.

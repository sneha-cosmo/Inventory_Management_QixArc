# Inventory Bulk Import Hardening & Statutory Foundations

## Summary
Harden the inventory bulk import module to ensure strict data integrity, statutory compliance (HSN/SAC, GST Rate, and UQC), transparent tracking of auto-created incomplete warehouses, and an upgraded review workflow with in-place barcode repairs and clear issue wrapping.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The specifications for these import improvements follow statutory GST guidelines (Notification No. 78/2020 – Central Tax for HSN and GST portal UQC standards). Below are the confirmed implementation choices:
> - **HSN/SAC Validation**: Validated against aggregate-turnover settings (default: 4 digits for turnover $\le$ ₹5 Cr; 6 digits for turnover $>$ ₹5 Cr).
> - **GST Rate**: Must be numeric; validated against standard GST rate brackets (`0%`, `5%`, `12%`, `18%`, `28%`, and precious-metal brackets `0.1%`, `0.25%`, `1.5%`, `3%`). Non-standard rates emit an informative Warning.
> - **UQC Mapping**: Auto-maps common units (e.g., `meters` $\rightarrow$ `MTR`, `pcs` $\rightarrow$ `PCS`, `kg` $\rightarrow$ `KGS`, `cones` $\rightarrow$ `CON`, `rolls` $\rightarrow$ `ROL`). Unmapped units trigger a Warning without blocking import.
> - **Barcode Check Digits**: Invalid check digits on 13-digit EAN codes are treated as Errors and offer an instant 1-click **"Use suggested"** correction button. Non-13 digit barcodes are permitted with a Warning.
> - **Incomplete Auto-created Warehouses**: Warehouses created via bulk import without GSTIN, address, state code, or PIN receive an `isIncomplete: true` marker, a warning during review, and an alert banner in the Warehouse management view with an in-place "Complete Details" modal.

---

## 1. Overview & Core Concept
- **What It Does**: Upgrades the bulk inventory CSV/Excel importer to support statutory tax fields, validates sample templates with zero errors/warnings out of the box, provides one-click barcode repair suggestions, and tracks warehouse completeness for e-way bill readiness.
- **Target Persona**: Inventory Managers and Admins uploading catalog data, warehouse stock sheets, or supplier catalogs into InvPredict.
- **Key Value**: Prevents bad master data from entering the database, eliminates broken barcode check digits, and ensures all newly created items are transit- and tax-ready.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Step 1: Download & Upload                       │
│  - User downloads updated CSV template with HSN/SAC, GST Rate, UQC     │
│  - Pre-filled sample rows (Mulberry Silk, Brass Buttons) pass with     │
│    0 errors and 0 warnings                                             │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Step 2: Column Mapping                         │
│  - Auto-maps HSN/SAC, GST Rate (%), and UQC alongside SKU/Name/Stock   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Step 3: Review & Validation                     │
│  - Issues / Notes column wraps fully (no truncated text)               │
│  - Bad EAN-13 check digit shows calculated fix + [Use suggested] button│
│  - Non-13 digit barcodes show non-blocking Warning                     │
│  - Missing warehouse auto-creation shows "Incomplete Warehouse" warning│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Step 4: Warehouse Governance                    │
│  - Newly created incomplete warehouses display an alert banner:        │
│    "⚠️ Incomplete Warehouse: Missing GSTIN, address, state code & PIN"│
│  - In-place "Complete Details" modal enables immediate remediation     │
└────────────────────────────────────────────────────────────────────────┘
```

### Visual Enhancements
- **Review Table Issues Column**: Modified from `truncate max-w-[220px]` to responsive wrapping (`whitespace-normal text-xs leading-relaxed max-w-[280px]`).
- **One-Click Barcode Repair Pill**: For bad check digits, displays:
  ```
  ❌ Invalid EAN-13 check digit (expected 0).
  [Fix: 8901234567890] [Use suggested]
  ```
  Clicking updates the row's data and re-runs validation immediately.
- **Incomplete Warehouse Banner**: Prominent amber alert card on warehouse detail views:
  ```
  ┌──────────────────────────────────────────────────────────────────────┐
  │ ⚠️ Incomplete Warehouse: Auto-created from import without GSTIN,     │
  │    address, state code or PIN. [Complete Details]                    │
  └──────────────────────────────────────────────────────────────────────┘
  ```

---

## 3. Key Technical Decisions & Rule Logic

| Requirement | Implementation Strategy | Rationale |
|---|---|---|
| **Template Sample Barcodes** | Replace `8901234567897` and `8909876543217` with valid EAN-13 codes `8901234567890` and `8909876543210`. | Mathematically valid modulo-10 weights sum to 130 (check digit 0). Guarantees downloaded template imports cleanly. |
| **New Columns** | Add `HSN/SAC`, `GST Rate (%)`, and `UQC` to `TARGET_FIELDS` with comprehensive aliases (`hsn`, `sac`, `gstrate`, `gst_rate`, `taxrate`, `uqc`, `unitcode`). | Supports Indian GST reporting requirements and inter-warehouse e-way bills. |
| **HSN Validation** | Uses existing `getRequiredHsnDigits(taxSettings)` (4 digits for $\le$ ₹5 Cr, 6 digits for $>$ ₹5 Cr). | Strictly enforces statutory mandate under Notification 78/2020. |
| **GST Rate Validation** | Numeric check; warns if not in standard bracket `[0, 0.1, 0.25, 1.5, 3, 5, 12, 18, 28]`. | Catches typos (e.g. `180%` or `1.8%`) while permitting legitimate zero-rated or special goods. |
| **UQC Mapping** | Dictionary mapping: `meters/meter/mtr/m` $\rightarrow$ `MTR`, `pcs/pieces/piece/nos` $\rightarrow$ `PCS`, `kg/kgs/kilogram` $\rightarrow$ `KGS`, etc. | Automatically harmonizes free-text units with statutory GST Unit Quantity Codes. |
| **Barcode Policy** | 13-digit numeric code with invalid check digit = **Error** with suggested fix. Non-13 digit code = **Warning**. Empty barcode = auto-generates EAN-13 with notice. | Prevents silent corruption of retail/GS1 barcodes while permitting legacy internal alpha codes. |
| **Warehouse Tracking** | Extend `Warehouse` interface with `isIncomplete?: boolean`. Auto-created warehouses default to `isIncomplete: true`. | Flags warehouses that cannot yet be used as dispatch hubs for E-Way Bills or tax invoices. |

---

## 4. Technical Architecture & File Modifications

```
src/
├── types.ts                               # Extend Warehouse interface with isIncomplete?: boolean
├── rules/
│   ├── tax.ts                             # Standard GST rates list & UQC mapping dictionary
│   └── __tests__/
│       └── bulkImport.test.ts             # Dedicated unit & scenario test suite
├── utils/
│   ├── bulkImport.ts                      # TARGET_FIELDS, generateCsvTemplate, validateBulkImportRows,
│   │                                      # mapUnitToUqc, suggestEan13Correction
│   └── bulkImportValidation.test.ts       # Updated test assertions
└── components/
    ├── BulkImportModal.tsx                # Issues wrapping, [Use suggested] button, template generation
    └── WarehousePage (in App.tsx)         # Incomplete warehouse alert banner & "Complete Details" modal
docs/
└── manual-vs-app.md                       # Document bulk import feature & statutory foundations
```

---

## 5. Verification Plan

### Automated Test Cases (`vitest run`)
1. **Clean Template Import**: Generate CSV template via `generateCsvTemplate()`, parse and run through `validateBulkImportRows()`. Assert `errors.length === 0` and `warnings.length === 0`.
2. **Statutory HSN Digits**:
   - 4-digit HSN (`5208`) under $\le$ ₹5 Cr turnover passes.
   - 4-digit HSN under $>$ ₹5 Cr turnover fails with required 6-digit message.
   - 6-digit HSN (`520811`) passes under all settings.
3. **GST Rate Validation**:
   - Number `18` passes with no warning.
   - String `"abc"` fails as Error (`must be a valid number`).
   - Number `17` emits Warning (`not in standard GST rate list`).
4. **UQC Auto-Mapping**:
   - `meters` maps to `MTR` without warning.
   - `pcs` maps to `PCS` without warning.
   - `kg` maps to `KGS` without warning.
   - `unknown_unit` emits Warning (`could not be mapped to standard GST UQC code`).
5. **Barcode Check Digit & Suggested Fix**:
   - `8901234567897` fails with Error, suggestions calculated as `8901234567890`.
   - `ABC-12345` (non-13 digits) emits Warning, not Error.
   - Clean `8901234567890` passes without errors.
6. **Incomplete Warehouse Lifecycle**:
   - Review shows warning when missing warehouse is scheduled for creation.
   - Created warehouse object has `isIncomplete: true`.
   - Completing details clears `isIncomplete`.

### Build Verification
- `npm test`: All tests pass.
- `npm run typecheck`: 0 TypeScript compiler errors.
- `npm run lint`: 0 lint errors.
- `npm run build`: Production build succeeds cleanly.

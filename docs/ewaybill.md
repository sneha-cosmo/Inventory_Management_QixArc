# InvPredict E-Way Bill Architecture & Statutory Operations Manual

## 1. Overview
The E-Way Bill (EWB) module provides statutory compliance for goods in transit under the Goods and Services Tax (GST) laws of India. It enables generating, viewing, updating conveyance vehicle details (Part-B), and cancelling electronic way bills from:
1. **Sales Orders / Invoices**: Active sales invoices while an order is in `pending` status (prior to physical dispatch/marking `shipped`).
2. **Inter-Warehouse Stock Transfers**: Stock transfer dispatches between company hubs and regional branches.

InvPredict implements a mock-first architecture that is production-ready for integration with any licensed GST Suvidha Provider (GSP) or Government NIC Portal.

---

## 2. Regulatory Citations & Statutory Rules

| Citation | Rule / Section | Implementation in InvPredict |
|---|---|---|
| **CGST Rule 138(1)** | Consignment Value Thresholds | Inter-state movements exceeding ₹50,000 mandatorily require an E-Way Bill. Below threshold, voluntary generation is permitted. |
| **State GST Notifications** | Intra-State Threshold Overrides | Configurable per state. Tamil Nadu (Notification 04/2018-State Tax) and Maharashtra intra-state thresholds are defaulted to ₹1,00,000. Other states default to ₹50,000. |
| **CGST Rule 138(9)** | Cancellation Window | An E-Way Bill can strictly only be cancelled within **24 hours** of generation, provided the conveyance has not been intercepted in transit. Attempted cancellation after 24 hours is rejected. |
| **CGST Rule 138(10)** | Validity Period by Distance | **Regular Cargo**: 1 day for every 200 km or part thereof.<br>**Over Dimensional Cargo (ODC)**: 1 day for every 20 km or part thereof. Expiry countdown is computed against the injectable central `Clock`. |
| **CGST Rule 55** | Delivery Challan for Non-Sale Transfers | Same-GSTIN internal stock transfers generate a Rule 55 Delivery Challan with ₹0 tax liability and no revenue/COGS recognition. |
| **CGST Act Section 25(4)** | Distinct Persons Tax Invoicing | Branch transfers between distinct GSTIN registrations constitute supply between distinct persons; system displays statutory warning that a Tax Invoice is required. |
| **Accountant Confirmation** | Mandatory Advisory | "Confirm current rules with your accountant" note is permanently visible on all settings and applicability indicators. |

---

## 3. Architecture & Provider Abstraction

### Interface: `EwayBillProvider` (`src/services/ewayBillProvider.ts`)
```typescript
export interface EwayBillProvider {
  generate(request: EwayBillGenerateRequest): Promise<EwayBill>;
  getByNumber(ewbNo: string): Promise<EwayBill | null>;
  updateVehicle(ewbNo: string, request: EwayBillUpdateVehicleRequest): Promise<EwayBill>;
  cancel(ewbNo: string, request: EwayBillCancelRequest): Promise<EwayBill>;
}
```

### Provider Implementations:
1. **`MockEwayBillProvider` (Default)**:
   - In-memory simulated provider with pre-seeded data.
   - Generates valid 12-digit E-Way Bill numbers (e.g., `381000...`).
   - Idempotent: Subsequent generation requests for the same invoice/transfer return the existing active bill.
   - Prominently flags `isSandbox: true` and displays **"SANDBOX - NOT A REAL E-WAY BILL"** in UI badges, print preview modal watermarks, and audit logs.
   - Enforces 24-hour statutory cancellation rules.

2. **`GspProviderSkeleton` (Production / Staging)**:
   - Routes API calls via secure server-side endpoints (`/api/ewb/generate`, `/api/ewb/update-vehicle`, `/api/ewb/cancel`).
   - Keeps client bundle completely free of credentials.

### Switching Providers via Environment Variables
Set the environment variable in `.env`:
```bash
# Provider selection: 'mock' | 'sandbox' | 'live'
VITE_GST_PROVIDER=mock
```
- In production, serverless API routes (`api/ewb/*.ts`) securely read `GSP_CLIENT_ID`, `GSP_CLIENT_SECRET`, `GSTIN_USERNAME`, and `GSTIN_PASSWORD` per registered warehouse GSTIN.

---

## 4. Security Hardening & Zero-Leakage Policy
1. **No Browser Secrets**:
   - GSP credentials, client secrets, and bearer auth tokens are strictly forbidden from browser JavaScript, `localStorage`, `sessionStorage`, or Git commits.
   - The browser interface only communicates with application endpoints.
2. **Access Control (RBAC)**:
   - **Generation**: `admin`, `inventory_manager`, and `billing_clerk` can generate E-Way Bills for their respective operational documents.
   - **Cancellation**: Strictly restricted to `admin` clearance (as unauthorized cancellation risks transit seizure and penal action). Non-admin roles see a disabled action with a permission tooltip.
3. **Audit Trails**:
   - Every operation (`Generate`, `Update Vehicle`, `Cancel`, `Generation Failure`) records an immutable audit log entry capturing the operator name, role, timestamp, document reference, distance, and sandbox tag.

---

## 5. UI & Operational Workflow

### Sales Orders & Invoicing:
1. In the **Sales Orders** page (`/sales`), orders reside in `pending` until physically dispatched.
2. While `pending`, viewing the order's generated invoice opens the **E-Way Bill Panel**:
   - Displays real-time statutory readiness check (HSN code length, valid PIN codes, warehouse & customer addresses, transport mode, vehicle plate format).
   - Shows applicability determination (e.g., *Mandatory: Inter-state consignment > ₹50,000*).
   - Generates the EWB or Delivery Challan.
   - Provides an official NIC-style print preview modal with watermarking and QR representation.
3. When clicking **"Mark as Shipped"**, if an E-Way Bill is statutory **Required** and missing, a non-blocking confirmation warning alerts the operator before proceeding.

### Branch Sync & Stock Transfers:
1. In the **Branch Sync & Transfer** page (`/branch_sync`), transfer creation collects transportation details:
   - Transporter Name & Transporter ID (optional)
   - Transport Mode (Default: Road)
   - Vehicle Registration Number (with live non-blocking validation warning for non-standard formats)
   - Approximate Distance in km (mandated under Rule 138)
2. Transfer rows display:
   - E-Way Bill status badge with expiry countdown (e.g., `Active (expires in 48h)` or `EXPIRED in transit`).
   - Delivery Challan view button showing Rule 55 compliance for same-GSTIN transfers.
   - Filter dropdown includes **"EWB Missing & Required"** to quickly identify unpermitted dispatches.

---

## 6. Testing & Quality Assurance
Run the test suite:
```bash
npm test
```
The test suite (`src/rules/__tests__/ewayBillRules.test.ts`) verifies:
- Complete applicability matrix (inter-state, intra-state Tamil Nadu/Maharashtra overrides, exempt items).
- Delivery Challan Rule 55 generation with ₹0 tax liability.
- Vehicle number format checks (warning without blocking).
- Rule 138(10) distance validity calculation (regular vs ODC).
- Rule 138(9) 24h statutory cancellation cutoff.
- RBAC permissions (Admin-only cancellation).
- Idempotent generation.
- Zero secrets leakage.

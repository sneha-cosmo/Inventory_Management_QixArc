# InvPredict: Inventory Management System - User Handbook

Welcome to **InvPredict**, your all-in-one solution for warehouse management, production tracking, and automated billing. This document provides a comprehensive overview of the application's features and how to use them.

---

## 🚀 Getting Started

InvPredict is designed to be mobile-first and technically robust, featuring a sleek, industrial-grade UI. The primary navigation is located on the **Left Sidebar** (Desktop) or the **Bottom Bar** (Mobile).

### Core Layout:
- **Sidebar**: Switch between Dashboard, Inventory, Orders (Production), Sales, Billing, and Audit logs.
- **Header**: Contains the **Finder (Smart Scanner)**, settings, and user profile.

---

## 🔍 The Finder (Smart Scanner)
The Finder is the most powerful tool for quickly managing your stock.
1. Click the **Scan (Square)** icon in the top header.
2. **Scan**: Aim your physical scanner at a barcode (or click a simulated item in the demo).
3. **Manual Entry**: Type the SKU, Barcode number, or Item Name into the input field.
4. **Action**: Press Enter to instantly jump to that item's stock adjustment or details.

---

## 📦 Inventory Management
### Adding New Items
1. Go to the **Inventory** tab.
2. Click **Add New Item**.
3. Fill in the **Logistics Parameters**:
   - **Daily Consumption**: Average amount used per day.
   - **Lead Time**: How many days it takes for new stock to arrive.
   - **Safety Stock**: Buffer stock to prevent stockouts.
4. **Barcode Generation**: Use the "Barcode" icon next to the barcode field to generate a random EAN-13 code if you don't have one.

### Stock Levels
- **Adjust Stock**: Use this for manual corrections (damaged goods, returns, physical audit corrections).
- **Health Indicators**: Stock levels are automatically color-coded:
  - <span style="color:red">**Critical**</span>: Stock is below the Minimum Level.
  - <span style="color:orange">**Low**</span>: Approaching reorder point.
  - <span style="color:green">**Optimal**</span>: Levels are healthy.

### Bulk Import (Items)
Admins and Inventory Managers can import up to 5,000 inventory items at once using CSV or Excel files.
- **Access**: Click **Import** next to **Add New Item** on the Item Master page. (Disabled for Billing Clerks and Viewers).
- **4-Step Wizard**:
  1. **Upload**: Drag-and-drop or pick a `.csv`, `.xlsx`, or `.xls` file (max 5,000 rows, 5 MB). Click "Download CSV Template" for a pre-formatted template with example rows.
  2. **Map Columns**: Headers are auto-matched using aliases (e.g. `Item Code` -> `SKU`, `Qty` -> `Current Stock`). Required fields (*SKU, Item Name, Category, Unit*) must be mapped.
  3. **Review & Validate**: View Valid, Warning, and Error counts. Filter by status, search items, edit cells inline, or download an "Errors Only CSV".
     - **Duplicate Policy**: Skip duplicates (default), Update existing items, or Reject whole file.
     - **Missing Categories/Warehouses**: Toggle auto-creation of missing categories and warehouses.
     - **Import Mode**: "Import valid rows only" or "All or nothing".
  4. **Import & Done**: Asynchronously chunked processing ensures zero UI freezing. Summary reports Created, Updated, Skipped, and Failed counts. Automatically logs a single detailed audit trail entry with opening stock details.

### Batch & Expiry Import
Register batches, manufacturing dates, and expiration records in bulk for existing inventory items.
- **Access**: Click **Import Batches** on the Batch Tracking page next to **Assign Batch Lot**.
- **Template Columns**:
  - `Batch Number` (required)
  - `SKU` (required; must link to an existing inventory master item)
  - `Warehouse` (required)
  - `Quantity` (required; number > 0)
  - `Manufacturing Date` (optional; YYYY-MM-DD or DD/MM/YYYY)
  - `Expiry Date` (required; must be after manufacturing date)
  - `Batch ID` (optional; system-generated if omitted)
- **Supported Date Formats**: `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY` (Indian format; day first), and Excel serial numbers.
- **Stock Reconciliation Rule**: In this system, item stock is the sum of its batches. Importing batches automatically raises the parent item's stock and warehouse stock allocation by the imported quantity.
- **Reconciliation Table**: Review tab displays a live per-SKU parity ledger: Current Stock, Existing Batches, Imported Qty, Resulting Batches, and Resulting Stock.
- **Duplicate Policy**: Skip duplicates (default), Add quantity to existing batch, or Reject whole file.
- **Expiry Health Badges**:
  - `Expired`: Expiry in the past ($\le 0$ days; allowed with warning for legacy stock loading)
  - `Critical`: $\le 7$ days left
  - `Near Expiry`: 8 to 30 days left
  - `Healthy`: $> 30$ days left
- **Audit Trail**: Exactly ONE audit entry created per batch import recording file name, created/updated/skipped/failed counts, duplicate policy, total quantity loaded, and count of expired/critical batches.

---

## ⚙️ Production & Work Orders
Track the raw materials as they turn into finished goods.
- **Workflow**: Items move from **Awaiting** -> **Active** -> **Completed**.
- **Efficiency tracking**: Each order tracks the planned vs. actual output.
- **Integration**: Completing an order automatically updates inventory levels.

---

## 💰 Sales & Billing
### Creating Sales Orders
1. Go to the **Sales** tab.
2. Click **New Sales Order** or use **Scan to Sell** to find items via barcode.
3. Select the customer and items. The system will prevent you from overselling stock you don't have.

### Invoicing
- **Automatic Generation**: Every Delivered order generates an invoice.
- **View & Print**: Click the **View** button in the Sales table or **Print** in the Billing tab to open a professional invoice.
- **Professional Layout**: Invoices include your company header, GST details, billing address, and itemized breakdown with tax info.

---

## 🛡️ Security & Audit
### Audit Logs
Every critical change—from a barcode update to a stock adjustment—is recorded in the **Audit** tab. This ensures high accountability in multi-user environments.

### Warehouse Tracking
Manage multiple locations. View stock health per warehouse to optimize local distribution.

---

## 🔔 In-App Notification Center

The Notification Center resides directly in the top application header, providing real-time visibility into high-impact operational events.

### Header Bell & Unread Counter
- A bell icon displays an unread count badge (capped at `99+` for large queues).
- Clicking the bell reveals a responsive drawer panel with categorized tabs: **All**, **Stock**, **Expiry**, and **Finance**.

### Smart Filtering & Action Links
- **One-Click Reorder**: Clicking "Reorder Now" on low stock warnings jumps to the Purchase Orders view and pre-fills the purchase order dialog with recommended reorder quantities.
- **Batch Inspection**: Deep-links into the batch ledger filtered by lot number for quick quarantine or priority dispatch.
- **Invoice Resolution**: Direct navigation to unpaid or overdue invoices.
- **Transfer Tracking**: Direct navigation to logistics transfer tracking.

### Operational Controls
- **Mark Read / Unread**: Toggle individual notifications or click **Mark all as read**.
- **Snooze**: Temporarily hide non-urgent items for 1 Day or 7 Days. If conditions escalate to Critical, the item breaks snooze automatically.
- **Dismiss**: Manually remove alerts for resolved or acknowledged items.

### Settings & Threshold Configuration
Authorized users (Admin & Inventory Manager) can configure alert parameters via the gear icon:
- **Near-Expiry Threshold**: Days in advance to warn of batch expiration (default 30 days).
- **Critical-Expiry Threshold**: Days threshold for critical alert (default 7 days).
- **Stuck Transfer Threshold**: Days threshold for shipments in transit (default 3 days).
- **Channel Switches**: Toggle individual notification categories on or off.
- **Audit Verification**: Every parameter update creates a traceable 6-field audit log record.

---


## 🛠️ Technical Specs
- **Engine**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Animations**: Motion (framer-motion)
- **Data**: Real-time relational syncing with local state (Firestore-ready).

# Inventory Reorder & Variance System (React SPA)

A comprehensive React application built with TypeScript, Vite, Tailwind CSS, Base UI, and Recharts. The application provides warehouse inventory management, manufacturing order cost variance tracking, predictive stock reordering, batch and expiration tracking, multi-branch synchronization, FIFO valuation, GST (GSTR-1) compliance, and role-based access control.

## Technology Stack
- **Framework**: React 18 SPA (TypeScript)
- **Bundler & Dev Server**: Vite (listening on `0.0.0.0:3000`)
- **Styling**: Tailwind CSS v4 with Shadcn Nova design tokens
- **Component Primitives**: Base UI (`@base-ui/react`), Lucide React icons
- **Data Visualization**: Recharts (Responsive bar charts, variance trackers, slab distributions)
- **Data Processing**: PapaParse (CSV streaming), XLSX (Excel parser), math-based EAN-13 barcode generation

## Core Features
1. **Item Master & Logistics Parameters**: Real-time inventory tracking across multiple warehouses, minimum thresholds, safety stocks, daily consumption rates, and lead times.
2. **Predictive Reorder Engine**: Automated reorder recommendations with calculated EOQ and lead time buffers.
3. **Batch & Expiry Management**: Multi-batch tracking with expiration countdowns, status bands (Expired, Critical, Near Expiry, Healthy), and quarantine workflows.
4. **Production Planning & Variance Analysis**: Planned vs. actual material rate and consumption tracking with manufacturing efficiency KPIs.
5. **Multi-Warehouse & Branch Sync**: Inter-warehouse stock transfers, tracking IDs, in-transit status monitoring, and sync latency metrics.
6. **GST Portal & Easy Tax Filing**: Automated GSTR-1 preparation, Table 4A (B2B), Table 5 & 7 (B2C), Table 12 (HSN/SAC summary), ITC offset reconciliation, and GSTN-compliant JSON / CSV export.
7. **Tally ERP Integration & Ledger Sync**: Automated voucher generation and XML export for Tally accounting software.
8. **Bulk & Batch Spreadsheets Importer**: Drag-and-drop CSV/XLSX import wizard with column auto-matching, inline cell validation, formula-injection defense, and non-blocking chunked processing.
9. **In-App Notification Center**: Deduplicated alerts for low stock, expiring lots, overdue invoices, and delayed transit.
10. **Role-Based Access Control (RBAC)**: Fine-grained permissions for Admin, Inventory Manager, Production Supervisor, Billing Clerk, and Staff Viewer.
11. **Bilingual Support**: Instant toggle between English and Tamil (தமிழ்).


### How to Use It
1. Navigate to **Item Master** (Inventory page).
2. Click the **Import** button located next to **Add New Item**. (Note: Billing Clerks and Staff Viewers have this button disabled with a clearance tooltip).
3. Follow the 4-step wizard:
   - **Step 1 - Upload**: Upload your file (`.csv`, `.xlsx`, or `.xls`) via drag-and-drop or file picker. You can also click **Download CSV Template** to download a ready-to-use template with example rows.
   - **Step 2 - Map Columns**: Headers are automatically matched using aliases (e.g. `Item Code` to `SKU`, `Qty` to `Current Stock`). Adjust any mapping using dropdowns. All required fields (*SKU, Item Name, Category, Unit*) must be mapped.
   - **Step 3 - Review & Validate**: View comprehensive validation stats (Valid / Warning / Error counts).
     - Select a duplicate policy: **Skip duplicates** (default), **Update existing items**, or **Reject whole file**.
     - Enable or disable auto-creation of missing categories and warehouses.
     - Select import mode: **Import valid rows only** (default) or **All or nothing**.
     - Fix cells inline or download an **Errors Only CSV**.
   - **Step 4 - Import & Done**: Watch the responsive progress bar as items are processed in non-blocking asynchronous chunks. View final summary counts and see new items reflected immediately in your inventory master with calculated stock-health status.

### Template Columns
| Column Name | Required | Type | Description |
| ----------- | -------- | ---- | ----------- |
| `SKU` | Yes | String | Unique stock keeping unit code |
| `Item Name` | Yes | String | Descriptive product/item name |
| `Barcode` | No | String | 13-digit EAN code (auto-generated if empty) |
| `Description` | No | String | Extended item notes or description |
| `Category` | Yes | String | Item category (e.g., Fabrics, Threads, Accessories) |
| `Unit` | Yes | String | Unit of measure (e.g., kg, pcs, rolls, mtr, cones) |
| `Unit Cost` | No | Number | Purchase cost per unit (>= 0) |
| `Selling Price` | No | Number | Selling price per unit (>= 0) |
| `Current Stock` | No | Number | Initial quantity on hand (>= 0) |
| `Minimum Threshold` | No | Number | Reorder threshold level (>= 0) |
| `Safety Stock` | No | Number | Safety buffer stock (>= 0) |
| `Daily Usage` | No | Number | Daily consumption rate (>= 0) |
| `Lead Time (days)` | No | Number | Supplier delivery lead time in days (>= 0) |
| `Warehouse` | No | String | Destination warehouse name or ID |

### System Limits & Security Rules
- **File Types**: `.csv`, `.xlsx`, `.xls`
- **Max File Size**: 5 MB
- **Max Rows**: 5,000 rows per file
- **Formula Injection Defense**: Cells starting with `=`, `+`, `-`, `@` in text fields are rejected to prevent spreadsheet formula injection. Whitespace is automatically trimmed and strings capped at 1,000 characters.
- **Audit Logging**: Exactly one consolidated audit entry is recorded per import batch with file name, created/updated/skipped/failed counts, duplicate policy, and total opening stock loaded.

---

## Batch & Expiry Import Feature
The Batch & Expiry Import feature allows Admins and Inventory Managers to register manufacturing and expiry dates for batches linked to existing inventory items.

### How to Use It
1. Navigate to **Batch Tracking** (Batches page).
2. Click the **Import Batches** button next to **Assign Batch Lot**. (Disabled for Billing Clerks with a security tooltip).
3. Follow the 4-step wizard:
   - **Step 1 - Upload**: Upload your file (`.csv`, `.xlsx`, or `.xls`). You can also click **Download CSV Template** (pre-filled with valid date formats).
   - **Step 2 - Map Columns**: Headers are matched automatically using aliases (e.g. `Lot` $\to$ `Batch Number`, `Expiration` $\to$ `Expiry Date`). All required fields (*Batch Number, SKU, Warehouse, Quantity, Expiry Date*) must be mapped.
   - **Step 3 - Review & Reconciliation**:
     - View Expiry Health status cards (Expired, Critical, Near Expiry, Healthy).
     - Select duplicate policy: **Skip duplicates** (default), **Add quantity to existing batch**, or **Reject whole file**.
     - Open the **Stock Reconciliation Table** to verify that resulting batch quantities match the parent item's resulting stock to prevent variance.
     - Inline edit cells or download an **Errors Only CSV**.
   - **Step 4 - Import & Done**: Processes batches asynchronously in chunks with an animated progress bar. Updates parent item stock and logs a consolidated audit trail entry.

### Batch Template Columns
| Column Name | Required | Type | Description |
| ----------- | -------- | ---- | ----------- |
| `Batch Number` | Yes | String | Unique manufacturing lot/batch number |
| `SKU` | Yes | String | Parent SKU (must exist in Item Master; items cannot be created here) |
| `Warehouse` | Yes | String | Warehouse depot name or ID |
| `Quantity` | Yes | Number | Number of batch units (> 0) |
| `Manufacturing Date` | No | String / Date | Production date (YYYY-MM-DD or DD/MM/YYYY) |
| `Expiry Date` | Yes | String / Date | Expiration date (must be after manufacturing date) |
| `Batch ID` | No | String | Optional system batch identifier |

### Stock Relationship & Rule
In this application, **an item's stock is the sum of its batches**. When batches are imported:
1. The parent item's `currentStock` is automatically raised by the imported batch quantity.
2. The warehouse's allocation in `stockLevels` is raised by the batch quantity.
3. If "Add quantity to existing batch" is selected, the existing batch quantity increases and the audit log records both the old and new quantities.

---

## In-App Notification Center

The in-app Notification Center continuously monitors stock shortages, batch expirations, overdue invoices, and transit delays, warning the right staff at the right time without generating alert noise.

### Notification Types
1. **Low Stock**: Items at or below calculated reorder level (`(dailyConsumption * leadTime) + safetyStock`), or under 15 days of stock (Warning) / under 5 days of stock (Critical).
2. **Out of Stock**: Items with 0 inventory on hand (Critical).
3. **Expired Batch**: Batches past their expiry date (Critical).
4. **Expiring Soon**: Batches expiring within 7 days (Critical) or within 30 days (Warning).
5. **Overdue Invoices**: Sales invoices past their payment due date (Admin and Billing Clerk only).
6. **Stuck in Transit**: Stock transfers remaining in 'transit' status beyond the configured threshold (default: 3 days).

### Smart Alert Rules
- **Deduplication**: Strictly one notification per entity and alert type.
- **Auto-Removal**: Notifications automatically disappear when conditions resolve (e.g., stock replenished, batch sold or disposed, invoice paid).
- **Open Purchase Order Suppression**: Low-stock items with open POs (ordered or pending) are suppressed from urgent warnings and rendered as lower-priority "Replenishment On Order" info notices.
- **Escalation**: When an alert escalates from Warning to Critical (e.g. stock drops to zero or expiry enters the critical 7-day band), snooze is broken and the notification is re-marked as unread and moved to the top.
- **Per-User State**: Read, dismissed, and snoozed states are persisted per staff member and not shared across accounts.

### Navigation Actions
Each notification row provides a one-click deep link to:
- **Pre-filled Reorder PO**: Automatically navigates to Purchase Orders and opens the PO modal pre-filled with the affected item and calculated reorder quantity.
- **Batch Inspection**: Navigates to Batch Tracking pre-filtered by batch lot.
- **Item Details & Corrections**: Navigates to Inventory Management pre-filtered by SKU.
- **Invoice Review**: Navigates to Billing pre-filtered by invoice ID.
- **Transfer Tracking**: Navigates to Logistics/Branch Sync pre-filtered by tracking number.

### Settings & Governance (Admin & Inventory Manager)
- Configurable thresholds: Near-Expiry Days (default: 30), Critical-Expiry Days (default: 7), Stuck Transfer Days (default: 3).
- Individual channel toggles for all notification categories.
- Strict input validation: integer values, logical bounds, and critical days strictly less than near-expiry days.
- **Audit Trail**: Every modification writes a single audit entry capturing who, role, previous settings, and updated settings.

### Scope Notice
> **Future Scope**: External notification delivery channels (Email, SMS, WhatsApp, and Web Push notifications) are deferred to future scope as there is currently no backend server infrastructure.


# Permissions & RBAC Enforcement Audit

This document records the comprehensive audit of all action triggers in InvPredict across every module, comparing authorization enforcement before and after hardening.

## Access Policy Matrix (Default Clearances)

- **Super Admin (`admin`)**: Unrestricted access to all system actions and configurations.
- **Inventory Manager (`inventory_manager`)**: Full operational access to physical stock, item master, batches, adjustments, damage resolution, inter-branch transfers, warehouses, suppliers, purchase orders, goods receipt, production planning, and e-way bills. Restricted from customer management, sales orders, billing/invoicing, payments, staff management, and audit log modification.
- **Billing Clerk (`billing_clerk`)**: Access to sales orders, shipments, invoices, IRN registration, payment recording, customer management, GST filing, Tally synchronization, and e-way bills. Restricted from item master, warehouses, suppliers, POs, goods receipt, stock adjustments, batch operations, recall, and production.
- **Production Supervisor (`production_supervisor`)**: Access to work order planning, material consumption actuals recording, and production history analytics. Restricted from items, warehouses, suppliers, customers, POs, sales, payments, and staff management.
- **Staff Viewer (`viewer`)**: Strictly read-only analytics and inventory views. Restricted from all create, edit, delete, approve, import, or recall actions.

---

## Action Audit Table

| Action | UI Location | Permission Required | Roles Allowed | Enforced Before | Enforced After |
|---|---|---|---|---|---|
| **Create Item** | Item Master (`InventoryMgmtPage` -> `AddItemDialog`) | `editInventory` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Edit Item** | Item Master (`InventoryMgmtPage` -> Table Row Action) | `editInventory` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Delete Item** | Item Master (`InventoryMgmtPage` -> Table Row Action) | `editInventory` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Bulk Import Items** | Item Master (`InventoryMgmtPage` -> Import Button) | `editInventory` | Admin, Inventory Manager | ⚠️ Partial (Role string check & alert) | ✅ Yes (Control disabled with tooltip; handler refuses via `can()` and logs audit event) |
| **Create Warehouse** | Warehouses (`WarehousePage` -> `AddWarehouseDialog`) | `manageWarehouses` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Update Warehouse Details** | Warehouses (`WarehousePage` -> Complete Details Modal) | `manageWarehouses` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Create Supplier** | Purchase (`PurchasePage` -> `AddSupplierDialog`) | `manageSuppliers` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Generate Purchase Order** | Purchase (`PurchasePage` -> `AddPurchaseOrderDialog`) | `createPO` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Receive Goods on PO** | Purchase (`PurchasePage` -> `ReceiveGoodsDialog`) | `receivePO` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Create Sales Order** | Sales (`SalesPage` -> `AddSalesOrderDialog`) | `createSO` | Admin, Billing Clerk | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Ship / Dispatch Sales Order** | Sales (`SalesPage` -> `ShipOrderDialog` / Status Action) | `shipOrder` | Admin, Billing Clerk | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Record Payment** | Billing (`BillingPage` -> `RecordPaymentDialog`) | `recordPayment` | Admin, Billing Clerk | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Create Customer** | Billing (`BillingPage` -> `AddCustomerDialog`) | `manageCustomers` | Admin, Billing Clerk | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Generate E-Invoice & IRN** | Billing / Sales (`BillingPage` -> Invoice Table Action) | `generateInvoices` | Admin, Billing Clerk | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Record Stock Adjustment** | Adjustments (`AdjustmentPage` -> `AddAdjustmentDialog`) | `makeAdjustments` | Admin, Inventory Manager | ⚠️ Partial (Alert only; control enabled) | ✅ Yes (Control disabled with tooltip; handler refuses via `can()` and logs audit event) |
| **Assign / Create Batch** | Batches (`BatchPage` -> `AddBatchDialog`) | `manageBatches` | Admin, Inventory Manager | ⚠️ Partial (Disabled in UI; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses via `can()` and logs audit event) |
| **Bulk Import Batches** | Batches (`BatchPage` -> Import Button) | `manageBatches` | Admin, Inventory Manager | ⚠️ Partial (Disabled in UI; alert in handler) | ✅ Yes (Control disabled with tooltip; handler refuses via `can()` and logs audit event) |
| **Split & Merge Batches** | Batches (`BatchPage` -> `SplitMergePanel`) | `manageBatches` | Admin, Inventory Manager | ⚠️ Partial (Alert in panel) | ✅ Yes (Control disabled with tooltip; handler refuses via `can()` and logs audit event) |
| **Initiate Batch Recall** | Batches (`BatchPage` -> `RecallDialog`) | `executeRecall` | Admin, Inventory Manager | ⚠️ Partial (Disabled in UI; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses via `can()` and logs audit event) |
| **Create Stock Transfer** | Transfers (`BranchSyncTransferPage` -> `AddTransferDialog`) | `transferStock` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Dispatch Transfer Shipment** | Transfers (`BranchSyncTransferPage` -> Table Action) | `transferStock` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Receive Transfer Shipment** | Transfers (`BranchSyncTransferPage` -> Table Action) | `transferStock` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Synchronize Branch Data** | Transfers (`BranchSyncTransferPage` -> Sync Buttons) | `syncBranches` | Admin, Inventory Manager | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Controls disabled with tooltip; handler refuses and logs audit event) |
| **Resolve Dead/Damaged Stock** | Dead & Damaged (`DeadStockDamagedPage` -> Action Form) | `makeAdjustments` | Admin, Inventory Manager | ⚠️ Partial (Alert in handler; control enabled) | ✅ Yes (Control disabled with tooltip; handler refuses via `can()` and logs audit event) |
| **Create Production Plan** | Planning (`PlanningPage` -> "Add to Plan" Button) | `manageProduction` | Admin, Inventory Manager, Production Supervisor | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Record Consumption Actuals** | Consumption (`ConsumptionPage` -> "Complete Work Order") | `recordConsumption` | Admin, Inventory Manager, Production Supervisor | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Onboard Staff Member** | Staff Permissions (`RoleStaffManagementPanel` -> Form) | `manageStaff` | Admin | ⚠️ Partial (Tab guarded; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Update Staff Permissions** | Staff Permissions (`RoleStaffManagementPanel` -> Matrix) | `manageStaff` | Admin | ⚠️ Partial (Tab guarded; handler unguarded) | ✅ Yes (Controls disabled with tooltip; handler refuses and logs audit event) |
| **Delete Staff Member** | Staff Permissions (`RoleStaffManagementPanel` -> Table) | `manageStaff` | Admin | ⚠️ Partial (Tab guarded; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Delete Audit Log Entry** | Audit Logs (`AuditLogPage` -> Row Action) | `manageAuditLogs` | Admin | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Factory Reset All Logs** | Audit Logs (`AuditLogPage` -> Reset Button) | `manageAuditLogs` | Admin | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Tally Export & Sync** | Tally Sync (`TallySyncPanel` -> Export/Sync Buttons) | `manageTallyGst` | Admin, Billing Clerk | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Controls disabled with tooltip; handler refuses and logs audit event) |
| **File GST Returns** | Easy Tax Filing (`EasyTaxFilingPanel` -> File Buttons) | `manageTallyGst` | Admin, Billing Clerk | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Controls disabled with tooltip; handler refuses and logs audit event) |
| **Generate E-Way Bill** | E-Way Bills (`EwayBillPanel` / Invoices / Transfers) | `generateEwayBill` | Admin, Inventory Manager, Billing Clerk | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |
| **Cancel E-Way Bill** | E-Way Bills (`EwayBillPanel` -> Cancel Button) | `cancelEwayBill` | Admin | ❌ No (Enabled for all; handler unguarded) | ✅ Yes (Control disabled with tooltip; handler refuses and logs audit event) |

---

## Handler-Level Refusal & Audit Behavior

Every action handler implements a dual guard:
1. **User Interface Guard**: If `!can(currentUser, permission)`, the trigger button is wrapped with a disabled container displaying a clear tooltip explaining that the active user's profile lacks the required permission.
2. **Server/Handler Guard**: If a stale, programmatic, or scripted click reaches the handler when `!can(currentUser, permission)`, the handler immediately rejects execution without modifying state and writes a formal 6-field audit entry:
   - **Action**: `"Permission denied"`
   - **User**: `currentUser.name`
   - **Role**: `currentUser.role`
   - **Details**: Full contextual message identifying the attempted action and missing permission key.

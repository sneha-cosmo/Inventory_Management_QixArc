/**
 * Pure Domain Rules: Role-Based Access Control (RBAC) Permissions Matrix
 * Single source of truth for authorization across all application modules.
 */

export type StaffRole =
  | 'admin'
  | 'inventory_manager'
  | 'billing_clerk'
  | 'production_supervisor'
  | 'viewer'
  | 'staff_viewer'; // legacy alias for viewer

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: 'Super Admin',
  inventory_manager: 'Inventory Manager',
  billing_clerk: 'Billing Clerk',
  production_supervisor: 'Production Supervisor',
  viewer: 'Staff Viewer',
  staff_viewer: 'Staff Viewer'
};

export type PermissionKey =
  | 'editInventory'
  | 'manageWarehouses'
  | 'manageSuppliers'
  | 'manageCustomers'
  | 'createPO'
  | 'receivePO'
  | 'createSO'
  | 'shipOrder'
  | 'recordPayment'
  | 'generateInvoices'
  | 'makeAdjustments'
  | 'manageBatches'
  | 'recallBatch'
  | 'executeRecall'
  | 'transferStock'
  | 'syncBranches'
  | 'manageProduction'
  | 'recordConsumption'
  | 'viewFinancials'
  | 'viewReports'
  | 'manageStaff'
  | 'manageStaffRoles'
  | 'manageAuditLogs'
  | 'manageTallyGst'
  | 'generateEwayBill'
  | 'cancelEwayBill'
  | 'configureSettings';

export interface UserLike {
  id?: string;
  name?: string;
  role: string;
  permissions?: Record<string, boolean>;
}

/**
 * Standard default permissions granted by role alone.
 */
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  admin: [
    'editInventory',
    'manageWarehouses',
    'manageSuppliers',
    'manageCustomers',
    'createPO',
    'receivePO',
    'createSO',
    'shipOrder',
    'recordPayment',
    'generateInvoices',
    'makeAdjustments',
    'manageBatches',
    'recallBatch',
    'executeRecall',
    'transferStock',
    'syncBranches',
    'manageProduction',
    'recordConsumption',
    'viewFinancials',
    'viewReports',
    'manageStaff',
    'manageStaffRoles',
    'manageAuditLogs',
    'manageTallyGst',
    'generateEwayBill',
    'cancelEwayBill',
    'configureSettings'
  ],
  inventory_manager: [
    'editInventory',
    'manageWarehouses',
    'manageSuppliers',
    'createPO',
    'receivePO',
    'makeAdjustments',
    'manageBatches',
    'recallBatch',
    'executeRecall',
    'transferStock',
    'syncBranches',
    'manageProduction',
    'recordConsumption',
    'viewFinancials',
    'viewReports',
    'generateEwayBill',
    'configureSettings'
  ],
  billing_clerk: [
    'createSO',
    'shipOrder',
    'generateInvoices',
    'recordPayment',
    'manageCustomers',
    'viewFinancials',
    'viewReports',
    'manageTallyGst',
    'generateEwayBill'
  ],
  production_supervisor: [
    'manageProduction',
    'recordConsumption',
    'viewFinancials',
    'viewReports'
  ],
  viewer: [
    'viewFinancials',
    'viewReports'
  ],
  staff_viewer: [
    'viewFinancials',
    'viewReports'
  ]
};

export const CANONICAL_ROLES = [
  'admin',
  'inventory_manager',
  'billing_clerk',
  'production_supervisor',
  'viewer'
] as const;

/**
 * Mapping of the 9 fine-grained matrix switches to the underlying permission keys they control.
 * Switches act as per-user overrides on top of role defaults.
 */
export const SWITCH_TO_PERMISSIONS_MAP: Record<string, PermissionKey[]> = {
  createOrders: ['createPO', 'receivePO', 'createSO', 'shipOrder'],
  editInventory: ['editInventory'],
  makeAdjustments: ['makeAdjustments'],
  manageBatches: ['manageBatches', 'recallBatch', 'executeRecall'],
  manageWarehouses: ['manageWarehouses', 'transferStock', 'syncBranches'],
  viewFinancials: ['viewFinancials'],
  manageStaff: ['manageStaff', 'manageStaffRoles'],
  generateReports: ['viewReports', 'manageTallyGst'],
  deleteAuditLogs: ['manageAuditLogs'],
  // Legacy / UI aliases
  recordPayments: ['recordPayment'],
  manageSuppliers: ['manageSuppliers'],
  executeRecall: ['executeRecall', 'recallBatch'],
  viewReports: ['viewReports']
};

/**
 * Normalizes a role string to one of the 5 canonical role IDs.
 */
export function normalizeRole(role: string): string {
  const cleaned = (role || '').toLowerCase().trim();
  if (cleaned === 'staff_viewer') return 'viewer';
  return cleaned;
}

/**
 * Single source of truth permission evaluator.
 * Evaluates whether a user has permission based on role defaults and per-user switch overrides.
 */
export function can(
  user: UserLike | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user || !user.role) return false;
  const role = normalizeRole(user.role);

  // Admin always has full clearance across all operations
  if (role === 'admin') return true;

  // HARD BOUNDARIES that can NEVER be granted by switches to certain roles:
  // 1. Staff Viewer never gets createPO, editInventory, or manageWarehouses (and orders/adjustments/batches)
  if (role === 'viewer') {
    if (
      permission === 'createPO' ||
      permission === 'receivePO' ||
      permission === 'createSO' ||
      permission === 'shipOrder' ||
      permission === 'editInventory' ||
      permission === 'manageWarehouses' ||
      permission === 'makeAdjustments' ||
      permission === 'manageBatches' ||
      permission === 'recallBatch' ||
      permission === 'executeRecall' ||
      permission === 'transferStock' ||
      permission === 'syncBranches' ||
      permission === 'manageStaff' ||
      permission === 'manageStaffRoles' ||
      permission === 'manageAuditLogs' ||
      permission === 'cancelEwayBill' ||
      permission === 'configureSettings'
    ) {
      return false;
    }
  }

  // 2. Billing Clerk never gets createPO or receivePO
  if (role === 'billing_clerk') {
    if (permission === 'createPO' || permission === 'receivePO') {
      return false;
    }
  }

  // 3. Inventory Manager never gets sales orders (createSO, shipOrder)
  if (role === 'inventory_manager') {
    if (permission === 'createSO' || permission === 'shipOrder') {
      return false;
    }
  }

  // 4. Production Supervisor never gets POs or SOs
  if (role === 'production_supervisor') {
    if (
      permission === 'createPO' ||
      permission === 'receivePO' ||
      permission === 'createSO' ||
      permission === 'shipOrder'
    ) {
      return false;
    }
  }

  // 5. Non-Admin never gets manageAuditLogs, manageStaff, manageStaffRoles, or cancelEwayBill
  if (
    permission === 'manageAuditLogs' ||
    permission === 'manageStaff' ||
    permission === 'manageStaffRoles' ||
    permission === 'cancelEwayBill'
  ) {
    return false;
  }

  // Check per-user explicit switch overrides if present
  if (user.permissions) {
    // 1. Direct permission override
    if (typeof user.permissions[permission] === 'boolean') {
      return user.permissions[permission];
    }

    // 2. Check if one of the 9 UI switches controls this permission
    for (const [switchKey, controlledKeys] of Object.entries(SWITCH_TO_PERMISSIONS_MAP)) {
      if (controlledKeys.includes(permission)) {
        const switchVal = user.permissions[switchKey];
        if (typeof switchVal === 'boolean') {
          return switchVal;
        }
      }
    }
  }

  // Fallback to role defaults
  const rolePerms = ROLE_PERMISSIONS[role] || [];
  return rolePerms.includes(permission);
}

/**
 * Accesses a staff member's switch state safely without direct external .permissions[ reads.
 */
export function getUserPermissionSwitch(user: UserLike | null | undefined, switchKey: string): boolean {
  if (!user || !user.permissions) {
    if (!user || !user.role) return false;
    const defaults = getRoleDefaultSwitches(user.role);
    return !!defaults[switchKey];
  }
  const val = user.permissions[switchKey];
  if (typeof val === 'boolean') return val;
  const defaults = getRoleDefaultSwitches(user.role);
  return !!defaults[switchKey];
}

/**
 * Updates a switch value on a staff object.
 */
export function setUserPermissionSwitch<T extends UserLike>(user: T, switchKey: string, value: boolean): T {
  return {
    ...user,
    permissions: {
      ...user.permissions,
      [switchKey]: value
    }
  };
}

/**
 * Toggles a switch value on a staff object.
 */
export function toggleUserPermissionSwitch<T extends UserLike>(user: T, switchKey: string): T {
  const current = getUserPermissionSwitch(user, switchKey);
  return setUserPermissionSwitch(user, switchKey, !current);
}

/**
 * Standard default switch states for each role.
 */
export function getRoleDefaultSwitches(role: string): Record<string, boolean> {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'admin':
      return {
        createOrders: true,
        editInventory: true,
        makeAdjustments: true,
        manageBatches: true,
        manageWarehouses: true,
        viewFinancials: true,
        manageStaff: true,
        generateReports: true,
        deleteAuditLogs: true,
        executeRecall: true,
        manageSuppliers: true,
        recordPayments: true,
        viewReports: true
      };
    case 'inventory_manager':
      return {
        createOrders: true,
        editInventory: true,
        makeAdjustments: true,
        manageBatches: true,
        manageWarehouses: true,
        viewFinancials: true,
        manageStaff: false,
        generateReports: true,
        deleteAuditLogs: false,
        executeRecall: true,
        manageSuppliers: true,
        recordPayments: false,
        viewReports: true
      };
    case 'billing_clerk':
      return {
        createOrders: true,
        editInventory: false,
        makeAdjustments: false,
        manageBatches: false,
        manageWarehouses: false,
        viewFinancials: true,
        manageStaff: false,
        generateReports: true,
        deleteAuditLogs: false,
        executeRecall: false,
        manageSuppliers: false,
        recordPayments: true,
        viewReports: true
      };
    case 'production_supervisor':
      return {
        createOrders: false,
        editInventory: false,
        makeAdjustments: false,
        manageBatches: false,
        manageWarehouses: false,
        viewFinancials: true,
        manageStaff: false,
        generateReports: false,
        deleteAuditLogs: false,
        executeRecall: false,
        manageSuppliers: false,
        recordPayments: false,
        viewReports: false
      };
    case 'viewer':
    default:
      return {
        createOrders: false,
        editInventory: false,
        makeAdjustments: false,
        manageBatches: false,
        manageWarehouses: false,
        viewFinancials: true,
        manageStaff: false,
        generateReports: true,
        deleteAuditLogs: false,
        executeRecall: false,
        manageSuppliers: false,
        recordPayments: false,
        viewReports: true
      };
  }
}

/**
 * Legacy role-only evaluator kept for backward compatibility with pure functions.
 */
export function hasPermission(role: string, permission: PermissionKey): boolean {
  return can({ role }, permission);
}

/**
 * Standard denial explanation tooltip generator.
 */
export function getPermissionDeniedTooltip(permission: PermissionKey, language: string = 'en'): string {
  if (language === 'ta') {
    return 'இந்த செயலைச் செய்ய உங்கள் பயனர் சுயவிவரத்திற்கு அனுமதி இல்லை.';
  }
  switch (permission) {
    case 'editInventory':
      return 'Only Admin and Inventory Manager can create, edit, or delete items.';
    case 'manageWarehouses':
      return 'Only Admin and Inventory Manager can manage warehouse locations.';
    case 'manageSuppliers':
      return 'Only Admin and Inventory Manager can manage suppliers.';
    case 'manageCustomers':
      return 'Only Admin and Billing Clerk can manage customers.';
    case 'createPO':
      return 'Only Admin and Inventory Manager can generate purchase orders.';
    case 'receivePO':
      return 'Only Admin and Inventory Manager can receive goods on purchase orders.';
    case 'createSO':
      return 'Only Admin and Billing Clerk can create sales orders.';
    case 'shipOrder':
      return 'Only Admin and Billing Clerk can dispatch and ship sales orders.';
    case 'recordPayment':
      return 'Only Admin and Billing Clerk can record payments.';
    case 'generateInvoices':
      return 'Only Admin and Billing Clerk can generate invoices and register IRNs.';
    case 'makeAdjustments':
      return 'Only Admin and Inventory Manager can record stock adjustments.';
    case 'manageBatches':
      return 'Only Admin and Inventory Manager can manage batch lots.';
    case 'recallBatch':
    case 'executeRecall':
      return 'Only Admin and Inventory Manager can initiate product recalls.';
    case 'transferStock':
      return 'Only Admin and Inventory Manager can initiate or process stock transfers.';
    case 'syncBranches':
      return 'Only Admin and Inventory Manager can trigger branch data synchronization.';
    case 'manageProduction':
      return 'Only Admin, Inventory Manager, and Production Supervisor can plan production.';
    case 'recordConsumption':
      return 'Only Admin, Inventory Manager, and Production Supervisor can record material consumption.';
    case 'manageStaff':
    case 'manageStaffRoles':
      return 'Only Super Admin can manage employee credentials and roles.';
    case 'manageAuditLogs':
      return 'Only Super Admin can delete or reset system audit logs.';
    case 'manageTallyGst':
      return 'Only Admin and Billing Clerk can perform Tally sync or file GST returns.';
    case 'generateEwayBill':
      return 'Only Admin, Inventory Manager, and Billing Clerk can manage e-way bills.';
    case 'cancelEwayBill':
      return 'Only Super Admin can cancel an e-way bill.';
    default:
      return 'Access restricted: Your current active profile lacks the required permission.';
  }
}

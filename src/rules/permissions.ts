/**
 * Pure Domain Rules: Role-Based Access Control (RBAC) Permissions Matrix
 */

export type StaffRole = 'admin' | 'inventory_manager' | 'billing_clerk' | 'production_supervisor' | 'viewer';

export type PermissionKey =
  | 'editInventory'
  | 'makeAdjustments'
  | 'createPO'
  | 'receivePO'
  | 'createSO'
  | 'recordPayment'
  | 'manageStaff'
  | 'manageStaffRoles'
  | 'viewFinancials'
  | 'manageBatches'
  | 'recallBatch'
  | 'executeRecall'
  | 'transferStock'
  | 'syncBranches'
  | 'generateInvoices'
  | 'configureSettings';

export const ROLE_PERMISSIONS: Record<StaffRole, PermissionKey[]> = {
  admin: [
    'editInventory',
    'makeAdjustments',
    'createPO',
    'receivePO',
    'createSO',
    'generateInvoices',
    'recordPayment',
    'manageStaff',
    'manageStaffRoles',
    'viewFinancials',
    'manageBatches',
    'recallBatch',
    'executeRecall',
    'transferStock',
    'syncBranches',
    'configureSettings'
  ],
  inventory_manager: [
    'editInventory',
    'makeAdjustments',
    'createPO',
    'receivePO',
    'viewFinancials',
    'manageBatches',
    'recallBatch',
    'executeRecall',
    'transferStock',
    'syncBranches',
    'configureSettings'
  ],
  billing_clerk: [
    'createSO',
    'generateInvoices',
    'recordPayment',
    'viewFinancials'
  ],
  production_supervisor: [
    'editInventory',
    'manageBatches',
    'transferStock'
  ],
  viewer: [
    'viewFinancials'
  ]
};

/**
 * Pure permission evaluator used systematically across all application modules.
 */
export function hasPermission(role: string, permission: PermissionKey): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase().trim() as StaffRole;

  // Admin has full clearance
  if (normalizedRole === 'admin') return true;

  const permissions = ROLE_PERMISSIONS[normalizedRole];
  if (!permissions) return false;

  return permissions.includes(permission);
}

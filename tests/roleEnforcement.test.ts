import { describe, it, expect, vi } from 'vitest';
import { can, hasPermission, getPermissionDeniedTooltip, PermissionKey, StaffRole } from '../src/rules/permissions';
import { createAuditEvent } from '../src/rules/audit';
import { Staff } from '../src/types';

describe('FIX 1 - Role Enforcement (RBAC Verification)', () => {
  const adminUser: Staff = {
    id: 'STF-001',
    name: 'Sneha R.',
    email: 'sneha@example.com',
    role: 'admin',
    permissions: {
      editInventory: true,
      manageBatches: true,
      makeAdjustments: true,
      executeRecall: true,
      manageSuppliers: true,
      createOrders: true,
      recordPayments: true,
      viewReports: true,
      manageStaff: true
    }
  };

  const inventoryManager: Staff = {
    id: 'STF-002',
    name: 'Amit Sharma',
    email: 'amit@example.com',
    role: 'inventory_manager',
    permissions: {
      editInventory: true,
      manageBatches: true,
      makeAdjustments: true,
      executeRecall: true,
      manageSuppliers: true,
      createOrders: true,
      recordPayments: false,
      viewReports: true,
      manageStaff: false
    }
  };

  const billingClerk: Staff = {
    id: 'STF-003',
    name: 'Priya Patel',
    email: 'priya@example.com',
    role: 'billing_clerk',
    permissions: {
      editInventory: false,
      manageBatches: false,
      makeAdjustments: false,
      executeRecall: false,
      manageSuppliers: false,
      createOrders: true,
      recordPayments: true,
      viewReports: true,
      manageStaff: false
    }
  };

  const staffViewer: Staff = {
    id: 'STF-004',
    name: 'Rohan Das',
    email: 'rohan@example.com',
    role: 'viewer',
    permissions: {
      editInventory: false,
      manageBatches: false,
      makeAdjustments: false,
      executeRecall: false,
      manageSuppliers: false,
      createOrders: false,
      recordPayments: false,
      viewReports: false,
      manageStaff: false
    }
  };

  describe('1. Defect Fix: Staff Viewer and Billing Clerk blocked from PO, Item, and Warehouse', () => {
    it('Blocks Staff Viewer from creating a Purchase Order (createPO)', () => {
      expect(can(staffViewer, 'createPO')).toBe(false);
      expect(hasPermission(staffViewer.role, 'createPO')).toBe(false);
    });

    it('Blocks Staff Viewer from creating an Inventory Item (editInventory)', () => {
      expect(can(staffViewer, 'editInventory')).toBe(false);
      expect(hasPermission(staffViewer.role, 'editInventory')).toBe(false);
    });

    it('Blocks Staff Viewer from creating a Warehouse (manageWarehouses)', () => {
      expect(can(staffViewer, 'manageWarehouses')).toBe(false);
      expect(hasPermission(staffViewer.role, 'manageWarehouses')).toBe(false);
    });

    it('Blocks Billing Clerk from creating a Purchase Order (createPO)', () => {
      expect(can(billingClerk, 'createPO')).toBe(false);
      expect(hasPermission(billingClerk.role, 'createPO')).toBe(false);
    });

    it('Blocks Billing Clerk from creating an Inventory Item (editInventory)', () => {
      expect(can(billingClerk, 'editInventory')).toBe(false);
      expect(hasPermission(billingClerk.role, 'editInventory')).toBe(false);
    });

    it('Blocks Billing Clerk from creating a Warehouse (manageWarehouses)', () => {
      expect(can(billingClerk, 'manageWarehouses')).toBe(false);
      expect(hasPermission(billingClerk.role, 'manageWarehouses')).toBe(false);
    });

    it('Allows Inventory Manager and Admin to create PO, Item, and Warehouse', () => {
      // Inventory Manager
      expect(can(inventoryManager, 'createPO')).toBe(true);
      expect(can(inventoryManager, 'editInventory')).toBe(true);
      expect(can(inventoryManager, 'manageWarehouses')).toBe(true);

      // Admin
      expect(can(adminUser, 'createPO')).toBe(true);
      expect(can(adminUser, 'editInventory')).toBe(true);
      expect(can(adminUser, 'manageWarehouses')).toBe(true);
    });
  });

  describe('2. Separation of Duties between Billing Clerk and Inventory Manager', () => {
    it('Allows Billing Clerk to create Sales Orders and record payments, but denies Inventory Manager', () => {
      expect(can(billingClerk, 'createSO')).toBe(true);
      expect(can(billingClerk, 'shipOrder')).toBe(true);
      expect(can(billingClerk, 'recordPayment')).toBe(true);
      expect(can(billingClerk, 'manageCustomers')).toBe(true);

      expect(can(inventoryManager, 'createSO')).toBe(false);
      expect(can(inventoryManager, 'shipOrder')).toBe(false);
      expect(can(inventoryManager, 'recordPayment')).toBe(false);
      expect(can(inventoryManager, 'manageCustomers')).toBe(false);
    });

    it('Allows Inventory Manager to perform stock adjustments, batches, transfers, but denies Billing Clerk', () => {
      expect(can(inventoryManager, 'makeAdjustments')).toBe(true);
      expect(can(inventoryManager, 'manageBatches')).toBe(true);
      expect(can(inventoryManager, 'transferStock')).toBe(true);

      expect(can(billingClerk, 'makeAdjustments')).toBe(false);
      expect(can(billingClerk, 'manageBatches')).toBe(false);
      expect(can(billingClerk, 'transferStock')).toBe(false);
    });
  });

  describe('3. Handler-Level Refusal & "Permission denied" Audit Event Generation', () => {
    it('Generates strict 6-field audit log on denied action attempt', () => {
      // Simulate handler enforcement logic
      const auditLogStore: any[] = [];
      const checkAndExecute = (user: Staff, perm: PermissionKey, actionName: string, actionFn: () => void) => {
        if (!can(user, perm)) {
          const auditEvent = createAuditEvent({
            action: 'Permission denied',
            entityType: 'Security',
            entityId: actionName,
            details: `Permission denied: User '${user.name}' with role '${user.role}' attempted unauthorized action '${actionName}' requiring '${perm}'.`,
            operatorName: user.name,
            operatorRole: user.role,
            operatorId: user.id
          });
          auditLogStore.push(auditEvent);
          return false;
        }
        actionFn();
        return true;
      };

      const mockAction = vi.fn();

      // Attempt by Billing Clerk to Create Item
      const result = checkAndExecute(billingClerk, 'editInventory', 'Create Item', mockAction);
      expect(result).toBe(false);
      expect(mockAction).not.toHaveBeenCalled();
      expect(auditLogStore.length).toBe(1);

      const loggedEvent = auditLogStore[0];
      expect(loggedEvent.action).toBe('Permission denied');
      expect(loggedEvent.operatorName).toBe(billingClerk.name);
      expect(loggedEvent.operatorRole).toBe(billingClerk.role);
      expect(loggedEvent.details).toContain("unauthorized action 'Create Item'");
      expect(loggedEvent.details).toContain("requiring 'editInventory'");

      // Attempt by Inventory Manager to Create Item
      const successResult = checkAndExecute(inventoryManager, 'editInventory', 'Create Item', mockAction);
      expect(successResult).toBe(true);
      expect(mockAction).toHaveBeenCalledTimes(1);
      // No new "Permission denied" event added
      expect(auditLogStore.length).toBe(1);
    });
  });

  describe('4. Tooltip messages provide clear explanations', () => {
    it('Provides human-readable tooltip explanations for blocked actions', () => {
      expect(getPermissionDeniedTooltip('createPO')).toContain('Inventory Manager');
      expect(getPermissionDeniedTooltip('editInventory')).toContain('Inventory Manager');
      expect(getPermissionDeniedTooltip('manageWarehouses')).toContain('Inventory Manager');
      expect(getPermissionDeniedTooltip('createSO')).toContain('Billing Clerk');
      expect(getPermissionDeniedTooltip('cancelEwayBill')).toContain('Super Admin');
    });

    it('Provides localized Tamil tooltips when requested', () => {
      const taTooltip = getPermissionDeniedTooltip('createPO', 'ta');
      expect(taTooltip).toContain('அனுமதி இல்லை');
    });
  });
});

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  can,
  CANONICAL_ROLES,
  PermissionKey,
  getUserPermissionSwitch,
  setUserPermissionSwitch
} from '../src/rules/permissions';

describe('Permissions Matrix & Unified can() Evaluator', () => {
  describe('Canonical Roles and Role Defaults', () => {
    it('defines exactly the 5 canonical role IDs', () => {
      expect(CANONICAL_ROLES).toEqual([
        'admin',
        'inventory_manager',
        'billing_clerk',
        'production_supervisor',
        'viewer'
      ]);
    });

    it('grants admin all system permissions by default', () => {
      const admin = { role: 'admin' };
      const allPermissions: PermissionKey[] = [
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
      ];

      for (const perm of allPermissions) {
        expect(can(admin, perm)).toBe(true);
      }
    });

    it('grants inventory_manager stock, warehouse, PO, adjustment and batch permissions, but blocks sales orders and staff admin', () => {
      const im = { role: 'inventory_manager' };
      expect(can(im, 'editInventory')).toBe(true);
      expect(can(im, 'manageWarehouses')).toBe(true);
      expect(can(im, 'createPO')).toBe(true);
      expect(can(im, 'receivePO')).toBe(true);
      expect(can(im, 'makeAdjustments')).toBe(true);
      expect(can(im, 'manageBatches')).toBe(true);
      expect(can(im, 'transferStock')).toBe(true);

      // Blocked
      expect(can(im, 'createSO')).toBe(false);
      expect(can(im, 'shipOrder')).toBe(false);
      expect(can(im, 'manageStaff')).toBe(false);
      expect(can(im, 'manageAuditLogs')).toBe(false);
    });

    it('grants billing_clerk sales orders, invoices, payments, customers, but blocks POs and inventory management', () => {
      const bc = { role: 'billing_clerk' };
      expect(can(bc, 'createSO')).toBe(true);
      expect(can(bc, 'shipOrder')).toBe(true);
      expect(can(bc, 'generateInvoices')).toBe(true);
      expect(can(bc, 'recordPayment')).toBe(true);
      expect(can(bc, 'manageCustomers')).toBe(true);

      // Blocked
      expect(can(bc, 'createPO')).toBe(false);
      expect(can(bc, 'receivePO')).toBe(false);
      expect(can(bc, 'editInventory')).toBe(false);
      expect(can(bc, 'makeAdjustments')).toBe(false);
      expect(can(bc, 'manageBatches')).toBe(false);
      expect(can(bc, 'manageWarehouses')).toBe(false);
      expect(can(bc, 'manageStaff')).toBe(false);
    });

    it('grants production_supervisor production and consumption, but blocks POs, SOs and staff admin', () => {
      const ps = { role: 'production_supervisor' };
      expect(can(ps, 'manageProduction')).toBe(true);
      expect(can(ps, 'recordConsumption')).toBe(true);
      expect(can(ps, 'viewFinancials')).toBe(true);

      // Blocked
      expect(can(ps, 'createPO')).toBe(false);
      expect(can(ps, 'createSO')).toBe(false);
      expect(can(ps, 'editInventory')).toBe(false);
      expect(can(ps, 'manageStaff')).toBe(false);
    });

    it('grants viewer only view reports and financials, blocking all write/mutate actions', () => {
      const viewer = { role: 'viewer' };
      expect(can(viewer, 'viewReports')).toBe(true);
      expect(can(viewer, 'viewFinancials')).toBe(true);

      // Write actions blocked
      expect(can(viewer, 'editInventory')).toBe(false);
      expect(can(viewer, 'createPO')).toBe(false);
      expect(can(viewer, 'createSO')).toBe(false);
      expect(can(viewer, 'makeAdjustments')).toBe(false);
      expect(can(viewer, 'manageBatches')).toBe(false);
      expect(can(viewer, 'manageWarehouses')).toBe(false);
      expect(can(viewer, 'manageStaff')).toBe(false);
      expect(can(viewer, 'manageAuditLogs')).toBe(false);
    });
  });

  describe('Fine-Grained Matrix Switch Overrides', () => {
    it('inventory_manager with makeAdjustments=false cannot make adjustments', () => {
      const imWithOverride = {
        role: 'inventory_manager',
        permissions: { makeAdjustments: false }
      };
      expect(can(imWithOverride, 'makeAdjustments')).toBe(false);
      // Still can edit inventory
      expect(can(imWithOverride, 'editInventory')).toBe(true);
    });

    it('billing_clerk with createOrders=false cannot create sales orders', () => {
      const bcWithOverride = {
        role: 'billing_clerk',
        permissions: { createOrders: false }
      };
      expect(can(bcWithOverride, 'createSO')).toBe(false);
      expect(can(bcWithOverride, 'shipOrder')).toBe(false);
      // Still can record payments and view reports
      expect(can(bcWithOverride, 'recordPayment')).toBe(true);
    });

    it('viewer with createOrders=true is STILL denied createPO due to hard role boundary', () => {
      const viewerWithOverride = {
        role: 'viewer',
        permissions: { createOrders: true }
      };
      // Hard boundary prevents viewer from ever creating POs
      expect(can(viewerWithOverride, 'createPO')).toBe(false);
      expect(can(viewerWithOverride, 'createSO')).toBe(false);
      expect(can(viewerWithOverride, 'editInventory')).toBe(false);
      expect(can(viewerWithOverride, 'manageWarehouses')).toBe(false);
    });

    it('inventory_manager with createOrders=true CAN create a PO (and with createOrders=false CANNOT)', () => {
      const imAllowed = {
        role: 'inventory_manager',
        permissions: { createOrders: true }
      };
      expect(can(imAllowed, 'createPO')).toBe(true);

      const imRevoked = {
        role: 'inventory_manager',
        permissions: { createOrders: false }
      };
      expect(can(imRevoked, 'createPO')).toBe(false);
    });
  });

  describe('Safe Switch Accessors and Helpers', () => {
    it('reads default switches when user.permissions is undefined', () => {
      const user = { role: 'billing_clerk' };
      expect(getUserPermissionSwitch(user, 'createOrders')).toBe(true);
      expect(getUserPermissionSwitch(user, 'editInventory')).toBe(false);
    });

    it('sets switch safely and reflects updated values', () => {
      const user = { role: 'inventory_manager' };
      const updated = setUserPermissionSwitch(user, 'makeAdjustments', false);
      expect(getUserPermissionSwitch(updated, 'makeAdjustments')).toBe(false);
      expect(getUserPermissionSwitch(updated, 'editInventory')).toBe(true);
    });
  });

  describe('Static Code Audit: No Direct .permissions[ Access in App Code', () => {
    function getAllFiles(dir: string, fileList: string[] = []): string[] {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          getAllFiles(filePath, fileList);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
          fileList.push(filePath);
        }
      }
      return fileList;
    }

    it('ensures no file outside src/rules/permissions.ts and src/types.ts reads .permissions[ directly', () => {
      const srcDir = path.resolve(__dirname, '../src');
      const allSrcFiles = getAllFiles(srcDir);

      const violations: string[] = [];

      for (const file of allSrcFiles) {
        const relative = path.relative(srcDir, file).replace(/\\/g, '/');
        // Exclude permissions.ts (the single source of truth) and types.ts
        if (relative === 'rules/permissions.ts' || relative === 'types.ts') {
          continue;
        }

        const content = fs.readFileSync(file, 'utf-8');
        // Check for direct bracket access or dot access to .permissions[ or .permissions.
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('.permissions[') || /\.permissions\.[a-zA-Z]/.test(line)) {
            violations.push(`${relative}:${index + 1}: ${line.trim()}`);
          }
        });
      }

      expect(violations).toEqual([]);
    });
  });
});

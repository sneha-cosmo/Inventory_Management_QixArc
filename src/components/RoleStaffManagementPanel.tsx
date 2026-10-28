import React, { useState, useMemo } from 'react';
import { 
  Users, 
  ShieldAlert, 
  KeyRound, 
  RefreshCw, 
  Eye, 
  Plus, 
  Search, 
  Filter, 
  HelpCircle, 
  Lock, 
  Unlock, 
  Mail, 
  Shield, 
  ShieldCheck, 
  Play, 
  ArrowRight, 
  UserPlus, 
  FileCheck, 
  Check, 
  Trash2, 
  BookOpen, 
  Clock,
  Settings,
  Terminal,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Staff } from '../types';

interface RoleStaffManagementPanelProps {
  staff: Staff[];
  onUpdateStaff: (staffList: Staff[]) => void;
  onAddStaff: (s: Staff) => void;
  addAuditLog: (action: string, entityType: string, entityId: string, details: string) => void;
  language?: string;
  onSimulateSwitchUser?: (staffId: string) => void; // allow quick emulator switch
}

// Group definitions for clear visual layout of Permissions
const PERMISSION_GROUPS = [
  {
    category: 'Inventory & Operations',
    description: 'Control core physical assets and batch lifecycles',
    perms: [
      { key: 'editInventory', label: 'Modify Catalog', desc: 'Add, archive, edit items, pricing & raw parameters' },
      { key: 'manageBatches', label: 'Configure Batches', desc: 'Initiate or complete production batches, assign warehouse layouts' }
    ]
  },
  {
    category: 'Audit & High Security',
    description: 'Execute sensitive accounting adjustments or critical lot recalls',
    perms: [
      { key: 'makeAdjustments', label: 'Manual Adjust Stock', desc: 'Perform manual stock level write-offs or audits' },
      { key: 'executeRecall', label: 'Perform Lot Recalls', desc: 'Trigger absolute system-wide recalls on expired or contaminated batches' }
    ]
  },
  {
    category: 'Suppliers & Sales Billing',
    description: 'Log vendor relationships and process purchase ledger contracts',
    perms: [
      { key: 'manageSuppliers', label: 'Manage Supplier base', desc: 'Onboard and manage suppliers and GST compliance flags' },
      { key: 'createOrders', label: 'Issue Orders & Invoices', desc: 'Generate B2B invoices and log incoming raw product POs' }
    ]
  },
  {
    category: 'Finance & Administration',
    description: 'Access financial balance ledgers, record payments, and manage staff credentials',
    perms: [
      { key: 'recordPayments', label: 'Financial PMT Logs', desc: 'Record credit/debit payments, edit payment statuses' },
      { key: 'viewReports', label: 'Inspect GST & Taxes', desc: 'Access active reports, GSTR-1 draft sheets and PL dashboards' },
      { key: 'manageStaff', label: 'Admin Security credentials', desc: 'Promote employee roles, revise direct access credentials, onboard profiles' }
    ]
  }
];

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

export default function RoleStaffManagementPanel({
  staff,
  onUpdateStaff,
  onAddStaff,
  addAuditLog,
  language = 'en',
  onSimulateSwitchUser
}: RoleStaffManagementPanelProps) {
  // Navigation & filter states
  const [activeTab, setActiveTab] = useState<'roster' | 'matrix' | 'emulator' | 'templates'>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'inventory_manager' | 'billing_clerk' | 'staff_viewer'>('all');
  
  // Create staff dialog triggers
  const [openAddStaff, setOpenAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'staff_viewer' as Staff['role']
  });

  // Emulator interactive tool variables
  const [emulatedStaffId, setEmulatedStaffId] = useState<string>('STF-001');
  const emulatedStaff = useMemo(() => {
    return staff.find(s => s.id === emulatedStaffId) || staff[0] || null;
  }, [staff, emulatedStaffId]);

  // Selected staff for focused Matrix permission details configuration
  const [matrixFocusedStaffId, setMatrixFocusedStaffId] = useState<string>('STF-001');
  const focusedStaff = useMemo(() => {
    return staff.find(s => s.id === matrixFocusedStaffId) || staff[0] || null;
  }, [staff, matrixFocusedStaffId]);

  // Handle onboarding submission
  const handleOnboardNewStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.email.trim()) return;

    // Load defaults based on role template choice
    const defaults = getRoleDefaults(newStaff.role);
    const generatedId = `STF-00${staff.length + 1}-${Math.floor(100 + Math.random()*900)}`;
    
    const freshStaff: Staff = {
      id: generatedId,
      name: newStaff.name.trim(),
      email: newStaff.email.trim(),
      role: newStaff.role,
      lastActive: 'Offline (Just Onboarded)',
      permissions: defaults
    };

    onAddStaff(freshStaff);
    addAuditLog(
      'Staff Onboarding',
      'StaffSecurity',
      generatedId,
      `Onboarded employee ${freshStaff.name} with default base template '${freshStaff.role}'`
    );

    // Reset onboarding form
    setNewStaff({ name: '', email: '', role: 'staff_viewer' });
    setOpenAddStaff(false);
  };

  // Helper template config maps
  function getRoleDefaults(role: Staff['role']): Staff['permissions'] {
    switch (role) {
      case 'admin':
        return {
          editInventory: true,
          manageBatches: true,
          makeAdjustments: true,
          executeRecall: true,
          manageSuppliers: true,
          createOrders: true,
          recordPayments: true,
          viewReports: true,
          manageStaff: true
        };
      case 'inventory_manager':
        return {
          editInventory: true,
          manageBatches: true,
          makeAdjustments: true,
          executeRecall: true,
          manageSuppliers: true,
          createOrders: false,
          recordPayments: false,
          viewReports: false,
          manageStaff: false
        };
      case 'billing_clerk':
        return {
          editInventory: false,
          manageBatches: false,
          makeAdjustments: false,
          executeRecall: false,
          manageSuppliers: false,
          createOrders: true,
          recordPayments: true,
          viewReports: true,
          manageStaff: false
        };
      case 'staff_viewer':
      default:
        return {
          editInventory: false,
          manageBatches: false,
          makeAdjustments: false,
          executeRecall: false,
          manageSuppliers: false,
          createOrders: false,
          recordPayments: false,
          viewReports: true,
          manageStaff: false
        };
    }
  }

  // Handle direct custom check toggle
  const handleToggleSpecificPermission = (staffId: string, permKey: keyof Staff['permissions']) => {
    const target = staff.find(s => s.id === staffId);
    if (!target) return;

    if (target.role === 'admin') {
      alert("Admin security guidelines prevent modifying base master credentials. Revoke or promote role representation first.");
      return;
    }

    const nextValue = !target.permissions[permKey];
    const updated = staff.map(s => {
      if (s.id === staffId) {
        return {
          ...s,
          permissions: {
            ...s.permissions,
            [permKey]: nextValue
          }
        };
      }
      return s;
    });

    onUpdateStaff(updated);
    addAuditLog(
      'Credential Shift',
      'StaffSecurity',
      staffId,
      `Direct override: Changed [${permKey}] to ${nextValue ? 'ALLOWED' : 'REVOKED'} for ${target.name}`
    );
  };

  // Handle role reassignment
  const handleReassignRole = (staffId: string, nextRole: Staff['role']) => {
    const target = staff.find(s => s.id === staffId);
    if (!target) return;

    const baseDefaults = getRoleDefaults(nextRole);
    const updated = staff.map(s => {
      if (s.id === staffId) {
        return {
          ...s,
          role: nextRole,
          permissions: baseDefaults
        };
      }
      return s;
    });

    onUpdateStaff(updated);
    addAuditLog(
      'Role Promotion',
      'StaffSecurity',
      staffId,
      `Repositioned ${target.name} from '${target.role}' to standard '${nextRole}'. Synced corresponding security default template clearance keys.`
    );
  };

  // Reset entire role cohort to template values
  const handleBulkResetRoleTemplates = (role: Staff['role']) => {
    const updated = staff.map(s => {
      if (s.role === role) {
        return {
          ...s,
          permissions: getRoleDefaults(role)
        };
      }
      return s;
    });

    onUpdateStaff(updated);
    addAuditLog(
      'Bulk Role Reset',
      'StaffSecurity',
      role.toUpperCase(),
      `Reset all employee clearances registered under '${role}' back to standardized global system templates.`
    );
    alert(`Bulk template alignment complete! Re-synchronized default keys for all workspace '${role}' agents.`);
  };

  // Remove staff profile
  const handleDecommissionProfile = (staffId: string) => {
    const target = staff.find(s => s.id === staffId);
    if (!target) return;

    if (target.id === 'STF-001') {
      alert("Cannot decommission primary active Master Administrator identity.");
      return;
    }

    if (confirm(`Decommission Profile Action: Are you absolutely sure you want to deactivate and remove company clearance records for ${target.name}?`)) {
      const remaining = staff.filter(s => s.id !== staffId);
      onUpdateStaff(remaining);
      addAuditLog(
        'Profile Decommissioned',
        'StaffSecurity',
        staffId,
        `Purged workspace security profile of ${target.name}. All active credentials revoked instantly.`
      );
    }
  };

  // Calculations for roster list filters
  const filteredRoster = useMemo(() => {
    return staff.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'all' ? true : s.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [staff, searchQuery, roleFilter]);

  // Aggregate permission matrix statistics
  const rbacChartMetrics = useMemo(() => {
    const sum = {
      editInventory: 0,
      manageBatches: 0,
      makeAdjustments: 0,
      executeRecall: 0,
      manageSuppliers: 0,
      createOrders: 0,
      recordPayments: 0,
      viewReports: 0,
      manageStaff: 0
    };

    staff.forEach(s => {
      Object.keys(sum).forEach(k => {
        const key = k as keyof typeof sum;
        if (s.permissions[key]) {
          sum[key]++;
        }
      });
    });

    return [
      { key: 'editInventory', name: 'Modify Catalog', value: sum.editInventory },
      { key: 'manageBatches', name: 'Configure Batches', value: sum.manageBatches },
      { key: 'makeAdjustments', name: 'Stock Adjust', value: sum.makeAdjustments },
      { key: 'executeRecall', name: 'Trigger Recall', value: sum.executeRecall },
      { key: 'manageSuppliers', name: 'Supplier Admin', value: sum.manageSuppliers },
      { key: 'createOrders', name: 'Issue Sales', value: sum.createOrders },
      { key: 'recordPayments', name: 'Payments Ledger', value: sum.recordPayments },
      { key: 'viewReports', name: 'GST & Taxes', value: sum.viewReports },
      { key: 'manageStaff', name: 'Admins Clearances', value: sum.manageStaff }
    ];
  }, [staff]);

  const cohortStatsCount = useMemo(() => {
    const roles = { admin: 0, inventory_manager: 0, billing_clerk: 0, staff_viewer: 0 };
    staff.forEach(s => {
      if (roles[s.role] !== undefined) {
        roles[s.role]++;
      }
    });
    return [
      { name: 'Admin', value: roles.admin, color: '#4F46E5' },
      { name: 'Inventory Manager', value: roles.inventory_manager, color: '#10B981' },
      { name: 'Billing Clerk', value: roles.billing_clerk, color: '#F59E0B' },
      { name: 'Staff Viewer', value: roles.staff_viewer, color: '#EF4444' }
    ];
  }, [staff]);

  return (
    <div className="space-y-6 text-[#1A1A1A]">
      
      {/* Top Banner Context Widget */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-3 w-full lg:w-4/5">
          <KeyRound className="w-6 h-6 text-indigo-600 mt-1 flex-shrink-0" />
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-slate-805 uppercase tracking-widest flex items-center gap-2">
              Enterprise Role-Based Access Control (RBAC) Console
              <Badge className="bg-indigo-50 border-indigo-100 text-indigo-800 text-[9px] font-black uppercase">
                Active Policy: ISO 27001 Multi-Signer
              </Badge>
            </h5>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Design distinct security profiles for company warehouse supervisors, tax accountants, and physical floor managers. Mitigate financial tampering risk by decoupling inventory manual write-offs from outward cash records. Test dynamic clearance restrictions in real-time.
            </p>
          </div>
        </div>

        {/* Global Onboard Control trigger */}
        <div className="flex justify-start lg:justify-end">
          <Dialog open={openAddStaff} onOpenChange={setOpenAddStaff}>
            <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold font-sans h-10 px-4 cursor-pointer" />}>
              <UserPlus className="w-4 h-4 mr-1.5" /> Onboard Staff Member
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white rounded-3xl p-6 text-slate-800">
              <form onSubmit={handleOnboardNewStaff}>
                <DialogHeader className="space-y-1 pb-4 border-b border-slate-100">
                  <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" /> Onboard Staff Profile
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Onboard factory floor workers or company back-office tax consultants into corresponding systems.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-5 space-y-4 text-xs font-medium">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-450 uppercase">Employee Official Name</label>
                    <Input 
                      placeholder="e.g. Anand Mahindra" 
                      value={newStaff.name} 
                      onChange={e => setNewStaff({...newStaff, name: e.target.value})} 
                      required
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-450 uppercase">Company Assigned Email</label>
                    <Input
                      type="email"
                      placeholder="e.g. anand@spinningfactory.com" 
                      value={newStaff.email} 
                      onChange={e => setNewStaff({...newStaff, email: e.target.value})} 
                      required
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-450 uppercase">Standard Access Clearance Level Template</label>
                    <select 
                      className="w-full h-10 rounded-xl border border-slate-250 bg-background px-3 py-2 text-sm text-[#1A1A1A] font-sans font-semibold focus:outline-hidden"
                      value={newStaff.role}
                      onChange={e => setNewStaff({...newStaff, role: e.target.value as Staff['role']})}
                    >
                      <option value="admin">Admin Roles (Unrestricted Core Privileges)</option>
                      <option value="inventory_manager">Inventory Manager (Stock Levels & Batches)</option>
                      <option value="billing_clerk">Billing/Invoice Clerical Associate</option>
                      <option value="staff_viewer">Staff Viewer (Restricted Read-Only Analytics)</option>
                    </select>
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2">
                  <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 rounded-xl">
                    Generate Profile & Lock Access
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Console Sub-tab switcher */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-full md:w-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'roster' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-indigo-600'
          }`}
        >
          <Users className="w-4 h-4" /> Company Personnel Roster
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'matrix' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-indigo-600'
          }`}
        >
          <Shield className="w-4 h-4" /> Fine-Grained Permission Matrix
        </button>
        <button
          onClick={() => setActiveTab('emulator')}
          className={`px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'emulator' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-indigo-600'
          }`}
        >
          <Terminal className="w-4 h-4 animate-pulse text-indigo-600" /> Staff Sandbox Emulator
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'templates' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-indigo-600'
          }`}
        >
          <Settings className="w-4 h-4" /> Operational Security Templates
        </button>
      </div>


      {/* Tab Renderers */}
      
      {/* Tab 1: Personnel Roster with Filters & Statistics */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Block - Statistics Summary Cards */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Pie layout of employee categories */}
            <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
              <CardHeader className="pb-2 border-b border-slate-50">
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  Access Cohort Distribution
                </CardTitle>
                <CardDescription className="text-[10px]">Division ratio of system user roles mapped inside workspace.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-44 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cohortStatsCount}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {cohortStatsCount.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Cohort legend */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50 text-[10px] font-bold">
                  {cohortStatsCount.map(role => (
                    <div key={role.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                      <span className="text-slate-500">{role.name}:</span>
                      <span className="text-slate-900">{role.value} Accounts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Visualizer: Clearances Index Bar chart */}
            <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
              <CardHeader className="pb-2 border-b border-slate-50">
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                  Permission Allocation Volume
                </CardTitle>
                <CardDescription className="text-[10px]">Counts of active staff possessing corresponding core credentials.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rbacChartMetrics} layout="vertical" margin={{ left: -15, top: 0, right: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#EEF2F6" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={90} style={{ fontSize: '9px', fontWeight: 'bold' }} />
                      <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          </div>


          {/* Right Block - Directory Roster List */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      Organization Security Directory
                    </CardTitle>
                    <CardDescription className="text-[10px]">Manage existing profiles, reassign standard templates or deactivate dormant keys.</CardDescription>
                  </div>

                  {/* Search and Filter controllers */}
                  <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Search name or mail..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 rounded-xl text-[11px] w-full md:w-44 bg-slate-50/50"
                      />
                    </div>
                    
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as any)}
                      className="h-8 pl-2 pr-6 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-600 focus:outline-hidden pointer-events-auto"
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admins</option>
                      <option value="inventory_manager">Managers</option>
                      <option value="billing_clerk">Billing Clerks</option>
                      <option value="staff_viewer">Viewers</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                
                {filteredRoster.length === 0 ? (
                  <div className="p-16 text-center text-xs text-slate-400 font-semibold space-y-1.5">
                    <AlertTriangle className="w-8 h-8 text-slate-350 mx-auto" />
                    <div>No employee profiles match the chosen criteria filters. Onboard new staff above.</div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-55/40">
                      <TableRow>
                        <TableHead className="font-bold text-xs pl-6">Personnel Identity</TableHead>
                        <TableHead className="font-bold text-xs">Role Assignment</TableHead>
                        <TableHead className="font-bold text-xs">Access Keys</TableHead>
                        <TableHead className="font-bold text-xs">System Activity</TableHead>
                        <TableHead className="font-bold text-xs text-right pr-6">Controls</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoster.map(s => {
                        const roleColor = s.role === 'admin' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                          : s.role === 'inventory_manager'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                          : s.role === 'billing_clerk'
                          ? 'bg-amber-50 text-amber-800 border-amber-100'
                          : 'bg-rose-50 text-rose-800 border-rose-100';

                        // Count active security keys
                        const activePermsCount = Object.values(s.permissions).filter(Boolean).length;

                        return (
                          <TableRow key={s.id} className="hover:bg-slate-50/15 text-xs text-slate-650">
                            
                            {/* Profile details */}
                            <TableCell className="pl-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs border border-slate-200">
                                  {s.name.split(' ').map(n=>n[0]).join('')}
                                </div>
                                <div>
                                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                                    {s.name}
                                    {s.id === 'STF-001' && <Badge className="bg-slate-900 text-white rounded-lg text-[9px] scale-90 py-0.5">Primary Owner</Badge>}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {s.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Dropdown to switch roles directly */}
                            <TableCell>
                              <select
                                value={s.role}
                                onChange={(e) => handleReassignRole(s.id, e.target.value as Staff['role'])}
                                disabled={s.id === 'STF-001'}
                                className="h-8 pl-1.5 pr-6 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70"
                              >
                                <option value="admin">Super Admin</option>
                                <option value="inventory_manager">Inventory Manager</option>
                                <option value="billing_clerk">Billing Clerk</option>
                                <option value="staff_viewer">Staff Viewer</option>
                              </select>
                            </TableCell>

                            {/* Clearances count */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Badge className={`font-black text-[10px] ${activePermsCount >= 7 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                  {activePermsCount} of 9 Gateways
                                </Badge>
                              </div>
                            </TableCell>

                            {/* Activity */}
                            <TableCell className="whitespace-nowrap font-mono text-[10px] text-slate-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-500 animate-pulse" />
                                {s.lastActive || 'Never logged'}
                              </div>
                            </TableCell>

                            {/* Danger controls */}
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  onClick={() => {
                                    setEmulatedStaffId(s.id);
                                    setActiveTab('emulator');
                                    // Callback integration to switch overall workspace simulated session
                                    if (onSimulateSwitchUser) {
                                      onSimulateSwitchUser(s.id);
                                    }
                                  }}
                                  variant="outline"
                                  size="xs"
                                  className="h-7 text-[10px] font-bold rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50/40"
                                >
                                  Switch session
                                </Button>
                                
                                {s.id !== 'STF-001' && (
                                  <Button
                                    onClick={() => handleDecommissionProfile(s.id)}
                                    variant="outline"
                                    size="xs"
                                    className="h-7 text-[10px] text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>

                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}

              </CardContent>
            </Card>
          </div>

        </div>
      )}


      {/* Tab 2: Fine-Grained Permission Matrix override */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left panel - select staff */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
              <CardHeader className="pb-2 border-b border-slate-50">
                <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  Select User Context
                </CardTitle>
                <CardDescription className="text-[10px]">Select any profile below to edit fine-grained custom gates.</CardDescription>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {staff.map(s => {
                  const isSelected = s.id === matrixFocusedStaffId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setMatrixFocusedStaffId(s.id)}
                      className={`w-full text-left p-3 rounded-2xl transition flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50 border border-indigo-150 shadow-xs' 
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-black text-slate-900">{s.name}</div>
                        <div className="text-[10px] font-bold text-indigo-700 uppercase mt-0.5">{s.role}</div>
                      </div>
                      {isSelected && <Badge className="bg-indigo-600 text-white rounded-md text-[9px] py-0.5">Editing</Badge>}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>


          {/* Right panel - Matrix grid */}
          <div className="lg:col-span-3 space-y-6">
            {focusedStaff && (
              <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
                <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                      Custom Security Override keys: {focusedStaff.name}
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      Manually toggle gateways below to bypass standardized operational templates when required.
                    </CardDescription>
                  </div>
                  <Badge className="bg-slate-900 text-white font-extrabold uppercase text-[10px] py-1 px-3.5 rounded-lg font-mono">
                    {focusedStaff.role.replace('_', ' ')}
                  </Badge>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                  
                  {focusedStaff.role === 'admin' ? (
                    <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <ShieldCheck className="w-10 h-10 text-indigo-600 mx-auto animate-bounce mb-2" />
                      <h4 className="text-sm font-bold text-slate-800">Unrestricted Owner Clearance Active</h4>
                      <p className="text-xs text-slate-450 max-w-sm mx-auto mt-1 leading-relaxed font-semibold">
                        Because {focusedStaff.name} is classified as a Workspace Owner / Admin, all operational and auditing boundaries are bypassed by design.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 text-xs">
                      {PERMISSION_GROUPS.map((grp, gIdx) => (
                        <div key={grp.category} className="space-y-3 pb-5 border-b border-slate-50 last:border-b-0 last:pb-0">
                          <div>
                            <h4 className="text-xs font-black text-slate-800 leading-none">{grp.category}</h4>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-semibold">{grp.description}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {grp.perms.map(p => {
                              const hasPerm = focusedStaff.permissions[p.key as keyof Staff['permissions']];
                              return (
                                <div 
                                  key={p.key} 
                                  onClick={() => handleToggleSpecificPermission(focusedStaff.id, p.key as any)}
                                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                    hasPerm
                                      ? 'bg-indigo-50/10 border-indigo-200 hover:bg-indigo-50/35'
                                      : 'bg-white border-slate-200 hover:bg-slate-50/60'
                                  }`}
                                >
                                  {/* Custom beautiful checkmark toggle box */}
                                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    hasPerm 
                                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                                      : 'border-slate-300 text-transparent'
                                  }`}>
                                    <Check className="w-3.5 h-3.5 stroke-[4px]" />
                                  </div>

                                  <div className="space-y-0.5">
                                    <div className="font-extrabold text-[#1a1a1a] flex items-center gap-1.5">
                                      {p.label}
                                      {hasPerm ? (
                                        <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded-sm font-black uppercase">ACTIVE</span>
                                      ) : (
                                        <span className="text-[8px] bg-slate-100 text-slate-400 px-1 py-0.2 rounded-sm font-bold uppercase">LOCKED</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                                      {p.desc}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </CardContent>
              </Card>
            )}
          </div>

        </div>
      )}


      {/* Tab 3: Sandbox Emulator workspace diagnosis */}
      {activeTab === 'emulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left profile emulator selector */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-indigo-200 bg-indigo-50/15 shadow-sm rounded-3xl relative overflow-hidden">
              <CardHeader className="pb-2 border-b border-indigo-100">
                <CardTitle className="text-xs font-bold text-indigo-950 uppercase tracking-widest flex items-center gap-1.5">
                  Sandbox Active Session
                </CardTitle>
                <CardDescription className="text-[10px] text-indigo-700 font-semibold">
                  Diagnose system layouts instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Select Tester:</label>
                  <select
                    value={emulatedStaffId}
                    onChange={(e) => {
                      setEmulatedStaffId(e.target.value);
                      if (onSimulateSwitchUser) {
                        onSimulateSwitchUser(e.target.value);
                      }
                    }}
                    className="w-full h-10 rounded-xl border border-indigo-200 bg-white text-sm font-bold text-slate-800 px-2 focus:outline-hidden"
                  >
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-indigo-100 pt-3 space-y-2">
                  <div className="text-[10px] font-black text-indigo-800 uppercase">ACTIVE SESSION GATES:</div>
                  <div className="space-y-1.5">
                    {emulatedStaff && Object.entries(emulatedStaff.permissions).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 font-mono capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className={`font-black uppercase text-[8px] px-1.5 py-0.5 rounded-sm ${v ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                          {v ? 'Allowed' : 'Blocked'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {onSimulateSwitchUser && (
                  <Button
                    onClick={() => {
                      onSimulateSwitchUser(emulatedStaffId);
                      alert(`Mock workspace simulation environment set to ${emulatedStaff?.name || 'User'}. Toggle tabs in overall screen layout to verify.`);
                    }}
                    className="w-full bg-indigo-600 text-white rounded-xl h-9.5 text-xs font-sans font-black"
                  >
                    Confirm Simulation
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>


          {/* Right Sandbox emulation console screen layout */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
              <CardHeader className="pb-3 border-b border-indigo-50 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  WORKSPACE SCREEN SIMULATION: {emulatedStaff?.name}
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Visual assessment of key business screens based on {emulatedStaff?.name}'s active system clearances.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                
                {emulatedStaff && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Screen 1: Inventory & Catalog edits */}
                    <div className="border border-slate-100 rounded-3xl p-4 bg-slate-50/40 space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">1. Raw Materials & Yarn Catalog Page</span>
                        <Badge className={emulatedStaff.permissions.editInventory ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800'}>
                          {emulatedStaff.permissions.editInventory ? 'UNLOCKED' : 'LOCKED'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                        Allows onboarding spinning yarn reels, updating unit cotton procurement rates and managing core inventory files.
                      </p>
                      <div className="bg-white border rounded-xl p-3 flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-bold">"Add Product" Button:</span>
                        {emulatedStaff.permissions.editInventory ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">● Ready & Tapable</span>
                        ) : (
                          <span className="text-rose-500 font-bold flex items-center gap-0.5"><Lock className="w-3 h-3" /> Blocked & Greyed out</span>
                        )}
                      </div>
                    </div>

                    {/* Screen 2: Batch Configurations */}
                    <div className="border border-slate-100 rounded-3xl p-4 bg-slate-50/40 space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">2. Manufacturing Batch Logs Page</span>
                        <Badge className={emulatedStaff.permissions.manageBatches ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800'}>
                          {emulatedStaff.permissions.manageBatches ? 'UNLOCKED' : 'LOCKED'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                        Allows supervisors to generate active spinning batch numbers, tag warehouse locations and specify expiry timers.
                      </p>
                      <div className="bg-white border rounded-xl p-3 flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-bold">"Generate Manufacturing Batch" Actions:</span>
                        {emulatedStaff.permissions.manageBatches ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">● Ready & Tapable</span>
                        ) : (
                          <span className="text-rose-500 font-bold flex items-center gap-0.5"><Lock className="w-3 h-3" /> Blocked & Greyed out</span>
                        )}
                      </div>
                    </div>

                    {/* Screen 3: Manual Stock Auditing Adjust */}
                    <div className="border border-slate-100 rounded-3xl p-4 bg-slate-50/40 space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">3. Stock Audits & Manual Adjusts</span>
                        <Badge className={emulatedStaff.permissions.makeAdjustments ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800'}>
                          {emulatedStaff.permissions.makeAdjustments ? 'UNLOCKED' : 'LOCKED'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                        Allows warehouse managers to register material theft/spill shortages or force adjust manual counts.
                      </p>
                      <div className="bg-white border rounded-xl p-3 flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-bold">"Register Stock Shortage" Trigger:</span>
                        {emulatedStaff.permissions.makeAdjustments ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">● Ready & Tapable</span>
                        ) : (
                          <span className="text-rose-500 font-bold flex items-center gap-0.5"><Lock className="w-3 h-3" /> Blocked & Greyed out</span>
                        )}
                      </div>
                    </div>

                    {/* Screen 4: Critical Lot Recalls */}
                    <div className="border border-slate-100 rounded-3xl p-4 bg-slate-50/40 space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">4. Batch Recall Management Logs</span>
                        <Badge className={emulatedStaff.permissions.executeRecall ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800'}>
                          {emulatedStaff.permissions.executeRecall ? 'UNLOCKED' : 'LOCKED'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                        Allows security officers to issue full-scale physical product recall orders for defective natural fibers.
                      </p>
                      <div className="bg-white border rounded-xl p-3 flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-bold">"Decommission Contaminated Batch":</span>
                        {emulatedStaff.permissions.executeRecall ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">● Ready & Tapable</span>
                        ) : (
                          <span className="text-rose-500 font-bold flex items-center gap-0.5"><Lock className="w-3 h-3" /> Blocked & Greyed out</span>
                        )}
                      </div>
                    </div>

                  </div>
                )}

              </CardContent>
            </Card>
          </div>

        </div>
      )}


      {/* Tab 4: Standard Role Templates Configurer */}
      {activeTab === 'templates' && (
        <Card className="border-slate-200 bg-white shadow-sm rounded-3xl">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              Standard Clearance Role Templates Mappings
            </CardTitle>
            <CardDescription className="text-[10px]">
              Align all active organizational roles with global default clearances with single-click bulk updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6 text-xs font-medium text-slate-650">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Template: Inventory manager */}
              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50/50 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <h5 className="font-extrabold text-[#111111]">Inventory Supervisor Default Template</h5>
                  </div>
                  <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                    Mapped exclusively for managing physical warehouse locations, logging spinners, batches and raw materials parameters. Restricted from monetary logs or corporate billing actions.
                  </p>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-200/50">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Inventory Edit Gate:</span>
                    <span className="text-emerald-700 font-bold">Unrestricted</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Corporate Billing Access:</span>
                    <span className="text-rose-600 font-bold">Forbidden</span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleBulkResetRoleTemplates('inventory_manager')}
                  className="w-full bg-slate-900 text-white rounded-xl text-xs h-9 font-bold mt-4"
                >
                  Apply Cohort Template Sync
                </Button>
              </div>

              {/* Template: Billing Clerk */}
              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50/50 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-500 animate-pulse" />
                    <h5 className="font-extrabold text-[#111111]">Billing & Invoicing Associate</h5>
                  </div>
                  <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                    Focused entirely on client B2B invoice creation, payment status records and GST tax reconciliation ledger checks. Restricted from physical stock balances.
                  </p>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-200/50">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">B2B Invoice Creation:</span>
                    <span className="text-emerald-700 font-bold">Unrestricted</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Defective Batch Decommisions:</span>
                    <span className="text-rose-600 font-bold">Forbidden</span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleBulkResetRoleTemplates('billing_clerk')}
                  className="w-full bg-slate-900 text-white rounded-xl text-xs h-9 font-bold mt-4"
                >
                  Apply Cohort Template Sync
                </Button>
              </div>

              {/* Template: Staff Viewer */}
              <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50/50 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-rose-500 animate-pulse" />
                    <h5 className="font-extrabold text-[#111111]">Operational Staff Viewer</h5>
                  </div>
                  <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                    Intended for visual reporting, third-party audits and compliance supervisors in the spinning factory. Complete read-only gates applied across all database operations.
                  </p>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-200/50">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Live Reports Access:</span>
                    <span className="text-emerald-700 font-bold">Locked Allowed</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Edit Catalog & Prices:</span>
                    <span className="text-rose-600 font-bold">Forbidden</span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleBulkResetRoleTemplates('staff_viewer')}
                  className="w-full bg-slate-900 text-white rounded-xl text-xs h-9 font-bold mt-4"
                >
                  Apply Cohort Template Sync
                </Button>
              </div>

            </div>

          </CardContent>
        </Card>
      )}

    </div>
  );
}

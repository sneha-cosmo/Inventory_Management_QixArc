import React, { useState } from 'react';
import { 
  Truck, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  RefreshCw, 
  Info, 
  ShieldAlert, 
  Edit3, 
  X, 
  Clock as ClockIcon,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  EwayBill, 
  Staff, 
  Warehouse, 
  EwayBillSettings,
  EwayBillTransportMode
} from '../types';
import { 
  determineEwbApplicability, 
  checkEwbReadiness, 
  validateVehiclePlate, 
  canCancelEwb, 
  DEFAULT_EWAY_BILL_SETTINGS 
} from '../rules/ewayBill';
import { Clock } from '../rules/clock';
import { Language, tText } from '../locales';

interface EwayBillPanelProps {
  documentRefId: string;
  documentRefType: 'invoice' | 'transfer';
  documentNumber: string;
  documentDate: string;
  consignmentValue: number;
  fromWarehouse: Warehouse;
  toParty: {
    gstin?: string;
    legalName?: string;
    tradeName?: string;
    addressLines?: string[];
    place: string;
    stateCode: string;
    pin: string;
  };
  items: {
    productId?: string;
    productName: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    taxableAmount: number;
    gstRate: number;
  }[];
  transMode?: EwayBillTransportMode;
  transporterId?: string;
  transporterName?: string;
  vehicleNumber?: string;
  approxDistanceKm?: number;
  isExemptGoods?: boolean;
  existingEwb?: EwayBill | null;
  currentUser: Staff;
  language?: Language;
  settings?: EwayBillSettings;
  onGenerate: (payload: {
    transMode: EwayBillTransportMode;
    transporterId?: string;
    transporterName?: string;
    vehicleNumber?: string;
    approxDistanceKm: number;
  }) => Promise<void>;
  onUpdateVehicle: (ewbNo: string, payload: {
    newVehicleNumber: string;
    fromPlace: string;
    fromState: string;
    reason: string;
  }) => Promise<void>;
  onCancel: (ewbNo: string, payload: {
    cancelReason: string;
    cancelRemarks: string;
  }) => Promise<void>;
}

export default function EwayBillPanel({
  documentRefId,
  documentRefType,
  documentNumber,
  documentDate,
  consignmentValue,
  fromWarehouse,
  toParty,
  items,
  transMode = 'Road',
  transporterId,
  transporterName,
  vehicleNumber,
  approxDistanceKm = 100,
  isExemptGoods = false,
  existingEwb,
  currentUser,
  language = 'en',
  settings = DEFAULT_EWAY_BILL_SETTINGS,
  onGenerate,
  onUpdateVehicle,
  onCancel
}: EwayBillPanelProps) {
  const [loading, setLoading] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [openPrintModal, setOpenPrintModal] = useState(false);

  // Form states for manual overrides during generation
  const [currentMode, setCurrentMode] = useState<EwayBillTransportMode>(transMode);
  const [currentVehNo, setCurrentVehNo] = useState(vehicleNumber || '');
  const [currentDist, setCurrentDist] = useState(approxDistanceKm.toString());
  const [currentTransName, setCurrentTransName] = useState(transporterName || '');
  const [currentTransId, setCurrentTransId] = useState(transporterId || '');

  // Update vehicle modal state
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [updatePlace, setUpdatePlace] = useState(fromWarehouse.location || '');
  const [updateState, setUpdateState] = useState(fromWarehouse.state || 'Maharashtra');
  const [updateReason, setUpdateReason] = useState('Transshipment');

  // Cancel modal state
  const [cancelReasonCode, setCancelReasonCode] = useState('2'); // 2 = Order Cancelled
  const [cancelRemarks, setCancelRemarks] = useState('');

  // Optional toggles
  const [shipToGstinEnabled, setShipToGstinEnabled] = useState(false);
  const [voluntaryClosureEnabled, setVoluntaryClosureEnabled] = useState(false);

  // 1. Calculate applicability using pure domain rules
  const applicability = determineEwbApplicability({
    documentType: documentRefType === 'invoice' ? 'sales_invoice' : 'transfer',
    fromStateCode: fromWarehouse.stateCode || '27',
    toStateCode: toParty.stateCode || '27',
    fromGstin: fromWarehouse.gstin,
    toGstin: toParty.gstin,
    consignmentValue,
    isExemptGoods,
    settings
  });

  // 2. Calculate document readiness
  const parsedDist = Number(currentDist) || 0;
  const readiness = checkEwbReadiness({
    fromWarehouse,
    toParty,
    items,
    transMode: currentMode,
    transporterId: currentTransId,
    vehicleNumber: currentVehNo,
    approxDistanceKm: parsedDist
  });

  // 3. Status computation
  let status: 'Not required' | 'Required' | 'Ready' | 'Generated' | 'Cancelled' | 'Failed' = 'Not required';
  if (existingEwb) {
    if (existingEwb.status === 'CNL') {
      status = 'Cancelled';
    } else {
      status = 'Generated';
    }
  } else if (applicability.requirement === 'Required') {
    status = readiness.ready ? 'Ready' : 'Required';
  } else if (applicability.requirement === 'Optional') {
    status = readiness.ready ? 'Ready' : 'Not required';
  }

  // 4. Role-based permissions
  const isAdmin = currentUser.role === 'admin';
  const isBillingClerk = currentUser.role === 'billing_clerk';
  const isInventoryManager = currentUser.role === 'inventory_manager';

  const canGenerate = isAdmin || 
    (documentRefType === 'invoice' && isBillingClerk) ||
    (documentRefType === 'transfer' && isInventoryManager);

  // Statutory cancellation eligibility
  const cancelEligibility = existingEwb ? canCancelEwb(existingEwb, Clock.getCurrentDate(), settings) : { canCancel: false, hoursElapsed: 0 };
  const canCancel = isAdmin && cancelEligibility.canCancel;

  // Validity countdown calculation
  const getValidityDisplay = () => {
    if (!existingEwb) return null;
    const now = Clock.getCurrentDate().getTime();
    const expiry = new Date(existingEwb.validUpto).getTime();
    const diffMs = expiry - now;
    if (diffMs <= 0) {
      return { text: 'Expired', isExpired: true };
    }
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return {
      text: days > 0 ? `${days}d ${remHours}h remaining` : `${hours}h remaining`,
      isExpired: false
    };
  };

  const validityInfo = getValidityDisplay();

  const handleGenerateClick = async () => {
    if (!canGenerate) return;
    if (!readiness.ready) {
      alert(`Cannot generate E-Way Bill:\n• ${readiness.errors.join('\n• ')}`);
      return;
    }
    setLoading(true);
    try {
      await onGenerate({
        transMode: currentMode,
        transporterId: currentTransId.trim() || undefined,
        transporterName: currentTransName.trim() || undefined,
        vehicleNumber: currentVehNo.trim() || undefined,
        approxDistanceKm: parsedDist
      });
    } catch (err: any) {
      alert(`Generation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingEwb || !newVehicleNumber.trim()) return;
    setLoading(true);
    try {
      await onUpdateVehicle(existingEwb.ewbNo, {
        newVehicleNumber: newVehicleNumber.trim().toUpperCase(),
        fromPlace: updatePlace.trim(),
        fromState: updateState.trim(),
        reason: updateReason
      });
      setOpenUpdateModal(false);
      setNewVehicleNumber('');
    } catch (err: any) {
      alert(`Vehicle update failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingEwb || !canCancel) return;
    setLoading(true);
    try {
      await onCancel(existingEwb.ewbNo, {
        cancelReason: cancelReasonCode,
        cancelRemarks: cancelRemarks.trim() || 'Cancelled by authorized Administrator'
      });
      setOpenCancelModal(false);
      setCancelRemarks('');
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-indigo-100 bg-white shadow-xs rounded-2xl overflow-hidden mt-4">
      {/* Top Banner: Status & Prominent Sandbox Label */}
      <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {tText("E-Way Bill", language)}
          </span>
          <Badge className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
            status === 'Generated' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
            status === 'Ready' ? 'bg-blue-100 text-blue-800 border-blue-200' :
            status === 'Required' ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' :
            status === 'Cancelled' ? 'bg-rose-100 text-rose-800 border-rose-200' :
            'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {tText(status, language)}
          </Badge>
        </div>

        {/* Mandatory Sandbox Label */}
        <Badge className="bg-amber-500/10 text-amber-900 border border-amber-300 font-mono text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5">
          SANDBOX - NOT A REAL E-WAY BILL
        </Badge>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* Applicability Context & Accountant Note */}
        <div className="flex items-start gap-2 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-slate-800">
              {applicability.reason}
            </p>
            <p className="text-[11px] text-slate-500 italic">
              ⚖️ {tText("Confirm current rules with your accountant.", language)}
            </p>
          </div>
        </div>

        {/* CASE A: E-Way Bill Already Generated */}
        {existingEwb && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">E-Way Bill Number</span>
                <span className="text-sm font-mono font-black text-indigo-950 block mt-0.5">
                  {existingEwb.ewbNo}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Generated On</span>
                <span className="text-xs font-semibold text-slate-700 block mt-0.5">
                  {new Date(existingEwb.ewbDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">{tText("Valid Until", language)}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-xs font-bold ${validityInfo?.isExpired ? 'text-rose-600' : 'text-slate-700'}`}>
                    {new Date(existingEwb.validUpto).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                  {validityInfo && (
                    <Badge variant="outline" className={`text-[9px] py-0 px-1 font-mono ${validityInfo.isExpired ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {validityInfo.text}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Vehicle & Mode</span>
                <span className="text-xs font-mono font-bold text-slate-800 block mt-0.5">
                  {existingEwb.vehicleNumber || 'Unassigned'} ({existingEwb.transMode})
                </span>
              </div>
            </div>

            {/* Action Buttons for Existing E-Way Bill */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Button 
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => setOpenPrintModal(true)}
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  {tText("Print E-Way Bill", language)}
                </Button>

                {existingEwb.status === 'ACT' && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setNewVehicleNumber(existingEwb.vehicleNumber || '');
                      setOpenUpdateModal(true);
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    {tText("Update Vehicle", language)}
                  </Button>
                )}
              </div>

              {/* Cancel Button: Strict Admin Permission with Tooltip Pattern */}
              {existingEwb.status === 'ACT' && (
                <div className="relative group">
                  <Button 
                    size="sm"
                    variant="outline"
                    disabled={!canCancel}
                    onClick={() => setOpenCancelModal(true)}
                    className={`rounded-xl text-xs font-bold transition-colors ${
                      canCancel 
                        ? 'border-rose-200 text-rose-600 hover:bg-rose-50' 
                        : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    {tText("Cancel E-Way Bill", language)}
                  </Button>
                  {!canCancel && (
                    <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block z-50 w-64 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg">
                      {!isAdmin 
                        ? "🔒 Security policy: Only Administrators can cancel an active statutory E-Way Bill."
                        : cancelEligibility.reason || "Cancellation window has elapsed."
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CASE B: E-Way Bill Not Yet Generated */}
        {!existingEwb && (
          <div className="space-y-4">
            {/* Readiness Errors Warning Banner */}
            {!readiness.ready && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs text-rose-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Mandatory Statutory Information Missing ({readiness.errors.length}):</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {readiness.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Transport Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Transport Mode</Label>
                <select 
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                  value={currentMode}
                  onChange={e => setCurrentMode(e.target.value as any)}
                >
                  <option value="Road">Road</option>
                  <option value="Rail">Rail</option>
                  <option value="Air">Air</option>
                  <option value="Ship">Ship</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Vehicle Number</Label>
                <Input 
                  placeholder="e.g. MH12AB1234"
                  className="h-8 rounded-lg border-slate-200 text-xs bg-white uppercase font-mono"
                  value={currentVehNo}
                  onChange={e => setCurrentVehNo(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Approx. Distance (km)</Label>
                <Input 
                  type="number"
                  min="1"
                  placeholder="e.g. 150"
                  className="h-8 rounded-lg border-slate-200 text-xs bg-white"
                  value={currentDist}
                  onChange={e => setCurrentDist(e.target.value)}
                />
              </div>
            </div>

            {/* Optional Settings Toggles (Rules 4 & 5: OFF by default) */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={shipToGstinEnabled} 
                  onChange={e => setShipToGstinEnabled(e.target.checked)}
                  className="rounded text-indigo-600 border-slate-300"
                />
                <span>Ship-To GSTIN Override (Optional)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={voluntaryClosureEnabled} 
                  onChange={e => setVoluntaryClosureEnabled(e.target.checked)}
                  className="rounded text-indigo-600 border-slate-300"
                />
                <span>Voluntary Delivery Closure (Optional)</span>
              </label>
            </div>

            {/* Generate Action Button with Disabled-with-Tooltip Pattern */}
            <div className="flex justify-end pt-2">
              <div className="relative group">
                <Button 
                  onClick={handleGenerateClick}
                  disabled={loading || !canGenerate || !readiness.ready}
                  className={`rounded-xl text-xs font-bold h-9 px-4 text-white transition-all ${
                    !canGenerate || !readiness.ready 
                      ? 'bg-slate-300 cursor-not-allowed opacity-70' 
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-xs'
                  }`}
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  <Truck className="w-3.5 h-3.5 mr-1.5" />
                  {tText("Generate E-Way Bill", language)}
                </Button>

                {(!canGenerate || !readiness.ready) && (
                  <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block z-50 w-64 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg">
                    {!canGenerate 
                      ? "🔒 Your current role does not have permission to generate this document's E-Way Bill."
                      : "⚠️ Complete all missing mandatory statutory fields above before generating."
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* UPDATE VEHICLE MODAL */}
      <Dialog open={openUpdateModal} onOpenChange={setOpenUpdateModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleUpdateVehicleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Update Conveyance / Vehicle (Part-B)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Record mid-transit vehicle change due to breakdown, transshipment, or carrier reallocation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">New Vehicle Number</Label>
                <Input 
                  required
                  placeholder="e.g. MH14CD5678"
                  className="uppercase font-mono text-xs"
                  value={newVehicleNumber}
                  onChange={e => setNewVehicleNumber(e.target.value.toUpperCase())}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">From Place</Label>
                  <Input 
                    required
                    placeholder="e.g. Pune Depot"
                    className="text-xs"
                    value={updatePlace}
                    onChange={e => setUpdatePlace(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">From State</Label>
                  <Input 
                    required
                    placeholder="e.g. Maharashtra"
                    className="text-xs"
                    value={updateState}
                    onChange={e => setUpdateState(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Reason for Change</Label>
                <select 
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  value={updateReason}
                  onChange={e => setUpdateReason(e.target.value)}
                >
                  <option value="Transshipment">Transshipment (Hub transfer)</option>
                  <option value="Vehicle Breakdown">Vehicle Breakdown</option>
                  <option value="Logistics Reallocation">Logistics Reallocation</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenUpdateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="bg-indigo-600 text-white font-bold">
                {loading ? 'Updating...' : 'Save & Update Part-B'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CANCEL E-WAY BILL MODAL (ADMIN ONLY) */}
      <Dialog open={openCancelModal} onOpenChange={setOpenCancelModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCancelSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Cancel Statutory E-Way Bill (Admin Only)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Statutory cancellation under Rule 138(9). This action is permanent and recorded in the audit trail.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Statutory Cancellation Reason</Label>
                <select 
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  value={cancelReasonCode}
                  onChange={e => setCancelReasonCode(e.target.value)}
                >
                  <option value="1">1: Duplicate E-Way Bill</option>
                  <option value="2">2: Order / Consignment Cancelled</option>
                  <option value="3">3: Data Entry Mistake</option>
                  <option value="4">4: Others</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cancellation Remarks</Label>
                <Input 
                  required
                  placeholder="Provide audit justification"
                  className="text-xs"
                  value={cancelRemarks}
                  onChange={e => setCancelRemarks(e.target.value)}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[11px] text-amber-800">
                ⚠️ Notice: Statutory cancellation is allowed within 24 hours of generation. Once cancelled, goods cannot be transported on this number.
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenCancelModal(false)}>
                Back
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="bg-rose-600 text-white font-bold hover:bg-rose-700">
                {loading ? 'Cancelling...' : 'Confirm Statutory Cancellation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PRINT / PREVIEW MODAL */}
      {existingEwb && (
        <Dialog open={openPrintModal} onOpenChange={setOpenPrintModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-center pr-6">
                <DialogTitle className="text-base font-black">
                  Official E-Way Bill Print View (Form GST EWB-01)
                </DialogTitle>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-mono text-[9px] font-black">
                  SANDBOX - NOT A REAL E-WAY BILL
                </Badge>
              </div>
            </DialogHeader>

            {/* Official NIC E-Way Bill Format Rendering */}
            <div className="border-2 border-slate-800 p-6 rounded-lg text-slate-900 space-y-4 font-sans bg-white relative">
              {/* Prominent Diagonal Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 select-none">
                <span className="text-4xl sm:text-5xl font-black text-slate-800 rotate-[-25deg] uppercase">
                  SANDBOX - NOT A REAL E-WAY BILL
                </span>
              </div>

              {/* Title Header */}
              <div className="text-center border-b pb-3 border-slate-300">
                <h3 className="text-base font-black tracking-wide">GOVERNMENT OF INDIA / STATE TAX DEPARTMENT</h3>
                <h4 className="text-xs font-bold text-slate-600">e-Way Bill (Consolidated Transit Document)</h4>
                <div className="flex justify-center items-center gap-4 mt-2 font-mono text-xs">
                  <span><strong>e-Way Bill No:</strong> {existingEwb.ewbNo}</span>
                  <span><strong>Date:</strong> {new Date(existingEwb.ewbDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* PART-A */}
              <div className="space-y-2">
                <h5 className="text-xs font-black uppercase bg-slate-100 px-2 py-1 rounded">PART - A (Consignment Information)</h5>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">1. GSTIN of Supplier:</span>
                    <span className="font-mono font-bold">{existingEwb.fromGstin}</span>
                    <span className="block text-slate-700">{existingEwb.fromTrdName}</span>
                    <span className="block text-slate-500 text-[11px]">{existingEwb.fromAddr1}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">2. GSTIN of Recipient:</span>
                    <span className="font-mono font-bold">{existingEwb.toGstin}</span>
                    <span className="block text-slate-700">{existingEwb.toTrdName}</span>
                    <span className="block text-slate-500 text-[11px]">{existingEwb.toAddr1}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">3. Document No & Date:</span>
                    <span>{existingEwb.docNo} ({existingEwb.docDate})</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">4. Document Type:</span>
                    <span>{existingEwb.docType === 'INV' ? 'Tax Invoice' : existingEwb.docType === 'CHL' ? 'Delivery Challan' : 'Bill of Supply'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">5. Value of Goods (₹):</span>
                    <span className="font-bold">₹{existingEwb.totalValue.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Items summary */}
                <div className="pt-2">
                  <span className="font-bold text-slate-500 block text-[10px] mb-1">6. Item Lines & HSN:</span>
                  <table className="w-full text-[11px] border border-slate-200 text-left">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-1 border">Product</th>
                        <th className="p-1 border">HSN</th>
                        <th className="p-1 border text-right">Qty</th>
                        <th className="p-1 border text-right">Taxable (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingEwb.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-1 border">{it.productName}</td>
                          <td className="p-1 border font-mono">{it.hsnCode}</td>
                          <td className="p-1 border text-right">{it.quantity} {it.qtyUnit}</td>
                          <td className="p-1 border text-right">₹{it.taxableAmount.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PART-B */}
              <div className="space-y-2 pt-2">
                <h5 className="text-xs font-black uppercase bg-slate-100 px-2 py-1 rounded">PART - B (Vehicle & Conveyance)</h5>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">Mode of Transport:</span>
                    <span className="font-bold">{existingEwb.transMode}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">Vehicle / Conveyance No:</span>
                    <span className="font-mono font-black">{existingEwb.vehicleNumber || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">Approx. Distance:</span>
                    <span>{existingEwb.approxDistanceKm} KM</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">Transporter:</span>
                    <span>{existingEwb.transporterName || 'Self Transport'} {existingEwb.transporterId ? `(${existingEwb.transporterId})` : ''}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">Valid Until:</span>
                    <span className="font-bold">{new Date(existingEwb.validUpto).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Status Notice */}
              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-[11px] text-slate-500">
                <span>System Status: <strong className="uppercase text-slate-900">{existingEwb.status}</strong></span>
                <span className="italic">Printed from InvPredict Compliance Engine</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpenPrintModal(false)}>
                Close
              </Button>
              <Button size="sm" className="bg-indigo-600 text-white font-bold" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1.5" />
                Print / Save PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

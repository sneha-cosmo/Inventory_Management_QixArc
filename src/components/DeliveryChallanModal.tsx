import React from 'react';
import { Printer, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeliveryChallan, EwayBill } from '../types';

interface DeliveryChallanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challan: DeliveryChallan;
  ewayBill?: EwayBill | null;
}

export default function DeliveryChallanModal({
  open,
  onOpenChange,
  challan,
  ewayBill
}: DeliveryChallanModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Delivery Challan (Rule 55 of CGST Rules)
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs font-bold">
              {challan.challanNumber}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Statutory conveyance document for physical goods movement without immediate sale or tax commitment.
          </DialogDescription>
        </DialogHeader>

        {/* Distinct Persons Warning if Different GSTINs */}
        {!challan.isSameGstin && (
          <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Distinct Persons Compliance Flag:</p>
              <p className="text-[11px] text-amber-800">
                {challan.distinctPersonsNotice || 'Different GSTIN branches constitute Distinct Persons under Section 25(4) of CGST Act. Tax Invoice required. Accountant to confirm.'}
              </p>
            </div>
          </div>
        )}

        {/* Challan Printout Canvas */}
        <div className="border-2 border-slate-700 p-6 rounded-lg text-slate-900 space-y-4 font-sans bg-white text-xs">
          {/* Header */}
          <div className="text-center border-b pb-3 border-slate-300">
            <h3 className="text-sm font-black uppercase tracking-wider">{challan.fromLegalName}</h3>
            <h4 className="text-xs font-bold text-slate-600">DELIVERY CHALLAN</h4>
            <span className="text-[10px] text-slate-500 block">Issued under Rule 55 of Central Goods and Services Tax Rules, 2017</span>
            <div className="flex justify-between items-center mt-3 text-[11px] font-mono border-t pt-2 border-slate-200">
              <span><strong>Challan No:</strong> {challan.challanNumber}</span>
              <span><strong>Date:</strong> {challan.challanDate}</span>
              <span><strong>Nature of Movement:</strong> {challan.reasonForTransportation}</span>
            </div>
          </div>

          {/* Consignor and Consignee */}
          <div className="grid grid-cols-2 gap-4 border-b pb-3 border-slate-200">
            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Consignor (Dispatching Branch)</span>
              <p className="font-bold text-slate-900">{challan.fromLegalName}</p>
              <p className="text-slate-600 text-[11px]">{challan.fromAddress} - {challan.fromPin}</p>
              <p className="font-mono font-bold mt-1">GSTIN: {challan.fromGstin || 'Unregistered'}</p>
              <p className="text-[11px] text-slate-500">State Code: {challan.fromStateCode}</p>
            </div>

            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase block">Consignee (Receiving Branch)</span>
              <p className="font-bold text-slate-900">{challan.toLegalName}</p>
              <p className="text-slate-600 text-[11px]">{challan.toAddress} - {challan.toPin}</p>
              <p className="font-mono font-bold mt-1">GSTIN: {challan.toGstin || 'Unregistered'}</p>
              <p className="text-[11px] text-slate-500">State Code: {challan.toStateCode}</p>
            </div>
          </div>

          {/* Goods Table */}
          <div className="space-y-1">
            <span className="font-bold text-slate-500 text-[10px] uppercase block">Particulars of Goods Dispatched</span>
            <table className="w-full text-[11px] border border-slate-300 text-left">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-1.5 border">Item Description</th>
                  <th className="p-1.5 border">HSN Code</th>
                  <th className="p-1.5 border text-right">Quantity</th>
                  <th className="p-1.5 border text-right">Declared Value (₹)</th>
                  <th className="p-1.5 border text-right">Tax Payable (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1.5 border font-semibold">{challan.itemName}</td>
                  <td className="p-1.5 border font-mono">{challan.hsnCode}</td>
                  <td className="p-1.5 border text-right">{challan.quantity} {challan.unit}</td>
                  <td className="p-1.5 border text-right font-mono">₹{challan.declaredValue.toLocaleString('en-IN')}</td>
                  <td className="p-1.5 border text-right font-mono text-slate-500">
                    {challan.isSameGstin ? '₹0.00 (No Sale)' : 'Subject to Tax Inv'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Attached E-Way Bill reference */}
          {ewayBill && (
            <div className="bg-indigo-50/50 p-2.5 rounded border border-indigo-200 flex justify-between items-center text-[11px]">
              <div>
                <span className="font-bold text-indigo-900 block">Attached E-Way Bill:</span>
                <span className="font-mono font-black text-indigo-950">{ewayBill.ewbNo}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Valid Until:</span>
                <span className="font-mono font-bold text-slate-800">{new Date(ewayBill.validUpto).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* Footer certification */}
          <div className="border-t pt-3 flex justify-between items-end text-[10px] text-slate-500">
            <div>
              <p>Certified that the particulars given above are true and correct.</p>
              <p className="italic">Goods transported purely for internal branch rebalancing / own use.</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-800">For {challan.fromLegalName}</p>
              <div className="h-8"></div>
              <p className="border-t border-slate-400 pt-0.5">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" className="bg-indigo-600 text-white font-bold" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print Challan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

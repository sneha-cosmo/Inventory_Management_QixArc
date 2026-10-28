import React, { useState, useEffect } from 'react';
import {
  NotificationSettings,
  validateNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS
} from '../utils/notificationCenter';
import { Staff } from '../types';
import { LOCALES, Language } from '../locales';
import { X, Sliders, AlertTriangle, Check, ShieldAlert } from 'lucide-react';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onSave: (newSettings: NotificationSettings) => void;
  currentUser: Staff;
  language: Language;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  currentUser,
  language
}) => {
  const t = LOCALES[language] || LOCALES.en;
  const isAuthorized = currentUser.role === 'admin' || currentUser.role === 'inventory_manager';

  const [form, setForm] = useState<NotificationSettings>({ ...settings });
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...settings });
      setErrors([]);
      setSuccessMsg(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleNearDaysChange = (val: number) => {
    setForm(prev => ({ ...prev, nearExpiryDays: val }));
  };

  const handleCriticalDaysChange = (val: number) => {
    setForm(prev => ({ ...prev, criticalExpiryDays: val }));
  };

  const handleTransferDaysChange = (val: number) => {
    setForm(prev => ({ ...prev, stuckTransferDays: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;

    const validation = validateNotificationSettings(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    onSave(validation.sanitized);
    setSuccessMsg(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight">
                {t.notificationSettings}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ta' ? "எச்சரிக்கை வரம்புகள் மற்றும் விருப்பங்களை உள்ளமைக்கவும்" : "Configure smart thresholds and alert channels"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {!isAuthorized && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-xs">
              <ShieldAlert className="shrink-0 text-amber-600" size={18} />
              <span>{t.permissionDeniedSettings}</span>
            </div>
          )}

          {errors.length > 0 && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 space-y-1">
              <div className="flex items-center gap-2 font-bold text-red-800">
                <AlertTriangle size={15} />
                <span>{language === 'ta' ? "செல்லுபடியற்ற உள்ளீடு" : "Invalid parameters"}</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 font-bold">
              <Check size={16} className="text-emerald-600" />
              <span>{language === 'ta' ? "அமைப்புகள் வெற்றிகரமாகச் சேமிக்கப்பட்டன" : "Settings saved successfully!"}</span>
            </div>
          )}

          {/* Threshold Inputs */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {language === 'ta' ? "கால வரம்புகள்" : "Threshold Settings"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.nearExpiryDaysLabel}
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  disabled={!isAuthorized}
                  value={form.nearExpiryDays}
                  onChange={(e) => handleNearDaysChange(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {language === 'ta' ? "இயல்புநிலை: 30 நாட்கள்" : "Default: 30 days"}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.criticalExpiryDaysLabel}
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  disabled={!isAuthorized}
                  value={form.criticalExpiryDays}
                  onChange={(e) => handleCriticalDaysChange(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {language === 'ta' ? "இயல்புநிலை: 7 நாட்கள் (< விரைவில் காலாவதி)" : "Default: 7 days (< near expiry)"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.stuckTransferDaysLabel}
              </label>
              <input
                type="number"
                min="1"
                max="90"
                disabled={!isAuthorized}
                value={form.stuckTransferDays}
                onChange={(e) => handleTransferDaysChange(Number(e.target.value))}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {language === 'ta' ? "இயல்புநிலை: 3 நாட்கள் போக்குவரத்து தாமதம்" : "Default: 3 days in transit"}
              </span>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Alert Channel Toggles */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t.enableAlertTypes}
            </h4>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {language === 'ta' ? "குறைந்த இருப்பு எச்சரிக்கைகள்" : "Low Stock Alerts"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'ta' ? "மறுவரிசை நிலைக்குக் குறைவான அல்லது <15 நாட்கள் இருப்பு" : "Trigger when stock <= reorder level or <15 days"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={!isAuthorized}
                  checked={form.enableLowStock}
                  onChange={(e) => setForm(f => ({ ...f, enableLowStock: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {language === 'ta' ? "இருப்பு முடிந்தது (0 Units)" : "Out of Stock Alerts"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'ta' ? "இருப்பு முழுமையாகத் தீர்ந்த பொருட்கள்" : "Immediate critical alert when stock reaches 0"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={!isAuthorized}
                  checked={form.enableOutOfStock}
                  onChange={(e) => setForm(f => ({ ...f, enableOutOfStock: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {language === 'ta' ? "காலாவதியான தொகுதிகள்" : "Expired Batch Alerts"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'ta' ? "காலாவதி தேதி முடிந்த தொகுதிகள் (தனிமைப்படுத்தல்)" : "Batches past expiration date requiring quarantine"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={!isAuthorized}
                  checked={form.enableExpiredBatch}
                  onChange={(e) => setForm(f => ({ ...f, enableExpiredBatch: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {language === 'ta' ? "விரைவில் காலாவதியாகும் தொகுதிகள்" : "Expiring Soon Batches"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'ta' ? "வரம்புக்குள் காலாவதியாகும் பொருட்கள்" : "Upcoming expiration within configured threshold days"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={!isAuthorized}
                  checked={form.enableExpiringSoon}
                  onChange={(e) => setForm(f => ({ ...f, enableExpiringSoon: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {language === 'ta' ? "தாமதமான பில்கள்" : "Overdue Invoice Alerts"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'ta' ? "செலுத்தப்படாத காலக்கெடு கடந்த பில்கள் (நிர்வாகி & பில்லிங்)" : "Invoices past due date (Admin & Billing only)"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={!isAuthorized}
                  checked={form.enableOverdueInvoice}
                  onChange={(e) => setForm(f => ({ ...f, enableOverdueInvoice: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {language === 'ta' ? "தாமதமான சரக்குப் பரிமாற்றங்கள்" : "Stuck Transfer Alerts"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'ta' ? "கிளை பரிமாற்றத்தில் தாமதமான பொருட்கள்" : "Inter-warehouse transfers exceeding transit threshold"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={!isAuthorized}
                  checked={form.enableStuckTransfer}
                  onChange={(e) => setForm(f => ({ ...f, enableStuckTransfer: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Admin Developer Tools Toggle */}
          {currentUser.role === 'admin' && (
            <>
              <hr className="border-slate-100" />
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-indigo-600" />
                  <span>Developer tools</span>
                </h4>
                <label className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 hover:bg-amber-50 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-amber-950">
                      Enable developer error test sample files
                    </div>
                    <div className="text-[11px] text-amber-700">
                      Shows the deliberate error sample CSV download link in Item Bulk Import for testing and verification
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!form.developerToolsEnabled}
                    onChange={(e) => setForm(f => ({ ...f, developerToolsEnabled: e.target.checked }))}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </>
          )}

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {t.cancel || "Cancel"}
            </button>
            <button
              type="submit"
              disabled={!isAuthorized}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t.saveSettings}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

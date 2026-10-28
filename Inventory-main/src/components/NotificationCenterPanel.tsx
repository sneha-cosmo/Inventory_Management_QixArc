import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  AppNotification,
  NotificationCategory,
  NotificationSeverity,
  UserNotificationState
} from '../utils/notificationCenter';
import { Staff } from '../types';
import { LOCALES, Language } from '../locales';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Filter,
  MoreVertical,
  Package,
  Calendar,
  DollarSign,
  Truck,
  Settings,
  X,
  AlertTriangle,
  Info,
  Archive,
  RefreshCw,
  BellOff
} from 'lucide-react';

interface NotificationCenterPanelProps {
  notifications: AppNotification[];
  userState: UserNotificationState;
  onUpdateUserState: (nextState: UserNotificationState) => void;
  currentUser: Staff;
  language: Language;
  onOpenSettings: () => void;
  onActionNavigate: (action: AppNotification['action']) => void;
}

export const NotificationCenterPanel: React.FC<NotificationCenterPanelProps> = ({
  notifications,
  userState,
  onUpdateUserState,
  currentUser,
  language,
  onOpenSettings,
  onActionNavigate
}) => {
  const t = LOCALES[language] || LOCALES.en;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | NotificationCategory>('all');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  // Close panel on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setOpenActionMenuId(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setOpenActionMenuId(null);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const readSet = useMemo(() => new Set(userState.readIds), [userState.readIds]);

  // Unread count (excluding dismissed and snoozed)
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readSet.has(n.id)).length;
  }, [notifications, readSet]);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  // Filter tabs allowed by user role
  const availableTabs = useMemo(() => {
    const tabs: { id: 'all' | NotificationCategory; label: string; icon: any }[] = [];

    if (currentUser.role === 'billing_clerk') {
      tabs.push({ id: 'finance', label: t.tabFinance, icon: DollarSign });
      return tabs;
    }

    tabs.push({ id: 'all', label: t.tabAll, icon: Filter });
    tabs.push({ id: 'stock', label: t.tabStock, icon: Package });
    tabs.push({ id: 'expiry', label: t.tabExpiry, icon: Calendar });

    if (currentUser.role === 'admin') {
      tabs.push({ id: 'finance', label: t.tabFinance, icon: DollarSign });
    }

    return tabs;
  }, [currentUser.role, t]);

  // Default active tab to first available
  useEffect(() => {
    if (!availableTabs.some(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || 'all');
    }
  }, [availableTabs, activeTab]);

  // Filter notifications by tab
  const tabFilteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter(n => n.category === activeTab);
  }, [notifications, activeTab]);

  // Actions
  const handleMarkAsRead = (id: string) => {
    const nextRead = new Set(userState.readIds);
    nextRead.add(id);
    onUpdateUserState({
      ...userState,
      readIds: Array.from(nextRead)
    });
    setOpenActionMenuId(null);
  };

  const handleMarkAsUnread = (id: string) => {
    const nextRead = new Set(userState.readIds);
    nextRead.delete(id);
    onUpdateUserState({
      ...userState,
      readIds: Array.from(nextRead)
    });
    setOpenActionMenuId(null);
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    onUpdateUserState({
      ...userState,
      readIds: Array.from(new Set([...userState.readIds, ...allIds]))
    });
  };

  const handleDismiss = (id: string) => {
    const nextDismissed = new Set(userState.dismissedIds);
    nextDismissed.add(id);
    onUpdateUserState({
      ...userState,
      dismissedIds: Array.from(nextDismissed)
    });
    setOpenActionMenuId(null);
  };

  const handleSnooze = (id: string, days: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    onUpdateUserState({
      ...userState,
      snoozedMap: {
        ...userState.snoozedMap,
        [id]: targetDate.toISOString()
      }
    });
    setOpenActionMenuId(null);
  };

  const canManageSettings = currentUser.role === 'admin' || currentUser.role === 'inventory_manager';

  const getSeverityBadge = (sev: NotificationSeverity) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200 font-bold';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-200 font-semibold';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200 font-medium';
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        ref={bellButtonRef}
        onClick={() => {
          setIsOpen(!isOpen);
          setOpenActionMenuId(null);
        }}
        aria-label="Notification Center"
        className={`relative p-3 rounded-2xl border transition-all cursor-pointer ${
          isOpen
            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
            : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-100 shadow-xs'
        }`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
            {displayCount}
          </span>
        )}
      </button>

      {/* Slide-over / Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-[390px] sm:w-[480px] bg-white rounded-3xl shadow-2xl border border-slate-200/80 z-50 flex flex-col overflow-hidden animate-scale-in"
          style={{ maxHeight: '82vh' }}
        >
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Bell size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-base leading-none">
                    {t.notifications}
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold">
                      {unreadCount} {language === 'ta' ? "புதியவை" : "unread"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'ta' ? "சரக்கு மற்றும் காலாவதி நேரடி எச்சரிக்கைகள்" : "Real-time shortages and expiry alerts"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  title={t.markAllAsRead}
                  className="p-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck size={16} />
                  <span className="hidden sm:inline text-[11px]">{t.markAllAsRead}</span>
                </button>
              )}

              {canManageSettings && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  title={t.notificationSettings}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Settings size={17} />
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Navigation Category Tabs */}
          <div className="px-4 pt-3 pb-2 border-b border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto">
            {availableTabs.map((tab) => {
              const TabIcon = tab.icon;
              const tabCount = tab.id === 'all'
                ? notifications.length
                : notifications.filter(n => n.category === tab.id).length;
              const tabUnread = tab.id === 'all'
                ? unreadCount
                : notifications.filter(n => n.category === tab.id && !readSet.has(n.id)).length;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setOpenActionMenuId(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <TabIcon size={13} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      activeTab === tab.id
                        ? 'bg-indigo-800 text-white'
                        : tabUnread > 0
                        ? 'bg-red-100 text-red-600'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tabCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[500px]">
            {tabFilteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-xs">
                  <CheckCheck size={28} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{t.noNotifications}</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
                  {t.allCaughtUp}
                </p>
              </div>
            ) : (
              tabFilteredNotifications.map((notif) => {
                const isRead = readSet.has(notif.id);
                const isActionMenuOpen = openActionMenuId === notif.id;

                return (
                  <div
                    key={notif.id}
                    className={`relative p-4 transition-colors hover:bg-slate-50/80 ${
                      !isRead ? 'bg-indigo-50/20' : 'bg-white opacity-85'
                    } ${
                      notif.severity === 'critical'
                        ? 'border-l-4 border-l-red-500'
                        : notif.severity === 'warning'
                        ? 'border-l-4 border-l-amber-500'
                        : 'border-l-4 border-l-blue-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left indicator & Title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${getSeverityBadge(
                              notif.severity
                            )}`}
                          >
                            {notif.severity}
                          </span>

                          <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/80">
                            {notif.skuOrDocRef}
                          </span>

                          {notif.warehouseName && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              • <span>{notif.warehouseName}</span>
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1">
                            <Clock size={11} />
                            <span>{notif.ageText}</span>
                          </span>
                        </div>

                        <h4
                          className={`text-xs ${
                            !isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                          } leading-snug`}
                        >
                          {notif.title}
                        </h4>

                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {notif.description}
                        </p>

                        {/* Action buttons */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              onActionNavigate(notif.action);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer border border-indigo-200/60 shadow-2xs"
                          >
                            <span>{notif.action.label}</span>
                            <ExternalLink size={12} />
                          </button>

                          {!isRead ? (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              {t.markAsRead}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkAsUnread(notif.id)}
                              className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              {t.markAsUnread}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right Action Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenActionMenuId(isActionMenuOpen ? null : notif.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {isActionMenuOpen && (
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-20 text-xs text-slate-700 animate-scale-in">
                            <button
                              onClick={() => handleSnooze(notif.id, 1)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Clock size={13} className="text-slate-400" />
                              <span>{t.snooze1Day}</span>
                            </button>
                            <button
                              onClick={() => handleSnooze(notif.id, 7)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Clock size={13} className="text-slate-400" />
                              <span>{t.snooze7Days}</span>
                            </button>
                            <hr className="my-1 border-slate-100" />
                            <button
                              onClick={() => handleDismiss(notif.id)}
                              className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer font-semibold"
                            >
                              <Archive size={13} />
                              <span>{t.dismiss}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

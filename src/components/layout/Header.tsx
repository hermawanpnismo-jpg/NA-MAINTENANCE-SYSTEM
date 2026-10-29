import React, { useState, useEffect } from 'react';
import { RefreshCw, Factory, Shield, User as UserIcon, LogIn, LogOut, Flame, Clock, HardDrive } from 'lucide-react';
import { Plant, AuthUser } from '../../types/index.ts';
import type { FirebaseUser } from '../../lib/firebase.ts';
import { getOnlineTimeWIB } from '../../lib/formatters.ts';
import { DatabaseBackupModal } from '../common/DatabaseBackupModal.tsx';

interface HeaderProps {
  plants: Plant[];
  selectedPlant: string;
  onPlantChange: (plantId: string) => void;
  currentUserRole: string;
  onRoleChange: (role: string) => void;
  lastRefreshTime: string;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  firebaseUser?: FirebaseUser | null;
  authenticatedUser?: AuthUser | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onLogout?: () => void;
}

import { api } from '../../lib/api.ts';
import { realtime } from '../../lib/realtime.ts';

export const Header: React.FC<HeaderProps> = ({
  plants,
  selectedPlant,
  onPlantChange,
  currentUserRole,
  onRoleChange,
  lastRefreshTime,
  onManualRefresh,
  isRefreshing,
  firebaseUser,
  authenticatedUser,
  onSignIn,
  onSignOut,
  onLogout
}) => {
  const [onlineClock, setOnlineClock] = useState<string>(getOnlineTimeWIB());
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [roles, setRoles] = useState<string[]>([
    'System Administrator',
    'Maintenance Leader - All Plant (Hermawan Prasetyo)',
    'Maintenance Leader - NA-2 (Alfin Prasetyo)',
    'Maintenance Supervisor (Warto)',
    'Maintenance Technician (Marsino / Amin Irfan / Dedi)',
    'Maintenance Manager',
    'Maintenance Planner',
    'Facility / Utility Officer',
    'Storekeeper',
    'Viewer / Management'
  ]);

  const fetchRoles = async () => {
    try {
      const list = await api.getRoles();
      if (Array.isArray(list) && list.length > 0) {
        setRoles(list.map((r: any) => r.name));
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchRoles();

    const update = () => setOnlineClock(getOnlineTimeWIB());
    const interval = setInterval(update, 1000);

    const unsub = realtime.subscribe((ev) => {
      if (ev.entity === 'roles' || ev.entity === 'all') {
        fetchRoles();
      }
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6 shrink-0 z-20">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
          NA
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900 tracking-tight block whitespace-nowrap">
              PT National Assemblers
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Flame className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
              Firebase
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Maintenance Management System (NA-MMS)
          </span>
        </div>
      </div>

      {/* Zone 2: Plant Switcher & Realtime Sync Status */}
      <div className="flex items-center gap-3 text-sm">
        {/* Plant Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
          <Factory className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Pabrik:</span>
          <select
            value={selectedPlant}
            onChange={(e) => onPlantChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Pabrik (NA-2, NA-3, NA-4)</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Realtime Online Status Badge for All PCs */}
        <div
          className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs"
          title="Sistem sinkron realtime online ke seluruh PC & perangkat yang membuka tautan web ini."
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden sm:inline font-bold">Realtime Online</span>
          <span className="hidden xl:inline text-[10px] text-emerald-700/80 font-normal">
            · Semua PC Tersinkron
          </span>
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            title="Klik untuk sinkronisasi manual langsung ke server"
            className="p-1 hover:bg-emerald-100 rounded text-emerald-700 hover:text-emerald-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-800' : ''}`} />
          </button>
        </div>

        {/* Live Online Clock & Sync Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-lg border border-slate-700 shadow-xs font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <span className="font-bold text-amber-300">{onlineClock}</span>
          <span className="text-[10px] text-slate-400 hidden xl:inline">· Jam Online Sistem</span>
        </div>

        {/* Data Refresh Timestamp */}
        <div className="hidden lg:flex items-center text-xs text-slate-500 font-mono">
          <span className="text-[11px] text-slate-400">Pembaruan:</span>
          <span className="ml-1 text-slate-700 font-semibold">{lastRefreshTime || 'Live'}</span>
        </div>

        {/* Tombol Backup DB ke Hardisk PC */}
        <button
          onClick={() => setIsBackupModalOpen(true)}
          title="Simpan / Download Database ke Hardisk PC Lokal (SQLite / JSON Dump)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-750 hover:text-slate-950 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
        >
          <HardDrive className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Backup DB ke PC</span>
        </button>
      </div>

      {/* Zone 3: Role Switcher & Firebase Auth Profile */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg p-1.5 border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-blue-700 shrink-0 ml-1" />
          <span className="text-xs text-slate-500 font-medium">Role:</span>
          <select
            value={currentUserRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer pr-1"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          {authenticatedUser ? (
            <div className="flex items-center gap-2">
              {authenticatedUser.photoURL ? (
                <img
                  src={authenticatedUser.photoURL}
                  alt={authenticatedUser.name}
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs border border-blue-200">
                  {authenticatedUser.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[150px]">
                  {authenticatedUser.name}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[150px]">
                  {authenticatedUser.employee_id} · {authenticatedUser.role}
                </p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Keluar dari Sistem (Sign Out / Logout)"
                  className="ml-1 p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xl:inline text-[11px] font-semibold">Keluar</span>
                </button>
              )}
            </div>
          ) : firebaseUser ? (
            <div className="flex items-center gap-2">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-semibold text-xs overflow-hidden">
                  <UserIcon className="w-4 h-4 text-blue-900" />
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[140px]">
                  {firebaseUser.displayName || firebaseUser.email || 'Plant Officer'}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[140px]">
                  {firebaseUser.email || 'Authenticated'}
                </p>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title="Sign out from Firebase"
                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs">
                <UserIcon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">Belum Login</p>
                <p className="text-[10px] text-slate-500 leading-tight">Guest User</p>
              </div>
              {onSignIn && (
                <button
                  onClick={onSignIn}
                  title="Masuk ke Sistem"
                  className="ml-1 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Database Local Hard Drive Backup & Export Modal */}
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </header>
  );
};


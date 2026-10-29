import React, { useState, useEffect } from 'react';
import {
  KeyRound, ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2,
  X, Loader2, Info
} from 'lucide-react';
import { api } from '../../lib/api.ts';

interface ChangeSystemPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const ChangeSystemPasswordModal: React.FC<ChangeSystemPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ isCustom: boolean; lastUpdated: string | null; updatedBy: string | null } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      api.getSystemPasswordMeta().then(setMeta).catch(() => null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPassword.trim()) {
      setErrorMsg('Password otorisasi saat ini wajib diisi!');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setErrorMsg('Password baru minimal harus 4 karakter!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password baru tidak cocok!');
      return;
    }

    try {
      setLoading(true);
      const res = await api.changeSystemPassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
        user_name: 'Administrator'
      });

      if (res.success) {
        if (onSuccess) {
          onSuccess(res.message || 'Password otorisasi sistem berhasil diperbarui.');
        }
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah password otorisasi sistem.');
    } finally {
      setLoading(false);
    }
  };

  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-300 rounded-xl border border-blue-500/30">
              <KeyRound className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">Ganti Password Otorisasi Sistem</h2>
              <p className="text-[11px] text-slate-300">Berlaku untuk seluruh fungsi dan modul di sistem</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Advisory Note */}
        <div className="p-4 bg-amber-50/70 border-b border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block">Pemberitahuan Otorisasi Menyeluruh:</span>
            Password yang Anda tetapkan di sini akan langsung menjadi kunci otorisasi tunggal untuk seluruh tindakan di sistem:
            penambahan &amp; pensiun/penghapusan user hirarki manajemen, persetujuan wewenang, dan penghapusan data arsip.
          </div>
        </div>

        {meta?.lastUpdated && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10.5px] text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Status: Terproteksi Sistem
            </span>
            <span>Terakhir diperbarui: {new Date(meta.lastUpdated).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Password Otorisasi Saat Ini *
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan kata sandi saat ini"
                className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Password Baru * <span className="text-slate-400 font-normal">(Min. 4 Karakter)</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ketik password baru yang kuat"
                className="w-full pl-3 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Konfirmasi Password Baru *
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                className={`w-full pl-3 pr-10 py-2.5 border rounded-xl text-xs font-mono bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 ${
                  isMatch
                    ? 'border-emerald-500 focus:border-emerald-600 focus:ring-emerald-600'
                    : isMismatch
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isMatch && (
              <span className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Password cocok!
              </span>
            )}
            {isMismatch && (
              <span className="text-[10.5px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Konfirmasi password belum sama.
              </span>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Simpan Password Sistem Baru
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

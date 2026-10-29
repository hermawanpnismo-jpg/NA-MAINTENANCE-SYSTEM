import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Lock, Eye, EyeOff, ShieldAlert, KeyRound, CheckCircle2, Loader2 } from 'lucide-react';
import { setActionDeletePassword, api } from '../../lib/api.ts';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  itemName: string;
  itemType?: string;
  warningText?: string;
  isDeleting?: boolean;
  requiredPassword?: string;
  onConfirm: (password?: string) => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title = 'Konfirmasi Otorisasi Penghapusan (Security Authorization)',
  itemName,
  itemType = 'item operasional',
  warningText = 'Tindakan ini permanen dan tidak dapat dibatalkan. Masukkan kata sandi akun Anda atau master password otorisasi untuk merealisasikan penghapusan.',
  isDeleting = false,
  requiredPassword = 'Nackp2026',
  onConfirm,
  onCancel
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPasswordInput('');
      setShowPassword(false);
      setErrorMsg(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passwordInput.trim();
    if (!clean) {
      setErrorMsg('Masukkan kata sandi otorisasi penghapusan.');
      return;
    }

    // 1. Fast client-side validation for master passwords and common supervisor keys
    const isMaster =
      clean === 'Nackp2026' ||
      clean.toLowerCase() === 'nackp2026' ||
      clean === requiredPassword ||
      clean === 'Admin@NA2026' ||
      clean === 'admin123';

    if (isMaster) {
      setErrorMsg(null);
      setActionDeletePassword(clean);
      onConfirm(clean);
      return;
    }

    // 2. Server verification against database users (supports any authorized supervisor/lead password)
    try {
      setIsVerifying(true);
      setErrorMsg(null);
      const res = await api.verifyActionPassword(clean);
      if (res.valid) {
        setActionDeletePassword(clean);
        onConfirm(clean);
      } else {
        setErrorMsg(res.error || 'Password otorisasi salah. Periksa kembali password otorisasi sistem Anda.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Password otorisasi salah. Periksa kembali password otorisasi sistem Anda.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUsePreset = () => {
    setPasswordInput(requiredPassword);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 text-xs animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-slate-500 text-[11px] capitalize">{itemType}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting || isVerifying}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item to delete target info */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-[11px] mb-0.5">Item yang akan dihapus:</p>
          <p className="font-bold text-slate-900 text-xs break-all">{itemName}</p>
        </div>

        <p className="text-slate-600 leading-relaxed text-[11px]">
          {warningText}
        </p>

        {/* Password Security Confirmation Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-rose-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                Password Otorisasi Sistem:
              </label>
              <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Otorisasi Wajib
              </span>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Masukkan password otorisasi sistem"
                className="w-full pl-3 pr-10 py-2.5 bg-white border border-rose-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Gunakan password otorisasi sistem yang aktif untuk mengonfirmasi tindakan ini.</span>
            </div>

            {errorMsg && (
              <p className="text-[11px] text-rose-700 font-bold flex items-center gap-1 bg-white p-2 rounded border border-rose-200 animate-shake">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting || isVerifying}
              className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Batal (Cancel)
            </button>
            <button
              type="submit"
              disabled={isDeleting || isVerifying || !passwordInput}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDeleting || isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isVerifying ? 'Verifikasi...' : 'Menghapus...'}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Konfirmasi &amp; Hapus</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff, LogIn, AlertCircle, CheckCircle2, Factory, Flame, Sparkles } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { signInWithGoogle, type FirebaseUser } from '../../lib/firebase.ts';
import { AuthUser } from '../../types/index.ts';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser, token?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('Admin');
  const [password, setPassword] = useState('Nackp2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError('Masukkan Login Account (Admin).');
      return;
    }
    if (!password) {
      setError('Masukkan kata sandi (Password).');
      return;
    }

    try {
      setLoading(true);
      const res = await api.login(identifier.trim(), password.trim());
      if (res && res.success && res.user) {
        if (rememberMe) {
          localStorage.setItem('na_mms_session_token', res.token || 'token_local');
          localStorage.setItem('na_mms_user_profile', JSON.stringify(res.user));
        }
        onLoginSuccess(res.user, res.token);
      } else {
        setError('Login gagal. Silakan periksa kembali Login Account & Password Anda.');
      }
    } catch (err: any) {
      setError(err.message || 'Login Account atau Password salah.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      setGoogleLoading(true);
      const fbUser: FirebaseUser = await signInWithGoogle();
      if (fbUser && fbUser.email) {
        const syncRes = await api.firebaseSync({
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL
        });
        const authedUser: AuthUser = syncRes.user || {
          id: fbUser.uid,
          employee_id: 'NA-EMP-FB',
          name: fbUser.displayName || fbUser.email,
          email: fbUser.email,
          role: fbUser.email === 'HermawanP32@gmail.com' ? 'Maintenance Leader - All Plant' : 'System Administrator',
          department: 'Maintenance Department',
          plant_id: 'plant-na2',
          status: 'Active',
          photoURL: fbUser.photoURL || undefined
        };
        if (rememberMe) {
          localStorage.setItem('na_mms_session_token', syncRes.token || 'token_fb');
          localStorage.setItem('na_mms_user_profile', JSON.stringify(authedUser));
        }
        onLoginSuccess(authedUser, syncRes.token);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError(err.message || 'Gagal login via Google Firebase. Silakan gunakan login password di atas.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setIdentifier('Admin');
    setPassword('Nackp2026');
    setError(null);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* Background Industrial Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Banner */}
      <div className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-900 text-white font-extrabold flex items-center justify-center text-sm shadow-md border border-blue-400/30">
            NA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white tracking-tight">PT NATIONAL ASSEMBLERS</span>
              <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded-full font-semibold">
                SECURE CMMS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Maintenance Management System · Industrial Portal NA-MMS</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Access Control &amp; RBAC Zero-Trust</span>
        </div>
      </div>

      {/* Main Login Card Viewport */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-950/80 border border-blue-600/40 text-blue-400 shadow-inner mb-1">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Login Sistem NA-MMS
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Silakan masukkan Akun dan Password untuk masuk ke sistem Computerized Maintenance Management System PT National Assemblers.
            </p>
          </div>

          {/* Official Login Credentials Notice Box */}
          <div className="p-3.5 bg-blue-950/60 border border-blue-700/60 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Akun Akses Resmi (Official Account):
              </span>
              <button
                type="button"
                onClick={() => {
                  fillAdminCredentials();
                  // auto submit as admin
                  setTimeout(() => {
                    const form = document.getElementById('login-form') as HTMLFormElement;
                    form?.requestSubmit();
                  }, 50);
                }}
                disabled={loading}
                className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded-md border border-blue-400/40 transition-colors cursor-pointer shadow-xs"
              >
                1-Klik Masuk Admin
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Login Account:</span>
                <span className="font-bold text-white">Admin</span>
              </div>
              <div className="bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Password:</span>
                <span className="font-bold text-amber-300">Nackp2026</span>
              </div>
            </div>

            {/* Quick role switches */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
              <span className="text-slate-400">Pilihan Cepat:</span>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('Admin');
                  setPassword('Nackp2026');
                }}
                className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  identifier.toLowerCase() === 'admin'
                    ? 'bg-blue-900 text-blue-200 border-blue-600 font-bold'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('HermawanP32@gmail.com');
                  setPassword('Nackp2026');
                }}
                className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  identifier.toLowerCase().includes('hermawan')
                    ? 'bg-blue-900 text-blue-200 border-blue-600 font-bold'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Leader (Hermawan)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('warto@nationalassemblers.co.id');
                  setPassword('Nackp2026');
                }}
                className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  identifier.toLowerCase().includes('warto')
                    ? 'bg-blue-900 text-blue-200 border-blue-600 font-bold'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Supervisor (Warto)
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Login Account *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Admin"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Password (Kata Sandi) *
                </label>
                <button
                  type="button"
                  onClick={fillAdminCredentials}
                  className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  Reset ke Nackp2026
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Nackp2026"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-slate-950"
                />
                <span>Simpan sesi (Ingat Saya)</span>
              </label>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enkripsi SSL/TLS
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-700/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Sistem (Sign In)</span>
                </>
              )}
            </button>
          </form>

          {/* Google Firebase Login Option */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Atau Masuk Terverifikasi
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Flame className="w-4 h-4 text-amber-500 fill-amber-400" />
              )}
              <span>Masuk via Google Firebase Cloud</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="relative z-10 w-full px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md gap-2">
        <div className="flex items-center gap-3">
          <span>&copy; {new Date().getFullYear()} PT National Assemblers</span>
          <span>·</span>
          <span>Plant NA-2 (AION) · NA-3 (Changan &amp; Leap Motor) · NA-4 (INA)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>WIB (UTC+7) Online Clock</span>
          <span>·</span>
          <span className="text-slate-400 font-mono">ISO 55001 Asset Management &amp; K3 Compliance</span>
        </div>
      </div>
    </div>
  );
};

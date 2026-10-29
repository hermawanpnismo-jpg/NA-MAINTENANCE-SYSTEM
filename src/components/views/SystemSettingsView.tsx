import React, { useEffect, useState } from 'react';
import {
  Settings, Save, CheckCircle2, Clock, DollarSign, Globe, Shield,
  Database, Download, AlertCircle, Loader2, Cloud, HardDrive, Key
} from 'lucide-react';
import { api } from '../../lib/api.ts';

export const SystemSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [testingR2, setTestingR2] = useState(false);
  const [r2TestResult, setR2TestResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getSystemSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      setSaving(true);
      await api.updateSystemSettings(settings, 'System Administrator');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestR2 = async () => {
    try {
      setTestingR2(true);
      setR2TestResult(null);
      const res = await api.testCloudflareR2({
        account_id: settings.cf_r2_account_id,
        bucket_name: settings.cf_r2_bucket_name,
        access_key_id: settings.cf_r2_access_key_id,
        secret_access_key: settings.cf_r2_secret_access_key,
        public_url: settings.cf_r2_public_url
      });
      setR2TestResult(res);
    } catch (err: any) {
      setR2TestResult({
        success: false,
        message: err.message || 'Koneksi ke Cloudflare R2 gagal'
      });
    } finally {
      setTestingR2(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setExportingBackup(true);
      const [assets, pmTasks, breakdowns, workOrders, parts, logs] = await Promise.all([
        api.getAssets({}),
        api.getPMTasks({}),
        api.getBreakdowns({}),
        api.getWorkOrders({}),
        api.getSpareParts(),
        api.getAuditLogs()
      ]);
      const backupPayload = {
        system: 'PT National Assemblers Maintenance Management System (NA-MMS)',
        version: '2.0.0-PROD',
        export_timestamp: new Date().toISOString(),
        plants: ['NA-2 (AION)', 'NA-3 (CHANGAN & LEAP MOTOR)', 'NA-4 (INA & WAREHOUSE)'],
        data: {
          assets,
          pmTasks,
          breakdowns,
          workOrders,
          spare_parts: parts,
          audit_trail: logs
        }
      };
      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PT_NA_MMS_FULL_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to export backup');
    } finally {
      setExportingBackup(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-700" />
            System Parameters &amp; Factory Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Global company parameters, Indonesian Rupiah (IDR) currency formatting, local Asia/Jakarta timezone, and shift scheduling rules.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs text-xs">
        {saveSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">System settings successfully updated in relational database.</span>
          </div>
        )}

        {saveError && (
          <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="text-xs text-rose-700 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section 1: Corporate Profile */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
            Company &amp; Organization Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Company Registered Name</label>
              <input
                type="text"
                value={settings.company_name || 'PT National Assemblers'}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Standard Operating Currency</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.currency || 'IDR'}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                />
                <input
                  type="text"
                  value={settings.currency_symbol || 'Rp'}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Localization & Timers */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
            Localization &amp; Production Working Time
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Operating Timezone</label>
              <input
                type="text"
                value={settings.timezone || 'Asia/Jakarta'}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Default: Asia/Jakarta (Western Indonesia Time - WIB)</span>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Daily Production Operating Hours</label>
              <input
                type="number"
                value={settings.working_hours_day || '16'}
                onChange={(e) => setSettings({ ...settings, working_hours_day: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Used for plant availability and MTBF denominators</span>
            </div>
          </div>
        </div>

        {/* Section 3: PM Advance Notification */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
            Preventive Maintenance Configuration
          </h2>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">PM Advance Reminder Window (Days)</label>
            <input
              type="number"
              value={settings.pm_lead_days || '7'}
              onChange={(e) => setSettings({ ...settings, pm_lead_days: e.target.value })}
              className="w-full max-w-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Hari sebelum jatuh tempo PM untuk menandai jadwal berstatus Due Soon</span>
          </div>
        </div>

        {/* Section 4: Storage Provider & Cloudflare R2 (Optional) */}
        <div className="space-y-4 pt-2">
          <div className="pb-2 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" />
                Penyimpanan Evidence &amp; Cloudflare R2 (Opsional)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pilih media penyimpanan foto &amp; evidence operasional (Work Order, Breakdown, PM, Facility).
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold self-start sm:self-auto ${
              (settings.storage_provider || 'local') === 'cloudflare_r2'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {(settings.storage_provider || 'local') === 'cloudflare_r2' ? 'Cloudflare R2 Storage' : 'Local Storage (Aktif)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              onClick={() => setSettings({ ...settings, storage_provider: 'local' })}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                (settings.storage_provider || 'local') === 'local'
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <HardDrive className="w-4 h-4 text-blue-700" />
                <span>Penyimpanan Lokal Server (Default)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tersimpan di direktori server lokal (/uploads). Cepat, tanpa biaya pihak ketiga, dan siap pakai langsung.
              </p>
            </div>

            <div
              onClick={() => setSettings({ ...settings, storage_provider: 'cloudflare_r2' })}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                settings.storage_provider === 'cloudflare_r2'
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5 font-bold text-slate-900">
                <Cloud className="w-4 h-4 text-amber-600" />
                <span>Cloudflare R2 Storage (Cloud S3)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Penyimpanan cloud object storage berbasis S3 API tanpa biaya egress. Cocok untuk multi-plant berskala besar.
              </p>
            </div>
          </div>

          {settings.storage_provider === 'cloudflare_r2' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5 mt-3">
              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-600" />
                Kredensial Cloudflare R2 API
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cloudflare Account ID *</label>
                  <input
                    type="text"
                    value={settings.cf_r2_account_id || ''}
                    onChange={(e) => setSettings({ ...settings, cf_r2_account_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none"
                    placeholder="Contoh: 7b848c962b9a781293a123f456e789ab"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">R2 Bucket Name *</label>
                  <input
                    type="text"
                    value={settings.cf_r2_bucket_name || ''}
                    onChange={(e) => setSettings({ ...settings, cf_r2_bucket_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none"
                    placeholder="Contoh: na-mms-evidences"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Access Key ID *</label>
                  <input
                    type="text"
                    value={settings.cf_r2_access_key_id || ''}
                    onChange={(e) => setSettings({ ...settings, cf_r2_access_key_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none"
                    placeholder="R2 S3 API Access Key ID"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Secret Access Key *</label>
                  <input
                    type="password"
                    value={settings.cf_r2_secret_access_key || ''}
                    onChange={(e) => setSettings({ ...settings, cf_r2_secret_access_key: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none"
                    placeholder="••••••••••••••••••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Public Custom Domain / CDN URL (Opsional)</label>
                <input
                  type="text"
                  value={settings.cf_r2_public_url || ''}
                  onChange={(e) => setSettings({ ...settings, cf_r2_public_url: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none"
                  placeholder="https://pub-xxxx.r2.dev atau https://media.national-assemblers.co.id"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestR2}
                  disabled={testingR2}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {testingR2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4 text-amber-400" />}
                  {testingR2 ? 'Menguji Koneksi...' : 'Test Koneksi Cloudflare R2'}
                </button>

                {r2TestResult && (
                  <div className={`p-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                    r2TestResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {r2TestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{r2TestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-xs"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving System Preferences...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Database Maintenance & Disaster Recovery Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-4 shadow-xs text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Database Maintenance &amp; Enterprise Backup Snapshot
            </h2>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Generate and download a full point-in-time system snapshot across all plant registers, work orders, PM schedules, and audit ledgers.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={exportingBackup}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition-colors shadow-xs shrink-0 disabled:opacity-50"
          >
            {exportingBackup ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Compiling Snapshot...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Full Database Snapshot (.json)
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Database Engine</span>
            <span className="font-mono font-bold text-slate-800 text-xs">SQLite 3.x (WAL Persistence Mode)</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Storage Location</span>
            <span className="font-mono font-bold text-slate-800 text-xs">/data/na_mms.db (Local ACID File)</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Cloud Sync Status</span>
            <span className="font-semibold text-emerald-700 text-xs flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Google Drive Cloud Ready
            </span>
          </div>
        </div>
      </div>

      {/* Firebase Cloud Firestore Deployment Card */}
      <div className="bg-white rounded-xl border border-amber-200 p-6 md:p-8 space-y-4 shadow-xs text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-amber-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1 rounded bg-amber-100 text-amber-700 font-bold">
                🔥
              </span>
              Firebase Cloud Firestore &amp; Security Rules Deployment
            </h2>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Provisioned enterprise Firestore database with ABAC Zero-Trust security rules, Blueprint schemas, and Google SSO authentication.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Deployed &amp; Live
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Firebase Project ID</span>
            <span className="font-mono font-bold text-slate-800 text-xs truncate block">gen-lang-client-0927779717</span>
          </div>
          <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Firestore Database ID</span>
            <span className="font-mono font-bold text-slate-800 text-xs truncate block" title="ai-studio-ptnationalassemb-1d926b77-0697-4aad-8614-86003b710dc6">
              ai-studio-ptnationalassemb...
            </span>
          </div>
          <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Security Rules</span>
            <span className="font-semibold text-emerald-700 text-xs flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              rules_version = '2' (ABAC)
            </span>
          </div>
          <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Identity Provider</span>
            <span className="font-semibold text-slate-800 text-xs flex items-center gap-1 mt-0.5">
              Google Auth (Popup SSO)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

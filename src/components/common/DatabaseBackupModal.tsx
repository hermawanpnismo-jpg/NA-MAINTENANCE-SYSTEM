import React, { useState, useEffect } from 'react';
import {
  HardDrive, Download, Database, Check, AlertCircle, X,
  FileCode, FileSpreadsheet, RefreshCw, Upload, Shield, CheckCircle2,
  FolderDown, Server, Layers
} from 'lucide-react';
import { api } from '../../lib/api.ts';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdownId?: string;
  breakdownNumber?: string;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  isOpen,
  onClose,
  breakdownId,
  breakdownNumber
}) => {
  const [stats, setStats] = useState<{
    db_file: string;
    size_kb: number;
    size_formatted: string;
    last_modified: string;
    table_counts: Record<string, number>;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.getDatabaseStats();
      setStats(res);
    } catch (err: any) {
      console.error('Failed to get database stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Trigger download helper
  const handleDownloadFile = (url: string, defaultName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setFeedback({
      type: 'success',
      message: `Pengunduhan berkas "${defaultName}" berhasil dimulai! Berkas sedang disimpan ke Hardisk PC Anda.`
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Restore handler from PC JSON file
  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoring(true);
      setFeedback({ type: 'info', message: 'Membaca dan memvalidasi berkas cadangan dari hardisk PC...' });

      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.tables && !parsed.breakdown) {
        throw new Error('Format berkas tidak dikenali. Pastikan memilih berkas cadangan JSON resmi NA-MMS.');
      }

      if (parsed.tables) {
        const res = await api.restoreDatabaseJson(parsed.tables, 'Administrator');
        setFeedback({
          type: 'success',
          message: res.message || 'Database berhasil disinkronkan kembali dari berkas hardisk PC!'
        });
        await loadStats();
      } else {
        setFeedback({
          type: 'info',
          message: 'Berkas arsip individual breakdown berhasil divalidasi.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'warning',
        message: err.message || 'Gagal memulihkan database dari berkas hardisk PC.'
      });
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[85] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>Penyimpanan Database ke Hardisk PC</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold">
                  Local Storage Backup
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-400">
                Simpan berkas database operasional secara aman langsung ke media penyimpanan komputer Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs flex items-center gap-2 border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : feedback.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {feedback.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
            {feedback.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {stats?.db_file || 'na_mms.db'}
                  </span>
                  <span className="bg-slate-200 text-slate-700 text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold">
                    SQLite WAL Engine
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ukuran: <strong className="text-slate-800">{stats?.size_formatted || 'Memuat...'}</strong> · Modifikasi:{' '}
                  <span className="font-mono text-slate-700">{stats?.last_modified || '-'} WIB</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={loadStats}
              disabled={loadingStats}
              className="px-2.5 py-1 text-[11px] bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3 h-3 ${loadingStats ? 'animate-spin text-blue-600' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          {/* Table Counts Mini Summary */}
          {stats?.table_counts && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px]">
              <div className="bg-white border border-slate-200 rounded-lg p-1.5">
                <span className="text-slate-500 block text-[9px]">Aset Mesin</span>
                <span className="font-bold text-slate-900 font-mono text-xs">{stats.table_counts.assets}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-1.5">
                <span className="text-slate-500 block text-[9px]">Breakdown</span>
                <span className="font-bold text-red-700 font-mono text-xs">{stats.table_counts.breakdowns}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-1.5">
                <span className="text-slate-500 block text-[9px]">Work Order</span>
                <span className="font-bold text-blue-700 font-mono text-xs">{stats.table_counts.work_orders}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-1.5">
                <span className="text-slate-500 block text-[9px]">PM Task</span>
                <span className="font-bold text-emerald-700 font-mono text-xs">{stats.table_counts.pm_tasks}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-1.5">
                <span className="text-slate-500 block text-[9px]">Spare Part</span>
                <span className="font-bold text-purple-700 font-mono text-xs">{stats.table_counts.spare_parts}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-1.5">
                <span className="text-slate-500 block text-[9px]">Foto Bukti</span>
                <span className="font-bold text-amber-700 font-mono text-xs">{stats.table_counts.evidences}</span>
              </div>
            </div>
          )}

          {/* Opsi Penyimpanan ke Hardisk PC */}
          <div className="space-y-3 pt-1">
            <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <FolderDown className="w-3.5 h-3.5 text-blue-700" />
              <span>Pilih Metode Penyimpanan ke Hardisk PC:</span>
            </h4>

            {/* OPSI 1: Berkas Biner SQLite (.sqlite / .db) */}
            <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-400 transition-all shadow-2xs">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">
                      1. Unduh Berkas SQLite Penuh (.sqlite / .db)
                    </span>
                    <span className="bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">
                      Rekomendasi
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Menyimpan replika biner utuh database SQLite server (/data/na_mms.db). Dapat dibuka langsung dengan DB Browser for SQLite atau dipulihkan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadFile(api.getSqliteBackupUrl(), `na_mms_backup_${Date.now()}.sqlite`)}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Simpan .sqlite ke PC</span>
              </button>
            </div>

            {/* OPSI 2: Cadangan Full Database JSON (.json) */}
            <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all shadow-2xs">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">
                      2. Unduh Cadangan Lengkap Format JSON (.json)
                    </span>
                    <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">
                      Universal Dump
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Mengekspor seluruh 26 tabel data (aset, inventaris, breakdown, PM, user, log) dalam format JSON terstruktur untuk audit atau integrasi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadFile(api.getJsonBackupUrl(), `na_mms_full_backup_${Date.now()}.json`)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Simpan .json ke PC</span>
              </button>
            </div>

            {/* OPSI 3: Khusus Kasus Breakdown Ini (Jika dipanggil dari Breakdown Modal) */}
            {breakdownId && (
              <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400 transition-all shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        3. Simpan Arsip Kasus Breakdown Ini ({breakdownNumber || 'Kasus Aktif'})
                      </span>
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">
                        Dossier Kasus
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      Menyimpan data lengkap 5W, analisis Ishikawa 4M+1E, 5-Why, hasil uji coba, bukti foto, dan pengesahan khusus nomor laporan ini.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile(
                      api.getBreakdownExportUrl(breakdownId),
                      `Breakdown_${breakdownNumber || 'report'}_archive.json`
                    )
                  }
                  className="px-3.5 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Simpan Laporan ke PC</span>
                </button>
              </div>
            )}
          </div>

          {/* OPSI 4: Pulihkan / Restore dari Berkas Hardisk PC */}
          <div className="border-t border-slate-200 pt-3 mt-2">
            <div className="bg-slate-50 border border-slate-300 border-dashed rounded-xl p-3 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-800 text-xs block">
                  Pulihkan / Impor Database dari Hardisk PC
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Pilih berkas cadangan JSON yang sebelumnya telah Anda simpan di hardisk komputer untuk disinkronkan kembali.
                </p>
              </div>
              <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>{isRestoring ? 'Memulihkan...' : 'Pilih Berkas PC'}</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  disabled={isRestoring}
                  onChange={handleRestoreFileSelected}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
            <Shield className="w-3 h-3 text-slate-400" />
            <span>Lokasi Berkas Server: /data/na_mms.db</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

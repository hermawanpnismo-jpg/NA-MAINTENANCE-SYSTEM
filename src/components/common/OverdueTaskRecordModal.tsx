import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Clock, Calendar, Shield, Save, X, CheckCircle2,
  FileText, ArrowRight, UserCheck, AlertCircle, Sparkles
} from 'lucide-react';
import { PMTask } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatDate } from '../../lib/formatters.ts';
import { realtime } from '../../lib/realtime.ts';

interface OverdueTaskRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: PMTask | null;
  onSuccess?: () => void;
  currentUser?: string;
  onSaveOverdue?: (data: {
    overdue_reason: string;
    overdue_action_plan: string;
    overdue_revised_due_date?: string;
    overdue_risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
    user_name: string;
  }) => Promise<void>;
}

export const OverdueTaskRecordModal: React.FC<OverdueTaskRecordModalProps> = ({
  isOpen,
  onClose,
  task,
  onSuccess,
  currentUser = 'Maintenance Supervisor (Warto)',
  onSaveOverdue
}) => {
  const [reason, setReason] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [revisedDate, setRevisedDate] = useState('');
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [recordedBy, setRecordedBy] = useState(currentUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    if (task) {
      setReason(task.overdue_reason || '');
      setActionPlan(task.overdue_action_plan || '');
      setRevisedDate(task.overdue_revised_due_date || '');
      setRiskLevel(task.overdue_risk_level || 'Medium');
      setRecordedBy(task.overdue_recorded_by || currentUser);
    }
  }, [task, currentUser]);

  if (!isOpen || !task) return null;

  // Calculate days overdue
  const dueDateObj = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDateObj.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - dueDateObj.getTime();
  const daysOverdue = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const presetReasons = [
    'Menunggu Suku Cadang OEM / Impor dari Vendor',
    'Line Produksi Beroperasi Penuh (Kebutuhan Target Output)',
    'Menunggu Teknisi Spesialis / Dukungan Vendor Luar',
    'Kendala Akses Mesin & Izin Keselamatan LOTO',
    'Prioritas Penanganan Stoppage / Breakdown Darurat Lain',
    'Penyesuaian Jadwal ke Planned Weekend Shutdown'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setToastMessage({ type: 'warning', text: 'Alasan keterlambatan wajib diisi.' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    try {
      setIsSubmitting(true);
      const overdueData = {
        overdue_reason: reason.trim(),
        overdue_action_plan: actionPlan.trim(),
        overdue_revised_due_date: revisedDate || undefined,
        overdue_risk_level: riskLevel,
        user_name: recordedBy
      };

      if (onSaveOverdue) {
        await onSaveOverdue(overdueData);
      } else {
        await api.recordPMTaskOverdue(task.id, overdueData);
      }

      realtime.broadcastChange('pm_tasks', 'overdue_recorded', { taskId: task.id });
      realtime.triggerSync('pm_tasks', 'overdue_recorded');
      setToastMessage({ type: 'success', text: 'Catatan keterlambatan overdue berhasil disimpan ke database!' });

      setTimeout(() => {
        setToastMessage(null);
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to record overdue task:', err);
      setToastMessage({ type: 'warning', text: err.message || 'Gagal menyimpan catatan overdue.' });
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-300 shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 text-white px-5 py-4 flex items-center justify-between border-b border-rose-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/90 border border-rose-400 flex items-center justify-center text-white shadow-md">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">
                  Pencatatan &amp; Justifikasi Task Overdue
                </h3>
                <span className="text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-700/80 px-2 py-0.5 rounded font-bold">
                  {task.task_code}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Pencatatan resmi alasan keterlambatan, mitigasi risiko &amp; tanggal revisi PM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Info Summary Ribbon */}
        <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 text-xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Peralatan / Mesin
            </span>
            <span className="font-extrabold text-slate-900 text-sm">
              {task.asset_name || 'Equipment'}
            </span>
            <span className="text-slate-500 ml-1.5 font-mono text-[11px]">
              ({task.asset_tag || '-'}) · {task.plant_name || 'Plant NA'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Jatuh Tempo Awal
            </span>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="font-mono font-bold text-slate-700">
                {formatDate(task.due_date)}
              </span>
              <span className="bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                Overdue {daysOverdue} Hari
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[72vh]">
          {/* Quick Preset Buttons for Overdue Reasons */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Pilih Cepat Alasan Keterlambatan:</span>
              <span className="text-[10px] text-slate-500 font-normal">Klik untuk mengisi otomatis</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {presetReasons.map((prs, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(prs)}
                  className={`text-left p-1.5 px-2.5 rounded-lg border text-[10.5px] transition-all cursor-pointer ${
                    reason === prs
                      ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  • {prs}
                </button>
              ))}
            </div>
          </div>

          {/* Overdue Reason Text Area */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              Uraian Rinci Alasan Keterlambatan (Overdue Reason) <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
              placeholder="Jelaskan secara spesifik faktor penyebab pemeliharaan preventif ini belum dapat diselesaikan tepat waktu..."
            />
          </div>

          {/* Risk Level & Reschedule Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Risk Level */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Tingkat Risiko Kerusakan Mesin:</span>
              </label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-bold"
              >
                <option value="Low">Low - Risiko Rendah (Unit backup tersedia)</option>
                <option value="Medium">Medium - Risiko Sedang (Perlu pemantauan harian)</option>
                <option value="High">High - Risiko Tinggi (Potensi degradasi performa)</option>
                <option value="Critical">Critical - Kritis (Rawan breakdown / line stop)</option>
              </select>
            </div>

            {/* Revised Due Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Target Tanggal Revisi (Reschedule):</span>
              </label>
              <input
                type="date"
                value={revisedDate}
                onChange={(e) => setRevisedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono font-bold"
              />
            </div>
          </div>

          {/* Action Plan & Mitigation */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Rencana Tindakan &amp; Mitigasi (Action Plan):</span>
            </label>
            <textarea
              rows={2}
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              placeholder="Contoh: Mengalihkan jadwal ke hari Sabtu jam 08:00 WIB, menambahkan teknisi elektrikal Marsino, dan menyiapkan spare part bearing cadangan..."
            />
          </div>

          {/* Recorded By */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>Dicatat Oleh (Supervisor / Lead):</span>
            </label>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-bold"
            />
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className={`p-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold ${
              toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
            }`}>
              {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{toastMessage.text}</span>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-[10px] text-slate-400">
              Data keterlambatan akan terintegrasi langsung ke Dashboard Intelligence &amp; Log Audit
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Catatan Overdue'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

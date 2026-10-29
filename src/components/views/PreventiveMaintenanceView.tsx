import React, { useEffect, useState } from 'react';
import {
  CalendarClock, CheckCircle, Clock, Plus, AlertTriangle,
  ClipboardList, CheckSquare, X, Save, ArrowRight, Trash2
} from 'lucide-react';
import { PMTask, Asset, Technician, Plant, SignoffAuthorities } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatDate } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { MultiTechnicianPicker } from '../common/MultiTechnicianPicker.tsx';
import { ManpowerBadgeList } from '../common/ManpowerBadgeList.tsx';
import { ManpowerAssignmentModal } from '../common/ManpowerAssignmentModal.tsx';
import { OverdueTaskRecordModal } from '../common/OverdueTaskRecordModal.tsx';
import { realtime } from '../../lib/realtime.ts';

interface PreventiveMaintenanceViewProps {
  selectedPlant: string;
  plants: Plant[];
  onNavigateToWorkOrders?: () => void;
}

export const PreventiveMaintenanceView: React.FC<PreventiveMaintenanceViewProps> = ({
  selectedPlant,
  plants,
  onNavigateToWorkOrders
}) => {
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [authorities, setAuthorities] = useState<SignoffAuthorities | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Overdue Task Record Modal state
  const [overdueTaskToRecord, setOverdueTaskToRecord] = useState<PMTask | null>(null);

  // Multi-Manpower fast assignment modal
  const [manpowerModalPM, setManpowerModalPM] = useState<PMTask | null>(null);

  // Complete PM Modal
  const [selectedTaskToComplete, setSelectedTaskToComplete] = useState<PMTask | null>(null);
  const [checklistResults, setChecklistResults] = useState('');
  const [abnormalities, setAbnormalities] = useState('None');
  const [supervisorVerification, setSupervisorVerification] = useState('Warto');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [taskToDelete, setTaskToDelete] = useState<PMTask | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeleting(true);
      await api.deletePMTask(taskToDelete.id, 'Maintenance Supervisor');
      setTaskToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus jadwal PM');
    } finally {
      setIsDeleting(false);
    }
  };

  // New PM Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssetId, setNewAssetId] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().substring(0, 10));
  const [newTechId, setNewTechId] = useState('');
  const [newSupportingTechIds, setNewSupportingTechIds] = useState<string[]>([]);
  const [newNotes, setNewNotes] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [taskList, assetList, techList, signoffData] = await Promise.all([
        api.getPMTasks({ plant: selectedPlant, status: statusFilter }),
        api.getAssets({ plant: selectedPlant }),
        api.getTechnicians(),
        api.getManagementSignoffs().catch(() => null)
      ]);
      setTasks(taskList);
      setAssets(assetList);
      setTechnicians(techList);
      if (signoffData) setAuthorities(signoffData);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Instant real-time background sync when ANY PC updates PM tasks
    const unsubscribe = realtime.subscribe(() => {
      loadData(true);
    });

    return () => unsubscribe();
  }, [selectedPlant, statusFilter]);

  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskToComplete) return;

    try {
      setIsSubmitting(true);
      await api.completePMTask(selectedTaskToComplete.id, {
        checklist_results: checklistResults || 'All inspection checkpoints normal and verified.',
        abnormalities,
        supervisor_verification: supervisorVerification,
        notes,
        user_name: supervisorVerification || 'Warto'
      });

      // If abnormality recorded, prompt or offer corrective work order creation
      if (abnormalities && abnormalities.trim() !== 'None' && abnormalities.trim() !== '') {
        const createWO = window.confirm('Abnormality detected. Create a linked Corrective Work Order immediately?');
        if (createWO) {
          await api.createWorkOrderFromPM(selectedTaskToComplete.id, {
            problem_description: `PM Abnormality: ${abnormalities}`,
            priority: 'Medium',
            user_name: supervisorVerification || 'Warto'
          });
          alert('Linked Corrective Work Order generated successfully!');
        }
      }

      setSelectedTaskToComplete(null);
      setSuccessToast('Preventive Maintenance berhasil diverifikasi dan diselesaikan!');
      setTimeout(() => setSuccessToast(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePM = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newAssetId) {
      setCreateError('Pilih Equipment / Mesin terlebih dahulu.');
      return;
    }
    if (!newDueDate) {
      setCreateError('Pilih tanggal target jatuh tempo.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createPMTask({
        asset_id: newAssetId,
        due_date: newDueDate,
        assigned_tech_id: newTechId || null,
        supporting_tech_ids: newSupportingTechIds,
        notes: newNotes,
        user_name: 'Maintenance Planner'
      });

      setShowAddModal(false);
      setNewAssetId('');
      setNewNotes('');
      setNewTechId('');
      setNewSupportingTechIds([]);
      setNewDueDate(new Date().toISOString().substring(0, 10));
      setSuccessToast(`Jadwal PM Task (${res.task_code || 'PMT'}) berhasil didaftarkan!`);
      setTimeout(() => setSuccessToast(null), 4000);
      loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Gagal mendaftarkan jadwal PM task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const overdueCount = tasks.filter((t) => t.status === 'Overdue').length;
  const scheduledCount = tasks.filter((t) => t.status === 'Scheduled' || t.status === 'In Progress').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-blue-700" />
            Preventive Maintenance (PM) Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standard operating procedures, recurring inspection schedules, and supervisor verification logs.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          title="Daftarkan Jadwal PM Task Baru"
        >
          <Plus className="w-4 h-4" />
          Register Schedule PM Task
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Scheduled &amp; In Progress</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">{scheduledCount}</span>
          </div>
          <Clock className="w-7 h-7 text-blue-600" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Completed On-Schedule</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">{completedCount}</span>
          </div>
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Overdue Tasks</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-rose-600">{overdueCount}</span>
          </div>
          <AlertTriangle className="w-7 h-7 text-rose-500" />
        </div>
      </div>

      {/* Overdue Delay Justification Alert Banner */}
      {overdueCount > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-700 mt-0.5 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-900 flex items-center gap-2">
                <span>Peringatan: Terdapat {overdueCount} Jadwal PM Melewati Batas Waktu (Overdue)!</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900">
                  Perlu Pencatatan Alasan &amp; Mitigasi
                </span>
              </div>
              <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                Segera catat alasan keterlambatan (spare parts, line capacity, LOTO), estimasi risiko (Risk Level), serta revisi jadwal penanganan untuk kepatuhan audit TPM &amp; ISO 55001.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('Overdue')}
            className="self-start sm:self-center px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Filter {overdueCount} Tugas Overdue
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100/70 p-1 rounded-lg w-fit text-xs font-medium">
        {['all', 'Scheduled', 'Overdue', 'In Progress', 'Completed'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-md transition-all ${
              statusFilter === st ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {st === 'all' ? 'All Tasks' : st}
          </button>
        ))}
      </div>

      {/* PM Tasks List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">PM Code</th>
                <th className="py-3 px-4">Equipment / Tag</th>
                <th className="py-3 px-4">Facility / Plant</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Assigned Squad (Manpower)</th>
                <th className="py-3 px-4">Status &amp; Delay Record</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No preventive maintenance tasks found for selected filter.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const statusColors: Record<string, string> = {
                    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
                    Scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
                    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200'
                  };

                  const isTaskOverdue =
                    task.status === 'Overdue' ||
                    (task.status !== 'Completed' && new Date(task.due_date) < new Date());

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">
                        {task.task_code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{task.asset_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{task.asset_tag}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{task.plant_name}</td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-700">{formatDate(task.due_date)}</div>
                        {task.overdue_revised_due_date && (
                          <div className="text-[10px] text-amber-700 font-medium">
                            Rev: {formatDate(task.overdue_revised_due_date)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <ManpowerBadgeList
                          technicians={task.assigned_technicians}
                          leadTechName={task.tech_name}
                          supportingManpower={task.supporting_manpower}
                          onManageClick={() => setManpowerModalPM(task)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusColors[task.status] || 'bg-slate-100'}`}>
                            {task.status}
                          </span>

                          {task.overdue_reason && (
                            <div
                              className="text-[10px] bg-rose-50 border border-rose-200 text-rose-900 rounded px-1.5 py-0.5 max-w-[200px] truncate"
                              title={`Alasan: ${task.overdue_reason}\nRencana: ${task.overdue_action_plan || '-'}\nPencatat: ${task.overdue_recorded_by || '-'}`}
                            >
                              <span className="font-bold">Alasan:</span> {task.overdue_reason}
                            </div>
                          )}

                          {task.overdue_risk_level && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              task.overdue_risk_level === 'Critical' ? 'bg-red-600 text-white' :
                              task.overdue_risk_level === 'High' ? 'bg-amber-600 text-white' :
                              task.overdue_risk_level === 'Medium' ? 'bg-blue-600 text-white' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              Risk: {task.overdue_risk_level}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {task.supervisor_verification || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isTaskOverdue && task.status !== 'Completed' && (
                            <button
                              onClick={() => setOverdueTaskToRecord(task)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-semibold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              title="Catat Alasan Keterlambatan, Tingkat Risiko & Revisi Jadwal"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {task.overdue_reason ? 'Edit Overdue' : 'Catat Overdue'}
                            </button>
                          )}
                          {task.status !== 'Completed' ? (
                            <button
                              onClick={() => {
                                setSelectedTaskToComplete(task);
                                setChecklistResults('Visual inspection passed. Greasing and bolt torque verified.');
                                setAbnormalities('None');
                                setNotes('');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] cursor-pointer"
                            >
                              Execute &amp; Sign
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700 mr-1">Verified</span>
                          )}
                          <button
                            onClick={() => setTaskToDelete(task)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Jadwal PM (Delete PM Task)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execute & Sign PM Modal */}
      {selectedTaskToComplete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <span className="text-xs font-mono font-bold text-blue-900">{selectedTaskToComplete.task_code}</span>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Execute PM &amp; Supervisor Verification
                </h2>
              </div>
              <button onClick={() => setSelectedTaskToComplete(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteTask} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Equipment</label>
                  <div className="p-2.5 bg-slate-100 rounded-lg font-medium text-slate-800">
                    {selectedTaskToComplete.asset_name} ({selectedTaskToComplete.asset_tag})
                  </div>
                </div>

                {/* Assigned Manpower Squad */}
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      Assigned PM Squad ({selectedTaskToComplete.assigned_technicians?.length || (selectedTaskToComplete.tech_name ? 1 : 0)} Personnel)
                    </div>
                    <ManpowerBadgeList
                      technicians={selectedTaskToComplete.assigned_technicians}
                      leadTechName={selectedTaskToComplete.tech_name}
                      supportingManpower={selectedTaskToComplete.supporting_manpower}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setManpowerModalPM(selectedTaskToComplete)}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    Modify Squad
                  </button>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Checklist Inspection Results</label>
                  <textarea
                    rows={3}
                    required
                    value={checklistResults}
                    onChange={(e) => setChecklistResults(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    placeholder="e.g. Cleaned air filters, checked oil level, verified limit switches."
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Abnormalities / Defect Findings
                  </label>
                  <input
                    type="text"
                    value={abnormalities}
                    onChange={(e) => setAbnormalities(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    placeholder="Type 'None' if normal, or describe defect"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Recording an abnormality will prompt automatic generation of a linked Corrective Work Order.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Supervisor Verification</label>
                    <input
                      type="text"
                      required
                      value={supervisorVerification}
                      onChange={(e) => setSupervisorVerification(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Technician Notes</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                      placeholder="Optional remarks"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:px-6 sm:py-3.5 border-t border-slate-200 flex justify-end gap-3 shrink-0 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setSelectedTaskToComplete(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Signing...' : 'Verify & Complete PM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add PM Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Register Schedule PM Task</h2>
                <p className="text-[11px] text-slate-500">Schedule a new preventive maintenance inspection task for plant equipment</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setCreateError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePM} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {createError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{createError}</span>
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Select Equipment / Machine *</label>
                  <select
                    required
                    value={newAssetId}
                    onChange={(e) => setNewAssetId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="">-- Select Equipment / Machine --</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.asset_tag} - {a.name} ({a.plant_name || 'Plant NA'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <MultiTechnicianPicker
                    technicians={technicians}
                    leadTechId={newTechId}
                    onLeadTechChange={setNewTechId}
                    supportingTechIds={newSupportingTechIds}
                    onSupportingTechsChange={setNewSupportingTechIds}
                    label="PM Inspection Squad Assignment (Manpower)"
                    description="Designate 1 Lead Technician and assign supporting crew members for recurring maintenance checks."
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Instructions / Notes (Standard Checklist)</label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    placeholder="Safety precautions, standard checking criteria, or special notes..."
                  />
                </div>
              </div>

              <div className="p-4 sm:px-6 sm:py-3.5 border-t border-slate-200 flex justify-end gap-3 shrink-0 bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setCreateError(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Registering...' : 'Register Schedule PM Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(taskToDelete)}
        title="Hapus Jadwal PM (Delete PM Task)"
        itemType="Tugas PM"
        itemName={taskToDelete ? `[${taskToDelete.task_code}] ${taskToDelete.asset_name}` : ''}
        warningText="Tugas preventive maintenance ini akan dihapus dari antrean jadwal kerja pemeliharaan."
        isDeleting={isDeleting}
        onConfirm={handleDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />

      {/* Multi-Manpower Fast Assignment Modal */}
      {manpowerModalPM && (
        <ManpowerAssignmentModal
          isOpen={Boolean(manpowerModalPM)}
          caseType="pm_task"
          caseId={manpowerModalPM.id}
          caseNumber={manpowerModalPM.task_code}
          title={`Preventive Maintenance: ${manpowerModalPM.asset_name}`}
          initialLeadTechId={manpowerModalPM.assigned_tech_id}
          initialSupportingTechIds={(() => {
            try {
              if (!manpowerModalPM.supporting_manpower) return [];
              if (manpowerModalPM.supporting_manpower.startsWith('[')) {
                return JSON.parse(manpowerModalPM.supporting_manpower);
              }
              return manpowerModalPM.supporting_manpower.split(',').map((s) => s.trim()).filter(Boolean);
            } catch {
              return [];
            }
          })()}
          technicians={technicians}
          onSuccess={() => {
            setManpowerModalPM(null);
            loadData();
          }}
          onClose={() => setManpowerModalPM(null)}
        />
      )}

      {/* Overdue Task Delay Justification & Risk Record Modal */}
      {overdueTaskToRecord && (
        <OverdueTaskRecordModal
          isOpen={Boolean(overdueTaskToRecord)}
          onClose={() => setOverdueTaskToRecord(null)}
          task={overdueTaskToRecord}
          currentUser="Hermawan Prasetyo (GA & Maintenance Leader - All Plant)"
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};

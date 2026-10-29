import React, { useEffect, useState } from 'react';
import {
  Gauge, Plus, Zap, Droplets, Wind, AlertCircle, X, Save, Trash2, CheckCircle2,
  PlayCircle, Clock, CheckCircle, Search, Filter, Camera, Wrench, ChevronRight
} from 'lucide-react';
import { UtilityMeter, UtilityReading, UtilityTask, Plant, Technician } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatIDR, formatDate } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { MultiTechnicianPicker } from '../common/MultiTechnicianPicker.tsx';
import { ManpowerBadgeList } from '../common/ManpowerBadgeList.tsx';
import { EvidenceUploadModal } from '../common/EvidenceUploadModal.tsx';
import { EvidenceGallery } from '../common/EvidenceGallery.tsx';
import { realtime } from '../../lib/realtime.ts';

interface UtilityManagementViewProps {
  selectedPlant: string;
  plants: Plant[];
}

export const UtilityManagementView: React.FC<UtilityManagementViewProps> = ({
  selectedPlant,
  plants
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'readings'>('tasks');
  const [meters, setMeters] = useState<UtilityMeter[]>([]);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [tasks, setTasks] = useState<UtilityTask[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'In Progress' | 'Completed'>('all');
  const [utilityTypeFilter, setUtilityTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // New Reading Modal
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [currentReadingVal, setCurrentReadingVal] = useState(0);
  const [readingNotes, setReadingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Utility Task Modal
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState('Electrical Power');
  const [newTaskPlantId, setNewTaskPlantId] = useState(selectedPlant === 'all' ? (plants[0]?.id || '') : selectedPlant);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState(new Date().toISOString().substring(0, 10));
  const [newTaskTechId, setNewTaskTechId] = useState('');
  const [newTaskSupportingIds, setNewTaskSupportingIds] = useState<string[]>([]);

  // Task Completion Modal
  const [selectedTaskForCompletion, setSelectedTaskForCompletion] = useState<UtilityTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Evidence Modals
  const [evidenceUploadTarget, setEvidenceUploadTarget] = useState<UtilityTask | null>(null);
  const [evidenceViewerTarget, setEvidenceViewerTarget] = useState<UtilityTask | null>(null);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<{ type: 'task' | 'reading'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [mList, rList, tList, techList] = await Promise.all([
        api.getUtilityMeters(selectedPlant),
        api.getUtilityReadings(),
        api.getUtilityTasks({ plant: selectedPlant }),
        api.getTechnicians()
      ]);
      setMeters(mList);
      setReadings(rList);
      setTasks(tList);
      setTechnicians(techList);
      if (mList.length > 0 && !selectedMeterId) {
        setSelectedMeterId(mList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates across PCs
    const unsubscribe = realtime.subscribe((event) => {
      if (
        event.entity === 'utility_task' ||
        event.entity === 'utility_reading' ||
        event.entity === 'Utilities' ||
        event.entity === 'evidence' ||
        event.entity === 'all'
      ) {
        loadData(true);
      }
    });

    return () => unsubscribe();
  }, [selectedPlant]);

  const handleRecordReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeterId) return;

    try {
      setIsSubmitting(true);
      await api.createUtilityReading({
        meter_id: selectedMeterId,
        current_reading: currentReadingVal,
        notes: readingNotes,
        status: 'Completed',
        user_name: 'Utility Officer'
      });
      setShowReadingModal(false);
      setCurrentReadingVal(0);
      setReadingNotes('');
      setStatusToast('Pencatatan meter utilitas berhasil disimpan!');
      setTimeout(() => setStatusToast(null), 3500);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat angka meter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.createUtilityTask({
        plant_id: newTaskPlantId,
        utility_type: newTaskType,
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        assigned_tech_id: newTaskTechId || null,
        supporting_tech_ids: newTaskSupportingIds,
        due_date: newTaskDueDate,
        user_name: 'Utility Officer'
      });
      setShowAddTaskModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskTechId('');
      setNewTaskSupportingIds([]);
      setStatusToast('Tugas operasional utilitas berhasil dibuat dengan status Open!');
      setTimeout(() => setStatusToast(null), 3500);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mendaftarkan tugas utilitas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTaskStatus = async (
    task: UtilityTask,
    newStatus: 'Open' | 'In Progress' | 'Completed',
    extraNotes?: string
  ) => {
    try {
      setIsUpdatingStatus(true);
      await api.updateUtilityTaskStatus(task.id, newStatus, {
        completion_notes: extraNotes,
        user_name: 'Utility Officer'
      });
      setStatusToast(`Status tugas utilitas [${task.task_code}] berhasil diubah ke: ${newStatus}`);
      setTimeout(() => setStatusToast(null), 3500);
      setSelectedTaskForCompletion(null);
      loadData(true);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status tugas utilitas');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      if (itemToDelete.type === 'task') {
        await api.deleteUtilityTask(itemToDelete.id, 'Utility Officer');
        setStatusToast('Tugas utilitas berhasil dihapus');
      } else {
        await api.deleteUtilityReading(itemToDelete.id, 'Utility Officer');
        setStatusToast('Pencatatan meter berhasil dihapus');
      }
      setItemToDelete(null);
      setTimeout(() => setStatusToast(null), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus data');
    } finally {
      setIsDeleting(false);
    }
  };

  // Utility Task Counts
  const totalTasks = tasks.length;
  const openTasks = tasks.filter((t) => (t.status || 'Open') === 'Open').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress').length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;

  const utilityTypes = ['Electrical Power', 'Compressed Air', 'Water Supply', 'Nitrogen', 'Solar Power'];

  const filteredTasks = tasks.filter((t) => {
    if (utilityTypeFilter !== 'all' && t.utility_type !== utilityTypeFilter) return false;
    const currentStatus = t.status || 'Open';
    if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = t.task_code?.toLowerCase().includes(q);
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchTech = t.tech_names?.toLowerCase().includes(q);
      if (!matchCode && !matchTitle && !matchDesc && !matchTech) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            In Progress
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Open
          </span>
        );
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">Critical</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">High</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Medium</span>;
    }
  };

  const totalUtilityCost = readings.reduce((sum, r) => sum + r.total_cost, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {statusToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Gauge className="w-6 h-6 text-blue-700" />
            Utility Management &amp; Energy Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Plant-wide electrical power (PLN 20kV / Substation), compressed air systems, nitrogen headers, industrial water, and energy expense tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'tasks' ? (
            <button
              onClick={() => {
                setNewTaskPlantId(selectedPlant === 'all' ? (plants[0]?.id || '') : selectedPlant);
                setShowAddTaskModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Catat Tugas Utilitas Baru
            </button>
          ) : (
            <button
              onClick={() => {
                if (meters.length > 0) {
                  setSelectedMeterId(meters[0].id);
                  setCurrentReadingVal((meters[0].last_reading || 0) + 100);
                }
                setShowReadingModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Catat Angka Meter Baru
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'tasks' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Tugas Pemeliharaan Utilitas ({totalTasks})</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-extrabold font-mono">
            Open: {openTasks}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('readings')}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'readings' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Meter &amp; Konsumsi Energi ({readings.length})</span>
        </button>
      </div>

      {/* TAB 1: UTILITY TASKS & MAINTENANCE */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Status KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setStatusFilter('all')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-blue-50/60 border-blue-400 shadow-xs ring-1 ring-blue-400'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Total Tugas Utilitas</span>
                <Wrench className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalTasks}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Semua checklist &amp; tugas gardu/mesin utilitas</div>
            </div>

            <div
              onClick={() => setStatusFilter('Open')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                statusFilter === 'Open'
                  ? 'bg-blue-50 border-blue-500 shadow-xs ring-1 ring-blue-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
                <span>Status Open</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-900 mt-1 font-mono">{openTasks}</div>
              <div className="text-[11px] text-blue-700/80 mt-0.5">Menunggu teknisi mulai pengerjaan</div>
            </div>

            <div
              onClick={() => setStatusFilter('In Progress')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                statusFilter === 'In Progress'
                  ? 'bg-amber-50 border-amber-500 shadow-xs ring-1 ring-amber-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
                <span>In Progress</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              </div>
              <div className="text-2xl font-black text-amber-900 mt-1 font-mono">{inProgressTasks}</div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">Sedang dikerjakan teknisi di plant</div>
            </div>

            <div
              onClick={() => setStatusFilter('Completed')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                statusFilter === 'Completed'
                  ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span>Completed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-1 font-mono">{completedTasks}</div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">Selesai terverifikasi</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Status Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
                  }`}
                >
                  Semua ({totalTasks})
                </button>
                <button
                  onClick={() => setStatusFilter('Open')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    statusFilter === 'Open' ? 'bg-blue-600 text-white shadow-xs font-black' : 'hover:text-blue-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'Open' ? 'bg-white' : 'bg-blue-600'}`} />
                  Open ({openTasks})
                </button>
                <button
                  onClick={() => setStatusFilter('In Progress')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    statusFilter === 'In Progress' ? 'bg-amber-600 text-white shadow-xs font-black' : 'hover:text-amber-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'In Progress' ? 'bg-white' : 'bg-amber-500'}`} />
                  In Progress ({inProgressTasks})
                </button>
                <button
                  onClick={() => setStatusFilter('Completed')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    statusFilter === 'Completed' ? 'bg-emerald-600 text-white shadow-xs font-black' : 'hover:text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed ({completedTasks})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kode tugas, judul, teknisi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Utility Type Filters */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setUtilityTypeFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  utilityTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Jenis Utilitas
              </button>
              {utilityTypes.map((ut) => (
                <button
                  key={ut}
                  onClick={() => setUtilityTypeFilter(ut)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    utilityTypeFilter === ut ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ut}
                </button>
              ))}
            </div>
          </div>

          {/* Utility Tasks Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Task Code</th>
                    <th className="py-3.5 px-4">Jenis Utilitas &amp; Tugas</th>
                    <th className="py-3.5 px-4">Prioritas &amp; Pabrik</th>
                    <th className="py-3.5 px-4">Teknisi Bertugas</th>
                    <th className="py-3.5 px-4">Target / Selesai</th>
                    <th className="py-3.5 px-4">Status &amp; Alur Kerja</th>
                    <th className="py-3.5 px-4 text-center">Foto Bukti</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Wrench className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        Tidak ada tugas utilitas yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const currentStatus = (task.status || 'Open') as 'Open' | 'In Progress' | 'Completed';

                      return (
                        <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-blue-900 text-sm">{task.task_code}</div>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {task.id.slice(-6)}</span>
                          </td>

                          <td className="py-3.5 px-4 max-w-sm">
                            <div className="font-bold text-slate-900 text-sm">{task.title}</div>
                            <div className="text-[11px] text-blue-700 font-semibold">{task.utility_type}</div>
                            {task.description && (
                              <p className="text-slate-600 text-[11px] line-clamp-2 mt-0.5">{task.description}</p>
                            )}
                            {task.completion_notes && (
                              <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1 border border-emerald-200">
                                Catatan Hasil: {task.completion_notes}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div>{getPriorityBadge(task.priority)}</div>
                              <div className="text-slate-800 font-semibold">{task.plant_name || 'Plant NA-2'}</div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {task.assigned_technicians && task.assigned_technicians.length > 0 ? (
                              <ManpowerBadgeList technicians={task.assigned_technicians} />
                            ) : (
                              <div className="text-slate-500 italic">Belum ditugaskan</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono font-semibold text-slate-800">{formatDate(task.due_date)}</div>
                            {task.completed_at && (
                              <div className="text-[10px] text-emerald-600 font-mono">Selesai: {task.completed_at.slice(0, 16)}</div>
                            )}
                          </td>

                          {/* Status & Lifecycle Actions */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              <div>{getStatusBadge(currentStatus)}</div>

                              <div className="flex items-center gap-1">
                                {currentStatus === 'Open' && (
                                  <button
                                    onClick={() => handleUpdateTaskStatus(task, 'In Progress')}
                                    disabled={isUpdatingStatus}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Mulai Pengerjaan Tugas Utilitas"
                                  >
                                    <PlayCircle className="w-3 h-3" />
                                    Mulai
                                  </button>
                                )}

                                {currentStatus === 'In Progress' && (
                                  <button
                                    onClick={() => {
                                      setSelectedTaskForCompletion(task);
                                      setCompletionNotes(task.completion_notes || 'Pemeriksaan & perbaikan utilitas selesai.');
                                    }}
                                    disabled={isUpdatingStatus}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Selesaikan Tugas Utilitas"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Selesaikan
                                  </button>
                                )}

                                {currentStatus === 'Completed' && (
                                  <button
                                    onClick={() => handleUpdateTaskStatus(task, 'In Progress')}
                                    disabled={isUpdatingStatus}
                                    className="px-1.5 py-0.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded text-[10px] transition-colors cursor-pointer"
                                    title="Buka Kembali Tugas (Re-open)"
                                  >
                                    Buka Lagi
                                  </button>
                                )}

                                <select
                                  value={currentStatus}
                                  onChange={(e) => handleUpdateTaskStatus(task, e.target.value as any)}
                                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded px-1.5 py-0.5 border border-slate-300 focus:outline-none cursor-pointer"
                                >
                                  <option value="Open">Open</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </div>
                            </div>
                          </td>

                          {/* Evidence Photo */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEvidenceUploadTarget(task)}
                                className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                title="Unggah Foto Bukti Tugas Utilitas"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                              {(task.evidence_count || 0) > 0 && (
                                <button
                                  onClick={() => setEvidenceViewerTarget(task)}
                                  className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] cursor-pointer"
                                  title="Lihat Galeri Foto Bukti"
                                >
                                  {task.evidence_count} Foto
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setItemToDelete({ type: 'task', id: task.id, name: `[${task.task_code}] ${task.title}` })}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Tugas Utilitas"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UTILITY METERS & CONSUMPTION READINGS */}
      {activeTab === 'readings' && (
        <div className="space-y-6">
          {/* Meter KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {meters.map((meter) => {
              const isPower = meter.utility_type === 'Electrical Power';
              const isWater = meter.utility_type === 'Water Supply';
              const isAir = meter.utility_type === 'Compressed Air';

              return (
                <div key={meter.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-blue-900">{meter.meter_code}</span>
                    {isPower ? <Zap className="w-4 h-4 text-amber-500" /> : isWater ? <Droplets className="w-4 h-4 text-cyan-600" /> : <Wind className="w-4 h-4 text-blue-500" />}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{meter.utility_type}</h3>
                    <span className="text-xs text-slate-500">{meter.plant_name} · {meter.location}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs font-mono border border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span>Last Reading:</span>
                      <span className="font-bold text-slate-900">{meter.last_reading?.toLocaleString('id-ID') || '0'} {meter.unit_of_measure}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tariff:</span>
                      <span className="text-slate-800">{formatIDR(meter.tariff_per_unit)} / {meter.unit_of_measure}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedMeterId(meter.id);
                      setCurrentReadingVal((meter.last_reading || 0) + 100);
                      setShowReadingModal(true);
                    }}
                    className="w-full py-2 text-center text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Catat Angka Baru
                  </button>
                </div>
              );
            })}
          </div>

          {/* Historical Readings Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Riwayat Konsumsi Energi &amp; Biaya Utilitas</h2>
                <span className="text-xs text-slate-500">Perhitungan pemakaian delta dan biaya tarif listrik/air/angin.</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total Biaya Utilitas YTD:</span>
                <span className="text-base font-extrabold text-blue-900 font-mono">{formatIDR(totalUtilityCost)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tanggal Catat</th>
                    <th className="py-3 px-4">Meter Code &amp; Tipe</th>
                    <th className="py-3 px-4">Pabrik</th>
                    <th className="py-3 px-4 font-mono text-right">Angka Lalu</th>
                    <th className="py-3 px-4 font-mono text-right">Angka Kini</th>
                    <th className="py-3 px-4 font-mono text-right">Pemakaian (Delta)</th>
                    <th className="py-3 px-4 font-mono text-right">Total Biaya (IDR)</th>
                    <th className="py-3 px-4">Status &amp; Verifikator</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {readings.map((r) => {
                    const rStatus = r.status || 'Completed';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-700 font-medium">{formatDate(r.reading_date)}</td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900">{r.meter_code}</div>
                          <div className="text-[11px] text-slate-500">{r.utility_type}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{r.plant_name}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">{r.previous_reading.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{r.current_reading.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                          {r.consumption.toLocaleString('id-ID')} {r.unit_of_measure}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatIDR(r.total_cost)}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div>{getStatusBadge(rStatus)}</div>
                            <div className="text-[11px] text-slate-600">{r.recorded_by}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setItemToDelete({ type: 'reading', id: r.id, name: `Meter ${r.meter_code} (${r.reading_date})` })}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Catatan Meter"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Task Completion Modal */}
      {selectedTaskForCompletion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Selesaikan Tugas Utilitas</h2>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedTaskForCompletion.task_code} · {selectedTaskForCompletion.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTaskForCompletion(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateTaskStatus(selectedTaskForCompletion, 'Completed', completionNotes);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Hasil Pengerjaan &amp; Pengukuran *</label>
                <textarea
                  rows={3}
                  required
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Contoh: Pengukuran arus motor stabil, filter oli dan pembersih sirip selesai dilakukan..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2 text-[11px]">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Mengubah status ke <strong>Completed</strong> akan mencatat tanggal &amp; waktu penyelesaian di timezone WIB secara realtime.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForCompletion(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Konfirmasi Selesai (Mark Completed)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Catat Tugas Pemeliharaan Utilitas</h2>
              <button onClick={() => setShowAddTaskModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Utilitas *</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    {utilityTypes.map((ut) => (
                      <option key={ut} value={ut}>{ut}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pabrik *</label>
                  <select
                    value={newTaskPlantId}
                    onChange={(e) => setNewTaskPlantId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Tugas / Pekerjaan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kalibrasi Pressure Transmitter Gas Nitrogen atau Inspeksi Trafo 20kV"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi &amp; Lingkup Checklist</label>
                <textarea
                  rows={3}
                  placeholder="Instruksi pengerjaan spesifik, checkpoint uji kebocoran, standar parameter operasi..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tingkat Prioritas</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="Low">Low (Rendah)</option>
                    <option value="Medium">Medium (Sedang)</option>
                    <option value="High">High (Tinggi)</option>
                    <option value="Critical">Critical (Kritis)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Jatuh Tempo *</label>
                  <input
                    type="date"
                    required
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Multi-Manpower Picker */}
              <div>
                <MultiTechnicianPicker
                  technicians={technicians}
                  leadTechId={newTaskTechId}
                  onLeadTechChange={(id: string) => setNewTaskTechId(id)}
                  supportingTechIds={newTaskSupportingIds}
                  onSupportingTechsChange={(ids: string[]) => setNewTaskSupportingIds(ids)}
                  label="Penugasan Regu Teknisi (Multi-Manpower)"
                  description="Pilih 1 Teknisi Utama (Lead) dan anggota teknisi pendukung yang bertugas bersama."
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Simpan Tugas Utilitas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Reading Modal */}
      {showReadingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Catat Angka Meter Utilitas</h2>
              <button onClick={() => setShowReadingModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordReading} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Meter / Alat Ukur *</label>
                <select
                  value={selectedMeterId}
                  onChange={(e) => {
                    setSelectedMeterId(e.target.value);
                    const m = meters.find((x) => x.id === e.target.value);
                    if (m) setCurrentReadingVal((m.last_reading || 0) + 100);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  {meters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.meter_code} - {m.utility_type} ({m.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Angka Stand Meter Saat Ini *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={currentReadingVal}
                  onChange={(e) => setCurrentReadingVal(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Kondisi jam operasional, beban puncak, catatan visual..."
                  value={readingNotes}
                  onChange={(e) => setReadingNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReadingModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Simpan Angka Meter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evidence Upload Modal */}
      {evidenceUploadTarget && (
        <EvidenceUploadModal
          isOpen={Boolean(evidenceUploadTarget)}
          activityType="pm_task"
          activityId={evidenceUploadTarget.id}
          activityCode={evidenceUploadTarget.task_code}
          onSuccess={() => {
            setEvidenceUploadTarget(null);
            setStatusToast('Foto bukti tugas utilitas berhasil diunggah!');
            setTimeout(() => setStatusToast(null), 3000);
            loadData(true);
          }}
          onClose={() => setEvidenceUploadTarget(null)}
        />
      )}

      {/* Evidence Viewer Modal */}
      {evidenceViewerTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-blue-800">{evidenceViewerTarget.task_code}</span>
                <h3 className="text-base font-bold text-slate-900">Galeri Bukti Utilitas: {evidenceViewerTarget.title}</h3>
                <p className="text-xs text-slate-500">Tipe: {evidenceViewerTarget.utility_type} · Prioritas: {evidenceViewerTarget.priority}</p>
              </div>
              <button
                onClick={() => setEvidenceViewerTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <EvidenceGallery
              activityType="pm_task"
              activityId={evidenceViewerTarget.id}
              activityCode={evidenceViewerTarget.task_code}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="Hapus Data Utilitas"
        itemType={itemToDelete?.type === 'task' ? 'Tugas Utilitas' : 'Catatan Meter'}
        itemName={itemToDelete ? itemToDelete.name : ''}
        warningText="Data utilitas ini akan dihapus secara permanen dari sistem NA-MMS."
        isDeleting={isDeleting}
        onConfirm={handleDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

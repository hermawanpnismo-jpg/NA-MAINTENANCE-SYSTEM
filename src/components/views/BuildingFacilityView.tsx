import React, { useEffect, useState } from 'react';
import {
  Building, Plus, CheckCircle, AlertTriangle, Search, Filter, Wrench, X, Save, Trash2,
  Clock, CheckCircle2, PlayCircle, Camera, ChevronRight, FileText, Eye, Users, HardDrive,
  Printer, Shield, AlertOctagon
} from 'lucide-react';
import { FacilityInspection, Plant, Technician } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatDate } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { EvidenceUploadModal } from '../common/EvidenceUploadModal.tsx';
import { EvidenceGallery } from '../common/EvidenceGallery.tsx';
import { FacilityDetailReportModal } from '../common/FacilityDetailReportModal.tsx';
import { ManpowerAssignmentModal } from '../common/ManpowerAssignmentModal.tsx';
import { OverdueTaskRecordModal } from '../common/OverdueTaskRecordModal.tsx';
import { DatabaseBackupModal } from '../common/DatabaseBackupModal.tsx';
import { realtime } from '../../lib/realtime.ts';

interface BuildingFacilityViewProps {
  selectedPlant: string;
  plants: Plant[];
}

export const BuildingFacilityView: React.FC<BuildingFacilityViewProps> = ({
  selectedPlant,
  plants
}) => {
  const [inspections, setInspections] = useState<FacilityInspection[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'In Progress' | 'Completed' | 'Overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Detail Report 5W+1H Modal
  const [selectedInspectionReport, setSelectedInspectionReport] = useState<FacilityInspection | null>(null);

  // Fast Manpower Assignment Modal
  const [manpowerModalInspection, setManpowerModalInspection] = useState<FacilityInspection | null>(null);

  // Overdue Task Record Modal
  const [overdueTaskTarget, setOverdueTaskTarget] = useState<FacilityInspection | null>(null);

  // Local PC Hard Disk Backup Modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // New Inspection Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInspection, setNewInspection] = useState({
    facility_category: 'Roof and Ceiling',
    plant_id: selectedPlant === 'all' ? (plants[0]?.id || '') : selectedPlant,
    area_description: '',
    technical_condition: 'Normal / Good' as const,
    findings: '',
    corrective_action: '',
    inspector: 'Bambang Supriyanto',
    due_date: ''
  });

  // Complete / Progress Modal
  const [selectedForCompletion, setSelectedForCompletion] = useState<FacilityInspection | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [correctiveActionDone, setCorrectiveActionDone] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Evidence Modals
  const [evidenceUploadTarget, setEvidenceUploadTarget] = useState<FacilityInspection | null>(null);
  const [evidenceViewerTarget, setEvidenceViewerTarget] = useState<FacilityInspection | null>(null);

  // Delete State
  const [inspectionToDelete, setInspectionToDelete] = useState<FacilityInspection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [data, techList] = await Promise.all([
        api.getFacilityInspections(selectedPlant),
        api.getTechnicians()
      ]);
      setInspections(data);
      setTechnicians(techList);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates
    const unsubscribe = realtime.subscribe((event) => {
      if (event.entity === 'facility_inspection' || event.entity === 'evidence' || event.entity === 'all') {
        loadData(true);
      }
    });

    return () => unsubscribe();
  }, [selectedPlant]);

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFacilityInspection({
        ...newInspection,
        user_name: newInspection.inspector
      });
      setShowAddModal(false);
      setNewInspection({
        facility_category: 'Roof and Ceiling',
        plant_id: selectedPlant === 'all' ? (plants[0]?.id || '') : selectedPlant,
        area_description: '',
        technical_condition: 'Normal / Good',
        findings: '',
        corrective_action: '',
        inspector: 'Bambang Supriyanto',
        due_date: ''
      });
      setStatusToast('Inspeksi fasilitas berhasil dicatat dengan status Open!');
      setTimeout(() => setStatusToast(null), 3500);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan catatan inspeksi fasilitas');
    }
  };

  const handleUpdateStatus = async (
    inspection: FacilityInspection,
    newStatus: 'Open' | 'In Progress' | 'Completed',
    extraNotes?: string,
    actionDone?: string
  ) => {
    try {
      setIsUpdatingStatus(true);
      await api.updateFacilityInspectionStatus(inspection.id, newStatus, {
        completion_notes: extraNotes,
        corrective_action: actionDone,
        user_name: 'Facility Officer'
      });
      setStatusToast(`Status inspeksi ${inspection.inspection_code} berhasil diubah ke: ${newStatus}`);
      setTimeout(() => setStatusToast(null), 3500);
      setSelectedForCompletion(null);
      loadData(true);
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status fasilitas');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteInspection = async () => {
    if (!inspectionToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteFacilityInspection(inspectionToDelete.id, 'Facility Officer');
      setInspectionToDelete(null);
      setStatusToast('Catatan inspeksi fasilitas berhasil dihapus');
      setTimeout(() => setStatusToast(null), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus catatan inspeksi fasilitas');
    } finally {
      setIsDeleting(false);
    }
  };

  const categories = [
    'Roof and Ceiling',
    'Floor and Wall',
    'Doors and Gates',
    'Lighting',
    'Plumbing',
    'Toilets and Sanitation',
    'Drainage',
    'HVAC',
    'Office and Workshop Facilities'
  ];

  // Counts
  const totalCount = inspections.length;
  const openCount = inspections.filter((i) => (i.status || 'Open') === 'Open').length;
  const inProgressCount = inspections.filter((i) => i.status === 'In Progress').length;
  const completedCount = inspections.filter((i) => i.status === 'Completed').length;
  const overdueCount = inspections.filter((i) => Boolean(i.is_overdue || (i.due_date && new Date(i.due_date) < new Date() && i.status !== 'Completed'))).length;

  const filtered = inspections.filter((i) => {
    if (categoryFilter !== 'all' && i.facility_category !== categoryFilter) return false;
    const currentStatus = i.status || 'Open';
    const isItemOverdue = Boolean(i.is_overdue || (i.due_date && new Date(i.due_date) < new Date() && currentStatus !== 'Completed'));

    if (statusFilter === 'Overdue') {
      if (!isItemOverdue) return false;
    } else if (statusFilter !== 'all' && currentStatus !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = i.inspection_code?.toLowerCase().includes(q);
      const matchArea = i.area_description?.toLowerCase().includes(q);
      const matchFindings = i.findings?.toLowerCase().includes(q);
      const matchCat = i.facility_category?.toLowerCase().includes(q);
      if (!matchCode && !matchArea && !matchFindings && !matchCat) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string, item?: FacilityInspection) => {
    const isItemOverdue = item ? Boolean(item.is_overdue || (item.due_date && new Date(item.due_date) < new Date() && status !== 'Completed')) : false;

    return (
      <div className="flex flex-col gap-1 items-start">
        {status === 'In Progress' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            In Progress
          </span>
        ) : status === 'Completed' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Completed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Open
          </span>
        )}
        {isItemOverdue && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            OVERDUE
          </span>
        )}
      </div>
    );
  };

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
            <Building className="w-6 h-6 text-blue-700" />
            Building Facility &amp; Civil Maintenance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Civil infrastructure inspections, roof guttering, lighting lux levels, epoxy flooring, drainage, 5W+1H problem analysis, single-column evidence photos, and authorization signoff.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Backup Database ke Hardisk PC */}
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Download / Simpan Database ke Hardisk PC Lokal (SQLite & JSON)"
          >
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span>Backup DB ke PC</span>
          </button>

          {/* Print Rekap Laporan */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Cetak Ringkasan Inspeksi Fasilitas"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Laporan</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Inspeksi Fasilitas Baru
          </button>
        </div>
      </div>

      {/* KPI / Status Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-blue-50/60 border-blue-400 shadow-xs ring-1 ring-blue-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Inspeksi</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Semua audit sipil</div>
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
          <div className="text-2xl font-black text-blue-900 mt-1 font-mono">{openCount}</div>
          <div className="text-[11px] text-blue-700/80 mt-0.5">Menunggu perbaikan</div>
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
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1 font-mono">{inProgressCount}</div>
          <div className="text-[11px] text-amber-700/80 mt-0.5">Sedang dikerjakan</div>
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
          <div className="text-2xl font-black text-emerald-900 mt-1 font-mono">{completedCount}</div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">Perbaikan selesai</div>
        </div>

        <div
          onClick={() => setStatusFilter('Overdue')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'Overdue'
              ? 'bg-rose-50 border-rose-500 shadow-xs ring-1 ring-rose-500'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700">
            <span>Overdue Tasks</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1 font-mono">{overdueCount}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">
            {overdueCount > 0 ? '⚠️ Memerlukan Catatan Delay' : 'Nol keterlambatan'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-black' : 'hover:text-slate-900'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('Open')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'Open' ? 'bg-blue-600 text-white shadow-xs font-black' : 'hover:text-blue-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'Open' ? 'bg-white' : 'bg-blue-600'}`} />
              Open ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter('In Progress')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'In Progress' ? 'bg-amber-600 text-white shadow-xs font-black' : 'hover:text-amber-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'In Progress' ? 'bg-white' : 'bg-amber-500'}`} />
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('Completed')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'Completed' ? 'bg-emerald-600 text-white shadow-xs font-black' : 'hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('Overdue')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFilter === 'Overdue' ? 'bg-rose-600 text-white shadow-xs font-black' : 'hover:text-rose-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Overdue ({overdueCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode inspeksi, lokasi, temuan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Facility Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all ${
              categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Kategori Fasilitas
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 rounded-lg transition-all ${
                categoryFilter === c ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Inspection Code</th>
                <th className="py-3.5 px-4">Kategori &amp; Lokasi</th>
                <th className="py-3.5 px-4">Kondisi Teknis</th>
                <th className="py-3.5 px-4">Temuan / Findings</th>
                <th className="py-3.5 px-4">Tindakan Perbaikan</th>
                <th className="py-3.5 px-4">Petugas &amp; Tanggal</th>
                <th className="py-3.5 px-4">Status &amp; Alur Kerja</th>
                <th className="py-3.5 px-4 text-center">Foto Bukti</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Building className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    Tidak ada catatan inspeksi fasilitas yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const conditionColors: Record<string, string> = {
                    'Normal / Good': 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    'Minor Defect': 'bg-blue-50 text-blue-800 border-blue-200',
                    'Requires Action': 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
                    'Critical Hazard': 'bg-red-50 text-red-800 border-red-200 font-bold animate-pulse'
                  };

                  const currentStatus = (item.status || 'Open') as 'Open' | 'In Progress' | 'Completed';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-blue-900 text-sm">{item.inspection_code}</div>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {item.id.slice(-6)}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.facility_category}</div>
                        <div className="text-[11px] text-slate-600 font-medium">{item.plant_name} · <span className="text-slate-500">{item.area_description}</span></div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${conditionColors[item.technical_condition]}`}>
                          {item.technical_condition}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs text-slate-700">
                        <p className="line-clamp-2">{item.findings}</p>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-700 font-medium">
                          {item.corrective_action || <span className="text-slate-400 italic">Belum ada tindakan spesifik</span>}
                        </div>
                        {item.completion_notes && (
                          <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1 border border-emerald-200">
                            Catatan Selesai: {item.completion_notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-semibold">{item.inspector}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{formatDate(item.inspection_date)}</div>
                        {item.completed_at && (
                          <div className="text-[10px] text-emerald-600 font-mono">Selesai: {item.completed_at.slice(0, 16)}</div>
                        )}
                      </td>

                      {/* Interactive Status & Lifecycle */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div>{getStatusBadge(currentStatus, item)}</div>

                          {/* Quick Lifecycle Action Buttons */}
                          <div className="flex items-center gap-1">
                            {currentStatus === 'Open' && (
                              <button
                                onClick={() => handleUpdateStatus(item, 'In Progress')}
                                disabled={isUpdatingStatus}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Mulai Pengerjaan Perbaikan"
                              >
                                <PlayCircle className="w-3 h-3" />
                                Mulai Kerjakan
                              </button>
                            )}

                            {currentStatus === 'In Progress' && (
                              <button
                                onClick={() => {
                                  setSelectedForCompletion(item);
                                  setCompletionNotes(item.completion_notes || 'Pekerjaan perbaikan fasilitas selesai diverifikasi.');
                                  setCorrectiveActionDone(item.corrective_action || '');
                                }}
                                disabled={isUpdatingStatus}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Selesaikan Perbaikan Fasilitas"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Selesaikan
                              </button>
                            )}

                            {currentStatus === 'Completed' && (
                              <button
                                onClick={() => handleUpdateStatus(item, 'In Progress')}
                                disabled={isUpdatingStatus}
                                className="px-1.5 py-0.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded text-[10px] transition-colors cursor-pointer"
                                title="Buka Kembali untuk Dikerjakan (Re-open)"
                              >
                                Buka Lagi
                              </button>
                            )}

                            {/* Direct Dropdown */}
                            <select
                              value={currentStatus}
                              onChange={(e) => handleUpdateStatus(item, e.target.value as any)}
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
                            onClick={() => setEvidenceUploadTarget(item)}
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            title="Unggah Foto Bukti Kondisi / Perbaikan"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                          {(item.evidence_count || 0) > 0 && (
                            <button
                              onClick={() => setEvidenceViewerTarget(item)}
                              className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] cursor-pointer"
                              title="Lihat Galeri Foto Bukti"
                            >
                              {item.evidence_count} Foto
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Detail Report 5W Button */}
                          <button
                            onClick={() => setSelectedInspectionReport(item)}
                            className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Buka Detail Report 5W+1H, Ishikawa 4M, dan Lembar Pengesahan"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Manpower / Tech Assignment Button */}
                          <button
                            onClick={() => setManpowerModalInspection(item)}
                            className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Tugaskan Regu Teknisi & Manpower"
                          >
                            <Users className="w-4 h-4" />
                          </button>

                          {/* Overdue Record Button */}
                          {Boolean(item.is_overdue || (item.due_date && new Date(item.due_date) < new Date() && currentStatus !== 'Completed')) && (
                            <button
                              onClick={() => setOverdueTaskTarget(item)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Catat Justifikasi Keterlambatan Overdue"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>Catat Overdue</span>
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => setInspectionToDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Catatan Inspeksi Fasilitas (Memerlukan Password Nackp2026)"
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

      {/* Completion Modal */}
      {selectedForCompletion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Selesaikan Pengerjaan Fasilitas</h2>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedForCompletion.inspection_code} · {selectedForCompletion.facility_category}</p>
                </div>
              </div>
              <button onClick={() => setSelectedForCompletion(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateStatus(selectedForCompletion, 'Completed', completionNotes, correctiveActionDone);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tindakan Perbaikan yang Telah Dilakukan *</label>
                <textarea
                  rows={2}
                  required
                  value={correctiveActionDone}
                  onChange={(e) => setCorrectiveActionDone(e.target.value)}
                  placeholder="Contoh: Penggantian sealant polyurethane pada sambungan talang grid 4-6 dan pengecatan anti bocor..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Hasil &amp; Verifikasi Akhir</label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Contoh: Uji siram air tidak ada rembesan, kondisi bersih dan siap diserahterimakan..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Mengubah status ke <strong>Completed</strong> akan mencatat tanggal &amp; waktu penyelesaian di timezone WIB secara realtime.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedForCompletion(null)}
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

      {/* Add Inspection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Catat Inspeksi Fasilitas Gedung</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInspection} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Fasilitas *</label>
                  <select
                    value={newInspection.facility_category}
                    onChange={(e) => setNewInspection({ ...newInspection, facility_category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi Pabrik *</label>
                  <select
                    value={newInspection.plant_id}
                    onChange={(e) => setNewInspection({ ...newInspection, plant_id: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Area / Ruangan / Grid Spesifik *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jalur Talang Atap Grid 6-8 atau Pintu Rolling Door Bay 2"
                  value={newInspection.area_description}
                  onChange={(e) => setNewInspection({ ...newInspection, area_description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tingkat Kondisi Teknis *</label>
                <select
                  value={newInspection.technical_condition}
                  onChange={(e) => setNewInspection({ ...newInspection, technical_condition: e.target.value as any })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                >
                  <option value="Normal / Good">Normal / Good (Kondisi Baik)</option>
                  <option value="Minor Defect">Minor Defect (Cacat Ringan - Dipantau)</option>
                  <option value="Requires Action">Requires Action (Perlu Tindakan Perbaikan)</option>
                  <option value="Critical Hazard">Critical Hazard (Bahaya Kritis / LOTO)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Temuan &amp; Observasi Visual *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan kondisi fisik yang ditemukan (kerusakan, kebocoran, retak, lampu mati, genangan air)..."
                  value={newInspection.findings}
                  onChange={(e) => setNewInspection({ ...newInspection, findings: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rekomendasi Tindakan Perbaikan</label>
                <input
                  type="text"
                  placeholder="Contoh: Aplikasi pelapis polyurethane dan penggantian scupper drain"
                  value={newInspection.corrective_action}
                  onChange={(e) => setNewInspection({ ...newInspection, corrective_action: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Simpan Catatan Inspeksi
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
          activityType="facility_inspection"
          activityId={evidenceUploadTarget.id}
          activityCode={evidenceUploadTarget.inspection_code}
          onSuccess={() => {
            setEvidenceUploadTarget(null);
            setStatusToast('Foto bukti berhasil diunggah!');
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
                <span className="text-xs font-mono font-bold text-blue-800">{evidenceViewerTarget.inspection_code}</span>
                <h3 className="text-base font-bold text-slate-900">Galeri Bukti Inspeksi: {evidenceViewerTarget.facility_category}</h3>
                <p className="text-xs text-slate-500">{evidenceViewerTarget.findings || evidenceViewerTarget.area_description || 'Dokumentasi kondisi sebelum, saat pengerjaan, dan perbaikan fasilitas'}</p>
              </div>
              <button
                onClick={() => setEvidenceViewerTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <EvidenceGallery
              activityType="facility_inspection"
              activityId={evidenceViewerTarget.id}
              activityCode={evidenceViewerTarget.inspection_code}
            />
          </div>
        </div>
      )}

      {/* Facility Detail Report Modal (5W+1H, 4M+1E Ishikawa, Authorization Sign-Off) */}
      {selectedInspectionReport && (
        <FacilityDetailReportModal
          inspection={selectedInspectionReport}
          allInspections={inspections}
          onSelectInspection={(ins) => setSelectedInspectionReport(ins)}
          onClose={() => setSelectedInspectionReport(null)}
          onRefresh={() => loadData(true)}
        />
      )}

      {/* Fast Manpower Assignment Modal */}
      {manpowerModalInspection && (
        <ManpowerAssignmentModal
          isOpen={Boolean(manpowerModalInspection)}
          title={`Penugasan Regu Teknisi Fasilitas [${manpowerModalInspection.inspection_code}]`}
          taskTitle={`${manpowerModalInspection.facility_category} (${manpowerModalInspection.area_description})`}
          assignedTechId={manpowerModalInspection.assigned_tech_id}
          supportingTechIds={(() => {
            try {
              return manpowerModalInspection.supporting_manpower ? JSON.parse(manpowerModalInspection.supporting_manpower) : [];
            } catch (_) {
              return [];
            }
          })()}
          technicians={technicians}
          onSave={async (assignedId: string, supportingIds: string[]) => {
            await api.updateFacilityInspectionManpower(manpowerModalInspection.id, {
              assigned_tech_id: assignedId,
              supporting_tech_ids: supportingIds,
              user_name: 'Hermawan Prasetyo (GA-Maintenance)'
            });
            setStatusToast(`Regu teknisi untuk ${manpowerModalInspection.inspection_code} berhasil diperbarui!`);
            setTimeout(() => setStatusToast(null), 3000);
            setManpowerModalInspection(null);
            loadData(true);
          }}
          onClose={() => setManpowerModalInspection(null)}
        />
      )}

      {/* Overdue Task Record Modal */}
      {overdueTaskTarget && (
        <OverdueTaskRecordModal
          isOpen={Boolean(overdueTaskTarget)}
          task={{
            id: overdueTaskTarget.id,
            task_code: overdueTaskTarget.inspection_code,
            asset_id: overdueTaskTarget.id,
            plant_id: overdueTaskTarget.plant_id,
            asset_name: `${overdueTaskTarget.facility_category} - ${overdueTaskTarget.area_description}`,
            due_date: overdueTaskTarget.due_date || overdueTaskTarget.inspection_date,
            status: (overdueTaskTarget.status === 'Open' ? 'Scheduled' : overdueTaskTarget.status) as any,
            tech_name: overdueTaskTarget.assigned_tech_name || overdueTaskTarget.inspector,
            overdue_reason: overdueTaskTarget.overdue_reason,
            overdue_action_plan: overdueTaskTarget.overdue_action_plan,
            overdue_revised_due_date: overdueTaskTarget.overdue_revised_due_date,
            overdue_risk_level: overdueTaskTarget.overdue_risk_level || 'Medium'
          }}
          currentUser="Hermawan Prasetyo (GA-Maintenance)"
          onSaveOverdue={async (data) => {
            await api.recordFacilityInspectionOverdue(overdueTaskTarget.id, data);
          }}
          onClose={() => setOverdueTaskTarget(null)}
          onSuccess={() => {
            setOverdueTaskTarget(null);
            setStatusToast('Catatan keterlambatan (Overdue) fasilitas berhasil disimpan!');
            setTimeout(() => setStatusToast(null), 3500);
            loadData(true);
          }}
        />
      )}

      {/* Database Backup to Hardisk PC Modal */}
      {isBackupModalOpen && (
        <DatabaseBackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(inspectionToDelete)}
        title="Hapus Catatan Inspeksi Fasilitas"
        itemType="Inspeksi Fasilitas"
        itemName={inspectionToDelete ? `[${inspectionToDelete.inspection_code}] ${inspectionToDelete.facility_category} (${inspectionToDelete.area_description})` : ''}
        warningText="Catatan audit sipil/fasilitas gedung ini akan dihapus secara permanen. Masukkan kata sandi otorisasi untuk merealisasikan penghapusan."
        isDeleting={isDeleting}
        requiredPassword="Nackp2026"
        onConfirm={handleDeleteInspection}
        onCancel={() => setInspectionToDelete(null)}
      />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  AlertOctagon, Plus, Search, Filter, Eye, CheckCircle2,
  Clock, ArrowRight, X, Save, AlertTriangle, Trash2,
  Users, Crown, Wrench, Camera, Printer, FileText, Download, Copy, Check
} from 'lucide-react';
import { Breakdown, Asset, Plant, Technician, SignoffAuthorities } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatDateTime, formatDuration, getOnlineDateTimeInputWIB } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { MultiTechnicianPicker } from '../common/MultiTechnicianPicker.tsx';
import { ManpowerBadgeList } from '../common/ManpowerBadgeList.tsx';
import { ManpowerAssignmentModal } from '../common/ManpowerAssignmentModal.tsx';
import { EvidenceGallery } from '../common/EvidenceGallery.tsx';
import { BreakdownDetailReportModal } from '../common/BreakdownDetailReportModal.tsx';
import { realtime } from '../../lib/realtime.ts';

interface BreakdownManagementViewProps {
  selectedPlant: string;
  plants: Plant[];
  onNavigateToWorkOrders?: () => void;
}

export const BreakdownManagementView: React.FC<BreakdownManagementViewProps> = ({
  selectedPlant,
  plants,
  onNavigateToWorkOrders
}) => {
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [authorities, setAuthorities] = useState<SignoffAuthorities | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Detail Modal
  const [selectedBreakdown, setSelectedBreakdown] = useState<Breakdown | null>(null);

  // Printable Breakdown Incident Report Modal
  const [printableBreakdown, setPrintableBreakdown] = useState<Breakdown | null>(null);
  const [showSummaryPrintReport, setShowSummaryPrintReport] = useState(false);
  const [copiedReportText, setCopiedReportText] = useState(false);

  // Delete State
  const [bdToDelete, setBdToDelete] = useState<Breakdown | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fast Multi-Manpower Assignment Modal
  const [manpowerModalBD, setManpowerModalBD] = useState<Breakdown | null>(null);

  const handleDeleteBreakdown = async () => {
    if (!bdToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteBreakdown(bdToDelete.id, 'Maintenance Supervisor');
      setBdToDelete(null);
      if (selectedBreakdown?.id === bdToDelete.id) {
        setSelectedBreakdown(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus laporan breakdown');
    } finally {
      setIsDeleting(false);
    }
  };

  // New Breakdown Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssetId, setNewAssetId] = useState('');
  const [newCategory, setNewCategory] = useState<'Mechanical' | 'Electrical' | 'Pneumatic' | 'Hydraulic' | 'PLC/Software' | 'Operator Error'>('Mechanical');
  const [newDescription, setNewDescription] = useState('');
  const [newProductionImpact, setNewProductionImpact] = useState<'Line Stopped' | 'Speed Reduced' | 'Quality Issue' | 'No Impact'>('Line Stopped');
  const [newPriority, setNewPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newReportedBy, setNewReportedBy] = useState('Production Line Leader');
  const [newAssignedTechId, setNewAssignedTechId] = useState('');
  const [newSupportingTechIds, setNewSupportingTechIds] = useState<string[]>([]);
  const [newCountermeasure, setNewCountermeasure] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 5-Why & Close Breakdown state
  const [modalTab, setModalTab] = useState<'analysis' | 'evidence'>('analysis');
  const [downtimeMinutes, setDowntimeMinutes] = useState(60);
  const [rootCause, setRootCause] = useState('');
  const [fiveWhy1, setFiveWhy1] = useState('');
  const [fiveWhy2, setFiveWhy2] = useState('');
  const [fiveWhy3, setFiveWhy3] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [trialRunResult, setTrialRunResult] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('Hermawan Prasetyo');

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [bdList, assetList, techList, signoffRes] = await Promise.all([
        api.getBreakdowns({
          plant: selectedPlant,
          status: statusFilter,
          priority: priorityFilter
        }),
        api.getAssets({ plant: selectedPlant }),
        api.getTechnicians(),
        api.getManagementSignoffs().catch(() => null)
      ]);
      setBreakdowns(bdList);
      setAssets(assetList);
      setTechnicians(techList);
      if (signoffRes) setAuthorities(signoffRes);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Instant real-time background sync when ANY PC creates/modifies breakdowns
    const unsubscribe = realtime.subscribe(() => {
      loadData(true);
    });

    return () => unsubscribe();
  }, [selectedPlant, statusFilter, priorityFilter]);

  const handleCreateBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const selectedAsset = assets.find((a) => a.id === newAssetId);
      if (!selectedAsset) throw new Error('Please select equipment');

      const res = await api.createBreakdown({
        plant_id: selectedAsset.plant_id,
        asset_id: newAssetId,
        location: selectedAsset.line_name || selectedAsset.plant_name,
        category: newCategory,
        failure_description: newDescription,
        production_impact: newProductionImpact,
        priority: newPriority,
        reported_by: newReportedBy,
        assigned_tech_id: newAssignedTechId || null,
        supporting_tech_ids: newSupportingTechIds,
        temporary_countermeasure: newCountermeasure,
        user_name: newReportedBy
      });

      // Prompt automatic Emergency Work Order creation
      const makeWO = window.confirm(`Breakdown ${res.breakdown_number} logged. Automatically generate an Emergency Work Order?`);
      if (makeWO) {
        await api.createWorkOrderFromBreakdown(res.id, { user_name: newReportedBy });
        alert('Emergency Work Order dispatched to technician.');
      }

      setShowAddModal(false);
      setNewAssignedTechId('');
      setNewSupportingTechIds([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to log breakdown');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBreakdown) return;

    try {
      setSubmitting(true);
      const fiveWhys = [
        fiveWhy1 && `Why 1: ${fiveWhy1}`,
        fiveWhy2 && `Why 2: ${fiveWhy2}`,
        fiveWhy3 && `Why 3: ${fiveWhy3}`
      ].filter(Boolean);

      await api.updateBreakdown(selectedBreakdown.id, {
        status: 'Completed',
        downtime_minutes: downtimeMinutes,
        root_cause: rootCause,
        five_why: JSON.stringify(fiveWhys),
        corrective_action: correctiveAction,
        trial_run_result: trialRunResult || '30-minute test run passed with normal parameters.',
        verified_by: verifiedBy,
        repair_completion_time: getOnlineDateTimeInputWIB().replace('T', ' '),
        user_name: verifiedBy
      });

      setSelectedBreakdown(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update breakdown');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = (bd: Breakdown, tab: 'analysis' | 'evidence' = 'analysis') => {
    setSelectedBreakdown(bd);
    setModalTab(tab);
    setDowntimeMinutes(bd.downtime_minutes || 60);
    setRootCause(bd.root_cause || '');
    setCorrectiveAction(bd.corrective_action || '');
    setTrialRunResult(bd.trial_run_result || '');
    setVerifiedBy(bd.verified_by || 'Hermawan Prasetyo');

    if (bd.five_why) {
      try {
        const parsed = JSON.parse(bd.five_why);
        setFiveWhy1(parsed[0] ? parsed[0].replace(/^Why 1:\s*/, '') : '');
        setFiveWhy2(parsed[1] ? parsed[1].replace(/^Why 2:\s*/, '') : '');
        setFiveWhy3(parsed[2] ? parsed[2].replace(/^Why 3:\s*/, '') : '');
      } catch {
        setFiveWhy1('');
      }
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-red-600" />
            Breakdown &amp; Failure Incident Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Machine stoppage logs, line impact assessment, 5-Why root cause analysis, and downtime calculations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (breakdowns.length > 0) {
                setPrintableBreakdown(breakdowns[0]);
              } else {
                alert('Belum ada data breakdown untuk dibuatkan report.');
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Generate & Tampilkan Laporan Investigasi Detail Breakdown (Cetak PDF / Manual)"
          >
            <FileText className="w-4 h-4 text-red-600" />
            <span>Generate Breakdown Report</span>
          </button>
          <button
            onClick={() => setShowSummaryPrintReport(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            title="Cetak Ringkasan & Rekapitulasi Laporan Kejadian Breakdown (PDF/Print)"
          >
            <Printer className="w-3.5 h-3.5 text-blue-700" />
            <span>Print Rekap Breakdown</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Report Emergency Breakdown
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Status:</span>
          {['all', 'Reported', 'In Progress', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                statusFilter === st ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Priority:</span>
          {['all', 'Critical', 'High', 'Medium'].map((pr) => (
            <button
              key={pr}
              onClick={() => setPriorityFilter(pr)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                priorityFilter === pr ? 'bg-red-700 text-white font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {pr}
            </button>
          ))}
        </div>
      </div>

      {/* Breakdowns Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Breakdown No</th>
                <th className="py-3 px-4">Equipment / Line</th>
                <th className="py-3 px-4">Failure Category</th>
                <th className="py-3 px-4">Production Impact</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Downtime</th>
                <th className="py-3 px-4">Assigned Squad (Manpower)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {breakdowns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No active breakdown records found.
                  </td>
                </tr>
              ) : (
                breakdowns.map((bd) => {
                  const statusColors: Record<string, string> = {
                    Reported: 'bg-red-50 text-red-700 border-red-200',
                    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
                    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Closed: 'bg-slate-100 text-slate-700 border-slate-200'
                  };

                  return (
                    <tr key={bd.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-red-900">
                        {bd.breakdown_number}
                        <div className="text-[10px] text-slate-400 font-normal">{bd.report_datetime}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{bd.asset_name}</div>
                        <div className="text-[11px] text-slate-500">{bd.plant_name} · {bd.location || '-'}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{bd.category}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-rose-700">{bd.production_impact}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          bd.priority === 'Critical' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800'
                        }`}>
                          {bd.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {formatDuration(bd.downtime_minutes)}
                      </td>
                      <td className="py-3 px-4">
                        <ManpowerBadgeList
                          technicians={bd.assigned_technicians}
                          leadTechName={bd.tech_name}
                          supportingManpower={bd.supporting_manpower}
                          onManageClick={() => setManpowerModalBD(bd)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusColors[bd.status] || 'bg-slate-100'}`}>
                          {bd.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDetailModal(bd, 'evidence')}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 cursor-pointer"
                            title="Foto & Evidence Kerusakan"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {(bd.evidence_count || 0) > 0 && (
                              <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100 px-1 rounded-full">
                                {bd.evidence_count}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => setPrintableBreakdown(bd)}
                            className="px-2 py-1 text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer shadow-2xs"
                            title="Tampilkan Detail Report & Cetak (PDF / Manual)"
                          >
                            <Printer className="w-3.5 h-3.5 text-red-600" />
                            <span>Detail Report</span>
                          </button>
                          <button
                            onClick={() => openDetailModal(bd, 'analysis')}
                            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium transition-colors cursor-pointer"
                          >
                            Details / 5-Why
                          </button>
                          <button
                            onClick={() => setBdToDelete(bd)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Breakdown (Delete)"
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

      {/* Report Breakdown Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-red-50 shrink-0">
              <h2 className="text-sm font-extrabold text-red-900 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                Report Equipment Breakdown
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBreakdown} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Select Affected Equipment *</label>
                  <select
                    required
                    value={newAssetId}
                    onChange={(e) => setNewAssetId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="">Select Equipment</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.asset_tag} - {a.name} ({a.plant_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Failure Discipline *</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    >
                      <option value="Mechanical">Mechanical</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Pneumatic">Pneumatic</option>
                      <option value="Hydraulic">Hydraulic</option>
                      <option value="PLC/Software">PLC / Software</option>
                      <option value="Operator Error">Operator Error</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Production Impact *</label>
                    <select
                      value={newProductionImpact}
                      onChange={(e) => setNewProductionImpact(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    >
                      <option value="Line Stopped">Line Stopped (Critical)</option>
                      <option value="Speed Reduced">Speed Reduced / Bottleneck</option>
                      <option value="Quality Issue">Quality Issue</option>
                      <option value="No Impact">No Direct Stoppage</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Failure Description &amp; Symptoms *</label>
                  <textarea
                    rows={3}
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    placeholder="Describe machine behavior, abnormal noise, error codes, temperature, smoke, etc."
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="Critical">Critical (Immediate Response)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <MultiTechnicianPicker
                    technicians={technicians}
                    leadTechId={newAssignedTechId}
                    onLeadTechChange={setNewAssignedTechId}
                    supportingTechIds={newSupportingTechIds}
                    onSupportingTechsChange={setNewSupportingTechIds}
                    label="Emergency Response Squad Assignment"
                    description="Designate 1 Lead Emergency Technician and assign supporting technicians to restore equipment."
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Temporary Countermeasure Executed</label>
                  <input
                    type="text"
                    value={newCountermeasure}
                    onChange={(e) => setNewCountermeasure(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    placeholder="e.g. Switched line feed to manual bypass, isolated breaker"
                  />
                </div>
              </div>

              <div className="p-4 sm:px-6 sm:py-3.5 border-t border-slate-200 flex justify-end gap-3 shrink-0 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Log Breakdown & Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5-Why & Root Cause Analysis Detail Modal */}
      {selectedBreakdown && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div>
                <span className="font-mono font-bold text-xs text-red-900">{selectedBreakdown.breakdown_number}</span>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Breakdown Investigation &amp; Closure
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintableBreakdown(selectedBreakdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Cetak Formulir Laporan Breakdown (PDF / Print)"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-700" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBdToDelete(selectedBreakdown)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Insiden Breakdown"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
                <button onClick={() => setSelectedBreakdown(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-5 gap-6 text-xs sticky top-[73px] z-10">
              <button
                type="button"
                onClick={() => setModalTab('analysis')}
                className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer font-bold ${
                  modalTab === 'analysis'
                    ? 'border-red-600 text-red-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
                5-Why RCA &amp; Action Plan
              </button>
              <button
                type="button"
                onClick={() => setModalTab('evidence')}
                className={`py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer font-bold ${
                  modalTab === 'evidence'
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-4 h-4" />
                Foto &amp; Evidence Kerusakan
                {(selectedBreakdown.evidence_count || 0) > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                    {selectedBreakdown.evidence_count}
                  </span>
                )}
              </button>
            </div>

            {modalTab === 'evidence' && (
              <div className="p-6">
                <EvidenceGallery
                  activityType="breakdown"
                  activityId={selectedBreakdown.id}
                  activityCode={selectedBreakdown.breakdown_number}
                  onCountChange={() => loadData(true)}
                />
              </div>
            )}

            {modalTab === 'analysis' && (
            <form onSubmit={handleUpdateBreakdown} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{selectedBreakdown.asset_name}</div>
                <div className="text-slate-600">{selectedBreakdown.failure_description}</div>
                <div className="text-[11px] text-slate-400">Reported: {formatDateTime(selectedBreakdown.report_datetime)}</div>
              </div>

              {/* Assigned Manpower Squad */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-700" />
                    Breakdown Response Squad ({selectedBreakdown.assigned_technicians?.length || (selectedBreakdown.tech_name ? 1 : 0)} Personnel)
                  </div>
                  <ManpowerBadgeList
                    technicians={selectedBreakdown.assigned_technicians}
                    leadTechName={selectedBreakdown.tech_name}
                    supportingManpower={selectedBreakdown.supporting_manpower}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setManpowerModalBD(selectedBreakdown)}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  Manage Squad
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Actual Downtime (Minutes)</label>
                  <input
                    type="number"
                    required
                    value={downtimeMinutes}
                    onChange={(e) => setDowntimeMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Supervisor Verification (Management Role)</label>
                  {authorities?.verifiedBy && authorities.verifiedBy.length > 0 ? (
                    <select
                      required
                      value={verifiedBy}
                      onChange={(e) => setVerifiedBy(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-sm font-semibold"
                    >
                      {authorities.verifiedBy.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name} (L{v.hierarchy_level || 3} - {v.job_title || v.role})
                        </option>
                      ))}
                      {!authorities.verifiedBy.some((v) => v.name === verifiedBy) && (
                        <option value={verifiedBy}>{verifiedBy}</option>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={verifiedBy}
                      onChange={(e) => setVerifiedBy(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* 5-Why Analysis Inputs */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2.5">
                <span className="font-bold text-blue-950 block">5-Why Root Cause Methodology</span>
                <div>
                  <span className="text-[11px] font-semibold text-blue-900 block mb-0.5">Why 1 (Direct Phenomenon)</span>
                  <input
                    type="text"
                    value={fiveWhy1}
                    onChange={(e) => setFiveWhy1(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded text-xs focus:outline-none"
                    placeholder="Why did the equipment trip or stop?"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-blue-900 block mb-0.5">Why 2 (Physical Cause)</span>
                  <input
                    type="text"
                    value={fiveWhy2}
                    onChange={(e) => setFiveWhy2(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded text-xs focus:outline-none"
                    placeholder="Why did that condition occur?"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-blue-900 block mb-0.5">Why 3 (Latent Cause / Maintenance System)</span>
                  <input
                    type="text"
                    value={fiveWhy3}
                    onChange={(e) => setFiveWhy3(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded text-xs focus:outline-none"
                    placeholder="Why was this not prevented during routine check?"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Identified Root Cause *</label>
                <textarea
                  rows={2}
                  required
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  placeholder="Definitive root cause conclusion"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Permanent Corrective Action / Yokoten</label>
                <input
                  type="text"
                  required
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  placeholder="Design modification, revised PM checklist frequency, or staff training"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Trial Run &amp; Line Acceptance Result</label>
                <input
                  type="text"
                  value={trialRunResult}
                  onChange={(e) => setTrialRunResult(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  placeholder="Tested 30 min full load with production line supervisor"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedBreakdown(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Verifying...' : 'Close Breakdown & Restore Machine'}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(bdToDelete)}
        title="Hapus Insiden Breakdown"
        itemType="Breakdown Event"
        itemName={bdToDelete ? `[${bdToDelete.breakdown_number}] ${bdToDelete.asset_name}` : ''}
        warningText="Laporan downtime dan analisis breakdown ini akan dihapus secara permanen dari sistem."
        isDeleting={isDeleting}
        onConfirm={handleDeleteBreakdown}
        onCancel={() => setBdToDelete(null)}
      />

      {/* Multi-Manpower Fast Assignment Modal */}
      {manpowerModalBD && (
        <ManpowerAssignmentModal
          isOpen={Boolean(manpowerModalBD)}
          caseType="breakdown"
          caseId={manpowerModalBD.id}
          caseNumber={manpowerModalBD.breakdown_number}
          title={`Breakdown Incident: ${manpowerModalBD.asset_name}`}
          initialLeadTechId={manpowerModalBD.assigned_tech_id}
          initialSupportingTechIds={(() => {
            try {
              if (!manpowerModalBD.supporting_manpower) return [];
              if (manpowerModalBD.supporting_manpower.startsWith('[')) {
                return JSON.parse(manpowerModalBD.supporting_manpower);
              }
              return manpowerModalBD.supporting_manpower.split(',').map((s) => s.trim()).filter(Boolean);
            } catch {
              return [];
            }
          })()}
          technicians={technicians}
          onSuccess={() => {
            setManpowerModalBD(null);
            loadData();
          }}
          onClose={() => setManpowerModalBD(null)}
        />
      )}

      {/* Printable Individual Breakdown Incident Detail Report Modal (PDF / Print View) */}
      {printableBreakdown && (
        <BreakdownDetailReportModal
          breakdown={printableBreakdown}
          allBreakdowns={breakdowns}
          onSelectBreakdown={(b) => setPrintableBreakdown(b)}
          onClose={() => setPrintableBreakdown(null)}
        />
      )}

      {/* Summary Breakdown Report Modal (Rekapitulasi Laporan) */}
      {showSummaryPrintReport && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-breakdown-summary, #printable-breakdown-summary * {
                visibility: visible !important;
              }
              #printable-breakdown-summary {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 15px !important;
                background: white !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-300 shadow-2xl overflow-hidden my-auto">
            {/* Modal Top Control Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Rekapitulasi Laporan Kejadian Breakdown (Summary Report)</h3>
                  <p className="text-[11px] text-slate-300">Daftar rekapitulasi gangguan mesin dan kalkulasi downtime PT National Assemblers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Rekap / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSummaryPrintReport(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Summary Sheet */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50">
              <div
                id="printable-breakdown-summary"
                className="bg-white p-8 border border-slate-300 shadow-sm text-slate-900 mx-auto max-w-4xl space-y-6 text-xs font-sans print:p-0 print:border-none print:shadow-none"
              >
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-black text-slate-950 uppercase">PT NATIONAL ASSEMBLERS</h2>
                    <h3 className="text-xs font-bold text-red-900 uppercase">
                      REKAPITULASI LAPORAN KEJADIAN BREAKDOWN &amp; DOWNTIME MESIN
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Filter: Status [{statusFilter.toUpperCase()}] · Prioritas [{priorityFilter.toUpperCase()}] · Pabrik: {selectedPlant.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-mono">
                    <p className="font-bold text-slate-800">Tanggal Rekap: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p>Total Data: {breakdowns.length} Kejadian</p>
                  </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 font-medium block">Total Kejadian:</span>
                    <span className="text-base font-extrabold text-slate-900">{breakdowns.length} Kasus</span>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-[10px] text-red-700 font-medium block">Total Downtime:</span>
                    <span className="text-base font-extrabold text-red-900 font-mono">
                      {breakdowns.reduce((acc, curr) => acc + (curr.downtime_minutes || 0), 0)} Menit
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[10px] text-amber-700 font-medium block">Kasus Kritis:</span>
                    <span className="text-base font-extrabold text-amber-900">
                      {breakdowns.filter(b => b.priority === 'Critical' || b.production_impact === 'Line Stopped').length} Kasus
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-[10px] text-emerald-700 font-medium block">Status Selesai:</span>
                    <span className="text-base font-extrabold text-emerald-900">
                      {breakdowns.filter(b => b.status === 'Completed').length} Selesai
                    </span>
                  </div>
                </div>

                {/* Table */}
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[10px] divide-y divide-slate-200">
                    <thead className="bg-slate-100 font-bold text-slate-800 uppercase">
                      <tr>
                        <th className="py-2 px-2.5">No. BD</th>
                        <th className="py-2 px-2.5">Tanggal</th>
                        <th className="py-2 px-2.5">Mesin / Tag</th>
                        <th className="py-2 px-2.5">Pabrik &amp; Lokasi</th>
                        <th className="py-2 px-2.5">Kategori</th>
                        <th className="py-2 px-2.5">Prioritas</th>
                        <th className="py-2 px-2.5 text-right">Downtime</th>
                        <th className="py-2 px-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {breakdowns.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2.5 font-mono font-bold text-red-900">{b.breakdown_number}</td>
                          <td className="py-2 px-2.5 whitespace-nowrap">{b.report_datetime.slice(0, 10)}</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-900 truncate max-w-[150px]">
                            {b.asset_name}
                            <span className="text-[9px] text-slate-500 block font-mono">{b.asset_tag}</span>
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 truncate max-w-[120px]">{b.plant_name} · {b.location}</td>
                          <td className="py-2 px-2.5">{b.category}</td>
                          <td className="py-2 px-2.5 font-bold text-red-700">{b.priority}</td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">{b.downtime_minutes} m</td>
                          <td className="py-2 px-2.5 text-center font-bold text-slate-800">{b.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sign-off */}
                <div className="pt-4 grid grid-cols-2 text-center text-[10px]">
                  <div>
                    <p className="text-slate-500">Dibuat Oleh:</p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900">Maintenance Planner / Admin</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Disetujui Oleh:</p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900">Hermawan Prasetyo (GA-Maintenance Leader)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => setShowSummaryPrintReport(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Rekap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  ClipboardList, Plus, Search, Filter, Printer, Download, Eye,
  Clock, CheckCircle, AlertTriangle, X, Save, DollarSign, UserCheck,
  Layers, List, Trash2, Play, CheckCircle2, Check, RotateCcw,
  Users, Crown, Wrench, Camera, Image as ImageIcon
} from 'lucide-react';
import { WorkOrder, Asset, Technician, Plant, SparePart, OperationEvidence } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatIDR, formatDate, exportToCSV } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { MultiTechnicianPicker } from '../common/MultiTechnicianPicker.tsx';
import { ManpowerBadgeList } from '../common/ManpowerBadgeList.tsx';
import { ManpowerAssignmentModal } from '../common/ManpowerAssignmentModal.tsx';
import { EvidenceGallery } from '../common/EvidenceGallery.tsx';
import { realtime } from '../../lib/realtime.ts';

interface WorkOrderManagementViewProps {
  selectedPlant: string;
  plants: Plant[];
}

export const WorkOrderManagementView: React.FC<WorkOrderManagementViewProps> = ({
  selectedPlant,
  plants
}) => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Status Change Toast & Loading State
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Detail Modal & Parts/Labor Sub-tab
  const [selectedWOId, setSelectedWOId] = useState<string | null>(null);
  const [selectedWODetail, setSelectedWODetail] = useState<{ workOrder: WorkOrder; parts: any[]; labor: any[]; evidences?: OperationEvidence[] } | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'parts' | 'labor' | 'evidence'>('info');

  // Delete State
  const [woToDelete, setWoToDelete] = useState<WorkOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fast Multi-Manpower Assignment Modal
  const [manpowerModalWO, setManpowerModalWO] = useState<WorkOrder | null>(null);

  const handleDeleteWO = async () => {
    if (!woToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteWorkOrder(woToDelete.id, 'Maintenance Manager');
      setWoToDelete(null);
      if (selectedWODetail?.workOrder?.id === woToDelete.id) {
        setSelectedWODetail(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus work order');
    } finally {
      setIsDeleting(false);
    }
  };

  // Issue Part to WO Form State
  const [issuePartId, setIssuePartId] = useState('');
  const [issueQty, setIssueQty] = useState(1);
  const [isIssuingPart, setIsIssuingPart] = useState(false);

  // Add Labor Form State
  const [laborTechId, setLaborTechId] = useState('');
  const [laborHours, setLaborHours] = useState(2);
  const [laborNotes, setLaborNotes] = useState('');
  const [isAddingLabor, setIsAddingLabor] = useState(false);

  // Printable Work Order Modal
  const [printableWO, setPrintableWO] = useState<WorkOrder | null>(null);

  // New Work Order Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWOAssetId, setNewWOAssetId] = useState('');
  const [newWOType, setNewWOType] = useState<WorkOrder['wo_type']>('Corrective Maintenance');
  const [newWODesc, setNewWODesc] = useState('');
  const [newWOPriority, setNewWOPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Medium');
  const [newWOScope, setNewWOScope] = useState('');
  const [newWOTechId, setNewWOTechId] = useState('');
  const [newWOSupportingIds, setNewWOSupportingIds] = useState<string[]>([]);
  const [newWOSafety, setNewWOSafety] = useState('Wear PPE (Safety Helmet, Shoes, Glasses). Execute LOTO if working on live circuits.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [woList, assetList, techList, partList] = await Promise.all([
        api.getWorkOrders({ plant: selectedPlant, status: statusFilter, type: typeFilter }),
        api.getAssets({ plant: selectedPlant }),
        api.getTechnicians(),
        api.getSpareParts()
      ]);
      setWorkOrders(woList);
      setAssets(assetList);
      setTechnicians(techList);
      setSpareParts(partList);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Instant real-time background sync when ANY PC creates/modifies work orders
    const unsubscribe = realtime.subscribe(() => {
      loadData(true);
    });

    return () => unsubscribe();
  }, [selectedPlant, statusFilter, typeFilter]);

  const openDetail = async (woId: string, initialTab: 'info' | 'parts' | 'labor' | 'evidence' = 'info') => {
    try {
      setSelectedWOId(woId);
      const detail = await api.getWorkOrderDetail(woId);
      setSelectedWODetail(detail);
      setDetailTab(initialTab);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const asset = assets.find((a) => a.id === newWOAssetId);
      const plantId = asset ? asset.plant_id : (selectedPlant === 'all' ? (plants[0]?.id || '') : selectedPlant);

      await api.createWorkOrder({
        plant_id: plantId,
        asset_id: newWOAssetId || null,
        wo_type: newWOType,
        problem_description: newWODesc,
        priority: newWOPriority,
        work_scope: newWOScope,
        assigned_tech_id: newWOTechId || null,
        supporting_tech_ids: newWOSupportingIds,
        safety_precautions: newWOSafety,
        user_name: 'Maintenance Supervisor'
      });

      setShowAddModal(false);
      setNewWODesc('');
      setNewWOScope('');
      setNewWOTechId('');
      setNewWOSupportingIds([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssuePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWOId || !issuePartId) return;

    try {
      setIsIssuingPart(true);
      await api.issuePartToWorkOrder(selectedWOId, {
        part_id: issuePartId,
        quantity: issueQty,
        user_name: 'Storekeeper'
      });
      // Refresh detail and inventory
      const detail = await api.getWorkOrderDetail(selectedWOId);
      setSelectedWODetail(detail);
      const partList = await api.getSpareParts();
      setSpareParts(partList);
      setIssuePartId('');
      setIssueQty(1);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to issue part');
    } finally {
      setIsIssuingPart(false);
    }
  };

  const handleAddLabor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWOId || !laborTechId) return;

    try {
      setIsAddingLabor(true);
      await api.addLaborToWorkOrder(selectedWOId, {
        technician_id: laborTechId,
        hours: laborHours,
        notes: laborNotes,
        user_name: 'Supervisor'
      });
      const detail = await api.getWorkOrderDetail(selectedWOId);
      setSelectedWODetail(detail);
      setLaborTechId('');
      setLaborHours(2);
      setLaborNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to log labor');
    } finally {
      setIsAddingLabor(false);
    }
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'In Progress':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
      case 'Waiting for Parts':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Testing':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
      case 'Closed':
        return 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getActiveStatusButtonClasses = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-700 text-white border-blue-700 shadow-xs';
      case 'In Progress':
        return 'bg-amber-600 text-white border-amber-600 shadow-xs animate-pulse';
      case 'Waiting for Parts':
        return 'bg-purple-700 text-white border-purple-700 shadow-xs';
      case 'Testing':
        return 'bg-cyan-700 text-white border-cyan-700 shadow-xs';
      case 'Completed':
        return 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
      case 'Closed':
        return 'bg-slate-800 text-white border-slate-800 shadow-xs';
      default:
        return 'bg-slate-800 text-white';
    }
  };

  const handleStatusChange = async (woId: string, newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      await api.updateWorkOrderStatus(woId, newStatus, 'Maintenance Supervisor');
      if (selectedWODetail && selectedWODetail.workOrder.id === woId) {
        setSelectedWODetail({
          ...selectedWODetail,
          workOrder: { ...selectedWODetail.workOrder, status: newStatus as any }
        });
      }
      setStatusToast(`Status Work Order berhasil diubah ke: ${newStatus}`);
      setTimeout(() => setStatusToast(null), 3500);
      loadData(true);
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status work order');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportCSV = () => {
    const rows = workOrders.map((w) => ({
      WO_Number: w.wo_number,
      Date: w.request_date,
      Plant: w.plant_name,
      Asset: w.asset_name || 'General Facility',
      Type: w.wo_type,
      Problem: w.problem_description,
      Priority: w.priority,
      Technician: w.tech_name || 'Unassigned',
      Status: w.status,
      Labor_Hours: w.labor_hours,
      Actual_Cost_IDR: w.actual_cost
    }));
    exportToCSV(`PT_NA_Work_Orders_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const kanbanColumns = ['Open', 'In Progress', 'Waiting for Parts', 'Testing', 'Completed', 'Closed'];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {statusToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4 border border-slate-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-700" />
            Work Order Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end job control, technician labor allocation, spare parts requisition, and sign-off verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create Work Order
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Status:</span>
          {['all', 'Open', 'In Progress', 'Waiting for Parts', 'Completed', 'Closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                statusFilter === st ? 'bg-blue-900 text-white font-semibold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="Preventive Maintenance">Preventive Maintenance</option>
            <option value="Corrective Maintenance">Corrective Maintenance</option>
            <option value="Emergency Breakdown">Emergency Breakdown</option>
            <option value="Facility Repair">Facility Repair</option>
            <option value="Improvement / Kaizen">Improvement / Kaizen</option>
          </select>
        </div>
      </div>

      {/* View Mode: List vs Kanban */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">WO Number</th>
                  <th className="py-3 px-4">Equipment / Plant</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Problem Description</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned Squad (Manpower)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actual Cost</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No work orders found.
                    </td>
                  </tr>
                ) : (
                  workOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">
                        {wo.wo_number}
                        <div className="text-[10px] text-slate-400 font-normal">{wo.request_date}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{wo.asset_name || 'Facility Utility'}</div>
                        <div className="text-[11px] text-slate-500">{wo.plant_name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">{wo.wo_type}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-700">
                        {wo.problem_description}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          wo.priority === 'Critical' ? 'bg-red-600 text-white' :
                          wo.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <ManpowerBadgeList
                          technicians={wo.assigned_technicians}
                          leadTechName={wo.tech_name}
                          supportingManpower={wo.supporting_manpower}
                          onManageClick={() => setManpowerModalWO(wo)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1.5 min-w-[130px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadgeClasses(wo.status)}`}>
                              {wo.status}
                            </span>
                            <select
                              value={wo.status}
                              disabled={isUpdatingStatus}
                              onChange={(e) => handleStatusChange(wo.id, e.target.value)}
                              className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-blue-400 focus:outline-none cursor-pointer"
                              title="Pilih status baru"
                            >
                              {kanbanColumns.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                          {/* Quick single-click status action buttons */}
                          <div className="flex items-center gap-1">
                            {wo.status === 'Open' && (
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleStatusChange(wo.id, 'In Progress')}
                                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                title="Mulai kerjakan (Set to In Progress)"
                              >
                                <Play className="w-2.5 h-2.5" />
                                <span>In Progress</span>
                              </button>
                            )}
                            {wo.status === 'In Progress' && (
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleStatusChange(wo.id, 'Completed')}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                title="Selesaikan pekerjaan (Set to Completed)"
                              >
                                <Check className="w-2.5 h-2.5" />
                                <span>Complete</span>
                              </button>
                            )}
                            {wo.status === 'Completed' && (
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleStatusChange(wo.id, 'Closed')}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                title="Tutup work order (Set to Closed)"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Close</span>
                              </button>
                            )}
                            {wo.status === 'Closed' && (
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleStatusChange(wo.id, 'Open')}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                                title="Buka kembali (Reopen)"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Reopen</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatIDR(wo.actual_cost)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openDetail(wo.id, 'evidence')}
                          className={`p-1 rounded transition-colors inline-flex items-center gap-1 text-[11px] font-bold ${
                            (wo.evidence_count || 0) > 0
                              ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                              : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                          }`}
                          title={`${wo.evidence_count || 0} Foto Evidence (Klik untuk lihat/unggah)`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {(wo.evidence_count || 0) > 0 && <span>{wo.evidence_count}</span>}
                        </button>
                        <button
                          onClick={() => openDetail(wo.id)}
                          className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                          title="View Details & Parts"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPrintableWO(wo)}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                          title="Print Work Order Voucher"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setWoToDelete(wo)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Hapus Work Order (Delete)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kanbanColumns.map((col) => {
            const columnOrders = workOrders.filter((wo) => wo.status === col);
            return (
              <div key={col} className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/80 flex flex-col h-[700px]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">{col}</span>
                  <span className="font-mono text-xs bg-white px-2 py-0.5 rounded-full font-bold text-slate-700 shadow-2xs">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {columnOrders.map((wo) => (
                    <div
                      key={wo.id}
                      onClick={() => openDetail(wo.id)}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-blue-400 cursor-pointer transition-all space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-blue-900">{wo.wo_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          wo.priority === 'Critical' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {wo.priority}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 line-clamp-2">{wo.problem_description}</p>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="truncate">{wo.asset_name || wo.plant_name}</span>
                        <span className="font-mono">{formatIDR(wo.actual_cost)}</span>
                      </div>
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <ManpowerBadgeList
                          technicians={wo.assigned_technicians}
                          leadTechName={wo.tech_name}
                          supportingManpower={wo.supporting_manpower}
                          onManageClick={() => setManpowerModalWO(wo)}
                        />
                      </div>

                      {/* Fast status switch buttons on Kanban card */}
                      <div className="pt-2 flex items-center justify-between gap-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] font-medium text-slate-400">Pindah:</span>
                        <div className="flex items-center gap-1">
                          {col === 'Open' && (
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => handleStatusChange(wo.id, 'In Progress')}
                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                              title="Pindahkan ke In Progress"
                            >
                              <Play className="w-2.5 h-2.5" />
                              <span>Mulai</span>
                            </button>
                          )}
                          {col === 'In Progress' && (
                            <>
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleStatusChange(wo.id, 'Waiting for Parts')}
                                className="px-1.5 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold transition-colors"
                                title="Menunggu Spare Part"
                              >
                                Parts
                              </button>
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => handleStatusChange(wo.id, 'Completed')}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                                title="Pindahkan ke Completed"
                              >
                                <Check className="w-2.5 h-2.5" />
                                <span>Selesai</span>
                              </button>
                            </>
                          )}
                          {col === 'Waiting for Parts' && (
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => handleStatusChange(wo.id, 'In Progress')}
                              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                              title="Lanjutkan perbaikan (In Progress)"
                            >
                              <Play className="w-2.5 h-2.5" />
                              <span>Resume</span>
                            </button>
                          )}
                          {col === 'Testing' && (
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => handleStatusChange(wo.id, 'Completed')}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                              title="Pindahkan ke Completed"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>Selesai</span>
                            </button>
                          )}
                          {col === 'Completed' && (
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => handleStatusChange(wo.id, 'Closed')}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                              title="Tutup Work Order (Closed)"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Tutup</span>
                            </button>
                          )}
                          {col === 'Closed' && (
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => handleStatusChange(wo.id, 'Open')}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                              title="Buka kembali (Open)"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Reopen</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Work Order Detail Drawer / Modal with Parts Allocation and Labor Logging */}
      {selectedWODetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="font-mono font-bold text-xs text-blue-900 uppercase">
                  {selectedWODetail.workOrder.wo_number}
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                  Work Order Execution Console
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWoToDelete(selectedWODetail.workOrder)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                  title="Hapus Work Order Ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
                <button onClick={() => setSelectedWODetail(null)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Status Quick Action Buttons Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusBadgeClasses(selectedWODetail.workOrder.status)}`}>
                  {selectedWODetail.workOrder.status}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-600 mr-1">Ubah Status (Change Status):</span>
                {kanbanColumns.map((st) => {
                  const isActive = selectedWODetail.workOrder.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleStatusChange(selectedWODetail.workOrder.id, st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isActive
                          ? getActiveStatusButtonClasses(st)
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                      } ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isActive && <Check className="w-3.5 h-3.5" />}
                      {st === 'Open' && !isActive && <Clock className="w-3.5 h-3.5 text-blue-600" />}
                      {st === 'In Progress' && !isActive && <Play className="w-3.5 h-3.5 text-amber-600" />}
                      {st === 'Completed' && !isActive && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                      {st === 'Closed' && !isActive && <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />}
                      {st === 'Waiting for Parts' && !isActive && <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />}
                      <span>{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-3 px-6 pt-3 border-b border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setDetailTab('info')}
                className={`pb-2.5 transition-colors border-b-2 ${
                  detailTab === 'info' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Work Scope &amp; Info
              </button>
              <button
                onClick={() => setDetailTab('parts')}
                className={`pb-2.5 transition-colors border-b-2 ${
                  detailTab === 'parts' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Spare Parts ({selectedWODetail.parts.length})
              </button>
              <button
                onClick={() => setDetailTab('labor')}
                className={`pb-2.5 transition-colors border-b-2 ${
                  detailTab === 'labor' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Labor &amp; Hours ({selectedWODetail.labor.length})
              </button>
              <button
                onClick={() => setDetailTab('evidence')}
                className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                  detailTab === 'evidence' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Foto &amp; Evidence ({selectedWODetail.workOrder.evidence_count || selectedWODetail.evidences?.length || 0})</span>
              </button>
            </div>

            <div className="p-6 text-xs space-y-4">
              {detailTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block">Equipment</span>
                      <span className="font-bold text-slate-900">{selectedWODetail.workOrder.asset_name || 'Facility'} ({selectedWODetail.workOrder.asset_tag || '-'})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Plant Facility</span>
                      <span className="font-semibold text-slate-900">{selectedWODetail.workOrder.plant_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Actual Cost Accumulated</span>
                      <span className="font-mono font-bold text-blue-900">{formatIDR(selectedWODetail.workOrder.actual_cost)}</span>
                    </div>

                    <div className="col-span-2 p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <span className="text-slate-500 block text-[11px] font-bold uppercase tracking-wider mb-1">
                          Assigned Technician Squad (Manpower)
                        </span>
                        <ManpowerBadgeList
                          technicians={selectedWODetail.workOrder.assigned_technicians}
                          leadTechName={selectedWODetail.workOrder.tech_name}
                          supportingManpower={selectedWODetail.workOrder.supporting_manpower}
                          onManageClick={() => setManpowerModalWO(selectedWODetail.workOrder)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setManpowerModalWO(selectedWODetail.workOrder)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-center shadow-2xs cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Manage Squad</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block mb-1">Problem Description</span>
                    <p className="p-3 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium">
                      {selectedWODetail.workOrder.problem_description}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-800 block mb-1">Safety &amp; LOTO Precautions</span>
                    <p className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                      {selectedWODetail.workOrder.safety_precautions || 'Standard K3 safety gear mandatory.'}
                    </p>
                  </div>
                </div>
              )}

              {detailTab === 'parts' && (
                <div className="space-y-4">
                  {/* Issue New Part Form */}
                  <form onSubmit={handleIssuePart} className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                    <span className="font-bold text-blue-950 block">Requisition &amp; Issue Part from Warehouse</span>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-[11px] font-semibold text-blue-900 block mb-1">Select Spare Part</label>
                        <select
                          required
                          value={issuePartId}
                          onChange={(e) => setIssuePartId(e.target.value)}
                          className="w-full p-2 bg-white border border-blue-200 rounded text-xs focus:outline-none"
                        >
                          <option value="">Select Part from Stock</option>
                          {spareParts.map((p) => (
                            <option key={p.id} value={p.id} disabled={p.current_stock <= 0}>
                              {p.part_number} · {p.name} (Stock: {p.current_stock} {p.uom} - {formatIDR(p.average_cost)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-blue-900 block mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={issueQty}
                          onChange={(e) => setIssueQty(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded text-xs font-mono"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isIssuingPart || !issuePartId}
                      className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isIssuingPart ? 'Deducting Stock...' : 'Issue to Work Order'}
                    </button>
                  </form>

                  {/* List of Issued Parts */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 block">Issued Parts Ledger</span>
                    {selectedWODetail.parts.length === 0 ? (
                      <p className="p-3 text-slate-400 bg-slate-50 rounded-lg">No parts charged to this work order.</p>
                    ) : (
                      selectedWODetail.parts.map((p: any) => (
                        <div key={p.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-slate-900">{p.part_number}</span>
                            <p className="font-semibold text-slate-800">{p.part_name}</p>
                            <span className="text-[11px] text-slate-500">Issued by: {p.issued_by}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 block">
                              {p.quantity} {p.uom} × {formatIDR(p.unit_cost)}
                            </span>
                            <span className="font-mono font-bold text-blue-700 text-xs">
                              {formatIDR(p.total_cost)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {detailTab === 'labor' && (
                <div className="space-y-4">
                  {/* Add Labor Form */}
                  <form onSubmit={handleAddLabor} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <span className="font-bold text-slate-900 block">Log Technician Manpower</span>

                    {selectedWODetail.workOrder.assigned_technicians && selectedWODetail.workOrder.assigned_technicians.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap p-2 bg-blue-50/60 border border-blue-100 rounded-lg">
                        <span className="text-[10px] font-bold text-blue-900">Quick-select assigned crew member:</span>
                        {selectedWODetail.workOrder.assigned_technicians.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setLaborTechId(t.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                              laborTechId === t.id
                                ? 'bg-blue-700 text-white shadow-2xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                            }`}
                          >
                            {t.role === 'Lead' && <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
                            <span>{t.name} ({t.role})</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Technician</label>
                        <select
                          required
                          value={laborTechId}
                          onChange={(e) => setLaborTechId(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:outline-none"
                        >
                          <option value="">Choose Tech</option>
                          {technicians.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.skill_category})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Hours Spent</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          required
                          value={laborHours}
                          onChange={(e) => setLaborHours(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Work Done</label>
                        <input
                          type="text"
                          placeholder="e.g. Rewired solenoid"
                          value={laborNotes}
                          onChange={(e) => setLaborNotes(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingLabor || !laborTechId}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {isAddingLabor ? 'Logging...' : 'Log Labor Hours'}
                    </button>
                  </form>

                  {/* List of Labor entries */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 block">Logged Manpower Hours</span>
                    {selectedWODetail.labor.length === 0 ? (
                      <p className="p-3 text-slate-400 bg-slate-50 rounded-lg">No technician labor entries logged.</p>
                    ) : (
                      selectedWODetail.labor.map((l: any) => (
                        <div key={l.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900">{l.tech_name}</span>
                            <span className="text-[11px] text-slate-500 ml-2">({l.skill_category})</span>
                            <p className="text-[11px] text-slate-600 mt-0.5">{l.notes || 'Routine maintenance work'}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 block">{l.hours} Hours</span>
                            <span className="font-mono text-slate-600 text-[11px]">{formatIDR(l.total_labor_cost)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {detailTab === 'evidence' && (
                <div className="pt-1">
                  <EvidenceGallery
                    activityType="work_order"
                    activityId={selectedWODetail.workOrder.id}
                    activityCode={selectedWODetail.workOrder.wo_number}
                    currentUserName="Maintenance Supervisor"
                    onCountChange={(count) => {
                      setSelectedWODetail((prev) => prev ? {
                        ...prev,
                        workOrder: { ...prev.workOrder, evidence_count: count }
                      } : null);
                      setWorkOrders((prev) => prev.map((w) => w.id === selectedWODetail.workOrder.id ? { ...w, evidence_count: count } : w));
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Printable Work Order Voucher Modal */}
      {printableWO && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl p-8 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-300 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase">PT NATIONAL ASSEMBLERS</h2>
                <h3 className="text-xs font-bold text-blue-900 uppercase">MAINTENANCE MANAGEMENT SYSTEM · WORK ORDER VOUCHER</h3>
                <span className="text-[11px] text-slate-500 font-mono">Issued: {printableWO.request_date}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-base font-extrabold text-blue-950 block">{printableWO.wo_number}</span>
                <span className="text-xs bg-slate-100 font-bold px-2 py-0.5 rounded">{printableWO.wo_type}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border p-3 rounded">
                <span className="text-slate-500 block font-semibold">Equipment / Target:</span>
                <span className="font-bold text-slate-900">{printableWO.asset_name || 'General Plant'}</span>
                <span className="block text-[11px] font-mono text-slate-600">{printableWO.asset_tag}</span>
              </div>
              <div className="border p-3 rounded">
                <span className="text-slate-500 block font-semibold">Plant / Area:</span>
                <span className="font-bold text-slate-900">{printableWO.plant_name}</span>
                <span className="block text-[11px] text-slate-600">{printableWO.location || 'Production Floor'}</span>
              </div>
              <div className="col-span-2 border p-3 rounded bg-slate-50">
                <span className="text-slate-500 block font-semibold">Scope of Maintenance Work:</span>
                <p className="font-medium text-slate-900 mt-1">{printableWO.problem_description}</p>
              </div>
              <div className="col-span-2 border p-3 rounded bg-amber-50/50">
                <span className="text-amber-900 block font-semibold">Safety Precautions &amp; LOTO:</span>
                <p className="text-amber-950 mt-1">{printableWO.safety_precautions || 'Standard PPE mandatory.'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-xs pt-4 border-t border-slate-200">
              <div className="h-20 flex flex-col justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Requester</span>
                <span className="font-bold text-slate-800">{printableWO.requester}</span>
              </div>
              <div className="h-20 flex flex-col justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Assigned Squad (Manpower)</span>
                <span className="font-bold text-slate-800 text-[11px] truncate" title={printableWO.tech_names || printableWO.tech_name}>
                  {printableWO.tech_names || printableWO.tech_name || 'Marsino'}
                </span>
              </div>
              <div className="h-20 flex flex-col justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Supervisor Sign-off</span>
                <span className="font-bold text-slate-800">{printableWO.verified_by || 'Warto'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPrintableWO(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Create New Work Order</h2>
                <p className="text-[11px] text-slate-500">Dispatch and schedule maintenance tasks with multi-manpower squad</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Work Order Type *</label>
                    <select
                      value={newWOType}
                      onChange={(e) => setNewWOType(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    >
                      <option value="Corrective Maintenance">Corrective Maintenance</option>
                      <option value="Preventive Maintenance">Preventive Maintenance</option>
                      <option value="Emergency Breakdown">Emergency Breakdown</option>
                      <option value="Facility Repair">Facility Repair</option>
                      <option value="Utility Maintenance">Utility Maintenance</option>
                      <option value="Improvement / Kaizen">Improvement / Kaizen</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Priority</label>
                    <select
                      value={newWOPriority}
                      onChange={(e) => setNewWOPriority(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Equipment</label>
                  <select
                    value={newWOAssetId}
                    onChange={(e) => setNewWOAssetId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="">General Facility / Non-Asset Specific</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.asset_tag} - {a.name} ({a.plant_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Problem / Task Scope *</label>
                  <textarea
                    rows={3}
                    required
                    value={newWODesc}
                    onChange={(e) => setNewWODesc(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    placeholder="Detail the defect or work requested"
                  />
                </div>

                {/* Multi-Technician Manpower Squad Selection */}
                <MultiTechnicianPicker
                  technicians={technicians}
                  leadTechId={newWOTechId}
                  onLeadTechChange={setNewWOTechId}
                  supportingTechIds={newWOSupportingIds}
                  onSupportingTechsChange={setNewWOSupportingIds}
                  label="Technician Squad Assignment (Multi-Manpower)"
                  description="Designate 1 Lead Technician and assign supporting crew members if this job requires teamwork."
                />

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Safety Measures &amp; LOTO</label>
                  <input
                    type="text"
                    value={newWOSafety}
                    onChange={(e) => setNewWOSafety(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
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
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Creating...' : 'Dispatch Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(woToDelete)}
        title="Delete Work Order"
        itemType="Work Order"
        itemName={woToDelete ? `[${woToDelete.wo_number}] ${woToDelete.problem_description}` : ''}
        warningText="This work order along with all parts requisition records and assigned technician allocations will be permanently removed."
        isDeleting={isDeleting}
        onConfirm={handleDeleteWO}
        onCancel={() => setWoToDelete(null)}
      />

      {/* Fast Multi-Manpower Assignment Modal */}
      {manpowerModalWO && (
        <ManpowerAssignmentModal
          isOpen={Boolean(manpowerModalWO)}
          onClose={() => setManpowerModalWO(null)}
          caseType="work_order"
          caseId={manpowerModalWO.id}
          caseTitle={manpowerModalWO.problem_description}
          caseNumber={manpowerModalWO.wo_number}
          currentLeadId={manpowerModalWO.assigned_tech_id}
          currentSupporting={manpowerModalWO.supporting_manpower}
          technicians={technicians}
          onSaved={() => {
            loadData();
            if (selectedWODetail && selectedWODetail.workOrder.id === manpowerModalWO.id) {
              openDetail(manpowerModalWO.id);
            }
          }}
        />
      )}
    </div>
  );
};

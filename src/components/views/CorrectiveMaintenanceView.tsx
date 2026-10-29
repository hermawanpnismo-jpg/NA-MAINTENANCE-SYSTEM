import React, { useEffect, useState } from 'react';
import {
  Wrench, Plus, CheckCircle2, AlertTriangle, Clock, ArrowRight, Eye, Trash2
} from 'lucide-react';
import { WorkOrder, Plant } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatIDR, formatDate } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { ManpowerBadgeList } from '../common/ManpowerBadgeList.tsx';
import { realtime } from '../../lib/realtime.ts';

interface CorrectiveMaintenanceViewProps {
  selectedPlant: string;
  plants: Plant[];
  onOpenWorkOrder?: (woId: string) => void;
}

export const CorrectiveMaintenanceView: React.FC<CorrectiveMaintenanceViewProps> = ({
  selectedPlant,
  plants,
  onOpenWorkOrder
}) => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete State
  const [woToDelete, setWoToDelete] = useState<WorkOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteWO = async () => {
    if (!woToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await api.deleteWorkOrder(woToDelete.id, 'Maintenance Manager');
      setWoToDelete(null);
      loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete corrective work order');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.getWorkOrders({
        plant: selectedPlant,
        type: 'Corrective Maintenance'
      });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Instant real-time background sync when ANY PC creates/modifies corrective work orders
    const unsubscribe = realtime.subscribe(() => {
      loadData(true);
    });

    return () => unsubscribe();
  }, [selectedPlant]);

  const activeCount = orders.filter((o) => o.status !== 'Completed' && o.status !== 'Closed').length;
  const completedCount = orders.filter((o) => o.status === 'Completed' || o.status === 'Closed').length;
  const totalCost = orders.reduce((sum, o) => sum + o.actual_cost, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-600" />
            Corrective Maintenance (CM) Operations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Planned remedial maintenance, defect rectifications identified during PM inspections, and component replacements.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Active Corrective Tasks</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">{activeCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Completed Remedials</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">{completedCount}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block">Total Corrective Cost</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-blue-900">{formatIDR(totalCost)}</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">WO Number</th>
                <th className="py-3 px-4">Equipment / Tag</th>
                <th className="py-3 px-4">Plant Facility</th>
                <th className="py-3 px-4">Defect Description</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assigned Squad (Manpower)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actual Cost (IDR)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No corrective maintenance jobs currently logged.
                  </td>
                </tr>
              ) : (
                orders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">{wo.wo_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{wo.asset_name || 'General Equipment'}</td>
                    <td className="py-3 px-4 text-slate-700">{wo.plant_name}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-sm">{wo.problem_description}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                        {wo.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <ManpowerBadgeList
                        technicians={wo.assigned_technicians}
                        leadTechName={wo.tech_name}
                        supportingManpower={wo.supporting_manpower}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {wo.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatIDR(wo.actual_cost)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setWoToDelete(wo)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete Corrective WO"
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(woToDelete)}
        title="Delete Corrective Work Order"
        itemType="Work Order"
        itemName={woToDelete ? `[${woToDelete.wo_number}] ${woToDelete.asset_name || woToDelete.problem_description}` : ''}
        warningText="This corrective work order and all associated maintenance execution records will be permanently removed."
        isDeleting={isDeleting}
        onConfirm={handleDeleteWO}
        onCancel={() => setWoToDelete(null)}
      />
    </div>
  );
};

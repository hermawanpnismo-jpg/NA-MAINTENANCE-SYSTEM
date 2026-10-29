import React, { useEffect, useState } from 'react';
import {
  BadgeDollarSign, TrendingUp, TrendingDown, DollarSign, Download,
  Filter, Calendar, PieChart, Trash2
} from 'lucide-react';
import { MaintenanceBudget, Plant } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatIDR, exportToCSV } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { realtime } from '../../lib/realtime.ts';

interface MaintenanceCostBudgetViewProps {
  selectedPlant: string;
  plants: Plant[];
}

export const MaintenanceCostBudgetView: React.FC<MaintenanceCostBudgetViewProps> = ({
  selectedPlant,
  plants
}) => {
  const [budgets, setBudgets] = useState<MaintenanceBudget[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete State
  const [budgetToDelete, setBudgetToDelete] = useState<MaintenanceBudget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteMaintenanceBudget(budgetToDelete.id, 'Finance Officer');
      setBudgetToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus pos anggaran');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.getMaintenanceBudgets();
      setBudgets(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Instant real-time background sync when ANY PC updates financial budgets
    const unsubscribe = realtime.subscribe(() => {
      loadData(true);
    });

    return () => unsubscribe();
  }, [selectedPlant]);

  const filteredBudgets = budgets.filter((b) => {
    if (selectedPlant !== 'all' && b.plant_id !== selectedPlant) return false;
    return true;
  });

  const totalBudget = filteredBudgets.reduce((sum, b) => sum + b.budget_amount, 0);
  const totalActual = filteredBudgets.reduce((sum, b) => sum + b.actual_cost, 0);
  const totalVariance = totalBudget - totalActual;
  const isUnderBudget = totalVariance >= 0;

  const handleExportCSV = () => {
    const rows = filteredBudgets.map((b) => ({
      Fiscal_Year: b.fiscal_year,
      Month: b.month,
      Plant: b.plant_name,
      Category: b.category,
      Budget_Amount_IDR: b.budget_amount,
      Actual_Cost_IDR: b.actual_cost,
      Variance_IDR: b.budget_amount - b.actual_cost,
      Status: b.actual_cost <= b.budget_amount ? 'Under Budget' : 'Over Budget'
    }));
    exportToCSV(`PT_NA_Maintenance_Budget_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BadgeDollarSign className="w-6 h-6 text-blue-700" />
            Maintenance Cost Control &amp; Budgeting
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Departmental OPEX tracking, PM vs CM expenditure breakdown, vendor contracts, and variance analysis in Indonesian Rupiah (IDR).
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Export Budget Ledger
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Total Approved Budget (Oct 2026)</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 block truncate">
            {formatIDR(totalBudget)}
          </span>
          <span className="text-[11px] text-slate-400">Monthly authorized OPEX</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-slate-500 block">Total Actual Maintenance Cost</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-blue-900 block truncate">
            {formatIDR(totalActual)}
          </span>
          <span className="text-[11px] text-slate-400">Direct parts, labor &amp; external vendors</span>
        </div>

        <div className={`p-5 rounded-xl border shadow-xs space-y-1 ${
          isUnderBudget ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">Budget Variance</span>
            {isUnderBudget ? (
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingUp className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <span className={`text-2xl font-bold font-mono tabular-nums block truncate ${
            isUnderBudget ? 'text-emerald-800' : 'text-rose-800'
          }`}>
            {formatIDR(Math.abs(totalVariance))} {isUnderBudget ? 'Under' : 'Over'}
          </span>
          <span className="text-[11px] text-slate-500">
            {isUnderBudget ? 'Within planned fiscal expenditure' : 'Exceeds budget envelope'}
          </span>
        </div>
      </div>

      {/* Budget Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Cost Center &amp; Category Ledger</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Plant Facility</th>
                <th className="py-3 px-4">Fiscal Period</th>
                <th className="py-3 px-4">Maintenance Category</th>
                <th className="py-3 px-4 text-right">Planned Budget (IDR)</th>
                <th className="py-3 px-4 text-right">Actual Cost (IDR)</th>
                <th className="py-3 px-4 text-right">Variance (IDR)</th>
                <th className="py-3 px-4 text-center">Utilization</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBudgets.map((b) => {
                const variance = b.budget_amount - b.actual_cost;
                const utilization = Math.round((b.actual_cost / Math.max(1, b.budget_amount)) * 100);
                const isOver = utilization > 100;

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{b.plant_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{b.fiscal_year} - M{b.month}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{b.category}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {formatIDR(b.budget_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatIDR(b.actual_cost)}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatIDR(variance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isOver ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {utilization}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{b.notes || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setBudgetToDelete(b)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Hapus Pos Anggaran (Delete)"
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(budgetToDelete)}
        title="Hapus Pos Anggaran Pemeliharaan"
        itemType="Alokasi Anggaran"
        itemName={budgetToDelete ? `[${budgetToDelete.plant_name}] ${budgetToDelete.category} (${budgetToDelete.fiscal_year}-M${budgetToDelete.month})` : ''}
        warningText="Pos alokasi anggaran OPEX pemeliharaan ini akan dihapus dari buku besar biaya."
        isDeleting={isDeleting}
        onConfirm={handleDeleteBudget}
        onCancel={() => setBudgetToDelete(null)}
      />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Boxes, Plus, Search, Filter, AlertTriangle, ArrowDownRight,
  ArrowUpRight, Download, RefreshCw, X, Save, DollarSign, Archive, Trash2,
  Clock, ArrowRightLeft, Layers, CheckCircle2, ChevronRight, SlidersHorizontal,
  Package, MapPin, Wrench
} from 'lucide-react';
import { SparePart, InventoryTransaction } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import {
  formatIDR,
  formatDate,
  formatDateTime,
  getOnlineDateTimeInputWIB,
  exportToCSV
} from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { realtime } from '../../lib/realtime.ts';

export type InventoryTxnType =
  | 'Goods Receipt'
  | 'Stock Out'
  | 'Stock Adjustment - Add'
  | 'Stock Adjustment - Deduct'
  | 'Stock Adjustment - Set'
  | 'Return';

export const SparePartsInventoryView: React.FC = () => {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions'>('inventory');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all');

  // Transaction Modal State (In, Out, Adjust, Return)
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [txnType, setTxnType] = useState<InventoryTxnType>('Goods Receipt');
  const [txnQty, setTxnQty] = useState(1);
  const [txnUnitCost, setTxnUnitCost] = useState(0);
  const [txnDateTime, setTxnDateTime] = useState('');
  const [txnRef, setTxnRef] = useState('');
  const [txnRemarks, setTxnRemarks] = useState('');
  const [isSubmittingTxn, setIsSubmittingTxn] = useState(false);

  // Delete State
  const [partToDelete, setPartToDelete] = useState<SparePart | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePart = async () => {
    if (!partToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteSparePart(partToDelete.id, 'Storekeeper');
      setPartToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete spare part');
    } finally {
      setIsDeleting(false);
    }
  };

  // New Part Registration Modal
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [newPart, setNewPart] = useState({
    part_number: '',
    name: '',
    specification: '',
    category: 'Mechanical',
    compatible_equipment: '',
    uom: 'PCS',
    warehouse_location: '',
    min_stock: 5,
    max_stock: 50,
    reorder_point: 10,
    current_stock: 0,
    average_cost: 0,
    preferred_vendor: '',
    lead_time_days: 7
  });

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [partList, txnList] = await Promise.all([
        api.getSpareParts({ category: categoryFilter, search }),
        api.getInventoryTransactions()
      ]);
      setParts(partList);
      setTransactions(txnList);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Instant real-time background sync when ANY PC issues or receives spare parts
    const unsubscribe = realtime.subscribe(() => {
      loadData(true);
    });

    return () => unsubscribe();
  }, [categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openTxnModal = (part: SparePart, defaultType: InventoryTxnType = 'Goods Receipt') => {
    setSelectedPart(part);
    setTxnType(defaultType);
    setTxnQty(defaultType === 'Stock Adjustment - Set' ? part.current_stock : 1);
    setTxnUnitCost(part.average_cost);
    setTxnDateTime(getOnlineDateTimeInputWIB());

    if (defaultType === 'Goods Receipt') {
      setTxnRef('PO-NA-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900));
    } else if (defaultType === 'Stock Out') {
      setTxnRef('REQ-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900));
    } else if (defaultType.startsWith('Stock Adjustment')) {
      setTxnRef('ADJ-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900));
    } else {
      setTxnRef('RET-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900));
    }
    setTxnRemarks('');
    setShowTxnModal(true);
  };

  // Projected Balance Calculator
  const getProjectedBalance = () => {
    if (!selectedPart) return { current: 0, projected: 0, delta: 0, isValid: true, errorMsg: '' };
    const current = Number(selectedPart.current_stock) || 0;
    const qty = Number(txnQty) || 0;

    if (txnType === 'Goods Receipt' || txnType === 'Return' || txnType === 'Stock Adjustment - Add') {
      const projected = current + qty;
      return {
        current,
        projected,
        delta: qty,
        isValid: qty > 0,
        errorMsg: qty <= 0 ? 'Quantity must be greater than 0' : ''
      };
    }

    if (txnType === 'Stock Out' || txnType === 'Stock Adjustment - Deduct') {
      const projected = current - qty;
      const isOver = qty > current;
      return {
        current,
        projected: isOver ? current : projected,
        delta: -qty,
        isValid: qty > 0 && !isOver,
        errorMsg: qty <= 0
          ? 'Quantity must be greater than 0'
          : isOver
          ? `Insufficient stock. Current available stock is only ${current} ${selectedPart.uom}`
          : ''
      };
    }

    if (txnType === 'Stock Adjustment - Set') {
      const delta = qty - current;
      return {
        current,
        projected: qty,
        delta,
        isValid: qty >= 0,
        errorMsg: qty < 0 ? 'Counted physical stock cannot be negative' : ''
      };
    }

    return { current, projected: current, delta: 0, isValid: true, errorMsg: '' };
  };

  const projected = getProjectedBalance();

  const handleExecuteTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !projected.isValid) return;

    try {
      setIsSubmittingTxn(true);
      await api.recordPartTransaction({
        part_id: selectedPart.id,
        transaction_type: txnType,
        quantity: txnQty,
        unit_cost: txnUnitCost,
        reference_number: txnRef,
        remarks: txnRemarks,
        transaction_date: txnDateTime ? txnDateTime.replace('T', ' ') : undefined,
        user_name: 'Joko Susilo (Storekeeper)'
      });

      setShowTxnModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Inventory transaction failed');
    } finally {
      setIsSubmittingTxn(false);
    }
  };

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSparePart({
        ...newPart,
        user_name: 'Storekeeper'
      });
      setShowAddPartModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to register spare part');
    }
  };

  const handleExportCSV = () => {
    const rows = parts.map((p) => ({
      Part_Number: p.part_number,
      Name: p.name,
      Category: p.category,
      UOM: p.uom,
      Location: p.warehouse_location,
      Current_Stock: p.current_stock,
      Reserved: p.reserved_stock,
      Available: p.current_stock - p.reserved_stock,
      Min_Stock: p.min_stock,
      Reorder_Point: p.reorder_point,
      Average_Cost_IDR: p.average_cost,
      Total_Valuation_IDR: p.current_stock * p.average_cost,
      Vendor: p.preferred_vendor || '-'
    }));
    exportToCSV(`PT_NA_Spare_Parts_Stock_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const handleExportLedgerCSV = () => {
    const rows = filteredTransactions.map((t) => ({
      Transaction_Code: t.transaction_code,
      Date_Time: t.transaction_date,
      Part_Number: t.part_number,
      Part_Name: t.part_name,
      Type: t.transaction_type,
      Qty: t.quantity,
      UOM: t.uom,
      Balance_Before: t.balance_before,
      Balance_After: t.balance_after,
      Unit_Cost_IDR: t.unit_cost,
      Total_Cost_IDR: t.total_cost,
      Reference: t.reference_number || '-',
      Operator: t.performed_by,
      Remarks: t.remarks || '-'
    }));
    exportToCSV(`PT_NA_Inventory_Ledger_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const lowStockCount = parts.filter((p) => p.current_stock <= p.reorder_point).length;
  const totalValuation = parts.reduce((sum, p) => sum + p.current_stock * p.average_cost, 0);

  const filteredTransactions = transactions.filter((t) => {
    if (ledgerTypeFilter === 'all') return true;
    if (ledgerTypeFilter === 'in') return t.transaction_type === 'Goods Receipt' || t.transaction_type === 'Stock In';
    if (ledgerTypeFilter === 'out') return t.transaction_type === 'Stock Out' || t.transaction_type === 'Issue to Work Order';
    if (ledgerTypeFilter === 'adjust') return t.transaction_type.startsWith('Stock Adjustment');
    if (ledgerTypeFilter === 'return') return t.transaction_type === 'Return';
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto min-w-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-700 shrink-0" />
            <span>Spare Parts &amp; Inventory Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Warehouse stock in/out control, auto-updating balance stock, adjustments, valuation, and transaction ledgers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={activeTab === 'inventory' ? handleExportCSV : handleExportLedgerCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{activeTab === 'inventory' ? 'Export Catalog' : 'Export Ledger'}</span>
          </button>
          <button
            onClick={() => setShowAddPartModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Part Master</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block">Total Catalog Items</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
            {parts.length} <span className="text-xs font-normal text-slate-400">SKUs</span>
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block">Low Stock / Reorder Trigger</span>
          <span className={`text-2xl font-bold font-mono tabular-nums mt-1 block ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {lowStockCount} <span className="text-xs font-normal text-slate-400">items</span>
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs sm:col-span-2">
          <span className="text-xs font-medium text-slate-500 block">Total Inventory Valuation</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-blue-900 truncate block mt-1">
            {formatIDR(totalValuation)}
          </span>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-6 text-xs font-semibold min-w-max">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'inventory' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Current Stock Balances</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'transactions' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transaction Ledger (In / Out / Adjust) ({transactions.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search part number, description, compatible machine..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </form>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:bg-white cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Electrical">Electrical</option>
                <option value="Pneumatic">Pneumatic</option>
                <option value="Hydraulic">Hydraulic</option>
                <option value="Consumable">Consumable</option>
                <option value="Lubricant">Lubricant</option>
              </select>
            </div>
          </div>

          {/* Parts Catalog Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs text-left min-w-[1000px]">
                <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Part Number</th>
                    <th className="py-3 px-4">Description / Part Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Storage Location</th>
                    <th className="py-3 px-4 text-right">Stock Balance</th>
                    <th className="py-3 px-4 text-right">Reorder Point</th>
                    <th className="py-3 px-4 text-right">Average Cost</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Stock Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No spare parts found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    parts.map((p) => {
                      const isLow = p.current_stock <= p.reorder_point;
                      const isOut = p.current_stock <= 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                            {p.part_number}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{p.specification || '-'}</div>
                            {p.compatible_equipment && (
                              <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                                Machine: {p.compatible_equipment}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{p.category}</td>
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {p.warehouse_location}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className={`font-mono font-extrabold text-sm ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                              {p.current_stock}
                            </span>{' '}
                            <span className="text-[11px] text-slate-500 font-medium">{p.uom}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                            {p.reorder_point} {p.uom}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-800 whitespace-nowrap">
                            {formatIDR(p.average_cost)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-blue-900 whitespace-nowrap">
                            {formatIDR(p.current_stock * p.average_cost)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isOut ? (
                              <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                Adequate
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick IN Button */}
                              <button
                                onClick={() => openTxnModal(p, 'Goods Receipt')}
                                title="Receive Stock (Stock In)"
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                                <span>+ In</span>
                              </button>

                              {/* Quick OUT Button */}
                              <button
                                onClick={() => openTxnModal(p, 'Stock Out')}
                                disabled={p.current_stock <= 0}
                                title="Issue Stock (Stock Out)"
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold text-[11px] transition-colors flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                              >
                                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                <span>- Out</span>
                              </button>

                              {/* Adjust / Opname Button */}
                              <button
                                onClick={() => openTxnModal(p, 'Stock Adjustment - Set')}
                                title="Stock Opname / Physical Count Adjustment"
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                                <span>Adjust</span>
                              </button>

                              {/* Delete Part Button */}
                              <button
                                onClick={() => setPartToDelete(p)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete Spare Part"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      ) : (
        /* Transactions Ledger Table */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Movement Filter:</span>
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'all', label: 'All Movements' },
                  { id: 'in', label: 'Stock In' },
                  { id: 'out', label: 'Stock Out' },
                  { id: 'adjust', label: 'Adjustments' },
                  { id: 'return', label: 'Returns' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setLedgerTypeFilter(f.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                      ledgerTypeFilter === f.id
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredTransactions.length} movement records
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs text-left min-w-[1100px]">
                <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Transaction Code</th>
                    <th className="py-3 px-4">Date &amp; Time (Online WIB)</th>
                    <th className="py-3 px-4">Part Number &amp; Description</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-center">Balance Stock (Before → After)</th>
                    <th className="py-3 px-4 text-right">Total Cost (IDR)</th>
                    <th className="py-3 px-4">Reference &amp; Remarks</th>
                    <th className="py-3 px-4">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No transactions recorded in this view.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => {
                      const isPlus =
                        t.transaction_type === 'Goods Receipt' ||
                        t.transaction_type === 'Stock In' ||
                        t.transaction_type === 'Return' ||
                        t.transaction_type === 'Stock Adjustment - Add';
                      const isMinus =
                        t.transaction_type === 'Stock Out' ||
                        t.transaction_type === 'Issue to Work Order' ||
                        t.transaction_type === 'Stock Adjustment - Deduct';

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {t.transaction_code}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {formatDateTime(t.transaction_date)}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-semibold text-slate-800 truncate">{t.part_name}</div>
                            <div className="text-[11px] font-mono text-slate-400">{t.part_number}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isPlus ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                <ArrowDownRight className="w-3 h-3" />
                                {t.transaction_type}
                              </span>
                            ) : isMinus ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                <ArrowUpRight className="w-3 h-3" />
                                {t.transaction_type}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                <SlidersHorizontal className="w-3 h-3" />
                                {t.transaction_type}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {Math.abs(t.quantity)} {t.uom}
                          </td>
                          <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                            <span className="text-slate-500">{t.balance_before}</span>
                            <span className="mx-1.5 text-slate-400">→</span>
                            <span className={`font-extrabold ${t.balance_after > t.balance_before ? 'text-emerald-700' : t.balance_after < t.balance_before ? 'text-rose-700' : 'text-slate-900'}`}>
                              {t.balance_after}
                            </span>{' '}
                            <span className="text-[10px] text-slate-400">{t.uom}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-blue-900 whitespace-nowrap">
                            {formatIDR(t.total_cost)}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs">
                            {t.reference_number && (
                              <span className="font-mono text-[11px] text-blue-800 block truncate">
                                Ref: {t.reference_number}
                              </span>
                            )}
                            <span className="text-slate-500 text-[11px] truncate block">
                              {t.remarks || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{t.performed_by}</td>
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

      {/* Stock Transaction Modal (In / Out / Adjust / Return) */}
      {showTxnModal && selectedPart && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
              <div>
                <span className="font-mono font-bold text-xs text-blue-900 block">{selectedPart.part_number}</span>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Record Stock Movement &amp; Balance Adjustment
                </h2>
              </div>
              <button
                onClick={() => setShowTxnModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Scrollable Area */}
            <form onSubmit={handleExecuteTransaction} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Part Identity Banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block text-sm">{selectedPart.name}</span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Location: <span className="font-mono font-medium text-slate-700">{selectedPart.warehouse_location}</span> · UOM: {selectedPart.uom}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Stock</span>
                  <span className="font-mono font-extrabold text-base text-blue-950">
                    {selectedPart.current_stock} {selectedPart.uom}
                  </span>
                </div>
              </div>

              {/* Transaction Type Selector */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Transaction Movement Type *</label>
                <select
                  value={txnType}
                  onChange={(e) => setTxnType(e.target.value as InventoryTxnType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="Goods Receipt">🟢 Goods Receipt (Receive from Vendor / PO Delivery)</option>
                  <option value="Stock Out">🔴 Stock Out (Direct Consumption / General Issue)</option>
                  <option value="Stock Adjustment - Add">📈 Stock Adjustment - Add (Physical Surplus / Found Stock)</option>
                  <option value="Stock Adjustment - Deduct">📉 Stock Adjustment - Deduct (Damage / Scrapped / Lost)</option>
                  <option value="Stock Adjustment - Set">🎯 Stock Adjustment - Set (Physical Stock Opname Direct Count)</option>
                  <option value="Return">🔄 Return to Stock (Surplus Returned from Maintenance)</option>
                </select>
              </div>

              {/* Online Date & Time Input */}
              <div>
                <label className="font-semibold text-slate-700 flex items-center justify-between mb-1">
                  <span>Transaction Date &amp; Time (Online WIB) *</span>
                  <span className="text-[10px] text-emerald-700 font-normal">Synchronized with online real-time</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="datetime-local"
                    required
                    value={txnDateTime}
                    onChange={(e) => setTxnDateTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Quantity and Unit Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {txnType === 'Stock Adjustment - Set'
                      ? `Physical Count Result (${selectedPart.uom}) *`
                      : `Movement Quantity (${selectedPart.uom}) *`}
                  </label>
                  <input
                    type="number"
                    min={txnType === 'Stock Adjustment - Set' ? '0' : '1'}
                    step="1"
                    required
                    value={txnQty}
                    onChange={(e) => setTxnQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unit Cost (IDR)</label>
                  <input
                    type="number"
                    min="0"
                    value={txnUnitCost}
                    onChange={(e) => setTxnUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* REAL-TIME AUTO BALANCE UPDATE PREVIEW CARD */}
              <div className="p-3.5 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>Automatic Stock Balance Calculation (Real-Time Preview):</span>
                  </span>
                  <span className="text-[10px] text-blue-700 font-mono">Live Sync</span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-white/95 p-2.5 rounded-lg border border-blue-100 text-center font-mono shadow-2xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Initial Stock</span>
                    <span className="font-bold text-slate-700 text-xs sm:text-sm">
                      {projected.current} <span className="text-[10px] font-normal">{selectedPart.uom}</span>
                    </span>
                  </div>

                  <div className="border-x border-slate-200 px-1">
                    <span className="text-[10px] text-slate-400 block font-sans">Mutation Delta</span>
                    <span className={`font-extrabold text-xs sm:text-sm ${projected.delta > 0 ? 'text-emerald-600' : projected.delta < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                      {projected.delta > 0 ? `+${projected.delta}` : projected.delta} <span className="text-[10px] font-normal">{selectedPart.uom}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-blue-800 font-bold block font-sans">New Balance Stock</span>
                    <span className="font-extrabold text-xs sm:text-sm text-blue-950">
                      {projected.projected} <span className="text-[10px] font-normal">{selectedPart.uom}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-200/60 font-mono">
                  <span className="text-slate-600 font-sans">Total Transaction Valuation:</span>
                  <span className="font-bold text-blue-950">
                    {formatIDR(
                      (txnType === 'Stock Adjustment - Set'
                        ? Math.abs(projected.delta)
                        : txnQty) * txnUnitCost
                    )}
                  </span>
                </div>

                {!projected.isValid && (
                  <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{projected.errorMsg}</span>
                  </div>
                )}
              </div>

              {/* Reference and Remarks */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reference No. (PO No. / Issue Slip / Delivery Order)</label>
                <input
                  type="text"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="e.g. PO-NA-2026-902 or SLIP-OUT-04"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Remarks / Movement Reason</label>
                <input
                  type="text"
                  value={txnRemarks}
                  onChange={(e) => setTxnRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="e.g. Vendor delivery PT Cipta Mandiri or Conveyor motor bearing replacement"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTxnModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTxn || !projected.isValid}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmittingTxn ? 'Processing...' : 'Save & Update Balance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Part Master Modal */}
      {showAddPartModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-700" />
                <span>Register New Spare Part Master</span>
              </h2>
              <button
                onClick={() => setShowAddPartModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreatePart} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Part Number *</label>
                  <input
                    type="text"
                    required
                    value={newPart.part_number}
                    onChange={(e) => setNewPart({ ...newPart, part_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g. SKF-BRG-6205-2RS"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newPart.category}
                    onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Pneumatic">Pneumatic</option>
                    <option value="Hydraulic">Hydraulic</option>
                    <option value="Consumable">Consumable</option>
                    <option value="Lubricant">Lubricant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Part Name &amp; Description *</label>
                <input
                  type="text"
                  required
                  value={newPart.name}
                  onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="e.g. Deep Groove Ball Bearing 6205-2RS"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Specification Details</label>
                  <input
                    type="text"
                    value={newPart.specification}
                    onChange={(e) => setNewPart({ ...newPart, specification: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g. 25x52x15mm, Rubber Sealed"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unit of Measure (UOM) *</label>
                  <input
                    type="text"
                    required
                    value={newPart.uom}
                    onChange={(e) => setNewPart({ ...newPart, uom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g. PCS, SET, LTR, MTR"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Warehouse Bin / Rack Location *</label>
                  <input
                    type="text"
                    required
                    value={newPart.warehouse_location}
                    onChange={(e) => setNewPart({ ...newPart, warehouse_location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g. RAK-A2-04"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Compatible Machine / Equipment</label>
                  <input
                    type="text"
                    value={newPart.compatible_equipment}
                    onChange={(e) => setNewPart({ ...newPart, compatible_equipment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g. Conveyor Motor Line 2, Compressor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={newPart.current_stock}
                    onChange={(e) => setNewPart({ ...newPart, current_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={newPart.min_stock}
                    onChange={(e) => setNewPart({ ...newPart, min_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Reorder Point</label>
                  <input
                    type="number"
                    min="0"
                    value={newPart.reorder_point}
                    onChange={(e) => setNewPart({ ...newPart, reorder_point: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Average Cost (IDR)</label>
                  <input
                    type="number"
                    min="0"
                    value={newPart.average_cost}
                    onChange={(e) => setNewPart({ ...newPart, average_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Preferred Vendor</label>
                  <input
                    type="text"
                    value={newPart.preferred_vendor}
                    onChange={(e) => setNewPart({ ...newPart, preferred_vendor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="e.g. PT Atlas Copco Indonesia"
                  />
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Register Spare Part</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {partToDelete && (
        <DeleteConfirmModal
          isOpen={!!partToDelete}
          title="Delete Spare Part"
          itemName={`${partToDelete.part_number} - ${partToDelete.name}`}
          itemType="Spare Part"
          isDeleting={isDeleting}
          onConfirm={handleDeletePart}
          onCancel={() => setPartToDelete(null)}
          warningText="Deleting this spare part master will restrict transaction history linked to this item."
        />
      )}
    </div>
  );
};

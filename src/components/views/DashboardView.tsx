import React, { useEffect, useState, useRef } from 'react';
import {
  Cpu,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ClipboardList,
  CalendarCheck,
  TrendingUp,
  Boxes,
  ArrowRight,
  Filter,
  DollarSign,
  Shield,
  Award,
  Wrench,
  Zap,
  Gauge,
  Layers,
  BarChart3,
  CheckSquare,
  Users,
  RefreshCw,
  Printer,
  Calendar,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { PMTask, DashboardKPIs, Plant } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatIDR, formatDate } from '../../lib/formatters.ts';
import { ModuleKey } from '../layout/Sidebar.tsx';
import {
  DonutChart,
  BarChart,
  ComparisonBarChart,
  CircularGauge
} from '../charts/InteractiveCharts.tsx';
import { realtime } from '../../lib/realtime.ts';
import { OverdueTaskRecordModal } from '../common/OverdueTaskRecordModal.tsx';

interface DashboardViewProps {
  selectedPlant: string;
  plants: Plant[];
  onNavigate: (module: ModuleKey) => void;
  onPlantChange?: (plantId: string) => void;
}

type PillarTab = 'all' | 'operations' | 'inventory' | 'facility' | 'finance' | 'governance';
type PeriodScope = 'current_month' | 'last_month' | 'q3_q4' | 'ytd';
type DrilldownType = 'breakdowns' | 'inventory' | 'pm' | 'overdue' | 'work_orders' | 'assets' | null;

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedPlant,
  plants,
  onNavigate,
  onPlantChange
}) => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePillar, setActivePillar] = useState<PillarTab>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodScope>('current_month');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [activeDrilldown, setActiveDrilldown] = useState<DrilldownType>(null);
  const [overdueTaskToRecord, setOverdueTaskToRecord] = useState<PMTask | null>(null);

  const autoRefreshTimerRef = useRef<any>(null);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const [kpiData, chartData] = await Promise.all([
        api.getDashboardKPIs(selectedPlant),
        api.getDashboardCharts(selectedPlant)
      ]);

      setKpis(kpiData);
      setCharts(chartData);
      const now = new Date();
      setLastRefreshedAt(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load executive dashboard telemetry');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Instant real-time update: triggers whenever ANY PC updates the database
    const unsubscribe = realtime.subscribe(() => {
      loadData(true);
    });

    return () => unsubscribe();
  }, [selectedPlant, selectedPeriod]);

  // Handle continuous auto-refresh heartbeat (every 10s)
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        loadData(true);
      }, 10000);
    } else {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    }
    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [autoRefresh, selectedPlant, selectedPeriod]);

  if (loading && !kpis) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-slate-200 animate-pulse rounded w-64"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
          ))}
        </div>
        <div className="h-72 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <div className="p-8 text-center">
        <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 max-w-md mx-auto">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="font-semibold text-sm">Failed to retrieve dashboard telemetry</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
          <button
            onClick={() => loadData()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const currentPlantName =
    selectedPlant === 'all'
      ? 'All Facilities (NA-2, NA-3, NA-4)'
      : plants.find((p) => p.id === selectedPlant)?.name || selectedPlant;

  // Chart datasets
  const opData = charts?.operations || {};
  const invData = charts?.inventory || {};
  const facData = charts?.facilityUtility || {};
  const finData = charts?.finance || {};
  const govData = charts?.governance || {};

  // Work orders by type for Donut
  const woTypeDonutSlices = (opData.woByType || charts?.woByType || []).map((item: any, idx: number) => {
    const colors = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2', '#475569'];
    return {
      name: item.name,
      value: item.count,
      color: colors[idx % colors.length]
    };
  });

  // PM vs CM Donut
  const pmVsCmSlices = (opData.pmVsCmRatio || [
    { name: 'Preventive / Inspection', value: 14, color: '#2563eb' },
    { name: 'Corrective / Breakdown', value: 6, color: '#e11d48' },
    { name: 'Facility & Utilities', value: 4, color: '#0891b2' },
    { name: 'Continuous Kaizen', value: 2, color: '#059669' }
  ]);

  // Breakdown Pareto Bar Items
  const bdBarItems = (opData.bdByCategory || charts?.bdByCategory || []).map((item: any, idx: number) => {
    const colors = ['#e11d48', '#ea580c', '#f59e0b', '#0284c7', '#4f46e5', '#64748b'];
    return {
      name: item.name,
      value: item.count,
      color: colors[idx % colors.length],
      unit: 'incidents'
    };
  });

  // Availability Vertical Bars (Khusus NA-2, NA-3, NA-4)
  const availBarItems = (opData.plantDowntime || charts?.plantDowntime || []).map((item: any) => {
    let cleanName = item.plant;
    if (typeof item.plant === 'string') {
      if (item.plant.includes('NA-2')) cleanName = 'NA-2';
      else if (item.plant.includes('NA-3')) cleanName = 'NA-3';
      else if (item.plant.includes('NA-4')) cleanName = 'NA-4';
    }
    return {
      name: cleanName,
      value: item.availability,
      benchmark: item.target || 98.0,
      color: item.availability >= (item.target || 98) ? '#10b981' : '#f59e0b',
      unit: '%'
    };
  });

  // Inventory Valuation Bars
  const invValuationBars = (invData.stockValuationByCategory || []).map((item: any) => ({
    name: item.name,
    value: item.totalValuation || 0,
    formattedValue: formatIDR(item.totalValuation || 0),
    color: '#0284c7'
  }));

  // Utility Cost Donut Slices
  const utilityCostSlices = (facData.utilityCostShare || [
    { name: 'PLN 20kV Electricity', value: 139700000, color: '#f59e0b' },
    { name: 'Compressed Air Plant', value: 27120000, color: '#06b6d4' },
    { name: 'PDAM Water Supply', value: 15900000, color: '#3b82f6' }
  ]).map((item: any) => ({
    name: item.name,
    value: item.cost || item.value,
    formattedValue: formatIDR(item.cost || item.value),
    color: item.color
  }));

  // Finance Budget vs Actual Comparison Data
  const budgetVsActualComparison = (finData.monthlyCostTrend || charts?.monthlyCostTrend || []).map((row: any) => ({
    label: row.month,
    primaryValue: row.budget || 100000000,
    primaryLabel: 'Budget Limit',
    secondaryValue: row.total || row.actual || 90000000,
    secondaryLabel: 'Actual Expenditure',
    isCurrency: true
  }));

  // Cost by Plant Donut Slices
  const costPlantSlices = (finData.costByPlant || [
    { name: 'Plant NA-2 (AION)', cost: 58500000, color: '#1e3a8a' },
    { name: 'Plant NA-3 (Changan & Leap)', cost: 34200000, color: '#2563eb' },
    { name: 'Plant NA-4 (Commercial)', cost: 14900000, color: '#38bdf8' }
  ]).map((item: any) => ({
    name: item.name,
    value: item.cost,
    formattedValue: formatIDR(item.cost),
    color: item.color
  }));

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & EXECUTIVE CONTROL BAR                         */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden animate-soft-slide-1 slash-effect">
        {/* Soft Decorative Ambient Slash Rays */}
        <div className="absolute top-0 right-1/4 w-32 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-25 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-blue-400 opacity-75" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-300">
              <span className="uppercase tracking-wider">Industrial Maintenance Command Center</span>
              <span>·</span>
              <span className="bg-blue-800/80 px-2 py-0.5 rounded text-[11px] text-white font-mono">
                PT NATIONAL ASSEMBLERS · NA-MMS
              </span>
              <span>·</span>
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Telemetry: {lastRefreshedAt || 'Synchronized'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Executive Maintenance Intelligence Dashboard
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-3xl">
              Cross-plant asset uptime, OEE availability analytics (NA-2, NA-3, NA-4), real-time failure diagnostics, inventory valuation, energy utility tracking, budget variance, and statutory Disnaker compliance.
            </p>
          </div>

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Auto-Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 font-bold'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
              title="Sistem memperbarui data secara berkala dan sinkron instan antar semua PC"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Realtime Online: {autoRefresh ? 'AKTIF (10s)' : 'NONAKTIF'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Sekarang</span>
            </button>

            {/* Print Executive Summary */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Briefing</span>
            </button>
          </div>
        </div>

        {/* Embedded Plant Switcher & Scope Filter Ribbon */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Plant Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-300" />
              Facility:
            </span>
            <button
              onClick={() => onPlantChange && onPlantChange('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedPlant === 'all'
                  ? 'bg-blue-500 text-white shadow-xs'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
              }`}
            >
              All Plants (NA-2, NA-3, NA-4)
            </button>
            {plants.map((p) => (
              <button
                key={p.id}
                onClick={() => onPlantChange && onPlantChange(p.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedPlant === p.id
                    ? 'bg-blue-500 text-white shadow-xs'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                }`}
              >
                {p.code} ({p.name.split(' ')[0]})
              </button>
            ))}
          </div>

          {/* Period Scope Filter */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-blue-300 ml-1.5" />
            <span className="text-slate-400 font-medium mr-1">Period:</span>
            {[
              { key: 'current_month', label: 'Oct 2026 MTD' },
              { key: 'last_month', label: 'Sep 2026' },
              { key: 'q3_q4', label: 'Q3/Q4' },
              { key: 'ytd', label: 'FY 2026 YTD' }
            ].map((pd) => (
              <button
                key={pd.key}
                onClick={() => setSelectedPeriod(pd.key as PeriodScope)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedPeriod === pd.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {pd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. CRITICAL BREAKDOWN ALERT BANNER (If Active)                */}
      {/* ============================================================ */}
      {kpis.activeBreakdowns > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-rose-900 block text-sm">
                CRITICAL LINE STOPPAGE ALERT: {kpis.activeBreakdowns} Machine Breakdown Under Active Recovery
              </span>
              <p className="text-rose-700 text-xs mt-0.5">
                NA4-SHW-001 (Automated Shower Test Rig) booster pump tripped on overload. Line paused (185 mins downtime). Assigned: <strong>Dedi</strong>. Verified by: <strong>Warto</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveDrilldown('breakdowns')}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Investigate Breakdown
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MANAGEMENT HIERARCHY & PLANT SUPERVISORY COMMAND           */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        {/* Supervisor Card */}
        <div className="flex items-center gap-3 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg">
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
              Maintenance Supervisor
            </span>
            <span className="text-sm font-extrabold text-slate-900 block truncate">Warto</span>
            <span className="text-[10px] text-slate-600">Verification &amp; Approval Sign-off</span>
          </div>
        </div>

        {/* Leader - All Plant */}
        <div className="flex items-center gap-3 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg">
          <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block">
              Leader - All Plant
            </span>
            <span className="text-sm font-extrabold text-slate-900 block truncate">Hermawan Prasetyo</span>
            <span className="text-[10px] text-slate-600">ALL Plant-Maintenance Engineer &amp; Reliability Lead</span>
          </div>
        </div>

        {/* Leader - NA-2 */}
        <div className="flex items-center gap-3 p-2.5 bg-teal-50/70 border border-teal-200/80 rounded-lg">
          <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Wrench className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider block">
              Leader NA-2
            </span>
            <span className="text-sm font-extrabold text-slate-900 block truncate">Alfin Prasetyo</span>
            <span className="text-[10px] text-slate-600">AION Assembly Line Equipment Lead</span>
          </div>
        </div>

        {/* Technicians Squad */}
        <div className="flex items-center gap-3 p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-lg">
          <div className="w-9 h-9 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider block">
              Assigned Technicians
            </span>
            <span className="text-xs font-extrabold text-slate-900 block truncate">
              Marsino · Amin Irfan · Dedi
            </span>
            <span className="text-[10px] text-slate-600">Mechanical, Electrical &amp; Utility</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3B. OVERDUE PM TASKS & DELAY RISK MONITOR BANNER              */}
      {/* ============================================================ */}
      {(kpis.overdueTasksCount ?? 0) > 0 && (
        <div className="bg-linear-to-r from-rose-50 via-amber-50 to-rose-50 border-2 border-rose-300 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs mt-0.5 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-rose-950">
                    ⚠️ {kpis.overdueTasksCount} Tugas Preventive Maintenance Overdue (Keterlambatan Jadwal)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-200 text-rose-900 border border-rose-300">
                    Delay Risk Alert
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                  Terdapat tugas PM yang melewati tanggal target pengerjaan. Rekam justifikasi keterlambatan (spare parts, kapasitas jalur, izin LOTO), evaluasi risiko, dan revisi target tanggal langsung dari dashboard ini.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {(kpis.overduePMList || []).slice(0, 3).map((item: any) => (
                    <span
                      key={item.id}
                      onClick={() => setOverdueTaskToRecord(item)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-rose-300 hover:border-rose-500 rounded-lg text-[11px] font-semibold text-slate-800 cursor-pointer shadow-2xs hover:bg-rose-50/50 transition-colors"
                      title="Klik untuk langsung catat/edit alasan keterlambatan"
                    >
                      <span className="font-mono text-rose-700 font-bold">{item.task_code}</span>
                      <span>·</span>
                      <span className="truncate max-w-[130px] font-medium">{item.asset_name}</span>
                      {item.overdue_reason ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Tercatat</span>
                      ) : (
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">Belum Dicatat</span>
                      )}
                    </span>
                  ))}
                  {(kpis.overduePMList || []).length > 3 && (
                    <span className="text-[11px] text-rose-700 font-semibold self-center">
                      +{ (kpis.overduePMList?.length || 0) - 3 } tugas lainnya
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                onClick={() => setActiveDrilldown('overdue')}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Input / Catat Alasan Overdue
              </button>
              <button
                onClick={() => onNavigate('preventive')}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                Ke Modul PM &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. 6-CARD INTERACTIVE KPI SUMMARY WITH DRILLDOWN TRIGGERS     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-soft-slide-2">
        {/* 1. Total Assets */}
        <div
          onClick={() => setActiveDrilldown('assets')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-md hover:scale-102 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
          title="Click to drill down into asset operating status"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Registered Assets</span>
            <Cpu className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {kpis.totalAssets}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="text-emerald-700 font-semibold">{kpis.operationalAssets} Operational</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 2. OEE Line Availability */}
        <div
          onClick={() => setActivePillar('operations')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md hover:scale-102 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
          title="Click to view line availability analytics"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">OEE Availability (NA-2, NA-3, NA-4)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 flex items-baseline gap-1">
            {kpis.availabilityRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="text-emerald-700 font-semibold">Target &gt;= 98.0% (NA-2, NA-3, NA-4)</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 3. PM Compliance */}
        <div
          onClick={() => setActiveDrilldown((kpis.overdueTasksCount ?? 0) > 0 ? 'overdue' : 'pm')}
          className={`bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer group hover:shadow-md hover:scale-102 hover:-translate-y-0.5 ${
            (kpis.overdueTasksCount ?? 0) > 0 ? 'border-amber-300 hover:border-amber-500' : 'border-slate-200 hover:border-blue-500'
          }`}
          title="Click to inspect PM on-time compliance and Overdue Task records"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">PM Compliance</span>
            <CalendarCheck className={`w-4 h-4 ${(kpis.overdueTasksCount ?? 0) > 0 ? 'text-amber-600' : 'text-blue-600'}`} />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-700 flex items-baseline justify-between">
            <span>{kpis.pmCompliance}%</span>
            {(kpis.overdueTasksCount ?? 0) > 0 && (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                {kpis.overdueTasksCount} Overdue
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className={(kpis.overdueTasksCount ?? 0) > 0 ? 'text-rose-700 font-bold' : 'text-slate-600'}>
              {(kpis.overdueTasksCount ?? 0) > 0 ? '⚠️ Catat Overdue' : 'Verified: Warto'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 4. Active Breakdowns */}
        <div
          onClick={() => setActiveDrilldown('breakdowns')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-rose-500 hover:shadow-md hover:scale-102 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
          title="Click to view breakdown incident drilldown"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Active Breakdowns</span>
            <AlertTriangle className={`w-4 h-4 ${kpis.activeBreakdowns > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${kpis.activeBreakdowns > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {kpis.activeBreakdowns}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className={kpis.activeBreakdowns > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'}>
              {kpis.activeBreakdowns > 0 ? 'Requires Action' : 'All Lines Clear'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 5. MTBF / MTTR */}
        <div
          onClick={() => setActivePillar('operations')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-md hover:scale-102 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">MTBF / MTTR</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {kpis.mtbfHours}h <span className="text-xs font-normal text-slate-500">/ {kpis.mttrHours}h</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>MTTR: {kpis.mttrHours} hrs</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 6. Spare Parts Alert */}
        <div
          onClick={() => setActiveDrilldown('inventory')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-500 hover:shadow-md hover:scale-102 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
          title="Click to view low stock inventory drilldown"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Low Stock Alerts</span>
            <Boxes className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-700">
            {kpis.lowStockParts}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="text-rose-600 font-semibold">{kpis.outOfStockParts} out of stock</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. INTERACTIVE PILLAR NAVIGATION SWITCHER                     */}
      {/* ============================================================ */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs animate-soft-slide-3 flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
        {[
          { key: 'all', label: '🌟 Executive 360° Overview', icon: Layers },
          { key: 'operations', label: '⚙️ Operations & Reliability', icon: Wrench },
          { key: 'inventory', label: '📦 Inventory & Spare Parts', icon: Boxes },
          { key: 'facility', label: '⚡ Facility & Utilities', icon: Zap },
          { key: 'finance', label: '💰 Finance & Cost Control', icon: DollarSign },
          { key: 'governance', label: '🛡️ Governance & Compliance', icon: Shield }
        ].map((tab) => {
          const isActive = activePillar === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActivePillar(tab.key as PillarTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: EXECUTIVE 360° OVERVIEW                               */}
      {/* ============================================================ */}
      {activePillar === 'all' && (
        <div className="space-y-6 animate-soft-slide-4">
          {/* Row 1: Key Operational Visuals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Diagram Bulat 1: Work Order Type Distribution */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              <DonutChart
                title="Work Orders Distribution (Diagram Bulat)"
                subtitle="Classified by maintenance discipline & work scope"
                data={woTypeDonutSlices}
                centerLabel="Work Orders"
                size={170}
              />
            </div>

            {/* Diagram Bulat 2: Proactive PM vs Reactive CM */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="PM vs CM Ratio (Diagram Bulat)"
                subtitle="Proactive PM compliance vs reactive emergency repair"
                data={pmVsCmSlices}
                centerLabel="Ratio"
                size={170}
              />
            </div>

            {/* Diagram Bar Vertikal: Line Availability OEE */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <BarChart
                title="Line Availability OEE % (NA-2, NA-3, NA-4)"
                subtitle="Operational availability target 98.0% standard (Khusus Plant NA-2, NA-3, NA-4)"
                data={availBarItems}
                orientation="vertical"
                maxValue={100}
                benchmarkLine={98.0}
                benchmarkLabel="Target OEE"
              />
            </div>
          </div>

          {/* Row 2: Inventory & Energy Utilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Diagram Bulat: Inventory Stock Health */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="Inventory Stock Health (Diagram Bulat)"
                subtitle="Optimal inventory vs low stock reorder alerts"
                data={[
                  { name: 'Optimal Stock (> Reorder Pt)', value: 28, color: '#10b981' },
                  { name: 'Low Stock (<= Reorder Pt)', value: 9, color: '#f59e0b' },
                  { name: 'Critical Stockout (0 Stock)', value: 3, color: '#ef4444' }
                ]}
                centerLabel="Stock Items"
                size={170}
              />
            </div>

            {/* Diagram Bulat: Utility Cost Distribution Share */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="Utility Cost Share (Diagram Bulat)"
                subtitle="Electricity 20kV, Compressed Air & Industrial Water"
                data={utilityCostSlices}
                centerLabel="Total Utility"
                size={170}
                isCurrency={true}
              />
            </div>

            {/* Diagram Speedometer Gauge: PM Compliance */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <CircularGauge
                title="PM On-Time Compliance SLA"
                subtitle="Verified on schedule by Supervisor Warto"
                value={govData.pmComplianceGauge?.compliancePercentage || kpis.pmCompliance || 95.6}
                target={95.0}
                statusBadge="Target SLA Achieved (95.6%)"
                size={200}
              />
            </div>
          </div>

          {/* Row 3: Finance Budget vs Actual Dual Comparison Bar */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <ComparisonBarChart
              title="Budget vs Actual Expenditure (Diagram Bar Komparatif)"
              subtitle="Monthly OPEX ceiling vs actual registered maintenance costs"
              data={budgetVsActualComparison.slice(-3)}
              primaryColor="#1e3a8a"
              secondaryColor="#059669"
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: OPERATIONS & EQUIPMENT RELIABILITY                    */}
      {/* ============================================================ */}
      {activePillar === 'operations' && (
        <div className="space-y-6 animate-soft-slide-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-700" />
              Operational Reliability, Downtime &amp; Workforce Execution
            </h2>
            <button
              onClick={() => onNavigate('work_orders')}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Open Work Orders <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="Work Orders Distribution"
                subtitle="Work order classification"
                data={woTypeDonutSlices}
                centerLabel="Work Orders"
                size={170}
              />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="Proactive PM vs Reactive CM"
                subtitle="Preventive ratio balance"
                data={pmVsCmSlices}
                centerLabel="Orders"
                size={170}
              />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <BarChart
                title="Plant Availability OEE % (NA-2, NA-3, NA-4)"
                subtitle="Cross-plant uptime against 98% target (NA-2, NA-3, NA-4)"
                data={availBarItems}
                orientation="vertical"
                maxValue={100}
                benchmarkLine={98.0}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pareto Causes */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <BarChart
                title="Failure Breakdown Root Causes Pareto (Diagram Bar)"
                subtitle="Mechanical, electrical, pneumatic, and control system trips"
                data={bdBarItems}
                orientation="horizontal"
              />
            </div>

            {/* Technician Workload Matrix */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Technician Execution Performance (Spv: Warto)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Assigned jobs, completed orders, and logged man-hours
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                    Supervisor: Warto
                  </span>
                </div>

                <div className="space-y-3 mt-4">
                  {(opData.techWorkload || charts?.techWorkload || []).map((tech: any) => (
                    <div key={tech.id || tech.name} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-blue-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {tech.employee_id || 'TECH'}
                          </span>
                          <span className="font-bold text-slate-900">{tech.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">({tech.skill_category})</span>
                        </div>
                        <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {tech.completed_tasks || 0} Done
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 font-mono">
                        <div>
                          <span>Active Jobs: </span>
                          <strong className="text-blue-700">{tech.active_tasks || 0}</strong>
                        </div>
                        <div>
                          <span>Logged: </span>
                          <strong className="text-slate-800">{tech.hours_logged || 8.5} hrs</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-600 font-semibold">96.8% Eff.</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Roster: Marsino (Mech), Amin Irfan (Elec), Dedi (Utility)</span>
                <button
                  onClick={() => onNavigate('technicians')}
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                >
                  Manage Roster &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: INVENTORY & MATERIALS MANAGEMENT                      */}
      {/* ============================================================ */}
      {activePillar === 'inventory' && (
        <div className="space-y-6 animate-soft-slide-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-indigo-700" />
              Spare Parts Inventory Health &amp; Valuation
            </h2>
            <button
              onClick={() => onNavigate('spare_parts')}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Open Inventory Master <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="Stock Health (Diagram Bulat)"
                subtitle="Optimal stock vs reorder warnings & stockouts"
                data={[
                  { name: 'Optimal Stock (> Reorder Pt)', value: 28, color: '#10b981' },
                  { name: 'Low Stock (<= Reorder Pt)', value: 9, color: '#f59e0b' },
                  { name: 'Critical Stockout (0 Stock)', value: 3, color: '#ef4444' }
                ]}
                centerLabel="Total Parts"
                size={170}
              />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
              <BarChart
                title="Spare Parts Valuation by Category (Diagram Bar IDR)"
                subtitle="Capital valuation in mechanical, electrical, pneumatic, and hydraulic spares"
                data={invValuationBars}
                orientation="horizontal"
                isCurrency={true}
              />
            </div>
          </div>

          {/* Fast Moving Spares Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Fast-Moving Spares Consumption &amp; Spend Pareto</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">High turnover components and bearings</p>
              </div>
              <button
                onClick={() => onNavigate('procurement')}
                className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Create Purchase Request
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Part Number</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-right">Issuance Qty</th>
                    <th className="py-2.5 px-4 text-right">Total Expenditure</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(invData.fastMovingParts || []).map((p: any) => (
                    <tr key={p.partNumber} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-900">{p.partNumber}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{p.category}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{p.issuedQty} PCS</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-800">{formatIDR(p.totalCost)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                          Active Turnover
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: FACILITY & UTILITIES TELEMETRY                         */}
      {/* ============================================================ */}
      {activePillar === 'facility' && (
        <div className="space-y-6 animate-soft-slide-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Facility Infrastructure &amp; Utility Energy Telemetry
            </h2>
            <button
              onClick={() => onNavigate('utilities')}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Utility Meter Logs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="Utility Cost Distribution (Diagram Bulat)"
                subtitle="Electricity (PLN), Air Compression, and PDAM Water shares"
                data={utilityCostSlices}
                centerLabel="Total Utility"
                size={170}
                isCurrency={true}
              />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="Facility Defect Severity (Diagram Bulat)"
                subtitle="Civil, roofing, lighting, and plumbing inspection results"
                data={(facData.facilityDefectSeverity || []).map((d: any) => ({
                  name: d.name,
                  value: d.count,
                  color: d.color
                }))}
                centerLabel="Inspections"
                size={170}
              />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <BarChart
                title="PLN Electricity Intake (Diagram Bar kWh)"
                subtitle="Monthly 20kV incoming consumption trend"
                data={(facData.energyConsumptionTrend || []).map((m: any) => ({
                  name: m.month.split(' ')[0],
                  value: m.electricityKWh,
                  color: '#f59e0b',
                  unit: 'kWh'
                }))}
                orientation="vertical"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: FINANCE & BUDGET COST CONTROL                         */}
      {/* ============================================================ */}
      {activePillar === 'finance' && (
        <div className="space-y-6 animate-soft-slide-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-700" />
              Maintenance Budget, Variance &amp; Financial Governance
            </h2>
            <button
              onClick={() => onNavigate('budget')}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Manage Cost Centers <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="Cost Allocation by Plant (Diagram Bulat)"
                subtitle="Expenditure distribution across NA-2, NA-3, and NA-4"
                data={costPlantSlices}
                centerLabel="Total Spend"
                size={170}
                isCurrency={true}
              />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="Cost by Maintenance Category (Diagram Bulat)"
                subtitle="PM routine vs corrective breakdown repairs vs parts"
                data={(finData.costByCategory || []).map((c: any) => ({
                  name: c.name,
                  value: c.cost,
                  formattedValue: formatIDR(c.cost),
                  color: c.color
                }))}
                centerLabel="Total OPEX"
                size={170}
                isCurrency={true}
              />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <ComparisonBarChart
                title="Budget vs Actuals Variance (Diagram Bar)"
                subtitle="Approved monthly ceiling vs actual logged invoices"
                data={budgetVsActualComparison.slice(-3)}
                primaryColor="#1e3a8a"
                secondaryColor="#059669"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: GOVERNANCE, QUALITY & SAFETY COMPLIANCE                */}
      {/* ============================================================ */}
      {activePillar === 'governance' && (
        <div className="space-y-6 animate-soft-slide-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-800" />
              Statutory Governance, Safety (K3) &amp; Compliance SLAs
            </h2>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Audit Trail Registry <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <CircularGauge
                title="PM On-Time Compliance SLA"
                subtitle="Executed before deadline vs Disnaker standard (95%)"
                value={govData.pmComplianceGauge?.compliancePercentage || kpis.pmCompliance || 95.6}
                target={95.0}
                statusBadge="Target SLA Achieved (95.6%)"
                size={200}
              />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <DonutChart
                title="Work Order Approvals (Diagram Bulat)"
                subtitle="Supervisor Warto review &amp; verification status"
                data={(govData.workOrderApprovalBreakdown || [
                  { name: 'Approved & Certified', value: 24, color: '#10b981' },
                  { name: 'Pending Verification', value: 6, color: '#f59e0b' },
                  { name: 'Rejected / Rework', value: 2, color: '#ef4444' }
                ]).map((w: any) => ({
                  name: w.name,
                  value: w.count || w.value,
                  color: w.color
                }))}
                centerLabel="Work Orders"
                size={170}
              />
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <BarChart
                title="Audit Trail Modification Logs (Diagram Bar)"
                subtitle="Tracked transactions and access by system module"
                data={(govData.auditActivityByModule || []).map((m: any, idx: number) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                  return {
                    name: m.name,
                    value: m.count,
                    color: colors[idx % colors.length],
                    unit: 'logs'
                  };
                })}
                orientation="horizontal"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. HISTORICAL MONTHLY COST BREAKDOWN AUDIT TABLE             */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Monthly Maintenance Cost Breakdown (Actuals vs Budget)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Preventive maintenance, corrective repairs, and spare parts expenditures across all plants.
            </p>
          </div>
          <button
            onClick={() => onNavigate('budget')}
            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            Manage Budget
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-right">PM Routine Cost</th>
                <th className="py-3 px-4 text-right">Corrective / Emergency</th>
                <th className="py-3 px-4 text-right">Spare Parts Replenishment</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900">Total Monthly Cost</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(finData.monthlyCostTrend || charts?.monthlyCostTrend || []).map((row: any) => (
                <tr key={row.month} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">{row.month}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                    {formatIDR(row.pmCost)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                    {formatIDR(row.cmCost)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                    {formatIDR(row.sparePartsCost)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                    {formatIDR(row.total)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Audited
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 7. INTERACTIVE DRILLDOWN MODAL                                */}
      {/* ============================================================ */}
      {activeDrilldown && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  {activeDrilldown === 'breakdowns' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  {activeDrilldown === 'inventory' && <Boxes className="w-4 h-4 text-amber-600" />}
                  {(activeDrilldown === 'pm' || activeDrilldown === 'overdue') && <CalendarCheck className="w-4 h-4 text-amber-600" />}
                  {activeDrilldown === 'assets' && <Cpu className="w-4 h-4 text-indigo-600" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeDrilldown === 'breakdowns' && 'Active Breakdown Incidents Drilldown'}
                    {activeDrilldown === 'inventory' && 'Low Stock & Out of Stock Spares Drilldown'}
                    {activeDrilldown === 'overdue' && 'Tugas PM Overdue & Delay Risk Justification Drilldown'}
                    {activeDrilldown === 'pm' && 'Overdue & Scheduled PM Tasks Drilldown'}
                    {activeDrilldown === 'assets' && 'Plant Assets Operational Status Drilldown'}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Detailed record telemetry for {currentPlantName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveDrilldown(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Drilldown: Breakdowns */}
              {activeDrilldown === 'breakdowns' && (
                <div className="space-y-3">
                  {kpis.activeBreakdownList && kpis.activeBreakdownList.length > 0 ? (
                    kpis.activeBreakdownList.map((b: any) => (
                      <div key={b.id} className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-rose-900">{b.breakdown_number}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900">
                            {b.priority} Priority · {b.status}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900">{b.asset_name} ({b.asset_tag})</div>
                        <p className="text-slate-700">{b.failure_description}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-rose-200">
                          <span>Reported: {b.reported_by}</span>
                          <span>Assigned Tech: <strong>{b.tech_name || 'Dedi'}</strong></span>
                          <span>Supervisor: <strong>Warto</strong></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                      <p className="font-semibold">All production equipment currently operational.</p>
                      <p className="text-[11px]">Zero active emergency breakdowns recorded.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Drilldown: Inventory */}
              {activeDrilldown === 'inventory' && (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Part Number</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3">Location</th>
                          <th className="py-2 px-3 text-right">Current Stock</th>
                          <th className="py-2 px-3 text-right">Reorder Point</th>
                          <th className="py-2 px-3 text-right">Unit Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(kpis.lowStockList || []).map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{p.part_number}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                            <td className="py-2.5 px-3 text-slate-500">{p.warehouse_location}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                              {p.current_stock} {p.uom}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {p.reorder_point} {p.uom}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatIDR(p.average_cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Drilldown: PM & Overdue Tasks */}
              {(activeDrilldown === 'pm' || activeDrilldown === 'overdue') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-semibold text-[11px]">
                        Pencatatan langsung justifikasi keterlambatan jadwal PM (Overdue Record Tracking)
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                      TPM &amp; ISO 55001 Compliance
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Task Code</th>
                          <th className="py-2 px-3">Equipment / Tag</th>
                          <th className="py-2 px-3">Target Due</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Justifikasi Overdue &amp; Mitigasi</th>
                          <th className="py-2 px-3 text-right">Direct Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(kpis.overduePMList || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              Tidak ada jadwal PM yang overdue untuk filter plant ini.
                            </td>
                          </tr>
                        ) : (
                          (kpis.overduePMList || []).map((t: any) => {
                            const isOverdue = t.status === 'Overdue' || (t.status !== 'Completed' && new Date(t.due_date) < new Date());
                            return (
                              <tr key={t.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                                  {t.task_code}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-slate-900">{t.asset_name}</div>
                                  <div className="text-[10px] font-mono text-slate-500">{t.asset_tag}</div>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">
                                  <div>{formatDate(t.due_date)}</div>
                                  {t.overdue_revised_due_date && (
                                    <div className="text-[10px] text-amber-700 font-medium">
                                      Rev: {formatDate(t.overdue_revised_due_date)}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    t.status === 'Overdue' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                                  }`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 max-w-[240px]">
                                  {t.overdue_reason ? (
                                    <div className="space-y-1">
                                      <div className="text-[11px] font-semibold text-slate-900 truncate" title={t.overdue_reason}>
                                        {t.overdue_reason}
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {t.overdue_risk_level && (
                                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                            t.overdue_risk_level === 'Critical' ? 'bg-red-600 text-white' :
                                            t.overdue_risk_level === 'High' ? 'bg-amber-600 text-white' :
                                            t.overdue_risk_level === 'Medium' ? 'bg-blue-600 text-white' :
                                            'bg-slate-200 text-slate-700'
                                          }`}>
                                            Risk: {t.overdue_risk_level}
                                          </span>
                                        )}
                                        {t.overdue_recorded_by && (
                                          <span className="text-[10px] text-slate-500">
                                            oleh {t.overdue_recorded_by.split(' ')[0]}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-rose-600 italic">
                                      ⚠️ Belum ada catatan alasan
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => setOverdueTaskToRecord(t)}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                    title="Buka form input/edit alasan overdue"
                                  >
                                    <AlertTriangle className="w-3 h-3" />
                                    {t.overdue_reason ? 'Edit Catatan' : 'Input Overdue'}
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
              )}

              {/* Drilldown: Assets */}
              {activeDrilldown === 'assets' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-emerald-800 block">Operational</span>
                      <span className="text-xl font-bold font-mono text-emerald-900">{kpis.operationalAssets} Units</span>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-amber-800 block">Maintenance</span>
                      <span className="text-xl font-bold font-mono text-amber-900">{kpis.maintenanceAssets} Units</span>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-rose-800 block">Breakdown</span>
                      <span className="text-xl font-bold font-mono text-rose-900">{kpis.breakdownAssets} Units</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                PT National Assemblers Maintenance System &middot; Executive Drilldown
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveDrilldown(null)}
                  className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const mod = activeDrilldown === 'breakdowns' ? 'breakdown' : activeDrilldown === 'inventory' ? 'spare_parts' : (activeDrilldown === 'pm' || activeDrilldown === 'overdue') ? 'preventive' : 'assets';
                    setActiveDrilldown(null);
                    onNavigate(mod);
                  }}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Go to Module &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Task Record Modal for direct Dashboard entry */}
      {overdueTaskToRecord && (
        <OverdueTaskRecordModal
          isOpen={Boolean(overdueTaskToRecord)}
          onClose={() => setOverdueTaskToRecord(null)}
          task={overdueTaskToRecord}
          currentUser="Hermawan Prasetyo (GA & Maintenance Leader - All Plant)"
          onSuccess={() => {
            loadData(true);
          }}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  BarChart3, Download, Printer, Filter, Calendar, FileSpreadsheet, CheckCircle2, CloudUpload, ExternalLink, Loader2, FileText
} from 'lucide-react';
import { Plant, Breakdown } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatIDR, formatDate, exportToCSV, generateCSVString } from '../../lib/formatters.ts';
import { saveTextOrCsvToDrive, getAccessToken, googleSignIn } from '../../lib/googleDrive.ts';
import { BreakdownDetailReportModal } from '../common/BreakdownDetailReportModal.tsx';

interface ReportsAnalyticsViewProps {
  selectedPlant: string;
  plants: Plant[];
}

export const ReportsAnalyticsView: React.FC<ReportsAnalyticsViewProps> = ({
  selectedPlant,
  plants
}) => {
  const [reportType, setReportType] = useState<'assets' | 'pm' | 'breakdowns' | 'inventory' | 'costs'>('assets');
  const [dateRange, setDateRange] = useState('October 2026');
  const [reportData, setReportData] = useState<any[]>([]);
  const [selectedDetailBreakdown, setSelectedDetailBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [driveUploadResult, setDriveUploadResult] = useState<{ name: string; url?: string } | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setDriveUploadResult(null);
    setDriveError(null);
    try {
      if (reportType === 'assets') {
        const data = await api.getAssets({ plant: selectedPlant });
        setReportData(data);
      } else if (reportType === 'pm') {
        const data = await api.getPMTasks({ plant: selectedPlant });
        setReportData(data);
      } else if (reportType === 'breakdowns') {
        const data = await api.getBreakdowns({ plant: selectedPlant });
        setReportData(data);
      } else if (reportType === 'inventory') {
        const data = await api.getSpareParts();
        setReportData(data);
      } else if (reportType === 'costs') {
        const data = await api.getMaintenanceBudgets();
        setReportData(data);
      }
      setIsGenerated(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData.length) return;
    exportToCSV(`PT_NA_Report_${reportType}_${new Date().toISOString().slice(0, 10)}`, reportData);
  };

  const handleExportToGoogleDrive = async () => {
    if (!reportData.length) return;
    setIsDriveUploading(true);
    setDriveError(null);
    setDriveUploadResult(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        // Prompt sign in
        const authResult = await googleSignIn();
        if (!authResult) throw new Error('Google authentication cancelled or failed');
      }

      const csvContent = generateCSVString(reportData);
      const fileName = `PT_NA_${reportType.toUpperCase()}_REPORT_${new Date().toISOString().slice(0, 10)}.csv`;
      const uploadedFile = await saveTextOrCsvToDrive(fileName, csvContent, 'text/csv');
      setDriveUploadResult({
        name: uploadedFile.name,
        url: uploadedFile.webViewLink
      });
    } catch (err: any) {
      console.error('Failed to export to Google Drive:', err);
      setDriveError(err?.message || 'Failed to save to Google Drive');
    } finally {
      setIsDriveUploading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const plantName = selectedPlant === 'all' ? 'All Plants (NA-2, NA-3, NA-4)' : plants.find(p => p.id === selectedPlant)?.name || selectedPlant;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-700" />
            Executive Reports &amp; Operational Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Structured management reports with standardized PT National Assemblers audit headers, compliant export formats, and live calculations.
          </p>
        </div>

        {isGenerated && (
          <div className="flex flex-wrap items-center gap-2">
            {reportType === 'breakdowns' && (
              <button
                onClick={() => {
                  if (reportData.length > 0) {
                    setSelectedDetailBreakdown(reportData[0]);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                title="Tampilkan Detail Laporan Investigasi Breakdown & Print (PDF / Manual)"
              >
                <FileText className="w-4 h-4" />
                <span>Detail Report Breakdown</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Download CSV
            </button>
            <button
              onClick={handleExportToGoogleDrive}
              disabled={isDriveUploading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              title="Save report directly into Google Drive root or project folder"
            >
              {isDriveUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving to Drive...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  Save to Google Drive
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        )}
      </div>

      {/* Google Drive Status Notification */}
      {driveUploadResult && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Successfully uploaded <strong>{driveUploadResult.name}</strong> to your Google Drive!
            </span>
          </div>
          {driveUploadResult.url && (
            <a
              href={driveUploadResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 underline"
            >
              Open in Google Drive
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {driveError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <span>Failed to save to Google Drive: {driveError}</span>
          <button
            onClick={() => setDriveError(null)}
            className="text-xs text-rose-600 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Query Parameters Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Report Generator Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Select Report Type</label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as any);
                setIsGenerated(false);
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-medium text-slate-800"
            >
              <option value="assets">1. Asset Register &amp; Criticality Audit</option>
              <option value="pm">2. Preventive Maintenance Compliance &amp; Overdue</option>
              <option value="breakdowns">3. Breakdown Incidents &amp; Downtime / MTBF</option>
              <option value="inventory">4. Spare Parts Stock Valuation &amp; Reorder</option>
              <option value="costs">5. Maintenance Cost Variance &amp; OPEX Ledger</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Plant Facility Scope</label>
            <div className="p-2.5 bg-slate-100 rounded-lg text-slate-800 font-semibold truncate">
              {plantName}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Reporting Period</label>
            <input
              type="text"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-mono"
            />
          </div>
        </div>

        <button
          onClick={generateReport}
          disabled={loading}
          className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {loading ? 'Compiling Database Records...' : 'Generate Official Report'}
        </button>
      </div>

      {/* Generated Report Presentation (with standard PT NA header) */}
      {isGenerated && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8 space-y-6 print:m-0 print:border-none print:p-0">
          {/* Formal Report Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase block">
                PT NATIONAL ASSEMBLERS
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {reportType === 'assets' && 'ASSET REGISTER & CRITICALITY AUDIT REPORT'}
                {reportType === 'pm' && 'PREVENTIVE MAINTENANCE COMPLIANCE REPORT'}
                {reportType === 'breakdowns' && 'EQUIPMENT BREAKDOWN & DOWNTIME ANALYSIS REPORT'}
                {reportType === 'inventory' && 'SPARE PARTS INVENTORY & REORDER REPORT'}
                {reportType === 'costs' && 'MAINTENANCE BUDGET VARIANCE & COST REPORT'}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Computerized Maintenance Management System (NA-MMS) · Facility Operations
              </p>
            </div>

            <div className="text-left md:text-right text-xs font-mono text-slate-600 space-y-0.5">
              <div>Facility Scope: <strong className="text-slate-900">{plantName}</strong></div>
              <div>Period: <strong className="text-slate-900">{dateRange}</strong></div>
              <div>Generated: <span className="text-slate-800">{new Date().toLocaleString('id-ID')} WIB</span></div>
              <div>Authorized By: <span className="text-blue-900 font-bold">Hermawan Prasetyo</span></div>
            </div>
          </div>

          {/* Report Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-300">
                {reportType === 'assets' && (
                  <tr>
                    <th className="py-2.5 px-3">Asset Tag</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Plant Facility</th>
                    <th className="py-2.5 px-3">Criticality</th>
                    <th className="py-2.5 px-3">Operating Status</th>
                    <th className="py-2.5 px-3 text-right">Purchase Cost (IDR)</th>
                  </tr>
                )}
                {reportType === 'pm' && (
                  <tr>
                    <th className="py-2.5 px-3">Task Code</th>
                    <th className="py-2.5 px-3">Asset</th>
                    <th className="py-2.5 px-3">Target Due</th>
                    <th className="py-2.5 px-3">Assigned Tech</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Verification</th>
                  </tr>
                )}
                {reportType === 'breakdowns' && (
                  <tr>
                    <th className="py-2.5 px-3">Breakdown No</th>
                    <th className="py-2.5 px-3">Asset</th>
                    <th className="py-2.5 px-3">Discipline</th>
                    <th className="py-2.5 px-3">Impact</th>
                    <th className="py-2.5 px-3">Downtime</th>
                    <th className="py-2.5 px-3">Root Cause</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Detail Report &amp; Print</th>
                  </tr>
                )}
                {reportType === 'inventory' && (
                  <tr>
                    <th className="py-2.5 px-3">Part Number</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-right">Stock</th>
                    <th className="py-2.5 px-3 text-right">Reorder Point</th>
                    <th className="py-2.5 px-3 text-right">Avg Cost (IDR)</th>
                    <th className="py-2.5 px-3 text-right">Total Valuation</th>
                  </tr>
                )}
                {reportType === 'costs' && (
                  <tr>
                    <th className="py-2.5 px-3">Plant</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Approved Budget</th>
                    <th className="py-2.5 px-3 text-right">Actual Cost</th>
                    <th className="py-2.5 px-3 text-right">Variance</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {reportType === 'assets' && (
                      <>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{row.asset_tag}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{row.category_name}</td>
                        <td className="py-2.5 px-3 text-slate-700">{row.plant_name}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.criticality}</td>
                        <td className="py-2.5 px-3">{row.operating_status}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">{formatIDR(row.purchase_cost)}</td>
                      </>
                    )}
                    {reportType === 'pm' && (
                      <>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{row.task_code}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.asset_name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(row.due_date)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{row.tech_name || 'Unassigned'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.status}</td>
                        <td className="py-2.5 px-3 text-slate-600">{row.supervisor_verification || '-'}</td>
                      </>
                    )}
                    {reportType === 'breakdowns' && (
                      <>
                        <td className="py-2.5 px-3 font-mono font-bold text-red-900">{row.breakdown_number}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.asset_name}</td>
                        <td className="py-2.5 px-3 text-slate-700">{row.category}</td>
                        <td className="py-2.5 px-3 font-medium text-rose-700">{row.production_impact}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{row.downtime_minutes} min</td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">{row.root_cause || '-'}</td>
                        <td className="py-2.5 px-3 font-semibold">{row.status}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailBreakdown(row)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 rounded font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            title="Tampilkan Detail Laporan Investigasi Breakdown & Print (PDF / Manual)"
                          >
                            <Printer className="w-3.5 h-3.5 text-red-600" />
                            <span>Detail &amp; Print</span>
                          </button>
                        </td>
                      </>
                    )}
                    {reportType === 'inventory' && (
                      <>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{row.part_number}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{row.warehouse_location}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{row.current_stock} {row.uom}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{row.reorder_point} {row.uom}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatIDR(row.average_cost)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatIDR(row.current_stock * row.average_cost)}</td>
                      </>
                    )}
                    {reportType === 'costs' && (
                      <>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{row.plant_name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{row.fiscal_year}-M{row.month}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{row.category}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatIDR(row.budget_amount)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatIDR(row.actual_cost)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{formatIDR(row.budget_amount - row.actual_cost)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Formal Audit & Sign-off Block */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block mb-1">Prepared By (Leader)</span>
                <span className="font-bold text-slate-900 block">Alfin Prasetyo</span>
                <span className="text-[10px] text-slate-500">NA-2 Maintenance Leader</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-blue-700 text-[10px] uppercase font-bold tracking-wider block mb-1">Verified By (Plant Leaders)</span>
                <span className="font-bold text-slate-900 block">Hermawan Prasetyo</span>
                <span className="text-[10px] text-slate-500">GA-Maintenance Leader - All Plant</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-amber-700 text-[10px] uppercase font-bold tracking-wider block mb-1">Approved By (Supervisor)</span>
                <span className="font-bold text-slate-900 block">Warto</span>
                <span className="text-[10px] text-slate-500">GA-Maintenance Supervisor</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-500 text-[11px] pt-2">
              <span>Verified &amp; Certified by PT National Assemblers Quality &amp; Plant Maintenance Directorate.</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px]">Audit Ref: NA-MMS-2026-WARTO-HP</span>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Incident Detail Report Modal (PDF / Print View) */}
      {selectedDetailBreakdown && (
        <BreakdownDetailReportModal
          breakdown={selectedDetailBreakdown}
          allBreakdowns={reportType === 'breakdowns' ? reportData : []}
          onSelectBreakdown={(b) => setSelectedDetailBreakdown(b)}
          onClose={() => setSelectedDetailBreakdown(null)}
        />
      )}
    </div>
  );
};

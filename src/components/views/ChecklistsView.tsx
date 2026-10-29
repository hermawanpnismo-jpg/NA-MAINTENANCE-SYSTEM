import React, { useState } from 'react';
import {
  CheckSquare, CheckCircle2, Clock, AlertTriangle, Play, Save, Trash2, Plus
} from 'lucide-react';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';

interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  frequency: string;
  checkpoints: { item: string; standard: string; status: 'Normal' | 'Defect' | 'Pending' }[];
}

export const ChecklistsView: React.FC = () => {
  const [templates, setTemplates] = useState<ChecklistItem[]>([
    {
      id: 'chk-01',
      name: 'Electric Overhead Crane & Hoist Weekly Safety Audit',
      category: 'Lifting Equipment',
      frequency: 'Weekly',
      checkpoints: [
        { item: 'Wire Rope Strands & Core', standard: 'Zero broken wires per lay, zero kinking or bird-caging', status: 'Normal' },
        { item: 'Upper / Lower Limit Switch', standard: 'Trips motor instantly upon reaching safety limit (< 0.2s)', status: 'Normal' },
        { item: 'Mechanical Brake Air Gap', standard: 'Air gap between 0.4mm - 0.7mm nominal', status: 'Normal' },
        { item: 'Hook Latch & Throat Opening', standard: 'Safety latch springs closed, throat wear < 5%', status: 'Normal' },
        { item: 'Emergency Stop Pendant Response', standard: 'Main contactor drops immediately on press', status: 'Normal' }
      ]
    },
    {
      id: 'chk-02',
      name: 'Rotary Screw Air Compressor GA-75 Daily Shift Inspection',
      category: 'Pneumatics & Compressed Air',
      frequency: 'Daily',
      checkpoints: [
        { item: 'Oil Sight Level Glass', standard: 'Oil level in green central operating zone when running', status: 'Normal' },
        { item: 'Discharge Air Temperature', standard: 'Operating temp between 75°C - 92°C (trip at 105°C)', status: 'Normal' },
        { item: 'Automatic Condensate Drain', standard: 'Discharges water droplets every 3-5 minutes cleanly', status: 'Normal' },
        { item: 'V-Belt Tension & Alignment', standard: 'Deflection 10mm under 5kg finger pressure', status: 'Normal' },
        { item: 'Vibration & Acoustic Sound', standard: 'Smooth hum, no knocking or excessive bearing rattle', status: 'Normal' }
      ]
    },
    {
      id: 'chk-03',
      name: 'Main Substation MDB 20kV / 380V Monthly Inspection',
      category: 'Electrical Distribution',
      frequency: 'Monthly',
      checkpoints: [
        { item: 'Transformer Winding Temperature', standard: 'Temp < 80°C on forced cooling, display normal', status: 'Normal' },
        { item: 'Automatic Power Factor Regulator', standard: 'Cos phi maintained between 0.95 - 0.98 lag', status: 'Normal' },
        { item: 'Busbar Thermal Camera Scan', standard: 'Delta T between joint phases < 5°C', status: 'Normal' },
        { item: 'Earth Grounding Resistance', standard: 'Resistance to earth < 2.0 Ohms NFPA standard', status: 'Normal' },
        { item: 'UPS Battery Bank Voltage', standard: 'Float charge 13.6V per 12V block nominal', status: 'Normal' }
      ]
    },
    {
      id: 'chk-04',
      name: 'Plant Fire Hydrant Diesel Engine Weekly Flow Test',
      category: 'Fire Protection / Utility',
      frequency: 'Weekly',
      checkpoints: [
        { item: 'Battery Voltage & Cranking Amps', standard: 'Battery voltage > 24VDC, starts in < 5 seconds', status: 'Normal' },
        { item: 'Diesel Fuel Tank Level', standard: 'Level > 80% capacity at all times', status: 'Normal' },
        { item: 'Jockey Pump Pressure Setting', standard: 'Starts at 8.0 bar, stops at 10.0 bar smoothly', status: 'Normal' },
        { item: 'Test Header Discharge Flow', standard: 'Maintains 1500 GPM at 8.5 bar discharge pressure', status: 'Normal' }
      ]
    }
  ]);

  const [activeChecklist, setActiveChecklist] = useState<ChecklistItem>(templates[0]);
  const [isSuccess, setIsSuccess] = useState(false);

  // Delete State
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistItem | null>(null);
  const [checkpointToDelete, setCheckpointToDelete] = useState<{ index: number; name: string } | null>(null);

  const handleDeleteTemplate = () => {
    if (!templateToDelete) return;
    const remaining = templates.filter((t) => t.id !== templateToDelete.id);
    setTemplates(remaining);
    if (activeChecklist.id === templateToDelete.id) {
      if (remaining.length > 0) {
        setActiveChecklist(remaining[0]);
      }
    }
    setTemplateToDelete(null);
  };

  const handleDeleteCheckpoint = () => {
    if (!checkpointToDelete) return;
    const updated = { ...activeChecklist };
    updated.checkpoints = updated.checkpoints.filter((_, idx) => idx !== checkpointToDelete.index);
    setActiveChecklist(updated);
    setTemplates(templates.map((t) => (t.id === updated.id ? updated : t)));
    setCheckpointToDelete(null);
  };

  const handleStatusChange = (index: number, newStatus: 'Normal' | 'Defect') => {
    const updated = { ...activeChecklist };
    updated.checkpoints[index].status = newStatus;
    setActiveChecklist(updated);
  };

  const handleSaveAudit = () => {
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-700" />
            Inspection Checklists &amp; Pre-Start Templates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standardized preventative inspection protocols, threshold tolerances, and digital technician sign-offs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Template List */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
            Available Checklists
          </span>
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => setActiveChecklist(tpl)}
              className={`p-3 rounded-lg border cursor-pointer transition-all text-xs space-y-1 relative group ${
                activeChecklist.id === tpl.id
                  ? 'bg-blue-50 border-blue-400 font-semibold text-blue-900'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{tpl.category}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-normal">
                    {tpl.frequency}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTemplateToDelete(tpl);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Hapus Template Checklist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-slate-800 text-[11px]">{tpl.name}</p>
            </div>
          ))}
        </div>

        {/* Right: Active Checklist Runner */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
              <span className="text-xs font-mono font-bold text-blue-900 uppercase">INSPECTION EXECUTION</span>
              <h2 className="text-sm font-extrabold text-slate-900">{activeChecklist.name}</h2>
            </div>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded">
              {activeChecklist.frequency} Audit
            </span>
          </div>

          <div className="p-5 space-y-3">
            {isSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Checklist audit completed and recorded in database.
              </div>
            )}

            <div className="space-y-2.5">
              {activeChecklist.checkpoints.map((cp, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 block">{cp.item}</span>
                    <span className="text-slate-500 text-[11px] block">Standard: {cp.standard}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(idx, 'Normal')}
                      className={`px-3 py-1 rounded font-bold text-[11px] transition-all ${
                        cp.status === 'Normal' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border text-slate-600'
                      }`}
                    >
                      ✓ Pass / Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(idx, 'Defect')}
                      className={`px-3 py-1 rounded font-bold text-[11px] transition-all ${
                        cp.status === 'Defect' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border text-slate-600'
                      }`}
                    >
                      ⚠ Defect / Action
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckpointToDelete({ index: idx, name: cp.item })}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors ml-1"
                      title="Hapus Butir Poin Inspeksi Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Inspector: <strong className="text-slate-800">Warto (Supervisor)</strong>
            </span>
            <button
              onClick={handleSaveAudit}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Sign &amp; Submit Audit
            </button>
          </div>
        </div>
      </div>

      {/* Delete Template Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(templateToDelete)}
        title="Hapus Template Checklist"
        itemType="Protokol Checklist"
        itemName={templateToDelete ? templateToDelete.name : ''}
        warningText="Protokol inspeksi dan seluruh butir audit standar di dalamnya akan dihapus."
        onConfirm={handleDeleteTemplate}
        onCancel={() => setTemplateToDelete(null)}
      />

      {/* Delete Checkpoint Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(checkpointToDelete)}
        title="Hapus Butir Poin Pemeriksaan"
        itemType="Butir Pemeriksaan"
        itemName={checkpointToDelete ? checkpointToDelete.name : ''}
        warningText="Poin pemeriksaan ini akan dihapus dari checklist aktif saat ini."
        onConfirm={handleDeleteCheckpoint}
        onCancel={() => setCheckpointToDelete(null)}
      />
    </div>
  );
};

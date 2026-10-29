import React, { useEffect, useState } from 'react';
import {
  Users, Plus, Search, Award, Wrench, Shield, CheckCircle2,
  Clock, X, Save, Trash2
} from 'lucide-react';
import { Technician, Plant } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatIDR } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { realtime } from '../../lib/realtime.ts';

interface TechnicianManagementViewProps {
  selectedPlant: string;
  plants: Plant[];
}

export const TechnicianManagementView: React.FC<TechnicianManagementViewProps> = ({
  selectedPlant,
  plants
}) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTech, setNewTech] = useState({
    employee_id: '',
    name: '',
    plant_id: selectedPlant === 'all' ? (plants[0]?.id || '') : selectedPlant,
    department: 'Mechanical & Electrical Maintenance',
    skill_category: 'Mechanical',
    certifications: '',
    shift: 'Shift 1',
    hourly_rate: 0,
    supervisor: 'Warto'
  });

  // Delete State
  const [techToDelete, setTechToDelete] = useState<Technician | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteTech = async () => {
    if (!techToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteTechnician(techToDelete.id, 'Maintenance Manager');
      setTechToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus data teknisi');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.getTechnicians();
      setTechnicians(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Instant real-time background sync when ANY PC updates technicians
    const unsubscribe = realtime.subscribe(() => {
      loadData(true);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateTech = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTechnician({
        ...newTech,
        user_name: 'Warto'
      });
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add technician');
    }
  };

  const filtered = technicians.filter((t) => {
    if (selectedPlant !== 'all' && t.plant_id !== selectedPlant) return false;
    if (skillFilter !== 'all' && t.skill_category !== skillFilter) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-700" />
            Maintenance Team &amp; Technician Roster
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Plant maintenance organizational command hierarchy, skill competencies, and active assignments.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Register Technician
        </button>
      </div>

      {/* Leadership & Supervisory Hierarchy Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supervisor Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-4 rounded-xl border border-amber-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
              Maintenance Supervisor
            </span>
            <Shield className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900">Warto</div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Verification &amp; Quality Approval Authority for all PM Tasks, Work Orders &amp; Machine Restorations.
          </p>
          <div className="mt-2 text-[10px] text-amber-800 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Supervising: Marsino, Amin Irfan, Dedi
          </div>
        </div>

        {/* Leader - All Plant */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 p-4 rounded-xl border border-blue-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
              Leader - All Plant
            </span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900">Hermawan Prasetyo</div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Lead Engineer &amp; Maintenance Head overseeing Plant NA-2 (AION), NA-3, and NA-4.
          </p>
          <div className="mt-2 text-[10px] text-blue-800 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Scope: All Assembly Lines &amp; Facility Utilities
          </div>
        </div>

        {/* Leader - NA-2 */}
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50/60 p-4 rounded-xl border border-teal-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded border border-teal-200">
              Leader NA-2
            </span>
            <Wrench className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900">Alfin Prasetyo</div>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Production Equipment Maintenance Lead dedicated to Plant NA-2 (AION Assembly Hall).
          </p>
          <div className="mt-2 text-[10px] text-teal-800 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            Focus: Chassis Slat, Trim Lines &amp; Scissor Lifts
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100/70 p-1 rounded-lg w-fit text-xs font-medium">
        {['all', 'Mechanical', 'Electrical & Automation', 'Mechanical & Utility'].map((sk) => (
          <button
            key={sk}
            onClick={() => setSkillFilter(sk)}
            className={`px-3 py-1.5 rounded-md transition-all ${
              skillFilter === sk ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {sk === 'all' ? 'All Specializations' : sk}
          </button>
        ))}
      </div>

      {/* Technician Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((tech) => (
          <div key={tech.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[11px] font-bold text-blue-900 block">{tech.employee_id}</span>
                <h3 className="text-sm font-bold text-slate-900">{tech.name}</h3>
                <span className="text-xs text-slate-500">{tech.department}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                  {tech.skill_category}
                </span>
                <button
                  onClick={() => setTechToDelete(tech)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  title="Hapus Teknisi (Delete Technician)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100">
              <div className="flex items-center justify-between text-slate-600">
                <span>Facility:</span>
                <span className="font-semibold text-slate-800">{tech.plant_name || 'Plant NA-2'}</span>
              </div>
             <div className="flex items-center justify-between text-slate-600">
                <span>Shift &amp; Supervisor:</span>
                <span className="font-medium text-slate-800">{tech.shift} · Supervisor: {tech.supervisor ||'Warto'}</span>
              </div>
            </div>

            {tech.certifications && (
              <div className="text-[11px] flex items-start gap-1.5 text-slate-600 bg-emerald-50/50 p-2 rounded border border-emerald-100">
                <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{tech.certifications}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Active Tasks: <strong className="text-slate-800 font-mono">{tech.active_wos || 0}</strong></span>
              </div>
              <span className="text-emerald-700 font-semibold text-[11px]">
                {tech.completed_wos || 0} completed
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Add Maintenance Technician</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTech} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TECH-008"
                    value={newTech.employee_id}
                    onChange={(e) => setNewTech({ ...newTech, employee_id: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahmat Hidayat"
                    value={newTech.name}
                    onChange={(e) => setNewTech({ ...newTech, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Plant Base</label>
                  <select
                    value={newTech.plant_id}
                    onChange={(e) => setNewTech({ ...newTech, plant_id: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Skill Specialization</label>
                  <select
                    value={newTech.skill_category}
                    onChange={(e) => setNewTech({ ...newTech, skill_category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Automation & PLC">Automation &amp; PLC</option>
                    <option value="Utility">Utility &amp; HVAC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Certifications &amp; Licenses</label>
                <input
                  type="text"
                  placeholder="e.g. K3 Listrik Teknisi, S7-1500 PLC, Crane Rigging"
                  value={newTech.certifications}
                  onChange={(e) => setNewTech({ ...newTech, certifications: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Working Shift</label>
                  <select
                    value={newTech.shift}
                    onChange={(e) => setNewTech({ ...newTech, shift: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="Shift 1">Shift 1 (07:30 - 16:30)</option>
                    <option value="Shift 2">Shift 2 (16:30 - 24:00)</option>
                    <option value="Shift 3">Shift 3 (Night)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reporting Supervisor</label>
                <select
                  value={newTech.supervisor}
                  onChange={(e) => setNewTech({ ...newTech, supervisor: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                >
                  <option value="Warto">Warto (Maintenance Supervisor)</option>
                  <option value="Hermawan Prasetyo">Hermawan Prasetyo (Leader - All Plant)</option>
                  <option value="Alfin Prasetyo">Alfin Prasetyo (Leader NA-2)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Technician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(techToDelete)}
        title="Hapus Data Teknisi"
        itemType="Personel Teknisi"
        itemName={techToDelete ? `[${techToDelete.employee_id}] ${techToDelete.name} (${techToDelete.skill_category})` : ''}
        warningText="Data teknisi ini akan dihapus dari sistem roster pemeliharaan dan alokasi penugasan."
        isDeleting={isDeleting}
        onConfirm={handleDeleteTech}
        onCancel={() => setTechToDelete(null)}
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Users, UserPlus, X, Crown, Wrench, Check, Search, ArrowRightLeft, Sparkles, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { Technician } from '../../types/index.ts';

interface MultiTechnicianPickerProps {
  technicians: Technician[];
  leadTechId: string;
  onLeadTechChange: (id: string) => void;
  supportingTechIds: string[];
  onSupportingTechsChange: (ids: string[]) => void;
  label?: string;
  description?: string;
  compact?: boolean;
}

export const MultiTechnicianPicker: React.FC<MultiTechnicianPickerProps> = ({
  technicians,
  leadTechId,
  onLeadTechChange,
  supportingTechIds,
  onSupportingTechsChange,
  label = 'Technician Squad Assignment',
  description = 'Designate 1 Lead Technician (In-Charge) and assign supporting crew members to execute this task together.',
  compact = false
}) => {
  const [isAddingCrew, setIsAddingCrew] = useState(false);
  const [isChangingLead, setIsChangingLead] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState('ALL');

  const leadTech = useMemo(() => technicians.find((t) => t.id === leadTechId), [technicians, leadTechId]);
  const supportingTechs = useMemo(
    () => technicians.filter((t) => supportingTechIds.includes(t.id)),
    [technicians, supportingTechIds]
  );

  // Unique skills for filtering
  const skillCategories = useMemo(() => {
    const set = new Set<string>();
    technicians.forEach((t) => {
      if (t.skill_category) set.add(t.skill_category);
    });
    return Array.from(set);
  }, [technicians]);

  // Available technicians to add as support (excluding current lead and already added supporting techs)
  const availableToAdd = useMemo(() => {
    return technicians.filter((t) => {
      if (t.id === leadTechId) return false;
      if (supportingTechIds.includes(t.id)) return false;

      if (selectedSkillFilter !== 'ALL' && t.skill_category !== selectedSkillFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesSkill = (t.skill_category || '').toLowerCase().includes(q);
        const matchesEmpId = (t.employee_id || '').toLowerCase().includes(q);
        return matchesName || matchesSkill || matchesEmpId;
      }

      return true;
    });
  }, [technicians, leadTechId, supportingTechIds, selectedSkillFilter, searchQuery]);

  const handleAddSupport = (techId: string) => {
    if (!supportingTechIds.includes(techId)) {
      onSupportingTechsChange([...supportingTechIds, techId]);
    }
  };

  const handleRemoveSupport = (techId: string) => {
    onSupportingTechsChange(supportingTechIds.filter((id) => id !== techId));
  };

  const handlePromoteToLead = (techId: string) => {
    const oldLead = leadTechId;
    onLeadTechChange(techId);
    // Move old lead to supporting crew if present
    const newSupporting = supportingTechIds.filter((id) => id !== techId);
    if (oldLead && !newSupporting.includes(oldLead)) {
      newSupporting.push(oldLead);
    }
    onSupportingTechsChange(newSupporting);
  };

  const handleSetLead = (techId: string) => {
    // If the selected lead was in supporting, remove from supporting
    if (supportingTechIds.includes(techId)) {
      onSupportingTechsChange(supportingTechIds.filter((id) => id !== techId));
    }
    onLeadTechChange(techId);
    setIsChangingLead(false);
  };

  const totalPersonnel = (leadTechId ? 1 : 0) + supportingTechIds.length;

  return (
    <div className={`space-y-3.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl ${compact ? 'p-3' : 'p-4'} shadow-2xs`}>
      {/* Header & Squad Count Badge */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-100 text-blue-700">
              <Users className="w-3.5 h-3.5" />
            </span>
            <span>{label}</span>
          </label>
          {!compact && description && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold transition-colors ${
              totalPersonnel > 0
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {totalPersonnel} {totalPersonnel === 1 ? 'Personnel' : 'Personnel'}
          </span>
        </div>
      </div>

      {/* Primary Section: Lead Technician */}
      <div className="space-y-2 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Lead Technician (In-Charge)</span>
            <span className="text-rose-500 font-bold">*</span>
          </span>

          {leadTech ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Active Lead Assigned
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Action Required
            </span>
          )}
        </div>

        {/* Lead Assigned View vs Selector */}
        {leadTech && !isChangingLead ? (
          <div className="p-2.5 bg-gradient-to-r from-amber-50/90 to-amber-100/40 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
                {leadTech.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                  <span className="truncate">{leadTech.name}</span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold shrink-0">
                    [{leadTech.employee_id}]
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5 truncate mt-0.5">
                  <span className="font-semibold text-amber-900">{leadTech.skill_category} Specialist</span>
                  <span>·</span>
                  <span>{leadTech.shift} Shift</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsChangingLead(true)}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Change Lead
              </button>
              <button
                type="button"
                onClick={() => onLeadTechChange('')}
                title="Unassign Lead Technician"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <select
                value={leadTechId}
                onChange={(e) => handleSetLead(e.target.value)}
                className="w-full p-2.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer"
              >
                <option value="">-- Choose Lead Technician (In-Charge) --</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} [{t.employee_id}] — {t.skill_category} ({t.shift})
                  </option>
                ))}
              </select>

              {leadTech && isChangingLead && (
                <button
                  type="button"
                  onClick={() => setIsChangingLead(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              The Lead Technician oversees work quality, safety protocol compliance, and signs off completion.
            </p>
          </div>
        )}
      </div>

      {/* Secondary Section: Supporting Crew Members */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-800">
              Supporting Crew Members ({supportingTechs.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingCrew(!isAddingCrew)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isAddingCrew
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
            }`}
          >
            {isAddingCrew ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Collapse Picker</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Crew Member</span>
              </>
            )}
          </button>
        </div>

        {/* Inline Responsive Add Technician Panel (No clipping / No z-index issues) */}
        {isAddingCrew && (
          <div className="bg-white border border-blue-200 rounded-2xl p-3 sm:p-4 space-y-3 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-extrabold text-slate-900">Add Supporting Technicians</span>
                <span className="text-[10px] text-slate-500 font-medium ml-1">
                  ({availableToAdd.length} available)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCrew(false);
                  setSearchQuery('');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search technician by name, specialty, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 absolute right-2.5 top-2 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Specialty Filter Pills */}
            {skillCategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedSkillFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedSkillFilter === 'ALL'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({technicians.length})
                </button>
                {skillCategories.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setSelectedSkillFilter(skill)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedSkillFilter === skill
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            )}

            {/* Available Technicians List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
              {availableToAdd.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  {technicians.length === 0
                    ? 'No registered technicians found in database.'
                    : 'All matching technicians are already assigned to this squad.'}
                </div>
              ) : (
                availableToAdd.map((t) => (
                  <div
                    key={t.id}
                    className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 p-1.5 hover:bg-blue-50/60 rounded-xl transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-extrabold shrink-0 border border-slate-200">
                        {t.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-slate-700">{t.skill_category}</span>
                          <span>·</span>
                          <span>{t.shift} Shift</span>
                          <span>·</span>
                          <span className="font-mono text-slate-400">[{t.employee_id}]</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddSupport(t.id)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <span>+ Assign</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Currently Assigned Supporting Crew Cards */}
        {supportingTechs.length === 0 ? (
          <div className="p-3.5 bg-white border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400">
            No supporting crew members assigned yet. Click{' '}
            <button
              type="button"
              onClick={() => setIsAddingCrew(true)}
              className="font-bold text-blue-600 hover:underline cursor-pointer"
            >
              + Add Crew Member
            </button>{' '}
            above if this job requires multi-technician execution.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {supportingTechs.map((t) => (
              <div
                key={t.id}
                className="p-2.5 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition-all"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-extrabold shrink-0 border border-slate-200">
                    {t.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block truncate">{t.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate font-medium">
                      {t.skill_category} · {t.shift}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePromoteToLead(t.id)}
                    title="Promote this crew member to Lead Technician"
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSupport(t.id)}
                    title="Remove from squad"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          Composition: <strong className="text-slate-800 font-bold">{leadTechId ? '1 Lead' : '0 Lead'}</strong>,{' '}
          <strong className="text-slate-800 font-bold">{supportingTechIds.length} Supporting</strong>
        </span>
        {supportingTechIds.length > 0 && (
          <button
            type="button"
            onClick={() => onSupportingTechsChange([])}
            className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer"
          >
            Clear Supporting Crew
          </button>
        )}
      </div>
    </div>
  );
};

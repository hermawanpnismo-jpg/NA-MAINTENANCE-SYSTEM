import React from 'react';
import { Users, Crown, Wrench, Shield, ChevronDown, UserCheck, Plus } from 'lucide-react';
import { AssignedTechnicianInfo } from '../../types/index.ts';

interface ManpowerBadgeListProps {
  technicians?: AssignedTechnicianInfo[];
  leadTechName?: string;
  supportingManpower?: string;
  onManageClick?: () => void;
  interactive?: boolean;
}

export const ManpowerBadgeList: React.FC<ManpowerBadgeListProps> = ({
  technicians,
  leadTechName,
  supportingManpower,
  onManageClick,
  interactive = true
}) => {
  // Normalize list
  let team: Array<{ name: string; role: 'Lead' | 'Support'; skill_category?: string }> = [];

  if (technicians && technicians.length > 0) {
    team = technicians.map((t) => ({
      name: t.name,
      role: t.role,
      skill_category: t.skill_category
    }));
  } else if (leadTechName) {
    team.push({ name: leadTechName, role: 'Lead' });
    if (supportingManpower) {
      try {
        const parsed = JSON.parse(supportingManpower);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            const name = typeof p === 'string' ? p : p.name || p.id;
            team.push({ name, role: 'Support' });
          });
        }
      } catch {
        supportingManpower.split(',').forEach((p) => {
          const trimmed = p.trim();
          if (trimmed) team.push({ name: trimmed, role: 'Support' });
        });
      }
    }
  }

  if (team.length === 0) {
    return (
      <span className="text-slate-400 italic text-[11px] inline-flex items-center gap-1.5">
        <span>Unassigned</span>
        {onManageClick && interactive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onManageClick();
            }}
            className="text-blue-600 hover:text-blue-800 hover:underline font-bold text-[10px] cursor-pointer inline-flex items-center gap-0.5"
            title="Assign Lead and crew members"
          >
            <Plus className="w-3 h-3" />
            <span>Assign</span>
          </button>
        )}
      </span>
    );
  }

  const lead = team.find((t) => t.role === 'Lead') || team[0];
  const supporting = team.filter((t) => t !== lead);

  const fullSquadTooltip = `Assigned Squad (${team.length} Personnel):\n• Lead: ${lead.name}${lead.skill_category ? ` (${lead.skill_category})` : ''}\n${
    supporting.length > 0
      ? supporting.map((s, i) => `• Crew #${i + 1}: ${s.name}${s.skill_category ? ` (${s.skill_category})` : ''}`).join('\n')
      : '• No supporting crew members'
  }${onManageClick && interactive ? '\n\nClick to manage squad assignment' : ''}`;

  return (
    <div
      className="inline-flex items-center gap-1 flex-wrap"
      title={fullSquadTooltip}
    >
      {/* Lead Technician Badge */}
      <span
        onClick={onManageClick && interactive ? (e) => { e.stopPropagation(); onManageClick(); } : undefined}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold shadow-2xs transition-colors ${
          onManageClick && interactive ? 'cursor-pointer hover:bg-blue-100 hover:border-blue-300' : ''
        }`}
      >
        <Crown className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[140px]">{lead.name}</span>
      </span>

      {/* Single Supporting Tech Badge */}
      {supporting.length === 1 && (
        <span
          onClick={onManageClick && interactive ? (e) => { e.stopPropagation(); onManageClick(); } : undefined}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium transition-colors ${
            onManageClick && interactive ? 'cursor-pointer hover:bg-slate-200' : ''
          }`}
        >
          <span className="truncate max-w-[90px] sm:max-w-[110px]">{supporting[0].name}</span>
        </span>
      )}

      {/* Multi-Supporting Techs Count Badge */}
      {supporting.length > 1 && (
        <button
          type="button"
          onClick={onManageClick && interactive ? (e) => { e.stopPropagation(); onManageClick(); } : undefined}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold transition-colors ${
            onManageClick && interactive ? 'cursor-pointer hover:bg-indigo-100 hover:border-indigo-300' : ''
          }`}
        >
          <Users className="w-3 h-3 text-indigo-600 shrink-0" />
          <span>+{supporting.length} Support</span>
        </button>
      )}

      {/* Manage Squad Action Icon */}
      {onManageClick && interactive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onManageClick();
          }}
          title="Manage technician squad assignment"
          className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer ml-0.5"
        >
          <Users className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Users, X, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Technician } from '../../types/index.ts';
import { MultiTechnicianPicker } from './MultiTechnicianPicker.tsx';
import { api } from '../../lib/api.ts';

interface ManpowerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseType?: 'work_order' | 'breakdown' | 'pm_task' | 'facility_inspection';
  caseId?: string;
  caseTitle?: string;
  title?: string;
  caseNumber?: string;
  taskTitle?: string;
  currentLeadId?: string | null;
  initialLeadTechId?: string | null;
  assignedTechId?: string | null;
  currentSupporting?: string | string[];
  initialSupportingTechIds?: string[];
  supportingTechIds?: string[];
  technicians: Technician[];
  onSaved?: () => void;
  onSuccess?: () => void;
  onSave?: (assignedId: string, supportingIds: string[]) => Promise<void>;
}

export const ManpowerAssignmentModal: React.FC<ManpowerAssignmentModalProps> = ({
  isOpen,
  onClose,
  caseType = 'work_order',
  caseId = '',
  caseTitle,
  title,
  caseNumber,
  taskTitle,
  currentLeadId,
  initialLeadTechId,
  assignedTechId,
  currentSupporting,
  initialSupportingTechIds,
  supportingTechIds: propSupportingTechIds,
  technicians,
  onSaved,
  onSuccess,
  onSave
}) => {
  const effectiveLeadId = (currentLeadId !== undefined ? currentLeadId : (initialLeadTechId !== undefined ? initialLeadTechId : assignedTechId)) || '';
  const effectiveSupporting = currentSupporting !== undefined
    ? currentSupporting
    : (initialSupportingTechIds !== undefined ? initialSupportingTechIds : (propSupportingTechIds || []));
  const effectiveTitle = taskTitle || caseTitle || title || 'Case Assignment';

  const [leadTechId, setLeadTechId] = useState(effectiveLeadId);
  const [supportingTechIds, setSupportingTechIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLeadTechId(effectiveLeadId);

    // Parse initial supporting techs
    if (Array.isArray(effectiveSupporting)) {
      setSupportingTechIds(effectiveSupporting);
    } else if (typeof effectiveSupporting === 'string' && effectiveSupporting) {
      try {
        const parsed = JSON.parse(effectiveSupporting);
        if (Array.isArray(parsed)) {
          setSupportingTechIds(parsed);
        } else {
          setSupportingTechIds(effectiveSupporting.split(',').map((s) => s.trim()).filter(Boolean));
        }
      } catch {
        // Match names or IDs
        const parts = effectiveSupporting.split(',').map((s) => s.trim()).filter(Boolean);
        const matchedIds: string[] = [];
        for (const part of parts) {
          const tech = technicians.find((t) => t.id === part || t.name.toLowerCase() === part.toLowerCase());
          if (tech) matchedIds.push(tech.id);
        }
        setSupportingTechIds(matchedIds.length > 0 ? matchedIds : parts);
      }
    } else {
      setSupportingTechIds([]);
    }
  }, [isOpen, effectiveLeadId, effectiveSupporting]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        assigned_tech_id: leadTechId || null,
        supporting_tech_ids: supportingTechIds,
        user_name: 'Maintenance Supervisor'
      };

      if (onSave) {
        await onSave(leadTechId, supportingTechIds);
      } else if (caseType === 'facility_inspection') {
        await api.updateFacilityInspectionManpower(caseId, {
          assigned_tech_id: leadTechId || undefined,
          supporting_tech_ids: supportingTechIds,
          user_name: 'Maintenance Supervisor'
        });
      } else if (caseType === 'work_order') {
        await api.assignTechniciansToWorkOrder(caseId, payload);
      } else if (caseType === 'breakdown') {
        await api.assignTechniciansToBreakdown(caseId, payload);
      } else if (caseType === 'pm_task') {
        await api.assignTechniciansToPMTask(caseId, payload);
      }

      if (onSaved) onSaved();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update squad assignment');
    } finally {
      setIsSaving(false);
    }
  };

  const caseTypeLabel =
    caseType === 'work_order' ? 'Work Order' :
    caseType === 'breakdown' ? 'Breakdown Emergency' : 'Preventive Maintenance Task';

  const totalCrew = (leadTechId ? 1 : 0) + supportingTechIds.length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header - Fixed */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-900 font-extrabold px-2 py-0.5 rounded-md shrink-0">
                {caseNumber || caseTypeLabel}
              </span>
              <span className="text-xs text-slate-500 font-semibold truncate">{caseTypeLabel}</span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1 line-clamp-1">
              Technician Squad Assignment: {effectiveTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Flex Form with scrollable body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <MultiTechnicianPicker
              technicians={technicians}
              leadTechId={leadTechId}
              onLeadTechChange={setLeadTechId}
              supportingTechIds={supportingTechIds}
              onSupportingTechsChange={setSupportingTechIds}
              label="Assigned Maintenance Squad"
              description="Select 1 Lead Technician (In-Charge) and assign supporting crew members from active shifts."
            />
          </div>

          {/* Footer - Fixed bottom bar */}
          <div className="shrink-0 p-4 sm:px-6 sm:py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/95 gap-3">
            <div className="text-xs text-slate-600 font-medium truncate">
              Total Squad: <strong className="text-slate-900 font-bold font-mono">{totalCrew} Personnel</strong>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Squad Assignment'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

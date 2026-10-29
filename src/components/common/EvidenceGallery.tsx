import React, { useState, useEffect } from 'react';
import {
  Camera, Upload, Plus, Eye, Download, Trash2, ArrowLeftRight,
  Image as ImageIcon, CheckCircle2, Clock, User, Filter, AlertCircle
} from 'lucide-react';
import { OperationEvidence, EvidenceType } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { EvidenceUploadModal } from './EvidenceUploadModal.tsx';
import { EvidenceViewerModal } from './EvidenceViewerModal.tsx';
import { realtime } from '../../lib/realtime.ts';

interface EvidenceGalleryProps {
  activityType: 'work_order' | 'breakdown' | 'pm_task' | 'facility_inspection';
  activityId: string;
  activityCode?: string;
  currentUserName?: string;
  readOnly?: boolean;
  onCountChange?: (count: number) => void;
}

const TYPE_CONFIG: Record<
  EvidenceType,
  { label: string; badge: string; border: string; bg: string; icon: string }
> = {
  before: { label: 'Sebelum / Before', badge: 'bg-rose-50 text-rose-700 border-rose-200', border: 'hover:border-rose-300', bg: 'bg-rose-500/10', icon: '🔴' },
  in_progress: { label: 'Pelaksanaan / In-Progress', badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'hover:border-amber-300', bg: 'bg-amber-500/10', icon: '🟡' },
  after: { label: 'Selesai / After', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'hover:border-emerald-300', bg: 'bg-emerald-500/10', icon: '🟢' },
  damaged_part: { label: 'Part Rusak / Bekas', badge: 'bg-orange-50 text-orange-700 border-orange-200', border: 'hover:border-orange-300', bg: 'bg-orange-500/10', icon: '🟠' },
  document: { label: 'Dokumen / PTW / BAP', badge: 'bg-blue-50 text-blue-700 border-blue-200', border: 'hover:border-blue-300', bg: 'bg-blue-500/10', icon: '🔵' }
};

export const EvidenceGallery: React.FC<EvidenceGalleryProps> = ({
  activityType,
  activityId,
  activityCode,
  currentUserName = 'Maintenance Technician',
  readOnly = false,
  onCountChange
}) => {
  const [evidences, setEvidences] = useState<OperationEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | EvidenceType>('all');

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDefaultType, setUploadDefaultType] = useState<EvidenceType>('before');
  const [viewerEvidence, setViewerEvidence] = useState<OperationEvidence | null>(null);

  const loadEvidences = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.getEvidences({
        activity_type: activityType,
        activity_id: activityId
      });
      setEvidences(data);
      if (onCountChange) {
        onCountChange(data.length);
      }
    } catch (err) {
      console.error('Failed to load activity evidences:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidences();

    // Subscribe to real-time sync for evidence uploads across all PCs
    const unsubscribe = realtime.subscribe((event) => {
      if (event.entity === 'evidence' || event.entity === activityType) {
        loadEvidences(true);
      }
    });

    return () => unsubscribe();
  }, [activityType, activityId]);

  const handleDeleteEvidence = async (evidenceId: string) => {
    await api.deleteEvidence(evidenceId, currentUserName);
    setEvidences((prev) => prev.filter((e) => e.id !== evidenceId));
    if (viewerEvidence?.id === evidenceId) {
      setViewerEvidence(null);
    }
    loadEvidences(true);
  };

  const handleUploadSuccess = (newEvid: OperationEvidence) => {
    setEvidences((prev) => [newEvid, ...prev.filter((e) => e.id !== newEvid.id)]);
    if (onCountChange) {
      onCountChange(evidences.length + 1);
    }
    loadEvidences(true);
  };

  // Filtered list
  const filteredEvidences = selectedFilter === 'all'
    ? evidences
    : evidences.filter((e) => e.evidence_type === selectedFilter);

  // Before & After comparator check
  const beforePhoto = evidences.find((e) => e.evidence_type === 'before');
  const afterPhoto = evidences.find((e) => e.evidence_type === 'after');
  const hasBeforeAndAfter = Boolean(beforePhoto && afterPhoto);

  return (
    <div className="space-y-4">
      {/* Top Gallery Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600" />
            Dokumentasi Visual & Evidence Aktivitas
            <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-blue-100 text-blue-800">
              {evidences.length} Foto
            </span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Foto kondisi awal sebelum perbaikan, pelaksanaan teknisi, hasil pengujian, dan Berita Acara (BAP).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasBeforeAndAfter && (
            <button
              type="button"
              onClick={() => setViewerEvidence(beforePhoto || evidences[0])}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Bandingkan Sebelum & Sesudah
            </button>
          )}

          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setUploadDefaultType('before');
                  setShowUploadModal(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Upload Evidence
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
            selectedFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          Semua ({evidences.length})
        </button>
        {(Object.keys(TYPE_CONFIG) as EvidenceType[]).map((type) => {
          const cfg = TYPE_CONFIG[type];
          const count = evidences.filter((e) => e.evidence_type === type).length;
          const isSelected = selectedFilter === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedFilter(type)}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Gallery Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Memuat foto evidence operasional...</span>
        </div>
      ) : filteredEvidences.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h5 className="text-sm font-bold text-slate-800">
            {selectedFilter === 'all'
              ? 'Belum Ada Foto Evidence untuk Aktivitas Ini'
              : `Belum Ada Foto untuk Kategori "${TYPE_CONFIG[selectedFilter].label}"`}
          </h5>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Dokumentasikan foto kondisi kerusakan sebelum pengerjaan, proses perbaikan, dan foto setelah mesin kembali normal untuk kelengkapan audit.
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setUploadDefaultType(selectedFilter === 'all' ? 'before' : selectedFilter);
                setShowUploadModal(true);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Unggah Foto Evidence Sekarang
            </button>
          )}
        </div>
      ) : (
        /* Evidence Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvidences.map((item) => {
            const cfg = TYPE_CONFIG[item.evidence_type] || TYPE_CONFIG.before;
            return (
              <div
                key={item.id}
                onClick={() => setViewerEvidence(item)}
                className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col ${cfg.border}`}
              >
                {/* Photo Thumbnail Container */}
                <div className="relative h-44 bg-slate-900 overflow-hidden flex items-center justify-center">
                  <img
                    src={item.file_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity"></div>

                  {/* Stage Badge on Top Left */}
                  <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm backdrop-blur-sm ${cfg.badge}`}>
                    {cfg.icon} {cfg.label}
                  </span>

                  {/* Hover Inspect Icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-3 py-1.5 bg-black/75 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 backdrop-blur-sm shadow-lg">
                      <Eye className="w-3.5 h-3.5" />
                      Perbesar Foto
                    </span>
                  </div>

                  {/* Time Badge on Bottom Left */}
                  <span className="absolute bottom-2 left-2.5 text-[11px] font-mono text-slate-200 drop-shadow-sm flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {item.created_at?.substring(0, 16) || 'Baru saja'} WIB
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {item.title}
                    </h5>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 truncate max-w-[160px]">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.uploaded_by}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.file_size || 'JPEG'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <EvidenceUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        activityType={activityType}
        activityId={activityId}
        activityCode={activityCode}
        defaultEvidenceType={uploadDefaultType}
        currentUserName={currentUserName}
        onSuccess={handleUploadSuccess}
      />

      {/* Viewer Modal */}
      <EvidenceViewerModal
        isOpen={Boolean(viewerEvidence)}
        onClose={() => setViewerEvidence(null)}
        evidence={viewerEvidence}
        allActivityEvidences={evidences}
        onDelete={readOnly ? undefined : handleDeleteEvidence}
      />
    </div>
  );
};

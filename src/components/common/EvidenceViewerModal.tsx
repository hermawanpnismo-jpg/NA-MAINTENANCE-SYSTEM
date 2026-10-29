import React, { useState } from 'react';
import {
  X, Download, Printer, Trash2, Calendar, User, Tag,
  ArrowLeftRight, ZoomIn, CheckCircle2, AlertOctagon, FileText
} from 'lucide-react';
import { OperationEvidence, EvidenceType } from '../../types/index.ts';
import { formatDateTime } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from './DeleteConfirmModal.tsx';

interface EvidenceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: OperationEvidence | null;
  allActivityEvidences?: OperationEvidence[];
  onDelete?: (evidenceId: string) => Promise<void>;
}

const TYPE_LABELS: Record<EvidenceType, { label: string; badge: string; icon: string }> = {
  before: { label: 'Kondisi Sebelum / Before', badge: 'bg-rose-100 text-rose-800 border-rose-300', icon: '🔴' },
  in_progress: { label: 'Pelaksanaan / In-Progress', badge: 'bg-amber-100 text-amber-800 border-amber-300', icon: '🟡' },
  after: { label: 'Kondisi Selesai / After', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: '🟢' },
  damaged_part: { label: 'Komponen Rusak / Part', badge: 'bg-orange-100 text-orange-800 border-orange-300', icon: '🟠' },
  document: { label: 'Dokumen / PTW / BAP', badge: 'bg-blue-100 text-blue-800 border-blue-300', icon: '🔵' }
};

export const EvidenceViewerModal: React.FC<EvidenceViewerModalProps> = ({
  isOpen,
  onClose,
  evidence,
  allActivityEvidences = [],
  onDelete
}) => {
  const [activeEvidence, setActiveEvidence] = useState<OperationEvidence | null>(evidence);
  const [showComparison, setShowComparison] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync activeEvidence when evidence prop changes
  React.useEffect(() => {
    setActiveEvidence(evidence);
    setShowComparison(false);
  }, [evidence]);

  if (!isOpen || !activeEvidence) return null;

  const currentType = activeEvidence.evidence_type || 'before';
  const typeConfig = TYPE_LABELS[currentType] || TYPE_LABELS.before;

  // Find paired before/after photos for comparison
  const beforePhoto = allActivityEvidences.find((e) => e.evidence_type === 'before');
  const afterPhoto = allActivityEvidences.find((e) => e.evidence_type === 'after');
  const canCompare = Boolean(beforePhoto && afterPhoto);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = activeEvidence.file_url;
    link.download = activeEvidence.file_name || `evidence_${activeEvidence.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSheet = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>LEMBAR EVIDENCE PEKERJAAN - ${activeEvidence.activity_code || activeEvidence.activity_id}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; }
            .header { display: flex; align-items: center; justify-between: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .company { font-size: 18px; font-weight: 800; letter-spacing: 0.5px; }
            .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #e2e8f0; color: #0f172a; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
            .meta-item { margin-bottom: 4px; }
            .meta-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
            .meta-val { font-size: 13px; font-weight: 600; }
            .img-container { text-align: center; margin: 20px 0; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #fafafa; }
            .img-container img { max-width: 100%; max-height: 400px; object-fit: contain; }
            .desc-box { background: #f1f5f9; border-left: 4px solid #2563eb; padding: 12px; margin: 20px 0; border-radius: 0 6px 6px 0; }
            .sign-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 40px; text-align: center; }
            .sign-box { border-top: 1px solid #0f172a; padding-top: 8px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">PT NATIONAL ASSEMBLERS</div>
              <div class="sub">Computerized Maintenance Management System (NA-MMS) • Field Evidence Sheet</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">${activeEvidence.activity_code || activeEvidence.activity_id}</span>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Dicetak: ${new Date().toLocaleString('sv', { timeZone: 'Asia/Jakarta' })} WIB</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Judul Evidence</div>
              <div class="meta-val">${activeEvidence.title}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Kategori Tahap</div>
              <div class="meta-val">${typeConfig.label}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Pengunggah / Teknisi</div>
              <div class="meta-val">${activeEvidence.uploaded_by}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Waktu Pengambilan</div>
              <div class="meta-val">${activeEvidence.created_at} WIB</div>
            </div>
          </div>

          <div class="img-container">
            <img src="${activeEvidence.file_url}" alt="Foto Evidence" />
          </div>

          ${activeEvidence.description ? `
            <div class="desc-box">
              <div style="font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; color: #1e3a8a;">Keterangan Temuan / Catatan Teknis:</div>
              <div>${activeEvidence.description}</div>
            </div>
          ` : ''}

          <div class="sign-grid">
            <div>
              <div style="height: 60px;"></div>
              <div class="sign-box">${activeEvidence.uploaded_by}<br/><span style="font-size: 10px; font-weight: 400; color: #64748b;">Teknisi Pelaksana</span></div>
            </div>
            <div>
              <div style="height: 60px;"></div>
              <div class="sign-box">Warto / Hermawan Prasetyo<br/><span style="font-size: 10px; font-weight: 400; color: #64748b;">Supervisor / Maintenance Leader</span></div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const confirmDelete = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(activeEvidence.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus evidence');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
        <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header Bar */}
          <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">{typeConfig.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {activeEvidence.title}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${typeConfig.badge}`}>
                    {typeConfig.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono text-blue-400 font-semibold">
                    {activeEvidence.activity_code || activeEvidence.activity_id}
                  </span>
                  <span>•</span>
                  <span>{activeEvidence.created_at} WIB</span>
                  <span>•</span>
                  <span className="truncate">Oleh: {activeEvidence.uploaded_by}</span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {canCompare && (
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showComparison
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title="Bandingkan foto sebelum dan sesudah perbaikan"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bandingkan Sebelum & Sesudah</span>
                </button>
              )}
              <button
                onClick={handlePrintSheet}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                title="Cetak Lembar Evidence / Berita Acara"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                title="Unduh File Foto"
              >
                <Download className="w-4 h-4" />
              </button>
              {onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 bg-rose-950/50 hover:bg-rose-900 text-rose-300 rounded-lg text-xs border border-rose-800/40 transition-colors cursor-pointer"
                  title="Hapus Evidence"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/95 flex flex-col items-center justify-center">
            {showComparison && beforePhoto && afterPhoto ? (
              /* Before & After Comparative Dual View */
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 px-2 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>KONDISI SEBELUM (BEFORE REPAIR)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>KONDISI SESUDAH (AFTER REPAIR)</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {/* Left: Before */}
                  <div className="bg-slate-950 rounded-xl border border-rose-500/40 p-2 flex flex-col items-center">
                    <div className="relative w-full h-[360px] flex items-center justify-center overflow-hidden rounded-lg bg-black">
                      <img
                        src={beforePhoto.file_url}
                        alt="Before Repair"
                        className="max-h-full max-w-full object-contain"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shadow-md">
                        SEBELUM
                      </span>
                    </div>
                    <div className="w-full mt-2 px-1 text-left">
                      <p className="text-xs font-bold text-white truncate">{beforePhoto.title}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{beforePhoto.description || 'Kondisi temuan awal'}</p>
                    </div>
                  </div>

                  {/* Right: After */}
                  <div className="bg-slate-950 rounded-xl border border-emerald-500/40 p-2 flex flex-col items-center">
                    <div className="relative w-full h-[360px] flex items-center justify-center overflow-hidden rounded-lg bg-black">
                      <img
                        src={afterPhoto.file_url}
                        alt="After Repair"
                        className="max-h-full max-w-full object-contain"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-md">
                        SESUDAH
                      </span>
                    </div>
                    <div className="w-full mt-2 px-1 text-left">
                      <p className="text-xs font-bold text-white truncate">{afterPhoto.title}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{afterPhoto.description || 'Hasil pekerjaan normal'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Single Photo Viewer */
              <div className="relative w-full flex items-center justify-center min-h-[380px] max-h-[580px] rounded-xl overflow-hidden bg-black p-2 border border-slate-800 shadow-inner">
                <img
                  src={activeEvidence.file_url}
                  alt={activeEvidence.title}
                  className="max-h-[540px] w-auto max-w-full object-contain rounded-lg"
                />
              </div>
            )}

            {/* Technical Finding Notes Banner */}
            {activeEvidence.description && (
              <div className="w-full mt-4 p-3 bg-slate-800/90 rounded-xl border border-slate-700 text-slate-200 text-xs">
                <span className="font-bold text-blue-400 block mb-1 uppercase tracking-wider text-[10px]">
                  Keterangan Temuan / Detail Teknis:
                </span>
                <p className="leading-relaxed">{activeEvidence.description}</p>
              </div>
            )}

            {/* Thumbnails of Other Evidences in this Activity */}
            {allActivityEvidences.length > 1 && (
              <div className="w-full mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Foto Terkait ({allActivityEvidences.length}):
                </span>
                {allActivityEvidences.map((item) => {
                  const isCurrent = activeEvidence.id === item.id;
                  const itemCfg = TYPE_LABELS[item.evidence_type] || TYPE_LABELS.before;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveEvidence(item);
                        setShowComparison(false);
                      }}
                      className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-blue-500 ring-2 ring-blue-500/40 scale-105'
                          : 'border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500'
                      }`}
                      title={`${item.title} (${itemCfg.label})`}
                    >
                      <img
                        src={item.file_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 text-[10px] px-1 bg-black/70 rounded-tl">
                        {itemCfg.icon}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        title="Hapus Foto Evidence"
        itemName={activeEvidence.title}
        itemType="foto evidence operasional"
        warningText="Foto dan catatan audit evidence ini akan dihapus permanen dari server MMS."
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};

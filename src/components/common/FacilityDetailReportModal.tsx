import React, { useEffect, useState, useRef } from 'react';
import {
  Printer, FileText, Download, X, Copy, Check, Building,
  Clock, Wrench, Shield, CheckCircle2, ChevronDown, Camera,
  Users, DollarSign, Layers, Flame, Sparkles, HelpCircle, Activity,
  GitCommit, ArrowRight, CheckSquare, Compass, Upload, Image as ImageIcon,
  Trash2, ZoomIn, Clipboard, AlertCircle, Loader2, Plus, Eye,
  Edit3, Save, HardDrive, RotateCcw, AlertTriangle
} from 'lucide-react';
import { FacilityInspection, OperationEvidence, EvidenceType, SignoffAuthorities } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatDateTime, formatDate } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from './DeleteConfirmModal.tsx';
import { EvidenceViewerModal } from './EvidenceViewerModal.tsx';
import { DatabaseBackupModal } from './DatabaseBackupModal.tsx';
import { OverdueTaskRecordModal } from './OverdueTaskRecordModal.tsx';

interface FacilityDetailReportModalProps {
  inspection: FacilityInspection | null;
  allInspections?: FacilityInspection[];
  onSelectInspection?: (ins: FacilityInspection) => void;
  onClose: () => void;
  onRefresh?: () => void;
}

export const FacilityDetailReportModal: React.FC<FacilityDetailReportModalProps> = ({
  inspection: initialInspection,
  allInspections = [],
  onSelectInspection,
  onClose,
  onRefresh
}) => {
  const [currentInspection, setCurrentInspection] = useState<FacilityInspection | null>(initialInspection);
  const [detailedData, setDetailedData] = useState<any>(null);
  const [authorities, setAuthorities] = useState<SignoffAuthorities | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getManagementSignoffs().then(setAuthorities).catch(() => {});
  }, []);

  // Photo & Evidence Attachment States (Before, Process, After)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetStageRef = useRef<EvidenceType>('before');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [stagedPhoto, setStagedPhoto] = useState<{
    dataUrl: string;
    sizeLabel: string;
    fileName: string;
  } | null>(null);
  const [photoCategory, setPhotoCategory] = useState<EvidenceType>('before');
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoDescription, setPhotoDescription] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [selectedViewerEvidence, setSelectedViewerEvidence] = useState<OperationEvidence | null>(null);
  const [evidenceToDelete, setEvidenceToDelete] = useState<OperationEvidence | null>(null);
  const [isDeletingEvidence, setIsDeletingEvidence] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // Manual Form Fill & Edit States
  const [isEditingManual, setIsEditingManual] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);

  const [editForm, setEditForm] = useState<{
    area_description: string;
    findings: string;
    corrective_action: string;
    preventive_action: string;
    technical_condition: string;
    status: string;
    inspection_date: string;
    downtime_minutes: number;
    due_date: string;
    inspector: string;
    reported_by: string;
    verified_by: string;
    approved_by: string;
    acknowledged_by: string;

    // 2. Ishikawa 4M+1E
    ishikawa_man: string;
    ishikawa_machine: string;
    ishikawa_method: string;
    ishikawa_material: string;
    ishikawa_environment: string;

    // 3. 5-Why
    why1: string;
    why2: string;
    why3: string;
    why4: string;
    why5: string;

    // 6. Trial Run / Functional Test
    trial_run_result: string;

    // 8. Sign-off custom fields
    sign_report_by_name: string;
    sign_report_by_title: string;
    sign_verified_by_name: string;
    sign_verified_by_title: string;
    sign_approved_by_name: string;
    sign_approved_by_title: string;
    sign_acknowledged_by_name: string;
    sign_acknowledged_by_title: string;
  }>({
    area_description: '',
    findings: '',
    corrective_action: '',
    preventive_action: '',
    technical_condition: 'Normal / Good',
    status: 'Open',
    inspection_date: '',
    downtime_minutes: 0,
    due_date: '',
    inspector: '',
    reported_by: 'Alfin Prasetyo (Leader - NA-2 AION)',
    verified_by: 'Hermawan Prasetyo (GA-Maintenance Department)',
    approved_by: 'Warto (Maintenance Leader / Spv)',
    acknowledged_by: 'Plant Manager (Head of Manufacturing)',

    ishikawa_man: 'Personil pemeliharaan & inspektur sipil telah mematuhi SOP K3 konstruksi.',
    ishikawa_machine: 'Struktur sarana fasilitas gedung dan utilitas pendukung.',
    ishikawa_method: 'Metode inspeksi visual dan pengukuran alat uji berkala.',
    ishikawa_material: 'Material perbaikan berkualitas sesuai standar fabrikasi pabrik.',
    ishikawa_environment: 'Kondisi cuaca tropis, curah hujan, dan kelembapan area workshop.',

    why1: 'Mengapa temuan fisik pada fasilitas gedung terdeteksi?',
    why2: 'Mengapa proteksi atau sealant mengalami keausan?',
    why3: 'Mengapa siklus inspeksi memerlukan penjadwalan berkala?',
    why4: 'Mengapa tindakan perbaikan spesifik harus segera diterapkan?',
    why5: 'Akar Masalah Fundamental: Prosedur pemeliharaan preventif fasilitas perlu audit periodik.',

    trial_run_result: 'Inspeksi pasca perbaikan telah diuji coba. Hasil normal, tidak ada rembesan/kebocoran, fungsi sarana siap dioperasikan.',

    sign_report_by_name: 'Alfin Prasetyo (Leader - NA-2 AION)',
    sign_report_by_title: 'Maintenance Leader',
    sign_verified_by_name: 'Hermawan Prasetyo',
    sign_verified_by_title: 'GA-Maintenance Department',
    sign_approved_by_name: 'Warto',
    sign_approved_by_title: 'Maintenance Leader / Spv',
    sign_acknowledged_by_name: 'Plant Manager',
    sign_acknowledged_by_title: 'Head of Manufacturing'
  });

  const loadDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.getFacilityInspection(id);
      setDetailedData(res);
      setCurrentInspection(res);

      // Populate edit form
      setEditForm({
        area_description: res.area_description || '',
        findings: res.findings || '',
        corrective_action: res.corrective_action || '',
        preventive_action: res.preventive_action || 'Pemeriksaan berkala setiap 2 minggu dan pembersihan talang sebelum musim hujan',
        technical_condition: res.technical_condition || 'Normal / Good',
        status: res.status || 'Open',
        inspection_date: res.inspection_date || '',
        downtime_minutes: res.downtime_minutes || 0,
        due_date: res.due_date || '',
        inspector: res.inspector || 'Bambang Supriyanto',
        reported_by: res.reported_by || 'Alfin Prasetyo (Leader - NA-2 AION)',
        verified_by: res.verified_by || 'Hermawan Prasetyo (GA-Maintenance Department)',
        approved_by: res.approved_by || 'Warto (Maintenance Leader / Spv)',
        acknowledged_by: res.acknowledged_by || 'Plant Manager (Head of Manufacturing)',

        ishikawa_man: res.ishikawa_man || 'Personil teknisi sipil mematuhi LOTO dan APD kerja ketinggian (full body harness)',
        ishikawa_machine: res.ishikawa_machine || `Kondisi fisik ${res.facility_category || 'fasilitas'} pada area ${res.area_description || 'pabrik'}`,
        ishikawa_method: res.ishikawa_method || 'Metode aplikasi perbaikan sesuai spesifikasi standar fabrikasi otomotif',
        ishikawa_material: res.ishikawa_material || 'Penggunaan material sealant polyurethane, waterproof elastomeric, atau part OEM',
        ishikawa_environment: res.ishikawa_environment || 'Fluktuasi suhu atap pabrik dan paparan air hujan intensitas tinggi',

        why1: res.why1 || (res.findings ? `Temuan terdeteksi: ${res.findings.slice(0, 100)}` : 'Terjadi indikasi degradasi fisik pada elemen fasilitas'),
        why2: res.why2 || 'Paparan cuaca dan getaran struktural operasional lini manufaktur jangka panjang',
        why3: res.why3 || 'Sealant atau lapisan proteksi mencapai batas usia pakai operasional',
        why4: res.why4 || 'Perlu peremajaan dan penggantian material dengan grade industri tahan cuaca',
        why5: res.why5 || 'Akar Masalah Fundamental: Jadwal pemeliharaan preventif fasilitas gedung diselaraskan dengan rencana PM berkala',

        trial_run_result: res.trial_run_result || (res.status === 'Completed' ? 'Uji siram air & tes fungsi telah diverifikasi: Kondisi aman, bersih, dan laik operasi.' : 'Menunggu pelaksanaan tindakan perbaikan dan verifikasi serah terima.'),

        sign_report_by_name: 'Alfin Prasetyo (Leader - NA-2 AION)',
        sign_report_by_title: 'Maintenance Leader',
        sign_verified_by_name: 'Hermawan Prasetyo',
        sign_verified_by_title: 'GA-Maintenance Department',
        sign_approved_by_name: 'Warto',
        sign_approved_by_title: 'Maintenance Leader / Spv',
        sign_acknowledged_by_name: 'Plant Manager',
        sign_acknowledged_by_title: 'Head of Manufacturing'
      });
    } catch (err) {
      console.error('Error loading inspection detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialInspection?.id) {
      loadDetail(initialInspection.id);
    }
  }, [initialInspection?.id]);

  // Image Compression Helper
  const compressImage = (file: File): Promise<{ dataUrl: string; sizeLabel: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1280;
          const maxHeight = 1280;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context tidak tersedia'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const approxKb = Math.round((dataUrl.length * 3) / 4 / 1024);
          resolve({
            dataUrl,
            sizeLabel: `${approxKb} KB`
          });
        };
        img.onerror = () => reject(new Error('Format berkas gambar tidak valid'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Gagal membaca berkas gambar'));
      reader.readAsDataURL(file);
    });
  };

  const handleIncomingImageFile = async (file: File, stageOverride?: EvidenceType) => {
    try {
      setToastMessage({ type: 'info', text: 'Mengoptimalkan foto dokumentasi fasilitas...' });
      const { dataUrl, sizeLabel } = await compressImage(file);
      const stage = stageOverride || targetStageRef.current || 'before';
      setStagedPhoto({
        dataUrl,
        sizeLabel,
        fileName: file.name || `foto_fasilitas_${stage}_${Date.now()}.jpg`
      });
      setPhotoCategory(stage);
      const activeIns = detailedData || currentInspection;
      const stageName =
        stage === 'before'
          ? 'BEFORE (Sebelum Perbaikan)'
          : stage === 'in_progress'
          ? 'PROCESS (Proses Pengerjaan)'
          : 'AFTER (Setelah Selesai)';
      setPhotoTitle(`[${stageName}] ${activeIns?.facility_category || 'Fasilitas Gedung'}`);
      setPhotoDescription('');
      setIsPasteModalOpen(true);
      setToastMessage(null);
    } catch (err: any) {
      console.error('Error handling image file:', err);
      setToastMessage({ type: 'warning', text: err.message || 'Gagal memproses berkas gambar.' });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleOpenUploadForStage = (stage: EvidenceType) => {
    targetStageRef.current = stage;
    fileInputRef.current?.click();
  };

  const handleTriggerPasteForStage = async (stage: EvidenceType) => {
    targetStageRef.current = stage;
    try {
      if (!navigator.clipboard?.read) {
        setToastMessage({ type: 'info', text: 'Gunakan Ctrl+V langsung pada keyboard untuk menempel foto.' });
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }
      const items = await navigator.clipboard.read();
      let found = false;
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], `clipboard_facility_${stage}_${Date.now()}.png`, { type });
            await handleIncomingImageFile(file, stage);
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        setToastMessage({ type: 'warning', text: 'Tidak ada gambar di clipboard. Ambil screenshot (Win+Shift+S) lalu klik Paste lagi.' });
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err: any) {
      setToastMessage({ type: 'info', text: 'Akses clipboard ditolak peramban. Silakan tekan Ctrl+V pada keyboard.' });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Global paste handler
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if ((target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') && !e.clipboardData?.files?.length) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleIncomingImageFile(file, targetStageRef.current);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [detailedData, currentInspection]);

  const handleSavePhotoAttachment = async () => {
    if (!stagedPhoto) return;
    const activeIns = detailedData || currentInspection;
    if (!activeIns?.id) return;
    try {
      setIsSavingPhoto(true);
      await api.createEvidence({
        activity_type: 'facility_inspection',
        activity_id: activeIns.id,
        activity_code: activeIns.inspection_code,
        evidence_type: photoCategory,
        title: photoTitle.trim() || `Foto ${photoCategory.toUpperCase()} - ${activeIns.facility_category}`,
        description: photoDescription.trim() || `Dokumentasi inspeksi fasilitas area ${activeIns.area_description}`,
        file_data: stagedPhoto.dataUrl,
        file_name: stagedPhoto.fileName,
        file_size_label: stagedPhoto.sizeLabel,
        uploaded_by: 'Hermawan Prasetyo (GA-Maintenance)'
      });

      setToastMessage({ type: 'success', text: `Foto ${photoCategory.toUpperCase()} berhasil disimpan ke database!` });
      setTimeout(() => setToastMessage(null), 3000);
      setIsPasteModalOpen(false);
      setStagedPhoto(null);
      await loadDetail(activeIns.id);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan foto ke database.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleSaveManualEdit = async () => {
    const activeIns = detailedData || currentInspection;
    if (!activeIns?.id) return;
    try {
      setIsSavingManual(true);
      await api.updateFacilityInspectionAnalysis(activeIns.id, {
        ...editForm,
        user_name: 'Hermawan Prasetyo (GA-Maintenance)'
      });

      setToastMessage({ type: 'success', text: 'Seluruh form laporan inspeksi fasilitas berhasil disimpan ke database!' });
      setTimeout(() => setToastMessage(null), 3500);
      setIsEditingManual(false);
      await loadDetail(activeIns.id);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan form manual ke database.');
    } finally {
      setIsSavingManual(false);
    }
  };

  const activeInspection = detailedData || currentInspection;
  if (!activeInspection) return null;

  const evidences: OperationEvidence[] = detailedData?.evidences || [];
  const beforePhotos = evidences.filter((e) => e.evidence_type === 'before');
  const processPhotos = evidences.filter((e) => e.evidence_type === 'in_progress');
  const afterPhotos = evidences.filter((e) => e.evidence_type === 'after');

  const isOverdue = Boolean(activeInspection.is_overdue || (activeInspection.due_date && new Date(activeInspection.due_date) < new Date() && activeInspection.status !== 'Completed'));

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl flex flex-col my-auto max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:rounded-none overflow-hidden text-xs">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {activeInspection.inspection_code}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                  {activeInspection.facility_category}
                </span>
                {isOverdue && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse">
                    OVERDUE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Detail Laporan 5W+1H, 4M+1E Ishikawa, &amp; Otorisasi Pengesahan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Switch Inspection if list provided */}
            {allInspections.length > 1 && onSelectInspection && (
              <select
                value={activeInspection.id}
                onChange={(e) => {
                  const found = allInspections.find((i) => i.id === e.target.value);
                  if (found) {
                    setCurrentInspection(found);
                    loadDetail(found.id);
                    onSelectInspection(found);
                  }
                }}
                className="bg-slate-800 text-white text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                {allInspections.map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.inspection_code} - {ins.facility_category}
                  </option>
                ))}
              </select>
            )}

            {/* Overdue Record Button */}
            {isOverdue && (
              <button
                type="button"
                onClick={() => setIsOverdueModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all"
                title="Catat alasan keterlambatan & mitigasi risiko overdue"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{activeInspection.overdue_reason ? 'Edit Overdue' : 'Catat Overdue'}</span>
              </button>
            )}

            {/* Toggle Manual Form Editing */}
            <button
              type="button"
              onClick={() => {
                if (isEditingManual) {
                  handleSaveManualEdit();
                } else {
                  setIsEditingManual(true);
                }
              }}
              disabled={isSavingManual}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isEditingManual
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title={isEditingManual ? 'Simpan perubahan manual form ke database' : 'Klik untuk edit manual seluruh kolom formulir'}
            >
              {isSavingManual ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isEditingManual ? (
                <Save className="w-3.5 h-3.5 text-white" />
              ) : (
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isEditingManual ? 'Simpan Form' : 'Edit Form Manual'}</span>
            </button>

            {/* Simpan DB ke Hardisk PC */}
            <button
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              title="Download backup database ke hardisk PC lokal"
            >
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Backup ke Hardisk PC</span>
            </button>

            {/* Print Manual / PDF */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Print dokumen laporan atau Simpan sebagai PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-slate-800 animate-in fade-in shrink-0">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              {toastMessage.text}
            </span>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Printable Document Body */}
        <div ref={reportRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 print:p-0 print:overflow-visible">
          {/* =========================================================================
              HEADER PERUSAHAAN & DEPARTEMEN
              ========================================================================= */}
          <div className="border-b-2 border-slate-900 pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-xl tracking-wider shrink-0 print:border print:border-black">
                  NA
                </div>
                <div>
                  <h1 className="text-base font-black text-slate-900 tracking-tight uppercase leading-tight">
                    PT NATIONAL ASSEMBLERS
                  </h1>
                  <h2 className="text-xs font-extrabold text-blue-900 tracking-wide uppercase leading-tight">
                    GENERAL AFFAIR &amp; MAINTENANCE DEPARTMENT
                  </h2>
                  <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                    Kawasan Industri Jababeka / Karawang · Civil Infrastructure, Facility Audit &amp; Maintenance Operations
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-black font-mono rounded tracking-wider uppercase mb-1">
                  BUILDING FACILITY REPORT
                </span>
                <div className="text-[10px] text-slate-600 font-mono">
                  No: <span className="font-bold text-slate-900">{activeInspection.inspection_code}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Tanggal: {formatDate(activeInspection.inspection_date || new Date().toISOString())}
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Delay Alert Strip (if task is overdue) */}
          {isOverdue && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-xs">Peringatan Keterlambatan Tugas (Overdue Facility Task)</span>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    {activeInspection.overdue_reason
                      ? `Alasan: ${activeInspection.overdue_reason} | Mitigasi: ${activeInspection.overdue_action_plan || '-'}`
                      : 'Tugas inspeksi / perbaikan fasilitas ini telah melewati target tanggal due date dan belum dicatat justifikasinya.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOverdueModalOpen(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer print:hidden"
              >
                {activeInspection.overdue_reason ? 'Edit Justifikasi Overdue' : 'Input Catatan Overdue'}
              </button>
            </div>
          )}

          {/* =========================================================================
              SECTION 1: 5W + 1H PROBLEM ANALYSIS (DETAIL RINGKASAN KEJADIAN)
              ========================================================================= */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300 flex items-center justify-between">
              <span>1. Incident / Inspection Summary &amp; 5W + 1H Analysis</span>
              <span className="text-[9px] text-slate-500 font-normal">Identifikasi Kronologis &amp; Lingkup Area</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-[11px]">
              {/* WHO */}
              <div className="p-3 space-y-1 bg-white">
                <span className="font-bold text-blue-900 block text-[10px] uppercase tracking-wider">
                  [WHO] Siapa Pihak Terlibat?
                </span>
                <div className="text-slate-800">
                  <p><span className="text-slate-500">Pelapor / Lead:</span> <strong>{editForm.reported_by}</strong></p>
                  <p><span className="text-slate-500">Inspektor Lapangan:</span> <strong>{editForm.inspector}</strong></p>
                  <p><span className="text-slate-500">Regu Teknisi:</span> {activeInspection.tech_names || activeInspection.assigned_tech_name || 'Regu Teknisi Sipil & GA'}</p>
                </div>
              </div>

              {/* WHAT */}
              <div className="p-3 space-y-1 bg-white">
                <span className="font-bold text-blue-900 block text-[10px] uppercase tracking-wider">
                  [WHAT] Apa Temuan / Kerusakan?
                </span>
                {isEditingManual ? (
                  <textarea
                    rows={2}
                    value={editForm.findings}
                    onChange={(e) => setEditForm({ ...editForm, findings: e.target.value })}
                    className="w-full p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-slate-800 font-semibold">{editForm.findings || 'Pemeriksaan rutin sarana fisik gedung'}</p>
                )}
                <div className="text-[10px] text-slate-500">
                  Kategori: <span className="font-bold text-slate-700">{activeInspection.facility_category}</span> · Kondisi: <span className="font-bold text-slate-700">{editForm.technical_condition}</span>
                </div>
              </div>

              {/* WHERE */}
              <div className="p-3 space-y-1 bg-white">
                <span className="font-bold text-blue-900 block text-[10px] uppercase tracking-wider">
                  [WHERE] Di Mana Lokasi Kejadian?
                </span>
                {isEditingManual ? (
                  <input
                    type="text"
                    value={editForm.area_description}
                    onChange={(e) => setEditForm({ ...editForm, area_description: e.target.value })}
                    className="w-full p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-slate-800 font-semibold">{editForm.area_description || '-'}</p>
                )}
                <p className="text-[10px] text-slate-500">
                  Pabrik: <strong>{activeInspection.plant_name || activeInspection.plant_code || 'NA-2'}</strong> · Gedung: {activeInspection.building_name || '-'}
                </p>
              </div>

              {/* WHEN */}
              <div className="p-3 space-y-1 bg-slate-50/50 border-t border-slate-200">
                <span className="font-bold text-blue-900 block text-[10px] uppercase tracking-wider">
                  [WHEN] Kapan Terdeteksi / Dilaporkan?
                </span>
                <p className="text-slate-800 font-medium">
                  {formatDate(editForm.inspection_date || activeInspection.created_at || new Date().toISOString())}
                </p>
                <p className="text-[10px] text-slate-500">
                  Target Selesai (Due): {editForm.due_date ? formatDate(editForm.due_date) : 'Sesuai SLA Perbaikan'}
                </p>
              </div>

              {/* WHY */}
              <div className="p-3 space-y-1 bg-slate-50/50 border-t border-slate-200">
                <span className="font-bold text-blue-900 block text-[10px] uppercase tracking-wider">
                  [WHY] Mengapa Kondisi Rusak / Perlu Perbaikan?
                </span>
                <p className="text-slate-800 text-[11px] leading-relaxed">
                  {editForm.why2 || 'Paparan cuaca eksternal dan degradasi material pelapis struktural.'}
                </p>
              </div>

              {/* HOW */}
              <div className="p-3 space-y-1 bg-slate-50/50 border-t border-slate-200">
                <span className="font-bold text-blue-900 block text-[10px] uppercase tracking-wider">
                  [HOW] Bagaimana Penanganan Cepat?
                </span>
                {isEditingManual ? (
                  <textarea
                    rows={2}
                    value={editForm.corrective_action}
                    onChange={(e) => setEditForm({ ...editForm, corrective_action: e.target.value })}
                    className="w-full p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-slate-800 text-[11px] leading-relaxed">
                    {editForm.corrective_action || 'Perbaikan titik kerusakan, penyegelan polyurethane, dan pembersihan saluran air.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 2: PROBLEM ANALYSIS (ISHIKAWA 4M + 1E FACTOR BREAKDOWN)
              ========================================================================= */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300 flex items-center justify-between">
              <span>2. Problem Analysis (Ishikawa 4M + 1E Factor Breakdown)</span>
              <span className="text-[9px] text-slate-500 font-normal">Analisis Faktor Penyebab Kerusakan Fasilitas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-[10.5px]">
              {/* MAN */}
              <div className="p-2.5 bg-white space-y-1">
                <span className="font-bold text-slate-800 block text-[9.5px] uppercase tracking-wide">
                  MAN (MANUSIA)
                </span>
                {isEditingManual ? (
                  <textarea
                    rows={3}
                    value={editForm.ishikawa_man}
                    onChange={(e) => setEditForm({ ...editForm, ishikawa_man: e.target.value })}
                    className="w-full p-1 text-[10px] border border-slate-300 rounded"
                  />
                ) : (
                  <p className="text-slate-700 leading-tight">{editForm.ishikawa_man}</p>
                )}
              </div>

              {/* MACHINE / FACILITY */}
              <div className="p-2.5 bg-rose-50/40 space-y-1">
                <span className="font-bold text-rose-900 block text-[9.5px] uppercase tracking-wide">
                  MACHINE / FACILITY
                </span>
                {isEditingManual ? (
                  <textarea
                    rows={3}
                    value={editForm.ishikawa_machine}
                    onChange={(e) => setEditForm({ ...editForm, ishikawa_machine: e.target.value })}
                    className="w-full p-1 text-[10px] border border-slate-300 rounded"
                  />
                ) : (
                  <p className="text-slate-700 leading-tight">{editForm.ishikawa_machine}</p>
                )}
              </div>

              {/* METHOD */}
              <div className="p-2.5 bg-white space-y-1">
                <span className="font-bold text-slate-800 block text-[9.5px] uppercase tracking-wide">
                  METHOD (METODE)
                </span>
                {isEditingManual ? (
                  <textarea
                    rows={3}
                    value={editForm.ishikawa_method}
                    onChange={(e) => setEditForm({ ...editForm, ishikawa_method: e.target.value })}
                    className="w-full p-1 text-[10px] border border-slate-300 rounded"
                  />
                ) : (
                  <p className="text-slate-700 leading-tight">{editForm.ishikawa_method}</p>
                )}
              </div>

              {/* MATERIAL */}
              <div className="p-2.5 bg-white space-y-1">
                <span className="font-bold text-slate-800 block text-[9.5px] uppercase tracking-wide">
                  MATERIAL (PART)
                </span>
                {isEditingManual ? (
                  <textarea
                    rows={3}
                    value={editForm.ishikawa_material}
                    onChange={(e) => setEditForm({ ...editForm, ishikawa_material: e.target.value })}
                    className="w-full p-1 text-[10px] border border-slate-300 rounded"
                  />
                ) : (
                  <p className="text-slate-700 leading-tight">{editForm.ishikawa_material}</p>
                )}
              </div>

              {/* ENVIRONMENT */}
              <div className="p-2.5 bg-white space-y-1">
                <span className="font-bold text-slate-800 block text-[9.5px] uppercase tracking-wide">
                  ENV (LINGKUNGAN)
                </span>
                {isEditingManual ? (
                  <textarea
                    rows={3}
                    value={editForm.ishikawa_environment}
                    onChange={(e) => setEditForm({ ...editForm, ishikawa_environment: e.target.value })}
                    className="w-full p-1 text-[10px] border border-slate-300 rounded"
                  />
                ) : (
                  <p className="text-slate-700 leading-tight">{editForm.ishikawa_environment}</p>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 3: 5-WHY ROOT CAUSE ANALYSIS & SECTION 4: CAPA
              ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3. 5-Why */}
            <div className="border border-slate-300 rounded overflow-hidden flex flex-col justify-between">
              <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300">
                3. 5-Why Root Cause Analysis
              </div>
              <div className="p-3 space-y-2 text-[10.5px]">
                {[
                  { label: 'Why 1', val: editForm.why1, key: 'why1' },
                  { label: 'Why 2', val: editForm.why2, key: 'why2' },
                  { label: 'Why 3', val: editForm.why3, key: 'why3' },
                  { label: 'Why 4', val: editForm.why4, key: 'why4' },
                  { label: 'Root Cause (Why 5)', val: editForm.why5, key: 'why5' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="font-bold font-mono text-blue-900 shrink-0 w-24">
                      {item.label}:
                    </span>
                    {isEditingManual ? (
                      <input
                        type="text"
                        value={item.val}
                        onChange={(e) => setEditForm({ ...editForm, [item.key]: e.target.value })}
                        className="w-full p-1 border border-slate-300 rounded text-[10px]"
                      />
                    ) : (
                      <span className={idx === 4 ? 'font-bold text-rose-900' : 'text-slate-700'}>
                        {item.val}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. CAPA */}
            <div className="border border-slate-300 rounded overflow-hidden flex flex-col justify-between">
              <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300">
                4. Corrective &amp; Preventive Action (CAPA)
              </div>
              <div className="p-3 space-y-3 text-[10.5px]">
                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">Tindakan Perbaikan Langsung (Corrective Action):</span>
                  {isEditingManual ? (
                    <textarea
                      rows={2}
                      value={editForm.corrective_action}
                      onChange={(e) => setEditForm({ ...editForm, corrective_action: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded"
                    />
                  ) : (
                    <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                      {editForm.corrective_action || 'Perbaikan fisik fasilitas dan pengujian kedap air'}
                    </p>
                  )}
                </div>

                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">Tindakan Pencegahan Rekurensi (Preventive Action):</span>
                  {isEditingManual ? (
                    <textarea
                      rows={2}
                      value={editForm.preventive_action}
                      onChange={(e) => setEditForm({ ...editForm, preventive_action: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded"
                    />
                  ) : (
                    <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                      {editForm.preventive_action}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 5 & 6: REGU TEKNISI & VERIFIKASI TRIAL RUN / HAND-OVER
              ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 5. Regu Teknisi */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300">
                5. Regu Teknisi &amp; Manpower Allocation
              </div>
              <div className="p-3 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Inspektor / PIC:</span>
                  <strong className="text-slate-900">{editForm.inspector}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Departemen:</span>
                  <span className="font-semibold text-slate-800">HRGA – Building Facility &amp; Utility</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Lead Technician:</span>
                  <strong className="text-blue-900">Dedi (Lead Technician)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tim Eksekutor:</span>
                  <span className="text-slate-800">Marsino, Amin Irfan, Bambang Supriyanto</span>
                </div>
              </div>
            </div>

            {/* 6. Trial Run & Readiness */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300">
                6. Verifikasi Selesai &amp; Hand-Over Signoff
              </div>
              <div className="p-3 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status Operasional:</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    activeInspection.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {activeInspection.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Catatan Uji Coba / Serah Terima:</span>
                  {isEditingManual ? (
                    <textarea
                      rows={2}
                      value={editForm.trial_run_result}
                      onChange={(e) => setEditForm({ ...editForm, trial_run_result: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded text-[10.5px]"
                    />
                  ) : (
                    <p className="text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200 text-[10.5px]">
                      {editForm.trial_run_result}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 7: FIELD EVIDENCE PHOTOS (BEFORE, PROCESS, AFTER DALAM 1 KOLOM)
              ========================================================================= */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300 flex items-center justify-between">
              <span>7. Field Evidence Photos (Before, Process &amp; After - Satu Kolom)</span>
              <span className="text-[9px] text-slate-500 font-normal">Dokumentasi Visual Lapangan</span>
            </div>

            <div className="p-3 bg-slate-50/50 space-y-4">
              {/* Kolom Terintegrasi: Sebelum, Pengerjaan, dan Sesudah */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* BEFORE */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-bold text-[10.5px] text-rose-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      1. BEFORE (Sebelum)
                    </span>
                    <div className="flex items-center gap-1 print:hidden">
                      <button
                        type="button"
                        onClick={() => handleTriggerPasteForStage('before')}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold cursor-pointer"
                        title="Tempel dari Clipboard"
                      >
                        Paste
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenUploadForStage('before')}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[9px] font-bold cursor-pointer"
                        title="Pilih File Gambar"
                      >
                        Upload
                      </button>
                    </div>
                  </div>

                  {beforePhotos.length > 0 ? (
                    <div className="space-y-2">
                      {beforePhotos.map((photo) => (
                        <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
                          <img
                            src={photo.file_url}
                            alt={photo.title}
                            className="w-full h-36 object-cover cursor-pointer hover:scale-102 transition-transform"
                            onClick={() => setSelectedViewerEvidence(photo)}
                          />
                          <div className="p-1.5 bg-white text-[9.5px]">
                            <p className="font-semibold text-slate-800 truncate">{photo.title}</p>
                            <p className="text-[8.5px] text-slate-400">{formatDateTime(photo.created_at)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEvidenceToDelete(photo)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer print:hidden"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => handleTriggerPasteForStage('before')}
                      className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors text-[10px]"
                    >
                      <Camera className="w-5 h-5 mb-1 text-slate-300" />
                      <span>Belum ada foto Before</span>
                      <span className="text-[8.5px] text-slate-400">Klik / Tekan Ctrl+V untuk tempel</span>
                    </div>
                  )}
                </div>

                {/* PROCESS */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-bold text-[10.5px] text-amber-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      2. PROCESS (Proses Pengerjaan)
                    </span>
                    <div className="flex items-center gap-1 print:hidden">
                      <button
                        type="button"
                        onClick={() => handleTriggerPasteForStage('in_progress')}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold cursor-pointer"
                        title="Tempel dari Clipboard"
                      >
                        Paste
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenUploadForStage('in_progress')}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[9px] font-bold cursor-pointer"
                        title="Pilih File Gambar"
                      >
                        Upload
                      </button>
                    </div>
                  </div>

                  {processPhotos.length > 0 ? (
                    <div className="space-y-2">
                      {processPhotos.map((photo) => (
                        <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
                          <img
                            src={photo.file_url}
                            alt={photo.title}
                            className="w-full h-36 object-cover cursor-pointer hover:scale-102 transition-transform"
                            onClick={() => setSelectedViewerEvidence(photo)}
                          />
                          <div className="p-1.5 bg-white text-[9.5px]">
                            <p className="font-semibold text-slate-800 truncate">{photo.title}</p>
                            <p className="text-[8.5px] text-slate-400">{formatDateTime(photo.created_at)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEvidenceToDelete(photo)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer print:hidden"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => handleTriggerPasteForStage('in_progress')}
                      className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors text-[10px]"
                    >
                      <Camera className="w-5 h-5 mb-1 text-slate-300" />
                      <span>Belum ada foto Process</span>
                      <span className="text-[8.5px] text-slate-400">Klik / Tekan Ctrl+V untuk tempel</span>
                    </div>
                  )}
                </div>

                {/* AFTER */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="font-bold text-[10.5px] text-emerald-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      3. AFTER (Setelah Selesai)
                    </span>
                    <div className="flex items-center gap-1 print:hidden">
                      <button
                        type="button"
                        onClick={() => handleTriggerPasteForStage('after')}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold cursor-pointer"
                        title="Tempel dari Clipboard"
                      >
                        Paste
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenUploadForStage('after')}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[9px] font-bold cursor-pointer"
                        title="Pilih File Gambar"
                      >
                        Upload
                      </button>
                    </div>
                  </div>

                  {afterPhotos.length > 0 ? (
                    <div className="space-y-2">
                      {afterPhotos.map((photo) => (
                        <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
                          <img
                            src={photo.file_url}
                            alt={photo.title}
                            className="w-full h-36 object-cover cursor-pointer hover:scale-102 transition-transform"
                            onClick={() => setSelectedViewerEvidence(photo)}
                          />
                          <div className="p-1.5 bg-white text-[9.5px]">
                            <p className="font-semibold text-slate-800 truncate">{photo.title}</p>
                            <p className="text-[8.5px] text-slate-400">{formatDateTime(photo.created_at)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEvidenceToDelete(photo)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer print:hidden"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => handleTriggerPasteForStage('after')}
                      className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors text-[10px]"
                    >
                      <Camera className="w-5 h-5 mb-1 text-slate-300" />
                      <span>Belum ada foto After</span>
                      <span className="text-[8.5px] text-slate-400">Klik / Tekan Ctrl+V untuk tempel</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 8: LEMBAR OTORISASI & PENGESAHAN (AUTHORIZATION SIGN-OFF)
              ========================================================================= */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300">
              8. Lembar Otorisasi &amp; Pengesahan (Authorization Sign-Off)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 text-center text-[10px] bg-white">
              {/* Report by */}
              <div className="p-3 space-y-1">
                <span className="text-slate-500 font-bold block text-[9.5px] uppercase">
                  Report by :
                </span>
                <div className="h-14 flex items-center justify-center">
                  <span className="font-serif italic text-blue-900 font-bold text-sm tracking-widest opacity-80 select-none">
                    {editForm.sign_report_by_name || 'Alfin Prasetyo'}
                  </span>
                </div>
                {isEditingManual && authorities?.preparedBy && authorities.preparedBy.length > 0 ? (
                  <select
                    value={editForm.sign_report_by_name}
                    onChange={(e) => {
                      const sel = authorities.preparedBy.find((p) => p.name === e.target.value);
                      setEditForm({
                        ...editForm,
                        sign_report_by_name: e.target.value,
                        sign_report_by_title: sel?.job_title || sel?.role || 'Maintenance Leader',
                        reported_by: e.target.value
                      });
                    }}
                    className="w-full p-1 border border-blue-300 rounded text-[9.5px] font-bold bg-blue-50 text-blue-950"
                  >
                    {authorities.preparedBy.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (L{p.hierarchy_level || 3})
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong className="text-slate-900 block text-[10.5px]">
                    {editForm.sign_report_by_name || 'Alfin Prasetyo (Leader - NA-2 AION)'}
                  </strong>
                )}
                <span className="text-slate-500 block text-[9px]">{editForm.sign_report_by_title || 'Maintenance Leader'}</span>
              </div>

              {/* Verified by */}
              <div className="p-3 space-y-1">
                <span className="text-slate-500 font-bold block text-[9.5px] uppercase">
                  Verified by :
                </span>
                <div className="h-14 flex items-center justify-center">
                  <span className="font-serif italic text-blue-900 font-bold text-sm tracking-widest opacity-80 select-none">
                    {editForm.sign_verified_by_name || 'Hermawan Prasetyo'}
                  </span>
                </div>
                {isEditingManual && authorities?.verifiedBy && authorities.verifiedBy.length > 0 ? (
                  <select
                    value={editForm.sign_verified_by_name}
                    onChange={(e) => {
                      const sel = authorities.verifiedBy.find((p) => p.name === e.target.value);
                      setEditForm({
                        ...editForm,
                        sign_verified_by_name: e.target.value,
                        sign_verified_by_title: sel?.company_function || sel?.role || 'GA-Maintenance Department',
                        verified_by: e.target.value
                      });
                    }}
                    className="w-full p-1 border border-emerald-300 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-950"
                  >
                    {authorities.verifiedBy.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (L{p.hierarchy_level || 3})
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong className="text-slate-900 block text-[10.5px]">
                    {editForm.sign_verified_by_name || 'Hermawan Prasetyo'}
                  </strong>
                )}
                <span className="text-slate-500 block text-[9px]">{editForm.sign_verified_by_title || 'GA-Maintenance Department'}</span>
              </div>

              {/* Approved by */}
              <div className="p-3 space-y-1">
                <span className="text-slate-500 font-bold block text-[9.5px] uppercase">
                  Approved by :
                </span>
                <div className="h-14 flex items-center justify-center">
                  <span className="font-serif italic text-blue-900 font-bold text-sm tracking-widest opacity-80 select-none">
                    {editForm.sign_approved_by_name || 'Warto'}
                  </span>
                </div>
                {isEditingManual && authorities?.approvedBy && authorities.approvedBy.length > 0 ? (
                  <select
                    value={editForm.sign_approved_by_name}
                    onChange={(e) => {
                      const sel = authorities.approvedBy.find((p) => p.name === e.target.value);
                      setEditForm({
                        ...editForm,
                        sign_approved_by_name: e.target.value,
                        sign_approved_by_title: sel?.job_title || sel?.role || 'Maintenance Leader / Spv',
                        approved_by: e.target.value
                      });
                    }}
                    className="w-full p-1 border border-blue-300 rounded text-[9.5px] font-bold bg-blue-50 text-blue-950"
                  >
                    {authorities.approvedBy.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (L{p.hierarchy_level || 2})
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong className="text-slate-900 block text-[10.5px]">
                    {editForm.sign_approved_by_name || 'Warto'}
                  </strong>
                )}
                <span className="text-slate-500 block text-[9px]">{editForm.sign_approved_by_title || 'Maintenance Leader / Spv'}</span>
              </div>

              {/* Acknowledge by */}
              <div className="p-3 space-y-1">
                <span className="text-slate-500 font-bold block text-[9.5px] uppercase">
                  Acknowledge by :
                </span>
                <div className="h-14 flex items-center justify-center">
                  <span className="font-serif italic text-slate-700 font-bold text-sm tracking-widest opacity-80 select-none">
                    {editForm.sign_acknowledged_by_name || 'Head of Mfg'}
                  </span>
                </div>
                {isEditingManual && authorities?.acknowledgedBy && authorities.acknowledgedBy.length > 0 ? (
                  <select
                    value={editForm.sign_acknowledged_by_name}
                    onChange={(e) => {
                      const sel = authorities.acknowledgedBy.find((p) => p.name === e.target.value);
                      setEditForm({
                        ...editForm,
                        sign_acknowledged_by_name: e.target.value,
                        sign_acknowledged_by_title: sel?.job_title || 'Head of Manufacturing',
                        acknowledged_by: e.target.value
                      });
                    }}
                    className="w-full p-1 border border-purple-300 rounded text-[9.5px] font-bold bg-purple-50 text-purple-950"
                  >
                    {authorities.acknowledgedBy.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (L{p.hierarchy_level || 1})
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong className="text-slate-900 block text-[10.5px]">
                    {editForm.sign_acknowledged_by_name || 'Plant Manager'}
                  </strong>
                )}
                <span className="text-slate-500 block text-[9px]">{editForm.sign_acknowledged_by_title || 'Head of Manufacturing'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleIncomingImageFile(file, targetStageRef.current);
          }
          e.target.value = '';
        }}
      />

      {/* Photo Stage & Confirmation Modal */}
      {isPasteModalOpen && stagedPhoto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                Konfirmasi Tempel Foto Dokumentasi Fasilitas
              </h3>
              <button onClick={() => setIsPasteModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-56 flex items-center justify-center">
              <img src={stagedPhoto.dataUrl} alt="Preview" className="max-h-56 object-contain" />
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori Dokumentasi:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'before', label: '1. Before (Sebelum)' },
                    { id: 'in_progress', label: '2. Process (Pengerjaan)' },
                    { id: 'after', label: '3. After (Selesai)' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPhotoCategory(cat.id as EvidenceType)}
                      className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border text-center transition-all cursor-pointer ${
                        photoCategory === cat.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Judul / Keterangan Foto:</label>
                <input
                  type="text"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePhotoAttachment}
                disabled={isSavingPhoto}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingPhoto && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Foto ke Database</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Evidence Viewer Modal */}
      {selectedViewerEvidence && (
        <EvidenceViewerModal
          isOpen={Boolean(selectedViewerEvidence)}
          evidence={selectedViewerEvidence}
          onClose={() => setSelectedViewerEvidence(null)}
        />
      )}

      {/* Delete Evidence Confirmation Modal */}
      {evidenceToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(evidenceToDelete)}
          title="Hapus Foto Bukti Fasilitas"
          itemName={evidenceToDelete.title || 'Foto Bukti'}
          itemType="Foto Lapangan"
          warningText="Foto dokumentasi fasilitas ini akan dihapus secara permanen dari server."
          isDeleting={isDeletingEvidence}
          requiredPassword="Nackp2026"
          onConfirm={async () => {
            try {
              setIsDeletingEvidence(true);
              await api.deleteEvidence(evidenceToDelete.id, 'Hermawan Prasetyo');
              setEvidenceToDelete(null);
              setToastMessage({ type: 'success', text: 'Foto bukti berhasil dihapus.' });
              setTimeout(() => setToastMessage(null), 3000);
              await loadDetail(activeInspection.id);
              onRefresh?.();
            } catch (err: any) {
              alert(err.message || 'Gagal menghapus foto.');
            } finally {
              setIsDeletingEvidence(false);
            }
          }}
          onCancel={() => setEvidenceToDelete(null)}
        />
      )}

      {/* Database Backup to PC Modal */}
      {isBackupModalOpen && (
        <DatabaseBackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
        />
      )}

      {/* Overdue Record Modal */}
      {isOverdueModalOpen && (
        <OverdueTaskRecordModal
          isOpen={isOverdueModalOpen}
          task={{
            id: activeInspection.id,
            task_code: activeInspection.inspection_code,
            asset_id: activeInspection.id,
            plant_id: activeInspection.plant_id,
            asset_name: `${activeInspection.facility_category} - ${activeInspection.area_description}`,
            due_date: activeInspection.due_date || activeInspection.inspection_date,
            status: (activeInspection.status === 'Open' ? 'Scheduled' : activeInspection.status) as any,
            tech_name: activeInspection.assigned_tech_name || activeInspection.inspector,
            overdue_reason: activeInspection.overdue_reason,
            overdue_action_plan: activeInspection.overdue_action_plan,
            overdue_revised_due_date: activeInspection.overdue_revised_due_date,
            overdue_risk_level: activeInspection.overdue_risk_level || 'Medium'
          }}
          currentUser="Hermawan Prasetyo (GA-Maintenance)"
          onSaveOverdue={async (data) => {
            await api.recordFacilityInspectionOverdue(activeInspection.id, data);
          }}
          onClose={() => setIsOverdueModalOpen(false)}
          onSuccess={() => {
            setIsOverdueModalOpen(false);
            loadDetail(activeInspection.id);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
};

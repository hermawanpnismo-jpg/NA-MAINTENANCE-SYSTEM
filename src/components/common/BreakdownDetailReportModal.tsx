import React, { useEffect, useState, useRef } from 'react';
import {
  Printer, FileText, Download, X, Copy, Check, AlertOctagon,
  Clock, Wrench, Shield, CheckCircle2, ChevronDown, Camera,
  Users, DollarSign, Layers, Flame, Sparkles, HelpCircle, Activity,
  GitCommit, ArrowRight, CheckSquare, Compass, Upload, Image as ImageIcon,
  Trash2, ZoomIn, Clipboard, AlertCircle, Loader2, Plus, Eye,
  Edit3, Save, HardDrive, RotateCcw
} from 'lucide-react';
import { Breakdown, OperationEvidence, EvidenceType, SignoffAuthorities } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatDateTime, formatDuration, formatIDR } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from './DeleteConfirmModal.tsx';
import { EvidenceViewerModal } from './EvidenceViewerModal.tsx';
import { DatabaseBackupModal } from './DatabaseBackupModal.tsx';

interface BreakdownDetailReportModalProps {
  breakdown: Breakdown | null;
  allBreakdowns?: Breakdown[];
  onSelectBreakdown?: (bd: Breakdown) => void;
  onClose: () => void;
}

export const BreakdownDetailReportModal: React.FC<BreakdownDetailReportModalProps> = ({
  breakdown: initialBreakdown,
  allBreakdowns = [],
  onSelectBreakdown,
  onClose
}) => {
  const [currentBreakdown, setCurrentBreakdown] = useState<Breakdown | null>(initialBreakdown);
  const [detailedData, setDetailedData] = useState<{
    breakdown: Breakdown;
    evidences: OperationEvidence[];
    linked_work_order?: any;
    parts?: any[];
  } | null>(null);
  const [authorities, setAuthorities] = useState<SignoffAuthorities | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getManagementSignoffs().then(setAuthorities).catch((err) => {
      console.warn('Failed to load management signoffs in breakdown report:', err);
    });
  }, []);

  // Photo & Evidence Attachment States (Before, Process, After)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetStageRef = useRef<EvidenceType>('before');
  const [draggingStage, setDraggingStage] = useState<EvidenceType | null>(null);
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
  const [editForm, setEditForm] = useState<{
    failure_description: string;
    location: string;
    report_datetime: string;
    downtime_minutes: number;
    reported_by: string;
    verified_by: string;
    tech_names: string;
    root_cause: string;
    temporary_countermeasure: string;
    category: string;
    production_impact: string;

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

    // 4. CAPA & Parts
    corrective_action: string;
    preventive_action: string;
    replacement_parts: string;

    // 6. Trial Run
    trial_run_result: string;
    trial_run_verified_by: string;

    // 8. Sign-off sheet
    sign_report_by_name: string;
    sign_report_by_title: string;
    sign_verified_by_name: string;
    sign_verified_by_title: string;
    sign_approved_by_name: string;
    sign_approved_by_title: string;
    sign_ack_by_name: string;
    sign_ack_by_title: string;
  } | null>(null);

  useEffect(() => {
    setCurrentBreakdown(initialBreakdown);
  }, [initialBreakdown]);

  useEffect(() => {
    if (!currentBreakdown?.id) return;
    const fetchFullDetails = async () => {
      try {
        setLoading(true);
        const res = await api.getBreakdownDetail(currentBreakdown.id);
        setDetailedData(res);
      } catch (err) {
        console.error('Failed to load breakdown full details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFullDetails();
  }, [currentBreakdown?.id]);

  // Client-side Canvas Image Compression (max 1600x1200, 0.85 quality)
  const compressImage = (file: File): Promise<{ dataUrl: string; sizeLabel: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1600;
          const maxHeight = 1600;
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

  // Helper to stage an incoming image file (from upload, drop, or clipboard paste)
  const handleIncomingImageFile = async (file: File, stageOverride?: EvidenceType) => {
    try {
      setToastMessage({ type: 'info', text: 'Mengoptimalkan foto untuk dokumentasi lapangan...' });
      const { dataUrl, sizeLabel } = await compressImage(file);
      const stage = stageOverride || targetStageRef.current || 'before';
      setStagedPhoto({
        dataUrl,
        sizeLabel,
        fileName: file.name || `foto_${stage}_${Date.now()}.jpg`
      });
      setPhotoCategory(stage);
      const activeBd = detailedData?.breakdown || currentBreakdown;
      const stageName =
        stage === 'before'
          ? 'BEFORE (Sebelum Perbaikan)'
          : stage === 'in_progress'
          ? 'PROCESS (Proses Pengerjaan)'
          : 'AFTER (Setelah Perbaikan)';
      setPhotoTitle(`[${stageName}] ${activeBd?.asset_name || 'Mesin'}`);
      setPhotoDescription('');
      setIsPasteModalOpen(true);
      setToastMessage(null);
    } catch (err: any) {
      console.error('Error handling image file:', err);
      setToastMessage({ type: 'warning', text: err.message || 'Gagal memproses berkas gambar.' });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Trigger file upload for a specific stage (Before, Process, After)
  const handleOpenUploadForStage = (stage: EvidenceType) => {
    targetStageRef.current = stage;
    fileInputRef.current?.click();
  };

  // Trigger paste from clipboard for a specific stage
  const handleTriggerPasteForStage = async (stage: EvidenceType) => {
    targetStageRef.current = stage;
    await handleClipboardPasteClick(stage);
  };

  // Global paste handler: users can press Ctrl+V anywhere in modal to paste screenshots
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // If actively typing text in an input or textarea without files, allow normal text paste
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
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [detailedData?.breakdown?.id, currentBreakdown?.id]);

  // Click handler to paste from clipboard
  const handleClipboardPasteClick = async (stageOverride?: EvidenceType) => {
    try {
      const activeStage = stageOverride || targetStageRef.current || 'before';
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `clipboard_${activeStage}_${Date.now()}.png`, { type: imageType });
            await handleIncomingImageFile(file, activeStage);
            return;
          }
        }
        setToastMessage({
          type: 'warning',
          text: 'Tidak ada gambar di clipboard. Silakan salin screenshot gambar lalu tekan [Ctrl + V] atau tombol Unggah Foto.'
        });
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage({
          type: 'info',
          text: 'Silakan gunakan kombinasi tombol [Ctrl + V] pada keyboard untuk menempelkan foto dari clipboard.'
        });
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      setToastMessage({
        type: 'info',
        text: 'Silakan gunakan kombinasi tombol [Ctrl + V] pada keyboard untuk menempelkan foto dari clipboard.'
      });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Save staged photo into SQLite and link to Breakdown
  const handleSaveStagedPhoto = async () => {
    const activeBd = detailedData?.breakdown || currentBreakdown;
    if (!stagedPhoto || !activeBd?.id) return;

    try {
      setIsSavingPhoto(true);
      const stageLabel =
        photoCategory === 'before'
          ? 'BEFORE'
          : photoCategory === 'in_progress'
          ? 'PROCESS'
          : 'AFTER';

      const res = await api.uploadEvidence({
        activity_type: 'breakdown',
        activity_id: activeBd.id,
        activity_code: activeBd.breakdown_number,
        evidence_type: photoCategory,
        title: photoTitle.trim() || `[${stageLabel}] Bukti Foto - ${activeBd.asset_name}`,
        description: photoDescription.trim(),
        file_data: stagedPhoto.dataUrl,
        file_name: stagedPhoto.fileName,
        file_size: stagedPhoto.sizeLabel,
        uploaded_by: 'Alfin Prasetyo (Leader - NA-2 AION)'
      });

      if (res?.evidence) {
        setDetailedData((prev) =>
          prev
            ? {
                ...prev,
                evidences: [res.evidence, ...(prev.evidences || [])]
              }
            : null
        );
        setIsPasteModalOpen(false);
        setStagedPhoto(null);
        setToastMessage({
          type: 'success',
          text: `Foto dokumentasi ${stageLabel} berhasil disimpan ke Kolom 7!`
        });
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err: any) {
      console.error('Failed to save photo:', err);
      setToastMessage({
        type: 'warning',
        text: err.message || 'Gagal menyimpan foto dokumentasi lapangan.'
      });
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Safe delete evidence with password protection
  const handleDeleteEvidenceConfirm = async () => {
    if (!evidenceToDelete) return;
    try {
      setIsDeletingEvidence(true);
      await api.deleteEvidence(evidenceToDelete.id, 'Alfin Prasetyo (Leader - NA-2 AION)');
      setDetailedData((prev) =>
        prev
          ? {
              ...prev,
              evidences: (prev.evidences || []).filter((e) => e.id !== evidenceToDelete.id)
            }
          : null
      );
      setEvidenceToDelete(null);
      setToastMessage({
        type: 'success',
        text: 'Foto bukti investigasi berhasil dihapus.'
      });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete evidence:', err);
      setToastMessage({
        type: 'warning',
        text: err.message || 'Gagal menghapus foto bukti.'
      });
    } finally {
      setIsDeletingEvidence(false);
    }
  };

  if (!currentBreakdown) return null;

  const bd = detailedData?.breakdown || currentBreakdown;
  const evidences = detailedData?.evidences || [];
  const parts = detailedData?.parts || [];

  // Filter evidence photos into 3 specific stages: Before, Process, and After
  const beforeEvidences = evidences.filter((ev) => ev.evidence_type === 'before' || ev.evidence_type === 'damaged_part');
  const processEvidences = evidences.filter((ev) => ev.evidence_type === 'in_progress');
  const afterEvidences = evidences.filter((ev) => ev.evidence_type === 'after');

  // Parse or synthesize structured 5-Why analysis
  let parsedWhys: string[] = [];
  if (bd.five_why) {
    try {
      const parsed = JSON.parse(bd.five_why);
      if (Array.isArray(parsed)) {
        parsedWhys = parsed.map((w: any) => String(w).replace(/^Why \d+:\s*/i, ''));
      } else {
        parsedWhys = [String(bd.five_why)];
      }
    } catch {
      parsedWhys = bd.five_why.split('\n').map((w) => w.trim()).filter(Boolean);
    }
  }

  // Ensure full 5-Why concept if partial
  const defaultWhyTemplates: Record<string, string[]> = {
    Mechanical: [
      'Mesin mengalami trip / macet operasional saat running beban penuh',
      'Komponen bearing / shaft mengalami gesekan berlebih dan panas abnormal',
      'Film pelumas (grease / oil) telah mengalami degradasi thermal dan mengering',
      'Interval jadwal purging pelumasan preventif terlewat akibat over-utilisasi produksi',
      'Belum adanya sensor monitoring getaran & temperatur online otomatis di stasiun ini'
    ],
    Electrical: [
      'Inverter / breaker kontrol trip proteksi arus lebih (overcurrent OC3)',
      'Motor draw current melebihi batas nominal saat menggerakkan beban mekanikal',
      'Terdapat beban resistansi mekanik abnormal pada coupling dan gear drive',
      'Inspeksi thermography busbar & motor terminal belum dijadwalkan secara periodik',
      'Standar pengecekan beban arus berkala belum diintegrasikan ke daily autonomous checklist'
    ],
    Pneumatic: [
      'Silinder pneumatic bergerak lambat dan tidak mencapai limit switch target',
      'Tekanan udara kerja (air pressure) drop di bawah 5.5 bar pada header stasiun',
      'Filter cartridge regulator tersumbat partikel kondensasi air dan debu pipa',
      'Auto-drain pada air dryer unit utility tidak membuang air akumulasi secara optimal',
      'Frekuensi penggantian filter regulator belum menggunakan differential pressure gauge'
    ],
    Hydraulic: [
      'Tekanan hydraulic power unit (HPU) tidak stabil dan suhu oli melebihi 60°C',
      'Relief valve mengalami kontaminasi partikel mikro sehingga tidak menutup sempurna',
      'Oli hidrolik mengalami penurunan viskositas dan terkontaminasi sludge halus',
      'Filter return line belum diganti sesuai batas jam operasional 2000 jam',
      'Belum adanya sampling oli rutin (oil condition monitoring) setiap 3 bulan'
    ],
    'PLC/Software': [
      'Mesin berhenti interlock dan memicu alarm timeout komunikasi network',
      'Data sinyal sensor photoelectric input tidak terbaca pada modul remote I/O',
      'Kabel transmisi data mengalami interfensi elektromagnetik dari kabel power terdekat',
      'Pemisahan kabel tray power vs sinyal komunikasi belum sesuai standar EMC industri',
      'Belum ada audit wiring perkabelan panel sesuai standar isolasi kebisingan (noise shield)'
    ],
    'Operator Error': [
      'Mesin mengalami benturan mekanik akibat salah posisi benda kerja (chassis tooling)',
      'Operator pengganti belum memahami prosedur alignment sebelum menekan cycle start',
      'Instruksi kerja standar (SOP) tidak diletakkan pada posisi pandang operator',
      'Pelatihan operasional untuk operator relief belum terjadwal sebelum penugasan',
      'Belum dipasangnya sensor Poka-Yoke (mistake-proofing) pencegah salah letak benda'
    ]
  };

  const fallbackWhys = defaultWhyTemplates[bd.category] || defaultWhyTemplates.Mechanical;
  const fiveWhys: string[] = [
    parsedWhys[0] || fallbackWhys[0],
    parsedWhys[1] || fallbackWhys[1],
    parsedWhys[2] || fallbackWhys[2],
    parsedWhys[3] || fallbackWhys[3],
    parsedWhys[4] || fallbackWhys[4]
  ];

  // Stored Ishikawa and Signoff parsing from database
  let storedIshikawa: any = null;
  if (bd.ishikawa_analysis) {
    try {
      storedIshikawa = typeof bd.ishikawa_analysis === 'string' ? JSON.parse(bd.ishikawa_analysis) : bd.ishikawa_analysis;
    } catch {
      storedIshikawa = null;
    }
  }

  let storedSignoff: any = null;
  if (bd.authorization_signoff) {
    try {
      storedSignoff = typeof bd.authorization_signoff === 'string' ? JSON.parse(bd.authorization_signoff) : bd.authorization_signoff;
    } catch {
      storedSignoff = null;
    }
  }

  // 4M + 1E Ishikawa Problem Analysis Factors (reads saved values or default templates)
  const problemFactors = {
    man: storedIshikawa?.man || (bd.category === 'Operator Error'
      ? 'Kurangnya pelatihan operator pengganti terhadap prosedur setting awal & verifikasi limit.'
      : 'Teknisi dan operator telah mematuhi SOP darurat LOTO secara tanggap dan disiplin.'),
    machine: storedIshikawa?.machine || bd.root_cause || `${bd.asset_name} mengalami keausan mekanikal/elektrikal pada komponen kritis akibat degradasi beban operasi.`,
    method: storedIshikawa?.method || 'Prosedur pemeliharaan berkala (PM) memerlukan penyesuaian interval inspeksi dan standar torsi/pelumasan.',
    material: storedIshikawa?.material || (parts.length > 0
      ? `Penggantian komponen: ${parts.map(p => p.part_name).join(', ')} menggunakan part OEM standar kualitas tinggi.`
      : 'Material part pengganti harus memenuhi spesifikasi toleransi tinggi industri otomotif.'),
    environment: storedIshikawa?.environment || 'Area kerja membutuhkan pembersihan berkala dari debu industri dan kontrol kelembapan/suhu sekitar unit.'
  };

  const signoffValues = {
    report_by_name: storedSignoff?.report_by_name || 'Alfin Prasetyo (Leader - NA-2 AION)',
    report_by_title: storedSignoff?.report_by_title || 'Maintenance Leader',
    verified_by_name: storedSignoff?.verified_by_name || 'Hermawan Prasetyo',
    verified_by_title: storedSignoff?.verified_by_title || 'GA-Maintenance Leader All Plant',
    approved_by_name: storedSignoff?.approved_by_name || 'Warto',
    approved_by_title: storedSignoff?.approved_by_title || 'GA-Maintenance Spv',
    ack_by_name: storedSignoff?.ack_by_name || 'Plant Manager',
    ack_by_title: storedSignoff?.ack_by_title || 'Head of Manufacturing',
  };

  // Calculate spare parts cost if any
  const totalPartsCost = parts.reduce((sum, p) => sum + (p.quantity || 0) * (p.unit_price || p.average_cost || 0), 0);

  // Manual Form Editing Handlers
  const handleStartEditManual = () => {
    setEditForm({
      failure_description: bd.failure_description || '',
      location: bd.location || '',
      category: bd.category || 'Mechanical',
      production_impact: bd.production_impact || 'Line Stop',
      report_datetime: bd.report_datetime ? bd.report_datetime.slice(0, 16) : new Date().toISOString().slice(0, 16),
      reported_by: bd.reported_by || 'Alfin Prasetyo (Leader - NA-2 AION)',
      verified_by: bd.verified_by || 'Hermawan Prasetyo',
      tech_names: bd.tech_names || bd.tech_name || 'Marsino & Tim Teknisi Shift',
      root_cause: bd.root_cause || problemFactors.machine || '',
      temporary_countermeasure: bd.temporary_countermeasure || '',
      downtime_minutes: Number(bd.downtime_minutes) || 0,

      ishikawa_man: problemFactors.man,
      ishikawa_machine: problemFactors.machine,
      ishikawa_method: problemFactors.method,
      ishikawa_material: problemFactors.material,
      ishikawa_environment: problemFactors.environment,

      why1: fiveWhys[0] || '',
      why2: fiveWhys[1] || '',
      why3: fiveWhys[2] || '',
      why4: fiveWhys[3] || '',
      why5: fiveWhys[4] || '',

      corrective_action: bd.corrective_action || '',
      preventive_action: bd.preventive_action || 'Standarisasi jadwal pelumasan preventif dan penambahan parameter getaran/temperatur pada Autonomous Maintenance Checklist harian.',
      replacement_parts: bd.replacement_parts || '',

      trial_run_result: bd.trial_run_result || 'Uji coba operasional 30 menit selesai dengan normal, suhu dan vibrasi stabil tanpa ada alarm berulang.',
      trial_run_verified_by: bd.verified_by || 'Hermawan Prasetyo',

      sign_report_by_name: signoffValues.report_by_name,
      sign_report_by_title: signoffValues.report_by_title,
      sign_verified_by_name: signoffValues.verified_by_name,
      sign_verified_by_title: signoffValues.verified_by_title,
      sign_approved_by_name: signoffValues.approved_by_name,
      sign_approved_by_title: signoffValues.approved_by_title,
      sign_ack_by_name: signoffValues.ack_by_name,
      sign_ack_by_title: signoffValues.ack_by_title,
    });
    setIsEditingManual(true);
  };

  const handleSaveManual = async () => {
    if (!editForm || !bd?.id) return;
    try {
      setIsSavingManual(true);
      const ishikawaData = {
        man: editForm.ishikawa_man,
        machine: editForm.ishikawa_machine,
        method: editForm.ishikawa_method,
        material: editForm.ishikawa_material,
        environment: editForm.ishikawa_environment,
      };

      const fiveWhyList = [
        editForm.why1,
        editForm.why2,
        editForm.why3,
        editForm.why4,
        editForm.why5,
      ].filter(Boolean);

      const signoffData = {
        report_by_name: editForm.sign_report_by_name,
        report_by_title: editForm.sign_report_by_title,
        verified_by_name: editForm.sign_verified_by_name,
        verified_by_title: editForm.sign_verified_by_title,
        approved_by_name: editForm.sign_approved_by_name,
        approved_by_title: editForm.sign_approved_by_title,
        ack_by_name: editForm.sign_ack_by_name,
        ack_by_title: editForm.sign_ack_by_title,
      };

      const payload = {
        failure_description: editForm.failure_description,
        location: editForm.location,
        category: editForm.category,
        production_impact: editForm.production_impact,
        report_datetime: editForm.report_datetime,
        reported_by: editForm.reported_by,
        verified_by: editForm.verified_by,
        root_cause: editForm.root_cause,
        temporary_countermeasure: editForm.temporary_countermeasure,
        downtime_minutes: Number(editForm.downtime_minutes) || 0,
        ishikawa_analysis: JSON.stringify(ishikawaData),
        five_why: JSON.stringify(fiveWhyList),
        corrective_action: editForm.corrective_action,
        replacement_parts: editForm.replacement_parts,
        trial_run_result: editForm.trial_run_result,
        authorization_signoff: JSON.stringify(signoffData),
      };

      const updated = await api.updateBreakdown(bd.id, payload);
      setCurrentBreakdown((prev) => (prev ? { ...prev, ...updated } : updated));
      setDetailedData((prev) =>
        prev
          ? {
              ...prev,
              breakdown: { ...prev.breakdown, ...updated }
            }
          : null
      );
      setIsEditingManual(false);
      setToastMessage({
        type: 'success',
        text: 'Laporan breakdown dan analisis 5W/Ishikawa berhasil disimpan ke database!',
      });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      console.error('Failed to save manual edit:', err);
      setToastMessage({
        type: 'warning',
        text: err.message || 'Gagal menyimpan perubahan ke database.',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSavingManual(false);
    }
  };

  // Reliable print via isolated iframe (never blocked, zero parent CSS pollution, works across all browsers)
  const handlePrint = (isPdf = false) => {
    const reportElem = document.getElementById('printable-breakdown-report');
    if (!reportElem) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const title = `Laporan_Breakdown_${bd.breakdown_number}_${bd.asset_tag || 'NA'}`;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 10px;
              line-height: 1.35;
            }
            .report-container {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 3.5px 5px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #f1f5f9;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9px;
            }
            .section-box {
              border: 1px solid #94a3b8;
              border-radius: 4px;
              margin-bottom: 8px;
              overflow: hidden;
              page-break-inside: avoid;
            }
            .section-header {
              background-color: #e2e8f0;
              padding: 3px 6px;
              font-weight: 800;
              font-size: 9.5px;
              text-transform: uppercase;
              border-bottom: 1px solid #94a3b8;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .section-content {
              padding: 5px 6px;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
            }
            .grid-3 {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 6px;
            }
            .grid-4 {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr;
              gap: 5px;
            }
            .grid-5w {
              display: grid;
              grid-template-columns: repeat(6, 1fr);
              gap: 4px;
            }
            .font-mono {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            }
            .text-red { color: #b91c1c; }
            .text-blue { color: #1d4ed8; }
            .text-emerald { color: #047857; }
            .bg-red-light { background-color: #fef2f2; }
            .bg-emerald-light { background-color: #ecfdf5; }
            .bg-slate-light { background-color: #f8fafc; }
            .evidence-img {
              max-width: 100%;
              max-height: 95px;
              object-fit: cover;
              border-radius: 3px;
              border: 1px solid #cbd5e1;
            }
            .evidence-stage-grid {
              display: grid !important;
              grid-template-columns: 1fr 1fr 1fr !important;
              gap: 6px !important;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              border: 1px solid #94a3b8;
              border-radius: 4px;
              text-align: center;
              font-size: 9px;
              page-break-inside: avoid;
            }
            .signature-cell {
              padding: 6px 3px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              min-height: 80px;
              border-right: 1px solid #cbd5e1;
            }
            .signature-cell:last-child {
              border-right: none;
            }
            .sign-line {
              border-bottom: 1px dashed #64748b;
              margin: 32px 8px 3px 8px;
            }
            .no-print {
              display: none !important;
            }
            img {
              max-width: 100%;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            ${reportElem.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2500);
    }, 400);
  };

  const handleCopySummary = () => {
    const text = `
*LAPORAN INVESTIGASI KERUSAKAN & ANALISIS 5W (BREAKDOWN REPORT)*
PT NATIONAL ASSEMBLERS - MAINTENANCE DEPARTMENT
=============================================
Nomor BD     : ${bd.breakdown_number}
Tanggal/Waktu: ${formatDateTime(bd.report_datetime)} WIB
Pabrik / Line: ${bd.plant_name || 'Plant NA'} - ${bd.location || '-'}
Mesin / Unit : ${bd.asset_name} (${bd.asset_tag})
Disiplin     : ${bd.category}
Dampak Prod. : ${bd.production_impact}
Total Downtime: ${bd.downtime_minutes} Menit (${formatDuration(bd.downtime_minutes)})
Status       : ${bd.status}

KONSEP 5W + 1H:
- WHAT  : ${bd.failure_description}
- WHERE : ${bd.plant_name} · ${bd.location} · Tag: ${bd.asset_tag}
- WHEN  : Lapor: ${bd.report_datetime} WIB | Downtime: ${bd.downtime_minutes} min
- WHO   : Pelapor: ${bd.reported_by} | Lead Tech: ${bd.tech_name || 'Marsino'} | Squad: ${bd.tech_names || '-'}
- WHY   : ${bd.root_cause || 'Kegagalan komponen operasional akibat keausan normal'}
- HOW   : ${bd.temporary_countermeasure || 'Isolasi energi LOTO & perbaikan komponen standar'}

ANALISIS 5-WHY:
1. Why 1: ${fiveWhys[0]}
2. Why 2: ${fiveWhys[1]}
3. Why 3: ${fiveWhys[2]}
4. Why 4: ${fiveWhys[3]}
5. Why 5: ${fiveWhys[4]} (Akar Masalah Sistemik)

TINDAKAN KOREKTIF & PREVENTIF:
${bd.corrective_action || '-'}

HASIL UJI COBA (TRIAL RUN):
${bd.trial_run_result || '-'}

REGU TEKNISI : ${bd.tech_names || bd.tech_name || 'Marsino'}
DIVERIFIKASI : ${bd.verified_by || 'Hermawan Prasetyo'}
=============================================
Dicetak dari NA-MMS Computerized Maintenance Management System
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col border border-slate-300 shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        {/* Top Control Header Bar (Hidden in Print) */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 no-print border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/90 border border-red-500 flex items-center justify-center text-white shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">
                  Breakdown Incident Detail Report (5W &amp; Problem Analysis)
                </h3>
                <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-700/60 px-2 py-0.5 rounded font-bold">
                  {bd.breakdown_number}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Laporan investigasi per kasus lengkap dengan konsep 5W+1H, 5-Why RCA, Analisis 4M+1E, spare parts, dan otorisasi.
              </p>
            </div>
          </div>

          {/* Incident Selector Dropdown (if multiple available) */}
          {allBreakdowns.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Pilih Kasus:</span>
              <select
                value={bd.id}
                onChange={(e) => {
                  const target = allBreakdowns.find((x) => x.id === e.target.value);
                  if (target) {
                    setCurrentBreakdown(target);
                    onSelectBreakdown?.(target);
                  }
                }}
                className="bg-slate-800 text-xs text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
              >
                {allBreakdowns.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.breakdown_number} - {(b.asset_name || 'Equipment').slice(0, 18)} ({b.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isEditingManual ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditingManual(false)}
                  disabled={isSavingManual}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveManual}
                  disabled={isSavingManual}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  {isSavingManual ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Tombol Isi Form Manual */}
                <button
                  type="button"
                  onClick={handleStartEditManual}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                  title="Edit data laporan, 5W+1H, dan Ishikawa 4M+1E secara manual"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Isi Form Manual</span>
                </button>

                {/* Tombol Simpan Database ke PC */}
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                  title="Unduh dan simpan database MMS atau laporan ini ke hardisk PC lokal"
                >
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Simpan DB ke PC</span>
                  <span className="sm:hidden">DB PC</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Salin Rangkuman Laporan 5W ke Clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Copy'}</span>
                </button>

                {/* Print by PDF (Cetak / Simpan PDF) */}
                <button
                  type="button"
                  onClick={() => handlePrint(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                  title="Cetak langsung atau simpan sebagai dokumen PDF resmi (Pilih 'Save as PDF' di dialog cetak)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Print by PDF</span>
                </button>

                {/* Print Manual (Cetak Manual ke Kertas) */}
                <button
                  type="button"
                  onClick={() => handlePrint(false)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                  title="Kirim ke mesin printer fisik / cetak manual"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Manual</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet Viewer */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          <div
            id="printable-breakdown-report"
            ref={reportRef}
            className="bg-white p-5 sm:p-7 md:p-8 border border-slate-300 shadow-md text-slate-900 mx-auto max-w-3xl space-y-3.5 text-[11px] font-sans print:p-0 print:border-none print:shadow-none print:m-0 printable-document"
          >
            {/* =========================================================================
                OFFICIAL COMPANY KOP SURAT / LETTERHEAD
               ========================================================================= */}
            <div className="border-b-2 border-slate-900 pb-2.5 flex justify-between items-start gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-gradient-to-br from-red-700 to-red-950 text-white font-black flex items-center justify-center text-xs tracking-wider shadow-xs border border-red-500">
                    NA
                  </div>
                  <div>
                    <span className="font-black text-base sm:text-lg text-slate-950 tracking-tight block leading-none">
                      PT NATIONAL ASSEMBLERS
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider block">
                      Automotive Assembly Plant &amp; Industrial Manufacturing
                    </span>
                  </div>
                </div>
                <p className="text-[10.5px] font-bold text-red-900 uppercase tracking-wide pt-0.5">
                  GENERAL AFFAIR &amp; MAINTENANCE DEPARTMENT
                </p>
                <p className="text-[9.5px] text-slate-500">
                  Plant NA-2 (AION) · Plant NA-3 (Changan &amp; Leap Motor) · Plant NA-4 (INA)
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block text-[9.5px] font-mono font-bold bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 rounded uppercase">
                  DOKUMEN RESMI INVESTIGASI 5W &amp; RCA
                </span>
                <h2 className="text-xs sm:text-sm font-black text-red-900 uppercase tracking-tight mt-0.5">
                  EQUIPMENT BREAKDOWN REPORT
                </h2>
                <p className="text-[9.5px] text-slate-600 font-mono">
                  No. Dok: <strong>NA/MNT/FRM/BD-026</strong> · Rev. 03
                </p>
                <p className="text-[9px] text-slate-500 font-mono">
                  Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} WIB
                </p>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-2.5 py-1 border border-slate-200 rounded text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Nomor Registrasi:</span>
                <span className="font-mono font-bold text-red-900 text-xs">{bd.breakdown_number}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Dampak Produksi:</span>
                <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                  {bd.production_impact}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Prioritas:</span>
                <span className={`font-bold px-1.5 py-0.5 rounded ${
                  bd.priority === 'Critical' ? 'bg-red-700 text-white' : 'bg-red-100 text-red-800'
                }`}>
                  {bd.priority}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Status Akhir:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                  {bd.status}
                </span>
              </div>
            </div>

            {/* =========================================================================
                SECTION 1: KONSEP DETAIL 5W + 1H (PROBLEM IDENTIFICATION FRAMEWORK)
               ========================================================================= */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 px-2.5 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-blue-700" />
                  1. Konsep Detail 5W + 1H (Incident Profile &amp; Problem Definition)
                </span>
                <span className="font-mono text-red-900 text-[9.5px]">STANDAR TPM &amp; K3</span>
              </div>
              {isEditingManual && editForm ? (
                <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[10px] bg-amber-50/20">
                  {/* WHAT */}
                  <div className="bg-white p-2 rounded border border-red-200 shadow-2xs">
                    <span className="font-bold text-red-900 uppercase block text-[9.5px] border-b border-red-200 pb-0.5 mb-1.5 flex items-center justify-between">
                      <span>[WHAT] Gejala &amp; Kerusakan</span>
                      <span className="text-[8px] text-amber-700 bg-amber-100 px-1 rounded font-bold">Edit Manual</span>
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-700 block">Deskripsi Kerusakan:</label>
                        <textarea
                          rows={2}
                          value={editForm.failure_description}
                          onChange={(e) => setEditForm({ ...editForm, failure_description: e.target.value })}
                          className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                          placeholder="Deskripsi kerusakan..."
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-700 block">Kategori Disiplin:</label>
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none bg-white font-medium"
                        >
                          <option value="Mechanical">Mechanical</option>
                          <option value="Electrical">Electrical</option>
                          <option value="Pneumatic">Pneumatic</option>
                          <option value="Hydraulic">Hydraulic</option>
                          <option value="PLC/Software">PLC/Software</option>
                          <option value="Operator Error">Operator Error</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* WHERE */}
                  <div className="bg-white p-2 rounded border border-blue-200 shadow-2xs">
                    <span className="font-bold text-blue-900 uppercase block text-[9.5px] border-b border-blue-200 pb-0.5 mb-1.5 flex items-center justify-between">
                      <span>[WHERE] Lokasi Mesin / Line</span>
                      <span className="text-[8px] text-blue-700 bg-blue-100 px-1 rounded font-bold">Edit Manual</span>
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-700 block">Lokasi / Stasiun Line:</label>
                        <input
                          type="text"
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                          placeholder="Contoh: Shower Leak Test Cabin Rig"
                        />
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        Tag: <strong className="text-slate-800">{bd.asset_tag}</strong> ({bd.asset_name})
                      </div>
                    </div>
                  </div>

                  {/* WHEN */}
                  <div className="bg-white p-2 rounded border border-amber-200 shadow-2xs">
                    <span className="font-bold text-amber-900 uppercase block text-[9.5px] border-b border-amber-200 pb-0.5 mb-1.5 flex items-center justify-between">
                      <span>[WHEN] Waktu &amp; Downtime</span>
                      <span className="text-[8px] text-amber-700 bg-amber-100 px-1 rounded font-bold">Edit Manual</span>
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-700 block">Waktu Lapor:</label>
                        <input
                          type="datetime-local"
                          value={editForm.report_datetime}
                          onChange={(e) => setEditForm({ ...editForm, report_datetime: e.target.value })}
                          className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-700 block">Total Downtime (Menit):</label>
                        <input
                          type="number"
                          min={0}
                          value={editForm.downtime_minutes}
                          onChange={(e) => setEditForm({ ...editForm, downtime_minutes: Number(e.target.value) || 0 })}
                          className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none font-bold text-red-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* WHO */}
                  <div className="bg-white p-2 rounded border border-emerald-200 shadow-2xs">
                    <span className="font-bold text-emerald-900 uppercase block text-[9.5px] border-b border-emerald-200 pb-0.5 mb-1.5 flex items-center justify-between">
                      <span>[WHO] Pihak Terlibat</span>
                      <span className="text-[8px] text-emerald-700 bg-emerald-100 px-1 rounded font-bold">Edit Manual</span>
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-700 block">Report by:</label>
                        <input
                          type="text"
                          value={editForm.reported_by}
                          onChange={(e) => setEditForm({ ...editForm, reported_by: e.target.value })}
                          className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-700 block">Verified by:</label>
                        <input
                          type="text"
                          value={editForm.verified_by}
                          onChange={(e) => setEditForm({ ...editForm, verified_by: e.target.value })}
                          className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* WHY */}
                  <div className="bg-white p-2 rounded border border-purple-200 shadow-2xs">
                    <span className="font-bold text-purple-900 uppercase block text-[9.5px] border-b border-purple-200 pb-0.5 mb-1.5 flex items-center justify-between">
                      <span>[WHY] Penyebab Langsung</span>
                      <span className="text-[8px] text-purple-700 bg-purple-100 px-1 rounded font-bold">Edit Manual</span>
                    </span>
                    <div>
                      <label className="text-[9px] font-bold text-slate-700 block">Gejala Utama Stoppage:</label>
                      <textarea
                        rows={3}
                        value={editForm.root_cause}
                        onChange={(e) => setEditForm({ ...editForm, root_cause: e.target.value })}
                        className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                        placeholder="Penyebab langsung mesin terhenti..."
                      />
                    </div>
                  </div>

                  {/* HOW */}
                  <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
                    <span className="font-bold text-slate-900 uppercase block text-[9.5px] border-b border-slate-200 pb-0.5 mb-1.5 flex items-center justify-between">
                      <span>[HOW] Penanganan Darurat</span>
                      <span className="text-[8px] text-slate-700 bg-slate-100 px-1 rounded font-bold">Edit Manual</span>
                    </span>
                    <div>
                      <label className="text-[9px] font-bold text-slate-700 block">Tindakan Sementara (Containment):</label>
                      <textarea
                        rows={3}
                        value={editForm.temporary_countermeasure}
                        onChange={(e) => setEditForm({ ...editForm, temporary_countermeasure: e.target.value })}
                        className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                        placeholder="Langkah cepat penanganan darurat..."
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                  {/* WHAT */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="font-bold text-red-900 uppercase block text-[9.5px] border-b border-slate-200 pb-0.5 mb-1">
                      [WHAT] Apa yang Rusak &amp; Gejalanya?
                    </span>
                    <div className="font-semibold text-slate-900">{bd.asset_name}</div>
                    <div className="text-slate-600 text-[9.5px] mt-0.5 line-clamp-2">{bd.failure_description}</div>
                    <div className="text-[9px] font-mono text-slate-500 mt-1">Kategori: <strong className="text-slate-800">{bd.category}</strong></div>
                  </div>

                  {/* WHERE */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="font-bold text-blue-900 uppercase block text-[9.5px] border-b border-slate-200 pb-0.5 mb-1">
                      [WHERE] Di Mana Lokasi Kejadian?
                    </span>
                    <div className="font-semibold text-slate-900">{bd.plant_name || 'Plant NA-2 (AION)'}</div>
                    <div className="text-slate-600 text-[9.5px] mt-0.5">Line: {bd.location || 'Assembly Line'}</div>
                    <div className="text-[9px] font-mono text-blue-900 mt-1 font-bold">Tag: {bd.asset_tag || '-'}</div>
                  </div>

                  {/* WHEN */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="font-bold text-amber-900 uppercase block text-[9.5px] border-b border-slate-200 pb-0.5 mb-1">
                      [WHEN] Kapan Terjadi &amp; Downtime?
                    </span>
                    <div className="text-slate-700">Waktu Lapor: <span className="font-semibold text-slate-900">{formatDateTime(bd.report_datetime)}</span></div>
                    <div className="text-slate-700">Selesai: <span className="font-semibold text-slate-900">{formatDateTime(bd.repair_completion_time || bd.report_datetime)}</span></div>
                    <div className="text-[9.5px] font-mono font-bold text-red-900 mt-1">
                      Total Downtime: {bd.downtime_minutes} Menit ({formatDuration(bd.downtime_minutes)})
                    </div>
                  </div>

                  {/* WHO */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="font-bold text-emerald-900 uppercase block text-[9.5px] border-b border-slate-200 pb-0.5 mb-1">
                      [WHO] Siapa Pihak Terlibat?
                    </span>
                    <div className="text-slate-700">Report by: <span className="font-bold text-slate-900">{signoffValues.report_by_name}</span></div>
                    <div className="text-slate-700">Verified by: <span className="font-bold text-slate-900">{signoffValues.verified_by_name}</span></div>
                    <div className="text-[9px] text-slate-500 mt-0.5 truncate">Approved: {signoffValues.approved_by_name} · Regu: {bd.tech_names || bd.tech_name || 'Dedi / Marsino'}</div>
                  </div>

                  {/* WHY */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="font-bold text-purple-900 uppercase block text-[9.5px] border-b border-slate-200 pb-0.5 mb-1">
                      [WHY] Mengapa Terhenti Langsung?
                    </span>
                    <div className="text-slate-800 text-[9.5px] line-clamp-3">
                      {bd.root_cause || 'Stoppage terpicu proteksi overload & keausan komponen operasional akibat beban siklus kerja tinggi.'}
                    </div>
                  </div>

                  {/* HOW */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-900 uppercase block text-[9.5px] border-b border-slate-200 pb-0.5 mb-1">
                      [HOW] Bagaimana Penanganan Cepat?
                    </span>
                    <div className="text-slate-800 text-[9.5px] line-clamp-3">
                      {bd.temporary_countermeasure || 'Isolasi sumber daya listrik / pneumatik (LOTO), penyesuaian parameter, dan penyiapan suku cadang pengganti.'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* =========================================================================
                SECTION 2: PROBLEM ANALYSIS (4M+1E ISHIKAWA FACTOR BREAKDOWN)
               ========================================================================= */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 px-2.5 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-red-700" />
                  2. Problem Analysis (Ishikawa 4M + 1E Factor Breakdown)
                </span>
                <span className="text-[9px] text-slate-500 font-semibold">ANALISIS FAKTOR PENYEBAB KERUSAKAN</span>
              </div>
              {isEditingManual && editForm ? (
                <div className="p-2.5 grid grid-cols-1 sm:grid-cols-5 gap-2 text-[9.5px] bg-amber-50/20">
                  {/* MAN */}
                  <div className="p-1.5 bg-white rounded border border-slate-300 shadow-2xs flex flex-col justify-between">
                    <span className="font-bold text-slate-900 uppercase block text-[9px] text-center bg-slate-100 rounded py-0.5 mb-1">
                      MAN (Manusia)
                    </span>
                    <textarea
                      rows={4}
                      value={editForm.ishikawa_man}
                      onChange={(e) => setEditForm({ ...editForm, ishikawa_man: e.target.value })}
                      className="w-full text-[9px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none resize-none flex-1"
                      placeholder="Faktor manusia / operator..."
                    />
                  </div>

                  {/* MACHINE */}
                  <div className="p-1.5 bg-white rounded border border-red-300 shadow-2xs flex flex-col justify-between">
                    <span className="font-bold text-red-900 uppercase block text-[9px] text-center bg-red-100 rounded py-0.5 mb-1">
                      MACHINE (Mesin)
                    </span>
                    <textarea
                      rows={4}
                      value={editForm.ishikawa_machine}
                      onChange={(e) => setEditForm({ ...editForm, ishikawa_machine: e.target.value })}
                      className="w-full text-[9px] p-1 border border-red-300 rounded focus:border-blue-500 focus:outline-none resize-none flex-1 font-medium"
                      placeholder="Faktor mesin / mekanik..."
                    />
                  </div>

                  {/* METHOD */}
                  <div className="p-1.5 bg-white rounded border border-slate-300 shadow-2xs flex flex-col justify-between">
                    <span className="font-bold text-slate-900 uppercase block text-[9px] text-center bg-slate-100 rounded py-0.5 mb-1">
                      METHOD (Metode)
                    </span>
                    <textarea
                      rows={4}
                      value={editForm.ishikawa_method}
                      onChange={(e) => setEditForm({ ...editForm, ishikawa_method: e.target.value })}
                      className="w-full text-[9px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none resize-none flex-1"
                      placeholder="Faktor SOP / inspeksi..."
                    />
                  </div>

                  {/* MATERIAL */}
                  <div className="p-1.5 bg-white rounded border border-slate-300 shadow-2xs flex flex-col justify-between">
                    <span className="font-bold text-slate-900 uppercase block text-[9px] text-center bg-slate-100 rounded py-0.5 mb-1">
                      MATERIAL (Part)
                    </span>
                    <textarea
                      rows={4}
                      value={editForm.ishikawa_material}
                      onChange={(e) => setEditForm({ ...editForm, ishikawa_material: e.target.value })}
                      className="w-full text-[9px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none resize-none flex-1"
                      placeholder="Faktor spare part..."
                    />
                  </div>

                  {/* ENVIRONMENT */}
                  <div className="p-1.5 bg-white rounded border border-slate-300 shadow-2xs flex flex-col justify-between sm:col-span-1 col-span-1">
                    <span className="font-bold text-slate-900 uppercase block text-[9px] text-center bg-slate-100 rounded py-0.5 mb-1">
                      ENV (Lingkungan)
                    </span>
                    <textarea
                      rows={4}
                      value={editForm.ishikawa_environment}
                      onChange={(e) => setEditForm({ ...editForm, ishikawa_environment: e.target.value })}
                      className="w-full text-[9px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none resize-none flex-1"
                      placeholder="Faktor lingkungan..."
                    />
                  </div>
                </div>
              ) : (
                <div className="p-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[9.5px]">
                  {/* MAN */}
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                    <span className="font-bold text-slate-900 uppercase block text-[9px] text-center bg-slate-200/80 rounded py-0.5 mb-1">
                      MAN (Manusia)
                    </span>
                    <p className="text-slate-700 leading-tight">
                      {problemFactors.man}
                    </p>
                  </div>

                  {/* MACHINE */}
                  <div className="p-1.5 bg-red-50/60 rounded border border-red-200">
                    <span className="font-bold text-red-900 uppercase block text-[9px] text-center bg-red-200/80 rounded py-0.5 mb-1">
                      MACHINE (Mesin)
                    </span>
                    <p className="text-slate-800 leading-tight font-medium">
                      {problemFactors.machine}
                    </p>
                  </div>

                  {/* METHOD */}
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                    <span className="font-bold text-slate-900 uppercase block text-[9px] text-center bg-slate-200/80 rounded py-0.5 mb-1">
                      METHOD (Metode)
                    </span>
                    <p className="text-slate-700 leading-tight">
                      {problemFactors.method}
                    </p>
                  </div>

                  {/* MATERIAL */}
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-200">
                    <span className="font-bold text-slate-900 uppercase block text-[9px] text-center bg-slate-200/80 rounded py-0.5 mb-1">
                      MATERIAL (Part)
                    </span>
                    <p className="text-slate-700 leading-tight">
                      {problemFactors.material}
                    </p>
                  </div>

                  {/* ENVIRONMENT */}
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="font-bold text-slate-900 uppercase block text-[9px] text-center bg-slate-200/80 rounded py-0.5 mb-1">
                      ENV (Lingkungan)
                    </span>
                    <p className="text-slate-700 leading-tight">
                      {problemFactors.environment}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* =========================================================================
                SECTION 3: ANALISIS AKAR MASALAH (ROOT CAUSE ANALYSIS & 5-WHY)
               ========================================================================= */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 px-2.5 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-red-600" />
                  3. Analisis Akar Masalah Terstruktur (5-Why Root Cause Investigation)
                </span>
                <span className="text-[9px] text-slate-500 font-semibold">METODE 5-WHY RESMI</span>
              </div>
              {isEditingManual && editForm ? (
                <div className="p-2.5 space-y-2 text-[10px] bg-amber-50/20">
                  <div className="bg-white border border-red-300 p-2 rounded shadow-2xs">
                    <span className="text-[9.5px] font-bold text-red-900 uppercase block mb-1">
                      Akar Masalah Utama (Primary Root Cause):
                    </span>
                    <input
                      type="text"
                      value={editForm.root_cause}
                      onChange={(e) => setEditForm({ ...editForm, root_cause: e.target.value })}
                      className="w-full text-[10px] p-1 border border-red-300 rounded focus:border-red-500 focus:outline-none font-bold text-slate-950"
                      placeholder="Akar masalah utama penyebab breakdown..."
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-700 block uppercase">
                      Urutan Kronologi Penyebab 5-Why (Manual Input):
                    </span>
                    {[1, 2, 3, 4, 5].map((num) => {
                      const key = `why${num}` as 'why1' | 'why2' | 'why3' | 'why4' | 'why5';
                      return (
                        <div key={num} className="flex items-center gap-2 bg-white p-1.5 rounded border border-slate-200">
                          <span
                            className={`font-mono font-bold px-1.5 py-0.5 rounded text-[9px] shrink-0 ${
                              num === 5 ? 'bg-amber-600 text-white' : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}
                          >
                            Why {num}
                          </span>
                          <input
                            type="text"
                            value={editForm[key]}
                            onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                            className="flex-1 text-[10px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                            placeholder={`Uraian Why ${num}...`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 space-y-2 text-[10px]">
                  {/* Primary Root Cause Highlight */}
                  <div className="bg-red-50/80 border border-red-300 p-2 rounded">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9.5px] font-bold text-red-900 uppercase">
                        Akar Masalah Utama (Primary Root Cause):
                      </span>
                    </div>
                    <p className="font-bold text-slate-950 mt-0.5 text-[10.5px]">
                      {bd.root_cause || fiveWhys[4] || 'Kerusakan komponen operasional akibat penurunan performa material mekanik/elektrikal.'}
                    </p>
                  </div>

                  {/* 5-Why Sequential Tree Cards */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-700 block uppercase">
                      Rantai Kronologi Penyebab 5-Why (Sequential Why Tree):
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      {fiveWhys.map((whyText, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 p-1.5 rounded border ${
                            idx === 4
                              ? 'bg-amber-50/80 border-amber-300 font-semibold'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <span
                            className={`font-mono font-bold px-1.5 py-0.2 rounded text-[9px] shrink-0 ${
                              idx === 4
                                ? 'bg-amber-600 text-white'
                                : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}
                          >
                            Why {idx + 1}
                          </span>
                          <span className="text-slate-800 text-[10px] leading-tight">
                            {whyText}
                          </span>
                          {idx === 4 && (
                            <span className="ml-auto text-[8.5px] font-bold text-amber-800 bg-amber-100 px-1 rounded uppercase shrink-0">
                              Akar Masalah Sistemik
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* =========================================================================
                SECTION 4: TINDAKAN KOREKTIF, PREVENTIF & PENGGANTIAN SUKU CADANG
               ========================================================================= */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 px-2.5 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300 flex justify-between items-center">
                <span>4. Tindakan Korektif, Preventif &amp; Suku Cadang (CAPA &amp; Replaced Parts)</span>
                <span className="text-[9px] text-slate-500 font-semibold">TINDAKAN PERBAIKAN LENGKAP</span>
              </div>
              {isEditingManual && editForm ? (
                <div className="p-2.5 space-y-2 text-[10px] bg-amber-50/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-white p-2 rounded border border-slate-300 shadow-2xs">
                      <label className="text-slate-700 font-bold block text-[9.5px] mb-1">
                        Tindakan Perbaikan Langsung (Corrective Action):
                      </label>
                      <textarea
                        rows={3}
                        value={editForm.corrective_action}
                        onChange={(e) => setEditForm({ ...editForm, corrective_action: e.target.value })}
                        className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
                        placeholder="Rincian perbaikan korektif..."
                      />
                    </div>
                    <div className="bg-white p-2 rounded border border-emerald-300 shadow-2xs">
                      <label className="text-emerald-900 font-bold block text-[9.5px] mb-1">
                        Tindakan Pencegahan Berulang (Preventive Action / Yokoten):
                      </label>
                      <textarea
                        rows={3}
                        value={editForm.preventive_action}
                        onChange={(e) => setEditForm({ ...editForm, preventive_action: e.target.value })}
                        className="w-full text-[9.5px] p-1 border border-emerald-300 rounded focus:border-emerald-500 focus:outline-none"
                        placeholder="Rincian tindakan preventif &amp; yokoten..."
                      />
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-300 shadow-2xs">
                    <label className="text-slate-700 font-bold block text-[9.5px] mb-1">
                      Catatan Komponen / Suku Cadang yang Diganti:
                    </label>
                    <input
                      type="text"
                      value={editForm.replacement_parts}
                      onChange={(e) => setEditForm({ ...editForm, replacement_parts: e.target.value })}
                      className="w-full text-[9.5px] p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none font-mono"
                      placeholder="Nomor part / spesifikasi suku cadang..."
                    />
                  </div>
                </div>
              ) : (
                <div className="p-2.5 space-y-2 text-[10px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-600 font-bold block text-[9.5px]">Tindakan Perbaikan Langsung (Corrective Action):</span>
                      <div className="mt-0.5 p-1.5 bg-slate-50 rounded border border-slate-200 text-slate-900 leading-snug">
                        {bd.corrective_action || 'Perbaikan komponen, pembersihan kotoran, penggantian unit rusak, dan kalibrasi parameter operasional.'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-600 font-bold block text-[9.5px]">Tindakan Pencegahan Berulang (Preventive Action / Yokoten):</span>
                      <div className="mt-0.5 p-1.5 bg-emerald-50/70 rounded border border-emerald-200 text-slate-900 leading-snug">
                        Standarisasi jadwal pelumasan preventif dan penambahan parameter getaran/temperatur pada Autonomous Maintenance Checklist harian.
                      </div>
                    </div>
                  </div>

                  {/* Parts Table */}
                  <div>
                    <span className="text-slate-600 font-bold block text-[9.5px] mb-0.5">
                      Rincian Suku Cadang &amp; Material yang Diganti:
                    </span>
                    {parts.length > 0 ? (
                      <div className="border border-slate-200 rounded overflow-hidden">
                        <table className="w-full text-left text-[9px]">
                          <thead className="bg-slate-100 font-bold text-slate-700 uppercase">
                            <tr>
                              <th className="py-1 px-1.5">Part Number</th>
                              <th className="py-1 px-1.5">Nama Komponen / Material</th>
                              <th className="py-1 px-1.5 text-center">Jumlah</th>
                              <th className="py-1 px-1.5 text-right">Harga Satuan (IDR)</th>
                              <th className="py-1 px-1.5 text-right">Total Biaya (IDR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {parts.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-1 px-1.5 font-mono font-bold text-blue-900">{p.part_number}</td>
                                <td className="py-1 px-1.5 font-medium text-slate-800">{p.part_name}</td>
                                <td className="py-1 px-1.5 text-center font-bold">{p.quantity} {p.uom}</td>
                                <td className="py-1 px-1.5 text-right font-mono">{formatIDR(p.unit_price || p.average_cost || 0)}</td>
                                <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                                  {formatIDR((p.quantity || 0) * (p.unit_price || p.average_cost || 0))}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-slate-100 font-bold">
                              <td colSpan={4} className="py-1 px-1.5 text-right uppercase text-slate-700">Total Biaya Spare Part:</td>
                              <td className="py-1 px-1.5 text-right font-mono text-red-900">{formatIDR(totalPartsCost)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : bd.replacement_parts ? (
                      <div className="p-1.5 bg-slate-50 rounded border border-slate-200 font-mono text-[9.5px] text-slate-800">
                        {bd.replacement_parts}
                      </div>
                    ) : (
                      <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-slate-500 italic text-[9.5px]">
                        Tidak ada penggantian suku cadang utama (penanganan berupa penyetelan / kalibrasi mekanik-elektrik / pembersihan).
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* =========================================================================
                SECTION 5: REGU TEKNISI & HASIL UJI COBA OPERASIONAL
               ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Regu Teknisi */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="bg-slate-100 px-2.5 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300 flex items-center justify-between">
                  <span>5. Regu Teknisi (Manpower Squad)</span>
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="p-2 space-y-1 text-[10px]">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-0.5">
                    <span className="text-slate-500">Teknisi Penanggung Jawab:</span>
                    <span className="font-bold text-slate-900">{bd.tech_name || 'Marsino (Lead Tech)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">Anggota Regu Terlibat:</span>
                    <span className="font-medium text-slate-800 block">
                      {bd.tech_names || bd.tech_name || 'Marsino &amp; Tim Teknisi Shift'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5 border-t border-slate-200 text-[9.5px]">
                    <span className="text-slate-500">Total Tenaga Kerja:</span>
                    <span className="font-bold text-blue-900">
                      {bd.manpower_count || (bd.assigned_technicians?.length || 2)} Orang Teknisi
                    </span>
                  </div>
                </div>
              </div>

              {/* Hasil Trial Run */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="bg-slate-100 px-2.5 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300 flex items-center justify-between">
                  <span>6. Hasil Uji Coba (Trial Run &amp; Verification)</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                {isEditingManual && editForm ? (
                  <div className="p-2 space-y-1.5 text-[10px] bg-amber-50/20">
                    <label className="text-[9px] font-bold text-slate-700 block">Hasil Verifikasi Trial Run:</label>
                    <textarea
                      rows={2}
                      value={editForm.trial_run_result}
                      onChange={(e) => setEditForm({ ...editForm, trial_run_result: e.target.value })}
                      className="w-full text-[9.5px] p-1 border border-emerald-300 rounded focus:border-emerald-500 focus:outline-none bg-white"
                      placeholder="Hasil verifikasi running test..."
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[9px] shrink-0">Diverifikasi Oleh:</span>
                      <input
                        type="text"
                        value={editForm.trial_run_verified_by}
                        onChange={(e) => setEditForm({ ...editForm, trial_run_verified_by: e.target.value })}
                        className="flex-1 text-[9px] p-0.5 px-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2 space-y-1 text-[10px]">
                    <div className="p-1.5 bg-emerald-50/70 border border-emerald-200 rounded text-slate-900 leading-snug">
                      {bd.trial_run_result || 'Uji coba operasional 30 menit selesai dengan normal, suhu dan vibrasi stabil tanpa ada alarm berulang.'}
                    </div>
                    <div className="flex justify-between items-center pt-0.5 text-[9.5px]">
                      <span className="text-slate-500">Diverifikasi Oleh:</span>
                      <span className="font-bold text-slate-900">{bd.verified_by || 'Hermawan Prasetyo'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* =========================================================================
                SECTION 7: DOKUMENTASI LAPANGAN (FIELD EVIDENCE PHOTOS: BEFORE, PROCESS & AFTER)
               ========================================================================= */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 px-2.5 py-1 font-bold text-slate-900 text-[10px] uppercase border-b border-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-700" />
                  <span>7. Dokumentasi Lapangan (Field Evidence Photos: Before, Process &amp; After)</span>
                  <span className="bg-blue-100 text-blue-900 border border-blue-200 text-[8.5px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                    {evidences.length} Foto
                  </span>
                </div>
                <div className="flex items-center gap-1.5 no-print text-[8.5px] text-slate-500 font-normal">
                  <span>Shortcut: Tekan <kbd className="px-1 py-0.2 bg-slate-200 border border-slate-300 rounded font-mono font-bold text-slate-700 text-[8px]">Ctrl + V</kbd> untuk tempel gambar</span>
                </div>
              </div>

              {/* 3 Dedicated Stage Columns in Section 7: Before, Process, After */}
              <div className="p-2 evidence-stage-grid grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* 1. BEFORE COLUMN */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDraggingStage('before');
                  }}
                  onDragLeave={() => setDraggingStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDraggingStage(null);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (file.type.startsWith('image/')) {
                        targetStageRef.current = 'before';
                        handleIncomingImageFile(file, 'before');
                      }
                    }
                  }}
                  className={`border rounded-lg p-2 flex flex-col justify-between transition-all ${
                    draggingStage === 'before'
                      ? 'border-red-400 bg-red-50/70 ring-2 ring-red-300'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div>
                    {/* Header Stage */}
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-red-100 text-red-900 border border-red-300 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          1. BEFORE
                        </span>
                        <span className="text-[9px] font-bold text-slate-800">
                          Kondisi Kerusakan Awal
                        </span>
                      </div>
                      <span className="text-[8.5px] text-slate-500 font-mono">
                        {beforeEvidences.length} Foto
                      </span>
                    </div>

                    {/* Photos list or Empty State */}
                    {beforeEvidences.length > 0 ? (
                      <div className="space-y-2">
                        {beforeEvidences.map((ev, idx) => (
                          <div
                            key={ev.id || idx}
                            className="border border-slate-300 rounded p-1 bg-white hover:border-red-400 transition-all shadow-2xs group relative"
                          >
                            <div
                              className="relative h-24 sm:h-28 bg-slate-900 rounded overflow-hidden cursor-pointer flex items-center justify-center"
                              onClick={() => setSelectedViewerEvidence(ev)}
                              title="Klik untuk melihat foto resolusi penuh"
                            >
                              <img
                                src={ev.file_url}
                                alt={ev.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 evidence-img"
                                onError={(e) => {
                                  (e.target as any).style.display = 'none';
                                }}
                              />
                              <div className="absolute top-1 left-1">
                                <span className="bg-red-900/90 backdrop-blur-xs text-white text-[7.5px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                                  BEFORE
                                </span>
                              </div>
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white font-bold text-[9px] no-print">
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Perbesar</span>
                              </div>
                            </div>
                            <div className="mt-1 flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-bold text-slate-900 line-clamp-1 leading-tight" title={ev.title}>
                                  {ev.title}
                                </p>
                                {ev.description && (
                                  <p className="text-[8px] text-slate-500 line-clamp-2 mt-0.5">
                                    {ev.description}
                                  </p>
                                )}
                                <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">
                                  {ev.created_at ? formatDateTime(ev.created_at) : 'Sebelum Perbaikan'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEvidenceToDelete(ev)}
                                className="no-print opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                                title="Hapus foto Before (Memerlukan otorisasi)"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-dashed border-red-200 bg-red-50/30 rounded-lg p-2.5 text-center flex flex-col items-center justify-center min-h-[90px]">
                        <Camera className="w-5 h-5 text-red-400 mb-1" />
                        <p className="text-[9px] font-bold text-slate-700">Foto Before Belum Ada</p>
                        <p className="text-[8px] text-slate-500 max-w-xs mt-0.5">
                          Kondisi fisik komponen rusak sebelum perbaikan
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions for Before */}
                  <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center gap-1.5 no-print">
                    <button
                      type="button"
                      onClick={() => handleOpenUploadForStage('before')}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-900 border border-red-200 rounded text-[9px] font-bold cursor-pointer transition-all active:scale-95"
                    >
                      <Upload className="w-3 h-3 text-red-600" />
                      <span>{beforeEvidences.length > 0 ? '+ Tambah Foto' : 'Unggah Before'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerPasteForStage('before')}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-[9px] font-bold cursor-pointer transition-all active:scale-95"
                      title="Tempel foto dari clipboard"
                    >
                      <Clipboard className="w-3 h-3 text-slate-600" />
                      <span>Paste</span>
                    </button>
                  </div>
                </div>

                {/* 2. PROCESS COLUMN */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDraggingStage('in_progress');
                  }}
                  onDragLeave={() => setDraggingStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDraggingStage(null);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (file.type.startsWith('image/')) {
                        targetStageRef.current = 'in_progress';
                        handleIncomingImageFile(file, 'in_progress');
                      }
                    }
                  }}
                  className={`border rounded-lg p-2 flex flex-col justify-between transition-all ${
                    draggingStage === 'in_progress'
                      ? 'border-blue-400 bg-blue-50/70 ring-2 ring-blue-300'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div>
                    {/* Header Stage */}
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          2. PROCESS
                        </span>
                        <span className="text-[9px] font-bold text-slate-800">
                          Proses Pengerjaan / Tindakan
                        </span>
                      </div>
                      <span className="text-[8.5px] text-slate-500 font-mono">
                        {processEvidences.length} Foto
                      </span>
                    </div>

                    {/* Photos list or Empty State */}
                    {processEvidences.length > 0 ? (
                      <div className="space-y-2">
                        {processEvidences.map((ev, idx) => (
                          <div
                            key={ev.id || idx}
                            className="border border-slate-300 rounded p-1 bg-white hover:border-blue-400 transition-all shadow-2xs group relative"
                          >
                            <div
                              className="relative h-24 sm:h-28 bg-slate-900 rounded overflow-hidden cursor-pointer flex items-center justify-center"
                              onClick={() => setSelectedViewerEvidence(ev)}
                              title="Klik untuk melihat foto resolusi penuh"
                            >
                              <img
                                src={ev.file_url}
                                alt={ev.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 evidence-img"
                                onError={(e) => {
                                  (e.target as any).style.display = 'none';
                                }}
                              />
                              <div className="absolute top-1 left-1">
                                <span className="bg-blue-900/90 backdrop-blur-xs text-white text-[7.5px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                                  PROCESS
                                </span>
                              </div>
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white font-bold text-[9px] no-print">
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Perbesar</span>
                              </div>
                            </div>
                            <div className="mt-1 flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-bold text-slate-900 line-clamp-1 leading-tight" title={ev.title}>
                                  {ev.title}
                                </p>
                                {ev.description && (
                                  <p className="text-[8px] text-slate-500 line-clamp-2 mt-0.5">
                                    {ev.description}
                                  </p>
                                )}
                                <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">
                                  {ev.created_at ? formatDateTime(ev.created_at) : 'Proses Pengerjaan'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEvidenceToDelete(ev)}
                                className="no-print opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                                title="Hapus foto Process (Memerlukan otorisasi)"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-dashed border-blue-200 bg-blue-50/30 rounded-lg p-2.5 text-center flex flex-col items-center justify-center min-h-[90px]">
                        <Wrench className="w-5 h-5 text-blue-400 mb-1" />
                        <p className="text-[9px] font-bold text-slate-700">Foto Process Belum Ada</p>
                        <p className="text-[8px] text-slate-500 max-w-xs mt-0.5">
                          Saat teknisi membongkar / perbaikan fisik
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions for Process */}
                  <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center gap-1.5 no-print">
                    <button
                      type="button"
                      onClick={() => handleOpenUploadForStage('in_progress')}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded text-[9px] font-bold cursor-pointer transition-all active:scale-95"
                    >
                      <Upload className="w-3 h-3 text-blue-600" />
                      <span>{processEvidences.length > 0 ? '+ Tambah Foto' : 'Unggah Process'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerPasteForStage('in_progress')}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-[9px] font-bold cursor-pointer transition-all active:scale-95"
                      title="Tempel foto dari clipboard"
                    >
                      <Clipboard className="w-3 h-3 text-slate-600" />
                      <span>Paste</span>
                    </button>
                  </div>
                </div>

                {/* 3. AFTER COLUMN */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDraggingStage('after');
                  }}
                  onDragLeave={() => setDraggingStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDraggingStage(null);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (file.type.startsWith('image/')) {
                        targetStageRef.current = 'after';
                        handleIncomingImageFile(file, 'after');
                      }
                    }
                  }}
                  className={`border rounded-lg p-2 flex flex-col justify-between transition-all ${
                    draggingStage === 'after'
                      ? 'border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-300'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div>
                    {/* Header Stage */}
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          3. AFTER
                        </span>
                        <span className="text-[9px] font-bold text-slate-800">
                          Kondisi Selesai &amp; Hasil Uji
                        </span>
                      </div>
                      <span className="text-[8.5px] text-slate-500 font-mono">
                        {afterEvidences.length} Foto
                      </span>
                    </div>

                    {/* Photos list or Empty State */}
                    {afterEvidences.length > 0 ? (
                      <div className="space-y-2">
                        {afterEvidences.map((ev, idx) => (
                          <div
                            key={ev.id || idx}
                            className="border border-slate-300 rounded p-1 bg-white hover:border-emerald-400 transition-all shadow-2xs group relative"
                          >
                            <div
                              className="relative h-24 sm:h-28 bg-slate-900 rounded overflow-hidden cursor-pointer flex items-center justify-center"
                              onClick={() => setSelectedViewerEvidence(ev)}
                              title="Klik untuk melihat foto resolusi penuh"
                            >
                              <img
                                src={ev.file_url}
                                alt={ev.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 evidence-img"
                                onError={(e) => {
                                  (e.target as any).style.display = 'none';
                                }}
                              />
                              <div className="absolute top-1 left-1">
                                <span className="bg-emerald-900/90 backdrop-blur-xs text-white text-[7.5px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                                  AFTER
                                </span>
                              </div>
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white font-bold text-[9px] no-print">
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Perbesar</span>
                              </div>
                            </div>
                            <div className="mt-1 flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-bold text-slate-900 line-clamp-1 leading-tight" title={ev.title}>
                                  {ev.title}
                                </p>
                                {ev.description && (
                                  <p className="text-[8px] text-slate-500 line-clamp-2 mt-0.5">
                                    {ev.description}
                                  </p>
                                )}
                                <p className="text-[7.5px] text-slate-400 font-mono mt-0.5">
                                  {ev.created_at ? formatDateTime(ev.created_at) : 'Selesai Perbaikan'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEvidenceToDelete(ev)}
                                className="no-print opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                                title="Hapus foto After (Memerlukan otorisasi)"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-dashed border-emerald-200 bg-emerald-50/30 rounded-lg p-2.5 text-center flex flex-col items-center justify-center min-h-[90px]">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
                        <p className="text-[9px] font-bold text-slate-700">Foto After Belum Ada</p>
                        <p className="text-[8px] text-slate-500 max-w-xs mt-0.5">
                          Kondisi mesin setelah perbaikan &amp; trial run berjalan
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions for After */}
                  <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center gap-1.5 no-print">
                    <button
                      type="button"
                      onClick={() => handleOpenUploadForStage('after')}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded text-[9px] font-bold cursor-pointer transition-all active:scale-95"
                    >
                      <Upload className="w-3 h-3 text-emerald-600" />
                      <span>{afterEvidences.length > 0 ? '+ Tambah Foto' : 'Unggah After'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerPasteForStage('after')}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-[9px] font-bold cursor-pointer transition-all active:scale-95"
                      title="Tempel foto dari clipboard"
                    >
                      <Clipboard className="w-3 h-3 text-slate-600" />
                      <span>Paste</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* =========================================================================
                SECTION 7: LEMBAR PENGESAHAN & TANDA TANGAN OTORISASI (4 TINGKAT)
               ========================================================================= */}
            <div className="pt-1">
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="bg-slate-100 px-2.5 py-0.5 font-bold text-slate-900 text-[9.5px] uppercase border-b border-slate-300">
                  8. Lembar Otorisasi &amp; Pengesahan (Authorization Sign-Off)
                </div>
                {isEditingManual && editForm ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 text-center text-[9px] bg-amber-50/20 p-1">
                    {/* Kolom 1: Report by / Prepared */}
                    <div className="p-2 space-y-1 bg-white rounded m-0.5 border border-slate-200">
                      <span className="text-slate-600 font-bold block text-[9px]">Report / Prepared by :</span>
                      {authorities?.preparedBy && authorities.preparedBy.length > 0 ? (
                        <select
                          value={editForm.sign_report_by_name}
                          onChange={(e) => {
                            const sel = authorities.preparedBy.find((p) => p.name === e.target.value);
                            setEditForm({
                              ...editForm,
                              sign_report_by_name: e.target.value,
                              sign_report_by_title: sel?.job_title || sel?.role || editForm.sign_report_by_title
                            });
                          }}
                          className="w-full text-[9px] font-bold p-1 bg-white border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-center"
                        >
                          {authorities.preparedBy.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} (L{p.hierarchy_level || 4} - {p.role})
                            </option>
                          ))}
                          {!authorities.preparedBy.some((p) => p.name === editForm.sign_report_by_name) && (
                            <option value={editForm.sign_report_by_name}>{editForm.sign_report_by_name}</option>
                          )}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editForm.sign_report_by_name}
                          onChange={(e) => setEditForm({ ...editForm, sign_report_by_name: e.target.value })}
                          className="w-full text-[9px] font-bold p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-center"
                          placeholder="Nama Pelapor"
                        />
                      )}
                      <input
                        type="text"
                        value={editForm.sign_report_by_title}
                        onChange={(e) => setEditForm({ ...editForm, sign_report_by_title: e.target.value })}
                        className="w-full text-[8px] text-slate-500 p-0.5 border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-center"
                        placeholder="Jabatan"
                      />
                    </div>

                    {/* Kolom 2: Verified by */}
                    <div className="p-2 space-y-1 bg-white rounded m-0.5 border border-slate-200">
                      <span className="text-slate-600 font-bold block text-[9px]">Verified by :</span>
                      {authorities?.verifiedBy && authorities.verifiedBy.length > 0 ? (
                        <select
                          value={editForm.sign_verified_by_name}
                          onChange={(e) => {
                            const sel = authorities.verifiedBy.find((p) => p.name === e.target.value);
                            setEditForm({
                              ...editForm,
                              sign_verified_by_name: e.target.value,
                              sign_verified_by_title: sel?.job_title || sel?.role || editForm.sign_verified_by_title
                            });
                          }}
                          className="w-full text-[9px] font-bold p-1 bg-white border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-center"
                        >
                          {authorities.verifiedBy.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} (L{p.hierarchy_level || 3} - {p.role})
                            </option>
                          ))}
                          {!authorities.verifiedBy.some((p) => p.name === editForm.sign_verified_by_name) && (
                            <option value={editForm.sign_verified_by_name}>{editForm.sign_verified_by_name}</option>
                          )}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editForm.sign_verified_by_name}
                          onChange={(e) => setEditForm({ ...editForm, sign_verified_by_name: e.target.value })}
                          className="w-full text-[9px] font-bold p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-center"
                          placeholder="Nama Verifikator"
                        />
                      )}
                      <input
                        type="text"
                        value={editForm.sign_verified_by_title}
                        onChange={(e) => setEditForm({ ...editForm, sign_verified_by_title: e.target.value })}
                        className="w-full text-[8px] text-slate-500 p-0.5 border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-center"
                        placeholder="Jabatan"
                      />
                    </div>

                    {/* Kolom 3: Approved by */}
                    <div className="p-2 space-y-1 bg-white rounded m-0.5 border border-slate-200">
                      <span className="text-slate-600 font-bold block text-[9px]">Approved by :</span>
                      {authorities?.approvedBy && authorities.approvedBy.length > 0 ? (
                        <select
                          value={editForm.sign_approved_by_name}
                          onChange={(e) => {
                            const sel = authorities.approvedBy.find((p) => p.name === e.target.value);
                            setEditForm({
                              ...editForm,
                              sign_approved_by_name: e.target.value,
                              sign_approved_by_title: sel?.job_title || sel?.role || editForm.sign_approved_by_title
                            });
                          }}
                          className="w-full text-[9px] font-bold p-1 bg-white border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-center"
                        >
                          {authorities.approvedBy.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} (L{p.hierarchy_level || 2} - {p.role})
                            </option>
                          ))}
                          {!authorities.approvedBy.some((p) => p.name === editForm.sign_approved_by_name) && (
                            <option value={editForm.sign_approved_by_name}>{editForm.sign_approved_by_name}</option>
                          )}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editForm.sign_approved_by_name}
                          onChange={(e) => setEditForm({ ...editForm, sign_approved_by_name: e.target.value })}
                          className="w-full text-[9px] font-bold p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-center"
                          placeholder="Nama Supervisor"
                        />
                      )}
                      <input
                        type="text"
                        value={editForm.sign_approved_by_title}
                        onChange={(e) => setEditForm({ ...editForm, sign_approved_by_title: e.target.value })}
                        className="w-full text-[8px] text-slate-500 p-0.5 border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-center"
                        placeholder="Jabatan"
                      />
                    </div>

                    {/* Kolom 4: Acknowledge by */}
                    <div className="p-2 space-y-1 bg-white rounded m-0.5 border border-slate-200">
                      <span className="text-slate-600 font-bold block text-[9px]">Acknowledge by :</span>
                      {authorities?.acknowledgedBy && authorities.acknowledgedBy.length > 0 ? (
                        <select
                          value={editForm.sign_ack_by_name}
                          onChange={(e) => {
                            const sel = authorities.acknowledgedBy.find((p) => p.name === e.target.value);
                            setEditForm({
                              ...editForm,
                              sign_ack_by_name: e.target.value,
                              sign_ack_by_title: sel?.job_title || sel?.role || editForm.sign_ack_by_title
                            });
                          }}
                          className="w-full text-[9px] font-bold p-1 bg-white border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-center"
                        >
                          {authorities.acknowledgedBy.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} (L{p.hierarchy_level || 1} - {p.role})
                            </option>
                          ))}
                          {!authorities.acknowledgedBy.some((p) => p.name === editForm.sign_ack_by_name) && (
                            <option value={editForm.sign_ack_by_name}>{editForm.sign_ack_by_name}</option>
                          )}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editForm.sign_ack_by_name}
                          onChange={(e) => setEditForm({ ...editForm, sign_ack_by_name: e.target.value })}
                          className="w-full text-[9px] font-bold p-1 border border-slate-300 rounded focus:border-blue-500 focus:outline-none text-center"
                          placeholder="Nama Pengesah"
                        />
                      )}
                      <input
                        type="text"
                        value={editForm.sign_ack_by_title}
                        onChange={(e) => setEditForm({ ...editForm, sign_ack_by_title: e.target.value })}
                        className="w-full text-[8px] text-slate-500 p-0.5 border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-center"
                        placeholder="Jabatan"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 divide-x divide-slate-300 text-center text-[9px]">
                    {/* Kolom 1: Report by */}
                    <div className="p-2 flex flex-col justify-between h-22">
                      <span className="text-slate-600 font-bold block text-[9px]">Report by :</span>
                      <div className="border-b border-slate-400 mx-2" />
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">
                          {signoffValues.report_by_name}
                        </span>
                        <span className="text-slate-500 text-[8px] block mt-0.5">{signoffValues.report_by_title}</span>
                      </div>
                    </div>

                    {/* Kolom 2: Verified by */}
                    <div className="p-2 flex flex-col justify-between h-22">
                      <span className="text-slate-600 font-bold block text-[9px]">Verified by :</span>
                      <div className="border-b border-slate-400 mx-2" />
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">
                          {signoffValues.verified_by_name}
                        </span>
                        <span className="text-slate-500 text-[8px] block mt-0.5">{signoffValues.verified_by_title}</span>
                      </div>
                    </div>

                    {/* Kolom 3: Approved by */}
                    <div className="p-2 flex flex-col justify-between h-22">
                      <span className="text-slate-600 font-bold block text-[9px]">Approved by :</span>
                      <div className="border-b border-slate-400 mx-2" />
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">
                          {signoffValues.approved_by_name}
                        </span>
                        <span className="text-slate-500 text-[8px] block mt-0.5">{signoffValues.approved_by_title}</span>
                      </div>
                    </div>

                    {/* Kolom 4: Acknowledge by */}
                    <div className="p-2 flex flex-col justify-between h-22">
                      <span className="text-slate-600 font-bold block text-[9px]">Acknowledge by :</span>
                      <div className="border-b border-slate-400 mx-2" />
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">
                          {signoffValues.ack_by_name}
                        </span>
                        <span className="text-slate-500 text-[8px] block mt-0.5">{signoffValues.ack_by_title}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Official Footer Compliance */}
            <div className="pt-1.5 text-center text-[8.5px] text-slate-400 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-1">
              <span>Sistem Manajemen Pemeliharaan Terkomputerisasi PT National Assemblers (NA-MMS)</span>
              <span className="font-mono">Kepatuhan Standar ISO 55001 &amp; Total Productive Maintenance (TPM)</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Control Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs shrink-0 no-print">
          <div className="flex items-center gap-2 text-slate-600 text-[11px]">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Tip Cetak: Pilih opsi <strong className="text-slate-800">"Save as PDF"</strong> pada dialog print browser untuk menyimpan PDF atau pilih printer fisik untuk cetak manual.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-200 rounded-lg font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => handlePrint(false)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Manual</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrint(true)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Print by PDF</span>
            </button>
          </div>
        </div>

        {/* Hidden File Input for Image Selection / Camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              handleIncomingImageFile(f, targetStageRef.current);
            }
            e.target.value = '';
          }}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-slate-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toastMessage.type === 'info' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
        )}

        {/* Modal: Lampirkan Foto Bukti Dokumentasi Lapangan (Before, Process, After) */}
        {isPasteModalOpen && stagedPhoto && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 z-[70] animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-300 shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Lampirkan Foto Dokumentasi Lapangan</h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Ukuran: {stagedPhoto.sizeLabel} · {bd.breakdown_number}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPasteModalOpen(false);
                    setStagedPhoto(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3 text-xs overflow-y-auto max-h-[70vh]">
                {/* Photo Preview */}
                <div className="relative rounded-xl border border-slate-300 bg-slate-950 overflow-hidden flex items-center justify-center max-h-56">
                  <img
                    src={stagedPhoto.dataUrl}
                    alt="Preview"
                    className="max-h-56 w-auto object-contain mx-auto"
                  />
                  <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] font-mono px-2 py-0.5 rounded">
                    {stagedPhoto.sizeLabel}
                  </span>
                </div>

                {/* Category Selection: Before, Process, After */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tahapan Dokumentasi Lapangan:
                  </label>
                  <select
                    value={photoCategory}
                    onChange={(e) => {
                      const val = e.target.value as EvidenceType;
                      setPhotoCategory(val);
                      const activeBd = detailedData?.breakdown || currentBreakdown;
                      const prefix =
                        val === 'before'
                          ? '[BEFORE] Kondisi Kerusakan Awal'
                          : val === 'in_progress'
                          ? '[PROCESS] Tindakan Penanganan & Perbaikan'
                          : '[AFTER] Kondisi Selesai & Hasil Uji Mesin';
                      setPhotoTitle(`${prefix} - ${activeBd?.asset_name || 'Mesin'}`);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="before">1. BEFORE - Kondisi Kerusakan Awal (Sebelum Perbaikan)</option>
                    <option value="in_progress">2. PROCESS - Tindakan &amp; Proses Pengerjaan Perbaikan</option>
                    <option value="after">3. AFTER - Kondisi Selesai Diperbaiki &amp; Hasil Uji Coba</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Judul / Keterangan Singkat Foto:
                  </label>
                  <input
                    type="text"
                    value={photoTitle}
                    onChange={(e) => setPhotoTitle(e.target.value)}
                    placeholder="Contoh: [BEFORE] Kerusakan bearing shaft macet total"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Additional Description / Catatan Investigasi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Catatan Temuan / Detail Investigasi (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={photoDescription}
                    onChange={(e) => setPhotoDescription(e.target.value)}
                    placeholder="Deskripsi temuan fisik di lapangan saat breakdown..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Submitter info */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-500">Ditempelkan Oleh:</span>
                  <span className="font-bold text-slate-900">Alfin Prasetyo (Leader - NA-2 AION)</span>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasteModalOpen(false);
                    setStagedPhoto(null);
                  }}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer"
                  disabled={isSavingPhoto}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveStagedPhoto}
                  disabled={isSavingPhoto}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  {isSavingPhoto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tempelkan &amp; Simpan Foto</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Photo Viewer */}
        {selectedViewerEvidence && (
          <EvidenceViewerModal
            isOpen={Boolean(selectedViewerEvidence)}
            onClose={() => setSelectedViewerEvidence(null)}
            evidence={selectedViewerEvidence}
            allActivityEvidences={evidences}
            onDelete={async (id) => {
              const ev = evidences.find((x) => x.id === id);
              if (ev) {
                setEvidenceToDelete(ev);
                setSelectedViewerEvidence(null);
              }
            }}
          />
        )}

        {/* Security Password Protected Delete Modal for Evidence */}
        {evidenceToDelete && (
          <DeleteConfirmModal
            isOpen={Boolean(evidenceToDelete)}
            itemName={evidenceToDelete.title || 'Foto Dokumentasi Lapangan'}
            itemType="foto dokumentasi lapangan"
            warningText="Foto dokumentasi lapangan ini akan dihapus secara permanen dari laporan breakdown. Masukkan kata sandi otorisasi Anda."
            isDeleting={isDeletingEvidence}
            onConfirm={handleDeleteEvidenceConfirm}
            onCancel={() => setEvidenceToDelete(null)}
          />
        )}

        {/* Database Local Hard Drive Backup & Export Modal */}
        <DatabaseBackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          breakdownId={bd.id}
          breakdownNumber={bd.breakdown_number}
        />
      </div>
    </div>
  );
};

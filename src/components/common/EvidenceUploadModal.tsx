import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Upload, X, Image as ImageIcon, CheckCircle2,
  AlertTriangle, Sparkles, RefreshCw, ZoomIn, Info, ShieldCheck
} from 'lucide-react';
import { EvidenceType, OperationEvidence } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface EvidenceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityType: 'work_order' | 'breakdown' | 'pm_task' | 'facility_inspection';
  activityId: string;
  activityCode?: string;
  defaultEvidenceType?: EvidenceType;
  currentUserName?: string;
  onSuccess: (newEvidence: OperationEvidence) => void;
}

const EVIDENCE_TYPE_CONFIG: Record<
  EvidenceType,
  { label: string; badge: string; color: string; desc: string; icon: string }
> = {
  before: {
    label: 'Kondisi Sebelum / Before',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    color: '#ef4444',
    desc: 'Kerusakan awal, temuan abnormalitas, kebocoran, error indikator, atau keausan sebelum dikerjakan.',
    icon: '🔴'
  },
  in_progress: {
    label: 'Pelaksanaan / In-Progress',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#f59e0b',
    desc: 'Tindakan teknisi di lapangan, proses pembongkaran, pembersihan, pengelasan, atau penggantian part.',
    icon: '🟡'
  },
  after: {
    label: 'Kondisi Selesai / After',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#10b981',
    desc: 'Hasil perbaikan, pengetesan mesin, kondisi normal beroperasi, dan area kerja rapi (5S).',
    icon: '🟢'
  },
  damaged_part: {
    label: 'Komponen Rusak / Part',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    color: '#f97316',
    desc: 'Foto part bekas yang aus, retak, patah, terbakar, atau bocor (bearing, v-belt, seal, valve).',
    icon: '🟠'
  },
  document: {
    label: 'Dokumen / PTW / BAP',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    color: '#3b82f6',
    desc: 'Surat Izin Kerja (Permit to Work), isolasi LOTO, Berita Acara Pengujian, atau checklist fisik.',
    icon: '🔵'
  }
};

const TITLE_SUGGESTIONS: Record<EvidenceType, string[]> = {
  before: [
    'Kondisi Awal Sebelum Perbaikan',
    'Temuan Kebocoran & Abnormalitas',
    'Indikator Alarm / Error Display Mesin',
    'Kondisi Fisik Komponen Mengalami Keausan'
  ],
  in_progress: [
    'Proses Pembongkaran Unit & Inspeksi',
    'Tindakan Penggantian Suku Cadang Baru',
    'Pembersihan & Pelumasan Ulang (Greasing)',
    'Penyetelan & Kalibrasi Torque / Alignment'
  ],
  after: [
    'Kondisi Selesai & Hasil Uji Beban Normal',
    'Trial Run Mesin Beroperasi Kembali',
    'Pemeriksaan Akhir & Area Kerja Bersih (5S)',
    'Verifikasi Parameter Temperatur & Arus Normal'
  ],
  damaged_part: [
    'Foto Komponen Rusak / Bearing Aus Seized',
    'Pemeriksaan V-Belt Retak / Putus',
    'Seal Hidrolik / Pneumatik Robek Bocor',
    'Komponen Elektrikal Kontak Gosong / Overheat'
  ],
  document: [
    'Surat Izin Kerja Aman (PTW / Hot Work / Height)',
    'Dokumen Isolasi Energi & Tagout (LOTO)',
    'Berita Acara Serah Terima Pekerjaan (BAP)',
    'Lembar Checklist Pengujian & Commissioning'
  ]
};

export const EvidenceUploadModal: React.FC<EvidenceUploadModalProps> = ({
  isOpen,
  onClose,
  activityType,
  activityId,
  activityCode,
  defaultEvidenceType = 'before',
  currentUserName = 'Maintenance Technician',
  onSuccess
}) => {
  const [evidenceType, setEvidenceType] = useState<EvidenceType>(defaultEvidenceType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedBy, setUploadedBy] = useState(currentUserName);

  // File & compression state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedDataUrl, setCompressedDataUrl] = useState<string | null>(null);
  const [fileSizeLabel, setFileSizeLabel] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera video stream state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEvidenceType(defaultEvidenceType);
      setTitle(TITLE_SUGGESTIONS[defaultEvidenceType][0] || 'Kondisi Pengerjaan Lapangan');
      setDescription('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setCompressedDataUrl(null);
      setFileSizeLabel('');
      setErrorMsg(null);
      setUploadedBy(currentUserName || 'Maintenance Technician');
      setIsCameraActive(false);
    } else {
      stopCamera();
    }
  }, [isOpen, defaultEvidenceType, currentUserName]);

  // Handle changing evidence type auto-populates helpful title
  const handleTypeSelect = (type: EvidenceType) => {
    setEvidenceType(type);
    if (!title || Object.values(TITLE_SUGGESTIONS).flat().includes(title)) {
      setTitle(TITLE_SUGGESTIONS[type][0] || '');
    }
  };

  /**
   * Client-side Canvas Image Compression
   * Resizes large industrial phone cameras (12-48MP) to max 1600x1200 with 0.85 quality
   */
  const processAndCompressImage = (file: File) => {
    setIsCompressing(true);
    setErrorMsg(null);

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
          setErrorMsg('Gagal memproses gambar pada kanvas peramban');
          setIsCompressing(false);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Watermark with PT National Assemblers timestamp if desired
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setCompressedDataUrl(compressed);
        setPreviewUrl(compressed);
        setSelectedFile(file);

        // Approximate size
        const approximateBytes = Math.round((compressed.length * 3) / 4);
        const kb = Math.round(approximateBytes / 1024);
        setFileSizeLabel(`${kb} KB (dioptimasi dari ${(file.size / 1024).toFixed(0)} KB)`);
        setIsCompressing(false);
      };
      img.onerror = () => {
        setErrorMsg('Format file gambar tidak didukung');
        setIsCompressing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMsg('Gagal membaca file gambar');
      setIsCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndCompressImage(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processAndCompressImage(file);
    }
  };

  // Live Camera Controls
  const startCamera = async () => {
    try {
      setErrorMsg(null);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      setErrorMsg('Kamera tidak dapat diakses atau izin ditolak. Silakan unggah foto dari galeri/file.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    setCompressedDataUrl(dataUrl);
    setPreviewUrl(dataUrl);
    const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
    setFileSizeLabel(`${kb} KB (Foto Kamera Langsung)`);

    // Create virtual File
    const blobBin = atob(dataUrl.split(',')[1]);
    const array = [];
    for (let i = 0; i < blobBin.length; i++) {
      array.push(blobBin.charCodeAt(i));
    }
    const file = new File([new Uint8Array(array)], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
    setSelectedFile(file);

    stopCamera();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compressedDataUrl && !selectedFile) {
      setErrorMsg('Silakan pilih atau ambil foto evidence terlebih dahulu');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Judul evidence wajib diisi');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const fileName = selectedFile?.name || `evidence_${Date.now()}.jpg`;

      const res = await api.uploadEvidence({
        activity_type: activityType,
        activity_id: activityId,
        activity_code: activityCode,
        evidence_type: evidenceType,
        title: title.trim(),
        description: description.trim(),
        file_data: compressedDataUrl || '',
        file_name: fileName,
        file_size: fileSizeLabel || '250 KB',
        uploaded_by: uploadedBy.trim() || 'Maintenance Technician'
      });

      if (res.success && res.evidence) {
        onSuccess(res.evidence);
        onClose();
      } else {
        throw new Error('Gagal menyimpan foto evidence ke server');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengunggah foto');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCfg = EVIDENCE_TYPE_CONFIG[evidenceType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-lg border border-blue-500/40 text-blue-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Upload Foto & Evidence Operasional
                {activityCode && (
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {activityCode}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Dokumentasi visual terverifikasi aktivitas pemeliharaan PT National Assemblers
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Category / Stage Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Kategori Tahap Evidence <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(EVIDENCE_TYPE_CONFIG) as EvidenceType[]).map((type) => {
                const cfg = EVIDENCE_TYPE_CONFIG[type];
                const isSelected = evidenceType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeSelect(type)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 ring-2 ring-blue-500/30 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base shrink-0">{cfg.icon}</span>
                    <span className="truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{currentCfg.desc}</span>
            </p>
          </div>

          {/* 2. Photo Upload or Camera Capture Zone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ambil / Unggah Foto <span className="text-rose-500">*</span>
              </label>
              {!isCameraActive && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    Buka Kamera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Pilih File
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Live Camera View */}
            {isCameraActive ? (
              <div className="relative rounded-2xl border-2 border-blue-500 bg-black overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[300px]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-[360px] object-cover"
                />
                <div className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  LIVE CAMERA
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={captureCameraSnapshot}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg ring-4 ring-blue-500/30 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Ambil Foto Sekarang
                  </button>
                </div>
              </div>
            ) : previewUrl ? (
              /* Image Preview Card */
              <div className="relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden p-2 group">
                <div className="relative rounded-xl overflow-hidden max-h-[260px] flex items-center justify-center bg-slate-900">
                  <img
                    src={previewUrl}
                    alt="Preview Evidence"
                    className="max-h-[260px] w-auto object-contain rounded-lg"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 bg-black/60 hover:bg-black text-white rounded-lg text-xs backdrop-blur-sm transition-colors cursor-pointer"
                      title="Ganti Foto"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        setCompressedDataUrl(null);
                        setSelectedFile(null);
                        setFileSizeLabel('');
                      }}
                      className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs backdrop-blur-sm transition-colors cursor-pointer"
                      title="Hapus Foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 px-2 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono truncate max-w-[280px]">
                    {selectedFile?.name || 'capture.jpg'}
                  </span>
                  <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {fileSizeLabel}
                  </span>
                </div>
              </div>
            ) : (
              /* Drag & Drop Zone */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[180px]"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center mb-3">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Klik untuk memilih foto atau seret ke area ini
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                  Mendukung kamera HP/tablet, JPG, PNG, WEBP. Foto otomatis dioptimasi agar tajam & hemat kuota.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] font-semibold bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded">
                    Auto Compress Canvas
                  </span>
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Max 1600px High-Res
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Title & Auto-Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Judul Foto Evidence <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Pilih rekomendasi di bawah atau ketik judul baru</span>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Kondisi guide roller macet sebelum dibongkar"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-medium bg-white text-slate-900"
            />
            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {TITLE_SUGGESTIONS[evidenceType].map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTitle(sug)}
                  className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                    title === sug
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Description & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Keterangan Temuan / Catatan Teknis
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catat nomor part, lokasi bearing, nilai celah, temperatur atau detail pemeriksaan..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Pengunggah / Teknisi
              </label>
              <input
                type="text"
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
                placeholder="Nama teknisi / supervisor"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-900 bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Audit Trail WIB Timezone
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing || !previewUrl}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mengunggah Evidence...
                </>
              ) : isCompressing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mengoptimasi Foto...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan & Upload Evidence
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

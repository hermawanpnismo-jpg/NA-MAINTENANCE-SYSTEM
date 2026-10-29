import React, { useEffect, useState } from 'react';
import {
  ShoppingCart, Plus, Search, Filter, Truck, CheckCircle2, Clock, X, Save, Trash2, Printer, FileText, Building2
} from 'lucide-react';
import { PurchaseRequest, Plant, SignoffAuthorities } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatIDR, formatDate } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';

interface ProcurementTrackingViewProps {
  selectedPlant: string;
  plants: Plant[];
}

export const ProcurementTrackingView: React.FC<ProcurementTrackingViewProps> = ({
  selectedPlant,
  plants
}) => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [authorities, setAuthorities] = useState<SignoffAuthorities | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPR, setNewPR] = useState({
    plant_id: selectedPlant === 'all' ? (plants[0]?.id || '') : selectedPlant,
    description: '',
    category: 'Spare Parts',
    quantity: 1,
    uom: 'SET',
    estimated_cost: 0,
    vendor_name: ''
  });

  // Delete State
  const [prToDelete, setPrToDelete] = useState<PurchaseRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Print State
  const [printablePR, setPrintablePR] = useState<PurchaseRequest | null>(null);

  const handleDeletePR = async () => {
    if (!prToDelete) return;
    try {
      setIsDeleting(true);
      await api.deletePurchaseRequest(prToDelete.id, 'Procurement Officer');
      setPrToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus purchase request');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, signoffs] = await Promise.all([
        api.getPurchaseRequests(),
        api.getManagementSignoffs().catch(() => null)
      ]);
      setRequests(data);
      if (signoffs) setAuthorities(signoffs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPlant]);

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPurchaseRequest({
        ...newPR,
        user_name: 'Procurement Officer'
      });
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create PR');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filtered = requests.filter((r) => {
    if (selectedPlant !== 'all' && r.plant_id !== selectedPlant) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-700" />
            Purchase Requests &amp; Procurement Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Requisition pipeline for replacement components, emergency parts procurement, and delivery status verification.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Purchase Request
        </button>
      </div>

      {/* PR Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">PR Number</th>
                <th className="py-3 px-4">Description &amp; Purpose</th>
                <th className="py-3 px-4">Plant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Est. Cost (IDR)</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Approval Status</th>
                <th className="py-3 px-4">Delivery Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((pr) => (
                <tr key={pr.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-900">{pr.pr_number}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{pr.description}</td>
                  <td className="py-3 px-4 text-slate-700">{pr.plant_name}</td>
                  <td className="py-3 px-4 text-slate-700">{pr.category}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {pr.quantity} {pr.uom}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatIDR(pr.estimated_cost)}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{pr.vendor_name || 'TBD'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      pr.approval_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                      pr.approval_status === 'PO Issued' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {pr.approval_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      {pr.delivery_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPrintablePR(pr)}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="Cetak Purchase Request (Print Voucher)"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPrToDelete(pr)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Hapus Purchase Request (Delete PR)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add PR Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Create Purchase Request</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePR} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Plant *</label>
                <select
                  value={newPR.plant_id}
                  onChange={(e) => setNewPR({ ...newPR, plant_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                >
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Item Description &amp; Technical Specs *</label>
                <input
                  type="text"
                  required
                  value={newPR.description}
                  onChange={(e) => setNewPR({ ...newPR, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  placeholder="e.g. OMRON Proximity Sensor E2E-X5ME1 2M"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newPR.category}
                    onChange={(e) => setNewPR({ ...newPR, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="Spare Parts">Spare Parts</option>
                    <option value="Consumables">Consumables / Chemical</option>
                    <option value="Tools">Tools &amp; Equipment</option>
                    <option value="Services">Subcontract / Service</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Preferred Vendor (Optional)</label>
                  <input
                    type="text"
                    value={newPR.vendor_name}
                    onChange={(e) => setNewPR({ ...newPR, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    placeholder="e.g. PT Kawan Lama Sejahtera"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPR.quantity}
                    onChange={(e) => setNewPR({ ...newPR, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unit of Measure (UOM)</label>
                  <select
                    value={newPR.uom}
                    onChange={(e) => setNewPR({ ...newPR, uom: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-mono"
                  >
                    <option value="PCS">PCS</option>
                    <option value="SET">SET</option>
                    <option value="BOX">BOX</option>
                    <option value="ROLL">ROLL</option>
                    <option value="LITER">LITER</option>
                    <option value="KG">KG</option>
                    <option value="UNIT">UNIT</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Est. Cost (IDR) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={newPR.estimated_cost}
                    onChange={(e) => setNewPR({ ...newPR, estimated_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Purchase Request Voucher Modal */}
      {printablePR && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-300 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
            {/* Modal Action Bar (Hidden during print) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm">Print Preview Purchase Request (PR)</h3>
                  <p className="text-[11px] text-slate-400">Formulir Resmi Pengadaan Komponen PT National Assemblers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Form PR (Print)
                </button>
                <button
                  onClick={() => setPrintablePR(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Paper Canvas */}
            <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white print:p-0 print:m-0 print:overflow-visible">
              <div id="printable-pr-voucher" className="border-2 border-slate-900 p-6 sm:p-8 space-y-6 max-w-3xl mx-auto text-slate-900 text-xs">
                {/* Official Letterhead */}
                <div className="border-b-2 border-slate-900 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-blue-900 text-white font-black text-lg flex items-center justify-center rounded">
                          NA
                        </div>
                        <div>
                          <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                            PT. National Assemblers
                          </h1>
                          <p className="text-[11px] font-semibold text-slate-700 tracking-wide uppercase">
                            Plant Maintenance &amp; Industrial Engineering Division
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
                        Kawasan Industri Medan Satria, Jl. Raya Bekasi KM 28, Jawa Barat - Indonesia
                      </p>
                    </div>

                    <div className="border border-slate-800 p-2 text-right text-[10px] bg-slate-50">
                      <div className="font-mono font-bold text-slate-900">DOC NO: FORM/NA-MMS/PR/2026</div>
                      <div className="text-slate-600">REV: 03 | DATE: 2026-03-01</div>
                      <div className="font-semibold text-blue-900 uppercase">INTERNAL USE ONLY</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-300 text-center">
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-950">
                      FORMULIR PERMINTAAN PEMBELIAN BARANG (PURCHASE REQUEST)
                    </h2>
                    <span className="inline-block px-3 py-0.5 mt-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-xs text-blue-900">
                      NO: {printablePR.pr_number}
                    </span>
                  </div>
                </div>

                {/* PR Meta Table */}
                <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 bg-slate-50/50 text-[11px]">
                  <div className="space-y-1.5">
                    <div className="flex">
                      <span className="w-32 font-bold text-slate-600">Tanggal Pengajuan:</span>
                      <span className="font-semibold text-slate-900">{formatDate(printablePR.created_at || new Date().toISOString())}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 font-bold text-slate-600">Lokasi / Plant:</span>
                      <span className="font-semibold text-slate-900">{printablePR.plant_name}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 font-bold text-slate-600">Departemen:</span>
                      <span className="font-semibold text-slate-900">Maintenance &amp; Engineering</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex">
                      <span className="w-32 font-bold text-slate-600">Kategori Barang:</span>
                      <span className="font-semibold text-slate-900">{printablePR.category}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 font-bold text-slate-600">Rekomendasi Vendor:</span>
                      <span className="font-semibold text-slate-900">{printablePR.vendor_name || 'Vendor Terdaftar PT NA'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 font-bold text-slate-600">Status Permohonan:</span>
                      <span className="font-bold text-blue-900 uppercase">{printablePR.approval_status}</span>
                    </div>
                  </div>
                </div>

                {/* Items Specification Table */}
                <div>
                  <div className="font-bold text-slate-900 text-xs uppercase mb-1.5">
                    Rincian Barang / Komponen Yang Diminta:
                  </div>
                  <table className="w-full border-collapse border border-slate-400 text-xs">
                    <thead>
                      <tr className="bg-slate-200 text-slate-900 text-center font-bold">
                        <th className="border border-slate-400 p-2 w-10">No</th>
                        <th className="border border-slate-400 p-2 text-left">Nama Komponen / Spesifikasi Teknis Lengkap</th>
                        <th className="border border-slate-400 p-2 w-16">Qty</th>
                        <th className="border border-slate-400 p-2 w-16">UOM</th>
                        <th className="border border-slate-400 p-2 text-right w-32">Est. Biaya Satuan</th>
                        <th className="border border-slate-400 p-2 text-right w-36">Total Est. Biaya (IDR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-400 p-2.5 text-center font-mono">1</td>
                        <td className="border border-slate-400 p-2.5">
                          <div className="font-bold text-slate-900">{printablePR.description}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Kategori: {printablePR.category} | Alokasi Unit: {printablePR.plant_name}
                          </div>
                        </td>
                        <td className="border border-slate-400 p-2.5 text-center font-mono font-bold">
                          {printablePR.quantity}
                        </td>
                        <td className="border border-slate-400 p-2.5 text-center font-mono font-bold">
                          {printablePR.uom}
                        </td>
                        <td className="border border-slate-400 p-2.5 text-right font-mono">
                          {formatIDR(printablePR.quantity > 0 ? printablePR.estimated_cost / printablePR.quantity : printablePR.estimated_cost)}
                        </td>
                        <td className="border border-slate-400 p-2.5 text-right font-mono font-black text-slate-950">
                          {formatIDR(printablePR.estimated_cost)}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={5} className="border border-slate-400 p-2 text-right uppercase">
                          Total Estimasi Anggaran Pengadaan:
                        </td>
                        <td className="border border-slate-400 p-2 text-right font-mono text-sm font-black text-blue-950">
                          {formatIDR(printablePR.estimated_cost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Justification & Notes */}
                <div className="border border-slate-300 p-3 bg-slate-50 rounded">
                  <div className="font-bold text-slate-800 text-[11px] uppercase mb-1">
                    Justifikasi Teknis &amp; Keperluan:
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    Pengadaan spare part / material ini diperlukan untuk mendukung kesinambungan operasional mesin produksi di {printablePR.plant_name}, mencegah potensi downtime berkepanjangan, dan memastikan standar keandalan fasilitas assembling tetap terpenuhi.
                  </p>
                </div>

                {/* 3-Tier Sign-off Box strictly aligned with PT National Assemblers hierarchy */}
                <div className="pt-4">
                  <div className="text-[11px] font-bold text-slate-800 uppercase mb-2">
                    Lembar Verifikasi &amp; Pengesahan (Approval Matrix):
                  </div>
                  <div className="grid grid-cols-3 border-2 border-slate-900 divide-x-2 divide-slate-900 text-center">
                    {/* Tier 1: Diajukan */}
                    <div className="p-3 flex flex-col justify-between min-h-[140px]">
                      <div>
                        <div className="font-bold text-slate-600 uppercase text-[10px]">Diajukan Oleh:</div>
                        <div className="text-[11px] font-semibold text-slate-800 mt-0.5">Pemohon / Maintenance Leader</div>
                      </div>
                      <div className="my-auto py-2">
                        <span className="inline-block text-[10px] text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                          [DIGITALLY SUBMITTED]
                        </span>
                      </div>
                      <div className="border-t border-slate-300 pt-1.5">
                        <div className="font-bold text-slate-950 text-xs">
                          {authorities?.preparedBy?.find((u) => u.name.toLowerCase().includes('alfin'))?.name || authorities?.preparedBy?.[0]?.name || 'Alfin Prasetyo'}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {authorities?.preparedBy?.find((u) => u.name.toLowerCase().includes('alfin'))?.job_title || 'NA-2 Maintenance Leader'}
                        </div>
                      </div>
                    </div>

                    {/* Tier 2: Diverifikasi */}
                    <div className="p-3 flex flex-col justify-between min-h-[140px]">
                      <div>
                        <div className="font-bold text-slate-600 uppercase text-[10px]">Diverifikasi Oleh:</div>
                        <div className="text-[11px] font-semibold text-slate-800 mt-0.5">GA-Maintenance Leader</div>
                      </div>
                      <div className="my-auto py-2">
                        <span className="inline-block text-[10px] text-blue-800 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-300">
                          [REVIEWED &amp; CHECKED]
                        </span>
                      </div>
                      <div className="border-t border-slate-300 pt-1.5">
                        <div className="font-bold text-slate-950 text-xs">
                          {authorities?.verifiedBy?.find((u) => u.name.toLowerCase().includes('hermawan'))?.name || authorities?.verifiedBy?.[0]?.name || 'Hermawan Prasetyo'}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {authorities?.verifiedBy?.find((u) => u.name.toLowerCase().includes('hermawan'))?.job_title || 'GA-Maintenance Leader - All Plant'}
                        </div>
                      </div>
                    </div>

                    {/* Tier 3: Disetujui */}
                    <div className="p-3 flex flex-col justify-between min-h-[140px]">
                      <div>
                        <div className="font-bold text-slate-600 uppercase text-[10px]">Disetujui Oleh:</div>
                        <div className="text-[11px] font-semibold text-slate-800 mt-0.5">GA-Maintenance Supervisor</div>
                      </div>
                      <div className="my-auto py-2">
                        <span className="inline-block text-[10px] text-amber-800 font-mono font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          [APPROVED FOR PO]
                        </span>
                      </div>
                      <div className="border-t border-slate-300 pt-1.5">
                        <div className="font-bold text-slate-950 text-xs">
                          {authorities?.approvedBy?.find((u) => u.name.toLowerCase().includes('warto'))?.name || authorities?.approvedBy?.[0]?.name || 'Warto'}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {authorities?.approvedBy?.find((u) => u.name.toLowerCase().includes('warto'))?.job_title || 'GA-Maintenance Supervisor'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="pt-2 text-[10px] text-slate-400 flex justify-between items-center border-t border-slate-200">
                  <span>Dicetak otomatis dari NA-MMS (Maintenance Management System)</span>
                  <span>Waktu cetak: {new Date().toLocaleString('id-ID')} WIB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(prToDelete)}
        title="Hapus Purchase Request"
        itemType="Purchase Request (PR)"
        itemName={prToDelete ? `[${prToDelete.pr_number}] ${prToDelete.description}` : ''}
        warningText="Permintaan pembelian komponen ini akan dibatalkan dan dihapus secara permanen."
        isDeleting={isDeleting}
        onConfirm={handleDeletePR}
        onCancel={() => setPrToDelete(null)}
      />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Database, Plus, Edit2, CheckCircle2, Factory, Building, Layers, Tags, X, Save, Trash2,
  Search, CheckCircle, AlertTriangle
} from 'lucide-react';
import { Plant, Building as BuildingType, Department, ProductionLine, AssetCategory } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { realtime } from '../../lib/realtime.ts';

export const MasterDataView: React.FC = () => {
  const [data, setData] = useState<{
    companies: any[];
    plants: Plant[];
    buildings: BuildingType[];
    departments: Department[];
    productionLines: ProductionLine[];
    assetCategories: AssetCategory[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'plants' | 'departments' | 'lines' | 'categories'>('categories');
  const [loading, setLoading] = useState(true);
  const [categorySearch, setCategorySearch] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Add Plant Modal
  const [showAddPlantModal, setShowAddPlantModal] = useState(false);
  const [newPlantCode, setNewPlantCode] = useState('');
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantLoc, setNewPlantLoc] = useState('');

  // Add / Edit Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);
  const [categoryCode, setCategoryCode] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'plant' | 'department' | 'line' | 'category';
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getMasterData();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates
    const unsubscribe = realtime.subscribe((event) => {
      if (event.entity === 'Master Data' || event.entity === 'asset_category' || event.entity === 'all') {
        loadData(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCreatePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPlant({
        code: newPlantCode,
        name: newPlantName,
        location: newPlantLoc,
        user_name: 'Administrator'
      });
      setShowAddPlantModal(false);
      setNewPlantCode('');
      setNewPlantName('');
      setNewPlantLoc('');
      setStatusToast(`Pabrik ${newPlantName} berhasil ditambahkan!`);
      setTimeout(() => setStatusToast(null), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan data pabrik');
    }
  };

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryCode('');
    setCategoryName('');
    setCategoryDesc('');
    setCatError(null);
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: AssetCategory) => {
    setEditingCategory(cat);
    setCategoryCode(cat.code);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description || '');
    setCatError(null);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    if (!categoryCode.trim() || !categoryName.trim()) {
      setCatError('Kode dan Nama Kategori harus diisi.');
      return;
    }

    try {
      setIsSubmittingCat(true);
      if (editingCategory) {
        await api.updateAssetCategory(editingCategory.id, {
          code: categoryCode.trim().toUpperCase(),
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          user_name: 'Administrator'
        });
        setStatusToast(`Kategori [${categoryCode.trim().toUpperCase()}] berhasil diperbarui!`);
      } else {
        await api.createAssetCategory({
          code: categoryCode.trim().toUpperCase(),
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          user_name: 'Administrator'
        });
        setStatusToast(`Kategori equipment [${categoryCode.trim().toUpperCase()}] ${categoryName} berhasil didaftarkan!`);
      }

      setShowCategoryModal(false);
      setTimeout(() => setStatusToast(null), 3500);
      loadData();
    } catch (err: any) {
      setCatError(err.message || 'Gagal menyimpan kategori peralatan.');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      if (itemToDelete.type === 'plant') {
        await api.deletePlant(itemToDelete.id, 'Administrator');
      } else if (itemToDelete.type === 'department') {
        await api.deleteDepartment(itemToDelete.id, 'Administrator');
      } else if (itemToDelete.type === 'line') {
        await api.deleteProductionLine(itemToDelete.id, 'Administrator');
      } else if (itemToDelete.type === 'category') {
        await api.deleteAssetCategory(itemToDelete.id, 'Administrator');
      }
      setStatusToast(`${itemToDelete.name} berhasil dihapus dari sistem.`);
      setItemToDelete(null);
      setTimeout(() => setStatusToast(null), 3500);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus data master');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!data) return null;

  const filteredCategories = data.assetCategories.filter((c) => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {statusToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-700" />
            Operational Master Data Architecture
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi hierarki pabrik, gedung, line produksi, departemen, dan registrasi penyesuaian taksonomi kategori equipment PT National Assemblers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'categories' && (
            <button
              onClick={handleOpenAddCategory}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrasi Kategori Equipment Baru
            </button>
          )}

          {activeTab === 'plants' && (
            <button
              onClick={() => setShowAddPlantModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Pabrik / Fasilitas
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'categories' ? 'border-blue-700 text-blue-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tags className="w-4 h-4" />
          <span>Kategori Equipment &amp; Mesin ({data.assetCategories.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('plants')}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'plants' ? 'border-blue-700 text-blue-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>Pabrik &amp; Fasilitas ({data.plants.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'departments' ? 'border-blue-700 text-blue-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Departemen ({data.departments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('lines')}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'lines' ? 'border-blue-700 text-blue-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Line Produksi ({data.productionLines.length})</span>
        </button>
      </div>

      {/* TAB 1: ASSET & EQUIPMENT CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Registrasi Kategori Equipment National Assemblers</h2>
              <p className="text-xs text-slate-500">
                Menyesuaikan klasifikasi mesin produksi, konveyor, kompresor, robot, hoist, dan utilitas pendukung perakitan.
              </p>
            </div>

            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode (CMP, ROB) atau nama kategori..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs font-sans"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Kode Kategori</th>
                  <th className="py-3.5 px-4">Nama Kategori Equipment</th>
                  <th className="py-3.5 px-4">Deskripsi &amp; Spesifikasi Cakupan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      <Tags className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                      Tidak ada kategori equipment yang cocok dengan pencarian "{categorySearch}".
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                          {c.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{c.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md">{c.description || '-'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditCategory(c)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Kategori Equipment"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setItemToDelete({ type: 'category', id: c.id, name: `Kategori [${c.code}] ${c.name}` })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Kategori Equipment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Plants */}
      {activeTab === 'plants' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Plant Code</th>
                <th className="py-3.5 px-4">Facility / Plant Name</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.plants.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-900">{p.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{p.name}</td>
                  <td className="py-3.5 px-4 text-slate-600">{p.location}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setItemToDelete({ type: 'plant', id: p.id, name: `[${p.code}] ${p.name}` })}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Plant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Departments */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Dept Code</th>
                <th className="py-3.5 px-4">Department Name</th>
                <th className="py-3.5 px-4">Person In Charge</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.departments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-900">{d.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{d.name}</td>
                  <td className="py-3.5 px-4 text-slate-700">{d.head_person || '-'}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setItemToDelete({ type: 'department', id: d.id, name: `[${d.code}] ${d.name}` })}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Production Lines */}
      {activeTab === 'lines' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Line Code</th>
                <th className="py-3.5 px-4">Line / Bay Name</th>
                <th className="py-3.5 px-4">Plant</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.productionLines.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-900">{l.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{l.name}</td>
                  <td className="py-3.5 px-4 text-slate-700">{l.plant_id}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setItemToDelete({ type: 'line', id: l.id, name: `[${l.code}] ${l.name}` })}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Production Line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register / Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2">
                <Tags className="w-5 h-5 text-blue-700" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    {editingCategory ? 'Edit Kategori Equipment' : 'Registrasi Kategori Equipment Baru'}
                  </h2>
                  <p className="text-[11px] text-slate-500">PT National Assemblers Equipment Taxonomy</p>
                </div>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {catError && (
              <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{catError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kode Kategori (Singkat / Akronim) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ROB, AGV, STP, LIF, CNC, WLD"
                  value={categoryCode}
                  onChange={(e) => setCategoryCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-blue-900 uppercase focus:bg-white focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Digunakan sebagai prefix penomoran asset tag (contoh: NA2-ROB-001)</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Kategori Equipment *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Industrial Welding Robot atau Automated Guided Vehicle"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi &amp; Cakupan Peralatan</label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan jenis mesin yang masuk dalam kategori ini, fungsi di assembly line, atau karakteristik khusus..."
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCat}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editingCategory ? 'Simpan Perubahan' : 'Daftarkan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Plant Modal */}
      {showAddPlantModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Tambah Pabrik / Fasilitas</h2>
              <button onClick={() => setShowAddPlantModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlant} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kode Pabrik *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NA-5"
                  value={newPlantCode}
                  onChange={(e) => setNewPlantCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Fasilitas Pabrik *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Plant NA-5 (Stamping & Frame Press Unit)"
                  value={newPlantName}
                  onChange={(e) => setNewPlantName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat / Lokasi</label>
                <input
                  type="text"
                  placeholder="e.g. Karawang KIIC Industrial Estate"
                  value={newPlantLoc}
                  onChange={(e) => setNewPlantLoc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddPlantModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Simpan Pabrik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="Hapus Data Master"
        itemType={itemToDelete?.type ? `Master ${itemToDelete.type}` : 'Data Master'}
        itemName={itemToDelete ? itemToDelete.name : ''}
        warningText="Data master ini akan dihapus dari konfigurasi hierarki sistem MMS."
        isDeleting={isDeleting}
        onConfirm={handleDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

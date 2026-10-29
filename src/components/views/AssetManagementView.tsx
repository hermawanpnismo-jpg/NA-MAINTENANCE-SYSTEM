import React, { useEffect, useState } from 'react';
import {
  Cpu, Plus, Search, Filter, Download, Eye, AlertTriangle,
  CheckCircle2, Clock, Wrench, X, Save, QrCode, Printer, Copy, Check, Trash2,
  Tags, Layers, FolderPlus
} from 'lucide-react';
import QRCode from 'qrcode';
import { Asset, AssetCategory, Plant, Building, ProductionLine, Technician, Department } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatIDR, formatDate, exportToCSV } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { realtime } from '../../lib/realtime.ts';

interface AssetManagementViewProps {
  selectedPlant: string;
  plants: Plant[];
}

export const AssetManagementView: React.FC<AssetManagementViewProps> = ({
  selectedPlant,
  plants
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Category Management Modal State
  const [showCategoryManagerModal, setShowCategoryManagerModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ code: '', name: '', description: '' });
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<AssetCategory | null>(null);

  // Detail Modal State
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Add Asset Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    asset_tag: '',
    name: '',
    category_id: '',
    plant_id: selectedPlant === 'all' ? (plants[0]?.id || '') : selectedPlant,
    building_id: '',
    line_id: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    installation_date: new Date().toISOString().substring(0, 10),
    commissioning_date: new Date().toISOString().substring(0, 10),
    purchase_cost: 0,
    warranty_end_date: '',
    criticality: 'Medium' as const,
    operating_status: 'Operational' as const,
    responsible_dept: '',
    assigned_tech_id: '',
    pm_frequency: 'Monthly' as const,
    specs: '',
    remarks: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteAsset(assetToDelete.id, 'Maintenance Manager');
      setAssetToDelete(null);
      if (selectedAssetDetail?.asset?.id === assetToDelete.id) {
        setSelectedAssetDetail(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus aset');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCategorySubmitting(true);
      setCategoryError(null);
      if (!newCategoryForm.name.trim()) {
        throw new Error('Nama kategori wajib diisi');
      }
      const code = newCategoryForm.code.trim() || newCategoryForm.name.substring(0, 4).toUpperCase();
      const created = await api.createAssetCategory({
        code,
        name: newCategoryForm.name.trim(),
        description: newCategoryForm.description.trim(),
        user_name: 'Maintenance Engineer'
      });
      setNewCategoryForm({ code: '', name: '', description: '' });
      setShowAddCategoryModal(false);
      // Refresh master data / categories
      const master = await api.getMasterData();
      setCategories(master.assetCategories);
      // Auto select newly registered category if add asset modal is open
      if (showAddModal && created?.id) {
        setFormData(prev => ({ ...prev, category_id: created.id }));
      }
    } catch (err: any) {
      setCategoryError(err.message || 'Gagal menambahkan kategori');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      setCategorySubmitting(true);
      await api.deleteAssetCategory(categoryToDelete.id, 'Maintenance Manager');
      setCategoryToDelete(null);
      const master = await api.getMasterData();
      setCategories(master.assetCategories);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus kategori');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [assetList, masterData, techList] = await Promise.all([
        api.getAssets({
          plant: selectedPlant,
          category: selectedCategory,
          status: selectedStatus,
          search
        }),
        api.getMasterData(),
        api.getTechnicians()
      ]);
      setAssets(assetList);
      setCategories(masterData.assetCategories);
      setBuildings(masterData.buildings);
      setLines(masterData.productionLines);
      setDepartments(masterData.departments);
      setTechnicians(techList);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Instant real-time background sync when ANY PC registers or updates assets
    const unsubscribe = realtime.subscribe(() => {
      loadData(true);
    });

    return () => unsubscribe();
  }, [selectedPlant, selectedCategory, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openDetail = async (assetId: string) => {
    try {
      setLoadingDetail(true);
      const detail = await api.getAssetDetail(assetId);
      setSelectedAssetDetail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (!formData.asset_tag || !formData.name || !formData.category_id || !formData.plant_id) {
        throw new Error('Please fill all required fields (Asset Tag, Name, Category, Plant)');
      }

      await api.createAsset({
        ...formData,
        user_name: 'Maintenance Engineer'
      });

      setShowAddModal(false);
      // Reset form
      setFormData({
        asset_tag: '',
        name: '',
        category_id: '',
        plant_id: selectedPlant === 'all' ? (plants[0]?.id || '') : selectedPlant,
        building_id: '',
        line_id: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        installation_date: new Date().toISOString().substring(0, 10),
        commissioning_date: new Date().toISOString().substring(0, 10),
        purchase_cost: 0,
        warranty_end_date: '',
        criticality: 'Medium',
        operating_status: 'Operational',
        responsible_dept: '',
        assigned_tech_id: '',
        pm_frequency: 'Monthly',
        specs: '',
        remarks: ''
      });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register asset');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const exportRows = assets.map((a) => ({
      Asset_Tag: a.asset_tag,
      Name: a.name,
      Category: a.category_name,
      Plant: a.plant_name,
      Manufacturer: a.manufacturer,
      Model: a.model,
      Serial_Number: a.serial_number,
      Criticality: a.criticality,
      Operating_Status: a.operating_status,
      Purchase_Cost_IDR: a.purchase_cost,
      Installation_Date: a.installation_date,
      PM_Frequency: a.pm_frequency,
      Last_PM_Date: a.last_pm_date || '-',
      Next_PM_Date: a.next_pm_date || '-'
    }));
    exportToCSV(`PT_NA_Asset_Register_${new Date().toISOString().slice(0, 10)}`, exportRows);
  };

  // QR Code Tag Generator State
  const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleOpenQR = async (asset: Asset) => {
    setSelectedAssetForQR(asset);
    setCopiedLink(false);
    try {
      const payload = JSON.stringify({
        company: 'PT National Assemblers',
        plant: asset.plant_name,
        tag: asset.asset_tag,
        id: asset.id,
        name: asset.name,
        criticality: asset.criticality,
        serial: asset.serial_number || 'N/A'
      });
      const url = await QRCode.toDataURL(payload, {
        width: 280,
        margin: 1,
        color: {
          dark: '#0A192F',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-700" />
            Asset &amp; Equipment Register
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized registry of production machinery, facility equipment, and technical specifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={() => setShowCategoryManagerModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            title="Kelola & Tambah Kategori Peralatan PT NA"
          >
            <Tags className="w-3.5 h-3.5 text-blue-700" />
            <span>Kategori ({categories.length})</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Register Asset
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by tag, name, model, serial number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </form>

        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Operational">Operational</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Breakdown">Breakdown</option>
            <option value="Standby">Standby</option>
            <option value="Decommissioned">Decommissioned</option>
          </select>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Asset Tag</th>
                <th className="py-3 px-4">Equipment Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Plant / Line</th>
                <th className="py-3 px-4">Criticality</th>
                <th className="py-3 px-4">Operating Status</th>
                <th className="py-3 px-4">PM Frequency</th>
                <th className="py-3 px-4">Last PM</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No equipment found matching criteria.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const statusColors: Record<string, string> = {
                    Operational: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'Under Maintenance': 'bg-amber-50 text-amber-700 border-amber-200',
                    Breakdown: 'bg-red-50 text-red-700 border-red-200',
                    Standby: 'bg-slate-100 text-slate-700 border-slate-200',
                    Decommissioned: 'bg-slate-200 text-slate-600 border-slate-300'
                  };
                  const criticalityColors: Record<string, string> = {
                    Critical: 'text-red-700 font-bold',
                    High: 'text-amber-700 font-semibold',
                    Medium: 'text-blue-700 font-medium',
                    Low: 'text-slate-600 font-normal'
                  };

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">
                        {asset.asset_tag}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{asset.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {asset.manufacturer} · {asset.model}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {asset.category_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{asset.plant_name}</div>
                        <div className="text-[11px] text-slate-500">{asset.line_name || asset.building_name || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={criticalityColors[asset.criticality] || ''}>
                          {asset.criticality}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusColors[asset.operating_status] || 'bg-slate-100'}`}>
                          {asset.operating_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{asset.pm_frequency}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {formatDate(asset.last_pm_date)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenQR(asset)}
                            className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="Generate Industrial QR Tag / Zebra Label"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDetail(asset.id)}
                            className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="View Technical Details & Maintenance History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setAssetToDelete(asset)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus Aset (Delete Asset)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Detail Drawer / Modal */}
      {selectedAssetDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-xs font-mono font-bold text-blue-800 uppercase tracking-wider">
                  {selectedAssetDetail.asset.asset_tag}
                </span>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {selectedAssetDetail.asset.name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAssetToDelete(selectedAssetDetail.asset)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                  title="Hapus Aset Ini (Delete Asset)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Aset</span>
                </button>
                <button
                  onClick={() => setSelectedAssetDetail(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Manufacturer</span>
                  <span className="font-semibold text-slate-800">{selectedAssetDetail.asset.manufacturer || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Model &amp; Serial</span>
                  <span className="font-semibold text-slate-800">{selectedAssetDetail.asset.model} · {selectedAssetDetail.asset.serial_number}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Purchase Cost</span>
                  <span className="font-semibold font-mono text-slate-900">{formatIDR(selectedAssetDetail.asset.purchase_cost)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Maint. Cost</span>
                  <span className="font-bold font-mono text-blue-900">{formatIDR(selectedAssetDetail.totalMaintenanceCost)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Installation / Commissioning</span>
                  <span className="font-medium text-slate-800">{selectedAssetDetail.asset.installation_date} / {selectedAssetDetail.asset.commissioning_date}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Warranty End Date</span>
                  <span className="font-medium text-slate-800">{selectedAssetDetail.asset.warranty_end_date || 'Expired'}</span>
                </div>
                <div className="col-span-4">
                  <span className="text-slate-500 block">Engineering Specifications</span>
                  <p className="font-mono text-[11px] text-slate-700 mt-0.5 bg-white p-2 rounded border border-slate-200">
                    {selectedAssetDetail.asset.specs || 'Standard industrial specifications.'}
                  </p>
                </div>
              </div>

              {/* Maintenance History Tabs / Work Orders */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                  Linked Work Orders ({selectedAssetDetail.workOrders.length})
                </h3>
                {selectedAssetDetail.workOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-lg">No work orders recorded for this equipment.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAssetDetail.workOrders.map((wo: any) => (
                      <div key={wo.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700">{wo.wo_number}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">{wo.wo_type}</span>
                          </div>
                          <p className="text-slate-700 font-medium mt-1">{wo.problem_description}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Date: {wo.request_date} · Cost: {formatIDR(wo.actual_cost)}</p>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {wo.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Breakdown History */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                  Breakdown History ({selectedAssetDetail.breakdowns.length})
                </h3>
                {selectedAssetDetail.breakdowns.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-lg">Zero breakdown incidents logged.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAssetDetail.breakdowns.map((bd: any) => (
                      <div key={bd.id} className="p-3 bg-red-50/50 border border-red-200 rounded-lg text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-red-900">{bd.breakdown_number}</span>
                          <span className="font-semibold text-red-700">{bd.status}</span>
                        </div>
                        <p className="text-slate-800 font-medium mt-1">{bd.failure_description}</p>
                        <p className="text-[11px] text-slate-500 mt-1">Downtime: {bd.downtime_minutes} min · Root Cause: {bd.root_cause || '-'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-700" />
                Register New Equipment
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Asset Tag / Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NA2-CMP-002"
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Equipment Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Atlas Copco GA-90 VSD"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 block">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      Kategori Baru
                    </button>
                  </div>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Plant Facility <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.plant_id}
                    onChange={(e) => setFormData({ ...formData, plant_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Demag, Festo, Atlas Copco"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Model &amp; Serial</label>
                  <input
                    type="text"
                    placeholder="Model / S/N"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Criticality</label>
                  <select
                    value={formData.criticality}
                    onChange={(e) => setFormData({ ...formData, criticality: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="Critical">Critical (Immediate Line Stoppage)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PM Frequency</label>
                  <select
                    value={formData.pm_frequency}
                    onChange={(e) => setFormData({ ...formData, pm_frequency: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Semiannual">Semiannual</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Purchase Cost (IDR)</label>
                  <input
                    type="number"
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assigned Lead Tech</label>
                  <select
                    value={formData.assigned_tech_id}
                    onChange={(e) => setFormData({ ...formData, assigned_tech_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="">Assign Technician</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.skill_category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Technical Specifications</label>
                  <textarea
                    rows={2}
                    placeholder="Power ratings, operating pressure, voltage, capacity, etc."
                    value={formData.specs}
                    onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {formSubmitting ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Industrial QR Code Tag Modal */}
      {selectedAssetForQR && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm tracking-wide">
                  Equipment QR Tag &amp; Barcode
                </h3>
              </div>
              <button
                onClick={() => setSelectedAssetForQR(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Industrial Sticker Layout */}
            <div className="p-6 space-y-5">
              <div className="border-2 border-slate-900 rounded-xl p-4 bg-white shadow-xs text-center space-y-3 font-mono">
                <div className="border-b-2 border-slate-900 pb-2">
                  <div className="text-[13px] font-black tracking-wider text-slate-900 uppercase">
                    PT NATIONAL ASSEMBLERS
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans uppercase font-bold tracking-widest">
                    Industrial Facility &amp; Machinery Tag
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 py-1.5 px-3 rounded text-lg font-black text-blue-950 tracking-wider">
                  {selectedAssetForQR.asset_tag}
                </div>

                {qrDataUrl && (
                  <div className="flex justify-center p-2 bg-white border border-slate-100 rounded-lg">
                    <img
                      src={qrDataUrl}
                      alt={selectedAssetForQR.asset_tag}
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                )}

                <div className="text-left font-sans text-xs space-y-1 pt-1 border-t border-slate-200">
                  <div className="font-bold text-slate-900 truncate">
                    {selectedAssetForQR.name}
                  </div>
                  <div className="text-[11px] text-slate-600 flex justify-between">
                    <span>Model: {selectedAssetForQR.model || 'Standard'}</span>
                    <span className="font-mono font-bold text-blue-800">{selectedAssetForQR.plant_name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>S/N: {selectedAssetForQR.serial_number || 'N/A'}</span>
                    <span className="font-semibold text-rose-700">{selectedAssetForQR.criticality} Criticality</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`PT_NA_TAG_${selectedAssetForQR.asset_tag}.png`}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-center transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </a>
                )}
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Label
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/?asset=${selectedAssetForQR.id}`
                    );
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy QR Link
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const id = selectedAssetForQR.id;
                    setSelectedAssetForQR(null);
                    openDetail(id);
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Inspect Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Asset Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(assetToDelete)}
        title="Hapus Aset (Delete Asset)"
        itemType="Aset / Equipment"
        itemName={assetToDelete ? `[${assetToDelete.asset_tag}] ${assetToDelete.name}` : ''}
        warningText="Aset ini beserta riwayat breakdown, work order, dan jadwal PM terkait akan dihapus secara permanen dari database."
        isDeleting={isDeleting}
        onConfirm={handleDeleteAsset}
        onCancel={() => setAssetToDelete(null)}
      />

      {/* Category Manager Modal */}
      {showCategoryManagerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Tags className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kelola Kategori Peralatan PT NA</h3>
                  <p className="text-xs text-slate-500">Sesuaikan daftar kategori mesin & equipment produksi</p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryManagerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Daftar Kategori Terdaftar ({categories.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Kategori Baru
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {categories.map((cat) => {
                  const count = assets.filter(a => a.category_id === cat.id || a.category_name === cat.name).length;
                  return (
                    <div key={cat.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
                            {cat.code}
                          </span>
                          <span className="text-sm font-bold text-slate-900">{cat.name}</span>
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                            {count} Unit Aset
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-slate-500 pl-0.5">{cat.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCategoryToDelete(cat)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowCategoryManagerModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">Tambah Kategori Equipment</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setCategoryError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {categoryError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                {categoryError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Laser Cutting Machine, Chassis Jig, ..."
                  value={newCategoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoCode = name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
                    setNewCategoryForm(prev => ({
                      ...prev,
                      name,
                      code: prev.code ? prev.code : autoCode
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Singkat Kategori
                </label>
                <input
                  type="text"
                  placeholder="Contoh: LASR, JIGS, WELD"
                  value={newCategoryForm.code}
                  onChange={(e) => setNewCategoryForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Deskripsi
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi peralatan atau jenis mesin dalam kategori ini..."
                  value={newCategoryForm.description}
                  onChange={(e) => setNewCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={categorySubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {categorySubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(categoryToDelete)}
        title="Hapus Kategori Equipment"
        itemType="Kategori"
        itemName={categoryToDelete ? `[${categoryToDelete.code}] ${categoryToDelete.name}` : ''}
        warningText="Kategori ini akan dihapus dari daftar kategori PT National Assemblers. Pastikan tidak ada aset aktif yang bergantung pada kategori ini."
        isDeleting={categorySubmitting}
        onConfirm={handleDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
};

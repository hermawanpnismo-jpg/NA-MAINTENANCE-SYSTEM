import React, { useEffect, useState } from 'react';
import {
  Building2, Plus, Phone, Mail, Award, X, Save, Trash2
} from 'lucide-react';
import { Vendor } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';

export const VendorsView: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVendor, setNewVendor] = useState({
    vendor_code: '',
    name: '',
    service_category: 'Equipment Overhaul',
    contact_person: '',
    phone: '',
    email: '',
    contract_period: '2026-01-01 to 2026-12-31',
    rating: 4.8,
    remarks: ''
  });

  // Delete State
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteVendor(vendorToDelete.id, 'Procurement');
      setVendorToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus data vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getVendors();
      setVendors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createVendor({
        ...newVendor,
        user_name: 'Procurement Specialist'
      });
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add vendor');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-700" />
            Vendor &amp; Contractor Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorized OEM service partners, specialized calibration contractors, and spare parts supply agreements.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add Vendor Partner
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((v) => (
          <div key={v.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-bold text-blue-900">{v.vendor_code}</span>
                <span className="text-xs font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  ★ {v.rating}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900">{v.name}</h3>
              <span className="text-xs font-medium text-slate-600 block">{v.service_category}</span>

              <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100">
                <div className="text-slate-700 font-semibold">{v.contact_person}</div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{v.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{v.email || '-'}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Contract: <strong className="text-slate-800 font-mono text-[11px]">{v.contract_period}</strong></span>
              <button
                onClick={() => setVendorToDelete(v)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                title="Hapus Vendor Partner (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Register Maintenance Vendor</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Vendor Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VND-FANUC"
                    value={newVendor.vendor_code}
                    onChange={(e) => setNewVendor({ ...newVendor, vendor_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Service Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robotics & Automation"
                    value={newVendor.service_category}
                    onChange={(e) => setNewVendor({ ...newVendor, service_category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company Official Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PT Fanuc Indonesia"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Hendra Kusuma"
                    value={newVendor.contact_person}
                    onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Telephone</label>
                  <input
                    type="text"
                    placeholder="+62-21-..."
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(vendorToDelete)}
        title="Hapus Rekanan Vendor"
        itemType="Vendor Partner"
        itemName={vendorToDelete ? `[${vendorToDelete.vendor_code}] ${vendorToDelete.name}` : ''}
        warningText="Data rekanan vendor ini akan dihapus dari direktori kontraktor dan penyedia jasa."
        isDeleting={isDeleting}
        onConfirm={handleDeleteVendor}
        onCancel={() => setVendorToDelete(null)}
      />
    </div>
  );
};

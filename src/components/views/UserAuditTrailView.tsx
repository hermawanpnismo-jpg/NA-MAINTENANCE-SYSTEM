import React, { useEffect, useState } from 'react';
import {
  History, Users, Shield, CheckCircle2, Lock, Clock, Search, Trash2, Plus, X, KeyRound,
  AlertTriangle, ShieldAlert, Check, HelpCircle
} from 'lucide-react';
import { AuditLog, User } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatDateTime } from '../../lib/formatters.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { realtime } from '../../lib/realtime.ts';

export const UserAuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'audit' | 'users' | 'roles' | 'rbac'>('audit');
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  // User deletion state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Role deletion state
  const [roleToDelete, setRoleToDelete] = useState<any | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    employee_id: '',
    name: '',
    email: '',
    role: 'Maintenance Technician',
    department: 'General Affair & Maintenance',
    plant_id: 'plant-na2',
    password: '',
    action_password: ''
  });

  // Add Role Modal State
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    department: 'General Affair & Maintenance',
    description: '',
    action_password: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [logList, userList, rList] = await Promise.all([
        api.getAuditLogs(),
        api.getUsers(),
        api.getRoles()
      ]);
      setLogs(logList);
      setUsers(userList);
      setRolesList(rList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes
    const unsub = realtime.subscribe((ev) => {
      if (ev.entity === 'users' || ev.entity === 'roles' || ev.entity === 'all') {
        loadData();
      }
    });

    return () => unsub();
  }, []);

  const isProtectedUser = (_u: User) => false;
  const isProtectedRole = (_r: any) => false;

  const handleDeleteUser = async (password = 'Nackp2026') => {
    if (!userToDelete) return;
    if (isProtectedUser(userToDelete)) {
      alert('Role / Pengguna Warto, Hermawan, dan Alfin dilindungi oleh sistem dan tidak dapat dihapus!');
      setUserToDelete(null);
      return;
    }
    try {
      setIsDeletingUser(true);
      await api.deleteUser(userToDelete.id, 'Administrator', password);
      setToastMessage({ type: 'success', text: `Pengguna ${userToDelete.name} berhasil dihapus.` });
      setTimeout(() => setToastMessage(null), 3500);
      setUserToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus operator pengguna');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleDeleteRole = async (password = 'Nackp2026') => {
    if (!roleToDelete) return;
    if (isProtectedRole(roleToDelete)) {
      alert('Role Warto, Hermawan, dan Alfin dilindungi oleh sistem dan tidak dapat dihapus!');
      setRoleToDelete(null);
      return;
    }
    try {
      setIsDeletingRole(true);
      await api.deleteRole(roleToDelete.id, password, 'Administrator');
      setToastMessage({ type: 'success', text: `Role "${roleToDelete.name}" berhasil dihapus.` });
      setTimeout(() => setToastMessage(null), 3500);
      setRoleToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus role');
    } finally {
      setIsDeletingRole(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.action_password) {
      alert('Password otorisasi wajib diisi untuk menambahkan operator/pengguna baru.');
      return;
    }
    try {
      setIsSubmittingUser(true);
      await api.createUser(newUserForm);
      setToastMessage({ type: 'success', text: `Operator baru [${newUserForm.employee_id}] ${newUserForm.name} berhasil ditambahkan!` });
      setTimeout(() => setToastMessage(null), 3500);
      setShowAddUserModal(false);
      setNewUserForm({
        employee_id: '',
        name: '',
        email: '',
        role: 'Maintenance Technician',
        department: 'General Affair & Maintenance',
        plant_id: 'plant-na2',
        password: '',
        action_password: ''
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan operator pengguna');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.action_password) {
      alert('Password otorisasi wajib diisi untuk menambahkan role baru.');
      return;
    }
    try {
      setIsSubmittingRole(true);
      await api.createRole(newRoleForm);
      setToastMessage({ type: 'success', text: `Role baru "${newRoleForm.name}" berhasil ditambahkan ke sistem!` });
      setTimeout(() => setToastMessage(null), 3500);
      setShowAddRoleModal(false);
      setNewRoleForm({
        name: '',
        department: 'General Affair & Maintenance',
        description: '',
        action_password: ''
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan role baru');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const permissions = [
    { module: 'Asset Register', view: 'All', edit: 'Super, Mgr, Spv, Pln', delete: 'Admin, Mgr (Pass: Nackp2026)' },
    { module: 'Preventive Maintenance', view: 'All', edit: 'Super, Mgr, Spv, Tech', delete: 'Admin, Mgr (Pass: Nackp2026)' },
    { module: 'Breakdown Reporting', view: 'All', edit: 'Super, Mgr, Spv, Tech', delete: 'Admin (Pass: Nackp2026)' },
    { module: 'Work Order Dispatch', view: 'All', edit: 'Super, Mgr, Spv, Tech', delete: 'Admin, Mgr (Pass: Nackp2026)' },
    { module: 'Building Facilities', view: 'All', edit: 'Super, GA-MNT, Spv, Tech', delete: 'Admin, GA (Pass: Nackp2026)' },
    { module: 'Spare Parts Requisition', view: 'All', edit: 'Storekeeper, Spv', delete: 'Admin, Storekeeper' },
    { module: 'Role & User Management', view: 'Admin, Mgr', edit: 'Admin (Pass: Nackp2026)', delete: 'Admin (Protected: Warto, Hermawan, Alfin)' },
    { module: 'Audit Log Archival', view: 'Admin, Mgr', edit: 'None (Immutable)', delete: 'None (Immutable)' },
  ];

  const filteredLogs = logs.filter((l) => {
    if (!search) return true;
    return (
      l.user_name.toLowerCase().includes(search.toLowerCase()) ||
      l.description.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.module.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-blue-700" />
            Security, Role-Based Access &amp; Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen Role &amp; Pengguna sistem MMS. Akses rotasi personil dan penambahan/penghapusan role dilindungi oleh Password Otorisasi Sistem.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-1 transition-colors border-b-2 ${
            activeTab === 'audit' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Trail Log ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-1 transition-colors border-b-2 ${
            activeTab === 'users' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Authorized Operators ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-3 px-1 transition-colors border-b-2 ${
            activeTab === 'roles' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Role Management ({rolesList.length})
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`pb-3 px-1 transition-colors border-b-2 ${
            activeTab === 'rbac' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          RBAC Permissions Matrix
        </button>
      </div>

      {/* TAB 1: AUDIT TRAIL LOG */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, module, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 font-mono">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const actionBadge: Record<string, string> = {
                      CREATE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      UPDATE: 'bg-blue-50 text-blue-800 border-blue-200',
                      DELETE: 'bg-rose-50 text-rose-800 border-rose-200',
                      STATUS_CHANGE: 'bg-amber-50 text-amber-800 border-amber-200',
                      STOCK_ISSUE: 'bg-purple-50 text-purple-800 border-purple-200'
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{log.user_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${actionBadge[log.action] || 'bg-slate-100'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{log.module}</td>
                        <td className="py-3 px-4 text-slate-700">{log.description}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTHORIZED OPERATORS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                Pengelolaan personil manajemen dan teknisi terbuka untuk regenerasi organisasi dan pensiun menggunakan password otorisasi sistem.
              </span>
            </div>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Operator Pengguna
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Corporate Email</th>
                  <th className="py-3 px-4">Designated Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status &amp; Proteksi</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const protectedUser = isProtectedUser(u);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{u.employee_id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {protectedUser && (
                          <span title="Personil Inti Dilindungi Sistem">
                            <Lock className="w-3.5 h-3.5 text-amber-600 inline" />
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{u.department}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            {u.status}
                          </span>
                          {protectedUser ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                              <Lock className="w-2.5 h-2.5 text-amber-600" />
                              Dilindungi
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Standard</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {protectedUser ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 text-slate-400 text-[10px] font-bold cursor-not-allowed bg-slate-50 border border-slate-200 rounded"
                            title="Akun personil Warto, Hermawan, dan Alfin dilindungi sistem dan tidak dapat dihapus."
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            Terkunci
                          </span>
                        ) : (
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Pengguna (Memerlukan Password Nackp2026)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROLE MANAGEMENT */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Manajemen Role MMS (General Affair &amp; Maintenance)</span>
                <span>
                  Penambahan dan penghapusan role sistem dilindungi oleh password otorisasi sistem tanpa pembatasan permanen.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowAddRoleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Role Baru
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Nama Role</th>
                  <th className="py-3 px-4">Departemen Terkait</th>
                  <th className="py-3 px-4">Deskripsi &amp; Otoritas</th>
                  <th className="py-3 px-4">Status Proteksi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rolesList.map((r) => {
                  const protectedRole = isProtectedRole(r);

                  return (
                    <tr key={r.id || r.name} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        {protectedRole ? (
                          <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                            <Shield className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span>{r.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {r.department || 'General Affair & Maintenance'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-md">
                        {r.description || 'Akses operasional standar sistem pemeliharaan pabrik.'}
                      </td>
                      <td className="py-3 px-4">
                        {protectedRole ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Lock className="w-3 h-3 text-amber-600" />
                            Core Protected (Warto / Hermawan / Alfin)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            Custom Role (Dapat Dihapus)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {protectedRole ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-400 text-[10px] font-bold cursor-not-allowed bg-slate-50 border border-slate-200 rounded"
                            title="Role inti Warto, Hermawan, dan Alfin dilindungi sistem dan tidak dapat dihapus."
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            Protected
                          </span>
                        ) : (
                          <button
                            onClick={() => setRoleToDelete(r)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Role Ini (Memerlukan Password Nackp2026)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RBAC PERMISSIONS MATRIX */}
      {activeTab === 'rbac' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Enterprise Role-Based Access Control (RBAC) Matrix</h2>
            <span className="text-xs text-slate-500">Security enforcement matrix governing endpoint authorization across all modules.</span>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">System Module</th>
                <th className="py-3 px-4">Read / View Access</th>
                <th className="py-3 px-4">Create &amp; Update</th>
                <th className="py-3 px-4">Authorized Deletion / Archive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissions.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{p.module}</td>
                  <td className="py-3 px-4 text-slate-700">{p.view}</td>
                  <td className="py-3 px-4 font-semibold text-blue-900">{p.edit}</td>
                  <td className="py-3 px-4 text-rose-800 font-medium">{p.delete}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Tambah Operator / Pengguna Baru */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-700" />
                <h3 className="font-extrabold text-slate-900 text-sm">Tambah Operator / Pengguna Baru</h3>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: NA-EMP-015"
                    value={newUserForm.employee_id}
                    onChange={(e) => setNewUserForm({ ...newUserForm, employee_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Operator"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Corporate Email *</label>
                <input
                  type="email"
                  required
                  placeholder="nama.user@nationalassemblers.co.id"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pilih Role *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {rolesList.map((r) => (
                      <option key={r.id || r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Departemen</label>
                  <input
                    type="text"
                    value={newUserForm.department}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kata Sandi Akun Pengguna</label>
                <input
                  type="password"
                  placeholder="Kata sandi untuk login operator"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              {/* Password Otorisasi Sistem */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-1.5">
                <label className="font-extrabold text-amber-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  Password Otorisasi Sistem *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUserForm.action_password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, action_password: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-slate-900"
                />
                <p className="text-[10px] text-amber-700 leading-tight">
                  Sesuai ketentuan keamanan sistem MMS, penambahan user/role baru wajib diverifikasi dengan password otorisasi sistem.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingUser ? 'Menyimpan...' : 'Simpan Operator Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Role Baru */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-700" />
                <h3 className="font-extrabold text-slate-900 text-sm">Tambah Role Sistem Baru</h3>
              </div>
              <button onClick={() => setShowAddRoleModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3.5">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Role Baru *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Production Quality Inspector"
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Departemen Terkait</label>
                <input
                  type="text"
                  placeholder="Contoh: Quality Assurance / GA-Maintenance"
                  value={newRoleForm.department}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Cakupan Otoritas</label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan wewenang dan cakupan pekerjaan role ini..."
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              {/* Password Otorisasi Sistem */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-1.5">
                <label className="font-extrabold text-amber-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  Password Otorisasi Sistem *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newRoleForm.action_password}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, action_password: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-slate-900"
                />
                <p className="text-[10px] text-amber-700 leading-tight">
                  Memerlukan password otorisasi sistem untuk merealisasikan pembuatan role baru.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRole}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingRole ? 'Menyimpan...' : 'Simpan Role Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for User */}
      <DeleteConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Hapus Operator Pengguna"
        itemType="Akun Operator"
        itemName={userToDelete ? `[${userToDelete.employee_id}] ${userToDelete.name} (${userToDelete.role})` : ''}
        warningText="Akses operator pengguna ini akan dicabut. Masukkan kata sandi otorisasi untuk merealisasikan penghapusan."
        isDeleting={isDeletingUser}
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />

      {/* Delete Confirmation Modal for Role */}
      <DeleteConfirmModal
        isOpen={Boolean(roleToDelete)}
        title="Hapus Role Sistem"
        itemType="Role MMS"
        itemName={roleToDelete ? `Role: ${roleToDelete.name}` : ''}
        warningText="Role sistem ini akan dihapus permanen dari daftar otorisasi. Masukkan kata sandi otorisasi sistem untuk merealisasikan penghapusan."
        isDeleting={isDeletingRole}
        onConfirm={handleDeleteRole}
        onCancel={() => setRoleToDelete(null)}
      />
    </div>
  );
};

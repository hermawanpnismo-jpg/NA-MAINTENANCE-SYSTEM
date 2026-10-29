import React, { useState, useEffect } from 'react';
import {
  Users, Network, Shield, ShieldCheck, Lock, Plus, Search, CheckCircle2,
  AlertTriangle, ArrowRight, UserCheck, Edit3, Trash2, ChevronDown, ChevronRight,
  Award, FileText, CheckSquare, Sparkles, RefreshCw, KeyRound, Building,
  Briefcase, CornerDownRight, Layers, Eye, Check, X, ShieldAlert, Cpu
} from 'lucide-react';
import { User, SignoffAuthorities, ManagementLevelInfo } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { realtime } from '../../lib/realtime.ts';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';
import { ChangeSystemPasswordModal } from '../common/ChangeSystemPasswordModal.tsx';

export const UserHierarchyManagementView: React.FC = () => {
  const [signoffs, setSignoffs] = useState<SignoffAuthorities | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tree' | 'roster' | 'matrix'>('tree');
  const [search, setSearch] = useState('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'all'>('all');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    role: 'Maintenance Technician',
    department: 'General Affair & Maintenance',
    plant_id: 'plant-na2',
    hierarchy_level: 3,
    company_function: 'General Affair & Maintenance (GA-MNT)',
    job_title: '',
    can_prepare: true,
    can_verify: false,
    can_approve: false,
    can_acknowledge: false,
    reporting_to_id: '',
    action_password: '',
    password: 'User@2026'
  });

  const loadHierarchyData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [signoffData, userList] = await Promise.all([
        api.getManagementSignoffs(),
        api.getUsers()
      ]);
      setSignoffs(signoffData);
      setUsers(userList);
    } catch (err: any) {
      console.error('Failed to load hierarchy:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchyData();
    const unsub = realtime.subscribe((ev) => {
      if (ev.entity === 'users' || ev.entity === 'all') {
        loadHierarchyData(true);
      }
    });
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setFormData({
      employee_id: `NA-MGT-${String(users.length + 1).padStart(3, '0')}`,
      name: '',
      email: '',
      role: 'Maintenance Leader - NA-2',
      department: 'General Affair & Maintenance',
      plant_id: 'plant-na2',
      hierarchy_level: 3,
      company_function: 'General Affair & Maintenance (GA-MNT)',
      job_title: 'Maintenance Leader',
      can_prepare: true,
      can_verify: true,
      can_approve: false,
      can_acknowledge: false,
      reporting_to_id: 'usr-spv',
      action_password: '',
      password: 'User@2026'
    });
    setShowAddModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormData({
      employee_id: u.employee_id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      plant_id: u.plant_id || 'plant-na2',
      hierarchy_level: u.hierarchy_level || 3,
      company_function: u.company_function || u.department,
      job_title: u.job_title || u.role,
      can_prepare: Boolean(u.can_prepare),
      can_verify: Boolean(u.can_verify),
      can_approve: Boolean(u.can_approve),
      can_acknowledge: Boolean(u.can_acknowledge),
      reporting_to_id: u.reporting_to_id || '',
      action_password: '',
      password: ''
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.action_password) {
      setToastMessage({ type: 'warning', text: 'Password otorisasi sistem wajib diisi!' });
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          ...formData,
          user_name: 'System Administrator'
        });
        setToastMessage({ type: 'success', text: `Data hirarki [${formData.name}] berhasil diperbarui!` });
        setEditingUser(null);
      } else {
        await api.createUser({
          ...formData,
          user_name: 'System Administrator'
        });
        setToastMessage({ type: 'success', text: `Anggota manajemen [${formData.name}] berhasil ditambahkan!` });
        setShowAddModal(false);
      }
      setTimeout(() => setToastMessage(null), 3500);
      loadHierarchyData(true);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan data manajemen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (passwordInput?: string) => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteUser(userToDelete.id, 'System Administrator', passwordInput);
      setToastMessage({ type: 'success', text: `Personil [${userToDelete.name}] berhasil dipensiunkan / dihapus dari sistem.` });
      setTimeout(() => setToastMessage(null), 3000);
      setUserToDelete(null);
      loadHierarchyData(true);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus user');
    } finally {
      setIsDeleting(false);
    }
  };

  // All users can be transitioned or retired upon succession: no permanent lock
  const isProtectedUser = (_u: User) => false;

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return { label: 'Level 1: Top Executive', bg: 'bg-purple-100 text-purple-900 border-purple-300', dot: 'bg-purple-500' };
      case 2:
        return { label: 'Level 2: Dept Head / Spv', bg: 'bg-blue-100 text-blue-900 border-blue-300', dot: 'bg-blue-500' };
      case 3:
        return { label: 'Level 3: Plant Leader', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', dot: 'bg-emerald-500' };
      case 4:
        return { label: 'Level 4: Specialist / Planner', bg: 'bg-amber-100 text-amber-900 border-amber-300', dot: 'bg-amber-500' };
      case 5:
        return { label: 'Level 5: Squad Technician', bg: 'bg-slate-100 text-slate-900 border-slate-300', dot: 'bg-slate-500' };
      default:
        return { label: `Level ${level}`, bg: 'bg-slate-100 text-slate-800 border-slate-300', dot: 'bg-slate-400' };
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      u.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      (u.company_function && u.company_function.toLowerCase().includes(search.toLowerCase())) ||
      (u.job_title && u.job_title.toLowerCase().includes(search.toLowerCase()));

    const matchesLevel = selectedLevelFilter === 'all' || u.hierarchy_level === selectedLevelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-md animate-in fade-in ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
          toastMessage.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-800' :
          'bg-blue-50 border-blue-300 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Main Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Soft Decorative Ambient Slashes */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 w-64 h-2 bg-gradient-to-r from-transparent via-blue-500 to-emerald-400 opacity-60 transform -rotate-12 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-300">
              <span className="bg-blue-800/80 px-2 py-0.5 rounded text-[10.5px] font-mono text-white flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-blue-300" />
                MANAGEMENT HIERARCHY &amp; DECISION MATRIX
              </span>
              <span>•</span>
              <span className="text-slate-300">PT National Assemblers · NA-MMS</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                Protected Core: Warto · Hermawan · Alfin
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>Setting User &amp; Hirarki Manajemen Perusahaan</span>
            </h1>

            <p className="text-slate-300 text-xs md:text-sm max-w-3xl leading-relaxed">
              Semua nama personil yang terdaftar adalah team management pembuat keputusan di sistem ini. Pengaturan level hirarki dan matriks wewenang terintegrasi langsung dengan seluruh keputusan:
              <strong className="text-blue-300 font-bold ml-1">Prepared by</strong>,
              <strong className="text-emerald-300 font-bold ml-1">Verified by</strong>,
              <strong className="text-amber-300 font-bold ml-1">Approved by</strong>, dan
              <strong className="text-purple-300 font-bold ml-1">Acknowledged by</strong>.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => loadHierarchyData(true)}
              disabled={loading}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Sinkronkan data hirarki terbaru"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-102"
              title="Ganti password otorisasi sistem yang berlaku universal"
            >
              <KeyRound className="w-4 h-4 text-slate-950" />
              <span>Ganti Password Sistem</span>
            </button>

            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah User / Hirarki Baru</span>
            </button>
          </div>
        </div>

        {/* Quick Decision Summary Pills */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
              🏛️
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Acknowledge by</span>
              <span className="font-extrabold text-white text-xs">{signoffs?.acknowledgedBy?.length || 1} Executive</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold">
              ✍️
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Approved by</span>
              <span className="font-extrabold text-white text-xs">{signoffs?.approvedBy?.length || 2} Approvers</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
              🔍
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Verified by</span>
              <span className="font-extrabold text-white text-xs">{signoffs?.verifiedBy?.length || 4} Verifiers</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-500/20 text-slate-300 flex items-center justify-center font-bold">
              📝
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Prepared / Report</span>
              <span className="font-extrabold text-white text-xs">{signoffs?.preparedBy?.length || 7} Leaders/Techs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Succession Policy Note (Note di posisi setting terkait password & rotasi) */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5 border border-amber-300/50">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                Kebijakan Otorisasi Sistem &amp; Rotasi Personil (Pensiun / Pergantian Posisi)
              </h4>
              <span className="text-[10px] bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                Transisi Terbuka
              </span>
            </div>
            <p className="text-[11.5px] text-amber-900 mt-1 leading-relaxed max-w-4xl">
              Seluruh anggota tim manajemen (termasuk Supervisor Warto, GA-Maintanance Leader Hermawan Prasetyo, dan NA-2 Maintenance Leader Alfin) tidak dikunci permanen dan dapat disesuaikan posisinya atau dihapus saat memasuki masa pensiun serta pergantian struktur organisasi perusahaan. Demi keamanan tata kelola dan privasi, password otorisasi tidak ditampilkan di layar. Anda dapat mengganti password kapan saja melalui tombol di samping.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="shrink-0 px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:scale-102"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-300" />
          <span>Ganti Password Sistem</span>
        </button>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'tree', label: 'Bagan Hirarki Perusahaan', icon: Network, badge: `${users.length} Personil` },
            { id: 'roster', label: 'Daftar Manajemen & Jabatan', icon: Users, badge: null },
            { id: 'matrix', label: 'Matriks Otorisasi Keputusan (Sign-Off)', icon: ShieldCheck, badge: 'Integrated' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isActive ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, jabatan, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <select
            value={selectedLevelFilter}
            onChange={(e) => setSelectedLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 font-medium focus:bg-white cursor-pointer"
          >
            <option value="all">Semua Level (1-5)</option>
            <option value="1">Level 1: Executive</option>
            <option value="2">Level 2: Dept Head</option>
            <option value="3">Level 3: Plant Leader</option>
            <option value="4">Level 4: Planner / Specialist</option>
            <option value="5">Level 5: Squad Technician</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: VISUAL COMPANY ORGANIZATIONAL TREE
          ========================================================================= */}
      {activeTab === 'tree' && (
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((lvlNum) => {
            const levelInfo = signoffs?.levels?.find((l) => l.level === lvlNum) || {
              level: lvlNum,
              title: `Level ${lvlNum}`,
              description: `Manajemen Hirarki Tingkat ${lvlNum}`,
              color: 'blue'
            };
            const levelUsers = filteredUsers.filter((u) => (u.hierarchy_level || 3) === lvlNum);
            if (levelUsers.length === 0 && selectedLevelFilter !== 'all') return null;

            return (
              <div key={lvlNum} className="space-y-3">
                {/* Level Header Banner */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-blue-900 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                      L{lvlNum}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {levelInfo.title}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {levelInfo.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    {levelUsers.length} Anggota
                  </span>
                </div>

                {/* Level User Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {levelUsers.map((u) => {
                    const isProtected = isProtectedUser(u);
                    const supervisor = users.find((s) => s.id === u.reporting_to_id);

                    return (
                      <div
                        key={u.id}
                        className={`bg-white rounded-2xl p-4 border transition-all duration-200 relative group flex flex-col justify-between ${
                          isProtected
                            ? 'border-blue-300 ring-2 ring-blue-500/20 shadow-md'
                            : 'border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md'
                        }`}
                      >
                        {/* Top Line: Badges & Protection Lock */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              {u.employee_id}
                            </span>
                            <div className="flex items-center gap-1">
                              {isProtected ? (
                                <span className="text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  Protected Core
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  Management User
                                </span>
                              )}
                            </div>
                          </div>

                          {/* User Name & Jabatan */}
                          <div className="space-y-1">
                            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {u.name}
                            </h4>
                            <p className="text-xs font-semibold text-slate-600">
                              {u.job_title || u.role}
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{u.company_function || u.department}</span>
                            </p>
                          </div>

                          {/* Reporting Line */}
                          {supervisor && (
                            <div className="mt-2.5 p-1.5 bg-slate-50 rounded-lg text-[10.5px] text-slate-600 flex items-center gap-1.5 border border-slate-100">
                              <CornerDownRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Reports to: <strong className="text-slate-800">{supervisor.name}</strong></span>
                            </div>
                          )}

                          {/* Decision Rights Matrix Badges */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1">
                            {Boolean(u.can_prepare) && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200" title="Dapat menyusun form/laporan">
                                📝 Prepared
                              </span>
                            )}
                            {Boolean(u.can_verify) && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200" title="Dapat memeriksa & memverifikasi teknis">
                                🔍 Verified
                              </span>
                            )}
                            {Boolean(u.can_approve) && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200" title="Dapat menyetujui pekerjaan & anggaran">
                                ✍️ Approved
                              </span>
                            )}
                            {Boolean(u.can_acknowledge) && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200" title="Dapat mengesahkan tingkat eksekutif">
                                🏛️ Acknowledged
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[10px] text-slate-400 font-medium">
                            Plant: <strong className="text-slate-700 uppercase">{u.plant_id || 'All'}</strong>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditModal(u)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Edit hirarki & wewenang jabatan"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Hapus / Pensiunkan pengguna ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          TAB 2: MANAGEMENT ROSTER & LEVEL TABLE
          ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nama &amp; Employee ID</th>
                  <th className="py-3 px-4">Level Hirarki</th>
                  <th className="py-3 px-4">Jabatan &amp; Fungsi Perusahaan</th>
                  <th className="py-3 px-4">Plant &amp; Status</th>
                  <th className="py-3 px-4 text-center">Matriks Otorisasi Keputusan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isProtected = isProtectedUser(u);
                  const badge = getLevelBadge(u.hierarchy_level || 3);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 block">{u.employee_id} • {u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <strong className="text-slate-800 font-semibold block">{u.job_title || u.role}</strong>
                        <span className="text-[11px] text-slate-500">{u.company_function || u.department}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-700 font-semibold uppercase block">{u.plant_id || 'All Plants'}</span>
                        <span className="text-[10px] text-emerald-600 font-bold">● {u.status}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1 text-[9.5px]">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${u.can_prepare ? 'bg-slate-200 text-slate-800 font-extrabold' : 'text-slate-300'}`}>
                            Prepared
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-bold ${u.can_verify ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'text-slate-300'}`}>
                            Verified
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-bold ${u.can_approve ? 'bg-blue-100 text-blue-800 font-extrabold' : 'text-slate-300'}`}>
                            Approved
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-bold ${u.can_acknowledge ? 'bg-purple-100 text-purple-800 font-extrabold' : 'text-slate-300'}`}>
                            Ack
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            title="Edit User &amp; Hirarki"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Hapus / Pensiunkan user ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: INTEGRATED DECISION AUTHORITY MATRIX
          ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Integrasi Matriks Keputusan Operasional MMS
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
              Tabel di bawah ini menjelaskan bagaimana seluruh alur pengambilan keputusan di dalam modul <strong>Breakdown Management</strong>, <strong>Building Facility Maintenance</strong>, <strong>Work Orders</strong>, dan <strong>Purchase Requests</strong> secara otomatis mengambil nama personil manajemen yang terdaftar di menu ini berdasarkan wewenang masing-masing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Prepared by */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">1. Prepared / Report by</span>
                  <span className="text-base">📝</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Menyusun temuan kerusakan, investigasi 5W+1H awal, foto evidence lapangan (before/process), dan kebutuhan part darurat.
                </p>
                <div className="pt-2 border-t border-slate-200 text-[10.5px] text-slate-500">
                  <strong className="text-slate-800 block mb-1">Personil Otoritas:</strong>
                  {signoffs?.preparedBy?.slice(0, 3).map((p) => p.name).join(', ')} ...
                </div>
              </div>

              {/* Verified by */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-xs">2. Verified by</span>
                  <span className="text-base">🔍</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Memeriksa kebenaran teknis perbaikan, audit faktor Ishikawa 4M+1E, uji coba (Trial Run), dan verifikasi serah terima operasional lini.
                </p>
                <div className="pt-2 border-t border-emerald-200 text-[10.5px] text-slate-500">
                  <strong className="text-emerald-900 block mb-1">Personil Otoritas:</strong>
                  {signoffs?.verifiedBy?.map((p) => p.name).join(', ')}
                </div>
              </div>

              {/* Approved by */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-xs">3. Approved by</span>
                  <span className="text-base">✍️</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Menyetujui tindakan pencegahan permanen (CAPA), estimasi biaya shutdown, alokasi suku cadang, dan rilis kembali mesin ke produksi.
                </p>
                <div className="pt-2 border-t border-blue-200 text-[10.5px] text-slate-500">
                  <strong className="text-blue-900 block mb-1">Personil Otoritas:</strong>
                  {signoffs?.approvedBy?.map((p) => p.name).join(', ')}
                </div>
              </div>

              {/* Acknowledged by */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 text-xs">4. Acknowledged by</span>
                  <span className="text-base">🏛️</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pemberitahuan eksekutif dan pengesahan akhir oleh Kepala Pabrik (Plant Manager / Head of Manufacturing) untuk audit dan kepatuhan.
                </p>
                <div className="pt-2 border-t border-purple-200 text-[10.5px] text-slate-500">
                  <strong className="text-purple-900 block mb-1">Personil Otoritas:</strong>
                  {signoffs?.acknowledgedBy?.map((p) => p.name).join(', ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD / EDIT MANAGEMENT USER MODAL (REQUIRES Nackp2026)
          ========================================================================= */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  {editingUser ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {editingUser ? `Edit Hirarki Manajemen: ${editingUser.name}` : 'Tambah Anggota Tim Manajemen & Hirarki'}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Otorisasi perubahan memerlukan password keamanan resmi perusahaan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* Protected notification if editing core leader */}
              {editingUser && isProtectedUser(editingUser) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Akun ini adalah <strong>Protected Core Personnel ({editingUser.name})</strong>. Status akun akan selalu aktif dan hak otorisasi intinya dilindungi.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Lengkap &amp; Gelar *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                    placeholder="Contoh: Ir. Budi Santoso, M.T."
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Employee ID / NIK *</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-hidden focus:border-blue-500"
                    placeholder="NA-MGT-007"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Perusahaan *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                    placeholder="nama@nationalassemblers.co.id"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Level Hirarki Perusahaan *</label>
                  <select
                    value={formData.hierarchy_level}
                    onChange={(e) => setFormData({ ...formData, hierarchy_level: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white cursor-pointer"
                  >
                    <option value="1">Level 1: Executive Top Management (Plant Manager)</option>
                    <option value="2">Level 2: Dept Head / Section Superintendent (Spv Warto)</option>
                    <option value="3">Level 3: All Plant GA-Maintenance Leader (Hermawan Prasetyo)</option>
                    <option value="4">Level 4: NA2 Maintenance Leader (Alfin Prasetyo)</option>
                    <option value="5">Level 5: Specialist / Engineer / Planner</option>
                    <option value="6">Level 6: Shift In-Charge / Squad Technicians</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jabatan Spesifik (Job Title)</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                    placeholder="Contoh: Maintenance Leader - NA-2 AION"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fungsi Perusahaan / Bidang</label>
                  <input
                    type="text"
                    value={formData.company_function}
                    onChange={(e) => setFormData({ ...formData, company_function: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
                    placeholder="Contoh: Production Equipment Maintenance"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Penugasan Plant</label>
                  <select
                    value={formData.plant_id}
                    onChange={(e) => setFormData({ ...formData, plant_id: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white cursor-pointer"
                  >
                    <option value="all">Semua Plant (Cross-Plant NA-2, NA-3, NA-4)</option>
                    <option value="plant-na2">Plant NA-2 (AION)</option>
                    <option value="plant-na3">Plant NA-3 (Changan & Leap Motor)</option>
                    <option value="plant-na4">Plant NA-4 (Commercial)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Atasan Langsung (Reports To)</label>
                  <select
                    value={formData.reporting_to_id}
                    onChange={(e) => setFormData({ ...formData, reporting_to_id: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white cursor-pointer"
                  >
                    <option value="">-- Tidak Ada / Pucuk Pimpinan --</option>
                    {users
                      .filter((u) => !editingUser || u.id !== editingUser.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          L{u.hierarchy_level || 3} • {u.name} ({u.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Decision Authority Checkboxes */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <span className="font-extrabold text-slate-900 block text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Wewenang Keputusan &amp; Lembar Otorisasi di Sistem:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.can_prepare}
                      onChange={(e) => setFormData({ ...formData, can_prepare: e.target.checked })}
                      className="rounded text-blue-600 w-4 h-4"
                    />
                    <div>
                      <strong className="block text-slate-800 text-[11px]">Prepared by (Pelapor)</strong>
                      <span className="text-[10px] text-slate-500">Menyusun laporan teknis 5W &amp; evidence</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.can_verify}
                      onChange={(e) => setFormData({ ...formData, can_verify: e.target.checked })}
                      className="rounded text-emerald-600 w-4 h-4"
                    />
                    <div>
                      <strong className="block text-slate-800 text-[11px]">Verified by (Pemeriksa)</strong>
                      <span className="text-[10px] text-slate-500">Verifikasi lapangan &amp; uji serah terima</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.can_approve}
                      onChange={(e) => setFormData({ ...formData, can_approve: e.target.checked })}
                      className="rounded text-blue-600 w-4 h-4"
                    />
                    <div>
                      <strong className="block text-slate-800 text-[11px]">Approved by (Penyetuju)</strong>
                      <span className="text-[10px] text-slate-500">Persetujuan WO, CAPA, &amp; rilis mesin</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formData.can_acknowledge}
                      onChange={(e) => setFormData({ ...formData, can_acknowledge: e.target.checked })}
                      className="rounded text-purple-600 w-4 h-4"
                    />
                    <div>
                      <strong className="block text-slate-800 text-[11px]">Acknowledged by (Pengesah)</strong>
                      <span className="text-[10px] text-slate-500">Pengesahan akhir Plant Manager</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Mandatory Action Password Input */}
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
                <label className="font-extrabold text-blue-950 block text-xs flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-700" />
                  Password Otorisasi Sistem (Wajib) *
                </label>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  Untuk menambah personil baru atau merotasi susunan hierarki manajemen, masukkan kata sandi otorisasi sistem yang aktif.
                </p>
                <input
                  type="password"
                  required
                  value={formData.action_password}
                  onChange={(e) => setFormData({ ...formData, action_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full p-2.5 border border-blue-300 rounded-xl text-xs font-mono bg-white focus:outline-hidden focus:border-blue-600"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Memproses...' : (editingUser ? 'Simpan Perubahan Hirarki' : 'Daftarkan ke Manajemen')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <DeleteConfirmModal
          isOpen={Boolean(userToDelete)}
          title="Pensiunkan / Hapus Anggota Tim Manajemen"
          itemName={userToDelete.name}
          itemType="Akun Manajemen Perusahaan"
          warningText="Penghapusan atau pemensiunan anggota tim manajemen ini akan melepaskan hak otorisasi keputusan pada sistem. Aksi ini memerlukan kata sandi otorisasi sistem."
          isDeleting={isDeleting}
          onConfirm={(pwd) => handleDeleteUser(pwd)}
          onCancel={() => setUserToDelete(null)}
        />
      )}

      {/* Universal Change System Password Modal */}
      <ChangeSystemPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={(msg) => {
          setToastMessage({ type: 'success', text: msg });
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />
    </div>
  );
};

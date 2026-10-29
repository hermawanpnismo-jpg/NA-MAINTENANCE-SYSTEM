import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header.tsx';
import { Sidebar, ModuleKey } from './components/layout/Sidebar.tsx';
import { DashboardView } from './components/views/DashboardView.tsx';
import { AssetManagementView } from './components/views/AssetManagementView.tsx';
import { PreventiveMaintenanceView } from './components/views/PreventiveMaintenanceView.tsx';
import { CorrectiveMaintenanceView } from './components/views/CorrectiveMaintenanceView.tsx';
import { BreakdownManagementView } from './components/views/BreakdownManagementView.tsx';
import { WorkOrderManagementView } from './components/views/WorkOrderManagementView.tsx';
import { SparePartsInventoryView } from './components/views/SparePartsInventoryView.tsx';
import { TechnicianManagementView } from './components/views/TechnicianManagementView.tsx';
import { BuildingFacilityView } from './components/views/BuildingFacilityView.tsx';
import { UtilityManagementView } from './components/views/UtilityManagementView.tsx';
import { ChecklistsView } from './components/views/ChecklistsView.tsx';
import { MaintenanceCostBudgetView } from './components/views/MaintenanceCostBudgetView.tsx';
import { ProcurementTrackingView } from './components/views/ProcurementTrackingView.tsx';
import { DocumentManagementView } from './components/views/DocumentManagementView.tsx';
import { ReportsAnalyticsView } from './components/views/ReportsAnalyticsView.tsx';
import { MasterDataView } from './components/views/MasterDataView.tsx';
import { UserAuditTrailView } from './components/views/UserAuditTrailView.tsx';
import { UserHierarchyManagementView } from './components/views/UserHierarchyManagementView.tsx';
import { SystemSettingsView } from './components/views/SystemSettingsView.tsx';
import { VendorsView } from './components/views/VendorsView.tsx';
import { Plant, AuthUser } from './types/index.ts';
import { api } from './lib/api.ts';
import {
  auth,
  testConnection,
  signInWithGoogle,
  logOut,
  onAuthStateChanged,
  type FirebaseUser
} from './lib/firebase.ts';
import { realtime, RealtimeEventPayload } from './lib/realtime.ts';
import { LoginView } from './components/auth/LoginView.tsx';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState('all');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState('Maintenance Leader - All Plant (Hermawan Prasetyo)');
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [liveToast, setLiveToast] = useState<{ message: string; timestamp: string } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Authenticated user session gating
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('na_mms_user_profile');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return null;
  });

  const fetchPlants = async () => {
    try {
      setIsRefreshing(true);
      setInitError(null);
      const master = await api.getMasterData();
      setPlants(master.plants || []);
      const now = new Date();
      setLastRefreshTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
    } catch (err: any) {
      console.error('Failed to load plants:', err);
      setInitError(err.message || 'Gagal memuat data sistem');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlants();
    // Test Firebase Firestore connection on boot
    testConnection();

    // Subscribe to Firebase auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user?.email) {
        if (!authenticatedUser) {
          const defaultAuth: AuthUser = {
            id: user.uid,
            employee_id: 'NA-EMP-002-G',
            name: user.displayName || user.email,
            email: user.email,
            role: user.email === 'HermawanP32@gmail.com' ? 'Maintenance Leader - All Plant' : 'System Administrator',
            department: 'Maintenance Department',
            plant_id: 'plant-na2',
            status: 'Active',
            photoURL: user.photoURL || undefined
          };
          setAuthenticatedUser(defaultAuth);
          setCurrentUserRole(defaultAuth.role);
          localStorage.setItem('na_mms_user_profile', JSON.stringify(defaultAuth));
        }
      }
    });

    // Subscribe to Global Real-Time Event Stream across ALL PCs
    // Silently updates data in the background WITHOUT unmounting or flickering views
    const unsubscribeRealtime = realtime.subscribe((event: RealtimeEventPayload) => {
      const now = new Date();
      setLastRefreshTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );

      // Show subtle real-time change toast only on meaningful user actions
      if (event.action && event.entity && event.action !== 'manual_refresh' && event.type !== 'ping') {
        const actionLabel =
          event.action === 'CREATE' ? 'dibuat' :
          event.action === 'UPDATE' ? 'diperbarui' :
          event.action === 'UPDATE_STATUS' ? 'status diperbarui' :
          event.action === 'DELETE' ? 'dihapus' :
          event.action === 'STOCK_ISSUE' ? 'pengeluaran suku cadang' : event.action;

        setLiveToast({
          message: `${event.entity} baru saja ${actionLabel} oleh ${event.user || 'Sistem'}. Data diperbarui otomatis.`,
          timestamp: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        });

        setTimeout(() => {
          setLiveToast(null);
        }, 3500);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRealtime();
    };
  }, []);

  const handleManualRefresh = () => {
    fetchPlants();
    realtime.triggerSync('all', 'manual_refresh');
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Firebase Sign-In Error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      handleLogout();
    } catch (err) {
      console.error('Firebase Sign-Out Error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('na_mms_session_token');
    localStorage.removeItem('na_mms_user_profile');
    setAuthenticatedUser(null);
  };

  // Security Login Gateway: If not authenticated, render LoginView
  if (!authenticatedUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setAuthenticatedUser(user);
          setCurrentUserRole(user.role);
          if (user.plant_id && user.plant_id !== 'all') {
            setSelectedPlant(user.plant_id);
          }
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(mod) => setActiveModule(mod)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          plants={plants}
          selectedPlant={selectedPlant}
          onPlantChange={(p) => setSelectedPlant(p)}
          currentUserRole={currentUserRole}
          onRoleChange={(r) => setCurrentUserRole(r)}
          lastRefreshTime={lastRefreshTime}
          onManualRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          firebaseUser={firebaseUser}
          authenticatedUser={authenticatedUser}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onLogout={handleLogout}
        />

        {initError && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs flex items-center justify-between z-10">
            <span className="font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              {initError}
            </span>
            <button
              onClick={handleManualRefresh}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        )}

        {/* View Content Viewport - No key remount so scroll position is preserved and no flicker occurs */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {activeModule === 'dashboard' && (
            <DashboardView
              selectedPlant={selectedPlant}
              plants={plants}
              onNavigate={(mod) => setActiveModule(mod)}
              onPlantChange={(p) => setSelectedPlant(p)}
            />
          )}

          {activeModule === 'assets' && (
            <AssetManagementView selectedPlant={selectedPlant} plants={plants} />
          )}

          {activeModule === 'preventive' && (
            <PreventiveMaintenanceView
              selectedPlant={selectedPlant}
              plants={plants}
              onNavigateToWorkOrders={() => setActiveModule('work_orders')}
            />
          )}

          {activeModule === 'corrective' && (
            <CorrectiveMaintenanceView selectedPlant={selectedPlant} plants={plants} />
          )}

          {activeModule === 'breakdown' && (
            <BreakdownManagementView
              selectedPlant={selectedPlant}
              plants={plants}
              onNavigateToWorkOrders={() => setActiveModule('work_orders')}
            />
          )}

          {activeModule === 'work_orders' && (
            <WorkOrderManagementView selectedPlant={selectedPlant} plants={plants} />
          )}

          {activeModule === 'spare_parts' && <SparePartsInventoryView />}

          {activeModule === 'technicians' && (
            <TechnicianManagementView selectedPlant={selectedPlant} plants={plants} />
          )}

          {activeModule === 'vendors' && <VendorsView />}

          {activeModule === 'facility' && (
            <BuildingFacilityView selectedPlant={selectedPlant} plants={plants} />
          )}

          {activeModule === 'utilities' && (
            <UtilityManagementView selectedPlant={selectedPlant} plants={plants} />
          )}

          {activeModule === 'checklists' && <ChecklistsView />}

          {activeModule === 'budget' && (
            <MaintenanceCostBudgetView selectedPlant={selectedPlant} plants={plants} />
          )}

          {activeModule === 'procurement' && (
            <ProcurementTrackingView selectedPlant={selectedPlant} plants={plants} />
          )}

          {activeModule === 'documents' && (
            <DocumentManagementView selectedPlant={selectedPlant} plants={plants} />
          )}

          {activeModule === 'reports' && (
            <ReportsAnalyticsView selectedPlant={selectedPlant} plants={plants} />
          )}

          {activeModule === 'master_data' && <MasterDataView />}

          {activeModule === 'hierarchy' && <UserHierarchyManagementView />}

          {activeModule === 'audit' && <UserAuditTrailView />}

          {activeModule === 'settings' && <SystemSettingsView />}
        </main>

        {/* Global Floating Realtime Sync Toast */}
        {liveToast && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900/95 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 transition-all animate-bounce-subtle">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div className="text-xs pr-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider">
                  Realtime Online Sync
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{liveToast.timestamp}</span>
              </div>
              <p className="text-slate-200 text-xs mt-0.5 max-w-sm">
                {liveToast.message}
              </p>
            </div>
            <button
              onClick={() => setLiveToast(null)}
              className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

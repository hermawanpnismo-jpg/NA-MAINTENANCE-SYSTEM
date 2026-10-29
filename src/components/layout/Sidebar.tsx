import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  CalendarClock,
  Wrench,
  AlertOctagon,
  ClipboardList,
  Boxes,
  Users,
  Building2,
  Building,
  Gauge,
  CheckSquare,
  BadgeDollarSign,
  ShoppingCart,
  FileText,
  BarChart3,
  Database,
  History,
  Settings,
  Network,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type ModuleKey =
  | 'dashboard'
  | 'assets'
  | 'preventive'
  | 'corrective'
  | 'breakdown'
  | 'work_orders'
  | 'spare_parts'
  | 'technicians'
  | 'vendors'
  | 'facility'
  | 'utilities'
  | 'checklists'
  | 'budget'
  | 'procurement'
  | 'documents'
  | 'reports'
  | 'master_data'
  | 'hierarchy'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  badge?: string;
}

const navItems: NavItem[] = [
  // SECTION 1: Core Maintenance
  { key: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, section: 'OPERATIONS' },
  { key: 'assets', label: 'Asset & Equipment', icon: Cpu, section: 'OPERATIONS' },
  { key: 'preventive', label: 'Preventive Maintenance', icon: CalendarClock, section: 'OPERATIONS' },
  { key: 'corrective', label: 'Corrective Maintenance', icon: Wrench, section: 'OPERATIONS' },
  { key: 'breakdown', label: 'Breakdown Management', icon: AlertOctagon, section: 'OPERATIONS' },
  { key: 'work_orders', label: 'Work Orders', icon: ClipboardList, section: 'OPERATIONS' },

  // SECTION 2: Resources & Inventory
  { key: 'spare_parts', label: 'Spare Parts & Inventory', icon: Boxes, section: 'INVENTORY & RESOURCES' },
  { key: 'technicians', label: 'Manpower & Techs', icon: Users, section: 'INVENTORY & RESOURCES' },
  { key: 'vendors', label: 'Vendors & Contractors', icon: Building2, section: 'INVENTORY & RESOURCES' },
  { key: 'procurement', label: 'Purchase Requests', icon: ShoppingCart, section: 'INVENTORY & RESOURCES' },

  // SECTION 3: Facilities & Utilities
  { key: 'facility', label: 'Building & Facilities', icon: Building, section: 'FACILITY & UTILITY' },
  { key: 'utilities', label: 'Utility Management', icon: Gauge, section: 'FACILITY & UTILITY' },
  { key: 'checklists', label: 'Inspection Checklists', icon: CheckSquare, section: 'FACILITY & UTILITY' },

  // SECTION 4: Cost & Governance
  { key: 'budget', label: 'Budget & Cost Control', icon: BadgeDollarSign, section: 'FINANCE & GOVERNANCE' },
  { key: 'documents', label: 'Document Center', icon: FileText, section: 'FINANCE & GOVERNANCE' },
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, section: 'FINANCE & GOVERNANCE' },
  { key: 'master_data', label: 'Master Data', icon: Database, section: 'FINANCE & GOVERNANCE' },
  { key: 'hierarchy', label: 'User & Hirarki Manajemen', icon: Network, section: 'FINANCE & GOVERNANCE' },
  { key: 'audit', label: 'Audit Trail & Users', icon: History, section: 'FINANCE & GOVERNANCE' },
  { key: 'settings', label: 'System Settings', icon: Settings, section: 'FINANCE & GOVERNANCE' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  collapsed,
  onToggleCollapse,
}) => {
  const sections = Array.from(new Set(navItems.map((item) => item.section)));

  return (
    <aside
      className={`h-screen bg-[#0A192F] text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-200 select-none shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0">
              NA
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-white tracking-wider block">
                NATIONAL ASSEMBLERS
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                CMMS v4.2 PROD
              </span>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors mx-auto"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {sections.map((sec) => (
          <div key={sec} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {sec}
              </p>
            )}
            {navItems
              .filter((item) => item.section === sec)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectModule(item.key)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!collapsed && (
                      <span className="truncate text-left flex-1 whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>PT NA · MMS</span>
          <span className="font-mono text-[10px] text-emerald-400">Online</span>
        </div>
      )}
    </aside>
  );
};

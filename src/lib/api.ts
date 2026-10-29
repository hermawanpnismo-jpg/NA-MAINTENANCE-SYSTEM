import {
  Plant, Building, Department, ProductionLine, AssetCategory,
  Asset, PMTask, Breakdown, WorkOrder, SparePart, InventoryTransaction,
  Technician, Vendor, FacilityInspection, UtilityMeter, UtilityReading, UtilityTask,
  MaintenanceBudget, PurchaseRequest, DocumentItem, AuditLog, User, DashboardKPIs,
  OperationEvidence, EvidenceType, AuthUser, SignoffAuthorities
} from '../types/index.ts';

const API_BASE = '/api';

let activeDeletePassword = 'Nackp2026';

export function setActionDeletePassword(pwd: string) {
  if (pwd) activeDeletePassword = pwd;
}

/**
 * Robust JSON fetch wrapper with retry support and protection against HTML / 502 error responses
 */
async function requestJson<T = any>(
  path: string,
  options?: RequestInit,
  retries = 2
): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : path.startsWith('/api')
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const finalOptions: RequestInit = { ...options };
  if (finalOptions.method === 'DELETE') {
    finalOptions.headers = {
      ...finalOptions.headers,
      'x-delete-password': activeDeletePassword || 'Nackp2026'
    };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, finalOptions);
      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        let errorMessage = `Request failed (${res.status} ${res.statusText})`;
        if (contentType.includes('application/json')) {
          try {
            const errJson = await res.json();
            errorMessage = errJson.error || errJson.message || errorMessage;
          } catch {
            // Ignore parse error
          }
        } else {
          const text = await res.text();
          if (text.includes('<!doctype') || text.includes('<!DOCTYPE') || text.includes('<html')) {
            errorMessage = `Layanan server sedang memuat ulang (${res.status}). Silakan coba beberapa saat lagi.`;
          } else if (text.trim()) {
            errorMessage = text.slice(0, 200);
          }
        }

        // Retry if 502/503/504 Bad Gateway (e.g. dev server starting up)
        if ((res.status >= 502 && res.status <= 504) && attempt < retries) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }

        throw new Error(errorMessage);
      }

      // 2xx response check
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        if (text.includes('<!doctype') || text.includes('<!DOCTYPE') || text.includes('<html')) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
            continue;
          }
          throw new Error('Respons server tidak valid (menerima HTML bukan JSON). Server mungkin sedang di-restart.');
        }
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new Error('Gagal memproses data JSON dari server.');
        }
      }

      return (await res.json()) as T;
    } catch (err: any) {
      if (
        attempt < retries &&
        (err.name === 'TypeError' ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('sedang memuat ulang'))
      ) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Gagal menghubungi server setelah beberapa percobaan');
}

export const api = {
  // Dashboard
  async getDashboardKPIs(plant?: string, dept?: string): Promise<DashboardKPIs> {
    const params = new URLSearchParams();
    if (plant) params.set('plant', plant);
    if (dept) params.set('department', dept);
    const q = params.toString();
    return requestJson<DashboardKPIs>(`/dashboard/kpis${q ? `?${q}` : ''}`);
  },

  async getDashboardCharts(plant?: string): Promise<any> {
    const params = new URLSearchParams();
    if (plant) params.set('plant', plant);
    const q = params.toString();
    return requestJson(`/dashboard/charts${q ? `?${q}` : ''}`);
  },

  // Authentication & Security Login
  async login(identifier: string, password: string): Promise<{ success: boolean; token: string; user: any; message: string }> {
    return requestJson('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
  },

  async firebaseSync(data: { email: string; displayName?: string | null; photoURL?: string | null }): Promise<{ success: boolean; token: string; user: any }> {
    return requestJson('/auth/firebase-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Master Data
  async getMasterData(): Promise<{
    companies: any[];
    plants: Plant[];
    buildings: Building[];
    departments: Department[];
    productionLines: ProductionLine[];
    assetCategories: AssetCategory[];
  }> {
    return requestJson('/master-data');
  },

  async createPlant(data: { code: string; name: string; location: string; company_id?: string; user_name: string }): Promise<any> {
    return requestJson('/master-data/plants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updatePlant(id: string, data: { name: string; location: string; is_active?: number; user_name: string }): Promise<any> {
    return requestJson(`/master-data/plants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async createAssetCategory(data: { code: string; name: string; description?: string; user_name: string }): Promise<any> {
    return requestJson('/master-data/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateAssetCategory(id: string, data: { code?: string; name?: string; description?: string; user_name: string }): Promise<any> {
    return requestJson(`/master-data/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Assets
  async getAssets(params?: { plant?: string; category?: string; status?: string; search?: string }): Promise<Asset[]> {
    const q = new URLSearchParams();
    if (params?.plant) q.set('plant', params.plant);
    if (params?.category) q.set('category', params.category);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return requestJson<Asset[]>(`/assets${qs ? `?${qs}` : ''}`);
  },

  async getAssetDetail(id: string): Promise<{
    asset: Asset;
    workOrders: WorkOrder[];
    breakdowns: Breakdown[];
    pmTasks: PMTask[];
    totalMaintenanceCost: number;
  }> {
    return requestJson(`/assets/${id}`);
  },

  async createAsset(data: Partial<Asset> & { user_name: string }): Promise<any> {
    return requestJson('/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateAsset(id: string, data: Partial<Asset> & { user_name: string }): Promise<any> {
    return requestJson(`/assets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Preventive Maintenance
  async getPMTasks(params?: { plant?: string; status?: string }): Promise<PMTask[]> {
    const q = new URLSearchParams();
    if (params?.plant) q.set('plant', params.plant);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return requestJson<PMTask[]>(`/pm-tasks${qs ? `?${qs}` : ''}`);
  },

  async createPMTask(data: any): Promise<any> {
    return requestJson('/pm-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async completePMTask(id: string, data: { checklist_results: string; abnormalities?: string; supervisor_verification: string; notes?: string; user_name: string }): Promise<any> {
    return requestJson(`/pm-tasks/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updatePMTask(id: string, data: any): Promise<any> {
    return requestJson(`/pm-tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async assignTechniciansToPMTask(id: string, data: { assigned_tech_id?: string | null; supporting_tech_ids?: string[]; supporting_manpower?: string; user_name?: string }): Promise<any> {
    return requestJson(`/pm-tasks/${id}/assign-technicians`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async recordPMTaskOverdue(id: string, data: {
    overdue_reason: string;
    overdue_action_plan?: string;
    overdue_revised_due_date?: string;
    overdue_risk_level?: string;
    user_name?: string;
  }): Promise<any> {
    return requestJson(`/pm-tasks/${id}/overdue-record`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async createWorkOrderFromPM(id: string, data: { problem_description?: string; priority?: string; user_name: string }): Promise<any> {
    return requestJson(`/pm-tasks/${id}/create-work-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Breakdowns
  async getBreakdowns(params?: { plant?: string; status?: string; priority?: string }): Promise<Breakdown[]> {
    const q = new URLSearchParams();
    if (params?.plant) q.set('plant', params.plant);
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    const qs = q.toString();
    return requestJson<Breakdown[]>(`/breakdowns${qs ? `?${qs}` : ''}`);
  },

  async getBreakdownDetail(id: string): Promise<{ breakdown: Breakdown; evidences: OperationEvidence[]; linked_work_order?: any; parts?: any[] }> {
    return requestJson(`/breakdowns/${id}`);
  },

  async createBreakdown(data: any): Promise<any> {
    return requestJson('/breakdowns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateBreakdown(id: string, data: any): Promise<any> {
    return requestJson(`/breakdowns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async assignTechniciansToBreakdown(id: string, data: { assigned_tech_id?: string | null; supporting_tech_ids?: string[]; supporting_manpower?: string; user_name?: string }): Promise<any> {
    return requestJson(`/breakdowns/${id}/assign-technicians`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async createWorkOrderFromBreakdown(id: string, data: { user_name: string }): Promise<any> {
    return requestJson(`/breakdowns/${id}/create-work-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Work Orders
  async getWorkOrders(params?: { plant?: string; status?: string; type?: string }): Promise<WorkOrder[]> {
    const q = new URLSearchParams();
    if (params?.plant) q.set('plant', params.plant);
    if (params?.status) q.set('status', params.status);
    if (params?.type) q.set('type', params.type);
    const qs = q.toString();
    return requestJson<WorkOrder[]>(`/work-orders${qs ? `?${qs}` : ''}`);
  },

  async getWorkOrderDetail(id: string): Promise<{ workOrder: WorkOrder; parts: any[]; labor: any[]; evidences: OperationEvidence[] }> {
    return requestJson(`/work-orders/${id}`);
  },

  async createWorkOrder(data: any): Promise<any> {
    return requestJson('/work-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateWorkOrder(id: string, data: any): Promise<any> {
    return requestJson(`/work-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async assignTechniciansToWorkOrder(id: string, data: { assigned_tech_id?: string | null; supporting_tech_ids?: string[]; supporting_manpower?: string; user_name?: string }): Promise<any> {
    return requestJson(`/work-orders/${id}/assign-technicians`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateWorkOrderStatus(id: string, status: string, userName?: string, notes?: string): Promise<any> {
    return requestJson(`/work-orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, user_name: userName || 'Maintenance Supervisor', notes }),
    });
  },

  async issuePartToWorkOrder(id: string, data: { part_id: string; quantity: number; user_name: string }): Promise<any> {
    return requestJson(`/work-orders/${id}/issue-part`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async addLaborToWorkOrder(id: string, data: { technician_id: string; hours: number; hourly_rate?: number; notes?: string; user_name: string }): Promise<any> {
    return requestJson(`/work-orders/${id}/add-labor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Spare Parts & Inventory
  async getSpareParts(params?: { category?: string; search?: string }): Promise<SparePart[]> {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return requestJson<SparePart[]>(`/spare-parts${qs ? `?${qs}` : ''}`);
  },

  async createSparePart(data: any): Promise<any> {
    return requestJson('/spare-parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async recordPartTransaction(data: any): Promise<any> {
    return requestJson('/spare-parts/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getInventoryTransactions(): Promise<InventoryTransaction[]> {
    return requestJson<InventoryTransaction[]>('/inventory-transactions');
  },

  // Technicians
  async getTechnicians(): Promise<Technician[]> {
    return requestJson<Technician[]>('/technicians');
  },

  async createTechnician(data: any): Promise<any> {
    return requestJson('/technicians', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return requestJson<Vendor[]>('/vendors');
  },

  async createVendor(data: any): Promise<any> {
    return requestJson('/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Facility & Utility
  async getFacilityInspections(plant?: string): Promise<FacilityInspection[]> {
    const q = plant ? `?plant=${encodeURIComponent(plant)}` : '';
    return requestJson<FacilityInspection[]>(`/facility-inspections${q}`);
  },

  async createFacilityInspection(data: any): Promise<any> {
    return requestJson('/facility-inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateFacilityInspectionStatus(
    id: string,
    status: 'Open' | 'In Progress' | 'Completed',
    options?: { completion_notes?: string; corrective_action?: string; assigned_tech_id?: string; user_name?: string }
  ): Promise<any> {
    return requestJson(`/facility-inspections/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...options }),
    });
  },

  async updateFacilityInspection(id: string, data: any): Promise<any> {
    return requestJson(`/facility-inspections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getFacilityInspection(id: string): Promise<any> {
    return requestJson(`/facility-inspections/${id}`);
  },

  async updateFacilityInspectionAnalysis(id: string, data: any): Promise<any> {
    return requestJson(`/facility-inspections/${id}/analysis`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async recordFacilityInspectionOverdue(id: string, data: {
    overdue_reason: string;
    overdue_action_plan: string;
    overdue_revised_due_date?: string;
    overdue_risk_level?: string;
    user_name?: string;
  }): Promise<any> {
    return requestJson(`/facility-inspections/${id}/overdue-record`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateFacilityInspectionManpower(id: string, data: {
    assigned_tech_id?: string;
    supporting_tech_ids?: string[];
    user_name?: string;
  }): Promise<any> {
    return requestJson(`/facility-inspections/${id}/manpower`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Utility Tasks & Maintenance
  async getUtilityTasks(params?: { plant?: string; status?: string; utility_type?: string; search?: string }): Promise<UtilityTask[]> {
    const q = new URLSearchParams();
    if (params?.plant) q.set('plant', params.plant);
    if (params?.status) q.set('status', params.status);
    if (params?.utility_type) q.set('utility_type', params.utility_type);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return requestJson<UtilityTask[]>(`/utility-tasks${qs ? `?${qs}` : ''}`);
  },

  async createUtilityTask(data: any): Promise<any> {
    return requestJson('/utility-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateUtilityTaskStatus(
    id: string,
    status: 'Open' | 'In Progress' | 'Completed',
    options?: { completion_notes?: string; user_name?: string }
  ): Promise<any> {
    return requestJson(`/utility-tasks/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...options }),
    });
  },

  async updateUtilityTask(id: string, data: any): Promise<any> {
    return requestJson(`/utility-tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteUtilityTask(id: string, userName = 'Utility Officer'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/utility-tasks/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async getUtilityMeters(plant?: string): Promise<UtilityMeter[]> {
    const q = plant ? `?plant=${encodeURIComponent(plant)}` : '';
    return requestJson<UtilityMeter[]>(`/utility-meters${q}`);
  },

  async getUtilityReadings(): Promise<UtilityReading[]> {
    return requestJson<UtilityReading[]>('/utility-readings');
  },

  async createUtilityReading(data: any): Promise<any> {
    return requestJson('/utility-readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateUtilityReadingStatus(id: string, status: 'Open' | 'In Progress' | 'Completed', userName = 'Utility Officer'): Promise<any> {
    return requestJson(`/utility-readings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, user_name: userName }),
    });
  },

  // Budget & Procurement
  async getMaintenanceBudgets(): Promise<MaintenanceBudget[]> {
    return requestJson<MaintenanceBudget[]>('/maintenance-budgets');
  },

  async getPurchaseRequests(): Promise<PurchaseRequest[]> {
    return requestJson<PurchaseRequest[]>('/purchase-requests');
  },

  async createPurchaseRequest(data: any): Promise<any> {
    return requestJson('/purchase-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Documents
  async getDocuments(): Promise<DocumentItem[]> {
    return requestJson<DocumentItem[]>('/documents');
  },

  async createDocument(data: any): Promise<any> {
    return requestJson('/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Users, Roles, Audit, Settings
  async getUsers(): Promise<User[]> {
    return requestJson<User[]>('/users');
  },

  async getManagementSignoffs(): Promise<SignoffAuthorities> {
    return requestJson<SignoffAuthorities>('/management-decisions/signoffs');
  },

  async createUser(userData: {
    employee_id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    plant_id?: string;
    password?: string;
    action_password: string;
    user_name?: string;
    hierarchy_level?: number;
    company_function?: string;
    job_title?: string;
    can_prepare?: number | boolean;
    can_verify?: number | boolean;
    can_approve?: number | boolean;
    can_acknowledge?: number | boolean;
    reporting_to_id?: string | null;
  }): Promise<any> {
    return requestJson('/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-action-password': userData.action_password,
      },
      body: JSON.stringify(userData),
    });
  },

  async updateUser(id: string, userData: Partial<User> & { action_password: string; user_name?: string }): Promise<any> {
    return requestJson(`/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-action-password': userData.action_password,
      },
      body: JSON.stringify(userData),
    });
  },

  async getRoles(): Promise<any[]> {
    return requestJson<any[]>('/roles');
  },

  async createRole(roleData: {
    name: string;
    description?: string;
    department?: string;
    action_password: string;
    user_name?: string;
  }): Promise<any> {
    return requestJson('/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-action-password': roleData.action_password,
      },
      body: JSON.stringify(roleData),
    });
  },

  async deleteRole(id: string, actionPassword = 'Nackp2026', userName = 'Administrator'): Promise<any> {
    return requestJson(`/roles/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-action-password': actionPassword,
      },
      body: JSON.stringify({ action_password: actionPassword, user_name: userName }),
    });
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return requestJson<AuditLog[]>('/audit-logs');
  },

  async getSystemSettings(): Promise<Record<string, string>> {
    return requestJson<Record<string, string>>('/system-settings');
  },

  async updateSystemSettings(settings: Record<string, string>, user_name: string): Promise<any> {
    return requestJson('/system-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, user_name }),
    });
  },

  // ==========================================
  // DELETE API METHODS
  // ==========================================
  async deleteAsset(id: string, userName = 'Admin User'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/assets/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deletePMTask(id: string, userName = 'Supervisor'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/pm-tasks/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteBreakdown(id: string, userName = 'Supervisor'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/breakdowns/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteWorkOrder(id: string, userName = 'Manager'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/work-orders/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteSparePart(id: string, userName = 'Storekeeper'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/spare-parts/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteTechnician(id: string, userName = 'Manager'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/technicians/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteVendor(id: string, userName = 'Procurement'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/vendors/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deletePurchaseRequest(id: string, userName = 'Procurement'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/purchase-requests/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteFacilityInspection(id: string, userName = 'Facility Officer'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/facility-inspections/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteUtilityReading(id: string, userName = 'Utility Officer'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/utility-readings/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteUtilityMeter(id: string, userName = 'Utility Officer'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/utility-meters/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteMaintenanceBudget(id: string, userName = 'Finance Officer'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/maintenance-budgets/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteDocument(id: string, userName = 'Document Controller'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/documents/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deletePlant(id: string, userName = 'Administrator'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/master-data/plants/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteDepartment(id: string, userName = 'Administrator'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/master-data/departments/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteProductionLine(id: string, userName = 'Administrator'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/master-data/lines/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteAssetCategory(id: string, userName = 'Administrator'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/master-data/categories/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async deleteUser(id: string, userName = 'Administrator', actionPassword = 'Nackp2026'): Promise<{ success: boolean; message: string }> {
    return requestJson<{ success: boolean; message: string }>(`/users/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-action-password': actionPassword,
      },
      body: JSON.stringify({ action_password: actionPassword, user_name: userName }),
    });
  },

  // Operation Activity Evidences & Photos
  async getEvidences(params?: {
    activity_type?: string;
    activity_id?: string;
    evidence_type?: string;
    search?: string;
    limit?: number;
  }): Promise<OperationEvidence[]> {
    const q = new URLSearchParams();
    if (params?.activity_type) q.set('activity_type', params.activity_type);
    if (params?.activity_id) q.set('activity_id', params.activity_id);
    if (params?.evidence_type) q.set('evidence_type', params.evidence_type);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return requestJson<OperationEvidence[]>(`/evidences${qs ? `?${qs}` : ''}`);
  },

  async getEvidenceStats(): Promise<{
    total: number;
    byType: { evidence_type: string; count: number }[];
    byActivity: { activity_type: string; count: number }[];
    recent: OperationEvidence[];
  }> {
    return requestJson('/evidences/stats');
  },

  async uploadEvidence(data: {
    activity_type: 'work_order' | 'breakdown' | 'pm_task' | 'facility_inspection';
    activity_id: string;
    activity_code?: string;
    evidence_type: EvidenceType;
    title: string;
    description?: string;
    file_data: string;
    file_name: string;
    file_size?: string;
    file_size_label?: string;
    uploaded_by: string;
  }): Promise<{ success: boolean; evidence: OperationEvidence }> {
    return requestJson('/evidences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        file_size: data.file_size || data.file_size_label || '0 KB',
      }),
    });
  },

  async createEvidence(data: any): Promise<any> {
    return this.uploadEvidence(data);
  },

  async deleteEvidence(id: string, userName = 'Technician'): Promise<{ success: boolean; message?: string }> {
    return requestJson(`/evidences/${id}?user_name=${encodeURIComponent(userName)}`, {
      method: 'DELETE',
    });
  },

  async testCloudflareR2(config: {
    account_id?: string;
    bucket_name?: string;
    access_key_id?: string;
    secret_access_key?: string;
    public_url?: string;
  }): Promise<{ success: boolean; message: string }> {
    return requestJson('/storage/test-cloudflare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  },

  async verifyActionPassword(password: string): Promise<{ valid: boolean; error?: string; authorizedBy?: string }> {
    return requestJson('/auth/verify-action-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  },

  // Database Backup, Export & Storage to PC Hard Disk
  async getDatabaseStats(): Promise<{
    db_file: string;
    size_kb: number;
    size_formatted: string;
    last_modified: string;
    table_counts: Record<string, number>;
  }> {
    return requestJson('/database/stats');
  },

  async getSystemPasswordMeta(): Promise<{ isCustom: boolean; lastUpdated: string | null; updatedBy: string | null }> {
    return requestJson('/system/password-meta');
  },

  async changeSystemPassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    user_name?: string;
  }): Promise<{ success: boolean; message: string; lastUpdated: string }> {
    const res = await requestJson<{ success: boolean; message: string; lastUpdated: string }>('/system/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.success && data.newPassword) {
      setActionDeletePassword(data.newPassword);
    }
    return res;
  },

  getSqliteBackupUrl(): string {
    return '/api/database/backup-sqlite';
  },

  getJsonBackupUrl(): string {
    return '/api/database/backup-json';
  },

  getBreakdownExportUrl(id: string): string {
    return `/api/breakdowns/${id}/export-json`;
  },

  async restoreDatabaseJson(tables: any, userName = 'Admin'): Promise<{ success: boolean; restored_records: number; message: string }> {
    return requestJson('/database/restore-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tables, user_name: userName }),
    });
  }
};



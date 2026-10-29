export interface Plant {
  id: string;
  company_id: string;
  code: string;
  name: string;
  location: string;
  is_active: number;
}

export interface Building {
  id: string;
  plant_id: string;
  code: string;
  name: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  head_person: string;
  is_active: number;
}

export interface ProductionLine {
  id: string;
  plant_id: string;
  building_id?: string;
  code: string;
  name: string;
}

export interface AssetCategory {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  category_id: string;
  category_name?: string;
  company_id: string;
  plant_id: string;
  plant_name?: string;
  plant_code?: string;
  building_id?: string;
  building_name?: string;
  line_id?: string;
  line_name?: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  installation_date: string;
  commissioning_date: string;
  purchase_cost: number;
  warranty_end_date: string;
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  operating_status: 'Operational' | 'Under Maintenance' | 'Breakdown' | 'Standby' | 'Decommissioned';
  responsible_dept: string;
  assigned_tech_id?: string;
  tech_name?: string;
  maintenance_strategy: string;
  pm_frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Semiannual' | 'Annual';
  last_pm_date?: string;
  next_pm_date?: string;
  specs?: string;
  remarks?: string;
  created_at?: string;
}

export interface AssignedTechnicianInfo {
  id: string;
  name: string;
  role: 'Lead' | 'Support';
  skill_category?: string;
  employee_id?: string;
  shift?: string;
}

export type EvidenceType = 'before' | 'in_progress' | 'after' | 'damaged_part' | 'document';

export interface OperationEvidence {
  id: string;
  activity_type: 'work_order' | 'breakdown' | 'pm_task' | 'facility_inspection';
  activity_id: string;
  activity_code?: string;
  evidence_type: EvidenceType;
  title: string;
  description?: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: string;
  uploaded_by: string;
  created_at: string;
}

export interface PMTask {
  id: string;
  task_code: string;
  plan_id?: string;
  asset_id: string;
  asset_name?: string;
  asset_tag?: string;
  plant_id?: string;
  plant_name?: string;
  due_date: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  assigned_tech_id?: string;
  tech_name?: string;
  supporting_manpower?: string;
  assigned_technicians?: AssignedTechnicianInfo[];
  tech_names?: string;
  manpower_count?: number;
  status: 'Scheduled' | 'Due Soon' | 'Due Today' | 'Overdue' | 'In Progress' | 'Completed' | 'Cancelled';
  checklist_results?: string;
  abnormalities?: string;
  supervisor_verification?: string;
  notes?: string;
  completed_at?: string;
  evidence_count?: number;
  overdue_reason?: string;
  overdue_action_plan?: string;
  overdue_revised_due_date?: string;
  overdue_recorded_by?: string;
  overdue_recorded_at?: string;
  overdue_risk_level?: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface Breakdown {
  id: string;
  breakdown_number: string;
  report_datetime: string;
  company_id: string;
  plant_id: string;
  plant_name?: string;
  asset_id: string;
  asset_name?: string;
  asset_tag?: string;
  location?: string;
  category: 'Mechanical' | 'Electrical' | 'Pneumatic' | 'Hydraulic' | 'PLC/Software' | 'Operator Error';
  failure_description: string;
  machine_condition: string;
  production_impact: 'Line Stopped' | 'Speed Reduced' | 'Quality Issue' | 'No Impact';
  safety_impact: 'Critical' | 'Moderate' | 'Low' | 'None';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  reported_by: string;
  assigned_tech_id?: string;
  tech_name?: string;
  supporting_manpower?: string;
  assigned_technicians?: AssignedTechnicianInfo[];
  tech_names?: string;
  manpower_count?: number;
  initial_response_time?: string;
  repair_start_time?: string;
  repair_completion_time?: string;
  downtime_minutes: number;
  temporary_countermeasure?: string;
  root_cause?: string;
  five_why?: string;
  corrective_action?: string;
  preventive_action?: string;
  replacement_parts?: string;
  trial_run_result?: string;
  verified_by?: string;
  ishikawa_analysis?: string;
  authorization_signoff?: string;
  status: 'Reported' | 'Acknowledged' | 'Assigned' | 'In Progress' | 'Waiting for Spare Parts' | 'Waiting for Vendor' | 'Testing' | 'Completed' | 'Closed';
  work_order_id?: string;
  evidence_count?: number;
  asset_model?: string;
  manufacturer?: string;
  serial_number?: string;
  criticality?: string;
  responsible_dept?: string;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  request_date: string;
  requester: string;
  company_id: string;
  plant_id: string;
  plant_name?: string;
  location?: string;
  asset_id?: string;
  asset_name?: string;
  asset_tag?: string;
  asset_model?: string;
  wo_type: 'Preventive Maintenance' | 'Corrective Maintenance' | 'Emergency Breakdown' | 'Inspection' | 'Improvement / Kaizen' | 'Facility Repair' | 'Utility Maintenance';
  problem_description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  work_scope?: string;
  assigned_tech_id?: string;
  tech_name?: string;
  supporting_manpower?: string;
  assigned_technicians?: AssignedTechnicianInfo[];
  tech_names?: string;
  manpower_count?: number;
  planned_start?: string;
  planned_finish?: string;
  actual_start?: string;
  actual_finish?: string;
  labor_hours: number;
  estimated_cost: number;
  actual_cost: number;
  risk_assessment?: string;
  safety_precautions?: string;
  completion_notes?: string;
  verification_status: 'Pending Approval' | 'Approved' | 'Rejected';
  verified_by?: string;
  status: 'Open' | 'In Progress' | 'Waiting for Parts' | 'Testing' | 'Completed' | 'Closed' | 'Cancelled';
  linked_breakdown_id?: string;
  linked_pm_task_id?: string;
  evidence_count?: number;
  evidences?: OperationEvidence[];
}

export interface SparePart {
  id: string;
  part_number: string;
  name: string;
  specification?: string;
  category: string;
  compatible_equipment?: string;
  uom: string;
  warehouse_location: string;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  current_stock: number;
  reserved_stock: number;
  average_cost: number;
  preferred_vendor?: string;
  lead_time_days: number;
  last_purchase_date?: string;
}

export interface InventoryTransaction {
  id: string;
  transaction_code: string;
  part_id: string;
  part_number?: string;
  part_name?: string;
  uom?: string;
  transaction_type: string;
  reference_number?: string;
  work_order_id?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  balance_before: number;
  balance_after: number;
  performed_by: string;
  remarks?: string;
  transaction_date: string;
}

export interface Technician {
  id: string;
  employee_id: string;
  name: string;
  company_id: string;
  plant_id: string;
  plant_name?: string;
  department: string;
  skill_category: string;
  certifications?: string;
  shift: string;
  hourly_rate: number;
  is_available: number;
  supervisor?: string;
  active_wos?: number;
  completed_wos?: number;
}

export interface Vendor {
  id: string;
  vendor_code: string;
  name: string;
  service_category: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  contract_period?: string;
  rating: number;
  remarks?: string;
}

export interface AuthUser {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  plant_id: string;
  status: string;
  photoURL?: string;
}

export interface FacilityInspection {
  id: string;
  inspection_code: string;
  facility_category: string;
  plant_id: string;
  plant_name?: string;
  building_id?: string;
  building_name?: string;
  area_description: string;
  technical_condition: 'Normal / Good' | 'Minor Defect' | 'Requires Action' | 'Critical Hazard';
  findings: string;
  corrective_action?: string;
  inspector: string;
  inspection_date: string;
  due_date?: string;
  linked_work_order_id?: string;
  status: 'Open' | 'In Progress' | 'Completed';
  completed_at?: string;
  completion_notes?: string;
  assigned_tech_id?: string;
  assigned_tech_name?: string;
  evidence_count?: number;
  // Overdue tracking & justification
  is_overdue?: boolean | number;
  overdue_reason?: string;
  overdue_action_plan?: string;
  overdue_revised_due_date?: string;
  overdue_recorded_by?: string;
  overdue_recorded_at?: string;
  overdue_risk_level?: 'Low' | 'Medium' | 'High' | 'Critical';
  // Manpower Squad Assignment
  supporting_manpower?: string;
  assigned_technicians?: AssignedTechnicianInfo[];
  tech_names?: string;
  manpower_count?: number;
  // Authorization Sign-off
  reported_by?: string;
  verified_by?: string;
  approved_by?: string;
  acknowledged_by?: string;
  // Problem Analysis (Ishikawa 4M+1E)
  ishikawa_man?: string;
  ishikawa_machine?: string;
  ishikawa_method?: string;
  ishikawa_material?: string;
  ishikawa_environment?: string;
  // 5-Why Root Cause Analysis
  why1?: string;
  why2?: string;
  why3?: string;
  why4?: string;
  why5?: string;
  // Technical resolution
  trial_run_result?: string;
  downtime_minutes?: number;
  preventive_action?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_protected: number;
  created_at?: string;
}

export interface UtilityTask {
  id: string;
  task_code: string;
  plant_id: string;
  plant_name?: string;
  plant_code?: string;
  utility_type: string;
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assigned_tech_id?: string;
  tech_name?: string;
  tech_skill?: string;
  supporting_manpower?: string;
  assigned_technicians?: AssignedTechnicianInfo[];
  tech_names?: string;
  manpower_count?: number;
  due_date: string;
  status: 'Open' | 'In Progress' | 'Completed';
  completed_at?: string;
  completion_notes?: string;
  inspector?: string;
  evidence_count?: number;
  created_at?: string;
}

export interface UtilityMeter {
  id: string;
  meter_code: string;
  utility_type: string;
  plant_id: string;
  plant_name?: string;
  location: string;
  unit_of_measure: string;
  tariff_per_unit: number;
  description?: string;
  last_reading?: number;
  last_reading_date?: string;
}

export interface UtilityReading {
  id: string;
  meter_id: string;
  meter_code?: string;
  utility_type?: string;
  unit_of_measure?: string;
  plant_name?: string;
  reading_date: string;
  previous_reading: number;
  current_reading: number;
  consumption: number;
  total_cost: number;
  recorded_by: string;
  notes?: string;
  status?: 'Open' | 'In Progress' | 'Completed';
}

export interface MaintenanceBudget {
  id: string;
  plant_id: string;
  plant_name?: string;
  fiscal_year: number;
  month: number;
  category: string;
  budget_amount: number;
  actual_cost: number;
  notes?: string;
}

export interface PurchaseRequest {
  id: string;
  pr_number: string;
  work_order_id?: string;
  description: string;
  category: string;
  quantity: number;
  uom: string;
  estimated_cost: number;
  requester: string;
  plant_id: string;
  plant_name?: string;
  approval_status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'PO Issued';
  po_number?: string;
  vendor_name?: string;
  delivery_status: 'Pending' | 'Shipped' | 'Delivered' | 'Inspected';
  created_at: string;
}

export interface DocumentItem {
  id: string;
  doc_number: string;
  title: string;
  category: string;
  asset_id?: string;
  asset_name?: string;
  plant_id?: string;
  plant_name?: string;
  file_name: string;
  file_size: string;
  uploaded_by: string;
  upload_date: string;
  tags?: string;
}

export interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  module: string;
  record_id?: string;
  description: string;
  ip_address?: string;
  timestamp: string;
}

export interface User {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  plant_id?: string;
  status: string;
  hierarchy_level?: number;
  company_function?: string;
  job_title?: string;
  can_prepare?: number | boolean;
  can_verify?: number | boolean;
  can_approve?: number | boolean;
  can_acknowledge?: number | boolean;
  reporting_to_id?: string | null;
  password?: string;
  created_at?: string;
}

export interface ManagementLevelInfo {
  level: number;
  title: string;
  description: string;
  color: string;
}

export interface SignoffAuthorities {
  preparedBy: User[];
  verifiedBy: User[];
  approvedBy: User[];
  acknowledgedBy: User[];
  allManagement: User[];
  levels: ManagementLevelInfo[];
}

export interface DashboardKPIs {
  totalAssets: number;
  operationalAssets: number;
  maintenanceAssets: number;
  breakdownAssets: number;
  activeBreakdowns: number;
  openWorkOrders: number;
  overdueWorkOrders: number;
  overdueTasksCount?: number;
  pmCompliance: number;
  availabilityRate: number;
  mtbfHours: number;
  mttrHours: number;
  totalMaintenanceCost: number;
  lowStockParts: number;
  outOfStockParts: number;
  lastRefresh: string;
  activeBreakdownList?: any[];
  lowStockList?: any[];
  overduePMList?: any[];
  openWOList?: any[];
  assetStatusList?: any[];
}

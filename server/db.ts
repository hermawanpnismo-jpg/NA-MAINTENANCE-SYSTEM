import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'na_mms.db');
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high reliability and concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    -- Master Data: Companies
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Master Data: Plants
    CREATE TABLE IF NOT EXISTS plants (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    -- Master Data: Buildings
    CREATE TABLE IF NOT EXISTS buildings (
      id TEXT PRIMARY KEY,
      plant_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (plant_id) REFERENCES plants(id)
    );

    -- Master Data: Departments & Sections
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      head_person TEXT,
      is_active INTEGER DEFAULT 1
    );

    -- Master Data: Production Lines & Areas
    CREATE TABLE IF NOT EXISTS production_lines (
      id TEXT PRIMARY KEY,
      plant_id TEXT NOT NULL,
      building_id TEXT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (plant_id) REFERENCES plants(id)
    );

    -- Master Data: Asset Categories
    CREATE TABLE IF NOT EXISTS asset_categories (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT
    );

    -- Users & Authentication
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      plant_id TEXT,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Assets & Equipment Register
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      asset_tag TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      plant_id TEXT NOT NULL,
      building_id TEXT,
      line_id TEXT,
      manufacturer TEXT,
      model TEXT,
      serial_number TEXT,
      installation_date TEXT,
      commissioning_date TEXT,
      purchase_cost REAL DEFAULT 0,
      warranty_end_date TEXT,
      criticality TEXT DEFAULT 'Medium', -- Critical, High, Medium, Low
      operating_status TEXT DEFAULT 'Operational', -- Operational, Under Maintenance, Breakdown, Standby, Decommissioned
      responsible_dept TEXT,
      assigned_tech_id TEXT,
      maintenance_strategy TEXT DEFAULT 'Preventive',
      pm_frequency TEXT DEFAULT 'Monthly', -- Daily, Weekly, Monthly, Quarterly, Semiannual, Annual
      last_pm_date TEXT,
      next_pm_date TEXT,
      specs TEXT,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Preventive Maintenance Plans & Schedules
    CREATE TABLE IF NOT EXISTS pm_plans (
      id TEXT PRIMARY KEY,
      plan_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      frequency TEXT NOT NULL,
      estimated_hours REAL DEFAULT 2.0,
      department TEXT NOT NULL,
      assigned_tech_id TEXT,
      checklist_template TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    -- PM Execution Tasks
    CREATE TABLE IF NOT EXISTS pm_tasks (
      id TEXT PRIMARY KEY,
      task_code TEXT UNIQUE NOT NULL,
      plan_id TEXT,
      asset_id TEXT NOT NULL,
      due_date TEXT NOT NULL,
      planned_start TEXT,
      planned_end TEXT,
      actual_start TEXT,
      actual_end TEXT,
      assigned_tech_id TEXT,
      supporting_manpower TEXT,
      status TEXT DEFAULT 'Scheduled', -- Scheduled, Due Soon, Due Today, Overdue, In Progress, Completed, Cancelled
      checklist_results TEXT,
      abnormalities TEXT,
      supervisor_verification TEXT,
      notes TEXT,
      overdue_reason TEXT,
      overdue_action_plan TEXT,
      overdue_revised_due_date TEXT,
      overdue_recorded_by TEXT,
      overdue_recorded_at TEXT,
      overdue_risk_level TEXT DEFAULT 'Medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    -- Breakdown & Failure Reports
    CREATE TABLE IF NOT EXISTS breakdowns (
      id TEXT PRIMARY KEY,
      breakdown_number TEXT UNIQUE NOT NULL,
      report_datetime TEXT NOT NULL,
      company_id TEXT NOT NULL,
      plant_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      location TEXT,
      category TEXT NOT NULL, -- Mechanical, Electrical, Pneumatic, Hydraulic, PLC/Software, Operator Error
      failure_description TEXT NOT NULL,
      machine_condition TEXT,
      production_impact TEXT, -- Line Stopped, Speed Reduced, Quality Issue, No Impact
      safety_impact TEXT DEFAULT 'None', -- Critical, Moderate, Low, None
      priority TEXT DEFAULT 'High', -- Critical, High, Medium, Low
      reported_by TEXT NOT NULL,
      assigned_tech_id TEXT,
      supporting_manpower TEXT,
      initial_response_time TEXT,
      repair_start_time TEXT,
      repair_completion_time TEXT,
      downtime_minutes INTEGER DEFAULT 0,
      temporary_countermeasure TEXT,
      root_cause TEXT,
      five_why TEXT, -- JSON string of 5 Whys
      corrective_action TEXT,
      replacement_parts TEXT,
      trial_run_result TEXT,
      verified_by TEXT,
      status TEXT DEFAULT 'Reported', -- Reported, Acknowledged, Assigned, In Progress, Waiting for Spare Parts, Waiting for Vendor, Testing, Completed, Closed
      work_order_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Work Orders
    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      wo_number TEXT UNIQUE NOT NULL,
      request_date TEXT NOT NULL,
      requester TEXT NOT NULL,
      company_id TEXT NOT NULL,
      plant_id TEXT NOT NULL,
      location TEXT,
      asset_id TEXT,
      wo_type TEXT NOT NULL, -- Preventive Maintenance, Corrective Maintenance, Emergency Breakdown, Inspection, Improvement / Kaizen, Facility Repair, Utility Maintenance
      problem_description TEXT NOT NULL,
      priority TEXT DEFAULT 'Medium', -- Critical, High, Medium, Low
      work_scope TEXT,
      assigned_tech_id TEXT,
      supporting_manpower TEXT,
      planned_start TEXT,
      planned_finish TEXT,
      actual_start TEXT,
      actual_finish TEXT,
      labor_hours REAL DEFAULT 0,
      estimated_cost REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      risk_assessment TEXT,
      safety_precautions TEXT,
      completion_notes TEXT,
      verification_status TEXT DEFAULT 'Pending Approval', -- Pending Approval, Approved, Rejected
      verified_by TEXT,
      status TEXT DEFAULT 'Open', -- Open, In Progress, Waiting for Parts, Testing, Completed, Closed, Cancelled
      linked_breakdown_id TEXT,
      linked_pm_task_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Work Order Parts Allocation
    CREATE TABLE IF NOT EXISTS work_order_parts (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL,
      part_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      issued_by TEXT,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );

    -- Work Order Labor Logging
    CREATE TABLE IF NOT EXISTS work_order_labor (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL,
      technician_id TEXT NOT NULL,
      hours REAL NOT NULL,
      hourly_rate REAL DEFAULT 45000,
      total_labor_cost REAL DEFAULT 0,
      work_date TEXT,
      notes TEXT,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
    );

    -- Spare Parts & Inventory Master
    CREATE TABLE IF NOT EXISTS spare_parts (
      id TEXT PRIMARY KEY,
      part_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      specification TEXT,
      category TEXT NOT NULL, -- Mechanical, Electrical, Pneumatic, Hydraulic, Fastener, Lubricant, Consumable
      compatible_equipment TEXT,
      uom TEXT NOT NULL DEFAULT 'PCS',
      warehouse_location TEXT NOT NULL,
      min_stock REAL DEFAULT 5,
      max_stock REAL DEFAULT 50,
      reorder_point REAL DEFAULT 10,
      current_stock REAL DEFAULT 0,
      reserved_stock REAL DEFAULT 0,
      average_cost REAL DEFAULT 0,
      preferred_vendor TEXT,
      lead_time_days INTEGER DEFAULT 7,
      last_purchase_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Inventory Transactions
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      transaction_code TEXT UNIQUE NOT NULL,
      part_id TEXT NOT NULL,
      transaction_type TEXT NOT NULL, -- Goods Receipt, Issue to Work Order, Return, Stock Adjustment, Transfer
      reference_number TEXT,
      work_order_id TEXT,
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      balance_before REAL NOT NULL,
      balance_after REAL NOT NULL,
      performed_by TEXT NOT NULL,
      remarks TEXT,
      transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (part_id) REFERENCES spare_parts(id)
    );

    -- Technicians & Manpower Master
    CREATE TABLE IF NOT EXISTS technicians (
      id TEXT PRIMARY KEY,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      company_id TEXT NOT NULL,
      plant_id TEXT NOT NULL,
      department TEXT NOT NULL,
      skill_category TEXT NOT NULL, -- Mechanical, Electrical, Automation & PLC, Facility, Utility
      certifications TEXT,
      shift TEXT DEFAULT 'Shift 1',
      hourly_rate REAL DEFAULT 45000,
      is_available INTEGER DEFAULT 1,
      supervisor TEXT,
      active_status TEXT DEFAULT 'Active'
    );

    -- Vendors & Contractors
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      vendor_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      service_category TEXT NOT NULL, -- Equipment Overhaul, Calibration, Electrical, Facility Repair, Spare Parts Supplier
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      contract_period TEXT,
      rating REAL DEFAULT 4.5,
      remarks TEXT
    );

    -- Purchase Requests (PR) & Procurement Tracking
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id TEXT PRIMARY KEY,
      pr_number TEXT UNIQUE NOT NULL,
      work_order_id TEXT,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity REAL NOT NULL,
      uom TEXT NOT NULL,
      estimated_cost REAL NOT NULL,
      requester TEXT NOT NULL,
      plant_id TEXT NOT NULL,
      approval_status TEXT DEFAULT 'Draft', -- Draft, Submitted, Approved, Rejected, PO Issued
      po_number TEXT,
      vendor_name TEXT,
      delivery_status TEXT DEFAULT 'Pending', -- Pending, Shipped, Delivered, Inspected
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Building Facility Maintenance
    CREATE TABLE IF NOT EXISTS facility_inspections (
      id TEXT PRIMARY KEY,
      inspection_code TEXT UNIQUE NOT NULL,
      facility_category TEXT NOT NULL, -- Roof and Ceiling, Floor and Wall, Doors and Gates, Lighting, Plumbing, Toilets and Sanitation, Drainage, HVAC
      plant_id TEXT NOT NULL,
      building_id TEXT,
      area_description TEXT NOT NULL,
      technical_condition TEXT NOT NULL, -- Normal / Good, Minor Defect, Requires Action, Critical Hazard
      findings TEXT NOT NULL,
      corrective_action TEXT,
      inspector TEXT NOT NULL,
      inspection_date TEXT NOT NULL,
      linked_work_order_id TEXT,
      status TEXT DEFAULT 'Open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Utility Management & Meter Tracking
    CREATE TABLE IF NOT EXISTS utility_meters (
      id TEXT PRIMARY KEY,
      meter_code TEXT UNIQUE NOT NULL,
      utility_type TEXT NOT NULL, -- Electrical Power, Water Supply, Compressed Air, Nitrogen, Solar Power
      plant_id TEXT NOT NULL,
      location TEXT NOT NULL,
      unit_of_measure TEXT NOT NULL, -- kWh, m3, bar, Nm3
      tariff_per_unit REAL DEFAULT 1500, -- IDR per unit
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS utility_readings (
      id TEXT PRIMARY KEY,
      meter_id TEXT NOT NULL,
      reading_date TEXT NOT NULL,
      previous_reading REAL NOT NULL,
      current_reading REAL NOT NULL,
      consumption REAL NOT NULL,
      total_cost REAL NOT NULL,
      recorded_by TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meter_id) REFERENCES utility_meters(id)
    );

    -- Maintenance Budget & Cost Tracking
    CREATE TABLE IF NOT EXISTS maintenance_budgets (
      id TEXT PRIMARY KEY,
      plant_id TEXT NOT NULL,
      fiscal_year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      category TEXT NOT NULL, -- PM Budget, Corrective Budget, Spare Parts Budget, Vendor Services, Facility Repair
      budget_amount REAL NOT NULL,
      actual_cost REAL DEFAULT 0,
      notes TEXT
    );

    -- Document Management
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      doc_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL, -- Equipment Manual, Electrical Drawing, SOP, HIRADC / Risk Assessment, Work Permit (PTW), Service Report
      asset_id TEXT,
      plant_id TEXT,
      file_name TEXT NOT NULL,
      file_size TEXT,
      uploaded_by TEXT NOT NULL,
      upload_date TEXT NOT NULL,
      tags TEXT
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, STATUS_CHANGE, STOCK_ISSUE
      module TEXT NOT NULL,
      record_id TEXT,
      description TEXT NOT NULL,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Settings
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Operation Activity Photos & Evidence
    CREATE TABLE IF NOT EXISTS operation_evidences (
      id TEXT PRIMARY KEY,
      activity_type TEXT NOT NULL, -- work_order, breakdown, pm_task, facility_inspection
      activity_id TEXT NOT NULL,
      activity_code TEXT,
      evidence_type TEXT NOT NULL DEFAULT 'before', -- before, in_progress, after, damaged_part, document
      title TEXT NOT NULL,
      description TEXT,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT DEFAULT 'image/jpeg',
      file_size TEXT,
      uploaded_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_operation_evidences_act ON operation_evidences(activity_type, activity_id);
    CREATE INDEX IF NOT EXISTS idx_operation_evidences_created ON operation_evidences(created_at DESC);
    CREATE TABLE IF NOT EXISTS utility_tasks (
      id TEXT PRIMARY KEY,
      task_code TEXT UNIQUE NOT NULL,
      plant_id TEXT NOT NULL,
      utility_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'Medium',
      assigned_tech_id TEXT,
      supporting_manpower TEXT,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'Open', -- Open, In Progress, Completed
      completed_at TEXT,
      completion_notes TEXT,
      inspector TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plant_id) REFERENCES plants(id)
    );
    CREATE INDEX IF NOT EXISTS idx_utility_tasks_status ON utility_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_utility_tasks_plant ON utility_tasks(plant_id);
  `);

  // Migrations for existing databases to support multiple manpower
  try {
    db.exec('ALTER TABLE breakdowns ADD COLUMN supporting_manpower TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE breakdowns ADD COLUMN ishikawa_analysis TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE breakdowns ADD COLUMN authorization_signoff TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE pm_tasks ADD COLUMN supporting_manpower TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE pm_tasks ADD COLUMN overdue_reason TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE pm_tasks ADD COLUMN overdue_action_plan TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE pm_tasks ADD COLUMN overdue_revised_due_date TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE pm_tasks ADD COLUMN overdue_recorded_by TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE pm_tasks ADD COLUMN overdue_recorded_at TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE pm_tasks ADD COLUMN overdue_risk_level TEXT DEFAULT "Medium";');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE work_orders ADD COLUMN supporting_manpower TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN password TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN hierarchy_level INTEGER DEFAULT 3;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN company_function TEXT DEFAULT "General Affair & Maintenance";');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN job_title TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN can_prepare INTEGER DEFAULT 1;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN can_verify INTEGER DEFAULT 0;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN can_approve INTEGER DEFAULT 0;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN can_acknowledge INTEGER DEFAULT 0;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN reporting_to_id TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE utility_readings ADD COLUMN status TEXT DEFAULT "Completed";');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN completed_at TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN completion_notes TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN assigned_tech_id TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN supporting_manpower TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN due_date TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN is_overdue INTEGER DEFAULT 0;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN overdue_reason TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN overdue_action_plan TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN overdue_revised_due_date TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN overdue_recorded_by TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN overdue_recorded_at TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN overdue_risk_level TEXT DEFAULT "Medium";');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN reported_by TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN verified_by TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN approved_by TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN acknowledged_by TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN ishikawa_man TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN ishikawa_machine TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN ishikawa_method TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN ishikawa_material TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN ishikawa_environment TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN why1 TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN why2 TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN why3 TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN why4 TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN why5 TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN trial_run_result TEXT;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN downtime_minutes INTEGER DEFAULT 0;');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE facility_inspections ADD COLUMN preventive_action TEXT;');
  } catch (_) {}

  // System Roles Table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        department TEXT,
        is_protected INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default protected and standard system roles
    const rolesCount = (db.prepare('SELECT COUNT(*) as c FROM system_roles').get() as any)?.c || 0;
    if (rolesCount === 0) {
      const insRole = db.prepare(`
        INSERT OR IGNORE INTO system_roles (id, name, description, department, is_protected)
        VALUES (?, ?, ?, ?, ?)
      `);
      insRole.run('role-hermawan', 'Maintenance Leader - All Plant (Hermawan Prasetyo)', 'Kepala koordinasi pemeliharaan seluruh plant (Protected)', 'General Affair & Maintenance', 1);
      insRole.run('role-alfin', 'Maintenance Leader - NA-2 (Alfin Prasetyo)', 'Koordinator teknis dan pemeliharaan Plant NA-2 AION (Protected)', 'Production Equipment Maintenance', 1);
      insRole.run('role-warto', 'Maintenance Supervisor (Warto)', 'Supervisor operasional & verifikator pekerjaan harian (Protected)', 'Mechanical & Electrical Maintenance', 1);
      insRole.run('role-admin', 'System Administrator', 'Akses penuh administrasi sistem dan konfigurasi MMS', 'Maintenance Department', 0);
      insRole.run('role-tech', 'Maintenance Technician (Marsino / Amin Irfan / Dedi)', 'Regu teknisi eksekutor pemeliharaan mesin dan fasilitas', 'Mechanical & Electrical Maintenance', 0);
      insRole.run('role-mgr', 'Maintenance Manager', 'Manajer divisi pemeliharaan dan evaluasi kinerja pabrik', 'Maintenance Department', 0);
      insRole.run('role-pln', 'Maintenance Planner', 'Perencana jadwal PM, spare part, dan logistik shutdown', 'Maintenance Department', 0);
      insRole.run('role-fac', 'Facility / Utility Officer', 'Inspektor dan eksekutor fasilitas gedung dan utilitas pabrik', 'HRGA – Building Facility & Utility Maintenance', 0);
      insRole.run('role-str', 'Storekeeper', 'Pengelola gudang suku cadang dan mutasi inventory', 'Maintenance Department', 0);
      insRole.run('role-view', 'Viewer / Management', 'Akses tinjauan monitoring laporan dan visualisasi dashboard', 'Plant Management', 0);
    }
  } catch (err) {
    console.error('System roles init notice:', err);
  }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS utility_tasks (
        id TEXT PRIMARY KEY,
        task_code TEXT UNIQUE NOT NULL,
        plant_id TEXT NOT NULL,
        utility_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'Medium',
        assigned_tech_id TEXT,
        supporting_manpower TEXT,
        due_date TEXT NOT NULL,
        status TEXT DEFAULT 'Open',
        completed_at TEXT,
        completion_notes TEXT,
        inspector TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_utility_tasks_status ON utility_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_utility_tasks_plant ON utility_tasks(plant_id);
    `);
  } catch (_) {}

  // Update or set default passwords for default users
  try {
    // Ensure Admin user exists with password Nackp2026
    const checkAdmin = db.prepare(`SELECT id FROM users WHERE LOWER(role) LIKE '%admin%' OR LOWER(email) LIKE '%admin%' LIMIT 1`).get();
    if (!checkAdmin) {
      db.prepare(`
        INSERT OR IGNORE INTO users (id, employee_id, name, email, role, department, plant_id, status, password)
        VALUES ('usr-admin', 'NA-EMP-001', 'Administrator NA-MMS (Rian Suryanto)', 'admin.na@nationalassemblers.co.id', 'System Administrator', 'Maintenance Department', 'all', 'Active', 'Nackp2026')
      `).run();
    } else {
      db.prepare(`UPDATE users SET password = 'Nackp2026' WHERE email = 'admin.na@nationalassemblers.co.id' OR LOWER(role) LIKE '%admin%'`).run();
    }
    db.prepare(`UPDATE users SET password = 'Hermawan@2026' WHERE email = 'hermawan.p@nationalassemblers.co.id' AND (password IS NULL OR password = '')`).run();
    db.prepare(`UPDATE users SET password = 'Alfin@2026' WHERE email = 'alfin.p@nationalassemblers.co.id' AND (password IS NULL OR password = '')`).run();
    db.prepare(`UPDATE users SET password = 'Warto@2026' WHERE email = 'warto@nationalassemblers.co.id' AND (password IS NULL OR password = '')`).run();
    db.prepare(`UPDATE users SET password = 'Planner@2026' WHERE email = 'wahyu.h@nationalassemblers.co.id' AND (password IS NULL OR password = '')`).run();
    db.prepare(`UPDATE users SET password = 'Technician@2026' WHERE email = 'marsino@nationalassemblers.co.id' AND (password IS NULL OR password = '')`).run();
    db.prepare(`UPDATE users SET password = 'Technician@2026' WHERE email = 'amin.irfan@nationalassemblers.co.id' AND (password IS NULL OR password = '')`).run();
    db.prepare(`UPDATE users SET password = 'Technician@2026' WHERE email = 'dedi@nationalassemblers.co.id' AND (password IS NULL OR password = '')`).run();
    db.prepare(`UPDATE users SET password = 'Facility@2026' WHERE email = 'bambang.s@nationalassemblers.co.id' AND (password IS NULL OR password = '')`).run();
    db.prepare(`UPDATE users SET password = 'Store@2026' WHERE email = 'joko.s@nationalassemblers.co.id' AND (password IS NULL OR password = '')`).run();

    // Ensure HermawanP32@gmail.com exists with password
    const checkHermawan = db.prepare(`SELECT id FROM users WHERE email = 'HermawanP32@gmail.com'`).get();
    if (!checkHermawan) {
      db.prepare(`
        INSERT OR IGNORE INTO users (id, employee_id, name, email, role, department, plant_id, status, password)
        VALUES ('usr-hermawan-google', 'NA-EMP-002-G', 'Hermawan Prasetyo', 'HermawanP32@gmail.com', 'Maintenance Leader - All Plant', 'Maintenance Department', 'plant-na2', 'Active', 'Hermawan@2026')
      `).run();
    } else {
      db.prepare(`UPDATE users SET password = 'Hermawan@2026' WHERE email = 'HermawanP32@gmail.com' AND (password IS NULL OR password = '')`).run();
    }
    // Ensure Plant Manager (Head of Manufacturing) exists as Level 1 Executive Management
    const checkPM = db.prepare(`SELECT id FROM users WHERE id = 'usr-pm' OR LOWER(role) LIKE '%plant manager%' LIMIT 1`).get();
    if (!checkPM) {
      db.prepare(`
        INSERT OR IGNORE INTO users (
          id, employee_id, name, email, role, department, plant_id, status, password,
          hierarchy_level, company_function, job_title, can_prepare, can_verify, can_approve, can_acknowledge, reporting_to_id
        ) VALUES (
          'usr-pm', 'NA-EXEC-001', 'Ir. Budi Santoso, M.T.', 'plant.manager@nationalassemblers.co.id',
          'Plant Manager / Head of Manufacturing', 'Executive Plant Management', 'all', 'Active', 'PlantMgr@2026',
          1, 'Executive Management & Manufacturing Operations', 'Plant Manager / Head of Manufacturing', 0, 1, 1, 1, NULL
        )
      `).run();
    } else {
      db.prepare(`
        UPDATE users SET
          hierarchy_level = 1,
          company_function = 'Executive Management & Manufacturing Operations',
          job_title = 'Plant Manager / Head of Manufacturing',
          can_prepare = 0, can_verify = 1, can_approve = 1, can_acknowledge = 1
        WHERE id = 'usr-pm' OR LOWER(role) LIKE '%plant manager%'
      `).run();
    }

    // Ensure Supervisor Warto is Level 2 Management (Approver & Verifier)
    db.prepare(`
      UPDATE users SET
        hierarchy_level = 2,
        company_function = 'Mechanical & Electrical Maintenance',
        job_title = 'Maintenance Supervisor / Shift Superintendent',
        can_prepare = 1, can_verify = 1, can_approve = 1, can_acknowledge = 0,
        reporting_to_id = 'usr-pm'
      WHERE id = 'usr-spv' OR LOWER(name) LIKE '%warto%'
    `).run();

    // Ensure Hermawan Prasetyo is Level 3 Management (Verifier & Preparer - All Plant)
    db.prepare(`
      UPDATE users SET
        hierarchy_level = 3,
        company_function = 'General Affair & Maintenance (GA-MNT)',
        job_title = 'Maintenance Leader - All Plant',
        can_prepare = 1, can_verify = 1, can_approve = 0, can_acknowledge = 0,
        reporting_to_id = 'usr-spv'
      WHERE id IN ('usr-mgr', 'usr-hermawan-google') OR LOWER(name) LIKE '%hermawan%'
    `).run();

    // Ensure Alfin Prasetyo is Level 3 Management (Verifier & Preparer - NA-2)
    db.prepare(`
      UPDATE users SET
        hierarchy_level = 3,
        company_function = 'Production Equipment Maintenance (NA-2 AION)',
        job_title = 'Maintenance Leader - NA-2 AION',
        can_prepare = 1, can_verify = 1, can_approve = 0, can_acknowledge = 0,
        reporting_to_id = 'usr-spv'
      WHERE id = 'usr-ldr2' OR LOWER(name) LIKE '%alfin%'
    `).run();

    // Ensure Maintenance Planner is Level 4 Management (Planner & Technical Verifier)
    db.prepare(`
      UPDATE users SET
        hierarchy_level = 4,
        company_function = 'Maintenance Planning, Reliability & Spare Parts',
        job_title = 'Maintenance Planner & PM Specialist',
        can_prepare = 1, can_verify = 1, can_approve = 0, can_acknowledge = 0,
        reporting_to_id = 'usr-mgr'
      WHERE id = 'usr-pln' OR LOWER(name) LIKE '%wahyu%'
    `).run();

    // Ensure Technicians are Level 5 (Prepared By / Executor)
    db.prepare(`
      UPDATE users SET
        hierarchy_level = 5,
        company_function = 'Line Maintenance & Machine Repair Execution',
        job_title = 'Senior Maintenance Technician',
        can_prepare = 1, can_verify = 0, can_approve = 0, can_acknowledge = 0,
        reporting_to_id = 'usr-ldr2'
      WHERE id IN ('usr-tech1', 'usr-tech2', 'usr-tech3') OR LOWER(role) LIKE '%technician%'
    `).run();

    // Facility Officer
    db.prepare(`
      UPDATE users SET
        hierarchy_level = 4,
        company_function = 'HRGA – Building Facility & Civil Infrastructure',
        job_title = 'Building Facility & Utility Officer',
        can_prepare = 1, can_verify = 1, can_approve = 0, can_acknowledge = 0,
        reporting_to_id = 'usr-mgr'
      WHERE id = 'usr-fac' OR LOWER(name) LIKE '%bambang%'
    `).run();
  } catch (err) {
    console.error('Password & hierarchy migration notice:', err);
  }

  // Seed sample utility tasks only if plants table is already populated
  try {
    const plantsCount = (db.prepare('SELECT COUNT(*) as c FROM plants').get() as any)?.c || 0;
    const taskCount = (db.prepare('SELECT COUNT(*) as c FROM utility_tasks').get() as any)?.c || 0;
    if (plantsCount > 0 && taskCount === 0) {
      const insertTask = db.prepare(`
        INSERT INTO utility_tasks (
          id, task_code, plant_id, utility_type, title, description,
          priority, assigned_tech_id, supporting_manpower, due_date, status, completion_notes, inspector
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertTask.run(
        'utl-tsk-01', 'UTL-TSK-2026-001', 'plant-na2', 'Electrical Power',
        'Inspeksi Rutin Trafo MDB & Cubicle 20kV Plant NA-2',
        'Pemeriksaan level oli trafo hermetic, silica gel breather, pengukuran temperatur inframerah busbar R-S-T, dan uji grounding pembumian.',
        'High', 'tech-2', '["tech-1"]', '2026-10-30', 'In Progress',
        'Pemeriksaan visual selesai, temperatur busbar 48°C normal. Melanjutkan uji trip breaker.', 'Amin Irfan'
      );

      insertTask.run(
        'utl-tsk-02', 'UTL-TSK-2026-002', 'plant-na2', 'Compressed Air',
        'Penggantian Filter Element & Uji Titik Embun Air Dryer FD-285',
        'Penggantian inline particulate cartridge 0.01 micron dan verifikasi dew point transmitter pada +3°C untuk jalur pneumatic robot welding.',
        'Medium', 'tech-1', null, '2026-10-24', 'Completed',
        'Filter baru telah dipasang, differential pressure normal 0.15 bar, moisture purge otomatis beroperasi sempurna.', 'Marsino'
      );

      insertTask.run(
        'utl-tsk-03', 'UTL-TSK-2026-003', 'plant-na3', 'Water Supply',
        'Pemeriksaan Tekanan Suction & Level Reservoir Pompa Hydrant NA-3',
        'Uji start otomatis jockey pump pada 8 bar dan running test mesin diesel fire pump 15 menit. Pengecekan valve header tidak bocor.',
        'Critical', 'tech-3', null, '2026-11-02', 'Open',
        null, 'Dedi'
      );

      insertTask.run(
        'utl-tsk-04', 'UTL-TSK-2026-004', 'plant-na2', 'Nitrogen',
        'Kalibrasi Pressure Transmitter & Deteksi Kebocoran Header Gas N2',
        'Inspeksi sambungan flens pipa distribusi gas nitrogen ke booth sealing & paint shop dengan leak detector spray.',
        'Medium', 'tech-2', null, '2026-11-05', 'Open',
        null, 'Bambang Supriyanto'
      );
    }
  } catch (err) {
    console.error('Utility task seeding notice:', err);
  }

  // System Settings Table (stores master authorization password & global parameters)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT
      );
      INSERT OR IGNORE INTO system_settings (key, value, updated_at, updated_by)
      VALUES ('master_password', 'Nackp2026', CURRENT_TIMESTAMP, 'System Initialization');
    `);
  } catch (err) {
    console.error('system_settings init notice:', err);
  }
}

export function getSystemMasterPassword(): string {
  try {
    const row = db.prepare(`SELECT value FROM system_settings WHERE key = 'master_password' LIMIT 1`).get() as any;
    if (row && row.value) return String(row.value).trim();
  } catch (_) {}
  return 'Nackp2026';
}

export function setSystemMasterPassword(newPassword: string, updatedBy = 'System Administrator'): { success: boolean; lastUpdated: string } {
  const clean = String(newPassword || '').trim();
  if (!clean || clean.length < 4) {
    throw new Error('Password baru minimal 4 karakter!');
  }
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO system_settings (key, value, updated_at, updated_by)
    VALUES ('master_password', ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by
  `).run(clean, now, updatedBy);

  // Sync password with admin user so admin login also works
  try {
    db.prepare(`UPDATE users SET password = ? WHERE LOWER(role) LIKE '%admin%' OR id = 'usr-admin'`).run(clean);
  } catch (_) {}

  return { success: true, lastUpdated: now };
}

export function getSystemPasswordMeta(): { isCustom: boolean; lastUpdated: string | null; updatedBy: string | null } {
  try {
    const row = db.prepare(`SELECT value, updated_at, updated_by FROM system_settings WHERE key = 'master_password' LIMIT 1`).get() as any;
    if (row) {
      return {
        isCustom: row.value !== 'Nackp2026',
        lastUpdated: row.updated_at || null,
        updatedBy: row.updated_by || null
      };
    }
  } catch (_) {}
  return { isCustom: false, lastUpdated: null, updatedBy: null };
}

export function verifySystemActionPassword(inputPass: string): boolean {
  if (!inputPass) return false;
  const clean = String(inputPass).trim();
  const master = getSystemMasterPassword();
  if (clean === master || clean.toLowerCase() === master.toLowerCase()) {
    return true;
  }
  // Check if matches any user's personal password or legacy fallback
  if (clean === 'Nackp2026' || clean === 'Admin@NA2026') return true;
  try {
    const userMatch = db.prepare('SELECT id FROM users WHERE password = ? LIMIT 1').get(clean);
    if (userMatch) return true;
  } catch (_) {}
  return false;
}

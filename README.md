# PT National Assemblers Maintenance Management System (NA-MMS)

**Enterprise Computerized Maintenance Management System (CMMS)** tailored for automotive & industrial assembly plant operations across **Plant NA-2 (Chassis & Heavy Assembly)**, **Plant NA-3 (Body, Paint & Automation)**, and **Plant NA-4 / INA (Commercial Vehicle & Final Line)**.

---

## 1. System Architecture & Overview

NA-MMS is built as a production-grade full-stack maintenance intelligence application designed with strict zero-pill discipline, WCAG accessibility, and high data density.

```
                           +----------------------------------------+
                           |   PT National Assemblers MMS Client    |
                           |   (React 19 + TypeScript + Tailwind)   |
                           +-------------------+--------------------+
                                               |
                                     REST API  |  JSON / HTTP
                                               v
                           +----------------------------------------+
                           |        Express 4 Node.js Server        |
                           |    (server.ts / Vite Middleware)       |
                           +-------------------+--------------------+
                                               |
                                SQL Prepared   |  node:sqlite (WAL Mode)
                                  Statements   v
                           +----------------------------------------+
                           |   Relational ACID Database (SQLite)    |
                           |      ./data/na_mms.db (Persisted)      |
                           +----------------------------------------+
```

---

## 2. Core Functional Modules (All 19 Modules Implemented)

1. **Executive Dashboard**: 12 Industrial KPI cards (Total Assets, Operational, Breakdown, PM Compliance %, Equipment Availability OEE %, MTBF, MTTR, Monthly Cost IDR, Stock-out alerts) with multi-plant filtering and historical trends.
2. **Asset & Equipment Register**: Unique Asset Tags (`NA2-CMP-001`, `NA3-PNT-001`), manufacturer specs, warranty dates, criticality tiers, technical specs, linked maintenance history, and cumulative cost.
3. **Preventive Maintenance (PM)**: Scheduled, Due Soon, Overdue tracking, digital checklist execution, supervisor sign-offs, and automatic abnormality-to-corrective work order conversion.
4. **Corrective Maintenance (CM)**: Dedicated remedial work logs, parts usage, and root cause countermeasures.
5. **Breakdown Management**: Emergency stoppage alerts, production impact assessment (Line Stopped, Speed Reduced), 5-Why root cause methodology, downtime duration, and trial run verification.
6. **Work Order Management**: Centralized operations with List View and 6-stage Kanban board (`Open`, `In Progress`, `Waiting for Parts`, `Testing`, `Completed`, `Closed`), transactional spare part issuance with live stock deductions, technician labor logging, and printable voucher previews.
7. **Spare Parts & Inventory**: Catalog with min/max thresholds, reorder points, warehouse rack locations, ACID-guaranteed transactional balance updates (Goods Receipt, Return, Scrap, Adjustment), and duplicate protection.
8. **Manpower & Technician Roster**: Technician skill matrix (Mechanical, Electrical, Automation, Utility), hourly rates, shifts, certifications, and active task workload.
9. **Vendors & Service Contractors**: OEM vendor catalog (Atlas Copco, Demag, Festo, Schneider Electric, Durr), contract periods, contacts, and performance ratings.
10. **Building Facility Maintenance**: Civil infrastructure audits (Roof and Ceiling, Lighting, Plumbing, Drainage, HVAC) and defect follow-ups.
11. **Utility Management & Energy Tracking**: Substation electrical meters (PLN 20kV / Genset kWh), deep well water meters (m³), compressed air headers (Nm³), automatic consumption calculation, and monthly utility tariffs.
12. **Inspection Checklists**: Pre-start daily machine checklists, weekly hoist/crane safety audits, and substation flow tests with pass/defect verification.
13. **Maintenance Cost & Budgeting**: Fiscal budget planning vs actual maintenance expenditures (PM, CM, Parts, Vendor services) in Indonesian Rupiah (IDR) without double counting.
14. **Purchase Requests (PR) & Procurement Tracking**: Requisitions linked to work orders, PO tracking, and vendor delivery status.
15. **Technical Document Repository**: Equipment manuals, single line diagrams (SLD), SOPs, and HIRADC risk assessment permits.
16. **Reports & Analytics**: Standardized PT National Assemblers management reports with real filtered records, CSV exports, Excel-compatible tables, and print-ready vouchers.
17. **Master Data Architecture**: Fully editable master data for companies, plants (NA-2, NA-3, NA-4), buildings, departments, lines, and failure taxonomies.
18. **User Management & Audit Trail**: Chronological immutable audit trail logging user, timestamp, module, IP address, and operation. Includes RBAC permission matrix.
19. **System Settings**: Configurable operating timezone (`Asia/Jakarta`), currency code (`IDR`), working hours/day (`16 hrs`), and PM advance notice window (`7 days`).

---

## 3. Database Entity Relationship Diagram (ERD)

- `companies`: id, code, name, address
- `plants`: id, company_id, code, name, location, is_active
- `buildings`: id, plant_id, code, name
- `departments`: id, code, name, head_person, is_active
- `production_lines`: id, plant_id, building_id, code, name
- `asset_categories`: id, code, name, description
- `assets`: id, asset_tag (UNIQUE), name, category_id, plant_id, manufacturer, model, serial_number, criticality, operating_status, purchase_cost, pm_frequency
- `pm_tasks`: id, task_code (UNIQUE), asset_id, due_date, status, checklist_results, abnormalities, supervisor_verification
- `breakdowns`: id, breakdown_number (UNIQUE), asset_id, category, failure_description, production_impact, priority, downtime_minutes, root_cause, five_why, status
- `work_orders`: id, wo_number (UNIQUE), asset_id, wo_type, priority, assigned_tech_id, labor_hours, actual_cost, status
- `work_order_parts`: id, work_order_id, part_id, quantity, unit_cost, total_cost, issued_by
- `work_order_labor`: id, work_order_id, technician_id, hours, hourly_rate, total_labor_cost
- `spare_parts`: id, part_number (UNIQUE), name, category, warehouse_location, min_stock, reorder_point, current_stock, reserved_stock, average_cost
- `inventory_transactions`: id, transaction_code (UNIQUE), part_id, transaction_type, quantity, balance_before, balance_after, performed_by
- `technicians`: id, employee_id (UNIQUE), name, plant_id, department, skill_category, certifications, hourly_rate
- `vendors`: id, vendor_code (UNIQUE), name, service_category, contact_person, phone, contract_period, rating
- `facility_inspections`: id, inspection_code, facility_category, plant_id, technical_condition, findings, corrective_action
- `utility_meters`: id, meter_code, utility_type, plant_id, unit_of_measure, tariff_per_unit
- `utility_readings`: id, meter_id, reading_date, previous_reading, current_reading, consumption, total_cost
- `maintenance_budgets`: id, plant_id, fiscal_year, month, category, budget_amount, actual_cost
- `documents`: id, doc_number, title, category, file_name, file_size, uploaded_by
- `audit_logs`: id, user_name, action, module, record_id, description, ip_address, timestamp
- `system_settings`: key (PRIMARY KEY), value, description

---

## 4. Setup, Development & Deployment Instructions

### Prerequisites
- Node.js v20+ or v22+
- npm v10+

### Installation & Server Launch
```bash
# Install dependencies
npm install

# Start the full-stack server (runs Express API on port 3000 with Vite middleware)
npm run dev

# Or in production mode:
npm run build
npm start
```

### Accessing the System
- Web UI: `http://localhost:3000/`
- API Health Check: `http://localhost:3000/api/health`
- Dashboard Telemetry: `http://localhost:3000/api/dashboard/kpis`

---

## 5. Security & RBAC Enforcement

The system enforces role-based authorization across:
- **System Administrator**: Full configuration, master data, user accounts.
- **Maintenance Manager**: Approvals, budget management, report authorization.
- **Maintenance Supervisor**: Work order dispatch, PM sign-offs, parts requisition.
- **Maintenance Technician**: Work execution, checklist completion, labor logging.
- **Storekeeper**: Parts receipt, stock issuance, warehouse adjustments.
- **Facility / Utility Officer**: Civil inspections, meter logging.
- **Viewer / Management**: Read-only executive reports.

All operational state changes are logged to the immutable `audit_logs` table.

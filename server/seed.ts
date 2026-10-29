import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../data/uploads');

function generateIndustrialSvg(title: string, subtitle: string, tag: string, color: string, badgeColor: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
      <linearGradient id="metal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#94a3b8"/>
        <stop offset="50%" stop-color="#64748b"/>
        <stop offset="100%" stop-color="#334155"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)"/>
    <g opacity="0.08" stroke="#38bdf8" stroke-width="1">
      <path d="M0 50h800M0 100h800M0 150h800M0 200h800M0 250h800M0 300h800M0 350h800M0 400h800M0 450h800M0 500h800M0 550h800"/>
      <path d="M50 0v600M100 0v600M150 0v600M200 0v600M250 0v600M300 0v600M350 0v600M400 0v600M450 0v600M500 0v600M550 0v600M600 0v600M650 0v600M700 0v600M750 0v600"/>
    </g>
    <!-- Border Frame -->
    <rect x="20" y="20" width="760" height="560" fill="none" stroke="#334155" stroke-width="2" rx="12"/>
    <!-- Industrial Machine Graphic Silhouette -->
    <circle cx="400" cy="270" r="140" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="16 8"/>
    <circle cx="400" cy="270" r="110" fill="url(#metal)" opacity="0.4"/>
    <circle cx="400" cy="270" r="60" fill="#0f172a" stroke="${color}" stroke-width="4"/>
    <circle cx="400" cy="270" r="24" fill="${color}"/>
    <!-- Gear teeth elements -->
    <path d="M390 100h20v40h-20zM390 400h20v40h-20zM230 260h40v20h-40zM530 260h40v20h-40z" fill="${color}" opacity="0.8"/>
    <!-- Watermark / Plant Identification Header -->
    <rect x="40" y="40" width="720" height="60" fill="#1e293b" rx="6"/>
    <text x="60" y="75" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="20" letter-spacing="1">PT NATIONAL ASSEMBLERS</text>
    <text x="60" y="92" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">MAINTENANCE MANAGEMENT SYSTEM • OPERATION ACTIVITY EVIDENCE</text>
    <rect x="620" y="52" width="120" height="36" fill="${badgeColor}" rx="4"/>
    <text x="680" y="75" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="700" font-size="13" text-anchor="middle">${tag}</text>
    <!-- Subject Card -->
    <rect x="40" y="430" width="720" height="130" fill="#090d16" opacity="0.92" rx="8" stroke="#334155"/>
    <text x="65" y="470" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="700" font-size="22">${title}</text>
    <text x="65" y="505" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="14">${subtitle}</text>
    <text x="65" y="535" fill="#64748b" font-family="system-ui, sans-serif" font-size="11">VERIFIED FIELD EVIDENCE • TIMEZONE: WIB (GMT+7) • ARCHIVED TO NA-MMS REPOSITORY</text>
  </svg>`;
}

export function seedEvidencesIfEmpty() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const check = db.prepare('SELECT COUNT(*) as c FROM operation_evidences').get() as { c: number };
    if (check && check.c > 0) {
      return;
    }

    console.log('Seeding initial operational activity photos and evidence records...');

    // Generate sample evidence images
    const images = [
      {
        fileName: 'evid_conveyor_guide_seized.svg',
        svg: generateIndustrialSvg(
          'Kondisi Awal: Guide Roller Macet & Bearing Seized',
          'Line 1 Slat Conveyor Stn 8 - Inverter trip OC3 overcurrent trip saat muatan chassis.',
          'BEFORE REPAIR',
          '#ef4444',
          '#b91c1c'
        )
      },
      {
        fileName: 'evid_conveyor_bearing_replaced.svg',
        svg: generateIndustrialSvg(
          'Komponen Rusak: Bearing 6205-2RS Aus & Kering',
          'Permukaan race dalam mengalami scoring akibat kehabisan pelumas pada temperatur operasi.',
          'DAMAGED PART',
          '#f97316',
          '#c2410c'
        )
      },
      {
        fileName: 'evid_conveyor_repair_process.svg',
        svg: generateIndustrialSvg(
          'Proses Pengerjaan: Penggantian Roller Baru & Purging Gemuk',
          'Teknisi Marsino & Amin Irfan memasang unit roller baru bertoleransi tinggi C3.',
          'IN PROGRESS',
          '#eab308',
          '#a16207'
        )
      },
      {
        fileName: 'evid_conveyor_after_test.svg',
        svg: generateIndustrialSvg(
          'Hasil Selesai: Trial Run 30 Menit Sukses Beban Penuh',
          'Arus motor inverter stabil 14.2A, temperatur bearing 42°C normal, zero vibrasi abnormal.',
          'AFTER / FINISHED',
          '#10b981',
          '#047857'
        )
      },
      {
        fileName: 'evid_conveyor_ptw_signoff.svg',
        svg: generateIndustrialSvg(
          'Dokumen: Surat Izin LOTO & BAP Serah Terima Operasi',
          'LOTO Feeder MDB di-release, berita acara uji coba disahkan bersama Team Leader Produksi.',
          'DOCUMENT / PTW',
          '#3b82f6',
          '#1d4ed8'
        )
      },
      {
        fileName: 'evid_shower_pump_debris.svg',
        svg: generateIndustrialSvg(
          'Temuan Breakdown: Washer 12mm Mengganjal Impeller Pompa',
          'Benda asing jatuh ke bak sirkulasi suction terbuka, mengakibatkan motor 15 kW stall.',
          'BEFORE / BREAKDOWN',
          '#ef4444',
          '#b91c1c'
        )
      },
      {
        fileName: 'evid_compressor_pm_inspection.svg',
        svg: generateIndustrialSvg(
          'Preventive Maintenance: Inspeksi Level Oli & Indikator Delta P',
          'Atlas Copco GA-75+: Level oli normal di garis hijau, differential pressure filter 0.3 bar.',
          'PM CHECKLIST',
          '#10b981',
          '#047857'
        )
      },
      {
        fileName: 'evid_roof_gutter_polyurethane.svg',
        svg: generateIndustrialSvg(
          'Fasilitas Gedung: Hasil Perbaikan Sealant Talang Atap',
          'Aplikasi Sika polyurethane sealant dan penambahan corong limpasan talang Grid 6-8.',
          'AFTER REPAIR',
          '#10b981',
          '#047857'
        )
      }
    ];

    for (const img of images) {
      const fullPath = path.join(UPLOAD_DIR, img.fileName);
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, img.svg, 'utf8');
      }
    }

    const insertEvid = db.prepare(`
      INSERT INTO operation_evidences (
        id, activity_type, activity_id, activity_code, evidence_type,
        title, description, file_name, file_url, file_type, file_size,
        uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Work Order WO-2026-00101 (Conveyor)
    insertEvid.run(
      'evid-01', 'work_order', 'wo-01', 'WO-2026-00101', 'before',
      'Kondisi Awal: Guide Roller Macet & Inverter Trip OC3',
      'Roller samping macet akibat gemuk kering pada temperatur beban chassis. Konveyor terhenti di stasiun 8.',
      'evid_conveyor_guide_seized.svg', '/uploads/evid_conveyor_guide_seized.svg', 'image/svg+xml', '340 KB',
      'Alfin Prasetyo (Leader NA-2)', '2026-10-15 10:25:00'
    );

    insertEvid.run(
      'evid-02', 'work_order', 'wo-01', 'WO-2026-00101', 'damaged_part',
      'Pemeriksaan Bearing Rusak 6205-2RS',
      'Permukaan race dalam bearing aus parah dan hangus kehitaman karena gesekan tanpa grease.',
      'evid_conveyor_bearing_replaced.svg', '/uploads/evid_conveyor_bearing_replaced.svg', 'image/svg+xml', '315 KB',
      'Marsino (Technician)', '2026-10-15 10:45:00'
    );

    insertEvid.run(
      'evid-03', 'work_order', 'wo-01', 'WO-2026-00101', 'in_progress',
      'Proses Penggantian Unit Roller Baru & Purging Jalur Gemuk',
      'Pemasangan roller baru high-temp bearing dengan torque wrench 45 Nm dan pembersihan pelumas lama.',
      'evid_conveyor_repair_process.svg', '/uploads/evid_conveyor_repair_process.svg', 'image/svg+xml', '325 KB',
      'Amin Irfan (Technician)', '2026-10-15 11:00:00'
    );

    insertEvid.run(
      'evid-04', 'work_order', 'wo-01', 'WO-2026-00101', 'after',
      'Kondisi Selesai: Uji Coba Muatan Penuh 30 Menit (Normal)',
      'Trial run 30 menit muatan penuh. Arus motor inverter stabil 14.2A, temperatur bearing 42°C normal.',
      'evid_conveyor_after_test.svg', '/uploads/evid_conveyor_after_test.svg', 'image/svg+xml', '350 KB',
      'Warto (Supervisor)', '2026-10-15 11:15:00'
    );

    insertEvid.run(
      'evid-05', 'work_order', 'wo-01', 'WO-2026-00101', 'document',
      'Surat Izin Kerja LOTO & Berita Acara Uji Beban',
      'Formulir LOTO breaker feeder dan berita acara serah terima operasi produksi ditandatangani lengkap.',
      'evid_conveyor_ptw_signoff.svg', '/uploads/evid_conveyor_ptw_signoff.svg', 'image/svg+xml', '280 KB',
      'Hermawan Prasetyo', '2026-10-15 11:20:00'
    );

    // 2. Breakdown BD-2026-10-001 (Shower booster pump)
    insertEvid.run(
      'evid-06', 'breakdown', 'bd-01', 'BD-2026-10-001', 'before',
      'Temuan Kerusakan: Washer 12mm Mengganjal Impeller Pompa Booster',
      'Pompa booster bergetar dan trip arus >35A. Ditemukan ring washer 12mm tersangkut di antara sudu impeller saat casing dibuka.',
      'evid_shower_pump_debris.svg', '/uploads/evid_shower_pump_debris.svg', 'image/svg+xml', '380 KB',
      'Hermawan Prasetyo', '2026-10-22 14:40:00'
    );

    insertEvid.run(
      'evid-07', 'breakdown', 'bd-01', 'BD-2026-10-001', 'damaged_part',
      'Pemeriksaan Kerusakan Impeller & Penggantian Bearing',
      'Sudu impeller mengalami goresan deformasi radial, bearing 6208 diganti sebagai langkah preventif.',
      'evid_conveyor_bearing_replaced.svg', '/uploads/evid_conveyor_bearing_replaced.svg', 'image/svg+xml', '310 KB',
      'Dedi (Technician)', '2026-10-22 15:10:00'
    );

    // 3. PM Task task-pm-01 (Atlas Copco GA-75 Compressor)
    insertEvid.run(
      'evid-08', 'pm_task', 'task-pm-01', 'PMT-2026-001', 'after',
      'Pemeriksaan Level Oli & Pembersihan Cooler Radiator',
      'Level oli normal pada garis hijau sight glass saat running, sirip pendingin dibersihkan dengan semprotan udara kering.',
      'evid_compressor_pm_inspection.svg', '/uploads/evid_compressor_pm_inspection.svg', 'image/svg+xml', '360 KB',
      'Marsino (Technician)', '2026-10-01 10:30:00'
    );

    // 4. Facility Inspection fac-01 (Roof and Ceiling)
    insertEvid.run(
      'evid-09', 'facility_inspection', 'fac-01', 'FAC-2026-10-01', 'after',
      'Hasil Perbaikan Sealant Talang Polyurethane & Corong Scupper',
      'Pengaplikasian Sika polyurethane sealant pada sambungan talang Grid 6-8 selesai. Uji siram air tidak ada kebocoran.',
      'evid_roof_gutter_polyurethane.svg', '/uploads/evid_roof_gutter_polyurethane.svg', 'image/svg+xml', '320 KB',
      'Bambang Supriyanto', '2026-10-12 14:00:00'
    );

    console.log('Seeded 9 initial operational activity evidence records.');
  } catch (err) {
    console.error('Failed to seed evidences:', err);
  }
}

export function seedDatabase() {
  const check = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
  if (check && check.count > 0) {
    seedEvidencesIfEmpty();
    return; // Already seeded
  }

  db.exec('BEGIN TRANSACTION');

  try {
    // 1. Companies
    db.prepare(`
      INSERT INTO companies (id, code, name, address)
      VALUES ('comp-1', 'PT-NA', 'PT National Assemblers', 'Kota Bukit Indah')
    `).run();

    // 2. Plants (Configurable master data, not hardcoded)
    const insertPlant = db.prepare(`
      INSERT INTO plants (id, company_id, code, name, location, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertPlant.run('plant-na2', 'comp-1', 'NA-2', 'Plant NA-2 (AION)', 'KBI Zone O');
    insertPlant.run('plant-na3', 'comp-1', 'NA-3', 'Plant NA-3 (CHANGAN & LEAP MOTOR)', 'KBI Zone H');
    insertPlant.run('plant-na4', 'comp-1', 'NA-4', 'Plant NA-4 (INA & WAREHOUSE)', 'KBI Zone A');

    // 3. Buildings
    const insertBuilding = db.prepare(`
      INSERT INTO buildings (id, plant_id, code, name)
      VALUES (?, ?, ?, ?)
    `);
    insertBuilding.run('bld-na2-main', 'plant-na2', 'BLD-01', 'Main Assembly Hall A');
    insertBuilding.run('bld-na2-util', 'plant-na2', 'BLD-UTL', 'Central Utility & Substation NA-2');
    insertBuilding.run('bld-na3-paint', 'plant-na3', 'BLD-PNT', 'Automated Paint & Sealing Shop');
    insertBuilding.run('bld-na3-body', 'plant-na3', 'BLD-BDY', 'Body Welding & Transfer Bay');
    insertBuilding.run('bld-na4-final', 'plant-na4', 'BLD-FNL', 'Final Assembly & Shower Test Rig');

    // 4. Departments
    const insertDept = db.prepare(`
      INSERT INTO departments (id, code, name, head_person, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);
    insertDept.run('dept-hrga', 'HRGA-FAC', 'HRGA – Building Facility & Utility Maintenance', 'Hermawan Prasetyo');
    insertDept.run('dept-maint', 'MAINT-GEN', 'Maintenance Department', 'Hermawan Prasetyo');
    insertDept.run('dept-prod-eq', 'PROD-EQ', 'Production Equipment Maintenance', 'Alfin Prasetyo');
    insertDept.run('dept-mech-elec', 'MECH-ELEC', 'Mechanical & Electrical Maintenance', 'Alfin Prasetyo');

    // 5. Production Lines
    const insertLine = db.prepare(`
      INSERT INTO production_lines (id, plant_id, building_id, code, name)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLine.run('line-na2-chassis', 'plant-na2', 'bld-na2-main', 'LINE-CHA', 'Line 1 - Chassis Assembly');
    insertLine.run('line-na2-trim', 'plant-na2', 'bld-na2-main', 'LINE-TRM', 'Line 2 - Trim & Engine Drop');
    insertLine.run('line-na3-paint', 'plant-na2', 'bld-na3-paint', 'LINE-PNT', 'Paint Line & Pre-Treatment Dip');
    insertLine.run('line-na3-weld', 'plant-na3', 'bld-na3-body', 'LINE-WLD', 'Automated Robotic Welding Line');
    insertLine.run('line-na4-final', 'plant-na4', 'bld-na4-final', 'LINE-CV-FNL', 'Line 4 - CV Final & Wheel Alignment');

    // 6. Asset Categories
    const insertCat = db.prepare(`
      INSERT INTO asset_categories (id, code, name, description)
      VALUES (?, ?, ?, ?)
    `);
    insertCat.run('cat-cmp', 'CMP', 'Air Compressor', 'Rotary screw compressors and compressed air supply');
    insertCat.run('cat-dry', 'DRY', 'Air Dryer', 'Refrigerated and desiccant compressed air dryers');
    insertCat.run('cat-hst', 'HST', 'Electric Hoist', 'Overhead traveling cranes, monorails, electric chain hoists');
    insertCat.run('cat-scl', 'SCL', 'Scissor Lift', 'Hydraulic scissor lifts for chassis & body ergonomics');
    insertCat.run('cat-cvy', 'CVY', 'Conveyor and Transfer System', 'Slat conveyors, roller transfer tables, skillet conveyors');
    insertCat.run('cat-pmp', 'PMP', 'Pump and Motor', 'Cooling water circulating pumps, boiler feed, booster pumps');
    insertCat.run('cat-pnt', 'PNT', 'Painting Equipment', 'Electrostatic bells, spray booths, drying ovens, exhaust fans');
    insertCat.run('cat-sea', 'SEA', 'Sealer Pump', 'High pressure mastic and hem flange adhesive sealant dosing');
    insertCat.run('cat-man', 'MAN', 'Manipulator', 'Pneumatic zero-gravity balancers for door/glass/dash install');
    insertCat.run('cat-alg', 'ALG', 'Wheel Alignment Equipment', 'Computerized dynamic optical toe/camber alignment test bench');
    insertCat.run('cat-shw', 'SHW', 'Shower Test Equipment', 'Monsoon rain chamber for vehicle cabin leak detection');
    insertCat.run('cat-hyd', 'HYD', 'Hydrant and Fire Protection', 'Diesel & electric fire pumps, jockey pumps, sprinkler risers');
    insertCat.run('cat-ele', 'ELE', 'Electrical Panel', 'MDB 20kV transformers, capacitor banks, VFD panels');
    insertCat.run('cat-hvc', 'HVC', 'HVAC and Ventilation', 'AHU units, cooling towers, plant exhaust ventilation');
    insertCat.run('cat-bld', 'BLD', 'Building Infrastructure', 'Industrial roofing, automatic high-speed rolling doors, flooring');

    // 7. Users
    const insertUser = db.prepare(`
      INSERT OR REPLACE INTO users (id, employee_id, name, email, role, department, plant_id, status, password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertUser.run('usr-admin', 'NA-EMP-001', 'Andre', 'admin.na@nationalassemblers.co.id', 'System Administrator', 'Maintenance Department', 'plant-na2', 'Active', 'Nackp2026');
    insertUser.run('usr-mgr', 'NA-EMP-002', 'Hermawan Prasetyo', 'hermawan.p@nationalassemblers.co.id', 'Maintenance Leader - All Plant', 'Maintenance Department', 'plant-na2', 'Active', 'Hermawan@2026');
    insertUser.run('usr-ldr2', 'NA-EMP-003', 'Alfin Prasetyo', 'alfin.p@nationalassemblers.co.id', 'Maintenance Leader - NA-2', 'Production Equipment Maintenance', 'plant-na2', 'Active', 'Alfin@2026');
    insertUser.run('usr-spv', 'NA-EMP-004', 'Warto', 'warto@nationalassemblers.co.id', 'Maintenance Supervisor', 'Mechanical & Electrical Maintenance', 'plant-na2', 'Active', 'Warto@2026');
    insertUser.run('usr-pln', 'NA-EMP-005', 'Hermawan Prasetyo', 'wahyu.h@nationalassemblers.co.id', 'Maintenance Planner', 'Maintenance Department', 'plant-na2', 'Active', 'Planner@2026');
    insertUser.run('usr-tech1', 'NA-EMP-006', 'Marsino', 'marsino@nationalassemblers.co.id', 'Maintenance Technician', 'Mechanical & Electrical Maintenance', 'plant-na2', 'Active', 'Technician@2026');
    insertUser.run('usr-tech2', 'NA-EMP-007', 'Amin Irfan', 'amin.irfan@nationalassemblers.co.id', 'Maintenance Technician', 'Mechanical & Electrical Maintenance', 'plant-na2', 'Active', 'Technician@2026');
    insertUser.run('usr-tech3', 'NA-EMP-008', 'Dedi', 'dedi@nationalassemblers.co.id', 'Maintenance Technician', 'Production Equipment Maintenance', 'plant-na3', 'Active', 'Technician@2026');
    insertUser.run('usr-fac', 'NA-EMP-009', 'Warto', 'bambang.s@nationalassemblers.co.id', 'Facility / Utility Officer', 'HRGA – Building Facility & Utility Maintenance', 'plant-na2', 'Active', 'Facility@2026');
    insertUser.run('usr-str', 'NA-EMP-010', 'Andre', 'joko.s@nationalassemblers.co.id', 'Storekeeper', 'Maintenance Department', 'plant-na2', 'Active', 'Store@2026');
    insertUser.run('usr-hermawan-google', 'NA-EMP-002B', 'Hermawan Prasetyo (Google)', 'HermawanP32@gmail.com', 'Maintenance Leader - All Plant', 'Maintenance Department', 'plant-na2', 'Active', 'Hermawan@2026');

    // 8. Technicians
    const insertTech = db.prepare(`
      INSERT INTO technicians (id, employee_id, name, company_id, plant_id, department, skill_category, certifications, shift, hourly_rate, is_available, supervisor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTech.run('tech-1', 'TECH-001', 'Marsino', 'comp-1', 'plant-na2', 'Mechanical & Electrical Maintenance', 'Mechanical', 'K3 Pesawat Angkat Angkut, Vibration ISO CAT II, Alignment Specialist', 'Shift 1', 52000, 1, 'Warto');
    insertTech.run('tech-2', 'TECH-002', 'Amin Irfan', 'comp-1', 'plant-na2', 'Mechanical & Electrical Maintenance', 'Electrical & Automation', 'K3 Listrik Teknisi, Siemens S7-1500 PLC & VFD Specialist', 'Shift 1', 54000, 1, 'Warto');
    insertTech.run('tech-3', 'TECH-003', 'Dedi', 'comp-1', 'plant-na3', 'Production Equipment Maintenance', 'Mechanical & Utility', 'Pneumatics & Hydraulics Rexroth Level 2, Boiler Class 2', 'Shift 2', 51000, 1, 'Warto');

    // 9. Assets (Realistic industrial equipment)
    const insertAsset = db.prepare(`
      INSERT INTO assets (
        id, asset_tag, name, category_id, company_id, plant_id, building_id, line_id,
        manufacturer, model, serial_number, installation_date, commissioning_date,
        purchase_cost, warranty_end_date, criticality, operating_status, responsible_dept,
        assigned_tech_id, maintenance_strategy, pm_frequency, last_pm_date, next_pm_date,
        specs, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAsset.run(
      'ast-cmp-01', 'NA2-CMP-001', 'Atlas Copco GA-75+ Rotary Screw Compressor', 'cat-cmp', 'comp-1', 'plant-na2', 'bld-na2-util', null,
      'Atlas Copco', 'GA-75+ VSD', 'AIF-8839210-ID', '2022-03-15', '2022-04-01',
      850000000, '2024-04-01', 'Critical', 'Operational', 'dept-mech-elec',
      'tech-1', 'Preventive', 'Monthly', '2026-10-01', '2026-11-01',
      'Power: 75 kW, Capacity: 14.2 m3/min, Max Pressure: 8.5 bar, Elektronic Mk5 Graphic', 'Main primary air supply for Plant NA-2 pneumatic tools and transfer lifts'
    );

    insertAsset.run(
      'ast-dry-01', 'NA2-DRY-001', 'Refrigerated Compressed Air Dryer FD-285', 'cat-dry', 'comp-1', 'plant-na2', 'bld-na2-util', null,
      'Atlas Copco', 'FD-285', 'FD-2022-4411', '2022-03-15', '2022-04-01',
      195000000, '2024-04-01', 'High', 'Operational', 'dept-mech-elec',
      'tech-1', 'Preventive', 'Monthly', '2026-10-01', '2026-11-01',
      'Dew Point: +3 deg C, Refrigerant: R410A, Flow: 17.1 m3/min', 'Moisture separator for line air'
    );

    insertAsset.run(
      'ast-hst-01', 'NA2-HST-001', 'Demag 5-Ton Overhead Crane Main Chassis Drop', 'cat-hst', 'comp-1', 'plant-na2', 'bld-na2-main', 'line-na2-chassis',
      'Demag Cranes AG', 'DR-Pro 5T', 'DMG-CR-9921', '2021-08-10', '2021-09-01',
      540000000, '2023-09-01', 'Critical', 'Operational', 'dept-prod-eq',
      'tech-1', 'Preventive', 'Weekly', '2026-10-18', '2026-10-25',
      'SWL: 5,000 kg, Span: 18m, Dual speed hoist 8/1.3 m/min, Radio remote + pendant', 'Critical lifting unit for vehicle cabin & chassis mating station'
    );

    insertAsset.run(
      'ast-scl-01', 'NA2-SCL-002', 'Bishamon Hydraulic Scissor Lift Table Station 4', 'cat-scl', 'comp-1', 'plant-na2', 'bld-na2-main', 'line-na2-trim',
      'Bishamon Japan', 'LX-200HW', 'BSH-882103', '2021-11-20', '2021-12-05',
      145000000, '2023-12-05', 'Medium', 'Under Maintenance', 'dept-prod-eq',
      'tech-3', 'Preventive', 'Monthly', '2026-09-28', '2026-10-28',
      'Capacity: 2,000 kg, Stroke: 1,300 mm, Hydraulic Pack: 2.2 kW 380V', 'Currently undergoing hydraulic seal cylinder replacement'
    );

    insertAsset.run(
      'ast-cvy-01', 'NA2-CVY-001', 'Main Slat Conveyor Assembly Line Zone 1-3', 'cat-cvy', 'comp-1', 'plant-na2', 'bld-na2-main', 'line-na2-chassis',
      'Tsubakimoto Chain', 'TSU-HEAVY-SLAT-60', 'TBK-2020-004', '2020-06-15', '2020-07-01',
      1200000000, '2022-07-01', 'Critical', 'Operational', 'dept-prod-eq',
      'tech-1', 'Preventive', 'Monthly', '2026-10-05', '2026-11-05',
      'Length: 64 meters, Slat Width: 2,400 mm, SEW Eurodrive Geared Motor 11 kW with Inverter', 'Continuous indexing automotive chassis assembly backbone'
    );

    insertAsset.run(
      'ast-pnt-01', 'NA3-PNT-001', 'Durr EcoBell3 Automated Paint Atomizer Station', 'cat-pnt', 'comp-1', 'plant-na3', 'bld-na3-paint', 'line-na3-paint',
      'Durr Systems', 'EcoBell3 Ci-EC', 'DRR-BELL-2023-09', '2023-01-15', '2023-02-20',
      1850000000, '2025-02-20', 'Critical', 'Operational', 'dept-prod-eq',
      'tech-2', 'Preventive', 'Weekly', '2026-10-19', '2026-10-26',
      'Rotation: up to 60,000 rpm air turbine, High voltage direct charge 100 kV, Color changer valve block', 'Automated basecoat & clearcoat finishing robot head'
    );

    insertAsset.run(
      'ast-sea-01', 'NA3-SEA-001', 'SCA Schucker 2K Adhesive & Sealer Pump Dispenser', 'cat-sea', 'comp-1', 'plant-na3', 'bld-na3-paint', 'line-na3-paint',
      'Atlas Copco / SCA', 'Micro-Dispenser Sys 400', 'SCA-400-8812', '2022-09-10', '2022-10-01',
      620000000, '2024-10-01', 'High', 'Operational', 'dept-prod-eq',
      'tech-2', 'Preventive', 'Monthly', '2026-09-30', '2026-10-30',
      'Pressure: 280 bar, Heated hose line 65 deg C, Dual tandem drum unloader', 'Hem flange adhesive for windshield & sunroof sealant'
    );

    insertAsset.run(
      'ast-alg-01', 'NA4-ALG-001', 'Hunter Engineering 3D Dynamic Wheel Alignment System', 'cat-alg', 'comp-1', 'plant-na4', 'bld-na4-final', 'line-na4-final',
      'Hunter Engineering', 'Hawkeye Elite HE421', 'HNTR-ALIGN-7721', '2023-05-18', '2023-06-01',
      780000000, '2025-06-01', 'High', 'Operational', 'dept-mech-elec',
      'tech-1', 'Preventive', 'Monthly', '2026-10-02', '2026-11-02',
      'High definition optical cameras 4x, Floating turn-plates, Pneumatic wheel clamps', 'Final end-of-line verification for commercial vehicles'
    );

    insertAsset.run(
      'ast-shw-01', 'NA4-SHW-001', 'Automated Water Leak Shower Test Monsoon Booth', 'cat-shw', 'comp-1', 'plant-na4', 'bld-na4-final', 'line-na4-final',
      'PT National Engineering', 'MONSOON-TEST-400', 'SHW-NA4-001', '2022-12-01', '2023-01-10',
      420000000, '2024-01-10', 'Medium', 'Breakdown', 'dept-mech-elec',
      'tech-3', 'Preventive', 'Weekly', '2026-10-15', '2026-10-22',
      '120 multi-angle spray nozzles, Recirculation water tank 15,000L, Booster pump 15 kW, 2.5 bar water pressure', 'Currently experiencing water booster pump trip due to impeller clogging'
    );

    insertAsset.run(
      'ast-hyd-01', 'NA2-HYD-001', 'Main Fire Hydrant Diesel Booster Pump 1500 GPM', 'cat-hyd', 'comp-1', 'plant-na2', 'bld-na2-util', null,
      'Ebara Pumps', '150x100 FSJA + Cummins Diesel 6BT', 'EBR-HYD-2019-11', '2019-10-10', '2019-11-01',
      480000000, '2021-11-01', 'Critical', 'Operational', 'dept-hrga',
      'tech-3', 'Preventive', 'Weekly', '2026-10-21', '2026-10-28',
      'Capacity: 1500 GPM @ 10 bar, 6-cylinder turbo diesel engine, Automatic starting panel NFPA-20 compliant', 'Primary plant fire protection pump system'
    );

    insertAsset.run(
      'ast-ele-01', 'NA2-MDB-001', 'Main Distribution Board (MDB) 20kV / 380V Substation', 'cat-ele', 'comp-1', 'plant-na2', 'bld-na2-util', null,
      'Schneider Electric', 'Prisma Plus P 2500kVA', 'SCH-MDB-2500-01', '2020-04-10', '2020-05-01',
      1600000000, '2022-05-01', 'Critical', 'Operational', 'dept-mech-elec',
      'tech-2', 'Preventive', 'Monthly', '2026-10-10', '2026-11-10',
      'Trafo: 2500 kVA Cast Resin, ACB Masterpact MTZ 4000A, Automatic Power Factor Controller 600 kVAR', 'Main electrical incoming power feed for Plant NA-2'
    );

    insertAsset.run(
      'ast-hvc-01', 'NA3-AHU-001', 'Cleanroom Paint Shop Air Handling Unit AHU-01', 'cat-hvc', 'comp-1', 'plant-na3', 'bld-na3-paint', 'line-na3-paint',
      'Daikin Applied', 'D-AHU Modular 35,000 CFM', 'DKN-AHU-2022-03', '2022-05-20', '2022-06-15',
      890000000, '2024-06-15', 'Critical', 'Operational', 'dept-hrga',
      'tech-2', 'Preventive', 'Monthly', '2026-10-08', '2026-11-08',
      '35,000 CFM, HEPA filter stage H13, Humidity control 65% RH +- 5%, Chilled water cooling coil', 'Crucial climate control for automotive finish quality'
    );

    // 10. Spare Parts Catalog
    const insertPart = db.prepare(`
      INSERT INTO spare_parts (
        id, part_number, name, specification, category, compatible_equipment,
        uom, warehouse_location, min_stock, max_stock, reorder_point,
        current_stock, reserved_stock, average_cost, preferred_vendor, lead_time_days, last_purchase_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPart.run(
      'part-01', 'SKF-6208-2RS', 'Deep Groove Ball Bearing 6208-2RS1/C3', '40x80x18mm, Rubber sealed, High speed', 'Mechanical', 'Air Compressor GA-75, Water Booster Pumps',
      'PCS', 'Rack A-01-03 (NA-2)', 10, 40, 15,
      18, 2, 145000, 'PT Cipta Mandiri Teknik', 3, '2026-09-12'
    );

    insertPart.run(
      'part-02', 'FST-VUVG-L10', 'Festo Solenoid Valve 5/2 Way 24VDC', 'VUVG-L10-M52-MT-M7-1P3, IP65 with LED', 'Pneumatic', 'Manipulators, Scissor Lifts, Conveyor Stops',
      'PCS', 'Rack B-03-01 (NA-2)', 5, 25, 8,
      12, 1, 880000, 'PT Festo Indonesia', 7, '2026-08-20'
    );

    insertPart.run(
      'part-03', 'SCH-LC1D32M7', 'Schneider TeSys D Contactor 32A 220VAC', '3P NO, 15 kW 400V, Coil 220V 50/60Hz', 'Electrical', 'Electric Hoists, Motor Starters, AHU',
      'PCS', 'Rack E-02-04 (NA-3)', 6, 20, 10,
      4, 0, 475000, 'PT Schneider Electric Dist', 5, '2026-07-15'
    ); // Low stock alert! (current 4 < reorder 10)

    insertPart.run(
      'part-04', 'AC-FLT-2901', 'Atlas Copco Oil Separator Filter Element', 'PN: 2901-1626-10 for GA-75 VSD', 'Consumable', 'Compressor GA-75+',
      'PCS', 'Rack A-02-01 (NA-2)', 2, 8, 3,
      1, 1, 3850000, 'PT Atlas Copco Indonesia', 14, '2026-06-10'
    ); // Stock out warning! (available = 0)

    insertPart.run(
      'part-05', 'HYD-SEAL-80x10', 'Polyurethane Hydraulic Piston Rod Seal Set', '80mm Bore x 10mm Rod, 350 bar rated', 'Hydraulic', 'Bishamon Scissor Lifts',
      'SET', 'Rack C-01-02 (NA-2)', 4, 15, 6,
      8, 2, 320000, 'PT Sealindo Perkasa', 4, '2026-09-05'
    );

    insertPart.run(
      'part-06', 'MBL-ROTO-XTD', 'Atlas Copco Roto-Xtend Synthetic Oil (20L)', 'Synthetic lubricant for rotary screw compressors, 4000h rated', 'Lubricant', 'Air Compressor GA-75+',
      'CAN', 'Chemical Bay Shed C', 3, 10, 4,
      5, 0, 4200000, 'PT Atlas Copco Indonesia', 5, '2026-08-15'
    );

    insertPart.run(
      'part-07', 'DRR-NOZ-035', 'Durr EcoBell Paint Turbine Nozzle Ring 35mm', 'Precision tungsten carbide, balanced to 70k RPM', 'Consumable', 'Durr Paint Atomizer',
      'PCS', 'Cleanroom Safe 01 (NA-3)', 2, 6, 3,
      3, 0, 12500000, 'Durr Systems SEA', 21, '2026-05-18'
    );

    // 11. Preventive Maintenance Plans & Tasks
    const insertPlan = db.prepare(`
      INSERT INTO pm_plans (id, plan_code, title, asset_id, frequency, estimated_hours, department, assigned_tech_id, checklist_template)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertPlan.run('plan-01', 'PM-CMP-M', 'Monthly Inspection & Filter Cleaning Atlas Copco GA-75', 'ast-cmp-01', 'Monthly', 3.0, 'dept-mech-elec', 'tech-1', 'Oil level, oil filter delta P, V-belt tension, cooler cleanliness, condensate drain check');
    insertPlan.run('plan-02', 'PM-HST-W', 'Weekly Safety Limit Switch & Wire Rope Lubrication Crane', 'ast-hst-01', 'Weekly', 1.5, 'dept-prod-eq', 'tech-1', 'Wire rope fraying, upper limit switch, brake air gap, hook latch, pendant emergency stop');
    insertPlan.run('plan-03', 'PM-PNT-W', 'Weekly Paint Bell High Voltage & Turbine Cleaning', 'ast-pnt-01', 'Weekly', 2.0, 'dept-prod-eq', 'tech-2', 'Cascade voltage test, solvent flush nozzle, bearing vibration check, purge seal inspection');
    insertPlan.run('plan-04', 'PM-HYD-W', 'Weekly Diesel Fire Hydrant Engine Warm-up & Test Run', 'ast-hyd-01', 'Weekly', 1.0, 'dept-hrga', 'tech-3', 'Battery voltage, fuel level, cooling water jacket, auto start solenoid, 10-minute full flow test');

    const insertTask = db.prepare(`
      INSERT INTO pm_tasks (
        id, task_code, plan_id, asset_id, due_date, planned_start, planned_end,
        actual_start, actual_end, assigned_tech_id, status, checklist_results,
        abnormalities, supervisor_verification, notes, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTask.run(
      'task-pm-01', 'PMT-2026-001', 'plan-01', 'ast-cmp-01', '2026-10-01', '2026-10-01 08:00', '2026-10-01 11:00',
      '2026-10-01 08:15', '2026-10-01 10:45', 'tech-1', 'Completed',
      'All 8 checklist points verified normal. Oil level normal. Cooler coil cleaned with compressed air.',
      'None', 'Verified on time by Warto', 'Oil sample sent to lab for 4000hr analysis.', '2026-10-01 11:00'
    );

    insertTask.run(
      'task-pm-02', 'PMT-2026-002', 'plan-02', 'ast-hst-01', '2026-10-18', '2026-10-18 09:00', '2026-10-18 10:30',
      '2026-10-18 09:10', '2026-10-18 10:40', 'tech-1', 'Completed',
      'Wire rope inspected, no broken strands found. Cleaned and relubricated with wire rope grease. Emergency stop response < 0.2s.',
      'None', 'Warto', 'Compliant with Disnaker safety standard.', '2026-10-18 11:00'
    );

    insertTask.run(
      'task-pm-03', 'PMT-2026-003', 'plan-03', 'ast-pnt-01', '2026-10-19', '2026-10-19 07:00', '2026-10-19 09:00',
      '2026-10-19 07:05', '2026-10-19 09:20', 'tech-2', 'Completed',
      'Bell cup ultrasonic cleaning performed. Voltage output verified at 90 kV nominal.',
      'Minor paint build-up on bell shroud removed', 'Warto', 'Bell test spray pattern 100% uniform.', '2026-10-19 10:00'
    );

    insertTask.run(
      'task-pm-04', 'PMT-2026-004', 'plan-02', 'ast-hst-01', '2026-10-25', '2026-10-25 09:00', '2026-10-25 10:30',
      null, null, 'tech-1', 'Scheduled',
      'Pending execution', 'None', null, 'Upcoming scheduled weekly inspection', null
    );

    insertTask.run(
      'task-pm-05', 'PMT-2026-005', 'plan-04', 'ast-hyd-01', '2026-10-21', '2026-10-21 08:30', '2026-10-21 09:30',
      null, null, 'tech-3', 'Overdue',
      'Not completed on due date due to diesel fuel delivery delay', 'Task delayed > 48 hours', null, 'Critical utility task overdue. Requires urgent completion.', null
    );

    // 12. Breakdowns (Corrective & Emergency Breakdown records)
    const insertBreakdown = db.prepare(`
      INSERT INTO breakdowns (
        id, breakdown_number, report_datetime, company_id, plant_id, asset_id, location,
        category, failure_description, machine_condition, production_impact, safety_impact,
        priority, reported_by, assigned_tech_id, initial_response_time, repair_start_time,
        repair_completion_time, downtime_minutes, temporary_countermeasure, root_cause,
        five_why, corrective_action, replacement_parts, trial_run_result, verified_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertBreakdown.run(
      'bd-01', 'BD-2026-10-001', '2026-10-22 14:15', 'comp-1', 'plant-na4', 'ast-shw-01', 'Plant NA-4 Final Inspection Bay',
      'Mechanical', 'Monsoon Shower test booster pump tripped on overload. No water spray to cabin leak test rig.', 'Machine Stoppage',
      'Line Stopped', 'None', 'High', 'Hermawan Prasetyo (Leader - All Plant)', 'tech-3', '2026-10-22 14:25', '2026-10-22 14:35',
      null, 185, 'Diverted finished units to staging holding bay while maintenance disassembles pump housing',
      'Foreign metal debris entered suction pipe and wedged in impeller vanes, stalling the 15 kW motor',
      JSON.stringify([
        'Why did the pump trip? -> Motor drew excessive current over 35A overload threshold.',
        'Why excessive current? -> Impeller rotor was physically jammed.',
        'Why jammed? -> A 12mm washer fell into the open recirculating suction sump.',
        'Why was suction sump open? -> Sump wire mesh filter screen was dislodged during water change.',
        'Why dislodged? -> Retaining bracket bolt was missing and not secured after previous cleaning.'
      ]),
      'Clean pump chamber, inspect bearings, re-weld sump strainer basket and install dual tamper-proof securing clamps',
      'Bearing 6208-2RS replaced as precautionary measure against axial shock',
      'In progress - water priming test scheduled', 'Warto', 'In Progress'
    );

    insertBreakdown.run(
      'bd-02', 'BD-2026-10-002', '2026-10-15 10:20', 'comp-1', 'plant-na2', 'ast-cvy-01', 'Line 1 Chassis Station 8',
      'Electrical', 'Conveyor motor inverter tripped with error OC3 (Overcurrent during deceleration). Slat line paused.', 'Line Stoppage',
      'Line Stopped', 'None', 'Critical', 'Alfin Prasetyo (Leader NA-2)', 'tech-1', '2026-10-15 10:24', '2026-10-15 10:30',
      '2026-10-15 11:15', 55, 'Switched to secondary standby drive motor after clearing jammed pallet guide roller',
      'Damaged side guide bearing caused mechanical friction resistance to spike above inverter current trip limit',
      JSON.stringify([
        'Why did conveyor stop? -> SEW inverter showed OC3 trip.',
        'Why OC3 trip? -> Motor stalled trying to pull bound slat segment.',
        'Why bound? -> Side guide roller bearing seized.',
        'Why seized? -> Grease dried out under heavy continuous chassis payload.'
      ]),
      'Replaced seized roller guide assembly and purged auto-greaser distribution block',
      'Roller Guide Bearing 6205, Festo Solenoid valve cleaned',
      'Trial run 30 minutes under full payload passed smoothly with zero temperature elevation', 'Warto', 'Completed'
    );

    // 13. Work Orders
    const insertWO = db.prepare(`
      INSERT INTO work_orders (
        id, wo_number, request_date, requester, company_id, plant_id, location,
        asset_id, wo_type, problem_description, priority, work_scope, assigned_tech_id,
        supporting_manpower, planned_start, planned_finish, actual_start, actual_finish,
        labor_hours, estimated_cost, actual_cost, risk_assessment, safety_precautions,
        completion_notes, verification_status, verified_by, status, linked_breakdown_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertWO.run(
      'wo-01', 'WO-2026-00101', '2026-10-15', 'Alfin Prasetyo', 'comp-1', 'plant-na2', 'Main Assembly Hall A',
      'ast-cvy-01', 'Emergency Breakdown', 'Emergency repair of jammed guide roller and inverter reset on Main Slat Conveyor', 'Critical',
      'Replace seized guide roller, test motor insulation, recalibrate inverter acceleration profile', 'tech-1',
      'Marsino, Amin Irfan', '2026-10-15 10:30', '2026-10-15 11:30', '2026-10-15 10:30', '2026-10-15 11:15',
      1.5, 1200000, 950000, 'Pinch point hazard near moving slat plates', 'Lockout/Tagout (LOTO) breaker executed, safety signs posted',
      'Roller replaced with high-temp shielded unit. Tested at 100% capacity.', 'Approved', 'Warto', 'Completed', 'bd-02'
    );

    insertWO.run(
      'wo-02', 'WO-2026-00102', '2026-10-22', 'Hermawan Prasetyo', 'comp-1', 'plant-na4', 'Plant NA-4 Final Inspection Bay',
      'ast-shw-01', 'Emergency Breakdown', 'Shower test booster pump overhaul and suction line strainer restoration', 'High',
      'Dismantle pump casing, clean debris, replace bearing, reinstall sump basket with locking pins', 'tech-3',
      'Dedi, Marsino', '2026-10-22 14:35', '2026-10-22 18:30', '2026-10-22 14:35', null,
      3.0, 2500000, 1850000, 'Wet floor slip hazard, electrical water hazard', 'Isolate 380V pump motor power, wear rubber insulated boots',
      'Impeller cleaned. Waiting for replacement gasket curing.', 'Pending Approval', null, 'In Progress', 'bd-01'
    );

    insertWO.run(
      'wo-03', 'WO-2026-00103', '2026-10-18', 'Warto', 'comp-1', 'plant-na2', 'Main Assembly Hall A Station 4',
      'ast-scl-01', 'Corrective Maintenance', 'Hydraulic cylinder seal leaking oil on Scissor Lift Table Station 4', 'Medium',
      'Re-pack hydraulic piston seal, bleed air from hydraulic circuit, refill ISO VG 46 fluid', 'tech-1',
      'Marsino, Amin Irfan', '2026-10-20 08:00', '2026-10-20 12:00', '2026-10-20 08:15', null,
      4.0, 1500000, 980000, 'High pressure oil injection, heavy falling hazard', 'Insert mechanical safety locking chocks under scissor arms before working underneath',
      'Parts issued from warehouse. Waiting for maintenance window during shift handover.', 'Pending Approval', null, 'Waiting for Parts', null
    );

    insertWO.run(
      'wo-04', 'WO-2026-00104', '2026-10-10', 'Wahyu Hidayat', 'comp-1', 'plant-na3', 'Paint & Body Bay',
      'ast-pnt-01', 'Preventive Maintenance', 'Scheduled 6-Month Calibration of Durr Paint Bell Turbine & High Voltage System', 'High',
      'Megger test high voltage cable, check bell turbine runout, replace high pressure solvent seals', 'tech-2',
      'Amin Irfan, Dedi', '2026-10-24 08:00', '2026-10-24 14:00', null, null,
      6.0, 4800000, 0, 'Flammable paint solvent vapors, high voltage static electricity', 'Check explosion-proof grounding, verify ATEX certification of tools',
      'Scheduled for upcoming Saturday maintenance shutdown.', 'Pending Approval', null, 'Open', null
    );

    insertWO.run(
      'wo-05', 'WO-2026-00105', '2026-10-12', 'Bambang Supriyanto', 'comp-1', 'plant-na2', 'Plant NA-2 Facility Roof',
      null, 'Facility Repair', 'Repair damaged rainwater gutter and downspout near Bay 6 causing minor water ingress', 'Low',
      'Clean sediment, patch gutter seam with polyurethane sealant, replace rusted support bracket', 'tech-3',
      'Dedi, Vendor Cipta', '2026-10-16 09:00', '2026-10-16 15:00', '2026-10-16 09:30', '2026-10-16 14:30',
      5.0, 3200000, 2900000, 'Working at height (> 6 meters)', 'Full body harness tied to lifeline, mobile aerial work platform deployed',
      'Gutter seam resealed. Leak test simulated with hose water passed.', 'Approved', 'Warto', 'Closed', null
    );

    // 14. Work Order Parts Log
    const insertWOParts = db.prepare(`
      INSERT INTO work_order_parts (id, work_order_id, part_id, quantity, unit_cost, total_cost, issued_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertWOParts.run('wop-01', 'wo-01', 'part-01', 2, 145000, 290000, 'Joko Susilo (Storekeeper)');
    insertWOParts.run('wop-02', 'wo-02', 'part-01', 1, 145000, 145000, 'Joko Susilo (Storekeeper)');
    insertWOParts.run('wop-03', 'wo-03', 'part-05', 2, 320000, 640000, 'Joko Susilo (Storekeeper)');

    // 15. Inventory Transactions
    const insertTxn = db.prepare(`
      INSERT INTO inventory_transactions (
        id, transaction_code, part_id, transaction_type, reference_number,
        work_order_id, quantity, unit_cost, total_cost, balance_before,
        balance_after, performed_by, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTxn.run('txn-01', 'TXN-GR-2026-090', 'part-01', 'Goods Receipt', 'PO-NA-2026-081', null, 20, 145000, 2900000, 0, 20, 'Joko Susilo', 'Received from PT Cipta Mandiri');
    insertTxn.run('txn-02', 'TXN-IS-2026-091', 'part-01', 'Issue to Work Order', 'WO-2026-00101', 'wo-01', 2, 145000, 290000, 20, 18, 'Joko Susilo', 'Issued to tech Agus Setiawan for Slat Conveyor repair');

    // 16. Vendors
    const insertVendor = db.prepare(`
      INSERT INTO vendors (id, vendor_code, name, service_category, contact_person, phone, email, contract_period, rating, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertVendor.run('vnd-01', 'VND-AC', 'PT Atlas Copco Indonesia', 'Equipment Overhaul & Compressors', 'Rudi Hermawan', '+62-21-7801008', 'service.id@atlascopco.com', '2025-01-01 to 2026-12-31', 4.9, 'Official OEM compressor service provider');
    insertVendor.run('vnd-02', 'VND-SEW', 'PT SEW Eurodrive Indonesia', 'Gearmotors & Inverter Drives', 'Linda Kusuma', '+62-21-5940321', 'sales@sew-eurodrive.id', '2025-06-01 to 2027-06-01', 4.7, 'Drives, inverters, and heavy conveyor gearboxes');
    insertVendor.run('vnd-03', 'VND-FST', 'PT Festo Indonesia', 'Pneumatics & Automation', 'Andy Wijaya', '+62-21-27507900', 'sales_id@festo.com', '2024-01-01 to 2026-12-31', 4.8, 'Pneumatic valves, cylinders, valve terminals');
    insertVendor.run('vnd-04', 'VND-CPT', 'PT Cipta Mandiri Teknik', 'General Mechanical & Bearing Supplier', 'Hendra Salim', '+62-21-4602288', 'ciptamandiri@cbn.net.id', 'Open Contract', 4.5, 'SKF bearings, v-belts, transmission sprockets');
    insertVendor.run('vnd-05', 'VND-FAC', 'PT Prima Karya Sarana', 'Building Facility & Civil Works', 'Sunardi', '+62-812-9988776', 'primakarya@gmail.com', '2026-01-01 to 2026-12-31', 4.3, 'Roofing, epoxy flooring, drainage, fabrication');

    // 17. Facility Inspections
    const insertFac = db.prepare(`
      INSERT INTO facility_inspections (
        id, inspection_code, facility_category, plant_id, building_id,
        area_description, technical_condition, findings, corrective_action,
        inspector, inspection_date, linked_work_order_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertFac.run(
      'fac-01', 'FAC-2026-10-01', 'Roof and Ceiling', 'plant-na2', 'bld-na2-main',
      'Roof Truss Grid 6-8 Assembly Hall', 'Minor Defect', 'Rainwater gutter sealant weathered, minor dripping during thunderstorm',
      'Reseal lap joints with sika polyurethane and install overflow scupper', 'Bambang Supriyanto', '2026-10-12', 'wo-05', 'Completed'
    );
    insertFac.run(
      'fac-02', 'FAC-2026-10-02', 'Lighting', 'plant-na3', 'bld-na3-body',
      'Body Welding Inspection Bay 2', 'Requires Action', '3 out of 10 High-bay LED 150W fixtures flickering, lux reading dropped to 280 lux (min required 500 lux)',
      'Replace LED driver units and clean reflective diffusers', 'Gilang Pratama', '2026-10-20', null, 'Open'
    );
    insertFac.run(
      'fac-03', 'FAC-2026-10-03', 'Plumbing', 'plant-na2', 'bld-na2-main',
      'Main Restroom Block West', 'Normal / Good', 'All sanitary flush valves operational, water pressure 2.2 bar, zero leaks',
      'Routine bi-weekly inspection complete', 'Bambang Supriyanto', '2026-10-22', null, 'Completed'
    );

    // 18. Utility Meters & Readings
    const insertMeter = db.prepare(`
      INSERT INTO utility_meters (id, meter_code, utility_type, plant_id, location, unit_of_measure, tariff_per_unit, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertMeter.run('mtr-01', 'MTR-PLN-NA2', 'Electrical Power', 'plant-na2', 'Substation Trafo 2500kVA NA-2', 'kWh', 1444.70, 'Main PLN 20kV incoming feeder for Plant NA-2');
    insertMeter.run('mtr-02', 'MTR-PLN-NA3', 'Electrical Power', 'plant-na3', 'Substation Paint Shop NA-3', 'kWh', 1444.70, 'Paint shop robotic line electrical intake');
    insertMeter.run('mtr-03', 'MTR-AIR-NA2', 'Compressed Air', 'plant-na2', 'Compressor Room Header NA-2', 'Nm3', 380.00, 'Central compressed air flow meter (7.5 bar header)');
    insertMeter.run('mtr-04', 'MTR-WTR-NA2', 'Water Supply', 'plant-na2', 'Deep Well & PDAM Intake NA-2', 'm3', 12500.00, 'Industrial water and cooling tower make-up meter');

    const insertReading = db.prepare(`
      INSERT INTO utility_readings (id, meter_id, reading_date, previous_reading, current_reading, consumption, total_cost, recorded_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertReading.run('rdg-01', 'mtr-01', '2026-10-01', 1284500, 1342100, 57600, 83214720, 'Bambang Supriyanto', 'September 2026 Billing Period');
    insertReading.run('rdg-02', 'mtr-01', '2026-10-22', 1342100, 1381200, 39100, 56487770, 'Gilang Pratama', 'Mid-month October reading check');
    insertReading.run('rdg-03', 'mtr-03', '2026-10-22', 450120, 482400, 32280, 12266400, 'Gilang Pratama', 'Air consumption nominal at 14.5 m3/min average');
    insertReading.run('rdg-04', 'mtr-04', '2026-10-22', 38200, 41150, 2950, 36875000, 'Bambang Supriyanto', 'Water supply normal. Cooling tower bleed-off monitored.');

    // 19. Maintenance Budgets (Fiscal 2026)
    const insertBudget = db.prepare(`
      INSERT INTO maintenance_budgets (id, plant_id, fiscal_year, month, category, budget_amount, actual_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertBudget.run('bgt-01', 'plant-na2', 2026, 10, 'PM Budget', 45000000, 28500000, 'October PM routine budget');
    insertBudget.run('bgt-02', 'plant-na2', 2026, 10, 'Corrective Budget', 35000000, 19200000, 'October breakdown & repair contingency');
    insertBudget.run('bgt-03', 'plant-na2', 2026, 10, 'Spare Parts Budget', 60000000, 41200000, 'Fast-moving bearing & pneumatic inventory replenishment');
    insertBudget.run('bgt-04', 'plant-na3', 2026, 10, 'PM Budget', 55000000, 34000000, 'Paint shop automation PM');
    insertBudget.run('bgt-05', 'plant-na3', 2026, 10, 'Vendor Services', 40000000, 18500000, 'Durr & Fanuc specialized robot service contract');

    // 20. Purchase Requests
    const insertPR = db.prepare(`
      INSERT INTO purchase_requests (
        id, pr_number, work_order_id, description, category, quantity, uom,
        estimated_cost, requester, plant_id, approval_status, po_number, vendor_name, delivery_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertPR.run(
      'pr-01', 'PR-2026-10-044', 'wo-03', 'Polyurethane Hydraulic Cylinder Seal Kit for Bishamon Lift', 'Spare Parts',
      4, 'SET', 1280000, 'Warto', 'plant-na2', 'Approved', 'PO-NA-2026-10-092', 'PT Sealindo Perkasa', 'Shipped'
    );
    insertPR.run(
      'pr-02', 'PR-2026-10-045', 'wo-04', 'Durr EcoBell3 High Voltage Cascade Replacement Unit', 'Specialized Tool',
      1, 'SET', 28500000, 'Hermawan Prasetyo', 'plant-na3', 'PO Issued', 'PO-NA-2026-10-098', 'Durr Systems SEA', 'Pending'
    );

    // 21. Documents
    const insertDoc = db.prepare(`
      INSERT INTO documents (id, doc_number, title, category, asset_id, plant_id, file_name, file_size, uploaded_by, upload_date, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertDoc.run('doc-01', 'DOC-MAN-01', 'Atlas Copco GA-75+ Instruction Manual & Parts List', 'Equipment Manual', 'ast-cmp-01', 'plant-na2', 'AtlasCopco_GA75_Manual.pdf', '14.2 MB', 'Warto', '2026-02-10', 'Compressor, GA-75, Manual, Parts');
    insertDoc.run('doc-02', 'DOC-SOP-02', 'SOP-MNT-012: Lockout / Tagout (LOTO) Energy Isolation Procedure', 'SOP', null, 'plant-na2', 'SOP_MNT_012_LOTO_Procedure_Rev3.pdf', '2.8 MB', 'Hermawan Prasetyo', '2026-01-15', 'Safety, LOTO, K3, Isolation');
    insertDoc.run('doc-03', 'DOC-DWG-03', 'Plant NA-2 20kV Substation Single Line Diagram (SLD)', 'Electrical Drawing', 'ast-ele-01', 'plant-na2', 'NA2_Substation_SLD_Rev4.pdf', '8.5 MB', 'Warto', '2026-03-22', 'Electrical, Transformer, SLD, Substation');
    insertDoc.run('doc-04', 'DOC-HIR-04', 'HIRADC Hazard Identification & Risk Assessment: Overhead Crane Maintenance', 'HIRADC / Risk Assessment', 'ast-hst-01', 'plant-na2', 'HIRADC_Crane_MNT_2026.pdf', '1.9 MB', 'Warto', '2026-04-05', 'K3, HIRADC, Crane, Working at Height');

    // 22. Audit Logs
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, user_name, action, module, record_id, description, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run('aud-01', 'System Administrator', 'SYSTEM_INIT', 'System Settings', 'GLOBAL', 'Initial MMS database schema provisioned and calibrated for PT National Assemblers', '127.0.0.1');
    insertAudit.run('aud-02', 'Hermawan Prasetyo', 'STATUS_CHANGE', 'Work Orders', 'wo-01', 'Approved Work Order WO-2026-00101 after conveyor test run', '192.168.10.15');
    insertAudit.run('aud-03', 'Joko Susilo', 'STOCK_ISSUE', 'Inventory', 'part-01', 'Issued 2 units of Bearing 6208 to WO-2026-00101', '192.168.10.22');

    // 23. System Settings
    const insertSetting = db.prepare(`
      INSERT INTO system_settings (key, value, description)
      VALUES (?, ?, ?)
    `);
    insertSetting.run('company_name', 'PT National Assemblers', 'Official Company Name');
    insertSetting.run('currency', 'IDR', 'Operating Currency Code');
    insertSetting.run('currency_symbol', 'Rp', 'Currency Symbol');
    insertSetting.run('timezone', 'Asia/Jakarta', 'Standard Local Operating Timezone (WIB)');
    insertSetting.run('pm_lead_days', '7', 'Days before PM due date to send reminder alerts');
    insertSetting.run('working_hours_day', '16', 'Operating production hours per plant per day (2 Shifts)');
    insertSetting.run('working_days_month', '25', 'Standard planned production days per month');
    insertSetting.run('hourly_labor_rate', '50000', 'Standard internal technician hourly cost in IDR');
    insertSetting.run('enable_audit_trail', 'true', 'Record every critical data modification');

    db.exec('COMMIT');
    console.log('NA-MMS database successfully seeded with operational data.');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Failed to seed NA-MMS database:', err);
    throw err;
  }
}

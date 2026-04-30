// Seed MongoDB with demo data if collections are empty
import { HealthCenter } from '../models/HealthCenter';
import { StorageRoom }  from '../models/StorageRoom';
import { Fridge }       from '../models/Fridge';
import { Device }       from '../models/Device';
import { Vaccine }      from '../models/Vaccine';
import { Alert }        from '../models/Alert';
import { Role }         from '../models/Role';
import { User }         from '../models/User';
import { ALL_PERMISSIONS } from './mockStore';

export async function seedIfEmpty(): Promise<void> {
  const healthCenterCount = await HealthCenter.countDocuments();
  const roleCount = await Role.countDocuments();
  
  if (healthCenterCount > 0 && roleCount > 0) {
    console.log('📦 MongoDB already seeded — skipping.');
    return;
  }

  console.log('🌱 Seeding MongoDB with demo data...');

  // ── Roles ──────────────────────────────────────────────────────────────────
  const [roleAdmin, roleManager, roleNurse] = await Promise.all([
    Role.findOneAndUpdate({ name: 'Super Admin' }, { 
      name: 'Super Admin', 
      description: 'Full system access', 
      permissions: ALL_PERMISSIONS 
    }, { upsert: true, new: true }),
    Role.findOneAndUpdate({ name: 'Health Center Manager' }, { 
      name: 'Health Center Manager',
      description: 'Manage a health center', 
      permissions: ['dashboard:view','monitoring:view','fridges:view','devices:view','vaccines:view','vaccines:create','vaccines:edit','alerts:view','alerts:acknowledge','controls:operate','predictions:view','reports:view'] 
    }, { upsert: true, new: true }),
    Role.findOneAndUpdate({ name: 'Nurse / Technician' }, { 
      name: 'Nurse / Technician',
      description: 'Read-only monitoring', 
      permissions: ['dashboard:view','monitoring:view','vaccines:view','alerts:view','predictions:view','reports:view'] 
    }, { upsert: true, new: true }),
  ]);

  // ── Health Centers ─────────────────────────────────────────────────────────
  const [hc1, hc2, hc3] = await HealthCenter.insertMany([
    { name: 'City Health Center',  type: 'health_center', region: 'Western Region', district: 'Central District', address: '12 Health Avenue, Central District', contactName: 'Dr. James Ouedraogo',  contactPhone: '+226 70 11 22 33', status: 'active' },
    { name: 'North Dispensary',    type: 'dispensary',    region: 'Western Region', district: 'North District',   address: '45 Main Street, North District',     contactName: 'Nurse Marie Sawadogo', contactPhone: '+226 76 44 55 66', status: 'active' },
    { name: 'East CSPS',           type: 'csps',          region: 'Eastern Region', district: 'East District',    address: 'Central Quarter, East District',     contactName: 'Nurse Jean Compaore',  contactPhone: '+226 65 77 88 99', status: 'active' },
  ]);

  // ── Storage Rooms ──────────────────────────────────────────────────────────
  const [room1, room2, room3] = await StorageRoom.insertMany([
    { name: 'Cold Storage Room',    healthCenterId: hc1._id, ipAddress: '192.168.1.20', status: 'online' },
    { name: 'Vaccine Storage Room', healthCenterId: hc2._id, ipAddress: '192.168.2.20', status: 'online' },
    { name: 'Storage Room',         healthCenterId: hc3._id, ipAddress: '192.168.3.20', status: 'warning' },
  ]);

  // ── Fridges (2 per health center) ─────────────────────────────────────────
  const [f1, f2, f3, f4, f5, f6] = await Promise.all([
    Fridge.findOneAndUpdate({ serialNumber: 'VF-MK144-001' }, { 
      name: 'Main Refrigerator',      healthCenterId: hc1._id, roomId: room1._id, modelName: 'Vestfrost MK 144', serialNumber: 'VF-MK144-001', type: 'refrigerator', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 40, targetHumidityMax: 70, status: 'operational' 
    }, { upsert: true, new: true }),
    Fridge.findOneAndUpdate({ serialNumber: 'HBC-150-002' }, { 
      name: 'Vaccine Freezer',         healthCenterId: hc1._id, roomId: room1._id, modelName: 'Haier HBC-150',   serialNumber: 'HBC-150-002',  type: 'freezer',      targetTempMin: -25, targetTempMax: -15, targetHumidityMin: 20, targetHumidityMax: 50, status: 'operational' 
    }, { upsert: true, new: true }),
    Fridge.findOneAndUpdate({ serialNumber: 'VF-MK74-003' }, { 
      name: 'Dispensary Refrigerator', healthCenterId: hc2._id, roomId: room2._id, modelName: 'Vestfrost MK 74', serialNumber: 'VF-MK74-003',  type: 'refrigerator', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 40, targetHumidityMax: 70, status: 'maintenance' 
    }, { upsert: true, new: true }),
    Fridge.findOneAndUpdate({ serialNumber: 'SDD-1000-004' }, { 
      name: 'Backup Freezer',          healthCenterId: hc2._id, roomId: room2._id, modelName: 'SDD 1000',        serialNumber: 'SDD-1000-004', type: 'freezer',      targetTempMin: -25, targetTempMax: -15, targetHumidityMin: 20, targetHumidityMax: 50, status: 'operational' 
    }, { upsert: true, new: true }),
    Fridge.findOneAndUpdate({ serialNumber: 'SDD-1000-005' }, { 
      name: 'CSPS Refrigerator',       healthCenterId: hc3._id, roomId: room3._id, modelName: 'SDD 1000',        serialNumber: 'SDD-1000-005', type: 'refrigerator', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 40, targetHumidityMax: 70, status: 'operational' 
    }, { upsert: true, new: true }),
    Fridge.findOneAndUpdate({ serialNumber: 'VF-MK74-006' }, { 
      name: 'CSPS Freezer',            healthCenterId: hc3._id, roomId: room3._id, modelName: 'Vestfrost MK 74', serialNumber: 'VF-MK74-006',  type: 'freezer',      targetTempMin: -25, targetTempMax: -15, targetHumidityMin: 20, targetHumidityMax: 50, status: 'defective' 
    }, { upsert: true, new: true }),
  ]);

  // ── Devices ────────────────────────────────────────────────────────────────
  const [dev1, dev2, dev3, dev4, dev5] = await Promise.all([
    Device.findOneAndUpdate({ serialNumber: 'SN-001-HC1' }, { 
      name: 'Sensor — Main Fridge',        serialNumber: 'SN-001-HC1', fridgeId: f1._id, healthCenterId: hc1._id, ipAddress: '192.168.1.10', status: 'online',   firmware: 'v2.1.4', fanEnabled: true,  systemEnabled: true,  fanSpeed: 60, compressorEnabled: true  
    }, { upsert: true, new: true }),
    Device.findOneAndUpdate({ serialNumber: 'SN-002-HC1' }, { 
      name: 'Sensor — Freezer',            serialNumber: 'SN-002-HC1', fridgeId: f2._id, healthCenterId: hc1._id, ipAddress: '192.168.1.11', status: 'online',   firmware: 'v2.1.4', fanEnabled: true,  systemEnabled: true,  fanSpeed: 80, compressorEnabled: true  
    }, { upsert: true, new: true }),
    Device.findOneAndUpdate({ serialNumber: 'SN-003-HC2' }, { 
      name: 'Sensor — Dispensary Fridge',  serialNumber: 'SN-003-HC2', fridgeId: f3._id, healthCenterId: hc2._id, ipAddress: '192.168.2.10', status: 'warning',  firmware: 'v2.0.9', fanEnabled: false, systemEnabled: true,  fanSpeed: 0,  compressorEnabled: true  
    }, { upsert: true, new: true }),
    Device.findOneAndUpdate({ serialNumber: 'SN-004-HC2' }, { 
      name: 'Sensor — Backup Freezer',     serialNumber: 'SN-004-HC2', fridgeId: f4._id, healthCenterId: hc2._id, ipAddress: '192.168.2.11', status: 'online',   firmware: 'v2.1.4', fanEnabled: true,  systemEnabled: true,  fanSpeed: 70, compressorEnabled: true  
    }, { upsert: true, new: true }),
    Device.findOneAndUpdate({ serialNumber: 'SN-005-HC3' }, { 
      name: 'Sensor — CSPS Fridge',        serialNumber: 'SN-005-HC3', fridgeId: f5._id, healthCenterId: hc3._id, ipAddress: '192.168.3.10', status: 'offline',  firmware: 'v2.1.0', fanEnabled: false, systemEnabled: false, fanSpeed: 0,  compressorEnabled: false  
    }, { upsert: true, new: true }),
  ]);

  // ── Vaccines ───────────────────────────────────────────────────────────────
  await Vaccine.insertMany([
    { name: 'BCG',                type: 'BCG',          manufacturer: 'Serum Institute of India', batchNumber: 'BCG-2024-001',   quantity: 500, unit: 'doses',  fridgeId: f1._id, healthCenterId: hc1._id, expiryDate: new Date('2025-12-31'), storageRequirements: { tempMin: 2,   tempMax: 8,   humidityMin: 40, humidityMax: 70 }, status: 'compliant' },
    { name: 'Oral Polio (OPV)',   type: 'Polio',        manufacturer: 'Sanofi Pasteur',           batchNumber: 'POL-2024-045',   quantity: 300, unit: 'doses',  fridgeId: f1._id, healthCenterId: hc1._id, expiryDate: new Date('2025-06-30'), storageRequirements: { tempMin: 2,   tempMax: 8,   humidityMin: 40, humidityMax: 70 }, status: 'compliant' },
    { name: 'DTC-HepB-Hib (Penta)',type:'Pentavalent',  manufacturer: 'GSK',                      batchNumber: 'PENTA-2024-012', quantity: 200, unit: 'vials',  fridgeId: f1._id, healthCenterId: hc1._id, expiryDate: new Date('2025-09-15'), storageRequirements: { tempMin: 2,   tempMax: 8,   humidityMin: 40, humidityMax: 70 }, status: 'at_risk'  },
    { name: 'Measles Vaccine',    type: 'Measles',      manufacturer: 'Merck',                    batchNumber: 'MEA-2024-007',   quantity: 150, unit: 'doses',  fridgeId: f2._id, healthCenterId: hc1._id, expiryDate: new Date('2026-03-20'), storageRequirements: { tempMin: -25, tempMax: -15, humidityMin: 20, humidityMax: 50 }, status: 'compliant' },
    { name: 'Meningitis A (MenA)',type: 'MenA',         manufacturer: 'Serum Institute of India', batchNumber: 'MENA-2024-003',  quantity: 400, unit: 'doses',  fridgeId: f3._id, healthCenterId: hc2._id, expiryDate: new Date('2025-11-10'), storageRequirements: { tempMin: 2,   tempMax: 8,   humidityMin: 40, humidityMax: 70 }, status: 'at_risk'  },
    { name: 'Yellow Fever',       type: 'Yellow Fever', manufacturer: 'Sanofi Pasteur',           batchNumber: 'YF-2024-022',    quantity: 180, unit: 'doses',  fridgeId: f4._id, healthCenterId: hc2._id, expiryDate: new Date('2025-08-01'), storageRequirements: { tempMin: -25, tempMax: -15, humidityMin: 20, humidityMax: 50 }, status: 'compliant' },
    { name: 'Hepatitis B (HepB)', type: 'HepB',         manufacturer: 'Bio Farma',                batchNumber: 'HEPB-2024-019',  quantity: 250, unit: 'doses',  fridgeId: f5._id, healthCenterId: hc3._id, expiryDate: new Date('2025-08-25'), storageRequirements: { tempMin: 2,   tempMax: 8,   humidityMin: 40, humidityMax: 70 }, status: 'compliant' },
  ]);

  // ── Alerts ─────────────────────────────────────────────────────────────────
  await Alert.insertMany([
    { deviceId: dev3._id, fridgeId: f3._id, healthCenterId: hc2._id, type: 'temperature_high', severity: 'high',     message: 'Temperature exceeded max threshold (8°C) — Dispensary Refrigerator', value: 9.8, threshold: 8, acknowledged: false },
    { deviceId: dev5._id, fridgeId: f5._id, healthCenterId: hc3._id, type: 'device_offline',   severity: 'critical', message: 'Sensor offline — CSPS Refrigerator',                                  value: 0,   threshold: 0, acknowledged: false },
  ]);

  // ── Users ──────────────────────────────────────────────────────────────────
  await Promise.all([
    User.findOneAndUpdate({ email: 'admin@coldchain-sentinel.io' }, { 
      name: 'System Admin',        
      email: 'admin@coldchain-sentinel.io', 
      password: await (await import('bcryptjs')).default.hash('Admin@1234', 10),  
      roleId: roleAdmin._id,   
      status: 'active' 
    }, { upsert: true, new: true }),
    User.findOneAndUpdate({ email: 'james@city-health.io' }, { 
      name: 'Dr. James Ouedraogo', 
      email: 'james@city-health.io',        
      password: await (await import('bcryptjs')).default.hash('Manager@1234', 10), 
      roleId: roleManager._id, 
      healthCenterId: hc1._id, 
      status: 'active' 
    }, { upsert: true, new: true }),
    User.findOneAndUpdate({ email: 'marie@north-dispensary.io' }, { 
      name: 'Nurse Marie Sawadogo',
      email: 'marie@north-dispensary.io',   
      password: await (await import('bcryptjs')).default.hash('Nurse@1234', 10),   
      roleId: roleNurse._id,   
      healthCenterId: hc2._id, 
      status: 'active' 
    }, { upsert: true, new: true }),
  ]);

  console.log('✅ Demo data seeded successfully.');
}

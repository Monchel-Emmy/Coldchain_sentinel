// ─── Domain Model: Vaccine Cold Chain Monitoring ─────────────────────────────
// HealthCenter
//   └── StorageRoom  (physical room — has MQ air quality sensor)
//         └── Fridge (cold storage unit inside the room — 2 per room)
//               └── Device (IoT sensor on the fridge)
//                     └── SensorReading (temp/humidity)
// Vaccine → stored in a Fridge

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthCenter {
  id: string;
  name: string;
  type: 'health_center' | 'dispensary' | 'hospital' | 'csps';
  region: string;
  district: string;
  address: string;
  contactName: string;
  contactPhone: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// A physical storage room inside a health center.
// Contains 2 fridges and one MQ air quality sensor.
export interface StorageRoom {
  id: string;
  name: string;
  healthCenterId: string;
  ipAddress: string;   // MQ sensor IP
  status: 'online' | 'offline' | 'warning';
  createdAt: string;
}

export interface RoomReading {
  id: string;
  roomId: string;
  healthCenterId: string;
  airQuality: number;   // AQI (0–500)
  co2: number;          // ppm
  temperature: number;  // ambient room temp
  humidity: number;     // ambient room humidity
  timestamp: string;
}

export interface Fridge {
  id: string;
  name: string;
  healthCenterId: string;
  roomId: string;       // which storage room this fridge lives in
  modelName: string;
  serialNumber: string;
  type: 'refrigerator' | 'freezer' | 'cold_room';
  targetTempMin: number;
  targetTempMax: number;
  targetHumidityMin: number;
  targetHumidityMax: number;
  status: 'operational' | 'maintenance' | 'defective';
  installedAt: string;
  createdAt: string;
}

export interface Device {
  id: string;
  name: string;
  serialNumber: string;
  fridgeId: string;
  healthCenterId: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'warning';
  firmware: string;
  lastSeen: string;
  registeredAt: string;
}

export interface Vaccine {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  fridgeId: string;
  healthCenterId: string;
  expiryDate: string;
  storageRequirements: {
    tempMin: number;
    tempMax: number;
    humidityMin: number;
    humidityMax: number;
  };
  status: 'compliant' | 'at_risk' | 'expired' | 'recalled';
  createdAt: string;
}

export interface SensorReading {
  id: string;
  deviceId: string;
  fridgeId: string;
  healthCenterId: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface Alert {
  id: string;
  deviceId: string;
  fridgeId: string;
  healthCenterId: string;
  type: 'temperature_high' | 'temperature_low' | 'humidity_high' | 'humidity_low' | 'device_offline' | 'power_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
  createdAt: string;
}

export interface DeviceControl {
  deviceId: string;
  fanEnabled: boolean;
  systemEnabled: boolean;
  fanSpeed: number;
  compressorEnabled: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  healthCenterId?: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
}

export const ALL_PERMISSIONS = [
  'dashboard:view',
  'monitoring:view',
  'health_centers:view', 'health_centers:create', 'health_centers:edit', 'health_centers:delete',
  'fridges:view', 'fridges:create', 'fridges:edit', 'fridges:delete',
  'devices:view', 'devices:create', 'devices:edit', 'devices:delete',
  'vaccines:view', 'vaccines:create', 'vaccines:edit', 'vaccines:delete',
  'alerts:view', 'alerts:acknowledge',
  'predictions:view',
  'reports:view', 'reports:export',
  'users:view', 'users:create', 'users:edit', 'users:delete',
  'roles:view', 'roles:create', 'roles:edit', 'roles:delete',
  'settings:view', 'settings:edit',
  'controls:operate',
];

// ─── Seed Data ────────────────────────────────────────────────────────────────

export const healthCenters: HealthCenter[] = [
  {
    id: 'hc1',
    name: 'City Health Center',
    type: 'health_center',
    region: 'Western Region',
    district: 'Central District',
    address: '12 Health Avenue, Central District',
    contactName: 'Dr. James Ouedraogo',
    contactPhone: '+226 70 11 22 33',
    status: 'active',
    createdAt: '2024-01-10T08:00:00Z',
  },
  {
    id: 'hc2',
    name: 'North Dispensary',
    type: 'dispensary',
    region: 'Western Region',
    district: 'North District',
    address: '45 Main Street, North District',
    contactName: 'Nurse Marie Sawadogo',
    contactPhone: '+226 76 44 55 66',
    status: 'active',
    createdAt: '2024-02-01T08:00:00Z',
  },
  {
    id: 'hc3',
    name: 'East CSPS',
    type: 'csps',
    region: 'Eastern Region',
    district: 'East District',
    address: 'Central Quarter, East District',
    contactName: 'Nurse Jean Compaore',
    contactPhone: '+226 65 77 88 99',
    status: 'active',
    createdAt: '2024-03-05T08:00:00Z',
  },
];

// Each health center has 2 fridges (as required)
export const fridges: Fridge[] = [
  // City Health Center — Fridge 1
  {
    id: 'fridge1',
    name: 'Main Refrigerator',
    healthCenterId: 'hc1',
    roomId: 'room1',
    modelName: 'Vestfrost MK 144',
    serialNumber: 'VF-MK144-001',
    type: 'refrigerator',
    targetTempMin: 2,
    targetTempMax: 8,
    targetHumidityMin: 40,
    targetHumidityMax: 70,
    status: 'operational',
    installedAt: '2024-01-15T00:00:00Z',
    createdAt: '2024-01-15T00:00:00Z',
  },
  // City Health Center — Fridge 2
  {
    id: 'fridge2',
    name: 'Vaccine Freezer',
    healthCenterId: 'hc1',
    roomId: 'room1',
    modelName: 'Haier HBC-150',
    serialNumber: 'HBC-150-002',
    type: 'freezer',
    targetTempMin: -25,
    targetTempMax: -15,
    targetHumidityMin: 20,
    targetHumidityMax: 50,
    status: 'operational',
    installedAt: '2024-01-15T00:00:00Z',
    createdAt: '2024-01-15T00:00:00Z',
  },
  // North Dispensary — Fridge 1
  {
    id: 'fridge3',
    name: 'Dispensary Refrigerator',
    healthCenterId: 'hc2',
    roomId: 'room2',
    modelName: 'Vestfrost MK 74',
    serialNumber: 'VF-MK74-003',
    type: 'refrigerator',
    targetTempMin: 2,
    targetTempMax: 8,
    targetHumidityMin: 40,
    targetHumidityMax: 70,
    status: 'maintenance',
    installedAt: '2024-02-10T00:00:00Z',
    createdAt: '2024-02-10T00:00:00Z',
  },
  // North Dispensary — Fridge 2
  {
    id: 'fridge4',
    name: 'Backup Freezer',
    healthCenterId: 'hc2',
    roomId: 'room2',
    modelName: 'SDD 1000',
    serialNumber: 'SDD-1000-004',
    type: 'freezer',
    targetTempMin: -25,
    targetTempMax: -15,
    targetHumidityMin: 20,
    targetHumidityMax: 50,
    status: 'operational',
    installedAt: '2024-02-10T00:00:00Z',
    createdAt: '2024-02-10T00:00:00Z',
  },
  // East CSPS — Fridge 1
  {
    id: 'fridge5',
    name: 'CSPS Refrigerator',
    healthCenterId: 'hc3',
    roomId: 'room3',
    modelName: 'SDD 1000',
    serialNumber: 'SDD-1000-005',
    type: 'refrigerator',
    targetTempMin: 2,
    targetTempMax: 8,
    targetHumidityMin: 40,
    targetHumidityMax: 70,
    status: 'operational',
    installedAt: '2024-03-10T00:00:00Z',
    createdAt: '2024-03-10T00:00:00Z',
  },
  // East CSPS — Fridge 2
  {
    id: 'fridge6',
    name: 'CSPS Freezer',
    healthCenterId: 'hc3',
    roomId: 'room3',
    modelName: 'Vestfrost MK 74',
    serialNumber: 'VF-MK74-006',
    type: 'freezer',
    targetTempMin: -25,
    targetTempMax: -15,
    targetHumidityMin: 20,
    targetHumidityMax: 50,
    status: 'defective',
    installedAt: '2024-03-10T00:00:00Z',
    createdAt: '2024-03-10T00:00:00Z',
  },
];

export const storageRooms: StorageRoom[] = [
  { id: 'room1', name: 'Cold Storage Room', healthCenterId: 'hc1', ipAddress: '192.168.1.20', status: 'online', createdAt: '2024-01-10T00:00:00Z' },
  { id: 'room2', name: 'Vaccine Storage Room', healthCenterId: 'hc2', ipAddress: '192.168.2.20', status: 'online', createdAt: '2024-02-01T00:00:00Z' },
  { id: 'room3', name: 'Storage Room', healthCenterId: 'hc3', ipAddress: '192.168.3.20', status: 'warning', createdAt: '2024-03-05T00:00:00Z' },
];

export const devices: Device[] = [
  { id: 'dev1', name: 'Sensor — Main Fridge', serialNumber: 'SN-001-HC1', fridgeId: 'fridge1', healthCenterId: 'hc1', ipAddress: '192.168.1.10', status: 'online', firmware: 'v2.1.4', lastSeen: new Date().toISOString(), registeredAt: '2024-01-16T09:00:00Z' },
  { id: 'dev2', name: 'Sensor — Freezer', serialNumber: 'SN-002-HC1', fridgeId: 'fridge2', healthCenterId: 'hc1', ipAddress: '192.168.1.11', status: 'online', firmware: 'v2.1.4', lastSeen: new Date().toISOString(), registeredAt: '2024-01-16T09:00:00Z' },
  { id: 'dev3', name: 'Sensor — Dispensary Fridge', serialNumber: 'SN-003-HC2', fridgeId: 'fridge3', healthCenterId: 'hc2', ipAddress: '192.168.2.10', status: 'warning', firmware: 'v2.0.9', lastSeen: new Date().toISOString(), registeredAt: '2024-02-11T09:00:00Z' },
  { id: 'dev4', name: 'Sensor — Backup Freezer', serialNumber: 'SN-004-HC2', fridgeId: 'fridge4', healthCenterId: 'hc2', ipAddress: '192.168.2.11', status: 'online', firmware: 'v2.1.4', lastSeen: new Date().toISOString(), registeredAt: '2024-02-11T09:00:00Z' },
  { id: 'dev5', name: 'Sensor — CSPS Fridge', serialNumber: 'SN-005-HC3', fridgeId: 'fridge5', healthCenterId: 'hc3', ipAddress: '192.168.3.10', status: 'offline', firmware: 'v2.1.0', lastSeen: new Date(Date.now() - 3600000).toISOString(), registeredAt: '2024-03-11T09:00:00Z' },
];

export const vaccines: Vaccine[] = [
  { id: 'vac1', name: 'BCG', type: 'BCG', manufacturer: 'Serum Institute of India', batchNumber: 'BCG-2024-001', quantity: 500, unit: 'doses', fridgeId: 'fridge1', healthCenterId: 'hc1', expiryDate: '2025-12-31', storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 40, humidityMax: 70 }, status: 'compliant', createdAt: '2024-01-20T00:00:00Z' },
  { id: 'vac2', name: 'Oral Polio (OPV)', type: 'Polio', manufacturer: 'Sanofi Pasteur', batchNumber: 'POL-2024-045', quantity: 300, unit: 'doses', fridgeId: 'fridge1', healthCenterId: 'hc1', expiryDate: '2025-06-30', storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 40, humidityMax: 70 }, status: 'compliant', createdAt: '2024-02-01T00:00:00Z' },
  { id: 'vac3', name: 'DTC-HepB-Hib (Penta)', type: 'Pentavalent', manufacturer: 'GSK', batchNumber: 'PENTA-2024-012', quantity: 200, unit: 'vials', fridgeId: 'fridge1', healthCenterId: 'hc1', expiryDate: '2025-09-15', storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 40, humidityMax: 70 }, status: 'at_risk', createdAt: '2024-02-10T00:00:00Z' },
  { id: 'vac4', name: 'Measles Vaccine', type: 'Measles', manufacturer: 'Merck', batchNumber: 'MEA-2024-007', quantity: 150, unit: 'doses', fridgeId: 'fridge2', healthCenterId: 'hc1', expiryDate: '2026-03-20', storageRequirements: { tempMin: -25, tempMax: -15, humidityMin: 20, humidityMax: 50 }, status: 'compliant', createdAt: '2024-03-01T00:00:00Z' },
  { id: 'vac5', name: 'Meningitis A (MenA)', type: 'MenA', manufacturer: 'Serum Institute of India', batchNumber: 'MENA-2024-003', quantity: 400, unit: 'doses', fridgeId: 'fridge3', healthCenterId: 'hc2', expiryDate: '2025-11-10', storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 40, humidityMax: 70 }, status: 'at_risk', createdAt: '2024-02-15T00:00:00Z' },
  { id: 'vac6', name: 'Yellow Fever', type: 'Yellow Fever', manufacturer: 'Sanofi Pasteur', batchNumber: 'YF-2024-022', quantity: 180, unit: 'doses', fridgeId: 'fridge4', healthCenterId: 'hc2', expiryDate: '2025-08-01', storageRequirements: { tempMin: -25, tempMax: -15, humidityMin: 20, humidityMax: 50 }, status: 'compliant', createdAt: '2024-02-20T00:00:00Z' },
  { id: 'vac7', name: 'Hepatitis B (HepB)', type: 'HepB', manufacturer: 'Bio Farma', batchNumber: 'HEPB-2024-019', quantity: 250, unit: 'doses', fridgeId: 'fridge5', healthCenterId: 'hc3', expiryDate: '2025-08-25', storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 40, humidityMax: 70 }, status: 'compliant', createdAt: '2024-03-15T00:00:00Z' },
];

export const deviceControls: DeviceControl[] = [
  { deviceId: 'dev1', fanEnabled: true, systemEnabled: true, fanSpeed: 60, compressorEnabled: true },
  { deviceId: 'dev2', fanEnabled: true, systemEnabled: true, fanSpeed: 80, compressorEnabled: true },
  { deviceId: 'dev3', fanEnabled: false, systemEnabled: true, fanSpeed: 0, compressorEnabled: true },
  { deviceId: 'dev4', fanEnabled: true, systemEnabled: true, fanSpeed: 70, compressorEnabled: true },
  { deviceId: 'dev5', fanEnabled: false, systemEnabled: false, fanSpeed: 0, compressorEnabled: false },
];

export const roles: Role[] = [
  { id: 'role1', name: 'Super Admin', description: 'Full system access', permissions: ALL_PERMISSIONS, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'role2', name: 'Health Center Manager', description: 'Manage a health center', permissions: ['dashboard:view','monitoring:view','fridges:view','devices:view','vaccines:view','vaccines:create','vaccines:edit','alerts:view','alerts:acknowledge','controls:operate','predictions:view','reports:view'], createdAt: '2024-01-01T00:00:00Z' },
  { id: 'role3', name: 'Nurse / Technician', description: 'Read-only monitoring', permissions: ['dashboard:view','monitoring:view','vaccines:view','alerts:view','predictions:view','reports:view'], createdAt: '2024-01-01T00:00:00Z' },
];

export const users: User[] = [
  { id: 'usr1', name: 'System Admin', email: 'admin@coldchain-sentinel.io', roleId: 'role1', status: 'active', lastLogin: new Date().toISOString(), createdAt: '2024-01-01T00:00:00Z' },
  { id: 'usr2', name: 'Dr. James Ouedraogo', email: 'james@city-health.io', roleId: 'role2', healthCenterId: 'hc1', status: 'active', lastLogin: new Date(Date.now() - 86400000).toISOString(), createdAt: '2024-01-10T00:00:00Z' },
  { id: 'usr3', name: 'Nurse Marie Sawadogo', email: 'marie@north-dispensary.io', roleId: 'role3', healthCenterId: 'hc2', status: 'active', lastLogin: new Date(Date.now() - 172800000).toISOString(), createdAt: '2024-02-01T00:00:00Z' },
];

// ─── Live Readings Generator ──────────────────────────────────────────────────

function rand(min: number, max: number, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export function generateReading(device: Device): SensorReading {
  const fridge = fridges.find(f => f.id === device.fridgeId);
  const isFreezer = fridge?.type === 'freezer';
  return {
    id: `r-${Date.now()}-${device.id}`,
    deviceId: device.id,
    fridgeId: device.fridgeId,
    healthCenterId: device.healthCenterId,
    temperature: isFreezer ? rand(-22, -14) : rand(2, 10),
    humidity: isFreezer ? rand(20, 55) : rand(45, 75),
    timestamp: new Date().toISOString(),
  };
}

// ─── Room (MQ sensor) readings ────────────────────────────────────────────────

export function generateRoomReading(room: StorageRoom): RoomReading {
  return {
    id: `rr-${Date.now()}-${room.id}`,
    roomId: room.id,
    healthCenterId: room.healthCenterId,
    airQuality: rand(25, 120, 0),   // AQI
    co2: rand(450, 1100, 0),        // ppm
    temperature: rand(18, 28),      // ambient
    humidity: rand(40, 70),         // ambient
    timestamp: new Date().toISOString(),
  };
}

export const roomReadingsHistory: Map<string, RoomReading[]> = new Map();
export const latestRoomReadings: Map<string, RoomReading> = new Map();

function seedRoomHistory() {
  storageRooms.forEach(room => {
    const history: RoomReading[] = [];
    for (let i = 287; i >= 0; i--) {
      history.push({
        id: `rrhist-${i}-${room.id}`,
        roomId: room.id,
        healthCenterId: room.healthCenterId,
        airQuality: rand(25, 120, 0),
        co2: rand(450, 1100, 0),
        temperature: rand(18, 28),
        humidity: rand(40, 70),
        timestamp: new Date(Date.now() - i * 5 * 60 * 1000).toISOString(),
      });
    }
    roomReadingsHistory.set(room.id, history);
    latestRoomReadings.set(room.id, history[history.length - 1]);
  });
}

seedRoomHistory();

export function pushRoomReading(reading: RoomReading) {
  const history = roomReadingsHistory.get(reading.roomId) || [];
  history.push(reading);
  if (history.length > 288) history.shift();
  roomReadingsHistory.set(reading.roomId, history);
  latestRoomReadings.set(reading.roomId, reading);
}

export const readingsHistory: Map<string, SensorReading[]> = new Map();

function seedHistory() {
  devices.forEach(dev => {
    const fridge = fridges.find(f => f.id === dev.fridgeId);
    const isFreezer = fridge?.type === 'freezer';
    const history: SensorReading[] = [];
    for (let i = 287; i >= 0; i--) {
      history.push({
        id: `hist-${i}-${dev.id}`,
        deviceId: dev.id,
        fridgeId: dev.fridgeId,
        healthCenterId: dev.healthCenterId,
        temperature: isFreezer ? rand(-22, -14) : rand(2, 10),
        humidity: isFreezer ? rand(20, 55) : rand(45, 75),
        timestamp: new Date(Date.now() - i * 5 * 60 * 1000).toISOString(),
      });
    }
    readingsHistory.set(dev.id, history);
  });
}

seedHistory();

export function pushReading(reading: SensorReading) {
  const history = readingsHistory.get(reading.deviceId) || [];
  history.push(reading);
  if (history.length > 288) history.shift();
  readingsHistory.set(reading.deviceId, history);
}

export const latestReadings: Map<string, SensorReading> = new Map();
devices.forEach(dev => {
  const history = readingsHistory.get(dev.id);
  if (history?.length) latestReadings.set(dev.id, history[history.length - 1]);
});

export const alerts: Alert[] = [
  {
    id: 'alt1', deviceId: 'dev3', fridgeId: 'fridge3', healthCenterId: 'hc2',
    type: 'temperature_high', severity: 'high',
    message: 'Temperature exceeded max threshold (8°C) — Dispensary Refrigerator',
    value: 9.8, threshold: 8, acknowledged: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'alt2', deviceId: 'dev5', fridgeId: 'fridge5', healthCenterId: 'hc3',
    type: 'device_offline', severity: 'critical',
    message: 'Sensor offline — CSPS Refrigerator',
    value: 0, threshold: 0, acknowledged: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

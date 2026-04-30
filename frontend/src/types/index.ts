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
  // enriched
  fridgesCount?: number;
  devicesCount?: number;
  vaccinesCount?: number;
}

export interface Fridge {
  id: string;
  name: string;
  healthCenterId: string;
  healthCenterName?: string;
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
  // enriched
  device?: Device | null;
  currentTemp?: number | null;
  currentHumidity?: number | null;
  lastUpdated?: string | null;
  vaccineCount?: number;
  tempStatus?: 'ok' | 'alert' | 'unknown';
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
  // enriched
  fridgeName?: string;
  healthCenterName?: string;
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
  // enriched
  fridgeName?: string;
  healthCenterName?: string;
  currentTemp?: number | null;
  currentHumidity?: number | null;
  daysToExpiry?: number;
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

export interface RoomReading {
  id: string;
  roomId: string;
  healthCenterId: string;
  airQuality: number;
  co2: number;
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface StorageRoom {
  id: string;
  name: string;
  healthCenterId: string;
  healthCenterName?: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'warning';
  createdAt: string;
  // enriched from API
  fridges?: FridgeInRoom[];
  airQuality?: number | null;
  co2?: number | null;
  ambientTemp?: number | null;
  ambientHumidity?: number | null;
  lastUpdated?: string | null;
}

export interface FridgeInRoom {
  id: string;
  name: string;
  type: string;
  targetTempMin: number;
  targetTempMax: number;
  status: string;
  device: Device | null;
  currentTemp: number | null;
  currentHumidity: number | null;
  lastUpdated: string | null;
  deviceStatus: string;
  ipAddress: string;
  tempStatus: 'ok' | 'alert' | 'unknown';
}

export interface FridgeDashboard {
  fridgeId: string;
  fridgeName: string;
  fridgeType: string;
  healthCenterName: string;
  healthCenterId: string;
  deviceId: string | null;
  deviceStatus: 'online' | 'offline' | 'warning';
  ipAddress: string;
  temperature: number | null;
  humidity: number | null;
  lastUpdated: string | null;
  targetTempMin: number;
  targetTempMax: number;
  vaccineCount: number;
  atRiskCount: number;
  fridgeStatus: string;
  tempStatus: 'ok' | 'alert' | 'unknown';
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
  roleName?: string;
  healthCenterId?: string | null;
  healthCenterName?: string;
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

export interface DashboardStats {
  totalHealthCenters: number;
  totalFridges: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  warningDevices: number;
  activeAlerts: number;
  criticalAlerts: number;
  avgTemperature: number;
  totalVaccines: number;
  atRisk: number;
  expired: number;
  expiringSoon: number;
  compliant: number;
}

export interface VaccineStats {
  total: number;
  compliant: number;
  atRisk: number;
  expired: number;
  expiringSoon: number;
}

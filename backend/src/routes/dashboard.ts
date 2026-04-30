import { Router } from 'express';
import { isConnected } from '../db';
import { HealthCenter } from '../models/HealthCenter';
import { Fridge } from '../models/Fridge';
import { Device } from '../models/Device';
import { Vaccine } from '../models/Vaccine';
import { Alert } from '../models/Alert';
import { authenticate, getHCFilter, AuthRequest } from '../middleware/auth';
import { latestReadings } from '../data/mockStore';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  const now = Date.now();

  const query: any = {};
  if (hcFilter) query.healthCenterId = hcFilter;
  
  const [vaccines, devices, healthCenters, alerts] = await Promise.all([
    Vaccine.find(query).lean(),
    Device.find(query).lean(),
    HealthCenter.find(query).lean(),
    Alert.find(query).lean(),
  ]);

  const atRisk = vaccines.filter(v => { 
    const dev = devices.find(d => d.fridgeId === v.fridgeId); 
    const r = dev ? latestReadings.get(dev.id) : null; 
    return r && (r.temperature < v.storageRequirements.tempMin || r.temperature > v.storageRequirements.tempMax); 
  }).length;
  const expired = vaccines.filter(v => new Date(v.expiryDate) < new Date()).length;
  const expiringSoon = vaccines.filter(v => { const d = Math.ceil((new Date(v.expiryDate).getTime() - now) / 86400000); return d >= 0 && d <= 30; }).length;
  const compliant = vaccines.length - atRisk - expired;

  res.json({ 
    totalHealthCenters: healthCenters.length, 
    totalFridges: await Fridge.countDocuments(hcFilter ? { healthCenterId: hcFilter } : {}), 
    totalDevices: devices.length, 
    onlineDevices: devices.filter(d => d.status === 'online').length, 
    offlineDevices: devices.filter(d => d.status === 'offline').length, 
    warningDevices: devices.filter(d => d.status === 'warning').length, 
    activeAlerts: alerts.filter(a => !a.acknowledged).length, 
    criticalAlerts: alerts.filter(a => !a.acknowledged && a.severity === 'critical').length, 
    avgTemperature: 0, 
    totalVaccines: vaccines.length, 
    atRisk, 
    expired, 
    expiringSoon, 
    compliant 
  });
});

router.get('/fridges', async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  const query = hcFilter ? { healthCenterId: hcFilter } : {};
  const fridges = await Fridge.find(query).lean();
  const result = await Promise.all(fridges.map(async f => {
    const [hc, dev, fridgeVaccines] = await Promise.all([
      HealthCenter.findById(f.healthCenterId).lean(),
      Device.findOne({ fridgeId: f._id }).lean(),
      Vaccine.find({ fridgeId: f._id }).lean(),
    ]);
    const reading = dev ? latestReadings.get(String(dev._id)) : null;
    const atRiskCount = fridgeVaccines.filter(v => reading && (reading.temperature < v.storageRequirements.tempMin || reading.temperature > v.storageRequirements.tempMax)).length;
    const tempOk = reading ? reading.temperature >= f.targetTempMin && reading.temperature <= f.targetTempMax : null;
    return { fridgeId: String(f._id), fridgeName: f.name, fridgeType: f.type, healthCenterName: hc?.name || '', healthCenterId: String(f.healthCenterId), deviceId: dev ? String(dev._id) : null, deviceStatus: dev?.status || 'offline', ipAddress: dev?.ipAddress || '', temperature: reading?.temperature ?? null, humidity: reading?.humidity ?? null, lastUpdated: reading?.timestamp ?? null, targetTempMin: f.targetTempMin, targetTempMax: f.targetTempMax, vaccineCount: fridgeVaccines.length, atRiskCount, fridgeStatus: f.status, tempStatus: reading ? (tempOk ? 'ok' : 'alert') : 'unknown' };
  }));
  res.json(result);
});

export default router;

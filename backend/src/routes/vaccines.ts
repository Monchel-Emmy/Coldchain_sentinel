import { Router } from 'express';
import { isConnected } from '../db';
import { Vaccine } from '../models/Vaccine';
import { Fridge } from '../models/Fridge';
import { Device } from '../models/Device';
import { HealthCenter } from '../models/HealthCenter';
import { authenticate, requirePermission, getHCFilter, AuthRequest } from '../middleware/auth';
import { latestReadings } from '../data/mockStore';

const router = Router();
router.use(authenticate);

function getLiveStatus(vaccine: any, reading: any): string {
  if (new Date(vaccine.expiryDate) < new Date()) return 'expired';
  if (!reading) return vaccine.status;
  const { tempMin, tempMax } = vaccine.storageRequirements;
  if (reading.temperature < tempMin || reading.temperature > tempMax) return 'at_risk';
  return 'compliant';
}

router.get('/stats', requirePermission('vaccines:view'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  const { healthCenterId } = req.query;
  const effectiveHC = hcFilter || (healthCenterId as string) || undefined;

  const query: any = {};
  if (effectiveHC) query.healthCenterId = effectiveHC;
  const vaccines = await Vaccine.find(query).lean();
  const now = Date.now();
  res.json({
    total: vaccines.length,
    compliant: vaccines.filter(v => v.status === 'compliant').length,
    atRisk: vaccines.filter(v => v.status === 'at_risk').length,
    expired: vaccines.filter(v => new Date(v.expiryDate) < new Date()).length,
    expiringSoon: vaccines.filter(v => { const d = Math.ceil((new Date(v.expiryDate).getTime() - now) / 86400000); return d >= 0 && d <= 30; }).length,
  });
});

router.get('/', requirePermission('vaccines:view'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  const { healthCenterId, fridgeId, status } = req.query;
  const effectiveHC = hcFilter || (healthCenterId as string) || undefined;

  const query: any = {};
  if (effectiveHC) query.healthCenterId = effectiveHC;
  if (fridgeId) query.fridgeId = fridgeId;
  if (status) query.status = status;
  const vaccines = await Vaccine.find(query).lean();
  const result = await Promise.all(vaccines.map(async v => {
    const [fridge, hc, dev] = await Promise.all([
      Fridge.findById(v.fridgeId).lean(),
      HealthCenter.findById(v.healthCenterId).lean(),
      Device.findOne({ fridgeId: v.fridgeId }).lean(),
    ]);
    const reading = dev ? latestReadings.get(String(dev._id)) : null;
    const liveStatus = getLiveStatus(v, reading);
    return { 
      ...v, 
      id: v._id, 
      status: liveStatus,
      fridgeName: fridge?.name || '', 
      healthCenterName: hc?.name || '', 
      currentTemp: reading?.temperature ?? null, 
      currentHumidity: reading?.humidity ?? null, 
      daysToExpiry: Math.ceil((new Date(v.expiryDate).getTime() - Date.now()) / 86400000) 
    };
  }));
  res.json(result);
});

router.post('/', requirePermission('vaccines:create'), async (req, res) => {
  const { name, type, manufacturer, batchNumber, quantity, unit, fridgeId, healthCenterId, expiryDate, storageRequirements } = req.body;
  if (!name || !fridgeId || !healthCenterId) return res.status(400).json({ error: 'Missing required fields' });

  // Non-admins can only create vaccines in their own health center
  const hcFilter = getHCFilter(req as AuthRequest);
  if (hcFilter && hcFilter !== healthCenterId) {
    return res.status(403).json({ error: 'Cannot create vaccines in other health centers' });
  }

  const v = await Vaccine.create({ 
    name, 
    type, 
    manufacturer, 
    batchNumber, 
    quantity: Number(quantity||0), 
    unit: unit||'doses', 
    fridgeId, 
    healthCenterId, 
    expiryDate: new Date(expiryDate), 
    storageRequirements 
  });
  res.status(201).json({ ...v.toObject(), id: v._id });
});

router.put('/:id', requirePermission('vaccines:edit'), async (req, res) => {
  const v = await Vaccine.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!v) return res.status(404).json({ error: 'Vaccine not found' });
  res.json({ ...v, id: v._id });
});

router.delete('/:id', requirePermission('vaccines:delete'), async (req, res) => {
  const v = await Vaccine.findByIdAndDelete(req.params.id);
  if (!v) return res.status(404).json({ error: 'Vaccine not found' });
  res.json({ success: true });
});

export default router;

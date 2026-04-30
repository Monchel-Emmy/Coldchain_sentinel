import { Router } from 'express';
import { isConnected } from '../db';
import { HealthCenter } from '../models/HealthCenter';
import { Fridge } from '../models/Fridge';
import { Device } from '../models/Device';
import { Vaccine } from '../models/Vaccine';
import { authenticate, requirePermission, getHCFilter, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('health_centers:view'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  const query = hcFilter ? { _id: hcFilter } : {};
  const centers = await HealthCenter.find(query).lean();
  const result = await Promise.all(centers.map(async hc => ({
    ...hc,
    id: hc._id,
    fridgesCount: await Fridge.countDocuments({ healthCenterId: hc._id }),
    devicesCount: await Device.countDocuments({ healthCenterId: hc._id }),
    vaccinesCount: await Vaccine.countDocuments({ healthCenterId: hc._id }),
  })));
  res.json(result);
});

router.get('/:id', requirePermission('health_centers:view'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  // Non-admins can only view their own health center
  if (hcFilter && hcFilter !== req.params.id) {
    return res.status(403).json({ error: 'Access denied to this health center' });
  }
  const hc = await HealthCenter.findById(req.params.id).lean();
  if (!hc) return res.status(404).json({ error: 'Health center not found' });
  const [fridges, devices, vaccines] = await Promise.all([
    Fridge.find({ healthCenterId: hc._id }).lean(),
    Device.find({ healthCenterId: hc._id }).lean(),
    Vaccine.find({ healthCenterId: hc._id }).lean(),
  ]);
  res.json({ ...hc, id: hc._id, fridges, devices, vaccines });
});

router.post('/', requirePermission('health_centers:create'), async (req, res) => {
  const { name, type, region, district, address, contactName, contactPhone } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
  const hc = await HealthCenter.create({ name, type, region, district, address, contactName, contactPhone });
  res.status(201).json({ ...hc.toObject(), id: hc._id });
});

router.put('/:id', requirePermission('health_centers:edit'), async (req, res) => {
  const hc = await HealthCenter.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!hc) return res.status(404).json({ error: 'Health center not found' });
  res.json({ ...hc, id: hc._id });
});

router.delete('/:id', requirePermission('health_centers:delete'), async (req, res) => {
  const hc = await HealthCenter.findByIdAndDelete(req.params.id);
  if (!hc) return res.status(404).json({ error: 'Health center not found' });
  
  // Cascade delete related data
  await Promise.all([
    Fridge.deleteMany({ healthCenterId: hc._id }),
    Device.deleteMany({ healthCenterId: hc._id }),
    Vaccine.deleteMany({ healthCenterId: hc._id }),
  ]);
  
  res.json({ success: true, message: 'Health center and all related data deleted.' });
});

export default router;

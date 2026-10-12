import { Router } from 'express';
import { isConnected } from '../db';
import { Device }       from '../models/Device';
import { Fridge }       from '../models/Fridge';
import { HealthCenter } from '../models/HealthCenter';
import { devices as memDevices, fridges as memFridges, healthCenters as memHC, deviceControls, Device as DevType } from '../data/mockStore';
import { authenticate, requirePermission, getHCFilter, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('devices:view'), async (req, res) => {
  const { healthCenterId, fridgeId } = req.query;
  const hcFilter = getHCFilter(req as AuthRequest);
  const effectiveHC = hcFilter || (healthCenterId as string) || undefined;

  if (!isConnected()) {
    let list = memDevices;
    if (effectiveHC) list = list.filter(d => d.healthCenterId === effectiveHC);
    if (fridgeId) list = list.filter(d => d.fridgeId === fridgeId);
    return res.json(list.map(d => ({ ...d, fridgeName: memFridges.find(f => f.id === d.fridgeId)?.name || '', healthCenterName: memHC.find(h => h.id === d.healthCenterId)?.name || '' })));
  }
  const query: any = {};
  if (effectiveHC) query.healthCenterId = effectiveHC;
  if (fridgeId) query.fridgeId = fridgeId;
  const devices = await Device.find(query).lean();
  const result = await Promise.all(devices.map(async d => {
    const [fridge, hc] = await Promise.all([
      Fridge.findById(d.fridgeId).lean(),
      HealthCenter.findById(d.healthCenterId).lean(),
    ]);
    return { ...d, id: d._id, fridgeName: fridge?.name || '', healthCenterName: hc?.name || '' };
  }));
  res.json(result);
});

router.get('/:id', requirePermission('devices:view'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  if (!isConnected()) {
    const d = memDevices.find(d => d.id === req.params.id);
    if (!d) return res.status(404).json({ error: 'Device not found' });
    if (hcFilter && d.healthCenterId !== hcFilter) {
      return res.status(403).json({ error: 'Access denied' });
    }
    return res.json({ ...d, control: deviceControls.find(c => c.deviceId === d.id) });
  }
  const d = await Device.findById(req.params.id).lean();
  if (!d) return res.status(404).json({ error: 'Device not found' });
  if (hcFilter && String(d.healthCenterId) !== String(hcFilter)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json({ ...d, id: d._id });
});

router.post('/', requirePermission('devices:create'), async (req, res) => {
  const { name, serialNumber, fridgeId, healthCenterId, ipAddress, firmware } = req.body;
  if (!name || !serialNumber || !fridgeId || !healthCenterId) return res.status(400).json({ error: 'Missing required fields' });
  const hcFilter = getHCFilter(req as AuthRequest);
  if (hcFilter && healthCenterId !== hcFilter) {
    return res.status(403).json({ error: 'Cannot create sensor in another health center' });
  }
  if (!isConnected()) {
    const newD: DevType = { id: `dev${Date.now()}`, name, serialNumber, fridgeId, healthCenterId, ipAddress: ipAddress||'', status: 'offline', firmware: firmware||'v1.0.0', lastSeen: new Date().toISOString(), registeredAt: new Date().toISOString() };
    memDevices.push(newD);
    deviceControls.push({ deviceId: newD.id, fanEnabled: false, systemEnabled: false, fanSpeed: 0, compressorEnabled: false });
    return res.status(201).json(newD);
  }
  const d = await Device.create({ name, serialNumber, fridgeId, healthCenterId, ipAddress, firmware: firmware||'v1.0.0' });
  res.status(201).json({ ...d.toObject(), id: d._id });
});

router.put('/:id', requirePermission('devices:edit'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  if (!isConnected()) {
    const idx = memDevices.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Device not found' });
    if (hcFilter && memDevices[idx].healthCenterId !== hcFilter) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (hcFilter && req.body.healthCenterId && req.body.healthCenterId !== hcFilter) {
      return res.status(403).json({ error: 'Cannot assign to another health center' });
    }
    memDevices[idx] = { ...memDevices[idx], ...req.body, id: memDevices[idx].id };
    return res.json(memDevices[idx]);
  }
  const existing = await Device.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ error: 'Device not found' });
  if (hcFilter && String(existing.healthCenterId) !== String(hcFilter)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (hcFilter && req.body.healthCenterId && req.body.healthCenterId !== hcFilter) {
    return res.status(403).json({ error: 'Cannot assign to another health center' });
  }
  const d = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!d) return res.status(404).json({ error: 'Device not found' });
  res.json({ ...d, id: d._id });
});

router.delete('/:id', requirePermission('devices:delete'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  if (!isConnected()) {
    const idx = memDevices.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Device not found' });
    if (hcFilter && memDevices[idx].healthCenterId !== hcFilter) {
      return res.status(403).json({ error: 'Access denied' });
    }
    memDevices.splice(idx, 1);
    return res.json({ success: true });
  }
  const existing = await Device.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ error: 'Device not found' });
  if (hcFilter && String(existing.healthCenterId) !== String(hcFilter)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  await Device.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// IoT Controls — stored on the Device document
router.get('/:id/control', requirePermission('controls:operate'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  if (!isConnected()) {
    const d = memDevices.find(d => d.id === req.params.id);
    if (!d) return res.status(404).json({ error: 'Device not found' });
    if (hcFilter && d.healthCenterId !== hcFilter) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const ctrl = deviceControls.find(c => c.deviceId === req.params.id);
    if (!ctrl) return res.status(404).json({ error: 'Control not found' });
    return res.json(ctrl);
  }
  const d = await Device.findById(req.params.id).lean();
  if (!d) return res.status(404).json({ error: 'Device not found' });
  if (hcFilter && String(d.healthCenterId) !== String(hcFilter)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json({ deviceId: String(d._id), fanEnabled: d.fanEnabled, systemEnabled: d.systemEnabled, fanSpeed: d.fanSpeed, compressorEnabled: d.compressorEnabled });
});

router.patch('/:id/control', requirePermission('controls:operate'), async (req, res) => {
  const hcFilter = getHCFilter(req as AuthRequest);
  if (!isConnected()) {
    const d = memDevices.find(d => d.id === req.params.id);
    if (!d) return res.status(404).json({ error: 'Device not found' });
    if (hcFilter && d.healthCenterId !== hcFilter) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const idx = deviceControls.findIndex(c => c.deviceId === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Control not found' });
    deviceControls[idx] = { ...deviceControls[idx], ...req.body };
    return res.json(deviceControls[idx]);
  }
  const existing = await Device.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ error: 'Device not found' });
  if (hcFilter && String(existing.healthCenterId) !== String(hcFilter)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { fanEnabled, systemEnabled, fanSpeed, compressorEnabled } = req.body;
  const d = await Device.findByIdAndUpdate(req.params.id, { fanEnabled, systemEnabled, fanSpeed, compressorEnabled }, { new: true }).lean();
  if (!d) return res.status(404).json({ error: 'Device not found' });
  res.json({ deviceId: String(d._id), fanEnabled: d.fanEnabled, systemEnabled: d.systemEnabled, fanSpeed: d.fanSpeed, compressorEnabled: d.compressorEnabled });
});

export default router;

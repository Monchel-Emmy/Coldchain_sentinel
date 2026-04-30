import { Router } from 'express';
import { isConnected } from '../db';
import { Device }       from '../models/Device';
import { Fridge }       from '../models/Fridge';
import { HealthCenter } from '../models/HealthCenter';
import { devices as memDevices, fridges as memFridges, healthCenters as memHC, deviceControls, Device as DevType } from '../data/mockStore';

const router = Router();

router.get('/', async (req, res) => {
  const { healthCenterId, fridgeId } = req.query;
  if (!isConnected()) {
    let list = memDevices;
    if (healthCenterId) list = list.filter(d => d.healthCenterId === healthCenterId);
    if (fridgeId) list = list.filter(d => d.fridgeId === fridgeId);
    return res.json(list.map(d => ({ ...d, fridgeName: memFridges.find(f => f.id === d.fridgeId)?.name || '', healthCenterName: memHC.find(h => h.id === d.healthCenterId)?.name || '' })));
  }
  const query: any = {};
  if (healthCenterId) query.healthCenterId = healthCenterId;
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

router.get('/:id', async (req, res) => {
  if (!isConnected()) {
    const d = memDevices.find(d => d.id === req.params.id);
    if (!d) return res.status(404).json({ error: 'Device not found' });
    return res.json({ ...d, control: deviceControls.find(c => c.deviceId === d.id) });
  }
  const d = await Device.findById(req.params.id).lean();
  if (!d) return res.status(404).json({ error: 'Device not found' });
  res.json({ ...d, id: d._id });
});

router.post('/', async (req, res) => {
  const { name, serialNumber, fridgeId, healthCenterId, ipAddress, firmware } = req.body;
  if (!name || !serialNumber || !fridgeId || !healthCenterId) return res.status(400).json({ error: 'Missing required fields' });
  if (!isConnected()) {
    const newD: DevType = { id: `dev${Date.now()}`, name, serialNumber, fridgeId, healthCenterId, ipAddress: ipAddress||'', status: 'offline', firmware: firmware||'v1.0.0', lastSeen: new Date().toISOString(), registeredAt: new Date().toISOString() };
    memDevices.push(newD);
    deviceControls.push({ deviceId: newD.id, fanEnabled: false, systemEnabled: false, fanSpeed: 0, compressorEnabled: false });
    return res.status(201).json(newD);
  }
  const d = await Device.create({ name, serialNumber, fridgeId, healthCenterId, ipAddress, firmware: firmware||'v1.0.0' });
  res.status(201).json({ ...d.toObject(), id: d._id });
});

router.put('/:id', async (req, res) => {
  if (!isConnected()) {
    const idx = memDevices.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Device not found' });
    memDevices[idx] = { ...memDevices[idx], ...req.body, id: memDevices[idx].id };
    return res.json(memDevices[idx]);
  }
  const d = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!d) return res.status(404).json({ error: 'Device not found' });
  res.json({ ...d, id: d._id });
});

router.delete('/:id', async (req, res) => {
  if (!isConnected()) {
    const idx = memDevices.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Device not found' });
    memDevices.splice(idx, 1);
    return res.json({ success: true });
  }
  await Device.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// IoT Controls — stored on the Device document
router.get('/:id/control', async (req, res) => {
  if (!isConnected()) {
    const ctrl = deviceControls.find(c => c.deviceId === req.params.id);
    if (!ctrl) return res.status(404).json({ error: 'Control not found' });
    return res.json(ctrl);
  }
  const d = await Device.findById(req.params.id).lean();
  if (!d) return res.status(404).json({ error: 'Device not found' });
  res.json({ deviceId: String(d._id), fanEnabled: d.fanEnabled, systemEnabled: d.systemEnabled, fanSpeed: d.fanSpeed, compressorEnabled: d.compressorEnabled });
});

router.patch('/:id/control', async (req, res) => {
  if (!isConnected()) {
    const idx = deviceControls.findIndex(c => c.deviceId === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Control not found' });
    deviceControls[idx] = { ...deviceControls[idx], ...req.body };
    return res.json(deviceControls[idx]);
  }
  const { fanEnabled, systemEnabled, fanSpeed, compressorEnabled } = req.body;
  const d = await Device.findByIdAndUpdate(req.params.id, { fanEnabled, systemEnabled, fanSpeed, compressorEnabled }, { new: true }).lean();
  if (!d) return res.status(404).json({ error: 'Device not found' });
  res.json({ deviceId: String(d._id), fanEnabled: d.fanEnabled, systemEnabled: d.systemEnabled, fanSpeed: d.fanSpeed, compressorEnabled: d.compressorEnabled });
});

export default router;

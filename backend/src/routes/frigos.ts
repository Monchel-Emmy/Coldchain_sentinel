import { Router } from 'express';
import { isConnected } from '../db';
import { Fridge }       from '../models/Fridge';
import { Device }       from '../models/Device';
import { Vaccine }      from '../models/Vaccine';
import { HealthCenter } from '../models/HealthCenter';
import { fridges as memFridges, devices as memDevices, vaccines as memVaccines, healthCenters as memHC, latestReadings, Fridge as FridgeType } from '../data/mockStore';

const router = Router();

function enrichFridge(f: any, dev: any, reading: any, vaccineCount: number, hcName: string) {
  const tempOk = reading ? reading.temperature >= f.targetTempMin && reading.temperature <= f.targetTempMax : null;
  return {
    ...f,
    id: f._id ?? f.id,
    healthCenterName: hcName,
    device: dev ? { ...dev, id: dev._id ?? dev.id } : null,
    currentTemp: reading?.temperature ?? null,
    currentHumidity: reading?.humidity ?? null,
    lastUpdated: reading?.timestamp ?? null,
    vaccineCount,
    tempStatus: reading ? (tempOk ? 'ok' : 'alert') : 'unknown',
  };
}

router.get('/', async (req, res) => {
  const { healthCenterId } = req.query;
  if (!isConnected()) {
    const list = healthCenterId ? memFridges.filter(f => f.healthCenterId === healthCenterId) : memFridges;
    return res.json(list.map(f => {
      const dev = memDevices.find(d => d.fridgeId === f.id);
      const reading = dev ? latestReadings.get(dev.id) : null;
      const hc = memHC.find(h => h.id === f.healthCenterId);
      return enrichFridge(f, dev, reading, memVaccines.filter(v => v.fridgeId === f.id).length, hc?.name || '');
    }));
  }
  const query = healthCenterId ? { healthCenterId } : {};
  const fridges = await Fridge.find(query).lean();
  const result = await Promise.all(fridges.map(async f => {
    const hc  = await HealthCenter.findById(f.healthCenterId).lean();
    const dev = await Device.findOne({ fridgeId: f._id }).lean();
    const reading = dev ? latestReadings.get(String(dev._id)) : null;
    const vaccineCount = await Vaccine.countDocuments({ fridgeId: f._id });
    return enrichFridge(f, dev, reading, vaccineCount, hc?.name || '');
  }));
  res.json(result);
});

router.get('/:id', async (req, res) => {
  if (!isConnected()) {
    const f = memFridges.find(f => f.id === req.params.id);
    if (!f) return res.status(404).json({ error: 'Fridge not found' });
    const dev = memDevices.find(d => d.fridgeId === f.id);
    const reading = dev ? latestReadings.get(dev.id) : null;
    return res.json({ ...f, device: dev, reading, vaccines: memVaccines.filter(v => v.fridgeId === f.id) });
  }
  const f = await Fridge.findById(req.params.id).lean();
  if (!f) return res.status(404).json({ error: 'Fridge not found' });
  const [dev, fridgeVaccines] = await Promise.all([
    Device.findOne({ fridgeId: f._id }).lean(),
    Vaccine.find({ fridgeId: f._id }).lean(),
  ]);
  const reading = dev ? latestReadings.get(String(dev._id)) : null;
  res.json({ ...f, id: f._id, device: dev, reading, vaccines: fridgeVaccines });
});

router.post('/', async (req, res) => {
  const { name, healthCenterId, roomId, model, serialNumber, type, targetTempMin, targetTempMax, targetHumidityMin, targetHumidityMax } = req.body;
  if (!name || !healthCenterId || !type) return res.status(400).json({ error: 'Missing required fields' });
  if (!isConnected()) {
    const newF: FridgeType = { id: `fridge${Date.now()}`, name, healthCenterId, roomId: roomId || '', modelName: model||'', serialNumber: serialNumber||'', type, targetTempMin: Number(targetTempMin??2), targetTempMax: Number(targetTempMax??8), targetHumidityMin: Number(targetHumidityMin??40), targetHumidityMax: Number(targetHumidityMax??70), status: 'operational', installedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    memFridges.push(newF);
    return res.status(201).json(newF);
  }
  const createData: any = { name, healthCenterId, modelName: model, serialNumber, type, targetTempMin: Number(targetTempMin??2), targetTempMax: Number(targetTempMax??8), targetHumidityMin: Number(targetHumidityMin??40), targetHumidityMax: Number(targetHumidityMax??70) };
  if (roomId) createData.roomId = roomId;
  const f = await Fridge.create(createData);
  res.status(201).json({ ...f.toObject(), id: f._id });
});

router.put('/:id', async (req, res) => {
  if (!isConnected()) {
    const idx = memFridges.findIndex(f => f.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Fridge not found' });
    memFridges[idx] = { ...memFridges[idx], ...req.body, id: memFridges[idx].id };
    return res.json(memFridges[idx]);
  }
  const f = await Fridge.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!f) return res.status(404).json({ error: 'Fridge not found' });
  res.json({ ...f, id: f._id });
});

router.delete('/:id', async (req, res) => {
  if (!isConnected()) {
    const idx = memFridges.findIndex(f => f.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Fridge not found' });
    memFridges.splice(idx, 1);
    return res.json({ success: true });
  }
  // findOneAndDelete triggers the cascade post hook
  const deleted = await Fridge.findOneAndDelete({ _id: req.params.id });
  if (!deleted) return res.status(404).json({ error: 'Fridge not found' });
  res.json({ success: true, message: 'Fridge and all related sensors, vaccines and alerts deleted.' });
});

export default router;

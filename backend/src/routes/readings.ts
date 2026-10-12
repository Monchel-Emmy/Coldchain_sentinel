import { Router } from 'express';
import { Device as DeviceModel } from '../models/Device';
import { SensorReading as SensorReadingModel } from '../models/SensorReading';
import { Fridge as FridgeModel } from '../models/Fridge';
import { authenticate, getHCFilter, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Latest reading per device (one per device, most recent)
router.get('/latest', async (req: AuthRequest, res) => {
  try {
    const hcFilter = getHCFilter(req);
    const query = hcFilter ? { healthCenterId: hcFilter } : {};
    const devices = await DeviceModel.find(query).lean();
    const results = await Promise.all(devices.map(async dev => {
      const reading = await SensorReadingModel
        .findOne({ deviceId: dev._id })
        .sort({ timestamp: -1 })
        .lean();
      if (!reading) return null;
      return {
        id:            String(reading._id),
        deviceId:      String(reading.deviceId),
        fridgeId:      String(reading.fridgeId),
        healthCenterId: String(reading.healthCenterId),
        temperature:   reading.temperature,
        humidity:      reading.humidity,
        timestamp:     reading.timestamp.toISOString(),
      };
    }));
    res.json(results.filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch latest readings' });
  }
});

// History for a specific device
router.get('/history/:deviceId', async (req: AuthRequest, res) => {
  try {
    const hcFilter = getHCFilter(req);
    if (hcFilter) {
      const dev = await DeviceModel.findById(req.params.deviceId).lean();
      if (!dev || String(dev.healthCenterId) !== String(hcFilter)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const hours  = parseInt(req.query.hours as string) || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const readings = await SensorReadingModel
      .find({ deviceId: req.params.deviceId, timestamp: { $gte: cutoff } })
      .sort({ timestamp: 1 })
      .lean();

    res.json(readings.map(r => ({
      id:            String(r._id),
      deviceId:      String(r.deviceId),
      fridgeId:      String(r.fridgeId),
      healthCenterId: String(r.healthCenterId),
      temperature:   r.temperature,
      humidity:      r.humidity,
      timestamp:     r.timestamp.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// History for a fridge (looks up device first)
router.get('/fridge/:fridgeId', async (req: AuthRequest, res) => {
  try {
    const hcFilter = getHCFilter(req);
    if (hcFilter) {
      const fridge = await FridgeModel.findById(req.params.fridgeId).lean();
      if (!fridge || String(fridge.healthCenterId) !== String(hcFilter)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const hours  = parseInt(req.query.hours as string) || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const dev = await DeviceModel.findOne({ fridgeId: req.params.fridgeId }).lean();
    if (!dev) return res.json([]);

    const readings = await SensorReadingModel
      .find({ deviceId: dev._id, timestamp: { $gte: cutoff } })
      .sort({ timestamp: 1 })
      .lean();

    res.json(readings.map(r => ({
      id:            String(r._id),
      deviceId:      String(r.deviceId),
      fridgeId:      String(r.fridgeId),
      healthCenterId: String(r.healthCenterId),
      temperature:   r.temperature,
      humidity:      r.humidity,
      timestamp:     r.timestamp.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch fridge history' });
  }
});

export default router;

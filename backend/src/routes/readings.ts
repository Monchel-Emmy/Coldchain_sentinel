import { Router } from 'express';
import { Device as DeviceModel } from '../models/Device';
import { SensorReading as SensorReadingModel } from '../models/SensorReading';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Latest reading per device (one per device, most recent)
router.get('/latest', async (_req, res) => {
  try {
    const devices = await DeviceModel.find().lean();
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
router.get('/history/:deviceId', async (req, res) => {
  try {
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
router.get('/fridge/:fridgeId', async (req, res) => {
  try {
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

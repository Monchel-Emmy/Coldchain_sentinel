import { Router } from 'express';
import { isConnected } from '../db';
import { Device as DeviceModel } from '../models/Device';
import { readingsHistory, latestReadings, devices as memDevices } from '../data/mockStore';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Latest reading per device
router.get('/latest', (_req, res) => {
  res.json(Array.from(latestReadings.values()));
});

// History for a specific device (keyed by device ID — works for both DB and in-memory)
router.get('/history/:deviceId', (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const history = readingsHistory.get(req.params.deviceId) || [];
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  res.json(history.filter(r => new Date(r.timestamp).getTime() >= cutoff));
});

// History for a fridge — find the device assigned to it, then return its readings
router.get('/fridge/:fridgeId', async (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;

  let deviceId: string | undefined;

  if (isConnected()) {
    const dev = await DeviceModel.findOne({ fridgeId: req.params.fridgeId }).lean().catch(() => null);
    deviceId = dev ? String(dev._id) : undefined;
  } else {
    const dev = memDevices.find(d => d.fridgeId === req.params.fridgeId);
    deviceId = dev?.id;
  }

  if (!deviceId) return res.json([]);
  const history = readingsHistory.get(deviceId) || [];
  res.json(history.filter(r => new Date(r.timestamp).getTime() >= cutoff));
});

export default router;

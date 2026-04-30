import { Router } from 'express';
import { Device as DeviceModel } from '../models/Device';
import { Fridge as FridgeModel } from '../models/Fridge';
import { readingsHistory } from '../data/mockStore';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

function predict(values: number[], stepsAhead: number): number[] {
  const { slope, intercept } = linearRegression(values);
  const n = values.length;
  return Array.from({ length: stepsAhead }, (_, i) =>
    parseFloat((slope * (n + i) + intercept).toFixed(1))
  );
}

router.get('/:deviceId', async (req: AuthRequest, res) => {
  const { deviceId } = req.params;

  // Look up device by MongoDB _id
  const dbDevice = await DeviceModel.findById(deviceId).lean().catch(() => null);
  if (!dbDevice) return res.status(404).json({ error: 'Device not found' });
  
  const deviceName = dbDevice.name;
  const dbFridge = await FridgeModel.findById(dbDevice.fridgeId).lean().catch(() => null);
  const fridgeName = dbFridge?.name || '';

  // Readings are cached in memory keyed by device ID (MongoDB _id string when DB is connected)
  const history = readingsHistory.get(deviceId) || [];
  if (history.length < 10) {
    return res.status(400).json({ error: 'Not enough historical data for predictions. Wait a few minutes for readings to accumulate.' });
  }

  // Use last 48 readings (~4h) for trend analysis
  const recent = history.slice(-48);
  const temps  = recent.map(r => r.temperature);
  const humids = recent.map(r => r.humidity);

  // Predict next 12 readings (1 hour ahead at 5-min intervals)
  const tempPredictions  = predict(temps, 12);
  const humidPredictions = predict(humids, 12);

  const now = Date.now();
  const predictions = Array.from({ length: 12 }, (_, i) => ({
    timestamp:   new Date(now + (i + 1) * 5 * 60 * 1000).toISOString(),
    temperature: tempPredictions[i],
    humidity:    humidPredictions[i],
  }));

  const avgTemp  = parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1));
  const avgHumid = parseFloat((humids.reduce((a, b) => a + b, 0) / humids.length).toFixed(1));
  const tempTrend  = temps[temps.length - 1] > temps[0] ? 'rising' : temps[temps.length - 1] < temps[0] ? 'falling' : 'stable';
  const humidTrend = humids[humids.length - 1] > humids[0] ? 'rising' : humids[humids.length - 1] < humids[0] ? 'falling' : 'stable';

  res.json({
    deviceId,
    deviceName,
    fridgeName,
    summary: { avgTemp, avgHumid, tempTrend, humidTrend },
    predictions,
    historicalSample: recent.slice(-24),
  });
});

export default router;

import { Router } from 'express';
import { StorageRoom } from '../models/StorageRoom';
import { HealthCenter } from '../models/HealthCenter';
import { Fridge }       from '../models/Fridge';
import { Device }       from '../models/Device';
import { RoomReading }  from '../models/RoomReading';
import { authenticate, getHCFilter, AuthRequest } from '../middleware/auth';
import { latestReadings, latestRoomReadings } from '../data/mockStore';

const router = Router();
router.use(authenticate);

// Build enriched fridge data (same logic for both DB and in-memory)
function enrichFridge(f: any, dev: any, reading: any) {
  const tempOk = reading
    ? reading.temperature >= f.targetTempMin && reading.temperature <= f.targetTempMax
    : null;
  return {
    id:            String(f._id ?? f.id),
    name:          f.name,
    type:          f.type,
    modelName:     f.modelName || '',
    serialNumber:  f.serialNumber || '',
    targetTempMin: f.targetTempMin,
    targetTempMax: f.targetTempMax,
    status:        f.status,
    device:        dev ? {
      id:          String(dev._id ?? dev.id),
      name:        dev.name,
      serialNumber:dev.serialNumber,
      ipAddress:   dev.ipAddress,
      status:      dev.status,
      firmware:    dev.firmware,
      fridgeId:    String(dev.fridgeId),
      healthCenterId: String(dev.healthCenterId),
      lastSeen:    dev.lastSeen,
      registeredAt:dev.registeredAt,
    } : null,
    currentTemp:   reading?.temperature ?? null,
    currentHumidity: reading?.humidity ?? null,
    lastUpdated:   reading?.timestamp ?? null,
    deviceStatus:  dev?.status || 'offline',
    ipAddress:     dev?.ipAddress || '',
    tempStatus:    reading ? (tempOk ? 'ok' : 'alert') : 'unknown',
  };
}

router.get('/', async (req, res) => {
  const hcFilter = getHCFilter(req);
  const { healthCenterId } = req.query;
  const effectiveHC = hcFilter || (healthCenterId as string) || undefined;

  const query = effectiveHC ? { healthCenterId: effectiveHC } : {};
  const rooms = await StorageRoom.find(query).lean();

  const result = await Promise.all(rooms.map(async room => {
    const hc = await HealthCenter.findById(room.healthCenterId).lean();
    const roomFridges = await Fridge.find({ roomId: room._id }).lean();

    const fridgesWithData = await Promise.all(roomFridges.map(async f => {
      const dev = await Device.findOne({ fridgeId: f._id }).lean();
      // Use device's MongoDB _id as key for live readings
      const reading = dev ? latestReadings.get(String(dev._id)) : null;
      return enrichFridge(f, dev, reading);
    }));

    // Get latest room reading from MongoDB (most recent by timestamp)
    const latestRoomReading = await RoomReading.findOne({ roomId: room._id })
      .sort({ timestamp: -1 })
      .lean();

    // Also check in-memory cache (updated every 5s by simulation)
    const memReading = latestRoomReadings.get(String(room._id));

    // Use whichever is more recent
    const roomReading = latestRoomReading || memReading;

    return {
      id:              String(room._id),
      name:            room.name,
      healthCenterId:  String(room.healthCenterId),
      healthCenterName: hc?.name || '',
      ipAddress:       room.ipAddress,
      status:          room.status,
      fridges:         fridgesWithData,
      airQuality:      roomReading?.airQuality ?? null,
      co2:             roomReading?.co2 ?? null,
      ambientTemp:     roomReading?.temperature ?? null,
      ambientHumidity: roomReading?.humidity ?? null,
      lastUpdated:     roomReading ? (roomReading.timestamp instanceof Date ? roomReading.timestamp.toISOString() : roomReading.timestamp) : null,
    };
  }));

  res.json(result);
});

// ── CRUD for storage rooms ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, healthCenterId, ipAddress } = req.body;
  if (!name || !healthCenterId) return res.status(400).json({ error: 'Name and healthCenterId are required' });
  const room = await StorageRoom.create({ name, healthCenterId, ipAddress: ipAddress || '' });
  res.status(201).json({ ...room.toObject(), id: room._id });
});

router.put('/:id', async (req, res) => {
  const room = await StorageRoom.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ ...room, id: room._id });
});

router.delete('/:id', async (req, res) => {
  await StorageRoom.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;

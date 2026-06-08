import { Router, Request, Response } from 'express';
import { Device as DeviceModel } from '../models/Device';
import { Fridge as FridgeModel } from '../models/Fridge';
import { StorageRoom as StorageRoomModel } from '../models/StorageRoom';
import { SensorReading as SensorReadingModel } from '../models/SensorReading';
import { RoomReading as RoomReadingModel } from '../models/RoomReading';

const router = Router();

const TELEMETRY_SECRET = process.env.TELEMETRY_SECRET || 'supersecretkey123';

/**
 * POST /api/telemetry
 *
 * Expected payload from ESP32:
 * {
 *   "secret": "supersecretkey123",
 *   "room": {
 *     "ip": "192.168.1.20",
 *     "airQuality": 85,
 *     "ambientTemp": 24.5,
 *     "ambientHum": 62.0
 *   },
 *   "fridges": [
 *     { "ip": "192.168.1.10", "temperature": 5.4, "humidity": 58.2 },
 *     { "ip": "192.168.1.11", "temperature": -18.5, "humidity": 31.0 }
 *   ]
 * }
 *
 * Returns config back to ESP32:
 * { "config": { "192.168.1.10": { min, max, sys, fan, comp }, ... } }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { secret, room, fridges } = req.body;

    if (secret !== TELEMETRY_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const io = req.app.get('io');
    const now = new Date();

    // ── 1. Room reading (MQ135 air quality sensor) ────────────────────────────
    if (room?.ip) {
      const dbRoom = await StorageRoomModel.findOne({ ipAddress: room.ip }).lean();
      if (dbRoom) {
        const roomReading = await RoomReadingModel.create({
          roomId:        dbRoom._id,
          healthCenterId: dbRoom.healthCenterId,
          airQuality:    room.airQuality  ?? 0,
          co2:           room.co2         ?? 400,
          temperature:   room.ambientTemp ?? 25,
          humidity:      room.ambientHum  ?? 50,
          timestamp:     now,
        });

        if (io) {
          io.emit('roomReading', {
            id:            String(roomReading._id),
            roomId:        String(dbRoom._id),
            healthCenterId: String(dbRoom.healthCenterId),
            airQuality:    roomReading.airQuality,
            co2:           roomReading.co2,
            temperature:   roomReading.temperature,
            humidity:      roomReading.humidity,
            timestamp:     roomReading.timestamp.toISOString(),
          });
        }
      } else {
        console.warn(`[Telemetry] No StorageRoom found for IP ${room.ip}`);
      }
    }

    // ── 2. Fridge readings (DHT11 sensors) ────────────────────────────────────
    const configPayload: Record<string, any> = {};

    if (Array.isArray(fridges)) {
      for (const fridgeData of fridges) {
        if (!fridgeData.ip) continue;

        const dbDevice = await DeviceModel.findOne({ ipAddress: fridgeData.ip }).lean();
        if (!dbDevice) {
          console.warn(`[Telemetry] No Device found for IP ${fridgeData.ip}`);
          continue;
        }

        const deviceId      = String(dbDevice._id);
        const fridgeId      = String(dbDevice.fridgeId);
        const healthCenterId = String(dbDevice.healthCenterId);

        // Save reading to DB
        const reading = await SensorReadingModel.create({
          deviceId:      dbDevice._id,
          fridgeId:      dbDevice.fridgeId,
          healthCenterId: dbDevice.healthCenterId,
          temperature:   fridgeData.temperature,
          humidity:      fridgeData.humidity,
          timestamp:     now,
        });

        // Update device status to online
        await DeviceModel.findByIdAndUpdate(deviceId, {
          status:  'online',
          lastSeen: now,
        });

        // Emit live reading via WebSocket
        if (io) {
          io.emit('reading', {
            id:            String(reading._id),
            deviceId,
            fridgeId,
            healthCenterId,
            temperature:   reading.temperature,
            humidity:      reading.humidity,
            timestamp:     reading.timestamp.toISOString(),
          });
        }

        // Build config response (ESP32 uses this to control relays)
        const dbFridge = await FridgeModel.findById(fridgeId).lean();
        configPayload[fridgeData.ip] = {
          min:  dbFridge?.targetTempMin  ?? 2,
          max:  dbFridge?.targetTempMax  ?? 8,
          sys:  dbDevice.systemEnabled   ?? true,
          fan:  dbDevice.fanEnabled      ?? false,
          comp: dbDevice.compressorEnabled ?? true,
        };
      }
    }

    // Emit online device count update
    if (io) {
      const onlineCount = await DeviceModel.countDocuments({ status: 'online' });
      io.emit('stats', { onlineDevices: onlineCount, activeAlerts: 0 });
    }

    return res.status(200).json({
      success: true,
      message: 'Telemetry received',
      config:  configPayload,
    });

  } catch (error) {
    console.error('[Telemetry] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

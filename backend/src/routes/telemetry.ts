import { Router, Request, Response } from 'express';
import { isConnected } from '../db';
import { Device as DeviceModel } from '../models/Device';
import { StorageRoom as StorageRoomModel } from '../models/StorageRoom';
import { RoomReading as RoomReadingModel } from '../models/RoomReading';
import { 
  devices as memDevices, 
  storageRooms as memRooms, 
  pushReading, 
  pushRoomReading, 
  latestReadings, 
  latestRoomReadings 
} from '../data/mockStore';

const router = Router();

// A simple static secret key for the ESP32 to authenticate
// In production, this should be in an environment variable
const TELEMETRY_SECRET = process.env.TELEMETRY_SECRET || 'supersecretkey123';

/**
 * Expected Payload from ESP32:
 * {
 *   "secret": "supersecretkey123",
 *   "room": {
 *     "ip": "192.168.1.20",
 *     "airQuality": 85
 *   },
 *   "fridges": [
 *     {
 *       "ip": "192.168.1.10",
 *       "temperature": 5.4,
 *       "humidity": 45
 *     },
 *     {
 *       "ip": "192.168.1.11",
 *       "temperature": -18.2,
 *       "humidity": 30
 *     }
 *   ]
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { secret, room, fridges } = req.body;

    if (secret !== TELEMETRY_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const io = req.app.get('io');

    // 1. Process Room (Air Quality)
    if (room && room.ip) {
      let roomId = '';
      let healthCenterId = '';

      if (isConnected()) {
        const dbRoom = await StorageRoomModel.findOne({ ipAddress: room.ip }).lean().catch(() => null);
        if (dbRoom) {
          roomId = String(dbRoom._id);
          healthCenterId = String(dbRoom.healthCenterId);
        }
      } else {
        const memRoom = memRooms.find(r => r.ipAddress === room.ip);
        if (memRoom) {
          roomId = memRoom.id;
          healthCenterId = memRoom.healthCenterId;
        }
      }

      if (roomId) {
        const roomReading = {
          id: `rr-${Date.now()}-${roomId}`,
          roomId,
          healthCenterId,
          airQuality: room.airQuality || 0,
          co2: 400, // Default baseline if not sent by ESP32
          temperature: room.ambientTemp ?? 25, 
          humidity: room.ambientHum ?? 50,
          timestamp: new Date().toISOString()
        };

        pushRoomReading(roomReading);
        latestRoomReadings.set(roomId, roomReading);

        if (io) {
          io.emit('roomReading', roomReading);
        }
      }
    }

    // 2. Process Fridges (Temperature / Humidity)
    if (Array.isArray(fridges)) {
      for (const fridgeData of fridges) {
        if (!fridgeData.ip) continue;

        let deviceId = '';
        let fridgeId = '';
        let healthCenterId = '';

        if (isConnected()) {
          const dbDevice = await DeviceModel.findOne({ ipAddress: fridgeData.ip }).lean().catch(() => null);
          if (dbDevice) {
            deviceId = String(dbDevice._id);
            fridgeId = String(dbDevice.fridgeId);
            healthCenterId = String(dbDevice.healthCenterId);
          }
        } else {
          const memDevice = memDevices.find(d => d.ipAddress === fridgeData.ip);
          if (memDevice) {
            deviceId = memDevice.id;
            fridgeId = memDevice.fridgeId;
            healthCenterId = memDevice.healthCenterId;
          }
        }

        if (deviceId) {
          const reading = {
            id: `r-${Date.now()}-${deviceId}`,
            deviceId,
            fridgeId,
            healthCenterId,
            temperature: fridgeData.temperature,
            humidity: fridgeData.humidity,
            timestamp: new Date().toISOString()
          };

          pushReading(reading);
          latestReadings.set(deviceId, reading);

          if (io) {
            io.emit('reading', reading);
          }
        }
      }
    }

    // Emit a general stats update
    if (io) {
       io.emit('stats', { onlineDevices: memDevices.filter(d => d.status === 'online').length, activeAlerts: 0 });
    }

    return res.status(200).json({ success: true, message: 'Telemetry received successfully' });
  } catch (error) {
    console.error('Error processing telemetry:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

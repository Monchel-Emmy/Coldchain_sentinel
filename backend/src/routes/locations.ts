import { Router } from 'express';
import { StorageRoom } from '../models/StorageRoom';
import { HealthCenter } from '../models/HealthCenter';

const router = Router();

router.get('/', async (req, res) => {
  const storageRooms = await StorageRoom.find({}).lean();
  const result = await Promise.all(storageRooms.map(async room => {
    const healthCenter = await HealthCenter.findById(room.healthCenterId).lean();
    return {
      id: room._id,
      name: room.name,
      description: `Storage room at ${healthCenter?.name || 'Unknown Health Center'}`,
      address: healthCenter?.address || '',
      healthCenterId: room.healthCenterId,
      ipAddress: room.ipAddress,
      status: room.status,
      createdAt: room.createdAt,
      threshold: {
        tempMin: 2,
        tempMax: 8,
        humidityMin: 40,
        humidityMax: 70,
        airQualityMax: 100,
        co2Max: 1000
      }
    };
  }));
  res.json(result);
});

router.get('/:id', async (req, res) => {
  const room = await StorageRoom.findById(req.params.id).lean();
  if (!room) return res.status(404).json({ error: 'Storage room not found' });
  const healthCenter = await HealthCenter.findById(room.healthCenterId).lean();
  res.json({
    id: room._id,
    name: room.name,
    description: `Storage room at ${healthCenter?.name || 'Unknown Health Center'}`,
    address: healthCenter?.address || '',
    healthCenterId: room.healthCenterId,
    ipAddress: room.ipAddress,
    status: room.status,
    createdAt: room.createdAt,
    threshold: {
      tempMin: 2,
      tempMax: 8,
      humidityMin: 40,
      humidityMax: 70,
      airQualityMax: 100,
      co2Max: 1000
    }
  });
});

router.post('/', async (req, res) => {
  const { name, healthCenterId, ipAddress } = req.body;
  if (!name || !healthCenterId) return res.status(400).json({ error: 'Name and health center ID are required' });
  
  const room = await StorageRoom.create({ name, healthCenterId, ipAddress: ipAddress || '' });
  res.status(201).json({
    id: room._id,
    name: room.name,
    description: `Storage room`,
    address: '',
    healthCenterId: room.healthCenterId,
    ipAddress: room.ipAddress,
    status: room.status,
    createdAt: room.createdAt,
    threshold: {
      tempMin: 2,
      tempMax: 8,
      humidityMin: 40,
      humidityMax: 70,
      airQualityMax: 100,
      co2Max: 1000
    }
  });
});

router.put('/:id', async (req, res) => {
  const room = await StorageRoom.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!room) return res.status(404).json({ error: 'Storage room not found' });
  
  const healthCenter = await HealthCenter.findById(room.healthCenterId).lean();
  res.json({
    id: room._id,
    name: room.name,
    description: `Storage room at ${healthCenter?.name || 'Unknown Health Center'}`,
    address: healthCenter?.address || '',
    healthCenterId: room.healthCenterId,
    ipAddress: room.ipAddress,
    status: room.status,
    createdAt: room.createdAt,
    threshold: {
      tempMin: 2,
      tempMax: 8,
      humidityMin: 40,
      humidityMax: 70,
      airQualityMax: 100,
      co2Max: 1000
    }
  });
});

router.delete('/:id', async (req, res) => {
  const room = await StorageRoom.findByIdAndDelete(req.params.id);
  if (!room) return res.status(404).json({ error: 'Storage room not found' });
  res.json({ success: true });
});


export default router;

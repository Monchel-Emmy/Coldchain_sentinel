import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { HealthCenter } from '../models/HealthCenter';
import { StorageRoom } from '../models/StorageRoom';
import { Fridge } from '../models/Fridge';
import { Device } from '../models/Device';
import { Vaccine } from '../models/Vaccine';
import { Alert } from '../models/Alert';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { SensorReading } from '../models/SensorReading';

dotenv.config();

async function run() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coldchain-sentinel';
  console.log('Connecting to MongoDB...', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  // Find University of Rwanda health center
  let urHc = await HealthCenter.findOne({ name: /University of Rwanda/i });
  if (!urHc) {
    console.log('UR Health Center not found. Creating it...');
    urHc = await HealthCenter.create({
      name: 'University of Rwanda',
      type: 'hospital',
      region: 'Kigali',
      district: 'Nyarugenge',
      address: 'KN 73 St, Kigali',
      contactName: 'Dr. Emmy Monchel',
      contactPhone: '+250 788 123 456',
      status: 'active'
    });
  }
  console.log('UR Health Center ID:', urHc._id);

  // Find or create Storage Room
  let room = await StorageRoom.findOne({ healthCenterId: urHc._id });
  if (!room) {
    console.log('Creating storage room for UR...');
    room = await StorageRoom.create({
      name: 'Central Storage Room',
      healthCenterId: urHc._id,
      ipAddress: '192.168.1.20',
      status: 'online',
      airQuality: 450,
      co2: 400,
      temperature: 24.5,
      humidity: 62.0
    });
  }

  // Fridges: let's make sure we have exactly 2 fridges
  // Main Refrigerator
  let f1 = await Fridge.findOne({ healthCenterId: urHc._id, name: 'Main Refrigerator' });
  if (!f1) {
    console.log('Creating Main Refrigerator...');
    f1 = await Fridge.create({
      name: 'Main Refrigerator',
      healthCenterId: urHc._id,
      roomId: room._id,
      modelName: 'Vestfrost MK 144',
      serialNumber: 'VF-UR-144',
      type: 'refrigerator',
      targetTempMin: 2,
      targetTempMax: 8,
      targetHumidityMin: 40,
      targetHumidityMax: 70,
      status: 'operational',
      currentTemp: 5.4,
      currentHumidity: 58.2,
      lastUpdated: new Date()
    });
  }

  // Vaccine Freezer
  let f2 = await Fridge.findOne({ healthCenterId: urHc._id, name: 'Vaccine Freezer' });
  if (!f2) {
    console.log('Creating Vaccine Freezer...');
    f2 = await Fridge.create({
      name: 'Vaccine Freezer',
      healthCenterId: urHc._id,
      roomId: room._id,
      modelName: 'Haier HBC-150',
      serialNumber: 'HBC-UR-150',
      type: 'freezer',
      targetTempMin: -25,
      targetTempMax: -15,
      targetHumidityMin: 20,
      targetHumidityMax: 50,
      status: 'operational',
      currentTemp: 1.2,
      currentHumidity: 35.0,
      lastUpdated: new Date()
    });
  }

  // Devices (DHT11/Sensors)
  let dev1 = await Device.findOne({ serialNumber: 'SN-UR-001' });
  if (!dev1) {
    console.log('Creating Sensor 1...');
    dev1 = await Device.create({
      name: 'Sensor — Main Refrigerator',
      serialNumber: 'SN-UR-001',
      fridgeId: f1._id,
      healthCenterId: urHc._id,
      ipAddress: '192.168.1.10',
      status: 'online',
      firmware: 'v2.1.4',
      fanEnabled: true,
      systemEnabled: true,
      fanSpeed: 60,
      compressorEnabled: true,
      lastSeen: new Date()
    });
  }

  let dev2 = await Device.findOne({ serialNumber: 'SN-UR-002' });
  if (!dev2) {
    console.log('Creating Sensor 2...');
    dev2 = await Device.create({
      name: 'Sensor — Vaccine Freezer',
      serialNumber: 'SN-UR-002',
      fridgeId: f2._id,
      healthCenterId: urHc._id,
      ipAddress: '192.168.1.11',
      status: 'warning',
      firmware: 'v2.1.4',
      fanEnabled: true,
      systemEnabled: true,
      fanSpeed: 80,
      compressorEnabled: true,
      lastSeen: new Date()
    });
  }

  // Vaccines inside these fridges
  const vaccineCount = await Vaccine.countDocuments({ healthCenterId: urHc._id });
  if (vaccineCount === 0) {
    console.log('Creating vaccines...');
    await Vaccine.insertMany([
      { name: 'BCG (UR)', type: 'BCG', manufacturer: 'Serum Institute of India', batchNumber: 'BCG-UR-001', quantity: 500, unit: 'doses', fridgeId: f1._id, healthCenterId: urHc._id, expiryDate: new Date('2027-12-31'), storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 40, humidityMax: 70 }, status: 'compliant' },
      { name: 'Oral Polio (OPV)', type: 'Polio', manufacturer: 'Sanofi Pasteur', batchNumber: 'POL-UR-045', quantity: 300, unit: 'doses', fridgeId: f1._id, healthCenterId: urHc._id, expiryDate: new Date('2027-06-30'), storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 40, humidityMax: 70 }, status: 'compliant' },
      { name: 'Measles (UR)', type: 'Measles', manufacturer: 'Merck', batchNumber: 'MEA-UR-007', quantity: 150, unit: 'doses', fridgeId: f2._id, healthCenterId: urHc._id, expiryDate: new Date('2028-03-20'), storageRequirements: { tempMin: -25, tempMax: -15, humidityMin: 20, humidityMax: 50 }, status: 'compliant' },
    ]);
  }

  // Active Alert for Vaccine Freezer (since temp is 1.2°C and target is -25 to -15°C)
  let alert = await Alert.findOne({ deviceId: dev2._id, acknowledged: false });
  if (!alert) {
    console.log('Creating alert...');
    await Alert.create({
      deviceId: dev2._id,
      fridgeId: f2._id,
      healthCenterId: urHc._id,
      type: 'temperature_high',
      severity: 'critical',
      message: 'Temperature exceeded max threshold (-15°C) — Vaccine Freezer',
      value: 1.2,
      threshold: -15,
      acknowledged: false
    });
  }

  // Seed historical sensor readings in MongoDB (288 readings per device, last 24h at 5-min intervals)
  console.log('Seeding sensor readings for UR devices...');
  await SensorReading.deleteMany({ deviceId: { $in: [dev1._id, dev2._id] } });

  const readings: any[] = [];
  const nowMs = Date.now();

  for (let i = 287; i >= 0; i--) {
    const timestamp = new Date(nowMs - i * 5 * 60 * 1000);
    
    // Main Refrigerator: normal temperature around 5.4°C
    readings.push({
      deviceId: dev1._id,
      fridgeId: f1._id,
      healthCenterId: urHc._id,
      temperature: parseFloat((5.4 + (Math.random() - 0.5) * 1.2).toFixed(1)),
      humidity: parseFloat((58.2 + (Math.random() - 0.5) * 5.0).toFixed(1)),
      timestamp
    });

    // Vaccine Freezer: failure scenario (rising temp from -18°C up to 1.2°C)
    const progress = (287 - i) / 287; // 0 to 1
    const baseTemp = -18.0 + progress * 19.2; // -18.0 to 1.2
    const temperature = parseFloat((baseTemp + (Math.random() - 0.5) * 0.8).toFixed(1));

    readings.push({
      deviceId: dev2._id,
      fridgeId: f2._id,
      healthCenterId: urHc._id,
      temperature,
      humidity: parseFloat((35.0 + (Math.random() - 0.5) * 4.0).toFixed(1)),
      timestamp
    });
  }

  await SensorReading.insertMany(readings);
  console.log(`Successfully seeded ${readings.length} readings.`);

  // Let's also check if there is a Health Center Manager for UR
  const roleManager = await Role.findOne({ name: 'Health Center Manager' });
  if (roleManager) {
    let user = await User.findOne({ email: 'ur_manager@coldchain.rw' });
    if (!user) {
      console.log('Creating manager user ur_manager@coldchain.rw...');
      user = await User.create({
        name: 'Emmy Monchel',
        email: 'ur_manager@coldchain.rw',
        password: await (await import('bcryptjs')).default.hash('URManager@1234', 10),
        roleId: roleManager._id,
        healthCenterId: urHc._id,
        status: 'active',
        emailVerified: true
      });
    }
    console.log('Manager login: ur_manager@coldchain.rw / URManager@1234');
  }

  console.log('Done seeding University of Rwanda!');
  await mongoose.disconnect();
}

run().catch(console.error);

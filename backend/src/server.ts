import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectDB } from './db';
import { seedIfEmpty } from './data/seed';
import { configurePassport } from './config/passport';

import dashboardRoutes from './routes/dashboard';
import readingsRoutes from './routes/readings';
import authRoutes from './routes/auth';
import healthCenterRoutes from './routes/centrales';
import fridgeRoutes from './routes/frigos';
import roomRoutes from './routes/rooms';
import deviceRoutes from './routes/devices';
import vaccineRoutes from './routes/vaccines';
import alertRoutes from './routes/alerts';
import userRoutes from './routes/users';
import roleRoutes from './routes/roles';
import predictionRoutes from './routes/predictions';

import { devices as memDevices, generateReading, pushReading, latestReadings, alerts as memAlerts, Alert as AlertType, fridges as memFridges, storageRooms, generateRoomReading, pushRoomReading, latestRoomReadings } from './data/mockStore';
import { isConnected } from './db';
import { Device as DeviceModel } from './models/Device';
import { Fridge as FridgeModel } from './models/Fridge';
import { Alert as AlertModel } from './models/Alert';
import { StorageRoom as StorageRoomModel } from './models/StorageRoom';
import { RoomReading } from './models/RoomReading';

import passport from 'passport';

dotenv.config();

// Connect to MongoDB, seed, and configure Google OAuth
connectDB().then(() => seedIfEmpty()).catch(console.error);
configurePassport();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow localhost for development and Vercel for production
      if (!origin || 
          origin.match(/^http:\/\/localhost:\d+$/) || 
          origin === 'https://coldchain-sentinel.vercel.app') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from any localhost port (dev), no origin (Postman/curl), or Vercel frontend
    if (!origin || 
        origin.match(/^http:\/\/localhost:\d+$/) || 
        origin === 'https://coldchain-sentinel.vercel.app') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(passport.initialize());

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/readings', readingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/health-centers', healthCenterRoutes);
app.use('/api/fridges', fridgeRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/vaccines', vaccineRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/predictions', predictionRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }));

// Public MongoDB test endpoint
app.get('/api/test-mongodb', async (_req, res) => {
  try {
    const { HealthCenter } = await import('./models/HealthCenter');
    const { Role } = await import('./models/Role');
    const { User } = await import('./models/User');
    const healthCenterCount = await HealthCenter.countDocuments();
    const roleCount = await Role.countDocuments();
    const userCount = await User.countDocuments();
    
    res.json({ 
      status: 'success', 
      message: 'MongoDB operations working perfectly',
      data: {
        healthCenterCount,
        roleCount,
        userCount,
        connected: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'MongoDB operations failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      connected: false
    });
  }
});

// ── Simple real-time simulation ──────────────────────────────────────────────
async function runSimulation() {
  try {
    const activeDevices = memDevices.filter((d: any) => d.status === 'online');

    for (const dev of activeDevices) {
      const rand = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(1));
      
      const reading = {
        id: `r-${Date.now()}-${dev.id}`,
        deviceId: dev.id,
        fridgeId: dev.fridgeId,
        healthCenterId: dev.healthCenterId,
        temperature: rand(2, 8),
        humidity: rand(45, 65),
        airQuality: rand(70, 95),
        timestamp: new Date().toISOString(),
      };

      pushReading(reading);
      latestReadings.set(dev.id, reading);
      io.emit('reading', reading);
    }

    io.emit('stats', { onlineDevices: activeDevices.length, activeAlerts: 0 });
  } catch (error) {
    console.error('Simulation error:', error);
  }
}

// Run simulation every 5 seconds
setInterval(() => { runSimulation().catch(console.error); }, 5000);

io.on('connection', socket => {
  console.log(`[WS] Client connected: ${socket.id}`);
  
  // Send initial data
  const initialReadings = Array.from(latestReadings.values());
  socket.emit('initial', initialReadings);

  socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
});

server.listen(PORT, () => {
  console.log(`🚀 ColdChain Sentinel API running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready`);
});

export { app, io };

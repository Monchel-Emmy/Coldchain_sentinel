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
import telemetryRoutes from './routes/telemetry';

import { Device as DeviceModel } from './models/Device';
import { SensorReading as SensorReadingModel } from './models/SensorReading';

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

app.set('io', io);

const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
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
app.use('/api/telemetry', telemetryRoutes);

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));

app.get('/api/test-mongodb', async (_req, res) => {
  try {
    const { HealthCenter } = await import('./models/HealthCenter');
    const { Role } = await import('./models/Role');
    const { User } = await import('./models/User');
    res.json({
      status: 'success',
      data: {
        healthCenterCount: await HealthCenter.countDocuments(),
        roleCount:         await Role.countDocuments(),
        userCount:         await User.countDocuments(),
        connected: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      connected: false,
    });
  }
});

// ── WebSocket: send latest DB readings to newly connected clients ─────────────
io.on('connection', async socket => {
  console.log(`[WS] Client connected: ${socket.id}`);

  try {
    const devices = await DeviceModel.find().lean();
    const initialReadings = await Promise.all(devices.map(async dev => {
      const r = await SensorReadingModel
        .findOne({ deviceId: dev._id })
        .sort({ timestamp: -1 })
        .lean();
      if (!r) return null;
      return {
        id:             String(r._id),
        deviceId:       String(r.deviceId),
        fridgeId:       String(r.fridgeId),
        healthCenterId: String(r.healthCenterId),
        temperature:    r.temperature,
        humidity:       r.humidity,
        timestamp:      r.timestamp.toISOString(),
      };
    }));
    socket.emit('initial', initialReadings.filter(Boolean));
  } catch {
    socket.emit('initial', []);
  }

  socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
});

server.listen(PORT, () => {
  console.log(`🚀 ColdChain Sentinel API running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready — waiting for real ESP32 telemetry`);
});

export { app, io };

import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  // Read AFTER dotenv.config() has run in server.ts
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coldchain-sentinel';
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected: ${MONGO_URI.replace(/:([^:@]+)@/, ':****@')}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    console.warn('⚠️  Running with in-memory demo data instead.');
  }
}

export const isConnected = () => mongoose.connection.readyState === 1;

export default mongoose;

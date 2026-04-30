import { Schema, model, Document, Types } from 'mongoose';

export interface IRoomReading extends Document {
  roomId: Types.ObjectId;
  healthCenterId: Types.ObjectId;
  airQuality: number;   // AQI
  co2: number;          // ppm
  temperature: number;  // ambient room temp
  humidity: number;     // ambient room humidity
  timestamp: Date;
}

const schema = new Schema<IRoomReading>({
  roomId:         { type: Schema.Types.ObjectId, ref: 'StorageRoom', required: true },
  healthCenterId: { type: Schema.Types.ObjectId, ref: 'HealthCenter', required: true },
  airQuality:     { type: Number, required: true },
  co2:            { type: Number, required: true },
  temperature:    { type: Number, required: true },
  humidity:       { type: Number, required: true },
  timestamp:      { type: Date, default: Date.now },
}, {
  // No createdAt/updatedAt — timestamp field serves that purpose
  // TTL index: auto-delete readings older than 7 days to keep DB lean
  timeseries: undefined,
});

// Auto-delete readings older than 7 days
schema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const RoomReading = model<IRoomReading>('RoomReading', schema);

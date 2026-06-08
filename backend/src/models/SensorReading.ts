import { Schema, model, Document, Types } from 'mongoose';

export interface ISensorReading extends Document {
  deviceId: Types.ObjectId;
  fridgeId: Types.ObjectId;
  healthCenterId: Types.ObjectId;
  temperature: number;
  humidity: number;
  timestamp: Date;
}

const schema = new Schema<ISensorReading>({
  deviceId:       { type: Schema.Types.ObjectId, ref: 'Device',       required: true },
  fridgeId:       { type: Schema.Types.ObjectId, ref: 'Fridge',       required: true },
  healthCenterId: { type: Schema.Types.ObjectId, ref: 'HealthCenter', required: true },
  temperature:    { type: Number, required: true },
  humidity:       { type: Number, required: true },
  timestamp:      { type: Date, default: Date.now },
});

// Index for fast device history queries
schema.index({ deviceId: 1, timestamp: -1 });

// Auto-delete readings older than 7 days
schema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const SensorReading = model<ISensorReading>('SensorReading', schema);

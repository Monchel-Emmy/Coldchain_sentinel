import { Schema, model, Document, Types } from 'mongoose';

export interface IAlert extends Document {
  deviceId: Types.ObjectId;
  fridgeId: Types.ObjectId;
  healthCenterId: Types.ObjectId;
  type: 'temperature_high' | 'temperature_low' | 'humidity_high' | 'humidity_low' | 'device_offline' | 'power_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
  createdAt: Date;
}

const schema = new Schema<IAlert>({
  deviceId:       { type: Schema.Types.ObjectId, ref: 'Device', required: true },
  fridgeId:       { type: Schema.Types.ObjectId, ref: 'Fridge', required: true },
  healthCenterId: { type: Schema.Types.ObjectId, ref: 'HealthCenter', required: true },
  type:           { type: String, enum: ['temperature_high','temperature_low','humidity_high','humidity_low','device_offline','power_failure'], required: true },
  severity:       { type: String, enum: ['low','medium','high','critical'], required: true },
  message:        { type: String, required: true },
  value:          { type: Number, default: 0 },
  threshold:      { type: Number, default: 0 },
  acknowledged:   { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Alert = model<IAlert>('Alert', schema);

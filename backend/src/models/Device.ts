import { Schema, model, Document, Types } from 'mongoose';

export interface IDevice extends Document {
  name: string;
  serialNumber: string;
  fridgeId: Types.ObjectId;
  healthCenterId: Types.ObjectId;
  ipAddress: string;
  status: 'online' | 'offline' | 'warning';
  firmware: string;
  lastSeen: Date;
  registeredAt: Date;
  // IoT controls (embedded)
  fanEnabled: boolean;
  systemEnabled: boolean;
  fanSpeed: number;
  compressorEnabled: boolean;
}

const schema = new Schema<IDevice>({
  name:              { type: String, required: true },
  serialNumber:      { type: String, required: true, unique: true },
  fridgeId:          { type: Schema.Types.ObjectId, ref: 'Fridge', required: true },
  healthCenterId:    { type: Schema.Types.ObjectId, ref: 'HealthCenter', required: true },
  ipAddress:         { type: String, default: '' },
  status:            { type: String, enum: ['online','offline','warning'], default: 'offline' },
  firmware:          { type: String, default: 'v1.0.0' },
  lastSeen:          { type: Date, default: Date.now },
  registeredAt:      { type: Date, default: Date.now },
  // controls
  fanEnabled:        { type: Boolean, default: false },
  systemEnabled:     { type: Boolean, default: false },
  fanSpeed:          { type: Number, default: 0 },
  compressorEnabled: { type: Boolean, default: false },
});

export const Device = model<IDevice>('Device', schema);

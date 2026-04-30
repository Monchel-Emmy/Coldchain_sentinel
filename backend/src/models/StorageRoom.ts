import { Schema, model, Document, Types } from 'mongoose';

export interface IStorageRoom extends Document {
  name: string;
  healthCenterId: Types.ObjectId;
  ipAddress: string;
  status: 'online' | 'offline' | 'warning';
  createdAt: Date;
}

const schema = new Schema<IStorageRoom>({
  name:           { type: String, required: true },
  healthCenterId: { type: Schema.Types.ObjectId, ref: 'HealthCenter', required: true },
  ipAddress:      { type: String, default: '' },
  status:         { type: String, enum: ['online','offline','warning'], default: 'online' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const StorageRoom = model<IStorageRoom>('StorageRoom', schema);

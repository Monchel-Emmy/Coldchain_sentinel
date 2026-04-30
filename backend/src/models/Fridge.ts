import { Schema, model, Document, Types } from 'mongoose';

export interface IFridge extends Document {
  name: string;
  healthCenterId: Types.ObjectId;
  roomId?: Types.ObjectId;       // optional
  modelName: string;       // renamed from 'model' to avoid conflict with Mongoose Document.model
  serialNumber: string;
  type: 'refrigerator' | 'freezer' | 'cold_room';
  targetTempMin: number;
  targetTempMax: number;
  targetHumidityMin: number;
  targetHumidityMax: number;
  status: 'operational' | 'maintenance' | 'defective';
  installedAt: Date;
  createdAt: Date;
}

const schema = new Schema<IFridge>({
  name:              { type: String, required: true },
  healthCenterId:    { type: Schema.Types.ObjectId, ref: 'HealthCenter', required: true },
  roomId:            { type: Schema.Types.ObjectId, ref: 'StorageRoom' },  // optional — assigned later
  modelName:         { type: String, default: '' },
  serialNumber:      { type: String, default: '' },
  type:              { type: String, enum: ['refrigerator','freezer','cold_room'], required: true },
  targetTempMin:     { type: Number, default: 2 },
  targetTempMax:     { type: Number, default: 8 },
  targetHumidityMin: { type: Number, default: 40 },
  targetHumidityMax: { type: Number, default: 70 },
  status:            { type: String, enum: ['operational','maintenance','defective'], default: 'operational' },
  installedAt:       { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });

// ── Cascade delete when a Fridge is removed ───────────────────────────────────
schema.post('findOneAndDelete', async function(doc) {
  if (!doc) return;
  const { Device }  = await import('./Device');
  const { Vaccine } = await import('./Vaccine');
  const { Alert }   = await import('./Alert');
  const fridgeId = doc._id;
  await Device.deleteMany({ fridgeId });
  await Vaccine.deleteMany({ fridgeId });
  await Alert.deleteMany({ fridgeId });
});

export const Fridge = model<IFridge>('Fridge', schema);

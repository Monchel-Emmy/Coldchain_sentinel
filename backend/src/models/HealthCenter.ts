import { Schema, model, Document } from 'mongoose';

export interface IHealthCenter extends Document {
  name: string;
  type: 'health_center' | 'dispensary' | 'hospital' | 'csps';
  region: string;
  district: string;
  address: string;
  contactName: string;
  contactPhone: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

const schema = new Schema<IHealthCenter>({
  name:         { type: String, required: true },
  type:         { type: String, enum: ['health_center','dispensary','hospital','csps'], required: true },
  region:       { type: String, default: '' },
  district:     { type: String, default: '' },
  address:      { type: String, default: '' },
  contactName:  { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  status:       { type: String, enum: ['active','inactive'], default: 'active' },
}, { timestamps: { createdAt: true, updatedAt: false } });

// ── Cascade delete when a HealthCenter is removed ─────────────────────────────
schema.post('findOneAndDelete', async function(doc) {
  if (!doc) return;
  const { StorageRoom } = await import('./StorageRoom');
  const { Fridge }      = await import('./Fridge');
  const { Device }      = await import('./Device');
  const { Vaccine }     = await import('./Vaccine');
  const { Alert }       = await import('./Alert');
  const { User }        = await import('./User');

  const hcId = doc._id;

  // Delete all storage rooms
  await StorageRoom.deleteMany({ healthCenterId: hcId });

  // Get all fridges to cascade further
  const fridgeIds = (await Fridge.find({ healthCenterId: hcId }).select('_id').lean()).map(f => f._id);
  await Fridge.deleteMany({ healthCenterId: hcId });

  // Delete devices, vaccines, alerts tied to those fridges or the HC
  await Device.deleteMany({ $or: [{ healthCenterId: hcId }, { fridgeId: { $in: fridgeIds } }] });
  await Vaccine.deleteMany({ $or: [{ healthCenterId: hcId }, { fridgeId: { $in: fridgeIds } }] });
  await Alert.deleteMany({ healthCenterId: hcId });

  // Nullify healthCenterId on users (don't delete users)
  await User.updateMany({ healthCenterId: hcId }, { $unset: { healthCenterId: '' } });
});

export const HealthCenter = model<IHealthCenter>('HealthCenter', schema);

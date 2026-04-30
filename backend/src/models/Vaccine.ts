import { Schema, model, Document, Types } from 'mongoose';

export interface IVaccine extends Document {
  name: string;
  type: string;
  manufacturer: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  fridgeId: Types.ObjectId;
  healthCenterId: Types.ObjectId;
  expiryDate: Date;
  storageRequirements: {
    tempMin: number;
    tempMax: number;
    humidityMin: number;
    humidityMax: number;
  };
  status: 'compliant' | 'at_risk' | 'expired' | 'recalled';
  createdAt: Date;
}

const schema = new Schema<IVaccine>({
  name:                { type: String, required: true },
  type:                { type: String, default: '' },
  manufacturer:        { type: String, default: '' },
  batchNumber:         { type: String, default: '' },
  quantity:            { type: Number, default: 0 },
  unit:                { type: String, default: 'doses' },
  fridgeId:            { type: Schema.Types.ObjectId, ref: 'Fridge', required: true },
  healthCenterId:      { type: Schema.Types.ObjectId, ref: 'HealthCenter', required: true },
  expiryDate:          { type: Date, required: true },
  storageRequirements: {
    tempMin:     { type: Number, default: 2 },
    tempMax:     { type: Number, default: 8 },
    humidityMin: { type: Number, default: 40 },
    humidityMax: { type: Number, default: 70 },
  },
  status: { type: String, enum: ['compliant','at_risk','expired','recalled'], default: 'compliant' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Vaccine = model<IVaccine>('Vaccine', schema);

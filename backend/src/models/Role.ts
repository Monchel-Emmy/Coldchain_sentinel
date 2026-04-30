import { Schema, model, Document } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description: string;
  permissions: string[];
  createdAt: Date;
}

const schema = new Schema<IRole>({
  name:        { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  permissions: [{ type: String }],
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Role = model<IRole>('Role', schema);

import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;          // optional — Google users have no password
  googleId?: string;          // Google OAuth ID
  avatar?: string;            // Google profile picture
  authProvider: 'local' | 'google';
  roleId: Types.ObjectId;
  healthCenterId?: Types.ObjectId;
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: Date;
  createdAt: Date;
  otpCode?: string;
  otpExpiresAt?: Date;
  emailVerified: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const schema = new Schema<IUser>({
  name:           { type: String, required: true },
  email:          { type: String, required: true, unique: true, lowercase: true },
  password:       { type: String, select: false },          // optional for Google users
  googleId:       { type: String, sparse: true, unique: true },
  avatar:         { type: String },
  authProvider:   { type: String, enum: ['local','google'], default: 'local' },
  roleId:         { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  healthCenterId: { type: Schema.Types.ObjectId, ref: 'HealthCenter' },
  status:         { type: String, enum: ['active','inactive','pending'], default: 'pending' },
  lastLogin:      { type: Date },
  otpCode:        { type: String, select: false },
  otpExpiresAt:   { type: Date, select: false },
  emailVerified:  { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Hash password before saving
schema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare password method
schema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false; // Google users have no password
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>('User', schema);

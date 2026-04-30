import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password?: string; // For email/password auth
  googleId?: string; // For Google OAuth
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'technician' | 'viewer';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  emailVerified: boolean;
  otp?: string;
  otpExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  profilePicture?: string;
  phone?: string;
  department?: string;
  permissions?: string[];
}

export interface OTPRequest {
  email: string;
  otp: string;
  expiry: Date;
  attempts: number;
}

// In-memory storage for demo purposes
export const users: User[] = [
  {
    id: 'admin-001',
    email: 'admin@coldchain.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    status: 'approved',
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLogin: new Date(),
    permissions: ['all']
  }
];

export const otpRequests: OTPRequest[] = [];

// Helper functions
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const findUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

export const findUserById = (id: string): User | undefined => {
  return users.find(user => user.id === id);
};

export const findUserByGoogleId = (googleId: string): User | undefined => {
  return users.find(user => user.googleId === googleId);
};

export const createUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'emailVerified'>): User => {
  const newUser: User = {
    ...userData,
    id: uuidv4(),
    status: 'pending',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  users.push(newUser);
  return newUser;
};

export const updateUser = (id: string, updates: Partial<User>): User | null => {
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) return null;
  
  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: new Date()
  };
  return users[userIndex];
};

export const storeOTP = (email: string, otp: string): void => {
  // Remove any existing OTP for this email
  const existingIndex = otpRequests.findIndex(req => req.email === email);
  if (existingIndex !== -1) {
    otpRequests.splice(existingIndex, 1);
  }
  
  // Store new OTP
  otpRequests.push({
    email,
    otp,
    expiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0
  });
};

export const validateOTP = (email: string, otp: string): boolean => {
  const request = otpRequests.find(req => req.email === email);
  if (!request) return false;
  
  // Check if OTP is expired
  if (new Date() > request.expiry) {
    const index = otpRequests.indexOf(request);
    otpRequests.splice(index, 1);
    return false;
  }
  
  // Check attempts (max 3)
  if (request.attempts >= 3) {
    const index = otpRequests.indexOf(request);
    otpRequests.splice(index, 1);
    return false;
  }
  
  // Validate OTP
  if (request.otp === otp) {
    const index = otpRequests.indexOf(request);
    otpRequests.splice(index, 1);
    return true;
  }
  
  request.attempts++;
  return false;
};

export const getPendingUsers = (): User[] => {
  return users.filter(user => user.status === 'pending');
};

export const approveUser = (id: string): User | null => {
  return updateUser(id, { status: 'approved' });
};

export const rejectUser = (id: string): User | null => {
  return updateUser(id, { status: 'rejected' });
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Role } from '../models/Role';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  userHealthCenterId?: string | null;
  userPermissions?: string[];
  userRoleName?: string;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Full auth middleware — attaches user context to every request
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await User.findById(decoded.userId).lean();
    if (!user || user.status === 'inactive') {
      return res.status(401).json({ error: 'Account not found or inactive' });
    }
    const role = await Role.findById(user.roleId).lean();

    req.userId = String(user._id);
    req.userRoleName = role?.name || '';
    req.userPermissions = role?.permissions || [];
    // Super Admin has no healthCenterId restriction (null = see all)
    req.userHealthCenterId = role?.name === 'Super Admin'
      ? null
      : user.healthCenterId ? String(user.healthCenterId) : undefined;

    next();
  } catch {
    return res.status(500).json({ error: 'Authentication error' });
  }
}

// Permission guard middleware factory
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userPermissions?.includes(permission)) {
      return res.status(403).json({ error: `Permission denied: ${permission}` });
    }
    next();
  };
}

// Returns undefined (no filter) for Super Admin, or the user's healthCenterId
export function getHCFilter(req: AuthRequest): string | undefined {
  return req.userHealthCenterId ?? undefined;
}

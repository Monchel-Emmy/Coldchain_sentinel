import jwt from 'jsonwebtoken';
import { User } from '../data/users';

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  status: string;
}

class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'coldchain-sentinel',
      audience: 'coldchain-client'
    } as jwt.SignOptions);
  }

  generateRefreshToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      type: 'refresh'
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'coldchain-sentinel',
      audience: 'coldchain-client'
    } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'coldchain-sentinel',
        audience: 'coldchain-client'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  verifyRefreshToken(token: string): { id: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'coldchain-sentinel',
        audience: 'coldchain-client'
      }) as any;

      if (decoded.type !== 'refresh') {
        return null;
      }

      return {
        id: decoded.id,
        email: decoded.email
      };
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  generateTokenPair(user: User) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        permissions: user.permissions || []
      }
    };
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

export const jwtService = new JWTService();

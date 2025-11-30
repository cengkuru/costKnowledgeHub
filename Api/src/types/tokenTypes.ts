import { z } from 'zod';

// ========== Token Payloads ==========
export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
  jti: string; // Unique token ID for revocation
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  tokenFamily: string; // For rotation tracking
  jti: string;
  type: 'refresh';
}

// ========== Token Pair ==========
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ========== Token Revocation ==========
export interface RevokedToken {
  jti: string;
  userId: string;
  revokedAt: Date;
  expiresAt: Date;
}

export interface TokenBlacklistEntry {
  jti: string;
  userId: string;
  expiresAt: Date;
}

// ========== Password Reset ==========
export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const PasswordResetSchema = z.object({
  token: z.string().min(1, 'Reset token required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
});

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

export interface PasswordResetToken {
  userId: string;
  email: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

// ========== Session ==========
export interface UserSession {
  _id?: string;
  userId: string;
  jti: string;
  refreshToken: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isRevoked: boolean;
}

// ========== Auth Response ==========
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
  };
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

// ========== Session Response ==========
export interface SessionResponse {
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

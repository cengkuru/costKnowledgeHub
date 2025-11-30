import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { AccessTokenPayload, RefreshTokenPayload, TokenPair } from '../types/tokenTypes';

/**
 * Token Service
 * Handles generation, verification, and management of JWT tokens
 */
export const tokenService = {
  /**
   * Generate access and refresh token pair
   */
  generateTokenPair(
    userId: string,
    email: string,
    role: 'admin' | 'user'
  ): TokenPair {
    const jti = randomUUID();
    const tokenFamily = randomUUID();

    // Generate access token (short-lived, 15 minutes)
    const accessPayload: AccessTokenPayload = {
      userId,
      email,
      role,
      jti,
      type: 'access',
    };

    const accessToken = jwt.sign(accessPayload, config.jwtSecret, {
      expiresIn: '15m',
    });

    // Generate refresh token (long-lived, 7 days)
    const refreshPayload: RefreshTokenPayload = {
      userId,
      tokenFamily,
      jti: randomUUID(), // Different JTI for refresh token
      type: 'refresh',
    };

    const refreshToken = jwt.sign(refreshPayload, config.jwtSecret, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  },

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as AccessTokenPayload;

      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  },

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as RefreshTokenPayload;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  },

  /**
   * Extract JTI from token without verification
   * Useful for blacklisting before token expires
   */
  extractJTI(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.jti || null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Extract userId from token without verification
   */
  extractUserId(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.userId || null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }

      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    } catch (error) {
      return true;
    }
  },
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { ApiError } from './errorHandler';
import { tokenBlacklistService } from '../services/tokenBlacklistService';
import { tokenService } from '../services/tokenService';
import { AccessTokenPayload } from '../types/tokenTypes';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(401, 'Authorization header required');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new ApiError(401, 'Invalid authorization format. Use: Bearer <token>');
    }

    const token = parts[1];

    try {
      // Verify token signature and expiry
      const decoded = jwt.verify(token, config.jwtSecret) as AccessTokenPayload;

      // Check if token is in blacklist
      if (decoded.jti && tokenBlacklistService.isRevoked(decoded.jti, decoded.userId)) {
        throw new ApiError(401, 'Token has been revoked');
      }

      // Convert to JwtPayload for backward compatibility
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(401, 'Invalid or expired token');
    }
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }

  next();
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
        req.user = decoded;
      } catch (error) {
        // Invalid token, but optional auth so just continue
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

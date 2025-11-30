import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export const authController = {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);

      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   * Login user
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/logout
   * Logout user - revoke current token
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '') || '';

      await authService.logout(req.user.id, token);

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/logout-all
   * Logout all sessions - revoke all user tokens
   */
  async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      await authService.logoutAll(req.user.id);

      res.json({ message: 'All sessions logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }

      const result = await authService.requestPasswordReset(email);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, token, newPassword } = req.body;

      if (!email || !token || !newPassword) {
        return res.status(400).json({ error: 'Email, token, and new password required' });
      }

      await authService.resetPassword(email, token, newPassword);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   * Get current user profile
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await authService.getUserById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/auth/me
   * Update current user profile
   */
  async updateCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await authService.updateUser(req.user.id, req.body);

      res.json(user);
    } catch (error) {
      next(error);
    }
  },
};

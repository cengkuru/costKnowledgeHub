import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * Password Reset Service
 * Handles password reset token generation, validation, and password requirements
 */
export const passwordResetService = {
  /**
   * Generate a random reset token
   */
  generateResetToken(): string {
    // Generate 32 bytes of random data and convert to hex string
    return randomBytes(32).toString('hex');
  },

  /**
   * Hash a reset token for storage in database
   */
  async hashResetToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  },

  /**
   * Verify that a plain token matches a hashed token
   */
  async verifyResetToken(token: string, hashedToken: string): Promise<boolean> {
    if (!token || !hashedToken) {
      return false;
    }

    try {
      return await bcrypt.compare(token, hashedToken);
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if reset token is expired
   */
  isTokenExpired(expiresAt: Date): boolean {
    return expiresAt < new Date();
  },

  /**
   * Get expiration date for reset token (24 hours from now)
   */
  getTokenExpiry(): Date {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    return expiresAt;
  },

  /**
   * Validate new password meets requirements
   */
  validateNewPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check minimum length
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain an uppercase letter');
    }

    // Check for number
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain a number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Hash a password (for use in auth service)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  },

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },
};

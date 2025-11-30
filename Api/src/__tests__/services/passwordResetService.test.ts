import { passwordResetService } from '../../services/passwordResetService';
import bcrypt from 'bcryptjs';

describe('PasswordResetService', () => {
  const mockEmail = 'test@example.com';
  const mockUserId = 'user-123';

  describe('generateResetToken', () => {
    it('should generate a valid reset token', () => {
      const token = passwordResetService.generateResetToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = passwordResetService.generateResetToken();
      const token2 = passwordResetService.generateResetToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('hashResetToken', () => {
    it('should hash token consistently', async () => {
      const token = passwordResetService.generateResetToken();
      const hash1 = await passwordResetService.hashResetToken(token);
      const hash2 = await passwordResetService.hashResetToken(token);

      // Bcrypt hashes should match when verified
      expect(await bcrypt.compare(token, hash1)).toBe(true);
      expect(await bcrypt.compare(token, hash2)).toBe(true);
    });

    it('should not allow comparing different tokens', async () => {
      const token1 = passwordResetService.generateResetToken();
      const token2 = passwordResetService.generateResetToken();
      const hash1 = await passwordResetService.hashResetToken(token1);

      expect(await bcrypt.compare(token2, hash1)).toBe(false);
    });
  });

  describe('verifyResetToken', () => {
    it('should verify valid token', async () => {
      const token = passwordResetService.generateResetToken();
      const hashedToken = await passwordResetService.hashResetToken(token);

      const isValid = await passwordResetService.verifyResetToken(token, hashedToken);
      expect(isValid).toBe(true);
    });

    it('should reject invalid token', async () => {
      const token = passwordResetService.generateResetToken();
      const hashedToken = await passwordResetService.hashResetToken(token);
      const wrongToken = passwordResetService.generateResetToken();

      const isValid = await passwordResetService.verifyResetToken(wrongToken, hashedToken);
      expect(isValid).toBe(false);
    });

    it('should reject empty token', async () => {
      const token = passwordResetService.generateResetToken();
      const hashedToken = await passwordResetService.hashResetToken(token);

      const isValid = await passwordResetService.verifyResetToken('', hashedToken);
      expect(isValid).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for future expiry date', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      expect(passwordResetService.isTokenExpired(futureDate)).toBe(false);
    });

    it('should return true for past expiry date', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      expect(passwordResetService.isTokenExpired(pastDate)).toBe(true);
    });

    it('should return true for current time (expired)', () => {
      // Use a date slightly in the past to ensure it's expired
      const pastDate = new Date(Date.now() - 1000);
      expect(passwordResetService.isTokenExpired(pastDate)).toBe(true);
    });
  });

  describe('getTokenExpiry', () => {
    it('should return date 24 hours from now', () => {
      const expiry = passwordResetService.getTokenExpiry();
      const now = new Date();
      const diffMs = expiry.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Should be approximately 24 hours
      expect(diffHours).toBeGreaterThan(23.9);
      expect(diffHours).toBeLessThan(24.1);
    });
  });

  describe('validateNewPassword', () => {
    it('should accept valid password', () => {
      const validation = passwordResetService.validateNewPassword('SecurePassword123');
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const validation = passwordResetService.validateNewPassword('Pass123');
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject password without uppercase letter', () => {
      const validation = passwordResetService.validateNewPassword('password123');
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Password must contain an uppercase letter');
    });

    it('should reject password without number', () => {
      const validation = passwordResetService.validateNewPassword('PasswordWithoutNumber');
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Password must contain a number');
    });

    it('should reject multiple validation errors', () => {
      const validation = passwordResetService.validateNewPassword('pwd');
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});

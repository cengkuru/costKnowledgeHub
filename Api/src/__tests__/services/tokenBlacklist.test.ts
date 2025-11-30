import { tokenBlacklistService } from '../../services/tokenBlacklistService';

describe('TokenBlacklistService', () => {
  const mockJti = 'token-jti-123';
  const mockUserId = 'user-123';
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  beforeEach(() => {
    // Clear blacklist before each test
    tokenBlacklistService.clear();
  });

  describe('revokeToken', () => {
    it('should add token to blacklist', () => {
      tokenBlacklistService.revokeToken(mockJti, mockUserId, futureDate);
      expect(tokenBlacklistService.isRevoked(mockJti, mockUserId)).toBe(true);
    });

    it('should store expiration date', () => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      tokenBlacklistService.revokeToken(mockJti, mockUserId, expiresAt);

      const entry = tokenBlacklistService.getEntry(mockJti);
      expect(entry).toBeDefined();
      expect(entry?.expiresAt.getTime()).toBe(expiresAt.getTime());
    });
  });

  describe('isRevoked', () => {
    it('should return false for non-revoked tokens', () => {
      expect(tokenBlacklistService.isRevoked('unknown-jti', mockUserId)).toBe(false);
    });

    it('should return true for revoked tokens', () => {
      tokenBlacklistService.revokeToken(mockJti, mockUserId, futureDate);
      expect(tokenBlacklistService.isRevoked(mockJti, mockUserId)).toBe(true);
    });

    it('should return false for revoked tokens after expiry', () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      tokenBlacklistService.revokeToken(mockJti, mockUserId, expiredDate);

      // After cleanup, expired tokens should be removed
      tokenBlacklistService.cleanup();
      expect(tokenBlacklistService.isRevoked(mockJti, mockUserId)).toBe(false);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', () => {
      const jti1 = 'jti-1';
      const jti2 = 'jti-2';
      const jti3 = 'jti-3';
      const otherUserId = 'other-user';

      tokenBlacklistService.revokeToken(jti1, mockUserId, futureDate);
      tokenBlacklistService.revokeToken(jti2, mockUserId, futureDate);
      tokenBlacklistService.revokeToken(jti3, otherUserId, futureDate);

      tokenBlacklistService.revokeAllUserTokens(mockUserId, futureDate);

      expect(tokenBlacklistService.isRevoked(jti1, mockUserId)).toBe(true);
      expect(tokenBlacklistService.isRevoked(jti2, mockUserId)).toBe(true);
      expect(tokenBlacklistService.isRevoked(jti3, otherUserId)).toBe(true); // Not affected
    });

    it('should not affect other users tokens', () => {
      const otherUserId = 'other-user';
      const otherJti = 'other-jti';

      tokenBlacklistService.revokeToken(mockJti, mockUserId, futureDate);
      tokenBlacklistService.revokeToken(otherJti, otherUserId, futureDate);

      tokenBlacklistService.revokeAllUserTokens(mockUserId, futureDate);

      expect(tokenBlacklistService.isRevoked(mockJti, mockUserId)).toBe(true);
      expect(tokenBlacklistService.isRevoked(otherJti, otherUserId)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      const expiredDate = new Date(Date.now() - 1000);
      const futureExpiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      tokenBlacklistService.revokeToken('expired-jti', mockUserId, expiredDate);
      tokenBlacklistService.revokeToken('valid-jti', mockUserId, futureExpiryDate);

      tokenBlacklistService.cleanup();

      expect(tokenBlacklistService.isRevoked('expired-jti', mockUserId)).toBe(false);
      expect(tokenBlacklistService.isRevoked('valid-jti', mockUserId)).toBe(true);
    });

    it('should not remove unexpired entries', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tokenBlacklistService.revokeToken(mockJti, mockUserId, futureDate);

      tokenBlacklistService.cleanup();

      expect(tokenBlacklistService.isRevoked(mockJti, mockUserId)).toBe(true);
    });
  });

  describe('getEntry', () => {
    it('should return blacklist entry if exists', () => {
      tokenBlacklistService.revokeToken(mockJti, mockUserId, futureDate);
      const entry = tokenBlacklistService.getEntry(mockJti);

      expect(entry).toBeDefined();
      expect(entry?.jti).toBe(mockJti);
      expect(entry?.userId).toBe(mockUserId);
    });

    it('should return undefined for non-existent entry', () => {
      const entry = tokenBlacklistService.getEntry('unknown-jti');
      expect(entry).toBeUndefined();
    });
  });

  describe('size and clear', () => {
    it('should return correct size', () => {
      tokenBlacklistService.revokeToken('jti-1', mockUserId, futureDate);
      tokenBlacklistService.revokeToken('jti-2', mockUserId, futureDate);

      expect(tokenBlacklistService.size()).toBe(2);
    });

    it('should clear all entries', () => {
      tokenBlacklistService.revokeToken('jti-1', mockUserId, futureDate);
      tokenBlacklistService.revokeToken('jti-2', mockUserId, futureDate);

      tokenBlacklistService.clear();

      expect(tokenBlacklistService.size()).toBe(0);
      expect(tokenBlacklistService.isRevoked('jti-1', mockUserId)).toBe(false);
      expect(tokenBlacklistService.isRevoked('jti-2', mockUserId)).toBe(false);
    });
  });
});

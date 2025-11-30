import { tokenService } from '../../services/tokenService';
import jwt from 'jsonwebtoken';
import config from '../../config';
import { randomUUID } from 'crypto';

describe('TokenService', () => {
  const mockUserId = 'user123';
  const mockEmail = 'test@example.com';
  const mockRole: 'admin' | 'user' = 'user';

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens with correct payloads', () => {
      const tokenPair = tokenService.generateTokenPair(mockUserId, mockEmail, mockRole);

      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');
      expect(tokenPair).toHaveProperty('expiresIn');

      // Verify access token
      const decodedAccess = jwt.verify(tokenPair.accessToken, config.jwtSecret) as any;
      expect(decodedAccess.userId).toBe(mockUserId);
      expect(decodedAccess.email).toBe(mockEmail);
      expect(decodedAccess.role).toBe(mockRole);
      expect(decodedAccess.type).toBe('access');
      expect(decodedAccess.jti).toBeDefined();

      // Verify refresh token
      const decodedRefresh = jwt.verify(tokenPair.refreshToken, config.jwtSecret) as any;
      expect(decodedRefresh.userId).toBe(mockUserId);
      expect(decodedRefresh.type).toBe('refresh');
      expect(decodedRefresh.tokenFamily).toBeDefined();
      expect(decodedRefresh.jti).toBeDefined();
    });

    it('should generate unique JTI for each token pair', () => {
      const pair1 = tokenService.generateTokenPair(mockUserId, mockEmail, mockRole);
      const pair2 = tokenService.generateTokenPair(mockUserId, mockEmail, mockRole);

      const decoded1Access = jwt.verify(pair1.accessToken, config.jwtSecret) as any;
      const decoded2Access = jwt.verify(pair2.accessToken, config.jwtSecret) as any;

      expect(decoded1Access.jti).not.toBe(decoded2Access.jti);
    });

    it('should set correct expiration times', () => {
      const tokenPair = tokenService.generateTokenPair(mockUserId, mockEmail, mockRole);
      const decodedAccess = jwt.verify(tokenPair.accessToken, config.jwtSecret) as any;
      const decodedRefresh = jwt.verify(tokenPair.refreshToken, config.jwtSecret) as any;

      // Access token should have shorter expiry (15 min = 900 seconds)
      const accessExpiresIn = (decodedAccess.exp - decodedAccess.iat);
      expect(accessExpiresIn).toBeLessThanOrEqual(900);

      // Refresh token should have longer expiry (7 days = 604800 seconds)
      const refreshExpiresIn = (decodedRefresh.exp - decodedRefresh.iat);
      expect(refreshExpiresIn).toBeLessThanOrEqual(604800);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token and return payload', () => {
      const tokenPair = tokenService.generateTokenPair(mockUserId, mockEmail, mockRole);
      const payload = tokenService.verifyAccessToken(tokenPair.accessToken);

      expect(payload).toMatchObject({
        userId: mockUserId,
        email: mockEmail,
        role: mockRole,
        type: 'access',
      });
      expect(payload.jti).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        tokenService.verifyAccessToken('invalid.token.here');
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      // Create a token that expires immediately
      const expiredToken = jwt.sign(
        {
          userId: mockUserId,
          email: mockEmail,
          role: mockRole,
          type: 'access',
          jti: randomUUID(),
        },
        config.jwtSecret,
        { expiresIn: '0s' }
      );

      // Wait a moment for token to expire
      setTimeout(() => {
        expect(() => {
          tokenService.verifyAccessToken(expiredToken);
        }).toThrow();
      }, 100);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token and return payload', () => {
      const tokenPair = tokenService.generateTokenPair(mockUserId, mockEmail, mockRole);
      const payload = tokenService.verifyRefreshToken(tokenPair.refreshToken);

      expect(payload).toMatchObject({
        userId: mockUserId,
        type: 'refresh',
      });
      expect(payload.jti).toBeDefined();
      expect(payload.tokenFamily).toBeDefined();
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        tokenService.verifyRefreshToken('invalid.token.here');
      }).toThrow();
    });
  });

  describe('extractJTI', () => {
    it('should extract JTI from token without verification', () => {
      const tokenPair = tokenService.generateTokenPair(mockUserId, mockEmail, mockRole);
      const decoded = jwt.decode(tokenPair.accessToken) as any;

      const jti = tokenService.extractJTI(tokenPair.accessToken);
      expect(jti).toBe(decoded.jti);
    });

    it('should return null for invalid token', () => {
      const jti = tokenService.extractJTI('invalid.token.here');
      expect(jti).toBeNull();
    });
  });
});

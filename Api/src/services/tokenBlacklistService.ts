import { TokenBlacklistEntry } from '../types/tokenTypes';

/**
 * Token Blacklist Service
 * In-memory token revocation management
 * In production, consider using Redis for distributed caching
 */
class TokenBlacklistService {
  private blacklist: Map<string, TokenBlacklistEntry> = new Map();
  private userTokens: Map<string, Set<string>> = new Map(); // userId -> Set of JTIs

  /**
   * Revoke a single token
   */
  revokeToken(jti: string, userId: string, expiresAt: Date): void {
    this.blacklist.set(jti, {
      jti,
      userId,
      expiresAt,
    });

    // Track token by user for bulk revocation
    if (!this.userTokens.has(userId)) {
      this.userTokens.set(userId, new Set());
    }
    this.userTokens.get(userId)!.add(jti);
  }

  /**
   * Revoke all tokens for a user
   */
  revokeAllUserTokens(userId: string, expiresAt: Date): void {
    const userJtis = this.userTokens.get(userId);

    if (userJtis) {
      userJtis.forEach((jti) => {
        // Update expiry but keep track of all user tokens
        const entry = this.blacklist.get(jti);
        if (entry) {
          this.blacklist.set(jti, {
            ...entry,
            expiresAt,
          });
        }
      });
    }
  }

  /**
   * Check if token is revoked
   */
  isRevoked(jti: string, userId: string): boolean {
    const entry = this.blacklist.get(jti);

    if (!entry) {
      return false;
    }

    // Check if token has expired
    if (entry.expiresAt < new Date()) {
      return false;
    }

    // Verify it belongs to the user
    return entry.userId === userId;
  }

  /**
   * Get blacklist entry
   */
  getEntry(jti: string): TokenBlacklistEntry | undefined {
    return this.blacklist.get(jti);
  }

  /**
   * Remove expired entries from blacklist
   * Should be called periodically (e.g., every hour)
   */
  cleanup(): void {
    const now = new Date();

    const expiredJtis: string[] = [];

    // Find expired entries
    this.blacklist.forEach((entry, jti) => {
      if (entry.expiresAt < now) {
        expiredJtis.push(jti);
      }
    });

    // Remove expired entries
    expiredJtis.forEach((jti) => {
      const entry = this.blacklist.get(jti);
      if (entry) {
        // Remove from user tokens set
        const userJtis = this.userTokens.get(entry.userId);
        if (userJtis) {
          userJtis.delete(jti);
          // Clean up empty user entry
          if (userJtis.size === 0) {
            this.userTokens.delete(entry.userId);
          }
        }
      }

      // Remove from blacklist
      this.blacklist.delete(jti);
    });
  }

  /**
   * Get size of blacklist
   */
  size(): number {
    return this.blacklist.size;
  }

  /**
   * Clear entire blacklist (for testing)
   */
  clear(): void {
    this.blacklist.clear();
    this.userTokens.clear();
  }

  /**
   * Get all blacklist entries for debugging
   */
  getAll(): TokenBlacklistEntry[] {
    return Array.from(this.blacklist.values());
  }
}

// Singleton instance
export const tokenBlacklistService = new TokenBlacklistService();

// Start periodic cleanup every hour
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    tokenBlacklistService.cleanup();
  }, 60 * 60 * 1000); // Every hour
}

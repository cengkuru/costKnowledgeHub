import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes } from 'crypto';
import { getDatabase } from '../db';
import { User, UserInput, UserLogin, UserResponse, USERS_COLLECTION_NAME } from '../models/User';
import { ApiError } from '../middleware/errorHandler';
import { config } from '../config';
import { tokenService } from './tokenService';
import { tokenBlacklistService } from './tokenBlacklistService';
import { passwordResetService } from './passwordResetService';
import { emailService } from './emailService';
import { TokenPair, AuthResponse, RefreshResponse } from '../types/tokenTypes';
import { ObjectId } from 'mongodb';

/**
 * Generate a secure random password
 */
function generateTemporaryPassword(length: number = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

export const authService = {
  /**
   * Register a new user
   */
  async register(userData: UserInput): Promise<UserResponse> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    // Check if user already exists
    const existingUser = await collection.findOne({ email: userData.email });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser: User = {
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newUser);

    return {
      id: result.insertedId.toString(),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };
  },

  /**
   * Login user and return access/refresh token pair
   */
  async login(credentials: UserLogin): Promise<AuthResponse> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    // Find user
    const user = await collection.findOne({ email: credentials.email });
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
    if (!isValidPassword) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Generate token pair (access + refresh)
    const tokenPair = tokenService.generateTokenPair(
      user._id?.toString() || '',
      user.email,
      user.role
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user._id?.toString() || '',
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserResponse | null> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    const user = await collection.findOne({ _id: new (require('mongodb').ObjectId)(id) });

    if (!user) {
      return null;
    }

    return {
      id: user._id?.toString() || '',
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  },

  /**
   * Update user (admin or self)
   */
  async updateUser(
    id: string,
    updates: Partial<Pick<User, 'name' | 'email'>>
  ): Promise<UserResponse> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    const result = await collection.findOneAndUpdate(
      { _id: new (require('mongodb').ObjectId)(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ApiError(404, 'User not found');
    }

    return {
      id: result._id?.toString() || '',
      email: result.email,
      name: result.name,
      role: result.role,
      createdAt: result.createdAt,
    };
  },

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    // Get user
    const user = await collection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Validate new password is different
    if (currentPassword === newPassword) {
      throw new ApiError(400, 'New password must be different from current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    // Revoke all existing tokens for this user (force re-login on all devices)
    tokenBlacklistService.revokeAllUserTokens(
      userId,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    );
  },

  /**
   * Update user email (requires password verification)
   */
  async updateEmail(
    userId: string,
    newEmail: string,
    currentPassword: string
  ): Promise<UserResponse> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    // Get user
    const user = await collection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Check if new email is same as current
    if (user.email.toLowerCase() === newEmail.toLowerCase()) {
      throw new ApiError(400, 'New email must be different from current email');
    }

    // Check if email is already taken by another user
    const existingUser = await collection.findOne({
      email: newEmail,
      _id: { $ne: new ObjectId(userId) }
    });
    if (existingUser) {
      throw new ApiError(409, 'Email is already in use by another account');
    }

    // Update email
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { email: newEmail, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ApiError(404, 'User not found');
    }

    return {
      id: result._id?.toString() || '',
      email: result.email,
      name: result.name,
      role: result.role,
      createdAt: result.createdAt,
    };
  },

  /**
   * Delete user (admin only)
   */
  async deleteUser(id: string): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    const result = await collection.deleteOne({
      _id: new (require('mongodb').ObjectId)(id),
    });

    if (result.deletedCount === 0) {
      throw new ApiError(404, 'User not found');
    }
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
    try {
      // Verify refresh token
      const payload = tokenService.verifyRefreshToken(refreshToken);

      // Get user to ensure they still exist
      const user = await this.getUserById(payload.userId);
      if (!user) {
        throw new ApiError(401, 'User not found');
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          userId: payload.userId,
          email: user.email,
          role: user.role,
          jti: randomUUID(),
          type: 'access',
        },
        config.jwtSecret,
        { expiresIn: '15m' }
      );

      return {
        accessToken: newAccessToken,
        expiresIn: 15 * 60, // 15 minutes
      };
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ token: string }> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    // Find user by email
    const user = await collection.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security
      throw new ApiError(400, 'If email exists, reset link will be sent');
    }

    // Generate reset token
    const resetToken = passwordResetService.generateResetToken();
    const hashedToken = await passwordResetService.hashResetToken(resetToken);
    const expiresAt = passwordResetService.getTokenExpiry();

    // Store hashed token in database
    await collection.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpires: expiresAt,
        },
      }
    );

    return { token: resetToken };
  },

  /**
   * Validate password reset token
   */
  async validatePasswordResetToken(email: string, token: string): Promise<{ valid: boolean; userId?: string }> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    const user = await collection.findOne({ email });
    if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
      return { valid: false };
    }

    // Check expiry
    if (passwordResetService.isTokenExpired(user.passwordResetExpires)) {
      return { valid: false };
    }

    // Verify token
    const isValid = await passwordResetService.verifyResetToken(token, user.passwordResetToken);

    return {
      valid: isValid,
      userId: isValid ? user._id?.toString() : undefined,
    };
  },

  /**
   * Reset password with valid token
   */
  async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    // Validate token
    const validation = await this.validatePasswordResetToken(email, token);
    if (!validation.valid) {
      throw new ApiError(400, 'Invalid or expired password reset token');
    }

    // Validate new password
    const passwordValidation = passwordResetService.validateNewPassword(newPassword);
    if (!passwordValidation.valid) {
      throw new ApiError(400, `Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    const result = await collection.findOneAndUpdate(
      { email },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
        $unset: {
          passwordResetToken: '',
          passwordResetExpires: '',
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ApiError(404, 'User not found');
    }

    // Revoke all existing tokens for this user
    tokenBlacklistService.revokeAllUserTokens(
      result._id?.toString() || '',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    );
  },

  /**
   * Logout - revoke current token
   */
  async logout(userId: string, token: string): Promise<void> {
    const jti = tokenService.extractJTI(token);
    if (!jti) {
      return;
    }

    // Get token expiry from JWT
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      const expiresAt = new Date(decoded.exp * 1000);
      tokenBlacklistService.revokeToken(jti, userId, expiresAt);
    }
  },

  /**
   * Logout all - revoke all user tokens
   */
  async logoutAll(userId: string): Promise<void> {
    // Revoke all tokens for this user
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    tokenBlacklistService.revokeAllUserTokens(userId, expiresAt);
  },

  // ============ Admin User Management ============

  /**
   * Create a new admin user (admin only)
   * Generates a temporary password and sends welcome email
   */
  async createAdminUser(
    email: string,
    name: string,
    sendEmail: boolean = true
  ): Promise<{ user: UserResponse; temporaryPassword: string; emailSent: boolean }> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    // Check if user already exists
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword(12);

    // Hash password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const newUser: User = {
      email,
      password: hashedPassword,
      name,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newUser);

    const userResponse: UserResponse = {
      id: result.insertedId.toString(),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    // Send welcome email
    let emailSent = false;
    if (sendEmail) {
      try {
        const emailResult = await emailService.sendWelcomeEmail(name, email, temporaryPassword);
        emailSent = emailResult.success;
        if (!emailResult.success) {
          console.error(`[Auth] Failed to send welcome email to ${email}:`, emailResult.error);
        } else {
          console.log(`[Auth] Welcome email sent to ${email}`);
        }
      } catch (error) {
        console.error(`[Auth] Error sending welcome email to ${email}:`, error);
      }
    }

    return {
      user: userResponse,
      temporaryPassword,
      emailSent,
    };
  },

  /**
   * List all users (admin only)
   */
  async listUsers(): Promise<UserResponse[]> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    const users = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return users.map(user => ({
      id: user._id?.toString() || '',
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    }));
  },

  /**
   * Update user role (admin only)
   */
  async updateUserRole(
    userId: string,
    role: 'admin' | 'user'
  ): Promise<UserResponse> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { role, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw new ApiError(404, 'User not found');
    }

    return {
      id: result._id?.toString() || '',
      email: result.email,
      name: result.name,
      role: result.role,
      createdAt: result.createdAt,
    };
  },

  /**
   * Resend welcome email with new temporary password
   */
  async resendWelcomeEmail(
    userId: string
  ): Promise<{ temporaryPassword: string; emailSent: boolean }> {
    const db = await getDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    const user = await collection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Generate new temporary password
    const temporaryPassword = generateTemporaryPassword(12);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Update password
    await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    // Send welcome email
    let emailSent = false;
    try {
      const emailResult = await emailService.sendWelcomeEmail(user.name, user.email, temporaryPassword);
      emailSent = emailResult.success;
    } catch (error) {
      console.error(`[Auth] Error resending welcome email to ${user.email}:`, error);
    }

    return { temporaryPassword, emailSent };
  },
};

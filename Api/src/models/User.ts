import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Zod schema for User validation
export const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user']).default('user'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UserRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

// TypeScript interface for User
export interface User {
  _id?: ObjectId;
  email: string;
  password: string; // hashed
  name: string;
  role: 'admin' | 'user';
  createdAt?: Date;
  updatedAt?: Date;
  passwordResetToken?: string; // Hashed reset token
  passwordResetExpires?: Date;
}

// Type for user input (registration)
export type UserInput = z.infer<typeof UserRegistrationSchema>;

// Type for user login
export type UserLogin = z.infer<typeof UserLoginSchema>;

// Type for user response (without password)
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt?: Date;
}

export const USERS_COLLECTION_NAME = 'users';

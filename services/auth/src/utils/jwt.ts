import jwt from 'jsonwebtoken';
import { User } from '../schema';

interface TokenPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
}

/**
 * Generates a JWT access token for a user
 */
export function generateAccessToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRATION || '1h'
  });
}

/**
 * Generates a JWT refresh token for a user
 */
export function generateRefreshToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh_secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d'
  });
}

/**
 * Verifies a JWT access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET || 'secret') as TokenPayload;
}

/**
 * Verifies a JWT refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh_secret') as TokenPayload;
}

/**
 * Extracts JWT token from authorization header
 */
export function extractTokenFromHeader(authHeader: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
}
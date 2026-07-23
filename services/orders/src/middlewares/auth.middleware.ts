import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
  sessionId?: string;
}

/**
 * Authentication middleware for orders service
 * Verifies JWT token with auth service
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header provided' });
    }
    
    try {
      // Delegate authentication to Auth service
      const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
        headers: { Authorization: authHeader }
      });
      
      // Attach user information to the request
      req.user = response.data;
      next();
    } catch (error: any) {
      return res.status(401).json({ 
        message: error.response?.data?.message || 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Optional authentication middleware
 * Tries to authenticate but continues if token is missing or invalid
 * Used for routes that work for both authenticated and guest users
 */
export async function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const sessionHeader = req.headers['x-session-id'] as string;
    
    // Set session ID if provided in headers
    if (sessionHeader) {
      req.sessionId = sessionHeader;
    }
    
    if (!authHeader) {
      return next();
    }
    
    try {
      // Try to authenticate with Auth service
      const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
        headers: { Authorization: authHeader }
      });
      
      // Attach user information to the request if successful
      req.user = response.data;
      next();
    } catch (error) {
      // Continue without authentication if it fails
      next();
    }
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Continue without authentication if an error occurs
    next();
  }
}

/**
 * Authorization middleware to check user roles
 */
export function authorize(roles: string | string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}

/**
 * Order ownership middleware
 * Ensures that a user can only access their own orders
 * Admin users can access any order
 */
export function checkOrderOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Admin can access any order
    if (req.user.role === 'admin') {
      return next();
    }
    
    // For non-admin users, check if the userId in the order matches their own userId
    const orderUserId = req.body.userId || parseInt(req.params.userId);
    
    if (orderUserId && orderUserId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied to this order' });
    }
    
    next();
  } catch (error) {
    console.error('Order ownership check error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
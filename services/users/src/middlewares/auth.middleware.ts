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
}

/**
 * Authentication middleware for user profile service
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
 * User ownership middleware
 * Ensures that a user can only access their own profile data
 * Admin users can access any user's data
 */
export function checkUserOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Admin can access any user profile
    if (req.user.role === 'admin') {
      return next();
    }
    
    // For non-admin users, check if the userId in the URL matches their own userId
    const requestedUserId = parseInt(req.params.userId);
    
    if (!requestedUserId || requestedUserId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied to this user profile' });
    }
    
    next();
  } catch (error) {
    console.error('User ownership check error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
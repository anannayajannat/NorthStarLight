import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

interface AuthenticatedRequest extends Request {
  user?: any;
}

interface DecodedToken {
  userId: number;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware
 * Verifies JWT token locally or delegates to Auth service
 */
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    try {
      // Try to verify token locally first (for performance)
      if (process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
        req.user = decoded;
        return next();
      }
      
      // If local verification is not possible, delegate to Auth service
      const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      req.user = response.data;
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      // For other verification errors, try with Auth service
      try {
        const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        req.user = response.data;
        next();
      } catch (authError: any) {
        return res.status(401).json({ 
          message: authError.response?.data?.message || 'Authentication failed' 
        });
      }
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Authorization middleware - checks if user has the required role
 */
export const authorize = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

/**
 * Extract JWT token from various possible locations
 */
const extractToken = (req: Request): string | null => {
  // From Authorization header
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }
  
  // From query parameter
  if (req.query && req.query.token) {
    return req.query.token as string;
  }
  
  // From cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
};
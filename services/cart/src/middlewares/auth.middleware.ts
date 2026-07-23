import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
  sessionId: string;
}

/**
 * Authentication middleware for cart service
 * 
 * This middleware is optional - carts can be associated with either a user or a session
 * If a valid auth token is provided, it will attach the user to the request
 * Otherwise, it will generate or use an existing session ID
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Try to authenticate with auth token if provided
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      try {
        // Delegate authentication to Auth service
        const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
          headers: { Authorization: authHeader }
        });
        
        // Attach user information to the request
        req.user = response.data;
      } catch (error) {
        // Authentication failed but we'll continue with session-based cart
        console.log('Authentication token invalid or expired, falling back to session cart');
      }
    }
    
    // Get or set session ID for guest carts
    const sessionHeader = req.headers['x-session-id'] as string;
    const cookieSessionId = req.cookies?.sessionId;
    
    if (sessionHeader) {
      req.sessionId = sessionHeader;
    } else if (cookieSessionId) {
      req.sessionId = cookieSessionId;
    } else {
      // Generate a new session ID
      req.sessionId = uuidv4();
      
      // Set session ID cookie for future requests
      res.cookie('sessionId', req.sessionId, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
    
    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Authorization middleware to check user roles
 * Only used for admin-only cart operations
 */
export function authorize(roles: string | string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
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
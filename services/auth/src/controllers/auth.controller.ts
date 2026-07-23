import { Request, Response } from 'express';
import { db } from '../db';
import { 
  users, 
  refreshTokens, 
  passwordResetTokens, 
  failedLoginAttempts,
  InsertUser
} from '../schema';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  extractTokenFromHeader
} from '../utils/jwt';
import { 
  hashPassword, 
  comparePassword, 
  generateResetToken,
  validatePasswordComplexity
} from '../utils/password';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

/**
 * Register a new user
 */
export async function register(req: Request, res: Response) {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);
    
    // Check if password meets complexity requirements
    if (!validatePasswordComplexity(validatedData.password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
      });
    }
    
    // Check if username already exists
    const existingUsername = await db.select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1);
    
    if (existingUsername.length > 0) {
      return res.status(409).json({ message: "Username already exists" });
    }
    
    // Check if email already exists
    const existingEmail = await db.select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);
    
    if (existingEmail.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Create user
    const userData: InsertUser = {
      username: validatedData.username,
      email: validatedData.email,
      password: hashedPassword,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      role: 'user',
      active: true
    };
    
    const [newUser] = await db.insert(users)
      .values(userData)
      .returning();
    
    // Generate tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    
    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await db.insert(refreshTokens)
      .values({
        userId: newUser.id,
        token: refreshToken,
        expiresAt
      });
    
    // Return response with tokens
    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors
      });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Login user
 */
export async function login(req: Request, res: Response) {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    
    // Get user by username
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1);
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    if (!user.active) {
      return res.status(403).json({ message: "Account is disabled" });
    }
    
    // Check password
    const passwordMatch = await comparePassword(validatedData.password, user.password);
    
    if (!passwordMatch) {
      // Record failed login attempt
      await db.insert(failedLoginAttempts)
        .values({
          userId: user.id,
          ipAddress: req.ip || '0.0.0.0',
          userAgent: req.headers['user-agent'] || ''
        });
      
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await db.insert(refreshTokens)
      .values({
        userId: user.id,
        token: refreshToken,
        expiresAt
      });
    
    // Update user's last login time (if needed)
    // await db.update(users)
    //   .set({ lastLogin: new Date() })
    //   .where(eq(users.id, user.id));
    
    // Return response with tokens
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors
      });
    }
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const token = req.body.refreshToken;
    
    if (!token) {
      return res.status(400).json({ message: "Refresh token is required" });
    }
    
    // Check if refresh token exists in database
    const [storedToken] = await db.select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token))
      .limit(1);
    
    if (!storedToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    
    // Check if token has expired
    if (new Date() > storedToken.expiresAt) {
      // Delete expired token
      await db.delete(refreshTokens)
        .where(eq(refreshTokens.id, storedToken.id));
        
      return res.status(401).json({ message: "Refresh token has expired" });
    }
    
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(token);
      
      // Get user
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);
      
      if (!user || !user.active) {
        return res.status(401).json({ message: "Invalid user or account is disabled" });
      }
      
      // Generate new tokens
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);
      
      // Update refresh token in database
      await db.delete(refreshTokens)
        .where(eq(refreshTokens.id, storedToken.id));
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
      
      await db.insert(refreshTokens)
        .values({
          userId: user.id,
          token: newRefreshToken,
          expiresAt
        });
      
      // Return new tokens
      return res.status(200).json({
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Logout user by invalidating refresh token
 */
export async function logout(req: Request, res: Response) {
  try {
    const token = req.body.refreshToken || extractTokenFromHeader(req.headers.authorization || '');
    
    if (!token) {
      return res.status(400).json({ message: "Refresh token is required" });
    }
    
    // Delete refresh token from database
    await db.delete(refreshTokens)
      .where(eq(refreshTokens.token, token));
    
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get current user information
 */
export async function getCurrentUser(req: Request, res: Response) {
  // The user object should be attached to the request by the authenticate middleware
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  return res.status(200).json({
    id: user.userId,
    username: user.username,
    email: user.email,
    role: user.role
  });
}

/**
 * Request password reset
 */
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    // Find user by email
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (!user) {
      // We don't want to reveal if the email exists or not for security reasons
      return res.status(200).json({ message: "If your email exists, you'll receive a password reset link" });
    }
    
    // Generate reset token
    const resetToken = generateResetToken();
    
    // Set expiration date (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Save reset token to database
    await db.insert(passwordResetTokens)
      .values({
        userId: user.id,
        token: resetToken,
        expiresAt,
        used: false
      });
    
    // In a real application, you would send an email with the reset link
    // For this example, we'll just return the token in the response
    // TODO: Implement email sending
    
    return res.status(200).json({ 
      message: "If your email exists, you'll receive a password reset link",
      // Only for development!
      token: resetToken
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    
    // Check if password meets complexity requirements
    if (!validatePasswordComplexity(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
      });
    }
    
    // Find reset token
    const [resetToken] = await db.select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false)
        )
      )
      .limit(1);
    
    if (!resetToken) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    
    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ message: "Token has expired" });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update user's password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, resetToken.userId));
    
    // Mark token as used
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, resetToken.id));
    
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
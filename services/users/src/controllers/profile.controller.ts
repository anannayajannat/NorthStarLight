import { Request, Response } from 'express';
import { db } from '../db';
import axios from 'axios';
import { 
  userProfiles,
  userAddresses,
  userPreferences,
  InsertUserProfile,
  InsertUserAddress,
  InsertUserPreferences
} from '../schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { z } from 'zod';

// Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
}

// Extended validation schemas with more precise restrictions
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  phoneNumber: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other']).optional(),
  language: z.string().min(2).max(10).optional(),
  timezone: z.string().min(1).max(50).optional()
});

const updateAddressSchema = z.object({
  addressName: z.string().min(1).max(100).optional(),
  addressType: z.enum(['shipping', 'billing', 'both']).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  address1: z.string().min(1).max(255),
  address2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  phone: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/).optional(),
  isDefault: z.boolean().optional()
});

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  currency: z.string().length(3).optional(),
  favoriteCategories: z.array(z.number().int().positive()).optional(),
  favoriteStyles: z.array(z.string().min(1).max(50)).optional()
});

/**
 * Get a user's profile
 */
export async function getUserProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Find the user profile
    const [profile] = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, parseInt(userId)))
      .limit(1);
    
    if (!profile) {
      // If profile doesn't exist, get the user from Auth service
      try {
        const userResponse = await axios.get(`${AUTH_SERVICE_URL}/users/${userId}`, {
          headers: { Authorization: req.headers.authorization }
        });
        
        const user = userResponse.data;
        
        // Return a minimal profile with just the user info from Auth service
        return res.status(200).json({
          userId: user.id,
          username: user.username,
          email: user.email,
          profileCreated: false
        });
      } catch (error: any) {
        if (error.response?.status === 404) {
          return res.status(404).json({ message: 'User not found' });
        }
        throw error;
      }
    }
    
    // Get user data from Auth service
    let userData = {};
    try {
      const userResponse = await axios.get(`${AUTH_SERVICE_URL}/users/${userId}`, {
        headers: { Authorization: req.headers.authorization }
      });
      
      userData = {
        username: userResponse.data.username,
        email: userResponse.data.email,
        emailVerified: userResponse.data.emailVerified
      };
    } catch (error) {
      console.error('Error fetching user data from Auth service:', error);
      // Continue without user data if Auth service is unavailable
    }
    
    // Return the complete profile
    return res.status(200).json({
      ...profile,
      ...userData,
      profileCreated: true
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create or update a user's profile
 */
export async function createOrUpdateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Validate request body
    const validatedData = updateProfileSchema.parse(req.body);
    
    // Check if profile already exists
    const [existingProfile] = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, parseInt(userId)))
      .limit(1);
    
    if (existingProfile) {
      // Update existing profile
      const [updatedProfile] = await db.update(userProfiles)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, parseInt(userId)))
        .returning();
      
      return res.status(200).json(updatedProfile);
    } else {
      // Create new profile
      const profileData: InsertUserProfile = {
        userId: parseInt(userId),
        ...validatedData
      };
      
      const [newProfile] = await db.insert(userProfiles)
        .values(profileData)
        .returning();
      
      // Also create default preferences
      try {
        await db.insert(userPreferences)
          .values({
            userId: parseInt(userId)
          });
      } catch (error) {
        console.error('Error creating default preferences:', error);
        // Continue even if preferences creation fails
      }
      
      return res.status(201).json(newProfile);
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get user's addresses
 */
export async function getUserAddresses(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Get all addresses for the user
    const addresses = await db.select()
      .from(userAddresses)
      .where(eq(userAddresses.userId, parseInt(userId)))
      .orderBy(
        desc(userAddresses.isDefault),
        asc(userAddresses.createdAt)
      );
    
    return res.status(200).json(addresses);
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Add a new address for a user
 */
export async function createUserAddress(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Validate request body
    const validatedData = updateAddressSchema.parse(req.body);
    
    // If this address is being set as default, clear other defaults of the same type
    if (validatedData.isDefault) {
      const addressType = validatedData.addressType || 'shipping';
      
      await db.update(userAddresses)
        .set({ isDefault: false })
        .where(
          and(
            eq(userAddresses.userId, parseInt(userId)),
            eq(userAddresses.addressType, addressType)
          )
        );
    }
    
    // Add the new address
    const addressData: InsertUserAddress = {
      userId: parseInt(userId),
      ...validatedData
    };
    
    const [newAddress] = await db.insert(userAddresses)
      .values(addressData)
      .returning();
    
    return res.status(201).json(newAddress);
  } catch (error) {
    console.error('Error creating user address:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update a user address
 */
export async function updateUserAddress(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, addressId } = req.params;
    
    // Validate request body
    const validatedData = updateAddressSchema.parse(req.body);
    
    // Check if address exists and belongs to user
    const [existingAddress] = await db.select()
      .from(userAddresses)
      .where(
        and(
          eq(userAddresses.id, parseInt(addressId)),
          eq(userAddresses.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!existingAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // If this address is being set as default, clear other defaults of the same type
    if (validatedData.isDefault) {
      const addressType = validatedData.addressType || existingAddress.addressType;
      
      await db.update(userAddresses)
        .set({ isDefault: false })
        .where(
          and(
            eq(userAddresses.userId, parseInt(userId)),
            eq(userAddresses.addressType, addressType),
            eq(userAddresses.id, parseInt(addressId))
          )
        );
    }
    
    // Update the address
    const [updatedAddress] = await db.update(userAddresses)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(userAddresses.id, parseInt(addressId)))
      .returning();
    
    return res.status(200).json(updatedAddress);
  } catch (error) {
    console.error('Error updating user address:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a user address
 */
export async function deleteUserAddress(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, addressId } = req.params;
    
    // Check if address exists and belongs to user
    const [existingAddress] = await db.select()
      .from(userAddresses)
      .where(
        and(
          eq(userAddresses.id, parseInt(addressId)),
          eq(userAddresses.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!existingAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Delete the address
    await db.delete(userAddresses)
      .where(eq(userAddresses.id, parseInt(addressId)));
    
    return res.status(200).json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting user address:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Find user preferences
    const [preferences] = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, parseInt(userId)))
      .limit(1);
    
    if (!preferences) {
      // Create default preferences if not found
      const preferencesData: InsertUserPreferences = {
        userId: parseInt(userId)
      };
      
      const [newPreferences] = await db.insert(userPreferences)
        .values(preferencesData)
        .returning();
      
      return res.status(200).json(newPreferences);
    }
    
    return res.status(200).json(preferences);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Validate request body
    const validatedData = updatePreferencesSchema.parse(req.body);
    
    // Check if preferences exist
    const [existingPreferences] = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, parseInt(userId)))
      .limit(1);
    
    if (existingPreferences) {
      // Update existing preferences
      const [updatedPreferences] = await db.update(userPreferences)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(userPreferences.userId, parseInt(userId)))
        .returning();
      
      return res.status(200).json(updatedPreferences);
    } else {
      // Create new preferences
      const preferencesData: InsertUserPreferences = {
        userId: parseInt(userId),
        ...validatedData
      };
      
      const [newPreferences] = await db.insert(userPreferences)
        .values(preferencesData)
        .returning();
      
      return res.status(201).json(newPreferences);
    }
  } catch (error) {
    console.error('Error updating user preferences:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a user profile (only admins can do this)
 */
export async function deleteUserProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Only allow admin or the user themselves
    if (req.user?.role !== 'admin' && req.user?.userId !== parseInt(userId)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    // Check if profile exists
    const [existingProfile] = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, parseInt(userId)))
      .limit(1);
    
    if (!existingProfile) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    
    // Note: We don't delete user from Auth service here, just the profile data
    
    // Delete profile data
    await db.delete(userProfiles)
      .where(eq(userProfiles.userId, parseInt(userId)));
    
    // Also delete related data
    await db.delete(userAddresses)
      .where(eq(userAddresses.userId, parseInt(userId)));
    
    await db.delete(userPreferences)
      .where(eq(userPreferences.userId, parseInt(userId)));
    
    return res.status(200).json({ message: 'User profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting user profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
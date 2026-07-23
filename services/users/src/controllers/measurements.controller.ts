import { Request, Response } from 'express';
import { db } from '../db';
import { 
  userMeasurements, 
  userSizePreferences,
  InsertUserMeasurements,
  InsertUserSizePreferences
} from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
}

// Validation schemas
const createMeasurementsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  footLength: z.number().int().min(1).max(500).optional(),
  footWidth: z.number().int().min(1).max(500).optional(),
  archType: z.enum(['normal', 'flat', 'high']).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  data: z.record(z.number()).optional()
});

const createSizePreferenceSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  brandId: z.number().int().positive().optional(),
  size: z.string().min(1).max(30).nonempty(),
  sizeSystem: z.string().min(1).max(20).nonempty(),
  fit: z.enum(['tight', 'regular', 'loose']).optional(),
  notes: z.string().max(500).optional()
});

/**
 * Get all measurements for a user
 */
export async function getUserMeasurements(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Get all measurements
    const measurementsList = await db.select()
      .from(userMeasurements)
      .where(eq(userMeasurements.userId, parseInt(userId)))
      .orderBy(desc(userMeasurements.lastUpdated));
    
    return res.status(200).json(measurementsList);
  } catch (error) {
    console.error('Error fetching user measurements:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create a new measurement profile for a user
 */
export async function createUserMeasurement(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Validate request body
    const validatedData = createMeasurementsSchema.parse(req.body);
    
    // Create measurement profile
    const measurementData: InsertUserMeasurements = {
      userId: parseInt(userId),
      name: validatedData.name || 'Default Profile',
      footLength: validatedData.footLength,
      footWidth: validatedData.footWidth,
      archType: validatedData.archType,
      gender: validatedData.gender,
      data: validatedData.data
    };
    
    const [newMeasurement] = await db.insert(userMeasurements)
      .values(measurementData)
      .returning();
    
    return res.status(201).json(newMeasurement);
  } catch (error) {
    console.error('Error creating user measurement:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update a measurement profile
 */
export async function updateUserMeasurement(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, measurementId } = req.params;
    
    // Validate request body
    const validatedData = createMeasurementsSchema.parse(req.body);
    
    // Check if measurement exists and belongs to user
    const [existingMeasurement] = await db.select()
      .from(userMeasurements)
      .where(
        and(
          eq(userMeasurements.id, parseInt(measurementId)),
          eq(userMeasurements.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!existingMeasurement) {
      return res.status(404).json({ message: 'Measurement profile not found' });
    }
    
    // Update measurement
    const [updatedMeasurement] = await db.update(userMeasurements)
      .set({
        name: validatedData.name || existingMeasurement.name,
        footLength: validatedData.footLength !== undefined ? validatedData.footLength : existingMeasurement.footLength,
        footWidth: validatedData.footWidth !== undefined ? validatedData.footWidth : existingMeasurement.footWidth,
        archType: validatedData.archType || existingMeasurement.archType,
        gender: validatedData.gender || existingMeasurement.gender,
        data: validatedData.data || existingMeasurement.data,
        lastUpdated: new Date()
      })
      .where(eq(userMeasurements.id, parseInt(measurementId)))
      .returning();
    
    return res.status(200).json(updatedMeasurement);
  } catch (error) {
    console.error('Error updating user measurement:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a measurement profile
 */
export async function deleteUserMeasurement(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, measurementId } = req.params;
    
    // Check if measurement exists and belongs to user
    const [existingMeasurement] = await db.select()
      .from(userMeasurements)
      .where(
        and(
          eq(userMeasurements.id, parseInt(measurementId)),
          eq(userMeasurements.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!existingMeasurement) {
      return res.status(404).json({ message: 'Measurement profile not found' });
    }
    
    // Delete the measurement
    await db.delete(userMeasurements)
      .where(eq(userMeasurements.id, parseInt(measurementId)));
    
    return res.status(200).json({ message: 'Measurement profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting user measurement:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get all size preferences for a user
 */
export async function getUserSizePreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Get all size preferences
    const sizePreferencesList = await db.select()
      .from(userSizePreferences)
      .where(eq(userSizePreferences.userId, parseInt(userId)))
      .orderBy(desc(userSizePreferences.updatedAt));
    
    return res.status(200).json(sizePreferencesList);
  } catch (error) {
    console.error('Error fetching user size preferences:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create a new size preference
 */
export async function createUserSizePreference(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Validate request body
    const validatedData = createSizePreferenceSchema.parse(req.body);
    
    // Check if a preference for this category/brand already exists
    if (validatedData.categoryId || validatedData.brandId) {
      const existingPreference = await db.select()
        .from(userSizePreferences)
        .where(
          and(
            eq(userSizePreferences.userId, parseInt(userId)),
            validatedData.categoryId 
              ? eq(userSizePreferences.categoryId, validatedData.categoryId)
              : undefined,
            validatedData.brandId
              ? eq(userSizePreferences.brandId, validatedData.brandId)
              : undefined
          )
        )
        .limit(1);
      
      if (existingPreference.length > 0) {
        return res.status(400).json({ 
          message: 'Size preference for this category/brand already exists' 
        });
      }
    }
    
    // Create size preference
    const sizePreferenceData: InsertUserSizePreferences = {
      userId: parseInt(userId),
      categoryId: validatedData.categoryId,
      brandId: validatedData.brandId,
      size: validatedData.size,
      sizeSystem: validatedData.sizeSystem,
      fit: validatedData.fit,
      notes: validatedData.notes
    };
    
    const [newSizePreference] = await db.insert(userSizePreferences)
      .values(sizePreferenceData)
      .returning();
    
    return res.status(201).json(newSizePreference);
  } catch (error) {
    console.error('Error creating user size preference:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update a size preference
 */
export async function updateUserSizePreference(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, preferenceId } = req.params;
    
    // Validate request body
    const validatedData = createSizePreferenceSchema.parse(req.body);
    
    // Check if preference exists and belongs to user
    const [existingPreference] = await db.select()
      .from(userSizePreferences)
      .where(
        and(
          eq(userSizePreferences.id, parseInt(preferenceId)),
          eq(userSizePreferences.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!existingPreference) {
      return res.status(404).json({ message: 'Size preference not found' });
    }
    
    // Update preference
    const [updatedPreference] = await db.update(userSizePreferences)
      .set({
        categoryId: validatedData.categoryId !== undefined ? validatedData.categoryId : existingPreference.categoryId,
        brandId: validatedData.brandId !== undefined ? validatedData.brandId : existingPreference.brandId,
        size: validatedData.size,
        sizeSystem: validatedData.sizeSystem,
        fit: validatedData.fit,
        notes: validatedData.notes,
        updatedAt: new Date()
      })
      .where(eq(userSizePreferences.id, parseInt(preferenceId)))
      .returning();
    
    return res.status(200).json(updatedPreference);
  } catch (error) {
    console.error('Error updating user size preference:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a size preference
 */
export async function deleteUserSizePreference(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, preferenceId } = req.params;
    
    // Check if preference exists and belongs to user
    const [existingPreference] = await db.select()
      .from(userSizePreferences)
      .where(
        and(
          eq(userSizePreferences.id, parseInt(preferenceId)),
          eq(userSizePreferences.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!existingPreference) {
      return res.status(404).json({ message: 'Size preference not found' });
    }
    
    // Delete the preference
    await db.delete(userSizePreferences)
      .where(eq(userSizePreferences.id, parseInt(preferenceId)));
    
    return res.status(200).json({ message: 'Size preference deleted successfully' });
  } catch (error) {
    console.error('Error deleting user size preference:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
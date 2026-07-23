import { Request, Response } from 'express';
import { db } from '../db';
import { 
  discounts,
  InsertDiscount,
  Discount
} from '../schema';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
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
const createDiscountSchema = z.object({
  code: z.string().min(3).max(50),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  value: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date().optional(),
  active: z.boolean().default(true),
  applicableProducts: z.array(z.number().int()).optional(),
  excludedProducts: z.array(z.number().int()).optional(),
  applicableCategories: z.array(z.number().int()).optional(),
  excludedCategories: z.array(z.number().int()).optional()
});

/**
 * Get all discounts
 */
export async function getDiscounts(req: AuthenticatedRequest, res: Response) {
  try {
    // Only admins can view all discounts
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    const discountsList = await db.select()
      .from(discounts);
    
    return res.status(200).json(discountsList);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get a specific discount by code
 */
export async function getDiscountByCode(req: AuthenticatedRequest, res: Response) {
  try {
    // Only admins can view specific discounts directly
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    const { code } = req.params;
    
    const [discount] = await db.select()
      .from(discounts)
      .where(eq(discounts.code, code))
      .limit(1);
    
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }
    
    return res.status(200).json(discount);
  } catch (error) {
    console.error('Error fetching discount:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create a new discount
 */
export async function createDiscount(req: AuthenticatedRequest, res: Response) {
  try {
    // Only admins can create discounts
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    // Validate request body
    const validatedData = createDiscountSchema.parse(req.body);
    
    // Check if discount code already exists
    const existingDiscount = await db.select()
      .from(discounts)
      .where(eq(discounts.code, validatedData.code))
      .limit(1);
    
    if (existingDiscount.length > 0) {
      return res.status(400).json({ message: 'Discount code already exists' });
    }
    
    // Create discount
    const [newDiscount] = await db.insert(discounts)
      .values({
        ...validatedData,
        usesCount: 0
      })
      .returning();
    
    return res.status(201).json(newDiscount);
  } catch (error) {
    console.error('Error creating discount:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update a discount
 */
export async function updateDiscount(req: AuthenticatedRequest, res: Response) {
  try {
    // Only admins can update discounts
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    const { id } = req.params;
    
    // Validate request body (partial update)
    const validatedData = createDiscountSchema.partial().parse(req.body);
    
    // Check if discount exists
    const [existingDiscount] = await db.select()
      .from(discounts)
      .where(eq(discounts.id, parseInt(id)))
      .limit(1);
    
    if (!existingDiscount) {
      return res.status(404).json({ message: 'Discount not found' });
    }
    
    // Check if code is being changed and if new code already exists
    if (validatedData.code && validatedData.code !== existingDiscount.code) {
      const codeExists = await db.select()
        .from(discounts)
        .where(
          and(
            eq(discounts.code, validatedData.code),
            sql`${discounts.id} != ${parseInt(id)}`
          )
        )
        .limit(1);
      
      if (codeExists.length > 0) {
        return res.status(400).json({ message: 'Discount code already exists' });
      }
    }
    
    // Update discount
    const [updatedDiscount] = await db.update(discounts)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(discounts.id, parseInt(id)))
      .returning();
    
    return res.status(200).json(updatedDiscount);
  } catch (error) {
    console.error('Error updating discount:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a discount
 */
export async function deleteDiscount(req: AuthenticatedRequest, res: Response) {
  try {
    // Only admins can delete discounts
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    const { id } = req.params;
    
    // Check if discount exists
    const [existingDiscount] = await db.select()
      .from(discounts)
      .where(eq(discounts.id, parseInt(id)))
      .limit(1);
    
    if (!existingDiscount) {
      return res.status(404).json({ message: 'Discount not found' });
    }
    
    // Delete discount
    await db.delete(discounts)
      .where(eq(discounts.id, parseInt(id)));
    
    return res.status(200).json({ message: 'Discount deleted successfully' });
  } catch (error) {
    console.error('Error deleting discount:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Validate a discount code without applying it
 */
export async function validateDiscountCode(req: Request, res: Response) {
  try {
    const { code } = req.params;
    
    // Check if discount code exists and is valid
    const [discount] = await db.select()
      .from(discounts)
      .where(
        and(
          eq(discounts.code, code),
          eq(discounts.active, true),
          sql`${discounts.starts_at} <= NOW()`,
          or(
            isNull(discounts.expiresAt),
            sql`${discounts.expires_at} > NOW()`
          ),
          or(
            isNull(discounts.maxUses),
            sql`${discounts.uses_count} < ${discounts.max_uses}`
          )
        )
      )
      .limit(1);
    
    if (!discount) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Invalid or expired discount code' 
      });
    }
    
    return res.status(200).json({
      valid: true,
      discount: {
        code: discount.code,
        description: discount.description,
        type: discount.type,
        value: discount.value,
        minOrderAmount: discount.minOrderAmount
      }
    });
  } catch (error) {
    console.error('Error validating discount code:', error);
    return res.status(500).json({ 
      valid: false,
      message: 'Error validating discount code' 
    });
  }
}
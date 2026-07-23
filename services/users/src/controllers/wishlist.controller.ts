import { Request, Response } from 'express';
import { db } from '../db';
import axios from 'axios';
import { 
  wishlists, 
  wishlistItems,
  InsertWishlist,
  InsertWishlistItem
} from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

// Service URLs
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:5003';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
}

// Validation schemas
const createWishlistSchema = z.object({
  name: z.string().min(1).max(100),
  isPublic: z.boolean().optional()
});

const addWishlistItemSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().optional()
});

/**
 * Get all wishlists for a user
 */
export async function getUserWishlists(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Get all wishlists
    const wishlistsList = await db.select()
      .from(wishlists)
      .where(eq(wishlists.userId, parseInt(userId)))
      .orderBy(desc(wishlists.updatedAt));
    
    // For each wishlist, count the number of items
    const enrichedWishlists = await Promise.all(wishlistsList.map(async (wishlist) => {
      const [{ count }] = await db.select({
        count: count(wishlistItems.id)
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, wishlist.id));
      
      return {
        ...wishlist,
        itemCount: Number(count) || 0
      };
    }));
    
    return res.status(200).json(enrichedWishlists);
  } catch (error) {
    console.error('Error fetching user wishlists:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get a specific wishlist with items
 */
export async function getWishlist(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, wishlistId } = req.params;
    
    // Check if wishlist exists and belongs to user
    const [wishlist] = await db.select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.id, parseInt(wishlistId)),
          eq(wishlists.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    
    // Get wishlist items
    const items = await db.select()
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, wishlist.id));
    
    // Get product details from Product service
    const productIds = items.map(item => item.productId);
    let productDetails: Record<number, any> = {};
    
    if (productIds.length > 0) {
      try {
        // Get product details in bulk
        const productResponse = await axios.get(`${PRODUCTS_SERVICE_URL}/products/bulk`, {
          params: { ids: productIds.join(',') }
        });
        
        // Convert to dictionary by id
        productDetails = productResponse.data.reduce((acc: Record<number, any>, product: any) => {
          acc[product.id] = product;
          return acc;
        }, {});
      } catch (error) {
        console.error('Error fetching product details:', error);
        // Continue without product details if service is unavailable
      }
    }
    
    // Enhance wishlist items with product details
    const enhancedItems = items.map(item => {
      const product = productDetails[item.productId] || { 
        id: item.productId,
        name: 'Product information unavailable',
        price: 0,
        imageUrl: null
      };
      
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        addedAt: item.createdAt,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.mainImageUrl,
          slug: product.slug
        }
      };
    });
    
    return res.status(200).json({
      ...wishlist,
      items: enhancedItems
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create a new wishlist
 */
export async function createWishlist(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    
    // Validate request body
    const validatedData = createWishlistSchema.parse(req.body);
    
    // Create wishlist
    const wishlistData: InsertWishlist = {
      userId: parseInt(userId),
      name: validatedData.name,
      isPublic: validatedData.isPublic
    };
    
    const [newWishlist] = await db.insert(wishlists)
      .values(wishlistData)
      .returning();
    
    return res.status(201).json(newWishlist);
  } catch (error) {
    console.error('Error creating wishlist:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update a wishlist
 */
export async function updateWishlist(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, wishlistId } = req.params;
    
    // Validate request body
    const validatedData = createWishlistSchema.parse(req.body);
    
    // Check if wishlist exists and belongs to user
    const [existingWishlist] = await db.select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.id, parseInt(wishlistId)),
          eq(wishlists.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!existingWishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    
    // Update wishlist
    const [updatedWishlist] = await db.update(wishlists)
      .set({
        name: validatedData.name,
        isPublic: validatedData.isPublic !== undefined ? validatedData.isPublic : existingWishlist.isPublic,
        updatedAt: new Date()
      })
      .where(eq(wishlists.id, parseInt(wishlistId)))
      .returning();
    
    return res.status(200).json(updatedWishlist);
  } catch (error) {
    console.error('Error updating wishlist:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a wishlist
 */
export async function deleteWishlist(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, wishlistId } = req.params;
    
    // Check if wishlist exists and belongs to user
    const [existingWishlist] = await db.select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.id, parseInt(wishlistId)),
          eq(wishlists.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!existingWishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    
    // Delete all wishlist items first (should cascade, but just to be safe)
    await db.delete(wishlistItems)
      .where(eq(wishlistItems.wishlistId, parseInt(wishlistId)));
    
    // Delete the wishlist
    await db.delete(wishlists)
      .where(eq(wishlists.id, parseInt(wishlistId)));
    
    return res.status(200).json({ message: 'Wishlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting wishlist:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Add an item to a wishlist
 */
export async function addItemToWishlist(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, wishlistId } = req.params;
    
    // Validate request body
    const validatedData = addWishlistItemSchema.parse(req.body);
    
    // Check if wishlist exists and belongs to user
    const [existingWishlist] = await db.select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.id, parseInt(wishlistId)),
          eq(wishlists.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!existingWishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    
    // Verify that the product exists by calling Product service
    try {
      await axios.get(`${PRODUCTS_SERVICE_URL}/products/${validatedData.productId}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return res.status(404).json({ message: 'Product not found' });
      }
      console.error('Error verifying product:', error);
      // Continue without verification if Product service is unavailable
    }
    
    // Check if item already exists in wishlist
    const [existingItem] = await db.select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.wishlistId, parseInt(wishlistId)),
          eq(wishlistItems.productId, validatedData.productId),
          validatedData.variantId
            ? eq(wishlistItems.variantId, validatedData.variantId)
            : eq(wishlistItems.variantId, null)
        )
      )
      .limit(1);
    
    if (existingItem) {
      return res.status(400).json({ message: 'Item already in wishlist' });
    }
    
    // Add item to wishlist
    const wishlistItemData: InsertWishlistItem = {
      wishlistId: parseInt(wishlistId),
      productId: validatedData.productId,
      variantId: validatedData.variantId
    };
    
    const [newItem] = await db.insert(wishlistItems)
      .values(wishlistItemData)
      .returning();
    
    // Update wishlist last modified time
    await db.update(wishlists)
      .set({ updatedAt: new Date() })
      .where(eq(wishlists.id, parseInt(wishlistId)));
    
    return res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding item to wishlist:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Remove an item from a wishlist
 */
export async function removeItemFromWishlist(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, wishlistId, itemId } = req.params;
    
    // Check if wishlist exists and belongs to user
    const [existingWishlist] = await db.select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.id, parseInt(wishlistId)),
          eq(wishlists.userId, parseInt(userId))
        )
      )
      .limit(1);
    
    if (!existingWishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    
    // Check if item exists in wishlist
    const [existingItem] = await db.select()
      .from(wishlistItems)
      .where(
        and(
          eq(wishlistItems.id, parseInt(itemId)),
          eq(wishlistItems.wishlistId, parseInt(wishlistId))
        )
      )
      .limit(1);
    
    if (!existingItem) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }
    
    // Remove item from wishlist
    await db.delete(wishlistItems)
      .where(eq(wishlistItems.id, parseInt(itemId)));
    
    // Update wishlist last modified time
    await db.update(wishlists)
      .set({ updatedAt: new Date() })
      .where(eq(wishlists.id, parseInt(wishlistId)));
    
    return res.status(200).json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error removing item from wishlist:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Check if a product is in any of the user's wishlists
 */
export async function checkProductInWishlists(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { productId, variantId } = req.query;
    
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }
    
    // Get all user's wishlists
    const userWishlists = await db.select()
      .from(wishlists)
      .where(eq(wishlists.userId, parseInt(userId)));
    
    const wishlistIds = userWishlists.map(wishlist => wishlist.id);
    
    if (wishlistIds.length === 0) {
      return res.status(200).json({
        inWishlist: false,
        wishlists: []
      });
    }
    
    // Check for the product in any of the wishlists
    let query = db.select({
      wishlistId: wishlistItems.wishlistId
    })
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.productId, parseInt(productId as string)),
        inArray(wishlistItems.wishlistId, wishlistIds)
      )
    );
    
    if (variantId) {
      query = query.where(eq(wishlistItems.variantId, parseInt(variantId as string)));
    }
    
    const matchingItems = await query;
    
    // Map wishlist IDs to names
    const wishlistsMap = userWishlists.reduce((acc: Record<number, string>, wishlist) => {
      acc[wishlist.id] = wishlist.name;
      return acc;
    }, {});
    
    const matchingWishlists = matchingItems.map(item => ({
      id: item.wishlistId,
      name: wishlistsMap[item.wishlistId] || 'Unknown Wishlist'
    }));
    
    return res.status(200).json({
      inWishlist: matchingWishlists.length > 0,
      wishlists: matchingWishlists
    });
  } catch (error) {
    console.error('Error checking product in wishlists:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
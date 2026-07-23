import { Request, Response } from 'express';
import { db } from '../db';
import { 
  productModels, 
  products, 
  InsertProductModel
} from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get all 3D models for a product
 */
export async function getProductModels(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    
    // Verify that the product exists
    const [product] = await db.select()
      .from(products)
      .where(
        and(
          eq(products.id, parseInt(productId)),
          eq(products.active, true)
        )
      )
      .limit(1);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get all models for the product
    const models = await db.select()
      .from(productModels)
      .where(
        and(
          eq(productModels.productId, parseInt(productId)),
          eq(productModels.active, true)
        )
      );
    
    return res.status(200).json(models);
  } catch (error) {
    console.error('Error fetching product models:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get a specific 3D model by ID
 */
export async function getProductModel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const [model] = await db.select()
      .from(productModels)
      .where(
        and(
          eq(productModels.id, parseInt(id)),
          eq(productModels.active, true)
        )
      )
      .limit(1);
    
    if (!model) {
      return res.status(404).json({ message: 'Model not found' });
    }
    
    return res.status(200).json(model);
  } catch (error) {
    console.error('Error fetching product model:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create a new 3D model for a product
 */
export async function createProductModel(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const modelData = req.body as InsertProductModel;
    
    // Verify that the product exists
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, parseInt(productId)))
      .limit(1);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Insert the model
    const [newModel] = await db.insert(productModels)
      .values({
        ...modelData,
        productId: parseInt(productId)
      })
      .returning();
    
    return res.status(201).json(newModel);
  } catch (error) {
    console.error('Error creating product model:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update a 3D model
 */
export async function updateProductModel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const modelData = req.body;
    
    // Check if model exists
    const [existingModel] = await db.select()
      .from(productModels)
      .where(eq(productModels.id, parseInt(id)))
      .limit(1);
    
    if (!existingModel) {
      return res.status(404).json({ message: 'Model not found' });
    }
    
    // Update model
    const [updatedModel] = await db.update(productModels)
      .set({
        ...modelData,
        updatedAt: new Date()
      })
      .where(eq(productModels.id, parseInt(id)))
      .returning();
    
    return res.status(200).json(updatedModel);
  } catch (error) {
    console.error('Error updating product model:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a 3D model
 */
export async function deleteProductModel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if model exists
    const [existingModel] = await db.select()
      .from(productModels)
      .where(eq(productModels.id, parseInt(id)))
      .limit(1);
    
    if (!existingModel) {
      return res.status(404).json({ message: 'Model not found' });
    }
    
    // Delete model (soft delete by setting active to false)
    await db.update(productModels)
      .set({
        active: false,
        updatedAt: new Date()
      })
      .where(eq(productModels.id, parseInt(id)));
    
    return res.status(200).json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting product model:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
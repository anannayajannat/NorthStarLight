import { Request, Response } from 'express';
import { db } from '../db';
import { 
  products, 
  categories, 
  productVariants, 
  productReviews, 
  relatedProducts,
  productModels,
  shoeMeasurements,
  InsertProduct,
  InsertProductVariant
} from '../schema';
import { eq, and, or, like, between, inArray, desc, asc, sql, count } from 'drizzle-orm';
import { z } from 'zod';
import slugify from 'slugify';

// Validation schemas
const productQuerySchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  featured: z.enum(['true', 'false']).optional(),
  bestSeller: z.enum(['true', 'false']).optional(),
  newArrivals: z.enum(['true', 'false']).optional(),
  onSale: z.enum(['true', 'false']).optional()
});

/**
 * Get all products with filtering, sorting, and pagination
 */
export async function getProducts(req: Request, res: Response) {
  try {
    const queryParams = productQuerySchema.parse(req.query);
    
    // Build query
    let query = db.select()
      .from(products)
      .where(eq(products.active, true));
    
    // Apply filters
    if (queryParams.category) {
      const category = await db.select()
        .from(categories)
        .where(or(
          eq(categories.id, parseInt(queryParams.category)),
          eq(categories.slug, queryParams.category)
        ))
        .limit(1);
      
      if (category.length > 0) {
        query = query.where(eq(products.categoryId, category[0].id));
      }
    }
    
    if (queryParams.brand) {
      query = query.where(eq(products.brand, queryParams.brand));
    }
    
    if (queryParams.search) {
      query = query.where(or(
        like(products.name, `%${queryParams.search}%`),
        like(products.description || '', `%${queryParams.search}%`),
        like(products.brand || '', `%${queryParams.search}%`)
      ));
    }
    
    if (queryParams.minPrice !== undefined && queryParams.maxPrice !== undefined) {
      query = query.where(between(products.price, queryParams.minPrice, queryParams.maxPrice));
    } else if (queryParams.minPrice !== undefined) {
      query = query.where(sql`${products.price} >= ${queryParams.minPrice}`);
    } else if (queryParams.maxPrice !== undefined) {
      query = query.where(sql`${products.price} <= ${queryParams.maxPrice}`);
    }
    
    if (queryParams.featured === 'true') {
      query = query.where(eq(products.featured, true));
    }
    
    if (queryParams.bestSeller === 'true') {
      query = query.where(eq(products.bestSeller, true));
    }
    
    if (queryParams.newArrivals === 'true') {
      query = query.where(eq(products.newArrival, true));
    }
    
    if (queryParams.onSale === 'true') {
      query = query.where(eq(products.onSale, true));
    }
    
    // Count total products matching the filters
    const countQuery = db.select({ count: count() })
      .from(products)
      .where(eq(products.active, true));
      
    // Apply the same filters to the count query
    if (query.where) {
      countQuery.where = query.where;
    }
    
    const [countResult] = await countQuery;
    const totalProducts = countResult?.count || 0;
    
    // Apply sorting
    if (queryParams.sort) {
      switch(queryParams.sort) {
        case 'name_asc':
          query = query.orderBy(asc(products.name));
          break;
        case 'name_desc':
          query = query.orderBy(desc(products.name));
          break;
        case 'price_asc':
          query = query.orderBy(asc(products.price));
          break;
        case 'price_desc':
          query = query.orderBy(desc(products.price));
          break;
        case 'newest':
          query = query.orderBy(desc(products.createdAt));
          break;
        case 'bestselling':
          query = query.orderBy(desc(products.bestSeller));
          break;
        default:
          query = query.orderBy(asc(products.name));
      }
    } else {
      // Default sorting
      query = query.orderBy(asc(products.name));
    }
    
    // Apply pagination
    const offset = (queryParams.page - 1) * queryParams.limit;
    query = query.limit(queryParams.limit).offset(offset);
    
    // Execute query
    const productsList = await query;
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalProducts / queryParams.limit);
    
    return res.status(200).json({
      products: productsList,
      pagination: {
        total: totalProducts,
        page: queryParams.page,
        limit: queryParams.limit,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid query parameters', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get best-selling products
 */
export async function getBestSellingProducts(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
    
    const productsList = await db.select()
      .from(products)
      .where(
        and(
          eq(products.active, true),
          eq(products.bestSeller, true)
        )
      )
      .limit(limit);
    
    return res.status(200).json(productsList);
  } catch (error) {
    console.error('Error fetching best-selling products:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get new arrivals
 */
export async function getNewArrivals(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
    
    const productsList = await db.select()
      .from(products)
      .where(
        and(
          eq(products.active, true),
          eq(products.newArrival, true)
        )
      )
      .orderBy(desc(products.createdAt))
      .limit(limit);
    
    return res.status(200).json(productsList);
  } catch (error) {
    console.error('Error fetching new arrivals:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get on sale products
 */
export async function getOnSaleProducts(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
    
    const productsList = await db.select()
      .from(products)
      .where(
        and(
          eq(products.active, true),
          eq(products.onSale, true),
          sql`${products.sale_price} IS NOT NULL`
        )
      )
      .limit(limit);
    
    return res.status(200).json(productsList);
  } catch (error) {
    console.error('Error fetching on sale products:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get a product by ID or slug
 */
export async function getProductById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if id is a number (product ID) or string (slug)
    const isNumeric = /^\d+$/.test(id);
    
    let product;
    if (isNumeric) {
      [product] = await db.select()
        .from(products)
        .where(
          and(
            eq(products.id, parseInt(id)),
            eq(products.active, true)
          )
        )
        .limit(1);
    } else {
      [product] = await db.select()
        .from(products)
        .where(
          and(
            eq(products.slug, id),
            eq(products.active, true)
          )
        )
        .limit(1);
    }
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get product variants
    const variants = await db.select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, product.id),
          eq(productVariants.active, true)
        )
      );
    
    // Get product 3D model if available
    const [model] = await db.select()
      .from(productModels)
      .where(
        and(
          eq(productModels.productId, product.id),
          eq(productModels.active, true)
        )
      )
      .limit(1);
    
    // Get product shoe measurements
    const measurements = await db.select()
      .from(shoeMeasurements)
      .where(eq(shoeMeasurements.productId, product.id));
    
    // Get category
    let category = null;
    if (product.categoryId) {
      [category] = await db.select()
        .from(categories)
        .where(eq(categories.id, product.categoryId))
        .limit(1);
    }
    
    // Get reviews
    const reviews = await db.select()
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, product.id),
          eq(productReviews.approved, true)
        )
      )
      .orderBy(desc(productReviews.createdAt));
    
    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0;
    
    return res.status(200).json({
      ...product,
      variants,
      model,
      measurements,
      category,
      reviews,
      avgRating
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get similar products
 */
export async function getSimilarProducts(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
    
    // First check if there are explicitly defined related products
    const relatedProductIds = await db.select({ relatedProductId: relatedProducts.relatedProductId })
      .from(relatedProducts)
      .where(
        and(
          eq(relatedProducts.productId, parseInt(id)),
          eq(relatedProducts.relationType, 'similar')
        )
      )
      .limit(limit);
    
    if (relatedProductIds.length > 0) {
      const relatedProductsList = await db.select()
        .from(products)
        .where(
          and(
            inArray(products.id, relatedProductIds.map(r => r.relatedProductId)),
            eq(products.active, true)
          )
        )
        .limit(limit);
      
      return res.status(200).json(relatedProductsList);
    }
    
    // If no explicit relations, find similar products based on category
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, parseInt(id)))
      .limit(1);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const similarProducts = await db.select()
      .from(products)
      .where(
        and(
          eq(products.active, true),
          eq(products.categoryId, product.categoryId),
          sql`${products.id} != ${product.id}`
        )
      )
      .limit(limit);
    
    // If not enough similar products in same category, add some from same brand
    if (similarProducts.length < limit && product.brand) {
      const additionalProducts = await db.select()
        .from(products)
        .where(
          and(
            eq(products.active, true),
            eq(products.brand, product.brand),
            sql`${products.id} != ${product.id}`,
            sql`${products.id} NOT IN (${similarProducts.map(p => p.id).join(',')})`
          )
        )
        .limit(limit - similarProducts.length);
      
      return res.status(200).json([...similarProducts, ...additionalProducts]);
    }
    
    return res.status(200).json(similarProducts);
  } catch (error) {
    console.error('Error fetching similar products:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get frequently bought together products
 */
export async function getFrequentlyBoughtTogether(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
    
    const relatedProductIds = await db.select({ relatedProductId: relatedProducts.relatedProductId })
      .from(relatedProducts)
      .where(
        and(
          eq(relatedProducts.productId, parseInt(id)),
          eq(relatedProducts.relationType, 'frequently-bought-together')
        )
      )
      .limit(limit);
    
    if (relatedProductIds.length > 0) {
      const relatedProductsList = await db.select()
        .from(products)
        .where(
          and(
            inArray(products.id, relatedProductIds.map(r => r.relatedProductId)),
            eq(products.active, true)
          )
        )
        .limit(limit);
      
      return res.status(200).json(relatedProductsList);
    }
    
    // If no explicit relations, just return some popular products
    const popularProducts = await db.select()
      .from(products)
      .where(
        and(
          eq(products.active, true),
          eq(products.bestSeller, true),
          sql`${products.id} != ${id}`
        )
      )
      .limit(limit);
    
    return res.status(200).json(popularProducts);
  } catch (error) {
    console.error('Error fetching frequently bought together products:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create a new product
 */
export async function createProduct(req: Request, res: Response) {
  try {
    // Validate request body
    const productData = req.body as InsertProduct;
    
    // Generate slug if not provided
    if (!productData.slug) {
      productData.slug = slugify(productData.name, { lower: true });
    }
    
    // Check if slug is already used
    const existingProduct = await db.select({ id: products.id })
      .from(products)
      .where(eq(products.slug, productData.slug))
      .limit(1);
    
    if (existingProduct.length > 0) {
      return res.status(400).json({ message: 'Product with this slug already exists' });
    }
    
    // Insert product
    const [newProduct] = await db.insert(products)
      .values(productData)
      .returning();
    
    return res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update a product
 */
export async function updateProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const productData = req.body;
    
    // Check if product exists
    const [existingProduct] = await db.select()
      .from(products)
      .where(eq(products.id, parseInt(id)))
      .limit(1);
    
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update product
    const [updatedProduct] = await db.update(products)
      .set({
        ...productData,
        updatedAt: new Date()
      })
      .where(eq(products.id, parseInt(id)))
      .returning();
    
    return res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const [existingProduct] = await db.select()
      .from(products)
      .where(eq(products.id, parseInt(id)))
      .limit(1);
    
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Delete product (soft delete by setting active to false)
    await db.update(products)
      .set({
        active: false,
        updatedAt: new Date()
      })
      .where(eq(products.id, parseInt(id)));
    
    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create a product variant
 */
export async function createProductVariant(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const variantData = req.body as InsertProductVariant;
    
    // Check if product exists
    const [existingProduct] = await db.select()
      .from(products)
      .where(eq(products.id, parseInt(productId)))
      .limit(1);
    
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Insert variant
    const [newVariant] = await db.insert(productVariants)
      .values({
        ...variantData,
        productId: parseInt(productId)
      })
      .returning();
    
    return res.status(201).json(newVariant);
  } catch (error) {
    console.error('Error creating product variant:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update a product variant
 */
export async function updateProductVariant(req: Request, res: Response) {
  try {
    const { productId, variantId } = req.params;
    const variantData = req.body;
    
    // Check if variant exists and belongs to the specified product
    const [existingVariant] = await db.select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, parseInt(variantId)),
          eq(productVariants.productId, parseInt(productId))
        )
      )
      .limit(1);
    
    if (!existingVariant) {
      return res.status(404).json({ message: 'Product variant not found' });
    }
    
    // Update variant
    const [updatedVariant] = await db.update(productVariants)
      .set({
        ...variantData,
        updatedAt: new Date()
      })
      .where(eq(productVariants.id, parseInt(variantId)))
      .returning();
    
    return res.status(200).json(updatedVariant);
  } catch (error) {
    console.error('Error updating product variant:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a product variant
 */
export async function deleteProductVariant(req: Request, res: Response) {
  try {
    const { productId, variantId } = req.params;
    
    // Check if variant exists and belongs to the specified product
    const [existingVariant] = await db.select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, parseInt(variantId)),
          eq(productVariants.productId, parseInt(productId))
        )
      )
      .limit(1);
    
    if (!existingVariant) {
      return res.status(404).json({ message: 'Product variant not found' });
    }
    
    // Delete variant (soft delete by setting active to false)
    await db.update(productVariants)
      .set({
        active: false,
        updatedAt: new Date()
      })
      .where(eq(productVariants.id, parseInt(variantId)));
    
    return res.status(200).json({ message: 'Product variant deleted successfully' });
  } catch (error) {
    console.error('Error deleting product variant:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
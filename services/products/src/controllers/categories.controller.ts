import { Request, Response } from 'express';
import { db } from '../db';
import { categories, products, InsertCategory } from '../schema';
import { eq, and, count } from 'drizzle-orm';
import slugify from 'slugify';

/**
 * Get all categories
 */
export async function getCategories(req: Request, res: Response) {
  try {
    // Get categories with product count
    const result = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: categories.imageUrl,
        parentId: categories.parentId,
        active: categories.active,
        sortOrder: categories.sortOrder,
        featured: categories.featured,
        metaTitle: categories.metaTitle,
        metaDescription: categories.metaDescription,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        productCount: count(products.id)
      })
      .from(categories)
      .leftJoin(products, and(
        eq(products.categoryId, categories.id),
        eq(products.active, true)
      ))
      .where(eq(categories.active, true))
      .groupBy(categories.id)
      .orderBy(categories.sortOrder, categories.name);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get category by ID or slug
 */
export async function getCategoryById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if id is a number (category ID) or string (slug)
    const isNumeric = /^\d+$/.test(id);
    
    let category;
    if (isNumeric) {
      [category] = await db.select()
        .from(categories)
        .where(
          and(
            eq(categories.id, parseInt(id)),
            eq(categories.active, true)
          )
        )
        .limit(1);
    } else {
      [category] = await db.select()
        .from(categories)
        .where(
          and(
            eq(categories.slug, id),
            eq(categories.active, true)
          )
        )
        .limit(1);
    }
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Get subcategories if any
    const subcategories = await db.select()
      .from(categories)
      .where(
        and(
          eq(categories.parentId, category.id),
          eq(categories.active, true)
        )
      )
      .orderBy(categories.sortOrder, categories.name);
    
    // Get products in this category
    const productsList = await db.select()
      .from(products)
      .where(
        and(
          eq(products.categoryId, category.id),
          eq(products.active, true)
        )
      )
      .limit(20);
    
    // Get parent category if any
    let parentCategory = null;
    if (category.parentId) {
      [parentCategory] = await db.select()
        .from(categories)
        .where(eq(categories.id, category.parentId))
        .limit(1);
    }
    
    return res.status(200).json({
      ...category,
      subcategories,
      products: productsList,
      parentCategory
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create a new category
 */
export async function createCategory(req: Request, res: Response) {
  try {
    // Validate request body
    const categoryData = req.body as InsertCategory;
    
    // Generate slug if not provided
    if (!categoryData.slug) {
      categoryData.slug = slugify(categoryData.name, { lower: true });
    }
    
    // Check if slug is already used
    const existingCategory = await db.select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categoryData.slug))
      .limit(1);
    
    if (existingCategory.length > 0) {
      return res.status(400).json({ message: 'Category with this slug already exists' });
    }
    
    // Insert category
    const [newCategory] = await db.insert(categories)
      .values(categoryData)
      .returning();
    
    return res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update a category
 */
export async function updateCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const categoryData = req.body;
    
    // Check if category exists
    const [existingCategory] = await db.select()
      .from(categories)
      .where(eq(categories.id, parseInt(id)))
      .limit(1);
    
    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Update category
    const [updatedCategory] = await db.update(categories)
      .set({
        ...categoryData,
        updatedAt: new Date()
      })
      .where(eq(categories.id, parseInt(id)))
      .returning();
    
    return res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if category exists
    const [existingCategory] = await db.select()
      .from(categories)
      .where(eq(categories.id, parseInt(id)))
      .limit(1);
    
    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if category has products
    const productsCount = await db.select({ count: count() })
      .from(products)
      .where(eq(products.categoryId, parseInt(id)));
    
    if (productsCount[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with associated products. Reassign products to another category first.'
      });
    }
    
    // Check if category has subcategories
    const subcategoriesCount = await db.select({ count: count() })
      .from(categories)
      .where(eq(categories.parentId, parseInt(id)));
    
    if (subcategoriesCount[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with subcategories. Delete or reassign subcategories first.'
      });
    }
    
    // Delete category (soft delete by setting active to false)
    await db.update(categories)
      .set({
        active: false,
        updatedAt: new Date()
      })
      .where(eq(categories.id, parseInt(id)));
    
    return res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
import { 
  pgTable, 
  serial, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  integer, 
  decimal, 
  json,
  foreignKey 
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Categories table schema
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  imageUrl: text('image_url'),
  parentId: integer('parent_id').references(() => categories.id, { onDelete: 'set null' }),
  active: boolean('active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0),
  featured: boolean('featured').default(false),
  metaTitle: varchar('meta_title', { length: 100 }),
  metaDescription: text('meta_description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Products table schema
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  salePrice: decimal('sale_price', { precision: 10, scale: 2 }),
  compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  sku: varchar('sku', { length: 100 }).unique(),
  barcode: varchar('barcode', { length: 100 }),
  mainImageUrl: text('main_image_url'),
  imageUrls: text('image_urls').array(),
  brand: varchar('brand', { length: 100 }),
  tags: text('tags').array(),
  weight: decimal('weight', { precision: 10, scale: 2 }),
  dimensions: json('dimensions').$type<{ length: number, width: number, height: number }>(),
  featured: boolean('featured').default(false),
  bestSeller: boolean('best_seller').default(false),
  newArrival: boolean('new_arrival').default(false),
  onSale: boolean('on_sale').default(false),
  stock: integer('stock').default(0),
  lowStockThreshold: integer('low_stock_threshold').default(5),
  active: boolean('active').default(true).notNull(),
  attributes: json('attributes').$type<Record<string, string>>(),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Product variants table schema
export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).unique(),
  barcode: varchar('barcode', { length: 100 }),
  price: decimal('price', { precision: 10, scale: 2 }),
  salePrice: decimal('sale_price', { precision: 10, scale: 2 }),
  compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  imageUrl: text('image_url'),
  stock: integer('stock').default(0),
  options: json('options').$type<Record<string, string>>(), // e.g. { "Size": "XL", "Color": "Red" }
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Product reviews table schema
export const productReviews = pgTable('product_reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').notNull(),
  rating: integer('rating').notNull(),
  review: text('review'),
  title: varchar('title', { length: 255 }),
  approved: boolean('approved').default(false),
  verifiedPurchase: boolean('verified_purchase').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Product related items
export const relatedProducts = pgTable('related_products', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  relatedProductId: integer('related_product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  relationType: varchar('relation_type', { length: 50 }).notNull(), // e.g. 'similar', 'frequently-bought-together', 'accessories'
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 3D Models for products
export const productModels = pgTable('product_models', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  modelUrl: text('model_url').notNull(),
  modelFormat: varchar('model_format', { length: 50 }).notNull(), // e.g. 'glb', 'gltf', 'obj'
  textureUrls: text('texture_urls').array(),
  defaultPosition: json('default_position').$type<{ x: number, y: number, z: number }>(),
  defaultRotation: json('default_rotation').$type<{ x: number, y: number, z: number }>(),
  defaultScale: json('default_scale').$type<{ x: number, y: number, z: number }>(),
  annotations: json('annotations').$type<Array<{ position: { x: number, y: number, z: number }, text: string }>>(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Shoe measurements
export const shoeMeasurements = pgTable('shoe_measurements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  size: varchar('size', { length: 20 }).notNull(), // e.g. '9', '9.5', '10'
  sizeSystem: varchar('size_system', { length: 20 }).notNull(), // e.g. 'US', 'EU', 'UK'
  gender: varchar('gender', { length: 10 }).notNull(), // e.g. 'men', 'women', 'unisex'
  lengthMm: decimal('length_mm', { precision: 6, scale: 2 }),
  widthMm: decimal('width_mm', { precision: 6, scale: 2 }),
  insoleLength: decimal('insole_length', { precision: 6, scale: 2 }),
  insoleWidth: decimal('insole_width', { precision: 6, scale: 2 }),
  heelHeight: decimal('heel_height', { precision: 6, scale: 2 }),
  weight: decimal('weight', { precision: 6, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Inventory table schema
export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  warehouseId: integer('warehouse_id').notNull(), // Reference to external warehouse service
  quantity: integer('quantity').default(0).notNull(),
  reservedQuantity: integer('reserved_quantity').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    // Ensure either productId or variantId is set, but not both
    inventoryUniqueIdx: foreignKey({
      columns: [table.productId, table.variantId, table.warehouseId],
      name: 'inventory_unique_idx'
    })
  };
});

// Price history
export const priceHistory = pgTable('price_history', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }),
  variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  salePrice: decimal('sale_price', { precision: 10, scale: 2 }),
  effectiveFrom: timestamp('effective_from').notNull(),
  effectiveTo: timestamp('effective_to'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Insert schemas
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductReviewSchema = createInsertSchema(productReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRelatedProductSchema = createInsertSchema(relatedProducts).omit({
  id: true,
  createdAt: true
});

export const insertProductModelSchema = createInsertSchema(productModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertShoeMeasurementSchema = createInsertSchema(shoeMeasurements).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({
  id: true,
  createdAt: true
});

// Types
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;

export type ProductReview = typeof productReviews.$inferSelect;
export type InsertProductReview = z.infer<typeof insertProductReviewSchema>;

export type RelatedProduct = typeof relatedProducts.$inferSelect;
export type InsertRelatedProduct = z.infer<typeof insertRelatedProductSchema>;

export type ProductModel = typeof productModels.$inferSelect;
export type InsertProductModel = z.infer<typeof insertProductModelSchema>;

export type ShoeMeasurement = typeof shoeMeasurements.$inferSelect;
export type InsertShoeMeasurement = z.infer<typeof insertShoeMeasurementSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
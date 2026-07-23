import { 
  pgTable, 
  serial, 
  integer, 
  varchar, 
  decimal, 
  timestamp, 
  boolean,
  json,
  text
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Carts table schema
export const carts = pgTable('carts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  sessionId: varchar('session_id', { length: 100 }),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  metadata: json('metadata').$type<Record<string, any>>()
});

// Cart items table schema
export const cartItems = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  cartId: integer('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull(),
  variantId: integer('variant_id'),
  quantity: integer('quantity').notNull().default(1),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  discountedPrice: decimal('discounted_price', { precision: 10, scale: 2 }),
  options: json('options').$type<Record<string, string>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Discounts table schema
export const discounts = pgTable('discounts', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull(), // percentage, fixed_amount, free_shipping
  value: decimal('value', { precision: 10, scale: 2 }), // Percentage or fixed amount
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }),
  maxUses: integer('max_uses'),
  usesCount: integer('uses_count').default(0),
  startsAt: timestamp('starts_at').notNull(),
  expiresAt: timestamp('expires_at'),
  active: boolean('active').default(true).notNull(),
  applicableProducts: integer('applicable_products').array(),
  excludedProducts: integer('excluded_products').array(),
  applicableCategories: integer('applicable_categories').array(),
  excludedCategories: integer('excluded_categories').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Cart discounts junction table schema
export const cartDiscounts = pgTable('cart_discounts', {
  id: serial('id').primaryKey(),
  cartId: integer('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  discountId: integer('discount_id').notNull().references(() => discounts.id, { onDelete: 'cascade' }),
  appliedAt: timestamp('applied_at').defaultNow().notNull()
});

// Shipping rates table schema
export const shippingRates = pgTable('shipping_rates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }),
  maxOrderAmount: decimal('max_order_amount', { precision: 10, scale: 2 }),
  estimatedDeliveryDays: integer('estimated_delivery_days'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Insert schemas
export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDiscountSchema = createInsertSchema(discounts).omit({
  id: true,
  usesCount: true,
  createdAt: true,
  updatedAt: true
});

export const insertCartDiscountSchema = createInsertSchema(cartDiscounts).omit({
  id: true,
  appliedAt: true
});

export const insertShippingRateSchema = createInsertSchema(shippingRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type Cart = typeof carts.$inferSelect;
export type InsertCart = z.infer<typeof insertCartSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Discount = typeof discounts.$inferSelect;
export type InsertDiscount = z.infer<typeof insertDiscountSchema>;

export type CartDiscount = typeof cartDiscounts.$inferSelect;
export type InsertCartDiscount = z.infer<typeof insertCartDiscountSchema>;

export type ShippingRate = typeof shippingRates.$inferSelect;
export type InsertShippingRate = z.infer<typeof insertShippingRateSchema>;
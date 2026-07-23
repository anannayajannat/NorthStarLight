import { pgTable, text, serial, integer, boolean, jsonb, timestamp, doublePrecision, foreignKey, uuid, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phoneNumber: text("phone_number"),
  role: text("role").default("customer"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Categories schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

// Products schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  salePrice: doublePrecision("sale_price"),
  categoryId: integer("category_id").references(() => categories.id),
  brand: text("brand"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  isBestSeller: boolean("is_best_seller").default(false),
  isNew: boolean("is_new").default(false),
  isSale: boolean("is_sale").default(false),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

// Product Variants (sizes, colors, etc.)
export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  size: text("size"),
  color: text("color"),
  stock: integer("stock").default(0),
  sku: text("sku").notNull().unique(),
});

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({
  id: true,
});

// Cart schema
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Cart Items schema
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").references(() => carts.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  variantId: integer("variant_id").references(() => productVariants.id),
  quantity: integer("quantity").default(1),
  price: doublePrecision("price").notNull(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
});

// Orders schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  status: text("status").default("pending"),
  total: doublePrecision("total").notNull(),
  shippingAddress: jsonb("shipping_address"),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Order Items schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  variantId: integer("variant_id").references(() => productVariants.id),
  quantity: integer("quantity").default(1),
  price: doublePrecision("price").notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

// Payments schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").default("USD"),
  status: text("status").default("pending"),
  paymentMethod: text("payment_method").notNull(),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// User Preferences schema for personalized recommendations
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  preferredBrands: text("preferred_brands").array(),
  preferredCategories: text("preferred_categories").array(),
  preferredSizes: text("preferred_sizes").array(),
  preferredColors: text("preferred_colors").array(),
  priceSensitivity: integer("price_sensitivity"), // Scale 1-10 where 10 is most price sensitive
  lastViewedProducts: integer("last_viewed_products").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Interactions schema to track product views, additions to cart, etc.
export const userInteractions = pgTable("user_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"), // For anonymous users
  productId: integer("product_id").references(() => products.id).notNull(),
  action: text("action").notNull(), // view, cart_add, purchase, wishlist_add, etc.
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"), // Additional data like time spent viewing, etc.
});

export const insertUserInteractionSchema = createInsertSchema(userInteractions).omit({
  id: true,
  timestamp: true,
});

// 3D Model schema for Virtual Try-On and 3D Visualization
export const productModels = pgTable("product_models", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  modelUrl: text("model_url").notNull(), // URL to 3D model file
  textureUrl: text("texture_url"), // URL to texture file if separate
  thumbnailUrl: text("thumbnail_url"), // Preview image of the 3D model
  modelType: text("model_type").default("glb"), // glb, gltf, obj, etc.
  allowCustomization: boolean("allow_customization").default(false),
  customizableProperties: jsonb("customizable_properties"), // Colors, materials, etc. that can be customized
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductModelSchema = createInsertSchema(productModels).omit({
  id: true,
  createdAt: true,
});

// Shoe Measurements schema for size recommendations
export const shoeMeasurements = pgTable("shoe_measurements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  size: text("size").notNull(),
  lengthMm: integer("length_mm").notNull(),
  widthMm: integer("width_mm").notNull(),
  insoleWidthMm: integer("insole_width_mm"),
  heelWidthMm: integer("heel_width_mm"),
  archTypeSuitability: text("arch_type_suitability"), // flat, normal, high
  volumeType: text("volume_type"), // low, medium, high (for instep height)
  measurements: jsonb("measurements"), // Additional detailed measurements
});

export const insertShoeMeasurementSchema = createInsertSchema(shoeMeasurements).omit({
  id: true,
});

// Admin Users schema with extended permissions
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  role: text("role").default("editor"), // admin, editor, analyst, etc.
  permissions: jsonb("permissions"), // Detailed permission settings
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;

export type Cart = typeof carts.$inferSelect;
export type InsertCart = z.infer<typeof insertCartSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;

export type UserInteraction = typeof userInteractions.$inferSelect;
export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;

export type ProductModel = typeof productModels.$inferSelect;
export type InsertProductModel = z.infer<typeof insertProductModelSchema>;

export type ShoeMeasurement = typeof shoeMeasurements.$inferSelect;
export type InsertShoeMeasurement = z.infer<typeof insertShoeMeasurementSchema>;

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

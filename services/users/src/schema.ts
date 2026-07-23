import { 
  pgTable, 
  serial, 
  integer, 
  varchar, 
  text, 
  timestamp, 
  boolean,
  json,
  date,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// User profiles table schema
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  displayName: varchar('display_name', { length: 100 }),
  bio: text('bio'),
  avatarUrl: varchar('avatar_url', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 30 }),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  language: varchar('language', { length: 10 }).default('en'),
  timezone: varchar('timezone', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: uniqueIndex('user_profiles_user_id_idx').on(table.userId)
  };
});

// User addresses table schema
export const userAddresses = pgTable('user_addresses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  addressName: varchar('address_name', { length: 100 }),
  addressType: varchar('address_type', { length: 20 }).notNull().default('shipping'),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  address1: varchar('address1', { length: 255 }).notNull(),
  address2: varchar('address2', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  postalCode: varchar('postal_code', { length: 20 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// User preferences table schema
export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  emailNotifications: boolean('email_notifications').default(true),
  smsNotifications: boolean('sms_notifications').default(false),
  pushNotifications: boolean('push_notifications').default(true),
  marketingEmails: boolean('marketing_emails').default(true),
  theme: varchar('theme', { length: 20 }).default('light'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  favoriteCategories: integer('favorite_categories').array(),
  favoriteStyles: varchar('favorite_styles', { length: 50 }).array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: uniqueIndex('user_preferences_user_id_idx').on(table.userId)
  };
});

// User wishlists table schema
export const wishlists = pgTable('wishlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull().default('Default Wishlist'),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Wishlist items table schema
export const wishlistItems = pgTable('wishlist_items', {
  id: serial('id').primaryKey(),
  wishlistId: integer('wishlist_id').notNull().references(() => wishlists.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull(),
  variantId: integer('variant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// User measurements table schema
export const userMeasurements = pgTable('user_measurements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull().default('Default Profile'),
  footLength: integer('foot_length'),
  footWidth: integer('foot_width'),
  archType: varchar('arch_type', { length: 30 }),
  gender: varchar('gender', { length: 20 }),
  data: json('data').$type<Record<string, number>>(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// User size preferences table schema
export const userSizePreferences = pgTable('user_size_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  categoryId: integer('category_id'),
  brandId: integer('brand_id'),
  size: varchar('size', { length: 30 }).notNull(),
  sizeSystem: varchar('size_system', { length: 20 }).notNull(),
  fit: varchar('fit', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// User rewards table schema
export const userRewards = pgTable('user_rewards', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  points: integer('points').notNull().default(0),
  totalEarned: integer('total_earned').notNull().default(0),
  totalSpent: integer('total_spent').notNull().default(0),
  tier: varchar('tier', { length: 30 }).notNull().default('bronze'),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: uniqueIndex('user_rewards_user_id_idx').on(table.userId)
  };
});

// User reward transactions table schema
export const rewardTransactions = pgTable('reward_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  orderId: integer('order_id'),
  points: integer('points').notNull(),
  type: varchar('type', { length: 30 }).notNull(), // earn, spend, expire, adjust
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Insert schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWishlistSchema = createInsertSchema(wishlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({
  id: true,
  createdAt: true
});

export const insertUserMeasurementsSchema = createInsertSchema(userMeasurements).omit({
  id: true,
  lastUpdated: true,
  createdAt: true
});

export const insertUserSizePreferencesSchema = createInsertSchema(userSizePreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserRewardsSchema = createInsertSchema(userRewards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastActivity: true
});

export const insertRewardTransactionSchema = createInsertSchema(rewardTransactions).omit({
  id: true,
  createdAt: true
});

// Types
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export type Wishlist = typeof wishlists.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;

export type UserMeasurements = typeof userMeasurements.$inferSelect;
export type InsertUserMeasurements = z.infer<typeof insertUserMeasurementsSchema>;

export type UserSizePreferences = typeof userSizePreferences.$inferSelect;
export type InsertUserSizePreferences = z.infer<typeof insertUserSizePreferencesSchema>;

export type UserRewards = typeof userRewards.$inferSelect;
export type InsertUserRewards = z.infer<typeof insertUserRewardsSchema>;

export type RewardTransaction = typeof rewardTransactions.$inferSelect;
export type InsertRewardTransaction = z.infer<typeof insertRewardTransactionSchema>;
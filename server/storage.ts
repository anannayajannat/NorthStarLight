import {
  users, products, categories, productVariants, 
  carts, cartItems, orders, orderItems, payments,
  userPreferences, userInteractions, productModels, shoeMeasurements, adminUsers,
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Category, type InsertCategory,
  type ProductVariant, type InsertProductVariant,
  type Cart, type InsertCart,
  type CartItem, type InsertCartItem,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Payment, type InsertPayment,
  type UserPreference, type InsertUserPreference,
  type UserInteraction, type InsertUserInteraction,
  type ProductModel, type InsertProductModel,
  type ShoeMeasurement, type InsertShoeMeasurement,
  type AdminUser, type InsertAdminUser
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or, desc, asc, isNull, isNotNull, inArray, not } from "drizzle-orm";

// Storage interface for all operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProducts(params?: {
    category?: number;
    brand?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    limit?: number;
    offset?: number;
    featured?: boolean;
    bestSeller?: boolean;
    newArrivals?: boolean;
    onSale?: boolean;
  }): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  countProducts(params?: {
    category?: number;
    brand?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    featured?: boolean;
    bestSeller?: boolean;
    newArrivals?: boolean;
    onSale?: boolean;
  }): Promise<number>;

  // Category operations
  getCategory(id: number): Promise<Category | undefined>;
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Product Variant operations
  getProductVariant(id: number): Promise<ProductVariant | undefined>;
  getProductVariantsBySku(sku: string): Promise<ProductVariant | undefined>;
  getProductVariantsByProduct(productId: number): Promise<ProductVariant[]>;
  createProductVariant(variant: InsertProductVariant): Promise<ProductVariant>;
  updateProductVariant(id: number, variant: Partial<InsertProductVariant>): Promise<ProductVariant | undefined>;
  deleteProductVariant(id: number): Promise<boolean>;

  // Cart operations
  getCart(id: number): Promise<Cart | undefined>;
  getCartByUser(userId: number): Promise<Cart | undefined>;
  getCartBySession(sessionId: string): Promise<Cart | undefined>;
  createCart(cart: InsertCart): Promise<Cart>;
  deleteCart(id: number): Promise<boolean>;

  // Cart Item operations
  getCartItems(cartId: number): Promise<CartItem[]>;
  addCartItem(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined>;
  removeCartItem(id: number): Promise<boolean>;

  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Order Item operations
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  addOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByOrder(orderId: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Payment | undefined>;
  
  // User Preferences operations
  getUserPreference(userId: number): Promise<UserPreference | undefined>;
  createUserPreference(preference: InsertUserPreference): Promise<UserPreference>;
  updateUserPreference(userId: number, preference: Partial<InsertUserPreference>): Promise<UserPreference | undefined>;
  
  // User Interactions operations
  getUserInteractions(userId: number, limit?: number): Promise<UserInteraction[]>;
  getSessionInteractions(sessionId: string, limit?: number): Promise<UserInteraction[]>;
  trackUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction>;
  getProductInteractions(productId: number, action?: string, limit?: number): Promise<UserInteraction[]>;
  
  // Recommendation operations
  getRecommendedProducts(userId?: number, sessionId?: string, limit?: number): Promise<Product[]>;
  getSimilarProducts(productId: number, limit?: number): Promise<Product[]>;
  getFrequentlyBoughtTogether(productId: number, limit?: number): Promise<Product[]>;
  
  // 3D Models operations
  getProductModel(id: number): Promise<ProductModel | undefined>;
  getProductModelByProduct(productId: number): Promise<ProductModel | undefined>;
  createProductModel(model: InsertProductModel): Promise<ProductModel>;
  updateProductModel(id: number, model: Partial<InsertProductModel>): Promise<ProductModel | undefined>;
  deleteProductModel(id: number): Promise<boolean>;
  
  // Shoe Measurements operations
  getShoeMeasurements(productId: number, size?: string): Promise<ShoeMeasurement[]>;
  createShoeMeasurement(measurement: InsertShoeMeasurement): Promise<ShoeMeasurement>;
  updateShoeMeasurement(id: number, measurement: Partial<InsertShoeMeasurement>): Promise<ShoeMeasurement | undefined>;
  deleteShoeMeasurement(id: number): Promise<boolean>;
  
  // Admin operations
  getAdminUser(userId: number): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(userId: number, admin: Partial<InsertAdminUser>): Promise<AdminUser | undefined>;
  deleteAdminUser(userId: number): Promise<boolean>;
  updateAdminLastLogin(userId: number): Promise<AdminUser | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProducts(params: {
    category?: number;
    brand?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    limit?: number;
    offset?: number;
    featured?: boolean;
    bestSeller?: boolean;
    newArrivals?: boolean;
    onSale?: boolean;
  } = {}): Promise<Product[]> {
    let query = db.select().from(products);
    
    // Apply filters
    const conditions = [];
    
    if (params.category !== undefined) {
      conditions.push(eq(products.categoryId, params.category));
    }
    
    if (params.brand !== undefined) {
      conditions.push(eq(products.brand, params.brand));
    }
    
    if (params.search !== undefined) {
      conditions.push(
        or(
          like(products.name, `%${params.search}%`),
          like(products.description || '', `%${params.search}%`)
        )
      );
    }
    
    if (params.minPrice !== undefined) {
      conditions.push(
        or(
          and(
            isNotNull(products.salePrice),
            products.salePrice >= params.minPrice
          ),
          and(
            isNull(products.salePrice),
            products.price >= params.minPrice
          )
        )
      );
    }
    
    if (params.maxPrice !== undefined) {
      conditions.push(
        or(
          and(
            isNotNull(products.salePrice),
            products.salePrice <= params.maxPrice
          ),
          and(
            isNull(products.salePrice),
            products.price <= params.maxPrice
          )
        )
      );
    }
    
    if (params.featured !== undefined) {
      conditions.push(eq(products.isFeatured, params.featured));
    }
    
    if (params.bestSeller !== undefined) {
      conditions.push(eq(products.isBestSeller, params.bestSeller));
    }
    
    if (params.newArrivals !== undefined) {
      conditions.push(eq(products.isNew, params.newArrivals));
    }
    
    if (params.onSale !== undefined) {
      conditions.push(eq(products.isSale, params.onSale));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Apply sorting
    if (params.sort !== undefined) {
      switch (params.sort) {
        case 'price_asc':
          query = query.orderBy(asc(products.price));
          break;
        case 'price_desc':
          query = query.orderBy(desc(products.price));
          break;
        case 'name_asc':
          query = query.orderBy(asc(products.name));
          break;
        case 'name_desc':
          query = query.orderBy(desc(products.name));
          break;
        case 'newest':
          query = query.orderBy(desc(products.createdAt));
          break;
        default:
          break;
      }
    }
    
    // Apply pagination
    if (params.limit !== undefined) {
      query = query.limit(params.limit);
    }
    
    if (params.offset !== undefined) {
      query = query.offset(params.offset);
    }
    
    return await query;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    return result.length > 0;
  }

  async countProducts(params: {
    category?: number;
    brand?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    featured?: boolean;
    bestSeller?: boolean;
    newArrivals?: boolean;
    onSale?: boolean;
  } = {}): Promise<number> {
    const result = await this.getProducts(params);
    return result.length;
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updatedCategory] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    return result.length > 0;
  }

  // Product Variant operations
  async getProductVariant(id: number): Promise<ProductVariant | undefined> {
    const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, id));
    return variant;
  }

  async getProductVariantsBySku(sku: string): Promise<ProductVariant | undefined> {
    const [variant] = await db.select().from(productVariants).where(eq(productVariants.sku, sku));
    return variant;
  }

  async getProductVariantsByProduct(productId: number): Promise<ProductVariant[]> {
    return await db.select().from(productVariants).where(eq(productVariants.productId, productId));
  }

  async createProductVariant(variant: InsertProductVariant): Promise<ProductVariant> {
    const [newVariant] = await db.insert(productVariants).values(variant).returning();
    return newVariant;
  }

  async updateProductVariant(id: number, variant: Partial<InsertProductVariant>): Promise<ProductVariant | undefined> {
    const [updatedVariant] = await db.update(productVariants).set(variant).where(eq(productVariants.id, id)).returning();
    return updatedVariant;
  }

  async deleteProductVariant(id: number): Promise<boolean> {
    const result = await db.delete(productVariants).where(eq(productVariants.id, id)).returning({ id: productVariants.id });
    return result.length > 0;
  }

  // Cart operations
  async getCart(id: number): Promise<Cart | undefined> {
    const [cart] = await db.select().from(carts).where(eq(carts.id, id));
    return cart;
  }

  async getCartByUser(userId: number): Promise<Cart | undefined> {
    const [cart] = await db.select().from(carts).where(eq(carts.userId, userId));
    return cart;
  }

  async getCartBySession(sessionId: string): Promise<Cart | undefined> {
    const [cart] = await db.select().from(carts).where(eq(carts.sessionId, sessionId));
    return cart;
  }

  async createCart(cart: InsertCart): Promise<Cart> {
    const [newCart] = await db.insert(carts).values(cart).returning();
    return newCart;
  }

  async deleteCart(id: number): Promise<boolean> {
    const result = await db.delete(carts).where(eq(carts.id, id)).returning({ id: carts.id });
    return result.length > 0;
  }

  // Cart Item operations
  async getCartItems(cartId: number): Promise<CartItem[]> {
    return await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  }

  async addCartItem(item: InsertCartItem): Promise<CartItem> {
    const [newItem] = await db.insert(cartItems).values(item).returning();
    return newItem;
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined> {
    const [updatedItem] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return updatedItem;
  }

  async removeCartItem(id: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id)).returning({ id: cartItems.id });
    return result.length > 0;
  }

  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }
  
  async getOrders(limit?: number): Promise<Order[]> {
    let query = db.select().from(orders).orderBy(desc(orders.createdAt));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updatedOrder;
  }

  // Order Item operations
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async addOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db.insert(orderItems).values(item).returning();
    return newItem;
  }

  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentByOrder(orderId: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Payment | undefined> {
    const updates: any = { status };
    if (transactionId) {
      updates.transactionId = transactionId;
    }
    const [updatedPayment] = await db.update(payments).set(updates).where(eq(payments.id, id)).returning();
    return updatedPayment;
  }

  // User Preferences operations
  async getUserPreference(userId: number): Promise<UserPreference | undefined> {
    const [preference] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preference;
  }

  async createUserPreference(preference: InsertUserPreference): Promise<UserPreference> {
    const [newPreference] = await db.insert(userPreferences).values(preference).returning();
    return newPreference;
  }

  async updateUserPreference(userId: number, preference: Partial<InsertUserPreference>): Promise<UserPreference | undefined> {
    const [updatedPreference] = await db.update(userPreferences)
      .set({ ...preference, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return updatedPreference;
  }

  // User Interactions operations
  async getUserInteractions(userId: number, limit: number = 50): Promise<UserInteraction[]> {
    return await db.select()
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId))
      .orderBy(desc(userInteractions.timestamp))
      .limit(limit);
  }

  async getSessionInteractions(sessionId: string, limit: number = 50): Promise<UserInteraction[]> {
    return await db.select()
      .from(userInteractions)
      .where(eq(userInteractions.sessionId, sessionId))
      .orderBy(desc(userInteractions.timestamp))
      .limit(limit);
  }

  async trackUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction> {
    const [newInteraction] = await db.insert(userInteractions).values(interaction).returning();
    return newInteraction;
  }

  async getProductInteractions(productId: number, action?: string, limit: number = 50): Promise<UserInteraction[]> {
    let query = db.select()
      .from(userInteractions)
      .where(eq(userInteractions.productId, productId));
    
    if (action) {
      query = query.where(eq(userInteractions.action, action));
    }
    
    return await query.orderBy(desc(userInteractions.timestamp)).limit(limit);
  }

  // Recommendation operations
  async getRecommendedProducts(userId?: number, sessionId?: string, limit: number = 10): Promise<Product[]> {
    // This is a simple implementation that could be enhanced with more sophisticated algorithms
    
    // If we have a userId, use that for recommendations
    if (userId) {
      // 1. Get user preferences
      const userPreference = await this.getUserPreference(userId);
      
      // 2. Get recent interactions
      const interactions = await this.getUserInteractions(userId, 20);
      
      // 3. Extract product IDs from interactions
      const interactedProductIds = interactions.map(interaction => interaction.productId);
      
      // 4. Find products based on preferences or similar to previously interacted products
      let recommendedProducts: Product[] = [];
      
      if (userPreference?.preferredBrands?.length) {
        // Get products matching preferred brands
        const brandProducts = await db.select()
          .from(products)
          .where(
            and(
              userPreference.preferredBrands.length > 0 ? inArray(products.brand, userPreference.preferredBrands) : undefined,
              eq(products.isActive, true)
            )
          )
          .limit(limit);
        
        recommendedProducts = [...recommendedProducts, ...brandProducts];
      }
      
      if (userPreference?.preferredCategories?.length && recommendedProducts.length < limit) {
        // Get products matching preferred categories
        const categoryIds = userPreference.preferredCategories.map(Number);
        const categoryProducts = await db.select()
          .from(products)
          .where(
            and(
              categoryIds.length > 0 ? inArray(products.categoryId, categoryIds) : undefined,
              eq(products.isActive, true)
            )
          )
          .limit(limit - recommendedProducts.length);
        
        recommendedProducts = [...recommendedProducts, ...categoryProducts];
      }
      
      // If we still don't have enough recommendations, get best sellers
      if (recommendedProducts.length < limit) {
        const bestSellers = await db.select()
          .from(products)
          .where(
            and(
              eq(products.isBestSeller, true),
              eq(products.isActive, true)
            )
          )
          .limit(limit - recommendedProducts.length);
        
        recommendedProducts = [...recommendedProducts, ...bestSellers];
      }
      
      // Make sure we don't have duplicates
      const uniqueProductMap = new Map<number, Product>();
      for (const product of recommendedProducts) {
        if (!uniqueProductMap.has(product.id)) {
          uniqueProductMap.set(product.id, product);
        }
      }
      
      return [...uniqueProductMap.values()].slice(0, limit);
    }
    
    // If we only have a sessionId, use that for recommendations
    if (sessionId) {
      // 1. Get recent interactions from this session
      const sessionInteractions = await this.getSessionInteractions(sessionId, 10);
      
      // 2. Extract products and actions from interactions
      const viewedProductIds = sessionInteractions
        .filter(i => i.action === 'view')
        .map(i => i.productId);
      
      // 3. Find similar products to what the user has viewed
      if (viewedProductIds.length > 0) {
        // Get similar products based on category or other attributes
        const similarProducts = await db.select()
          .from(products)
          .where(
            and(
              eq(products.isActive, true), 
              inArray(
                products.categoryId,
                db.select({ categoryId: products.categoryId })
                  .from(products)
                  .where(inArray(products.id, viewedProductIds))
                  .groupBy(products.categoryId)
              ),
              not(inArray(products.id, viewedProductIds))
            )
          )
          .limit(limit);
        
        return similarProducts;
      }
    }
    
    // Fallback: Return best sellers or featured products
    return await db.select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          or(
            eq(products.isBestSeller, true),
            eq(products.isFeatured, true)
          )
        )
      )
      .limit(limit);
  }

  async getSimilarProducts(productId: number, limit: number = 4): Promise<Product[]> {
    // 1. Get the product to find similar ones
    const product = await this.getProduct(productId);
    
    if (!product) return [];
    
    // 2. Find products in the same category with similar price range
    const similarProducts = await db.select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          not(eq(products.id, productId)), // Exclude the current product
          product.categoryId ? eq(products.categoryId, product.categoryId) : undefined,
          product.brand ? eq(products.brand, product.brand) : undefined
        )
      )
      .limit(limit);
    
    return similarProducts;
  }

  async getFrequentlyBoughtTogether(productId: number, limit: number = 4): Promise<Product[]> {
    // Find products that were purchased together with this product
    // This is a simple implementation that could be enhanced with more sophisticated algorithms
    
    // 1. Find order IDs where this product was purchased
    const orderIds = await db.select({ orderId: orderItems.orderId })
      .from(orderItems)
      .where(eq(orderItems.productId, productId));
    
    if (orderIds.length === 0) return [];
    
    // 2. Find other products in those orders
    const orderItemsWithProduct = await db.select()
      .from(orderItems)
      .where(
        and(
          inArray(orderItems.orderId, orderIds.map(o => o.orderId)),
          not(eq(orderItems.productId, productId))
        )
      );
    
    // 3. Count how many times each product appears with our target product
    const productCounts = new Map<number, number>();
    for (const item of orderItemsWithProduct) {
      const count = productCounts.get(item.productId) || 0;
      productCounts.set(item.productId, count + 1);
    }
    
    // 4. Sort by frequency and get top products
    const topProductIds = [...productCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
    
    if (topProductIds.length === 0) {
      // If no products were found, fall back to similar products
      return this.getSimilarProducts(productId, limit);
    }
    
    // 5. Get the actual products
    return await db.select()
      .from(products)
      .where(inArray(products.id, topProductIds));
  }

  // 3D Models operations
  async getProductModel(id: number): Promise<ProductModel | undefined> {
    const [model] = await db.select().from(productModels).where(eq(productModels.id, id));
    return model;
  }

  async getProductModelByProduct(productId: number): Promise<ProductModel | undefined> {
    const [model] = await db.select().from(productModels).where(eq(productModels.productId, productId));
    return model;
  }

  async createProductModel(model: InsertProductModel): Promise<ProductModel> {
    const [newModel] = await db.insert(productModels).values(model).returning();
    return newModel;
  }

  async updateProductModel(id: number, model: Partial<InsertProductModel>): Promise<ProductModel | undefined> {
    const [updatedModel] = await db.update(productModels).set(model).where(eq(productModels.id, id)).returning();
    return updatedModel;
  }

  async deleteProductModel(id: number): Promise<boolean> {
    const result = await db.delete(productModels).where(eq(productModels.id, id)).returning({ id: productModels.id });
    return result.length > 0;
  }

  // Shoe Measurements operations
  async getShoeMeasurements(productId: number, size?: string): Promise<ShoeMeasurement[]> {
    let query = db.select().from(shoeMeasurements).where(eq(shoeMeasurements.productId, productId));
    
    if (size) {
      query = query.where(eq(shoeMeasurements.size, size));
    }
    
    return await query;
  }

  async createShoeMeasurement(measurement: InsertShoeMeasurement): Promise<ShoeMeasurement> {
    const [newMeasurement] = await db.insert(shoeMeasurements).values(measurement).returning();
    return newMeasurement;
  }

  async updateShoeMeasurement(id: number, measurement: Partial<InsertShoeMeasurement>): Promise<ShoeMeasurement | undefined> {
    const [updatedMeasurement] = await db.update(shoeMeasurements).set(measurement).where(eq(shoeMeasurements.id, id)).returning();
    return updatedMeasurement;
  }

  async deleteShoeMeasurement(id: number): Promise<boolean> {
    const result = await db.delete(shoeMeasurements).where(eq(shoeMeasurements.id, id)).returning({ id: shoeMeasurements.id });
    return result.length > 0;
  }

  // Admin operations
  async getAdminUser(userId: number): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.userId, userId));
    return admin;
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db.insert(adminUsers).values(admin).returning();
    return newAdmin;
  }

  async updateAdminUser(userId: number, admin: Partial<InsertAdminUser>): Promise<AdminUser | undefined> {
    const [updatedAdmin] = await db.update(adminUsers).set(admin).where(eq(adminUsers.userId, userId)).returning();
    return updatedAdmin;
  }

  async deleteAdminUser(userId: number): Promise<boolean> {
    const result = await db.delete(adminUsers).where(eq(adminUsers.userId, userId)).returning({ id: adminUsers.id });
    return result.length > 0;
  }

  async updateAdminLastLogin(userId: number): Promise<AdminUser | undefined> {
    const [updatedAdmin] = await db.update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.userId, userId))
      .returning();
    return updatedAdmin;
  }
}

export const storage = new DatabaseStorage();
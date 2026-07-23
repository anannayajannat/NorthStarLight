import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertProductSchema, 
  insertCategorySchema, 
  insertProductVariantSchema,
  insertCartSchema,
  insertCartItemSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertPaymentSchema,
  insertUserPreferenceSchema,
  insertUserInteractionSchema,
  insertProductModelSchema,
  insertShoeMeasurementSchema,
  insertAdminUserSchema
} from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { randomUUID } from "crypto";

// Fix: Augment express-session to include our custom cartId property
declare module "express-session" {
  interface SessionData {
    cartId?: number;
  }
}

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust the first proxy hop (required behind load balancers/reverse proxies
  // like Replit, Heroku, Render, etc.) so secure cookies and req.ip work correctly.
  app.set("trust proxy", 1);

  // Setup session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "shoeverse-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Setup passport for authentication
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth middleware
  const requireAuth = (req: Request, res: Response, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Session cart middleware
  app.use(async (req: any, res, next) => {
    if (!req.session.cartId && !req.user) {
      const sessionId = req.sessionID || randomUUID();
      const cart = await storage.createCart({ sessionId });
      req.session.cartId = cart.id;
    }
    next();
  });

  // AUTH SERVICE ROUTES

  // Register a new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, async (err) => {
        if (err) {
          return next(err);
        }
        
        // Transfer session cart to user cart if exists
        if (req.session.cartId) {
          const sessionCart = await storage.getCart(req.session.cartId);
          const userCart = await storage.getCartByUser(user.id);
          
          if (sessionCart && !userCart) {
            // Update session cart to associate with user
            await storage.updateUser(user.id, { cart: sessionCart.id });
          } else if (sessionCart && userCart) {
            // Merge carts
            const sessionItems = await storage.getCartItems(sessionCart.id);
            for (const item of sessionItems) {
              await storage.addCartItem({
                cartId: userCart.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity ?? 1, // Fix: Added null fallback
                price: item.price,
              });
            }
            // Delete session cart
            await storage.deleteCart(sessionCart.id);
          }
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });

  // Update user profile
  app.put("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userData = insertUserSchema.partial().omit({ password: true }).parse(req.body);
      
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error updating user" });
    }
  });

  // Change password
  app.put("/api/auth/password", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      });
      
      const { currentPassword, newPassword } = schema.parse(req.body);
      const userId = (req.user as any).id;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update password
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error updating password" });
    }
  });

  // PRODUCT SERVICE ROUTES

  // Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  // Get a specific category
  app.get("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategory(id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Error fetching category" });
    }
  });

  // Create a new category (admin only)
  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error creating category" });
    }
  });

  // Update a category (admin only)
  app.put("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const id = parseInt(req.params.id);
      const categoryData = insertCategorySchema.partial().parse(req.body);
      
      const updatedCategory = await storage.updateCategory(id, categoryData);
      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error updating category" });
    }
  });

  // Delete a category (admin only)
  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCategory(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting category" });
    }
  });

  // Get all products with filtering, sorting, and pagination
  app.get("/api/products", async (req, res) => {
    try {
      const {
        category,
        brand,
        search,
        minPrice,
        maxPrice,
        sort,
        page = "1",
        limit = "12",
        featured,
        bestSeller,
        newArrivals,
        onSale,
      } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      const params: any = {
        limit: limitNum,
        offset,
        sort: sort as string | undefined,
      };
      
      if (category) params.category = parseInt(category as string);
      if (brand) params.brand = brand as string;
      if (search) params.search = search as string;
      if (minPrice) params.minPrice = parseFloat(minPrice as string);
      if (maxPrice) params.maxPrice = parseFloat(maxPrice as string);
      if (featured) params.featured = featured === "true";
      if (bestSeller) params.bestSeller = bestSeller === "true";
      if (newArrivals) params.newArrivals = newArrivals === "true";
      if (onSale) params.onSale = onSale === "true";
      
      const [products, totalCount] = await Promise.all([
        storage.getProducts(params),
        storage.countProducts(params),
      ]);
      
      const totalPages = Math.ceil(totalCount / limitNum);
      
      res.json({
        products,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  // Get best sellers
  app.get("/api/products/best-sellers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || "4");
      const products = await storage.getProducts({
        bestSeller: true,
        limit,
      });
      
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching best sellers" });
    }
  });

  // Get new arrivals
  app.get("/api/products/new-arrivals", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || "4");
      const products = await storage.getProducts({
        newArrivals: true,
        limit,
      });
      
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching new arrivals" });
    }
  });

  // Get on sale products
  app.get("/api/products/on-sale", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || "4");
      const products = await storage.getProducts({
        onSale: true,
        limit,
      });
      
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sale products" });
    }
  });

  // Get a specific product
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      const variants = await storage.getProductVariantsByProduct(id);
      
      res.json({
        ...product,
        variants,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  // Create a new product (admin only)
  app.post("/api/products", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error creating product" });
    }
  });

  // Update a product (admin only)
  app.put("/api/products/:id", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const id = parseInt(req.params.id);
      const productData = insertProductSchema.partial().parse(req.body);
      
      const updatedProduct = await storage.updateProduct(id, productData);
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(updatedProduct);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error updating product" });
    }
  });

  // Delete a product (admin only)
  app.delete("/api/products/:id", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting product" });
    }
  });

  // PRODUCT VARIANT SERVICE ROUTES

  // Get variants for a product
  app.get("/api/products/:id/variants", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const variants = await storage.getProductVariantsByProduct(productId);
      
      res.json(variants);
    } catch (error) {
      res.status(500).json({ message: "Error fetching variants" });
    }
  });

  // Create a new product variant (admin only)
  app.post("/api/variants", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const variantData = insertProductVariantSchema.parse(req.body);
      
      // Check if product exists
      const product = await storage.getProduct(variantData.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check if SKU is unique
      const existingVariant = await storage.getProductVariantsBySku(variantData.sku);
      if (existingVariant) {
        return res.status(400).json({ message: "SKU already exists" });
      }
      
      const variant = await storage.createProductVariant(variantData);
      
      res.status(201).json(variant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error creating variant" });
    }
  });

  // Update a product variant (admin only)
  app.put("/api/variants/:id", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const id = parseInt(req.params.id);
      const variantData = insertProductVariantSchema.partial().parse(req.body);
      
      // If updating SKU, check if it's unique
      if (variantData.sku) {
        const existingVariant = await storage.getProductVariantsBySku(variantData.sku);
        if (existingVariant && existingVariant.id !== id) {
          return res.status(400).json({ message: "SKU already exists" });
        }
      }
      
      const updatedVariant = await storage.updateProductVariant(id, variantData);
      if (!updatedVariant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      
      res.json(updatedVariant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error updating variant" });
    }
  });

  // Delete a product variant (admin only)
  app.delete("/api/variants/:id", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProductVariant(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Variant not found" });
      }
      
      res.json({ message: "Variant deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting variant" });
    }
  });

  // CART SERVICE ROUTES

  // Get the current user's cart
  app.get("/api/cart", async (req: any, res) => {
    try {
      let cart;
      if (req.isAuthenticated()) {
        // Get user's cart
        cart = await storage.getCartByUser((req.user as any).id);
        if (!cart) {
          // Create a new cart for the user if it doesn't exist
          cart = await storage.createCart({ userId: (req.user as any).id });
        }
      } else {
        // Get session cart
        if (!req.session.cartId) {
          // Create a new session cart if it doesn't exist
          const sessionId = req.sessionID || randomUUID();
          cart = await storage.createCart({ sessionId });
          req.session.cartId = cart.id;
        } else {
          cart = await storage.getCart(req.session.cartId);
          if (!cart) {
            // Create a new session cart if it doesn't exist
            const sessionId = req.sessionID || randomUUID();
            cart = await storage.createCart({ sessionId });
            req.session.cartId = cart.id;
          }
        }
      }
      
      // Get cart items
      const cartItems = await storage.getCartItems(cart.id);
      
      // Get product details for each item
      const items = await Promise.all(cartItems.map(async (item) => {
        const product = await storage.getProduct(item.productId);
        let variant = null;
        
        if (item.variantId) {
          variant = await storage.getProductVariant(item.variantId);
        }
        
        return {
          id: item.id,
          product,
          variant,
          quantity: item.quantity ?? 1, // Fix: Added null fallback
          price: item.price,
          subtotal: item.price * (item.quantity ?? 1), // Fix: Added null fallback
        };
      }));
      
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      
      res.json({
        id: cart.id,
        items,
        totals: {
          subtotal,
          shipping: 0, // Free shipping for now
          total: subtotal,
        },
        itemCount: items.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching cart" });
    }
  });

  // Add an item to the cart
  app.post("/api/cart/items", async (req: any, res) => {
    try {
      const schema = z.object({
        productId: z.number(),
        variantId: z.number().optional(),
        quantity: z.number().min(1).default(1),
      });
      
      const { productId, variantId, quantity } = schema.parse(req.body);
      
      // Get product to check price
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // If variant specified, check if it exists and has stock
      if (variantId) {
        const variant = await storage.getProductVariant(variantId);
        if (!variant) {
          return res.status(404).json({ message: "Variant not found" });
        }
        
        if (variant.stock !== null && variant.stock < quantity) {
          return res.status(400).json({ message: "Not enough stock available" });
        }
      }
      
      // Get or create cart
      let cart;
      if (req.isAuthenticated()) {
        cart = await storage.getCartByUser((req.user as any).id);
        if (!cart) {
          cart = await storage.createCart({ userId: (req.user as any).id });
        }
      } else {
        if (!req.session.cartId) {
          const sessionId = req.sessionID || randomUUID();
          cart = await storage.createCart({ sessionId });
          req.session.cartId = cart.id;
        } else {
          cart = await storage.getCart(req.session.cartId);
          if (!cart) {
            const sessionId = req.sessionID || randomUUID();
            cart = await storage.createCart({ sessionId });
            req.session.cartId = cart.id;
          }
        }
      }
      
      // Check if item already exists in cart
      const cartItems = await storage.getCartItems(cart.id);
      const existingItem = cartItems.find(item => 
        item.productId === productId && item.variantId === variantId
      );
      
      if (existingItem) {
        // Update quantity if item exists
        const updatedItem = await storage.updateCartItemQuantity(
          existingItem.id,
          (existingItem.quantity ?? 1) + quantity // Fix: Added null fallback
        );
        
        res.json(updatedItem);
      } else {
        // Add new item to cart
        const price = product.salePrice || product.price;
        const newItem = await storage.addCartItem({
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
          price,
        });
        
        res.status(201).json(newItem);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error adding item to cart" });
    }
  });

  // Update cart item quantity
  app.put("/api/cart/items/:id", async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const schema = z.object({
        quantity: z.number().min(1),
      });
      
      const { quantity } = schema.parse(req.body);
      
      // Get cart
      let cart;
      if (req.isAuthenticated()) {
        cart = await storage.getCartByUser((req.user as any).id);
      } else if (req.session.cartId) {
        cart = await storage.getCart(req.session.cartId);
      }
      
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }
      
      // Get cart items to verify item belongs to this cart
      const cartItems = await storage.getCartItems(cart.id);
      const existingItem = cartItems.find(item => item.id === itemId);
      
      if (!existingItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      // Update quantity
      const updatedItem = await storage.updateCartItemQuantity(itemId, quantity);
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error updating cart item" });
    }
  });

  // Remove an item from the cart
  app.delete("/api/cart/items/:id", async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      
      // Get cart
      let cart;
      if (req.isAuthenticated()) {
        cart = await storage.getCartByUser((req.user as any).id);
      } else if (req.session.cartId) {
        cart = await storage.getCart(req.session.cartId);
      }
      
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }
      
      // Get cart items to verify item belongs to this cart
      const cartItems = await storage.getCartItems(cart.id);
      const existingItem = cartItems.find(item => item.id === itemId);
      
      if (!existingItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      // Remove item
      await storage.removeCartItem(itemId);
      
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      res.status(500).json({ message: "Error removing item from cart" });
    }
  });

  // Clear the cart
  app.delete("/api/cart", async (req: any, res) => {
    try {
      // Get cart
      let cart;
      if (req.isAuthenticated()) {
        cart = await storage.getCartByUser((req.user as any).id);
      } else if (req.session.cartId) {
        cart = await storage.getCart(req.session.cartId);
      }
      
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }
      
      // Get all cart items
      const cartItems = await storage.getCartItems(cart.id);
      
      // Remove all items
      for (const item of cartItems) {
        await storage.removeCartItem(item.id);
      }
      
      res.json({ message: "Cart cleared" });
    } catch (error) {
      res.status(500).json({ message: "Error clearing cart" });
    }
  });

  // ORDER SERVICE ROUTES

  // Create a new order
  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        shippingAddress: z.object({
          firstName: z.string(),
          lastName: z.string(),
          address: z.string(),
          city: z.string(),
          state: z.string(),
          zipCode: z.string(),
          country: z.string(),
        }),
        paymentMethod: z.string(),
      });
      
      const { shippingAddress, paymentMethod } = schema.parse(req.body);
      const userId = (req.user as any).id;
      
      // Get user's cart
      const cart = await storage.getCartByUser(userId);
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }
      
      // Get cart items
      const cartItems = await storage.getCartItems(cart.id);
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      
      // Calculate total
      let total = 0;
      for (const item of cartItems) {
        total += item.price * (item.quantity ?? 1); // Fix: Added null fallback
      }
      
      // Create order
      const order = await storage.createOrder({
        userId,
        total,
        status: "pending",
        shippingAddress,
        paymentMethod,
      });
      
      // Add order items
      for (const item of cartItems) {
        await storage.addOrderItem({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity ?? 1, // Fix: Added null fallback
          price: item.price,
        });
        
        // If variant specified, update stock
        if (item.variantId) {
          const variant = await storage.getProductVariant(item.variantId);
          if (variant && variant.stock !== null) {
            await storage.updateProductVariant(item.variantId, {
              stock: variant.stock - (item.quantity ?? 1), // Fix: Added null fallback
            });
          }
        }
      }
      
      // Clear the cart
      for (const item of cartItems) {
        await storage.removeCartItem(item.id);
      }
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error creating order" });
    }
  });

  // Get all orders for current user
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const orders = await storage.getOrdersByUser(userId);
      
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  // Get a specific order
  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if order belongs to current user
      if (order.userId !== (req.user as any).id && (req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get order items
      const orderItems = await storage.getOrderItems(id);
      
      // Get product details for each item
      const items = await Promise.all(orderItems.map(async (item) => {
        const product = await storage.getProduct(item.productId);
        let variant = null;
        
        if (item.variantId) {
          variant = await storage.getProductVariant(item.variantId);
        }
        
        return {
          id: item.id,
          product,
          variant,
          quantity: item.quantity ?? 1, // Fix: Added null fallback
          price: item.price,
          subtotal: item.price * (item.quantity ?? 1), // Fix: Added null fallback
        };
      }));
      
      // Get payment details
      const payment = await storage.getPaymentByOrder(id);
      
      res.json({
        ...order,
        items,
        payment,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching order" });
    }
  });

  // Cancel an order (only if status is pending)
  app.post("/api/orders/:id/cancel", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if order belongs to current user
      if (order.userId !== (req.user as any).id && (req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check if order can be cancelled
      if (order.status !== "pending") {
        return res.status(400).json({ message: "Order cannot be cancelled in its current status" });
      }
      
      // Update order status
      const updatedOrder = await storage.updateOrderStatus(id, "cancelled");
      
      // Return stock to inventory
      const orderItems = await storage.getOrderItems(id);
      for (const item of orderItems) {
        if (item.variantId) {
          const variant = await storage.getProductVariant(item.variantId);
          if (variant && variant.stock !== null) {
            await storage.updateProductVariant(item.variantId, {
              stock: variant.stock + (item.quantity ?? 1), // Fix: Added null fallback
            });
          }
        }
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error cancelling order" });
    }
  });

  // PAYMENT SERVICE ROUTES

  // Process payment for an order
  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        orderId: z.number(),
        amount: z.number().positive(),
        paymentMethod: z.string(),
        cardDetails: z.object({
          cardNumber: z.string().length(16),
          expMonth: z.string().length(2),
          expYear: z.string().length(2),
          cvc: z.string().length(3),
        }).optional(),
      });
      
      const { orderId, amount, paymentMethod, cardDetails } = schema.parse(req.body);
      
      // Get order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if order belongs to current user
      if (order.userId !== (req.user as any).id && (req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check if payment already exists
      const existingPayment = await storage.getPaymentByOrder(orderId);
      if (existingPayment) {
        return res.status(400).json({ message: "Payment already exists for this order" });
      }
      
      // Verify amount matches order total
      if (amount !== order.total) {
        return res.status(400).json({ message: "Payment amount does not match order total" });
      }
      
      // Process payment (mock implementation)
      const transactionId = `txn_${Date.now()}`;
      
      // Create payment record
      const payment = await storage.createPayment({
        orderId,
        amount,
        status: "completed",
        paymentMethod,
        transactionId,
      });
      
      // Update order status
      await storage.updateOrderStatus(orderId, "processing");
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error processing payment" });
    }
  });

  // Get payment status
  app.get("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Get order to check ownership
      const order = await storage.getOrder(payment.orderId);
      if (order?.userId !== (req.user as any).id && (req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Error fetching payment" });
    }
  });

  // INVENTORY SERVICE ROUTES

  // Check stock for a product variant
  app.get("/api/inventory/:variantId", async (req, res) => {
    try {
      const variantId = parseInt(req.params.variantId);
      const variant = await storage.getProductVariant(variantId);
      
      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      
      res.json({
        sku: variant.sku,
        inStock: variant.stock !== null && variant.stock > 0,
        quantity: variant.stock,
      });
    } catch (error) {
      res.status(500).json({ message: "Error checking inventory" });
    }
  });

  // Update inventory (admin only)
  app.put("/api/inventory/:variantId", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const variantId = parseInt(req.params.variantId);
      const schema = z.object({
        stock: z.number().min(0),
      });
      
      const { stock } = schema.parse(req.body);
      
      const variant = await storage.getProductVariant(variantId);
      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      
      const updatedVariant = await storage.updateProductVariant(variantId, { stock });
      
      res.json(updatedVariant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error updating inventory" });
    }
  });

  // USER PREFERENCES ROUTES

  // Get user preferences
  app.get("/api/preferences", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const preferences = await storage.getUserPreference(userId);
      
      if (!preferences) {
        // Return empty preferences if not found
        return res.json({
          userId,
          preferredCategories: [],
          preferredBrands: [],
          sizePreference: null,
          colorPreferences: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user preferences" });
    }
  });

  // Create or update user preferences
  app.post("/api/preferences", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const preferencesData = insertUserPreferenceSchema.omit({ userId: true }).parse(req.body);
      
      // Check if preferences already exist
      const existingPreferences = await storage.getUserPreference(userId);
      
      if (existingPreferences) {
        // Update existing preferences
        const updatedPreferences = await storage.updateUserPreference(userId, preferencesData);
        return res.json(updatedPreferences);
      } else {
        // Create new preferences
        const newPreferences = await storage.createUserPreference({
          ...preferencesData,
          userId
        });
        return res.status(201).json(newPreferences);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error updating user preferences" });
    }
  });

  // USER INTERACTIONS ROUTES

  // Track user interaction
  app.post("/api/interactions", async (req, res) => {
    try {
      const interactionData = insertUserInteractionSchema.parse(req.body) as any;
      
      // Add user ID if authenticated
      if (req.isAuthenticated()) {
        interactionData.userId = (req.user as any).id;
      }
      
      // Add session ID if not provided
      if (!interactionData.sessionId && !interactionData.userId) {
        interactionData.sessionId = req.sessionID || randomUUID();
      }
      
      const interaction = await storage.trackUserInteraction({
        ...interactionData,
        timestamp: new Date()
      });
      
      res.status(201).json(interaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error tracking interaction" });
    }
  });
  // Get user interactions (for authenticated users)
  app.get("/api/interactions", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { limit } = req.query;
      
      const interactions = await storage.getUserInteractions(
        userId,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching interactions" });
    }
  });

  // RECOMMENDATIONS ROUTES

  // Get personalized product recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : 10;
      
      let userId = undefined;
      let sessionId = undefined;
      
      // Use user ID for authenticated users
      if (req.isAuthenticated()) {
        userId = (req.user as any).id;
      } else {
        // Use session ID for non-authenticated users
        sessionId = req.sessionID;
      }
      
      const recommendations = await storage.getRecommendedProducts(userId, sessionId, limitNum);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching recommendations" });
    }
  });

  // Get similar products
  app.get("/api/products/:id/similar", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : 4;
      
      const similarProducts = await storage.getSimilarProducts(productId, limitNum);
      res.json(similarProducts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching similar products" });
    }
  });

  // Get frequently bought together products
  app.get("/api/products/:id/frequently-bought-together", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : 4;
      
      const products = await storage.getFrequentlyBoughtTogether(productId, limitNum);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching frequently bought together products" });
    }
  });

  // 3D MODELS ROUTES

  // Get a product 3D model
  app.get("/api/products/:id/model", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const model = await storage.getProductModelByProduct(productId);
      
      if (!model) {
        return res.status(404).json({ message: "3D model not found for this product" });
      }
      
      res.json(model);
    } catch (error) {
      res.status(500).json({ message: "Error fetching 3D model" });
    }
  });

  // Create or update a product 3D model (admin only)
  app.post("/api/products/:id/model", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const productId = parseInt(req.params.id);
      const modelData = insertProductModelSchema.omit({ productId: true }).parse(req.body);
      
      // Check if model already exists
      const existingModel = await storage.getProductModelByProduct(productId);
      
      if (existingModel) {
        // Update existing model
        const updatedModel = await storage.updateProductModel(existingModel.id, modelData);
        return res.json(updatedModel);
      } else {
        // Create new model
        const newModel = await storage.createProductModel({
          ...modelData,
          productId
        });
        return res.status(201).json(newModel);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error updating 3D model" });
    }
  });

  // SHOE MEASUREMENTS ROUTES

  // Get shoe measurements for a product
  app.get("/api/products/:id/measurements", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { size } = req.query;
      
      const measurements = await storage.getShoeMeasurements(
        productId,
        size ? size as string : undefined
      );
      
      res.json(measurements);
    } catch (error) {
      res.status(500).json({ message: "Error fetching shoe measurements" });
    }
  });

  // Add or update shoe measurements (admin only)
  app.post("/api/products/:id/measurements", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      if ((req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const productId = parseInt(req.params.id);
      const measurementData = insertShoeMeasurementSchema.omit({ productId: true }).parse(req.body);
      
      // Check if measurement for this size already exists
      const existingMeasurements = await storage.getShoeMeasurements(productId, measurementData.size);
      
      if (existingMeasurements.length > 0) {
        // Update existing measurement
        const updatedMeasurement = await storage.updateShoeMeasurement(
          existingMeasurements[0].id,
          measurementData
        );
        return res.json(updatedMeasurement);
      } else {
        // Create new measurement
        const newMeasurement = await storage.createShoeMeasurement({
          ...measurementData,
          productId
        });
        return res.status(201).json(newMeasurement);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Error updating shoe measurements" });
    }
  });

  // ADMIN ROUTES

  // Check if user is admin
  app.get("/api/admin/status", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const adminUser = await storage.getAdminUser(userId);
      
      if (!adminUser) {
        return res.status(403).json({ isAdmin: false });
      }
      
      // Update last login
      await storage.updateAdminLastLogin(userId);
      
      res.json({
        isAdmin: true,
        permissions: adminUser.permissions,
        lastLogin: adminUser.lastLogin
      });
    } catch (error) {
      res.status(500).json({ message: "Error checking admin status" });
    }
  });

  // Get site statistics (admin only)
  app.get("/api/admin/stats", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      const userId = (req.user as any).id;
      const adminUser = await storage.getAdminUser(userId);
      
      if (!adminUser) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get basic statistics
      const totalProducts = await storage.countProducts();
      const totalCategories = (await storage.getCategories()).length;
      
      // Get recent orders (simplified)
      const recentOrders = await storage.getOrders();
      
      // Calculate total sales, order count, etc.
      const totalSales = recentOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
      const orderCount = recentOrders.length;
      
      res.json({
        totalProducts,
        totalCategories,
        totalSales,
        orderCount
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching admin statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
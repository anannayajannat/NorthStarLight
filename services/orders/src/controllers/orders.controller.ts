import { Request, Response } from 'express';
import { db } from '../db';
import axios from 'axios';
import { 
  orders, 
  orderItems,
  orderHistory,
  shippingDetails,
  billingDetails,
  payments,
  InsertOrder,
  InsertOrderItem,
  InsertShippingDetail,
  InsertBillingDetail,
  InsertPayment,
  InsertOrderHistoryEntry
} from '../schema';
import { eq, and, desc, sql, or, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Service URLs
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:5002';
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:5003';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
  sessionId?: string;
}

// Validation schemas
const createOrderSchema = z.object({
  cartId: z.number().int().positive(),
  paymentMethod: z.string().min(1),
  paymentProvider: z.string().min(1),
  shipping: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email(),
    shippingMethod: z.string().min(1)
  }),
  billing: z.object({
    sameAsShipping: z.boolean().optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    address1: z.string().min(1).optional(),
    address2: z.string().optional(),
    city: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    postalCode: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional()
  }),
  notes: z.string().optional()
});

/**
 * Get all orders
 * Admin users can see all orders, regular users only see their own
 */
export async function getOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let query = db.select()
      .from(orders);
    
    // Non-admin users can only see their own orders
    if (req.user?.role !== 'admin') {
      query = query.where(eq(orders.userId, req.user?.userId || 0));
    } else {
      // Filter options for admins
      const status = req.query.status as string;
      if (status) {
        query = query.where(eq(orders.status, status));
      }
    }
    
    // Count total orders for pagination
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(orders);
    
    // Apply the same where conditions as the main query
    if (req.user?.role !== 'admin') {
      countQuery.where(eq(orders.userId, req.user?.userId || 0));
    } else if (req.query.status) {
      countQuery.where(eq(orders.status, req.query.status as string));
    }
    
    const [{ count }] = await countQuery;
    
    // Get orders with pagination
    const ordersList = await query
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
    
    return res.status(200).json({
      orders: ordersList,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get a specific order by ID
 */
export async function getOrderById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // Find the order
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(id)))
      .limit(1);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Regular users can only view their own orders
    if (req.user?.role !== 'admin' && order.userId !== req.user?.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get order items
    const orderItemsList = await db.select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    
    // Get shipping details
    const [shippingDetail] = await db.select()
      .from(shippingDetails)
      .where(eq(shippingDetails.orderId, order.id))
      .limit(1);
    
    // Get billing details
    const [billingDetail] = await db.select()
      .from(billingDetails)
      .where(eq(billingDetails.orderId, order.id))
      .limit(1);
    
    // Get payment information
    const [payment] = await db.select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .limit(1);
    
    // Get order history
    const historyEntries = await db.select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, order.id))
      .orderBy(desc(orderHistory.createdAt));
    
    return res.status(200).json({
      ...order,
      items: orderItemsList,
      shipping: shippingDetail,
      billing: billingDetail,
      payment: payment,
      history: historyEntries
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create a new order
 */
export async function createOrder(req: AuthenticatedRequest, res: Response) {
  try {
    // Validate request body
    const validatedData = createOrderSchema.parse(req.body);
    
    // Check for required user or session
    if (!req.user?.userId && !req.sessionId) {
      return res.status(400).json({ message: 'User ID or session ID is required' });
    }
    
    // Get cart from Cart service
    try {
      const cartResponse = await axios.get(`${CART_SERVICE_URL}/cart`, {
        headers: {
          Authorization: req.headers.authorization,
          'x-session-id': req.sessionId
        }
      });
      
      const cart = cartResponse.data;
      
      // Ensure cart has items
      if (!cart.items || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cannot create order with empty cart' });
      }
      
      // Create order record
      const orderData: InsertOrder = {
        userId: req.user?.userId || null,
        cartId: validatedData.cartId,
        sessionId: !req.user?.userId ? req.sessionId : null,
        status: 'pending',
        subtotal: cart.totals.subtotal,
        tax: cart.totals.tax,
        shipping: cart.totals.shipping,
        discount: cart.totals.discountAmount,
        total: cart.totals.total,
        couponCode: cart.discounts?.length > 0 ? cart.discounts[0].code : null,
        notes: validatedData.notes
      };
      
      // Insert order and get the ID
      const [order] = await db.insert(orders)
        .values(orderData)
        .returning();
      
      // Create order items
      const orderItemsData: InsertOrderItem[] = cart.items.map((item: any) => ({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: item.price,
        discountedPrice: item.discountedPrice || null,
        productName: item.product.name,
        productSku: item.product.sku || '',
        variantName: item.variant?.name || null,
        variantSku: item.variant?.sku || null,
        options: item.options || null
      }));
      
      // Insert all order items
      await db.insert(orderItems)
        .values(orderItemsData);
      
      // Create shipping details
      const shippingData: InsertShippingDetail = {
        orderId: order.id,
        ...validatedData.shipping
      };
      
      await db.insert(shippingDetails)
        .values(shippingData);
      
      // Create billing details (same as shipping or custom)
      let billingData: InsertBillingDetail;
      
      if (validatedData.billing.sameAsShipping) {
        billingData = {
          orderId: order.id,
          firstName: validatedData.shipping.firstName,
          lastName: validatedData.shipping.lastName,
          address1: validatedData.shipping.address1,
          address2: validatedData.shipping.address2,
          city: validatedData.shipping.city,
          state: validatedData.shipping.state,
          postalCode: validatedData.shipping.postalCode,
          country: validatedData.shipping.country,
          phone: validatedData.shipping.phone,
          email: validatedData.shipping.email
        };
      } else {
        // Ensure all billing fields are provided
        if (!validatedData.billing.firstName || 
            !validatedData.billing.lastName || 
            !validatedData.billing.address1 || 
            !validatedData.billing.city || 
            !validatedData.billing.state || 
            !validatedData.billing.postalCode || 
            !validatedData.billing.country || 
            !validatedData.billing.email) {
          return res.status(400).json({ message: 'All billing fields are required when not using same as shipping' });
        }
        
        billingData = {
          orderId: order.id,
          firstName: validatedData.billing.firstName,
          lastName: validatedData.billing.lastName,
          address1: validatedData.billing.address1,
          address2: validatedData.billing.address2,
          city: validatedData.billing.city,
          state: validatedData.billing.state,
          postalCode: validatedData.billing.postalCode,
          country: validatedData.billing.country,
          phone: validatedData.billing.phone,
          email: validatedData.billing.email
        };
      }
      
      await db.insert(billingDetails)
        .values(billingData);
      
      // Create payment record
      const paymentData: InsertPayment = {
        orderId: order.id,
        paymentMethod: validatedData.paymentMethod,
        paymentProvider: validatedData.paymentProvider,
        amount: order.total,
        currency: 'USD', // Default currency
        status: 'pending'
      };
      
      await db.insert(payments)
        .values(paymentData);
      
      // Add order history entry
      const historyEntry: InsertOrderHistoryEntry = {
        orderId: order.id,
        status: 'pending',
        note: 'Order created',
        changedBy: req.user?.userId || null
      };
      
      await db.insert(orderHistory)
        .values(historyEntry);
      
      // Clear the cart after order is created
      try {
        await axios.delete(`${CART_SERVICE_URL}/cart/items`, {
          headers: {
            Authorization: req.headers.authorization,
            'x-session-id': req.sessionId
          }
        });
      } catch (error) {
        console.error('Error clearing cart:', error);
        // Continue processing even if cart clear fails
      }
      
      // Update inventory (async)
      try {
        for (const item of orderItemsData) {
          if (item.variantId) {
            await axios.post(`${PRODUCTS_SERVICE_URL}/variants/${item.variantId}/inventory/decrease`, {
              quantity: item.quantity
            }, {
              headers: { Authorization: req.headers.authorization }
            });
          } else {
            await axios.post(`${PRODUCTS_SERVICE_URL}/products/${item.productId}/inventory/decrease`, {
              quantity: item.quantity
            }, {
              headers: { Authorization: req.headers.authorization }
            });
          }
        }
      } catch (error) {
        console.error('Error updating inventory:', error);
        // Log error but don't fail the order
      }
      
      return res.status(201).json({
        id: order.id,
        status: order.status,
        total: order.total,
        message: 'Order created successfully'
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        return res.status(404).json({ message: 'Cart not found' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating order:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    
    // Validate status
    if (!['pending', 'processing', 'completed', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }
    
    // Check if order exists
    const [existingOrder] = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(id)))
      .limit(1);
    
    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update order status
    const [updatedOrder] = await db.update(orders)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === 'completed' ? { completedAt: new Date() } : {}),
        ...(status === 'cancelled' ? { cancelledAt: new Date() } : {})
      })
      .where(eq(orders.id, parseInt(id)))
      .returning();
    
    // Add order history entry
    const historyEntry: InsertOrderHistoryEntry = {
      orderId: parseInt(id),
      status,
      note: note || `Order status updated to ${status}`,
      changedBy: req.user?.userId || null
    };
    
    await db.insert(orderHistory)
      .values(historyEntry);
    
    return res.status(200).json({
      id: updatedOrder.id,
      status: updatedOrder.status,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Cancel order
 */
export async function cancelOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Check if order exists
    const [existingOrder] = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(id)))
      .limit(1);
    
    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Only allow cancellation of orders that are in pending or processing state
    if (!['pending', 'processing'].includes(existingOrder.status)) {
      return res.status(400).json({ 
        message: 'Only pending or processing orders can be cancelled' 
      });
    }
    
    // Regular users can only cancel their own orders
    if (req.user?.role !== 'admin' && existingOrder.userId !== req.user?.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Update order status to cancelled
    const [updatedOrder] = await db.update(orders)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
        cancelledAt: new Date()
      })
      .where(eq(orders.id, parseInt(id)))
      .returning();
    
    // Add order history entry
    const historyEntry: InsertOrderHistoryEntry = {
      orderId: parseInt(id),
      status: 'cancelled',
      note: reason || 'Order cancelled',
      changedBy: req.user?.userId || null
    };
    
    await db.insert(orderHistory)
      .values(historyEntry);
    
    // Return inventory to stock (async)
    try {
      const orderItemsList = await db.select()
        .from(orderItems)
        .where(eq(orderItems.orderId, parseInt(id)));
      
      for (const item of orderItemsList) {
        if (item.variantId) {
          await axios.post(`${PRODUCTS_SERVICE_URL}/variants/${item.variantId}/inventory/increase`, {
            quantity: item.quantity
          }, {
            headers: { Authorization: req.headers.authorization }
          });
        } else {
          await axios.post(`${PRODUCTS_SERVICE_URL}/products/${item.productId}/inventory/increase`, {
            quantity: item.quantity
          }, {
            headers: { Authorization: req.headers.authorization }
          });
        }
      }
    } catch (error) {
      console.error('Error returning inventory:', error);
      // Log error but don't fail the cancellation
    }
    
    return res.status(200).json({
      id: updatedOrder.id,
      status: updatedOrder.status,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get order history
 */
export async function getOrderHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if order exists
    const [existingOrder] = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(id)))
      .limit(1);
    
    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Regular users can only view their own orders
    if (req.user?.role !== 'admin' && existingOrder.userId !== req.user?.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get order history
    const historyEntries = await db.select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, parseInt(id)))
      .orderBy(desc(orderHistory.createdAt));
    
    return res.status(200).json(historyEntries);
  } catch (error) {
    console.error('Error fetching order history:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get user orders
 */
export async function getUserOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Regular users can only view their own orders
    if (req.user?.role !== 'admin' && req.user?.userId !== parseInt(userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Count total orders for pagination
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.userId, parseInt(userId)));
    
    // Get orders with pagination
    const ordersList = await db.select()
      .from(orders)
      .where(eq(orders.userId, parseInt(userId)))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
    
    return res.status(200).json({
      orders: ordersList,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get order statistics for admin dashboard
 */
export async function getOrderStats(req: AuthenticatedRequest, res: Response) {
  try {
    // Only admin can access order stats
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get count by status
    const statusCounts = await db.select({
      status: orders.status,
      count: sql<number>`count(*)`
    })
    .from(orders)
    .groupBy(orders.status);
    
    // Get total revenue
    const [{ totalRevenue }] = await db.select({
      totalRevenue: sql<string>`sum(${orders.total})`
    })
    .from(orders)
    .where(eq(orders.status, 'completed'));
    
    // Get recent orders
    const recentOrders = await db.select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5);
    
    // Get daily order count for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyOrders = await db.select({
      date: sql<string>`date(${orders.createdAt})`,
      count: sql<number>`count(*)`
    })
    .from(orders)
    .where(sql`${orders.createdAt} >= ${thirtyDaysAgo}`)
    .groupBy(sql`date(${orders.createdAt})`)
    .orderBy(sql`date(${orders.createdAt})`);
    
    // Get daily revenue for the last 30 days
    const dailyRevenue = await db.select({
      date: sql<string>`date(${orders.createdAt})`,
      revenue: sql<string>`sum(${orders.total})`
    })
    .from(orders)
    .where(sql`${orders.createdAt} >= ${thirtyDaysAgo}`)
    .groupBy(sql`date(${orders.createdAt})`)
    .orderBy(sql`date(${orders.createdAt})`);
    
    return res.status(200).json({
      statusCounts,
      totalRevenue: parseFloat(totalRevenue || '0'),
      recentOrders,
      dailyOrders,
      dailyRevenue: dailyRevenue.map(day => ({
        date: day.date,
        revenue: parseFloat(day.revenue || '0')
      }))
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
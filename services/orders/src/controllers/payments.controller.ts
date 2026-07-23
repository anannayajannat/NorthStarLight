import { Request, Response } from 'express';
import { db } from '../db';
import { 
  payments, 
  orders,
  refunds,
  orderHistory,
  InsertRefund,
  InsertOrderHistoryEntry
} from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
}

// Validation schemas
const updatePaymentSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']),
  transactionId: z.string().optional(),
  paymentIntentId: z.string().optional(),
  paymentMethodDetails: z.record(z.any()).optional(),
  error: z.record(z.any()).optional()
});

const refundPaymentSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().optional(),
  transactionId: z.string().optional()
});

/**
 * Get payment details for an order
 */
export async function getOrderPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { orderId } = req.params;
    
    // Get order to check ownership
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(orderId)))
      .limit(1);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Regular users can only view their own orders' payments
    if (req.user?.role !== 'admin' && order.userId !== req.user?.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get payment details
    const [payment] = await db.select()
      .from(payments)
      .where(eq(payments.orderId, parseInt(orderId)))
      .limit(1);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found for this order' });
    }
    
    // Get refunds if any
    const refundsList = await db.select()
      .from(refunds)
      .where(eq(refunds.paymentId, payment.id))
      .orderBy(desc(refunds.createdAt));
    
    // Return payment with refunds
    return res.status(200).json({
      ...payment,
      refunds: refundsList
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update payment status
 * This would be called by payment webhook handlers or admin actions
 */
export async function updatePaymentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // Only admins can update payment status
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Validate request body
    const validatedData = updatePaymentSchema.parse(req.body);
    
    // Check if payment exists
    const [existingPayment] = await db.select()
      .from(payments)
      .where(eq(payments.id, parseInt(id)))
      .limit(1);
    
    if (!existingPayment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Get the order
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, existingPayment.orderId))
      .limit(1);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update payment
    const [updatedPayment] = await db.update(payments)
      .set({
        status: validatedData.status,
        transactionId: validatedData.transactionId || existingPayment.transactionId,
        paymentIntentId: validatedData.paymentIntentId || existingPayment.paymentIntentId,
        paymentMethodDetails: validatedData.paymentMethodDetails || existingPayment.paymentMethodDetails,
        error: validatedData.error || existingPayment.error,
        paidAt: validatedData.status === 'completed' ? new Date() : existingPayment.paidAt,
        updatedAt: new Date()
      })
      .where(eq(payments.id, parseInt(id)))
      .returning();
    
    // If payment is completed, update order status to processing
    if (validatedData.status === 'completed' && order.status === 'pending') {
      await db.update(orders)
        .set({
          status: 'processing',
          updatedAt: new Date()
        })
        .where(eq(orders.id, order.id));
      
      // Add order history entry
      const historyEntry: InsertOrderHistoryEntry = {
        orderId: order.id,
        status: 'processing',
        note: 'Payment received, order processing',
        changedBy: req.user?.userId || null
      };
      
      await db.insert(orderHistory)
        .values(historyEntry);
    }
    
    // If payment failed, update order status to payment_failed
    if (validatedData.status === 'failed' && order.status === 'pending') {
      await db.update(orders)
        .set({
          status: 'payment_failed',
          updatedAt: new Date()
        })
        .where(eq(orders.id, order.id));
      
      // Add order history entry
      const historyEntry: InsertOrderHistoryEntry = {
        orderId: order.id,
        status: 'payment_failed',
        note: 'Payment failed',
        changedBy: req.user?.userId || null
      };
      
      await db.insert(orderHistory)
        .values(historyEntry);
    }
    
    return res.status(200).json({
      id: updatedPayment.id,
      status: updatedPayment.status,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Process a refund
 */
export async function refundPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // Only admins can process refunds
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Validate request body
    const validatedData = refundPaymentSchema.parse(req.body);
    
    // Check if payment exists
    const [existingPayment] = await db.select()
      .from(payments)
      .where(eq(payments.id, parseInt(id)))
      .limit(1);
    
    if (!existingPayment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Check if payment was completed
    if (existingPayment.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed payments can be refunded' });
    }
    
    // Check if refund amount is valid
    const currentRefundedAmount = existingPayment.refundedAmount || 0;
    const newTotalRefunded = parseFloat(currentRefundedAmount.toString()) + validatedData.amount;
    
    if (newTotalRefunded > parseFloat(existingPayment.amount.toString())) {
      return res.status(400).json({ 
        message: 'Refund amount cannot exceed the original payment amount' 
      });
    }
    
    // Get the order
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, existingPayment.orderId))
      .limit(1);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Create refund record
    const refundData: InsertRefund = {
      orderId: order.id,
      paymentId: existingPayment.id,
      amount: validatedData.amount,
      reason: validatedData.reason || 'Customer requested refund',
      status: 'pending',
      transactionId: validatedData.transactionId,
      refundedBy: req.user?.userId || null
    };
    
    const [refund] = await db.insert(refunds)
      .values(refundData)
      .returning();
    
    // Update payment with refunded amount
    await db.update(payments)
      .set({
        refundedAmount: newTotalRefunded,
        status: newTotalRefunded === parseFloat(existingPayment.amount.toString()) ? 'refunded' : 'completed',
        updatedAt: new Date()
      })
      .where(eq(payments.id, parseInt(id)));
    
    // If full refund, update order status to refunded
    if (newTotalRefunded === parseFloat(existingPayment.amount.toString())) {
      await db.update(orders)
        .set({
          status: 'refunded',
          updatedAt: new Date()
        })
        .where(eq(orders.id, order.id));
      
      // Add order history entry
      const historyEntry: InsertOrderHistoryEntry = {
        orderId: order.id,
        status: 'refunded',
        note: validatedData.reason || 'Order fully refunded',
        changedBy: req.user?.userId || null
      };
      
      await db.insert(orderHistory)
        .values(historyEntry);
    } else {
      // Partial refund - add history entry
      const historyEntry: InsertOrderHistoryEntry = {
        orderId: order.id,
        status: order.status,
        note: `Partial refund processed: $${validatedData.amount}`,
        changedBy: req.user?.userId || null
      };
      
      await db.insert(orderHistory)
        .values(historyEntry);
    }
    
    return res.status(200).json({
      id: refund.id,
      orderId: order.id,
      amount: validatedData.amount,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Update refund status
 */
export async function updateRefundStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, transactionId } = req.body;
    
    // Only admins can update refund status
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Validate status
    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid refund status' });
    }
    
    // Check if refund exists
    const [existingRefund] = await db.select()
      .from(refunds)
      .where(eq(refunds.id, parseInt(id)))
      .limit(1);
    
    if (!existingRefund) {
      return res.status(404).json({ message: 'Refund not found' });
    }
    
    // Update refund
    const [updatedRefund] = await db.update(refunds)
      .set({
        status,
        transactionId: transactionId || existingRefund.transactionId,
        updatedAt: new Date()
      })
      .where(eq(refunds.id, parseInt(id)))
      .returning();
    
    // If refund failed, adjust the refunded amount in payment
    if (status === 'failed') {
      const [payment] = await db.select()
        .from(payments)
        .where(eq(payments.id, existingRefund.paymentId))
        .limit(1);
      
      if (payment) {
        const currentRefundedAmount = payment.refundedAmount || 0;
        const newRefundedAmount = parseFloat(currentRefundedAmount.toString()) - parseFloat(existingRefund.amount.toString());
        
        await db.update(payments)
          .set({
            refundedAmount: Math.max(0, newRefundedAmount),
            status: 'completed', // Revert to completed since refund failed
            updatedAt: new Date()
          })
          .where(eq(payments.id, existingRefund.paymentId));
        
        // Update order history
        const historyEntry: InsertOrderHistoryEntry = {
          orderId: existingRefund.orderId,
          status: 'processing', // Assume back to processing
          note: `Refund failed: $${existingRefund.amount}`,
          changedBy: req.user?.userId || null
        };
        
        await db.insert(orderHistory)
          .values(historyEntry);
      }
    }
    
    return res.status(200).json({
      id: updatedRefund.id,
      status: updatedRefund.status,
      message: 'Refund status updated successfully'
    });
  } catch (error) {
    console.error('Error updating refund status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
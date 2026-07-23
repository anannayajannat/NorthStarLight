import express from 'express';

import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderHistory,
  getUserOrders,
  getOrderStats
} from './controllers/orders.controller';

import {
  getOrderPayment,
  updatePaymentStatus,
  refundPayment,
  updateRefundStatus
} from './controllers/payments.controller';

import { 
  authenticate, 
  optionalAuthenticate, 
  authorize,
  checkOrderOwnership
} from './middlewares/auth.middleware';

const router = express.Router();


// Order routes
router.get('/orders', authenticate, getOrders);
router.get('/orders/stats', authenticate, authorize('admin'), getOrderStats);
router.get('/orders/:id', authenticate, getOrderById);
router.get('/orders/:id/history', authenticate, getOrderHistory);
router.post('/orders', optionalAuthenticate, createOrder);
router.patch('/orders/:id/status', authenticate, authorize('admin'), updateOrderStatus);
router.post('/orders/:id/cancel', authenticate, checkOrderOwnership, cancelOrder);
router.get('/users/:userId/orders', authenticate, getUserOrders);

// Payment routes
router.get('/orders/:orderId/payment', authenticate, getOrderPayment);
router.patch('/payments/:id', authenticate, authorize('admin'), updatePaymentStatus);
router.post('/payments/:id/refund', authenticate, authorize('admin'), refundPayment);
router.patch('/refunds/:id', authenticate, authorize('admin'), updateRefundStatus);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'orders-service' });
});

export default router;
import express from 'express';
import {
  getCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  applyDiscount,
  removeDiscount,
  mergeGuestCart
} from './controllers/cart.controller';
import { authenticate, authorize } from './middlewares/auth.middleware';

const router = express.Router();

// Public cart routes - these work with both logged in users and guests
router.get('/cart', authenticate, getCart);
router.post('/cart/items', authenticate, addCartItem);
router.put('/cart/items/:id', authenticate, updateCartItemQuantity);
router.delete('/cart/items/:id', authenticate, removeCartItem);
router.delete('/cart/items', authenticate, clearCart);
router.post('/cart/discount', authenticate, applyDiscount);
router.delete('/cart/discount/:code', authenticate, removeDiscount);

// Route to merge a guest cart with a user cart after login
router.post('/cart/merge', authenticate, mergeGuestCart);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'cart-service' });
});

export default router;
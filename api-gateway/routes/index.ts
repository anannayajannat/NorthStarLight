import express from 'express';
import authRoutes from './auth';
import productRoutes from './products';
import cartRoutes from './cart';
import orderRoutes from './orders';
import userRoutes from './users';

const router = express.Router();

// Health check for API gateway
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Gateway is working' });
});

// Mount service routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);

export default router;
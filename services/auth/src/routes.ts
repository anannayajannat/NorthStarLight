import express from 'express';
import { 
  register, 
  login, 
  refreshToken, 
  logout, 
  getCurrentUser,
  requestPasswordReset,
  resetPassword
} from './controllers/auth.controller';
import { authenticate } from './middlewares/auth.middleware';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

export default router;
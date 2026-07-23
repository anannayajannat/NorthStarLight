import express from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:5002';

// Get cart by session ID or user ID
router.get('/', async (req, res) => {
  try {
    const headers: any = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    if (req.cookies && req.cookies.sessionId) {
      headers['X-Session-ID'] = req.cookies.sessionId;
    }
    
    const response = await axios.get(`${CART_SERVICE_URL}/cart`, { 
      headers,
      params: req.query
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Cart service error' });
  }
});

// Add item to cart
router.post('/items', async (req, res) => {
  try {
    const headers: any = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    if (req.cookies && req.cookies.sessionId) {
      headers['X-Session-ID'] = req.cookies.sessionId;
    }
    
    const response = await axios.post(`${CART_SERVICE_URL}/cart/items`, req.body, { headers });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Cart service error' });
  }
});

// Update cart item quantity
router.patch('/items/:id', async (req, res) => {
  try {
    const headers: any = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    if (req.cookies && req.cookies.sessionId) {
      headers['X-Session-ID'] = req.cookies.sessionId;
    }
    
    const response = await axios.patch(`${CART_SERVICE_URL}/cart/items/${req.params.id}`, req.body, { headers });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Cart service error' });
  }
});

// Remove item from cart
router.delete('/items/:id', async (req, res) => {
  try {
    const headers: any = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    if (req.cookies && req.cookies.sessionId) {
      headers['X-Session-ID'] = req.cookies.sessionId;
    }
    
    const response = await axios.delete(`${CART_SERVICE_URL}/cart/items/${req.params.id}`, { headers });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Cart service error' });
  }
});

// Clear cart
router.delete('/', async (req, res) => {
  try {
    const headers: any = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    if (req.cookies && req.cookies.sessionId) {
      headers['X-Session-ID'] = req.cookies.sessionId;
    }
    
    const response = await axios.delete(`${CART_SERVICE_URL}/cart`, { headers });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Cart service error' });
  }
});

// Merge guest cart with user cart (after login)
router.post('/merge', authenticate, async (req, res) => {
  try {
    const headers: any = { Authorization: req.headers.authorization };
    if (req.cookies && req.cookies.sessionId) {
      headers['X-Session-ID'] = req.cookies.sessionId;
    }
    
    const response = await axios.post(`${CART_SERVICE_URL}/cart/merge`, req.body, { headers });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Cart service error' });
  }
});

export default router;
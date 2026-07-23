import express from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:5004';

// Get all orders for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${ORDERS_SERVICE_URL}/orders`, {
      headers: { Authorization: req.headers.authorization },
      params: req.query
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Orders service error' });
  }
});

// Get a specific order by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${ORDERS_SERVICE_URL}/orders/${req.params.id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Orders service error' });
  }
});

// Create a new order
router.post('/', authenticate, async (req, res) => {
  try {
    const response = await axios.post(`${ORDERS_SERVICE_URL}/orders`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Orders service error' });
  }
});

// Update an order status (admin only)
router.patch('/:id/status', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const response = await axios.patch(`${ORDERS_SERVICE_URL}/orders/${req.params.id}/status`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Orders service error' });
  }
});

// Cancel an order
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const response = await axios.post(`${ORDERS_SERVICE_URL}/orders/${req.params.id}/cancel`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Orders service error' });
  }
});

// Get order items
router.get('/:id/items', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${ORDERS_SERVICE_URL}/orders/${req.params.id}/items`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Orders service error' });
  }
});

// Process payment for an order
router.post('/:id/payments', authenticate, async (req, res) => {
  try {
    const response = await axios.post(`${ORDERS_SERVICE_URL}/orders/${req.params.id}/payments`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Orders service error' });
  }
});

// Get payment information for an order
router.get('/:id/payments', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${ORDERS_SERVICE_URL}/orders/${req.params.id}/payments`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Orders service error' });
  }
});

// Admin routes for managing all orders
router.get('/admin/all', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const response = await axios.get(`${ORDERS_SERVICE_URL}/admin/orders`, {
      headers: { Authorization: req.headers.authorization },
      params: req.query
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Orders service error' });
  }
});

// Get order statistics for admin dashboard
router.get('/admin/statistics', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const response = await axios.get(`${ORDERS_SERVICE_URL}/admin/statistics`, {
      headers: { Authorization: req.headers.authorization },
      params: req.query
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Orders service error' });
  }
});

export default router;
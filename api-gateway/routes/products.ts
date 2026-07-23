import express from 'express';
import axios from 'axios';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:5003';

// Public routes
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCTS_SERVICE_URL}/products`, { params: req.query });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.get('/best-sellers', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCTS_SERVICE_URL}/products/best-sellers`, { params: req.query });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.get('/new-arrivals', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCTS_SERVICE_URL}/products/new-arrivals`, { params: req.query });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.get('/on-sale', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCTS_SERVICE_URL}/products/on-sale`, { params: req.query });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCTS_SERVICE_URL}/products/${req.params.id}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.get('/:id/similar', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCTS_SERVICE_URL}/products/${req.params.id}/similar`, { params: req.query });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.get('/:id/frequently-bought-together', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCTS_SERVICE_URL}/products/${req.params.id}/frequently-bought-together`, { params: req.query });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

// Admin routes that require authentication and authorization
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const response = await axios.post(`${PRODUCTS_SERVICE_URL}/products`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const response = await axios.put(`${PRODUCTS_SERVICE_URL}/products/${req.params.id}`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const response = await axios.delete(`${PRODUCTS_SERVICE_URL}/products/${req.params.id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

// Categories routes
router.get('/categories', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCTS_SERVICE_URL}/categories`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.get('/categories/:id', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCTS_SERVICE_URL}/categories/${req.params.id}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.post('/categories', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const response = await axios.post(`${PRODUCTS_SERVICE_URL}/categories`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.put('/categories/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const response = await axios.put(`${PRODUCTS_SERVICE_URL}/categories/${req.params.id}`, req.body, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

router.delete('/categories/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const response = await axios.delete(`${PRODUCTS_SERVICE_URL}/categories/${req.params.id}`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Products service error' });
  }
});

export default router;
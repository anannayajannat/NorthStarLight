import express from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

// Proxy requests to Auth service
router.post('/login', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/login`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Auth service error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/register`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Auth service error' });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/refresh-token`, req.body);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Auth service error' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/logout`, {}, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Auth service error' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
      headers: { Authorization: req.headers.authorization }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { message: 'Auth service error' });
  }
});

export default router;
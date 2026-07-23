import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { proxyRequest } from '../utils/proxy';

const router = express.Router();
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:5005';

/**
 * Proxy all user profile related requests to User Profile Service
 */

// Profile routes
router.get('/users/:userId/profile', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/profile`);
});

router.post('/users/:userId/profile', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/profile`);
});

router.delete('/users/:userId/profile', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/profile`);
});

// Address routes
router.get('/users/:userId/addresses', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/addresses`);
});

router.post('/users/:userId/addresses', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/addresses`);
});

router.put('/users/:userId/addresses/:addressId', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/addresses/${req.params.addressId}`);
});

router.delete('/users/:userId/addresses/:addressId', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/addresses/${req.params.addressId}`);
});

// Preferences routes
router.get('/users/:userId/preferences', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/preferences`);
});

router.put('/users/:userId/preferences', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/preferences`);
});

// Wishlist routes
router.get('/users/:userId/wishlists', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/wishlists`);
});

router.get('/users/:userId/wishlists/:wishlistId', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/wishlists/${req.params.wishlistId}`);
});

router.post('/users/:userId/wishlists', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/wishlists`);
});

router.put('/users/:userId/wishlists/:wishlistId', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/wishlists/${req.params.wishlistId}`);
});

router.delete('/users/:userId/wishlists/:wishlistId', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/wishlists/${req.params.wishlistId}`);
});

router.post('/users/:userId/wishlists/:wishlistId/items', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/wishlists/${req.params.wishlistId}/items`);
});

router.delete('/users/:userId/wishlists/:wishlistId/items/:itemId', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/wishlists/${req.params.wishlistId}/items/${req.params.itemId}`);
});

router.get('/users/:userId/wishlists/check-product', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/wishlists/check-product`);
});

// Measurements routes
router.get('/users/:userId/measurements', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/measurements`);
});

router.post('/users/:userId/measurements', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/measurements`);
});

router.put('/users/:userId/measurements/:measurementId', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/measurements/${req.params.measurementId}`);
});

router.delete('/users/:userId/measurements/:measurementId', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/measurements/${req.params.measurementId}`);
});

// Size preferences routes
router.get('/users/:userId/size-preferences', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/size-preferences`);
});

router.post('/users/:userId/size-preferences', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/size-preferences`);
});

router.put('/users/:userId/size-preferences/:preferenceId', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/size-preferences/${req.params.preferenceId}`);
});

router.delete('/users/:userId/size-preferences/:preferenceId', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/size-preferences/${req.params.preferenceId}`);
});

// Rewards routes
router.get('/users/:userId/rewards', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/rewards`);
});

router.get('/users/:userId/rewards/transactions', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/rewards/transactions`);
});

// Admin-only route for rewards management
router.post('/users/:userId/rewards/points', (req: Request, res: Response, next: NextFunction) => {
  proxyRequest(req, res, `${USERS_SERVICE_URL}/users/${req.params.userId}/rewards/points`);
});

export default router;
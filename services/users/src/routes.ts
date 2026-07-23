import express from 'express';
import {
  getUserProfile,
  createOrUpdateProfile,
  getUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getUserPreferences,
  updateUserPreferences,
  deleteUserProfile
} from './controllers/profile.controller';

import {
  getUserWishlists,
  getWishlist,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  addItemToWishlist,
  removeItemFromWishlist,
  checkProductInWishlists
} from './controllers/wishlist.controller';

import {
  getUserMeasurements,
  createUserMeasurement,
  updateUserMeasurement,
  deleteUserMeasurement,
  getUserSizePreferences,
  createUserSizePreference,
  updateUserSizePreference,
  deleteUserSizePreference
} from './controllers/measurements.controller';

import {
  getUserRewards,
  getUserRewardTransactions,
  addUserRewardPoints,
  calculateOrderPoints
} from './controllers/rewards.controller';

import { 
  authenticate, 
  authorize,
  checkUserOwnership
} from './middlewares/auth.middleware';

const router = express.Router();

// Profile routes
router.get('/users/:userId/profile', authenticate, checkUserOwnership, getUserProfile);
router.post('/users/:userId/profile', authenticate, checkUserOwnership, createOrUpdateProfile);
router.delete('/users/:userId/profile', authenticate, checkUserOwnership, deleteUserProfile);

// Address routes
router.get('/users/:userId/addresses', authenticate, checkUserOwnership, getUserAddresses);
router.post('/users/:userId/addresses', authenticate, checkUserOwnership, createUserAddress);
router.put('/users/:userId/addresses/:addressId', authenticate, checkUserOwnership, updateUserAddress);
router.delete('/users/:userId/addresses/:addressId', authenticate, checkUserOwnership, deleteUserAddress);

// Preferences routes
router.get('/users/:userId/preferences', authenticate, checkUserOwnership, getUserPreferences);
router.put('/users/:userId/preferences', authenticate, checkUserOwnership, updateUserPreferences);

// Wishlist routes
router.get('/users/:userId/wishlists', authenticate, checkUserOwnership, getUserWishlists);
router.get('/users/:userId/wishlists/:wishlistId', authenticate, checkUserOwnership, getWishlist);
router.post('/users/:userId/wishlists', authenticate, checkUserOwnership, createWishlist);
router.put('/users/:userId/wishlists/:wishlistId', authenticate, checkUserOwnership, updateWishlist);
router.delete('/users/:userId/wishlists/:wishlistId', authenticate, checkUserOwnership, deleteWishlist);
router.post('/users/:userId/wishlists/:wishlistId/items', authenticate, checkUserOwnership, addItemToWishlist);
router.delete('/users/:userId/wishlists/:wishlistId/items/:itemId', authenticate, checkUserOwnership, removeItemFromWishlist);
router.get('/users/:userId/wishlists/check-product', authenticate, checkUserOwnership, checkProductInWishlists);

// Measurements routes
router.get('/users/:userId/measurements', authenticate, checkUserOwnership, getUserMeasurements);
router.post('/users/:userId/measurements', authenticate, checkUserOwnership, createUserMeasurement);
router.put('/users/:userId/measurements/:measurementId', authenticate, checkUserOwnership, updateUserMeasurement);
router.delete('/users/:userId/measurements/:measurementId', authenticate, checkUserOwnership, deleteUserMeasurement);

// Size preferences routes
router.get('/users/:userId/size-preferences', authenticate, checkUserOwnership, getUserSizePreferences);
router.post('/users/:userId/size-preferences', authenticate, checkUserOwnership, createUserSizePreference);
router.put('/users/:userId/size-preferences/:preferenceId', authenticate, checkUserOwnership, updateUserSizePreference);
router.delete('/users/:userId/size-preferences/:preferenceId', authenticate, checkUserOwnership, deleteUserSizePreference);

// Rewards routes
router.get('/users/:userId/rewards', authenticate, checkUserOwnership, getUserRewards);
router.get('/users/:userId/rewards/transactions', authenticate, checkUserOwnership, getUserRewardTransactions);
router.post('/users/:userId/rewards/points', authenticate, authorize('admin'), addUserRewardPoints);
router.post('/calculate-order-points', calculateOrderPoints); // Internal API for services

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'users-service' });
});

export default router;
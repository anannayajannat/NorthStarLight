import express from 'express';

import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getBestSellingProducts,
  getNewArrivals,
  getOnSaleProducts,
  getSimilarProducts,
  getFrequentlyBoughtTogether,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant
} from './controllers/products.controller';

import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from './controllers/categories.controller';

import {
  getProductModels,
  getProductModel,
  createProductModel,
  updateProductModel,
  deleteProductModel
} from './controllers/models.controller';

import {
  getShoeMeasurements,
  getShoeMeasurement,
  createShoeMeasurement,
  updateShoeMeasurement,
  deleteShoeMeasurement,
  predictShoeSize
} from './controllers/measurements.controller';

import { authenticate, authorize } from './middlewares/auth.middleware';

const router = express.Router();

// Product routes
router.get('/products', getProducts);
router.get('/products/best-sellers', getBestSellingProducts);
router.get('/products/new-arrivals', getNewArrivals);
router.get('/products/on-sale', getOnSaleProducts);
router.get('/products/:id', getProductById);
router.get('/products/:id/similar', getSimilarProducts);
router.get('/products/:id/frequently-bought-together', getFrequentlyBoughtTogether);

// Protected product routes
router.post('/products', authenticate, authorize(['admin']), createProduct);
router.put('/products/:id', authenticate, authorize(['admin']), updateProduct);
router.delete('/products/:id', authenticate, authorize(['admin']), deleteProduct);

// Product variant routes
router.post('/products/:productId/variants', authenticate, authorize(['admin']), createProductVariant);
router.put('/products/:productId/variants/:variantId', authenticate, authorize(['admin']), updateProductVariant);
router.delete('/products/:productId/variants/:variantId', authenticate, authorize(['admin']), deleteProductVariant);

// Category routes
router.get('/categories', getCategories);
router.get('/categories/:id', getCategoryById);
router.post('/categories', authenticate, authorize(['admin']), createCategory);
router.put('/categories/:id', authenticate, authorize(['admin']), updateCategory);
router.delete('/categories/:id', authenticate, authorize(['admin']), deleteCategory);

// 3D model routes
router.get('/products/:productId/models', getProductModels);
router.get('/models/:id', getProductModel);
router.post('/products/:productId/models', authenticate, authorize(['admin']), createProductModel);
router.put('/models/:id', authenticate, authorize(['admin']), updateProductModel);
router.delete('/models/:id', authenticate, authorize(['admin']), deleteProductModel);

// Shoe measurements routes
router.get('/products/:productId/measurements', getShoeMeasurements);
router.get('/measurements/:id', getShoeMeasurement);
router.post('/products/:productId/measurements', authenticate, authorize(['admin']), createShoeMeasurement);
router.put('/measurements/:id', authenticate, authorize(['admin']), updateShoeMeasurement);
router.delete('/measurements/:id', authenticate, authorize(['admin']), deleteShoeMeasurement);
router.post('/products/:productId/predict-size', predictShoeSize);

export default router;
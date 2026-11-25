
const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireAdmin
} = require('../middleware/authMiddleware');

const uploadProductImages = require('../middleware/uploadMiddleware');

const {
  listProducts,
  getPublicProduct,
  listAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

// ======================================
// PUBLIC WEBSITE ROUTES
// ======================================

// Get all published products
router.get('/', listProducts);

// ======================================
// ADMIN ROUTES
// Keep these BEFORE /:identifier
// ======================================

// Get all products for admin app
router.get(
  '/admin/all',
  requireAuth,
  requireAdmin,
  listAdminProducts
);

// Create product
router.post(
  '/admin',
  requireAuth,
  requireAdmin,
  uploadProductImages,
  createProduct
);

// Update product
router.patch(
  '/admin/:id',
  requireAuth,
  requireAdmin,
  uploadProductImages,
  updateProduct
);

// Delete product
router.delete(
  '/admin/:id',
  requireAuth,
  requireAdmin,
  deleteProduct
);

// ======================================
// PUBLIC PRODUCT DETAILS
// Keep this route LAST
// ======================================

// Get product by ID, slug, or identifier
router.get('/:identifier', getPublicProduct);

module.exports = router;

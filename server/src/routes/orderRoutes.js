
const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireAdmin
} = require('../middleware/authMiddleware');

const {
  checkout,
  listMyOrders,
  getMyOrder,
  listAllOrders,
  getAdminOrder,
  updateOrderStatus,
  deleteCancelledOrders
} = require('../controllers/orderController');

// ==========================================
// CUSTOMER ROUTES
// ==========================================

// Place an order
router.post('/checkout', requireAuth, checkout);

// Get logged-in customer's orders
router.get('/my', requireAuth, listMyOrders);

// Get one customer order
router.get('/my/:id', requireAuth, getMyOrder);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get all orders with their items
router.get(
  '/admin/all',
  requireAuth,
  requireAdmin,
  listAllOrders
);

// Permanently delete selected cancelled orders
router.delete(
  '/admin/cancelled/bulk',
  requireAuth,
  requireAdmin,
  deleteCancelledOrders
);

// Get one order with its items
router.get(
  '/admin/:id',
  requireAuth,
  requireAdmin,
  getAdminOrder
);

// Update order status
router.patch(
  '/admin/:id/status',
  requireAuth,
  requireAdmin,
  updateOrderStatus
);

module.exports = router;

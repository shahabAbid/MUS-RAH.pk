
const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireAdmin
} = require('../middleware/authMiddleware');

const {
  listPublicCategories,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

// Public website
router.get('/', listPublicCategories);

// Admin management
router.get('/admin/all', requireAuth, requireAdmin, listAdminCategories);
router.post('/admin', requireAuth, requireAdmin, createCategory);
router.patch('/admin/:id', requireAuth, requireAdmin, updateCategory);
router.delete('/admin/:id', requireAuth, requireAdmin, deleteCategory);

module.exports = router;

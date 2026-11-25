
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} = require('../controllers/cartController');

router.use(requireAuth);

router.get('/', getCart);
router.post('/items', addToCart);
router.patch('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeCartItem);
router.delete('/', clearCart);

module.exports = router;

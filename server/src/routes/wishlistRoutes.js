
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');

const {
  listWishlist,
  addToWishlist,
  removeFromWishlist
} = require('../controllers/wishlistController');

router.use(requireAuth);

router.get('/', listWishlist);
router.post('/', addToWishlist);
router.delete('/:productId', removeFromWishlist);

module.exports = router;

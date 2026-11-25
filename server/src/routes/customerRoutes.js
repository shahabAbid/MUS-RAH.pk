
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/authMiddleware');

const {
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress
} = require('../controllers/customerController');

// Customer profile
router.get('/profile', requireAuth, getProfile);
router.patch('/profile', requireAuth, updateProfile);

// Customer addresses
router.get('/addresses', requireAuth, listAddresses);
router.post('/addresses', requireAuth, createAddress);
router.patch('/addresses/:addressId', requireAuth, updateAddress);
router.patch('/addresses/:addressId/default', requireAuth, setDefaultAddress);
router.delete('/addresses/:addressId', requireAuth, deleteAddress);

module.exports = router;

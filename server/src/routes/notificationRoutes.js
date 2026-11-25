
const express = require('express');
const router = express.Router();

const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const {
  sendAdminNotification,
} = require('../services/notificationService');

router.post('/test', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await sendAdminNotification({
      adminId: req.user.id,
      title: 'MUSEHRANotifications',
      message: 'Your backend is successfully connected to OneSignal!',
      type: 'test',
    });

    res.json({
      success: true,
      message: 'Test notification request sent.',
      notificationId: result.id || null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

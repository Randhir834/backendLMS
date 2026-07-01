const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getRazorpayKey,
  createOrder,
  verifyPayment,
  handlePaymentFailure,
  getPayments,
  getPaymentById,
  getAllPaymentsAdmin,
  getPaymentStatsAdmin,
} = require('../controllers/paymentController');

// Public route - Get Razorpay Key ID
router.get('/razorpay-key', authenticate, getRazorpayKey);

// Student routes
router.post('/create-order', authenticate, createOrder);
router.post('/verify', authenticate, verifyPayment);
router.post('/failure', authenticate, handlePaymentFailure);
router.get('/', authenticate, getPayments);
router.get('/:id', authenticate, getPaymentById);

// Admin routes
router.get('/admin/all', authenticate, authorizeRoles('admin'), getAllPaymentsAdmin);
router.get('/admin/stats', authenticate, authorizeRoles('admin'), getPaymentStatsAdmin);

module.exports = router;

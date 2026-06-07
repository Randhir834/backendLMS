const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createPayment,
  completePayment,
  getPayments,
  getPaymentById,
} = require('../controllers/paymentController');

router.post('/', authenticate, createPayment);
router.post('/complete', authenticate, completePayment);
router.get('/', authenticate, getPayments);
router.get('/:id', authenticate, getPaymentById);

module.exports = router;

const {
  createRazorpayOrder,
  verifyRazorpaySignature,
  createPaymentRecord,
  findPaymentsByUser,
  findPaymentById,
  updatePaymentStatus,
  findPaymentByOrderId,
  getAllPayments,
  getPaymentStats,
  hasUserPaidForCourse,
} = require('../services/paymentService');
const { createEnrollment, findEnrollmentByUserAndCourse } = require('../services/enrollmentService');
const { getRazorpayKeyId } = require('../config/razorpay');
const { query } = require('../config/database');

/**
 * Get Razorpay Key ID for frontend
 */
const getRazorpayKey = async (req, res, next) => {
  try {
    const keyId = getRazorpayKeyId();
    
    if (!keyId) {
      return res.status(500).json({ 
        error: 'Razorpay not configured. Please contact administrator.' 
      });
    }

    res.json({ key_id: keyId });
  } catch (error) {
    next(error);
  }
};

/**
 * Create payment order (Step 1: Before checkout)
 */
const createOrder = async (req, res, next) => {
  try {
    const { course_id, amount } = req.body;
    const user_id = req.user.id;

    // Validate input
    if (!course_id || !amount) {
      return res.status(400).json({ 
        error: 'Course ID and amount are required' 
      });
    }

    // Check if course exists
    const courseResult = await query(
      'SELECT id, title, price FROM courses WHERE id = $1',
      [course_id]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Verify amount matches course price
    if (parseFloat(amount) !== parseFloat(course.price)) {
      return res.status(400).json({ 
        error: 'Invalid amount. Amount does not match course price.' 
      });
    }

    // Check if user already paid for this course
    const alreadyPaid = await hasUserPaidForCourse(user_id, course_id);
    if (alreadyPaid) {
      return res.status(400).json({ 
        error: 'You have already purchased this course' 
      });
    }

    // Check if user is already enrolled (free course or manual enrollment)
    const existingEnrollment = await findEnrollmentByUserAndCourse(user_id, course_id);
    if (existingEnrollment) {
      return res.status(400).json({ 
        error: 'You are already enrolled in this course' 
      });
    }

    // Create Razorpay order
    const receipt = `rcpt_${user_id}_${course_id}_${Date.now()}`;
    const razorpayOrder = await createRazorpayOrder({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        user_id: user_id.toString(),
        course_id: course_id.toString(),
        course_title: course.title,
      },
    });

    // Create payment record in database
    const payment = await createPaymentRecord({
      user_id,
      course_id,
      enrollment_id: null, // Will be set after successful payment
      amount,
      currency: 'INR',
      razorpay_order_id: razorpayOrder.id,
    });

    res.status(201).json({ 
      message: 'Order created successfully',
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      payment_id: payment.id,
    });
  } catch (error) {
    console.error('[PaymentController] Error creating order:', error);
    next(error);
  }
};

/**
 * Verify payment and complete enrollment (Step 2: After successful payment)
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      payment_method 
    } = req.body;
    const user_id = req.user.id;

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        error: 'Missing payment verification parameters' 
      });
    }

    // Find payment record
    const payment = await findPaymentByOrderId(razorpay_order_id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Verify user ownership
    if (payment.user_id !== user_id) {
      return res.status(403).json({ error: 'Unauthorized access to payment' });
    }

    // Check if payment already processed
    if (payment.status === 'completed') {
      return res.status(400).json({ 
        error: 'Payment already processed',
        enrollment_id: payment.enrollment_id,
      });
    }

    // Verify Razorpay signature
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      // Update payment status to failed
      await updatePaymentStatus(payment.id, {
        status: 'failed',
        razorpay_payment_id,
        razorpay_signature,
      });

      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Check if enrollment already exists
    let enrollment = await findEnrollmentByUserAndCourse(user_id, payment.course_id);
    
    if (!enrollment) {
      // Create enrollment
      enrollment = await createEnrollment({
        user_id,
        course_id: payment.course_id,
      });
    }

    // Update payment status
    const updatedPayment = await updatePaymentStatus(payment.id, {
      status: 'completed',
      razorpay_payment_id,
      razorpay_signature,
      payment_method: payment_method || 'razorpay',
      enrollment_id: enrollment.id,
      paid_at: new Date(),
    });

    res.json({ 
      message: 'Payment verified and enrollment completed successfully',
      payment: updatedPayment,
      enrollment,
    });
  } catch (error) {
    console.error('[PaymentController] Error verifying payment:', error);
    next(error);
  }
};

/**
 * Handle payment failure
 */
const handlePaymentFailure = async (req, res, next) => {
  try {
    const { razorpay_order_id, error } = req.body;
    const user_id = req.user.id;

    if (!razorpay_order_id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Find payment record
    const payment = await findPaymentByOrderId(razorpay_order_id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Verify user ownership
    if (payment.user_id !== user_id) {
      return res.status(403).json({ error: 'Unauthorized access to payment' });
    }

    // Update payment status to failed
    await updatePaymentStatus(payment.id, {
      status: 'failed',
    });

    res.json({ 
      message: 'Payment failure recorded',
      error: error || 'Payment was not completed',
    });
  } catch (error) {
    console.error('[PaymentController] Error handling payment failure:', error);
    next(error);
  }
};

/**
 * Get user's payment history
 */
const getPayments = async (req, res, next) => {
  try {
    const payments = await findPaymentsByUser(req.user.id);
    res.json({ payments });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment by ID
 */
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await findPaymentById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user owns this payment or is admin
    if (payment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to payment' });
    }

    res.json({ payment });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payments (Admin only)
 */
const getAllPaymentsAdmin = async (req, res, next) => {
  try {
    const payments = await getAllPayments();
    res.json({ payments });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment statistics (Admin only)
 */
const getPaymentStatsAdmin = async (req, res, next) => {
  try {
    const stats = await getPaymentStats();
    res.json({ stats });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  getRazorpayKey,
  createOrder,
  verifyPayment,
  handlePaymentFailure,
  getPayments, 
  getPaymentById,
  getAllPaymentsAdmin,
  getPaymentStatsAdmin,
};

const { query } = require('../config/database');
const { getRazorpayInstance } = require('../config/razorpay');
const crypto = require('crypto');

/**
 * Create a Razorpay order
 */
const createRazorpayOrder = async ({ amount, currency = 'INR', receipt, notes }) => {
  try {
    const razorpay = getRazorpayInstance();
    
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt,
      notes,
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('[PaymentService] Error creating Razorpay order:', error);
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
  }
};

/**
 * Verify Razorpay payment signature
 */
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    console.error('[PaymentService] Error verifying signature:', error);
    return false;
  }
};

/**
 * Create a payment record in database
 */
const createPaymentRecord = async ({ 
  user_id, 
  course_id,
  enrollment_id,
  amount, 
  currency = 'INR',
  razorpay_order_id 
}) => {
  const result = await query(
    `INSERT INTO payments 
    (user_id, course_id, enrollment_id, amount, currency, razorpay_order_id, status) 
    VALUES ($1, $2, $3, $4, $5, $6, $7) 
    RETURNING *`,
    [user_id, course_id, enrollment_id, amount, currency, razorpay_order_id, 'pending']
  );
  return result.rows[0];
};

/**
 * Update payment status after verification
 */
const updatePaymentStatus = async (payment_id, updates) => {
  const fields = [];
  const params = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${paramIdx++}`);
    params.push(value);
  }

  if (fields.length === 0) return null;

  fields.push('updated_at = NOW()');
  params.push(payment_id);

  const result = await query(
    `UPDATE payments SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    params
  );
  return result.rows[0] || null;
};

/**
 * Find payment by Razorpay order ID
 */
const findPaymentByOrderId = async (razorpay_order_id) => {
  const result = await query(
    'SELECT * FROM payments WHERE razorpay_order_id = $1',
    [razorpay_order_id]
  );
  return result.rows[0] || null;
};

/**
 * Find payments by user
 */
const findPaymentsByUser = async (user_id) => {
  const result = await query(
    `SELECT 
      p.*,
      c.title AS course_title,
      c.thumbnail_url AS course_thumbnail,
      u.name AS student_name,
      u.email AS student_email
    FROM payments p
    LEFT JOIN courses c ON p.course_id = c.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.user_id = $1 
    ORDER BY p.created_at DESC`,
    [user_id]
  );
  return result.rows;
};

/**
 * Find payment by ID
 */
const findPaymentById = async (id) => {
  const result = await query(
    `SELECT 
      p.*,
      c.title AS course_title,
      c.thumbnail_url AS course_thumbnail,
      u.name AS student_name,
      u.email AS student_email
    FROM payments p
    LEFT JOIN courses c ON p.course_id = c.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Get all payments (for admin)
 */
const getAllPayments = async () => {
  const result = await query(
    `SELECT 
      p.*,
      c.title AS course_title,
      c.thumbnail_url AS course_thumbnail,
      u.name AS student_name,
      u.email AS student_email
    FROM payments p
    LEFT JOIN courses c ON p.course_id = c.id
    LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC`
  );
  return result.rows;
};

/**
 * Get payment statistics (for admin dashboard)
 */
const getPaymentStats = async () => {
  const result = await query(
    `SELECT 
      COUNT(*) FILTER (WHERE status = 'completed') as successful_payments,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
      COUNT(*) as total_payments,
      COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_revenue
    FROM payments`
  );
  return result.rows[0];
};

/**
 * Check if user has already paid for a course
 */
const hasUserPaidForCourse = async (user_id, course_id) => {
  const result = await query(
    `SELECT id FROM payments 
    WHERE user_id = $1 AND course_id = $2 AND status = 'completed'
    LIMIT 1`,
    [user_id, course_id]
  );
  return result.rows.length > 0;
};

module.exports = { 
  createRazorpayOrder,
  verifyRazorpaySignature,
  createPaymentRecord, 
  updatePaymentStatus,
  findPaymentByOrderId,
  findPaymentsByUser, 
  findPaymentById,
  getAllPayments,
  getPaymentStats,
  hasUserPaidForCourse,
};

const Razorpay = require('razorpay');

let razorpayInstance = null;

/**
 * Initialize Razorpay instance
 * @returns {Razorpay} Razorpay instance
 */
const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    console.log('[Razorpay] ✓ Initialized successfully');
  }

  return razorpayInstance;
};

/**
 * Get Razorpay Key ID for frontend
 * @returns {string} Razorpay Key ID
 */
const getRazorpayKeyId = () => {
  return process.env.RAZORPAY_KEY_ID;
};

module.exports = {
  getRazorpayInstance,
  getRazorpayKeyId,
};

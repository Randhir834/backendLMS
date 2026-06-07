const {
  createPaymentRecord,
  findPaymentsByUser,
  findPaymentById,
  updatePaymentStatus,
} = require('../services/paymentService');

const createPayment = async (req, res, next) => {
  try {
    const { enrollment_id, amount, payment_method } = req.body;
    const payment = await createPaymentRecord({
      user_id: req.user.id,
      enrollment_id,
      amount,
      payment_method,
    });
    res.status(201).json({ message: 'Payment recorded successfully', payment });
  } catch (error) {
    next(error);
  }
};

const completePayment = async (req, res, next) => {
  try {
    const { payment_id, transaction_id } = req.body;
    
    if (!payment_id || !transaction_id) {
      return res.status(400).json({ error: 'Payment ID and transaction ID are required' });
    }

    const payment = await updatePaymentStatus(payment_id, {
      status: 'completed',
      transaction_id,
      paid_at: new Date()
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ 
      message: 'Payment completed successfully', 
      payment 
    });
  } catch (error) {
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const payments = await findPaymentsByUser(req.user.id);
    res.json({ payments });
  } catch (error) {
    next(error);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const payment = await findPaymentById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json({ payment });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  createPayment, 
  completePayment,
  getPayments, 
  getPaymentById 
};

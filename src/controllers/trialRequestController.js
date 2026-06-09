const { createTrialRequest, getAllTrialRequests } = require('../services/trialRequestService');

const requestTrial = async (req, res, next) => {
  try {
    const { name, email, phone, grade } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required.' });
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    const trialRequest = await createTrialRequest({ name, email, phone, grade });

    res.status(201).json({
      message: 'Trial request received successfully.',
      trialRequest,
    });
  } catch (error) {
    next(error);
  }
};

const getTrialRequests = async (req, res, next) => {
  try {
    const trialRequests = await getAllTrialRequests();
    res.json({ trialRequests });
  } catch (error) {
    next(error);
  }
};

module.exports = { requestTrial, getTrialRequests };

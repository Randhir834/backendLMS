const errorHandler = (err, req, res, _next) => {
  // Technical error already logged by errorTranslator middleware
  // If not logged yet, log it here
  if (!err.userMessage) {
    console.error(`[Error] ${req.method} ${req.originalUrl} — ${err.message}`);
  }

  const statusCode = err.statusCode || err.status || 500;
  
  // Use user-friendly message if available, otherwise use default message
  let message = err.userMessage || err.message || 'Something went wrong. Please try again.';
  
  // Never expose technical details in production for 500-level errors
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = err.userMessage || 'Something went wrong on our end. Please try again later.';
  }

  // Send response with user-friendly error
  res.status(statusCode).json({
    error: message,
    // Only include technical details in development mode
    ...(process.env.NODE_ENV === 'development' && { 
      technicalError: err.technicalMessage || err.message,
      stack: err.stack 
    }),
  });
};

module.exports = { errorHandler };

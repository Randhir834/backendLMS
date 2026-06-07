const errorHandler = (err, req, res, _next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl} — ${err.message}`);

  const statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  if (statusCode >= 500 && process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'Internal server error';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };

/**
 * Error Translation Middleware
 * Converts technical error messages into user-friendly messages
 * while preserving technical details for logging
 */

const errorTranslator = (err, req, res, next) => {
  // Store original technical error for logging
  const technicalError = err.message;
  const originalStack = err.stack;
  
  console.error(`[Technical Error] ${req.method} ${req.originalUrl} — ${technicalError}`);
  
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Translate technical errors to user-friendly messages
  let userMessage = translateError(err, statusCode);
  
  // Add translated message to error object
  err.userMessage = userMessage;
  err.technicalMessage = technicalError;
  
  // Log for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('[Stack Trace]', originalStack);
  }
  
  // Pass to error handler
  next(err);
};

/**
 * Translates technical error messages to user-friendly messages
 */
function translateError(err, statusCode) {
  const message = err.message || '';
  
  // Authentication & Authorization Errors (401, 403)
  if (statusCode === 401) {
    if (message.includes('token') || message.includes('Token')) {
      return 'Your session has expired. Please log in again.';
    }
    if (message.includes('Session')) {
      return 'Your session has expired. Please log in again.';
    }
    if (message.includes('Invalid email') || message.includes('Invalid password') || message.includes('Invalid credentials')) {
      return 'The email address or password you entered is incorrect.';
    }
    if (message.includes('not found') || message.includes('does not exist')) {
      return 'No account found with this email address.';
    }
    return 'Authentication failed. Please log in again.';
  }
  
  if (statusCode === 403) {
    if (message.includes('portal') || message.includes('role')) {
      return err.message; // Keep role-specific portal messages
    }
    return 'You do not have permission to perform this action.';
  }
  
  // Validation Errors (400)
  if (statusCode === 400) {
    // Email validation
    if (message.includes('email') && (message.includes('required') || message.includes('invalid'))) {
      return 'Please enter a valid email address.';
    }
    
    // Password validation
    if (message.includes('password')) {
      if (message.includes('required')) {
        return 'Please enter your password.';
      }
      if (message.includes('8 characters')) {
        return 'Password must be at least 8 characters long.';
      }
      if (message.includes('match')) {
        return 'Passwords do not match.';
      }
    }
    
    // Keep specific field validation messages if they're already user-friendly
    if (!message.includes('undefined') && !message.includes('null') && 
        !message.includes('database') && !message.includes('query')) {
      return message;
    }
    
    return 'Please check your input and try again.';
  }
  
  // Not Found Errors (404)
  if (statusCode === 404) {
    if (message.includes('User')) {
      return 'User not found.';
    }
    if (message.includes('Course')) {
      return 'Course not found.';
    }
    if (message.includes('Assignment')) {
      return 'Assignment not found.';
    }
    if (message.includes('Quiz')) {
      return 'Quiz not found.';
    }
    if (message.includes('Enrollment')) {
      return 'Enrollment not found.';
    }
    return 'The requested resource was not found.';
  }
  
  // Conflict Errors (409)
  if (statusCode === 409) {
    if (message.includes('email') && message.includes('already')) {
      return 'An account with this email address already exists.';
    }
    if (message.includes('enrolled')) {
      return 'You are already enrolled in this course.';
    }
    if (message.includes('submitted')) {
      return 'You have already submitted this assignment.';
    }
    return 'This action conflicts with existing data.';
  }
  
  // Rate Limiting (429)
  if (statusCode === 429) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  
  // File Upload Errors
  if (message.includes('file') || message.includes('upload')) {
    if (message.includes('size') || message.includes('large')) {
      return 'The file you selected is too large. Please choose a smaller file.';
    }
    if (message.includes('type') || message.includes('format')) {
      return 'This file type is not supported. Please choose a different file.';
    }
    if (message.includes('Upload failed')) {
      return 'Failed to upload file. Please try again.';
    }
    return 'There was a problem with your file. Please try again.';
  }
  
  // Database/Assignment Specific Errors
  if (message.includes('not assigned')) {
    return 'You do not have access to this assignment.';
  }
  
  if (message.includes('Resubmission') || message.includes('resubmission')) {
    return 'Resubmission is not allowed for this assignment.';
  }
  
  if (message.includes('deadline') && message.includes('passed')) {
    return 'The deadline for this assignment has passed.';
  }
  
  if (message.includes('late submission')) {
    return 'Late submissions are not allowed for this assignment.';
  }
  
  if (message.includes('Maximum attempts')) {
    return 'You have reached the maximum number of attempts for this quiz.';
  }
  
  // Network/Connection Errors
  if (message.includes('ECONNREFUSED') || message.includes('ENETUNREACH')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return 'The request took too long. Please try again.';
  }
  
  // Server Errors (500+)
  if (statusCode >= 500) {
    // Never expose internal server errors in production
    if (process.env.NODE_ENV === 'production') {
      return 'Something went wrong on our end. Please try again later.';
    }
    // In development, provide slightly more context
    return 'A server error occurred. Please try again.';
  }
  
  // Default fallback messages
  return 'Something went wrong. Please try again.';
}

module.exports = { errorTranslator };

/**
 * Error Handler Utility
 * Standardizes error responses across the backend
 */

// Error codes enum
const ErrorCodes = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_EMAIL_EXISTS: 'AUTH_EMAIL_EXISTS',
  AUTH_PHONE_EXISTS: 'AUTH_PHONE_EXISTS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  
  // Validation errors
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_EMAIL: 'VALIDATION_EMAIL',
  VALIDATION_PHONE: 'VALIDATION_PHONE',
  VALIDATION_PASSWORD_WEAK: 'VALIDATION_PASSWORD_WEAK',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  
  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Server errors
  SERVER_ERROR: 'SERVER_ERROR',
  
  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CARD_DECLINED: 'CARD_DECLINED',
  
  // Cart/Order errors
  CART_EMPTY: 'CART_EMPTY',
  ITEM_UNAVAILABLE: 'ITEM_UNAVAILABLE',
  ORDER_FAILED: 'ORDER_FAILED'
};

// User-friendly error messages
const ErrorMessages = {
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: {
    primary: 'Invalid email or password.',
    alternative: 'Incorrect login details.'
  },
  [ErrorCodes.AUTH_UNAUTHORIZED]: {
    primary: 'Please log in to continue.',
    alternative: 'Login required.'
  },
  [ErrorCodes.AUTH_FORBIDDEN]: {
    primary: "You don't have permission to do that.",
    alternative: 'Access denied.'
  },
  [ErrorCodes.AUTH_EMAIL_EXISTS]: {
    primary: 'An account with this email already exists.',
    alternative: 'Email already in use.'
  },
  [ErrorCodes.AUTH_PHONE_EXISTS]: {
    primary: 'An account with this phone number already exists.',
    alternative: 'Phone number already in use.'
  },
  [ErrorCodes.AUTH_SESSION_EXPIRED]: {
    primary: 'Your session expired. Please log in again.',
    alternative: 'Session expired. Please log in.'
  },
  [ErrorCodes.AUTH_ACCOUNT_SUSPENDED]: {
    primary: 'Your account is suspended. Please contact support.',
    alternative: 'Account suspended. Contact support.'
  },
  [ErrorCodes.VALIDATION_REQUIRED]: {
    primary: 'Please fill in all required fields.',
    alternative: 'Missing required information.'
  },
  [ErrorCodes.VALIDATION_EMAIL]: {
    primary: 'Please enter a valid email address.',
    alternative: 'Invalid email address.'
  },
  [ErrorCodes.VALIDATION_PHONE]: {
    primary: 'Please enter a valid phone number.',
    alternative: 'Invalid phone number.'
  },
  [ErrorCodes.VALIDATION_PASSWORD_WEAK]: {
    primary: 'Password must be at least 8 characters.',
    alternative: 'Password is too short.'
  },
  [ErrorCodes.NOT_FOUND]: {
    primary: "We couldn't find what you're looking for.",
    alternative: 'Not found.'
  },
  [ErrorCodes.CONFLICT]: {
    primary: 'This already exists. Please use a different value.',
    alternative: 'Already exists.'
  },
  [ErrorCodes.RATE_LIMITED]: {
    primary: 'Too many attempts. Please try again later.',
    alternative: 'Too many attempts.'
  },
  [ErrorCodes.SERVER_ERROR]: {
    primary: 'Something went wrong. Please try again.',
    alternative: 'Unexpected error. Try again.'
  },
  [ErrorCodes.PAYMENT_FAILED]: {
    primary: 'Payment failed. Please try again.',
    alternative: 'Payment failed.'
  },
  [ErrorCodes.CARD_DECLINED]: {
    primary: 'Your card was declined. Please try another card.',
    alternative: 'Card declined.'
  },
  [ErrorCodes.CART_EMPTY]: {
    primary: 'Your cart is empty.',
    alternative: 'No items in cart.'
  },
  [ErrorCodes.ITEM_UNAVAILABLE]: {
    primary: 'This item is no longer available.',
    alternative: 'Item unavailable.'
  },
  [ErrorCodes.ORDER_FAILED]: {
    primary: "Couldn't place your order. Please try again.",
    alternative: 'Order failed. Try again.'
  }
};

/**
 * Create standardized error response
 * @param {string} code - Error code from ErrorCodes
 * @param {string} customMessage - Optional custom message (overrides default)
 * @param {any} details - Optional additional details
 * @param {boolean} useAlternative - Whether to use alternative (shorter) message
 */
const createError = (code, customMessage = null, details = null, useAlternative = false) => {
  const messageObj = ErrorMessages[code] || ErrorMessages[ErrorCodes.SERVER_ERROR];
  const message = customMessage || (useAlternative ? messageObj.alternative : messageObj.primary);
  
  const error = new Error(message);
  error.code = code;
  error.details = details;
  error.isOperational = true;
  
  return error;
};

/**
 * Send standardized error response
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 * @param {string} message - Optional custom message
 * @param {any} details - Optional details
 */
const sendError = (res, statusCode, code, message = null, details = null) => {
  const messageObj = ErrorMessages[code] || ErrorMessages[ErrorCodes.SERVER_ERROR];
  const finalMessage = message || messageObj.primary;
  
  return res.status(statusCode).json({
    success: false,
    message: finalMessage,
    code: code,
    details: details
  });
};

/**
 * Global Express error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  // If error is already standardized, use it
  if (err.isOperational && err.code) {
    const statusCode = mapCodeToStatus(err.code);
    return sendError(res, statusCode, err.code, err.message, err.details);
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return sendError(res, 400, ErrorCodes.VALIDATION_REQUIRED, null, err.errors);
  }
  
  if (err.name === 'CastError') {
    return sendError(res, 400, ErrorCodes.VALIDATION_REQUIRED, 'Invalid ID format');
  }
  
  if (err.code === 11000) {
    // MongoDB duplicate key
    const field = Object.keys(err.keyValue)[0];
    const code = field === 'email' ? ErrorCodes.AUTH_EMAIL_EXISTS : 
                 field === 'phone' ? ErrorCodes.AUTH_PHONE_EXISTS : 
                 ErrorCodes.CONFLICT;
    return sendError(res, 409, code);
  }
  
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, ErrorCodes.AUTH_UNAUTHORIZED);
  }
  
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, ErrorCodes.AUTH_SESSION_EXPIRED);
  }
  
  // Default server error
  return sendError(res, 500, ErrorCodes.SERVER_ERROR);
};

/**
 * Map error code to HTTP status
 */
const mapCodeToStatus = (code) => {
  const statusMap = {
    [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 401,
    [ErrorCodes.AUTH_UNAUTHORIZED]: 401,
    [ErrorCodes.AUTH_FORBIDDEN]: 403,
    [ErrorCodes.AUTH_EMAIL_EXISTS]: 409,
    [ErrorCodes.AUTH_PHONE_EXISTS]: 409,
    [ErrorCodes.AUTH_SESSION_EXPIRED]: 401,
    [ErrorCodes.AUTH_ACCOUNT_SUSPENDED]: 403,
    [ErrorCodes.VALIDATION_REQUIRED]: 400,
    [ErrorCodes.VALIDATION_EMAIL]: 400,
    [ErrorCodes.VALIDATION_PHONE]: 400,
    [ErrorCodes.VALIDATION_PASSWORD_WEAK]: 400,
    [ErrorCodes.NOT_FOUND]: 404,
    [ErrorCodes.CONFLICT]: 409,
    [ErrorCodes.RATE_LIMITED]: 429,
    [ErrorCodes.SERVER_ERROR]: 500,
    [ErrorCodes.PAYMENT_FAILED]: 402,
    [ErrorCodes.CARD_DECLINED]: 402,
    [ErrorCodes.CART_EMPTY]: 400,
    [ErrorCodes.ITEM_UNAVAILABLE]: 400,
    [ErrorCodes.ORDER_FAILED]: 400
  };
  
  return statusMap[code] || 500;
};

module.exports = {
  ErrorCodes,
  ErrorMessages,
  createError,
  sendError,
  globalErrorHandler
};

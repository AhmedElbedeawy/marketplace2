/**
 * Error Handler Utility
 * Maps API errors to user-friendly messages
 */

// Error codes from backend
export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_EMAIL_EXISTS: 'AUTH_EMAIL_EXISTS',
  AUTH_PHONE_EXISTS: 'AUTH_PHONE_EXISTS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_EMAIL: 'VALIDATION_EMAIL',
  VALIDATION_PHONE: 'VALIDATION_PHONE',
  VALIDATION_PASSWORD_WEAK: 'VALIDATION_PASSWORD_WEAK',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CARD_DECLINED: 'CARD_DECLINED',
  CART_EMPTY: 'CART_EMPTY',
  ITEM_UNAVAILABLE: 'ITEM_UNAVAILABLE',
  ORDER_FAILED: 'ORDER_FAILED'
};

// User-friendly messages with alternatives
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

// Status code to message mapping (fallback when no code provided)
const StatusCodeMessages = {
  400: {
    primary: 'Please check your input and try again.',
    alternative: 'Invalid input.'
  },
  401: {
    primary: 'Invalid email or password.',
    alternative: 'Login failed.'
  },
  403: {
    primary: "You don't have permission to do that.",
    alternative: 'Access denied.'
  },
  404: {
    primary: "We couldn't find what you're looking for.",
    alternative: 'Not found.'
  },
  409: {
    primary: 'This already exists. Please use a different value.',
    alternative: 'Already exists.'
  },
  429: {
    primary: 'Too many attempts. Please try again later.',
    alternative: 'Too many attempts.'
  },
  500: {
    primary: 'Something went wrong. Please try again.',
    alternative: 'Unexpected error. Try again.'
  }
};

/**
 * Get user-friendly error message from API error
 * @param {Error} err - Axios error object
 * @param {boolean} useAlternative - Whether to use shorter alternative message
 * @returns {Object} { message, code, status }
 */
export const getUserFriendlyError = (err, useAlternative = false) => {
  // Log raw error for debugging
  console.error('API Error:', err);
  
  // No response - network error / timeout
  if (!err.response) {
    const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
    if (isTimeout) {
      return {
        message: useAlternative ? 'Too slow. Try again.' : 'Request timed out. Please try again.',
        code: 'TIMEOUT',
        status: 0
      };
    }
    return {
      message: useAlternative ? 'No connection. Try again.' : 'No internet connection. Please check and try again.',
      code: 'NETWORK_ERROR',
      status: 0
    };
  }
  
  const { status, data } = err.response;
  
  // If backend provided a code, use it
  if (data?.code && ErrorMessages[data.code]) {
    const msgObj = ErrorMessages[data.code];
    return {
      message: useAlternative ? msgObj.alternative : msgObj.primary,
      code: data.code,
      status,
      details: data.details
    };
  }
  
  // If backend provided a message but no code, use the message
  if (data?.message) {
    return {
      message: data.message,
      code: data.code || 'UNKNOWN',
      status,
      details: data.details
    };
  }
  
  // Fallback to status code mapping
  const statusMsg = StatusCodeMessages[status];
  if (statusMsg) {
    return {
      message: useAlternative ? statusMsg.alternative : statusMsg.primary,
      code: `HTTP_${status}`,
      status
    };
  }
  
  // Ultimate fallback
  return {
    message: useAlternative ? 'Error. Try again.' : 'Something went wrong. Please try again.',
    code: 'UNKNOWN_ERROR',
    status
  };
};

/**
 * Get just the message string (convenience function)
 * @param {Error} err - Axios error object
 * @param {boolean} useAlternative - Whether to use shorter message
 * @returns {string}
 */
export const getErrorMessage = (err, useAlternative = false) => {
  return getUserFriendlyError(err, useAlternative).message;
};

/**
 * Check if error is an auth error (401/403)
 * @param {Error} err - Axios error object
 * @returns {boolean}
 */
export const isAuthError = (err) => {
  if (!err.response) return false;
  const status = err.response.status;
  return status === 401 || status === 403;
};

/**
 * Check if error is a network error
 * @param {Error} err - Axios error object
 * @returns {boolean}
 */
export const isNetworkError = (err) => {
  return !err.response || err.code === 'ECONNABORTED' || err.message?.includes('Network Error');
};

/**
 * Handle auth error - redirect to login if session expired
 * @param {Error} err - Axios error object
 * @param {Function} navigate - React Router navigate function
 */
export const handleAuthError = (err, navigate) => {
  if (isAuthError(err)) {
    const code = err.response?.data?.code;
    if (code === ErrorCodes.AUTH_SESSION_EXPIRED || err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('authChange')); // Notify cart to switch to guest storage
      if (navigate) {
        navigate('/login', { state: { from: window.location.pathname } });
      }
      return true;
    }
  }
  return false;
};

export default {
  getUserFriendlyError,
  getErrorMessage,
  isAuthError,
  isNetworkError,
  handleAuthError,
  ErrorCodes
};

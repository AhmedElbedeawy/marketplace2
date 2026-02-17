import axios from 'axios';
import { getUserFriendlyError, isAuthError } from './errorHandler';

const getBaseURL = () => {
  let url = process.env.REACT_APP_API_URL || 'http://localhost:5005';
  
  // Ensure it ends without a slash
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  // Strip /api suffix if present (STATIC_BASE_URL should not have /api)
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  
  return url;
};

const getApiBaseURL = () => {
  let url = getBaseURL();
  
  // Ensure it includes /api
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  
  return url;
};

// Base URL for static assets (without /api suffix)
export const STATIC_BASE_URL = getBaseURL();

// Full API URL (with /api suffix)
export const API_URL = getApiBaseURL();

/**
 * Converts relative paths to absolute URLs for uploaded assets.
 * Handles /uploads/ paths by prepending STATIC_BASE_URL.
 * 
 * @param {string|null|undefined} path - The image/file path to process
 * @returns {string} - The absolute URL or empty string if path is falsy
 */
export const getAbsoluteUrl = (path) => {
  // Return empty for falsy values
  if (!path) return '';
  
  // Already absolute URL (starts with http:// or https://)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Uploaded asset path - prepend STATIC_BASE_URL
  if (path.startsWith('/uploads/')) {
    return `${STATIC_BASE_URL}${path}`;
  }
  
  // Asset path (e.g., '/assets/...') or other relative path - return as-is
  return path;
};

/**
 * Normalizes any image path/URL to a usable format.
 * This is the SINGLE SOURCE OF TRUTH for image URL handling.
 * 
 * Handles:
 * - Full URLs (http:// or https://) - returns as-is
 * - /uploads/ paths - prepends STATIC_BASE_URL
 * - /assets/ paths - returns as-is (served by React)
 * - Relative paths without leading / - adds /assets/dishes/
 * - Null/undefined - returns placeholder
 * 
 * @param {string|null|undefined} imagePath - The image path or URL
 * @param {string} placeholder - Default placeholder to use if no image
 * @returns {string} - The normalized image URL
 */
export const normalizeImageUrl = (imagePath, placeholder = '/assets/dishes/dish-placeholder.svg') => {
  // Return placeholder for falsy values
  if (!imagePath) {
    return placeholder;
  }
  
  // Already absolute URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Uploaded asset - prepend server URL
  if (imagePath.startsWith('/uploads/')) {
    return `${STATIC_BASE_URL}${imagePath}`;
  }
  
  // Already starts with /assets/ - return as-is
  if (imagePath.startsWith('/assets/')) {
    return imagePath;
  }
  
  // Starts with / but not /uploads/ or /assets/ - assume it's a root path
  if (imagePath.startsWith('/')) {
    return imagePath;
  }
  
  // Relative path without leading / - assume it's in /assets/dishes/
  return `/assets/dishes/${imagePath}`;
};

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token and country code to requests if available
api.interceptors.request.use(
  (config) => {
    // ALWAYS read token fresh from localStorage on every request
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add country code header
    const countryCode = localStorage.getItem('platformCountryCode') || 'EG';
    config.headers['x-country-code'] = countryCode.toUpperCase();

    // If data is FormData, remove Content-Type to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize error with user-friendly message
    const friendlyError = getUserFriendlyError(error);
    
    // Attach user-friendly message to error for easy access
    error.userMessage = friendlyError.message;
    error.errorCode = friendlyError.code;
    
    // Handle auth errors
    if (isAuthError(error)) {
      const backendMessage = error.response?.data?.message;
      const backendCode = error.response?.data?.code;
      
      // Check for session expired or user not found
      if (backendCode === 'AUTH_SESSION_EXPIRED' || 
          backendCode === 'AUTH_UNAUTHORIZED' ||
          backendMessage === 'User not found' || 
          backendMessage === 'Not authorized, token failed' ||
          error.response?.status === 401) {
        console.warn('Authentication failed:', friendlyError.message, '- Clearing token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('authChange')); // Notify cart to switch to guest storage
        
        // Redirect to signup/login if we're not already there
        if (!window.location.pathname.includes('/signup') && 
            !window.location.pathname.includes('/login')) {
          window.location.href = '/signup';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Dashboard API calls
export const getCookSalesSummary = async (period = 'last30') => {
  try {
    const response = await api.get(`/orders/cook/sales-summary?period=${period}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    throw error;
  }
};

export const getCookSalesByCategory = async () => {
  try {
    const response = await api.get('/orders/cook/sales-by-category');
    return response.data;
  } catch (error) {
    console.error('Error fetching sales by category:', error);
    throw error;
  }
};

export const getCookOrderStats = async () => {
  try {
    const response = await api.get('/orders/cook/order-stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching order stats:', error);
    throw error;
  }
};

export const getCookOrders = async () => {
  try {
    const response = await api.get('/orders/cook/orders');
    return response.data;
  } catch (error) {
    console.error('Error fetching cook orders:', error);
    throw error;
  }
};

export default api;

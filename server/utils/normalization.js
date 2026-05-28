/**
 * Single source of truth for allowed country codes across the platform.
 * Any countryCode not in this list is rejected.
 */
const ALLOWED_COUNTRIES = ['SA', 'AE', 'EG', 'KW'];

/**
 * Normalize a country input to a canonical ISO-2 uppercase code.
 * Returns null if the value is missing or not in the allowed list.
 * Never stores free-text country names.
 */
const normalizeCountry = (input) => {
  if (!input) return null;
  const upper = input.toString().trim().toUpperCase();
  return ALLOWED_COUNTRIES.includes(upper) ? upper : null;
};

// Utility function to normalize email
const normalizeEmail = (email) => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

// Utility function to normalize phone
const normalizePhone = (phone) => {
  if (!phone) return '';
  // Remove all non-digits except leading '+'
  let normalized = phone.replace(/[^\d+]/g, '');
  // Ensure only one '+' at the beginning
  if (normalized.includes('+')) {
    normalized = '+' + normalized.replace(/\+/g, '');
  }
  return normalized;
};

module.exports = {
  ALLOWED_COUNTRIES,
  normalizeCountry,
  normalizeEmail,
  normalizePhone
};

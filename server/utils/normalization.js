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
  normalizeEmail,
  normalizePhone
};

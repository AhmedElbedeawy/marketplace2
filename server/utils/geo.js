/**
 * Calculates the great-circle distance between two points (lat, lng)
 * in kilometers using the Haversine formula.
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

/**
 * Validates if latitude and longitude are valid and non-zero.
 */
const isValidCoordinate = (lat, lng) => {
  if (lat === undefined || lng === undefined || lat === null || lng === null) return false;
  
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  // Check if they are numbers
  if (isNaN(latitude) || isNaN(longitude)) return false;

  // Check if they are exactly (0,0) - common default for unset location
  if (latitude === 0 && longitude === 0) return false;

  // Standard ranges
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;

  return true;
};

module.exports = {
  getDistance,
  isValidCoordinate
};

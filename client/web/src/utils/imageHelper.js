/**
 * Get cook/kitchen image URL with proper fallback chain
 * Priority: cook.profilePhoto (kitchen photo from registration) > cook.user.profilePhoto (user avatar) > legacy fields
 */
export const getCookImageUrl = (cook) => {
  if (!cook) return null;
  
  // Kitchen photo from registration/updates (AUTHORITATIVE SOURCE)
  if (cook.profilePhoto) return cook.profilePhoto;
  
  // User avatar fallback (personal profile photo)
  if (cook.user?.profilePhoto) return cook.user.profilePhoto;
  
  // Legacy direct cook image fields
  if (cook.image) return cook.image;
  if (cook.photo) return cook.photo;
  if (cook.avatar) return cook.avatar;
  
  // Return null if no image found (let component handle placeholder)
  return null;
};

/**
 * Get cook display name with proper fallback
 */
export const getCookDisplayName = (cook) => {
  if (!cook) return '';
  return cook.storeName || cook.name || '';
};

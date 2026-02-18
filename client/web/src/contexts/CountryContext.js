import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';

const CountryContext = createContext();

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};

// Helper to get current user ID from localStorage
const getCurrentUserId = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?._id || user?.id || null;
    }
  } catch (e) {
    console.warn('Failed to parse user from localStorage:', e);
  }
  return null;
};

// Helper to get cart storage key based on user ID
const getCartStorageKey = (countryCode, userId) => {
  if (userId) {
    return `cart_${userId}_${countryCode}`;
  }
  return `cart_guest_${countryCode}`;
};

// Migration: copy old cart to new user-specific key if exists
const migrateLegacyCart = (countryCode, userId) => {
  const oldKey = 'cartsByCountry';
  const oldData = localStorage.getItem(oldKey);
  
  if (oldData) {
    try {
      const cartsByCountry = JSON.parse(oldData);
      const oldCart = cartsByCountry[countryCode] || [];
      
      if (oldCart.length > 0) {
        const newKey = getCartStorageKey(countryCode, userId);
        const existingCart = localStorage.getItem(newKey);
        
        // Only migrate if no existing cart for this user
        if (!existingCart) {
          localStorage.setItem(newKey, JSON.stringify(oldCart));
          console.log(`[CART] Migrated legacy cart to ${newKey}`);
        }
      }
      // Don't remove old cart - keep for other users/guests
    } catch (e) {
      console.warn('Failed to migrate legacy cart:', e);
    }
  }
};

export const CountryProvider = ({ children }) => {
  // TEMP: Lock country to SA
  const TEMP_LOCKED_COUNTRY = 'SA';
  
  // ISO codes: EG, SA, AE, KW, QA
  const [countryCode, setCountryCode] = useState(TEMP_LOCKED_COUNTRY);
  
  // Get current user ID
  const [currentUserId, setCurrentUserId] = useState(getCurrentUserId);
  
  // Listen for auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      const newUserId = getCurrentUserId();
      setCurrentUserId(newUserId);
      console.log('[CART] Auth state changed, userId:', newUserId);
    };
    
    // Listen for login/logout events
    window.addEventListener('authChange', handleAuthChange);
    
    // Also check periodically in case auth changed without event
    const interval = setInterval(() => {
      const newUserId = getCurrentUserId();
      if (newUserId !== currentUserId) {
        handleAuthChange();
      }
    }, 2000);
    
    return () => {
      window.removeEventListener('authChange', handleAuthChange);
      clearInterval(interval);
    };
  }, [currentUserId]);
  
  // Cart management: Load cart based on current user and country
  const [cart, setCart] = useState(() => {
    // First time: migrate legacy cart if needed
    migrateLegacyCart(countryCode, currentUserId);
    
    // Then load user-specific cart
    const storageKey = getCartStorageKey(countryCode, currentUserId);
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });
  
  // Re-load cart when user or country changes
  useEffect(() => {
    // Migrate legacy cart if needed
    migrateLegacyCart(countryCode, currentUserId);
    
    const storageKey = getCartStorageKey(countryCode, currentUserId);
    const saved = localStorage.getItem(storageKey);
    const loadedCart = saved ? JSON.parse(saved) : [];
    setCart(loadedCart);
    console.log(`[CART] Loaded cart for user ${currentUserId || 'guest'} in ${countryCode}:`, loadedCart.length, 'items');
  }, [countryCode, currentUserId]);
  
  // Persist cart whenever it changes
  useEffect(() => {
    const storageKey = getCartStorageKey(countryCode, currentUserId);
    localStorage.setItem(storageKey, JSON.stringify(cart));
    // Legacy support - also keep old key for other parts of app
    localStorage.setItem('foodie_cart', JSON.stringify(cart));
  }, [cart, countryCode, currentUserId]);
  
  // Filter cart items - remove invalid items
  const filteredCart = cart.filter(item => {
    const hasValidCookId = item.cookId || item.kitchenId;
    return hasValidCookId && String(hasValidCookId) !== 'null' && String(hasValidCookId) !== 'undefined';
  });
  
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Only set on initial mount if not present
    if (!localStorage.getItem('platformCountryCode')) {
      localStorage.setItem('platformCountryCode', countryCode);
    }
    window.dispatchEvent(new Event('countryUpdated'));
    window.dispatchEvent(new Event('cartUpdated')); // Trigger re-renders
  }, [countryCode]);

  const updateCountry = (code) => { 
    // TEMP: Country locked to SA - do nothing
    return; 
  };

  // Cart operations
  const addToCart = (item) => {
    setCart(prev => {
      // Check if item with same cookId, offerId, AND portionKey exists
      const existingIndex = prev.findIndex(cartItem => {
        const sameCook = String(cartItem.cookId || cartItem.kitchenId) === String(item.cookId || item.kitchenId);
        const sameOffer = String(cartItem.offerId || cartItem.dishId) === String(item.offerId || item.dishId);
        const samePortion = String(cartItem.portionKey) === String(item.portionKey);
        return sameCook && sameOffer && samePortion;
      });
      
      if (existingIndex >= 0) {
        // Update quantity of existing item with same portion
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + (item.quantity || 1)
        };
        return updated;
      } else {
        // Add new item
        return [...prev, { ...item, quantity: item.quantity || 1, countryCode }];
      }
    });
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const updateQuantity = (cookId, offerId, quantity, portionKey = null) => {
    setCart(prev => prev.map(item => {
      const itemCookId = String(item.cookId || item.kitchenId);
      const targetCookId = String(cookId);
      const itemOfferId = String(item.offerId || item.dishId);
      const targetOfferId = String(offerId);
      const itemPortionKey = String(item.portionKey || '');
      const targetPortionKey = String(portionKey || '');
      
      // If portionKey provided, match by portion too; otherwise match any portion
      const portionMatch = portionKey ? (itemPortionKey === targetPortionKey) : true;
      
      if (itemCookId === targetCookId && itemOfferId === targetOfferId && portionMatch) {
        return { ...item, quantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeFromCart = (cookId, offerId, portionKey = null) => {
    setCart(prev => prev.filter(item => {
      const itemCookId = String(item.cookId || item.kitchenId);
      const targetCookId = String(cookId);
      const itemOfferId = String(item.offerId || item.dishId);
      const targetOfferId = String(offerId);
      const itemPortionKey = String(item.portionKey || '');
      const targetPortionKey = String(portionKey || '');
      
      // If portionKey provided, match by portion too; otherwise match any portion
      const portionMatch = portionKey ? (itemPortionKey === targetPortionKey) : true;
      
      return !(itemCookId === targetCookId && itemOfferId === targetOfferId && portionMatch);
    }));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const clearCart = () => {
    setCart([]);
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const value = {
    countryCode,
    updateCountry,
    cart: filteredCart, // Use filtered cart
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    // Helper to get currency code based on country
    get currencyCode() {
      const currencies = {
        'EG': 'EGP',
        'SA': 'SAR',
        'AE': 'AED',
        'KW': 'KWD',
        'QA': 'QAR'
      };
      return currencies[countryCode] || 'SAR';
    },
    // Helper to get country name
    get countryName() {
      const names = {
        'EG': 'Egypt',
        'SA': 'Saudi Arabia',
        'AE': 'Emirates',
        'KW': 'Kuwait',
        'QA': 'Qatar'
      };
      return names[countryCode] || 'Saudi Arabia';
    }
  };

  return (
    <CountryContext.Provider value={value}>
      {children}
    </CountryContext.Provider>
  );
};

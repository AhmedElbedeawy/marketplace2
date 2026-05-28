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
    const initialCart = saved ? JSON.parse(saved) : [];
    console.log('[CART-LIFECYCLE] Initial load from localStorage:', initialCart.length, 'items');
    return initialCart;
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
    console.log('[CART-LIFECYCLE] Persisted to localStorage:', cart.length, 'items');
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
      // Normalize extras array to sorted list of IDs for exact comparison
      const normalizeExtras = (extras) => {
        if (!extras || !Array.isArray(extras) || extras.length === 0) return '[]';
        return JSON.stringify([...extras].map(e => String(e._id || e.id || e)).sort());
      };

      // Identity: same cook + same offer + same portion + same fulfillment + same extras + same pickup location
      const existingIndex = prev.findIndex(cartItem => {
        const sameCook = String(cartItem.cookId || cartItem.kitchenId) === String(item.cookId || item.kitchenId);
        const sameOffer = String(cartItem.offerId || cartItem.dishId) === String(item.offerId || item.dishId);
        const samePortion = String(cartItem.portionKey || '') === String(item.portionKey || '');
        const sameFulfillment = String(cartItem.fulfillmentMode || '') === String(item.fulfillmentMode || '');
        const sameExtras = normalizeExtras(cartItem.extras) === normalizeExtras(item.extras);
        const samePickupLocation = String(cartItem.pickupLocationId || cartItem.cookLocationId || '')
          === String(item.pickupLocationId || item.cookLocationId || '');
        return sameCook && sameOffer && samePortion && sameFulfillment && sameExtras && samePickupLocation;
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
    setCart(prev => {
      const newCart = prev.filter(item => {
        const itemCookId = String(item.cookId || item.kitchenId);
        const targetCookId = String(cookId);
        const itemOfferId = String(item.offerId || item.dishId);
        const targetOfferId = String(offerId);
        const itemPortionKey = String(item.portionKey || '');
        const targetPortionKey = String(portionKey || '');
        
        // If portionKey provided, match by portion too; otherwise match any portion
        const portionMatch = portionKey ? (itemPortionKey === targetPortionKey) : true;
        
        const shouldRemove = (itemCookId === targetCookId && itemOfferId === targetOfferId && portionMatch);
        
        return !shouldRemove;
      });
      
      console.log('[CART] Removed item - new cart size:', newCart.length, 'items');
      return newCart;
    });
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const clearCart = () => {
    setCart([]);
    // FIX #3: Synchronously clear localStorage to prevent race condition
    const storageKey = getCartStorageKey(countryCode, currentUserId);
    localStorage.removeItem(storageKey);
    localStorage.removeItem('foodie_cart');
    
    // CRITICAL: Also clear backend cart for logged-in users
    if (currentUserId) {
      console.log('[CART] Clearing backend cart for user:', currentUserId);
      // Sync empty cart to backend to clear it
      syncCartToBackend([]);
    }
    
    window.dispatchEvent(new Event('cartUpdated'));
  };

  // UNIFIED CART: Sync cart to backend (content-only, no pricing/logic)
  const syncCartToBackend = async (cartItems) => {
    if (!currentUserId) {
      console.log('[CART_SYNC] No user ID, skipping sync');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[CART_SYNC] No auth token, skipping sync');
        return;
      }

      // Extract content + display snapshot for backend storage
      const minimalItems = cartItems.map(item => ({
        // Core fields
        offerId: item.offerId || item.dishId,
        adminDishId: item.dishId || item.adminDishId,
        cookId: item.cookId || item.kitchenId,
        portionKey: item.portionKey,
        quantity: item.quantity,
        fulfillmentMode: item.fulfillmentMode || 'delivery',
        countryCode,
        // Display snapshot (support BOTH web and backend field names)
        dishName: item.dishName || item.name,  // Send backend format
        name: item.name || item.dishName,      // Send web format
        cookName: item.cookName || item.kitchenName,  // Send backend format
        kitchenName: item.kitchenName || item.cookName,  // Send web format
        photoUrl: item.photoUrl || item.image,
        priceAtAdd: item.priceAtAdd || item.price,
        deliveryFee: item.deliveryFee || 0,
        prepTime: item.prepTimeMinutes || item.prepTime || 30,
        // Preserve other identity fields
        extras: item.extras,
        pickupLocationId: item.pickupLocationId,
      }));

      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cart/sync`;
      console.log('[CART_SYNC] Sending sync request to:', apiUrl);
      console.log('[CART_SYNC] Items to sync:', minimalItems.length);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: minimalItems, countryCode })
      });

      console.log('[CART_SYNC] Sync response status:', response.status);
      
      const responseData = await response.json();
      console.log('[CART_SYNC] Sync response body:', responseData);

      if (response.ok) {
        console.log('[CART_SYNC] ✅ Synced to backend:', minimalItems.length, 'items');
      } else {
        console.log('[CART_SYNC] ❌ Sync failed:', response.status, responseData);
      }
    } catch (error) {
      console.error('[CART_SYNC] ❌ Failed to sync to backend:', error);
    }
  };

  // UNIFIED CART: Fetch cart from backend
  const fetchCartFromBackend = async () => {
    if (!currentUserId) {
      console.log('[CART_SYNC] No user ID, skipping fetch from backend');
      return null;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[CART_SYNC] No auth token, skipping fetch from backend');
        return null;
      }

      const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cart?countryCode=${countryCode}`;
      console.log('[CART_SYNC] Fetching cart from backend:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[CART_SYNC] Fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[CART_SYNC] Fetch response body:', data);
        
        if (data.success && data.items) {
          console.log('[CART_SYNC] ✅ Fetched from backend:', data.items.length, 'items');
          
          // Normalize backend field names to match web cart format
          const normalizedItems = data.items.map(item => ({
            ...item,
            // Map backend fields to web fields
            name: item.name || item.dishName,  // Backend may send dishName
            kitchenName: item.kitchenName || item.cookName,  // Backend may send cookName
            // Ensure all identity fields exist
            cookId: item.cookId,
            offerId: item.offerId,
            portionKey: item.portionKey,
            fulfillmentMode: item.fulfillmentMode,
            extras: item.extras,
            pickupLocationId: item.pickupLocationId,
          }));
          
          // PROOF LOG: Show exact items received from backend
          console.log('[CART_SYNC PROOF] Backend cart items (normalized):');
          normalizedItems.forEach((item, i) => {
            console.log(`   Item ${i}: offerId=${item.offerId}, name=${item.name}, kitchenName=${item.kitchenName}, qty=${item.quantity}, portionKey=${item.portionKey}`);
          });
          
          return normalizedItems;
        } else {
          console.log('[CART_SYNC] ⚠️ Invalid response format:', data);
        }
      } else {
        console.log('[CART_SYNC] ❌ Fetch failed with status:', response.status);
      }
    } catch (error) {
      console.error('[CART_SYNC] ❌ Failed to fetch from backend:', error);
    }
    return null;
  };

  // UNIFIED CART: Sync on cart change (debounced)
  useEffect(() => {
    if (!currentUserId) return;

    const timeoutId = setTimeout(() => {
      console.log('[CART_SYNC] Syncing cart to backend:', cart.length, 'items');
      syncCartToBackend(cart);
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [cart, currentUserId, countryCode]);

  // UNIFIED CART: Fetch from backend on load/login (ONLY if local cart is empty or stale)
  useEffect(() => {
    if (!currentUserId) return;

    const loadBackendCart = async () => {
      console.log('[CART_SYNC] Loading backend cart for user:', currentUserId);
      const backendItems = await fetchCartFromBackend();
      
      if (backendItems && backendItems.length > 0) {
        console.log('[CART_SYNC] Backend cart has', backendItems.length, 'items');
        console.log('[CART_SYNC] Backend items:', backendItems);
        
        // Backend is the source of truth — replace local cart entirely.
        // This is the correct cross-platform sync behavior:
        //   - Items added on mobile will appear on web after reload.
        //   - Items removed on mobile will disappear from web after reload.
        // Guest-to-login transition safety: if this effect fires before the 1 s
        // debounced sync has pushed guest items to the backend, the local cart
        // already holds those items (set by the auth handler) and the backend
        // fetch will return them after the sync completes on next load.
        setCart(prev => {
          console.log('[CART_SYNC] ✅ Backend cart replacing local cart:', backendItems.length, 'items');
          return backendItems;
        });
      } else {
        // Backend returned empty. Do NOT wipe local cart — the user may have guest
        // items not yet synced, or this may be a transient network issue.
        // Local items will sync to backend on the next write operation.
        console.log('[CART_SYNC] ⚠️ Backend cart is empty or fetch failed — preserving local cart');
      }
    };

    loadBackendCart();
  }, [currentUserId, countryCode]);

  const value = {
    countryCode,
    updateCountry,
    cart: filteredCart, // Use filtered cart
    setCart, // Expose setCart for Cart page to update after refresh
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchCartFromBackend, // Expose for Cart page refresh-on-enter
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

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const CountryContext = createContext();

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};

export const CountryProvider = ({ children }) => {
  // ISO codes: EG, SA, AE, KW, QA
  const [countryCode, setCountryCode] = useState(localStorage.getItem('platformCountryCode') || 'EG');
  
  // Cart management: Store carts keyed by country code
  const [cartsByCountry, setCartsByCountry] = useState(() => {
    const saved = localStorage.getItem('cartsByCountry');
    return saved ? JSON.parse(saved) : {};
  });

  const isFirstRender = useRef(true);

  // Current active cart - filter out invalid items (null cookId/kitchenId)
  const rawCart = cartsByCountry[countryCode] || [];
  const cart = rawCart.filter(item => {
    const hasValidCookId = item.cookId || item.kitchenId;
    return hasValidCookId && String(hasValidCookId) !== 'null' && String(hasValidCookId) !== 'undefined';
  });

  // Persist carts whenever they change
  useEffect(() => {
    localStorage.setItem('cartsByCountry', JSON.stringify(cartsByCountry));
    localStorage.setItem('foodie_cart', JSON.stringify(cart)); // Legacy support
  }, [cartsByCountry, cart]);

  useEffect(() => {
    // Only set on initial mount if not present
    if (!localStorage.getItem('platformCountryCode')) {
      localStorage.setItem('platformCountryCode', countryCode);
    }
    window.dispatchEvent(new Event('countryUpdated'));
    window.dispatchEvent(new Event('cartUpdated')); // Trigger re-renders
  }, [countryCode]);

  const updateCountry = (code) => {
    const normalizedCode = code.toUpperCase().trim();
    if (['EG', 'SA', 'AE', 'KW', 'QA'].includes(normalizedCode)) {
      if (normalizedCode !== countryCode) {
        setCountryCode(normalizedCode);
        // Persist to storage only on user action
        localStorage.setItem('platformCountryCode', normalizedCode);
        console.log(`🌍 Switched to ${normalizedCode} context`);
      }
    }
  };

  // Cart operations
  const addToCart = (item) => {
    setCartsByCountry(prev => {
      const currentCart = prev[countryCode] || [];
      const updatedCart = [...currentCart, { ...item, countryCode }];
      return { ...prev, [countryCode]: updatedCart };
    });
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const updateQuantity = (cookId, offerId, quantity) => {
    setCartsByCountry(prev => {
      const currentCart = prev[countryCode] || [];
      const updatedCart = currentCart.map(item => {
        const itemCookId = String(item.cookId || item.kitchenId);
        const targetCookId = String(cookId);
        const itemOfferId = String(item.offerId || item.dishId);
        const targetOfferId = String(offerId);
        if (itemCookId === targetCookId && itemOfferId === targetOfferId) {
          return { ...item, quantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
      return { ...prev, [countryCode]: updatedCart };
    });
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeFromCart = (cookId, offerId) => {
    setCartsByCountry(prev => {
      const currentCart = prev[countryCode] || [];
      const updatedCart = currentCart.filter(item => {
        const itemCookId = String(item.cookId || item.kitchenId);
        const targetCookId = String(cookId);
        const itemOfferId = String(item.offerId || item.dishId);
        const targetOfferId = String(offerId);
        return !(itemCookId === targetCookId && itemOfferId === targetOfferId);
      });
      return { ...prev, [countryCode]: updatedCart };
    });
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const clearCart = () => {
    setCartsByCountry(prev => ({ ...prev, [countryCode]: [] }));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const value = {
    countryCode,
    updateCountry,
    cart,
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

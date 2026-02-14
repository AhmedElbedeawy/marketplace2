import React, { createContext, useContext, useState, useEffect } from 'react';
import translationsData from '../i18n-translations.json';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Get initial language from localStorage or default to 'ar' (Arabic)
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('appLanguage');
    return savedLanguage || 'ar';
  });

  // Toggle between 'en' and 'ar'
  const toggleLanguage = () => {
    setLanguage((prevLang) => {
      const newLang = prevLang === 'en' ? 'ar' : 'en';
      localStorage.setItem('appLanguage', newLang);
      return newLang;
    });
  };

  // Set specific language
  const setAppLanguage = (lang) => {
    if (lang === 'en' || lang === 'ar') {
      setLanguage(lang);
      localStorage.setItem('appLanguage', lang);
    }
  };

  // Update document direction and handle RTL layout when language changes
  useEffect(() => {
    const isRTL = language === 'ar';
    
    // Set document attributes
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Add/remove body classes for RTL/LTR styling
    if (isRTL) {
      document.body.classList.add('rtl-mode');
      document.body.classList.remove('ltr-mode');
    } else {
      document.body.classList.add('ltr-mode');
      document.body.classList.remove('rtl-mode');
    }
    
    // Trigger resize event to recalculate any position-dependent elements
    window.dispatchEvent(new Event('resize'));
  }, [language]);

  // Translation strings - Complete UI coverage
  const translations = translationsData;
  
  const t = (key, options = {}) => {
    // Handle nested keys like 'notifications.newOrder'
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }

    if (options.returnObjects) {
      return value || {};
    }
    return value || key;
  };

  // Format date based on language
  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    if (language === 'ar') {
      return new Intl.DateTimeFormat('ar-EG', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(dateObj);
    }
    return new Intl.DateTimeFormat('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).format(dateObj);
  };

  // Format currency based on language
  const formatCurrency = (amount) => {
    if (language === 'ar') {
      return new Intl.NumberFormat('ar-EG', { 
        style: 'currency', 
        currency: 'SAR' 
      }).format(amount);
    }
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'SAR',
      currencyDisplay: 'code'
    }).format(amount).replace('SAR', 'SAR ');
  };

  // Format number based on language
  const formatNumber = (num) => {
    if (language === 'ar') {
      return new Intl.NumberFormat('ar-EG').format(num);
    }
    return new Intl.NumberFormat('en-US').format(num);
  };

  const value = {
    language,
    toggleLanguage,
    setLanguage: setAppLanguage,
    isRTL: language === 'ar',
    t,
    formatDate,
    formatCurrency,
    formatNumber,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

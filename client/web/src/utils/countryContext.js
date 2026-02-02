/**
 * Country Context Utility (Web)
 * Single source of truth for country-to-currency mapping and other defaults.
 */

export const getCountryContext = (countryCode) => {
  // 1. Normalize input
  const code = (countryCode || 'SA').toUpperCase().trim();
  
  // 2. Define the static mapping (Single Source of Truth)
  const mapping = {
    'SA': { 
      currencyCode: 'SAR',
      countryName: 'Saudi Arabia',
      defaultVatRate: 15
    },
    'EG': { 
      currencyCode: 'EGP',
      countryName: 'Egypt',
      defaultVatRate: 14
    },
    'AE': { 
      currencyCode: 'AED',
      countryName: 'Emirates',
      defaultVatRate: 5
    },
    'KW': { 
      currencyCode: 'KWD',
      countryName: 'Kuwait',
      defaultVatRate: 0
    },
    'QA': { 
      currencyCode: 'QAR',
      countryName: 'Qatar',
      defaultVatRate: 0
    }
  };
  
  // 3. Resolve context (Strict lookup)
  const context = mapping[code] || mapping['SA'];
  
  return {
    countryCode: code,
    currencyCode: context.currencyCode,
    countryName: context.countryName,
    defaultVatRate: context.defaultVatRate
  };
};

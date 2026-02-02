class CountryContext {
  final String countryCode;
  final String currencyCode;
  final String countryName;
  final double defaultVatRate;

  CountryContext({
    required this.countryCode,
    required this.currencyCode,
    required this.countryName,
    required this.defaultVatRate,
  });
}

class CountryContextHelper {
  static CountryContext getContext(String? code) {
    // 1. Normalize input
    final normalizedCode = (code ?? 'SA').toUpperCase().trim();
    
    // 2. Define the static mapping (Single Source of Truth)
    final Map<String, CountryContext> mapping = {
      'SA': CountryContext(
        countryCode: 'SA',
        currencyCode: 'SAR',
        countryName: 'Saudi Arabia',
        defaultVatRate: 15,
      ),
      'EG': CountryContext(
        countryCode: 'EG',
        currencyCode: 'EGP',
        countryName: 'Egypt',
        defaultVatRate: 14,
      ),
      'AE': CountryContext(
        countryCode: 'AE',
        currencyCode: 'AED',
        countryName: 'United Arab Emirates',
        defaultVatRate: 5,
      ),
      'KW': CountryContext(
        countryCode: 'KW',
        currencyCode: 'KWD',
        countryName: 'Kuwait',
        defaultVatRate: 0,
      ),
      'QA': CountryContext(
        countryCode: 'QA',
        currencyCode: 'QAR',
        countryName: 'Qatar',
        defaultVatRate: 0,
      ),
    };

    // 3. Resolve context (Strict lookup with safety fallback)
    return mapping[normalizedCode] ?? CountryContext(
      countryCode: normalizedCode,
      currencyCode: 'USD',
      countryName: normalizedCode,
      defaultVatRate: 0,
    );
  }
}

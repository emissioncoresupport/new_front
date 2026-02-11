/**
 * EU CBAM Default Values - December 2025 Update
 * Per Regulation 2025/2083 - Country-specific defaults with mark-ups
 * 
 * Mark-up levels:
 * - Low-risk countries (with carbon pricing): 10% mark-up
 * - Medium-risk countries: 20% mark-up
 * - High-risk countries (no carbon pricing): 30% mark-up
 */

export const EU_DEFAULT_VALUES_2025 = {
  // Iron & Steel - CN codes 7206-7229
  'iron_steel': {
    'BF-BOF': {
      direct: 1.85,
      indirect: 0.32,
      base: true
    },
    'DRI-EAF': {
      direct: 0.95,
      indirect: 0.45,
      base: true
    },
    'Scrap-EAF': {
      direct: 0.15,
      indirect: 0.38,
      base: true
    }
  },
  
  // Aluminium - CN codes 7601-7616
  'aluminium': {
    'Primary_electrolysis': {
      direct: 2.8,
      indirect: 8.2,
      base: true
    },
    'Secondary_from_scrap': {
      direct: 0.4,
      indirect: 0.6,
      base: true
    }
  },
  
  // Cement - CN codes 2507-2523
  'cement': {
    'Other': {
      direct: 0.766,
      indirect: 0.045,
      base: true
    }
  },
  
  // Fertilizers - CN codes 2808-3105
  'fertilizers': {
    'Other': {
      direct: 1.2,
      indirect: 0.3,
      base: true
    }
  },
  
  // Hydrogen - CN code 2804
  'hydrogen': {
    'Grey_hydrogen': {
      direct: 10.5,
      indirect: 0.8,
      base: true
    },
    'Blue_hydrogen': {
      direct: 2.1,
      indirect: 0.6,
      base: true
    },
    'Green_hydrogen': {
      direct: 0.1,
      indirect: 9.2,
      base: true
    }
  },
  
  // Electricity - CN code 2716
  'electricity': {
    'Other': {
      direct: 0.0,
      indirect: 0.385, // EU average grid intensity
      base: true
    }
  }
};

/**
 * Country-specific mark-up rates per Regulation 2025/2083
 */
export const COUNTRY_MARKUP_RATES = {
  // Low-risk (10% mark-up) - Countries with carbon pricing systems
  'CN': 0.10,  // China - National ETS
  'GB': 0.10,  // UK - UK ETS
  'CH': 0.10,  // Switzerland - ETS
  'KR': 0.10,  // South Korea - K-ETS
  'NZ': 0.10,  // New Zealand - NZ ETS
  
  // Medium-risk (20% mark-up)
  'TR': 0.20,  // Turkey
  'ZA': 0.20,  // South Africa
  'MX': 0.20,  // Mexico
  'BR': 0.20,  // Brazil
  'AR': 0.20,  // Argentina
  'CL': 0.20,  // Chile
  'TH': 0.20,  // Thailand
  'MY': 0.20,  // Malaysia
  'ID': 0.20,  // Indonesia
  'PH': 0.20,  // Philippines
  'VN': 0.20,  // Vietnam
  'EG': 0.20,  // Egypt
  'MA': 0.20,  // Morocco
  
  // High-risk (30% mark-up) - Countries without carbon pricing
  'IN': 0.30,  // India
  'RU': 0.30,  // Russia
  'UA': 0.30,  // Ukraine
  'KZ': 0.30,  // Kazakhstan
  'SA': 0.30,  // Saudi Arabia
  'AE': 0.30,  // UAE
  'QA': 0.30,  // Qatar
  'IQ': 0.30,  // Iraq
  'NG': 0.30,  // Nigeria
  'DZ': 0.30,  // Algeria
  'PK': 0.30,  // Pakistan
  'BD': 0.30,  // Bangladesh
  'RS': 0.30,  // Serbia
  'BA': 0.30,  // Bosnia
  'BY': 0.30,  // Belarus
};

/**
 * Get default emissions with country-specific mark-up
 */
export function getDefaultEmissions(cnCode, productionRoute, countryOfOrigin) {
  // Determine goods category from CN code
  const category = getCategoryFromCNCode(cnCode);
  if (!category) return null;
  
  // Get base default values
  const categoryDefaults = EU_DEFAULT_VALUES_2025[category];
  if (!categoryDefaults) return null;
  
  const routeDefaults = categoryDefaults[productionRoute] || categoryDefaults['Other'];
  if (!routeDefaults) return null;
  
  // Apply country-specific mark-up
  const markupRate = COUNTRY_MARKUP_RATES[countryOfOrigin] || 0.30; // Default to 30% if country not listed
  
  const directWithMarkup = routeDefaults.direct * (1 + markupRate);
  const indirectWithMarkup = routeDefaults.indirect * (1 + markupRate);
  
  return {
    direct_emissions: parseFloat(directWithMarkup.toFixed(3)),
    indirect_emissions: parseFloat(indirectWithMarkup.toFixed(3)),
    markup_applied: markupRate,
    base_direct: routeDefaults.direct,
    base_indirect: routeDefaults.indirect,
    category: category,
    production_route: productionRoute
  };
}

/**
 * Map CN code to goods category
 */
function getCategoryFromCNCode(cnCode) {
  if (!cnCode) return null;
  
  const code = cnCode.replace(/\s/g, '');
  const prefix = code.substring(0, 4);
  
  // Iron & Steel: 7206-7229
  if (prefix >= '7206' && prefix <= '7229') return 'iron_steel';
  
  // Aluminium: 7601-7616
  if (prefix >= '7601' && prefix <= '7616') return 'aluminium';
  
  // Cement: 2507-2523
  if (prefix >= '2507' && prefix <= '2523') return 'cement';
  
  // Fertilizers: 2808-3105
  if ((prefix >= '2808' && prefix <= '2850') || (prefix >= '3102' && prefix <= '3105')) {
    return 'fertilizers';
  }
  
  // Hydrogen: 2804
  if (prefix === '2804') return 'hydrogen';
  
  // Electricity: 2716
  if (prefix === '2716') return 'electricity';
  
  return null;
}

/**
 * Get markup description for UI
 */
export function getMarkupDescription(countryOfOrigin) {
  const rate = COUNTRY_MARKUP_RATES[countryOfOrigin];
  if (!rate) return '30% mark-up (high-risk country without carbon pricing)';
  
  if (rate === 0.10) return '10% mark-up (country with carbon pricing system)';
  if (rate === 0.20) return '20% mark-up (medium-risk country)';
  if (rate === 0.30) return '30% mark-up (high-risk country without carbon pricing)';
  
  return `${(rate * 100).toFixed(0)}% mark-up`;
}
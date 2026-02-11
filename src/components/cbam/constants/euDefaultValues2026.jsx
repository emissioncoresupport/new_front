/**
 * EU CBAM Default Values - 2026 Definitive Regime
 * Per Commission Implementing Regulation (EU) 2025/3089 - December 17, 2025
 * 
 * CRITICAL CHANGES FOR 2026:
 * - Updated emission intensities based on 2024 production data
 * - Country-specific mark-ups now embedded per origin
 * - New CN codes added (expanded scope)
 * - Precursor emission factors updated
 */

export const EU_DEFAULT_VALUES_2026 = {
  // Iron & Steel - CN codes 7206-7229 + NEW: 7301-7326 (expanded scope 2026)
  'iron_steel': {
    'BF-BOF': {
      direct: 1.92,      // Updated from 1.85 (2025)
      indirect: 0.35,    // Updated from 0.32
      precursors: 0.18,  // NEW: embedded precursor emissions
      base: true
    },
    'DRI-EAF': {
      direct: 0.98,      // Updated from 0.95
      indirect: 0.48,    // Updated from 0.45
      precursors: 0.12,
      base: true
    },
    'Scrap-EAF': {
      direct: 0.16,      // Updated from 0.15
      indirect: 0.41,    // Updated from 0.38
      precursors: 0.03,
      base: true
    },
    'Sinter': {          // NEW production route 2026
      direct: 0.25,
      indirect: 0.15,
      precursors: 0.05,
      base: true
    }
  },
  
  // Aluminium - CN codes 7601-7616
  'aluminium': {
    'Primary_electrolysis': {
      direct: 2.95,      // Updated from 2.8
      indirect: 8.45,    // Updated from 8.2
      precursors: 0.35,
      base: true
    },
    'Secondary_from_scrap': {
      direct: 0.42,      // Updated from 0.4
      indirect: 0.65,    // Updated from 0.6
      precursors: 0.08,
      base: true
    },
    'Semi_finished': {   // NEW 2026
      direct: 1.2,
      indirect: 3.1,
      precursors: 0.45,
      base: true
    }
  },
  
  // Cement - CN codes 2507-2523
  'cement': {
    'Clinker': {
      direct: 0.778,     // Updated from 0.766
      indirect: 0.048,   // Updated from 0.045
      precursors: 0.02,
      base: true
    },
    'Cement_with_additions': { // NEW 2026
      direct: 0.625,
      indirect: 0.042,
      precursors: 0.15,
      base: true
    }
  },
  
  // Fertilizers - CN codes 2808-3105
  'fertilizers': {
    'Ammonia': {
      direct: 2.15,      // NEW specific route
      indirect: 0.45,
      precursors: 0.08,
      base: true
    },
    'Nitric_acid': {
      direct: 1.85,
      indirect: 0.38,
      precursors: 0.12,
      base: true
    },
    'Urea': {
      direct: 1.35,
      indirect: 0.32,
      precursors: 0.25,
      base: true
    },
    'Other': {
      direct: 1.28,      // Updated from 1.2
      indirect: 0.33,    // Updated from 0.3
      precursors: 0.15,
      base: true
    }
  },
  
  // Hydrogen - CN code 2804
  'hydrogen': {
    'Grey_hydrogen_SMR': {
      direct: 10.8,      // Updated from 10.5
      indirect: 0.85,    // Updated from 0.8
      precursors: 0.15,
      base: true
    },
    'Blue_hydrogen_CCS': {
      direct: 2.25,      // Updated from 2.1
      indirect: 0.65,    // Updated from 0.6
      precursors: 0.08,
      base: true
    },
    'Green_hydrogen_electrolysis': {
      direct: 0.12,      // Updated from 0.1
      indirect: 9.5,     // Updated from 9.2
      precursors: 0.0,
      base: true
    }
  },
  
  // Electricity - CN code 2716
  'electricity': {
    'Coal': {
      direct: 0.0,
      indirect: 0.82,    // NEW: specific source
      precursors: 0.0,
      base: true
    },
    'Gas': {
      direct: 0.0,
      indirect: 0.38,
      precursors: 0.0,
      base: true
    },
    'Renewable': {
      direct: 0.0,
      indirect: 0.05,
      precursors: 0.0,
      base: true
    },
    'Grid_average': {   // DEFAULT
      direct: 0.0,
      indirect: 0.398,   // Updated EU grid 2026 (down from 0.385)
      precursors: 0.0,
      base: true
    }
  },

  // NEW 2026: Organic Chemicals - CN codes 2901-2942 (Phase 2 expansion)
  'organic_chemicals': {
    'Steam_cracking': {
      direct: 0.95,
      indirect: 0.65,
      precursors: 0.22,
      base: true
    },
    'Other': {
      direct: 0.75,
      indirect: 0.45,
      precursors: 0.18,
      base: true
    }
  },

  // NEW 2026: Polymers - CN codes 3901-3914
  'polymers': {
    'Virgin_plastic': {
      direct: 1.85,
      indirect: 0.95,
      precursors: 0.65,
      base: true
    },
    'Recycled_plastic': {
      direct: 0.45,
      indirect: 0.38,
      precursors: 0.12,
      base: true
    }
  }
};

/**
 * Country-specific mark-up rates for 2026
 * Per Regulation (EU) 2025/3089 Art. 7.3
 * 
 * UPDATED December 2025: New countries added, risk classifications reviewed
 */
export const COUNTRY_MARKUP_RATES_2026 = {
  // Low-risk (10% mark-up) - Countries with operational carbon pricing >= €50/tCO2
  'CN': 0.10,  // China - National ETS expanded 2025
  'GB': 0.10,  // UK - UK ETS
  'CH': 0.10,  // Switzerland - ETS link with EU
  'KR': 0.10,  // South Korea - K-ETS
  'NZ': 0.10,  // New Zealand - NZ ETS
  'CA': 0.10,  // Canada - Federal carbon pricing (NEW 2026)
  'SG': 0.10,  // Singapore - Carbon tax (NEW 2026)
  
  // Medium-risk (20% mark-up) - Countries with partial/developing carbon pricing
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
  'CO': 0.20,  // Colombia (NEW)
  'PE': 0.20,  // Peru (NEW)
  
  // High-risk (30% mark-up) - No carbon pricing mechanism
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
  'US': 0.30,  // USA - No federal carbon pricing
  'AU': 0.30,  // Australia - Carbon tax repealed
  'JP': 0.30,  // Japan - Voluntary ETS only
};

/**
 * @deprecated Use CBAMPhaseInReference.js instead
 * 2026 CBAM Factor Phase-In Schedule
 * Per Art. 31 of Regulation (EU) 2023/956
 * 
 * NOTE: These values represent FREE ALLOCATION REMAINING, not chargeable %
 * Certificates = Chargeable Emissions (1:1), NOT Emissions × Factor
 */
export const CBAM_FACTOR_SCHEDULE = {
  2026: 0.975,   // 97.5% free allocation REMAINING
  2027: 0.95,    // 95%
  2028: 0.90,    // 90%
  2029: 0.775,   // 77.5%
  2030: 0.4875,  // 48.75%
  2031: 0.29,    // 29%
  2032: 0.1225,  // 12.25%
  2033: 0.05,    // 5%
  2034: 0.0      // 0% (full phase-in)
};

/**
 * Get 2026 default emissions with country mark-up and precursors
 */
export function getDefaultEmissions2026(cnCode, productionRoute, countryOfOrigin) {
  const category = getCategoryFromCNCode(cnCode);
  if (!category) return null;
  
  const categoryDefaults = EU_DEFAULT_VALUES_2026[category];
  if (!categoryDefaults) return null;
  
  const routeDefaults = categoryDefaults[productionRoute] || categoryDefaults['Other'];
  if (!routeDefaults) return null;
  
  // Apply country-specific mark-up
  const markupRate = COUNTRY_MARKUP_RATES_2026[countryOfOrigin] || 0.30;
  
  const directWithMarkup = routeDefaults.direct * (1 + markupRate);
  const indirectWithMarkup = routeDefaults.indirect * (1 + markupRate);
  const precursorsWithMarkup = (routeDefaults.precursors || 0) * (1 + markupRate);
  
  return {
    direct_emissions: parseFloat(directWithMarkup.toFixed(3)),
    indirect_emissions: parseFloat(indirectWithMarkup.toFixed(3)),
    precursor_emissions: parseFloat(precursorsWithMarkup.toFixed(3)),
    total_specific: parseFloat((directWithMarkup + indirectWithMarkup + precursorsWithMarkup).toFixed(3)),
    markup_applied: markupRate,
    base_direct: routeDefaults.direct,
    base_indirect: routeDefaults.indirect,
    base_precursors: routeDefaults.precursors || 0,
    category: category,
    production_route: productionRoute,
    year: 2026
  };
}

/**
 * Map CN code to goods category (2026 expanded scope)
 */
function getCategoryFromCNCode(cnCode) {
  if (!cnCode) return null;
  
  const code = cnCode.replace(/\s/g, '');
  const prefix = code.substring(0, 4);
  
  // Iron & Steel: 7206-7229 + 7301-7326 (EXPANDED 2026)
  if ((prefix >= '7206' && prefix <= '7229') || (prefix >= '7301' && prefix <= '7326')) {
    return 'iron_steel';
  }
  
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

  // NEW 2026: Organic Chemicals - 2901-2942
  if (prefix >= '2901' && prefix <= '2942') return 'organic_chemicals';

  // NEW 2026: Polymers - 3901-3914
  if (prefix >= '3901' && prefix <= '3914') return 'polymers';
  
  return null;
}

/**
 * Get markup description for UI
 */
export function getMarkupDescription2026(countryOfOrigin) {
  const rate = COUNTRY_MARKUP_RATES_2026[countryOfOrigin];
  if (!rate) return '30% mark-up (high-risk: no carbon pricing)';
  
  if (rate === 0.10) return '10% mark-up (low-risk: strong carbon pricing ≥€50/tCO2)';
  if (rate === 0.20) return '20% mark-up (medium-risk: developing carbon pricing)';
  if (rate === 0.30) return '30% mark-up (high-risk: no carbon pricing mechanism)';
  
  return `${(rate * 100).toFixed(0)}% mark-up`;
}

/**
 * Calculate CBAM certificates required for 2026
 * CORRECTED: Certificates = Chargeable Emissions (1:1)
 */
export function calculateCertificates2026(totalEmbeddedEmissions, freeAllocationAdjustment = 0) {
  const chargeableEmissions = Math.max(0, totalEmbeddedEmissions - freeAllocationAdjustment);
  return chargeableEmissions; // Direct 1:1 ratio
}

/**
 * Get CBAM certificate price (quarterly average of EU ETS)
 * In production: fetch from EU ETS auction platform API
 */
export function getCertificatePrice2026(quarter) {
  // Mock prices - replace with actual EU ETS API integration
  const etsQuarterlyAvg = {
    'Q1-2026': 87.50,  // EUR/tCO2e
    'Q2-2026': 89.20,
    'Q3-2026': 91.10,
    'Q4-2026': 88.90
  };
  
  return etsQuarterlyAvg[`Q${quarter}-2026`] || 88.00; // Fallback avg
}
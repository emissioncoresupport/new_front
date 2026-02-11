/**
 * OFFICIAL CBAM DEFAULT VALUES WITH MARKUPS - 2026 DEFINITIVE REGIME
 * Source: Commission Implementing Regulation (EU) 2025/8552
 * Effective: January 1, 2026
 * 
 * CRITICAL: Default values include phased markup schedule:
 * - 2026: 10% markup
 * - 2027: 20% markup  
 * - 2028: 30% markup
 * 
 * Per C(2025) 8552 Art. 1 & Annexes I-IV
 */

/**
 * Phased markup schedule per C(2025) 8552
 */
export const DEFAULT_VALUE_MARKUP_SCHEDULE = {
  2026: 0.10,  // 10% markup
  2027: 0.20,  // 20% markup
  2028: 0.30,  // 30% markup
  2029: 0.30,  // Continues at 30%
  2030: 0.30
};

/**
 * Apply year-specific markup to base default value
 */
export function applyDefaultValueMarkup(baseValue, reportingYear) {
  const markup = DEFAULT_VALUE_MARKUP_SCHEDULE[reportingYear] || 0.10;
  return baseValue * (1 + markup);
}

/**
 * BASE DEFAULT VALUES (before markup)
 * These are multiplied by (1 + markup%) based on reporting year
 */
export const BASE_DEFAULT_VALUES_2026 = {
  // IRON & STEEL - Annex I Table A1
  iron_steel: {
    '260111': { base: 0.08, description: 'Iron ore pellets', country_specific: true },
    '260112': { base: 0.08, description: 'Iron ore agglomerated', country_specific: true },
    '72011000': { base: 1.85, description: 'Pig iron', country_specific: true },
    '72012000': { base: 1.85, description: 'Spiegeleisen', country_specific: true },
    '72031000': { base: 1.95, description: 'Direct reduced iron', country_specific: true },
    '72061000': { base: 2.10, description: 'Iron/steel ingots', country_specific: true },
    '72081000': { base: 1.95, description: 'Hot-rolled coil', country_specific: true },
    '72082500': { base: 1.95, description: 'Hot-rolled strip', country_specific: true },
    '72111300': { base: 2.05, description: 'Cold-rolled coil', country_specific: true },
  },
  
  // ALUMINIUM - Annex I Table A2
  aluminium: {
    '76011000': { base: 11.50, description: 'Primary aluminium unwrought', country_specific: true },
    '76012000': { base: 0.65, description: 'Secondary aluminium unwrought', country_specific: true },
    '76041000': { base: 11.70, description: 'Aluminium bars/rods (primary)', country_specific: true },
    '76042100': { base: 0.75, description: 'Aluminium bars/rods (secondary)', country_specific: true },
    '76061100': { base: 11.85, description: 'Aluminium sheets (primary)', country_specific: true },
    '76061200': { base: 0.80, description: 'Aluminium sheets (secondary)', country_specific: true },
  },
  
  // CEMENT - Annex I Table A3
  cement: {
    '25231000': { base: 0.95, description: 'Clinker', country_specific: true },
    '25232100': { base: 0.88, description: 'Portland cement CEM I', country_specific: true },
    '25232900': { base: 0.75, description: 'Portland cement CEM II/III', country_specific: true },
  },
  
  // FERTILIZERS - Annex I Table A4 (LOWER MARKUP)
  fertilizers: {
    '28092000': { base: 2.80, description: 'Ammonia', country_specific: true, lower_markup: true },
    '280810': { base: 0.42, description: 'Nitric acid', country_specific: true, lower_markup: true },
    '31021000': { base: 1.55, description: 'Urea', country_specific: true, lower_markup: true },
    '31022100': { base: 2.15, description: 'Ammonium nitrate', country_specific: true, lower_markup: true },
    '31051000': { base: 1.85, description: 'NPK fertilizers', country_specific: true, lower_markup: true },
  },
  
  // HYDROGEN - Annex I Table A5
  hydrogen: {
    '28041000': { base: 14.50, description: 'Hydrogen (grey)', country_specific: true },
    '28041000_blue': { base: 3.20, description: 'Hydrogen (blue/CCS)', country_specific: true },
    '28041000_green': { base: 0.10, description: 'Hydrogen (green)', country_specific: false },
  },
  
  // ELECTRICITY - Annex III (Grid emission factors, 5-year average)
  electricity: {
    'grid_default': { base: 0.45, description: 'Grid electricity (EU avg)', country_specific: true }
  }
};

/**
 * Country-specific default values with HIGH emission intensity
 * Used when precursor country is unknown (Annex IV)
 * Per C(2025) 8552 Art. 1(5)
 */
export const UNKNOWN_ORIGIN_DEFAULTS = {
  iron_steel: {
    pig_iron: 2.50,        // Highest among steel precursors
    dri: 2.80,
    sinter: 0.25
  },
  aluminium: {
    primary: 15.00,        // Highest among aluminium
    secondary: 1.20
  },
  cement: {
    clinker: 1.20          // Highest among cement
  },
  fertilizers: {
    ammonia: 3.80,         // Highest among fertilizers
    nitric_acid: 0.55
  }
};

/**
 * Get default value with markup applied
 * @param {string} cn_code - 8-digit CN code
 * @param {number} reportingYear - Year (2026, 2027, etc.)
 * @param {string} category - Product category
 * @returns {Object} { value, base, markup_percent, description }
 */
export function getDefaultValueWithMarkup(cn_code, reportingYear, category) {
  // Find base value
  let baseData = null;
  
  if (category && BASE_DEFAULT_VALUES_2026[category]) {
    baseData = BASE_DEFAULT_VALUES_2026[category][cn_code];
  }
  
  if (!baseData) {
    // Try to find in any category
    for (const cat of Object.keys(BASE_DEFAULT_VALUES_2026)) {
      if (BASE_DEFAULT_VALUES_2026[cat][cn_code]) {
        baseData = BASE_DEFAULT_VALUES_2026[cat][cn_code];
        break;
      }
    }
  }
  
  if (!baseData) {
    return {
      value: null,
      base: null,
      markup_percent: 0,
      description: 'CN code not found in default values',
      error: true
    };
  }
  
  // Determine markup
  let markupPercent = DEFAULT_VALUE_MARKUP_SCHEDULE[reportingYear] || 0.10;
  
  // EXCEPTION: Fertilizers use lower markup (C(2025) 8552 whereas (6))
  if (baseData.lower_markup) {
    markupPercent = Math.max(0.05, markupPercent * 0.5); // Half the standard markup
  }
  
  const valueWithMarkup = baseData.base * (1 + markupPercent);
  
  return {
    value: valueWithMarkup,
    base: baseData.base,
    markup_percent: markupPercent * 100,
    description: baseData.description,
    country_specific: baseData.country_specific,
    regulation: 'C(2025) 8552'
  };
}

/**
 * Get default value for precursor with unknown origin
 * Uses highest emission intensity per category (Annex IV)
 */
export function getUnknownOriginDefault(category, precursorType) {
  if (UNKNOWN_ORIGIN_DEFAULTS[category] && UNKNOWN_ORIGIN_DEFAULTS[category][precursorType]) {
    return {
      value: UNKNOWN_ORIGIN_DEFAULTS[category][precursorType],
      description: `Highest default for ${category} - ${precursorType}`,
      regulation: 'C(2025) 8552 Art. 1(5) & Annex IV'
    };
  }
  
  return {
    value: null,
    error: 'Unknown precursor category/type',
    regulation: 'C(2025) 8552 Art. 1(5)'
  };
}

export default {
  BASE_DEFAULT_VALUES_2026,
  DEFAULT_VALUE_MARKUP_SCHEDULE,
  UNKNOWN_ORIGIN_DEFAULTS,
  applyDefaultValueMarkup,
  getDefaultValueWithMarkup,
  getUnknownOriginDefault
};
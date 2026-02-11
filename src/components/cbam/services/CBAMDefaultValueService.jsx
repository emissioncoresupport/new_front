/**
 * CBAM Default Value Service
 * Handles default values with phased markup per C(2025) 8552
 * 2026: 10% markup, 2027: 20%, 2028+: 30%
 */

import { 
  BASE_DEFAULT_VALUES_2026, 
  DEFAULT_VALUE_MARKUP_SCHEDULE,
  UNKNOWN_ORIGIN_DEFAULTS 
} from '../constants/cbam2026DefaultValues';

export class CBAMDefaultValueService {
  
  /**
   * Get default value with markup applied
   * @param {string} cn_code - 8-digit CN code
   * @param {number} reportingYear - Reporting year
   * @param {string} category - Product category (optional)
   * @returns {Object} { value, base, markup_percent, description }
   */
  static getDefaultValueWithMarkup(cn_code, reportingYear, category = null) {
    // Find base default value
    const baseData = this.findBaseValue(cn_code, category);
    
    if (!baseData) {
      return {
        value: null,
        error: 'CN code not found in default values',
        cn_code,
        regulation: 'C(2025) 8552'
      };
    }
    
    // Get markup for year
    const markupPercent = DEFAULT_VALUE_MARKUP_SCHEDULE[reportingYear] || 0.10;
    
    // EXCEPTION: Fertilizers use half markup (C(2025) 8552 whereas (6))
    const adjustedMarkup = baseData.lower_markup ? markupPercent * 0.5 : markupPercent;
    
    const valueWithMarkup = baseData.base * (1 + adjustedMarkup);
    
    return {
      value: valueWithMarkup,
      base: baseData.base,
      markup_percent: adjustedMarkup * 100,
      markup_absolute: baseData.base * adjustedMarkup,
      description: baseData.description,
      country_specific: baseData.country_specific,
      is_fertilizer_exception: baseData.lower_markup || false,
      regulation: 'C(2025) 8552 Art. 1'
    };
  }
  
  /**
   * Find base value from constants
   */
  static findBaseValue(cn_code, category) {
    // Try category-specific lookup first
    if (category && BASE_DEFAULT_VALUES_2026[category]) {
      const categoryData = BASE_DEFAULT_VALUES_2026[category][cn_code];
      if (categoryData) return categoryData;
    }
    
    // Search all categories
    for (const cat of Object.keys(BASE_DEFAULT_VALUES_2026)) {
      const data = BASE_DEFAULT_VALUES_2026[cat][cn_code];
      if (data) return data;
    }
    
    return null;
  }
  
  /**
   * Get default value for unknown origin precursor
   * Uses highest emission intensity per Annex IV
   */
  static getUnknownOriginDefault(category, precursorType) {
    if (!UNKNOWN_ORIGIN_DEFAULTS[category]) {
      return {
        value: null,
        error: 'Category not found',
        regulation: 'C(2025) 8552 Annex IV'
      };
    }
    
    const value = UNKNOWN_ORIGIN_DEFAULTS[category][precursorType];
    
    if (!value) {
      return {
        value: null,
        error: 'Precursor type not found',
        regulation: 'C(2025) 8552 Annex IV'
      };
    }
    
    return {
      value,
      description: `Highest default for ${category} - ${precursorType} (unknown origin)`,
      regulation: 'C(2025) 8552 Art. 1(5) & Annex IV'
    };
  }
  
  /**
   * Calculate markup schedule projection
   */
  static getMarkupSchedule() {
    return Object.entries(DEFAULT_VALUE_MARKUP_SCHEDULE).map(([year, markup]) => ({
      year: parseInt(year),
      markup_percent: markup * 100,
      description: `${(markup * 100).toFixed(0)}% markup`
    }));
  }
  
  /**
   * Check if CN code has default value
   */
  static hasDefaultValue(cn_code) {
    return this.findBaseValue(cn_code, null) !== null;
  }
  
  /**
   * Validate default value usage
   */
  static validateDefaultValueUsage(entryData) {
    const warnings = [];
    const errors = [];
    
    const method = entryData.calculation_method;
    const hasActualData = entryData.direct_emissions_specific > 0;
    const hasMonitoringPlan = !!entryData.monitoring_plan_id;
    
    // If using default values, certain fields recommended
    if (method === 'Default_values' || !hasActualData) {
      if (!entryData.production_route) {
        errors.push({
          field: 'production_route',
          message: 'Production route REQUIRED for default values',
          regulation: 'C(2025) 8552 Chapter 3',
          severity: 'high'
        });
      }
      
      if (!entryData.country_of_origin) {
        errors.push({
          field: 'country_of_origin',
          message: 'Country of origin REQUIRED',
          regulation: 'C(2025) 8552 Art. 1',
          severity: 'critical'
        });
      }
      
      // Recommend actual data over defaults
      warnings.push({
        message: 'Actual emissions data recommended over default values',
        regulation: 'C(2025) 8151 Art. 5',
        impact: 'lower_cost'
      });
    }
    
    // If using actual data, validate completeness
    if (method === 'EU_method' || hasActualData) {
      if (!entryData.installation_id) {
        errors.push({
          field: 'installation_id',
          message: 'Installation ID REQUIRED for actual data',
          regulation: 'C(2025) 8151 Art. 3',
          severity: 'critical'
        });
      }
      
      if (!hasMonitoringPlan) {
        warnings.push({
          field: 'monitoring_plan_id',
          message: 'Monitoring plan recommended for actual data',
          regulation: 'C(2025) 8151 Art. 8'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default CBAMDefaultValueService;
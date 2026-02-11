/**
 * CBAM Precursor Service
 * Handles embedded emissions from precursor materials
 * Per C(2025) 8151 Art. 13-15
 */

export class CBAMPrecursorService {
  
  /**
   * Calculate precursor emissions for a complex good
   * @param {Object} entryData - Import entry data
   * @param {Object} base44Client - Base44 SDK client (service role)
   * @returns {Promise<Object>} { total, precursors[], methodology }
   */
  static async calculatePrecursorEmissions(entryData, base44Client) {
    const cn_code = entryData.cn_code;
    const quantity = entryData.quantity || 0;
    const reportingYear = entryData.reporting_period_year || 2026;
    const productionRoute = entryData.production_route;
    
    // Check if entry has custom precursor data
    if (entryData.precursors_used && entryData.precursors_used.length > 0) {
      return this.calculateFromCustomPrecursors(entryData.precursors_used, reportingYear);
    }
    
    // Use default mappings from database
    const mappings = await this.fetchPrecursorMappings(cn_code, productionRoute, base44Client);
    
    if (mappings.length === 0) {
      return {
        total: 0,
        precursors: [],
        methodology: 'no_precursors',
        regulation: 'C(2025) 8151 Art. 13'
      };
    }
    
    const precursors = [];
    let total = 0;
    
    for (const mapping of mappings) {
      const precursorQty = quantity * (mapping.typical_percentage / 100);
      const precursorEmissions = precursorQty * mapping.emissions_intensity_factor;
      
      precursors.push({
        precursor_cn_code: mapping.precursor_cn,
        precursor_name: mapping.precursor_name,
        quantity_consumed: precursorQty,
        emissions_embedded: precursorEmissions,
        emissions_intensity_factor: mapping.emissions_intensity_factor,
        typical_percentage: mapping.typical_percentage,
        reporting_period_year: reportingYear,
        value_type: 'default',
        data_source: mapping.data_source || 'Default mapping',
        production_route_applicable: mapping.production_route_applicable
      });
      
      total += precursorEmissions;
    }
    
    return {
      total,
      precursors,
      methodology: 'default_mappings',
      regulation: 'C(2025) 8151 Art. 13-15'
    };
  }
  
  /**
   * Calculate from custom precursor data
   */
  static calculateFromCustomPrecursors(precursorsUsed, reportingYear) {
    const precursors = [];
    let total = 0;
    
    for (const p of precursorsUsed) {
      const emissions = p.emissions_embedded || 
        (p.quantity_consumed * (p.emissions_intensity_factor || 0));
      
      precursors.push({
        precursor_cn_code: p.precursor_cn_code,
        precursor_name: p.precursor_name || 'Unknown',
        quantity_consumed: p.quantity_consumed,
        emissions_embedded: emissions,
        emissions_intensity_factor: p.emissions_intensity_factor,
        reporting_period_year: p.reporting_period_year || reportingYear,
        value_type: p.value_type || 'actual',
        production_installation_id: p.production_installation_id
      });
      
      total += emissions;
    }
    
    return {
      total,
      precursors,
      methodology: 'actual_data',
      regulation: 'C(2025) 8151 Art. 14'
    };
  }
  
  /**
   * Fetch precursor mappings from database
   */
  static async fetchPrecursorMappings(cn_code, productionRoute, base44Client) {
    try {
      const mappings = await base44Client.entities.CBAMPrecursor.filter({
        final_product_cn: cn_code,
        active: true
      });
      
      // Filter by production route if specified
      if (productionRoute) {
        return mappings.filter(m => 
          !m.production_route_applicable || 
          m.production_route_applicable === productionRoute
        );
      }
      
      return mappings;
    } catch (error) {
      console.error('[Precursor] Error fetching mappings:', error);
      return [];
    }
  }
  
  /**
   * Validate precursor data per Art. 15
   */
  static validatePrecursorData(precursors) {
    const errors = [];
    const warnings = [];
    
    for (let i = 0; i < precursors.length; i++) {
      const p = precursors[i];
      
      // MANDATORY: Precursor CN code
      if (!p.precursor_cn_code) {
        errors.push({
          index: i,
          field: 'precursor_cn_code',
          message: 'Precursor CN code REQUIRED',
          regulation: 'Art. 15(1)(a)'
        });
      }
      
      // MANDATORY: Quantity consumed
      if (!p.quantity_consumed || p.quantity_consumed <= 0) {
        errors.push({
          index: i,
          field: 'quantity_consumed',
          message: 'Quantity consumed REQUIRED',
          regulation: 'Art. 15(1)(b)'
        });
      }
      
      // MANDATORY: Emissions value
      if (!p.emissions_embedded && !p.emissions_intensity_factor) {
        errors.push({
          index: i,
          field: 'emissions_embedded',
          message: 'Emissions data REQUIRED',
          regulation: 'Art. 15(1)(c)'
        });
      }
      
      // RECOMMENDED: Production installation ID for actual data
      if (p.value_type === 'actual' && !p.production_installation_id) {
        warnings.push({
          index: i,
          field: 'production_installation_id',
          message: 'Installation ID recommended for actual data',
          regulation: 'Art. 15(2)'
        });
      }
      
      // RECOMMENDED: Reporting period year
      if (!p.reporting_period_year) {
        warnings.push({
          index: i,
          field: 'reporting_period_year',
          message: 'Reporting period should match complex good year',
          regulation: 'Art. 15(3)'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Check if CN code is a complex good requiring precursor data
   */
  static isComplexGood(cn_code) {
    // Complex goods requiring precursor tracking per Art. 13
    const complexGoods = [
      '7208', '7209', '7210', // Hot-rolled steel (requires pig iron/DRI)
      '7211', '7212',         // Cold-rolled steel (requires hot-rolled)
      '7606', '7607',         // Aluminium sheets (requires primary/secondary aluminium)
      '2523'                  // Cement (requires clinker)
    ];
    
    return complexGoods.some(code => cn_code.startsWith(code));
  }
  
  /**
   * Get recommended precursors for a complex good
   */
  static getRecommendedPrecursors(cn_code, productionRoute) {
    const recommendations = {
      // Hot-rolled steel
      '7208': [
        { cn: '72011000', name: 'Pig iron', typical_pct: 95 },
        { cn: '72031000', name: 'Direct reduced iron', typical_pct: 90 }
      ],
      // Cold-rolled steel
      '7211': [
        { cn: '72081000', name: 'Hot-rolled coil', typical_pct: 98 }
      ],
      // Aluminium sheets
      '7606': [
        { cn: '76011000', name: 'Primary aluminium', typical_pct: 95 },
        { cn: '76012000', name: 'Secondary aluminium', typical_pct: 95 }
      ],
      // Cement
      '2523': [
        { cn: '25231000', name: 'Clinker', typical_pct: 85 }
      ]
    };
    
    const prefix = cn_code.substring(0, 4);
    return recommendations[prefix] || [];
  }
}

export default CBAMPrecursorService;
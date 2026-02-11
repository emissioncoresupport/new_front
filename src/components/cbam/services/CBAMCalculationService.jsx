import { base44 } from '@/api/base44Client';

/**
 * CBAM Calculation Service
 * Frontend service to interact with calculation backend
 */

export class CBAMCalculationService {
  /**
   * Calculate emissions with precursor support
   */
  static async calculateEntry(entryData, options = {}) {
    try {
      // Normalize input data
      const normalizedData = {
        cn_code: entryData.cn_code || entryData.hs_code || '',
        quantity: parseFloat(entryData.quantity) || parseFloat(entryData.net_mass_tonnes) || 0,
        country_of_origin: entryData.country_of_origin || '',
        production_route: entryData.production_route || '',
        calculation_method: entryData.calculation_method || 'Default_values',
        direct_emissions_specific: parseFloat(entryData.direct_emissions_specific) || 0,
        indirect_emissions_specific: parseFloat(entryData.indirect_emissions_specific) || 0,
        reporting_period_year: entryData.reporting_period_year || 2026,
        aggregated_goods_category: entryData.aggregated_goods_category || entryData.goods_type,
        ...entryData
      };

      const { data } = await base44.functions.invoke('cbamCalculationEngine', {
        entry_data: normalizedData,
        include_precursors: options.includePrecursors !== false
      });

      if (!data.success) {
        throw new Error(data.error || 'Calculation failed');
      }

      return data;
    } catch (error) {
      console.error('Calculation service error:', error);
      throw error;
    }
  }

  /**
   * Validate entry data before saving
   */
  static async validateEntry(entryData) {
    const calculation = await this.calculateEntry(entryData, { includePrecursors: true });
    
    return {
      is_valid: calculation.calculated_entry?.validation_status === 'validated',
      errors: calculation.calculated_entry?.validation_errors || [],
      calculated_emissions: calculation.breakdown
    };
  }

  /**
   * Batch calculate multiple entries
   */
  static async batchCalculate(entries) {
    const results = await Promise.all(
      entries.map(entry => this.calculateEntry(entry))
    );

    return results;
  }

  /**
   * Get precursor breakdown for entry
   */
  static async getPrecursorBreakdown(cnCode, quantity = 1) {
    const mockEntry = {
      cn_code: cnCode,
      quantity: quantity,
      country_of_origin: 'China', // Default for lookup
      direct_emissions_specific: 0,
      indirect_emissions_specific: 0,
      calculation_method: 'Default_values',
      reporting_period_year: 2026
    };

    const calculation = await this.calculateEntry(mockEntry, { includePrecursors: true });
    return calculation.calculated_entry?.precursors_used || [];
  }
}

export default CBAMCalculationService;
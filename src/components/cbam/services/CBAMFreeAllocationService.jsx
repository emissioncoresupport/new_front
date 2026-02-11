/**
 * CBAM Free Allocation Service
 * Calculates free allocation adjustment per Art. 31 Reg 2023/956
 * Phase-out schedule: 97.5% (2026) → 0% (2034)
 */

import { CBAM_FACTOR_SCHEDULE } from '../constants/officialBenchmarks2026';

export class CBAMFreeAllocationService {
  
  /**
   * Calculate free allocation adjustment
   * Per Art. 31 Regulation (EU) 2023/956
   * 
   * CRITICAL: Applied to BENCHMARK not actual emissions
   * Free allocation % = (1 - CBAM Factor)
   * 
   * @param {number} benchmarkValue - Benchmark emission intensity (tCO2e per unit)
   * @param {number} quantity - Quantity imported (units)
   * @param {number} reportingYear - Reporting year
   * @returns {Object} { adjustment, cbam_factor, free_allocation_percent, benchmark_used }
   */
  static calculateAdjustment(benchmarkValue, quantity, reportingYear) {
    // Get CBAM factor for year
    const cbamFactor = CBAM_FACTOR_SCHEDULE[reportingYear] || 0.025;
    
    // Free allocation % = 1 - CBAM factor
    // 2026: 1 - 0.025 = 0.975 = 97.5%
    // 2034: 1 - 1.00 = 0 = 0%
    const freeAllocationPercent = 1 - cbamFactor;
    
    // Apply to benchmark * quantity
    const totalBenchmarkEmissions = benchmarkValue * quantity;
    const freeAllocationAdjustment = totalBenchmarkEmissions * freeAllocationPercent;
    
    return {
      adjustment: freeAllocationAdjustment,
      cbam_factor: cbamFactor,
      free_allocation_percent: freeAllocationPercent * 100,
      benchmark_used: benchmarkValue,
      total_benchmark_emissions: totalBenchmarkEmissions,
      chargeable_before_deductions: totalBenchmarkEmissions * cbamFactor,
      regulation: 'Art. 31 Reg (EU) 2023/956'
    };
  }
  
  /**
   * Calculate final chargeable emissions
   * Formula: max(0, EmbeddedEmissions - FreeAllocation - ForeignCarbonPrice)
   * 
   * @param {number} totalEmbeddedEmissions - Total embedded emissions (tCO2e)
   * @param {number} freeAllocationAdjustment - Free allocation amount (tCO2e)
   * @param {number} foreignCarbonPriceDeduction - Carbon price paid abroad (tCO2e equivalent)
   * @returns {Object} { chargeable, certificates_required, breakdown }
   */
  static calculateChargeableEmissions(
    totalEmbeddedEmissions,
    freeAllocationAdjustment,
    foreignCarbonPriceDeduction = 0
  ) {
    // Cannot have negative chargeable emissions
    const chargeableEmissions = Math.max(
      0,
      totalEmbeddedEmissions - freeAllocationAdjustment - foreignCarbonPriceDeduction
    );
    
    // 1 certificate = 1 tCO2e
    const certificatesRequired = chargeableEmissions;
    
    return {
      chargeable: chargeableEmissions,
      certificates_required: Math.ceil(certificatesRequired), // Round up per Art. 22
      breakdown: {
        total_embedded: totalEmbeddedEmissions,
        free_allocation_deduction: freeAllocationAdjustment,
        foreign_carbon_price_deduction: foreignCarbonPriceDeduction,
        net_chargeable: chargeableEmissions
      },
      regulation: 'Art. 22 & 31 Reg (EU) 2023/956'
    };
  }
  
  /**
   * Validate foreign carbon price deduction
   * Per Art. 9 Regulation (EU) 2023/956
   */
  static validateForeignCarbonPrice(entryData) {
    const errors = [];
    const warnings = [];
    
    const carbonPricePaid = entryData.carbon_price_due_paid || 0;
    
    if (carbonPricePaid > 0) {
      // MANDATORY: Certificate required for deduction
      if (!entryData.carbon_price_certificate_url) {
        errors.push({
          field: 'carbon_price_certificate_url',
          message: 'Certificate REQUIRED for carbon price deductions',
          regulation: 'Art. 9(1)',
          severity: 'critical'
        });
      }
      
      // MANDATORY: Scheme name
      if (!entryData.carbon_price_scheme_name) {
        warnings.push({
          field: 'carbon_price_scheme_name',
          message: 'Carbon pricing scheme name recommended',
          regulation: 'Art. 9(2)'
        });
      }
      
      // VALIDATION: Cannot exceed embedded emissions
      const totalEmbedded = entryData.total_embedded_emissions || 0;
      if (carbonPricePaid > totalEmbedded) {
        errors.push({
          field: 'carbon_price_due_paid',
          message: 'Carbon price deduction cannot exceed embedded emissions',
          regulation: 'Art. 9(3)',
          severity: 'high'
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
   * Get CBAM factor schedule
   */
  static getCBAMFactorSchedule() {
    return CBAM_FACTOR_SCHEDULE;
  }
  
  /**
   * Get free allocation percentage for year
   */
  static getFreeAllocationPercent(year) {
    const cbamFactor = CBAM_FACTOR_SCHEDULE[year] || 0.025;
    return (1 - cbamFactor) * 100;
  }
  
  /**
   * Project future certificate requirements
   */
  static projectFutureCertificates(benchmarkValue, quantity, fromYear, toYear) {
    const projections = [];
    
    for (let year = fromYear; year <= toYear; year++) {
      const freeAlloc = this.calculateAdjustment(benchmarkValue, quantity, year);
      const chargeable = this.calculateChargeableEmissions(
        benchmarkValue * quantity,
        freeAlloc.adjustment,
        0
      );
      
      projections.push({
        year,
        cbam_factor: freeAlloc.cbam_factor,
        free_allocation_percent: freeAlloc.free_allocation_percent,
        certificates_required: chargeable.certificates_required,
        chargeable_emissions: chargeable.chargeable
      });
    }
    
    return projections;
  }
  
  /**
   * Calculate cost impact of phase-out
   */
  static calculatePhaseOutCost(benchmarkValue, quantity, certificatePrice, fromYear = 2026, toYear = 2034) {
    const projections = this.projectFutureCertificates(benchmarkValue, quantity, fromYear, toYear);
    
    return projections.map(p => ({
      ...p,
      estimated_cost: p.certificates_required * certificatePrice,
      cost_increase_vs_2026: p.certificates_required * certificatePrice - projections[0].certificates_required * certificatePrice
    }));
  }
}

export default CBAMFreeAllocationService;
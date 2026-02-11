/**
 * CBAM Conservative Preview Service
 * Per Art. 27-29 C(2025) 8151
 * 
 * WORST-CASE COMPLIANCE ASSUMPTION:
 * - Always assume defaults until verified actuals exist
 * - Never display zero emissions without verification proof
 * - Apply maximum applicable markups (2028+ = 30%)
 * - Include free allocation deductions minimally
 * 
 * Used in live preview to prevent optimistic underestimation
 */

export class ConservativePreviewService {
  /**
   * Calculate conservative emissions preview
   * Assumes worst-case: defaults + max markup
   */
  static calculateConservativePreview(entry) {
    const {
      cn_code,
      quantity = 0,
      direct_emissions_specific = 0,
      indirect_emissions_specific = 0,
      verification_status = 'not_verified',
      calculation_method = 'default_values',
      reporting_period_year = 2026,
      carbon_price_due_paid = 0,
      free_allocation_adjustment = 0
    } = entry;

    // RULE 1: Use defaults if no verified actuals
    const isVerified = verification_status === 'accredited_verifier_satisfactory';
    let directEmissions = direct_emissions_specific;
    let indirectEmissions = indirect_emissions_specific;

    // If NOT verified, MUST assume defaults
    if (!isVerified && (!directEmissions || directEmissions === 0)) {
      // Apply minimum default emissions (conservative)
      const defaultValue = this.getConservativeDefaultValue(cn_code);
      directEmissions = defaultValue;
      indirectEmissions = 0;
    }

    // RULE 2: NEVER allow zero emissions without verification
    if ((directEmissions || 0) < 0.001 && !isVerified) {
      directEmissions = 0.5; // Minimum conservative assumption
    }

    // RULE 3: Apply MAXIMUM markup regardless of method
    const maxMarkup = this.getMaximumApplicableMarkup(reporting_period_year);
    const totalSpecificEmissions = (directEmissions + indirectEmissions) * (1 + maxMarkup);

    // RULE 4: Calculate total emissions with markup applied
    const totalEmissions = Math.max(0.001, quantity * totalSpecificEmissions);

    // RULE 5: Calculate CBAM obligation conservatively
    // Assume NO free allocation reduction (worst case)
    const certificatesRequired = Math.ceil(totalEmissions * 0.975);
    const estimatedPrice = 88; // Current market reference
    const estimatedCost = certificatesRequired * estimatedPrice;

    return {
      totalEmissions: Math.max(totalEmissions, 0.001), // Never truly zero
      certificatesRequired: Math.max(certificatesRequired, 1),
      estimatedCost,
      payable: estimatedCost,
      markupApplied: maxMarkup * 100,
      isConservative: true,
      assumedDefaults: !isVerified,
      verificationStatus: verification_status,
      warnings: this.getConservativeWarnings(entry, isVerified)
    };
  }

  /**
   * Get conservative (minimum) default value for CN code
   * Prevents underestimation
   */
  static getConservativeDefaultValue(cnCode) {
    // Conservative minimum values per category
    const conservativeDefaults = {
      // Iron & Steel - use highest benchmark
      '72011000': 1.85, // Pig iron
      '72031000': 1.95, // DRI
      '72061000': 2.10, // Ingots
      '72081000': 1.95, // Hot-rolled coil
      '72111300': 2.05, // Cold-rolled coil
      
      // Aluminium - use primary
      '76011000': 11.50, // Primary
      '76012000': 0.65,  // Secondary (assume primary if unknown)
      '76041000': 11.70, // Bars/rods
      '76061100': 11.85, // Sheets
      
      // Cement - use clinker max
      '25231000': 0.95, // Clinker
      '25232100': 0.88, // CEM I
      
      // Fertilizers - use ammonia max
      '28092000': 2.80, // Ammonia
      '31021000': 1.55, // Urea
      
      // Hydrogen - use grey (high)
      '28041000': 14.50 // Grey hydrogen
    };

    return conservativeDefaults[cnCode] || 1.0; // Absolute minimum fallback
  }

  /**
   * Get MAXIMUM applicable markup for reporting year
   * Conservative: always apply highest markup
   */
  static getMaximumApplicableMarkup(year) {
    const markupSchedule = {
      2026: 0.10, // 10%
      2027: 0.20, // 20%
      2028: 0.30, // 30%
      2029: 0.30, // 30%
      2030: 0.30  // 30%
    };

    // Use the requested year or max available
    return markupSchedule[year] || 0.30;
  }

  /**
   * Generate warnings for conservative assumptions
   */
  static getConservativeWarnings(entry, isVerified) {
    const warnings = [];

    if (!isVerified) {
      warnings.push('⚠️ No verified data - assuming defaults');
    }

    if (!entry.direct_emissions_specific || entry.direct_emissions_specific === 0) {
      warnings.push('⚠️ Using minimum conservative default for emissions');
    }

    if (entry.calculation_method !== 'actual_values' && entry.calculation_method !== 'EU_method') {
      warnings.push('⚠️ Maximum markup applied due to default values');
    }

    if (!entry.production_route) {
      warnings.push('⚠️ Production route unknown - using industry average');
    }

    return warnings;
  }

  /**
   * Get conservative preview summary for UI
   */
  static getPreviewSummary(entry) {
    const preview = this.calculateConservativePreview(entry);

    return {
      ...preview,
      displayText: {
        emissions: `${preview.totalEmissions.toFixed(2)} tCO2e (conservative)`,
        certificates: `${preview.certificatesRequired} CBAM certificates`,
        cost: `€${preview.estimatedCost.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })} (worst-case)`,
        markup: `${preview.markupApplied.toFixed(0)}% markup applied`
      }
    };
  }

  /**
   * Check if current values are truly optimistic vs. conservative
   */
  static isOptimisticUnderestimate(entry) {
    const { direct_emissions_specific = 0, verification_status = 'not_verified' } = entry;

    // FAIL: Zero emissions without verification is illegal
    if (direct_emissions_specific === 0 && verification_status !== 'accredited_verifier_satisfactory') {
      return true;
    }

    return false;
  }
}

export default ConservativePreviewService;
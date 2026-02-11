/**
 * AUTHORITATIVE CBAM PHASE-IN REFERENCE TABLE
 * Single source of truth for all CBAM calculations
 * Per Regulation (EU) 2023/956 Art. 31 & Commission Decision C(2025) 8151
 * 
 * CRITICAL: Free allocation phase-out = certificates requirement increase
 * CBAM Factor applies ONLY to benchmark (free allocation), NOT to final emissions
 * 
 * Last Updated: January 7, 2026
 */

export const CBAM_PHASE_IN_REFERENCE = {
  2026: {
    year: 2026,
    free_allocation_remaining: 0.975,  // 97.5% of benchmark still free
    cbam_factor: 0.025,                 // 2.5% of benchmark is now chargeable (APPLIED TO BENCHMARK ONLY)
    default_markup: 0.10,                // 10% penalty on default values
    description: 'First definitive year - 97.5% free allocation remains',
    regulation: 'Art. 31 Reg 2023/956 + C(2025) 8151'
  },
  2027: {
    year: 2027,
    free_allocation_remaining: 0.95,
    cbam_factor: 0.05,
    default_markup: 0.20,
    description: '95% free allocation',
    regulation: 'Art. 31 Reg 2023/956'
  },
  2028: {
    year: 2028,
    free_allocation_remaining: 0.90,
    cbam_factor: 0.10,
    default_markup: 0.30,
    description: '90% free allocation',
    regulation: 'Art. 31 Reg 2023/956'
  },
  2029: {
    year: 2029,
    free_allocation_remaining: 0.775,
    cbam_factor: 0.225,
    default_markup: 0.30,
    description: '77.5% free allocation',
    regulation: 'Art. 31 Reg 2023/956'
  },
  2030: {
    year: 2030,
    free_allocation_remaining: 0.4875,
    cbam_factor: 0.5125,
    default_markup: 0.30,
    description: '48.75% free allocation',
    regulation: 'Art. 31 Reg 2023/956'
  },
  2031: {
    year: 2031,
    free_allocation_remaining: 0.29,
    cbam_factor: 0.71,
    default_markup: 0.30,
    description: '29% free allocation',
    regulation: 'Art. 31 Reg 2023/956'
  },
  2032: {
    year: 2032,
    free_allocation_remaining: 0.1225,
    cbam_factor: 0.8775,
    default_markup: 0.30,
    description: '12.25% free allocation',
    regulation: 'Art. 31 Reg 2023/956'
  },
  2033: {
    year: 2033,
    free_allocation_remaining: 0.05,
    cbam_factor: 0.95,
    default_markup: 0.30,
    description: '5% free allocation',
    regulation: 'Art. 31 Reg 2023/956'
  },
  2034: {
    year: 2034,
    free_allocation_remaining: 0.0,
    cbam_factor: 1.0,
    default_markup: 0.30,
    description: 'Full CBAM - no free allocation',
    regulation: 'Art. 31 Reg 2023/956'
  }
};

/**
 * Get phase-in data for specific year
 */
export function getPhaseInData(year) {
  return CBAM_PHASE_IN_REFERENCE[year] || CBAM_PHASE_IN_REFERENCE[2034];
}

/**
 * CORRECT CERTIFICATE CALCULATION per Art. 31 Reg 2023/956
 * 
 * CRITICAL: CBAM Factor applied ONLY to benchmark (free allocation), NOT to final obligation
 * 
 * Formula:
 * 1. Free Allocation (adjusted) = Benchmark × (1 - CBAMFactor) × Quantity
 * 2. Chargeable Emissions = max(0, TotalEmissions - FreeAllocation - ForeignCarbonPriceDeduction)
 * 3. Certificates Required = Chargeable Emissions (1:1 ratio in tCO2e)
 * 
 * NO second multiplication by CBAM factor - it's ONLY applied to benchmark
 */
export function calculateCertificatesRequired(
  totalEmissions,      // tCO2e - actual embedded emissions
  benchmark,           // tCO2e/tonne (ETS product benchmark)
  quantity,            // tonnes
  year,                // Reporting year
  foreignCarbonPriceDeduction = 0  // tCO2e already paid via foreign ETS (Art. 9)
) {
  const phaseIn = getPhaseInData(year);
  
  // Step 1: Calculate free allocation with CBAM factor applied to benchmark
  const freeAllocationFull = benchmark * quantity;
  const freeAllocationAdjusted = freeAllocationFull * phaseIn.free_allocation_remaining;
  
  // Step 2: Calculate chargeable emissions (NO double-factor)
  const chargeableEmissions = Math.max(0, totalEmissions - freeAllocationAdjusted - foreignCarbonPriceDeduction);
  
  // Step 3: Certificates = chargeable emissions (1:1) - NO multiplication by cbam_factor
  return {
    free_allocation_full: freeAllocationFull,
    free_allocation_adjusted: freeAllocationAdjusted,
    chargeable_emissions: chargeableEmissions,
    certificates_required: chargeableEmissions,  // Direct 1:1 mapping, NO second factor
    cbam_factor: phaseIn.cbam_factor,
    foreign_carbon_price_deduction: foreignCarbonPriceDeduction,
    calculation_note: `CBAM Factor ${(phaseIn.cbam_factor * 100).toFixed(1)}% applied to benchmark ONLY - ${((1 - phaseIn.free_allocation_remaining) * 100).toFixed(1)}% of free allocation phased out in ${year}`
  };
}

/**
 * Simplified calculation when benchmark unknown
 */
export function calculateCertificatesSimplified(totalEmissions, year) {
  // Without benchmark data, assume zero free allocation (worst case)
  return {
    chargeable_emissions: totalEmissions,
    certificates_required: totalEmissions,
    calculation_note: 'No benchmark applied - full emissions chargeable'
  };
}

export default CBAM_PHASE_IN_REFERENCE;
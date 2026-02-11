/**
 * CBAM Regulatory Schedules - Versioned Constants
 * Source: C(2025) 8151, C(2025) 8552, Reg 2023/956
 * Version: 2026.1
 * Last Updated: January 2026
 */

export const REGULATORY_SCHEDULES = {
  version: '2026.1',
  effective_date: '2026-01-01',
  
  /**
   * CBAM Phase-In Schedule (Art. 31 Reg 2023/956)
   * Free allocation phase-out = inverse of CBAM factor
   */
  cbam_factors: {
    2026: 0.025,   // 2.5% paid, 97.5% free
    2027: 0.05,    // 5% paid, 95% free
    2028: 0.10,    // 10% paid, 90% free
    2029: 0.225,   // 22.5% paid, 77.5% free
    2030: 0.4875,  // 48.75% paid, 51.25% free
    2031: 0.71,    // 71% paid, 29% free
    2032: 0.8775,  // 87.75% paid, 12.25% free
    2033: 0.95,    // 95% paid, 5% free
    2034: 1.0      // 100% paid, 0% free
  },
  
  /**
   * Default Value Markup Schedule (C(2025) 8552)
   * Applied when using default values instead of actual emissions
   */
  default_value_markups: {
    2026: 10,  // 10% markup
    2027: 20,  // 20% markup
    2028: 30,  // 30% markup
    2029: 30,
    2030: 30
  },
  
  /**
   * Materiality Threshold (Art. 5 C(2025) 8150)
   */
  materiality_threshold: 0.05, // 5%
  
  /**
   * Certificate Validity Period (Art. 22 Reg 2023/956)
   */
  certificate_validity_years: 2,
  
  /**
   * Submission Deadlines (Art. 6(2) Reg 2023/956)
   * Quarter end + 1 month
   */
  submission_deadlines: {
    Q1: '05-31', // May 31
    Q2: '08-31', // August 31
    Q3: '11-30', // November 30
    Q4: '02-28'  // February 28/29 of next year
  }
};

/**
 * Get CBAM factor for year
 */
export function getCBAMFactor(year) {
  return REGULATORY_SCHEDULES.cbam_factors[year] || 0.025;
}

/**
 * Get free allocation percentage for year
 */
export function getFreeAllocationPercent(year) {
  return (1 - getCBAMFactor(year)) * 100;
}

/**
 * Get default value markup for year
 */
export function getDefaultValueMarkup(year) {
  return REGULATORY_SCHEDULES.default_value_markups[year] || 10;
}

/**
 * Get submission deadline for quarter
 */
export function getSubmissionDeadline(year, quarter) {
  const deadlineMonth = REGULATORY_SCHEDULES.submission_deadlines[`Q${quarter}`];
  const deadlineYear = quarter === 4 ? year + 1 : year;
  return `${deadlineYear}-${deadlineMonth}`;
}

export default REGULATORY_SCHEDULES;
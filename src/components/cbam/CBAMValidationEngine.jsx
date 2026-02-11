/**
 * CBAM Data Validation Engine
 * Validates emission entries against EU CBAM Regulation requirements
 */

export const validateCBAMEntry = (entry) => {
  const errors = [];
  const warnings = [];
  const info = [];

  // 1. Required Fields Validation per C(2025) 8151
  if (!entry.cn_code || entry.cn_code.length !== 8) {
    errors.push({
      field: 'cn_code',
      message: 'CN Code must be 8 digits per Reg 2023/956 Annex I',
      severity: 'critical',
      regulation: 'C(2025) 8151 Art. 4'
    });
  }

  // 2. Reporting Period Validation - CRITICAL NEW REQUIREMENT
  if (!entry.reporting_period_year || entry.reporting_period_year < 2026) {
    errors.push({
      field: 'reporting_period_year',
      message: 'Reporting period must be calendar year 2026 or later',
      severity: 'critical',
      regulation: 'C(2025) 8151 Art. 7 - Cannot be before 2026'
    });
  }

  // 3. Functional Unit Validation (Art. 4)
  if (!entry.functional_unit) {
    errors.push({
      field: 'functional_unit',
      message: 'Functional unit required (tonnes, kWh, kg_nitrogen, or tonnes_clinker)',
      severity: 'critical',
      regulation: 'C(2025) 8151 Art. 4'
    });
  }

  if (!entry.quantity || entry.quantity <= 0) {
    errors.push({
      field: 'quantity',
      message: 'Quantity (activity level) required per functional unit',
      severity: 'critical',
      regulation: 'C(2025) 8151 Art. 1(2) - Activity level'
    });
  }

  // 4. Mark-up Validation for Default Values (C(2025) 8552)
  if (entry.calculation_method === 'default_values') {
    const expectedMarkups = { 2026: 10, 2027: 20, 2028: 30, 2029: 30, 2030: 30 };
    const expected = expectedMarkups[entry.reporting_period_year];
    
    if (expected && (!entry.mark_up_percentage_applied || entry.mark_up_percentage_applied === 0)) {
      errors.push({
        field: 'mark_up_percentage_applied',
        message: `Default values MUST include ${expected}% mark-up in ${entry.reporting_period_year}`,
        severity: 'critical',
        regulation: 'C(2025) 8552 Art. 4-6 - Phased mark-up'
      });
    }

    // Lower mark-up for fertilizers
    if (entry.aggregated_goods_category === 'Fertilizers' && entry.mark_up_percentage_applied > 15) {
      warnings.push({
        field: 'mark_up_percentage_applied',
        message: 'Fertilizers may use lower mark-up per C(2025) 8552',
        severity: 'info',
        regulation: 'C(2025) 8552 Art. 6'
      });
    }
  }

  // 5. Production Route Weighted Average (Art. 4(6))
  if (entry.production_route === 'Weighted_average_all_routes' && (!entry.production_routes_included || entry.production_routes_included.length < 2)) {
    warnings.push({
      field: 'production_route',
      message: 'Weighted average must encompass all routes within installation',
      severity: 'warning',
      regulation: 'C(2025) 8151 Art. 4(6) - Single process for multiple routes'
    });
  }

  if (!entry.country_of_origin) {
    errors.push({
      field: 'country_of_origin',
      message: 'Country of origin is mandatory',
      severity: 'critical',
      regulation: 'Art. 6.2(b) - Origin declaration'
    });
  }

  // 2. Installation Information (Art. 7)
  if (!entry.installation_id) {
    warnings.push({
      field: 'installation_id',
      message: 'Installation not linked - required for definitive period',
      severity: 'warning',
      regulation: 'Art. 7 - Installation identification'
    });
  }

  // 6. Verification Materiality (C(2025) 8150 Art. 5)
  if (entry.verification_status?.includes('accredited') && !entry.materiality_assessment_5_percent) {
    warnings.push({
      field: 'materiality_assessment_5_percent',
      message: 'Verification must apply 5% materiality threshold per CN code',
      severity: 'warning',
      regulation: 'C(2025) 8150 Art. 5 - Materiality levels'
    });
  }

  // 7. Emissions Data Validation per Chapter 2
  if (entry.calculation_method === 'actual_values') {
    if (!entry.direct_emissions_specific) {
      errors.push({
        field: 'direct_emissions_specific',
        message: 'Direct emissions required for actual values method',
        severity: 'critical',
        regulation: 'C(2025) 8151 Chapter 2 - Actual values'
      });
    }

    if (!entry.monitoring_plan_id) {
      errors.push({
        field: 'monitoring_plan_id',
        message: 'Monitoring plan required for actual values (must be in English)',
        severity: 'critical',
        regulation: 'C(2025) 8151 Art. 5(5-6) - Monitoring plan requirement'
      });
    }

    if (!entry.operator_report_id) {
      warnings.push({
        field: 'operator_report_id',
        message: 'Operator emission report recommended (must be in English)',
        severity: 'warning',
        regulation: 'C(2025) 8151 Art. 10 - Operator\'s emissions report'
      });
    }

    if (!entry.production_route) {
      warnings.push({
        field: 'production_route',
        message: 'Production route should be specified for actual data',
        severity: 'warning',
        regulation: 'Section 5.2 - Production routes'
      });
    }
  }

  // 8. Precursor Validation for Complex Goods (Art. 13-15)
  if (entry.precursors_used && entry.precursors_used.length > 0) {
    entry.precursors_used.forEach((precursor, idx) => {
      if (!precursor.reporting_period_year) {
        info.push({
          field: `precursors_used[${idx}].reporting_period_year`,
          message: 'Precursor reporting period defaults to complex good year (can override with evidence)',
          severity: 'info',
          regulation: 'C(2025) 8151 Art. 13'
        });
      }

      if (entry.calculation_method === 'combined_actual_default' && !precursor.value_type) {
        warnings.push({
          field: `precursors_used[${idx}].value_type`,
          message: 'Specify if precursor uses actual or default values',
          severity: 'warning',
          regulation: 'C(2025) 8151 Art. 15 - Combined use'
        });
      }
    });
  }

  // 9. Default Values Validation (when using defaults)
  if (entry.calculation_method === 'default_values') {
    if (!entry.cbam_benchmark) {
      errors.push({
        field: 'cbam_benchmark',
        message: 'CBAM benchmark value required for default calculation',
        severity: 'critical',
        regulation: 'Annex - Default benchmark values'
      });
    }

    if (!entry.cbam_factor || entry.cbam_factor <= 0) {
      warnings.push({
        field: 'cbam_factor',
        message: 'CBAM factor missing - using default value of 1.0',
        severity: 'warning',
        regulation: 'Art. 10a - CBAM Factor'
      });
    }
  }

  // 10. Carbon Price Paid Validation (Art. 9 - Carbon price paid in country of origin)
  if (entry.carbon_price_paid && entry.carbon_price_paid > 0) {
    if (!entry.carbon_price_country) {
      warnings.push({
        field: 'carbon_price_country',
        message: 'Country where carbon price was paid should be specified',
        severity: 'warning',
        regulation: 'Art. 9 - Carbon price documentation'
      });
    }

    if (!entry.carbon_price_proof_url) {
      warnings.push({
        field: 'carbon_price_proof_url',
        message: 'Proof of carbon price payment recommended',
        severity: 'warning',
        regulation: 'Art. 9 - Verification requirements'
      });
    }

    // Validate price is reasonable (not exceeding EU ETS)
    const euEtsPrice = 95; // Mock current EU ETS price
    if (entry.carbon_price_paid > euEtsPrice * 1.5) {
      warnings.push({
        field: 'carbon_price_paid',
        message: `Carbon price (€${entry.carbon_price_paid}) exceeds 150% of EU ETS price - verify accuracy`,
        severity: 'warning',
        regulation: 'Art. 9.3 - Price verification'
      });
    }
  }

  // 11. Evidence Documentation (Art. 6.3)
  if (!entry.evidence_documents || entry.evidence_documents.length === 0) {
    warnings.push({
      field: 'evidence_documents',
      message: 'Supporting documentation recommended (customs declarations, emission verification)',
      severity: 'info',
      regulation: 'Art. 6.3 - Documentation requirements'
    });
  }

  // 12. Data Quality Flags
  if (entry.validation_status === 'pending') {
    info.push({
      field: 'validation_status',
      message: 'Entry pending validation - AI or manual review recommended',
      severity: 'info',
      regulation: 'Internal QA process'
    });
  }

  // 13. Free Allocation Adjustment Validation
  if (entry.calculation_method === 'actual_data' && !entry.sefa) {
    warnings.push({
      field: 'sefa',
      message: 'SEFA (Specific Embedded Free Allocation) not calculated',
      severity: 'warning',
      regulation: 'Art. 31 - Free allocation adjustment'
    });
  }

  // 14. Emission Reasonability Check
  if (entry.total_embedded_emissions) {
    const specificEmissions = entry.total_embedded_emissions / (entry.net_mass_tonnes || 1);
    
    // Check against typical ranges for goods type
    const typicalRanges = {
      'Iron & Steel': { min: 0.5, max: 3.0 },
      'Aluminium': { min: 0.1, max: 20.0 },
      'Cement': { min: 0.5, max: 1.2 },
      'Fertilizers': { min: 1.0, max: 4.0 },
      'Electricity': { min: 0.1, max: 1.5 },
      'Hydrogen': { min: 2.0, max: 15.0 }
    };

    const range = typicalRanges[entry.goods_type];
    if (range) {
      if (specificEmissions < range.min || specificEmissions > range.max) {
        warnings.push({
          field: 'total_embedded_emissions',
          message: `Specific emissions (${specificEmissions.toFixed(2)} tCO2e/t) outside typical range for ${entry.goods_type} (${range.min}-${range.max})`,
          severity: 'warning',
          regulation: 'Data quality check'
        });
      }
    }
  }

  // 15. Production Year Validation (Art. 7)
  if (entry.production_year) {
    const currentYear = new Date().getFullYear();
    if (entry.production_year > currentYear) {
      errors.push({
        field: 'production_year',
        message: 'Production year cannot be in the future',
        severity: 'critical',
        regulation: 'Art. 7 - Reporting period'
      });
    }

    if (currentYear - entry.production_year > 2) {
      warnings.push({
        field: 'production_year',
        message: 'Production data older than 2 years - verify accuracy',
        severity: 'warning',
        regulation: 'Art. 7 - Data recency'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
    score: calculateComplianceScore(errors, warnings, info)
  };
};

const calculateComplianceScore = (errors, warnings, info) => {
  let score = 100;
  score -= errors.length * 25; // Critical issues
  score -= warnings.length * 10; // Warnings
  score -= info.length * 2; // Info items
  return Math.max(0, score);
};

export const validateCBAMReport = (report, entries) => {
  const errors = [];
  const warnings = [];

  // 1. Report Completeness per C(2025) 8151
  if (!report.reporting_year || report.reporting_year < 2026) {
    errors.push({
      field: 'reporting_year',
      message: 'Reporting year must be 2026 or later (calendar year)',
      severity: 'critical',
      regulation: 'C(2025) 8151 Art. 7 - Reporting period'
    });
  }

  if (report.language && report.language !== 'English') {
    errors.push({
      field: 'language',
      message: 'Reports must be submitted in English',
      severity: 'critical',
      regulation: 'C(2025) 8151 Art. 5(6), 10(4) - Language requirement'
    });
  }

  // 2. CBAM Factor Validation (Free Allocation Regulation)
  const expectedFactors = { 2026: 0.025, 2027: 0.05, 2028: 0.075, 2029: 0.9, 2030: 1.0 };
  const expectedFactor = expectedFactors[report.reporting_year];
  if (expectedFactor && report.cbam_factor_applied && Math.abs(report.cbam_factor_applied - expectedFactor) > 0.001) {
    warnings.push({
      field: 'cbam_factor_applied',
      message: `CBAM factor for ${report.reporting_year} should be ${expectedFactor * 100}%`,
      severity: 'warning',
      regulation: 'Free Allocation Regulation - Phase-in schedule'
    });
  }

  // 3. Certificate Pricing Method (C(2025) 8560)
  if (report.reporting_year === 2026 && !report.certificate_price_avg) {
    warnings.push({
      field: 'certificate_price_avg',
      message: '2026 uses quarterly pricing, 2027+ uses weekly pricing',
      severity: 'info',
      regulation: 'C(2025) 8560 Art. 1 & 5'
    });
  }

  // 2. Entries Validation
  if (!entries || entries.length === 0) {
    errors.push({
      field: 'entries',
      message: 'Report contains no emission entries',
      severity: 'critical',
      regulation: 'Art. 35.1 - Information requirements'
    });
  }

  // 3. Validate all entries
  let totalEntryErrors = 0;
  let totalEntryWarnings = 0;
  entries.forEach(entry => {
    const validation = validateCBAMEntry(entry);
    totalEntryErrors += validation.errors.length;
    totalEntryWarnings += validation.warnings.length;
  });

  if (totalEntryErrors > 0) {
    errors.push({
      field: 'entries',
      message: `${totalEntryErrors} critical validation errors found in emission entries`,
      severity: 'critical',
      regulation: 'Data quality requirements'
    });
  }

  if (totalEntryWarnings > 0) {
    warnings.push({
      field: 'entries',
      message: `${totalEntryWarnings} warnings found in emission entries - review recommended`,
      severity: 'warning',
      regulation: 'Data quality recommendations'
    });
  }

  // 4. Certificate Balance Check (Art. 31)
  const requiredCerts = Math.ceil(report.total_emissions || 0);
  if (report.certificates_surrendered < requiredCerts) {
    warnings.push({
      field: 'certificates_surrendered',
      message: `Insufficient certificates surrendered (${report.certificates_surrendered}/${requiredCerts})`,
      severity: 'warning',
      regulation: 'Art. 31 - Certificate surrender requirement'
    });
  }

  // 5. Submission Deadline Check (Art. 35.3)
  // Q1: May 31, Q2: July 31, Q3: October 31, Q4: January 31 (next year)
  const deadlines = {
    Q1: new Date(report.year, 4, 31), // May 31
    Q2: new Date(report.year, 6, 31), // July 31
    Q3: new Date(report.year, 9, 31), // October 31
    Q4: new Date(report.year + 1, 0, 31) // January 31 next year
  };

  const period = report.period?.split('-')[0]; // Extract Q1, Q2, etc.
  const deadline = deadlines[period];
  
  if (deadline && report.submission_date) {
    const submissionDate = new Date(report.submission_date);
    if (submissionDate > deadline) {
      warnings.push({
        field: 'submission_date',
        message: `Submission after deadline (${deadline.toLocaleDateString()}) - penalties may apply`,
        severity: 'warning',
        regulation: 'Art. 35.3 - Reporting deadlines'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    readyForSubmission: errors.length === 0 && totalEntryErrors === 0
  };
};
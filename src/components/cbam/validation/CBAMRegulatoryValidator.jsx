/**
 * CBAM Regulatory Validation Engine
 * Validates compliance with EU Regulations 2023/956 & 2025/2083
 */

export function validateCBAMReport(report, entries) {
  const errors = [];
  const warnings = [];

  // Article 6(2) - Default Values Limit (20% from Q3 2024)
  const reportDate = new Date(report.reporting_year, (report.reporting_quarter - 1) * 3);
  const q3_2024 = new Date(2024, 6, 1); // July 2024

  if (reportDate >= q3_2024 && report.default_values_percentage > 20) {
    errors.push({
      code: 'DEFAULT_VALUES_EXCEED_LIMIT',
      severity: 'CRITICAL',
      message: `Default values usage (${report.default_values_percentage.toFixed(1)}%) exceeds 20% limit per Art. 6(2). Only allowed for goods < 50 tonnes/year.`,
      regulation: 'Art. 6(2) Implementing Regulation 2023/1773'
    });
  }

  // Article 5 - EORI Validation
  if (!report.eori_number || !/^[A-Z]{2}[0-9A-Z]{1,15}$/.test(report.eori_number)) {
    errors.push({
      code: 'INVALID_EORI',
      severity: 'CRITICAL',
      message: 'Invalid EORI number format. Must be: Country Code + alphanumeric (max 15 chars)',
      regulation: 'Art. 5 Regulation 2023/956'
    });
  }

  // Article 7 - Precursor Emissions
  const missingPrecursors = entries.filter(e => 
    ['Iron & Steel', 'Aluminium'].includes(e.aggregated_goods_category) && 
    (!e.precursor_emissions || e.precursor_emissions.length === 0)
  );
  if (missingPrecursors.length > 0) {
    warnings.push({
      code: 'PRECURSOR_EMISSIONS_MISSING',
      severity: 'WARNING',
      message: `${missingPrecursors.length} iron/steel/aluminium entries missing precursor emissions data. May be required per Art. 7.`,
      regulation: 'Art. 7 Implementing Regulation'
    });
  }

  // Article 9 - Carbon Price Paid Deduction
  const carbonPriceDeductions = entries.filter(e => 
    e.carbon_price_due_paid > 0 && !e.carbon_price_certificate_url
  );
  if (carbonPriceDeductions.length > 0) {
    warnings.push({
      code: 'CARBON_PRICE_NO_PROOF',
      severity: 'WARNING',
      message: `${carbonPriceDeductions.length} entries claim carbon price deduction without evidence. Must provide proof per Art. 9.`,
      regulation: 'Art. 9 Regulation 2023/956'
    });
  }

  // Verification Status (optional in transitional)
  const unverifiedCount = entries.filter(e => e.verification_status === 'not_verified').length;
  if (unverifiedCount > entries.length * 0.3) {
    warnings.push({
      code: 'HIGH_UNVERIFIED_PERCENTAGE',
      severity: 'INFO',
      message: `${((unverifiedCount / entries.length) * 100).toFixed(0)}% of entries unverified. Third-party verification recommended.`,
      regulation: 'Art. 8 Implementing Regulation (optional)'
    });
  }

  // Submission Deadline Check
  if (report.submission_deadline) {
    const deadline = new Date(report.submission_deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 0) {
      errors.push({
        code: 'DEADLINE_PASSED',
        severity: 'CRITICAL',
        message: `Submission deadline passed ${Math.abs(daysUntilDeadline)} days ago. Late submission may incur penalties.`,
        regulation: 'Art. 6(2)'
      });
    } else if (daysUntilDeadline <= 7) {
      warnings.push({
        code: 'DEADLINE_APPROACHING',
        severity: 'WARNING',
        message: `Only ${daysUntilDeadline} days until submission deadline.`,
        regulation: 'Art. 6(2)'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      total_checks: 7,
      passed: 7 - errors.length,
      failed: errors.length,
      warnings: warnings.length
    }
  };
}

export function validateCBAMEntry(entry) {
  const errors = [];
  const warnings = [];

  // Mandatory fields per Annex I
  if (!entry.cn_code) {
    errors.push({
      code: 'MISSING_CN_CODE',
      severity: 'CRITICAL',
      message: 'CN code is mandatory per Annex I',
      field: 'cn_code'
    });
  }

  if (!entry.country_of_origin) {
    errors.push({
      code: 'MISSING_COUNTRY',
      severity: 'CRITICAL',
      message: 'Country of origin is mandatory',
      field: 'country_of_origin'
    });
  }

  if (!entry.quantity || entry.quantity <= 0) {
    errors.push({
      code: 'INVALID_QUANTITY',
      severity: 'CRITICAL',
      message: 'Net mass in tonnes must be greater than 0',
      field: 'quantity'
    });
  }

  if (!entry.direct_emissions_specific || entry.direct_emissions_specific < 0) {
    errors.push({
      code: 'INVALID_EMISSIONS',
      severity: 'CRITICAL',
      message: 'Direct emissions intensity (tCO2/t) is mandatory and cannot be negative',
      field: 'direct_emissions_specific'
    });
  }

  // Production route required for certain goods (2026+)
  if (['Iron & Steel', 'Aluminium'].includes(entry.aggregated_goods_category)) {
    if (!entry.production_route || entry.production_route === 'Not_specified') {
      warnings.push({
        code: 'PRODUCTION_ROUTE_MISSING',
        severity: 'WARNING',
        message: 'Production route should be specified for accuracy (BF-BOF, DRI-EAF, etc.)',
        field: 'production_route'
      });
    }
  }

  // Data quality check
  if (entry.calculation_method === 'Default_values' && entry.quantity > 50) {
    warnings.push({
      code: 'LARGE_VOLUME_DEFAULT',
      severity: 'WARNING',
      message: 'Using default values for >50 tonnes. Consider requesting actual data from supplier.',
      field: 'calculation_method'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateCBAMCertificates(certificates, requiredQuantity) {
  const errors = [];
  const warnings = [];

  const activeBalance = certificates
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + c.quantity, 0);

  if (activeBalance < requiredQuantity) {
    errors.push({
      code: 'INSUFFICIENT_CERTIFICATES',
      severity: 'CRITICAL',
      message: `Insufficient certificates: ${activeBalance} available, ${requiredQuantity} required. Shortfall: ${requiredQuantity - activeBalance}`,
      regulation: 'Art. 22 Regulation 2023/956'
    });
  }

  // Check for expiring certificates
  const expiringSoon = certificates.filter(c => {
    if (!c.expiry_date || c.status !== 'active') return false;
    const expiryDate = new Date(c.expiry_date);
    const daysUntilExpiry = (expiryDate - new Date()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  });

  if (expiringSoon.length > 0) {
    const totalExpiring = expiringSoon.reduce((sum, c) => sum + c.quantity, 0);
    warnings.push({
      code: 'CERTIFICATES_EXPIRING',
      severity: 'WARNING',
      message: `${totalExpiring} certificates expiring within 90 days. Plan surrender or renewal.`
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
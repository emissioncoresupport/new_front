import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Entry Validator - C(2025) 8151 Compliance Checker
 * Validates emission entries against EU regulatory requirements
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entry_data, strict_mode = false } = await req.json();
    
    const errors = [];
    const warnings = [];
    let dataQualityScore = 100;
    
    // MANDATORY FIELD CHECKS per Art. 16(1) Reg 2023/956
    if (!entry_data.cn_code) {
      errors.push({ field: 'cn_code', message: 'CN Code is mandatory', regulation: 'Art. 16(1)' });
      dataQualityScore -= 20;
    }
    
    if (!entry_data.country_of_origin) {
      errors.push({ field: 'country_of_origin', message: 'Country of origin required', regulation: 'Art. 16(1)' });
      dataQualityScore -= 20;
    }
    
    if (!entry_data.quantity && !entry_data.net_mass_tonnes) {
      errors.push({ field: 'quantity', message: 'Net mass in tonnes required', regulation: 'Art. 16(1)' });
      dataQualityScore -= 20;
    }
    
    if (!entry_data.direct_emissions_specific || entry_data.direct_emissions_specific === 0) {
      if (strict_mode) {
        errors.push({ field: 'direct_emissions_specific', message: 'Direct emissions required', regulation: 'C(2025) 8151' });
        dataQualityScore -= 15;
      } else {
        warnings.push({ field: 'direct_emissions_specific', message: 'Using default values - request actual data from supplier' });
        dataQualityScore -= 10;
      }
    }
    
    // EORI validation
    if (!entry_data.eori_number) {
      warnings.push({ field: 'eori_number', message: 'EORI number missing - required for submission' });
      dataQualityScore -= 5;
    }
    
    // Production route validation for Default Values
    if (entry_data.calculation_method === 'Default_values' && !entry_data.production_route) {
      warnings.push({ field: 'production_route', message: 'Production route recommended for accurate defaults' });
      dataQualityScore -= 5;
    }
    
    // Date validation - CBAM starts 2026
    if (entry_data.reporting_period_year && entry_data.reporting_period_year < 2026) {
      errors.push({ field: 'reporting_period_year', message: 'Reporting year cannot be before 2026', regulation: 'C(2025) 8151 Art. 7' });
      dataQualityScore -= 15;
    }
    
    // Emission reasonability check
    const quantity = entry_data.quantity || entry_data.net_mass_tonnes || 0;
    const emissions = entry_data.direct_emissions_specific || 0;
    
    if (emissions > 0) {
      // Check for unrealistic values
      if (emissions > 20) {
        warnings.push({ field: 'direct_emissions_specific', message: 'Emissions seem high (>20 tCO2/t) - verify data' });
        dataQualityScore -= 5;
      }
      
      if (emissions < 0.01) {
        warnings.push({ field: 'direct_emissions_specific', message: 'Emissions seem low (<0.01 tCO2/t) - verify data' });
        dataQualityScore -= 5;
      }
    }
    
    // Calculate validation level
    const isValid = errors.length === 0;
    const validationLevel = 
      dataQualityScore >= 95 ? 'excellent' :
      dataQualityScore >= 80 ? 'good' :
      dataQualityScore >= 60 ? 'acceptable' : 'poor';
    
    return Response.json({
      success: true,
      is_valid: isValid,
      validation_level: validationLevel,
      data_quality_score: Math.max(0, dataQualityScore),
      errors,
      warnings,
      checked_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Validator] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
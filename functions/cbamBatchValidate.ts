import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Batch Validate CBAM Entries
 * Validates all entries for regulatory compliance
 * Per C(2025) 8151 requirements
 */

const ANNEX_II_GOODS = ['electricity', 'clinker', 'portland_cement', 'nitric_acid'];
const CBAM_FACTOR_SCHEDULE = {
  2026: 0.025, 2027: 0.05, 2028: 0.10, 2029: 0.225,
  2030: 0.4875, 2031: 0.71, 2032: 0.8775, 2033: 0.95, 2034: 1.0
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entry_ids = [] } = await req.json();
    
    console.log('[Batch Validate] Validating', entry_ids.length, 'entries');
    
    // Fetch entries
    const entries = await base44.entities.CBAMEmissionEntry.filter({
      id: { $in: entry_ids }
    });
    
    const results = [];
    
    for (const entry of entries) {
      const errors = [];
      const warnings = [];
      
      // 1. CN Code - 8 digits
      if (!entry.cn_code || entry.cn_code.length !== 8) {
        errors.push({ field: 'cn_code', message: 'Must be 8 digits', regulation: 'Art. 4' });
      }
      
      // 2. Reporting year ≥ 2026
      if (!entry.reporting_period_year || entry.reporting_period_year < 2026) {
        errors.push({ field: 'reporting_period_year', message: 'Cannot be before 2026', regulation: 'Art. 7' });
      }
      
      // 3. Functional unit
      const validUnits = ['tonnes', 'kWh', 'kg_nitrogen', 'tonnes_clinker'];
      if (!entry.functional_unit || !validUnits.includes(entry.functional_unit)) {
        errors.push({ field: 'functional_unit', message: 'Required', regulation: 'Art. 4' });
      }
      
      // 4. Country
      if (!entry.country_of_origin) {
        errors.push({ field: 'country_of_origin', message: 'Required', regulation: 'Art. 6(2)(b)' });
      }
      
      // 5. Quantity
      if (!entry.quantity || entry.quantity <= 0) {
        errors.push({ field: 'quantity', message: 'Must be > 0', regulation: 'Art. 1(2)' });
      }
      
      // 6. Direct emissions
      if (!entry.direct_emissions_specific || entry.direct_emissions_specific <= 0) {
        errors.push({ field: 'direct_emissions_specific', message: 'Required', regulation: 'Chapter 2 & 3' });
      }
      
      // 7. Production route for defaults
      if (entry.calculation_method === 'Default_values' && !entry.production_route) {
        errors.push({ field: 'production_route', message: 'Required for defaults', regulation: 'Chapter 3' });
      }
      
      // 8. Installation for actual data
      if ((entry.calculation_method === 'EU_method' || entry.calculation_method === 'actual_values') && !entry.installation_id) {
        errors.push({ field: 'installation_id', message: 'Required for actual data', regulation: 'Art. 3(1)(c)' });
      }
      
      // 9. Carbon price certificate
      if ((entry.carbon_price_due_paid || 0) > 0 && !entry.carbon_price_certificate_url) {
        warnings.push({ field: 'carbon_price_certificate_url', message: 'Certificate required', regulation: 'Art. 9' });
      }
      
      // 10. Free allocation check
      if (entry.free_allocation_percent) {
        const expectedFactor = CBAM_FACTOR_SCHEDULE[entry.reporting_period_year] || 0.025;
        const expectedFreePercent = (1 - expectedFactor) * 100;
        
        if (Math.abs(entry.free_allocation_percent - expectedFreePercent) > 0.1) {
          warnings.push({ 
            field: 'free_allocation_percent', 
            message: `Should be ${expectedFreePercent.toFixed(1)}% in ${entry.reporting_period_year}`,
            regulation: 'Art. 31'
          });
        }
      }
      
      const isValid = errors.length === 0;
      const complianceScore = Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5));
      
      // Update entry validation status
      await base44.entities.CBAMEmissionEntry.update(entry.id, {
        validation_status: isValid ? 'validated' : 'flagged',
        validation_errors: errors.map(e => `${e.field}: ${e.message}`),
        validation_warnings: warnings.map(w => `${w.field}: ${w.message}`)
      });
      
      results.push({
        entry_id: entry.id,
        import_id: entry.import_id,
        valid: isValid,
        errors,
        warnings,
        compliance_score: complianceScore
      });
    }
    
    const totalValid = results.filter(r => r.valid).length;
    const avgScore = results.reduce((sum, r) => sum + r.compliance_score, 0) / results.length;
    
    console.log('[Batch Validate] Complete:', totalValid, '/', results.length, 'valid, avg score:', avgScore.toFixed(1));
    
    return Response.json({
      success: true,
      total_entries: results.length,
      valid_entries: totalValid,
      invalid_entries: results.length - totalValid,
      average_compliance_score: avgScore,
      results,
      batch_ready: totalValid === results.length && avgScore >= 90
    });
    
  } catch (error) {
    console.error('[Batch Validate] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
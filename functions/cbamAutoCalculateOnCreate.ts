import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { AuditTrailServiceEnforcer } from './services/AuditTrailServiceEnforcer.js';

// Complex goods precursor mappings
const COMPLEX_GOODS = {
  '72081000': true, '72082500': true, '72111300': true, '72111400': true,
  '76041000': true, '76042100': true, '76061100': true, '76061200': true
};

const DEFAULT_PRECURSORS = {
  '72081000': [
    { cn: '72011000', qty_ratio: 0.5 },
    { cn: '72031000', qty_ratio: 0.4 },
    { cn: '72041000', qty_ratio: 0.1 }
  ],
  '72111300': [
    { cn: '72081000', qty_ratio: 0.95 },
    { cn: '72011000', qty_ratio: 0.05 }
  ]
};

/**
 * CBAM Auto-Calculate on Entry Creation
 * Webhook/trigger to automatically calculate emissions when entry is created
 * MANDATORY: All updates logged to AuditTrailService
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entry_id } = await req.json();
    const auditService = new AuditTrailServiceEnforcer(base44, user);
    
    if (!entry_id) {
      return Response.json({ error: 'entry_id required' }, { status: 400 });
    }
    
    console.log('[Auto-Calc] Processing entry:', entry_id);
    
    // Fetch entry with tenant isolation (required for multi-tenancy)
    const tenant_id = user.tenant_id || 'default';
    const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({
      tenant_id,
      id: entry_id
    });
    const entry = entries[0];
    
    if (!entry) {
      return Response.json({ error: 'Entry not found' }, { status: 404 });
    }
    
    // Skip if already calculated
    if (entry.total_embedded_emissions && entry.total_embedded_emissions > 0) {
      console.log('[Auto-Calc] Entry already has emissions, skipping');
      return Response.json({ 
        success: true, 
        message: 'Entry already calculated',
        emissions: entry.total_embedded_emissions
      });
    }
    
    // Validate required fields
    const cn_code = entry.cn_code || entry.hs_code;
    const quantity = entry.quantity || entry.net_mass_tonnes;

    if (!cn_code || !entry.country_of_origin || !quantity) {
      console.log('[Auto-Calc] Missing required fields, skipping calculation');
      return Response.json({
        success: false,
        message: 'Missing required fields for calculation'
      });
    }

    // AUTO-APPLY: If complex good with no precursors, apply defaults
    let precursors_used = entry.precursors_used || [];
    if (COMPLEX_GOODS[cn_code] && (!precursors_used || precursors_used.length === 0)) {
      const defaultPrecs = DEFAULT_PRECURSORS[cn_code] || [];
      precursors_used = defaultPrecs.map(p => ({
        precursor_cn_code: p.cn,
        quantity_consumed: (quantity * p.qty_ratio).toFixed(3),
        reporting_period_year: 2026,
        value_type: 'default',
        validation_status: 'auto_default',
        emissions_embedded: 0 // Will be calculated by engine
      }));
      console.log(`[Auto-Calc] Auto-applied ${precursors_used.length} default precursors for complex good ${cn_code}`);
    }
    
    // Call calculation engine with flat payload (no wrapper)
    try {
      // DERIVATION: Calculate method is NOT from user input - derived from verification
      const calcResult = await base44.asServiceRole.functions.invoke('cbamCalculationEngine', {
        cn_code,
        country_of_origin: entry.country_of_origin,
        quantity,
        // Method MUST NOT be set here - engine will derive from verification_status
        verification_status: entry.verification_status,
        evidence_reference: entry.evidence_reference || entry.verification_report_id,
        production_route: entry.production_route,
        aggregated_goods_category: entry.aggregated_goods_category || entry.goods_type,
        direct_emissions_specific: entry.direct_emissions_specific || 0,
        indirect_emissions_specific: entry.indirect_emissions_specific || 0,
        reporting_period_year: entry.reporting_period_year || 2026,
        regulatory_version_id: entry.regulatory_version_id || 'CBAM-2026-v1',
        precursors_used: precursors_used,
        include_precursors: true
        });
      
      if (calcResult.data.success) {
         const calc = calcResult.data.calculated_entry;

         // Store old state for audit trail
         const oldState = {
           direct_emissions_specific: entry.direct_emissions_specific,
           indirect_emissions_specific: entry.indirect_emissions_specific,
           total_embedded_emissions: entry.total_embedded_emissions,
           precursor_emissions_embedded: entry.precursor_emissions_embedded,
           precursors_used: entry.precursors_used,
           certificates_required: entry.certificates_required,
           default_value_used: entry.default_value_used,
           default_value_with_markup: entry.default_value_with_markup,
           mark_up_percentage_applied: entry.mark_up_percentage_applied,
           cbam_factor_applied: entry.cbam_factor_applied,
           free_allocation_adjustment: entry.free_allocation_adjustment,
           production_route: entry.production_route
         };

         // Update entry with ALL calculated values from backend
         // CRITICAL: validation_status MUST remain 'pending' until CBAMValidationService explicitly validates
         const updatePayload = {
           direct_emissions_specific: calc.direct_emissions_specific,
           indirect_emissions_specific: calc.indirect_emissions_specific,
           total_embedded_emissions: calc.total_embedded_emissions,
           precursor_emissions_embedded: calc.precursor_emissions_embedded,
           precursors_used: calc.precursors_used,
           certificates_required: calc.certificates_required,
           default_value_used: calc.default_value_used,
           default_value_with_markup: calc.default_value_with_markup,
           mark_up_percentage_applied: calc.mark_up_percentage_applied,
           cbam_factor_applied: calc.cbam_factor_applied,
           free_allocation_adjustment: calc.free_allocation_adjustment,
           production_route: calc.production_route,
           functional_unit: 'tonnes',
           regulatory_version_id: calc.regulatory_version_id
           // validation_status MUST NOT be set here - CBAMValidationService only
         };
         await base44.asServiceRole.entities.CBAMEmissionEntry.update(entry_id, updatePayload);

         // MANDATORY AUDIT TRAIL LOG
         await auditService.logCalculation(
           entry_id,
           oldState,
           updatePayload,
           'Automatic calculation on entry creation (CN code + quantity provided)'
         );
        
        console.log('[Auto-Calc] Successfully calculated:', calc.total_embedded_emissions, 'tCO2e');
        
        return Response.json({
          success: true,
          entry_id,
          emissions_calculated: calc.total_embedded_emissions,
          certificates_required: calc.certificates_required
        });
      } else {
        throw new Error(calcResult.data.error || 'Calculation failed');
      }
    } catch (calcError) {
      console.error('[Auto-Calc] Calculation error:', calcError);
      return Response.json({
        success: false,
        error: calcError.message
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[Auto-Calc] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
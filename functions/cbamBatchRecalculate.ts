import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { AuditTrailServiceEnforcer } from './services/AuditTrailServiceEnforcer.js';

/**
 * CBAM Batch Recalculate - Repair broken entries
 * Recalculates all entries with zero emissions
 * MANDATORY: All updates logged individually to AuditTrailService
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { entry_ids } = await req.json();
    const auditService = new AuditTrailServiceEnforcer(base44, user);
    const batchId = `batch-${Date.now()}`;
    
    console.log('[Batch Recalc] Starting for', entry_ids?.length || 'all', 'entries');
    
    // Get entries to recalculate with tenant isolation
    const tenant_id = user.tenant_id || 'default';
    const allEntries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({
      tenant_id
    });
    
    const entriesToFix = entry_ids 
      ? allEntries.filter(e => entry_ids.includes(e.id))
      : allEntries.filter(e => 
          !e.total_embedded_emissions || 
          e.total_embedded_emissions === 0 ||
          e.validation_status === 'requires_calculation'
        );
    
    console.log('[Batch Recalc] Found', entriesToFix.length, 'entries to fix');
    
    const results = {
      total: entriesToFix.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    // Process each entry
    for (const entry of entriesToFix) {
      try {
        // Prepare payload with field normalization
        // DERIVATION: Method NOT set by user - engine derives from verification state
        const payload = {
          cn_code: entry.cn_code || entry.hs_code,
          country_of_origin: entry.country_of_origin,
          quantity: entry.quantity || entry.net_mass_tonnes,
          production_route: entry.production_route || 'weighted_average_all_routes',
          direct_emissions_specific: entry.direct_emissions_specific,
          indirect_emissions_specific: entry.indirect_emissions_specific,
          verification_status: entry.verification_status,
          evidence_reference: entry.evidence_reference || entry.verification_report_id,
          reporting_period_year: entry.reporting_period_year || 2026,
          regulatory_version_id: entry.regulatory_version_id || 'CBAM-2026-v1'
        };
        
        // Skip if missing critical fields
        if (!payload.cn_code || !payload.country_of_origin || !payload.quantity) {
          results.failed++;
          results.errors.push({ id: entry.id, error: 'Missing required fields' });
          continue;
        }
        
        // Call calculation engine
        const calcResult = await base44.asServiceRole.functions.invoke('cbamCalculationEngine', payload);
        
        if (!calcResult.data?.success) {
          results.failed++;
          results.errors.push({ id: entry.id, error: calcResult.data?.error || 'Calculation failed' });
          continue;
        }
        
        const calculated = calcResult.data.calculated_entry;
        
        // Store old state for audit trail
        const oldState = {
          direct_emissions_specific: entry.direct_emissions_specific,
          indirect_emissions_specific: entry.indirect_emissions_specific,
          total_embedded_emissions: entry.total_embedded_emissions,
          certificates_required: entry.certificates_required,
          free_allocation_adjustment: entry.free_allocation_adjustment,
          default_value_used: entry.default_value_used,
          default_value_with_markup: entry.default_value_with_markup,
          mark_up_percentage_applied: entry.mark_up_percentage_applied,
          calculation_method: entry.calculation_method
        };

        // Update entry with calculated values
        // CRITICAL: validation_status MUST remain 'pending' - CBAMValidationService only
        const batchUpdatePayload = {
          direct_emissions_specific: calculated.direct_emissions_specific,
          indirect_emissions_specific: calculated.indirect_emissions_specific,
          total_embedded_emissions: calculated.total_embedded_emissions,
          certificates_required: calculated.certificates_required,
          free_allocation_adjustment: calculated.free_allocation_adjustment,
          default_value_used: calculated.default_value_used,
          default_value_with_markup: calculated.default_value_with_markup,
          mark_up_percentage_applied: calculated.mark_up_percentage_applied,
          calculation_method: payload.calculation_method,
          regulatory_version_id: calculated.regulatory_version_id
          // validation_status MUST NOT be set - CBAMValidationService only
        };
        await base44.asServiceRole.entities.CBAMEmissionEntry.update(entry.id, batchUpdatePayload);

        // MANDATORY AUDIT TRAIL LOG
        await auditService.logBatchRecalculation(
          entry.id,
          oldState,
          batchUpdatePayload,
          batchId,
          `Batch recalculation (zero-emission repair)`
        );
        
        results.success++;
        console.log('[Batch Recalc] Fixed', entry.id, '→', calculated.total_embedded_emissions.toFixed(2), 'tCO2e');
        
      } catch (error) {
        results.failed++;
        results.errors.push({ id: entry.id, error: error.message });
        console.error('[Batch Recalc] Error for', entry.id, ':', error.message);
      }
    }
    
    console.log('[Batch Recalc] Complete:', results.success, 'success,', results.failed, 'failed');
    
    return Response.json({
      success: true,
      results,
      message: `Recalculated ${results.success}/${results.total} entries`
    });
    
  } catch (error) {
    console.error('[Batch Recalc] Fatal error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
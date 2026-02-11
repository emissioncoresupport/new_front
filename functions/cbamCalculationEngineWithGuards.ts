/**
 * CBAM CALCULATION ENGINE v3 - WITH VALIDATION GATES
 * Enforces: precursor year validation BEFORE calculation
 * No direct validation_status assignment
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { entry_id, entry_data } = payload;
    const entry = entry_data || payload;
    
    // ============ GATE 1: PRECURSOR PRE-VALIDATION (must run before calculation) ============
    if (entry_id) {
      const precursorPreValidation = await base44.asServiceRole.functions.invoke(
        'cbamPrecursorPreValidator',
        { entry_id, entry_data: entry }
      );
      
      if (!precursorPreValidation.data.success) {
        return Response.json({
          success: false,
          error: precursorPreValidation.data.error || precursorPreValidation.data.message,
          blocked_reason: precursorPreValidation.data.blocking_issue || 'precursor_validation_failed',
          blocking_issues: precursorPreValidation.data.blocking_issues
        }, { status: 400 });
      }

      // Inject validated precursors into payload
      entry.precursors_used = precursorPreValidation.data.validated_precursors || [];
    }
    
    // ============ GATE 2: CALL PURE CALCULATION (with pre-validated precursors) ============
    const calcResult = await base44.asServiceRole.functions.invoke(
      'cbamCalculationEngine',
      entry
    );
    
    if (!calcResult.data.success) {
      return Response.json(calcResult.data, { status: 400 });
    }
    
    // ============ GATE 3: RETURN ONLY CALCULATIONS (NO STATUS ASSIGNMENT) ============
    return Response.json({
      success: true,
      calculated_entry: calcResult.data.calculated_entry,
      breakdown: calcResult.data.breakdown,
      // CRITICAL: validation_status NOT included
      message: 'Calculation complete. Precursor validation enforced.'
    });
    
  } catch (error) {
    console.error('[Engine Guard] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});
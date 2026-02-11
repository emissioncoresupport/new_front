/**
 * CBAM PRECURSOR PRE-VALIDATOR
 * Runs BEFORE calculation engine
 * Validates precursor eligibility and year alignment
 * Returns validated precursor snapshots for calculation
 * 
 * Order: Entry → THIS SERVICE → Calculation
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entry_id, entry_data } = await req.json();

    if (!entry_id || !entry_data) {
      return Response.json({ error: 'entry_id and entry_data required' }, { status: 400 });
    }

    // ========== GATE 1: ENTRY MUST EXIST (with tenant isolation) ==========
    const tenant_id = user.tenant_id || 'default';
    const entries = await base44.entities.CBAMEmissionEntry.filter({
      tenant_id,
      id: entry_id
    });
    if (!entries.length) {
      return Response.json({ error: 'Entry not found' }, { status: 404 });
    }

    const entry = entries[0];
    const complexGoodYear = entry.reporting_period_year || 2026;
    const cnCode = entry.cn_code || entry_data.cn_code;

    // ========== GATE 2: PRECURSOR YEAR ALIGNMENT CHECK ==========
    const precursorYearBlockingIssues = [];

    if (entry.precursors_used && entry.precursors_used.length > 0) {
      for (const precursor of entry.precursors_used) {
        const precursorYear = precursor.reporting_period_year;

        if (precursorYear !== complexGoodYear) {
          // Check for approved deviation (with tenant isolation)
          const deviations = await base44.entities.CBAMPrecursorYearDeviation.filter({
            tenant_id,
            entry_id,
            precursor_cn_code: precursor.precursor_cn_code
          });

          const approvedDeviation = deviations.find(d => d.status === 'approved');

          if (!approvedDeviation) {
            precursorYearBlockingIssues.push({
              precursor_cn_code: precursor.precursor_cn_code,
              precursor_year: precursorYear,
              complex_good_year: complexGoodYear,
              message: `Year mismatch: precursor ${precursorYear} vs complex good ${complexGoodYear}. Submit deviation request.`,
              compliance_ref: 'CBAM Art. 14(2)'
            });
          }
        }
      }
    }

    // BLOCK if precursor years misaligned
    if (precursorYearBlockingIssues.length > 0) {
      return Response.json({
        success: false,
        blocked: true,
        reason: 'precursor_year_mismatch',
        blocking_issues: precursorYearBlockingIssues,
        message: `BLOCKED: Precursor year mismatch(es) detected. Submit deviation requests.`
      }, { status: 400 });
    }

    // ========== GATE 3: VALIDATE PRECURSOR SNAPSHOT COMPLETENESS ==========
    const validatedPrecursors = [];

    if (entry.precursors_used && entry.precursors_used.length > 0) {
      for (const p of entry.precursors_used) {
        // Ensure required fields present
        if (!p.precursor_cn_code) {
          return Response.json({
            success: false,
            error: `Precursor validation failed: missing precursor_cn_code`,
            blocking_issue: 'precursor_incomplete'
          }, { status: 400 });
        }

        if (p.emissions_embedded === undefined) {
          return Response.json({
            success: false,
            error: `Precursor validation failed: missing emissions_embedded for ${p.precursor_cn_code}`,
            blocking_issue: 'precursor_incomplete'
          }, { status: 400 });
        }

        if (p.reporting_period_year === undefined) {
          return Response.json({
            success: false,
            error: `Precursor validation failed: missing reporting_period_year`,
            blocking_issue: 'precursor_incomplete'
          }, { status: 400 });
        }

        // Snapshot is valid
        validatedPrecursors.push({
          precursor_cn_code: p.precursor_cn_code,
          precursor_name: p.precursor_name || 'Unknown',
          quantity_consumed: p.quantity_consumed || 0,
          emissions_embedded: p.emissions_embedded,
          reporting_period_year: p.reporting_period_year,
          value_type: p.value_type || 'actual',
          validation_status: 'pre_validated'
        });
      }
    }

    // Log precursor validation (with tenant isolation)
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id,
      entity_type: 'CBAMEmissionEntry',
      entity_id: entry_id,
      action: 'PRECURSOR_VALIDATION_GATE',
      field: 'precursors_used',
      precursor_count: validatedPrecursors.length,
      year_check_passed: precursorYearBlockingIssues.length === 0,
      snapshot_validation_passed: true,
      regulatory_reference: 'CBAM Art. 14(2) - Precursor Validation Order',
      regulatory_version_id: 'CBAM-2026-v1',
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      blocked: false,
      validated_precursors: validatedPrecursors,
      precursor_count: validatedPrecursors.length,
      year_validation_passed: true,
      message: 'Precursor validation passed. Ready for calculation.'
    });

  } catch (error) {
    console.error('[Precursor Pre-Validator] Error:', error);
    return Response.json({
      success: false,
      error: error.message,
      blocking_issue: 'precursor_validation_error'
    }, { status: 500 });
  }
});
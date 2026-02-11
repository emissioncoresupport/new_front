/**
 * PRECURSOR YEAR VALIDATION ENFORCER
 * Blocks validation/reporting if precursor years misaligned
 * Called before CBAMValidationService workflow
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entry_id } = await req.json();

    // Fetch entry
    const entries = await base44.entities.CBAMEmissionEntry.filter({
      id: entry_id
    });

    const entry = entries[0];
    if (!entry) {
      return Response.json({ error: 'Entry not found' }, { status: 404 });
    }

    // No precursors = pass
    if (!entry.precursors_used || entry.precursors_used.length === 0) {
      return Response.json({
        success: true,
        blocked: false,
        reason: 'no_precursors'
      });
    }

    const blockingIssues = [];

    // Check each precursor
    for (const precursor of entry.precursors_used) {
      const precursorYear = precursor.reporting_period_year;
      const complexGoodYear = entry.reporting_period_year;

      // Year mismatch?
      if (precursorYear !== complexGoodYear) {
        // Check for approved deviation
        const deviations = await base44.entities.CBAMPrecursorYearDeviation.filter({
          entry_id,
          precursor_cn_code: precursor.precursor_cn_code
        });

        const approvedDeviation = deviations.find(d => d.status === 'approved');

        if (!approvedDeviation) {
          blockingIssues.push({
            precursor_cn_code: precursor.precursor_cn_code,
            precursor_year: precursorYear,
            complex_good_year: complexGoodYear,
            message: `Year mismatch: precursor ${precursorYear} vs complex good ${complexGoodYear}. Submit deviation request for approval.`,
            compliance_risk: 'CBAM Art. 14(2) – Precursor year alignment'
          });
        }
      }
    }

    // ENFORCE BLOCKING
    if (blockingIssues.length > 0) {
      return Response.json({
        success: false,
        blocked: true,
        reason: 'precursor_year_mismatch',
        blocking_issues: blockingIssues,
        message: `Validation BLOCKED: ${blockingIssues.length} precursor year mismatch(es) without approved deviation. Submit deviation requests for each.`
      }, { status: 400 });
    }

    // All precursor years valid
    return Response.json({
      success: true,
      blocked: false,
      reason: 'all_precursor_years_valid'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
/**
 * REQUEST PRECURSOR YEAR DEVIATION
 * User submits deviation request with justification + evidence
 * Precursor year mismatch cannot proceed without approval
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      entry_id,
      precursor_cn_code,
      precursor_year,
      complex_good_year,
      justification,
      evidence_reference
    } = await req.json();

    // Validate required fields
    if (!justification || justification.trim().length < 20) {
      return Response.json(
        { success: false, error: 'Justification must be at least 20 characters' },
        { status: 400 }
      );
    }

    if (!evidence_reference || !evidence_reference.trim()) {
      return Response.json(
        { success: false, error: 'Evidence reference required' },
        { status: 400 }
      );
    }

    // Create deviation record
    const deviation = await base44.entities.CBAMPrecursorYearDeviation.create({
      entry_id,
      precursor_cn_code,
      precursor_year,
      complex_good_year,
      justification: justification.trim(),
      evidence_reference: evidence_reference.trim(),
      requested_by: user.email,
      requested_date: new Date().toISOString(),
      status: 'pending_approval'
    });

    return Response.json({
      success: true,
      deviation,
      message: 'Deviation request submitted for admin approval'
    });

  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});
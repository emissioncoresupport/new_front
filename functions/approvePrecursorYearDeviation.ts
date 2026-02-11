/**
 * APPROVE PRECURSOR YEAR DEVIATION
 * ADMIN ONLY – Approves year mismatch deviation
 * Once approved, validation/reporting can proceed
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { deviation_id, approval_notes } = await req.json();

    // Find deviation
    const deviations = await base44.entities.CBAMPrecursorYearDeviation.filter({
      id: deviation_id
    });

    const deviation = deviations[0];
    if (!deviation) {
      return Response.json(
        { success: false, error: 'Deviation not found' },
        { status: 404 }
      );
    }

    if (deviation.status !== 'pending_approval') {
      return Response.json(
        { success: false, error: `Cannot approve – status is ${deviation.status}` },
        { status: 400 }
      );
    }

    // Approve
    const approved = await base44.entities.CBAMPrecursorYearDeviation.update(
      deviation_id,
      {
        status: 'approved',
        approved_by: user.email,
        approved_date: new Date().toISOString(),
        approval_notes: approval_notes || ''
      }
    );

    return Response.json({
      success: true,
      deviation: approved,
      message: 'Precursor year deviation approved'
    });

  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});
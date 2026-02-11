import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SUPPLIER PORTAL ADAPTER
 * 
 * Thin wrapper over universal ingestEvidence core.
 * Handles supplier-submitted data, links via token, delegates to core.
 * 
 * DECLARATIVE authority only (suppliers declare, not authoritative).
 * NO independent logic.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id, entity_context_id, submission_data, supplier_email } = await req.json();

    if (!profile_id || !entity_context_id || !submission_data) {
      return Response.json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Missing required fields'
      }, { status: 400 });
    }

    const profile = await base44.asServiceRole.entities.IngestionProfile.get(profile_id);

    if (!profile) {
      return Response.json({
        success: false,
        error: 'PROFILE_NOT_FOUND'
      }, { status: 404 });
    }

    // Validate profile is for portal submissions
    if (profile.ingestion_path !== 'Portal') {
      return Response.json({
        success: false,
        error: 'PATH_MISMATCH',
        message: `Profile ingestion_path must be Portal`
      }, { status: 403 });
    }

    // Portal submissions are always DECLARATIVE
    if (profile.authority_type !== 'Declarative') {
      return Response.json({
        success: false,
        error: 'AUTHORITY_MISMATCH',
        message: 'Supplier Portal submissions must be Declarative authority'
      }, { status: 403 });
    }

    // Enrich submission with supplier identity (for audit only, NO mutation)
    const payload = {
      ...submission_data,
      supplier_email,
      submission_timestamp: new Date().toISOString(),
      submission_source: 'SUPPLIER_PORTAL'
    };

    // CALL UNIVERSAL CORE
    const response = await base44.functions.invoke('ingestEvidence', {
      tenant_id: profile.tenant_id,
      profile_id,
      entity_context_id,
      ingestion_path: 'SUPPLIER_PORTAL',
      authority_type: profile.authority_type,
      payload,
      actor_id: supplier_email || user.email,
      command_id: `PORTAL-${profile_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    return Response.json({
      success: response.data.success,
      supplier_portal_submission: true,
      evidence_id: response.data.evidence_id,
      supplier_email,
      message: 'Submission received and logged as Evidence (RAW state). Awaiting classification.'
    });

  } catch (error) {
    console.error('Supplier Portal Error:', error);
    return Response.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
});
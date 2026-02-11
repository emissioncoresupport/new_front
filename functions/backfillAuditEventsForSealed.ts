import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * BACKFILL AUDIT EVENTS — Admin-only job to create missing SEALED audit events
 * Ensures every SEALED record has at least one audit event
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const tenantId = user.tenant_id || user.id;

    // Get all SEALED evidence
    const sealedEvidence = await base44.asServiceRole.entities.Evidence.filter({
      evidence_status: 'SEALED',
      tenant_id: tenantId
    });

    let backfilledCount = 0;
    let skippedCount = 0;

    for (const evidence of sealedEvidence) {
      // Check if SEALED audit event exists
      const auditEvents = await base44.asServiceRole.entities.AuditEvent.filter({
        evidence_id: evidence.evidence_id,
        action: 'SEALED',
        tenant_id: tenantId
      });

      if (auditEvents.length === 0) {
        // Create backfilled SEALED audit event
        await base44.asServiceRole.entities.AuditEvent.create({
          audit_event_id: crypto.randomUUID(),
          tenant_id: tenantId,
          evidence_id: evidence.evidence_id,
          actor_user_id: 'SYSTEM',
          actor_email: 'system@base44',
          action: 'SEALED',
          reason_code: 'BACKFILL',
          before_status: 'INGESTED',
          after_status: 'SEALED',
          before_hash: null,
          after_hash: evidence.payload_hash_sha256,
          request_id: requestId,
          context_json: {
            backfilled: true,
            sealed_at_utc: evidence.sealed_at_utc,
            payload_hash: evidence.payload_hash_sha256,
            metadata_hash: evidence.metadata_hash_sha256
          },
          created_at_utc: evidence.sealed_at_utc || new Date().toISOString(),
          is_backfilled: true
        });

        backfilledCount++;
      } else {
        skippedCount++;
      }
    }

    // Log backfill job completion
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      evidence_id: 'SYSTEM_JOB',
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'BACKFILL_COMPLETE',
      reason_code: 'SCHEDULED_JOB',
      request_id: requestId,
      context_json: {
        sealed_count: sealedEvidence.length,
        backfilled_count: backfilledCount,
        skipped_count: skippedCount
      },
      created_at_utc: new Date().toISOString()
    });

    return Response.json({
      success: true,
      sealed_count: sealedEvidence.length,
      backfilled_events: backfilledCount,
      skipped_events: skippedCount,
      message: 'Backfill complete',
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[BACKFILL_AUDIT_EVENTS]', error);
    return Response.json({
      success: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
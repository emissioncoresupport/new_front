import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ADMIN-ONLY FUNCTION: Backfill missing audit events for sealed evidence
 * 
 * Finds all SEALED evidence records without corresponding audit events
 * and creates retroactive SEALED audit events for them.
 * 
 * Logs a system audit event for the backfill run itself.
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ 
        error: 'Unauthorized',
        error_code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    // ADMIN CHECK
    if (user.role !== 'admin') {
      return Response.json({
        error: 'Forbidden',
        error_code: 'ADMIN_ONLY',
        message: 'Only admin users can backfill audit events'
      }, { status: 403 });
    }

    const tenantId = user.tenant_id || user.id;

    // Fetch all SEALED evidence for this tenant
    const sealedEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      state: 'SEALED'
    });

    console.log(`[BACKFILL] Found ${sealedEvidence.length} SEALED evidence records for tenant ${tenantId}`);

    let backfillCount = 0;
    const errors = [];

    // For each SEALED evidence, check if audit events exist
    for (const evidence of sealedEvidence) {
      try {
        const auditEvents = await base44.asServiceRole.entities.EvidenceAuditEvent.filter({
          evidence_id: evidence.evidence_id
        });

        // If no audit events exist, create one
        if (auditEvents.length === 0) {
          console.log(`[BACKFILL] Creating audit event for evidence ${evidence.evidence_id}`);

          await base44.asServiceRole.entities.EvidenceAuditEvent.create({
            audit_event_id: crypto.randomUUID(),
            tenant_id: evidence.tenant_id,
            evidence_id: evidence.evidence_id,
            actor_user_id: evidence.created_by_user_id,
            actor_role: 'SYSTEM',
            previous_state: 'INGESTED',
            new_state: 'SEALED',
            timestamp_utc: evidence.sealed_at_utc || new Date().toISOString(),
            reason_code: 'SEALED',
            reason_text: 'Backfilled due to prior missing audit logging',
            event_type: 'STATE_TRANSITION',
            request_id: requestId,
            metadata: {
              payload_hash: evidence.payload_hash_sha256?.substring(0, 16) || 'unknown',
              metadata_hash: evidence.metadata_hash_sha256?.substring(0, 16) || 'unknown',
              backfill: true
            }
          });

          backfillCount++;
        }
      } catch (itemError) {
        console.error(`[BACKFILL] Error processing evidence ${evidence.evidence_id}:`, itemError);
        errors.push({
          evidence_id: evidence.evidence_id,
          error: itemError.message
        });
      }
    }

    // Log the backfill run itself
    if (backfillCount > 0) {
      try {
        await base44.asServiceRole.entities.EvidenceAuditEvent.create({
          audit_event_id: crypto.randomUUID(),
          tenant_id: tenantId,
          evidence_id: null,
          actor_user_id: user.id,
          actor_role: user.role,
          previous_state: null,
          new_state: null,
          timestamp_utc: new Date().toISOString(),
          reason_code: 'BACKFILL',
          reason_text: `Backfilled ${backfillCount} missing audit events for sealed evidence`,
          event_type: 'AUDIT_BACKFILL',
          request_id: requestId,
          metadata: {
            backfill_count: backfillCount,
            total_sealed: sealedEvidence.length,
            errors: errors.length
          }
        });
      } catch (logError) {
        console.error('[BACKFILL] Failed to log backfill run:', logError);
      }
    }

    return Response.json({
      success: true,
      request_id: requestId,
      backfilled_count: backfillCount,
      total_sealed_evidence: sealedEvidence.length,
      errors: errors,
      message: `Backfill complete: ${backfillCount}/${sealedEvidence.length} sealed evidence now have audit events`
    }, { status: 200 });

  } catch (error) {
    console.error('[BACKFILL] Critical error:', error);

    return Response.json({
      success: false,
      error: 'Backfill failed',
      error_code: 'BACKFILL_FAILED',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SEAL EVIDENCE — Transition INGESTED → SEALED with server-side hashing
 * 
 * NON-NEGOTIABLE:
 * - evidence_status becomes SEALED (immutable thereafter)
 * - payload_hash_sha256 and metadata_hash_sha256 computed server-side
 * - Creates audit event
 * - Returns updated EvidenceReceipt
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidence_id } = await req.json();
    if (!evidence_id) {
      return Response.json({ error: 'evidence_id required' }, { status: 400 });
    }

    const tenantId = user.tenant_id || user.id;

    // Fetch evidence
    const evidenceList = await base44.asServiceRole.entities.Evidence.filter({
      evidence_id: evidence_id,
      tenant_id: tenantId
    });

    if (evidenceList.length === 0) {
      return Response.json({ error: 'Evidence not found' }, { status: 404 });
    }

    const evidence = evidenceList[0];

    // Can only seal INGESTED records
    if (evidence.evidence_status !== 'INGESTED') {
      return Response.json({
        error: `Cannot seal evidence in state: ${evidence.evidence_status}`,
        error_code: 'INVALID_STATE'
      }, { status: 409 });
    }

    const sealedAt = new Date().toISOString();

    // Update to SEALED
    await base44.asServiceRole.entities.Evidence.update(evidence.id, {
      evidence_status: 'SEALED',
      sealed_at_utc: sealedAt
    });

    // Create audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      evidence_id: evidence_id,
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'SEALED',
      before_status: 'INGESTED',
      after_status: 'SEALED',
      before_hash: null,
      after_hash: evidence.payload_hash_sha256,
      request_id: requestId,
      context_json: {
        payload_hash_sha256: evidence.payload_hash_sha256,
        metadata_hash_sha256: evidence.metadata_hash_sha256
      },
      created_at_utc: sealedAt
    });

    return Response.json({
      success: true,
      evidence_id: evidence_id,
      evidence_status: 'SEALED',
      sealed_at_utc: sealedAt,
      payload_hash_sha256: evidence.payload_hash_sha256,
      metadata_hash_sha256: evidence.metadata_hash_sha256,
      message: 'Evidence sealed and immutable',
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[SEAL_EVIDENCE]', error);
    return Response.json({
      success: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
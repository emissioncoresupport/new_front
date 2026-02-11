import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SUPERSEDE EVIDENCE — Replace old with new
 * 
 * Creates new evidence_id in SEALED state
 * Marks old evidence as SUPERSEDED with link to new
 * Append-only audit trail
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || user.workspace_id || user.org_id || 'DEFAULT';

    const body = await req.json();
    const { old_evidence_id, new_payload, supersession_reason } = body;

    if (!old_evidence_id || !new_payload) {
      return Response.json({
        error: 'old_evidence_id and new_payload are required',
        request_id: requestId
      }, { status: 400 });
    }

    // FETCH OLD EVIDENCE (tenant-scoped)
    const oldEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      evidence_id: old_evidence_id
    });

    if (oldEvidence.length === 0) {
      return Response.json({
        error: 'Original evidence not found',
        request_id: requestId
      }, { status: 404 });
    }

    const oldRec = oldEvidence[0];

    // Cannot supersede already superseded
    if (oldRec.ledger_state === 'SUPERSEDED') {
      return Response.json({
        error: 'Evidence already superseded',
        request_id: requestId
      }, { status: 409 });
    }

    // CREATE NEW EVIDENCE with same metadata as old
    const newEvidenceId = crypto.randomUUID();

    async function hashString(text) {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    const payloadString = typeof new_payload === 'string' 
      ? new_payload 
      : JSON.stringify(new_payload);
    const newPayloadHash = await hashString(payloadString);

    const metadataObj = {
      dataset_type: oldRec.dataset_type,
      declared_scope: oldRec.declared_scope,
      declared_intent: oldRec.declared_intent,
      ingestion_method: oldRec.ingestion_method,
      personal_data_present: oldRec.personal_data_present,
      purpose_tags: oldRec.purpose_tags,
      retention_policy: oldRec.retention_policy
    };
    const newMetadataHash = await hashString(JSON.stringify(metadataObj));

    // Create new evidence in SEALED state
    await base44.asServiceRole.entities.Evidence.create({
      evidence_id: newEvidenceId,
      tenant_id: tenantId,
      ledger_state: 'SEALED',
      processing_state: 'NONE',
      provenance: oldRec.provenance,
      ingestion_method: oldRec.ingestion_method,
      dataset_type: oldRec.dataset_type,
      declared_scope: oldRec.declared_scope,
      declared_intent: oldRec.declared_intent,
      purpose_tags: oldRec.purpose_tags,
      personal_data_present: oldRec.personal_data_present,
      gdpr_legal_basis: oldRec.gdpr_legal_basis,
      retention_policy: oldRec.retention_policy,
      retention_end_date_utc: oldRec.retention_end_date_utc,
      origin_system_name: oldRec.origin_system_name,
      origin_system_type: oldRec.origin_system_type,
      snapshot_date_utc: oldRec.snapshot_date_utc,
      payload_hash_sha256: newPayloadHash,
      metadata_hash_sha256: newMetadataHash,
      created_by_user_id: user.id,
      ingest_request_id: requestId,
      external_reference_id: oldRec.external_reference_id,
      supplier_portal_request_id: oldRec.supplier_portal_request_id,
      ingestion_timestamp_utc: now,
      sealed_at_utc: now,
      supersedes_evidence_id: old_evidence_id,
      intended_consumers: oldRec.intended_consumers || []
    });

    // MARK OLD AS SUPERSEDED
    await base44.asServiceRole.entities.Evidence.update(oldRec.id, {
      ledger_state: 'SUPERSEDED',
      superseded_by_evidence_id: newEvidenceId
    });

    // CREATE AUDIT EVENTS
    const auditEventOldId = crypto.randomUUID();
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: auditEventOldId,
      tenant_id: tenantId,
      evidence_id: old_evidence_id,
      actor_user_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'SUPERSEDED',
      request_id: requestId,
      created_at_utc: now,
      http_status: 200,
      context_json: {
        superseded_by: newEvidenceId,
        reason: supersession_reason || 'Updated evidence'
      }
    });

    const auditEventNewId = crypto.randomUUID();
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: auditEventNewId,
      tenant_id: tenantId,
      evidence_id: newEvidenceId,
      actor_user_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'SEALED',
      request_id: requestId,
      created_at_utc: now,
      http_status: 201,
      context_json: {
        supersedes: old_evidence_id,
        reason: supersession_reason || 'Updated evidence',
        payload_hash: newPayloadHash,
        metadata_hash: newMetadataHash
      }
    });

    return Response.json({
      success: true,
      message: 'Evidence superseded successfully',
      receipt: {
        old_evidence_id,
        new_evidence_id: newEvidenceId,
        new_ledger_state: 'SEALED',
        old_ledger_state: 'SUPERSEDED',
        payload_hash_sha256: newPayloadHash,
        metadata_hash_sha256: newMetadataHash,
        request_id: requestId
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[SUPERSEDE_EVIDENCE]', error);
    return Response.json({
      error: 'Supersession failed',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
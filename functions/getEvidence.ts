import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * GET EVIDENCE — Tenant-scoped retrieval
 * 
 * Returns 404 if evidence not found (tenant isolation enforced)
 * Includes full provenance, hashes, and audit trail metadata
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { evidence_id } = body;

    if (!evidence_id) {
      return Response.json({
        error: 'evidence_id is required',
        request_id: requestId
      }, { status: 400 });
    }

    // TENANT-SCOPED FETCH
    const evidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      evidence_id
    });

    if (evidence.length === 0) {
      return Response.json({
        error: 'Evidence not found',
        request_id: requestId
      }, { status: 404 });
    }

    const rec = evidence[0];

    // FETCH AUDIT TRAIL
    const auditEvents = await base44.asServiceRole.entities.AuditEvent.filter({
      tenant_id: tenantId,
      evidence_id
    });

    return Response.json({
      success: true,
      evidence: {
        evidence_id: rec.evidence_id,
        tenant_id: rec.tenant_id,
        ledger_state: rec.ledger_state,
        processing_state: rec.processing_state,
        provenance: rec.provenance,
        ingestion_method: rec.ingestion_method,
        dataset_type: rec.dataset_type,
        declared_scope: rec.declared_scope,
        declared_intent: rec.declared_intent,
        purpose_tags: rec.purpose_tags,
        personal_data_present: rec.personal_data_present,
        gdpr_legal_basis: rec.gdpr_legal_basis,
        retention_policy: rec.retention_policy,
        retention_end_date_utc: rec.retention_end_date_utc,
        origin_system_name: rec.origin_system_name,
        origin_system_type: rec.origin_system_type,
        snapshot_date_utc: rec.snapshot_date_utc,
        payload_hash_sha256: rec.payload_hash_sha256,
        metadata_hash_sha256: rec.metadata_hash_sha256,
        seal_hash_sha256: rec.seal_hash_sha256,
        created_by_user_id: rec.created_by_user_id,
        ingest_request_id: rec.ingest_request_id,
        external_reference_id: rec.external_reference_id,
        supplier_portal_request_id: rec.supplier_portal_request_id,
        entry_notes: rec.entry_notes,
        ingestion_timestamp_utc: rec.ingestion_timestamp_utc,
        sealed_at_utc: rec.sealed_at_utc,
        audit_event_count: rec.audit_event_count,
        intended_consumers: rec.intended_consumers,
        supersedes_evidence_id: rec.supersedes_evidence_id,
        superseded_by_evidence_id: rec.superseded_by_evidence_id
      },
      audit_trail: auditEvents.map(e => ({
        audit_event_id: e.audit_event_id,
        action: e.action,
        actor_email: e.actor_email,
        created_at_utc: e.created_at_utc,
        http_status: e.http_status,
        context: e.context_json
      })),
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    console.error('[GET_EVIDENCE]', error);
    return Response.json({
      error: 'Retrieval failed',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
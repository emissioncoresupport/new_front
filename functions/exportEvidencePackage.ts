import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * EXPORT EVIDENCE PACKAGE
 * 
 * Returns: metadata + hashes + audit events (no secrets, no credentials)
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'POST only' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ok: false, error_code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { evidence_id, request_id } = await req.json();

    if (!request_id) {
      return Response.json({
        ok: false,
        error_code: 'MISSING_REQUIRED_METADATA',
        message: 'request_id is required',
        field: 'request_id'
      }, { status: 422 });
    }

    const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || 'DEFAULT';

    // Fetch evidence
    const records = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: tenantId,
      evidence_id
    });

    if (records.length === 0) {
      return Response.json({
        ok: false,
        error_code: 'NOT_FOUND',
        message: 'Evidence not found',
        request_id
      }, { status: 404 });
    }

    const evidence = records[0];

    // Fetch audit events
    const auditEvents = await base44.asServiceRole.entities.AuditEvent.filter({
      tenant_id: tenantId,
      evidence_id
    });

    // Build package (exclude secrets/credentials)
    const evidencePackage = {
      evidence_id: evidence.evidence_id,
      tenant_id: evidence.tenant_id,
      data_mode: evidence.data_mode,
      origin: evidence.origin,
      ledger_state: evidence.ledger_state,
      ingestion_method: evidence.ingestion_method,
      source_system: evidence.source_system,
      source_system_friendly_name: evidence.source_system_friendly_name,
      dataset_type: evidence.dataset_type,
      declared_scope: evidence.declared_scope,
      primary_intent: evidence.primary_intent,
      purpose_tags: evidence.purpose_tags,
      contains_personal_data: evidence.contains_personal_data,
      gdpr_legal_basis: evidence.gdpr_legal_basis,
      retention_policy: evidence.retention_policy,
      retention_custom_days: evidence.retention_custom_days,
      payload_hash_sha256: evidence.payload_hash_sha256,
      metadata_hash_sha256: evidence.metadata_hash_sha256,
      metadata_canonical_json: evidence.metadata_canonical_json,
      ingestion_timestamp_utc: evidence.ingestion_timestamp_utc,
      sealed_at_utc: evidence.sealed_at_utc,
      retention_ends_at_utc: evidence.retention_ends_at_utc,
      created_by_user_id: evidence.created_by_user_id,
      quarantine_reason: evidence.quarantine_reason,
      quarantine_created_at_utc: evidence.quarantine_created_at_utc,
      quarantined_by: evidence.quarantined_by,
      audit_events: auditEvents.map(ae => ({
        audit_event_id: ae.audit_event_id,
        actor_user_id: ae.actor_user_id,
        actor_email: ae.actor_email,
        action: ae.action,
        created_at_utc: ae.created_at_utc,
        http_status: ae.http_status,
        context_json: ae.context_json
      }))
    };

    // Remove payload_bytes (not in export, only hashes)
    // Remove any connector credentials or API keys

    return Response.json({
      ok: true,
      package: evidencePackage,
      exported_at_utc: new Date().toISOString(),
      request_id
    }, { status: 200 });

  } catch (error) {
    console.error('[EXPORT_EVIDENCE_PACKAGE]', error);
    return Response.json({
      ok: false,
      error_code: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
});
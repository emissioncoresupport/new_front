import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * INGEST EVIDENCE V3 — With mandatory provenance tracking
 * 
 * ENFORCES:
 * - created_via enum (UI, API, TEST_RUNNER, SEED, MIGRATION, CONNECTOR)
 * - created_by_actor_id (required)
 * - request_id (correlation ID)
 * - tenant_id (server-set)
 * - Sets PROVENANCE_INCOMPLETE=true if any field missing
 */

async function hashString(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      ingestion_method,
      dataset_type,
      source_system,
      declared_scope,
      scope_target_id,
      declared_intent,
      intended_consumers,
      contains_personal_data,
      gdpr_legal_basis,
      data_minimization_confirmed,
      retention_policy,
      retention_custom_days
    } = body;

    // Validate all required fields
    const missingFields = [];
    if (!ingestion_method) missingFields.push('ingestion_method');
    if (!dataset_type) missingFields.push('dataset_type');
    if (!source_system) missingFields.push('source_system');
    if (!declared_scope) missingFields.push('declared_scope');
    if (!declared_intent) missingFields.push('declared_intent');
    if (!intended_consumers || intended_consumers.length === 0) missingFields.push('intended_consumers');
    if (contains_personal_data === undefined || contains_personal_data === null) missingFields.push('contains_personal_data');
    if (data_minimization_confirmed === undefined || data_minimization_confirmed === null) missingFields.push('data_minimization_confirmed');
    if (!retention_policy) missingFields.push('retention_policy');

    if (missingFields.length > 0) {
      return Response.json({
        error: 'Missing required fields',
        missing_fields: missingFields,
        request_id: requestId
      }, { status: 400 });
    }

    const tenantId = user.tenant_id || user.id;
    const evidenceId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Determine processing_status based on ingestion_method
    let processingStatus = 'NONE';
    if (['FILE_UPLOAD', 'ERP_EXPORT', 'API_PUSH', 'SUPPLIER_PORTAL'].includes(ingestion_method)) {
      processingStatus = 'RAW';
    }

    // Compute hashes (server-side only)
    const metadataString = JSON.stringify({
      dataset_type,
      source_system,
      declared_scope,
      declared_intent,
      intended_consumers,
      contains_personal_data,
      data_minimization_confirmed,
      retention_policy
    });
    const metadataHash = await hashString(metadataString);
    const payloadHash = await hashString(JSON.stringify(body)); // Simplified for demo

    // Provenance fields
    const createdVia = 'API';
    const createdByActorId = user.id;
    
    // Check provenance completeness
    const provenanceIncomplete = !createdVia || !createdByActorId || !requestId || !tenantId;

    // Create Evidence record
    const evidence = await base44.asServiceRole.entities.Evidence.create({
      evidence_id: evidenceId,
      tenant_id: tenantId,
      evidence_status: 'INGESTED',
      processing_status: processingStatus,
      created_via: createdVia,
      created_by_actor_id: createdByActorId,
      request_id: requestId,
      provenance_incomplete: provenanceIncomplete,
      ingestion_method,
      dataset_type,
      source_system,
      declared_scope,
      scope_target_id,
      declared_intent,
      intended_consumers,
      contains_personal_data,
      gdpr_legal_basis: contains_personal_data ? gdpr_legal_basis : null,
      data_minimization_confirmed,
      retention_policy,
      retention_custom_days,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metadataHash,
      ingestion_timestamp_utc: now,
      created_by_user_id: user.id,
      created_by_email: user.email
    });

    // Create INGESTED audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      evidence_id: evidenceId,
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'INGESTED',
      reason_code: ingestion_method,
      after_status: 'INGESTED',
      request_id: requestId,
      context_json: {
        dataset_type,
        source_system,
        provenance_complete: !provenanceIncomplete
      },
      created_at_utc: now
    });

    return Response.json({
      success: true,
      evidence_id: evidenceId,
      evidence_status: 'INGESTED',
      processing_status: processingStatus,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metadataHash,
      provenance_incomplete: provenanceIncomplete,
      created_via: createdVia,
      tenant_id: tenantId,
      request_id: requestId,
      message: 'Evidence ingested successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[INGEST_EVIDENCE_V3]', error);
    return Response.json({
      success: false,
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
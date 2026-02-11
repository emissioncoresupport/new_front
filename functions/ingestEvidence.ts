import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SINGLE INGESTION ENDPOINT - Contract 1 Regulator-Grade
 * 
 * Non-negotiable rules:
 * 1. Explicit declaration (no defaults, no inference)
 * 2. Server-side hashing of payload + metadata
 * 3. Immutable after SEALED
 * 4. Append-only audit trail
 * 5. Idempotency support
 * 6. Tenant isolation enforced
 */

async function hashString(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function validateConditionalFields(body) {
  const errors = [];

  // Conditional: ERP_API requires snapshot_date_utc
  if (body.ingestion_method === 'ERP_API' && !body.snapshot_date_utc) {
    errors.push('snapshot_date_utc required for ERP_API ingestion method');
  }

  // Conditional: SITE scope requires scope_target_id
  if (body.declared_scope === 'SITE' && !body.scope_target_id) {
    errors.push('scope_target_id required for SITE scope');
  }

  // Conditional: contains_personal_data=true requires gdpr_legal_basis
  if (body.contains_personal_data && !body.gdpr_legal_basis) {
    errors.push('gdpr_legal_basis required when contains_personal_data=true');
  }

  return errors;
}

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

    const body = await req.json();

    // STEP 1: Validate required declaration fields
    const requiredFields = [
      'payload',
      'ingestion_method',
      'dataset_type',
      'source_system',
      'declared_scope',
      'declared_intent',
      'purpose_tags',
      'contains_personal_data',
      'retention_policy'
    ];

    const missing = requiredFields.filter(f => !body[f]);
    if (missing.length > 0) {
      return Response.json({
        error: 'Missing required declaration fields',
        missing_fields: missing,
        request_id: requestId
      }, { status: 400 });
    }

    // STEP 2: Validate enums
    const validMethods = ['FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'SUPPLIER_PORTAL', 'API_PUSH', 'MANUAL'];
    const validScopes = ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY', 'UNKNOWN'];
    const validPolicies = ['6_MONTHS', '12_MONTHS', '3_YEARS', '7_YEARS', 'CUSTOM'];

    if (!validMethods.includes(body.ingestion_method)) {
      return Response.json({
        error: `Invalid ingestion_method. Valid: ${validMethods.join(', ')}`,
        request_id: requestId
      }, { status: 400 });
    }

    if (!validScopes.includes(body.declared_scope)) {
      return Response.json({
        error: `Invalid declared_scope. Valid: ${validScopes.join(', ')}`,
        request_id: requestId
      }, { status: 400 });
    }

    if (!validPolicies.includes(body.retention_policy)) {
      return Response.json({
        error: `Invalid retention_policy. Valid: ${validPolicies.join(', ')}`,
        request_id: requestId
      }, { status: 400 });
    }

    // STEP 3: Validate purpose_tags (minimum 1)
    if (!Array.isArray(body.purpose_tags) || body.purpose_tags.length === 0) {
      return Response.json({
        error: 'purpose_tags must be an array with at least 1 element',
        request_id: requestId
      }, { status: 400 });
    }

    // STEP 4: Conditional field validation
    const conditionalErrors = await validateConditionalFields(body);
    if (conditionalErrors.length > 0) {
      return Response.json({
        error: 'Conditional validation failed',
        errors: conditionalErrors,
        request_id: requestId
      }, { status: 400 });
    }

    // STEP 5: Check idempotency
    if (body.idempotency_key) {
      const existingRecords = await base44.asServiceRole.entities.Evidence.filter({
        tenant_id: user.tenant_id,
        idempotency_key: body.idempotency_key
      });

      if (existingRecords.length > 0) {
        const existing = existingRecords[0];
        return Response.json({
          message: 'Idempotent: Request already processed',
          evidence_id: existing.evidence_id,
          payload_hash: existing.payload_hash_sha256,
          metadata_hash: existing.metadata_hash_sha256,
          sealed_at: existing.sealed_at_utc,
          request_id: requestId
        }, { status: 200 });
      }
    }

    // STEP 6: Compute hashes server-side
    const payloadString = typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload);
    const payloadHash = await hashString(payloadString);

    const declarationFields = {
      ingestion_method: body.ingestion_method,
      dataset_type: body.dataset_type,
      source_system: body.source_system,
      declared_scope: body.declared_scope,
      declared_intent: body.declared_intent,
      purpose_tags: body.purpose_tags,
      contains_personal_data: body.contains_personal_data,
      retention_policy: body.retention_policy
    };
    const metadataString = JSON.stringify(declarationFields);
    const metadataHash = await hashString(metadataString);

    // STEP 7: Create evidence record with ledger_state=SEALED
    const evidenceId = crypto.randomUUID();
    
    const retentionEndDate = new Date();
    if (body.retention_policy === '6_MONTHS') retentionEndDate.setMonth(retentionEndDate.getMonth() + 6);
    else if (body.retention_policy === '12_MONTHS') retentionEndDate.setFullYear(retentionEndDate.getFullYear() + 1);
    else if (body.retention_policy === '3_YEARS') retentionEndDate.setFullYear(retentionEndDate.getFullYear() + 3);
    else if (body.retention_policy === '7_YEARS') retentionEndDate.setFullYear(retentionEndDate.getFullYear() + 7);
    else if (body.retention_policy === 'CUSTOM' && body.retention_custom_days) {
      retentionEndDate.setDate(retentionEndDate.getDate() + body.retention_custom_days);
    }

    const evidence = await base44.asServiceRole.entities.Evidence.create({
      evidence_id: evidenceId,
      tenant_id: user.tenant_id,
      ledger_state: 'SEALED',
      processing_state: 'NONE',
      provenance: 'API_PUSH',
      created_via: 'API',
      actor_user_id: user.id,
      actor_type: 'USER',
      request_id: requestId,
      idempotency_key: body.idempotency_key || null,
      ingestion_method: body.ingestion_method,
      dataset_type: body.dataset_type,
      source_system: body.source_system,
      declared_scope: body.declared_scope,
      scope_target_id: body.scope_target_id || null,
      declared_intent: body.declared_intent,
      purpose_tags: body.purpose_tags,
      contains_personal_data: body.contains_personal_data,
      data_minimization_confirmed: body.data_minimization_confirmed || false,
      gdpr_legal_basis: body.gdpr_legal_basis || null,
      retention_policy: body.retention_policy,
      retention_custom_days: body.retention_custom_days || null,
      retention_end_date_utc: retentionEndDate.toISOString(),
      snapshot_date_utc: body.snapshot_date_utc || null,
      payload_storage_uri: 'internal://stored',
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metadataHash,
      ingestion_timestamp_utc: now,
      sealed_at_utc: now,
      audit_event_count: 1,
      provenance_incomplete: false,
      intended_consumers: body.intended_consumers || []
    });

    // STEP 8: Create audit event (append-only)
    const auditEventId = crypto.randomUUID();
    await base44.asServiceRole.entities.EvidenceAuditEvent.create({
      audit_event_id: auditEventId,
      tenant_id: user.tenant_id,
      evidence_id: evidenceId,
      action: 'SEALED',
      actor_user_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      timestamp_utc: now,
      request_id: requestId,
      http_status: 200,
      contract_state: 'SEALED',
      processing_state: 'NONE',
      context_json: {
        ingestion_method: body.ingestion_method,
        dataset_type: body.dataset_type,
        payload_hash: payloadHash,
        metadata_hash: metadataHash
      }
    });

    // STEP 9: Return receipt
    return Response.json({
      success: true,
      message: 'Evidence sealed successfully',
      receipt: {
        evidence_id: evidenceId,
        request_id: requestId,
        ledger_state: 'SEALED',
        payload_hash_sha256: payloadHash,
        metadata_hash_sha256: metadataHash,
        ingestion_timestamp_utc: now,
        sealed_at_utc: now,
        audit_event_count: 1
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[INGEST_EVIDENCE]', error);
    return Response.json({
      error: 'Ingestion failed',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
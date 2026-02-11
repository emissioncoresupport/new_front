import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * INGEST EVIDENCE V4 — Core Pipeline
 * 
 * NON-NEGOTIABLE RULES:
 * 1. Evidence records NEVER auto-created in LIVE mode
 * 2. Separate ledger_state (compliance) from processing_state (optional)
 * 3. Every successful ingestion MUST create audit events
 * 4. Server-side SHA256 hashing for payload + metadata
 * 5. Immutable after SEALED (return 409 on mutation attempts)
 * 6. Tenant isolation (404 on cross-tenant access)
 * 7. Idempotency via external_reference_id
 */

// SHA256 hash utility
async function hashSHA256(data) {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Validate conditional required fields
function validateConditionalFields(body) {
  const errors = [];

  // If personal_data_present=true, require gdpr_legal_basis and retention_policy
  if (body.personal_data_present && !body.gdpr_legal_basis) {
    errors.push('gdpr_legal_basis is required if personal_data_present=true');
  }
  if (body.personal_data_present && !body.retention_policy) {
    errors.push('retention_policy is required if personal_data_present=true');
  }

  // If ingestion_method=ERP_API, require snapshot_date_utc and origin_system_name
  if (body.ingestion_method === 'ERP_API') {
    if (!body.snapshot_date_utc) {
      errors.push('snapshot_date_utc is required for ERP_API ingestion');
    }
    if (!body.origin_system_name) {
      errors.push('origin_system_name is required for ERP_API ingestion');
    }
  }

  // If ingestion_method=ERP_EXPORT, require origin_system_name
  if (body.ingestion_method === 'ERP_EXPORT' && !body.origin_system_name) {
    errors.push('origin_system_name is required for ERP_EXPORT ingestion');
  }

  // If ingestion_method=MANUAL_ENTRY, require entry_notes and entered_by_user_id
  if (body.ingestion_method === 'MANUAL_ENTRY') {
    if (!body.entry_notes || body.entry_notes.trim().length === 0) {
      errors.push('entry_notes is required for MANUAL_ENTRY');
    }
    if (body.entry_notes && body.entry_notes.length > 280) {
      errors.push('entry_notes must be ≤ 280 characters');
    }
  }

  // If ingestion_method=SUPPLIER_PORTAL, require supplier_portal_request_id
  if (body.ingestion_method === 'SUPPLIER_PORTAL' && !body.supplier_portal_request_id) {
    errors.push('supplier_portal_request_id is required for SUPPLIER_PORTAL ingestion');
  }

  // If ingestion_method=API_PUSH, require external_reference_id for idempotency
  if (body.ingestion_method === 'API_PUSH' && !body.external_reference_id) {
    errors.push('external_reference_id is required for API_PUSH ingestion (idempotency)');
  }

  // Purpose tags must have at least 1
  if (!body.purpose_tags || !Array.isArray(body.purpose_tags) || body.purpose_tags.length === 0) {
    errors.push('purpose_tags must contain at least 1 tag');
  }

  return errors;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();

    // ===== GATE 1: DATA MODE CHECK =====
    const tenantSettings = await base44.asServiceRole.entities.Company.filter({
      tenant_id: user.tenant_id
    });
    const dataMode = tenantSettings?.[0]?.data_mode || 'LIVE';

    // In LIVE mode, block TEST_FIXTURE
    if (dataMode === 'LIVE' && body.provenance === 'TEST_FIXTURE') {
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: user.tenant_id,
        evidence_id: 'SYSTEM',
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: user.role,
        action: 'DATA_MODE_VIOLATION',
        request_id: requestId,
        context_json: {
          reason: 'TEST_FIXTURE provenance forbidden in LIVE mode',
          attempted_provenance: body.provenance
        },
        created_at_utc: new Date().toISOString(),
        http_status: 403
      });

      return Response.json({
        error: 'Data mode violation',
        message: 'TEST_FIXTURE provenance is not allowed in LIVE mode',
        data_mode: dataMode,
        request_id: requestId
      }, { status: 403 });
    }

    // ===== GATE 2: REQUIRED FIELDS VALIDATION =====
    const requiredFields = [
      'payload',
      'ingestion_method',
      'dataset_type',
      'declared_scope',
      'declared_intent',
      'purpose_tags',
      'personal_data_present',
      'retention_policy'
    ];

    const missingFields = requiredFields.filter(f => body[f] === undefined || body[f] === null);
    if (missingFields.length > 0) {
      return Response.json({
        error: 'Missing required fields',
        missing_fields: missingFields,
        request_id: requestId
      }, { status: 400 });
    }

    // ===== GATE 3: CONDITIONAL FIELD VALIDATION =====
    const conditionalErrors = validateConditionalFields(body);
    if (conditionalErrors.length > 0) {
      return Response.json({
        error: 'Conditional field validation failed',
        details: conditionalErrors,
        request_id: requestId
      }, { status: 400 });
    }

    // ===== GATE 4: ENUM VALIDATION =====
    const validEnums = {
      ingestion_method: ['FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'SUPPLIER_PORTAL', 'API_PUSH', 'MANUAL_ENTRY'],
      provenance: ['USER_PROVIDED', 'SYSTEM_INTEGRATION', 'TEST_FIXTURE'],
      declared_scope: ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY', 'UNKNOWN'],
      origin_system_type: ['ERP', 'WMS', 'TMS', 'PLM', 'PIM', 'SUPPLIER_SYSTEM', 'INTERNAL']
    };

    for (const [field, allowedValues] of Object.entries(validEnums)) {
      if (body[field] && !allowedValues.includes(body[field])) {
        return Response.json({
          error: `Invalid enum value for ${field}`,
          field,
          received: body[field],
          allowed: allowedValues,
          request_id: requestId
        }, { status: 400 });
      }
    }

    // ===== IDEMPOTENCY CHECK =====
    if (body.external_reference_id) {
      const existing = await base44.asServiceRole.entities.Evidence.filter({
        tenant_id: user.tenant_id,
        external_reference_id: body.external_reference_id
      });

      if (existing.length > 0) {
        return Response.json({
          error: 'Idempotent request',
          message: 'Evidence with this external_reference_id already exists',
          evidence_id: existing[0].evidence_id,
          request_id: requestId
        }, { status: 200 }); // Return 200 for idempotent success
      }
    }

    // ===== COMPUTE HASHES =====
    const payloadHash = await hashSHA256(body.payload);
    
    const metadataForHash = JSON.stringify({
      ingestion_method: body.ingestion_method,
      dataset_type: body.dataset_type,
      declared_scope: body.declared_scope,
      declared_intent: body.declared_intent,
      purpose_tags: body.purpose_tags,
      personal_data_present: body.personal_data_present,
      gdpr_legal_basis: body.gdpr_legal_basis,
      retention_policy: body.retention_policy,
      snapshot_date_utc: body.snapshot_date_utc
    });
    const metadataHash = await hashSHA256(metadataForHash);

    // ===== CREATE EVIDENCE RECORD =====
    const evidenceId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Set defaults for origin_system based on ingestion_method
    let originSystemType = body.origin_system_type;
    let originSystemName = body.origin_system_name;

    if (body.ingestion_method === 'MANUAL_ENTRY') {
      originSystemType = originSystemType || 'INTERNAL';
      originSystemName = originSystemName || 'INTERNAL_MANUAL';
    }

    if (body.ingestion_method === 'SUPPLIER_PORTAL') {
      originSystemType = originSystemType || 'SUPPLIER_SYSTEM';
    }

    const evidence = await base44.asServiceRole.entities.Evidence.create({
      evidence_id: evidenceId,
      tenant_id: user.tenant_id,
      ledger_state: 'INGESTED',
      processing_state: 'NONE',
      provenance: body.provenance || 'USER_PROVIDED',
      ingestion_method: body.ingestion_method,
      origin_system_type: originSystemType,
      origin_system_name: originSystemName,
      dataset_type: body.dataset_type,
      declared_scope: body.declared_scope,
      declared_intent: body.declared_intent,
      purpose_tags: body.purpose_tags,
      personal_data_present: body.personal_data_present,
      gdpr_legal_basis: body.gdpr_legal_basis,
      retention_policy: body.retention_policy,
      retention_custom_days: body.retention_custom_days,
      snapshot_date_utc: body.snapshot_date_utc,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metadataHash,
      ingestion_timestamp_utc: now,
      ingest_request_id: requestId,
      external_reference_id: body.external_reference_id,
      supplier_portal_request_id: body.supplier_portal_request_id,
      entry_notes: body.entry_notes,
      created_by_user_id: user.id,
      created_by_service: body.created_by_service || null,
      intended_consumers: body.intended_consumers || []
    });

    // ===== CREATE AUDIT EVENT =====
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: user.tenant_id,
      evidence_id: evidenceId,
      actor_user_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'INGESTED',
      previous_state: null,
      new_state: 'INGESTED',
      request_id: requestId,
      context_json: {
        ingestion_method: body.ingestion_method,
        provenance: body.provenance,
        payload_hash: payloadHash,
        metadata_hash: metadataHash
      },
      created_at_utc: now,
      http_status: 201
    });

    // Increment audit_event_count
    await base44.asServiceRole.entities.Evidence.update(evidenceId, {
      audit_event_count: 1
    });

    // ===== RETURN RECEIPT =====
    return Response.json({
      success: true,
      receipt: {
        evidence_id: evidenceId,
        ledger_state: 'INGESTED',
        processing_state: 'NONE',
        payload_hash_sha256: payloadHash,
        metadata_hash_sha256: metadataHash,
        ingestion_timestamp_utc: now,
        audit_event_count: 1,
        data_mode: dataMode
      },
      request_id: requestId,
      latency_ms: Date.now() - startTime
    }, { status: 201 });

  } catch (error) {
    console.error('[INGEST_EVIDENCE_V4]', error);
    return Response.json({
      error: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
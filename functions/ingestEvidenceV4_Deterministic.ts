import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONTRACT 1 DETERMINISTIC INGESTION V4
 * 
 * Non-negotiable invariants:
 * 1. LIVE mode forbids TEST_FIXTURE provenance (403)
 * 2. Canonical server-side validation with explicit field errors (400)
 * 3. Deterministic SHA-256 hashing with stable JSON serialization
 * 4. Conditional field validation per ingestion_method
 * 5. Source system rules enforced
 * 6. State machine: INGESTED → SEALED only
 * 7. Audit trail: append-only with correlation IDs
 * 8. Immutability: sealed records cannot be updated (409)
 */

async function hashString(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function canonicalJson(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

async function validateIngestion(body) {
  const errors = [];

  // Required fields (all ingestions)
  const required = [
    'ingestion_method',
    'dataset_type',
    'declared_scope',
    'declared_intent',
    'purpose_tags',
    'personal_data_present',
    'retention_policy',
    'payload'
  ];

  for (const field of required) {
    if (body[field] === undefined || body[field] === null || 
        (typeof body[field] === 'string' && !body[field].trim())) {
      errors.push(`${field} is required`);
    }
  }

  // Enum validations
  const validMethods = ['FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'SUPPLIER_PORTAL', 'API_PUSH', 'MANUAL_ENTRY'];
  if (body.ingestion_method && !validMethods.includes(body.ingestion_method)) {
    errors.push(`ingestion_method must be one of: ${validMethods.join(', ')}`);
  }

  const validScopes = ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY', 'UNKNOWN'];
  if (body.declared_scope && !validScopes.includes(body.declared_scope)) {
    errors.push(`declared_scope must be one of: ${validScopes.join(', ')}`);
  }

  const validPolicies = ['6_MONTHS', '12_MONTHS', '3_YEARS', '7_YEARS', 'CUSTOM'];
  if (body.retention_policy && !validPolicies.includes(body.retention_policy)) {
    errors.push(`retention_policy must be one of: ${validPolicies.join(', ')}`);
  }

  // Purpose tags validation (min 1)
  if (!Array.isArray(body.purpose_tags) || body.purpose_tags.length === 0) {
    errors.push('purpose_tags must be a non-empty array');
  }

  // Conditional validations per ingestion_method
  if (body.ingestion_method === 'ERP_API' && !body.snapshot_date_utc) {
    errors.push('snapshot_date_utc is required for ERP_API ingestion method');
  }

  if (body.ingestion_method === 'SUPPLIER_PORTAL' && !body.supplier_portal_request_id) {
    errors.push('supplier_portal_request_id is required for SUPPLIER_PORTAL ingestion method');
  }

  if (body.ingestion_method === 'API_PUSH' && !body.external_reference_id) {
    errors.push('external_reference_id is required for API_PUSH ingestion method (idempotency key)');
  }

  if (body.ingestion_method === 'MANUAL_ENTRY' && !body.entry_notes) {
    errors.push('entry_notes is required for MANUAL_ENTRY ingestion method');
  }

  // GDPR validation
  if (body.personal_data_present && !body.gdpr_legal_basis) {
    errors.push('gdpr_legal_basis is required when personal_data_present=true');
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

    // Get tenant ID from request header (set by platform)
    const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || user.workspace_id || user.org_id || 'DEFAULT';
    
    // Get tenant data mode
    const company = await base44.asServiceRole.entities.Company.filter({
      tenant_id: tenantId
    });
    const dataMode = company?.[0]?.data_mode || 'LIVE';

    const body = await req.json();

    // LIVE MODE GATE: forbid TEST_FIXTURE
    if (dataMode === 'LIVE' && body.provenance === 'TEST_FIXTURE') {
      const auditEventId = crypto.randomUUID();
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: auditEventId,
        tenant_id: tenantId,
        evidence_id: 'SYSTEM',
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: user.role,
        action: 'DATA_MODE_VIOLATION',
        request_id: requestId,
        created_at_utc: now,
        http_status: 403,
        context_json: {
          violation: 'TEST_FIXTURE provenance forbidden in LIVE mode',
          attempted_provenance: 'TEST_FIXTURE'
        }
      });

      return Response.json({
        error: 'Forbidden: TEST_FIXTURE provenance not allowed in LIVE mode',
        request_id: requestId
      }, { status: 403 });
    }

    // VALIDATION: deterministic field validation
    const validationErrors = await validateIngestion(body);
    if (validationErrors.length > 0) {
      return Response.json({
        error: 'Validation failed',
        details: validationErrors,
        request_id: requestId
      }, { status: 400 });
    }

    // SOURCE SYSTEM VALIDATION: per ingestion_method rules
    const sourceSystemRules = {
      FILE_UPLOAD: ['USER_FILE_UPLOAD'],
      ERP_EXPORT: ['SAP', 'ORACLE', 'MICROSOFT_DYNAMICS', 'NETSUITE', 'ODOO', 'OTHER'],
      ERP_API: ['SAP', 'ORACLE', 'MICROSOFT_DYNAMICS', 'NETSUITE', 'ODOO', 'OTHER'],
      SUPPLIER_PORTAL: ['SUPPLIER_PORTAL'],
      API_PUSH: ['CLIENT_SYSTEM'],
      MANUAL_ENTRY: ['INTERNAL_MANUAL']
    };

    const allowedForMethod = sourceSystemRules[body.ingestion_method] || [];
    if (!allowedForMethod.includes(body.source_system)) {
      return Response.json({
        error: `Invalid source_system for ${body.ingestion_method}`,
        received: body.source_system,
        allowed_for_method: allowedForMethod,
        request_id: requestId
      }, { status: 400 });
    }

    // IDEMPOTENCY CHECK (API_PUSH only)
    if (body.ingestion_method === 'API_PUSH' && body.external_reference_id) {
      const existing = await base44.asServiceRole.entities.Evidence.filter({
        tenant_id: tenantId,
        external_reference_id: body.external_reference_id,
        ledger_state: 'SEALED'
      });

      if (existing.length > 0) {
        const rec = existing[0];
        return Response.json({
          message: 'Idempotent: Evidence already sealed',
          evidence_id: rec.evidence_id,
          payload_hash_sha256: rec.payload_hash_sha256,
          metadata_hash_sha256: rec.metadata_hash_sha256,
          sealed_at_utc: rec.sealed_at_utc,
          request_id: requestId
        }, { status: 200 });
      }
    }

    // COMPUTE HASHES: deterministic canonical JSON
    const payloadCanonical = typeof body.payload === 'string' 
      ? body.payload 
      : canonicalJson(body.payload);
    const payloadHash = await hashString(payloadCanonical);

    const metadataObj = {
      dataset_type: body.dataset_type,
      declared_scope: body.declared_scope,
      declared_intent: body.declared_intent,
      ingestion_method: body.ingestion_method,
      personal_data_present: body.personal_data_present,
      purpose_tags: body.purpose_tags,
      retention_policy: body.retention_policy
    };
    const metadataHash = await hashString(canonicalJson(metadataObj));

    // Compute retention end date
    const retentionEndDate = new Date();
    if (body.retention_policy === '6_MONTHS') {
      retentionEndDate.setMonth(retentionEndDate.getMonth() + 6);
    } else if (body.retention_policy === '12_MONTHS') {
      retentionEndDate.setFullYear(retentionEndDate.getFullYear() + 1);
    } else if (body.retention_policy === '3_YEARS') {
      retentionEndDate.setFullYear(retentionEndDate.getFullYear() + 3);
    } else if (body.retention_policy === '7_YEARS') {
      retentionEndDate.setFullYear(retentionEndDate.getFullYear() + 7);
    } else if (body.retention_policy === 'CUSTOM' && body.retention_custom_days) {
      retentionEndDate.setDate(retentionEndDate.getDate() + body.retention_custom_days);
    }

    // CREATE EVIDENCE: state INGESTED (not SEALED — seal is explicit action)
    const evidenceId = crypto.randomUUID();

    const evidence = await base44.asServiceRole.entities.Evidence.create({
      evidence_id: evidenceId,
      tenant_id: tenantId,
      ledger_state: 'INGESTED',
      processing_state: 'NONE',
      provenance: body.provenance || 'USER_PROVIDED',
      ingestion_method: body.ingestion_method,
      dataset_type: body.dataset_type,
      declared_scope: body.declared_scope,
      declared_intent: body.declared_intent,
      purpose_tags: body.purpose_tags,
      personal_data_present: body.personal_data_present,
      gdpr_legal_basis: body.gdpr_legal_basis || null,
      retention_policy: body.retention_policy,
      retention_custom_days: body.retention_custom_days || null,
      retention_end_date_utc: retentionEndDate.toISOString(),
      snapshot_date_utc: body.snapshot_date_utc || null,
      origin_system_name: body.origin_system_name || null,
      origin_system_type: body.source_system,
      entry_notes: body.entry_notes || null,
      supplier_portal_request_id: body.supplier_portal_request_id || null,
      external_reference_id: body.external_reference_id || null,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metadataHash,
      created_by_user_id: user.id,
      ingest_request_id: requestId,
      ingestion_timestamp_utc: now,
      audit_event_count: 1,
      intended_consumers: body.intended_consumers || []
    });

    // CREATE AUDIT EVENT: INGESTED
    const auditEventId = crypto.randomUUID();
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: auditEventId,
      tenant_id: tenantId,
      evidence_id: evidenceId,
      actor_user_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'INGESTED',
      request_id: requestId,
      created_at_utc: now,
      http_status: 201,
      context_json: {
        ingestion_method: body.ingestion_method,
        dataset_type: body.dataset_type,
        payload_hash: payloadHash,
        metadata_hash: metadataHash
      }
    });

    // RETURN RECEIPT
    return Response.json({
      success: true,
      message: 'Evidence ingested (state: INGESTED)',
      receipt: {
        evidence_id: evidenceId,
        request_id: requestId,
        ledger_state: 'INGESTED',
        provenance: body.provenance || 'USER_PROVIDED',
        ingestion_method: body.ingestion_method,
        dataset_type: body.dataset_type,
        payload_hash_sha256: payloadHash,
        metadata_hash_sha256: metadataHash,
        ingestion_timestamp_utc: now,
        audit_event_id: auditEventId,
        next_action: 'Call /sealEvidence to transition to SEALED state'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[INGEST_DETERMINISTIC]', error);
    return Response.json({
      error: 'Ingestion error',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
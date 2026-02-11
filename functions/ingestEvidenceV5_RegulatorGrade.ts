import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * INGEST EVIDENCE V5 — Regulator-Grade
 * - Capture channel vs upstream system distinction
 * - LIVE/DEMO mode gate
 * - Deterministic SHA-256 hashing
 * - All responses JSON with {ok, error_code, message}
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

async function validatePayload(body) {
  const errors = [];

  // Required fields
  const required = [
    'capture_channel', 'upstream_system', 'dataset_type',
    'declared_scope', 'primary_intent', 'purpose_tags',
    'contains_personal_data', 'retention_policy', 'payload'
  ];

  for (const field of required) {
    if (body[field] === undefined || body[field] === null) {
      errors.push(`${field} is required`);
    }
  }

  // Enum validations
  const validChannels = ['FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'SUPPLIER_PORTAL', 'API_PUSH', 'MANUAL'];
  if (body.capture_channel && !validChannels.includes(body.capture_channel)) {
    errors.push(`capture_channel must be one of: ${validChannels.join(', ')}`);
  }

  const validSystems = ['SAP', 'ORACLE', 'MICROSOFT_DYNAMICS', 'NETSUITE', 'ODOO', 'INFOR', 'EPICOR', 'IFS', 'SAGE', 'WORKDAY', 'SUPPLIER_PORTAL', 'OTHER'];
  if (body.upstream_system && !validSystems.includes(body.upstream_system)) {
    errors.push(`upstream_system must be one of: ${validSystems.join(', ')}`);
  }

  // Purpose tags
  if (!Array.isArray(body.purpose_tags) || body.purpose_tags.length === 0) {
    errors.push('purpose_tags must be a non-empty array');
  }

  // Conditional: snapshot_date for ERP methods
  if ((body.capture_channel === 'ERP_API' || body.capture_channel === 'ERP_EXPORT') && !body.snapshot_date_utc) {
    errors.push('snapshot_date_utc is required for ERP_API/ERP_EXPORT');
  }

  // Conditional: GDPR
  if (body.contains_personal_data && !body.gdpr_legal_basis) {
    errors.push('gdpr_legal_basis is required when contains_personal_data=true');
  }

  // Conditional: Portal ID
  if (body.capture_channel === 'SUPPLIER_PORTAL' && !body.supplier_portal_request_id) {
    errors.push('supplier_portal_request_id is required for SUPPLIER_PORTAL');
  }

  // Conditional: Ext Ref (API_PUSH idempotency)
  if (body.capture_channel === 'API_PUSH' && !body.external_reference_id) {
    errors.push('external_reference_id is required for API_PUSH (idempotency key)');
  }

  // Conditional: Entry notes
  if (body.capture_channel === 'MANUAL' && !body.entry_notes) {
    errors.push('entry_notes is required for MANUAL capture');
  }

  return errors;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error_code: 'METHOD_NOT_ALLOWED', message: 'POST only' }, { status: 405 });
  }

  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ok: false, error_code: 'UNAUTHORIZED', message: 'User not authenticated' }, { status: 401 });
    }

    const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || user.workspace_id || 'DEFAULT';
    const body = await req.json();

    // Validate payload
    const validationErrors = await validatePayload(body);
    if (validationErrors.length > 0) {
      return Response.json({
        ok: false,
        error_code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validationErrors,
        request_id: requestId
      }, { status: 400 });
    }

    // Check data mode
    const company = await base44.asServiceRole.entities.Company.filter({ tenant_id: tenantId });
    const dataMode = company?.[0]?.data_mode || 'LIVE';

    // LIVE MODE GATE: forbid TEST_FIXTURE
    if (dataMode === 'LIVE' && body.provenance === 'TEST_FIXTURE') {
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: tenantId,
        evidence_id: 'SYSTEM',
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: user.role,
        action: 'DATA_MODE_VIOLATION',
        request_id: requestId,
        created_at_utc: now,
        http_status: 403,
        context_json: { violation: 'TEST_FIXTURE forbidden in LIVE' }
      });

      return Response.json({
        ok: false,
        error_code: 'DATA_MODE_VIOLATION',
        message: 'TEST_FIXTURE provenance not allowed in LIVE mode',
        request_id: requestId
      }, { status: 403 });
    }

    // Compute hashes
    const payloadStr = typeof body.payload === 'string' ? body.payload : canonicalJson(body.payload);
    const payloadHash = await hashString(payloadStr);

    const metaObj = {
      capture_channel: body.capture_channel,
      upstream_system: body.upstream_system,
      dataset_type: body.dataset_type,
      declared_scope: body.declared_scope,
      purpose_tags: body.purpose_tags,
      contains_personal_data: body.contains_personal_data,
      retention_policy: body.retention_policy
    };
    const metaHash = await hashString(canonicalJson(metaObj));

    // Compute retention end date
    const retentionEnd = new Date();
    if (body.retention_policy === '6_MONTHS') retentionEnd.setMonth(retentionEnd.getMonth() + 6);
    else if (body.retention_policy === '12_MONTHS') retentionEnd.setFullYear(retentionEnd.getFullYear() + 1);
    else if (body.retention_policy === '3_YEARS') retentionEnd.setFullYear(retentionEnd.getFullYear() + 3);
    else if (body.retention_policy === '7_YEARS') retentionEnd.setFullYear(retentionEnd.getFullYear() + 7);

    // Create evidence
    const evidenceId = crypto.randomUUID();
    const evidence = await base44.asServiceRole.entities.Evidence.create({
      evidence_id: evidenceId,
      tenant_id: tenantId,
      ledger_state: 'INGESTED',
      capture_channel: body.capture_channel,
      upstream_system: body.upstream_system,
      upstream_system_friendly_name: body.upstream_system_friendly_name || null,
      dataset_type: body.dataset_type,
      declared_scope: body.declared_scope,
      scope_target_id: body.scope_target_id || null,
      primary_intent: body.primary_intent,
      purpose_tags: body.purpose_tags,
      contains_personal_data: body.contains_personal_data,
      gdpr_legal_basis: body.gdpr_legal_basis || null,
      retention_policy: body.retention_policy,
      retention_custom_days: body.retention_custom_days || null,
      retention_end_date_utc: retentionEnd.toISOString(),
      snapshot_date_utc: body.snapshot_date_utc || null,
      export_period_start: body.export_period_start || null,
      export_period_end: body.export_period_end || null,
      supplier_portal_request_id: body.supplier_portal_request_id || null,
      external_reference_id: body.external_reference_id || null,
      entry_notes: body.entry_notes || null,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metaHash,
      created_by_user_id: user.id,
      ingest_request_id: requestId,
      ingestion_timestamp_utc: now,
      provenance: body.provenance || 'USER_PROVIDED',
      audit_event_count: 1,
      intended_consumers: body.intended_consumers || []
    });

    // Create audit event
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
        capture_channel: body.capture_channel,
        upstream_system: body.upstream_system,
        dataset_type: body.dataset_type
      }
    });

    return Response.json({
      ok: true,
      evidence_id: evidenceId,
      request_id: requestId,
      state: 'INGESTED',
      hash_sha256: payloadHash,
      metadata_hash: metaHash,
      created_at: now
    }, { status: 201 });

  } catch (error) {
    console.error('[INGEST_V5]', error);
    return Response.json({
      ok: false,
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
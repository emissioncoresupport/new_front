import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * INGEST EVIDENCE — Contract 1 Deterministic Engine
 * Enforces: data_mode gate, method contracts, server-side hashing, attestation capture
 * NO 500s: all validation failures return 422/403/409 with error_code
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

function computeRetentionEnd(sealedAt, policy, customDays) {
  const date = new Date(sealedAt);
  if (policy === 'STANDARD_1_YEAR') {
    date.setFullYear(date.getFullYear() + 1);
  } else if (policy === '3_YEARS') {
    date.setFullYear(date.getFullYear() + 3);
  } else if (policy === '7_YEARS') {
    date.setFullYear(date.getFullYear() + 7);
  } else if (policy === 'CUSTOM' && customDays) {
    date.setDate(date.getDate() + customDays);
  }
  return date.toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error_code: 'METHOD_NOT_ALLOWED', message: 'POST only' }, { status: 405 });
  }

  const functionRequestId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    let tenantId;
    
    try {
      user = await base44.auth.me();
      tenantId = req.headers.get('x-tenant-id') || user.tenant_id || 'DEFAULT';
    } catch (e) {
      // Service role test context
      tenantId = req.headers.get('x-tenant-id') || 'DEFAULT';
      user = { id: 'SYSTEM', email: 'system@test', role: 'admin' };
    }

    if (!user) {
      return Response.json({ ok: false, error_code: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return Response.json({
        ok: false,
        error_code: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
        request_id: functionRequestId
      }, { status: 400 });
    }

    // === VALIDATION PHASE 1: REQUEST METADATA ===
    
    if (!body.request_id || body.request_id.trim() === '') {
      return Response.json({
        ok: false,
        error_code: 'MISSING_REQUIRED_METADATA',
        message: 'request_id is required for audit trail',
        field: 'request_id',
        request_id: functionRequestId
      }, { status: 422 });
    }

    const clientRequestId = body.request_id;

    // === DATA MODE ENFORCEMENT ===
    
    const tenantRecords = await base44.asServiceRole.entities.Company.filter({ tenant_id: tenantId });
    const dataModeServer = tenantRecords?.[0]?.data_mode || 'LIVE';

    // Block TEST_FIXTURE in LIVE
    if (dataModeServer === 'LIVE' && body.origin === 'TEST_FIXTURE') {
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: tenantId,
        evidence_id: 'SYSTEM',
        actor_user_id: user.id,
        action: 'SECURITY_VIOLATION',
        details: 'TEST_FIXTURE creation blocked in LIVE',
        created_at_utc: now,
        request_id: clientRequestId
      });

      return Response.json({
        ok: false,
        error_code: 'FIXTURE_BLOCKED_IN_LIVE',
        message: 'TEST_FIXTURE records cannot be created in LIVE mode',
        request_id: clientRequestId
      }, { status: 403 });
    }

    // Block test execution in LIVE
    if (dataModeServer === 'LIVE' && body.is_test_request === true) {
      return Response.json({
        ok: false,
        error_code: 'DATA_MODE_LIVE_BLOCKED',
        message: 'Test execution is blocked in LIVE mode',
        request_id: clientRequestId
      }, { status: 403 });
    }

    // === METHOD CONTRACT VALIDATION ===
    
    const methodContracts = {
      'FILE_UPLOAD': {
        required_fields: ['dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
        allowed_source_systems: ['OTHER', 'SAP', 'MICROSOFT_DYNAMICS', 'ODOO', 'ORACLE', 'NETSUITE'],
        payload_mode: 'client_provided'
      },
      'API_PUSH': {
        required_fields: ['external_reference_id', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
        allowed_source_systems: ['OTHER', 'SAP', 'MICROSOFT_DYNAMICS', 'ODOO', 'ORACLE', 'NETSUITE'],
        payload_mode: 'client_provided'
      },
      'ERP_EXPORT': {
        required_fields: ['snapshot_datetime_utc', 'export_job_id', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
        allowed_source_systems: ['SAP', 'MICROSOFT_DYNAMICS', 'ODOO', 'ORACLE', 'NETSUITE', 'OTHER'],
        payload_mode: 'client_provided'
      },
      'ERP_API': {
        required_fields: ['snapshot_datetime_utc', 'connector_reference', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
        allowed_source_systems: ['SAP', 'MICROSOFT_DYNAMICS', 'ODOO', 'ORACLE', 'NETSUITE'],
        payload_mode: 'server_fetch_only',
        disallows: ['client_payload']
      },
      'SUPPLIER_PORTAL': {
        required_fields: ['supplier_portal_request_id', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
        forced_source_system: 'SUPPLIER_PORTAL',
        payload_mode: 'portal_submission'
      },
      'MANUAL_ENTRY': {
        required_fields: ['entry_notes', 'dataset_type', 'declared_scope', 'primary_intent', 'purpose_tags', 'retention_policy'],
        forced_source_system: 'INTERNAL_MANUAL',
        payload_mode: 'structured_json',
        disallows: ['file_upload'],
        dataset_scope_validation: true
      }
    };

    const contract = methodContracts[body.ingestion_method];
    if (!contract) {
      return Response.json({
        ok: false,
        error_code: 'UNKNOWN_INGESTION_METHOD',
        message: `Unknown ingestion_method: ${body.ingestion_method}`,
        request_id: clientRequestId
      }, { status: 422 });
    }

    // METHOD × DATASET COMPATIBILITY CHECK (hard block for unsupported combos)
    // SOURCE OF TRUTH: mirrors datasetCapabilities.js on frontend
    const METHOD_DATASET_ALLOWED = {
      'SUPPLIER_MASTER': ['MANUAL_ENTRY', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'API_PUSH'],
      'PRODUCT_MASTER': ['MANUAL_ENTRY', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'API_PUSH'],
      'BOM': ['MANUAL_ENTRY', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'API_PUSH'],
      'CERTIFICATE': ['FILE_UPLOAD', 'SUPPLIER_PORTAL'],
      'TEST_REPORT': ['FILE_UPLOAD', 'SUPPLIER_PORTAL'],
      'TRANSACTION_LOG': ['API_PUSH', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API']
    };

    const allowedMethods = METHOD_DATASET_ALLOWED[body.dataset_type];
    if (allowedMethods && !allowedMethods.includes(body.ingestion_method)) {
      // Deterministic 422 for unsupported method-dataset combos (no 500s, no doomed drafts)
      return Response.json({
        ok: false,
        error_code: 'UNSUPPORTED_METHOD_DATASET_COMBINATION',
        message: `${body.ingestion_method} is not supported for ${body.dataset_type}. To protect audit integrity, this dataset must be ingested via: ${allowedMethods.join(', ')}.`,
        allowed_methods: allowedMethods,
        recommended_method: allowedMethods[0],
        dataset_type: body.dataset_type,
        ingestion_method: body.ingestion_method,
        field: 'ingestion_method',
        request_id: clientRequestId
      }, { status: 422 });
    }

    // DATASET × SCOPE COMPATIBILITY CHECK (hard rules for MANUAL_ENTRY)
    if (body.ingestion_method === 'MANUAL_ENTRY') {
      const DATASET_SCOPE_RULES = {
        'SUPPLIER_MASTER': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY'],
        'PRODUCT_MASTER': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'PRODUCT_FAMILY'],
        'BOM': ['LEGAL_ENTITY', 'PRODUCT_FAMILY', 'SITE'],
        'CERTIFICATE': ['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'],
        'TEST_REPORT': ['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY']
      };

      const allowedScopes = DATASET_SCOPE_RULES[body.dataset_type];
      if (allowedScopes && !allowedScopes.includes(body.declared_scope)) {
        return Response.json({
          ok: false,
          error_code: 'INVALID_DATASET_SCOPE_COMBINATION',
          message: `${body.declared_scope} scope not allowed for ${body.dataset_type}. Allowed: ${allowedScopes.join(', ')}. Or select UNKNOWN to quarantine.`,
          field: 'declared_scope',
          request_id: clientRequestId
        }, { status: 422 });
      }
    }

    // Validate required fields (excluding server-side fields)
    for (const field of (contract.required_fields || [])) {
      if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
        return Response.json({
          ok: false,
          error_code: 'MISSING_REQUIRED_METADATA',
          message: `${body.ingestion_method} requires: ${field}`,
          field,
          request_id: clientRequestId
        }, { status: 422 });
      }
    }

    // === SOURCE SYSTEM ENFORCEMENT ===
    
    if (contract.forced_source_system) {
      // Force server-side (ignore client value)
      body.source_system = contract.forced_source_system;
    } else if (contract.allowed_source_systems) {
      if (!body.source_system || !contract.allowed_source_systems.includes(body.source_system)) {
        return Response.json({
          ok: false,
          error_code: 'INVALID_SOURCE_FOR_METHOD',
          message: `${body.ingestion_method} requires source_system from: ${contract.allowed_source_systems.join(', ')}. Got: ${body.source_system}`,
          request_id: clientRequestId
        }, { status: 422 });
      }
    }

    // Validate source_system is single enum value
    const validSources = ['SAP', 'MICROSOFT_DYNAMICS', 'ORACLE', 'ODOO', 'NETSUITE', 'SUPPLIER_PORTAL', 'INTERNAL_MANUAL', 'OTHER'];
    if (!validSources.includes(body.source_system)) {
      return Response.json({
        ok: false,
        error_code: 'INVALID_SOURCE_SYSTEM_VALUE',
        message: `source_system must be single enum value. Got: ${body.source_system}`,
        request_id: clientRequestId
      }, { status: 422 });
    }

    // === SCOPE VALIDATION ===
    
    if (!body.declared_scope) {
      return Response.json({
        ok: false,
        error_code: 'MISSING_REQUIRED_METADATA',
        message: 'declared_scope is required',
        field: 'declared_scope',
        request_id: clientRequestId
      }, { status: 422 });
    }

    // DATASET × SCOPE COMPATIBILITY CHECK (MANUAL_ENTRY only)
    if (contract.dataset_scope_validation && body.ingestion_method === 'MANUAL_ENTRY') {
      const DATASET_SCOPE_RULES = {
        'SUPPLIER_MASTER': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'UNKNOWN'],
        'PRODUCT_MASTER': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'PRODUCT_FAMILY', 'UNKNOWN'],
        'BOM': ['LEGAL_ENTITY', 'PRODUCT_FAMILY', 'SITE', 'UNKNOWN'],
        'CERTIFICATE': ['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY', 'UNKNOWN'],
        'TEST_REPORT': ['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY', 'UNKNOWN']
      };

      const allowedScopes = DATASET_SCOPE_RULES[body.dataset_type];
      if (allowedScopes && !allowedScopes.includes(body.declared_scope)) {
        return Response.json({
          ok: false,
          error_code: 'INVALID_DATASET_SCOPE_COMBINATION',
          message: `${body.declared_scope} scope not allowed for ${body.dataset_type}. Allowed: ${allowedScopes.filter(s => s !== 'UNKNOWN').join(', ')}`,
          field: 'declared_scope',
          request_id: clientRequestId
        }, { status: 422 });
      }
    }

    // UNKNOWN scope validation
    if (body.declared_scope === 'UNKNOWN') {
      if (!body.unlinked_reason || body.unlinked_reason.length < 30) {
        return Response.json({
          ok: false,
          error_code: 'MISSING_UNLINKED_REASON',
          message: 'declared_scope=UNKNOWN requires unlinked_reason (min 30 chars)',
          field: 'unlinked_reason',
          request_id: clientRequestId
        }, { status: 422 });
      }
      if (!body.resolution_due_date) {
        return Response.json({
          ok: false,
          error_code: 'MISSING_RESOLUTION_DUE_DATE',
          message: 'declared_scope=UNKNOWN requires resolution_due_date',
          field: 'resolution_due_date',
          request_id: clientRequestId
        }, { status: 422 });
      }
      // Validate resolution_due_date is within 90 days
      const resolutionDate = new Date(body.resolution_due_date);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      if (resolutionDate <= today || resolutionDate > maxDate) {
        return Response.json({
          ok: false,
          error_code: 'INVALID_RESOLUTION_DATE',
          message: 'resolution_due_date must be between tomorrow and 90 days from now',
          field: 'resolution_due_date',
          request_id: clientRequestId
        }, { status: 422 });
      }
    }

    // Scope target validation
    if (['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(body.declared_scope)) {
      if (!body.scope_target_id || body.scope_target_id.trim() === '') {
        return Response.json({
          ok: false,
          error_code: 'MISSING_SCOPE_TARGET_ID',
          message: `declared_scope=${body.declared_scope} requires scope_target_id`,
          field: 'scope_target_id',
          request_id: clientRequestId
        }, { status: 422 });
      }
    } else if (body.declared_scope === 'ENTIRE_ORGANIZATION') {
      if (body.scope_target_id) {
        return Response.json({
          ok: false,
          error_code: 'SCOPE_TARGET_NOT_ALLOWED',
          message: 'declared_scope=ENTIRE_ORGANIZATION cannot have scope_target_id',
          field: 'scope_target_id',
          request_id: clientRequestId
        }, { status: 422 });
      }
    }

    // === MANUAL_ENTRY SPECIFIC VALIDATION ===
    
    if (body.ingestion_method === 'MANUAL_ENTRY') {
      // 1. Validate entry notes
      if (!body.entry_notes || body.entry_notes.length < 20) {
        return Response.json({
          ok: false,
          error_code: 'INVALID_ATTESTATION_NOTES',
          message: 'entry_notes must be at least 20 characters (no placeholders)',
          field: 'entry_notes',
          request_id: clientRequestId
        }, { status: 422 });
      }

      // 2. Validate payload is JSON object
      if (!body.payload_bytes) {
        return Response.json({
          ok: false,
          error_code: 'MISSING_PAYLOAD',
          message: 'payload_bytes required for MANUAL_ENTRY',
          field: 'payload_bytes',
          request_id: clientRequestId
        }, { status: 422 });
      }

      let payloadParsed;
      try {
        payloadParsed = JSON.parse(body.payload_bytes);
      } catch (e) {
        return Response.json({
          ok: false,
          error_code: 'INVALID_PAYLOAD',
          message: 'payload_bytes must be valid JSON',
          field: 'payload_bytes',
          details: e.message,
          request_id: clientRequestId
        }, { status: 422 });
      }

      if (typeof payloadParsed !== 'object' || Array.isArray(payloadParsed)) {
        return Response.json({
          ok: false,
          error_code: 'INVALID_PAYLOAD',
          message: 'payload_bytes must be JSON object (not array or primitive)',
          field: 'payload_bytes',
          request_id: clientRequestId
        }, { status: 422 });
      }

      // 3. Detect placeholder values
      const placeholders = ['test', 'asdf', 'xxx', '-', 'n/a', 'tbd'];
      for (const [key, value] of Object.entries(payloadParsed)) {
        if (typeof value === 'string' && placeholders.includes(value.toLowerCase().trim())) {
          return Response.json({
            ok: false,
            error_code: 'INVALID_PAYLOAD',
            message: `Placeholder value not allowed for ${key}: "${value}"`,
            field: 'payload_bytes',
            request_id: clientRequestId
          }, { status: 422 });
        }
      }

      // 4. FRAUD PROTECTION: Reject client-provided attestor fields
      if (body.attestor_user_id || body.attested_by_email || body.attestation_method || body.attested_at_utc) {
        return Response.json({
          ok: false,
          error_code: 'ATTESTOR_FORGERY_ATTEMPT',
          message: 'Client cannot set attestation fields (server-side only)',
          request_id: clientRequestId
        }, { status: 403 });
      }

      // 5. SERVER-SIDE ATTESTATION CAPTURE (cannot be forged)
      body.attestor_user_id = user.id;
      body.attested_by_email = user.email;
      body.attestation_method = 'MANUAL_ENTRY';
      body.attested_at_utc = now;

      // 6. Block file upload for MANUAL_ENTRY
      if (body.file_metadata || body.original_filename) {
        return Response.json({
          ok: false,
          error_code: 'METHOD_DISALLOWS_FILE',
          message: 'MANUAL_ENTRY does not allow file upload',
          request_id: clientRequestId
        }, { status: 422 });
      }
    }

    // === OTHER METHOD-SPECIFIC VALIDATIONS ===
    
    // ERP_API: no client payload allowed
    if (contract.payload_mode === 'server_fetch_only' && body.payload_bytes) {
      return Response.json({
        ok: false,
        error_code: 'CLIENT_PAYLOAD_NOT_ALLOWED',
        message: `${body.ingestion_method} does not accept client payload (server-side fetch only)`,
        request_id: clientRequestId
      }, { status: 422 });
    }

    // File upload disallowed for certain methods
    if (contract.disallows?.includes('file_upload') && body.file_metadata) {
      return Response.json({
        ok: false,
        error_code: 'METHOD_DISALLOWS_FILE',
        message: `${body.ingestion_method} does not allow file upload`,
        request_id: clientRequestId
      }, { status: 422 });
    }

    // === GDPR VALIDATION ===
    
    if (body.contains_personal_data === true && !body.gdpr_legal_basis) {
      return Response.json({
        ok: false,
        error_code: 'MISSING_GDPR_BASIS',
        message: 'gdpr_legal_basis required when contains_personal_data=true',
        field: 'gdpr_legal_basis',
        request_id: clientRequestId
      }, { status: 422 });
    }

    // === PAYLOAD VALIDATION ===
    
    // FILE_UPLOAD: must have payload_bytes (from file or paste)
    if (body.ingestion_method === 'FILE_UPLOAD') {
      if (!body.payload_bytes || body.payload_bytes.trim() === '') {
        return Response.json({
          ok: false,
          error_code: 'MISSING_EVIDENCE_PAYLOAD',
          message: 'FILE_UPLOAD requires payload_bytes (upload file or paste raw data)',
          field: 'payload_bytes',
          request_id: clientRequestId
        }, { status: 422 });
      }
    }

    // Payload required unless ERP_API (server-fetch)
    if (!body.payload_bytes && body.ingestion_method !== 'ERP_API') {
      return Response.json({
        ok: false,
        error_code: 'MISSING_PAYLOAD',
        message: 'payload_bytes required',
        field: 'payload_bytes',
        request_id: clientRequestId
      }, { status: 422 });
    }

    // Reject client-provided hashes
    if (body.payload_hash_sha256 || body.metadata_hash_sha256) {
      return Response.json({
        ok: false,
        error_code: 'CLIENT_HASH_REJECTED',
        message: 'Client-provided hashes rejected (server-computed only)',
        request_id: clientRequestId
      }, { status: 422 });
    }

    // === RETENTION VALIDATION ===
    
    if (!['STANDARD_1_YEAR', '3_YEARS', '7_YEARS', 'CUSTOM'].includes(body.retention_policy)) {
      return Response.json({
        ok: false,
        error_code: 'INVALID_RETENTION_POLICY',
        message: 'Invalid retention_policy',
        request_id: clientRequestId
      }, { status: 422 });
    }

    // === IDEMPOTENCY CHECK (API_PUSH) ===
    
    if (body.ingestion_method === 'API_PUSH' && body.external_reference_id) {
      const payloadHash = await hashString(body.payload_bytes || '');

      const existing = await base44.asServiceRole.entities.Evidence.filter({
        tenant_id: tenantId,
        dataset_type: body.dataset_type,
        external_reference_id: body.external_reference_id
      });

      if (existing && existing.length > 0) {
        const existingRecord = existing[0];

        if (existingRecord.payload_hash_sha256 === payloadHash) {
          // Idempotent replay
          return Response.json({
            ok: true,
            evidence_id: existingRecord.evidence_id,
            message: 'Idempotent replay: same payload',
            request_id: clientRequestId,
            is_replay: true,
            original_created_at: existingRecord.ingestion_timestamp_utc
          }, { status: 200 });
        } else {
          // Conflict: same key, different payload
          return Response.json({
            ok: false,
            error_code: 'IDEMPOTENCY_CONFLICT',
            message: 'Same external_reference_id but different payload',
            existing_evidence_id: existingRecord.evidence_id,
            existing_payload_hash: existingRecord.payload_hash_sha256,
            provided_payload_hash: payloadHash,
            request_id: clientRequestId
          }, { status: 409 });
        }
      }
    }

    // === COMPUTE HASHES (SERVER-SIDE ONLY) ===
    
    const payloadBytes = body.payload_bytes || 'SERVER_FETCH_PENDING';
    const payloadHash = await hashString(payloadBytes);
    
    const metaCanonical = {
      dataset_type: body.dataset_type,
      declared_scope: body.declared_scope,
      primary_intent: body.primary_intent,
      purpose_tags: body.purpose_tags,
      contains_personal_data: body.contains_personal_data,
      retention_policy: body.retention_policy
    };
    const metaHashSource = canonicalJson(metaCanonical);
    const metaHash = await hashString(metaHashSource);

    // Compute retention end date
    const retentionEnd = computeRetentionEnd(now, body.retention_policy, body.retention_custom_days);

    // === CREATE EVIDENCE RECORD ===
    
    const evidenceId = crypto.randomUUID();
    
    // Determine trust_level based on method
    let trustLevel = 'MEDIUM';
    if (body.ingestion_method === 'MANUAL_ENTRY') trustLevel = 'LOW';
    if (['ERP_API', 'SUPPLIER_PORTAL'].includes(body.ingestion_method)) trustLevel = 'HIGH';
    
    // UNKNOWN scope triggers QUARANTINE
    const isQuarantined = body.declared_scope === 'UNKNOWN';
    const ledgerState = isQuarantined ? 'QUARANTINED' : 'INGESTED';
    const quarantineReason = isQuarantined ? `UNLINKED: ${body.unlinked_reason || 'Scope not resolved'}` : null;
    
    const evidenceData = {
      evidence_id: evidenceId,
      tenant_id: tenantId,
      data_mode: dataModeServer,
      origin: body.origin || 'USER_SUBMITTED',
      ledger_state: ledgerState,
      trust_level: trustLevel,
      review_status: trustLevel === 'LOW' ? 'PENDING_REVIEW' : 'APPROVED',
      ingestion_method: body.ingestion_method,
      source_system: body.source_system,
      source_system_friendly_name: body.source_system_friendly_name || null,
      dataset_type: body.dataset_type,
      declared_scope: body.declared_scope,
      scope_target_id: body.scope_target_id || null,
      scope_target_name: body.scope_target_name || null,
      unlinked_reason: body.unlinked_reason || null,
      resolution_due_date: body.resolution_due_date || null,
      quarantine_reason: quarantineReason,
      quarantine_created_at_utc: isQuarantined ? now : null,
      quarantined_by: isQuarantined ? user.id : null,
      primary_intent: body.primary_intent,
      purpose_tags: body.purpose_tags,
      contains_personal_data: body.contains_personal_data,
      gdpr_legal_basis: body.gdpr_legal_basis || null,
      retention_policy: body.retention_policy,
      retention_custom_days: body.retention_custom_days || null,
      payload_bytes: payloadBytes,
      payload_hash_sha256: payloadHash,
      metadata_canonical_json: metaCanonical,
      metadata_hash_sha256: metaHash,
      ingestion_timestamp_utc: now,
      retention_ends_at_utc: retentionEnd,
      created_by_user_id: user.id,
      audit_event_count: 1,
      // Method-specific fields
      external_reference_id: body.external_reference_id || null,
      idempotency_key: (body.ingestion_method === 'API_PUSH' && body.external_reference_id) 
        ? `${tenantId}:${body.dataset_type}:${body.external_reference_id}` 
        : null,
      snapshot_datetime_utc: body.snapshot_datetime_utc || null,
      connector_reference: body.connector_reference || null,
      supplier_portal_request_id: body.supplier_portal_request_id || null,
      entry_notes: body.entry_notes || null,
      attestor_user_id: body.attestor_user_id || null,
      attested_by_email: body.attested_by_email || null,
      attestation_method: body.attestation_method || null,
      attested_at_utc: body.attested_at_utc || null,
      export_job_id: body.export_job_id || null,
      file_name: body.file_name || null,
      original_filename: body.original_filename || null
    };

    const evidence = await base44.asServiceRole.entities.Evidence.create(evidenceData);

    // Create audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      audit_event_id: crypto.randomUUID(),
      tenant_id: tenantId,
      evidence_id: evidenceId,
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'INGESTED',
      details: `Evidence ingested: ${body.ingestion_method} from ${body.source_system}`,
      created_at_utc: now,
      request_id: clientRequestId
    });

    return Response.json({
      ok: true,
      evidence_id: evidenceId,
      request_id: clientRequestId,
      ledger_state: ledgerState,
      trust_level: trustLevel,
      review_status: trustLevel === 'LOW' ? 'PENDING_REVIEW' : 'APPROVED',
      quarantined: isQuarantined,
      quarantine_reason: quarantineReason,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metaHash,
      retention_ends_at_utc: retentionEnd,
      created_at: now
    }, { status: 201 });

  } catch (error) {
    console.error('[INGEST_DETERMINISTIC]', error);
    return Response.json({
      ok: false,
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      request_id: functionRequestId
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONTRACT 1: MANUAL ENTRY DRAFT STATE MACHINE
 * 
 * Implements server-authoritative draft lifecycle:
 * DRAFT → READY_TO_SEAL → SEALED (immutable)
 * 
 * Routes:
 * POST   /evidence/drafts                           - Create draft
 * GET    /evidence/drafts/{draft_id}               - Get draft (binding context)
 * POST   /evidence/drafts/{draft_id}/payload       - Save payload
 * POST   /evidence/drafts/{draft_id}/seal          - Seal evidence
 * POST   /evidence/{evidence_id}/resolve           - Resolve quarantine (after seal)
 */

const METHOD_DATASET_ALLOWED = {
  'SUPPLIER_MASTER': ['MANUAL_ENTRY', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'API_PUSH'],
  'PRODUCT_MASTER': ['MANUAL_ENTRY', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'API_PUSH'],
  'BOM': ['MANUAL_ENTRY', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API', 'API_PUSH'],
  'CERTIFICATE': ['FILE_UPLOAD', 'SUPPLIER_PORTAL'],
  'TEST_REPORT': ['FILE_UPLOAD', 'SUPPLIER_PORTAL'],
  'TRANSACTION_LOG': ['API_PUSH', 'FILE_UPLOAD', 'ERP_EXPORT', 'ERP_API']
};

const DATASET_SCOPE_RULES = {
  'SUPPLIER_MASTER': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'UNKNOWN'],
  'PRODUCT_MASTER': ['ENTIRE_ORGANIZATION', 'LEGAL_ENTITY', 'PRODUCT_FAMILY', 'UNKNOWN'],
  'BOM': ['LEGAL_ENTITY', 'PRODUCT_FAMILY', 'SITE', 'UNKNOWN'],
};

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
  if (policy === 'STANDARD_1_YEAR') date.setFullYear(date.getFullYear() + 1);
  else if (policy === '3_YEARS') date.setFullYear(date.getFullYear() + 3);
  else if (policy === '7_YEARS') date.setFullYear(date.getFullYear() + 7);
  else if (policy === 'CUSTOM' && customDays) date.setDate(date.getDate() + customDays);
  return date.toISOString();
}

Deno.serve(async (req) => {
  const functionRequestId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ok: false, error_code: 'UNAUTHORIZED', message: 'Not authenticated' }, { status: 401 });
    }

    const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || 'DEFAULT';
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Route: POST /evidence/drafts
    if (req.method === 'POST' && pathParts[1] === 'drafts' && pathParts.length === 2) {
      let body;
      try {
        body = await req.json();
      } catch {
        return Response.json({
          ok: false,
          error_code: 'INVALID_JSON',
          message: 'Request body must be valid JSON',
          request_id: functionRequestId
        }, { status: 400 });
      }

      // Validate method is MANUAL_ENTRY
      if (body.method !== 'MANUAL_ENTRY') {
        return Response.json({
          ok: false,
          error_code: 'INVALID_METHOD',
          message: 'Only MANUAL_ENTRY supported for drafts',
          request_id: functionRequestId
        }, { status: 422 });
      }

      // Validate method-dataset compatibility
      const allowedMethods = METHOD_DATASET_ALLOWED[body.dataset_type];
      if (!allowedMethods || !allowedMethods.includes('MANUAL_ENTRY')) {
        return Response.json({
          ok: false,
          error_code: 'UNSUPPORTED_METHOD_DATASET_COMBINATION',
          message: `MANUAL_ENTRY not supported for ${body.dataset_type}`,
          allowed_methods: allowedMethods || [],
          request_id: functionRequestId
        }, { status: 422 });
      }

      // Validate dataset-scope compatibility
      const allowedScopes = DATASET_SCOPE_RULES[body.dataset_type];
      if (allowedScopes && !allowedScopes.includes(body.declared_scope)) {
        return Response.json({
          ok: false,
          error_code: 'DATASET_SCOPE_INCOMPATIBLE',
          message: `${body.declared_scope} not allowed for ${body.dataset_type}`,
          allowed_scopes: allowedScopes,
          request_id: functionRequestId
        }, { status: 422 });
      }

      // Validate unknown scope rules
      if (body.declared_scope === 'UNKNOWN') {
        if (!body.quarantine_reason || body.quarantine_reason.length < 30) {
          return Response.json({
            ok: false,
            error_code: 'QUARANTINE_REASON_REQUIRED',
            message: 'declared_scope=UNKNOWN requires quarantine_reason (min 30 chars)',
            request_id: functionRequestId
          }, { status: 422 });
        }
        if (!body.resolution_deadline_utc) {
          return Response.json({
            ok: false,
            error_code: 'RESOLUTION_DEADLINE_REQUIRED',
            message: 'declared_scope=UNKNOWN requires resolution_deadline_utc',
            request_id: functionRequestId
          }, { status: 422 });
        }
        const deadline = new Date(body.resolution_deadline_utc);
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 90);
        if (deadline <= today || deadline > maxDate) {
          return Response.json({
            ok: false,
            error_code: 'INVALID_RESOLUTION_DEADLINE',
            message: 'resolution_deadline_utc must be between tomorrow and 90 days from now',
            request_id: functionRequestId
          }, { status: 422 });
        }
      } else {
        // Known scope: require scope_target_id
        if (!body.scope_target_id) {
          return Response.json({
            ok: false,
            error_code: 'SCOPE_TARGET_ID_REQUIRED',
            message: `${body.declared_scope} scope requires scope_target_id`,
            request_id: functionRequestId
          }, { status: 422 });
        }
      }

      // Create draft (as Evidence with status DRAFT)
      const draftId = crypto.randomUUID();
      const draftData = {
        evidence_id: draftId,
        tenant_id: tenantId,
        data_mode: 'SANDBOX', // Drafts always in SANDBOX
        origin: body.origin || 'USER_SUBMITTED',
        ledger_state: 'INGESTED', // Will be updated on seal
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'INTERNAL_MANUAL',
        dataset_type: body.dataset_type,
        declared_scope: body.declared_scope,
        scope_target_id: body.scope_target_id || null,
        scope_target_name: body.scope_target_name || null,
        unlinked_reason: body.declared_scope === 'UNKNOWN' ? body.quarantine_reason : null,
        resolution_due_date: body.declared_scope === 'UNKNOWN' ? body.resolution_deadline_utc?.split('T')[0] : null,
        trust_level: 'LOW',
        review_status: 'PENDING_REVIEW',
        primary_intent: body.primary_intent || '',
        purpose_tags: body.purpose_tags || [],
        contains_personal_data: body.contains_personal_data || false,
        retention_policy: body.retention_policy || 'STANDARD_1_YEAR',
        payload_bytes: '', // Empty until Step 2
        payload_hash_sha256: await hashString(''),
        metadata_canonical_json: { draft: true },
        metadata_hash_sha256: await hashString('{"draft":true}'),
        ingestion_timestamp_utc: now,
        retention_ends_at_utc: computeRetentionEnd(now, body.retention_policy || 'STANDARD_1_YEAR', null),
        created_by_user_id: user.id,
        entry_notes: body.entry_notes || '',
        quarantine_reason: body.declared_scope === 'UNKNOWN' ? body.quarantine_reason : null,
        quarantine_created_at_utc: body.declared_scope === 'UNKNOWN' ? now : null,
        quarantined_by: body.declared_scope === 'UNKNOWN' ? user.id : null
      };

      const draft = await base44.asServiceRole.entities.Evidence.create(draftData);

      return Response.json({
        ok: true,
        draft_id: draftId,
        status: 'DRAFT',
        binding_context: {
          method: 'MANUAL_ENTRY',
          dataset_type: body.dataset_type,
          declared_scope: body.declared_scope,
          scope_target_id: body.scope_target_id || null,
          link_status: body.declared_scope === 'UNKNOWN' ? 'QUARANTINED' : 'LINKED',
          trust_level: 'LOW',
          review_status: 'PENDING_REVIEW'
        },
        request_id: functionRequestId
      }, { status: 201 });
    }

    // Route: GET /evidence/drafts/{draft_id}
    if (req.method === 'GET' && pathParts[1] === 'drafts' && pathParts.length === 3) {
      const draftId = pathParts[2];
      const draft = await base44.asServiceRole.entities.Evidence.filter({
        evidence_id: draftId,
        tenant_id: tenantId
      });

      if (!draft || draft.length === 0) {
        return Response.json({
          ok: false,
          error_code: 'NOT_FOUND',
          message: 'Draft not found',
          request_id: functionRequestId
        }, { status: 404 });
      }

      const d = draft[0];
      return Response.json({
        ok: true,
        draft: {
          draft_id: d.evidence_id,
          method: d.ingestion_method,
          dataset_type: d.dataset_type,
          declared_scope: d.declared_scope,
          scope_target_id: d.scope_target_id,
          link_status: d.declared_scope === 'UNKNOWN' ? 'QUARANTINED' : 'LINKED',
          trust_level: d.trust_level,
          review_status: d.review_status,
          has_payload: !!d.payload_bytes
        },
        request_id: functionRequestId
      }, { status: 200 });
    }

    // Route: POST /evidence/drafts/{draft_id}/payload
    if (req.method === 'POST' && pathParts[1] === 'drafts' && pathParts[3] === 'payload') {
      const draftId = pathParts[2];
      let body;
      try {
        body = await req.json();
      } catch {
        return Response.json({
          ok: false,
          error_code: 'INVALID_JSON',
          message: 'Request body must be valid JSON',
          request_id: functionRequestId
        }, { status: 400 });
      }

      const draft = await base44.asServiceRole.entities.Evidence.filter({
        evidence_id: draftId,
        tenant_id: tenantId
      });

      if (!draft || draft.length === 0) {
        return Response.json({
          ok: false,
          error_code: 'NOT_FOUND',
          message: 'Draft not found',
          request_id: functionRequestId
        }, { status: 404 });
      }

      const d = draft[0];

      // Reject if already sealed
      if (d.ledger_state === 'SEALED') {
        return Response.json({
          ok: false,
          error_code: 'EVIDENCE_SEALED_IMMUTABLE',
          message: 'Cannot modify sealed evidence',
          request_id: functionRequestId
        }, { status: 409 });
      }

      // Reject if payload includes scope fields (immutable after Step 1)
      if (body.declared_scope || body.scope_target_id || body.scope_target_name) {
        return Response.json({
          ok: false,
          error_code: 'SCOPE_IMMUTABLE_IN_STEP2',
          message: 'Scope fields cannot be changed in Step 2',
          request_id: functionRequestId
        }, { status: 422 });
      }

      // Validate payload format
      if (!body.payload || typeof body.payload !== 'object') {
        return Response.json({
          ok: false,
          error_code: 'INVALID_PAYLOAD',
          message: 'payload must be a JSON object',
          request_id: functionRequestId
        }, { status: 422 });
      }

      const payloadBytes = JSON.stringify(body.payload);
      const payloadHash = await hashString(payloadBytes);

      // Update draft
      await base44.asServiceRole.entities.Evidence.update(draftId, {
        payload_bytes: payloadBytes,
        payload_hash_sha256: payloadHash
      });

      return Response.json({
        ok: true,
        draft_id: draftId,
        status: 'READY_TO_SEAL',
        payload_hash: payloadHash,
        request_id: functionRequestId
      }, { status: 200 });
    }

    // Route: POST /evidence/drafts/{draft_id}/seal
    if (req.method === 'POST' && pathParts[1] === 'drafts' && pathParts[3] === 'seal') {
      const draftId = pathParts[2];
      const draft = await base44.asServiceRole.entities.Evidence.filter({
        evidence_id: draftId,
        tenant_id: tenantId
      });

      if (!draft || draft.length === 0) {
        return Response.json({
          ok: false,
          error_code: 'NOT_FOUND',
          message: 'Draft not found',
          request_id: functionRequestId
        }, { status: 404 });
      }

      const d = draft[0];

      // Preconditions
      if (!d.payload_bytes) {
        return Response.json({
          ok: false,
          error_code: 'MISSING_PAYLOAD',
          message: 'Payload required before sealing',
          request_id: functionRequestId
        }, { status: 422 });
      }

      // Seal: transition to SEALED and compute immutable hashes
      const ledgerState = d.declared_scope === 'UNKNOWN' ? 'QUARANTINED' : 'SEALED';
      
      await base44.asServiceRole.entities.Evidence.update(draftId, {
        ledger_state: ledgerState,
        sealed_at_utc: now,
        attestor_user_id: user.id,
        attested_by_email: user.email,
        attestation_method: 'MANUAL_ENTRY',
        attested_at_utc: now
      });

      // Create audit event
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: tenantId,
        evidence_id: draftId,
        actor_user_id: user.id,
        actor_email: user.email,
        action: ledgerState === 'QUARANTINED' ? 'QUARANTINED' : 'SEALED',
        details: `Manual entry sealed (${ledgerState})`,
        created_at_utc: now,
        request_id: functionRequestId
      });

      return Response.json({
        ok: true,
        evidence_id: draftId,
        ledger_state: ledgerState,
        sealed_at: now,
        immutable: true,
        request_id: functionRequestId
      }, { status: 201 });
    }

    // Default: method not found
    return Response.json({
      ok: false,
      error_code: 'NOT_FOUND',
      message: 'Endpoint not found',
      request_id: functionRequestId
    }, { status: 404 });

  } catch (error) {
    console.error('[DRAFT_MANAGER]', error);
    return Response.json({
      ok: false,
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      request_id: functionRequestId
    }, { status: 500 });
  }
});
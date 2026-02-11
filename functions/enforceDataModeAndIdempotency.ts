import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ENFORCE DATA MODE + IDEMPOTENCY
 * Before ingestion:
 * 1. Block TEST_FIXTURE in LIVE (403)
 * 2. Block test execution in LIVE (403)
 * 3. Enforce API_PUSH idempotency: same (tenant, dataset_type, external_reference_id) with same payload = 200 idempotent
 * 4. If same key different payload = 409 IDEMPOTENCY_CONFLICT
 */

async function hashString(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error_code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const requestId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ok: false, error_code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const tenantId = req.headers.get('x-tenant-id') || user.tenant_id || 'DEFAULT';
    let body;

    try {
      body = await req.json();
    } catch (parseError) {
      return Response.json({
        ok: false,
        error_code: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
        request_id: requestId
      }, { status: 400 });
    }

    // Load tenant data_mode
    const tenantRecords = await base44.asServiceRole.entities.Company.filter({ tenant_id: tenantId });
    const dataModeServer = tenantRecords?.[0]?.data_mode || 'LIVE';

    // RULE 1: Block TEST_FIXTURE in LIVE
    if (dataModeServer === 'LIVE' && body.origin === 'TEST_FIXTURE') {
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: tenantId,
        evidence_id: 'SYSTEM',
        actor_user_id: user.id,
        action: 'SECURITY_VIOLATION',
        details: 'TEST_FIXTURE blocked in LIVE',
        created_at_utc: now
      });

      return Response.json({
        ok: false,
        error_code: 'FIXTURE_BLOCKED_IN_LIVE',
        message: 'TEST_FIXTURE records cannot be created in LIVE mode',
        request_id: requestId
      }, { status: 403 });
    }

    // RULE 2: Block test execution in LIVE
    const isTestRequest = body.is_test_request === true;
    if (dataModeServer === 'LIVE' && isTestRequest) {
      return Response.json({
        ok: false,
        error_code: 'DATA_MODE_LIVE_BLOCKED',
        message: 'Test execution is blocked in LIVE mode',
        request_id: requestId
      }, { status: 403 });
    }

    // RULE 3 & 4: API_PUSH Idempotency
    if (body.ingestion_method === 'API_PUSH' && body.external_reference_id) {
      const payloadHash = await hashString(body.payload_bytes || '');

      // Check for existing record with same key
      const existing = await base44.asServiceRole.entities.Evidence.filter({
        tenant_id: tenantId,
        dataset_type: body.dataset_type,
        external_reference_id: body.external_reference_id
      });

      if (existing && existing.length > 0) {
        const existingRecord = existing[0];

        if (existingRecord.payload_hash_sha256 === payloadHash) {
          // Same payload = idempotent replay
          return Response.json({
            ok: true,
            evidence_id: existingRecord.evidence_id,
            message: 'Idempotent replay: same payload',
            request_id: requestId,
            is_replay: true,
            original_created_at: existingRecord.ingestion_timestamp_utc
          }, { status: 200 });
        } else {
          // Same key, different payload = conflict
          return Response.json({
            ok: false,
            error_code: 'IDEMPOTENCY_CONFLICT',
            message: 'Same external_reference_id but different payload',
            existing_evidence_id: existingRecord.evidence_id,
            existing_payload_hash: existingRecord.payload_hash_sha256,
            provided_payload_hash: payloadHash,
            request_id: requestId
          }, { status: 409 });
        }
      }
    }

    // Proceed to normal ingestion (return 200 to signal guard passed)
    return Response.json({
      ok: true,
      message: 'Guard passed: proceed to ingestion',
      request_id: requestId,
      tenant_id: tenantId,
      data_mode: dataModeServer
    }, { status: 200 });

  } catch (error) {
    console.error('[DATA_MODE_IDEMPOTENCY_GUARD]', error);
    return Response.json({
      ok: false,
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      request_id: requestId
    }, { status: 500 });
  }
});
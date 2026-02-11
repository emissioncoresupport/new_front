import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hashString(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function canonicalJSON(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

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

    if (!evidence_id) {
      return Response.json({
        ok: false,
        error_code: 'MISSING_FIELD',
        message: 'evidence_id is required',
        request_id
      }, { status: 400 });
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

    // Recompute hashes
    const recomputedPayloadHash = await hashString(evidence.payload_bytes || '');
    const recomputedMetadataHash = await hashString(canonicalJSON(evidence.metadata_canonical_json || {}));

    const payloadMatch = recomputedPayloadHash === evidence.payload_hash_sha256;
    const metadataMatch = recomputedMetadataHash === evidence.metadata_hash_sha256;

    return Response.json({
      ok: true,
      hashes_match: payloadMatch && metadataMatch,
      verification: {
        payload_hash_match: payloadMatch,
        metadata_hash_match: metadataMatch,
        stored_payload_hash: evidence.payload_hash_sha256,
        recomputed_payload_hash: recomputedPayloadHash,
        stored_metadata_hash: evidence.metadata_hash_sha256,
        recomputed_metadata_hash: recomputedMetadataHash
      },
      request_id,
      verified_at_utc: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('[VERIFY_HASHES]', error);
    return Response.json({
      ok: false,
      error_code: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
});
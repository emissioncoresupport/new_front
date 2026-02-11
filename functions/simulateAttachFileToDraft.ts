import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SIMULATION MODE: Attach File to Draft (no bytes stored)
 * Returns deterministic server-generated test hashes for UI validation.
 * Used when Base44 file upload fails or for UI/UX testing.
 */

async function computeSimulatedHash(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const correlationId = crypto.randomUUID();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({
        error_code: 'UNAUTHORIZED',
        message: 'Authentication required',
        correlation_id: correlationId
      }, { status: 401 });
    }

    const body = await req.json();
    const { draft_id, filename, content_type, size_bytes } = body;

    // Validation
    if (!draft_id) {
      return Response.json({
        error_code: 'DRAFT_ID_REQUIRED',
        message: 'draft_id is required',
        field_errors: [{ field: 'draft_id', error: 'Required' }],
        correlation_id: correlationId
      }, { status: 422 });
    }

    if (!filename) {
      return Response.json({
        error_code: 'FILENAME_REQUIRED',
        message: 'filename is required',
        field_errors: [{ field: 'filename', error: 'Required' }],
        correlation_id: correlationId
      }, { status: 422 });
    }

    // Verify draft exists
    const drafts = await base44.entities.evidence_drafts.filter({ draft_id });
    if (!drafts || drafts.length === 0) {
      return Response.json({
        error_code: 'DRAFT_NOT_FOUND',
        message: 'Draft not found',
        correlation_id: correlationId
      }, { status: 404 });
    }

    const draft = drafts[0];

    // Generate deterministic simulated hashes
    const payloadHash = await computeSimulatedHash(
      `SIMULATED:${draft_id}:${filename}:${size_bytes || 0}:${Date.now()}`
    );
    
    const metadataHash = await computeSimulatedHash(
      `META:${draft_id}:${draft.declared_scope}:${draft.dataset_type}:${draft.source_system}:${draft.ingestion_method}`
    );

    const fileId = crypto.randomUUID();
    const uploadedAt = new Date().toISOString();

    // Create simulated attachment record
    const attachment = await base44.asServiceRole.entities.draft_attachments.create({
      attachment_id: fileId,
      draft_id,
      tenant_id: draft.tenant_id,
      attachment_kind: 'FILE',
      filename: filename || 'simulated_file.bin',
      content_type: content_type || 'application/octet-stream',
      size_bytes: size_bytes || 0,
      sha256: payloadHash,
      storage_ref: `simulated://${draft_id}/${fileId}`,
      created_at_utc: uploadedAt
    });

    // Log audit event
    await base44.asServiceRole.entities.audit_events.create({
      event_id: crypto.randomUUID(),
      tenant_id: draft.tenant_id,
      correlation_id: correlationId,
      event_type: 'ATTACHMENT_ADDED',
      draft_id,
      actor_user_id: user.id,
      server_ts_utc: uploadedAt,
      details_json: {
        simulated: true,
        filename,
        size_bytes: size_bytes || 0,
        payload_hash_sha256: payloadHash
      }
    });

    console.log(`[SIMULATE_ATTACH] ✓ Simulated file attached:`, {
      draft_id,
      file_id: fileId,
      filename,
      payload_hash: payloadHash.substring(0, 16) + '...',
      correlation_id: correlationId
    });

    return Response.json({
      draft_id,
      file_id: fileId,
      attachment_id: fileId,
      payload_hash_sha256: payloadHash,
      metadata_hash_sha256: metadataHash,
      sha256: payloadHash,
      size_bytes: size_bytes || 0,
      content_type: content_type || 'application/octet-stream',
      filename: filename || 'simulated_file.bin',
      uploaded_at_utc: uploadedAt,
      simulated: true,
      correlation_id: correlationId,
      build_id: Deno.env.get('DENO_DEPLOYMENT_ID') || 'local-dev',
      contract_version: 'CONTRACT_1_v1.0'
    });

  } catch (error) {
    console.error('[SIMULATE_ATTACH] ✗ Error:', error);
    return Response.json({
      error_code: 'SIMULATION_FAILED',
      message: error.message,
      correlation_id: correlationId
    }, { status: 500 });
  }
});
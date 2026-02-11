import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BUILD_ID = Deno.env.get('DENO_DEPLOYMENT_ID') || `local-${Date.now()}`;
const CONTRACT_VERSION = 'contract_ingest_v1';
import { v4 as uuidv4 } from 'npm:uuid';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

async function computeSHA256(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const correlationId = `ATTACH_FILE_${Date.now()}_${uuidv4().substring(0, 8)}`;
  
  try {
    if (req.method !== 'POST') {
      return Response.json({
        error_code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST allowed',
        correlation_id: correlationId
      }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({
        error_code: 'UNAUTHORIZED',
        message: 'Authentication required',
        correlation_id: correlationId
      }, { status: 401 });
    }

    const formData = await req.formData();
    const draftId = formData.get('draft_id');
    const file = formData.get('file');

    if (!draftId) {
      return Response.json({
        error_code: 'DRAFT_ID_REQUIRED',
        message: 'draft_id is required to attach file',
        field_errors: [{ field: 'draft_id', error: 'Required - create draft in Step 1 first' }],
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 422 });
    }

    if (!file) {
      return Response.json({
        error_code: 'FILE_REQUIRED',
        message: 'No file uploaded',
        field_errors: [{ field: 'file', error: 'File binary is required' }],
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 422 });
    }

    // Verify draft exists and belongs to tenant
    const drafts = await base44.asServiceRole.entities.evidence_drafts.filter({
      draft_id: draftId,
      tenant_id: user.tenant_id || 'default'
    });

    if (!drafts || drafts.length === 0) {
      return Response.json({
        error_code: 'DRAFT_NOT_FOUND',
        message: `Draft ${draftId} not found in tenant ${user.tenant_id || 'default'}`,
        field_errors: [{ field: 'draft_id', error: 'Draft not found or access denied (tenant isolation)' }],
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 404 });
    }

    const draft = drafts[0];

    if (draft.status === 'SEALED' || draft.status === 'QUARANTINED') {
      return Response.json({
        error_code: 'DRAFT_SEALED',
        message: 'Cannot attach to sealed draft (immutability enforced)',
        field_errors: [{ field: 'draft_id', error: `Draft status is ${draft.status} - cannot modify` }],
        correlation_id: correlationId,
        build_id: BUILD_ID,
        contract_version: CONTRACT_VERSION
      }, { status: 409 });
    }

    // Compute SHA-256
    const sha256 = await computeSHA256(file);

    // Upload file
    const uploadRes = await base44.integrations.Core.UploadFile({ file });
    const fileUrl = uploadRes.file_url;

    // Create attachment record
    const attachmentId = uuidv4();
    const now = new Date().toISOString();

    await base44.asServiceRole.entities.draft_attachments.create({
      attachment_id: attachmentId,
      draft_id: draftId,
      tenant_id: user.tenant_id || 'default',
      attachment_kind: 'FILE',
      filename: file.name,
      content_type: file.type,
      size_bytes: file.size,
      sha256: sha256,
      storage_ref: fileUrl,
      created_at_utc: now
    });

    // Log audit event
    await base44.asServiceRole.entities.audit_events.create({
      event_id: uuidv4(),
      tenant_id: user.tenant_id || 'default',
      correlation_id: correlationId,
      event_type: 'ATTACHMENT_ADDED',
      draft_id: draftId,
      actor_user_id: user.id,
      server_ts_utc: now,
      details_json: { attachment_id: attachmentId, filename: file.name, sha256 }
    });

    return Response.json({
      attachment_id: attachmentId,
      filename: file.name,
      size_bytes: file.size,
      content_type: file.type,
      sha256: sha256,
      storage_ref: fileUrl,
      correlation_id: correlationId,
      build_id: BUILD_ID,
      contract_version: CONTRACT_VERSION
    }, { status: 201 });

  } catch (error) {
    console.error('[kernelAttachFile] Error:', error);
    return Response.json({
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      correlation_id: correlationId
    }, { status: 500 });
  }
});
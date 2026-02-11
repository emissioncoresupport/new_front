import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BUILD_ID = Deno.env.get('DENO_DEPLOYMENT_ID') || `local-${Date.now()}`;
const CONTRACT_VERSION = 'contract_ingest_v1';
import { v4 as uuidv4 } from 'npm:uuid';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

async function computeStringHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const correlationId = `ATTACH_PAYLOAD_${Date.now()}_${uuidv4().substring(0, 8)}`;
  
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

    const body = await req.json();
    const { draft_id, payload_text } = body;

    if (!draft_id) {
      return Response.json({
        error_code: 'DRAFT_ID_REQUIRED',
        message: 'draft_id required',
        correlation_id: correlationId
      }, { status: 422 });
    }

    if (!payload_text || typeof payload_text !== 'string') {
      return Response.json({
        error_code: 'PAYLOAD_TEXT_REQUIRED',
        message: 'payload_text string required',
        correlation_id: correlationId
      }, { status: 422 });
    }

    // Verify draft exists and belongs to tenant
    const drafts = await base44.asServiceRole.entities.evidence_drafts.filter({
      draft_id: draft_id,
      tenant_id: user.tenant_id || 'default'
    });

    if (!drafts || drafts.length === 0) {
      return Response.json({
        error_code: 'DRAFT_NOT_FOUND',
        message: `Draft ${draft_id} not found for this tenant`,
        correlation_id: correlationId
      }, { status: 422 });
    }

    const draft = drafts[0];

    if (draft.status === 'SEALED') {
      return Response.json({
        error_code: 'DRAFT_SEALED',
        message: 'Cannot attach to sealed draft',
        correlation_id: correlationId
      }, { status: 422 });
    }

    // Compute SHA-256
    const sha256 = await computeStringHash(payload_text);

    // Store payload as text file
    const blob = new Blob([payload_text], { type: 'text/plain' });
    const file = new File([blob], 'payload.txt', { type: 'text/plain' });
    
    const uploadRes = await base44.integrations.Core.UploadFile({ file });
    const storageRef = uploadRes.file_url;

    // Create attachment record
    const attachmentId = uuidv4();
    const now = new Date().toISOString();

    await base44.asServiceRole.entities.draft_attachments.create({
      attachment_id: attachmentId,
      draft_id: draft_id,
      tenant_id: user.tenant_id || 'default',
      attachment_kind: 'RAW_PAYLOAD',
      filename: 'payload.txt',
      content_type: 'text/plain',
      size_bytes: payload_text.length,
      sha256: sha256,
      storage_ref: storageRef,
      created_at_utc: now
    });

    // Log audit event
    await base44.asServiceRole.entities.audit_events.create({
      event_id: uuidv4(),
      tenant_id: user.tenant_id || 'default',
      correlation_id: correlationId,
      event_type: 'ATTACHMENT_ADDED',
      draft_id: draft_id,
      actor_user_id: user.id,
      server_ts_utc: now,
      details_json: { attachment_id: attachmentId, attachment_kind: 'RAW_PAYLOAD', sha256 }
    });

    return Response.json({
      attachment_id: attachmentId,
      attachment_kind: 'RAW_PAYLOAD',
      size_bytes: payload_text.length,
      sha256: sha256,
      storage_ref: storageRef,
      correlation_id: correlationId
    });

  } catch (error) {
    console.error('[kernelAttachRawPayload] Error:', error);
    return Response.json({
      error_code: 'INTERNAL_ERROR',
      message: error.message,
      correlation_id: correlationId
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';
import crypto from 'node:crypto';

/**
 * POST /ingestKernelFileUploadAndAttach
 * Uploads file, computes SHA-256 server-side, atomically links to draft
 * Body: { draft_id, file: <binary> }
 * Returns: { file_id, sha256_hash, size_bytes, content_type, filename, uploaded_at_utc }
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error_code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const correlation_id = uuidv4();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error_code: 'AUTH_REQUIRED', correlation_id }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const draft_id = formData.get('draft_id');
    const file = formData.get('file');

    if (!draft_id) {
      return Response.json({ 
        error_code: 'DRAFT_ID_REQUIRED',
        message: 'draft_id must be provided',
        correlation_id 
      }, { status: 422 });
    }

    if (!file) {
      return Response.json({ 
        error_code: 'FILE_REQUIRED',
        message: 'file must be provided',
        correlation_id 
      }, { status: 422 });
    }

    // Read file bytes
    const fileBytes = await file.arrayBuffer();
    const buffer = new Uint8Array(fileBytes);

    // Compute SHA-256 hash server-side (NEVER trust client)
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    const sha256_hash = hash.digest('hex');

    const file_id = uuidv4();
    const uploaded_at_utc = new Date().toISOString();
    const size_bytes = buffer.length;
    const content_type = file.type || 'application/octet-stream';
    const filename = file.name || 'unknown';

    // Upload file to storage (use Base44 integration)
    const uploadRes = await base44.integrations.Core.UploadFile({ file });
    const storage_url = uploadRes.file_url;

    // Create draft_file record (atomic linking)
    const draftFileRecord = {
      draft_file_id: file_id,
      draft_id,
      tenant_id: user.id,
      filename,
      size_bytes,
      content_type,
      sha256_hash,
      storage_ref: storage_url,
      uploaded_at_utc,
      uploaded_by_user_id: user.id
    };

    // In real system: persist to draft_files entity
    // For TEST mode: return metadata
    await base44.entities.draft_files.create(draftFileRecord);

    console.log(`[FILE_UPLOAD] file_id=${file_id}, draft_id=${draft_id}, sha256=${sha256_hash.substring(0, 16)}..., size=${size_bytes}`);

    return Response.json({
      file_id,
      draft_file_id: file_id,
      sha256_hash,
      size_bytes,
      content_type,
      filename,
      storage_ref: storage_url,
      uploaded_at_utc,
      correlation_id
    }, { status: 201 });

  } catch (error) {
    console.error('[FILE_UPLOAD] Error:', error.stack);
    return Response.json({
      error_code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      correlation_id
    }, { status: 500 });
  }
});
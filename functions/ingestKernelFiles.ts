import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';
import crypto from 'node:crypto';

const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * POST /evidence/drafts/{draft_id}/files
 * Attaches file evidence to draft. Server computes SHA-256 for each file.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const correlation_id = uuidv4();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        { error: 'Unauthorized', error_code: 'AUTH_REQUIRED', correlation_id },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { draft_id, file_data, file_name } = body;

    if (!draft_id || !file_data) {
      return Response.json(
        {
          error: 'draft_id and file_data required',
          error_code: 'FILE_FIELDS_REQUIRED',
          correlation_id
        },
        { status: 422 }
      );
    }

    // Compute file hash
    const file_hash_sha256 = hashString(file_data);

    const fileRecord = {
      file_id: uuidv4(),
      file_name: file_name || 'document',
      file_size_bytes: file_data.length,
      file_hash_sha256,
      attached_at_utc: new Date().toISOString()
    };

    const updatedDraft = {
      draft_id,
      file: fileRecord,
      correlation_id_root: correlation_id
    };

    return Response.json(updatedDraft, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: error.message,
        error_code: 'FILE_ATTACHMENT_FAILED',
        correlation_id
      },
      { status: 500 }
    );
  }
});
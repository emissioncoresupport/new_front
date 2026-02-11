import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';
import crypto from 'node:crypto';

const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

const canonicalJson = (obj) => {
  return JSON.stringify(obj, Object.keys(obj).sort());
};

/**
 * POST /evidence/drafts/{draft_id}/payload
 * Attaches payload to draft. Rejects any binding field overrides.
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
    const { draft_id, payload_data } = body;

    if (!draft_id || !payload_data) {
      return Response.json(
        {
          error: 'draft_id and payload_data required',
          error_code: 'PAYLOAD_FIELDS_REQUIRED',
          correlation_id
        },
        { status: 422 }
      );
    }

    // Check for binding field tampering
    const bindingFields = ['method', 'source_system', 'dataset_type', 'declared_scope', 'scope_target_id', 'quarantine_reason'];
    const tampering = bindingFields.filter(field => field in payload_data);

    if (tampering.length > 0) {
      return Response.json(
        {
          error: `Cannot override binding fields: ${tampering.join(', ')}`,
          error_code: 'BINDING_FIELDS_IMMUTABLE',
          correlation_id
        },
        { status: 422 }
      );
    }

    // Compute payload hash
    const payload_hash_sha256 = hashString(canonicalJson(payload_data));

    const updatedDraft = {
      draft_id,
      payload: payload_data,
      payload_hash_sha256,
      correlation_id_root: correlation_id
    };

    return Response.json(updatedDraft, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: error.message,
        error_code: 'PAYLOAD_ATTACHMENT_FAILED',
        correlation_id
      },
      { status: 500 }
    );
  }
});
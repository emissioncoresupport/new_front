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
 * POST /evidence/drafts
 * Creates a new draft with immutable binding fields.
 * Returns draft_id + canonical binding snapshot.
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

    // Validate binding fields (required)
    const {
      method,
      source_system,
      dataset_type,
      declared_scope,
      scope_target_id,
      quarantine_reason,
      resolution_deadline_utc,
      why_this_evidence,
      purpose_tags,
      retention_policy,
      contains_personal_data
    } = body;

    // Precondition checks
    if (!method || !source_system || !dataset_type || !declared_scope || !why_this_evidence) {
      return Response.json(
        {
          error: 'Missing required binding fields',
          error_code: 'BINDING_FIELDS_REQUIRED',
          correlation_id
        },
        { status: 422 }
      );
    }

    // UNKNOWN scope preconditions
    if (declared_scope === 'UNKNOWN') {
      if (!quarantine_reason || quarantine_reason.length < 30) {
        return Response.json(
          {
            error: 'quarantine_reason required and must be >= 30 chars for UNKNOWN scope',
            error_code: 'QUARANTINE_REASON_REQUIRED',
            correlation_id
          },
          { status: 422 }
        );
      }
      if (!resolution_deadline_utc) {
        return Response.json(
          {
            error: 'resolution_deadline_utc required for UNKNOWN scope',
            error_code: 'RESOLUTION_DEADLINE_REQUIRED',
            correlation_id
          },
          { status: 422 }
        );
      }
      const deadlineDate = new Date(resolution_deadline_utc);
      const daysUntilDeadline = (deadlineDate - new Date()) / (1000 * 60 * 60 * 24);
      if (daysUntilDeadline > 90 || daysUntilDeadline < 1) {
        return Response.json(
          {
            error: 'resolution_deadline_utc must be within 1-90 days',
            error_code: 'INVALID_RESOLUTION_DEADLINE',
            correlation_id
          },
          { status: 422 }
        );
      }
    }

    // Create immutable binding snapshot
    const binding = {
      method,
      source_system,
      dataset_type,
      declared_scope,
      scope_target_id: declared_scope === 'UNKNOWN' ? null : (scope_target_id || null),
      quarantine_reason: declared_scope === 'UNKNOWN' ? quarantine_reason : null,
      resolution_deadline_utc: declared_scope === 'UNKNOWN' ? resolution_deadline_utc : null
    };

    const binding_hash_sha256 = hashString(canonicalJson(binding));

    const draft = {
      draft_id: uuidv4(),
      tenant_id: user.email.split('@')[1], // tenant from email domain
      method,
      binding,
      binding_hash_sha256,
      why_this_evidence,
      purpose_tags: purpose_tags || [],
      retention_policy: retention_policy || 'STANDARD_1_YEAR',
      contains_personal_data: contains_personal_data === true,
      status: 'DRAFT',
      created_by_user_id: user.id,
      created_at_utc: new Date().toISOString(),
      payload: null,
      files: [],
      correlation_id_root: correlation_id
    };

    // Store draft (would be in DB in real system)
    // For now, we're returning it and expecting caller to pass it back for subsequent operations
    return Response.json(draft, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: error.message,
        error_code: 'DRAFT_CREATION_FAILED',
        correlation_id
      },
      { status: 500 }
    );
  }
});
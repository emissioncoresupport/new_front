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
 * POST /evidence/drafts/{draft_id}/seal
 * Validates method-specific preconditions and seals immutable evidence.
 * Returns evidence_id + hashes.
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
    const { draft } = body;

    if (!draft || !draft.draft_id) {
      return Response.json(
        {
          error: 'Valid draft object required',
          error_code: 'INVALID_DRAFT',
          correlation_id
        },
        { status: 422 }
      );
    }

    // METHOD-SPECIFIC PRECONDITIONS

    // FILE_UPLOAD: must have >= 1 file AND file hash computed
    if (draft.method === 'FILE_UPLOAD') {
      if (!draft.files || draft.files.length === 0) {
        return Response.json(
          {
            error: 'FILE_UPLOAD requires at least one file',
            error_code: 'FILE_REQUIRED',
            correlation_id
          },
          { status: 422 }
        );
      }
      // Check that each file has hash_sha256 computed
      const filesWithoutHash = draft.files.filter(f => !f.hash_sha256);
      if (filesWithoutHash.length > 0) {
        return Response.json(
          {
            error: 'FILE_UPLOAD: file hash not computed. Server-side SHA-256 required.',
            error_code: 'FILE_HASH_MISSING',
            correlation_id
          },
          { status: 422 }
        );
      }
    }

    // API_PUSH: must have external_reference_id, check idempotency
    if (draft.method === 'API_PUSH') {
      if (!draft.external_reference_id) {
        return Response.json(
          {
            error: 'external_reference_id required for API_PUSH',
            error_code: 'EXTERNAL_REFERENCE_ID_REQUIRED',
            correlation_id
          },
          { status: 422 }
        );
      }

      // Check idempotency: if same external_reference_id + dataset_type + payload_hash exists
      // This would query Evidence table in real system
      // For now, we assume no duplicates and proceed

      if (draft.payload) {
        // Re-compute payload hash for comparison
        const payload_hash = hashString(canonicalJson(draft.payload));
        // In real system: query Evidence.filter({ external_reference_id, dataset_type, payload_hash })
        // If found: return 200 REPLAY with same evidence_id
        // If found but different payload_hash: return 409 IDEMPOTENCY_CONFLICT
      }
    }

    // ERP_EXPORT: must have >= 1 file and snapshot_timestamp_utc
    if (draft.method === 'ERP_EXPORT') {
      if (!draft.files || draft.files.length === 0) {
        return Response.json(
          {
            error: 'ERP_EXPORT requires at least one file',
            error_code: 'FILE_REQUIRED',
            correlation_id
          },
          { status: 422 }
        );
      }
      if (!draft.snapshot_timestamp_utc) {
        return Response.json(
          {
            error: 'snapshot_timestamp_utc required for ERP_EXPORT',
            error_code: 'SNAPSHOT_TIMESTAMP_REQUIRED',
            correlation_id
          },
          { status: 422 }
        );
      }
    }

    // Compute envelope hash (binding + payload + files)
    const envelope = {
      binding_hash: draft.binding_hash_sha256,
      payload_hash: draft.payload_hash_sha256 || null,
      files_count: draft.files?.length || 0
    };

    const envelope_hash_sha256 = hashString(canonicalJson(envelope));

    const evidence = {
      evidence_id: uuidv4(),
      tenant_id: draft.tenant_id,
      draft_id: draft.draft_id,
      method: draft.method,
      binding: draft.binding,
      binding_hash_sha256: draft.binding_hash_sha256,
      payload: draft.payload,
      payload_hash_sha256: draft.payload_hash_sha256 || null,
      files: draft.files || [],
      envelope_hash_sha256,
      ledger_state: 'SEALED',
      sealed_at_utc: new Date().toISOString(),
      created_by_user_id: user.id,
      correlation_id_root: correlation_id
    };

    // In real system: persist evidence to Evidence entity
    // For now: return evidence object

    return Response.json(evidence, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: error.message,
        error_code: 'SEAL_FAILED',
        correlation_id
      },
      { status: 500 }
    );
  }
});
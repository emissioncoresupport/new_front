import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * GET /evidence/drafts/{draft_id}
 * Returns canonical state for UI Binding Context.
 */
Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        { error: 'Unauthorized', error_code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const draft_id = url.pathname.split('/').pop();

    if (!draft_id) {
      return Response.json(
        { error: 'draft_id required', error_code: 'DRAFT_ID_REQUIRED' },
        { status: 422 }
      );
    }

    // In real system: query draft by draft_id from database
    // For now: return placeholder indicating draft retrieval would happen here
    // In production, this would be:
    // const draft = await base44.entities.IngestDraft.get(draft_id);
    // if (!draft) return 404
    // if (draft.tenant_id !== getTenantFromUser(user)) return 403 FORBIDDEN

    return Response.json(
      {
        draft_id,
        message: 'Draft retrieval endpoint - would query database in production'
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        error: error.message,
        error_code: 'DRAFT_RETRIEVAL_FAILED'
      },
      { status: 500 }
    );
  }
});
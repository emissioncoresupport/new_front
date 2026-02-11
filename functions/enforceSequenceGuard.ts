import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized', status: 401 }, { status: 401 });
    }

    const body = await req.json();
    const { evidence_id, requested_action } = body;

    if (!evidence_id || !requested_action) {
      return Response.json(
        { error: 'Missing evidence_id or requested_action' },
        { status: 400 }
      );
    }

    // Fetch evidence
    const evidenceList = await base44.entities.Evidence.list();
    const evidence = (evidenceList || []).find(e => e.id === evidence_id);

    if (!evidence) {
      return Response.json(
        { error: 'Evidence not found', status: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Enforce canonical sequence
    let isAllowed = false;
    let reason = '';

    if (requested_action === 'CLASSIFY') {
      if (evidence.state === 'RAW') {
        isAllowed = true;
      } else {
        reason = `Classification requires RAW state, but evidence is in ${evidence.state} state`;
      }
    } else if (requested_action === 'STRUCTURE') {
      if (evidence.state === 'CLASSIFIED') {
        isAllowed = true;
      } else {
        reason = `Structuring requires CLASSIFIED state, but evidence is in ${evidence.state} state`;
      }
    } else {
      reason = `Unknown action: ${requested_action}`;
    }

    if (!isAllowed) {
      return Response.json({
        success: false,
        status: 'INVALID_SEQUENCE',
        message: reason,
        evidence_id,
        current_state: evidence.state,
        requested_action
      }, { status: 403 });
    }

    return Response.json({
      success: true,
      status: 'ALLOWED',
      evidence_id,
      current_state: evidence.state,
      requested_action
    });
  } catch (error) {
    console.error('enforceSequenceGuard error:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all evidence for user
    const allEvidence = await base44.entities.Evidence.list('-uploaded_at', 500);

    // Rule 1: Oldest RAW evidence
    const rawEvidence = allEvidence.find(e => e.state === 'RAW');
    if (rawEvidence) {
      return Response.json({
        success: true,
        action_type: 'CLASSIFY',
        evidence_id: rawEvidence.id,
        message: `Classify: ${rawEvidence.original_filename || 'Untitled evidence'}`
      });
    }

    // Rule 2: Oldest CLASSIFIED evidence
    const classifiedEvidence = allEvidence.find(e => e.state === 'CLASSIFIED');
    if (classifiedEvidence) {
      return Response.json({
        success: true,
        action_type: 'STRUCTURE',
        evidence_id: classifiedEvidence.id,
        message: `Add details to: ${classifiedEvidence.original_filename || 'Untitled evidence'}`
      });
    }

    // Rule 3: First STRUCTURED evidence with gaps
    const structuredWithGaps = allEvidence.find(
      e => e.state === 'STRUCTURED' && e.usability_status === 'NOT_USABLE'
    );
    if (structuredWithGaps) {
      return Response.json({
        success: true,
        action_type: 'UPLOAD',
        evidence_id: null,
        message: `Complete: ${structuredWithGaps.declared_entity_type || 'evidence'} requires additional data`
      });
    }

    // No blocking action
    return Response.json({
      success: true,
      action_type: null,
      evidence_id: null,
      message: null
    });
  } catch (error) {
    // Never throw - return safe default
    return Response.json({
      success: true,
      action_type: null,
      evidence_id: null,
      message: null,
      error_note: 'Unable to determine action (safe fallback)'
    });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role enforcement: only specific roles can approve structuring
    const allowedRoles = ['admin', 'legal', 'compliance', 'procurement', 'auditor'];
    if (!allowedRoles.includes(user.role)) {
      // Audit log unauthorized attempt
      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: user.email,
        actor_role: user.role,
        action: 'STRUCTURE_APPROVE_DENIED',
        entity_type: 'Evidence',
        reason: `Unauthorized role: ${user.role}`,
        timestamp: new Date().toISOString()
      });
      return Response.json({ 
        error: 'Forbidden: Only legal, compliance, procurement, auditor, or admin roles can approve structuring' 
      }, { status: 403 });
    }

    const { evidence_id, schema_type, extracted_fields, ai_suggestion } = await req.json();

    if (!evidence_id || !schema_type || !extracted_fields) {
      return Response.json({ 
        error: 'Missing required fields: evidence_id, schema_type, extracted_fields' 
      }, { status: 400 });
    }

    // Fetch evidence to validate state
    const evidenceList = await base44.asServiceRole.entities.Evidence.filter({ evidence_id });
    if (evidenceList.length === 0) {
      return Response.json({ error: 'Evidence not found' }, { status: 404 });
    }

    const evidence = evidenceList[0];

    // State machine enforcement: must be CLASSIFIED
    if (evidence.state !== 'CLASSIFIED') {
      return Response.json({ 
        error: `Invalid state: Evidence must be CLASSIFIED to structure. Current state: ${evidence.state}` 
      }, { status: 400 });
    }

    // Check if already structured
    const existingStructured = await base44.asServiceRole.entities.StructuredEvidence.filter({ 
      evidence_id,
      supersedes_record_id: null // Only check non-superseded records
    });
    if (existingStructured.length > 0) {
      return Response.json({ 
        error: 'Evidence already structured. To correct, create a new StructuredRecord with supersedes_record_id.' 
      }, { status: 400 });
    }

    const structured_record_id = `STRUCT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const approval_timestamp = new Date().toISOString();

    // Create StructuredEvidence record
    const structuredRecord = await base44.asServiceRole.entities.StructuredEvidence.create({
      tenant_id: user.id, // For multi-tenant
      evidence_id,
      structured_record_id,
      schema_type,
      schema_version: '1.0',
      extracted_fields,
      extraction_source: ai_suggestion ? 'ai_suggestion' : 'human',
      ai_confidence_score: ai_suggestion?.confidence_score || null,
      ai_extraction_model: ai_suggestion?.model || null,
      approver_id: user.email,
      approver_role: user.role,
      approval_timestamp,
      immutable: true
    });

    // Transition Evidence state: CLASSIFIED → STRUCTURED
    const before_state = evidence.state;
    const after_state = 'STRUCTURED';

    await base44.asServiceRole.entities.Evidence.update(evidence.id, {
      state: after_state,
      state_history: [
        ...(evidence.state_history || []),
        {
          from_state: before_state,
          to_state: after_state,
          transitioned_at: approval_timestamp,
          transitioned_by: user.email,
          reason: 'Human-approved structuring'
        }
      ]
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      actor_id: user.email,
      actor_role: user.role,
      action: 'STRUCTURE_APPROVE',
      entity_type: 'Evidence',
      entity_id: evidence_id,
      before_state,
      after_state,
      metadata: {
        structured_record_id,
        schema_type,
        extraction_source: structuredRecord.extraction_source
      },
      timestamp: approval_timestamp
    });

    return Response.json({
      success: true,
      structured_record_id,
      evidence_id,
      before_state,
      after_state,
      approver_id: user.email,
      approver_role: user.role,
      approval_timestamp
    });

  } catch (error) {
    console.error('Structure evidence error:', error);
    return Response.json({ 
      error: error.message || 'Failed to structure evidence' 
    }, { status: 500 });
  }
});
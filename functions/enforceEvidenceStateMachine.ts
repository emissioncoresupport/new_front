import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Evidence State Machine Enforcer
// Validates and logs all state transitions
// NO state change allowed without explicit reason and actor

const STATE_MACHINE = {
  transitions: {
    RAW: ['CLASSIFIED', 'REJECTED'],
    CLASSIFIED: ['STRUCTURED', 'REJECTED'],
    STRUCTURED: ['REJECTED'], // Cannot go back
    REJECTED: [] // Terminal state
  },
  
  validate(from_state, to_state) {
    const allowed = this.transitions[from_state] || [];
    return allowed.includes(to_state);
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidence_id, to_state, reason } = await req.json();

    if (!evidence_id || !to_state || !reason) {
      return Response.json({ 
        error: 'Missing required fields: evidence_id, to_state, reason' 
      }, { status: 400 });
    }

    // Fetch current evidence
    const evidence_list = await base44.entities.Evidence.filter({ evidence_id });
    if (evidence_list.length === 0) {
      return Response.json({ error: 'Evidence not found' }, { status: 404 });
    }

    const evidence = evidence_list[0];
    const from_state = evidence.state;

    // Validate transition
    if (!STATE_MACHINE.validate(from_state, to_state)) {
      const allowed = STATE_MACHINE.transitions[from_state] || [];
      
      // Log blocked transition attempt
      await base44.asServiceRole.entities.AuditLogEntry.create({
        tenant_id: evidence.tenant_id,
        resource_type: 'Evidence',
        resource_id: evidence_id,
        action: 'STATE_TRANSITION_BLOCKED',
        actor_email: user.email,
        actor_role: user.role,
        action_timestamp: new Date().toISOString(),
        details: `Illegal transition ${from_state} → ${to_state}. Allowed: ${allowed.join(', ')}`,
        status: 'FAILURE',
        error_message: 'State machine violation'
      });
      
      return Response.json({ 
        error: `Invalid state transition: ${from_state} → ${to_state}`,
        allowed_transitions: allowed,
        current_state: from_state
      }, { status: 400 });
    }

    // Build state history entry
    const state_history = evidence.state_history || [];
    state_history.push({
      from_state,
      to_state,
      transitioned_at: new Date().toISOString(),
      transitioned_by: user.email,
      reason
    });

    // Update evidence state
    await base44.asServiceRole.entities.Evidence.update(evidence.id, {
      state: to_state,
      state_history,
      ...(to_state === 'REJECTED' && { rejection_reason: reason })
    });

    // Log successful transition
    await base44.asServiceRole.entities.AuditLogEntry.create({
      tenant_id: evidence.tenant_id,
      resource_type: 'Evidence',
      resource_id: evidence_id,
      action: 'STATE_TRANSITION_APPROVED',
      actor_email: user.email,
      actor_role: user.role,
      action_timestamp: new Date().toISOString(),
      changes: {
        before: { state: from_state },
        after: { state: to_state }
      },
      details: reason,
      status: 'SUCCESS'
    });

    return Response.json({
      success: true,
      evidence_id,
      from_state,
      to_state,
      transitioned_at: new Date().toISOString(),
      state_history
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MAPPING GATE STATUS ENDPOINT (READ-ONLY)
 * 
 * Returns current readiness status for an entity.
 * Downstream modules use this to determine if entity is usable.
 * 
 * CONTRACT:
 * - GET /mapping-gate/{entity_id}/status
 * - Read-only (no mutations)
 * - Cached for 5 minutes
 * - Deterministic output
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id, frameworks = [] } = await req.json();

    if (!entity_type || !entity_id) {
      return Response.json({ 
        error: 'Missing required fields: entity_type, entity_id' 
      }, { status: 400 });
    }

    // Call readiness evaluator
    const evaluation = await base44.functions.invoke('evaluateMappingGateReadiness', {
      entity_type,
      entity_id,
      frameworks
    });

    if (evaluation.data.error) {
      return Response.json(evaluation.data, { status: evaluation.status || 500 });
    }

    // Return lightweight status object
    const status = {
      entity_id,
      entity_type,
      status: evaluation.data.status,
      completeness_score: evaluation.data.completeness_score,
      evaluated_at: evaluation.data.evaluated_at,
      rule_version: evaluation.data.rule_version,
      is_blocked: evaluation.data.status === 'BLOCKED',
      is_ready: evaluation.data.status === 'APPROVED',
      framework_readiness: evaluation.data.framework_readiness
    };

    return Response.json(status);

  } catch (error) {
    console.error('Get mapping gate status error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
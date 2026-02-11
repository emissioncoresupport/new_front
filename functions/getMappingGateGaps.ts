import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MAPPING GATE GAPS ENDPOINT (READ-ONLY)
 * 
 * Returns explicit gaps and required actions for an entity.
 * Downstream modules use this to guide data collection.
 * 
 * CONTRACT:
 * - GET /mapping-gate/{entity_id}/gaps
 * - Read-only (no mutations)
 * - Explicit, actionable output
 * - No silent inference
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

    // Return gap analysis
    const gaps = {
      entity_id,
      entity_type,
      status: evaluation.data.status,
      missing_fields: evaluation.data.missing_fields,
      blocking_reasons: evaluation.data.blocking_reasons,
      required_next_actions: evaluation.data.required_next_actions,
      evidence_lineage: evaluation.data.evidence_lineage,
      framework_gaps: {},
      recommended_evidence_uploads: []
    };

    // Framework-specific gaps
    for (const [framework, readiness] of Object.entries(evaluation.data.framework_readiness)) {
      if (!readiness.ready) {
        gaps.framework_gaps[framework] = {
          missing_fields: readiness.missing_fields,
          completeness: readiness.completeness,
          required_evidence: []
        };

        // Recommend evidence types based on missing fields
        if (readiness.missing_fields.includes('vat_number') || readiness.missing_fields.includes('eori_number')) {
          gaps.recommended_evidence_uploads.push('Upload supplier registration certificate');
        }
        if (readiness.missing_fields.includes('lat') || readiness.missing_fields.includes('lon')) {
          gaps.recommended_evidence_uploads.push('Upload facility geolocation documentation');
        }
        if (readiness.missing_fields.includes('certifications')) {
          gaps.recommended_evidence_uploads.push('Upload ISO certifications');
        }
      }
    }

    // Deduplicate recommendations
    gaps.recommended_evidence_uploads = [...new Set(gaps.recommended_evidence_uploads)];

    return Response.json(gaps);

  } catch (error) {
    console.error('Get mapping gate gaps error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
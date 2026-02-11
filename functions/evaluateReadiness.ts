import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * READINESS EVALUATION ENGINE — DETERMINISTIC, REGULATOR-GRADE
 * 
 * NO AI. NO SCORES. NO AGGREGATION WITHOUT PROOF.
 * 
 * Input: entity + framework + intended_use
 * Output: ReadinessResult + ReadinessGaps
 * 
 * Process:
 * 1. Create immutable ReadinessContext
 * 2. Load ACTIVE ingestion profiles only
 * 3. Load STRUCTURED Evidence only
 * 4. Apply rules sequentially
 * 5. Record PASS or GAP for each rule
 * 6. Return deterministic ReadinessResult
 * 
 * Fully replayable by regulators.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      tenant_id,
      entity_context_id,
      regulatory_framework,
      intended_use,
      actor_id,
      command_id,
      execution_mode, // REQUIRED, NO DEFAULT
      invocation_context // CANONICAL INVOCATION CONTRACT
    } = await req.json();

    // VALIDATION
    if (!tenant_id || !entity_context_id || !regulatory_framework || !intended_use || !command_id) {
      return Response.json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // INVOCATION_CONTEXT VALIDATION (if provided)
    if (invocation_context) {
      if (invocation_context.tenant_id !== tenant_id) {
        return Response.json({
          success: false,
          error: 'CONTEXT_TENANT_MISMATCH',
          message: 'InvocationContext tenant_id does not match request'
        }, { status: 400 });
      }
    }

    // EXECUTION_MODE ENFORCEMENT: REQUIRED, NO DEFAULT
    if (!execution_mode || !['PROD', 'TEST', 'HOSTILE'].includes(execution_mode)) {
      return Response.json({
        success: false,
        error: 'MISSING_EXECUTION_MODE',
        message: 'execution_mode is REQUIRED and must be "PROD", "TEST", or "HOSTILE"',
        provided: execution_mode
      }, { status: 400 });
    }

    console.log(`[EVALUATE READINESS] tenant=${tenant_id}, entity=${entity_context_id}, framework=${regulatory_framework}, execution_mode=${execution_mode}, context=${invocation_context ? 'PROVIDED' : 'MISSING'}`);

    // IDEMPOTENCY CHECK
    const existingContext = await base44.asServiceRole.entities.ReadinessContext.filter({
      command_id,
      tenant_id
    });

    if (existingContext.length > 0) {
      const existingResult = await base44.asServiceRole.entities.ReadinessResult.filter({
        context_id: existingContext[0].context_id
      });
      return Response.json({
        success: true,
        idempotent: true,
        result: existingResult[0]
      });
    }

    // RESOLVE ENTITY via canonical resolver (SERVICE ROLE: SYSTEM_READINESS)
    const entityResolution = await base44.asServiceRole.functions.invoke('getEntityContext', {
      tenant_id,
      entity_context_id,
      caller_context: 'READINESS',
      execution_mode,
      invocation_context
    });

    if (!entityResolution.data.success) {
      console.error('[EVALUATE READINESS] Entity resolution failed:', entityResolution.data);
      return Response.json({
        success: false,
        error: entityResolution.data.error,
        message: entityResolution.data.message
      }, { status: entityResolution.status || 404 });
    }

    const entity = entityResolution.data.entity;
    const entityType = entityResolution.data.entity_type;

    // CREATE IMMUTABLE READINESS CONTEXT
    const context = await base44.asServiceRole.entities.ReadinessContext.create({
      context_id: `CTX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id,
      entity_context_id,
      entity_type: entityType,
      regulatory_framework,
      intended_use,
      profile_ids_used: [],
      schema_version: '1.0',
      evaluation_timestamp: new Date().toISOString(),
      actor_id: actor_id || user.email,
      command_id,
      immutable: true
    });

    // LOAD ACTIVE INGESTION PROFILES FOR THIS ENTITY (tenant-scoped)
    const profiles = await base44.asServiceRole.entities.IngestionProfile.filter({
      entity_id: entity_context_id,
      tenant_id,
      status: 'ACTIVE'
    });

    // LOAD STRUCTURED EVIDENCE ONLY (tenant-scoped)
    const structuredEvidence = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id,
      contract_id: { $in: profiles.map(p => p.profile_id) },
      state: 'STRUCTURED'
    });

    // LOAD RULES FOR FRAMEWORK (no tenant scoping — rules are global/immutable)
    const rules = await base44.asServiceRole.entities.ReadinessRule.filter({
      framework: regulatory_framework,
      active: true
    }, null, 100);

    // APPLY RULES SEQUENTIALLY (NO SHORT-CIRCUITING)
    const gaps = [];
    const rulesApplied = [];
    let blockingGapsFound = false;
    let limitingGapsFound = false;

    for (const rule of rules) {
      // Check if rule applies to intended use
      if (rule.intended_use !== 'ALL' && rule.intended_use !== intended_use) {
        continue;
      }

      let rulePass = false;

      // Check if required evidence exists
      const hasRequiredEvidence = structuredEvidence.some(ev => 
        rule.required_evidence_types.includes(ev.declared_evidence_type) &&
        rule.required_authority_types.includes(ev.declared_context?.source_role)
      );

      // Check if required fields exist in structured payload
      let hasRequiredFields = true;
      if (hasRequiredEvidence) {
        for (const field of rule.required_fields) {
          const fieldExists = structuredEvidence.some(ev => 
            ev.structured_payload && 
            field.split('.').reduce((obj, key) => obj?.[key], ev.structured_payload) !== undefined
          );
          if (!fieldExists) {
            hasRequiredFields = false;
            break;
          }
        }
      }

      rulePass = hasRequiredEvidence && hasRequiredFields;

      // RECORD RULE APPLICATION
      rulesApplied.push({
        rule_id: rule.rule_id,
        rule_version: rule.version,
        result: rulePass ? 'PASS' : 'GAP',
        blocking: rule.blocking
      });

      // IF FAILED, CREATE GAP
      if (!rulePass && rule.mandatory) {
        const gap = await base44.asServiceRole.entities.ReadinessGap.create({
          gap_id: `GAP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          result_id: '', // Will be filled after result creation
          tenant_id,
          rule_id: rule.rule_id,
          description: rule.description,
          missing_evidence_type: rule.required_evidence_types[0] || 'OTHER',
          missing_field: rule.required_fields[0] || 'unspecified',
          blocking: rule.blocking,
          legal_reference: rule.legal_reference,
          remediation_hint: rule.remediation_text,
          evidence_to_provide: `Provide evidence of type: ${rule.required_evidence_types.join(', ')}`,
          created_at: new Date().toISOString(),
          immutable: true
        });

        gaps.push(gap);

        if (rule.blocking) {
          blockingGapsFound = true;
        } else {
          limitingGapsFound = true;
        }
      }
    }

    // DETERMINE STATUS
    let status = 'READY';
    if (blockingGapsFound) {
      status = 'BLOCKED';
    } else if (limitingGapsFound) {
      status = 'PROVISIONAL';
    }

    // COMPUTE EVALUATION HASH
    const evaluationString = JSON.stringify({
      context_id: context.context_id,
      rules_applied: rulesApplied,
      evidence_hashes: structuredEvidence.map(e => e.file_hash_sha256 || e.declaration_hash_sha256).sort()
    });
    const encoder = new TextEncoder();
    const data = encoder.encode(evaluationString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const evaluation_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // CREATE IMMUTABLE READINESS RESULT
    const result = await base44.asServiceRole.entities.ReadinessResult.create({
      result_id: `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      context_id: context.context_id,
      tenant_id,
      entity_context_id,
      regulatory_framework,
      intended_use,
      status,
      blocking_gaps: gaps.filter(g => g.blocking).map(g => g.gap_id),
      limiting_gaps: gaps.filter(g => !g.blocking).map(g => g.gap_id),
      evidence_used: structuredEvidence.map(e => ({
        evidence_id: e.evidence_id,
        ingestion_path: e.ingestion_path,
        authority_type: e.declared_context?.source_role,
        hash: e.file_hash_sha256 || e.declaration_hash_sha256
      })),
      rules_applied: rulesApplied,
      evaluation_hash,
      evaluation_timestamp: new Date().toISOString(),
      immutable: true
    });

    // UPDATE GAPS WITH RESULT ID
    for (const gap of gaps) {
      gap.result_id = result.result_id;
      await base44.asServiceRole.entities.ReadinessGap.update(gap.id, {
        result_id: result.result_id
      });
    }

    return Response.json({
      success: true,
      result_id: result.result_id,
      context_id: context.context_id,
      status,
      entity_context_id,
      regulatory_framework,
      intended_use,
      blocking_gaps: gaps.filter(g => g.blocking).length,
      limiting_gaps: gaps.filter(g => !g.blocking).length,
      evidence_used: structuredEvidence.length,
      rules_applied: rulesApplied.length,
      rules_passed: rulesApplied.filter(r => r.result === 'PASS').length,
      rules_failed: rulesApplied.filter(r => r.result === 'GAP').length,
      evaluation_hash,
      message: `Readiness evaluated: ${status}`,
      gaps: gaps.map(g => ({
        gap_id: g.gap_id,
        description: g.description,
        blocking: g.blocking,
        remediation_hint: g.remediation_hint,
        legal_reference: g.legal_reference
      }))
    });

  } catch (error) {
    console.error('Readiness Evaluation Error:', error);
    return Response.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    }, { status: 500 });
  }
});
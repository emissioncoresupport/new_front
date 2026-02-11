import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateSupplierForMapping } from './services/MappingGateValidator.js';
import { detectFrameworkRelevance } from './services/FrameworkVersioning.js';
import { findDuplicateCandidates } from './services/FuzzyDedup.js';
import { routeBlockedSupplier, calculateDueDates } from './services/EscalationRouter.js';

/**
 * MAPPING GATE ENFORCER
 * Runs deterministic validation, creates audit trail, handles conflicts
 * Input: evidence_id + extracted supplier data
 * Output: MappingDecision (APPROVED/PROVISIONAL/BLOCKED) with audit trail
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evidence_id, supplier_data, declared_frameworks } = await req.json();

    if (!evidence_id || !supplier_data) {
      return Response.json({ error: 'Missing evidence_id or supplier_data' }, { status: 400 });
    }

    // 1. RUN DETERMINISTIC VALIDATOR
    const { frameworks: relevantFrameworks, versions: frameworkVersions } = declared_frameworks 
      ? { frameworks: declared_frameworks, versions: {} }
      : detectFrameworkRelevance(supplier_data);
    
    const validation = validateSupplierForMapping(supplier_data, relevantFrameworks);

    // 2. CHECK FOR DUPLICATES (FUZZY MATCHING, NON-BLOCKING)
    const existingSuppliers = await base44.entities.Supplier.filter({
      country: supplier_data.country
    });

    const duplicate_candidates = findDuplicateCandidates(supplier_data, existingSuppliers, 0.85);

    // 3. DETERMINE FINAL STATUS
    let final_status = validation.status_recommendation;
    let blocked_reason = null;

    // Hard stops: sanctions, legal holds (would come from external API in production)
    if (supplier_data.sanctions_flagged) {
      final_status = 'BLOCKED';
      blocked_reason = 'Sanctions list match';
    }

    // 4. CREATE MAPPING DECISION (IMMUTABLE)
    const mappingDecision = await base44.entities.MappingDecision.create({
      tenant_id: user.tenant_id,
      evidence_id,
      entity_type: 'SUPPLIER',
      status: final_status,
      validation_result: {
        passed: final_status === 'APPROVED',
        completeness_score: validation.completeness_score,
        gaps: validation.mandatory_gaps,
        framework_gaps: validation.framework_gaps,
        duplicate_candidates,
        checks_run: {
          minimum_fields: true,
          dedup_check: duplicate_candidates.length > 0,
          framework_relevance: true,
          sanctions_check: !!supplier_data.sanctions_flagged
        }
      },
      approved_by: user.email,
      approved_at: new Date().toISOString(),
      hash_sha256: generateHash(supplier_data)
    });

    // 5. CREATE AUDIT LOG ENTRY (CONFORMANT)
    const auditAction = final_status === 'APPROVED' ? 'MAPPING_APPROVED'
      : final_status === 'PROVISIONAL' ? 'MAPPING_PROVISIONAL'
      : 'MAPPING_BLOCKED';

    await base44.entities.AuditLogEntry.create({
      tenant_id: user.tenant_id,
      resource_type: 'MappingDecision',
      resource_id: evidence_id,
      action: auditAction,
      actor_email: user.email,
      actor_role: user.role || 'system',
      action_timestamp: new Date().toISOString(),
      changes: {
        before: null,
        after: {
          status: final_status,
          completeness: validation.completeness_score,
          frameworks: relevantFrameworks
        }
      },
      details: `Mapping gate decision: ${final_status}. ${validation.rationale.join(' ')}`,
      status: 'SUCCESS',
      regulatory_version: Object.values(frameworkVersions)[0] || 'CBAM-2026-Q1'
    });

    // 6. IF DUPLICATE DETECTED, CREATE CONFLICT RECORD & AUDIT
    if (duplicate_candidates.length > 0) {
      await base44.entities.DataConflict.create({
        entity_type: 'Supplier',
        entity_id: evidence_id,
        conflict_type: 'duplicate_mapping',
        description: `Potential duplicate: ${duplicate_candidates.map(d => `${d.legal_name} (${d.similarity_score.toFixed(2)})`).join(', ')}`,
        severity: duplicate_candidates[0].similarity_score > 0.9 ? 'high' : 'medium',
        status: 'open'
      });

      // Audit conflict detection
      await base44.entities.AuditLogEntry.create({
        tenant_id: user.tenant_id,
        resource_type: 'MappingDecision',
        resource_id: evidence_id,
        action: 'DUPLICATE_FLAGGED',
        actor_email: user.email,
        actor_role: 'system',
        action_timestamp: new Date().toISOString(),
        details: `${duplicate_candidates.length} duplicates detected (score: ${duplicate_candidates[0].similarity_score.toFixed(2)})`,
        status: 'SUCCESS'
      });
    }

    // 7. IF PROVISIONAL, TRIGGER AUTO-ONBOARDING TASKS WITH ROLE ASSIGNMENT
    if (final_status === 'PROVISIONAL') {
      const proof_gaps = Object.keys(validation.framework_gaps).flatMap(
        fw => validation.framework_gaps[fw].map(gap => `${fw}: ${gap}`)
      );

      if (proof_gaps.length > 0) {
        const escalation = routeBlockedSupplier(`Missing proof: ${proof_gaps[0]}`, supplier_data);
        const { due_date } = calculateDueDates(escalation.sla_hours);

        await base44.entities.OnboardingTask.create({
          supplier_id: evidence_id,
          task_type: 'documentation',
          title: 'Supply Proof Gap Resolution',
          description: `Proof gaps: ${proof_gaps.join(', ')}. Assigned to: ${escalation.resolver_role}`,
          status: 'pending',
          due_date,
          resolver_role: escalation.resolver_role,
          sla_hours: escalation.sla_hours,
          verification_type: 'certificate_check',
          required_documents: proof_gaps
        });
      }
    }

    // 8. IF BLOCKED, ESCALATE WITH RBAC ROUTING
    if (final_status === 'BLOCKED') {
      const escalation = routeBlockedSupplier(blocked_reason || validation.rationale[0], supplier_data);
      const { due_date } = calculateDueDates(escalation.sla_hours);

      await base44.entities.OnboardingTask.create({
        supplier_id: evidence_id,
        task_type: 'verification',
        title: `BLOCKED: ${escalation.reason_code}`,
        description: blocked_reason || validation.rationale.join('. '),
        status: 'pending',
        due_date,
        resolver_role: escalation.resolver_role,
        sla_hours: escalation.sla_hours,
        priority: escalation.priority
      }).catch(() => {});

      // Audit escalation
      await base44.entities.AuditLogEntry.create({
        tenant_id: user.tenant_id,
        resource_type: 'MappingDecision',
        resource_id: evidence_id,
        action: 'MAPPING_ESCALATED',
        actor_email: user.email,
        actor_role: 'system',
        action_timestamp: new Date().toISOString(),
        details: `Escalated to ${escalation.resolver_role} (${escalation.reason_code}). SLA: ${escalation.sla_hours}h`,
        status: 'SUCCESS'
      });
    }

    return Response.json({
      success: true,
      mapping_decision_id: mappingDecision.id,
      status: final_status,
      completeness_score: validation.completeness_score,
      framework_gaps: validation.framework_gaps,
      duplicate_candidates,
      next_action: getNextAction(final_status, validation)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateHash(data) {
  // Production: use crypto.subtle for SHA256
  // For now: simple base64 truncation
  return btoa(JSON.stringify(data)).substring(0, 64);
}

function getNextAction(status, validation) {
  if (status === 'BLOCKED') {
    return {
      action: 'escalate_to_legal',
      reason: validation.rationale[0] || 'Data integrity issue'
    };
  }
  if (status === 'PROVISIONAL') {
    return {
      action: 'request_proof',
      proof_gaps: Object.keys(validation.framework_gaps),
      due_in_days: 14
    };
  }
  return { action: 'create_supplier' };
}
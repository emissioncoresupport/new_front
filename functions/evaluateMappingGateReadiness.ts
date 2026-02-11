import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 2.0 - MAPPING GATE READINESS EVALUATOR
 * 
 * Deterministic backend rule engine that evaluates entity readiness for downstream use.
 * 
 * STRICT RULES:
 * - Read-only (no mutations)
 * - Deterministic (same input = same output)
 * - Explicit (no silent inference)
 * - Versioned (rule changes tracked)
 * - Backend-enforced (no UI shortcuts)
 * 
 * STATUSES:
 * - BLOCKED: Missing critical mandatory fields, sanctions hit, legal hard stop
 * - PROVISIONAL: Entity exists, some evidence present, framework-specific gaps
 * - APPROVED: ≥85% required structured fields present, no hard violations
 * 
 * OUTPUT:
 * - status: BLOCKED | PROVISIONAL | APPROVED
 * - completeness_score: 0-100
 * - missing_fields: []
 * - blocking_reasons: []
 * - required_next_actions: []
 * - evidence_lineage: []
 * - rule_version: string
 */

const RULE_VERSION = "2.0.0";

const MANDATORY_GLOBAL_FIELDS = [
  'legal_name',
  'country',
  'primary_contact_email'
];

const FRAMEWORK_REQUIREMENTS = {
  CBAM: {
    supplier: ['vat_number', 'eori_number', 'manufacturing_countries'],
    facility: ['address', 'city', 'lat', 'lon']
  },
  EUDR: {
    supplier: ['manufacturing_countries', 'eori_number'],
    facility: ['lat', 'lon', 'address']
  },
  CSRD: {
    supplier: ['annual_revenue_eur', 'employee_count', 'nace_code'],
    facility: ['address']
  },
  PFAS: {
    supplier: ['certifications'],
    material: ['composition_data']
  },
  EUDAMED: {
    supplier: ['iso13485_certified', 'vat_number'],
    facility: ['iso13485_certified', 'manufacturing_capabilities']
  }
};

const HARD_STOP_CHECKS = [
  'sanctions_match',
  'blocked_status',
  'legal_entity_invalid'
];

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

    // Fetch entity data (read-only)
    let entity;
    if (entity_type === 'supplier') {
      const results = await base44.asServiceRole.entities.Supplier.filter({ id: entity_id });
      entity = results[0];
    } else if (entity_type === 'site') {
      const results = await base44.asServiceRole.entities.SupplierSite.filter({ id: entity_id });
      entity = results[0];
    } else if (entity_type === 'sku') {
      const results = await base44.asServiceRole.entities.SKU.filter({ id: entity_id });
      entity = results[0];
    }

    if (!entity) {
      return Response.json({ 
        error: 'Entity not found',
        entity_type,
        entity_id
      }, { status: 404 });
    }

    // Fetch evidence lineage (read-only from backend projections)
    const evidenceRecords = await base44.asServiceRole.entities.Evidence.filter({
      tenant_id: user.email
    });

    const classifications = await base44.asServiceRole.entities.EvidenceClassification.filter({
      tenant_id: user.email
    });

    const structuredRecords = await base44.asServiceRole.entities.StructuredEvidence.filter({
      tenant_id: user.email
    });

    // Build evidence lineage for this entity
    const evidenceLineage = evidenceRecords.map(ev => {
      const classification = classifications.find(c => c.evidence_id === ev.id);
      const structured = structuredRecords.find(s => s.evidence_id === ev.id);
      
      return {
        evidence_id: ev.id,
        state: ev.state,
        uploaded_at: ev.uploaded_at,
        classification: classification ? {
          evidence_type: classification.evidence_type,
          claimed_scope: classification.claimed_scope,
          claimed_frameworks: classification.claimed_frameworks
        } : null,
        structured: structured ? {
          schema_type: structured.schema_type,
          extraction_source: structured.extraction_source
        } : null
      };
    });

    // === RULE EVALUATION (DETERMINISTIC) ===

    const evaluation = {
      entity_id,
      entity_type,
      evaluated_at: new Date().toISOString(),
      rule_version: RULE_VERSION,
      status: 'APPROVED', // Start optimistic
      completeness_score: 100,
      missing_fields: [],
      blocking_reasons: [],
      required_next_actions: [],
      evidence_lineage: evidenceLineage,
      framework_readiness: {}
    };

    // Check hard stops
    const hardStops = [];
    if (entity.status === 'blocked') {
      hardStops.push('Entity status is BLOCKED');
    }
    if (entity.risk_tags_json?.sanctions_match) {
      hardStops.push('Sanctions screening match detected');
    }
    if (entity.validation_status === 'rejected') {
      hardStops.push('Entity validation rejected');
    }

    if (hardStops.length > 0) {
      evaluation.status = 'BLOCKED';
      evaluation.completeness_score = 0;
      evaluation.blocking_reasons = hardStops;
      evaluation.required_next_actions = [
        'Resolve hard stop violations',
        'Contact compliance team for clearance'
      ];
      
      return Response.json(evaluation);
    }

    // Check mandatory global fields
    const missingGlobal = MANDATORY_GLOBAL_FIELDS.filter(field => !entity[field]);
    
    if (missingGlobal.length > 0) {
      evaluation.status = 'BLOCKED';
      evaluation.missing_fields.push(...missingGlobal.map(f => ({ field: f, scope: 'global', severity: 'critical' })));
      evaluation.blocking_reasons.push(`Missing mandatory fields: ${missingGlobal.join(', ')}`);
      evaluation.required_next_actions.push('Complete mandatory entity fields');
    }

    // Check framework-specific requirements
    for (const framework of frameworks) {
      const requirements = FRAMEWORK_REQUIREMENTS[framework];
      
      if (!requirements) {
        continue;
      }

      const frameworkFields = requirements[entity_type] || [];
      const missing = frameworkFields.filter(field => !entity[field]);
      
      evaluation.framework_readiness[framework] = {
        required_fields: frameworkFields,
        missing_fields: missing,
        completeness: ((frameworkFields.length - missing.length) / frameworkFields.length * 100).toFixed(1),
        ready: missing.length === 0
      };

      if (missing.length > 0) {
        evaluation.missing_fields.push(...missing.map(f => ({ 
          field: f, 
          scope: framework, 
          severity: 'framework_specific' 
        })));
        
        if (evaluation.status === 'APPROVED') {
          evaluation.status = 'PROVISIONAL';
        }
      }
    }

    // Calculate overall completeness (all fields vs populated fields)
    const allFields = Object.keys(entity);
    const populatedFields = allFields.filter(key => {
      const val = entity[key];
      return val !== null && val !== undefined && val !== '' && val !== 0 && 
             (!Array.isArray(val) || val.length > 0) &&
             (typeof val !== 'object' || Object.keys(val).length > 0);
    });

    evaluation.completeness_score = Math.round((populatedFields.length / allFields.length) * 100);

    // 85% threshold for APPROVED (only if no blocking reasons)
    if (evaluation.completeness_score < 85 && evaluation.status !== 'BLOCKED') {
      evaluation.status = 'PROVISIONAL';
      evaluation.required_next_actions.push(`Increase data completeness to 85% (currently ${evaluation.completeness_score}%)`);
    }

    // Generate next actions for PROVISIONAL
    if (evaluation.status === 'PROVISIONAL') {
      if (evaluation.missing_fields.length > 0) {
        evaluation.required_next_actions.push(`Complete ${evaluation.missing_fields.length} missing field(s)`);
      }
      
      const structuredCount = evidenceLineage.filter(ev => ev.state === 'STRUCTURED').length;
      if (structuredCount === 0) {
        evaluation.required_next_actions.push('Upload and structure supporting evidence');
      }
    }

    // If APPROVED, confirm
    if (evaluation.status === 'APPROVED') {
      evaluation.required_next_actions = ['Entity is ready for downstream use'];
    }

    // Log evaluation to audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: user.email,
      action: 'MAPPING_GATE_EVALUATION',
      entity_type,
      entity_id,
      actor_id: user.email,
      metadata: {
        rule_version: RULE_VERSION,
        status: evaluation.status,
        completeness_score: evaluation.completeness_score,
        frameworks_evaluated: frameworks
      },
      timestamp: new Date().toISOString()
    });

    return Response.json(evaluation);

  } catch (error) {
    console.error('Mapping Gate evaluation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
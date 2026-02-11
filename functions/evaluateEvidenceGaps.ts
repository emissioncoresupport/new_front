import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Required fields per entity type for USABLE evidence
const USABILITY_RULES = {
  'SUPPLIER': {
    required: ['name', 'country'],
    additional_evidence: ['CERTIFICATE', 'AUDIT_REPORT']
  },
  'SITE': {
    required: ['name', 'country'],
    additional_evidence: ['CERTIFICATE', 'AUDIT_REPORT']
  },
  'SKU': {
    required: ['name'],
    additional_evidence: ['TEST_REPORT']
  },
  'MATERIAL': {
    required: ['name'],
    additional_evidence: ['CERTIFICATE', 'TEST_REPORT']
  },
  'UNDECLARED': {
    required: [],
    additional_evidence: []
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { evidence_list } = body;

    if (!evidence_list || !Array.isArray(evidence_list)) {
      return Response.json({ error: 'Missing evidence_list' }, { status: 400 });
    }

    const gaps = [];

    for (const evidence of evidence_list) {
      if (evidence.state !== 'STRUCTURED') {
        continue; // Skip non-structured evidence
      }

      const entityType = evidence.declared_entity_type;
      const rules = USABILITY_RULES[entityType] || USABILITY_RULES['UNDECLARED'];
      const structured = evidence.structured_payload || {};

      // Check required fields
      const missingFields = rules.required.filter(field => !structured[field]?.trim?.());

      // Determine usability status
      let usabilityStatus = 'USABLE';
      let blocking = false;

      if (missingFields.length > 0) {
        usabilityStatus = 'NOT_USABLE';
        blocking = true;
      } else if (entityType === 'UNDECLARED') {
        usabilityStatus = 'PARTIALLY_USABLE';
      }

      // Check what additional evidence is needed
      const allEvidenceByType = evidence_list.filter(
        e => e.declared_entity_type === entityType && e.state === 'STRUCTURED'
      );

      const collectedEvidenceTypes = new Set(
        allEvidenceByType.map(e => e.declared_evidence_type)
      );

      const missingEvidenceTypes = rules.additional_evidence.filter(
        type => !collectedEvidenceTypes.has(type)
      );

      // Update evidence usability status
      await base44.entities.Evidence.update(evidence.id, {
        usability_status: usabilityStatus
      });

      // Record gap evaluation
      const gap = {
        evidence_id: evidence.id,
        entity_type: entityType,
        missing_fields: missingFields,
        missing_evidence_types: missingEvidenceTypes,
        blocking: blocking,
        usability_status: usabilityStatus
      };

      gaps.push(gap);

      // Log gap evaluation
      await base44.entities.AuditLogEntry.create({
        tenant_id: user.id,
        resource_type: 'Evidence',
        resource_id: evidence.id,
        action: 'GAP_EVALUATED',
        actor_email: 'SYSTEM',
        action_timestamp: new Date().toISOString(),
        changes: {
          before: { usability_status: 'UNKNOWN' },
          after: { usability_status: usabilityStatus, gaps: gap }
        },
        details: `Gap evaluation: ${usabilityStatus}${blocking ? ' (BLOCKING)' : ''}. Missing fields: ${missingFields.join(', ') || 'none'}. Missing evidence: ${missingEvidenceTypes.join(', ') || 'none'}`,
        status: 'SUCCESS'
      });
    }

    // Find the highest-priority gap (blocking > missing fields > missing evidence)
    const blockingGap = gaps.find(g => g.blocking);
    const nextGap = blockingGap || gaps.find(g => g.missing_evidence_types?.length > 0) || gaps[0];

    return Response.json({
      success: true,
      gaps,
      next_gap: nextGap,
      has_blocking: gaps.some(g => g.blocking)
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
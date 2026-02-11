import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AUTO-ROUTING ORCHESTRATOR
 * Triggered by mappingGateEnforcer decision
 * Routes PROVISIONAL → OnboardingTask creation
 * Routes BLOCKED → escalation queue
 * Routes APPROVED → supplier entity creation
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mapping_decision_id } = await req.json();

    if (!mapping_decision_id) {
      return Response.json({ error: 'Missing mapping_decision_id' }, { status: 400 });
    }

    // Fetch the mapping decision
    const mappingDecision = await base44.entities.MappingDecision.get(mapping_decision_id);

    if (!mappingDecision) {
      return Response.json({ error: 'Mapping decision not found' }, { status: 404 });
    }

    const routing = {
      decision_id: mapping_decision_id,
      status: mappingDecision.status,
      actions: []
    };

    // ROUTE 1: BLOCKED
    if (mappingDecision.status === 'BLOCKED') {
      routing.actions.push({
        type: 'escalate',
        target: 'legal_review_queue',
        reason: 'Sanctions match or critical data gaps',
        escalated_at: new Date().toISOString()
      });
      // In production: trigger notification, add to legal dashboard queue
    }

    // ROUTE 2: PROVISIONAL
    if (mappingDecision.status === 'PROVISIONAL') {
      const framework_gaps = mappingDecision.validation_result?.framework_gaps || {};
      const tasks_created = [];

      // Auto-create OnboardingTasks per proof gap
      for (const [framework, gaps] of Object.entries(framework_gaps)) {
        const task = await base44.entities.OnboardingTask.create({
          supplier_id: mappingDecision.entity_id, // will link to supplier_id once created
          task_type: 'verification',
          title: `${framework} Compliance Data Request`,
          description: `Missing: ${gaps.join(', ')}`,
          status: 'pending',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          verification_type: getVerificationType(framework, gaps),
          triggered_by_task_id: mapping_decision_id,
          related_entity_id: mapping_decision.evidence_id,
          related_entity_type: 'evidence'
        });

        tasks_created.push({
          task_id: task.id,
          framework,
          gaps
        });
      }

      routing.actions.push({
        type: 'create_onboarding_tasks',
        count: tasks_created.length,
        tasks: tasks_created,
        next_action: 'Supplier questionnaire + document request'
      });
    }

    // ROUTE 3: APPROVED
    if (mappingDecision.status === 'APPROVED') {
      routing.actions.push({
        type: 'create_supplier',
        message: 'Supplier entity ready for creation',
        next_step: 'Link to evidence and activate framework modules'
      });
    }

    // Log routing decision
    await base44.entities.AuditLogEntry.create({
      tenant_id: user.tenant_id,
      resource_type: 'MappingDecision',
      resource_id: mapping_decision_id,
      action: 'MAPPING_ROUTED',
      actor_email: user.email,
      action_timestamp: new Date().toISOString(),
      changes: { routing_path: mappingDecision.status },
      details: `Routed to: ${routing.actions.map(a => a.type).join(', ')}`,
      status: 'SUCCESS'
    });

    return Response.json({
      success: true,
      routing
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getVerificationType(framework, gaps) {
  const typeMap = {
    CBAM: 'certificate_check',
    CSRD: 'questionnaire',
    EUDR: 'deforestation_satellite',
    PFAS: 'lab_test',
    PPWR: 'certificate_check'
  };
  return typeMap[framework] || 'documentation';
}
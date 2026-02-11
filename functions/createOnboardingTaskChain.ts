import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { supplier_id, frameworks, risk_checks, evidence_id } = await req.json();
    if (!supplier_id) return Response.json({ error: 'Missing supplier_id' }, { status: 400 });

    const tenantId = user.company_id || 'default';
    const tasks = [];

    // Framework-triggered questionnaires
    const questionnaire_map = {
      cbam: 'CBAM Emissions Data',
      eudr: 'EUDR Deforestation Declaration',
      pfas: 'PFAS Substance Declaration',
      ppwr: 'PPWR Packaging Declaration',
      csrd: 'CSRD ESG Questionnaire',
      eudamed: 'EUDAMED Device Classification'
    };

    // Create framework questionnaire tasks
    if (frameworks && frameworks.length > 0) {
      for (const framework of frameworks) {
        tasks.push({
          supplier_id,
          tenant_id: tenantId,
          task_type: 'questionnaire',
          title: `${questionnaire_map[framework] || framework} Required`,
          description: `Complete questionnaire for ${framework.toUpperCase()} compliance. Due within 14 days.`,
          questionnaire_type: framework,
          status: 'pending',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          triggered_by_evidence: evidence_id
        });
      }
    }

    // Risk-triggered verification tasks
    if (risk_checks) {
      if (risk_checks.conflict_minerals?.risk === 'high') {
        tasks.push({
          supplier_id,
          tenant_id: tenantId,
          task_type: 'verification',
          title: 'Conflict Minerals Verification',
          description: 'Supplier must provide conflict minerals declaration and CMRT completion evidence.',
          verification_type: 'conflict_minerals',
          status: 'pending',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
      if (risk_checks.deforestation_risk?.risk === 'high') {
        tasks.push({
          supplier_id,
          tenant_id: tenantId,
          task_type: 'verification',
          title: 'Deforestation Risk Assessment',
          description: 'Satellite-based deforestation analysis and compliance documentation required.',
          verification_type: 'deforestation_satellite',
          status: 'pending',
          due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
      if (risk_checks.labor_risk?.risk === 'high') {
        tasks.push({
          supplier_id,
          tenant_id: tenantId,
          task_type: 'questionnaire',
          title: 'CSDDD Human Rights Due Diligence',
          description: 'Mandatory due diligence questionnaire for high-risk labor jurisdictions.',
          questionnaire_type: 'human_rights',
          status: 'pending',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
    }

    // Always create audit task
    tasks.push({
      supplier_id,
      tenant_id: tenantId,
      task_type: 'database_check',
      title: 'Initial Supplier Data Audit',
      description: 'System validation of supplier record completeness and data quality.',
      status: 'completed',
      related_entity_type: 'evidence',
      related_entity_id: evidence_id
    });

    // Bulk create tasks
    const created = await base44.asServiceRole.entities.OnboardingTask.bulkCreate(tasks);

    return Response.json({
      success: true,
      tasks_created: created.length,
      task_chain: created.map(t => ({ id: t.id, title: t.title, due_date: t.due_date })),
      next_steps: `${created.length} onboarding tasks queued. Supplier will receive notifications.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
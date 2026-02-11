import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all data in one call
    const [evidence, mappings, suppliers, auditLogs, riskAlerts] = await Promise.all([
      base44.entities.Evidence.list('', 1000),
      base44.entities.MappingDecision.list('', 1000),
      base44.entities.Supplier.list('', 1000),
      base44.entities.AuditLogEntry.list('-action_timestamp', 100),
      base44.entities.RiskAlert.filter({ status: 'open' })
    ]);

    // Pipeline: count by evidence state
    const pipeline = {
      ingestion: evidence.filter(e => e.state === 'RAW').length,
      classification: evidence.filter(e => e.state === 'CLASSIFIED').length,
      mapping_gate: evidence.filter(e => e.state === 'STRUCTURED').length,
      decision: mappings.filter(m => m.status === 'APPROVED').length
    };

    // Risk portfolio: matrix of risk × regulation
    const portfolio = {};
    ['critical', 'high', 'medium', 'low'].forEach(risk => {
      ['cbam', 'csrd', 'eudr', 'pfas'].forEach(reg => {
        const key = `${risk}_${reg}`;
        portfolio[key] = suppliers.filter(s => 
          s.risk_level === risk && s[`${reg}_relevant`] === true
        ).length;
      });
    });

    // Velocity: last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentDecisions = mappings.filter(m => m.approved_at >= sevenDaysAgo);
    let totalHours = 0;
    recentDecisions.forEach(d => {
      const hours = (new Date(d.approved_at) - new Date(d.created_date)) / (1000 * 60 * 60);
      totalHours += hours;
    });

    const velocity = {
      suppliers_per_day: Math.round(recentDecisions.length / 7),
      avg_decision_hours: Math.round(totalHours / (recentDecisions.length || 1))
    };

    // Decision outcomes this period (30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const approved = mappings.filter(m => m.status === 'APPROVED' && m.approved_at >= thirtyDaysAgo).length;
    const provisional = mappings.filter(m => m.status === 'PROVISIONAL' && m.created_date >= thirtyDaysAgo).length;
    const blocked = mappings.filter(m => m.status === 'BLOCKED' && m.created_date >= thirtyDaysAgo).length;
    const total = approved + provisional + blocked;

    const outcomes = {
      approved,
      provisional,
      blocked,
      approval_rate: total > 0 ? Math.round((approved / total) * 100) : 0
    };

    // Proof coverage
    const withProof = suppliers.filter(s => s.data_completeness >= 80).length;
    const coverage = suppliers.length > 0 ? Math.round((withProof / suppliers.length) * 100) : 0;

    // Exceptions (blocked mappings)
    const exceptions = mappings
      .filter(m => m.status === 'BLOCKED')
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        supplier_name: `Supplier #${m.id.slice(0, 6)}`,
        reason: m.validation_result?.gaps?.[0] || 'Validation failed',
        severity: m.validation_result?.gaps?.length > 2 ? 'critical' : 'warning'
      }));

    // Regulatory deadlines
    const today = new Date();
    const deadlines = [
      { regulation: 'CBAM', dueDate: new Date('2026-10-01') },
      { regulation: 'CSRD', dueDate: new Date('2025-04-28') },
      { regulation: 'EUDR', dueDate: new Date('2025-12-30') },
      { regulation: 'PFAS', dueDate: new Date('2026-06-01') }
    ].map(d => {
      const daysLeft = Math.ceil((d.dueDate - today) / (1000 * 60 * 60 * 24));
      return {
        regulation: d.regulation,
        days_left: daysLeft,
        readiness: Math.min(100, Math.max(0, 100 - (Math.max(0, daysLeft) / 365) * 100))
      };
    }).sort((a, b) => a.days_left - b.days_left);

    // Proof gaps
    const gaps = [
      { type: 'PFAS', percentage: Math.round((suppliers.filter(s => !s.pfas_relevant || !s.reach_compliance?.svhc_declaration_current).length / suppliers.length) * 100) || 0 },
      { type: 'Certifications', percentage: Math.round((suppliers.filter(s => !s.certifications?.length).length / suppliers.length) * 100) || 0 },
      { type: 'Carbon Data', percentage: Math.round((suppliers.filter(s => !s.carbon_performance?.scope1_emissions_tco2e).length / suppliers.length) * 100) || 0 },
      { type: 'HR/Ethics', percentage: Math.round((suppliers.filter(s => !s.csddd_human_rights_dd?.has_hr_policy).length / suppliers.length) * 100) || 0 }
    ];

    // Audit trail
    const trail = auditLogs.slice(0, 5).map(log => ({
      id: log.id,
      supplier_name: `Supplier #${log.resource_id.slice(0, 6)}`,
      action: log.action.replace('EVIDENCE_', ''),
      rule: log.details || 'Standard validation',
      timestamp: new Date(log.action_timestamp).toLocaleDateString()
    }));

    // Critical tier suppliers
    const hotlist = suppliers
      .filter(s => s.risk_tier === 'critical')
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
      .slice(0, 4)
      .map(s => ({
        id: s.id,
        name: s.legal_name,
        risk_reason: riskAlerts.find(a => a.supplier_id === s.id)?.description || 'High risk tier',
        risk_score: s.risk_score || 0
      }));

    return Response.json({
      pipeline,
      portfolio,
      velocity,
      outcomes,
      coverage,
      exceptions,
      deadlines,
      gaps,
      trail,
      hotlist
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
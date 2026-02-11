/**
 * ESCALATION ROUTER - RBAC-based resolver assignment
 * Routes BLOCKED/escalations to appropriate roles with SLA
 */

export function routeBlockedSupplier(blockReason, supplierData) {
  const escalation = {
    resolver_role: null,
    reason_code: null,
    sla_hours: null,
    priority: 'normal',
    details: blockReason
  };

  // Sanctions = Legal Team (48h SLA, high priority)
  if (blockReason?.includes('Sanctions')) {
    escalation.resolver_role = 'legal_reviewer';
    escalation.reason_code = 'SANCTIONS_FLAG';
    escalation.sla_hours = 48;
    escalation.priority = 'critical';
  }
  // Duplicates = Compliance Officer (72h SLA)
  else if (blockReason?.includes('duplicate')) {
    escalation.resolver_role = 'compliance_officer';
    escalation.reason_code = 'DUPLICATE_DETECTED';
    escalation.sla_hours = 72;
    escalation.priority = 'high';
  }
  // Generic data gaps = Supplier Manager (14d SLA)
  else if (blockReason?.includes('Missing')) {
    escalation.resolver_role = 'supplier_manager';
    escalation.reason_code = 'DATA_INCOMPLETE';
    escalation.sla_hours = 336; // 14 days
    escalation.priority = 'normal';
  }
  // Default = Admin
  else {
    escalation.resolver_role = 'admin';
    escalation.reason_code = 'MANUAL_REVIEW';
    escalation.sla_hours = 168; // 7 days
    escalation.priority = 'normal';
  }

  return escalation;
}

export function calculateDueDates(slaHours) {
  const now = new Date();
  const due = new Date(now.getTime() + slaHours * 60 * 60 * 1000);
  return {
    created_at: now.toISOString(),
    due_date: due.toISOString(),
    sla_hours: slaHours
  };
}
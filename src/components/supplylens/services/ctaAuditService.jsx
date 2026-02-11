// CTA Audit Service - Deterministic instrumentation for all actions
// Logs every button click, expected outcome, and result

export class CTAAuditLog {
  constructor(action_name, page, user, tenant_id) {
    this.timestamp = new Date().toISOString();
    this.action_name = action_name;
    this.page = page;
    this.user = user;
    this.tenant_id = tenant_id;
    this.params = {};
    this.returned_ids = [];
    this.success = false;
    this.duration_ms = 0;
  }
}

class CTAAuditService {
  constructor() {
    this.logs = [];
    this.MAX_LOGS = 50;
    this.startTime = 0;
  }

  setMaxLogs(max) {
    this.MAX_LOGS = max;
  }

  initLog(action_name, page, user, tenant_id, expectedOutcome, params) {
    const log = new CTAAuditLog(action_name, page, user, tenant_id);
    log.expected_outcome = expectedOutcome;
    if (params) log.params = params;
    this.startTime = performance.now();
    return log;
  }

  completeLog(log, success, result) {
    log.success = success;
    log.duration_ms = Math.round(performance.now() - this.startTime);
    
    if (result) {
      if (result.ids) log.returned_ids = result.ids;
      if (result.navigationTarget) log.navigation_target = result.navigationTarget;
      if (result.errorMessage) log.error_message = result.errorMessage;
    }

    this.logs.unshift(log);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    return log;
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const ctaAuditService = new CTAAuditService();

// Helper for quick instrumentation in components
export async function ctaAudit(
  action_name,
  page,
  user,
  tenant_id,
  expectedOutcome,
  handler,
  params
) {
  const log = ctaAuditService.initLog(action_name, page, user, tenant_id, expectedOutcome, params);

  try {
    const result = await handler();
    ctaAuditService.completeLog(log, true, { ids: result.ids, navigationTarget: result.navigationTarget });
    console.log(`[CTA✓] ${action_name} succeeded`, log);
    return { success: true, ids: result.ids };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    ctaAuditService.completeLog(log, false, { errorMessage });
    console.error(`[CTA✗] ${action_name} failed:`, errorMessage, log);
    return { success: false, error: errorMessage };
  }
}
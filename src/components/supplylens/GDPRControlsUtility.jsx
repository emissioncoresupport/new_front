/**
 * GDPR Controls & Retention Calculation
 * Minimization warning, export/deletion requests, tombstone design
 */

export const calculateRetentionEndDate = (retentionPolicy) => {
  const now = new Date();
  let days = 0;
  
  const policyDays = {
    '1y': 365,
    '3y': 1095,
    '7y': 2555,
    '10y': 3650,
    'regulatory_hold': 36500 // 100 years
  };
  
  days = policyDays[retentionPolicy] || 365;
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return endDate.toISOString();
};

export const createGDPRExportRequest = (evidenceId, tenantId, actorEmail) => {
  const workItem = {
    work_item_id: `WI-GDPR-EXP-${Date.now()}`,
    type: 'DATA_REQUEST',
    status: 'OPEN',
    priority: 'HIGH',
    title: `GDPR Data Export Request: ${evidenceId}`,
    linked_evidence_id: evidenceId,
    reason: 'GDPR_EXPORT_REQUEST',
    requested_by: actorEmail,
    tenant_id: tenantId,
    requested_at_utc: new Date().toISOString(),
    details: {
      evidence_id: evidenceId,
      request_type: 'data_export_dsar',
      format: 'JSON',
      include_hashes: true
    }
  };

  const existing = localStorage.getItem('gdpr_work_items') || '[]';
  const items = JSON.parse(existing);
  items.push(workItem);
  localStorage.setItem('gdpr_work_items', JSON.stringify(items));

  // Log access
  const accessLog = {
    log_id: `LOG-${Date.now()}`,
    evidence_id: evidenceId,
    tenant: tenantId,
    actor: actorEmail,
    action: 'GDPR_EXPORT_REQUEST',
    allowed: true,
    timestamp: new Date().toISOString()
  };
  
  const logs = JSON.parse(localStorage.getItem('gdpr_access_logs') || '[]');
  logs.push(accessLog);
  localStorage.setItem('gdpr_access_logs', JSON.stringify(logs));

  return workItem;
};

export const createGDPRDeletionRequest = (evidenceId, tenantId, actorEmail) => {
  const workItem = {
    work_item_id: `WI-GDPR-DEL-${Date.now()}`,
    type: 'DATA_REQUEST',
    status: 'OPEN',
    priority: 'HIGH',
    title: `GDPR Deletion Request (Tombstone): ${evidenceId}`,
    linked_evidence_id: evidenceId,
    reason: 'GDPR_DELETION_TOMBSTONE_REQUEST',
    requested_by: actorEmail,
    tenant_id: tenantId,
    requested_at_utc: new Date().toISOString(),
    details: {
      evidence_id: evidenceId,
      request_type: 'deletion_right_to_be_forgotten',
      deletion_method: 'TOMBSTONE_CRYPTO_SHRED',
      note: 'No actual deletion in Base44. Tombstone mark + future crypto-shred design.'
    }
  };

  const existing = localStorage.getItem('gdpr_work_items') || '[]';
  const items = JSON.parse(existing);
  items.push(workItem);
  localStorage.setItem('gdpr_work_items', JSON.stringify(items));

  // Log access
  const accessLog = {
    log_id: `LOG-${Date.now()}`,
    evidence_id: evidenceId,
    tenant: tenantId,
    actor: actorEmail,
    action: 'GDPR_DELETION_REQUEST',
    allowed: true,
    deletion_method: 'TOMBSTONE',
    timestamp: new Date().toISOString()
  };
  
  const logs = JSON.parse(localStorage.getItem('gdpr_access_logs') || '[]');
  logs.push(accessLog);
  localStorage.setItem('gdpr_access_logs', JSON.stringify(logs));

  return workItem;
};

export const getGDPRWorkItems = () => {
  return JSON.parse(localStorage.getItem('gdpr_work_items') || '[]');
};

export const getGDPRAccessLogs = () => {
  return JSON.parse(localStorage.getItem('gdpr_access_logs') || '[]');
};
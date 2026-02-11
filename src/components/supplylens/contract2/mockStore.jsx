// Contract 2 Mock Store: Unified API for all Contract 2 screens
// Single source of truth with tenant isolation + localStorage persistence

import { 
  evidenceStore, 
  workItemStore, 
  entityStore, 
  decisionStore, 
  mappingSuggestionStore,
  auditEventStore,
  ACTIVE_TENANT_ID 
} from './store';
import { calculateReadiness, calculateSlaRemaining, safeDate } from './utils';

// Active Tenant Management
let currentTenantId = ACTIVE_TENANT_ID;

export function getActiveTenant() {
  return {
    tenant_id: currentTenantId,
    tenant_name: currentTenantId === 'tenant_demo_emissioncore' ? 'EmissionCore Demo' : 'Unknown Tenant'
  };
}

export function setActiveTenant(tenantId) {
  currentTenantId = tenantId;
}

// Evidence Operations
export async function listEvidence(filters = {}) {
  await new Promise(resolve => setTimeout(resolve, 50));
  let evidence = evidenceStore.list(currentTenantId);
  
  // Apply filters
  if (filters.status) {
    evidence = evidence.filter(e => e.sealedStatus === filters.status);
  }
  if (filters.datasetType) {
    evidence = evidence.filter(e => e.datasetType === filters.datasetType);
  }
  if (filters.ingestionMethod) {
    evidence = evidence.filter(e => e.ingestionMethod === filters.ingestionMethod);
  }
  if (filters.sourceSystem) {
    evidence = evidence.filter(e => e.sourceSystem === filters.sourceSystem);
  }
  if (filters.displayId) {
    evidence = evidence.filter(e => 
      e.displayId?.toLowerCase().includes(filters.displayId.toLowerCase())
    );
  }
  
  // Sort by ingested date descending
  return evidence.sort((a, b) => 
    new Date(b.ingestedAtUtc).getTime() - new Date(a.ingestedAtUtc).getTime()
  );
}

export async function getEvidenceByDisplayId(displayId) {
  await new Promise(resolve => setTimeout(resolve, 50));
  const evidence = evidenceStore.getByDisplayId(currentTenantId, displayId);
  
  if (!evidence) return null;
  
  // Enrich with computed fields
  return {
    ...evidence,
    recordId: evidence.id,
    createdBy: evidence.createdById,
    fileAttachments: []
  };
}

export async function getEvidenceById(id) {
  await new Promise(resolve => setTimeout(resolve, 50));
  return evidenceStore.getById(currentTenantId, id);
}

// Work Item Operations
export async function listWorkItems(filters = {}) {
  await new Promise(resolve => setTimeout(resolve, 50));
  let items = workItemStore.list(currentTenantId, filters);
  
  // Add computed SLA
  items = items.map(item => ({
    ...item,
    slaRemaining: item.status !== 'RESOLVED' && item.status !== 'CLOSED' ? 
      calculateSlaRemaining(item.createdAt, item.slaHours || 48) : null
  }));
  
  // Sort by priority then created date
  const priorityOrder = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
  return items.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getWorkItemById(workItemId) {
  await new Promise(resolve => setTimeout(resolve, 50));
  const item = workItemStore.getById(currentTenantId, workItemId);
  
  if (item) {
    return {
      ...item,
      slaRemaining: item.status !== 'RESOLVED' && item.status !== 'CLOSED' ? 
        calculateSlaRemaining(item.createdAt, item.slaHours || 48) : null
    };
  }
  
  return null;
}

export async function createWorkItem(payload) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const workItem = workItemStore.create(currentTenantId, {
    ...payload,
    status: payload.status || 'OPEN',
    priority: payload.priority || 'MEDIUM',
    owner: payload.owner || 'Unassigned',
    updatedAt: new Date().toISOString(),
    slaHours: payload.slaHours || 48,
    requiresAction: payload.requiresAction !== false
  });
  
  // Log audit event
  await appendAuditEvent({
    eventType: 'WORK_ITEM_CREATED',
    objectType: 'WORK_ITEM',
    objectId: workItem.id,
    actor: payload.createdBy || 'system@emissioncore.io',
    details: {
      action: 'CREATE',
      type: workItem.type,
      reason: workItem.details?.reason || 'Work item created'
    }
  });
  
  return workItem;
}

export async function resolveConflict(workItemId, resolutionPayload) {
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const { strategy, value, reasonCode, evidenceId, comment, actor } = resolutionPayload;
  
  if (!reasonCode) {
    return { success: false, error: 'Reason code is required' };
  }
  
  const workItem = workItemStore.getById(currentTenantId, workItemId);
  
  if (!workItem || workItem.type !== 'CONFLICT') {
    return { success: false, error: 'Work item not found or not a conflict' };
  }
  
  // Create decision
  const decision = decisionStore.create(currentTenantId, {
    workItemId,
    entityRef: workItem.linkedEntityRef,
    evidenceId,
    decisionType: 'CONFLICT_RESOLVE',
    reasonCode,
    comment,
    createdBy: actor || 'admin@emissioncore.io',
    metadata: {
      strategy,
      field: workItem.details?.field,
      resolvedValue: value,
      sources: workItem.details?.sources
    }
  });
  
  // Update work item
  workItemStore.updateStatus(currentTenantId, workItemId, 'RESOLVED');
  
  // Update entity canonical field
  if (workItem.linkedEntityRef && workItem.details?.field) {
    entityStore.updateCanonicalField(
      currentTenantId,
      workItem.linkedEntityRef.entityType,
      workItem.linkedEntityRef.entityId,
      workItem.details.field,
      value
    );
  }
  
  // Log audit event
  await appendAuditEvent({
    eventType: 'DECISION_LOGGED',
    objectType: 'DECISION',
    objectId: decision.id,
    actor: actor || 'admin@emissioncore.io',
    details: {
      action: 'RESOLVE_CONFLICT',
      decisionType: 'CONFLICT_RESOLVE',
      workItemId,
      field: workItem.details?.field,
      value
    }
  });
  
  return { success: true, decision };
}

export async function createFollowUpWorkItem(parentWorkItemId, payload) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const result = workItemStore.createFollowUp(
    currentTenantId, 
    parentWorkItemId, 
    payload, 
    payload.actor || 'admin@emissioncore.io'
  );
  
  if (result.success) {
    // Log audit event
    await appendAuditEvent({
      eventType: 'WORK_ITEM_CREATED',
      objectType: 'WORK_ITEM',
      objectId: result.workItem.id,
      actor: payload.actor || 'admin@emissioncore.io',
      details: {
        action: 'CREATE_FOLLOWUP',
        parentWorkItemId,
        type: result.workItem.type
      }
    });
  }
  
  return result;
}

// Entity Operations
export async function listEntities(filters = {}) {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const entityType = filters.entityType;
  let entities = [];
  
  if (!entityType || entityType === 'SUPPLIER') {
    const suppliers = entityStore.getSuppliers(currentTenantId).map(s => ({
      ...s,
      readiness: calculateReadiness(s)
    }));
    entities = [...entities, ...suppliers];
  }
  
  if (!entityType || entityType === 'SKU') {
    const skus = entityStore.getSKUs(currentTenantId).map(s => ({
      ...s,
      readiness: calculateReadiness(s)
    }));
    entities = [...entities, ...skus];
  }
  
  if (!entityType || entityType === 'BOM') {
    const boms = entityStore.getBOMs(currentTenantId).map(b => ({
      ...b,
      readiness: calculateReadiness(b)
    }));
    entities = [...entities, ...boms];
  }
  
  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    entities = entities.filter(e => 
      e.legalName?.toLowerCase().includes(searchLower) ||
      e.name?.toLowerCase().includes(searchLower) ||
      e.entityId?.toLowerCase().includes(searchLower) ||
      e.skuCode?.toLowerCase().includes(searchLower)
    );
  }
  
  return entities;
}

export async function getEntity(entityType, entityId) {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  let entity = null;
  
  if (entityType === 'SUPPLIER') {
    entity = entityStore.getSupplierById(currentTenantId, entityId);
  } else if (entityType === 'SKU') {
    entity = entityStore.getSKUById(currentTenantId, entityId);
  } else if (entityType === 'BOM') {
    entity = entityStore.getBOMById(currentTenantId, entityId);
  }
  
  if (!entity) return null;
  
  return {
    ...entity,
    readiness: calculateReadiness(entity)
  };
}

// Audit Event Operations
export async function appendAuditEvent(event) {
  await new Promise(resolve => setTimeout(resolve, 50));
  return auditEventStore.create(currentTenantId, {
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  });
}

export async function listAuditEvents(filters = {}) {
  await new Promise(resolve => setTimeout(resolve, 50));
  let events = auditEventStore.list(currentTenantId);
  
  if (filters.objectType) {
    events = events.filter(e => e.objectType === filters.objectType);
  }
  if (filters.objectId) {
    events = events.filter(e => e.objectId === filters.objectId);
  }
  if (filters.eventType) {
    events = events.filter(e => e.eventType === filters.eventType);
  }
  
  return events.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Mapping Suggestion Operations
export async function listMappingSuggestions(entityId) {
  await new Promise(resolve => setTimeout(resolve, 50));
  return mappingSuggestionStore.list(currentTenantId, entityId);
}

export async function decideMappingSuggestion(suggestionId, approved, reasonCode, comment, actor) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!reasonCode) {
    return { success: false, error: 'Reason code is required' };
  }
  
  const suggestion = mappingSuggestionStore.getById(currentTenantId, suggestionId);
  
  if (!suggestion) {
    return { success: false, error: 'Suggestion not found' };
  }
  
  // Create decision
  const decision = decisionStore.create(currentTenantId, {
    entityRef: suggestion.entityRef,
    decisionType: approved ? 'MAP_APPROVE' : 'MAP_REJECT',
    reasonCode,
    comment,
    createdBy: actor || 'admin@emissioncore.io',
    metadata: {
      suggestionId,
      proposedTarget: suggestion.proposedTargetRef,
      confidence: suggestion.confidence
    }
  });
  
  // Update suggestion status
  mappingSuggestionStore.updateStatus(currentTenantId, suggestionId, approved ? 'APPROVED' : 'REJECTED');
  
  // If approved, close related mapping work items
  if (approved) {
    const relatedWorkItems = workItemStore.list(currentTenantId, { type: 'MAPPING' })
      .filter(w => w.linkedEntityRef?.entityId === suggestion.entityRef.entityId && w.status === 'OPEN');
    
    relatedWorkItems.forEach(w => {
      workItemStore.updateStatus(currentTenantId, w.id, 'CLOSED');
    });
  }
  
  // Log audit event
  await appendAuditEvent({
    eventType: 'DECISION_LOGGED',
    objectType: 'DECISION',
    objectId: decision.id,
    actor: actor || 'admin@emissioncore.io',
    details: {
      action: approved ? 'APPROVE_MAPPING' : 'REJECT_MAPPING',
      decisionType: decision.decisionType,
      suggestionId,
      entityId: suggestion.entityRef.entityId
    }
  });
  
  return { success: true, decision };
}

// KPI Calculations
export async function getKPIs() {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const evidence = evidenceStore.list(currentTenantId);
  const workItems = workItemStore.list(currentTenantId);
  
  const sealedCount = evidence.filter(e => e.sealedStatus === 'SEALED').length;
  const pendingReview = workItems.filter(w => w.type === 'REVIEW' && w.status === 'OPEN').length;
  const pendingMapping = workItems.filter(w => w.type === 'MAPPING' && w.status === 'OPEN').length;
  
  const criticalBlockedItems = workItems.filter(w => 
    (w.status === 'BLOCKED' || w.priority === 'CRITICAL') && w.status === 'OPEN'
  );
  
  const financialRiskExposure = criticalBlockedItems.reduce((sum, item) => 
    sum + (item.details?.financialRiskExposure || 1500), 0
  );
  
  return {
    sealedEvidence: sealedCount,
    pendingReview,
    pendingMapping,
    financialRiskExposure,
    criticalBlockedCount: criticalBlockedItems.length
  };
}

// Recent Activity (for Control Tower)
export async function getRecentActivity(limit = 10) {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const evidence = evidenceStore.list(currentTenantId);
  
  return evidence
    .sort((a, b) => new Date(b.ingestedAtUtc).getTime() - new Date(a.ingestedAtUtc).getTime())
    .slice(0, limit)
    .map(e => ({
      id: e.id,
      displayId: e.displayId,
      datasetType: e.datasetType,
      status: e.sealedStatus,
      ingestionMethod: e.ingestionMethod,
      ingestedAt: e.ingestedAtUtc,
      ingestedBy: e.ingestedBy
    }));
}

// Decision Operations
export async function listDecisions(filters = {}) {
  await new Promise(resolve => setTimeout(resolve, 50));
  let decisions = decisionStore.list(currentTenantId);
  
  if (filters.workItemId) {
    decisions = decisions.filter(d => d.workItemId === filters.workItemId);
  }
  if (filters.entityId) {
    decisions = decisions.filter(d => d.entityRef?.entityId === filters.entityId);
  }
  
  return decisions.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Approve/Reject Work Items
export async function approveWorkItem(workItemId, reasonCode, comment, actor) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!reasonCode) {
    return { success: false, error: 'Reason code is required' };
  }
  
  const workItem = workItemStore.getById(currentTenantId, workItemId);
  
  if (!workItem) {
    return { success: false, error: 'Work item not found' };
  }
  
  // Create decision
  const decision = decisionStore.create(currentTenantId, {
    workItemId,
    entityRef: workItem.linkedEntityRef,
    evidenceId: workItem.linkedEvidenceId,
    decisionType: 'APPROVE',
    reasonCode,
    comment,
    createdBy: actor || 'admin@emissioncore.io'
  });
  
  // Update work item
  workItemStore.updateStatus(currentTenantId, workItemId, 'RESOLVED');
  
  // Log audit event
  await appendAuditEvent({
    eventType: 'DECISION_LOGGED',
    objectType: 'DECISION',
    objectId: decision.id,
    actor: actor || 'admin@emissioncore.io',
    details: {
      action: 'APPROVE',
      decisionType: 'APPROVE',
      workItemId
    }
  });
  
  return { success: true, decision };
}

export async function rejectWorkItem(workItemId, reasonCode, comment, actor) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!reasonCode || !comment) {
    return { success: false, error: 'Reason code and comment are required for rejection' };
  }
  
  const workItem = workItemStore.getById(currentTenantId, workItemId);
  
  if (!workItem) {
    return { success: false, error: 'Work item not found' };
  }
  
  // Create decision
  const decision = decisionStore.create(currentTenantId, {
    workItemId,
    entityRef: workItem.linkedEntityRef,
    evidenceId: workItem.linkedEvidenceId,
    decisionType: 'REJECT',
    reasonCode,
    comment,
    createdBy: actor || 'admin@emissioncore.io'
  });
  
  // Update work item
  workItemStore.updateStatus(currentTenantId, workItemId, 'REJECTED');
  
  // Log audit event
  await appendAuditEvent({
    eventType: 'DECISION_LOGGED',
    objectType: 'DECISION',
    objectId: decision.id,
    actor: actor || 'admin@emissioncore.io',
    details: {
      action: 'REJECT',
      decisionType: 'REJECT',
      workItemId,
      comment
    }
  });
  
  return { success: true, decision };
}

// Export for convenience
export { ACTIVE_TENANT_ID, currentTenantId, safeDate, calculateReadiness };
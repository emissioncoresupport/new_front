/**
 * SupplyLens API Layer
 * Single source for all SupplyLens data operations
 * IMPORTANT: Frontend must only use this module, never access stores directly
 */

import {
  getTenant,
  getEvidenceRecords,
  getEvidenceByDisplayId,
  getEvidenceByRecordId,
  getEntities,
  getEntityById,
  getWorkItems,
  getWorkItemById,
  updateWorkItem,
  addDecisionToWorkItem,
  updateEntity,
  createFollowUpWorkItem,
  computeKPIs
} from './mockDataRegistry';

// Evidence operations
export async function listEvidence(tenantId, filters = {}) {
  return getEvidenceRecords({ tenantId, ...filters });
}

export async function getEvidenceById(tenantId, evidenceId) {
  // Try display ID first, then record ID
  let match = getEvidenceByDisplayId(evidenceId);
  if (!match) {
    match = getEvidenceByRecordId(evidenceId);
  }
  return match;
}

// Entity operations
export async function listEntities(tenantId, entityType) {
  return getEntities(entityType, { tenantId });
}

export async function getEntity(tenantId, entityType, entityId) {
  const entity = getEntityById(entityType, entityId);
  if (entity && entity.tenantId === tenantId) {
    return entity;
  }
  return null;
}

export async function updateEntityFields(tenantId, entityType, entityId, fieldUpdates) {
  const entity = getEntityById(entityType, entityId);
  if (!entity || entity.tenantId !== tenantId) {
    throw new Error('Entity not found or unauthorized');
  }
  return updateEntity(entityType, entityId, fieldUpdates);
}

// Work item operations
export async function listWorkItems(tenantId, filters = {}) {
  return getWorkItems({ tenantId, ...filters });
}

export async function getWorkItem(tenantId, workItemId) {
  const workItem = getWorkItemById(workItemId);
  if (workItem && workItem.tenantId === tenantId) {
    return workItem;
  }
  return null;
}

export async function resolveConflict(tenantId, workItemId, resolution) {
  const workItem = getWorkItemById(workItemId);
  if (!workItem || workItem.tenantId !== tenantId) {
    throw new Error('Work item not found or unauthorized');
  }

  if (workItem.type !== 'CONFLICT') {
    throw new Error('Not a conflict work item');
  }

  const { strategy, reasonCode, comment, chosenValue, chosenSource, actorEmail } = resolution;

  // Create decision entry
  const decision = {
    decisionType: 'CONFLICT_RESOLUTION',
    strategy,
    reasonCode,
    comment: comment || '',
    chosenValue,
    chosenSource,
    actorEmail,
    conflictField: workItem.actionPayload.conflict.field
  };

  // Add to append-only log
  addDecisionToWorkItem(workItemId, decision);

  // Apply to entity
  const entity = workItem.linkedEntity;
  if (entity) {
    updateEntity(entity.entityType, entity.entityId, {
      [workItem.actionPayload.conflict.field]: chosenValue
    });
  }

  // Update work item status
  updateWorkItem(workItemId, {
    status: 'RESOLVED',
    lastUpdatedBy: actorEmail
  });

  return getWorkItemById(workItemId);
}

export async function approveWorkItem(tenantId, workItemId, approval) {
  const workItem = getWorkItemById(workItemId);
  if (!workItem || workItem.tenantId !== tenantId) {
    throw new Error('Work item not found or unauthorized');
  }

  const { reasonCode, comment, actorEmail } = approval;

  // Create decision entry
  const decision = {
    decisionType: 'APPROVAL',
    reasonCode,
    comment: comment || '',
    outcome: 'APPROVED',
    actorEmail
  };

  addDecisionToWorkItem(workItemId, decision);

  updateWorkItem(workItemId, {
    status: 'RESOLVED',
    lastUpdatedBy: actorEmail
  });

  return getWorkItemById(workItemId);
}

export async function rejectWorkItem(tenantId, workItemId, rejection) {
  const workItem = getWorkItemById(workItemId);
  if (!workItem || workItem.tenantId !== tenantId) {
    throw new Error('Work item not found or unauthorized');
  }

  const { reasonCode, comment, actorEmail } = rejection;

  // Create decision entry
  const decision = {
    decisionType: 'REJECTION',
    reasonCode,
    comment: comment || '',
    outcome: 'REJECTED',
    actorEmail
  };

  addDecisionToWorkItem(workItemId, decision);

  updateWorkItem(workItemId, {
    status: 'RESOLVED',
    lastUpdatedBy: actorEmail
  });

  return getWorkItemById(workItemId);
}

export async function createFollowUp(tenantId, parentWorkItemId, followUpData) {
  const parent = getWorkItemById(parentWorkItemId);
  if (!parent || parent.tenantId !== tenantId) {
    throw new Error('Parent work item not found or unauthorized');
  }

  const result = createFollowUpWorkItem(parentWorkItemId, followUpData);
  
  if (result.duplicate) {
    throw new Error('DUPLICATE_FOLLOW_UP');
  }

  return result.workItem;
}

// KPI computation
export async function getKPIs(tenantId) {
  return computeKPIs(tenantId);
}
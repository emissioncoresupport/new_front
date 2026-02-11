// Contract 2 Store: In-memory tenant-scoped storage with idempotency

import { 
  mockEvidenceRecords, 
  mockWorkItems, 
  mockEntities, 
  mockDecisionReceipts,
  idempotencyStore,
  ACTIVE_TENANT_ID 
} from './data';
import { createIdempotencyKey } from './utils';

// Deep clone helper
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Evidence Store
class EvidenceStore {
  constructor() {
    this.data = clone(mockEvidenceRecords);
  }
  
  list(tenantId) {
    return this.data.filter(e => e.tenantId === tenantId);
  }
  
  getByDisplayId(tenantId, displayId) {
    return this.data.find(e => e.tenantId === tenantId && e.displayId === displayId);
  }
  
  getByRecordId(tenantId, recordId) {
    return this.data.find(e => e.tenantId === tenantId && e.recordId === recordId);
  }
  
  updateMapStatus(tenantId, displayId, mapStatus) {
    const evidence = this.getByDisplayId(tenantId, displayId);
    if (evidence) {
      evidence.mapStatus = mapStatus;
    }
  }
  
  updateReadinessImpact(tenantId, displayId, readinessImpact) {
    const evidence = this.getByDisplayId(tenantId, displayId);
    if (evidence) {
      evidence.readinessImpact = readinessImpact;
    }
  }
}

// Work Item Store
class WorkItemStore {
  constructor() {
    this.data = clone(mockWorkItems);
  }
  
  list(tenantId) {
    return this.data.filter(w => w.tenantId === tenantId);
  }
  
  getById(tenantId, workItemId) {
    return this.data.find(w => w.tenantId === tenantId && w.workItemId === workItemId);
  }
  
  updateStatus(tenantId, workItemId, status, actor) {
    const workItem = this.getById(tenantId, workItemId);
    if (workItem) {
      workItem.status = status;
      workItem.updatedAt = new Date().toISOString();
      workItem.auditTrail.push({
        event: status === 'RESOLVED' ? 'RESOLVED' : 'STATUS_CHANGED',
        actor,
        timestamp: new Date().toISOString(),
        details: `Status changed to ${status}`
      });
    }
  }
  
  resolveConflict(tenantId, workItemId, strategy, value, actor, evidenceId) {
    const workItem = this.getById(tenantId, workItemId);
    if (workItem && workItem.type === 'CONFLICT') {
      workItem.status = 'RESOLVED';
      workItem.resolutionStrategy = strategy;
      workItem.resolvedValue = value;
      workItem.updatedAt = new Date().toISOString();
      workItem.auditTrail.push({
        event: 'RESOLVED',
        actor,
        timestamp: new Date().toISOString(),
        details: `Resolved using ${strategy}, value: ${value}${evidenceId ? `, source: ${evidenceId}` : ''}`
      });
      
      // Create decision receipt
      const receipt = {
        tenantId,
        workItemId,
        entityRef: workItem.linkedEntityRef,
        field: workItem.conflictDetails?.field,
        chosenValue: value,
        chosenEvidenceId: evidenceId || null,
        strategy,
        actor,
        timestamp: new Date().toISOString(),
        previousValues: workItem.conflictDetails?.sources.map(s => ({ sourceId: s.sourceId, value: s.value })),
        hashReceipt: `receipt:${workItemId}:${Date.now()}`
      };
      mockDecisionReceipts.push(receipt);
      
      return receipt;
    }
    return null;
  }
  
  createFollowUp(tenantId, parentWorkItemId, data, actor) {
    const idempotencyKey = createIdempotencyKey('follow-up', parentWorkItemId);
    
    // Check if already exists
    if (idempotencyStore.has(idempotencyKey)) {
      return { error: 'Follow-up already exists for this work item', existing: true };
    }
    
    const followUp = {
      tenantId,
      workItemId: `WI-${String(this.data.length + 1).padStart(3, '0')}`,
      type: 'FOLLOW_UP',
      status: 'OPEN',
      priority: data.priority || 'MEDIUM',
      slaHours: data.slaHours || 48,
      owner: data.owner || 'Unassigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedEvidenceIds: data.linkedEvidenceIds || [],
      linkedEntityRef: data.linkedEntityRef || null,
      parentWorkItemId,
      followUpReason: data.reason,
      auditTrail: [
        {
          event: 'CREATED',
          actor,
          timestamp: new Date().toISOString(),
          details: `Follow-up created from ${parentWorkItemId}`
        }
      ]
    };
    
    this.data.push(followUp);
    idempotencyStore.add(idempotencyKey);
    
    return { success: true, workItem: followUp };
  }
  
  assignOwner(tenantId, workItemId, owner, actor) {
    const workItem = this.getById(tenantId, workItemId);
    if (workItem) {
      workItem.owner = owner;
      workItem.updatedAt = new Date().toISOString();
      workItem.auditTrail.push({
        event: 'ASSIGNED',
        actor,
        timestamp: new Date().toISOString(),
        details: `Assigned to ${owner}`
      });
    }
  }
}

// Entity Store
class EntityStore {
  constructor() {
    this.suppliers = clone(mockEntities.suppliers);
    this.skus = clone(mockEntities.skus);
    this.boms = clone(mockEntities.boms);
  }
  
  getSuppliers(tenantId) {
    return this.suppliers.filter(s => s.tenantId === tenantId);
  }
  
  getSupplierById(tenantId, entityId) {
    return this.suppliers.find(s => s.tenantId === tenantId && s.entityId === entityId);
  }
  
  getSKUs(tenantId) {
    return this.skus.filter(s => s.tenantId === tenantId);
  }
  
  getSKUById(tenantId, entityId) {
    return this.skus.find(s => s.tenantId === tenantId && s.entityId === entityId);
  }
  
  getBOMs(tenantId) {
    return this.boms.filter(b => b.tenantId === tenantId);
  }
  
  getBOMById(tenantId, entityId) {
    return this.boms.find(b => b.tenantId === tenantId && b.entityId === entityId);
  }
  
  updateCanonicalField(tenantId, entityType, entityId, field, value) {
    let entity;
    if (entityType === 'SUPPLIER') {
      entity = this.getSupplierById(tenantId, entityId);
    } else if (entityType === 'SKU') {
      entity = this.getSKUById(tenantId, entityId);
    } else if (entityType === 'BOM') {
      entity = this.getBOMById(tenantId, entityId);
    }
    
    if (entity) {
      entity.canonicalFields[field] = value;
      entity.conflictCount = Math.max(0, (entity.conflictCount || 0) - 1);
    }
  }
}

// Decision Store
class DecisionStore {
  list(tenantId) {
    return mockDecisionReceipts.filter(d => d.tenantId === tenantId);
  }
  
  getByWorkItemId(tenantId, workItemId) {
    return mockDecisionReceipts.find(d => d.tenantId === tenantId && d.workItemId === workItemId);
  }
}

// Export singleton instances
export const evidenceStore = new EvidenceStore();
export const workItemStore = new WorkItemStore();
export const entityStore = new EntityStore();
export const decisionStore = new DecisionStore();

// Export active tenant for convenience
export { ACTIVE_TENANT_ID };
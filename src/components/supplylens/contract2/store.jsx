// Contract 2 Store: In-memory tenant-scoped storage with idempotency and localStorage persistence

import { 
  mockEvidenceRecords,
  mockEvidenceDrafts,
  mockWorkItems, 
  mockEntities, 
  mockMappingSuggestions,
  mockDecisions,
  mockAuditEvents,
  ACTIVE_TENANT_ID 
} from './data';
import { createIdempotencyKey } from './utils';

// Deep clone helper
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// LocalStorage persistence
const STORAGE_KEY = 'contract2_mock_store';

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save to localStorage:', err);
  }
}

function initializeStore() {
  const stored = loadFromStorage();
  if (stored) {
    return stored;
  }
  
  // First load: seed with mock data
  return {
    evidence: clone(mockEvidenceRecords),
    evidenceDrafts: clone(mockEvidenceDrafts),
    workItems: clone(mockWorkItems),
    entities: clone(mockEntities),
    mappingSuggestions: clone(mockMappingSuggestions),
    decisions: clone(mockDecisions),
    auditEvents: clone(mockAuditEvents),
    idempotencyKeys: []
  };
}

let storeData = initializeStore();

function persist() {
  saveToStorage(storeData);
}

// Evidence Store
class EvidenceStore {
  list(tenantId) {
    return storeData.evidence.filter(e => e.tenantId === tenantId);
  }
  
  getById(tenantId, id) {
    return storeData.evidence.find(e => e.tenantId === tenantId && e.id === id);
  }
  
  getByDisplayId(tenantId, displayId) {
    return storeData.evidence.find(e => e.tenantId === tenantId && e.displayId === displayId);
  }
  
  listDrafts(tenantId) {
    return storeData.evidenceDrafts.filter(e => e.tenantId === tenantId);
  }
  
  getDraftById(tenantId, id) {
    return storeData.evidenceDrafts.find(e => e.tenantId === tenantId && e.id === id);
  }
}

// Work Item Store
class WorkItemStore {
  list(tenantId, filters = {}) {
    let items = storeData.workItems.filter(w => w.tenantId === tenantId);
    
    if (filters.status) items = items.filter(w => w.status === filters.status);
    if (filters.type) items = items.filter(w => w.type === filters.type);
    if (filters.priority) items = items.filter(w => w.priority === filters.priority);
    
    return items;
  }
  
  getById(tenantId, workItemId) {
    return storeData.workItems.find(w => w.tenantId === tenantId && w.id === workItemId);
  }
  
  create(tenantId, payload) {
    const workItem = {
      id: `WI-${Date.now().toString().slice(-6)}`,
      tenantId,
      ...payload,
      createdAt: new Date().toISOString()
    };
    
    storeData.workItems.push(workItem);
    persist();
    return workItem;
  }
  
  updateStatus(tenantId, workItemId, status) {
    const workItem = this.getById(tenantId, workItemId);
    if (workItem) {
      workItem.status = status;
      persist();
    }
  }
  
  createFollowUp(tenantId, parentWorkItemId, data, actor) {
    const idempotencyKey = createIdempotencyKey('follow-up', parentWorkItemId, data.type || 'FOLLOW_UP');
    
    // Check if already exists
    if (storeData.idempotencyKeys.includes(idempotencyKey)) {
      const existing = storeData.workItems.find(w => 
        w.tenantId === tenantId && 
        w.parentWorkItemId === parentWorkItemId && 
        w.status === 'OPEN'
      );
      return { error: 'Follow-up already exists', existing: true, existingId: existing?.id };
    }
    
    const followUp = {
      id: `WI-FU-${Date.now().toString().slice(-6)}`,
      tenantId,
      type: 'FOLLOW_UP',
      status: 'OPEN',
      priority: data.priority || 'MEDIUM',
      owner: data.owner || 'Unassigned',
      createdAt: new Date().toISOString(),
      linkedEvidenceId: data.linkedEvidenceId,
      linkedEntityRef: data.linkedEntityRef,
      parentWorkItemId,
      details: { reason: data.reason }
    };
    
    storeData.workItems.push(followUp);
    storeData.idempotencyKeys.push(idempotencyKey);
    persist();
    
    return { success: true, workItem: followUp };
  }
}

// Entity Store
class EntityStore {
  getSuppliers(tenantId) {
    return storeData.entities.suppliers.filter(s => s.tenantId === tenantId);
  }
  
  getSupplierById(tenantId, entityId) {
    return storeData.entities.suppliers.find(s => s.tenantId === tenantId && s.entityId === entityId);
  }
  
  getSKUs(tenantId) {
    return storeData.entities.skus.filter(s => s.tenantId === tenantId);
  }
  
  getSKUById(tenantId, entityId) {
    return storeData.entities.skus.find(s => s.tenantId === tenantId && s.entityId === entityId);
  }
  
  getBOMs(tenantId) {
    return storeData.entities.boms.filter(b => b.tenantId === tenantId);
  }
  
  getBOMById(tenantId, entityId) {
    return storeData.entities.boms.find(b => b.tenantId === tenantId && b.entityId === entityId);
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
      persist();
    }
  }
}

// Decision Store
class DecisionStore {
  list(tenantId) {
    return storeData.decisions.filter(d => d.tenantId === tenantId);
  }
  
  create(tenantId, payload) {
    const decision = {
      id: `DEC-${Date.now().toString().slice(-8)}`,
      tenantId,
      ...payload,
      createdAt: new Date().toISOString()
    };
    
    storeData.decisions.push(decision);
    persist();
    return decision;
  }
}

// Mapping Suggestion Store
class MappingSuggestionStore {
  list(tenantId, entityId) {
    let suggestions = storeData.mappingSuggestions.filter(s => s.tenantId === tenantId);
    if (entityId) {
      suggestions = suggestions.filter(s => s.entityRef.entityId === entityId);
    }
    return suggestions;
  }
  
  getById(tenantId, id) {
    return storeData.mappingSuggestions.find(s => s.tenantId === tenantId && s.id === id);
  }
  
  updateStatus(tenantId, id, status) {
    const suggestion = this.getById(tenantId, id);
    if (suggestion) {
      suggestion.status = status;
      persist();
    }
  }
}

// Audit Event Store (append-only)
class AuditEventStore {
  list(tenantId) {
    return storeData.auditEvents.filter(e => e.tenantId === tenantId);
  }
  
  create(tenantId, payload) {
    const event = {
      id: `AE-${Date.now().toString().slice(-6)}`,
      tenantId,
      ...payload,
      timestamp: new Date().toISOString()
    };
    
    storeData.auditEvents.push(event);
    persist();
    return event;
  }
}

// Export singleton instances
export const evidenceStore = new EvidenceStore();
export const workItemStore = new WorkItemStore();
export const entityStore = new EntityStore();
export const decisionStore = new DecisionStore();
export const mappingSuggestionStore = new MappingSuggestionStore();
export const auditEventStore = new AuditEventStore();

// Utility to reset store
export function resetStore() {
  localStorage.removeItem(STORAGE_KEY);
  storeData = initializeStore();
}

// Export active tenant for convenience
export { ACTIVE_TENANT_ID };
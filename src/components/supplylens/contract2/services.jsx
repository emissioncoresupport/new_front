// Contract 2 Services: Mock service layer that mimics real backend API

import { 
  evidenceStore, 
  workItemStore, 
  entityStore, 
  decisionStore, 
  mappingSuggestionStore,
  auditEventStore,
  ACTIVE_TENANT_ID 
} from './store';
import { calculateReadiness, calculateSlaRemaining } from './utils';
import { SOURCE_TRUST_RANKS } from './data';
import { assignWorkItem } from './WorkItemAssignmentEngine';

// Mock mode flag (true = use mock store, false = use real backend)
export const MOCK_MODE = true;

// Evidence Service
export class EvidenceService {
  static async listEvidence(tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return evidenceStore.list(tenantId);
  }
  
  static async listDrafts(tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return evidenceStore.listDrafts(tenantId);
  }
  
  static async getDraftById(id, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    return evidenceStore.getDraftById(tenantId, id);
  }
  
  static async getEvidenceByDisplayId(displayId, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    const evidence = evidenceStore.getByDisplayId(tenantId, displayId);
    
    if (!evidence) return null;
    
    // Enrich with computed fields
    return {
      ...evidence,
      recordId: evidence.id,
      sourceSystem: evidence.sourceSystem,
      ingestionMethod: evidence.ingestionMethod,
      createdBy: evidence.createdById,
      fileAttachments: []
    };
  }
  
  static async getEvidenceById(id, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    return evidenceStore.getById(tenantId, id);
  }
  
  static async verifyHashes(displayId, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    const evidence = evidenceStore.getByDisplayId(tenantId, displayId);
    
    if (!evidence) {
      return { success: false, error: 'Evidence not found' };
    }
    
    // Mock hash verification (always passes in mock mode)
    return {
      success: true,
      payloadMatch: true,
      metadataMatch: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'mock-verifier'
    };
  }
  
  static async exportPackage(displayId, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    const evidence = evidenceStore.getByDisplayId(tenantId, displayId);
    
    if (!evidence) {
      return { success: false, error: 'Evidence not found' };
    }
    
    const packageData = {
      evidence: {
        displayId: evidence.displayId,
        datasetType: evidence.datasetType,
        ingestionMethod: evidence.ingestionMethod,
        sourceSystem: evidence.sourceSystem,
        ingestedAtUtc: evidence.ingestedAtUtc,
        sealedStatus: evidence.sealedStatus,
        payloadHashSha256: evidence.payloadHashSha256,
        metadataHashSha256: evidence.metadataHashSha256
      },
      linkedEntities: evidence.linkedEntityRefs,
      exportedAt: new Date().toISOString(),
      exportedBy: 'mock-user'
    };
    
    // Create download
    const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-${displayId}-export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true };
  }
}

// Work Item Service
export class WorkItemService {
  static async listWorkItems(tenantId = ACTIVE_TENANT_ID, filters) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    const items = workItemStore.list(tenantId, filters);
    
    // Add computed SLA remaining
    return items.map(item => ({
      ...item,
      slaRemaining: item.status !== 'RESOLVED' && item.status !== 'CLOSED' ? 
        calculateSlaRemaining(item.createdAt, item.slaHours || 48) : null
    }));
  }
  
  static async getWorkItemById(workItemId, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    const item = workItemStore.getById(tenantId, workItemId);
    
    if (item) {
      return {
        ...item,
        slaRemaining: item.status !== 'RESOLVED' && item.status !== 'CLOSED' ? 
          calculateSlaRemaining(item.createdAt, item.slaHours || 48) : null
      };
    }
    
    return null;
  }
  
  static async resolveConflict(workItemId, strategy, value, reasonCode, evidenceId, comment, tenantId = ACTIVE_TENANT_ID, actor = 'admin@emissioncore.com') {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    if (!reasonCode) {
      return { success: false, error: 'Reason code is required' };
    }
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const workItem = workItemStore.getById(tenantId, workItemId);
    
    if (!workItem || workItem.type !== 'CONFLICT') {
      return { success: false, error: 'Work item not found or not a conflict' };
    }
    
    // Create decision
    const decision = decisionStore.create(tenantId, {
      workItemId,
      entityRef: workItem.linkedEntityRef,
      evidenceId,
      decisionType: 'CONFLICT_RESOLVE',
      reasonCode,
      comment,
      createdBy: actor,
      metadata: {
        strategy,
        field: workItem.details?.field,
        resolvedValue: value,
        sources: workItem.details?.sources
      }
    });
    
    // Update work item
    workItemStore.updateStatus(tenantId, workItemId, 'RESOLVED');
    
    // Update entity canonical field
    if (workItem.linkedEntityRef && workItem.details?.field) {
      entityStore.updateCanonicalField(
        tenantId,
        workItem.linkedEntityRef.entityType,
        workItem.linkedEntityRef.entityId,
        workItem.details.field,
        value
      );
    }
    
    return { success: true, decision };
  }
  
  static async createFollowUp(parentWorkItemId, data, tenantId = ACTIVE_TENANT_ID, actor = 'admin@emissioncore.com') {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return workItemStore.createFollowUp(tenantId, parentWorkItemId, data, actor);
  }
  
  static async create(tenantId = ACTIVE_TENANT_ID, payload, actor = 'admin@emissioncore.com') {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // AI-driven assignment before creation
    const workItem = {
      type: payload.type,
      linkedEntityRef: payload.linkedEntityRef,
      datasetType: payload.datasetType,
      details: payload.details
    };
    const assignment = assignWorkItem(workItem);
    
    return workItemStore.create(tenantId, {
      ...payload,
      owner: assignment.owner,
      priority: assignment.priority,
      assignmentReason: assignment.assignmentReason
    });
  }
}

// Entity Service
export class EntityService {
  static async getSuppliers(tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return entityStore.getSuppliers(tenantId).map(s => ({
      ...s,
      readiness: calculateReadiness(s)
    }));
  }
  
  static async getSupplierById(entityId, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    const supplier = entityStore.getSupplierById(tenantId, entityId);
    
    if (supplier) {
      return {
        ...supplier,
        readiness: calculateReadiness(supplier)
      };
    }
    
    return null;
  }
  
  static async getSKUs(tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return entityStore.getSKUs(tenantId).map(s => ({
      ...s,
      readiness: calculateReadiness(s)
    }));
  }
  
  static async getSKUById(entityId, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    const sku = entityStore.getSKUById(tenantId, entityId);
    
    if (sku) {
      return {
        ...sku,
        readiness: calculateReadiness(sku)
      };
    }
    
    return null;
  }
  
  static async getBOMs(tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return entityStore.getBOMs(tenantId).map(b => ({
      ...b,
      readiness: calculateReadiness(b)
    }));
  }
}

// Decision Service
export class DecisionService {
  static async listDecisions(tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return decisionStore.list(tenantId);
  }
  
  static async getDecisionByWorkItemId(workItemId, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    return decisionStore.getByWorkItemId(tenantId, workItemId);
  }
}

// Mapping Service
export class MappingService {
  static async listSuggestions(entityId, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return mappingSuggestionStore.list(tenantId, entityId);
  }
  
  static async decideSuggestion(suggestionId, approved, reasonCode, comment, tenantId = ACTIVE_TENANT_ID, actor = 'admin@emissioncore.com') {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    if (!reasonCode) {
      return { success: false, error: 'Reason code is required' };
    }
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const suggestion = mappingSuggestionStore.getById(tenantId, suggestionId);
    
    if (!suggestion) {
      return { success: false, error: 'Suggestion not found' };
    }
    
    // Create decision
    const decision = decisionStore.create(tenantId, {
      entityRef: suggestion.entityRef,
      decisionType: approved ? 'MAP_APPROVE' : 'MAP_REJECT',
      reasonCode,
      comment,
      createdBy: actor,
      metadata: {
        suggestionId,
        proposedTarget: suggestion.proposedTargetRef,
        confidence: suggestion.confidence
      }
    });
    
    // Update suggestion status
    mappingSuggestionStore.updateStatus(tenantId, suggestionId, approved ? 'APPROVED' : 'REJECTED');
    
    // If approved, close related mapping work items
    if (approved) {
      const relatedWorkItems = workItemStore.list(tenantId, { type: 'MAPPING' })
        .filter(w => w.linkedEntityRef?.entityId === suggestion.entityRef.entityId && w.status === 'OPEN');
      
      relatedWorkItems.forEach(w => {
        workItemStore.updateStatus(tenantId, w.id, 'CLOSED');
      });
    }
    
    return { success: true, decision };
  }
}

// Readiness Service
export class ReadinessService {
  static async calculateReadinessImpacts(tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const suppliers = entityStore.getSuppliers(tenantId);
    const skus = entityStore.getSKUs(tenantId);
    const boms = entityStore.getBOMs(tenantId);
    
    const results = {
      suppliers: suppliers.map(s => ({ entityId: s.entityId, readiness: calculateReadiness(s) })),
      skus: skus.map(s => ({ entityId: s.entityId, readiness: calculateReadiness(s) })),
      boms: boms.map(b => ({ entityId: b.entityId, readiness: calculateReadiness(b) })),
      summary: {
        totalReady: 0,
        totalNotReady: 0,
        totalReadyWithGaps: 0,
        totalPendingMatch: 0
      }
    };
    
    [...results.suppliers, ...results.skus, ...results.boms].forEach(item => {
      if (item.readiness === 'READY') results.summary.totalReady++;
      else if (item.readiness === 'NOT_READY') results.summary.totalNotReady++;
      else if (item.readiness === 'READY_WITH_GAPS') results.summary.totalReadyWithGaps++;
      else if (item.readiness === 'PENDING_MATCH') results.summary.totalPendingMatch++;
    });
    
    return results;
  }
}

// KPI Service
export class KPIService {
  static async getKPIs(tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const evidence = evidenceStore.list(tenantId);
    const workItems = workItemStore.list(tenantId);
    
    const sealedCount = evidence.filter(e => e.sealedStatus === 'SEALED').length;
    const pendingReview = workItems.filter(w => w.type === 'REVIEW' && w.status === 'OPEN').length;
    const pendingMapping = workItems.filter(w => w.type === 'MAPPING' && w.status === 'OPEN').length;
    
    const blockedItems = workItems.filter(w => w.status === 'BLOCKED' || w.type === 'BLOCKED');
    const financialRiskExposure = blockedItems.reduce((sum, item) => 
      sum + (item.details?.financialRiskExposure || 0), 0
    );
    
    return {
      sealedEvidence: sealedCount,
      pendingReview,
      pendingMapping,
      financialRiskExposure
    };
  }
}

// Audit Event Service (for Evidence Vault review history)
export class AuditEventService {
  static async listAuditEvents(tenantId = ACTIVE_TENANT_ID, filters = {}) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    let events = auditEventStore.list(tenantId);
    
    if (filters.objectType) {
      events = events.filter(e => e.objectType === filters.objectType);
    }
    if (filters.objectId) {
      events = events.filter(e => e.objectId === filters.objectId);
    }
    
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  static async logEvent(tenantId = ACTIVE_TENANT_ID, payload) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    return auditEventStore.create(tenantId, payload);
  }
}
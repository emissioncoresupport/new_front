// Contract 2 Services: Mock service layer that mimics real backend API

import { evidenceStore, workItemStore, entityStore, decisionStore, ACTIVE_TENANT_ID } from './store';
import { calculateReadiness, calculateSlaRemaining } from './utils';

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
  
  static async getEvidenceByDisplayId(displayId, tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    return evidenceStore.getByDisplayId(tenantId, displayId);
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
    let items = workItemStore.list(tenantId);
    
    // Apply filters
    if (filters?.status) {
      items = items.filter(w => w.status === filters.status);
    }
    if (filters?.type) {
      items = items.filter(w => w.type === filters.type);
    }
    if (filters?.priority) {
      items = items.filter(w => w.priority === filters.priority);
    }
    
    // Add computed SLA remaining
    items = items.map(item => ({
      ...item,
      slaRemaining: calculateSlaRemaining(item.createdAt, item.slaHours)
    }));
    
    return items;
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
        slaRemaining: calculateSlaRemaining(item.createdAt, item.slaHours)
      };
    }
    
    return null;
  }
  
  static async resolveConflict(
    workItemId, 
    strategy, 
    value, 
    evidenceId,
    tenantId = ACTIVE_TENANT_ID,
    actor = 'admin@emissioncore.com'
  ) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const receipt = workItemStore.resolveConflict(tenantId, workItemId, strategy, value, actor, evidenceId);
    
    if (receipt) {
      // Update entity canonical field
      if (receipt.entityRef) {
        entityStore.updateCanonicalField(
          tenantId, 
          receipt.entityRef.entityType, 
          receipt.entityRef.entityId, 
          receipt.field, 
          value
        );
      }
      
      return { success: true, receipt };
    }
    
    return { success: false, error: 'Work item not found or not a conflict' };
  }
  
  static async createFollowUp(
    parentWorkItemId,
    data,
    tenantId = ACTIVE_TENANT_ID,
    actor = 'admin@emissioncore.com'
  ) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return workItemStore.createFollowUp(tenantId, parentWorkItemId, data, actor);
  }
  
  static async assignOwner(workItemId, owner, tenantId = ACTIVE_TENANT_ID, actor = 'admin@emissioncore.com') {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    workItemStore.assignOwner(tenantId, workItemId, owner, actor);
    return { success: true };
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

// Readiness Service (calculates readiness impacts)
export class ReadinessService {
  static async calculateReadinessImpacts(tenantId = ACTIVE_TENANT_ID) {
    if (!MOCK_MODE) {
      throw new Error('Backend not implemented');
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Get all entities and calculate readiness
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
    
    // Calculate summary
    [...results.suppliers, ...results.skus, ...results.boms].forEach(item => {
      if (item.readiness === 'READY') results.summary.totalReady++;
      else if (item.readiness === 'NOT_READY') results.summary.totalNotReady++;
      else if (item.readiness === 'READY_WITH_GAPS') results.summary.totalReadyWithGaps++;
      else if (item.readiness === 'PENDING_MATCH') results.summary.totalPendingMatch++;
    });
    
    return results;
  }
}
/**
 * SupplyLens Contract 2 - Unified Mock Data Registry
 * 
 * Single source of truth for all mock data used across:
 * - Control Tower (Overview + Work Queue)
 * - Evidence Vault
 * - Network (Suppliers, SKUs, BOMs)
 * - Work Item Details
 * 
 * DEVELOPER NOTES - Backend Migration Path:
 * When replacing mocks with real backend:
 * 
 * 1. Evidence Records:
 *    GET /api/evidence?tenant_id={tenant}&status={status}&dataset_type={type}
 *    GET /api/evidence/{record_id}
 * 
 * 2. Network Entities:
 *    GET /api/entities/suppliers?tenant_id={tenant}
 *    GET /api/entities/skus?tenant_id={tenant}
 *    GET /api/entities/boms?tenant_id={tenant}
 *    GET /api/entities/{entity_type}/{entity_id}
 * 
 * 3. Work Items:
 *    GET /api/workitems?tenant_id={tenant}&status={status}&type={type}
 *    GET /api/workitems/{work_item_id}
 *    POST /api/workitems/{work_item_id}/resolve
 *    POST /api/workitems/{work_item_id}/followup
 * 
 * 4. Decisions (append-only audit log):
 *    GET /api/workitems/{work_item_id}/decisions
 *    POST /api/workitems/{work_item_id}/decisions
 * 
 * All endpoints must enforce tenant isolation and return 403 for unauthorized access.
 */

const MOCK_TENANT = {
  tenantId: 'tenant_emissioncore_demo',
  displayName: 'EmissionCore Demo',
  countryCode: 'NL'
};

// 4 Evidence Records - Deterministic, cross-linked
const MOCK_EVIDENCE = [
  {
    recordId: 'e7f3c8d2-4a5b-4c3d-8e2f-1a2b3c4d5e6f',
    displayId: 'EV-2024-001',
    tenantId: MOCK_TENANT.tenantId,
    datasetType: 'SUPPLIER_MASTER',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Manual Upload',
    status: 'SEALED',
    ingestedAtUtc: '2024-12-15T10:30:00Z',
    retentionEndsUtc: '2031-12-15T10:30:00Z',
    payloadHashSha256: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    metadataHashSha256: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567',
    ingestedByEmail: 'info@emissioncore.io',
    createdByUserId: 'usr_admin_001',
    linkedEntityType: 'SUPPLIER',
    linkedEntityId: 'SUP-123',
    canonicalPayload: {
      supplier_id: 'SUP-123',
      legal_name: 'Acme Manufacturing GmbH',
      country_code: 'DE',
      primary_contact_email: 'contact@acme-mfg.de'
    }
  },
  {
    recordId: 'f8g4d9e3-5b6c-4d4e-9f3g-2b3c4d5e6f7g',
    displayId: 'EV-2024-002',
    tenantId: MOCK_TENANT.tenantId,
    datasetType: 'ERP_SYNC',
    ingestionMethod: 'API_PUSH',
    sourceSystem: 'SAP S/4HANA',
    status: 'INGESTED',
    ingestedAtUtc: '2026-02-01T08:00:00Z',
    retentionEndsUtc: '2033-02-01T08:00:00Z',
    payloadHashSha256: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678',
    metadataHashSha256: 'd4e5f6789012345678901234567890abcdef1234567890abcdef123456789',
    ingestedByEmail: 'system@emissioncore.io',
    createdByUserId: 'usr_system_sap',
    linkedEntityType: 'SUPPLIER',
    linkedEntityId: 'SUP-123',
    canonicalPayload: {
      supplier_id: 'SUP-123',
      legal_name: 'Acme Manufacturing GmbH',
      country_code: 'FR', // CONFLICT: differs from EV-2024-001
      primary_contact_email: 'contact@acme-mfg.de'
    }
  },
  {
    recordId: 'g9h5e0f4-6c7d-4e5f-0g4h-3c4d5e6f7g8h',
    displayId: 'EV-2024-003',
    tenantId: MOCK_TENANT.tenantId,
    datasetType: 'BOM',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Manual Upload',
    status: 'QUARANTINED',
    ingestedAtUtc: '2024-11-20T14:45:00Z',
    retentionEndsUtc: '2031-11-20T14:45:00Z',
    payloadHashSha256: 'e5f6789012345678901234567890abcdef1234567890abcdef1234567890ab',
    metadataHashSha256: 'f6789012345678901234567890abcdef1234567890abcdef1234567890abcd',
    ingestedByEmail: 'info@emissioncore.io',
    createdByUserId: 'usr_admin_001',
    linkedEntityType: 'BOM',
    linkedEntityId: 'BOM-001',
    canonicalPayload: {
      bom_id: 'BOM-001',
      product_sku: 'SKU-456',
      components: [] // Incomplete - reason for quarantine
    }
  },
  {
    recordId: 'h0i6f1g5-7d8e-4f6g-1h5i-4d5e6f7g8h9i',
    displayId: 'EV-2024-004',
    tenantId: MOCK_TENANT.tenantId,
    datasetType: 'BOM',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Manual Upload',
    status: 'SEALED',
    ingestedAtUtc: '2025-01-10T16:20:00Z',
    retentionEndsUtc: '2032-01-10T16:20:00Z',
    payloadHashSha256: 'f6789012345678901234567890abcdef1234567890abcdef1234567890abcd',
    metadataHashSha256: 'g789012345678901234567890abcdef1234567890abcdef1234567890abcde',
    ingestedByEmail: 'info@emissioncore.io',
    createdByUserId: 'usr_admin_001',
    linkedEntityType: 'BOM',
    linkedEntityId: 'BOM-001',
    canonicalPayload: {
      bom_id: 'BOM-001',
      product_sku: 'SKU-456',
      components: [
        { part_id: 'PART-001', quantity: 10, unit: 'kg' },
        { part_id: 'PART-002', quantity: 5, unit: 'pcs' }
      ]
    }
  }
];

// 3 Network Entities
const MOCK_ENTITIES = {
  suppliers: [
    {
      entityType: 'SUPPLIER',
      entityId: 'SUP-123',
      tenantId: MOCK_TENANT.tenantId,
      currentFieldValues: {
        legal_name: 'Acme Manufacturing GmbH',
        country_code: 'DE', // Current value - may be disputed
        primary_contact_email: 'contact@acme-mfg.de',
        supplier_status: 'active'
      },
      evidenceLinks: ['EV-2024-001', 'EV-2024-002'],
      lastUpdatedAt: '2026-02-01T08:00:00Z',
      lastUpdatedBy: 'usr_system_sap'
    }
  ],
  skus: [
    {
      entityType: 'SKU',
      entityId: 'SKU-456',
      tenantId: MOCK_TENANT.tenantId,
      currentFieldValues: {
        name: 'Industrial Widget Pro',
        sku_code: 'SKU-456',
        category: 'Manufacturing Components',
        active: true
      },
      evidenceLinks: ['EV-2024-004'],
      lastUpdatedAt: '2025-01-10T16:20:00Z',
      lastUpdatedBy: 'usr_admin_001'
    }
  ],
  boms: [
    {
      entityType: 'BOM',
      entityId: 'BOM-001',
      tenantId: MOCK_TENANT.tenantId,
      currentFieldValues: {
        bom_name: 'Widget Pro BOM v2.1',
        product_sku: 'SKU-456',
        total_components: 2,
        status: 'active'
      },
      evidenceLinks: ['EV-2024-003', 'EV-2024-004'],
      lastUpdatedAt: '2025-01-10T16:20:00Z',
      lastUpdatedBy: 'usr_admin_001'
    }
  ]
};

// 4 Work Items
const MOCK_WORK_ITEMS = [
  {
    workItemId: 'WI-001',
    tenantId: MOCK_TENANT.tenantId,
    type: 'REVIEW',
    status: 'OPEN',
    priority: 'MEDIUM',
    ownerEmail: null,
    createdAtUtc: '2024-12-15T11:00:00Z',
    lastUpdatedAtUtc: '2024-12-15T11:00:00Z',
    linkedEvidenceDisplayIds: ['EV-2024-001'],
    linkedEntity: {
      entityType: 'SUPPLIER',
      entityId: 'SUP-123'
    },
    requiresAction: true,
    actionPayload: {
      reviewType: 'SUPPLIER_MASTER_VALIDATION',
      fields: ['legal_name', 'country_code', 'primary_contact_email']
    },
    decisionCount: 0,
    decisions: []
  },
  {
    workItemId: 'WI-002',
    tenantId: MOCK_TENANT.tenantId,
    type: 'MAPPING',
    status: 'OPEN',
    priority: 'HIGH',
    ownerEmail: 'analyst@emissioncore.io',
    createdAtUtc: '2026-02-01T09:00:00Z',
    lastUpdatedAtUtc: '2026-02-01T09:00:00Z',
    linkedEvidenceDisplayIds: ['EV-2024-002'],
    linkedEntity: {
      entityType: 'SUPPLIER',
      entityId: 'SUP-123'
    },
    requiresAction: true,
    actionPayload: {
      mappingType: 'ERP_TO_MASTER',
      proposedMappings: [
        { erpField: 'LIFNR', masterField: 'supplier_id', confidence: 0.95 }
      ]
    },
    decisionCount: 0,
    decisions: []
  },
  {
    workItemId: 'WI-003',
    tenantId: MOCK_TENANT.tenantId,
    type: 'CONFLICT',
    status: 'OPEN',
    priority: 'CRITICAL',
    ownerEmail: null,
    createdAtUtc: '2026-02-01T10:30:00Z',
    lastUpdatedAtUtc: '2026-02-01T10:30:00Z',
    linkedEvidenceDisplayIds: ['EV-2024-001', 'EV-2024-002'],
    linkedEntity: {
      entityType: 'SUPPLIER',
      entityId: 'SUP-123'
    },
    requiresAction: true,
    actionPayload: {
      conflict: {
        field: 'country_code',
        sources: [
          {
            label: 'Evidence A (FILE_UPLOAD)',
            evidenceId: 'EV-2024-001',
            datasetType: 'SUPPLIER_MASTER',
            date: '2024-12-15T10:30:00Z',
            value: 'DE'
          },
          {
            label: 'Evidence B (ERP_SYNC)',
            evidenceId: 'EV-2024-002',
            datasetType: 'ERP_SYNC',
            date: '2026-02-01T08:00:00Z',
            value: 'FR'
          }
        ]
      }
    },
    decisionCount: 0,
    decisions: []
  },
  {
    workItemId: 'WI-004',
    tenantId: MOCK_TENANT.tenantId,
    type: 'EXTRACTION',
    status: 'BLOCKED',
    priority: 'LOW',
    ownerEmail: null,
    createdAtUtc: '2024-11-20T15:00:00Z',
    lastUpdatedAtUtc: '2024-11-20T15:00:00Z',
    linkedEvidenceDisplayIds: ['EV-2024-003'],
    linkedEntity: {
      entityType: 'BOM',
      entityId: 'BOM-001'
    },
    requiresAction: false,
    actionPayload: {
      extractionType: 'BOM_COMPONENTS',
      blockedReason: 'Evidence quarantined - incomplete data'
    },
    decisionCount: 0,
    decisions: []
  }
];

// Helper functions
export function getTenant() {
  return MOCK_TENANT;
}

export function getEvidenceRecords(filters = {}) {
  let results = [...MOCK_EVIDENCE];
  
  if (filters.tenantId) {
    results = results.filter(e => e.tenantId === filters.tenantId);
  }
  
  if (filters.status) {
    results = results.filter(e => e.status === filters.status);
  }
  
  if (filters.datasetType) {
    results = results.filter(e => e.datasetType === filters.datasetType);
  }
  
  if (filters.displayId) {
    results = results.filter(e => e.displayId === filters.displayId);
  }
  
  return results;
}

export function getEvidenceByDisplayId(displayId) {
  return MOCK_EVIDENCE.find(e => e.displayId === displayId);
}

export function getEvidenceByRecordId(recordId) {
  return MOCK_EVIDENCE.find(e => e.recordId === recordId);
}

export function getEntities(entityType, filters = {}) {
  const entityMap = {
    SUPPLIER: MOCK_ENTITIES.suppliers,
    SKU: MOCK_ENTITIES.skus,
    BOM: MOCK_ENTITIES.boms
  };
  
  let results = entityMap[entityType] || [];
  
  if (filters.tenantId) {
    results = results.filter(e => e.tenantId === filters.tenantId);
  }
  
  if (filters.entityId) {
    results = results.filter(e => e.entityId === filters.entityId);
  }
  
  return results;
}

export function getEntityById(entityType, entityId) {
  const entities = getEntities(entityType);
  return entities.find(e => e.entityId === entityId);
}

export function getWorkItems(filters = {}) {
  let results = [...MOCK_WORK_ITEMS];
  
  if (filters.tenantId) {
    results = results.filter(w => w.tenantId === filters.tenantId);
  }
  
  if (filters.status) {
    results = results.filter(w => w.status === filters.status);
  }
  
  if (filters.type) {
    results = results.filter(w => w.type === filters.type);
  }
  
  if (filters.workItemId) {
    results = results.filter(w => w.workItemId === filters.workItemId);
  }
  
  return results;
}

export function getWorkItemById(workItemId) {
  return MOCK_WORK_ITEMS.find(w => w.workItemId === workItemId);
}

export function updateWorkItem(workItemId, updates) {
  const workItem = MOCK_WORK_ITEMS.find(w => w.workItemId === workItemId);
  if (workItem) {
    Object.assign(workItem, updates);
    workItem.lastUpdatedAtUtc = new Date().toISOString();
    return workItem;
  }
  return null;
}

export function addDecisionToWorkItem(workItemId, decision) {
  const workItem = getWorkItemById(workItemId);
  if (workItem) {
    workItem.decisions = workItem.decisions || [];
    workItem.decisions.push({
      ...decision,
      createdAt: new Date().toISOString(),
      decisionId: `DEC-${Date.now()}`
    });
    workItem.decisionCount = (workItem.decisionCount || 0) + 1;
    workItem.lastUpdatedAtUtc = new Date().toISOString();
    return workItem;
  }
  return null;
}

export function updateEntity(entityType, entityId, fieldUpdates) {
  const entity = getEntityById(entityType, entityId);
  if (entity) {
    Object.assign(entity.currentFieldValues, fieldUpdates);
    entity.lastUpdatedAt = new Date().toISOString();
    return entity;
  }
  return null;
}

export function createFollowUpWorkItem(parentWorkItemId, followUpData) {
  const parent = getWorkItemById(parentWorkItemId);
  if (!parent) return null;
  
  // Check for existing follow-up to prevent duplicates
  const existingFollowUp = MOCK_WORK_ITEMS.find(
    w => w.parentWorkItemId === parentWorkItemId && w.type === followUpData.type
  );
  
  if (existingFollowUp) {
    return { duplicate: true, workItem: existingFollowUp };
  }
  
  const followUp = {
    workItemId: `WI-FU-${Date.now()}`,
    tenantId: parent.tenantId,
    type: followUpData.type,
    status: 'OPEN',
    priority: followUpData.priority || parent.priority,
    ownerEmail: followUpData.ownerEmail || null,
    createdAtUtc: new Date().toISOString(),
    lastUpdatedAtUtc: new Date().toISOString(),
    linkedEvidenceDisplayIds: parent.linkedEvidenceDisplayIds,
    linkedEntity: parent.linkedEntity,
    parentWorkItemId: parentWorkItemId,
    requiresAction: true,
    actionPayload: followUpData.actionPayload || {},
    decisionCount: 0,
    decisions: []
  };
  
  MOCK_WORK_ITEMS.push(followUp);
  return { duplicate: false, workItem: followUp };
}

export function computeKPIs(tenantId) {
  const evidence = getEvidenceRecords({ tenantId });
  const workItems = getWorkItems({ tenantId });
  
  return {
    evidenceSealed: evidence.filter(e => e.status === 'SEALED').length,
    pendingReview: workItems.filter(w => 
      w.type === 'REVIEW' && ['OPEN', 'IN_PROGRESS'].includes(w.status)
    ).length,
    pendingMapping: workItems.filter(w => 
      w.type === 'MAPPING' && ['OPEN', 'IN_PROGRESS'].includes(w.status)
    ).length,
    activeConflicts: workItems.filter(w => 
      w.type === 'CONFLICT' && ['OPEN', 'IN_PROGRESS'].includes(w.status)
    ).length,
    blockedTasks: workItems.filter(w => w.status === 'BLOCKED').length
  };
}
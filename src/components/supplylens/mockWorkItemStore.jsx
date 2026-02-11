/**
 * CONTRACT 2: Mock Work Item & Decision Store
 * Local in-memory store for testing WorkItemDrawer functionality
 * No backend required - fully functional UI with deterministic behavior
 */

// In-memory stores
let mockWorkItems = [];
let mockDecisions = [];
let mockEntities = {
  suppliers: {},
  skus: {},
  boms: {}
};

// Deduplication cache (expires after 60 seconds)
const recentFollowUps = new Map();

/**
 * Initialize mock work items (4 examples for testing)
 */
/**
 * Initialize mock stores - seeded on first load, stable across reloads
 * Deterministic data for Contract 2 testing
 */
export function initializeMockWorkItems() {
  // Only initialize once
  if (mockWorkItems.length > 0) return mockWorkItems;

  mockWorkItems = [
    {
      id: 'wi-rec-001-stable',
      work_item_id: 'WI-2024-001',
      type: 'CONFLICT',
      status: 'OPEN',
      priority: 'HIGH',
      owner: null,
      created_at: '2026-02-01T10:00:00Z',
      updated_at: '2026-02-01T10:00:00Z',
      updated_by: null,
      parent_work_item_id: null,
      linked_evidence_id: 'EV-2024-001',
      linked_entity_type: 'SUPPLIER',
      linked_entity_ref: 'SUP-123',
      entity_id: 'SUP-123',
      entity_type: 'SUPPLIER',
      dataset_type: 'SUPPLIER_MASTER',
      ingestion_method: 'FILE_UPLOAD',
      decision_count: 0,
      conflict_field: 'country_code',
      conflict_value_a: 'DE',
      conflict_value_b: 'FR',
      conflict_source_a_evidence_id: 'EV-2024-001',
      conflict_source_b_evidence_id: 'EV-2024-002',
      conflict_source_a_dataset: 'SUPPLIER_MASTER',
      conflict_source_b_dataset: 'ERP_SYNC',
      conflict_source_a_timestamp: '2026-02-01T10:00:00Z',
      conflict_source_b_timestamp: '2026-02-02T14:30:00Z',
      conflict_ai_suggestion: 'Prefer ERP_SYNC (more recent)',
      tags: ['conflict', 'supplier-master']
    },
    {
      id: 'wi-rec-002-stable',
      work_item_id: 'WI-2024-002',
      type: 'REVIEW',
      status: 'OPEN',
      priority: 'MEDIUM',
      owner: 'admin@emissioncore.io',
      created_at: '2026-02-02T11:00:00Z',
      updated_at: '2026-02-02T11:00:00Z',
      updated_by: null,
      parent_work_item_id: null,
      linked_evidence_id: 'EV-2024-003',
      linked_entity_type: 'SKU',
      linked_entity_ref: 'SKU-456',
      entity_id: 'SKU-456',
      entity_type: 'SKU',
      dataset_type: 'BOM',
      ingestion_method: 'MANUAL_ENTRY',
      decision_count: 0,
      tags: ['review', 'bom']
    },
    {
      id: 'wi-rec-003-stable',
      work_item_id: 'WI-2024-003',
      type: 'MAPPING',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      owner: 'admin@emissioncore.io',
      created_at: '2026-02-03T09:00:00Z',
      updated_at: '2026-02-03T14:00:00Z',
      updated_by: 'admin@emissioncore.io',
      parent_work_item_id: null,
      linked_evidence_id: 'EV-2024-002',
      linked_entity_type: 'SUPPLIER',
      linked_entity_ref: 'SUP-123',
      entity_id: 'SUP-123',
      entity_type: 'SUPPLIER',
      dataset_type: 'ERP_SYNC',
      ingestion_method: 'ERP_API',
      decision_count: 1,
      tags: ['mapping', 'erp']
    },
    {
      id: 'wi-rec-004-stable',
      work_item_id: 'WI-2024-004',
      type: 'EXTRACTION',
      status: 'BLOCKED',
      priority: 'CRITICAL',
      owner: null,
      created_at: '2026-02-03T16:00:00Z',
      updated_at: '2026-02-03T16:00:00Z',
      updated_by: null,
      parent_work_item_id: null,
      linked_evidence_id: 'EV-2024-004',
      linked_entity_type: null,
      linked_entity_ref: null,
      dataset_type: 'TEST_REPORT',
      ingestion_method: 'API_PUSH',
      decision_count: 0,
      tags: ['extraction', 'blocked', 'quarantined']
    }
  ];

  // Initialize mock entities
  mockEntities.suppliers['SUP-123'] = {
    id: 'SUP-123',
    supplier_id: 'SUP-123',
    legal_name: 'Acme Corp',
    country_code: 'DE', // Will be updated by conflict resolution
    attributes: {
      country_code: 'DE'
    }
  };

  mockEntities.skus['SKU-456'] = {
    id: 'SKU-456',
    sku_code: 'SKU-2024-001',
    name: 'Test Product',
    attributes: {}
  };

  return mockWorkItems;
}

/**
 * Get all work items
 */
export function getMockWorkItems() {
  if (mockWorkItems.length === 0) {
    initializeMockWorkItems();
  }
  return mockWorkItems;
}

/**
 * Get all decisions (append-only)
 */
export function getMockDecisions() {
  return mockDecisions;
}

/**
 * Resolve conflict - updates entity, creates decision, updates work item
 */
export function resolveConflict({
  workItemId,
  strategy,
  finalValue,
  reasonCode,
  comment,
  fieldName,
  valueA,
  valueB,
  sourceAEvidenceId,
  sourceBEvidenceId,
  entityType,
  entityId,
  currentUser = 'user@example.com'
}) {
  const workItem = mockWorkItems.find(wi => wi.work_item_id === workItemId);
  if (!workItem) {
    throw new Error(`Work item ${workItemId} not found`);
  }

  // Create decision record (append-only)
  const decision = {
    id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    decision_id: `DEC-${Date.now().toString().slice(-6)}`,
    work_item_id: workItemId,
    parent_work_item_id: workItem.parent_work_item_id,
    entity_type: entityType || workItem.linked_entity_type || workItem.entity_type,
    entity_id: entityId || workItem.linked_entity_ref || workItem.entity_id,
    field_name: fieldName || workItem.conflict_field,
    winning_value: finalValue,
    strategy: strategy,
    evidence_ids: [sourceAEvidenceId, sourceBEvidenceId].filter(Boolean),
    reason_code: reasonCode,
    comment: comment || null,
    created_by: currentUser,
    created_at: new Date().toISOString(),
    tenant_id: workItem.tenant_id || 'DEFAULT'
  };

  // Append decision (immutable)
  mockDecisions.push(decision);

  // Update canonical entity field in mock store
  const entityKey = entityId || workItem.linked_entity_ref || workItem.entity_id;
  const entityTypeKey = (entityType || workItem.linked_entity_type || workItem.entity_type)?.toLowerCase() + 's';
  
  if (entityKey && mockEntities[entityTypeKey]?.[entityKey]) {
    const field = fieldName || workItem.conflict_field;
    if (!mockEntities[entityTypeKey][entityKey].attributes) {
      mockEntities[entityTypeKey][entityKey].attributes = {};
    }
    mockEntities[entityTypeKey][entityKey].attributes[field] = finalValue;
    
    // Also update top-level field if it exists
    if (field === 'country_code') {
      mockEntities[entityTypeKey][entityKey].country_code = finalValue;
    }
  }

  // Update work item (status, decision count, timestamps)
  const decisionCount = mockDecisions.filter(d => d.work_item_id === workItemId).length;
  
  Object.assign(workItem, {
    status: 'DONE',
    updated_at: new Date().toISOString(),
    updated_by: currentUser,
    decision_count: decisionCount,
    resolution_strategy: strategy,
    resolution_value: finalValue,
    resolved_at: new Date().toISOString()
  });

  return {
    success: true,
    decision,
    workItem,
    entity: mockEntities[entityTypeKey]?.[entityKey]
  };
}

/**
 * Create follow-up work item (idempotent, prevents duplicates within 60s)
 */
export function createFollowUp({
  parentWorkItemId,
  type,
  priority,
  evidenceId,
  entityType,
  entityId,
  currentUser = 'user@example.com',
  tenantId = 'DEFAULT'
}) {
  // Deduplication key
  const dedupeKey = `${parentWorkItemId}:${type}:${evidenceId}:${entityType}:${entityId}`;
  const now = Date.now();
  
  // Check recent follow-ups (within 60 seconds)
  if (recentFollowUps.has(dedupeKey)) {
    const { timestamp, workItemId } = recentFollowUps.get(dedupeKey);
    if (now - timestamp < 60000) {
      return {
        success: false,
        code: 'DUPLICATE_FOLLOW_UP',
        existing_work_item_id: workItemId
      };
    }
  }

  // Create new work item
  const newWorkItem = {
    id: `wi-rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    work_item_id: `WI-${Date.now().toString().slice(-6)}`,
    type: type,
    status: 'OPEN',
    priority: priority,
    owner: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: currentUser,
    parent_work_item_id: parentWorkItemId,
    linked_evidence_id: evidenceId,
    linked_entity_type: entityType,
    linked_entity_ref: entityId,
    entity_id: entityId,
    entity_type: entityType,
    dataset_type: mockWorkItems.find(wi => wi.work_item_id === parentWorkItemId)?.dataset_type || 'UNKNOWN',
    ingestion_method: mockWorkItems.find(wi => wi.work_item_id === parentWorkItemId)?.ingestion_method || 'UNKNOWN',
    decision_count: 0,
    tenant_id: tenantId,
    tags: ['follow-up', type.toLowerCase()]
  };

  // Add to store
  mockWorkItems.push(newWorkItem);

  // Cache for deduplication
  recentFollowUps.set(dedupeKey, {
    timestamp: now,
    workItemId: newWorkItem.work_item_id
  });

  // Clean up old entries (older than 60s)
  for (const [key, value] of recentFollowUps.entries()) {
    if (now - value.timestamp > 60000) {
      recentFollowUps.delete(key);
    }
  }

  return {
    success: true,
    work_item_id: newWorkItem.work_item_id,
    id: newWorkItem.id,
    workItem: newWorkItem
  };
}

/**
 * Get decisions for a work item
 */
export function getDecisionsForWorkItem(workItemId) {
  return mockDecisions.filter(d => d.work_item_id === workItemId);
}

/**
 * Get entity by ID
 */
export function getMockEntity(entityType, entityId) {
  const entityTypeKey = entityType?.toLowerCase() + 's';
  return mockEntities[entityTypeKey]?.[entityId] || null;
}

/**
 * Update work item (for approve/reject actions)
 */
export function updateMockWorkItem(workItemId, updates, currentUser = 'user@example.com') {
  const workItem = mockWorkItems.find(wi => wi.work_item_id === workItemId);
  if (!workItem) {
    throw new Error(`Work item ${workItemId} not found`);
  }

  Object.assign(workItem, {
    ...updates,
    updated_at: new Date().toISOString(),
    updated_by: currentUser
  });

  return workItem;
}

/**
 * Create decision log entry (for approve/reject)
 */
export function createDecisionLog({
  workItemId,
  decisionType,
  reasonCode,
  comment,
  currentUser = 'user@example.com'
}) {
  const workItem = mockWorkItems.find(wi => wi.work_item_id === workItemId);
  if (!workItem) {
    throw new Error(`Work item ${workItemId} not found`);
  }

  const decision = {
    id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    decision_id: `DEC-${Date.now().toString().slice(-6)}`,
    work_item_id: workItemId,
    parent_work_item_id: workItem.parent_work_item_id,
    entity_type: workItem.linked_entity_type || workItem.entity_type,
    entity_id: workItem.linked_entity_ref || workItem.entity_id,
    decision_type: decisionType,
    reason_code: reasonCode,
    comment: comment || null,
    created_by: currentUser,
    created_at: new Date().toISOString(),
    tenant_id: workItem.tenant_id || 'DEFAULT',
    linked_evidence_id: workItem.linked_evidence_id
  };

  mockDecisions.push(decision);

  // Increment decision count
  workItem.decision_count = (workItem.decision_count || 0) + 1;
  workItem.updated_at = new Date().toISOString();
  workItem.updated_by = currentUser;

  return decision;
}
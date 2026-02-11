// Contract 2 Mock Data: Deterministic, tenant-scoped, realistic evidence and work items

import { idGen, mockHash, calculateRetentionEnd } from './utils';

export const ACTIVE_TENANT_ID = 'tenant_demo_emissioncore';

// Source system trust rankings (higher = more trusted)
export const SOURCE_TRUST_RANKS = {
  'SAP S/4HANA': 100,
  'ERP_EXPORT': 80,
  'Supplier Portal': 60,
  'Manual Upload': 40,
  'Excel Import': 20
};

// Evidence Drafts (unsealed, in various states)
export const mockEvidenceDrafts = [
  {
    id: 'draft_001',
    tenantId: ACTIVE_TENANT_ID,
    displayId: 'DR-2026-001',
    datasetType: 'SUPPLIER_MASTER',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Manual Upload',
    status: 'READY_TO_SEAL',
    createdBy: 'info@emissioncore.io',
    createdAt: '2026-02-05T10:00:00Z',
    draftPayload: { legalName: 'New Supplier Ltd', countryCode: 'FR', vatNumber: 'FR987654321' },
    validationErrors: []
  },
  {
    id: 'draft_002',
    tenantId: ACTIVE_TENANT_ID,
    displayId: 'DR-2026-002',
    datasetType: 'BOM',
    ingestionMethod: 'API_PUSH',
    sourceSystem: 'ERP_EXPORT',
    status: 'VALIDATION_FAILED',
    createdBy: 'system@emissioncore.io',
    createdAt: '2026-02-04T14:30:00Z',
    draftPayload: { bomName: 'Incomplete BOM', weight: null },
    validationErrors: ['Missing required field: weight', 'Missing required field: weightUnit']
  },
  {
    id: 'draft_003',
    tenantId: ACTIVE_TENANT_ID,
    displayId: 'DR-2026-003',
    datasetType: 'INVOICE',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Supplier Portal',
    status: 'SUBMITTED_FOR_REVIEW',
    createdBy: 'procurement@emissioncore.io',
    createdAt: '2026-02-03T09:15:00Z',
    draftPayload: { invoiceNumber: 'INV-2026-0012', amount: 25000, currency: 'EUR', invoiceDate: '2026-02-01' },
    validationErrors: []
  }
];

// Evidence Records (seed data as per spec)
export const mockEvidenceRecords = [
  {
    id: 'rec_ev_001',
    tenantId: ACTIVE_TENANT_ID,
    displayId: 'EV-2024-001',
    datasetType: 'SUPPLIER_MASTER',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Manual Upload',
    ingestedBy: 'info@emissioncore.io',
    createdById: 'user_001',
    ingestedAtUtc: '2026-01-15T10:30:00Z',
    retentionEndsUtc: calculateRetentionEnd(),
    sealedStatus: 'SEALED',
    payloadHashSha256: mockHash('supplier_master_001'),
    metadataHashSha256: mockHash('metadata_001'),
    linkedEntityRefs: [{ entityType: 'SUPPLIER', entityId: 'SUP-123' }],
    canonicalPayload: { legalName: 'Acme Manufacturing GmbH', countryCode: 'DE', vatNumber: 'DE123456789' }
  },
  {
    id: 'rec_ev_002',
    tenantId: ACTIVE_TENANT_ID,
    displayId: 'EV-2024-002',
    datasetType: 'ERP_SYNC',
    ingestionMethod: 'API_PUSH',
    sourceSystem: 'SAP S/4HANA',
    ingestedBy: 'system@emissioncore.io',
    createdById: 'system',
    ingestedAtUtc: '2026-01-20T14:15:00Z',
    retentionEndsUtc: calculateRetentionEnd(),
    sealedStatus: 'INGESTED',
    payloadHashSha256: mockHash('erp_sync_002'),
    metadataHashSha256: mockHash('metadata_002'),
    linkedEntityRefs: [{ entityType: 'SUPPLIER', entityId: 'SUP-123' }],
    canonicalPayload: { legalName: 'Acme Manufacturing', countryCode: 'FR', supplierCode: 'SAP-10023' }
  },
  {
    id: 'rec_ev_003',
    tenantId: ACTIVE_TENANT_ID,
    displayId: 'EV-2024-003',
    datasetType: 'INVOICE',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Manual Upload',
    ingestedBy: 'procurement@emissioncore.io',
    createdById: 'user_002',
    ingestedAtUtc: '2026-01-22T09:45:00Z',
    retentionEndsUtc: calculateRetentionEnd(),
    sealedStatus: 'QUARANTINED',
    quarantineReason: 'MISSING_REQUIRED_FIELDS',
    payloadHashSha256: mockHash('invoice_003'),
    metadataHashSha256: mockHash('metadata_003'),
    linkedEntityRefs: [{ entityType: 'SUPPLIER', entityId: 'SUP-999' }],
    canonicalPayload: { invoiceNumber: 'INV-2024-0045', amount: 15000, currency: 'EUR', missing_field: null }
  },
  {
    id: 'rec_ev_004',
    tenantId: ACTIVE_TENANT_ID,
    displayId: 'EV-2024-004',
    datasetType: 'BOM',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Manual Upload',
    ingestedBy: 'info@emissioncore.io',
    createdById: 'user_001',
    ingestedAtUtc: '2026-01-25T16:20:00Z',
    retentionEndsUtc: calculateRetentionEnd(),
    sealedStatus: 'SEALED',
    payloadHashSha256: mockHash('bom_004'),
    metadataHashSha256: mockHash('metadata_004'),
    linkedEntityRefs: [{ entityType: 'SKU', entityId: 'SKU-456' }],
    canonicalPayload: { bomName: 'Widget Assembly A', weight: 2.5, weightUnit: 'kg' }
  }
];

// Work Items (seed data as per spec)
export const mockWorkItems = [
  {
    id: 'WI-001',
    tenantId: ACTIVE_TENANT_ID,
    type: 'REVIEW',
    status: 'OPEN',
    priority: 'MEDIUM',
    owner: 'Unassigned',
    createdAt: '2026-01-20T15:00:00Z',
    updatedAt: '2026-01-20T15:00:00Z',
    linkedEvidenceId: 'rec_ev_002',
    linkedEntityRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    slaHours: 72,
    slaRemaining: 48,
    requiresAction: true,
    details: { reason: 'Manual review required for ERP sync data' }
  },
  {
    id: 'WI-002',
    tenantId: ACTIVE_TENANT_ID,
    type: 'EXTRACTION',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    owner: 'ai-agent@extraction',
    createdAt: '2026-01-22T10:00:00Z',
    updatedAt: '2026-01-22T10:15:00Z',
    linkedEvidenceId: 'rec_ev_003',
    linkedEntityRef: null,
    slaHours: 48,
    slaRemaining: 36,
    requiresAction: false,
    details: { reason: 'Extract missing fields from quarantined invoice' }
  },
  {
    id: 'WI-003',
    tenantId: ACTIVE_TENANT_ID,
    type: 'MAPPING',
    status: 'OPEN',
    priority: 'HIGH',
    owner: 'Unassigned',
    createdAt: '2026-01-16T11:00:00Z',
    updatedAt: '2026-01-16T11:00:00Z',
    linkedEvidenceId: 'rec_ev_001',
    linkedEntityRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    slaHours: 48,
    slaRemaining: 12,
    requiresAction: true,
    details: { reason: 'Map supplier to canonical entity' }
  },
  {
    id: 'WI-004',
    tenantId: ACTIVE_TENANT_ID,
    type: 'CONFLICT',
    status: 'OPEN',
    priority: 'HIGH',
    owner: 'Unassigned',
    createdAt: '2026-01-21T09:00:00Z',
    updatedAt: '2026-01-21T09:00:00Z',
    linkedEvidenceId: 'rec_ev_001',
    linkedEntityRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    slaHours: 72,
    slaRemaining: 60,
    requiresAction: true,
    details: {
      reason: 'Country code conflict',
      field: 'countryCode',
      sources: [
        { evidenceId: 'rec_ev_001', displayId: 'EV-2024-001', value: 'DE', sourceSystem: 'Manual Upload', trustRank: SOURCE_TRUST_RANKS['Manual Upload'], sourceId: 'EV-2024-001' },
        { evidenceId: 'rec_ev_002', displayId: 'EV-2024-002', value: 'FR', sourceSystem: 'SAP S/4HANA', trustRank: SOURCE_TRUST_RANKS['SAP S/4HANA'], sourceId: 'EV-2024-002' }
      ]
    }
  },
  {
    id: 'WI-005',
    tenantId: ACTIVE_TENANT_ID,
    type: 'CONFLICT',
    status: 'OPEN',
    priority: 'MEDIUM',
    owner: 'Unassigned',
    createdAt: '2026-01-26T14:00:00Z',
    updatedAt: '2026-01-26T14:00:00Z',
    linkedEvidenceId: 'rec_ev_004',
    linkedEntityRef: { entityType: 'SKU', entityId: 'SKU-456' },
    slaHours: 96,
    slaRemaining: 72,
    requiresAction: true,
    details: {
      reason: 'BOM weight mismatch',
      field: 'weight',
      sources: [
        { evidenceId: 'rec_ev_004', displayId: 'EV-2024-004', value: 2.5, sourceSystem: 'Manual Upload', trustRank: SOURCE_TRUST_RANKS['Manual Upload'], sourceId: 'EV-2024-004' },
        { evidenceId: 'rec_ev_002', displayId: 'EV-2024-002', value: 2.8, sourceSystem: 'SAP S/4HANA', trustRank: SOURCE_TRUST_RANKS['SAP S/4HANA'], sourceId: 'EV-2024-002' }
      ]
    }
  },
  {
    id: 'WI-006',
    tenantId: ACTIVE_TENANT_ID,
    type: 'BLOCKED',
    status: 'BLOCKED',
    priority: 'CRITICAL',
    owner: 'info@emissioncore.io',
    createdAt: '2026-02-04T08:00:00Z',
    linkedEvidenceId: null,
    linkedEntityRef: { entityType: 'SKU', entityId: 'SKU-789' },
    slaHours: 24,
    slaRemaining: 18,
    requiresAction: true,
    details: {
      reason: 'Missing evidence for critical SKU',
      financialRiskExposure: 125000,
      currency: 'EUR'
    }
  },
  {
    id: 'WI-CT-001',
    tenantId: ACTIVE_TENANT_ID,
    type: 'MAPPING',
    status: 'OPEN',
    priority: 'CRITICAL',
    owner: 'Unassigned',
    createdAt: '2026-02-04T12:00:00Z',
    updatedAt: '2026-02-04T12:00:00Z',
    linkedEvidenceId: 'rec_ev_001',
    linkedEntityRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    slaHours: 48,
    slaRemaining: 46,
    requiresAction: true,
    aiSuggestion: {
      suggestedEntityId: 'SUP-123',
      confidence: 0.95,
      reasoning: 'Exact legal name match with existing canonical supplier record'
    },
    details: {
      reason: 'Supplier mapping suggestion for "Acme Manufacturing GmbH"',
      suggestionIds: ['MSUG-001', 'MSUG-002']
    }
  },
  {
    id: 'WI-CT-002',
    tenantId: ACTIVE_TENANT_ID,
    type: 'CONFLICT',
    status: 'OPEN',
    priority: 'HIGH',
    owner: 'Unassigned',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-02-05T09:00:00Z',
    linkedEvidenceId: 'rec_ev_002',
    linkedEntityRef: { entityType: 'SKU', entityId: 'SKU-456' },
    slaHours: 72,
    slaRemaining: 69,
    requiresAction: true,
    details: {
      reason: 'Country code conflict between data sources',
      field: 'countryCode',
      sources: [
        { evidenceId: 'rec_ev_001', displayId: 'EV-2024-001', value: 'DE', sourceSystem: 'Manual Upload', trustRank: SOURCE_TRUST_RANKS['Manual Upload'], sourceId: 'EV-2024-001' },
        { evidenceId: 'rec_ev_002', displayId: 'EV-2024-002', value: 'FR', sourceSystem: 'SAP S/4HANA', trustRank: SOURCE_TRUST_RANKS['SAP S/4HANA'], sourceId: 'EV-2024-002' }
      ]
    }
  },
  {
    id: 'WI-CT-003',
    tenantId: ACTIVE_TENANT_ID,
    type: 'REVIEW',
    status: 'OPEN',
    priority: 'MEDIUM',
    owner: 'Unassigned',
    createdAt: '2026-02-03T11:00:00Z',
    updatedAt: '2026-02-03T11:00:00Z',
    linkedEvidenceId: 'rec_ev_003',
    linkedEntityRef: { entityType: 'SUPPLIER', entityId: 'SUP-999' },
    slaHours: 96,
    slaRemaining: 24,
    requiresAction: true,
    details: {
      reason: 'Quarantined evidence requires manual review and validation - missing required fields'
    }
  },
  {
    id: 'WI-CT-004',
    tenantId: ACTIVE_TENANT_ID,
    type: 'CONFLICT',
    status: 'BLOCKED',
    priority: 'CRITICAL',
    owner: 'Unassigned',
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-02-01T08:00:00Z',
    linkedEvidenceId: null,
    linkedEntityRef: { entityType: 'SUPPLIER', entityId: 'SUP-999' },
    slaHours: 24,
    slaRemaining: 0,
    requiresAction: true,
    details: {
      reason: 'Missing identity evidence - supplier cannot be validated',
      financialRiskExposure: 75000,
      currency: 'EUR'
    }
  },
  {
    id: 'WI-CT-005',
    tenantId: ACTIVE_TENANT_ID,
    type: 'MAPPING',
    status: 'OPEN',
    priority: 'MEDIUM',
    owner: 'Unassigned',
    createdAt: '2026-01-26T10:00:00Z',
    updatedAt: '2026-01-26T10:00:00Z',
    linkedEvidenceId: 'rec_ev_004',
    linkedEntityRef: { entityType: 'SKU', entityId: 'SKU-456' },
    slaHours: 96,
    slaRemaining: 80,
    requiresAction: true,
    aiSuggestion: {
      suggestedEntityId: 'BOM-001',
      confidence: 0.88,
      reasoning: 'BOM structure matches SKU-456 component breakdown'
    },
    details: {
      reason: 'Map SKU-456 to BOM evidence EV-2024-004'
    }
  }
];

// Mapping Suggestions (seed data)
export const mockMappingSuggestions = [
  {
    id: 'MSUG-001',
    tenantId: ACTIVE_TENANT_ID,
    entityRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    proposedTargetRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    confidence: 95,
    suggestionType: 'EXACT_MATCH',
    modelReason: 'Legal name exact match: "Acme Manufacturing GmbH"',
    reasonCode: 'EXACT_MATCH',
    status: 'PENDING',
    createdAt: '2026-01-16T09:00:00Z'
  },
  {
    id: 'MSUG-002',
    tenantId: ACTIVE_TENANT_ID,
    entityRef: { entityType: 'SUPPLIER', entityId: 'SUP-NEW-001' },
    proposedTargetRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    confidence: 78,
    suggestionType: 'FUZZY_MATCH',
    modelReason: 'Similar name: "Acme Manufacturing" vs "Acme Manufacturing GmbH"',
    reasonCode: 'FUZZY_MATCH',
    status: 'PENDING',
    createdAt: '2026-01-17T11:30:00Z'
  },
  {
    id: 'MSUG-003',
    tenantId: ACTIVE_TENANT_ID,
    entityRef: { entityType: 'SKU', entityId: 'SKU-456' },
    proposedTargetRef: { entityType: 'SKU', entityId: 'SKU-456' },
    confidence: 92,
    suggestionType: 'EXACT_MATCH',
    modelReason: 'SKU code exact match: "WDG-A-001"',
    reasonCode: 'EXACT_MATCH',
    status: 'PENDING',
    createdAt: '2026-01-25T15:00:00Z'
  },
  {
    id: 'MSUG-004',
    tenantId: ACTIVE_TENANT_ID,
    entityRef: { entityType: 'SKU', entityId: 'SKU-789' },
    proposedTargetRef: { entityType: 'SKU', entityId: 'SKU-101' },
    confidence: 65,
    suggestionType: 'FUZZY_MATCH',
    modelReason: 'Similar description and material type',
    reasonCode: 'FUZZY_MATCH',
    status: 'PENDING',
    createdAt: '2026-01-26T10:20:00Z'
  }
];

// Mock Entities
export const mockEntities = {
  suppliers: [
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SUP-123',
      legalName: 'Acme Corp',
      countryCode: 'DE',
      masterConfidence: 0.92,
      mappingStatus: 'MAPPED',
      conflictCount: 1,
      evidenceCount: 2,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: [],
      canonicalFields: { legalName: 'Acme Corp', countryCode: 'DE', vatNumber: 'DE123456789' }
    },
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SUP-999',
      legalName: 'Beta Metals',
      countryCode: null,
      masterConfidence: 0.40,
      mappingStatus: 'UNMAPPED',
      conflictCount: 0,
      evidenceCount: 0,
      quarantinedEvidenceCount: 1,
      missingRequiredFields: ['countryCode', 'vatNumber'],
      canonicalFields: { legalName: 'Beta Metals' }
    },
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SUP-456',
      legalName: 'Global Plastics Inc',
      countryCode: 'US',
      mappingStatus: 'MAPPED',
      conflictCount: 0,
      evidenceCount: 1,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: [],
      canonicalFields: { legalName: 'Global Plastics Inc', countryCode: 'US', supplierCode: 'GP-2001' }
    },
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SUP-789',
      legalName: 'Precision Tools Ltd',
      countryCode: 'GB',
      mappingStatus: 'UNMAPPED',
      conflictCount: 0,
      evidenceCount: 0,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: ['vatNumber', 'primaryContact'],
      canonicalFields: { legalName: 'Precision Tools Ltd', countryCode: 'GB' }
    }
  ],
  skus: [
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SKU-456',
      name: 'Steel Rod 10mm',
      skuCode: 'WDG-A-001',
      hsCode: '7215',
      annualSpendEur: 500000,
      mappingStatus: 'MAPPED',
      conflictCount: 1,
      evidenceCount: 2,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: [],
      canonicalFields: { name: 'Steel Rod 10mm', skuCode: 'WDG-A-001', hsCode: '7215', weight: 2.5, weightUnit: 'kg' }
    },
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SKU-789',
      name: 'Critical Part X',
      skuCode: 'CPX-789',
      mappingStatus: 'UNMAPPED',
      conflictCount: 0,
      evidenceCount: 0,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: ['manufacturer', 'material_composition'],
      canonicalFields: { name: 'Critical Part X', skuCode: 'CPX-789' }
    },
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SKU-101',
      name: 'Steel Rod 10mm',
      skuCode: 'SR-10MM-01',
      mappingStatus: 'MAPPED',
      conflictCount: 0,
      evidenceCount: 1,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: [],
      canonicalFields: { name: 'Steel Rod 10mm', skuCode: 'SR-10MM-01', weight: 0.5, weightUnit: 'kg' }
    }
  ],
  boms: [
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'BOM-001',
      name: 'Widget Assembly BOM',
      parentSKU: 'SKU-456',
      version: '1.2',
      mappingStatus: 'MAPPED',
      conflictCount: 0,
      evidenceCount: 1,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: [],
      canonicalFields: { name: 'Widget Assembly BOM', version: '1.2' },
      lineItems: [
        { lineId: 'L001', componentSKU: 'SKU-101', quantity: 2, unit: 'pieces' },
        { lineId: 'L002', componentSKU: 'SKU-789', quantity: 4, unit: 'pieces' },
        { lineId: 'L003', componentSKU: 'SKU-456', quantity: 1, unit: 'assembly' }
      ]
    },
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'BOM-002',
      name: 'Subassembly X BOM',
      parentSKU: 'SKU-789',
      version: '2.0',
      mappingStatus: 'PENDING',
      conflictCount: 1,
      evidenceCount: 0,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: ['lineItems'],
      canonicalFields: { name: 'Subassembly X BOM', version: '2.0' },
      lineItems: []
    }
  ]
};

// Decisions storage (append-only)
export const mockDecisions = [
  {
    id: 'DEC-00001',
    tenantId: ACTIVE_TENANT_ID,
    workItemId: null,
    entityRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    decisionType: 'DATA_QUALITY_VERIFIED',
    reasonCode: 'EXACT_MATCH',
    comment: 'Legal name matches across all sources',
    createdBy: 'reviewer@emissioncore.io',
    createdAt: '2026-01-16T10:00:00Z'
  },
  {
    id: 'DEC-00002',
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-003',
    entityRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    decisionType: 'MAP_APPROVE',
    reasonCode: 'HIGH_CONFIDENCE_MATCH',
    comment: 'AI suggestion approved after manual verification',
    createdBy: 'info@emissioncore.io',
    createdAt: '2026-01-18T14:30:00Z'
  },
  {
    id: 'DEC-00003',
    tenantId: ACTIVE_TENANT_ID,
    workItemId: null,
    entityRef: { entityType: 'SKU', entityId: 'SKU-456' },
    decisionType: 'EXTRACTION_VERIFIED',
    reasonCode: 'DATA_QUALITY_VERIFIED',
    comment: 'BOM weight data extracted successfully',
    createdBy: 'system@emissioncore.io',
    createdAt: '2026-01-25T16:45:00Z'
  }
];

// Audit Events (append-only log for Evidence Vault review history)
export const mockAuditEvents = [
  {
    id: 'AE-001',
    tenantId: ACTIVE_TENANT_ID,
    eventType: 'EVIDENCE_SEALED',
    objectType: 'EVIDENCE',
    objectId: 'rec_ev_001',
    actor: 'info@emissioncore.io',
    timestamp: '2026-01-15T10:31:00Z',
    details: { action: 'SEAL', reason: 'Supplier master data validated' }
  },
  {
    id: 'AE-002',
    tenantId: ACTIVE_TENANT_ID,
    eventType: 'EVIDENCE_INGESTED',
    objectType: 'EVIDENCE',
    objectId: 'rec_ev_002',
    actor: 'system@emissioncore.io',
    timestamp: '2026-01-20T14:16:00Z',
    details: { action: 'INGEST', sourceSystem: 'SAP S/4HANA' }
  },
  {
    id: 'AE-003',
    tenantId: ACTIVE_TENANT_ID,
    eventType: 'EVIDENCE_QUARANTINED',
    objectType: 'EVIDENCE',
    objectId: 'rec_ev_003',
    actor: 'system@emissioncore.io',
    timestamp: '2026-01-22T09:46:00Z',
    details: { action: 'QUARANTINE', reason: 'Missing required field: invoiceDate' }
  },
  {
    id: 'AE-004',
    tenantId: ACTIVE_TENANT_ID,
    eventType: 'WORK_ITEM_CREATED',
    objectType: 'WORK_ITEM',
    objectId: 'WI-004',
    actor: 'system@emissioncore.io',
    timestamp: '2026-01-21T09:01:00Z',
    details: { action: 'CREATE', type: 'CONFLICT', reason: 'Country code mismatch detected' }
  },
  {
    id: 'AE-005',
    tenantId: ACTIVE_TENANT_ID,
    eventType: 'DECISION_LOGGED',
    objectType: 'DECISION',
    objectId: 'DEC-00002',
    actor: 'info@emissioncore.io',
    timestamp: '2026-01-18T14:30:00Z',
    details: { action: 'APPROVE', decisionType: 'MAP_APPROVE' }
  },
  {
    id: 'AE-006',
    tenantId: ACTIVE_TENANT_ID,
    eventType: 'EVIDENCE_SEALED',
    objectType: 'EVIDENCE',
    objectId: 'rec_ev_004',
    actor: 'info@emissioncore.io',
    timestamp: '2026-01-25T16:21:00Z',
    details: { action: 'SEAL', reason: 'BOM data complete and validated' }
  }
];

// Idempotency tracking
export const idempotencyStore = new Set();
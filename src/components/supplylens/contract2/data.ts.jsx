// Contract 2 Mock Data: Deterministic, tenant-scoped, realistic evidence and work items

import { idGen, mockHash, calculateRetentionEnd, getTrustRank } from './utils';

export const ACTIVE_TENANT_ID = 'tenant_emissioncore_demo';

// Evidence Records (6 diverse records as per spec)
export const mockEvidenceRecords = [
  {
    tenantId: ACTIVE_TENANT_ID,
    recordId: idGen.uuid(),
    displayId: 'EV-2024-001',
    datasetType: 'Supplier Master',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Manual Upload',
    ingestedBy: 'admin@emissioncore.com',
    createdBy: 'admin@emissioncore.com',
    ingestedAtUtc: '2026-01-15T10:30:00Z',
    retentionEndsUtc: calculateRetentionEnd(),
    sealedStatus: 'SEALED',
    status: 'INGESTED',
    payloadHashSha256: mockHash('supplier_master_001'),
    metadataHashSha256: mockHash('metadata_001'),
    mapStatus: 'MAPPED',
    readinessImpact: 'READY',
    linkedEntityRefs: [{ entityType: 'SUPPLIER', entityId: 'SUP-123' }],
    canonicalPayload: { legalName: 'Acme Manufacturing GmbH', countryCode: 'DE', vatNumber: 'DE123456789' }
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    recordId: idGen.uuid(),
    displayId: 'EV-2024-002',
    datasetType: 'ERP Sync',
    ingestionMethod: 'API_PUSH',
    sourceSystem: 'SAP S/4HANA',
    ingestedBy: 'system@sap-connector',
    createdBy: 'system@sap-connector',
    ingestedAtUtc: '2026-01-20T14:15:00Z',
    retentionEndsUtc: calculateRetentionEnd(),
    sealedStatus: 'SEALED',
    status: 'INGESTED',
    payloadHashSha256: mockHash('erp_sync_002'),
    metadataHashSha256: mockHash('metadata_002'),
    mapStatus: 'MAPPED',
    readinessImpact: 'READY',
    linkedEntityRefs: [{ entityType: 'SUPPLIER', entityId: 'SUP-123' }],
    canonicalPayload: { legalName: 'Acme Manufacturing', countryCode: 'FR', supplierCode: 'SAP-10023' }
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    recordId: idGen.uuid(),
    displayId: 'EV-2024-003',
    datasetType: 'Bill of Materials',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Excel Import',
    ingestedBy: 'procurement@emissioncore.com',
    createdBy: 'procurement@emissioncore.com',
    ingestedAtUtc: '2026-01-22T09:45:00Z',
    retentionEndsUtc: calculateRetentionEnd(),
    sealedStatus: 'QUARANTINED',
    status: 'QUARANTINED',
    payloadHashSha256: mockHash('bom_003'),
    metadataHashSha256: mockHash('metadata_003'),
    mapStatus: 'PENDING',
    readinessImpact: 'NOT_READY',
    quarantineReason: 'Missing required field: partNumber',
    linkedEntityRefs: [],
    canonicalPayload: { bomName: 'Widget Assembly A', items: [] }
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    recordId: idGen.uuid(),
    displayId: 'EV-2024-004',
    datasetType: 'Invoice',
    ingestionMethod: 'SUPPLIER_PORTAL',
    sourceSystem: 'Supplier Portal',
    ingestedBy: 'supplier@acme.com',
    createdBy: 'supplier@acme.com',
    ingestedAtUtc: '2026-01-25T16:20:00Z',
    retentionEndsUtc: calculateRetentionEnd(),
    sealedStatus: 'SEALED',
    status: 'INGESTED',
    payloadHashSha256: mockHash('invoice_004'),
    metadataHashSha256: mockHash('metadata_004'),
    mapStatus: 'MAPPED',
    readinessImpact: 'READY',
    linkedEntityRefs: [{ entityType: 'SUPPLIER', entityId: 'SUP-123' }, { entityType: 'SKU', entityId: 'SKU-456' }],
    canonicalPayload: { invoiceNumber: 'INV-2024-0045', amount: 15000, currency: 'EUR' }
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    recordId: idGen.uuid(),
    displayId: 'EV-2024-005',
    datasetType: 'PCF/LCA Payload',
    ingestionMethod: 'API_PUSH',
    sourceSystem: 'Carbon Analytics API',
    ingestedBy: 'system@carbon-api',
    createdBy: 'system@carbon-api',
    ingestedAtUtc: '2026-01-28T11:00:00Z',
    retentionEndsUtc: calculateRetentionEnd(),
    sealedStatus: 'SEALED',
    status: 'INGESTED',
    payloadHashSha256: mockHash('pcf_005'),
    metadataHashSha256: mockHash('metadata_005'),
    mapStatus: 'MAPPED',
    readinessImpact: 'READY',
    linkedEntityRefs: [{ entityType: 'SKU', entityId: 'SKU-456' }],
    canonicalPayload: { productId: 'SKU-456', carbonFootprint: 12.5, unit: 'kgCO2e' }
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    recordId: idGen.uuid(),
    displayId: 'EV-2024-006',
    datasetType: 'CBAM Supplier Declaration',
    ingestionMethod: 'FILE_UPLOAD',
    sourceSystem: 'Manual Upload',
    ingestedBy: 'compliance@emissioncore.com',
    createdBy: 'compliance@emissioncore.com',
    ingestedAtUtc: '2026-02-01T13:30:00Z',
    retentionEndsUtc: calculateRetentionEnd(),
    sealedStatus: 'SEALED',
    status: 'INGESTED',
    payloadHashSha256: mockHash('cbam_006'),
    metadataHashSha256: mockHash('metadata_006'),
    mapStatus: 'MAPPED',
    readinessImpact: 'READY_WITH_GAPS',
    linkedEntityRefs: [{ entityType: 'SUPPLIER', entityId: 'SUP-456' }],
    canonicalPayload: { supplierId: 'SUP-456', declarationType: 'CBAM', emissionsTotal: 450.2 }
  }
];

// Work Items (10 diverse items across types)
export const mockWorkItems = [
  {
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-001',
    type: 'CONFLICT',
    status: 'OPEN',
    priority: 'HIGH',
    slaHours: 24,
    owner: 'admin@emissioncore.com',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
    linkedEvidenceIds: ['EV-2024-001', 'EV-2024-002'],
    linkedEntityRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    conflictDetails: {
      field: 'countryCode',
      sources: [
        { sourceId: 'EV-2024-001', value: 'DE', trustRank: getTrustRank('FILE_UPLOAD') },
        { sourceId: 'EV-2024-002', value: 'FR', trustRank: getTrustRank('API_PUSH') }
      ]
    },
    auditTrail: [
      { event: 'CREATED', actor: 'system@readiness-engine', timestamp: '2026-02-01T10:00:00Z', details: 'Conflict detected on countryCode' }
    ]
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-002',
    type: 'REVIEW',
    status: 'OPEN',
    priority: 'CRITICAL',
    slaHours: 12,
    owner: 'Unassigned',
    createdAt: '2026-01-22T09:50:00Z',
    updatedAt: '2026-01-22T09:50:00Z',
    linkedEvidenceIds: ['EV-2024-003'],
    linkedEntityRef: null,
    quarantineReason: 'Missing required field: partNumber',
    auditTrail: [
      { event: 'CREATED', actor: 'system@quarantine-detector', timestamp: '2026-01-22T09:50:00Z', details: 'Evidence quarantined' }
    ]
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-003',
    type: 'MAPPING',
    status: 'OPEN',
    priority: 'MEDIUM',
    slaHours: 48,
    owner: 'ai-agent@mapping',
    createdAt: '2026-02-02T14:00:00Z',
    updatedAt: '2026-02-02T14:00:00Z',
    linkedEvidenceIds: ['EV-2024-004'],
    linkedEntityRef: { entityType: 'SKU', entityId: 'SKU-456' },
    aiSuggestion: { suggestedEntityId: 'SKU-456', confidence: 0.92, reasoning: 'Invoice line item matched SKU code' },
    auditTrail: [
      { event: 'CREATED', actor: 'system@mapping-engine', timestamp: '2026-02-02T14:00:00Z', details: 'AI proposed mapping' },
      { event: 'AI_SUGGESTED', actor: 'ai-agent@mapping', timestamp: '2026-02-02T14:05:00Z', details: 'Confidence 92%' }
    ]
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-004',
    type: 'EXTRACTION',
    status: 'OPEN',
    priority: 'MEDIUM',
    slaHours: 72,
    owner: 'ai-agent@extraction',
    createdAt: '2026-01-30T11:00:00Z',
    updatedAt: '2026-01-30T11:00:00Z',
    linkedEvidenceIds: ['EV-2024-005'],
    linkedEntityRef: null,
    auditTrail: [
      { event: 'CREATED', actor: 'system@extraction-engine', timestamp: '2026-01-30T11:00:00Z', details: 'Extraction incomplete' }
    ]
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-005',
    type: 'BLOCKED',
    status: 'BLOCKED',
    priority: 'CRITICAL',
    slaHours: 6,
    owner: 'admin@emissioncore.com',
    createdAt: '2026-02-03T08:00:00Z',
    updatedAt: '2026-02-03T08:00:00Z',
    linkedEvidenceIds: ['EV-2024-006'],
    linkedEntityRef: { entityType: 'SUPPLIER', entityId: 'SUP-456' },
    blockReason: 'Missing CBAM certificate verification',
    auditTrail: [
      { event: 'CREATED', actor: 'system@compliance-check', timestamp: '2026-02-03T08:00:00Z', details: 'Blocked: missing cert' }
    ]
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-006',
    type: 'FOLLOW_UP',
    status: 'OPEN',
    priority: 'MEDIUM',
    slaHours: 48,
    owner: 'procurement@emissioncore.com',
    createdAt: '2026-02-04T10:00:00Z',
    updatedAt: '2026-02-04T10:00:00Z',
    linkedEvidenceIds: ['EV-2024-001'],
    linkedEntityRef: { entityType: 'SUPPLIER', entityId: 'SUP-123' },
    parentWorkItemId: 'WI-001',
    followUpReason: 'Verify supplier legal name discrepancy',
    auditTrail: [
      { event: 'CREATED', actor: 'admin@emissioncore.com', timestamp: '2026-02-04T10:00:00Z', details: 'Follow-up created from WI-001' }
    ]
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-007',
    type: 'REVIEW',
    status: 'OPEN',
    priority: 'MEDIUM',
    slaHours: 36,
    owner: 'Unassigned',
    createdAt: '2026-02-02T16:00:00Z',
    updatedAt: '2026-02-02T16:00:00Z',
    linkedEvidenceIds: ['EV-2024-004'],
    linkedEntityRef: null,
    auditTrail: [
      { event: 'CREATED', actor: 'system@review-trigger', timestamp: '2026-02-02T16:00:00Z', details: 'Manual review required' }
    ]
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-008',
    type: 'CONFLICT',
    status: 'RESOLVED',
    priority: 'HIGH',
    slaHours: 24,
    owner: 'admin@emissioncore.com',
    createdAt: '2026-01-28T09:00:00Z',
    updatedAt: '2026-01-29T14:00:00Z',
    linkedEvidenceIds: ['EV-2024-005', 'EV-2024-004'],
    linkedEntityRef: { entityType: 'SKU', entityId: 'SKU-456' },
    resolutionStrategy: 'PREFER_TRUSTED_SYSTEM',
    resolvedValue: 'SKU-456-A',
    auditTrail: [
      { event: 'CREATED', actor: 'system@conflict-detector', timestamp: '2026-01-28T09:00:00Z', details: 'SKU code conflict' },
      { event: 'RESOLVED', actor: 'admin@emissioncore.com', timestamp: '2026-01-29T14:00:00Z', details: 'Resolved: PREFER_TRUSTED_SYSTEM' }
    ]
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-009',
    type: 'MAPPING',
    status: 'OPEN',
    priority: 'HIGH',
    slaHours: 24,
    owner: 'Unassigned',
    createdAt: '2026-02-05T08:00:00Z',
    updatedAt: '2026-02-05T08:00:00Z',
    linkedEvidenceIds: ['EV-2024-006'],
    linkedEntityRef: null,
    aiSuggestion: { suggestedEntityId: 'SUP-456', confidence: 0.88, reasoning: 'CBAM declaration supplier name match' },
    auditTrail: [
      { event: 'CREATED', actor: 'system@mapping-engine', timestamp: '2026-02-05T08:00:00Z', details: 'New supplier mapping needed' }
    ]
  },
  {
    tenantId: ACTIVE_TENANT_ID,
    workItemId: 'WI-010',
    type: 'BLOCKED',
    status: 'BLOCKED',
    priority: 'HIGH',
    slaHours: 12,
    owner: 'compliance@emissioncore.com',
    createdAt: '2026-02-04T15:00:00Z',
    updatedAt: '2026-02-04T15:00:00Z',
    linkedEvidenceIds: ['EV-2024-003'],
    linkedEntityRef: null,
    blockReason: 'BOM validation failed - missing critical components',
    auditTrail: [
      { event: 'CREATED', actor: 'system@validation-engine', timestamp: '2026-02-04T15:00:00Z', details: 'BOM incomplete' }
    ]
  }
];

// Mock Entities
export const mockEntities = {
  suppliers: [
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SUP-123',
      legalName: 'Acme Manufacturing GmbH',
      countryCode: 'DE',
      mappingStatus: 'MAPPED',
      conflictCount: 1,
      evidenceCount: 3,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: [],
      canonicalFields: { legalName: 'Acme Manufacturing GmbH', countryCode: 'DE', vatNumber: 'DE123456789' }
    },
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SUP-456',
      legalName: 'Global Parts Ltd',
      countryCode: 'GB',
      mappingStatus: 'MAPPED',
      conflictCount: 0,
      evidenceCount: 1,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: ['vatNumber'],
      canonicalFields: { legalName: 'Global Parts Ltd', countryCode: 'GB' }
    }
  ],
  skus: [
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SKU-456',
      name: 'Widget A',
      skuCode: 'WDG-A-001',
      mappingStatus: 'MAPPED',
      conflictCount: 0,
      evidenceCount: 2,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: [],
      canonicalFields: { name: 'Widget A', skuCode: 'WDG-A-001', category: 'Components' }
    },
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'SKU-999',
      name: 'Gadget B',
      skuCode: 'GDG-B-002',
      mappingStatus: 'PENDING',
      conflictCount: 0,
      evidenceCount: 0,
      quarantinedEvidenceCount: 0,
      missingRequiredFields: ['manufacturer'],
      canonicalFields: { name: 'Gadget B', skuCode: 'GDG-B-002' }
    }
  ],
  boms: [
    {
      tenantId: ACTIVE_TENANT_ID,
      entityId: 'BOM-778',
      bomName: 'Widget Assembly A',
      mappingStatus: 'PENDING',
      conflictCount: 0,
      evidenceCount: 1,
      quarantinedEvidenceCount: 1,
      missingRequiredFields: ['partNumber'],
      canonicalFields: { bomName: 'Widget Assembly A', items: [] }
    }
  ]
};

// Decision Receipts storage
export const mockDecisionReceipts = [];

// Idempotency tracking
export const idempotencyStore = new Set();
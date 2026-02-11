// Contract 2 Mock Data - Deterministic, tenant-scoped, demoable
// Last updated: 2026-02-05

export const ACTIVE_TENANT_ID = "EmissionCore Demo";

// Evidence Records
export const mockEvidenceRecords = [
  {
    id: "rec_001_uuid_a1b2c3d4e5f6",
    recordId: "rec_001_uuid_a1b2c3d4e5f6",
    displayId: "EV-2024-001",
    evidence_id: "EV-2024-001",
    tenantId: ACTIVE_TENANT_ID,
    dataset_type: "SUPPLIER_MASTER",
    ledger_state: "SEALED",
    ingestion_method: "MANUAL_ENTRY",
    source_system: "SupplyLens Portal",
    ingestedBy: "admin@emissioncore.com",
    ingestion_timestamp_utc: "2024-12-15T10:30:00Z",
    ingestedAtUtc: "2024-12-15T10:30:00Z",
    sealedStatus: "SEALED",
    data_mode: "LIVE",
    payloadHash: "sha256_abc123def456",
    metadataHash: "sha256_meta789xyz",
    canonical_payload: {
      supplier_name: "Acme Manufacturing Ltd",
      country_code: "DE",
      primary_contact_email: "contact@acme-mfg.de",
      vat_number: "DE123456789",
      legal_name: "Acme Manufacturing Limited"
    },
    binding_context: {
      scope: "SUPPLIER",
      entity_type: "Supplier",
      entity_id: "supplier_acme_001"
    },
    provenance: {
      created_by: "admin@emissioncore.com",
      source_method: "MANUAL_ENTRY",
      ingestion_timestamp: "2024-12-15T10:30:00Z"
    },
    file_attachments: [],
    extraction_job_ids: ["extract_001"],
    mapping_session_ids: ["map_001"],
    decision_ids: ["dec_001"]
  },
  {
    id: "rec_002_uuid_b2c3d4e5f6g7",
    recordId: "rec_002_uuid_b2c3d4e5f6g7",
    displayId: "EV-2024-002",
    evidence_id: "EV-2024-002",
    tenantId: ACTIVE_TENANT_ID,
    dataset_type: "SKU_MASTER",
    ledger_state: "SEALED",
    ingestion_method: "FILE_UPLOAD",
    source_system: "ERP Export",
    ingestedBy: "system@emissioncore.com",
    ingestion_timestamp_utc: "2024-12-16T14:20:00Z",
    ingestedAtUtc: "2024-12-16T14:20:00Z",
    sealedStatus: "SEALED",
    data_mode: "LIVE",
    payloadHash: "sha256_def456ghi789",
    metadataHash: "sha256_meta456abc",
    canonical_payload: {
      sku_code: "SKU-1001",
      name: "Steel Beam 300mm",
      description: "High-grade structural steel beam",
      category: "Construction Materials",
      sku_number: "STL-BEAM-300"
    },
    binding_context: {
      scope: "SKU",
      entity_type: "SKU",
      entity_id: "sku_stl_beam_001"
    },
    provenance: {
      created_by: "system@emissioncore.com",
      source_method: "FILE_UPLOAD",
      ingestion_timestamp: "2024-12-16T14:20:00Z"
    },
    file_attachments: [
      { file_name: "sku_export_2024_12_16.xlsx", file_url: "/files/sku_export.xlsx" }
    ],
    extraction_job_ids: ["extract_002"],
    mapping_session_ids: ["map_002"],
    decision_ids: []
  },
  {
    id: "rec_003_uuid_c3d4e5f6g7h8",
    recordId: "rec_003_uuid_c3d4e5f6g7h8",
    displayId: "EV-2024-003",
    evidence_id: "EV-2024-003",
    tenantId: ACTIVE_TENANT_ID,
    dataset_type: "BOM",
    ledger_state: "INGESTED",
    ingestion_method: "API_PUSH",
    source_system: "SAP ERP",
    ingestedBy: "erp_connector@emissioncore.com",
    ingestion_timestamp_utc: "2024-12-17T09:15:00Z",
    ingestedAtUtc: "2024-12-17T09:15:00Z",
    sealedStatus: "INGESTED",
    data_mode: "LIVE",
    payloadHash: "sha256_ghi789jkl012",
    metadataHash: "sha256_meta789def",
    canonical_payload: {
      product_id: "PROD-2024-A",
      bom_lines: [
        { component_sku: "SKU-1001", quantity: 5 },
        { component_sku: "SKU-1002", quantity: 10 }
      ]
    },
    binding_context: {
      scope: "BOM",
      entity_type: "BOM",
      entity_id: "bom_prod_a_001"
    },
    provenance: {
      created_by: "erp_connector@emissioncore.com",
      source_method: "API_PUSH",
      ingestion_timestamp: "2024-12-17T09:15:00Z"
    },
    file_attachments: [],
    extraction_job_ids: [],
    mapping_session_ids: ["map_003"],
    decision_ids: []
  },
  {
    id: "rec_004_uuid_d4e5f6g7h8i9",
    recordId: "rec_004_uuid_d4e5f6g7h8i9",
    displayId: "EV-2025-001",
    evidence_id: "EV-2025-001",
    tenantId: ACTIVE_TENANT_ID,
    dataset_type: "SUPPLIER_MASTER",
    ledger_state: "SEALED",
    ingestion_method: "SUPPLIER_PORTAL",
    source_system: "Supplier Self-Service",
    ingestedBy: "supplier@techparts.com",
    ingestion_timestamp_utc: "2025-01-10T11:45:00Z",
    ingestedAtUtc: "2025-01-10T11:45:00Z",
    sealedStatus: "SEALED",
    data_mode: "LIVE",
    payloadHash: "sha256_jkl012mno345",
    metadataHash: "sha256_meta012ghi",
    canonical_payload: {
      supplier_name: "TechParts Global",
      country_code: "CN",
      primary_contact_email: "info@techparts.com",
      vat_number: null,
      legal_name: "TechParts Global Ltd"
    },
    binding_context: {
      scope: "SUPPLIER",
      entity_type: "Supplier",
      entity_id: "supplier_techparts_001"
    },
    provenance: {
      created_by: "supplier@techparts.com",
      source_method: "SUPPLIER_PORTAL",
      ingestion_timestamp: "2025-01-10T11:45:00Z"
    },
    file_attachments: [],
    extraction_job_ids: ["extract_003"],
    mapping_session_ids: [],
    decision_ids: ["dec_002"]
  },
  {
    id: "rec_005_uuid_e5f6g7h8i9j0",
    recordId: "rec_005_uuid_e5f6g7h8i9j0",
    displayId: "EV-2025-002",
    evidence_id: "EV-2025-002",
    tenantId: "Other Tenant Inc",
    dataset_type: "SUPPLIER_MASTER",
    ledger_state: "SEALED",
    ingestion_method: "MANUAL_ENTRY",
    source_system: "Other System",
    ingestedBy: "other@othertenant.com",
    ingestion_timestamp_utc: "2025-01-15T08:00:00Z",
    ingestedAtUtc: "2025-01-15T08:00:00Z",
    sealedStatus: "SEALED",
    data_mode: "LIVE",
    payloadHash: "sha256_other123",
    metadataHash: "sha256_other456",
    canonical_payload: {
      supplier_name: "Other Supplier",
      country_code: "US",
      primary_contact_email: "other@supplier.com"
    },
    binding_context: {
      scope: "SUPPLIER",
      entity_type: "Supplier",
      entity_id: "supplier_other_001"
    },
    provenance: {
      created_by: "other@othertenant.com",
      source_method: "MANUAL_ENTRY",
      ingestion_timestamp: "2025-01-15T08:00:00Z"
    },
    file_attachments: [],
    extraction_job_ids: [],
    mapping_session_ids: [],
    decision_ids: []
  }
];

// Work Items
export const mockWorkItems = [
  {
    id: "wi_001",
    work_item_id: "WI-20241215-0001",
    type: "REVIEW",
    status: "OPEN",
    priority: "HIGH",
    owner: "admin@emissioncore.com",
    created_at: "2024-12-15T10:45:00Z",
    updated_at: "2024-12-15T10:45:00Z",
    updated_by: "admin@emissioncore.com",
    evidence_id: "EV-2024-001",
    linked_evidence_id: "rec_001_uuid_a1b2c3d4e5f6",
    entity_type: "SUPPLIER",
    entity_id: "supplier_acme_001",
    linkedEvidence: {
      displayId: "EV-2024-001",
      recordId: "rec_001_uuid_a1b2c3d4e5f6"
    },
    linkedEntity: {
      type: "SUPPLIER",
      id: "supplier_acme_001",
      name: "Acme Manufacturing Ltd"
    },
    requiredAction: {
      type: "REVIEW",
      description: "Review supplier master data for completeness",
      fields: ["vat_number", "legal_name", "primary_contact_email"]
    },
    auditTrail: [
      {
        timestamp: "2024-12-15T10:45:00Z",
        action: "CREATED",
        user: "admin@emissioncore.com"
      }
    ],
    tags: ["supplier_onboarding", "manual_review"]
  },
  {
    id: "wi_002",
    work_item_id: "WI-20241216-0001",
    type: "EXTRACTION",
    status: "DONE",
    priority: "MEDIUM",
    owner: "AI Assistant",
    created_at: "2024-12-16T14:30:00Z",
    updated_at: "2024-12-16T15:00:00Z",
    updated_by: "AI Assistant",
    evidence_id: "EV-2024-002",
    linked_evidence_id: "rec_002_uuid_b2c3d4e5f6g7",
    entity_type: "SKU",
    entity_id: "sku_stl_beam_001",
    linkedEvidence: {
      displayId: "EV-2024-002",
      recordId: "rec_002_uuid_b2c3d4e5f6g7"
    },
    linkedEntity: {
      type: "SKU",
      id: "sku_stl_beam_001",
      name: "Steel Beam 300mm"
    },
    requiredAction: {
      type: "EXTRACTION",
      description: "Extract SKU data from uploaded spreadsheet",
      fields: ["sku_code", "name", "description", "category"],
      extraction_status: "COMPLETED"
    },
    auditTrail: [
      {
        timestamp: "2024-12-16T14:30:00Z",
        action: "CREATED",
        user: "system@emissioncore.com"
      },
      {
        timestamp: "2024-12-16T15:00:00Z",
        action: "RESOLVED",
        user: "AI Assistant",
        decision: "Extraction completed successfully"
      }
    ],
    tags: ["sku_import", "automated"]
  },
  {
    id: "wi_003",
    work_item_id: "WI-20241217-0001",
    type: "MAPPING",
    status: "IN_PROGRESS",
    priority: "HIGH",
    owner: "admin@emissioncore.com",
    created_at: "2024-12-17T09:30:00Z",
    updated_at: "2024-12-17T10:00:00Z",
    updated_by: "admin@emissioncore.com",
    evidence_id: "EV-2024-003",
    linked_evidence_id: "rec_003_uuid_c3d4e5f6g7h8",
    entity_type: "BOM",
    entity_id: "bom_prod_a_001",
    linkedEvidence: {
      displayId: "EV-2024-003",
      recordId: "rec_003_uuid_c3d4e5f6g7h8"
    },
    linkedEntity: {
      type: "BOM",
      id: "bom_prod_a_001",
      name: "Product A BOM"
    },
    requiredAction: {
      type: "MAPPING",
      description: "Map BOM components to SKU master data",
      suggested_mappings: [
        { source: "SKU-1001", target: "sku_stl_beam_001", confidence: 0.95 },
        { source: "SKU-1002", target: "sku_unknown", confidence: 0.45 }
      ]
    },
    auditTrail: [
      {
        timestamp: "2024-12-17T09:30:00Z",
        action: "CREATED",
        user: "system@emissioncore.com"
      },
      {
        timestamp: "2024-12-17T10:00:00Z",
        action: "STARTED",
        user: "admin@emissioncore.com"
      }
    ],
    tags: ["bom_mapping", "requires_attention"]
  },
  {
    id: "wi_004",
    work_item_id: "WI-20250110-0001",
    type: "CONFLICT",
    status: "OPEN",
    priority: "CRITICAL",
    owner: "admin@emissioncore.com",
    created_at: "2025-01-10T12:00:00Z",
    updated_at: "2025-01-10T12:00:00Z",
    updated_by: "system@emissioncore.com",
    evidence_id: "EV-2025-001",
    linked_evidence_id: "rec_004_uuid_d4e5f6g7h8i9",
    entity_type: "SUPPLIER",
    entity_id: "supplier_techparts_001",
    conflict_field: "vat_number",
    conflict_value_a: "CN123456789",
    conflict_value_b: null,
    conflict_source_a_evidence_id: "EV-2024-001",
    conflict_source_b_evidence_id: "EV-2025-001",
    linkedEvidence: {
      displayId: "EV-2025-001",
      recordId: "rec_004_uuid_d4e5f6g7h8i9"
    },
    linkedEntity: {
      type: "SUPPLIER",
      id: "supplier_techparts_001",
      name: "TechParts Global"
    },
    requiredAction: {
      type: "CONFLICT",
      description: "Resolve conflicting VAT number values",
      conflict_details: {
        field: "vat_number",
        value_a: "CN123456789",
        value_b: null,
        source_a: "ERP Export",
        source_b: "Supplier Portal"
      }
    },
    auditTrail: [
      {
        timestamp: "2025-01-10T12:00:00Z",
        action: "CREATED",
        user: "system@emissioncore.com"
      }
    ],
    tags: ["conflict_resolution", "data_quality"]
  }
];

// Entities
export const mockSuppliers = [
  {
    id: "supplier_acme_001",
    supplier_id: "supplier_acme_001",
    legal_name: "Acme Manufacturing Ltd",
    country_code: "DE",
    primary_contact_email: "contact@acme-mfg.de",
    vat_number: "DE123456789",
    supplier_status: "active",
    evidence_links: ["EV-2024-001"]
  },
  {
    id: "supplier_techparts_001",
    supplier_id: "supplier_techparts_001",
    legal_name: "TechParts Global Ltd",
    country_code: "CN",
    primary_contact_email: "info@techparts.com",
    vat_number: null,
    supplier_status: "incomplete",
    evidence_links: ["EV-2025-001"]
  }
];

export const mockSKUs = [
  {
    id: "sku_stl_beam_001",
    sku_code: "SKU-1001",
    name: "Steel Beam 300mm",
    description: "High-grade structural steel beam",
    category: "Construction Materials",
    sku_number: "STL-BEAM-300",
    active: true,
    evidence_links: ["EV-2024-002"]
  }
];

export const mockEntities = {
  suppliers: mockSuppliers,
  skus: mockSKUs
};

// Helper functions
export function getEvidenceByDisplayId(displayId, tenantId = ACTIVE_TENANT_ID) {
  return mockEvidenceRecords.find(
    r => r.displayId.toLowerCase() === displayId.toLowerCase() && r.tenantId === tenantId
  );
}

export function getEvidenceRecordsByTenant(tenantId = ACTIVE_TENANT_ID) {
  return mockEvidenceRecords.filter(r => r.tenantId === tenantId);
}

export function getWorkItemsByTenant(tenantId = ACTIVE_TENANT_ID) {
  return mockWorkItems.filter(wi => {
    const evidence = mockEvidenceRecords.find(e => e.id === wi.linked_evidence_id);
    return evidence?.tenantId === tenantId;
  });
}

export function findClosestMatches(displayId, limit = 3) {
  // Simple fuzzy match - find similar display IDs
  return mockEvidenceRecords
    .filter(r => r.tenantId === ACTIVE_TENANT_ID)
    .map(r => ({
      record: r,
      similarity: calculateSimilarity(displayId.toLowerCase(), r.displayId.toLowerCase())
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(m => m.record);
}

function calculateSimilarity(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Date formatter with fallback
export function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  } catch {
    return "—";
  }
}

export function formatDateShort(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  } catch {
    return "—";
  }
}
/**
 * CONTRACT 2 SEED DATA – Dev only
 * 4 deterministic evidence records for testing Evidence Vault
 */

export const seedEvidenceRecords = [
  {
    id: 'rec-ev-001-uuid-stable',
    evidence_id: 'EV-2024-001',
    display_id: 'EV-2024-001',
    dataset_type: 'SUPPLIER_MASTER',
    ledger_state: 'SEALED',
    ingestion_method: 'FILE_UPLOAD',
    source_system: 'OTHER',
    tenant_id: 'DEFAULT',
    created_by: 'info@emissioncore.io',
    ingestion_timestamp_utc: '2026-02-01T10:00:00Z',
    data_mode: 'LIVE',
    origin: 'INGESTED',
    payload_hash: 'sha256:abcd1234ef5678',
    metadata_hash: 'sha256:hash9999aabbcc',
    retention_ends_at_utc: '2028-02-01T10:00:00Z',
    linked_entity_type: 'Supplier',
    linked_entity_id: 'SUP-123',
    tags: ['test-supplier', 'sealed'],
    canonical_payload: {
      supplier_id: 'SUP-123',
      legal_name: 'Acme Corp',
      country_code: 'DE'
    }
  },
  {
    id: 'rec-ev-002-uuid-stable',
    evidence_id: 'EV-2024-002',
    display_id: 'EV-2024-002',
    dataset_type: 'ERP_SYNC',
    ledger_state: 'INGESTED',
    ingestion_method: 'ERP_API',
    source_system: 'ERP',
    tenant_id: 'DEFAULT',
    created_by: 'info@emissioncore.io',
    ingestion_timestamp_utc: '2026-02-02T14:30:00Z',
    data_mode: 'LIVE',
    origin: 'INGESTED',
    payload_hash: 'sha256:xyz1234ab5678',
    metadata_hash: 'sha256:hash5555zzxxcc',
    retention_ends_at_utc: '2028-02-02T14:30:00Z',
    linked_entity_type: 'Supplier',
    linked_entity_id: 'SUP-123',
    tags: ['conflict-candidate', 'erp-sync'],
    canonical_payload: {
      supplier_id: 'SUP-123',
      legal_name: 'Acme Corp',
      country_code: 'FR'
    }
  },
  {
    id: 'rec-ev-003-uuid-stable',
    evidence_id: 'EV-2024-003',
    display_id: 'EV-2024-003',
    dataset_type: 'BOM',
    ledger_state: 'INGESTED',
    ingestion_method: 'MANUAL_ENTRY',
    source_system: 'INTERNAL_MANUAL',
    tenant_id: 'DEFAULT',
    created_by: 'info@emissioncore.io',
    ingestion_timestamp_utc: '2026-02-03T09:15:00Z',
    data_mode: 'LIVE',
    origin: 'INGESTED',
    payload_hash: 'sha256:bbb1234cc5678',
    metadata_hash: 'sha256:hash3333eeffaa',
    retention_ends_at_utc: '2028-02-03T09:15:00Z',
    linked_entity_type: 'SKU',
    linked_entity_id: 'SKU-456',
    tags: ['manual-entry', 'bom'],
    canonical_payload: {
      sku_id: 'SKU-456',
      sku_code: 'SKU-2024-001',
      description: 'Test Product',
      bom_items: []
    }
  },
  {
    id: 'rec-ev-004-uuid-stable',
    evidence_id: 'EV-2024-004',
    display_id: 'EV-2024-004',
    dataset_type: 'TEST_REPORT',
    ledger_state: 'QUARANTINED',
    ingestion_method: 'API_PUSH',
    source_system: 'SUPPLIER_PORTAL',
    tenant_id: 'DEFAULT',
    created_by: 'info@emissioncore.io',
    ingestion_timestamp_utc: '2026-02-03T16:45:00Z',
    data_mode: 'LIVE',
    origin: 'INGESTED',
    payload_hash: 'sha256:ddd1234ee5678',
    metadata_hash: 'sha256:hash1111gghhkk',
    retention_ends_at_utc: '2028-02-03T16:45:00Z',
    quarantine_reason: 'Contract 1 validation failed – non-conformant schema',
    quarantine_created_at_utc: '2026-02-03T17:00:00Z',
    tags: ['quarantined'],
    canonical_payload: {
      test_data: 'invalid'
    }
  }
];

/**
 * Initialize evidence store with seed data if empty.
 * Called from EvidenceVaultCompliance on first load.
 */
export async function initializeSeedDataIfEmpty(base44, currentTenant) {
  try {
    const existing = await base44.asServiceRole.entities.Evidence.filter({});
    if (existing && existing.length > 0) {
      // Data already exists, don't seed
      return;
    }

    // Create all 4 seed records
    await base44.asServiceRole.entities.Evidence.bulkCreate(seedEvidenceRecords);
    console.log('[SeedData] Initialized 4 evidence records');
  } catch (error) {
    console.warn('[SeedData] Failed to initialize:', error.message);
  }
}
/**
 * Deterministic Seed Function for SupplyLens Demo Data
 * STABLE IDs - Same data every refresh
 * Only runs in dev/demo mode
 */

import { base44 } from '@/api/base44Client';

const DEMO_MODE = true; // Toggle for demo/production

// Stable seed IDs (deterministic, not random)
const SEED_IDS = {
  evidence: {
    draft1: 'EV-SEED-DRAFT-001',
    draft2: 'EV-SEED-DRAFT-002',
    validated1: 'EV-SEED-VALID-001',
    validated2: 'EV-SEED-VALID-002',
    sealed1: 'EV-SEED-SEAL-001',
    sealed2: 'EV-SEED-SEAL-002',
    quarantine1: 'EV-SEED-QUAR-001',
    quarantine2: 'EV-SEED-QUAR-002'
  },
  workItems: {
    review1: 'WI-SEED-REV-001',
    review2: 'WI-SEED-REV-002',
    mapping1: 'WI-SEED-MAP-001',
    mapping2: 'WI-SEED-MAP-002',
    quarantine1: 'WI-SEED-QUAR-001',
    quarantine2: 'WI-SEED-QUAR-002',
    followup1: 'WI-SEED-FOLL-001',
    followup2: 'WI-SEED-FOLL-002'
  },
  entities: {
    supplier1: 'SUP-SEED-001',
    supplier2: 'SUP-SEED-002',
    supplier3: 'SUP-SEED-003',
    sku1: 'SKU-SEED-001',
    bomEdge1: 'BOM-SEED-001'
  }
};

export async function seedSupplyLensDemoData() {
  if (!DEMO_MODE) {
    console.log('[Seed] Production mode - skipping demo data');
    return { success: false, reason: 'production_mode' };
  }

  console.log('[Seed] Starting deterministic demo data seeding...');

  try {
    // Check if already seeded
    const existingEvidence = await base44.entities.Evidence.filter({ 
      record_id: SEED_IDS.evidence.draft1 
    });
    
    if (existingEvidence && existingEvidence.length > 0) {
      console.log('[Seed] Demo data already exists - skipping');
      return { success: true, reason: 'already_seeded', count: 0 };
    }

    let createdCount = 0;

    // 1. Seed 3 Suppliers
    const suppliers = [
      {
        id: SEED_IDS.entities.supplier1,
        supplier_id: SEED_IDS.entities.supplier1,
        legal_name: 'ACME Manufacturing GmbH',
        country_code: 'DE',
        primary_contact_email: 'contact@acme-mfg.example.com',
        primary_contact_name: 'Hans Schmidt',
        supplier_status: 'active',
        creation_source: 'MANUAL',
        created_by_user_id: 'demo-user',
        created_at: new Date('2026-01-15T10:00:00Z').toISOString(),
        supplier_tier: 1
      },
      {
        id: SEED_IDS.entities.supplier2,
        supplier_id: SEED_IDS.entities.supplier2,
        legal_name: 'Global Components Ltd',
        country_code: 'CN',
        primary_contact_email: 'info@globalcomp.example.com',
        primary_contact_name: 'Li Wei',
        supplier_status: 'active',
        creation_source: 'ERP',
        created_by_user_id: 'demo-user',
        created_at: new Date('2026-01-20T14:30:00Z').toISOString(),
        supplier_tier: 2
      },
      {
        id: SEED_IDS.entities.supplier3,
        supplier_id: SEED_IDS.entities.supplier3,
        legal_name: 'EcoMaterials SAS',
        country_code: 'FR',
        primary_contact_email: 'contact@ecomaterials.example.com',
        primary_contact_name: 'Marie Dubois',
        supplier_status: 'active',
        creation_source: 'SUPPLIER_PORTAL',
        created_by_user_id: 'demo-user',
        created_at: new Date('2026-02-01T09:15:00Z').toISOString(),
        supplier_tier: 1
      }
    ];

    for (const supplier of suppliers) {
      await base44.entities.Supplier.create(supplier);
      createdCount++;
    }

    // 2. Seed 1 SKU
    await base44.entities.SKU.create({
      id: SEED_IDS.entities.sku1,
      tenant_id: 'demo-tenant',
      sku_code: 'SKU-WIDGET-001',
      name: 'Widget Alpha Series',
      description: 'Premium industrial widget',
      category: 'Components',
      sku_number: 'WGT-ALPHA-001',
      active: true
    });
    createdCount++;

    // 3. Seed 1 BOM
    await base44.entities.BOM.create({
      id: SEED_IDS.entities.bomEdge1,
      tenant_id: 'demo-tenant',
      product_sku_id: SEED_IDS.entities.sku1,
      component_sku_id: SEED_IDS.entities.sku1,
      quantity: 1,
      unit: 'piece',
      level: 1,
      active: true
    });
    createdCount++;

    // 4. Seed 8 Evidence Records
    const evidenceRecords = [
      // DRAFT evidence
      {
        record_id: SEED_IDS.evidence.draft1,
        display_id: 'EV-DRAFT-001',
        dataset_type: 'supplier_master',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'User Portal',
        status: 'DRAFT',
        sealed_status: 'DRAFT',
        map_status: 'PENDING',
        readiness_impact: 'PENDING_MATCH',
        ingested_at_utc: new Date('2026-02-08T10:00:00Z').toISOString(),
        payload_hash: 'hash-draft-001',
        personal_data_flag: false,
        linked_entity: null
      },
      {
        record_id: SEED_IDS.evidence.draft2,
        display_id: 'EV-DRAFT-002',
        dataset_type: 'bom',
        ingestion_method: 'FILE_UPLOAD',
        source_system: 'Excel Import',
        status: 'DRAFT',
        sealed_status: 'DRAFT',
        map_status: 'PENDING',
        readiness_impact: 'PENDING_MATCH',
        ingested_at_utc: new Date('2026-02-08T11:30:00Z').toISOString(),
        payload_hash: 'hash-draft-002',
        personal_data_flag: false,
        linked_entity: null
      },
      // VALIDATED evidence
      {
        record_id: SEED_IDS.evidence.validated1,
        display_id: 'EV-VALID-001',
        dataset_type: 'supplier_master',
        ingestion_method: 'ERP_EXPORT',
        source_system: 'SAP',
        status: 'VALIDATED',
        sealed_status: 'VALIDATED',
        map_status: 'MAPPED',
        readiness_impact: 'READY',
        ingested_at_utc: new Date('2026-02-07T14:00:00Z').toISOString(),
        payload_hash: 'hash-valid-001',
        personal_data_flag: false,
        linked_entity: { type: 'Supplier', id: SEED_IDS.entities.supplier1, name: 'ACME Manufacturing GmbH' }
      },
      {
        record_id: SEED_IDS.evidence.validated2,
        display_id: 'EV-VALID-002',
        dataset_type: 'product_master',
        ingestion_method: 'API_PUSH',
        source_system: 'PLM System',
        status: 'VALIDATED',
        sealed_status: 'VALIDATED',
        map_status: 'MAPPED',
        readiness_impact: 'READY_WITH_GAPS',
        ingested_at_utc: new Date('2026-02-07T15:45:00Z').toISOString(),
        payload_hash: 'hash-valid-002',
        personal_data_flag: false,
        linked_entity: { type: 'SKU', id: SEED_IDS.entities.sku1, name: 'Widget Alpha Series' }
      },
      // SEALED evidence
      {
        record_id: SEED_IDS.evidence.sealed1,
        display_id: 'EV-SEAL-001',
        dataset_type: 'supplier_master',
        ingestion_method: 'SUPPLIER_PORTAL',
        source_system: 'Supplier Portal',
        status: 'SEALED',
        sealed_status: 'SEALED',
        map_status: 'MAPPED',
        readiness_impact: 'READY',
        ingested_at_utc: new Date('2026-02-05T09:00:00Z').toISOString(),
        payload_hash: 'hash-seal-001',
        personal_data_flag: false,
        linked_entity: { type: 'Supplier', id: SEED_IDS.entities.supplier2, name: 'Global Components Ltd' }
      },
      {
        record_id: SEED_IDS.evidence.sealed2,
        display_id: 'EV-SEAL-002',
        dataset_type: 'bom',
        ingestion_method: 'ERP_EXPORT',
        source_system: 'SAP',
        status: 'SEALED',
        sealed_status: 'SEALED',
        map_status: 'MAPPED',
        readiness_impact: 'READY',
        ingested_at_utc: new Date('2026-02-05T10:30:00Z').toISOString(),
        payload_hash: 'hash-seal-002',
        personal_data_flag: false,
        linked_entity: { type: 'BOM', id: SEED_IDS.entities.bomEdge1, name: 'Widget Alpha BOM' }
      },
      // QUARANTINED evidence
      {
        record_id: SEED_IDS.evidence.quarantine1,
        display_id: 'EV-QUAR-001',
        dataset_type: 'supplier_master',
        ingestion_method: 'FILE_UPLOAD',
        source_system: 'CSV Import',
        status: 'QUARANTINED',
        sealed_status: 'QUARANTINED',
        map_status: 'CONFLICT',
        readiness_impact: 'BLOCKED',
        ingested_at_utc: new Date('2026-02-09T16:00:00Z').toISOString(),
        payload_hash: 'hash-quar-001',
        personal_data_flag: true,
        linked_entity: null
      },
      {
        record_id: SEED_IDS.evidence.quarantine2,
        display_id: 'EV-QUAR-002',
        dataset_type: 'product_master',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'User Portal',
        status: 'QUARANTINED',
        sealed_status: 'QUARANTINED',
        map_status: 'CONFLICT',
        readiness_impact: 'BLOCKED',
        ingested_at_utc: new Date('2026-02-09T17:30:00Z').toISOString(),
        payload_hash: 'hash-quar-002',
        personal_data_flag: false,
        linked_entity: null
      }
    ];

    for (const evidence of evidenceRecords) {
      await base44.entities.Evidence.create(evidence);
      createdCount++;
    }

    // 5. Seed 8 Work Items
    const workItems = [
      // REVIEW work items
      {
        work_item_id: SEED_IDS.workItems.review1,
        type: 'EVIDENCE_REVIEW',
        title: 'Review Draft Supplier Data',
        description: 'New supplier master data pending review',
        status: 'OPEN',
        priority: 'MEDIUM',
        module: 'SupplyLens',
        linked_evidence_record_ids: [SEED_IDS.evidence.draft1],
        linked_entity: null,
        assigned_to: 'demo-user',
        created_at: new Date('2026-02-08T10:05:00Z').toISOString(),
        due_date: new Date('2026-02-12T23:59:59Z').toISOString()
      },
      {
        work_item_id: SEED_IDS.workItems.review2,
        type: 'EVIDENCE_REVIEW',
        title: 'Review BOM Upload',
        description: 'Validate uploaded BOM structure',
        status: 'OPEN',
        priority: 'HIGH',
        module: 'SupplyLens',
        linked_evidence_record_ids: [SEED_IDS.evidence.draft2],
        linked_entity: null,
        assigned_to: 'demo-user',
        created_at: new Date('2026-02-08T11:35:00Z').toISOString(),
        due_date: new Date('2026-02-11T23:59:59Z').toISOString()
      },
      // MAPPING work items
      {
        work_item_id: SEED_IDS.workItems.mapping1,
        type: 'ENTITY_MAPPING',
        title: 'Map Supplier to Master Record',
        description: 'Link validated supplier evidence to entity',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        module: 'SupplyLens',
        linked_evidence_record_ids: [SEED_IDS.evidence.validated1],
        linked_entity: { type: 'Supplier', id: SEED_IDS.entities.supplier1, name: 'ACME Manufacturing GmbH' },
        assigned_to: 'demo-user',
        created_at: new Date('2026-02-07T14:10:00Z').toISOString(),
        due_date: new Date('2026-02-10T23:59:59Z').toISOString()
      },
      {
        work_item_id: SEED_IDS.workItems.mapping2,
        type: 'ENTITY_MAPPING',
        title: 'Map Product to SKU',
        description: 'Link product master data to SKU record',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        module: 'SupplyLens',
        linked_evidence_record_ids: [SEED_IDS.evidence.validated2],
        linked_entity: { type: 'SKU', id: SEED_IDS.entities.sku1, name: 'Widget Alpha Series' },
        assigned_to: 'demo-user',
        created_at: new Date('2026-02-07T15:50:00Z').toISOString(),
        due_date: new Date('2026-02-12T23:59:59Z').toISOString()
      },
      // QUARANTINE work items
      {
        work_item_id: SEED_IDS.workItems.quarantine1,
        type: 'QUARANTINE_REVIEW',
        title: 'Resolve PII in Supplier Upload',
        description: 'Personal data detected - requires sanitization',
        status: 'BLOCKED',
        priority: 'CRITICAL',
        module: 'SupplyLens',
        linked_evidence_record_ids: [SEED_IDS.evidence.quarantine1],
        linked_entity: null,
        assigned_to: 'demo-user',
        created_at: new Date('2026-02-09T16:05:00Z').toISOString(),
        due_date: new Date('2026-02-10T23:59:59Z').toISOString()
      },
      {
        work_item_id: SEED_IDS.workItems.quarantine2,
        type: 'QUARANTINE_REVIEW',
        title: 'Resolve Data Conflict',
        description: 'Duplicate product record detected',
        status: 'BLOCKED',
        priority: 'HIGH',
        module: 'SupplyLens',
        linked_evidence_record_ids: [SEED_IDS.evidence.quarantine2],
        linked_entity: null,
        assigned_to: 'demo-user',
        created_at: new Date('2026-02-09T17:35:00Z').toISOString(),
        due_date: new Date('2026-02-11T23:59:59Z').toISOString()
      },
      // FOLLOW-UP work items
      {
        work_item_id: SEED_IDS.workItems.followup1,
        type: 'FOLLOW_UP',
        title: 'Verify Supplier Certification',
        description: 'Follow-up: Request ISO 13485 certificate',
        status: 'OPEN',
        priority: 'LOW',
        module: 'SupplyLens',
        linked_evidence_record_ids: [SEED_IDS.evidence.sealed1],
        linked_entity: { type: 'Supplier', id: SEED_IDS.entities.supplier2, name: 'Global Components Ltd' },
        assigned_to: 'demo-user',
        created_at: new Date('2026-02-06T10:00:00Z').toISOString(),
        due_date: new Date('2026-02-20T23:59:59Z').toISOString()
      },
      {
        work_item_id: SEED_IDS.workItems.followup2,
        type: 'FOLLOW_UP',
        title: 'Update BOM Revision',
        description: 'Follow-up: Sync BOM changes to ERP',
        status: 'RESOLVED',
        priority: 'LOW',
        module: 'SupplyLens',
        linked_evidence_record_ids: [SEED_IDS.evidence.sealed2],
        linked_entity: { type: 'BOM', id: SEED_IDS.entities.bomEdge1, name: 'Widget Alpha BOM' },
        assigned_to: 'demo-user',
        created_at: new Date('2026-02-05T12:00:00Z').toISOString(),
        resolved_at: new Date('2026-02-07T16:30:00Z').toISOString(),
        due_date: new Date('2026-02-15T23:59:59Z').toISOString()
      }
    ];

    for (const workItem of workItems) {
      await base44.entities.WorkItem.create(workItem);
      createdCount++;
    }

    console.log(`[Seed] Successfully created ${createdCount} demo records`);
    
    return { 
      success: true, 
      count: createdCount,
      ids: SEED_IDS
    };

  } catch (error) {
    console.error('[Seed] Error seeding demo data:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Auto-cleanup function (optional - for demo reset)
export async function cleanupDemoData() {
  if (!DEMO_MODE) {
    console.log('[Cleanup] Production mode - skipping cleanup');
    return { success: false, reason: 'production_mode' };
  }

  console.log('[Cleanup] Removing demo data...');
  
  try {
    let deletedCount = 0;

    // Delete work items
    for (const id of Object.values(SEED_IDS.workItems)) {
      try {
        await base44.entities.WorkItem.delete(id);
        deletedCount++;
      } catch (e) {
        // Ignore if not found
      }
    }

    // Delete evidence
    for (const id of Object.values(SEED_IDS.evidence)) {
      try {
        await base44.entities.Evidence.delete(id);
        deletedCount++;
      } catch (e) {
        // Ignore if not found
      }
    }

    // Delete entities
    for (const id of Object.values(SEED_IDS.entities)) {
      try {
        // Try different entity types
        await base44.entities.Supplier.delete(id).catch(() => {});
        await base44.entities.SKU.delete(id).catch(() => {});
        await base44.entities.BOM.delete(id).catch(() => {});
        deletedCount++;
      } catch (e) {
        // Ignore if not found
      }
    }

    console.log(`[Cleanup] Removed ${deletedCount} demo records`);
    
    return { success: true, count: deletedCount };

  } catch (error) {
    console.error('[Cleanup] Error cleaning demo data:', error);
    return { success: false, error: error.message };
  }
}

export default seedSupplyLensDemoData;
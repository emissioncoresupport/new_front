/**
 * DemoDataStore.js
 * Centralized deterministic mock data store for SupplyLens Contract 2 demo
 * Persists to localStorage, scoped by tenant_id
 */

const STORAGE_KEY = 'supplylens_spec_store_v1';
const ACTIVE_TENANT_ID = 'tenant_demo_emissioncore';
const DEMO_USER_ID = 'usr_demo_admin';
const DEMO_USER_EMAIL = 'adrian@emissioncore.io';

class DemoDataStore {
  constructor() {
    this.data = this.load();
    if (!this.data.initialized) {
      this.seedData();
    }
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[DemoDataStore] Failed to load from localStorage:', e);
    }
    
    return this.getEmptyStore();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('[DemoDataStore] Failed to save to localStorage:', e);
    }
  }

  getEmptyStore() {
    return {
      tenant: {
        tenant_id: ACTIVE_TENANT_ID,
        tenant_name: 'SupplyLens',
        user_id: DEMO_USER_ID,
        user_email: DEMO_USER_EMAIL
      },
      evidence: [],
      evidenceDrafts: [],
      workItems: [],
      entities: [],
      decisions: [],
      auditEvents: [],
      mappingSuggestions: [],
      supplierSkuMappings: [],
      accessLogs: [],
      initialized: false
    };
  }

  seedData() {
    console.log('[DemoDataStore] Seeding deterministic mock data...');
    
    const now = new Date().toISOString();
    const sealed1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sealed2 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const sealed3 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const ingested = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    
    // Supplier-SKU Mappings (for Network relationships)
    this.data.supplierSkuMappings = [
      { mapping_id: 'MAP-001', tenant_id: ACTIVE_TENANT_ID, supplier_id: 'SUP-001', sku_id: 'SKU-001', relationship_type: 'manufacturer', confidence: 95, is_primary: true, status: 'APPROVED', evidence_count: 2, last_decision_id: 'D-0001', created_by: DEMO_USER_EMAIL },
      { mapping_id: 'MAP-002', tenant_id: ACTIVE_TENANT_ID, supplier_id: 'SUP-001', sku_id: 'SKU-002', relationship_type: 'manufacturer', confidence: 90, is_primary: true, status: 'APPROVED', evidence_count: 1, last_decision_id: 'D-0002', created_by: DEMO_USER_EMAIL },
      { mapping_id: 'MAP-003', tenant_id: ACTIVE_TENANT_ID, supplier_id: 'SUP-004', sku_id: 'SKU-003', relationship_type: 'manufacturer', confidence: 88, is_primary: true, status: 'APPROVED', evidence_count: 1, last_decision_id: null, created_by: DEMO_USER_EMAIL },
      { mapping_id: 'MAP-004', tenant_id: 'tenant_demo_importer_b', supplier_id: 'SUP-002', sku_id: 'SKU-001', relationship_type: 'distributor', confidence: 75, is_primary: false, status: 'PENDING', evidence_count: 0, last_decision_id: null, created_by: DEMO_USER_EMAIL },
      { mapping_id: 'MAP-005', tenant_id: ACTIVE_TENANT_ID, supplier_id: 'SUP-006', sku_id: 'SKU-005', relationship_type: 'manufacturer', confidence: 92, is_primary: true, status: 'APPROVED', evidence_count: 1, last_decision_id: null, created_by: DEMO_USER_EMAIL },
      { mapping_id: 'MAP-006', tenant_id: ACTIVE_TENANT_ID, supplier_id: 'SUP-008', sku_id: 'SKU-007', relationship_type: 'manufacturer', confidence: 85, is_primary: true, status: 'APPROVED', evidence_count: 1, last_decision_id: null, created_by: DEMO_USER_EMAIL },
      { mapping_id: 'MAP-007', tenant_id: ACTIVE_TENANT_ID, supplier_id: 'SUP-010', sku_id: 'SKU-009', relationship_type: 'manufacturer', confidence: 90, is_primary: true, status: 'APPROVED', evidence_count: 1, last_decision_id: null, created_by: DEMO_USER_EMAIL }
    ];
    
    // Entities (10 suppliers, 10 SKUs, 1 BOM with edges)
    this.data.entities = [
      { entity_id: 'SUP-001', entityId: 'SUP-001', tenant_id: ACTIVE_TENANT_ID, type: 'SUPPLIER', name: 'Anatolia Steel', legalName: 'Anatolia Steel', country: 'TR', country_code: 'TR', canonical_fields: { vat: 'TR123456789', legal_name: 'Anatolia Steel', country_of_origin: 'TR' }, evidence_count: 2, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 2 },
      { entity_id: 'SUP-002', entityId: 'SUP-002', tenant_id: ACTIVE_TENANT_ID, type: 'SUPPLIER', name: 'Baltic Metals', legalName: 'Baltic Metals', country: 'PL', country_code: 'PL', canonical_fields: { vat: 'PL987654321', legal_name: 'Baltic Metals' }, evidence_count: 1, mapping_status: 'PENDING', readiness: 'PENDING_MATCH', open_work_items: 1 },
      { entity_id: 'SUP-003', entityId: 'SUP-003', tenant_id: ACTIVE_TENANT_ID, type: 'SUPPLIER', name: 'Nordic Alloys', legalName: 'Nordic Alloys AB', country: 'SE', country_code: 'SE', canonical_fields: { vat: 'SE556677889', legal_name: 'Nordic Alloys AB' }, evidence_count: 0, mapping_status: 'PENDING', readiness: 'NOT_READY', open_work_items: 0 },
      { entity_id: 'SUP-004', entityId: 'SUP-004', tenant_id: ACTIVE_TENANT_ID, type: 'SUPPLIER', name: 'Alpine Steelworks', legalName: 'Alpine Steelworks GmbH', country: 'AT', country_code: 'AT', canonical_fields: { vat: 'AT987654321' }, evidence_count: 1, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 0 },
      { entity_id: 'SUP-005', entityId: 'SUP-005', tenant_id: ACTIVE_TENANT_ID, type: 'SUPPLIER', name: 'Iberian Metals', legalName: 'Iberian Metals SA', country: 'ES', country_code: 'ES', canonical_fields: { vat: 'ES123456789', country_of_origin: 'ES' }, evidence_count: 1, mapping_status: 'CONFLICT', readiness: 'CONFLICT', conflict_field: 'country_of_origin', conflict_sources: [{ value: 'ES', sourceId: 'rec_ev_001', trustRank: 5 }, { value: 'PT', sourceId: 'rec_ev_006', trustRank: 3 }], open_work_items: 1 },
      { entity_id: 'SUP-006', entityId: 'SUP-006', tenant_id: ACTIVE_TENANT_ID, type: 'SUPPLIER', name: 'Dutch Steel BV', legalName: 'Dutch Steel BV', country: 'NL', country_code: 'NL', canonical_fields: {}, evidence_count: 1, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 0 },
      { entity_id: 'SUP-007', entityId: 'SUP-007', tenant_id: ACTIVE_TENANT_ID, type: 'SUPPLIER', name: 'Greek Foundries', legalName: 'Greek Foundries Ltd', country: 'GR', country_code: 'GR', canonical_fields: {}, evidence_count: 0, mapping_status: 'PENDING', readiness: 'NOT_READY', open_work_items: 0 },
      { entity_id: 'SUP-008', entityId: 'SUP-008', tenant_id: ACTIVE_TENANT_ID, type: 'SUPPLIER', name: 'Czech Metalworks', legalName: 'Czech Metalworks sro', country: 'CZ', country_code: 'CZ', canonical_fields: {}, evidence_count: 1, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 0 },
      { entity_id: 'SUP-009', entityId: 'SUP-009', tenant_id: ACTIVE_TENANT_ID, type: 'SUPPLIER', name: 'Romanian Steel', legalName: 'Romanian Steel SA', country: 'RO', country_code: 'RO', canonical_fields: {}, evidence_count: 0, mapping_status: 'PENDING', readiness: 'NOT_READY', open_work_items: 0 },
      { entity_id: 'SUP-010', entityId: 'SUP-010', tenant_id: ACTIVE_TENANT_ID, type: 'SUPPLIER', name: 'Slovak Industries', legalName: 'Slovak Industries as', country: 'SK', country_code: 'SK', canonical_fields: {}, evidence_count: 1, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 0 },
      { entity_id: 'SITE-001', entityId: 'SITE-001', tenant_id: ACTIVE_TENANT_ID, type: 'SITE', name: 'Anatolia Steel - Main Plant', supplier_id: 'SUP-001', country: 'TR', canonical_fields: { installation_id: 'TR-INST-001' }, evidence_count: 1, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 0 },
      { entity_id: 'SKU-001', entityId: 'SKU-001', tenant_id: ACTIVE_TENANT_ID, type: 'SKU', name: 'Hot-rolled steel coil', code: 'SKU-001', sku_code: 'SKU-001', category: 'Steel Products', evidence_count: 2, mapping_status: 'MAPPED', readiness: 'READY_WITH_GAPS', open_work_items: 1 },
      { entity_id: 'SKU-002', entityId: 'SKU-002', tenant_id: ACTIVE_TENANT_ID, type: 'SKU', name: 'Steel fasteners', code: 'SKU-002', sku_code: 'SKU-002', category: 'Fasteners', evidence_count: 2, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 1 },
      { entity_id: 'SKU-003', entityId: 'SKU-003', tenant_id: ACTIVE_TENANT_ID, type: 'SKU', name: 'Structural beams', code: 'SKU-003', sku_code: 'SKU-003', category: 'Steel Products', evidence_count: 1, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 0 },
      { entity_id: 'SKU-004', entityId: 'SKU-004', tenant_id: ACTIVE_TENANT_ID, type: 'SKU', name: 'Steel sheets', code: 'SKU-004', sku_code: 'SKU-004', category: 'Steel Products', evidence_count: 0, mapping_status: 'PENDING', readiness: 'NOT_READY', open_work_items: 0 },
      { entity_id: 'SKU-005', entityId: 'SKU-005', tenant_id: ACTIVE_TENANT_ID, type: 'SKU', name: 'Steel pipes', code: 'SKU-005', sku_code: 'SKU-005', category: 'Pipes', evidence_count: 1, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 0 },
      { entity_id: 'SKU-006', entityId: 'SKU-006', tenant_id: ACTIVE_TENANT_ID, type: 'SKU', name: 'Galvanized wire', code: 'SKU-006', sku_code: 'SKU-006', category: 'Wire Products', evidence_count: 0, mapping_status: 'PENDING', readiness: 'NOT_READY', open_work_items: 0 },
      { entity_id: 'SKU-007', entityId: 'SKU-007', tenant_id: ACTIVE_TENANT_ID, type: 'SKU', name: 'Rebar', code: 'SKU-007', sku_code: 'SKU-007', category: 'Construction', evidence_count: 1, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 0 },
      { entity_id: 'SKU-008', entityId: 'SKU-008', tenant_id: ACTIVE_TENANT_ID, type: 'SKU', name: 'Steel angles', code: 'SKU-008', sku_code: 'SKU-008', category: 'Steel Products', evidence_count: 0, mapping_status: 'PENDING', readiness: 'NOT_READY', open_work_items: 0 },
      { entity_id: 'SKU-009', entityId: 'SKU-009', tenant_id: ACTIVE_TENANT_ID, type: 'SKU', name: 'Steel channels', code: 'SKU-009', sku_code: 'SKU-009', category: 'Steel Products', evidence_count: 1, mapping_status: 'MAPPED', readiness: 'READY', open_work_items: 0 },
      { entity_id: 'SKU-010', entityId: 'SKU-010', tenant_id: ACTIVE_TENANT_ID, type: 'SKU', name: 'Reinforcement mesh', code: 'SKU-010', sku_code: 'SKU-010', category: 'Construction', evidence_count: 0, mapping_status: 'PENDING', readiness: 'NOT_READY', open_work_items: 0 },
      {
        entity_id: 'BOM-001', entityId: 'BOM-001', tenant_id: ACTIVE_TENANT_ID, type: 'BOM', name: 'BOM for Hot-rolled steel coil', code: 'BOM-001',
        components: [
          { component_ref: 'SKU-002', qty: 0.2, uom: 'kg', status: 'MATCHED' },
          { component_code_raw: 'C-UNKNOWN-77', qty: 0.05, uom: 'kg', status: 'PENDING_MATCH' },
          { component_ref: 'SKU-003', qty: 0.1, uom: 'kg', status: 'MATCHED' }
        ],
        evidence_count: 1, mapping_status: 'PENDING', readiness: 'PENDING_MATCH', open_work_items: 1
      }
    ];
    
    // Integration Connectors (for health calculation)
    this.data.connectors = [
      { id: 'conn_sap', name: 'SAP_HANA', status: 'OK', last_sync: sealed1 },
      { id: 'conn_portal', name: 'SUPPLIER_PORTAL', status: 'OK', last_sync: sealed2 },
      { id: 'conn_customs', name: 'CUSTOMS_API', status: 'DEGRADED', last_sync: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() }
    ];
    
    // Evidence Records (10 as per spec)
    this.data.evidence = [
      {
        record_id: 'rec_ev_001',
        display_id: 'EV-0001',
        tenant_id: ACTIVE_TENANT_ID,
        status: 'SEALED',
        dataset_type: 'SUPPLIER_MASTER_V1',
        ingestion_method: 'ERP_API',
        source_system: 'SAP_HANA',
        created_by: DEMO_USER_EMAIL,
        ingested_by: DEMO_USER_EMAIL,
        ingested_at_utc: sealed1,
        sealed_at_utc: sealed1,
        retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        payload_hash_sha256: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
        metadata_hash_sha256: 'b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        linked_entities: [{ type: 'SUPPLIER', id: 'SUP-001' }],
        claims: { supplier_name: 'Anatolia Steel', country_code: 'TR', vat: 'TR123456789' }
      },
      {
        record_id: 'rec_ev_002',
        display_id: 'EV-0002',
        tenant_id: ACTIVE_TENANT_ID,
        status: 'INGESTED',
        dataset_type: 'SUPPLIER_DECLARATION_V1',
        ingestion_method: 'SUPPLIER_PORTAL',
        source_system: 'SUPPLIER_PORTAL',
        created_by: DEMO_USER_EMAIL,
        ingested_by: DEMO_USER_EMAIL,
        ingested_at_utc: ingested,
        retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        payload_hash_sha256: 'b1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
        metadata_hash_sha256: 'c2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        linked_entities: [{ type: 'SUPPLIER', id: 'SUP-001' }],
        claims: { emissions_total_co2_tonnes: 5600 }
      },
      {
        record_id: 'rec_ev_003',
        display_id: 'EV-0003',
        tenant_id: ACTIVE_TENANT_ID,
        status: 'SEALED',
        dataset_type: 'SITE_INSTALLATION_MASTER_V1',
        ingestion_method: 'FILE_UPLOAD',
        source_system: 'EXCEL_IMPORT',
        created_by: DEMO_USER_EMAIL,
        ingested_by: DEMO_USER_EMAIL,
        ingested_at_utc: sealed2,
        sealed_at_utc: sealed2,
        retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        payload_hash_sha256: 'c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        metadata_hash_sha256: 'd4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        linked_entities: [{ type: 'SITE', id: 'SITE-001' }],
        claims: { installation_id: 'TR-INST-001', site_name: 'Anatolia Steel - Main Plant' }
      },
      {
        record_id: 'rec_ev_004',
        display_id: 'EV-0004',
        tenant_id: ACTIVE_TENANT_ID,
        status: 'SEALED',
        dataset_type: 'SKU_MASTER_V1',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'SUPPLYLENS',
        created_by: DEMO_USER_EMAIL,
        ingested_by: DEMO_USER_EMAIL,
        ingested_at_utc: sealed3,
        sealed_at_utc: sealed3,
        retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        payload_hash_sha256: 'd3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        metadata_hash_sha256: 'e4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        linked_entities: [{ type: 'SKU', id: 'SKU-001' }],
        claims: { sku_code: 'SKU-001', sku_name: 'Hot-rolled steel coil' }
      },
      {
        record_id: 'rec_ev_005',
        display_id: 'EV-0005',
        tenant_id: ACTIVE_TENANT_ID,
        status: 'SEALED',
        dataset_type: 'BOM_V1',
        ingestion_method: 'MANUAL_ENTRY',
        source_system: 'SUPPLYLENS',
        created_by: DEMO_USER_EMAIL,
        ingested_by: DEMO_USER_EMAIL,
        ingested_at_utc: sealed3,
        sealed_at_utc: sealed3,
        retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        payload_hash_sha256: 'e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
        metadata_hash_sha256: 'f67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
        linked_entities: [{ type: 'SKU', id: 'SKU-001' }, { type: 'BOM', id: 'BOM-001' }],
        summary_fields: { components_total: 3, pending_match: 1 }
      },
      {
        record_id: 'rec_ev_006',
        display_id: 'EV-0006',
        tenant_id: ACTIVE_TENANT_ID,
        status: 'INGESTED',
        dataset_type: 'CBAM_IMPORTS_QTR_V1',
        ingestion_method: 'API_PUSH',
        source_system: 'CUSTOMS_API',
        created_by: DEMO_USER_EMAIL,
        ingested_by: DEMO_USER_EMAIL,
        ingested_at_utc: ingested,
        retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        payload_hash_sha256: '67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345',
        metadata_hash_sha256: '7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
        linked_entities: [{ type: 'SUPPLIER', id: 'SUP-001' }, { type: 'SKU', id: 'SKU-001' }],
        summary_fields: { quarter: '2025-Q4', lines: 3, total_net_mass_kg: 120000 }
      },
      {
        record_id: 'rec_ev_007',
        display_id: 'EV-0007',
        tenant_id: ACTIVE_TENANT_ID,
        status: 'INGESTED',
        dataset_type: 'EUDR_GEO_EVIDENCE_V1',
        ingestion_method: 'FILE_UPLOAD',
        source_system: 'SATELLITE_API',
        created_by: DEMO_USER_EMAIL,
        ingested_by: DEMO_USER_EMAIL,
        ingested_at_utc: ingested,
        retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        payload_hash_sha256: '77890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345',
        metadata_hash_sha256: '8890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
        linked_entities: [{ type: 'SUPPLIER', id: 'SUP-002' }],
        claims: { plot_id: 'PLOT-001', deforestation_risk: 'LOW' }
      },
      {
        record_id: 'rec_ev_008',
        display_id: 'EV-0008',
        tenant_id: ACTIVE_TENANT_ID,
        status: 'INGESTED',
        dataset_type: 'PPWR_PACKAGING_COMPOSITION_V1',
        ingestion_method: 'API_PUSH',
        source_system: 'PACKAGING_LAB',
        created_by: DEMO_USER_EMAIL,
        ingested_by: DEMO_USER_EMAIL,
        ingested_at_utc: ingested,
        retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        payload_hash_sha256: '87890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345',
        metadata_hash_sha256: '9890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
        linked_entities: [{ type: 'SKU', id: 'SKU-002' }],
        claims: { recycled_content_pct: 35, recyclability_grade: 'A' }
      },
      {
        record_id: 'rec_ev_009',
        display_id: 'EV-0009',
        tenant_id: ACTIVE_TENANT_ID,
        status: 'INGESTED',
        dataset_type: 'PFAS_SUBSTANCE_DECLARATION_V1',
        ingestion_method: 'SUPPLIER_PORTAL',
        source_system: 'SUPPLIER_PORTAL',
        created_by: DEMO_USER_EMAIL,
        ingested_by: DEMO_USER_EMAIL,
        ingested_at_utc: ingested,
        retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        payload_hash_sha256: '97890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345',
        metadata_hash_sha256: 'a890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
        linked_entities: [{ type: 'SKU', id: 'SKU-002' }],
        claims: { pfas_present: false, declaration_date: '2026-01-15' }
      },
      {
        record_id: 'rec_ev_010',
        display_id: 'EV-0010',
        tenant_id: ACTIVE_TENANT_ID,
        status: 'INGESTED',
        dataset_type: 'LOGISTICS_SHIPMENT_LEGS_V1',
        ingestion_method: 'API_PUSH',
        source_system: 'TMS_API',
        created_by: DEMO_USER_EMAIL,
        ingested_by: DEMO_USER_EMAIL,
        ingested_at_utc: ingested,
        retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        payload_hash_sha256: 'a7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345',
        metadata_hash_sha256: 'b890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
        linked_entities: [],
        claims: { total_legs: 3, total_distance_km: 2450, total_co2_kg: 180 }
      }
    ];
    
    // Work Items
    const sla48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const sla72h = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const sla24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Work Items (12 as per spec)
    this.data.workItems = [
      {
        work_item_id: 'WI-0001',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'MAPPING',
        status: 'OPEN',
        priority: 'HIGH',
        title: 'Resolve BOM pending component match',
        required_action_text: 'Map component_code_raw C-UNKNOWN-77 to an existing SKU or leave as Pending Match.',
        reason_codes: ['PENDING_MATCH'],
        linked_entity: { type: 'BOM', id: 'BOM-001' },
        linked_evidence_record_ids: ['rec_ev_005'],
        created_at_utc: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla48h,
        owner: DEMO_USER_EMAIL,
        estimated_cost_eur: 800,
        risk_eur: 800
      },
      {
        work_item_id: 'WI-0002',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'REVIEW',
        status: 'OPEN',
        priority: 'MEDIUM',
        title: 'Review Supplier Master Evidence',
        required_action_text: 'Verify supplier master data completeness and accuracy.',
        reason_codes: ['DATA_COMPLETENESS_CHECK'],
        linked_entity: { type: 'SUPPLIER', id: 'SUP-001' },
        linked_evidence_record_ids: ['rec_ev_001'],
        created_at_utc: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla72h,
        owner: DEMO_USER_EMAIL,
        estimated_cost_eur: 500,
        risk_eur: 0
      },
      {
        work_item_id: 'WI-0003',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'MAPPING',
        status: 'OPEN',
        priority: 'HIGH',
        title: 'Approve SKU classification for CBAM imports',
        required_action_text: 'Verify SKU matches CBAM CN code classification.',
        reason_codes: ['CBAM_CLASSIFICATION_REQUIRED'],
        linked_entity: { type: 'SKU', id: 'SKU-001' },
        linked_evidence_record_ids: ['rec_ev_006'],
        created_at_utc: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla48h,
        estimated_cost_eur: 1200,
        risk_eur: 1200
      },
      {
        work_item_id: 'WI-0004',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'CONFLICT',
        status: 'OPEN',
        priority: 'MEDIUM',
        title: 'Confirm supplier identity attributes',
        required_action_text: 'Resolve conflicting supplier country codes between evidence sources.',
        reason_codes: ['DATA_CONFLICT', 'COUNTRY_CODE_MISMATCH'],
        linked_entity: { type: 'SUPPLIER', id: 'SUP-005' },
        linked_evidence_record_ids: ['rec_ev_001', 'rec_ev_006'],
        created_at_utc: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla72h,
        owner: DEMO_USER_EMAIL,
        estimated_cost_eur: 600,
        risk_eur: 600,
        details: {
          field: 'country_of_origin',
          sources: [
            { value: 'ES', sourceId: 'rec_ev_001', evidenceId: 'rec_ev_001', trustRank: 5, source_system: 'SAP_HANA' },
            { value: 'PT', sourceId: 'rec_ev_006', evidenceId: 'rec_ev_006', trustRank: 3, source_system: 'CUSTOMS_API' }
          ]
        }
      },
      {
        work_item_id: 'WI-0005',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'REVIEW',
        status: 'OPEN',
        priority: 'LOW',
        title: 'CBAM quarterly dataset completeness check',
        required_action_text: 'Review dataset for missing installation data.',
        reason_codes: ['DATA_COMPLETENESS_CHECK'],
        linked_entity: { type: 'SKU', id: 'SKU-001' },
        linked_evidence_record_ids: ['rec_ev_006'],
        created_at_utc: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla72h,
        estimated_cost_eur: 300,
        risk_eur: 0
      },
      {
        work_item_id: 'WI-0006',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'BLOCKED',
        status: 'BLOCKED',
        priority: 'CRITICAL',
        title: 'Missing installation data for CBAM calculation',
        required_action_text: 'Supplier must provide installation operator emission report.',
        reason_codes: ['MISSING_CBAM_DATA', 'REGULATORY_DEADLINE'],
        linked_entity: { type: 'SUPPLIER', id: 'SUP-001' },
        linked_evidence_record_ids: ['rec_ev_006'],
        created_at_utc: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla24h,
        estimated_cost_eur: 15000,
        risk_eur: 15000
      },
      {
        work_item_id: 'WI-0007',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'MAPPING',
        status: 'OPEN',
        priority: 'MEDIUM',
        title: 'Link EUDR geo evidence to supplier',
        required_action_text: 'Confirm supplier site matches geo coordinates.',
        reason_codes: ['GEO_LINKAGE_REQUIRED'],
        linked_entity: { type: 'SUPPLIER', id: 'SUP-002' },
        linked_evidence_record_ids: ['rec_ev_007'],
        created_at_utc: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla48h,
        estimated_cost_eur: 700,
        risk_eur: 700
      },
      {
        work_item_id: 'WI-0008',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'REVIEW',
        status: 'OPEN',
        priority: 'MEDIUM',
        title: 'Validate PPWR recyclability claims',
        required_action_text: 'Verify packaging composition matches regulatory requirements.',
        reason_codes: ['PPWR_COMPLIANCE_CHECK'],
        linked_entity: { type: 'SKU', id: 'SKU-002' },
        linked_evidence_record_ids: ['rec_ev_008'],
        created_at_utc: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla72h,
        estimated_cost_eur: 400,
        risk_eur: 0
      },
      {
        work_item_id: 'WI-0009',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'CONFLICT',
        status: 'OPEN',
        priority: 'HIGH',
        title: 'Resolve PFAS declaration discrepancy',
        required_action_text: 'Conflicting PFAS presence claims from two sources.',
        reason_codes: ['DATA_CONFLICT', 'PFAS_DECLARATION_MISMATCH'],
        linked_entity: { type: 'SKU', id: 'SKU-002' },
        linked_evidence_record_ids: ['rec_ev_008', 'rec_ev_009'],
        created_at_utc: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla48h,
        owner: DEMO_USER_EMAIL,
        estimated_cost_eur: 2500,
        risk_eur: 2500
      },
      {
        work_item_id: 'WI-0010',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'FOLLOW_UP',
        status: 'OPEN',
        priority: 'LOW',
        title: 'Follow-up: Re-validate supplier master after conflict resolution',
        required_action_text: 'Verify canonical fields are correct after WI-0004 resolution.',
        reason_codes: ['POST_CONFLICT_VERIFICATION'],
        linked_entity: { type: 'SUPPLIER', id: 'SUP-001' },
        linked_evidence_record_ids: ['rec_ev_001'],
        created_at_utc: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla72h,
        estimated_cost_eur: 200,
        risk_eur: 0
      },
      {
        work_item_id: 'WI-0011',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'FOLLOW_UP',
        status: 'OPEN',
        priority: 'MEDIUM',
        title: 'Follow-up: Request updated CBAM data after installation fix',
        required_action_text: 'Re-ingest CBAM data once WI-0006 is resolved.',
        reason_codes: ['POST_RESOLUTION_REINGEST'],
        linked_entity: { type: 'SUPPLIER', id: 'SUP-001' },
        linked_evidence_record_ids: ['rec_ev_006'],
        created_at_utc: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla72h,
        estimated_cost_eur: 1000,
        risk_eur: 0
      },
      {
        work_item_id: 'WI-0012',
        tenant_id: ACTIVE_TENANT_ID,
        type: 'MAPPING',
        status: 'OPEN',
        priority: 'HIGH',
        title: 'Map logistics legs to shipment entities',
        required_action_text: 'Link shipment legs to purchase orders and deliveries.',
        reason_codes: ['PENDING_MATCH', 'LOGISTICS_LINKAGE'],
        linked_entity: null,
        linked_evidence_record_ids: ['rec_ev_010'],
        created_at_utc: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        sla_due_utc: sla48h,
        estimated_cost_eur: 900,
        risk_eur: 900
      }
    ];
    
    // Decisions (8 as per spec)
    this.data.decisions = [
      {
        decision_id: 'D-0001',
        tenant_id: ACTIVE_TENANT_ID,
        work_item_id: null,
        decision_type: 'MAPPING_APPROVED',
        actor: DEMO_USER_EMAIL,
        timestamp: sealed1,
        reason_code: 'EXACT_MATCH',
        comment: 'Supplier name and VAT exact match',
        evidence_refs: ['rec_ev_001'],
        entity_refs: ['SUP-001']
      },
      {
        decision_id: 'D-0002',
        tenant_id: ACTIVE_TENANT_ID,
        work_item_id: null,
        decision_type: 'MAPPING_APPROVED',
        actor: DEMO_USER_EMAIL,
        timestamp: sealed2,
        reason_code: 'FUZZY_MATCH_APPROVED',
        comment: 'SKU code match confidence 92%',
        evidence_refs: ['rec_ev_004'],
        entity_refs: ['SKU-001']
      },
      {
        decision_id: 'D-0003',
        tenant_id: ACTIVE_TENANT_ID,
        work_item_id: 'WI-0004',
        decision_type: 'CONFLICT_RESOLVED',
        actor: DEMO_USER_EMAIL,
        timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        reason_code: 'EVIDENCE_PRIORITY',
        comment: 'Selected ERP source as canonical',
        evidence_refs: ['rec_ev_001', 'rec_ev_006'],
        entity_refs: ['SUP-001']
      },
      {
        decision_id: 'D-0004',
        tenant_id: ACTIVE_TENANT_ID,
        work_item_id: 'WI-0009',
        decision_type: 'CONFLICT_RESOLVED',
        actor: DEMO_USER_EMAIL,
        timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        reason_code: 'LAB_TEST_AUTHORITY',
        comment: 'Lab test takes precedence over supplier declaration',
        evidence_refs: ['rec_ev_008', 'rec_ev_009'],
        entity_refs: ['SKU-002']
      },
      {
        decision_id: 'D-0005',
        tenant_id: ACTIVE_TENANT_ID,
        work_item_id: null,
        decision_type: 'QUARANTINE',
        actor: DEMO_USER_EMAIL,
        timestamp: ingested,
        reason_code: 'DATA_QUALITY_ISSUE',
        comment: 'Evidence failed schema validation',
        evidence_refs: ['rec_ev_007'],
        entity_refs: []
      },
      {
        decision_id: 'D-0006',
        tenant_id: ACTIVE_TENANT_ID,
        work_item_id: null,
        decision_type: 'QUARANTINE',
        actor: DEMO_USER_EMAIL,
        timestamp: ingested,
        reason_code: 'MISSING_BINDING',
        comment: 'No entity linkage provided',
        evidence_refs: ['rec_ev_010'],
        entity_refs: []
      },
      {
        decision_id: 'D-0007',
        tenant_id: ACTIVE_TENANT_ID,
        work_item_id: 'WI-0004',
        decision_type: 'CANONICAL_FIELD_SELECTION',
        actor: DEMO_USER_EMAIL,
        timestamp: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
        reason_code: 'SOURCE_TRUST_LEVEL',
        comment: 'Selected country_code=TR from ERP source',
        evidence_refs: ['rec_ev_001'],
        entity_refs: ['SUP-001']
      },
      {
        decision_id: 'D-0008',
        tenant_id: ACTIVE_TENANT_ID,
        work_item_id: null,
        decision_type: 'CANONICAL_FIELD_SELECTION',
        actor: DEMO_USER_EMAIL,
        timestamp: sealed3,
        reason_code: 'LATEST_EVIDENCE',
        comment: 'Selected latest BOM version',
        evidence_refs: ['rec_ev_005'],
        entity_refs: ['BOM-001']
      }
    ];
    
    // Audit Events (25 as per spec)
    this.data.auditEvents = [
      { event_id: 'AE-0001', tenant_id: ACTIVE_TENANT_ID, event_type: 'DRAFT_CREATED', object_type: 'evidence_draft', object_id: 'draft_001', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 60 * 1000).toISOString() },
      { event_id: 'AE-0002', tenant_id: ACTIVE_TENANT_ID, event_type: 'VALIDATION_RUN', object_type: 'evidence_draft', object_id: 'draft_001', actor: 'SYSTEM', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 30 * 1000).toISOString() },
      { event_id: 'AE-0003', tenant_id: ACTIVE_TENANT_ID, event_type: 'SEALED', object_type: 'evidence_record', object_id: 'rec_ev_001', actor: DEMO_USER_EMAIL, timestamp: sealed1 },
      { event_id: 'AE-0004', tenant_id: ACTIVE_TENANT_ID, event_type: 'DRAFT_CREATED', object_type: 'evidence_draft', object_id: 'draft_002', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 60 * 1000).toISOString() },
      { event_id: 'AE-0005', tenant_id: ACTIVE_TENANT_ID, event_type: 'VALIDATION_RUN', object_type: 'evidence_draft', object_id: 'draft_002', actor: 'SYSTEM', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 30 * 1000).toISOString() },
      { event_id: 'AE-0006', tenant_id: ACTIVE_TENANT_ID, event_type: 'SEALED', object_type: 'evidence_record', object_id: 'rec_ev_003', actor: DEMO_USER_EMAIL, timestamp: sealed2 },
      { event_id: 'AE-0007', tenant_id: ACTIVE_TENANT_ID, event_type: 'DRAFT_CREATED', object_type: 'evidence_draft', object_id: 'draft_003', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 60 * 1000).toISOString() },
      { event_id: 'AE-0008', tenant_id: ACTIVE_TENANT_ID, event_type: 'SEALED', object_type: 'evidence_record', object_id: 'rec_ev_004', actor: DEMO_USER_EMAIL, timestamp: sealed3 },
      { event_id: 'AE-0009', tenant_id: ACTIVE_TENANT_ID, event_type: 'SEALED', object_type: 'evidence_record', object_id: 'rec_ev_005', actor: DEMO_USER_EMAIL, timestamp: sealed3 },
      { event_id: 'AE-0010', tenant_id: ACTIVE_TENANT_ID, event_type: 'WORK_ITEM_CREATED', object_type: 'work_item', object_id: 'WI-0001', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0011', tenant_id: ACTIVE_TENANT_ID, event_type: 'WORK_ITEM_CREATED', object_type: 'work_item', object_id: 'WI-0002', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0012', tenant_id: ACTIVE_TENANT_ID, event_type: 'WORK_ITEM_CREATED', object_type: 'work_item', object_id: 'WI-0003', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0013', tenant_id: ACTIVE_TENANT_ID, event_type: 'WORK_ITEM_CREATED', object_type: 'work_item', object_id: 'WI-0004', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0014', tenant_id: ACTIVE_TENANT_ID, event_type: 'WORK_ITEM_CREATED', object_type: 'work_item', object_id: 'WI-0005', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0015', tenant_id: ACTIVE_TENANT_ID, event_type: 'WORK_ITEM_CREATED', object_type: 'work_item', object_id: 'WI-0006', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0016', tenant_id: ACTIVE_TENANT_ID, event_type: 'DECISION_CREATED', object_type: 'decision', object_id: 'D-0001', actor: DEMO_USER_EMAIL, timestamp: sealed1 },
      { event_id: 'AE-0017', tenant_id: ACTIVE_TENANT_ID, event_type: 'DECISION_CREATED', object_type: 'decision', object_id: 'D-0002', actor: DEMO_USER_EMAIL, timestamp: sealed2 },
      { event_id: 'AE-0018', tenant_id: ACTIVE_TENANT_ID, event_type: 'DECISION_CREATED', object_type: 'decision', object_id: 'D-0003', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0019', tenant_id: ACTIVE_TENANT_ID, event_type: 'WORK_ITEM_RESOLVED', object_type: 'work_item', object_id: 'WI-0004', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0020', tenant_id: ACTIVE_TENANT_ID, event_type: 'DECISION_CREATED', object_type: 'decision', object_id: 'D-0007', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0021', tenant_id: ACTIVE_TENANT_ID, event_type: 'PACKAGE_EXPORTED', object_type: 'evidence_record', object_id: 'rec_ev_001', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0022', tenant_id: ACTIVE_TENANT_ID, event_type: 'PACKAGE_EXPORTED', object_type: 'evidence_record', object_id: 'rec_ev_005', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0023', tenant_id: ACTIVE_TENANT_ID, event_type: 'WORK_ITEM_CREATED', object_type: 'work_item', object_id: 'WI-0010', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0024', tenant_id: ACTIVE_TENANT_ID, event_type: 'WORK_ITEM_CREATED', object_type: 'work_item', object_id: 'WI-0011', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { event_id: 'AE-0025', tenant_id: ACTIVE_TENANT_ID, event_type: 'WORK_ITEM_CREATED', object_type: 'work_item', object_id: 'WI-0012', actor: DEMO_USER_EMAIL, timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() }
    ];
    
    // Mapping Suggestions (6 as per spec)
    this.data.mappingSuggestions = [
      {
        suggestion_id: 'MS-0001',
        tenant_id: ACTIVE_TENANT_ID,
        mapping_type: 'SUPPLIER_ENTITY',
        source_entity_id: null,
        source_entity_name: 'Anatolia Steel (from evidence)',
        target_entity_id: 'SUP-001',
        target_entity_name: 'Anatolia Steel',
        confidence_score: 95,
        status: 'APPROVED',
        matched_attributes: ['legal_name', 'country_code', 'vat'],
        reasoning: 'Exact match on legal name and VAT',
        created_at_utc: sealed1
      },
      {
        suggestion_id: 'MS-0002',
        tenant_id: ACTIVE_TENANT_ID,
        mapping_type: 'SKU_ENTITY',
        source_entity_id: null,
        source_entity_name: 'Hot-rolled steel coil',
        target_entity_id: 'SKU-001',
        target_entity_name: 'Hot-rolled steel coil',
        confidence_score: 92,
        status: 'PENDING',
        matched_attributes: ['sku_code', 'name'],
        reasoning: 'SKU code and name match with 92% confidence',
        created_at_utc: sealed2
      },
      {
        suggestion_id: 'MS-0003',
        tenant_id: ACTIVE_TENANT_ID,
        mapping_type: 'SUPPLIER_ENTITY',
        source_entity_id: null,
        source_entity_name: 'Baltic Metals Ltd',
        target_entity_id: 'SUP-002',
        target_entity_name: 'Baltic Metals',
        confidence_score: 88,
        status: 'PENDING',
        matched_attributes: ['legal_name'],
        reasoning: 'Fuzzy match on legal name, slight variation detected',
        created_at_utc: sealed3
      },
      {
        suggestion_id: 'MS-0004',
        tenant_id: ACTIVE_TENANT_ID,
        mapping_type: 'SKU_ENTITY',
        source_entity_id: null,
        source_entity_name: 'Steel fasteners M8',
        target_entity_id: 'SKU-002',
        target_entity_name: 'Steel fasteners',
        confidence_score: 75,
        status: 'PENDING',
        matched_attributes: ['category'],
        reasoning: 'Category match, partial name match',
        created_at_utc: ingested
      },
      {
        suggestion_id: 'MS-0005',
        tenant_id: ACTIVE_TENANT_ID,
        mapping_type: 'SUPPLIER_ENTITY',
        source_entity_id: null,
        source_entity_name: 'Nordic Alloys',
        target_entity_id: 'SUP-003',
        target_entity_name: 'Nordic Alloys AB',
        confidence_score: 85,
        status: 'PENDING',
        matched_attributes: ['legal_name', 'country_code'],
        reasoning: 'Legal name partial match, country code match',
        created_at_utc: ingested
      },
      {
        suggestion_id: 'MS-0006',
        tenant_id: ACTIVE_TENANT_ID,
        mapping_type: 'BOM_COMPONENT',
        source_entity_id: 'BOM-001',
        source_entity_name: 'Component C-UNKNOWN-77',
        target_entity_id: 'SKU-002',
        target_entity_name: 'Steel fasteners',
        confidence_score: 70,
        status: 'PENDING',
        matched_attributes: ['material_type'],
        reasoning: 'Material type similarity, low confidence',
        created_at_utc: sealed3
      }
    ];
    
    // Evidence Drafts (Contract 1) - 3 with different statuses
    const draft1Payload = { supplier_name: 'Alpine Steelworks GmbH', country_code: 'AT', vat: 'AT987654321', primary_contact_email: 'contact@alpine.at' };
    const draft2Payload = { sku_code: '', sku_name: '' }; // Intentionally incomplete
    const draft3Payload = { declaration_text: 'We confirm ISO 13485 compliance', signed_by: 'CEO', signature_date: '2026-02-01' };
    
    this.data.evidenceDrafts = [
      {
        draft_id: 'draft_001',
        tenant_id: ACTIVE_TENANT_ID,
        ingestion_method: 'MANUAL_ENTRY',
        evidence_type: 'SUPPLIER_MASTER_V1',
        declared_scope: 'SUPPLIER',
        binding_mode: 'BIND_EXISTING',
        bound_entity_type: 'SUPPLIER',
        bound_entity_id: 'SUP-004',
        why_this_evidence: 'Annual supplier master data update Q1 2026',
        provenance_source: 'SAP HANA production database export',
        status: 'VALIDATED',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        payload_stub: JSON.stringify(draft1Payload),
        extracted_json_stub: JSON.stringify(draft1Payload),
        validation_errors: [],
        payload_hash_sha256: this.simpleHash(JSON.stringify(draft1Payload)),
        metadata_hash_sha256: this.simpleHash(JSON.stringify({ evidence_type: 'SUPPLIER_MASTER_V1', ingestion_method: 'MANUAL_ENTRY', tenant_id: ACTIVE_TENANT_ID }))
      },
      {
        draft_id: 'draft_002',
        tenant_id: ACTIVE_TENANT_ID,
        ingestion_method: 'FILE_UPLOAD',
        evidence_type: 'SKU_MASTER_V1',
        declared_scope: 'SKU',
        binding_mode: 'BIND_EXISTING',
        bound_entity_type: 'SKU',
        bound_entity_id: null,
        why_this_evidence: '',
        provenance_source: '',
        status: 'QUARANTINED',
        quarantine_reason: 'VALIDATION_FAILED',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        payload_stub: JSON.stringify(draft2Payload),
        extracted_json_stub: null,
        validation_errors: [
          { field: 'bound_entity_id', message: 'Entity binding required for SKU_MASTER_V1' },
          { field: 'why_this_evidence', message: 'Justification is required' },
          { field: 'sku_code', message: 'SKU code is required' },
          { field: 'sku_name', message: 'SKU name is required' }
        ],
        payload_hash_sha256: null,
        metadata_hash_sha256: null
      },
      {
        draft_id: 'draft_003',
        tenant_id: ACTIVE_TENANT_ID,
        ingestion_method: 'SUPPLIER_PORTAL',
        evidence_type: 'SUPPLIER_DECLARATION_V1',
        declared_scope: 'SUPPLIER',
        binding_mode: 'BIND_EXISTING',
        bound_entity_type: 'SUPPLIER',
        bound_entity_id: 'SUP-002',
        why_this_evidence: 'Supplier self-declaration for compliance verification',
        provenance_source: 'Supplier Portal submission form',
        status: 'VALIDATED',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        payload_stub: JSON.stringify(draft3Payload),
        extracted_json_stub: JSON.stringify(draft3Payload),
        validation_errors: [],
        payload_hash_sha256: this.simpleHash(JSON.stringify(draft3Payload)),
        metadata_hash_sha256: this.simpleHash(JSON.stringify({ evidence_type: 'SUPPLIER_DECLARATION_V1', ingestion_method: 'SUPPLIER_PORTAL', tenant_id: ACTIVE_TENANT_ID }))
      }
    ];

    this.data.initialized = true;
    this.save();
    
    console.log('[DemoDataStore] Seed complete:', {
      evidence: this.data.evidence.length,
      workItems: this.data.workItems.length,
      entities: this.data.entities.length,
      decisions: this.data.decisions.length,
      auditEvents: this.data.auditEvents.length,
      mappingSuggestions: this.data.mappingSuggestions.length
    });
  }

  getTenant() {
    return this.data.tenant;
  }

  listEvidence(filters = {}) {
    const { page = 1, pageSize = 50, filters: queryFilters = {} } = filters;
    let evidence = this.data.evidence.filter(e => e.tenant_id === ACTIVE_TENANT_ID);
    
    // Apply query filters
    if (queryFilters.status) {
      evidence = evidence.filter(e => e.status === queryFilters.status);
    }
    if (queryFilters.dataset_type) {
      evidence = evidence.filter(e => e.dataset_type === queryFilters.dataset_type);
    }
    
    // Return paginated result
    const total = evidence.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const data = evidence.slice(startIdx, endIdx);
    
    return { data, total, page, pageSize };
  }

  getEvidenceByRecordId(record_id) {
    return this.data.evidence.find(e => e.record_id === record_id && e.tenant_id === ACTIVE_TENANT_ID);
  }

  getEvidenceByDisplayId(display_id) {
    return this.data.evidence.find(e => e.display_id === display_id && e.tenant_id === ACTIVE_TENANT_ID);
  }

  listWorkItems(filters = {}) {
    const { page = 1, pageSize = 100, filters: queryFilters = {} } = filters;
    let workItems = this.data.workItems.filter(w => w.tenant_id === ACTIVE_TENANT_ID);
    
    // Apply query filters
    if (queryFilters.type) {
      workItems = workItems.filter(w => w.type === queryFilters.type);
    }
    if (queryFilters.status) {
      workItems = workItems.filter(w => w.status === queryFilters.status);
    }
    if (queryFilters.priority) {
      workItems = workItems.filter(w => w.priority === queryFilters.priority);
    }
    
    // Return paginated result
    const total = workItems.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const data = workItems.slice(startIdx, endIdx);
    
    return { data, total, page, pageSize };
  }

  getWorkItemById(work_item_id) {
    return this.data.workItems.find(w => w.work_item_id === work_item_id && w.tenant_id === ACTIVE_TENANT_ID);
  }

  getWorkItem(work_item_id) {
    return this.getWorkItemById(work_item_id);
  }

  createWorkItem(payload) {
    const newId = `WI-${String(this.data.workItems.length + 1).padStart(4, '0')}`;
    const workItem = {
      work_item_id: newId,
      tenant_id: ACTIVE_TENANT_ID,
      type: payload.type || 'REVIEW',
      status: 'OPEN',
      priority: payload.priority || 'MEDIUM',
      title: payload.title || 'New Work Item',
      required_action_text: payload.required_action_text,
      reason_codes: payload.reason_codes || ['MANUAL_CREATION'],
      linked_entity: payload.linked_entity,
      linked_evidence_record_ids: payload.linked_evidence_record_ids || [],
      created_at_utc: new Date().toISOString(),
      sla_due_utc: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      owner: payload.owner || DEMO_USER_EMAIL,
      estimated_cost_eur: payload.estimated_cost_eur || 0,
      risk_eur: payload.risk_eur || payload.estimated_cost_eur || 0
    };
    
    this.data.workItems.push(workItem);
    this.addAuditEvent({
      event_type: 'WORK_ITEM_CREATED',
      object_type: 'work_item',
      object_id: newId,
      actor: DEMO_USER_EMAIL
    });
    this.save();
    
    return workItem;
  }

  createFollowUp(parent_work_item_id, payload) {
    const parent = this.getWorkItem(parent_work_item_id);
    if (!parent) {
      throw new Error(`Parent work item ${parent_work_item_id} not found`);
    }
    
    return this.createWorkItem({
      ...payload,
      linked_entity: parent.linked_entity,
      linked_evidence_record_ids: parent.linked_evidence_record_ids,
      title: payload.title || `Follow-up: ${parent.title}`
    });
  }

  resolveWorkItem(work_item_id, resolution) {
    const workItem = this.getWorkItem(work_item_id);
    if (!workItem) {
      throw new Error(`Work item ${work_item_id} not found`);
    }
    
    const oldStatus = workItem.status;
    workItem.status = 'RESOLVED';
    workItem.resolved_at_utc = new Date().toISOString();
    workItem.resolution = resolution;
    
    this.addAuditEvent({
      event_type: 'STATE_TRANSITION',
      object_type: 'work_item',
      object_id: work_item_id,
      metadata: { from_state: oldStatus, to_state: 'RESOLVED' }
    });
    
    const decision = {
      decision_id: `D-${String(this.data.decisions.length + 1).padStart(4, '0')}`,
      tenant_id: ACTIVE_TENANT_ID,
      work_item_id,
      decision_type: resolution.outcome || resolution.strategy || 'RESOLVED',
      actor: DEMO_USER_EMAIL,
      timestamp: new Date().toISOString(),
      reason_code: resolution.reason_code,
      comment: resolution.comment,
      evidence_refs: workItem.linked_evidence_record_ids || [],
      entity_refs: workItem.linked_entity ? [workItem.linked_entity.id] : []
    };
    
    this.data.decisions.push(decision);
    
    // If CONFLICT type, update canonical field
    if (workItem.type === 'CONFLICT' && resolution.selected_value && workItem.linked_entity) {
      this.updateEntityCanonical(
        workItem.linked_entity.type,
        workItem.linked_entity.id,
        workItem.details?.field || 'resolved_field',
        resolution.selected_value,
        resolution.selected_evidence_id || 'manual'
      );
    }
    
    this.save();
    
    return decision;
  }

  listEntities(type, filters = {}) {
    return this.data.entities.filter(e => e.type === type && e.tenant_id === ACTIVE_TENANT_ID);
  }

  getEntity(type, id) {
    return this.data.entities.find(e => e.type === type && e.entity_id === id && e.tenant_id === ACTIVE_TENANT_ID);
  }

  updateEntityCanonical(type, id, field, value, evidence_id) {
    const entity = this.getEntity(type, id);
    if (!entity) return;
    
    if (!entity.canonical_fields) {
      entity.canonical_fields = {};
    }
    
    entity.canonical_fields[field] = value;
    entity.canonical_fields[`${field}_evidence_id`] = evidence_id;
    entity.canonical_fields[`${field}_updated_at`] = new Date().toISOString();
    entity.canonical_fields[`${field}_updated_by`] = DEMO_USER_EMAIL;
    
    this.save();
  }

  listDecisions(filters = {}) {
    let decisions = this.data.decisions.filter(d => d.tenant_id === ACTIVE_TENANT_ID);
    
    if (filters.work_item_id) {
      decisions = decisions.filter(d => d.work_item_id === filters.work_item_id);
    }
    
    return decisions;
  }

  addDecision(decision) {
    const newDecision = {
      decision_id: `D-${String(this.data.decisions.length + 1).padStart(4, '0')}`,
      tenant_id: ACTIVE_TENANT_ID,
      work_item_id: decision.work_item_id,
      decision_type: decision.decision_type,
      actor: DEMO_USER_EMAIL,
      timestamp: new Date().toISOString(),
      reason_code: decision.reason_code,
      comment: decision.comment,
      evidence_refs: decision.evidence_refs,
      entity_refs: decision.entity_refs
    };
    
    this.data.decisions.push(newDecision);
    this.save();
    
    return newDecision;
  }

  listAuditEvents(filters = {}) {
    let events = this.data.auditEvents.filter(e => e.tenant_id === ACTIVE_TENANT_ID);
    
    if (filters.object_type) {
      events = events.filter(e => e.object_type === filters.object_type);
    }
    
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  createAuditEvent(event) {
    return this.addAuditEvent(event);
  }

  addAuditEvent(event) {
    const newEvent = {
      event_id: `AE-${String(this.data.auditEvents.length + 1).padStart(4, '0')}`,
      tenant_id: ACTIVE_TENANT_ID,
      event_type: event.event_type,
      object_type: event.object_type,
      object_id: event.object_id,
      actor: event.actor || DEMO_USER_EMAIL,
      timestamp: new Date().toISOString(),
      metadata: event.metadata
    };
    
    this.data.auditEvents.push(newEvent);
    this.save();
    
    return newEvent;
  }

  // Evidence Draft Methods (Contract 1)
  listEvidenceDrafts(filters = {}) {
    if (!this.data.evidenceDrafts) this.data.evidenceDrafts = [];
    let drafts = this.data.evidenceDrafts.filter(d => d.tenant_id === ACTIVE_TENANT_ID);
    
    if (filters.status) {
      drafts = drafts.filter(d => d.status === filters.status);
    }
    
    return drafts.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  }
  
  createEvidenceDraft(draftData) {
    const draft_id = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const draft = {
      draft_id,
      tenant_id: ACTIVE_TENANT_ID,
      ingestion_method: draftData.ingestion_method || 'MANUAL_ENTRY',
      evidence_type: draftData.evidence_type,
      declared_scope: draftData.declared_scope,
      binding_mode: draftData.binding_mode || 'BIND_EXISTING',
      bound_entity_type: draftData.bound_entity_type,
      bound_entity_id: draftData.bound_entity_id,
      why_this_evidence: draftData.why_this_evidence || '',
      provenance_source: draftData.provenance_source || '',
      status: 'DRAFT_CREATED',
      payload_stub: draftData.payload_stub || null,
      extracted_json_stub: null,
      validation_errors: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: DEMO_USER_EMAIL
    };
    
    if (!this.data.evidenceDrafts) {
      this.data.evidenceDrafts = [];
    }
    
    this.data.evidenceDrafts.push(draft);
    this.addAuditEvent({
      event_type: 'STATE_TRANSITION',
      object_type: 'evidence_draft',
      object_id: draft_id,
      metadata: { 
        from_state: null, 
        to_state: 'DRAFT_CREATED',
        evidence_type: draft.evidence_type, 
        ingestion_method: draft.ingestion_method 
      }
    });
    this.save();
    
    return draft;
  }

  getEvidenceDraft(draft_id) {
    if (!this.data.evidenceDrafts) return null;
    return this.data.evidenceDrafts.find(d => d.draft_id === draft_id && d.tenant_id === ACTIVE_TENANT_ID);
  }

  updateEvidenceDraft(draft_id, updates) {
    const draft = this.getEvidenceDraft(draft_id);
    if (!draft) throw new Error(`Draft ${draft_id} not found`);
    
    const oldStatus = draft.status;
    Object.assign(draft, updates);
    draft.updated_at = new Date().toISOString();
    
    // State transition: DRAFT_CREATED → PAYLOAD_ATTACHED
    if (updates.payload_stub && draft.status === 'DRAFT_CREATED') {
      const newStatus = 'PAYLOAD_ATTACHED';
      draft.status = newStatus;
      draft.payload_hash_sha256 = this.simpleHash(updates.payload_stub);
      draft.metadata_hash_sha256 = this.simpleHash(JSON.stringify({ 
        evidence_type: draft.evidence_type, 
        ingestion_method: draft.ingestion_method, 
        tenant_id: ACTIVE_TENANT_ID 
      }));
      
      this.addAuditEvent({
        event_type: 'STATE_TRANSITION',
        object_type: 'evidence_draft',
        object_id: draft_id,
        metadata: { from_state: oldStatus, to_state: newStatus }
      });
    }
    
    this.save();
    
    return draft;
  }

  validateEvidenceDraft(draft_id) {
    const draft = this.getEvidenceDraft(draft_id);
    if (!draft) throw new Error(`Draft ${draft_id} not found`);
    
    // State guard: can only validate if PAYLOAD_ATTACHED or later
    if (draft.status === 'DRAFT_CREATED') {
      return { valid: false, errors: [{ field: 'state', message: 'Cannot validate: payload not attached' }] };
    }
    
    const oldStatus = draft.status;
    const errors = [];
    
    // Required fields
    if (!draft.why_this_evidence || draft.why_this_evidence.trim() === '') {
      errors.push({ field: 'why_this_evidence', message: 'Justification is required' });
    }
    if (!draft.provenance_source || draft.provenance_source.trim() === '') {
      errors.push({ field: 'provenance_source', message: 'Provenance source is required' });
    }
    if (draft.binding_mode === 'BIND_EXISTING' && !draft.bound_entity_id) {
      errors.push({ field: 'bound_entity_id', message: 'Entity binding is required when binding mode is BIND_EXISTING' });
    }
    if (!draft.payload_stub) {
      errors.push({ field: 'payload', message: 'Payload is required' });
    }
    
    // Check if bound entity exists
    if (draft.binding_mode === 'BIND_EXISTING' && draft.bound_entity_id) {
      const entity = this.getEntity(draft.bound_entity_type, draft.bound_entity_id);
      if (!entity) {
        errors.push({ field: 'bound_entity_id', message: `${draft.bound_entity_type} ${draft.bound_entity_id} does not exist` });
        draft.status = 'QUARANTINED';
        draft.quarantine_reason = 'ENTITY_NOT_FOUND';
        this.addAuditEvent({
          event_type: 'STATE_TRANSITION',
          object_type: 'evidence_draft',
          object_id: draft_id,
          metadata: { from_state: oldStatus, to_state: 'QUARANTINED', reason: 'ENTITY_NOT_FOUND' }
        });
        this.save();
        return { valid: false, errors };
      }
    }
    
    // Schema validation
    if (draft.payload_stub) {
      try {
        const payload = JSON.parse(draft.payload_stub);
        if (draft.evidence_type === 'SUPPLIER_MASTER_V1') {
          if (!payload.supplier_name && !payload.legal_name) errors.push({ field: 'supplier_name', message: 'Supplier name is required' });
          if (!payload.country_code) errors.push({ field: 'country_code', message: 'Country code is required' });
        } else if (draft.evidence_type === 'SKU_MASTER_V1') {
          if (!payload.sku_code) errors.push({ field: 'sku_code', message: 'SKU code is required' });
          if (!payload.sku_name) errors.push({ field: 'sku_name', message: 'SKU name is required' });
        }
      } catch (e) {
        errors.push({ field: 'payload', message: 'Invalid JSON format' });
        draft.status = 'QUARANTINED';
        draft.quarantine_reason = 'SCHEMA_MISMATCH';
        this.addAuditEvent({
          event_type: 'STATE_TRANSITION',
          object_type: 'evidence_draft',
          object_id: draft_id,
          metadata: { from_state: oldStatus, to_state: 'QUARANTINED', reason: 'SCHEMA_MISMATCH' }
        });
        this.save();
        return { valid: false, errors };
      }
    }
    
    draft.validation_errors = errors;
    
    // State transition: PAYLOAD_ATTACHED → VALIDATED or QUARANTINED
    if (errors.length === 0) {
      const newStatus = 'VALIDATED';
      draft.status = newStatus;
      this.addAuditEvent({
        event_type: 'STATE_TRANSITION',
        object_type: 'evidence_draft',
        object_id: draft_id,
        metadata: { from_state: oldStatus, to_state: newStatus }
      });
    } else {
      draft.status = 'QUARANTINED';
      draft.quarantine_reason = 'VALIDATION_FAILED';
      this.addAuditEvent({
        event_type: 'STATE_TRANSITION',
        object_type: 'evidence_draft',
        object_id: draft_id,
        metadata: { from_state: oldStatus, to_state: 'QUARANTINED', reason: 'VALIDATION_FAILED', error_count: errors.length }
      });
    }
    
    draft.updated_at = new Date().toISOString();
    this.save();
    
    return { valid: errors.length === 0, errors };
  }

  sealEvidenceDraft(draft_id) {
    const draft = this.getEvidenceDraft(draft_id);
    if (!draft) throw new Error(`Draft ${draft_id} not found`);
    
    // State guard: can only seal if VALIDATED
    if (draft.status !== 'VALIDATED' && draft.status !== 'READY_TO_SEAL') {
      throw new Error(`Cannot seal: status is ${draft.status}, must be VALIDATED or READY_TO_SEAL`);
    }
    
    // Transition to READY_TO_SEAL if currently VALIDATED
    const oldStatus = draft.status;
    if (draft.status === 'VALIDATED') {
      draft.status = 'READY_TO_SEAL';
      this.addAuditEvent({
        event_type: 'STATE_TRANSITION',
        object_type: 'evidence_draft',
        object_id: draft_id,
        metadata: { from_state: oldStatus, to_state: 'READY_TO_SEAL' }
      });
    }
    
    // Generate record identifiers
    const nextNum = this.data.evidence.length + 1;
    const display_id = `EV-${String(nextNum).padStart(4, '0')}`;
    const record_id = `rec_ev_${Date.now()}`;
    
    // Parse payload
    let payload = {};
    try {
      payload = JSON.parse(draft.payload_stub || '{}');
    } catch (e) {
      throw new Error('Invalid payload JSON');
    }
    
    // Create sealed evidence record
    const evidence = {
      record_id,
      display_id,
      evidence_id: display_id,
      tenant_id: ACTIVE_TENANT_ID,
      status: 'SEALED',
      dataset_type: draft.evidence_type,
      evidence_type: draft.evidence_type,
      declared_scope: draft.declared_scope,
      bound_entity_type: draft.bound_entity_type,
      bound_entity_id: draft.bound_entity_id,
      ingestion_method: draft.ingestion_method,
      source_system: draft.provenance_source || (draft.ingestion_method === 'MANUAL_ENTRY' ? 'SUPPLYLENS' : 'UNKNOWN'),
      created_by: DEMO_USER_EMAIL,
      ingested_by: DEMO_USER_EMAIL,
      ingested_at_utc: new Date().toISOString(),
      sealed_at_utc: new Date().toISOString(),
      retention_ends_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      why_this_evidence: draft.why_this_evidence,
      provenance_source: draft.provenance_source,
      payload_hash_sha256: draft.payload_hash_sha256,
      metadata_hash_sha256: draft.metadata_hash_sha256,
      linked_entities: draft.bound_entity_id ? [{ type: draft.bound_entity_type, id: draft.bound_entity_id }] : [],
      claims: payload,
      blocking_issues: []
    };
    
    // Auto-create work items based on evidence type and validation
    this.autoCreateWorkItemsOnSeal(evidence, payload);
    
    this.data.evidence.push(evidence);
    
    // State transition: READY_TO_SEAL → SEALED
    const sealOldStatus = draft.status;
    draft.status = 'SEALED';
    draft.sealed_record_id = record_id;
    draft.sealed_at = new Date().toISOString();
    draft.updated_at = new Date().toISOString();
    
    this.addAuditEvent({
      event_type: 'STATE_TRANSITION',
      object_type: 'evidence_draft',
      object_id: draft_id,
      metadata: { from_state: sealOldStatus, to_state: 'SEALED', record_id, display_id }
    });
    
    this.addAuditEvent({
      event_type: 'EVIDENCE_SEALED',
      object_type: 'evidence_record',
      object_id: record_id,
      metadata: { 
        evidence_id: display_id,
        display_id,
        draft_id,
        evidence_type: evidence.evidence_type,
        payload_hash_sha256: evidence.payload_hash_sha256,
        metadata_hash_sha256: evidence.metadata_hash_sha256,
        scope_binding_status: evidence.bound_entity_id ? 'BOUND' : 'UNRESOLVED',
        evidence_receipt_id: `RCPT-${display_id}`
      }
    });
    
    this.save();
    
    return {
      ...evidence,
      scope_binding_status: evidence.bound_entity_id ? 'BOUND' : 'UNRESOLVED',
      evidence_receipt_id: `RCPT-${display_id}`
    };
  }

  autoCreateWorkItemsOnSeal(evidence, payload) {
    const workItemsToCreate = [];
    
    // CBAM import evidence validations
    if (evidence.dataset_type?.includes('CBAM')) {
      if (!evidence.bound_entity_id && payload.supplier_name) {
        workItemsToCreate.push({
          type: 'MAPPING',
          priority: 'HIGH',
          title: 'Confirm supplier match for CBAM import',
          required_action_text: `Map supplier "${payload.supplier_name}" to existing supplier entity`,
          reason_codes: ['PENDING_MATCH', 'CBAM_SUPPLIER_MAPPING'],
          linked_evidence_record_ids: [evidence.record_id]
        });
        evidence.blocking_issues.push('SUPPLIER_NOT_MAPPED');
      }
      
      if (!payload.installation_id) {
        workItemsToCreate.push({
          type: 'BLOCKED',
          priority: 'CRITICAL',
          title: 'Missing installation data for CBAM calculation',
          required_action_text: 'Supplier must provide installation operator emission report',
          reason_codes: ['MISSING_CBAM_DATA', 'REGULATORY_DEADLINE'],
          linked_evidence_record_ids: [evidence.record_id],
          linked_entity: evidence.bound_entity_id ? { type: evidence.bound_entity_type, id: evidence.bound_entity_id } : null
        });
        evidence.blocking_issues.push('INSTALLATION_MISSING');
      }
      
      if (payload.cn_code && !/^\d{8}$/.test(payload.cn_code)) {
        workItemsToCreate.push({
          type: 'REVIEW',
          priority: 'HIGH',
          title: 'Validate CBAM CN code format',
          required_action_text: 'CN code must be 8 digits',
          reason_codes: ['VALIDATION_ERROR', 'CN_CODE_INVALID'],
          linked_evidence_record_ids: [evidence.record_id]
        });
        evidence.blocking_issues.push('CN_CODE_INVALID');
      }
    }
    
    // BOM evidence validations
    if (evidence.dataset_type?.includes('BOM')) {
      const components = payload.components || [];
      const unmatchedComponents = components.filter(c => c.status === 'PENDING_MATCH' || (!c.component_ref && c.component_code_raw));
      
      if (unmatchedComponents.length > 0) {
        unmatchedComponents.forEach(comp => {
          workItemsToCreate.push({
            type: 'MAPPING',
            priority: 'HIGH',
            title: `Map BOM component ${comp.component_code_raw || 'unknown'}`,
            required_action_text: `Map component to existing SKU or create new SKU`,
            reason_codes: ['PENDING_MATCH', 'BOM_COMPONENT_MAPPING'],
            linked_evidence_record_ids: [evidence.record_id],
            linked_entity: evidence.bound_entity_id ? { type: 'BOM', id: evidence.bound_entity_id } : null
          });
        });
        evidence.blocking_issues.push('BOM_COMPONENT_UNMATCHED');
      }
    }
    
    // SKU evidence validations
    if (evidence.dataset_type?.includes('SKU')) {
      if (!payload.weight_kg && !payload.unit_weight) {
        workItemsToCreate.push({
          type: 'REVIEW',
          priority: 'MEDIUM',
          title: 'SKU missing weight for LCA calculation',
          required_action_text: 'Provide unit weight or mass for lifecycle assessment',
          reason_codes: ['MISSING_LCA_DATA', 'WEIGHT_REQUIRED'],
          linked_evidence_record_ids: [evidence.record_id],
          linked_entity: evidence.bound_entity_id ? { type: 'SKU', id: evidence.bound_entity_id } : null
        });
        evidence.blocking_issues.push('WEIGHT_MISSING');
      }
    }
    
    // Shipment evidence validations
    if (evidence.dataset_type?.includes('LOGISTICS') || evidence.dataset_type?.includes('SHIPMENT')) {
      const legs = payload.legs || payload.shipment_legs || [];
      const missingData = legs.filter(leg => !leg.distance_km || !leg.transport_mode);
      
      if (missingData.length > 0) {
        workItemsToCreate.push({
          type: 'REVIEW',
          priority: 'MEDIUM',
          title: 'Shipment leg missing distance or mode',
          required_action_text: 'Complete missing distance or transport mode data',
          reason_codes: ['MISSING_LOGISTICS_DATA'],
          linked_evidence_record_ids: [evidence.record_id]
        });
        evidence.blocking_issues.push('SHIPMENT_DATA_INCOMPLETE');
      }
    }
    
    // Create all work items
    workItemsToCreate.forEach(wiPayload => {
      this.createWorkItem({
        ...wiPayload,
        owner: DEMO_USER_EMAIL,
        estimated_cost_eur: wiPayload.priority === 'CRITICAL' ? 15000 : wiPayload.priority === 'HIGH' ? 1200 : 500,
        risk_eur: wiPayload.priority === 'CRITICAL' ? 15000 : wiPayload.priority === 'HIGH' ? 1200 : 0
      });
    });
  }

  listMappingSuggestions(filters = {}) {
    if (!this.data.mappingSuggestions) return [];
    let suggestions = this.data.mappingSuggestions.filter(s => s.tenant_id === ACTIVE_TENANT_ID);
    
    if (filters.status) {
      suggestions = suggestions.filter(s => s.status === filters.status);
    }
    
    return suggestions;
  }

  approveMappingSuggestion(suggestion_id, comment) {
    if (!this.data.mappingSuggestions) this.data.mappingSuggestions = [];
    
    const suggestion = this.data.mappingSuggestions.find(s => s.suggestion_id === suggestion_id);
    if (!suggestion) throw new Error(`Suggestion ${suggestion_id} not found`);
    
    suggestion.status = 'APPROVED';
    suggestion.reviewed_by = DEMO_USER_EMAIL;
    suggestion.reviewed_at_utc = new Date().toISOString();
    suggestion.comment = comment;
    
    this.addDecision({
      decision_type: 'MAPPING_APPROVED',
      work_item_id: null,
      reason_code: 'AI_SUGGESTION_APPROVED',
      comment,
      evidence_refs: [],
      entity_refs: [suggestion.target_entity_id]
    });
    
    this.save();
    return suggestion;
  }

  rejectMappingSuggestion(suggestion_id, reason) {
    if (!this.data.mappingSuggestions) this.data.mappingSuggestions = [];
    
    const suggestion = this.data.mappingSuggestions.find(s => s.suggestion_id === suggestion_id);
    if (!suggestion) throw new Error(`Suggestion ${suggestion_id} not found`);
    
    suggestion.status = 'REJECTED';
    suggestion.reviewed_by = DEMO_USER_EMAIL;
    suggestion.reviewed_at_utc = new Date().toISOString();
    suggestion.rejection_reason = reason;
    
    this.save();
    return suggestion;
  }

  getKPIs() {
    const workItems = this.listWorkItems();
    const evidence = this.listEvidence();
    const decisions = this.listDecisions();
    const entities = this.data.entities || [];
    
    const openWorkItems = workItems.filter(w => w.status === 'OPEN').length;
    const blockedWorkItems = workItems.filter(w => w.type === 'BLOCKED' || w.status === 'BLOCKED').length;
    const totalEvidence = evidence.length;
    const pendingDecisions = workItems.filter(w => w.type === 'REVIEW' && w.status === 'OPEN').length;
    
    // Readiness: BLOCKED if any BLOCKED work items, otherwise READY
    const readiness = blockedWorkItems > 0 ? 'BLOCKED' : 'READY';
    
    // Calculate integration health
    const connectors = this.data.connectors || [];
    const healthyConnectors = connectors.filter(c => c.status === 'OK').length;
    const integrationHealth = connectors.length > 0 ? Math.round((healthyConnectors / connectors.length) * 100) : 100;
    
    return {
      open_work_items: openWorkItems,
      blocked_work_items: blockedWorkItems,
      total_evidence: totalEvidence,
      pending_decisions: pendingDecisions,
      readiness_status: readiness,
      mapping_rate: entities.filter(e => e.mapping_status === 'MAPPED').length / Math.max(entities.length, 1) * 100,
      integration_health: integrationHealth
    };
  }
  
  getIntegrationConnectors() {
    return this.data.connectors || [];
  }

  getRecentActivity(limit = 10) {
    const events = this.listAuditEvents({ object_type: 'evidence_record' });
    const evidenceResult = this.listEvidence({ page: 1, pageSize: 1000 });
    const evidence = evidenceResult.data || evidenceResult;
    
    // Also include draft creation events
    const draftEvents = this.listAuditEvents({}).filter(e => 
      e.event_type === 'DRAFT_CREATED' || e.object_type === 'evidence_draft'
    );
    
    const combinedEvents = [...events, ...draftEvents.slice(0, 5)].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return combinedEvents.slice(0, limit).map(e => {
      const ev = evidence.find(ev => ev.record_id === e.object_id || ev.display_id === e.object_id);
      const draft = this.getEvidenceDraft(e.object_id);
      
      return {
        ...e,
        record_id: ev?.record_id || e.object_id,
        display_id: ev?.display_id || draft?.draft_id || e.object_id,
        dataset_type: ev?.dataset_type || draft?.evidence_type || 'UNKNOWN',
        status: ev?.status || draft?.status || 'UNKNOWN',
        ingestion_method: ev?.ingestion_method || draft?.ingestion_method || 'UNKNOWN',
        source_system: ev?.source_system || draft?.provenance_source || 'UNKNOWN',
        created_by: ev?.created_by || draft?.created_by || e.actor,
        icon: e.event_type === 'SEALED' ? 'shield' :
              e.event_type === 'WORK_ITEM_CREATED' ? 'alert' :
              e.event_type === 'WORK_ITEM_RESOLVED' ? 'check' :
              'activity'
      };
    });
  }

  simpleHash(str) {
    // Simple deterministic hash (NOT cryptographically secure)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = this.getEmptyStore();
    this.seedData();
  }

  // Supplier-SKU Mapping Methods
  getSupplierMappings(supplier_id) {
    if (!this.data.supplierSkuMappings) this.data.supplierSkuMappings = [];
    return this.data.supplierSkuMappings.filter(m => m.supplier_id === supplier_id);
  }

  getSKUMappings(sku_id) {
    if (!this.data.supplierSkuMappings) this.data.supplierSkuMappings = [];
    return this.data.supplierSkuMappings.filter(m => m.sku_id === sku_id);
  }

  getWorkItemsForEntity(entity_type, entity_id) {
    return this.data.workItems.filter(wi => 
      wi.linked_entity?.type === entity_type && wi.linked_entity?.id === entity_id
    );
  }

  getEvidenceForEntity(entity_type, entity_id) {
    return this.data.evidence.filter(ev => 
      ev.linked_entities?.some(le => le.type === entity_type && le.id === entity_id)
    );
  }

  // Access Control Logging (Contract 2)
  logAccessEvent(payload) {
    if (!this.data.accessLogs) this.data.accessLogs = [];
    
    const log = {
      log_id: `AL-${String(this.data.accessLogs.length + 1).padStart(5, '0')}`,
      tenant_id: payload.tenant_id || ACTIVE_TENANT_ID,
      action: payload.action,
      evidence_id: payload.evidence_id,
      user_email: payload.user_email,
      user_role: payload.user_role,
      result: payload.result,
      reason: payload.reason,
      timestamp: payload.timestamp || new Date().toISOString(),
      ip_address: payload.ip_address || '192.168.1.1'
    };
    
    this.data.accessLogs.push(log);
    this.save();
    
    return log;
  }

  listAccessLogs(filters = {}) {
    if (!this.data.accessLogs) this.data.accessLogs = [];
    let logs = this.data.accessLogs.filter(l => l.tenant_id === ACTIVE_TENANT_ID);
    
    if (filters.evidence_id) {
      logs = logs.filter(l => l.evidence_id === filters.evidence_id);
    }
    
    if (filters.action) {
      logs = logs.filter(l => l.action === filters.action);
    }
    
    if (filters.result) {
      logs = logs.filter(l => l.result === filters.result);
    }
    
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

// Singleton instance
let storeInstance = null;

export function getDemoStore() {
  if (!storeInstance) {
    storeInstance = new DemoDataStore();
  }
  return storeInstance;
}

export const demoStore = getDemoStore();
export { ACTIVE_TENANT_ID, DEMO_USER_ID, DEMO_USER_EMAIL };
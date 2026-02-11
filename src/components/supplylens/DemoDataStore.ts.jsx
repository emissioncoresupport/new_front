/**
 * SupplyLens Demo Data Store - Single Source of Truth
 * 
 * Deterministic mock store used by ALL SupplyLens Contract 2 pages.
 * Persisted to localStorage with tenant isolation.
 * Provides stable IDs and realistic data for demo/testing.
 * 
 * Storage key: "supplylens_demo_store_v1"
 */

const STORAGE_KEY = 'supplylens_demo_store_v1';

interface Tenant {
  tenant_id: string;
  tenant_name: string;
  user_id: string;
  user_email: string;
}

interface EvidenceRecord {
  record_id: string;
  display_id: string;
  tenant_id: string;
  status: 'SEALED' | 'INGESTED' | 'QUARANTINED';
  dataset_type: string;
  ingestion_method: string;
  source_system: string;
  created_by: string;
  ingested_by: string;
  ingested_at_utc: string;
  sealed_at_utc?: string;
  retention_ends_utc: string;
  payload_hash_sha256: string;
  metadata_hash_sha256: string;
  linked_entities: Array<{ type: string; id: string }>;
  summary_fields?: any;
  claims?: any;
}

interface WorkItem {
  work_item_id: string;
  tenant_id: string;
  type: 'MAPPING' | 'REVIEW' | 'CONFLICT' | 'INFO' | 'BLOCKED';
  status: 'OPEN' | 'RESOLVED' | 'CLOSED' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  required_action_text?: string;
  linked_entity?: { type: string; id: string };
  linked_evidence_record_ids: string[];
  created_at_utc: string;
  owner?: string;
  sla_due_utc?: string;
  estimated_cost_eur?: number;
  cost_driver?: string;
  resolution?: any;
  resolved_at?: string;
  resolved_by?: string;
}

interface Entity {
  entity_id: string;
  entity_type: 'SUPPLIER' | 'SKU' | 'BOM';
  tenant_id: string;
  name: string;
  [key: string]: any;
}

interface Decision {
  decision_id: string;
  tenant_id: string;
  work_item_id?: string;
  decision_type: string;
  reason_code: string;
  actor: string;
  timestamp: string;
  entity_refs: Array<{ type: string; id: string }>;
  evidence_refs: string[];
  comment?: string;
}

interface AuditEvent {
  event_id: string;
  tenant_id: string;
  event_type: string;
  object_type: string;
  object_id: string;
  actor: string;
  timestamp: string;
  correlation_id: string;
  details?: any;
}

interface StoreData {
  tenant: Tenant;
  evidence: EvidenceRecord[];
  workItems: WorkItem[];
  entities: Entity[];
  decisions: Decision[];
  auditEvents: AuditEvent[];
  initialized: boolean;
}

class DemoDataStore {
  private data: StoreData;

  constructor() {
    this.data = this.load();
    if (!this.data.initialized) {
      this.seed();
    }
  }

  private load(): StoreData {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('[DemoDataStore] Failed to parse stored data:', e);
      }
    }
    return this.getEmptyStore();
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  private getEmptyStore(): StoreData {
    return {
      tenant: {
        tenant_id: 'tenant_demo_emissioncore',
        tenant_name: 'EmissionCore Demo',
        user_id: 'usr_demo_admin',
        user_email: 'adrian@emissioncore.io'
      },
      evidence: [],
      workItems: [],
      entities: [],
      decisions: [],
      auditEvents: [],
      initialized: false
    };
  }

  private seed() {
    console.log('[DemoDataStore] Seeding deterministic data...');
    
    const tenantId = this.data.tenant.tenant_id;
    const now = new Date().toISOString();

    // Seed Entities
    this.data.entities = [
      {
        entity_id: 'SUP-001',
        entity_type: 'SUPPLIER',
        tenant_id: tenantId,
        name: 'Anatolia Steel',
        country: 'TR',
        vat: 'TR123456789',
        status: 'active'
      },
      {
        entity_id: 'SUP-002',
        entity_type: 'SUPPLIER',
        tenant_id: tenantId,
        name: 'Baltic Metals',
        country: 'PL',
        vat: 'PL987654321',
        status: 'active'
      },
      {
        entity_id: 'SKU-001',
        entity_type: 'SKU',
        tenant_id: tenantId,
        name: 'Hot-rolled steel coil',
        code: 'SKU-001',
        category: 'raw_materials'
      },
      {
        entity_id: 'SKU-002',
        entity_type: 'SKU',
        tenant_id: tenantId,
        name: 'Steel fasteners',
        code: 'SKU-002',
        category: 'components'
      },
      {
        entity_id: 'BOM-001',
        entity_type: 'BOM',
        tenant_id: tenantId,
        name: 'BOM for Hot-rolled steel coil',
        parent_sku: 'SKU-001',
        components: [
          { line: 1, component_ref: 'SKU-002', qty: 0.2, uom: 'kg', status: 'MATCHED' },
          { line: 2, component_code_raw: 'C-UNKNOWN-77', qty: 0.05, uom: 'kg', status: 'PENDING_MATCH' },
          { line: 3, component_ref: 'SKU-002', qty: 0.1, uom: 'kg', status: 'MATCHED' }
        ]
      }
    ];

    // Seed Evidence Records
    this.data.evidence = [
      {
        record_id: 'rec_ev_001',
        display_id: 'EV-0001',
        tenant_id: tenantId,
        status: 'SEALED',
        dataset_type: 'SUPPLIER_MASTER_V1',
        ingestion_method: 'FILE_UPLOAD',
        source_system: 'ERP_SAP',
        created_by: this.data.tenant.user_email,
        ingested_by: this.data.tenant.user_email,
        ingested_at_utc: '2025-12-15T10:30:00Z',
        sealed_at_utc: '2025-12-15T10:35:00Z',
        retention_ends_utc: '2032-12-15T10:35:00Z',
        payload_hash_sha256: 'sha256:a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        metadata_hash_sha256: 'sha256:b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567',
        linked_entities: [{ type: 'SUPPLIER', id: 'SUP-001' }],
        claims: {
          supplier_name: 'Anatolia Steel',
          country_code: 'TR',
          vat: 'TR123456789'
        }
      },
      {
        record_id: 'rec_ev_002',
        display_id: 'EV-0002',
        tenant_id: tenantId,
        status: 'SEALED',
        dataset_type: 'SKU_MASTER_V1',
        ingestion_method: 'API_PUSH',
        source_system: 'ERP_SAP',
        created_by: this.data.tenant.user_email,
        ingested_by: this.data.tenant.user_email,
        ingested_at_utc: '2025-12-20T14:15:00Z',
        sealed_at_utc: '2025-12-20T14:20:00Z',
        retention_ends_utc: '2032-12-20T14:20:00Z',
        payload_hash_sha256: 'sha256:c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678',
        metadata_hash_sha256: 'sha256:d4e5f6789012345678901234567890abcdef1234567890abcdef123456789',
        linked_entities: [{ type: 'SKU', id: 'SKU-001' }],
        claims: {
          sku_code: 'SKU-001',
          sku_name: 'Hot-rolled steel coil'
        }
      },
      {
        record_id: 'rec_ev_003',
        display_id: 'EV-0003',
        tenant_id: tenantId,
        status: 'SEALED',
        dataset_type: 'BOM_V1',
        ingestion_method: 'FILE_UPLOAD',
        source_system: 'PLM_WINDCHILL',
        created_by: this.data.tenant.user_email,
        ingested_by: this.data.tenant.user_email,
        ingested_at_utc: '2026-01-05T09:00:00Z',
        sealed_at_utc: '2026-01-05T09:10:00Z',
        retention_ends_utc: '2033-01-05T09:10:00Z',
        payload_hash_sha256: 'sha256:e5f6789012345678901234567890abcdef1234567890abcdef1234567890ab',
        metadata_hash_sha256: 'sha256:f6789012345678901234567890abcdef1234567890abcdef1234567890abcd',
        linked_entities: [
          { type: 'SKU', id: 'SKU-001' },
          { type: 'BOM', id: 'BOM-001' }
        ],
        summary_fields: {
          components_total: 3,
          pending_match: 1
        }
      },
      {
        record_id: 'rec_ev_004',
        display_id: 'EV-0004',
        tenant_id: tenantId,
        status: 'INGESTED',
        dataset_type: 'CBAM_IMPORTS_QTR_V1',
        ingestion_method: 'API_PUSH',
        source_system: 'CUSTOMS_API',
        created_by: this.data.tenant.user_email,
        ingested_by: this.data.tenant.user_email,
        ingested_at_utc: '2026-01-15T16:45:00Z',
        retention_ends_utc: '2033-01-15T16:45:00Z',
        payload_hash_sha256: 'sha256:789012345678901234567890abcdef1234567890abcdef1234567890abcdef',
        metadata_hash_sha256: 'sha256:89012345678901234567890abcdef1234567890abcdef1234567890abcdef1',
        linked_entities: [
          { type: 'SUPPLIER', id: 'SUP-001' },
          { type: 'SKU', id: 'SKU-001' }
        ],
        summary_fields: {
          quarter: '2025-Q4',
          lines: 3,
          total_net_mass_kg: 120000
        }
      }
    ];

    // Seed Work Items
    this.data.workItems = [
      {
        work_item_id: 'WI-0001',
        tenant_id: tenantId,
        type: 'MAPPING',
        status: 'OPEN',
        priority: 'HIGH',
        title: 'Resolve BOM pending component match',
        required_action_text: 'Map component_code_raw C-UNKNOWN-77 to an existing SKU or leave as Pending Match.',
        linked_entity: { type: 'BOM', id: 'BOM-001' },
        linked_evidence_record_ids: ['rec_ev_003'],
        created_at_utc: '2026-01-05T09:15:00Z',
        sla_due_utc: '2026-01-07T09:15:00Z'
      },
      {
        work_item_id: 'WI-0002',
        tenant_id: tenantId,
        type: 'REVIEW',
        status: 'OPEN',
        priority: 'MEDIUM',
        title: 'Review Supplier Master Evidence',
        linked_entity: { type: 'SUPPLIER', id: 'SUP-001' },
        linked_evidence_record_ids: ['rec_ev_001'],
        created_at_utc: '2025-12-15T10:40:00Z',
        sla_due_utc: '2025-12-17T10:40:00Z'
      },
      {
        work_item_id: 'WI-0003',
        tenant_id: tenantId,
        type: 'MAPPING',
        status: 'OPEN',
        priority: 'HIGH',
        title: 'Approve SKU classification for CBAM imports',
        linked_entity: { type: 'SKU', id: 'SKU-001' },
        linked_evidence_record_ids: ['rec_ev_004'],
        created_at_utc: '2026-01-15T17:00:00Z',
        sla_due_utc: '2026-01-17T17:00:00Z'
      },
      {
        work_item_id: 'WI-0004',
        tenant_id: tenantId,
        type: 'CONFLICT',
        status: 'OPEN',
        priority: 'MEDIUM',
        title: 'Confirm supplier identity attributes',
        required_action_text: 'Conflicting VAT numbers detected. Confirm canonical value.',
        linked_entity: { type: 'SUPPLIER', id: 'SUP-001' },
        linked_evidence_record_ids: ['rec_ev_001', 'rec_ev_004'],
        created_at_utc: '2026-01-16T11:20:00Z',
        sla_due_utc: '2026-01-18T11:20:00Z'
      },
      {
        work_item_id: 'WI-0005',
        tenant_id: tenantId,
        type: 'INFO',
        status: 'OPEN',
        priority: 'LOW',
        title: 'CBAM quarterly dataset completeness check',
        linked_entity: { type: 'SKU', id: 'SKU-001' },
        linked_evidence_record_ids: ['rec_ev_004'],
        created_at_utc: '2026-01-20T08:00:00Z',
        sla_due_utc: '2026-01-25T08:00:00Z'
      },
      {
        work_item_id: 'WI-0006',
        tenant_id: tenantId,
        type: 'BLOCKED',
        status: 'BLOCKED',
        priority: 'CRITICAL',
        title: 'Missing installation data for CBAM calculation',
        required_action_text: 'CBAM entry cannot be completed without installation emissions data.',
        linked_entity: { type: 'SUPPLIER', id: 'SUP-001' },
        linked_evidence_record_ids: ['rec_ev_004'],
        created_at_utc: '2026-01-22T13:30:00Z',
        sla_due_utc: '2026-01-24T13:30:00Z',
        estimated_cost_eur: 15000,
        cost_driver: 'CERTIFICATE_EXPOSURE_RISK'
      }
    ];

    // Seed Decisions
    this.data.decisions = [
      {
        decision_id: 'D-0001',
        tenant_id: tenantId,
        decision_type: 'EVIDENCE_PRIORITY',
        reason_code: 'EVIDENCE_PRIORITY',
        actor: this.data.tenant.user_email,
        timestamp: '2025-12-15T10:50:00Z',
        entity_refs: [{ type: 'SUPPLIER', id: 'SUP-001' }],
        evidence_refs: ['rec_ev_001'],
        comment: 'EV-0001 confirmed as canonical source for VAT number'
      }
    ];

    // Seed Audit Events
    this.data.auditEvents = [
      {
        event_id: 'AE-0001',
        tenant_id: tenantId,
        event_type: 'EVIDENCE_SEALED',
        object_type: 'evidence',
        object_id: 'rec_ev_001',
        actor: this.data.tenant.user_email,
        timestamp: '2025-12-15T10:35:00Z',
        correlation_id: 'corr_001',
        details: { display_id: 'EV-0001', dataset_type: 'SUPPLIER_MASTER_V1' }
      },
      {
        event_id: 'AE-0002',
        tenant_id: tenantId,
        event_type: 'WORK_ITEM_CREATED',
        object_type: 'work_item',
        object_id: 'WI-0002',
        actor: 'system',
        timestamp: '2025-12-15T10:40:00Z',
        correlation_id: 'corr_002'
      },
      {
        event_id: 'AE-0003',
        tenant_id: tenantId,
        event_type: 'EVIDENCE_SEALED',
        object_type: 'evidence',
        object_id: 'rec_ev_003',
        actor: this.data.tenant.user_email,
        timestamp: '2026-01-05T09:10:00Z',
        correlation_id: 'corr_003',
        details: { display_id: 'EV-0003', dataset_type: 'BOM_V1' }
      },
      {
        event_id: 'AE-0004',
        tenant_id: tenantId,
        event_type: 'WORK_ITEM_CREATED',
        object_type: 'work_item',
        object_id: 'WI-0001',
        actor: 'system',
        timestamp: '2026-01-05T09:15:00Z',
        correlation_id: 'corr_004'
      }
    ];

    this.data.initialized = true;
    this.save();
    console.log('[DemoDataStore] Seed complete');
  }

  // Public API
  getTenant(): Tenant {
    return this.data.tenant;
  }

  setTenant(tenant: Partial<Tenant>) {
    this.data.tenant = { ...this.data.tenant, ...tenant };
    this.save();
  }

  listEvidence(filters: any = {}): EvidenceRecord[] {
    let results = this.data.evidence.filter(e => e.tenant_id === this.data.tenant.tenant_id);
    
    if (filters.status) {
      results = results.filter(e => e.status === filters.status);
    }
    if (filters.dataset_type) {
      results = results.filter(e => e.dataset_type === filters.dataset_type);
    }
    
    return results;
  }

  getEvidenceByRecordId(record_id: string): EvidenceRecord | null {
    return this.data.evidence.find(e => e.record_id === record_id && e.tenant_id === this.data.tenant.tenant_id) || null;
  }

  getEvidenceByDisplayId(display_id: string): EvidenceRecord | null {
    return this.data.evidence.find(e => e.display_id === display_id && e.tenant_id === this.data.tenant.tenant_id) || null;
  }

  listWorkItems(filters: any = {}): WorkItem[] {
    let results = this.data.workItems.filter(w => w.tenant_id === this.data.tenant.tenant_id);
    
    if (filters.status) {
      results = results.filter(w => w.status === filters.status);
    }
    if (filters.type) {
      results = results.filter(w => w.type === filters.type);
    }
    
    return results;
  }

  getWorkItem(work_item_id: string): WorkItem | null {
    return this.data.workItems.find(w => w.work_item_id === work_item_id && w.tenant_id === this.data.tenant.tenant_id) || null;
  }

  createWorkItem(payload: Partial<WorkItem>): WorkItem {
    const newId = `WI-${String(this.data.workItems.length + 1).padStart(4, '0')}`;
    const workItem: WorkItem = {
      work_item_id: newId,
      tenant_id: this.data.tenant.tenant_id,
      type: payload.type || 'INFO',
      status: payload.status || 'OPEN',
      priority: payload.priority || 'MEDIUM',
      title: payload.title || 'Untitled work item',
      linked_entity: payload.linked_entity,
      linked_evidence_record_ids: payload.linked_evidence_record_ids || [],
      created_at_utc: new Date().toISOString(),
      sla_due_utc: payload.sla_due_utc || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      ...payload
    };
    
    this.data.workItems.push(workItem);
    this.save();
    return workItem;
  }

  createFollowUp(parent_work_item_id: string, payload: Partial<WorkItem>): WorkItem {
    const parent = this.getWorkItem(parent_work_item_id);
    if (!parent) {
      throw new Error('Parent work item not found');
    }

    return this.createWorkItem({
      ...payload,
      title: payload.title || `Follow-up to ${parent.title}`,
      linked_entity: parent.linked_entity,
      linked_evidence_record_ids: parent.linked_evidence_record_ids
    });
  }

  resolveWorkItem(work_item_id: string, resolution: any): WorkItem {
    const workItem = this.getWorkItem(work_item_id);
    if (!workItem) {
      throw new Error('Work item not found');
    }

    workItem.status = 'RESOLVED';
    workItem.resolution = resolution;
    workItem.resolved_at = new Date().toISOString();
    workItem.resolved_by = this.data.tenant.user_email;

    this.save();
    return workItem;
  }

  listEntities(type?: string, filters: any = {}): Entity[] {
    let results = this.data.entities.filter(e => e.tenant_id === this.data.tenant.tenant_id);
    
    if (type) {
      results = results.filter(e => e.entity_type === type);
    }
    
    return results;
  }

  getEntity(type: string, id: string): Entity | null {
    return this.data.entities.find(e => 
      e.entity_type === type && 
      e.entity_id === id && 
      e.tenant_id === this.data.tenant.tenant_id
    ) || null;
  }

  addDecision(decision: Partial<Decision>): Decision {
    const newDecision: Decision = {
      decision_id: `D-${String(this.data.decisions.length + 1).padStart(4, '0')}`,
      tenant_id: this.data.tenant.tenant_id,
      decision_type: decision.decision_type || 'OTHER',
      reason_code: decision.reason_code || 'UNSPECIFIED',
      actor: decision.actor || this.data.tenant.user_email,
      timestamp: new Date().toISOString(),
      entity_refs: decision.entity_refs || [],
      evidence_refs: decision.evidence_refs || [],
      ...decision
    };

    this.data.decisions.push(newDecision);
    this.save();
    return newDecision;
  }

  listDecisions(filters: any = {}): Decision[] {
    let results = this.data.decisions.filter(d => d.tenant_id === this.data.tenant.tenant_id);
    
    if (filters.work_item_id) {
      results = results.filter(d => d.work_item_id === filters.work_item_id);
    }
    
    return results;
  }

  addAuditEvent(event: Partial<AuditEvent>): AuditEvent {
    const newEvent: AuditEvent = {
      event_id: `AE-${String(this.data.auditEvents.length + 1).padStart(4, '0')}`,
      tenant_id: this.data.tenant.tenant_id,
      event_type: event.event_type || 'UNKNOWN',
      object_type: event.object_type || 'unknown',
      object_id: event.object_id || '',
      actor: event.actor || this.data.tenant.user_email,
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id || `corr_${Date.now()}`,
      ...event
    };

    this.data.auditEvents.push(newEvent);
    this.save();
    return newEvent;
  }

  listAuditEvents(filters: any = {}): AuditEvent[] {
    let results = this.data.auditEvents.filter(e => e.tenant_id === this.data.tenant.tenant_id);
    
    if (filters.object_type) {
      results = results.filter(e => e.object_type === filters.object_type);
    }
    if (filters.object_id) {
      results = results.filter(e => e.object_id === filters.object_id);
    }
    
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  reset() {
    this.data = this.getEmptyStore();
    this.seed();
  }
}

// Singleton instance
export const demoStore = new DemoDataStore();
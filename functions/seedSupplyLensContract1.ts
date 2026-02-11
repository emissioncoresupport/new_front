import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const TENANT = 'tenant_demo_dsv';
    const NOW = new Date().toISOString();
    
    // Check if already seeded
    const existingSuppliers = await base44.asServiceRole.entities.Supplier.filter({ supplier_id: 'SUP-001' });
    if (existingSuppliers.length > 0) {
      return Response.json({ success: true, message: 'Demo data already exists', counts: {} });
    }

    // Suppliers
    const suppliers = await base44.asServiceRole.entities.Supplier.bulkCreate([
      {
        supplier_id: 'SUP-001',
        tenant_id: TENANT,
        legal_name: 'Anatolia Steel',
        country_code: 'TR',
        primary_contact_email: 'contact@anatoliasteel.tr',
        creation_source: 'ERP',
        created_by_user_id: user.id,
        created_at: NOW,
        supplier_status: 'active'
      },
      {
        supplier_id: 'SUP-002',
        tenant_id: TENANT,
        legal_name: 'Baltic Metals',
        country_code: 'EE',
        primary_contact_email: 'info@balticmetals.ee',
        creation_source: 'FILE',
        created_by_user_id: user.id,
        created_at: NOW,
        supplier_status: 'active'
      },
      {
        supplier_id: 'SUP-003',
        tenant_id: TENANT,
        legal_name: 'Nordic Alloys',
        country_code: 'SE',
        primary_contact_email: 'sales@nordicalloys.se',
        creation_source: 'MANUAL',
        created_by_user_id: user.id,
        created_at: NOW,
        supplier_status: 'active'
      },
      {
        supplier_id: 'SUP-004',
        tenant_id: TENANT,
        legal_name: 'Alpine Steelworks',
        country_code: 'AT',
        primary_contact_email: 'office@alpinesteel.at',
        creation_source: 'ERP',
        created_by_user_id: user.id,
        created_at: NOW,
        supplier_status: 'active'
      }
    ]);

    // SKUs
    const skus = await base44.asServiceRole.entities.SKU.bulkCreate([
      {
        tenant_id: TENANT,
        sku_code: 'SKU-001',
        name: 'Hot-rolled steel coil',
        category: 'Steel Products',
        active: true
      },
      {
        tenant_id: TENANT,
        sku_code: 'SKU-002',
        name: 'Steel fasteners M8',
        category: 'Fasteners',
        active: true
      }
    ]);

    // BOMs
    await base44.asServiceRole.entities.BillOfMaterials.create({
      tenant_id: TENANT,
      supplier_id: suppliers[0].id,
      bom_name: 'BOM-001 Hot-rolled steel coil',
      total_items: 3,
      status: 'active'
    });

    // Evidence Records (SEALED)
    const ev1 = await base44.asServiceRole.entities.EvidenceRecord.create({
      tenant_id: TENANT,
      evidence_draft_id: 'draft_001',
      sealed_at_utc: NOW,
      sealed_by_user_id: user.id,
      created_by: user.email,
      source_system: 'SAP_ERP',
      ingestion_method: 'ERP_API',
      dataset_type: 'SUPPLIER_MASTER_V1',
      payload_sha256: 'a1b2c3d4e5f6789'.repeat(4),
      metadata_sha256: 'b2c3d4e5f678901'.repeat(4),
      combined_sha256: 'c3d4e5f67890abc'.repeat(4),
      snapshot_json: { 
        dataset_type: 'SUPPLIER_MASTER_V1', 
        method: 'ERP_API',
        legal_name: 'Anatolia Steel',
        country_code: 'TR'
      },
      review_status: 'APPROVED',
      trust_level: 'HIGH',
      reconciliation_status: 'BOUND',
      binding_mode: 'BIND_EXISTING',
      binding_target_type: 'Supplier',
      bound_entity_id: suppliers[0].id,
      status: 'SEALED'
    });

    const ev3 = await base44.asServiceRole.entities.EvidenceRecord.create({
      tenant_id: TENANT,
      evidence_draft_id: 'draft_002',
      sealed_at_utc: NOW,
      sealed_by_user_id: user.id,
      created_by: user.email,
      source_system: 'XLSX_UPLOAD',
      ingestion_method: 'FILE_UPLOAD',
      dataset_type: 'SITE_INSTALLATION_MASTER_V1',
      payload_sha256: 'd4e5f67890ab123'.repeat(4),
      metadata_sha256: 'e5f67890ab12345'.repeat(4),
      combined_sha256: 'f67890ab1234567'.repeat(4),
      snapshot_json: { 
        dataset_type: 'SITE_INSTALLATION_MASTER_V1', 
        method: 'FILE_UPLOAD',
        site_name: 'Baltic Manufacturing Site 01',
        country: 'EE'
      },
      review_status: 'APPROVED',
      trust_level: 'MEDIUM',
      reconciliation_status: 'BOUND',
      binding_mode: 'BIND_EXISTING',
      binding_target_type: 'SupplierSite',
      bound_entity_id: suppliers[1].id,
      status: 'SEALED'
    });

    const ev5 = await base44.asServiceRole.entities.EvidenceRecord.create({
      tenant_id: TENANT,
      evidence_draft_id: 'draft_005',
      sealed_at_utc: NOW,
      sealed_by_user_id: user.id,
      created_by: user.email,
      source_system: 'MANUAL_ENTRY_UI',
      ingestion_method: 'MANUAL_ENTRY',
      dataset_type: 'BOM_V1',
      payload_sha256: 'g7890ab12345678'.repeat(4),
      metadata_sha256: 'h890ab123456789'.repeat(4),
      combined_sha256: 'i90ab1234567890'.repeat(4),
      snapshot_json: { 
        dataset_type: 'BOM_V1', 
        method: 'MANUAL_ENTRY',
        bom_id: 'BOM-001',
        components: 3
      },
      review_status: 'PENDING_REVIEW',
      trust_level: 'MEDIUM',
      reconciliation_status: 'UNBOUND',
      binding_mode: 'DEFER',
      status: 'SEALED'
    });

    // Evidence Draft (QUARANTINED - validation failed)
    const draft004 = await base44.asServiceRole.entities.EvidenceDraft.create({
      tenant_id: TENANT,
      status: 'QUARANTINED',
      ingestion_method: 'FILE_UPLOAD',
      provenance_source: 'INTERNAL_USER',
      evidence_type: 'SKU_MASTER',
      declared_scope: 'PRODUCT',
      source_system: 'CSV_FILE',
      binding_mode: 'DEFER',
      purpose_explanation: 'Too short',
      retention_policy: 'STANDARD_7_YEARS',
      contains_personal_data: false,
      review_status: 'REJECTED',
      created_by_user_id: user.id,
      created_by: user.email,
      created_at_utc: NOW,
      validation_errors: [
        { field: 'purpose_explanation', message: 'Purpose explanation must be at least 20 characters' },
        { field: 'payload', message: 'Missing required fields: description, category' }
      ],
      quarantine_reason: 'VALIDATION_FAILED',
      payload_data_json: { sku_code: 'SKU-001', name: 'Hot-rolled steel coil' }
    });

    // Evidence Draft (VALIDATED - pending seal and mapping)
    const draft003 = await base44.asServiceRole.entities.EvidenceDraft.create({
      tenant_id: TENANT,
      status: 'READY_FOR_SEAL',
      ingestion_method: 'SUPPLIER_PORTAL',
      provenance_source: 'SUPPLIER',
      evidence_type: 'SUPPLIER_DECLARATION',
      declared_scope: 'SUPPLIER',
      source_system: 'NORDIC_ALLOYS_PORTAL',
      binding_mode: 'DEFER',
      binding_target_type: 'Supplier',
      purpose_explanation: 'Supplier declaration from Nordic Alloys for CBAM compliance verification and emissions data',
      retention_policy: 'STANDARD_7_YEARS',
      contains_personal_data: false,
      review_status: 'APPROVED',
      created_by_user_id: user.id,
      created_by: 'supplier@nordicalloys.se',
      created_at_utc: NOW,
      payload_sha256: 'draft003_payload_'.repeat(4),
      metadata_sha256: 'draft003_meta___'.repeat(4),
      payload_data_json: { 
        legal_name: 'Nordic Alloys AB', 
        country_code: 'SE',
        declared_emissions_tco2: 1250,
        reporting_year: 2025
      }
    });

    // Work Items
    await base44.asServiceRole.entities.WorkItem.bulkCreate([
      {
        work_item_id: 'WI-MAP-001',
        type: 'MAPPING',
        status: 'OPEN',
        priority: 'MEDIUM',
        evidence_id: ev5.id,
        entity_type: 'BOM',
        created_at: NOW,
        updated_at: NOW,
        tags: ['mapping_review', 'bom']
      },
      {
        work_item_id: 'WI-MAP-002',
        type: 'MAPPING',
        status: 'OPEN',
        priority: 'MEDIUM',
        evidence_id: ev3.id,
        entity_type: 'SUPPLIER',
        created_at: NOW,
        updated_at: NOW,
        tags: ['mapping_review', 'supplier_site']
      },
      {
        work_item_id: 'WI-MAP-003',
        type: 'MAPPING',
        status: 'OPEN',
        priority: 'MEDIUM',
        evidence_id: ev1.id,
        entity_type: 'SUPPLIER',
        created_at: NOW,
        updated_at: NOW,
        tags: ['mapping_review', 'supplier']
      },
      {
        work_item_id: 'WI-VAL-004',
        type: 'REVIEW',
        status: 'OPEN',
        priority: 'HIGH',
        evidence_id: draft004.id,
        entity_type: 'SKU',
        created_at: NOW,
        updated_at: NOW,
        tags: ['validation_failed', 'quarantine']
      },
      {
        work_item_id: 'WI-CONFLICT-001',
        type: 'CONFLICT',
        status: 'OPEN',
        priority: 'MEDIUM',
        entity_type: 'SUPPLIER',
        entity_id: suppliers[0].id,
        conflict_summary: 'Supplier name mismatch between ERP and file upload',
        conflict_field: 'legal_name',
        conflict_value_a: 'Anatolia Steel',
        conflict_value_b: 'Anatolia Steel Ltd',
        created_at: NOW,
        updated_at: NOW,
        tags: ['conflict_resolution']
      }
    ]);
    
    // Mapping Suggestions
    await base44.asServiceRole.entities.DataMappingSuggestion.bulkCreate([
      {
        tenant_id: TENANT,
        mapping_type: 'supplier_material',
        source_id: ev1.id,
        source_entity_name: 'Anatolia Steel',
        target_type: 'material',
        target_id: suppliers[0].id,
        target_entity_name: 'Anatolia Steel',
        confidence_score: 95,
        matched_attributes: ['legal_name', 'country_code'],
        reasoning: 'Exact match on legal name and country code from ERP data',
        status: 'pending'
      },
      {
        tenant_id: TENANT,
        mapping_type: 'supplier_material',
        source_id: ev3.id,
        source_entity_name: 'Baltic Site 01',
        target_type: 'material',
        target_id: suppliers[1].id,
        target_entity_name: 'Baltic Metals',
        confidence_score: 88,
        matched_attributes: ['country_code', 'site_name'],
        reasoning: 'Site location matches supplier country, strong name similarity',
        status: 'pending'
      },
      {
        tenant_id: TENANT,
        mapping_type: 'part_sku',
        source_id: ev5.id,
        source_entity_name: 'BOM-001',
        target_type: 'sku',
        target_id: skus[0].id,
        target_entity_name: 'Hot-rolled steel coil',
        confidence_score: 92,
        matched_attributes: ['sku_code', 'description'],
        reasoning: 'BOM references matching SKU code',
        status: 'pending'
      }
    ]);

    // Audit Events for evidence lifecycle
    await base44.asServiceRole.entities.AuditEvent.bulkCreate([
      {
        audit_event_id: crypto.randomUUID(),
        tenant_id: TENANT,
        evidence_id: ev1.id,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: 'admin',
        action: 'SEALED',
        previous_state: 'VALIDATED',
        new_state: 'SEALED',
        created_at_utc: NOW,
        details: 'Evidence sealed from ERP_API ingestion',
        context_json: { method: 'ERP_API', dataset: 'SUPPLIER_MASTER_V1' }
      },
      {
        audit_event_id: crypto.randomUUID(),
        tenant_id: TENANT,
        evidence_id: ev3.id,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: 'admin',
        action: 'SEALED',
        previous_state: 'VALIDATED',
        new_state: 'SEALED',
        created_at_utc: NOW,
        details: 'Evidence sealed from FILE_UPLOAD',
        context_json: { method: 'FILE_UPLOAD', dataset: 'SITE_INSTALLATION_MASTER_V1' }
      },
      {
        audit_event_id: crypto.randomUUID(),
        tenant_id: TENANT,
        evidence_id: ev5.id,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: 'admin',
        action: 'SEALED',
        previous_state: 'VALIDATED',
        new_state: 'SEALED',
        created_at_utc: NOW,
        details: 'Evidence sealed from MANUAL_ENTRY, pending mapping',
        context_json: { method: 'MANUAL_ENTRY', dataset: 'BOM_V1', mapping_required: true }
      },
      {
        audit_event_id: crypto.randomUUID(),
        tenant_id: TENANT,
        evidence_id: draft004.id,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: 'admin',
        action: 'VALIDATION_FAILED',
        previous_state: 'DRAFT',
        new_state: 'QUARANTINED',
        created_at_utc: NOW,
        details: 'Draft quarantined - validation failed',
        context_json: { errors: draft004.validation_errors, quarantine_reason: 'VALIDATION_FAILED' }
      },
      {
        audit_event_id: crypto.randomUUID(),
        tenant_id: TENANT,
        evidence_id: draft003.id,
        actor_user_id: user.id,
        actor_email: 'supplier@nordicalloys.se',
        actor_role: 'user',
        action: 'VALIDATED',
        previous_state: 'DRAFT',
        new_state: 'READY_FOR_SEAL',
        created_at_utc: NOW,
        details: 'Draft validated successfully, ready to seal',
        context_json: { method: 'SUPPLIER_PORTAL', dataset: 'SUPPLIER_DECLARATION_V1' }
      }
    ]);

    return Response.json({ 
      success: true, 
      message: 'Contract 1 demo data seeded',
      counts: { 
        suppliers: 4, 
        skus: 2, 
        boms: 1,
        evidenceRecords: 3, 
        evidenceDrafts: 2,
        workItems: 5,
        mappingSuggestions: 3,
        auditEvents: 5
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
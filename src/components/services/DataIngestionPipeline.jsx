/**
 * Data Ingestion Pipeline - All External Data → Source Records First
 * Strict immutable ingestion: ERP, CSV, PDF, API webhooks
 * January 2026 - Compliant with data lineage requirements
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

class DataIngestionPipeline {
  /**
   * UNIVERSAL INGESTION: Any external data goes through here
   */
  async ingest(source, data, metadata = {}) {
    const user = await base44.auth.me();
    const ingestionId = `${Date.now()}-${Math.random()}`;

    try {
      console.log(`[Ingestion ${ingestionId}] Starting from ${source}`);

      // Step 1: Create immutable source record
      const sourceRecord = await base44.entities.SourceRecord.create({
        tenant_id: user.company_id,
        source_system: source,
        entity_type: metadata.entityType || 'supplier',
        external_id: metadata.externalId || `${source}_${Date.now()}`,
        source_data: data,
        raw_payload: data,
        document_ids: metadata.documentIds || [],
        status: 'pending_review',
        ingested_at: new Date().toISOString(),
        ingested_by: user.email,
        metadata: {
          ingestionId,
          ...metadata
        }
      });

      // Step 2: Auto-process if high confidence
      if (metadata.autoProcess && this.canAutoProcess(data)) {
        return await this.processSourceRecord(sourceRecord.id);
      }

      return {
        success: true,
        sourceRecordId: sourceRecord.id,
        status: 'pending_review',
        message: 'Data ingested - awaiting review'
      };

    } catch (error) {
      console.error(`[Ingestion ${ingestionId}] Failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process source record → Create canonical entity
   */
  async processSourceRecord(sourceRecordId) {
    try {
      const sourceRecords = await base44.entities.SourceRecord.filter({ id: sourceRecordId });
      if (!sourceRecords || sourceRecords.length === 0) {
        throw new Error('Source record not found');
      }

      const record = sourceRecords[0];
      const data = record.source_data;

      // Step 1: Check for duplicates
      const duplicate = await this.findDuplicate(record.entity_type, data);
      
      if (duplicate) {
        await base44.entities.SourceRecord.update(sourceRecordId, {
          status: 'duplicate',
          canonical_entity_id: duplicate.id,
          processed_at: new Date().toISOString()
        });

        return {
          success: true,
          action: 'linked_to_existing',
          entityId: duplicate.id
        };
      }

      // Step 2: Create canonical entity
      const entity = await this.createCanonicalEntity(record.entity_type, data, record.tenant_id);

      // Step 3: Update source record
      await base44.entities.SourceRecord.update(sourceRecordId, {
        status: 'canonical',
        canonical_entity_id: entity.id,
        processed_at: new Date().toISOString()
      });

      // Step 4: Track field provenance
      await this.trackProvenance(entity.id, record.entity_type, sourceRecordId, data);

      return {
        success: true,
        action: 'created',
        entityId: entity.id
      };

    } catch (error) {
      await base44.entities.SourceRecord.update(sourceRecordId, {
        status: 'error',
        error_message: error.message
      });
      throw error;
    }
  }

  /**
   * Find duplicate entity
   */
  async findDuplicate(entityType, data) {
    const entityName = this.getEntityName(entityType);
    
    // Try matching by key fields
    const keyFields = this.getKeyFields(entityType);
    
    for (const field of keyFields) {
      if (data[field]) {
        const matches = await base44.entities[entityName].filter({
          [field]: data[field]
        });
        if (matches.length > 0) return matches[0];
      }
    }

    return null;
  }

  /**
   * Create canonical entity from source data
   */
  async createCanonicalEntity(entityType, data, tenantId) {
    const entityName = this.getEntityName(entityType);
    const normalizedData = this.normalizeData(entityType, data, tenantId);

    return await base44.entities[entityName].create(normalizedData);
  }

  /**
   * Track field-level provenance
   */
  async trackProvenance(entityId, entityType, sourceRecordId, data) {
    const fieldsToTrack = Object.keys(data);

    for (const field of fieldsToTrack) {
      try {
        await base44.entities.FieldProvenance.create({
          entity_type: entityType,
          entity_id: entityId,
          field_name: field,
          source_record_id: sourceRecordId,
          field_value: data[field],
          confidence_score: 100,
          recorded_at: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Failed to track provenance for ${field}:`, error);
      }
    }
  }

  /**
   * Get entity name for entity type
   */
  getEntityName(entityType) {
    const mapping = {
      supplier: 'Supplier',
      material: 'MaterialSKU',
      product: 'ProductSKU',
      bom: 'BOM'
    };
    return mapping[entityType] || 'Supplier';
  }

  /**
   * Get key fields for deduplication
   */
  getKeyFields(entityType) {
    const fields = {
      supplier: ['vat_number', 'eori_number', 'duns_number', 'legal_name'],
      material: ['internal_sku', 'cas_number'],
      product: ['internal_product_sku', 'gtin'],
      bom: ['bom_number']
    };
    return fields[entityType] || ['name'];
  }

  /**
   * Normalize data for entity creation
   */
  normalizeData(entityType, data, tenantId) {
    const normalized = { ...data };

    // Add tenant
    if (entityType === 'supplier') {
      normalized.company_id = tenantId;
    } else {
      normalized.tenant_id = tenantId;
    }

    // Set defaults
    normalized.status = normalized.status || 'active';
    normalized.source = normalized.source || 'import';

    return normalized;
  }

  /**
   * Can auto-process without review?
   */
  canAutoProcess(data) {
    // Only auto-process if all critical fields present
    return data.legal_name && data.country && data.vat_number;
  }

  /**
   * Batch ingest from ERP
   */
  async ingestFromERP(erpConnectionId, entityTypes = ['suppliers', 'materials']) {
    const loadingToast = toast.loading('Syncing from ERP...');

    try {
      const response = await base44.functions.invoke('erpDataIngestion', {
        erp_connection_id: erpConnectionId,
        entity_types: entityTypes,
        sync_mode: 'incremental'
      });

      toast.dismiss(loadingToast);

      if (response.data.status === 'completed') {
        toast.success(`ERP sync complete: ${response.data.summary.records_created} created, ${response.data.summary.records_updated} updated`);
        return response.data;
      } else {
        toast.error('ERP sync failed');
        return null;
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('ERP sync error: ' + error.message);
      return null;
    }
  }
}

export default new DataIngestionPipeline();
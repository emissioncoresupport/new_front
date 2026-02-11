import { base44 } from '@/api/base44Client';
import ProvenanceTracker from './ProvenanceTracker';

/**
 * Multi-Source Ingestion Pipeline for EUDAMED
 * Handles SupplyLens sync, bulk imports, document uploads, API integrations
 */

/**
 * Start a new ingestion batch
 */
export async function startIngestionBatch(sourceType, mappingProfileId = null) {
  const user = await base44.auth.me();
  
  const batch = await base44.entities.IngestionBatch.create({
    tenant_id: user.tenant_id || 'default',
    source_type: sourceType,
    initiated_by: user.email,
    started_at: new Date().toISOString(),
    mapping_profile_id: mappingProfileId,
    status: 'running',
    total_items: 0,
    successful_items: 0,
    failed_items: 0
  });
  
  return batch;
}

/**
 * Ingest SupplyLens Supplier → EconomicOperator
 */
export async function ingestSupplierAsOperator(supplierId, batchId, mappingProfileId = null) {
  const user = await base44.auth.me();
  const tenantId = user.tenant_id || 'default';
  
  try {
    // Fetch SupplyLens supplier
    const suppliers = await base44.entities.Supplier.list();
    const supplier = suppliers.find(s => s.id === supplierId);
    
    if (!supplier) throw new Error('Supplier not found');
    
    // Apply mapping profile or default mapping
    const mappedData = {
      tenant_id: tenantId,
      operator_type: 'manufacturer', // Default - can be overridden by mapping
      legal_name: supplier.legal_name,
      trade_name: supplier.trading_name,
      vat_number: supplier.vat_number,
      country: supplier.country,
      address: supplier.address,
      city: supplier.city,
      postal_code: supplier.postal_code,
      primary_contact_email: supplier.primary_contact_email,
      primary_contact_phone: supplier.primary_contact_phone,
      website: supplier.website,
      status: 'draft',
      supplylens_supplier_id: supplierId
    };
    
    // Create or update EconomicOperator
    const existingOps = await base44.entities.EconomicOperator.filter({ supplylens_supplier_id: supplierId });
    let operator;
    
    if (existingOps.length > 0) {
      // Update existing
      operator = existingOps[0];
      await base44.entities.EconomicOperator.update(operator.id, mappedData);
    } else {
      // Create new
      operator = await base44.entities.EconomicOperator.create(mappedData);
    }
    
    // Record field provenance
    await ProvenanceTracker.recordBulkProvenance(
      operator.id,
      'EconomicOperator',
      {
        legal_name: mappedData.legal_name,
        country: mappedData.country,
        vat_number: mappedData.vat_number,
        primary_contact_email: mappedData.primary_contact_email
      },
      {
        sourceType: 'SUPPLYLENS_SYNC',
        sourceRefId: supplierId,
        extractionMethod: 'deterministic'
      },
      tenantId
    );
    
    // Create ingestion item record
    await base44.entities.IngestionItem.create({
      tenant_id: tenantId,
      batch_id: batchId,
      entity_type_target: 'EconomicOperator',
      target_entity_id: operator.id,
      parse_status: 'parsed',
      validation_status: 'passed',
      processed_at: new Date().toISOString()
    });
    
    return { success: true, operatorId: operator.id };
    
  } catch (error) {
    // Record failed ingestion item
    await base44.entities.IngestionItem.create({
      tenant_id: tenantId,
      batch_id: batchId,
      entity_type_target: 'EconomicOperator',
      parse_status: 'parse_failed',
      validation_status: 'failed',
      validation_errors: [{ error: error.message }],
      processed_at: new Date().toISOString()
    });
    
    throw error;
  }
}

/**
 * Ingest SupplyLens SKU → DeviceModel
 */
export async function ingestSKUAsDeviceModel(skuId, deviceFamilyId, batchId) {
  const user = await base44.auth.me();
  const tenantId = user.tenant_id || 'default';
  
  try {
    const skus = await base44.entities.SKU.list();
    const sku = skus.find(s => s.id === skuId);
    
    if (!sku) throw new Error('SKU not found');
    
    const mappedData = {
      tenant_id: tenantId,
      device_family_id: deviceFamilyId,
      model_name: sku.sku_code || sku.internal_name,
      commercial_name: sku.internal_name,
      catalog_number: sku.sku_code,
      variant_attributes: {
        description: sku.description,
        category: sku.category
      },
      status: 'draft',
      supplylens_sku_id: skuId
    };
    
    // Check if already mapped
    const existingModels = await base44.entities.DeviceModel.filter({ supplylens_sku_id: skuId });
    let deviceModel;
    
    if (existingModels.length > 0) {
      deviceModel = existingModels[0];
      await base44.entities.DeviceModel.update(deviceModel.id, mappedData);
    } else {
      deviceModel = await base44.entities.DeviceModel.create(mappedData);
    }
    
    // Record provenance
    await ProvenanceTracker.recordBulkProvenance(
      deviceModel.id,
      'DeviceModel',
      {
        model_name: mappedData.model_name,
        commercial_name: mappedData.commercial_name,
        catalog_number: mappedData.catalog_number
      },
      {
        sourceType: 'SUPPLYLENS_SYNC',
        sourceRefId: skuId,
        extractionMethod: 'deterministic'
      },
      tenantId
    );
    
    await base44.entities.IngestionItem.create({
      tenant_id: tenantId,
      batch_id: batchId,
      entity_type_target: 'DeviceModel',
      target_entity_id: deviceModel.id,
      parse_status: 'parsed',
      validation_status: 'passed',
      processed_at: new Date().toISOString()
    });
    
    return { success: true, deviceModelId: deviceModel.id };
    
  } catch (error) {
    await base44.entities.IngestionItem.create({
      tenant_id: tenantId,
      batch_id: batchId,
      entity_type_target: 'DeviceModel',
      parse_status: 'parse_failed',
      validation_status: 'failed',
      validation_errors: [{ error: error.message }],
      processed_at: new Date().toISOString()
    });
    
    throw error;
  }
}

/**
 * Process bulk record from Excel/CSV or AI document extraction
 */
export async function processBulkRecord(entityType, recordData, batchId, fileUrl, provenanceConfig = null) {
  const user = await base44.auth.me();
  const tenantId = user.tenant_id || 'default';
  
  try {
    let createdEntity;
    
    // Create entity based on type
    if (entityType === 'EconomicOperator') {
      createdEntity = await base44.entities.EconomicOperator.create({
        tenant_id: tenantId,
        ...recordData,
        status: 'draft'
      });
    } else if (entityType === 'DeviceModel') {
      // For device models, need to ensure device family exists
      const families = await base44.entities.DeviceFamily.list();
      const defaultFamily = families[0];
      
      if (!defaultFamily) {
        throw new Error('No device family found. Create device family first.');
      }
      
      createdEntity = await base44.entities.DeviceModel.create({
        tenant_id: tenantId,
        device_family_id: defaultFamily.id,
        ...recordData,
        status: 'draft'
      });
    }
    
    // Record provenance for all fields
    const defaultProvenance = provenanceConfig || {
      sourceType: 'BULK_IMPORT',
      sourceRefId: fileUrl,
      extractionMethod: 'deterministic'
    };
    
    await ProvenanceTracker.recordBulkProvenance(
      createdEntity.id,
      entityType,
      recordData,
      defaultProvenance,
      tenantId
    );
    
    // Create successful ingestion item
    await base44.entities.IngestionItem.create({
      tenant_id: tenantId,
      batch_id: batchId,
      entity_type_target: entityType,
      target_entity_id: createdEntity.id,
      raw_payload_pointer: fileUrl,
      parse_status: 'parsed',
      validation_status: 'passed',
      processed_at: new Date().toISOString()
    });
    
    return { success: true, entityId: createdEntity.id };
    
  } catch (error) {
    // Record failed ingestion item
    await base44.entities.IngestionItem.create({
      tenant_id: tenantId,
      batch_id: batchId,
      entity_type_target: entityType,
      raw_payload_pointer: fileUrl,
      parse_status: 'parse_failed',
      validation_status: 'failed',
      validation_errors: [{ error: error.message }],
      processed_at: new Date().toISOString()
    });
    
    throw error;
  }
}

/**
 * Complete ingestion batch
 */
export async function completeIngestionBatch(batchId, overrides = {}) {
  const items = await base44.entities.IngestionItem.filter({ batch_id: batchId });
  
  const successful = items.filter(i => i.validation_status === 'passed').length;
  const failed = items.filter(i => i.validation_status === 'failed').length;
  
  await base44.entities.IngestionBatch.update(batchId, {
    completed_at: new Date().toISOString(),
    status: failed === 0 ? 'completed' : successful > 0 ? 'partial' : 'failed',
    total_items: items.length,
    successful_items: overrides.successful_items || successful,
    failed_items: overrides.failed_items || failed
  });
}

/**
 * Intelligent sync: Only sync suppliers that should be EUDAMED actors
 */
export async function syncSupplyLensToEUDAMED() {
  const batch = await startIngestionBatch('SUPPLYLENS_SYNC');
  const user = await base44.auth.me();
  const tenantId = user.tenant_id || 'default';
  
  try {
    const SupplierClassificationService = (await import('./SupplierClassificationService')).default;
    const suppliers = await base44.entities.Supplier.list();
    
    let synced = 0;
    let skipped = 0;
    
    for (const supplier of suppliers) {
      try {
        const classification = await SupplierClassificationService.classifySupplier(supplier);
        
        if (classification.should_register_as_actor) {
          const result = await SupplierClassificationService.syncSupplierToEUDAMED(supplier, tenantId);
          
          if (result.operator) {
            await base44.entities.IngestionItem.create({
              tenant_id: tenantId,
              batch_id: batch.id,
              entity_type_target: 'EconomicOperator',
              target_entity_id: result.operator.id,
              parse_status: 'parsed',
              validation_status: 'passed',
              processed_at: new Date().toISOString()
            });
            synced++;
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Failed to sync supplier ${supplier.id}:`, error);
      }
    }
    
    await completeIngestionBatch(batch.id, { successful_items: synced, failed_items: 0 });
    
    return { success: true, batchId: batch.id, synced, skipped };
  } catch (error) {
    await base44.entities.IngestionBatch.update(batch.id, {
      status: 'failed',
      error_summary: error.message,
      completed_at: new Date().toISOString()
    });
    throw error;
  }
}

export default {
  startIngestionBatch,
  ingestSupplierAsOperator,
  ingestSKUAsDeviceModel,
  processBulkRecord,
  completeIngestionBatch,
  syncSupplyLensToEUDAMED
};
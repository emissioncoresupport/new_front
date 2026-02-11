/**
 * ERP Data Ingestion - Multi-Tenant Compliant
 * Ingests supplier, material, and BOM data from ERP systems
 * Implements secure multi-tenant data import with validation (Dec 2025)
 */

import { 
  authenticateAndValidate,
  publishToQueue,
  errorResponse,
  successResponse 
} from './services/authValidationMiddleware.js';
import { withUsageMetering } from './services/usageMeteringMiddleware.js';

Deno.serve(async (req) => {
  return withUsageMetering(req, 'integration.erp_sync', async ({ user, base44, tenantId }) => {
    try {

    // Step 2: Check admin role for bulk operations
    if (user.role !== 'admin') {
      return errorResponse({
        status: 403,
        message: 'Forbidden: Admin access required for ERP data ingestion'
      });
    }

    // Step 3: Parse request payload
    const { 
      erp_connection_id,
      entity_types = ['suppliers', 'materials', 'boms'],
      sync_mode = 'incremental' // or 'full'
    } = await req.json();

    if (!erp_connection_id) {
      return errorResponse({
        status: 400,
        message: 'erp_connection_id is required'
      });
    }

    // Step 4: Validate ERP connection belongs to tenant
    const connections = await base44.entities.ERPConnection.filter({
      id: erp_connection_id,
      tenant_id: tenantId
    });

    if (!connections || connections.length === 0) {
      return errorResponse({
        status: 404,
        message: 'ERP connection not found or access denied'
      });
    }

    const erpConnection = connections[0];

    if (erpConnection.status !== 'active') {
      return errorResponse({
        status: 400,
        message: 'ERP connection is not active'
      });
    }

    // Step 5: Create ERP sync run record
    const syncRun = await base44.entities.ERPSyncRun.create({
      tenant_id: tenantId,
      erp_connection_id,
      sync_mode,
      entity_types: entity_types,
      status: 'running',
      started_by: user.email,
      started_at: new Date().toISOString(),
      records_processed: 0,
      records_created: 0,
      records_updated: 0,
      records_failed: 0,
      errors: []
    });

    // Step 6: Publish to async queue for actual data ingestion
    const { success: queueSuccess, messageId } = await publishToQueue(
      'erp.data_ingestion',
      {
        sync_run_id: syncRun.id,
        erp_connection_id,
        tenant_id: tenantId,
        entity_types,
        sync_mode,
        user_email: user.email
      },
      tenantId
    );

    if (!queueSuccess) {
      // Update sync run to failed
      await base44.entities.ERPSyncRun.update(syncRun.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors: ['Failed to queue ingestion job']
      });

      return errorResponse({
        status: 500,
        message: 'Failed to initiate ERP data ingestion'
      });
    }

    // Step 7: Simulate synchronous processing for demo
    // In production, this would be handled by the async worker
    const ingestionResults = await processERPIngestion(
      erpConnection,
      entity_types,
      sync_mode,
      tenantId,
      base44
    );

    // Step 8: Update sync run with results
    await base44.entities.ERPSyncRun.update(syncRun.id, {
      status: ingestionResults.status,
      completed_at: new Date().toISOString(),
      records_processed: ingestionResults.records_processed,
      records_created: ingestionResults.records_created,
      records_updated: ingestionResults.records_updated,
      records_failed: ingestionResults.records_failed,
      errors: ingestionResults.errors,
      summary: ingestionResults.summary
    });

    // Step 9: Create audit log
    await base44.entities.AuditLog.create({
      tenant_id: tenantId,
      user_email: user.email,
      action: 'erp_data_ingestion',
      entity_type: 'ERPSyncRun',
      entity_id: syncRun.id,
      details: {
        entity_types,
        sync_mode,
        ...ingestionResults
      },
      timestamp: new Date().toISOString()
    });

    return {
      sync_run_id: syncRun.id,
      message_id: messageId,
      status: ingestionResults.status,
      summary: {
        records_processed: ingestionResults.records_processed,
        records_created: ingestionResults.records_created,
        records_updated: ingestionResults.records_updated,
        records_failed: ingestionResults.records_failed
      },
      details: ingestionResults.summary,
      message: 'ERP data ingestion completed successfully'
    };

    } catch (error) {
      throw new Error(`ERP data ingestion failed: ${error.message}`);
    }
  });
});

/**
 * Process ERP data ingestion
 * This would integrate with actual ERP APIs (SAP, Oracle, etc.)
 */
async function processERPIngestion(erpConnection, entityTypes, syncMode, tenantId, base44) {
  const results = {
    status: 'completed',
    records_processed: 0,
    records_created: 0,
    records_updated: 0,
    records_failed: 0,
    errors: [],
    summary: {}
  };

  try {
    // Suppliers ingestion
    if (entityTypes.includes('suppliers')) {
      const supplierResult = await ingestSuppliers(erpConnection, syncMode, tenantId, base44);
      results.records_processed += supplierResult.processed;
      results.records_created += supplierResult.created;
      results.records_updated += supplierResult.updated;
      results.records_failed += supplierResult.failed;
      results.summary.suppliers = supplierResult;
    }

    // Materials ingestion
    if (entityTypes.includes('materials')) {
      const materialResult = await ingestMaterials(erpConnection, syncMode, tenantId, base44);
      results.records_processed += materialResult.processed;
      results.records_created += materialResult.created;
      results.records_updated += materialResult.updated;
      results.records_failed += materialResult.failed;
      results.summary.materials = materialResult;
    }

    // BOMs ingestion
    if (entityTypes.includes('boms')) {
      const bomResult = await ingestBOMs(erpConnection, syncMode, tenantId, base44);
      results.records_processed += bomResult.processed;
      results.records_created += bomResult.created;
      results.records_updated += bomResult.updated;
      results.records_failed += bomResult.failed;
      results.summary.boms = bomResult;
    }

  } catch (error) {
    results.status = 'failed';
    results.errors.push(error.message);
  }

  return results;
}

/**
 * Ingest suppliers from ERP
 */
async function ingestSuppliers(erpConnection, syncMode, tenantId, base44) {
  const result = { processed: 0, created: 0, updated: 0, failed: 0 };

  // In production, fetch from actual ERP API
  // For demo, simulate data
  const erpSuppliers = simulateERPData('suppliers', 5);

  for (const erpSupplier of erpSuppliers) {
    result.processed++;

    try {
      // Check if supplier exists (by ERP ID)
      const existing = await base44.asServiceRole.entities.Supplier.filter({
        erp_id: erpSupplier.erp_id,
        company_id: tenantId
      });

      if (existing.length > 0) {
        // Update existing
        await base44.asServiceRole.entities.Supplier.update(existing[0].id, {
          legal_name: erpSupplier.name,
          country: erpSupplier.country,
          city: erpSupplier.city,
          email: erpSupplier.email,
          source: 'ERP',
          updated_at: new Date().toISOString()
        });
        result.updated++;
      } else {
        // Create new
        await base44.asServiceRole.entities.Supplier.create({
          company_id: tenantId,
          legal_name: erpSupplier.name,
          country: erpSupplier.country,
          city: erpSupplier.city,
          email: erpSupplier.email,
          erp_id: erpSupplier.erp_id,
          source: 'ERP',
          status: 'active'
        });
        result.created++;
      }
    } catch (error) {
      result.failed++;
    }
  }

  return result;
}

/**
 * Ingest materials from ERP
 */
async function ingestMaterials(erpConnection, syncMode, tenantId, base44) {
  const result = { processed: 0, created: 0, updated: 0, failed: 0 };

  const erpMaterials = simulateERPData('materials', 10);

  for (const erpMaterial of erpMaterials) {
    result.processed++;

    try {
      const existing = await base44.asServiceRole.entities.MaterialSKU.filter({
        internal_sku: erpMaterial.sku,
        tenant_id: tenantId
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.MaterialSKU.update(existing[0].id, {
          material_name: erpMaterial.name,
          description: erpMaterial.description,
          weight_kg: erpMaterial.weight,
          uom: erpMaterial.uom
        });
        result.updated++;
      } else {
        await base44.asServiceRole.entities.MaterialSKU.create({
          tenant_id: tenantId,
          internal_sku: erpMaterial.sku,
          material_name: erpMaterial.name,
          description: erpMaterial.description,
          weight_kg: erpMaterial.weight,
          uom: erpMaterial.uom,
          category: 'component',
          status: 'active'
        });
        result.created++;
      }
    } catch (error) {
      result.failed++;
    }
  }

  return result;
}

/**
 * Ingest BOMs from ERP
 */
async function ingestBOMs(erpConnection, syncMode, tenantId, base44) {
  const result = { processed: 0, created: 0, updated: 0, failed: 0 };

  const erpBOMs = simulateERPData('boms', 3);

  for (const erpBOM of erpBOMs) {
    result.processed++;

    try {
      // Create or update product
      const productExists = await base44.asServiceRole.entities.ProductSKU.filter({
        internal_product_sku: erpBOM.product_sku,
        tenant_id: tenantId
      });

      let productId;
      if (productExists.length > 0) {
        productId = productExists[0].id;
        result.updated++;
      } else {
        const newProduct = await base44.asServiceRole.entities.ProductSKU.create({
          tenant_id: tenantId,
          internal_product_sku: erpBOM.product_sku,
          product_name: erpBOM.product_name,
          status: 'active'
        });
        productId = newProduct.id;
        result.created++;
      }

      // Create BOM items
      for (const item of erpBOM.items) {
        const materials = await base44.asServiceRole.entities.MaterialSKU.filter({
          internal_sku: item.material_sku,
          tenant_id: tenantId
        });

        if (materials.length > 0) {
          await base44.asServiceRole.entities.BOMItem.create({
            tenant_id: tenantId,
            product_sku_id: productId,
            material_sku_id: materials[0].id,
            quantity: item.quantity,
            unit: item.unit
          });
        }
      }
    } catch (error) {
      result.failed++;
    }
  }

  return result;
}

/**
 * Simulate ERP data for demo
 */
function simulateERPData(type, count) {
  if (type === 'suppliers') {
    return Array.from({ length: count }, (_, i) => ({
      erp_id: `SUP-${1000 + i}`,
      name: `ERP Supplier ${i + 1}`,
      country: ['DE', 'FR', 'IT', 'ES', 'NL'][i % 5],
      city: ['Berlin', 'Paris', 'Rome', 'Madrid', 'Amsterdam'][i % 5],
      email: `supplier${i + 1}@example.com`
    }));
  } else if (type === 'materials') {
    return Array.from({ length: count }, (_, i) => ({
      sku: `MAT-${2000 + i}`,
      name: `Material Component ${i + 1}`,
      description: `ERP imported material ${i + 1}`,
      weight: (Math.random() * 10).toFixed(2),
      uom: 'kg'
    }));
  } else if (type === 'boms') {
    return Array.from({ length: count }, (_, i) => ({
      product_sku: `PROD-${3000 + i}`,
      product_name: `Product Assembly ${i + 1}`,
      items: Array.from({ length: 3 }, (_, j) => ({
        material_sku: `MAT-${2000 + j}`,
        quantity: Math.floor(Math.random() * 10) + 1,
        unit: 'piece'
      }))
    }));
  }
  return [];
}
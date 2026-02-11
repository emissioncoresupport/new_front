import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * LEGACY ENTITY QUARANTINE ENGINE
 * 
 * PHASE D.1 — Evidence-First Integrity Restoration
 * 
 * Detects and quarantines all entities without valid ingestion contracts.
 * No deletion. Immutable quarantine. Regulator-grade audit trail.
 * 
 * CONTRACT_FIRST_RELEASE_TIMESTAMP: 2026-01-21T00:00:00Z
 */

const CONTRACT_FIRST_RELEASE = new Date('2026-01-21T00:00:00Z');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      suppliers: { scanned: 0, quarantined: 0, compliant: 0 },
      facilities: { scanned: 0, quarantined: 0, compliant: 0 },
      products: { scanned: 0, quarantined: 0, compliant: 0 },
      shipments: { scanned: 0, quarantined: 0, compliant: 0 },
      auditLogs: [],
      timestamp: new Date().toISOString()
    };

    // STEP 1: SCAN SUPPLIERS
    const suppliers = await base44.asServiceRole.entities.Supplier.list();
    results.suppliers.scanned = suppliers.length;

    for (const supplier of suppliers) {
      const isLegacy = (
        !supplier.ingestion_contract_id ||
        !supplier.contract_status ||
        supplier.contract_status !== 'ACTIVE' ||
        new Date(supplier.created_date) < CONTRACT_FIRST_RELEASE ||
        ['mock', 'seed', 'test', 'unknown'].includes(supplier.origin_type)
      );

      if (isLegacy && supplier.status !== 'QUARANTINED') {
        // STEP 2: APPLY QUARANTINE
        const beforeState = JSON.stringify(supplier);
        
        await base44.asServiceRole.entities.Supplier.update(supplier.id, {
          status: 'QUARANTINED',
          quarantine_reason: 'LEGACY_ORIGIN_NO_CONTRACT',
          quarantine_timestamp: new Date().toISOString(),
          quarantine_actor: 'SYSTEM',
          immutable_quarantine: true
        });

        const afterState = JSON.stringify({ ...supplier, status: 'QUARANTINED' });

        // STEP 5: AUDIT LOG
        await base44.asServiceRole.entities.AuditLog.create({
          actor_id: 'SYSTEM',
          actor_role: 'SYSTEM',
          action: 'ENTITY_QUARANTINED',
          entity_type: 'Supplier',
          entity_id: supplier.id,
          previous_status: supplier.status,
          new_status: 'QUARANTINED',
          reason_code: 'LEGACY_NO_CONTRACT',
          timestamp: new Date().toISOString(),
          before_state_hash: btoa(beforeState),
          after_state_hash: btoa(afterState)
        });

        results.suppliers.quarantined++;
        results.auditLogs.push({
          entity_type: 'Supplier',
          entity_id: supplier.id,
          reason: 'LEGACY_ORIGIN_NO_CONTRACT'
        });
      } else if (!isLegacy) {
        results.suppliers.compliant++;
      }
    }

    // STEP 1: SCAN FACILITIES
    const facilities = await base44.asServiceRole.entities.SupplierSite.list();
    results.facilities.scanned = facilities.length;

    for (const facility of facilities) {
      const isLegacy = (
        !facility.ingestion_contract_id ||
        !facility.contract_status ||
        facility.contract_status !== 'ACTIVE' ||
        new Date(facility.created_date) < CONTRACT_FIRST_RELEASE ||
        ['mock', 'seed', 'test', 'unknown'].includes(facility.origin_type)
      );

      if (isLegacy && facility.status !== 'QUARANTINED') {
        const beforeState = JSON.stringify(facility);
        
        await base44.asServiceRole.entities.SupplierSite.update(facility.id, {
          status: 'QUARANTINED',
          quarantine_reason: 'LEGACY_ORIGIN_NO_CONTRACT',
          quarantine_timestamp: new Date().toISOString(),
          quarantine_actor: 'SYSTEM',
          immutable_quarantine: true
        });

        const afterState = JSON.stringify({ ...facility, status: 'QUARANTINED' });

        await base44.asServiceRole.entities.AuditLog.create({
          actor_id: 'SYSTEM',
          actor_role: 'SYSTEM',
          action: 'ENTITY_QUARANTINED',
          entity_type: 'SupplierSite',
          entity_id: facility.id,
          previous_status: facility.status,
          new_status: 'QUARANTINED',
          reason_code: 'LEGACY_NO_CONTRACT',
          timestamp: new Date().toISOString(),
          before_state_hash: btoa(beforeState),
          after_state_hash: btoa(afterState)
        });

        results.facilities.quarantined++;
        results.auditLogs.push({
          entity_type: 'SupplierSite',
          entity_id: facility.id,
          reason: 'LEGACY_ORIGIN_NO_CONTRACT'
        });
      } else if (!isLegacy) {
        results.facilities.compliant++;
      }
    }

    // STEP 1: SCAN PRODUCTS
    const products = await base44.asServiceRole.entities.Product.list();
    results.products.scanned = products.length;

    for (const product of products) {
      const isLegacy = (
        !product.ingestion_contract_id ||
        !product.contract_status ||
        product.contract_status !== 'ACTIVE' ||
        new Date(product.created_date) < CONTRACT_FIRST_RELEASE ||
        ['mock', 'seed', 'test', 'unknown'].includes(product.origin_type)
      );

      if (isLegacy && product.status !== 'QUARANTINED') {
        const beforeState = JSON.stringify(product);
        
        await base44.asServiceRole.entities.Product.update(product.id, {
          status: 'QUARANTINED',
          quarantine_reason: 'LEGACY_ORIGIN_NO_CONTRACT',
          quarantine_timestamp: new Date().toISOString(),
          quarantine_actor: 'SYSTEM',
          immutable_quarantine: true
        });

        const afterState = JSON.stringify({ ...product, status: 'QUARANTINED' });

        await base44.asServiceRole.entities.AuditLog.create({
          actor_id: 'SYSTEM',
          actor_role: 'SYSTEM',
          action: 'ENTITY_QUARANTINED',
          entity_type: 'Product',
          entity_id: product.id,
          previous_status: product.status,
          new_status: 'QUARANTINED',
          reason_code: 'LEGACY_NO_CONTRACT',
          timestamp: new Date().toISOString(),
          before_state_hash: btoa(beforeState),
          after_state_hash: btoa(afterState)
        });

        results.products.quarantined++;
        results.auditLogs.push({
          entity_type: 'Product',
          entity_id: product.id,
          reason: 'LEGACY_ORIGIN_NO_CONTRACT'
        });
      } else if (!isLegacy) {
        results.products.compliant++;
      }
    }

    return Response.json({
      success: true,
      execution_timestamp: results.timestamp,
      summary: {
        total_scanned: results.suppliers.scanned + results.facilities.scanned + results.products.scanned,
        total_quarantined: results.suppliers.quarantined + results.facilities.quarantined + results.products.quarantined,
        total_compliant: results.suppliers.compliant + results.facilities.compliant + results.products.compliant
      },
      details: results,
      message: 'Legacy entities quarantined. Evidence-first integrity restored.'
    });

  } catch (error) {
    console.error('Quarantine execution failed:', error);
    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});
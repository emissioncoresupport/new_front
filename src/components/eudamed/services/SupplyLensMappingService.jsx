import { base44 } from "@/api/base44Client";

/**
 * SupplyLens Mapping Service
 * 
 * Creates CANDIDATE SUGGESTIONS for mapping SupplyLens operational data
 * to EUDAMED regulatory objects. DOES NOT auto-create actors/devices.
 * 
 * Human approval required via candidate review flow.
 */

export default class SupplyLensMappingService {

  /**
   * Sync suppliers from SupplyLens - creates mapping suggestions ONLY
   */
  static async syncSuppliers() {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';

    // Fetch SupplyLens suppliers
    const suppliers = await base44.entities.Supplier.list();
    
    // Fetch existing mappings
    const existingMaps = await base44.entities.EUDAMEDSupplierActorMap.list();
    
    let suggested = 0;
    let updated = 0;
    let skipped = 0;

    for (const supplier of suppliers) {
      // Check if already mapped
      const existingMap = existingMaps.find(m => 
        m.sl_supplier_id === supplier.id && 
        m.tenant_id === tenantId
      );

      if (existingMap) {
        // Update last_sync_at
        await base44.entities.EUDAMEDSupplierActorMap.update(existingMap.id, {
          last_sync_at: new Date().toISOString()
        });
        updated++;
        continue;
      }

      // Classify supplier to determine if it should be an actor
      const classification = await this.classifySupplier(supplier);

      if (!classification.should_suggest_as_actor) {
        skipped++;
        continue;
      }

      // Create mapping suggestion
      await base44.entities.EUDAMEDSupplierActorMap.create({
        tenant_id: tenantId,
        sl_supplier_id: supplier.id,
        eu_actor_id: null, // No actor yet - just a suggestion
        mapping_status: 'suggested',
        suggested_actor_type: classification.actor_type,
        confidence_score: classification.confidence,
        reasoning: classification.reasoning,
        last_sync_at: new Date().toISOString()
      });
      suggested++;
    }

    // Create ledger event
    await base44.entities.LedgerEvent.create({
      tenant_id: tenantId,
      entity_type: 'SupplyLensSync',
      entity_id: 'suppliers',
      event_type: 'SUPPLYLENS_SYNC_RUN',
      canonical_payload_json: {
        total_suppliers: suppliers.length,
        suggested,
        updated,
        skipped
      },
      prev_hash: await this.getLastEventHash(tenantId),
      event_hash: this.hashData({ suggested, updated, skipped, timestamp: Date.now() }),
      created_by: user.email
    });

    return { suggested, updated, skipped, confirmed: existingMaps.filter(m => m.mapping_status === 'confirmed').length };
  }

  /**
   * Sync SKUs from SupplyLens - creates mapping suggestions ONLY
   */
  static async syncSKUs() {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';

    const skus = await base44.entities.SKU.list();
    const existingMaps = await base44.entities.EUDAMEDSKUDeviceMap.list();
    
    let suggested = 0;
    let updated = 0;
    let skipped = 0;

    for (const sku of skus) {
      const existingMap = existingMaps.find(m => 
        m.sl_sku_id === sku.id && 
        m.tenant_id === tenantId
      );

      if (existingMap) {
        await base44.entities.EUDAMEDSKUDeviceMap.update(existingMap.id, {
          last_sync_at: new Date().toISOString()
        });
        updated++;
        continue;
      }

      // Create suggestion with prefilled data
      await base44.entities.EUDAMEDSKUDeviceMap.create({
        tenant_id: tenantId,
        sl_sku_id: sku.id,
        eu_device_model_id: null,
        mapping_status: 'suggested',
        confidence_score: 0.8,
        prefilled_data: {
          model_name: sku.sku_code || sku.internal_name,
          commercial_name: sku.internal_name,
          catalog_number: sku.sku_code,
          description: sku.description
        },
        last_sync_at: new Date().toISOString()
      });
      suggested++;
    }

    await base44.entities.LedgerEvent.create({
      tenant_id: tenantId,
      entity_type: 'SupplyLensSync',
      entity_id: 'skus',
      event_type: 'SUPPLYLENS_SYNC_RUN',
      canonical_payload_json: { total_skus: skus.length, suggested, updated, skipped },
      prev_hash: await this.getLastEventHash(tenantId),
      event_hash: this.hashData({ suggested, updated, skipped, timestamp: Date.now() }),
      created_by: user.email
    });

    return { suggested, updated, skipped, confirmed: existingMaps.filter(m => m.mapping_status === 'confirmed').length };
  }

  /**
   * Classify supplier - determine if should be suggested as EUDAMED actor
   */
  static async classifySupplier(supplier) {
    const supplierType = (supplier.supplier_type || '').toLowerCase();
    const capabilities = supplier.capabilities || [];

    // Contract manufacturers, OEMs - should be actors
    if (
      supplierType.includes('contract manufacturer') ||
      supplierType.includes('oem') ||
      capabilities.some(c => /manufac|assem|produc/i.test(c))
    ) {
      return {
        should_suggest_as_actor: true,
        actor_type: 'manufacturer',
        confidence: 0.9,
        reasoning: ['Contract manufacturer - devices assembled here']
      };
    }

    // Non-EU suppliers shipping to EU - potential importers
    if (!this.isEUCountry(supplier.country) && supplier.ships_to_eu) {
      return {
        should_suggest_as_actor: true,
        actor_type: 'importer',
        confidence: 0.75,
        reasoning: ['Non-EU supplier shipping to EU - potential importer']
      };
    }

    // Most suppliers are just component suppliers - NOT actors
    return {
      should_suggest_as_actor: false,
      actor_type: null,
      confidence: 0,
      reasoning: ['Component supplier - no EUDAMED actor registration needed']
    };
  }

  /**
   * Confirm supplier mapping - link to existing actor OR create new
   */
  static async confirmSupplierMapping(mappingId, action) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';

    const mappings = await base44.entities.EUDAMEDSupplierActorMap.list();
    const mapping = mappings.find(m => m.id === mappingId);

    if (!mapping) throw new Error('Mapping not found');

    let actorId = action.existing_actor_id;

    // Create new actor if requested
    if (action.create_new_actor) {
      const actor = await base44.entities.EconomicOperator.create({
        tenant_id: tenantId,
        ...action.actor_data,
        status: 'draft'
      });
      actorId = actor.id;

      // Log creation
      await base44.entities.LedgerEvent.create({
        tenant_id: tenantId,
        entity_type: 'EconomicOperator',
        entity_id: actor.id,
        event_type: 'ACTOR_CREATED',
        canonical_payload_json: action.actor_data,
        prev_hash: await this.getLastEventHash(tenantId),
        event_hash: this.hashData({ ...action.actor_data, created_at: Date.now() }),
        created_by: user.email
      });
    }

    // Confirm mapping
    await base44.entities.EUDAMEDSupplierActorMap.update(mappingId, {
      eu_actor_id: actorId,
      mapping_status: 'confirmed',
      confirmed_by: user.email,
      confirmed_at: new Date().toISOString()
    });

    // Log mapping confirmation
    await base44.entities.LedgerEvent.create({
      tenant_id: tenantId,
      entity_type: 'SupplierActorMapping',
      entity_id: mappingId,
      event_type: 'MAPPING_CONFIRMED',
      canonical_payload_json: { mapping_id: mappingId, actor_id: actorId },
      prev_hash: await this.getLastEventHash(tenantId),
      event_hash: this.hashData({ mappingId, actorId, timestamp: Date.now() }),
      created_by: user.email
    });

    return { success: true, actorId };
  }

  /**
   * Reject supplier mapping
   */
  static async rejectSupplierMapping(mappingId, reason) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';

    await base44.entities.EUDAMEDSupplierActorMap.update(mappingId, {
      mapping_status: 'rejected',
      rejected_by: user.email,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason
    });

    await base44.entities.LedgerEvent.create({
      tenant_id: tenantId,
      entity_type: 'SupplierActorMapping',
      entity_id: mappingId,
      event_type: 'MAPPING_REJECTED',
      canonical_payload_json: { mapping_id: mappingId, reason },
      prev_hash: await this.getLastEventHash(tenantId),
      event_hash: this.hashData({ mappingId, reason, timestamp: Date.now() }),
      created_by: user.email
    });

    return { success: true };
  }

  /**
   * Get mapping candidates for review
   */
  static async getMappingCandidates(status = 'suggested') {
    const mappings = await base44.entities.EUDAMEDSupplierActorMap.list();
    const suppliers = await base44.entities.Supplier.list();

    return mappings
      .filter(m => m.mapping_status === status)
      .map(mapping => {
        const supplier = suppliers.find(s => s.id === mapping.sl_supplier_id);
        return { mapping, supplier };
      });
  }

  static isEUCountry(countryCode) {
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO'];
    return euCountries.includes(countryCode?.toUpperCase());
  }

  static async getLastEventHash(tenantId) {
    const events = await base44.entities.LedgerEvent.list();
    const tenantEvents = events.filter(e => e.tenant_id === tenantId).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return tenantEvents[0]?.event_hash || '';
  }

  static hashData(data) {
    return btoa(JSON.stringify(data)).substring(0, 32);
  }
}
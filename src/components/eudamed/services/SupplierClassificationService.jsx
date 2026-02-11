import { base44 } from "@/api/base44Client";

/**
 * EUDAMED Supplier Classification Service
 * 
 * Intelligently classifies SupplyLens suppliers into:
 * - Economic Operators (manufacturers, contract manufacturers, importers)
 * - Component/Material Suppliers (linked via BoM + provenance)
 * - Service Providers (testing, sterilization, packaging)
 */

export default class SupplierClassificationService {
  
  /**
   * Classify a supplier based on their role, capabilities, and relationship
   */
  static async classifySupplier(supplier) {
    const classification = {
      is_economic_operator: false,
      operator_type: null,
      should_register_as_actor: false,
      role_in_supply_chain: 'component_supplier',
      confidence: 0,
      reasoning: []
    };

    // Check supplier type and capabilities
    const supplierType = (supplier.supplier_type || '').toLowerCase();
    const capabilities = supplier.capabilities || [];
    const services = supplier.services || [];

    // 1. Contract Manufacturers → Manufacturers (EUDAMED actors)
    if (
      supplierType.includes('contract manufacturer') ||
      supplierType.includes('oem') ||
      supplierType.includes('assembler') ||
      capabilities.some(c => /manufac|assem|produc/i.test(c))
    ) {
      classification.is_economic_operator = true;
      classification.operator_type = 'manufacturer';
      classification.should_register_as_actor = true;
      classification.role_in_supply_chain = 'contract_manufacturer';
      classification.confidence = 0.95;
      classification.reasoning.push('Contract manufacturer - devices assembled here');
      return classification;
    }

    // 2. Importers (non-EU suppliers shipping to EU)
    if (
      supplierType.includes('importer') ||
      (supplier.country && !this.isEUCountry(supplier.country) && supplier.ships_to_eu)
    ) {
      classification.is_economic_operator = true;
      classification.operator_type = 'importer';
      classification.should_register_as_actor = true;
      classification.role_in_supply_chain = 'importer';
      classification.confidence = 0.9;
      classification.reasoning.push('Non-EU supplier shipping to EU - potential importer');
      return classification;
    }

    // 3. System/Procedure Pack Producers
    if (
      supplierType.includes('pack producer') ||
      capabilities.some(c => /packag|kit|system/i.test(c))
    ) {
      classification.is_economic_operator = true;
      classification.operator_type = 'system_pack_producer';
      classification.should_register_as_actor = true;
      classification.role_in_supply_chain = 'pack_producer';
      classification.confidence = 0.85;
      classification.reasoning.push('Produces device systems/packs');
      return classification;
    }

    // 4. Sterilization/Processing Services → Operator Sites
    if (
      services.some(s => /steril|eto|gamma|autoclave/i.test(s)) ||
      capabilities.some(c => /steril/i.test(c))
    ) {
      classification.role_in_supply_chain = 'sterilization_service';
      classification.confidence = 0.8;
      classification.reasoning.push('Sterilization service - map to operator site');
      return classification;
    }

    // 5. Component/Material Suppliers → BoM linkage only
    if (
      supplierType.includes('component') ||
      supplierType.includes('material') ||
      supplierType.includes('raw material') ||
      capabilities.some(c => /component|material|part/i.test(c))
    ) {
      classification.role_in_supply_chain = 'component_supplier';
      classification.confidence = 0.9;
      classification.reasoning.push('Component supplier - link via device BoM');
      return classification;
    }

    // 6. Testing/Certification Labs → Service provider
    if (
      services.some(s => /test|certif|verif|validat/i.test(s)) ||
      capabilities.some(c => /test|lab|certif/i.test(c))
    ) {
      classification.role_in_supply_chain = 'testing_service';
      classification.confidence = 0.85;
      classification.reasoning.push('Testing/certification lab - service provider');
      return classification;
    }

    // Default: component supplier
    classification.role_in_supply_chain = 'component_supplier';
    classification.confidence = 0.6;
    classification.reasoning.push('Default classification - requires review');
    
    return classification;
  }

  /**
   * Check if country is EU/EEA
   */
  static isEUCountry(countryCode) {
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 
      'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 
      'SI', 'ES', 'SE', 'IS', 'LI', 'NO'
    ];
    return euCountries.includes(countryCode?.toUpperCase());
  }

  /**
   * Auto-sync supplier to EUDAMED based on classification
   */
  static async syncSupplierToEUDAMED(supplier, tenantId) {
    const classification = await this.classifySupplier(supplier);

    if (classification.should_register_as_actor) {
      // Create Economic Operator
      const operator = await base44.entities.EconomicOperator.create({
        tenant_id: tenantId,
        operator_type: classification.operator_type,
        legal_name: supplier.legal_name,
        trade_name: supplier.trade_name,
        address: supplier.address,
        city: supplier.city,
        postal_code: supplier.postal_code,
        country: supplier.country,
        vat_number: supplier.vat_number,
        eori_number: supplier.eori_number,
        primary_contact_name: supplier.primary_contact_name,
        primary_contact_email: supplier.primary_contact_email,
        primary_contact_phone: supplier.primary_contact_phone,
        website: supplier.website,
        supplylens_supplier_id: supplier.id,
        status: 'draft'
      });

      // Map supplier sites to operator sites
      if (supplier.sites?.length > 0) {
        for (const site of supplier.sites) {
          await this.mapSupplierSiteToOperatorSite(site, operator.id, tenantId);
        }
      }

      return { operator, classification };
    } else {
      // Just track classification for non-actors
      return { operator: null, classification };
    }
  }

  /**
   * Map supplier site to operator site
   */
  static async mapSupplierSiteToOperatorSite(supplierSite, operatorId, tenantId) {
    // Determine site type from capabilities
    let siteType = 'other';
    const capabilities = (supplierSite.capabilities || []).map(c => c.toLowerCase());
    
    if (capabilities.some(c => c.includes('manufac') || c.includes('assem'))) {
      siteType = 'manufacturing';
    } else if (capabilities.some(c => c.includes('packag'))) {
      siteType = 'packaging';
    } else if (capabilities.some(c => c.includes('steril'))) {
      siteType = 'sterilization';
    } else if (capabilities.some(c => c.includes('warehouse') || c.includes('storage'))) {
      siteType = 'warehousing';
    } else if (capabilities.some(c => c.includes('distribut'))) {
      siteType = 'distribution';
    }

    const operatorSite = await base44.entities.OperatorSite.create({
      tenant_id: tenantId,
      operator_id: operatorId,
      site_type: siteType,
      site_name: supplierSite.site_name,
      address: supplierSite.address,
      city: supplierSite.city,
      postal_code: supplierSite.postal_code,
      country: supplierSite.country,
      latitude: supplierSite.latitude,
      longitude: supplierSite.longitude,
      contact_person: supplierSite.contact_person,
      contact_email: supplierSite.contact_email,
      status: 'active',
      supplylens_site_id: supplierSite.id
    });

    return operatorSite;
  }

  /**
   * Bulk classify all suppliers and return recommendations
   */
  static async classifyAllSuppliers() {
    const suppliers = await base44.entities.Supplier.list();
    const classifications = [];

    for (const supplier of suppliers) {
      const classification = await this.classifySupplier(supplier);
      classifications.push({
        supplier,
        classification
      });
    }

    // Group by recommendation
    const grouped = {
      should_register_as_actors: classifications.filter(c => c.classification.should_register_as_actor),
      component_suppliers: classifications.filter(c => c.classification.role_in_supply_chain === 'component_supplier'),
      service_providers: classifications.filter(c => 
        ['sterilization_service', 'testing_service'].includes(c.classification.role_in_supply_chain)
      ),
      needs_review: classifications.filter(c => c.classification.confidence < 0.7)
    };

    return grouped;
  }
}
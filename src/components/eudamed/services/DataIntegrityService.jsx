import { base44 } from "@/api/base44Client";

/**
 * Data Integrity & Cross-Module Validation Service
 * 
 * Ensures data consistency across SupplyLens → EUDAMED → CBAM → PFAS → PPWR → DPP
 * Validates referential integrity, calculates completeness scores, flags gaps
 */

export default class DataIntegrityService {

  /**
   * Calculate supplier data completeness for EUDAMED
   */
  static async calculateSupplierCompleteness(supplierId) {
    const suppliers = await base44.entities.Supplier.list();
    const supplier = suppliers.find(s => s.id === supplierId);
    
    if (!supplier) return { score: 0, missing: [] };

    const requiredFields = [
      'legal_name',
      'country',
      'address',
      'city',
      'postal_code',
      'vat_number',
      'primary_contact_email',
      'supplier_type',
      'capabilities'
    ];

    const missing = requiredFields.filter(field => !supplier[field]);
    const score = ((requiredFields.length - missing.length) / requiredFields.length) * 100;

    return {
      score: Math.round(score),
      missing,
      eudamed_ready: score >= 80 && supplier.eudamed_relevant
    };
  }

  /**
   * Calculate SKU data completeness for device mapping
   */
  static async calculateSKUCompleteness(skuId) {
    const skus = await base44.entities.SKU.list();
    const sku = skus.find(s => s.id === skuId);
    
    if (!sku) return { score: 0, missing: [] };

    const requiredFields = [
      'sku_code',
      'internal_name',
      'description',
      'category',
      'device_category',
      'intended_use',
      'risk_class_indicator'
    ];

    const missing = requiredFields.filter(field => !sku[field]);
    const score = ((requiredFields.length - missing.length) / requiredFields.length) * 100;

    return {
      score: Math.round(score),
      missing,
      device_mapping_ready: score >= 70 && sku.device_category !== 'not_applicable'
    };
  }

  /**
   * Validate cross-module data dependencies
   */
  static async validateCrossModuleDependencies(entityType, entityId) {
    const issues = [];

    if (entityType === 'Supplier') {
      const suppliers = await base44.entities.Supplier.list();
      const supplier = suppliers.find(s => s.id === entityId);

      // Check if flagged for EUDAMED but missing critical data
      if (supplier.eudamed_relevant) {
        if (!supplier.supplier_type) {
          issues.push({ field: 'supplier_type', severity: 'critical', message: 'Supplier type required for EUDAMED classification' });
        }
        if (!supplier.capabilities?.length) {
          issues.push({ field: 'capabilities', severity: 'major', message: 'Manufacturing capabilities required for actor determination' });
        }
        if (!supplier.vat_number && this.isEUCountry(supplier.country)) {
          issues.push({ field: 'vat_number', severity: 'major', message: 'VAT number required for EU suppliers' });
        }
      }

      // Check CBAM dependencies
      if (supplier.cbam_relevant && !supplier.country_of_origin) {
        issues.push({ field: 'country_of_origin', severity: 'critical', message: 'Country of origin required for CBAM reporting' });
      }

      // Check PFAS dependencies
      if (supplier.pfas_relevant) {
        const sites = await base44.entities.SupplierSite.filter({ supplier_id: entityId });
        if (sites.length === 0) {
          issues.push({ field: 'sites', severity: 'major', message: 'At least one site required for PFAS supplier tracking' });
        }
      }
    }

    if (entityType === 'SKU') {
      const skus = await base44.entities.SKU.list();
      const sku = skus.find(s => s.id === entityId);

      // Check device mapping readiness
      if (sku.device_category !== 'not_applicable') {
        if (!sku.intended_use) {
          issues.push({ field: 'intended_use', severity: 'critical', message: 'Intended use required for EUDAMED device registration' });
        }
        if (!sku.risk_class_indicator) {
          issues.push({ field: 'risk_class_indicator', severity: 'critical', message: 'Risk class required for device classification' });
        }
      }

      // Check PCF dependencies
      if (!sku.pcf_co2e && sku.weight_kg) {
        issues.push({ field: 'pcf_co2e', severity: 'minor', message: 'Product carbon footprint missing - calculate for DPP/CSRD' });
      }

      // Check PPWR dependencies
      if (!sku.recycled_content_percentage && sku.material_composition?.length > 0) {
        issues.push({ field: 'recycled_content_percentage', severity: 'minor', message: 'Recycled content required for PPWR compliance' });
      }
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      criticalCount: issues.filter(i => i.severity === 'critical').length,
      majorCount: issues.filter(i => i.severity === 'major').length
    };
  }

  /**
   * Generate data quality scorecard
   */
  static async generateQualityScorecard(tenantId) {
    const suppliers = await base44.entities.Supplier.list();
    const skus = await base44.entities.SKU.list();
    const sites = await base44.entities.SupplierSite.list();
    const boms = await base44.entities.BOM.list();

    const supplierScores = await Promise.all(
      suppliers.map(s => this.calculateSupplierCompleteness(s.id))
    );

    const skuScores = await Promise.all(
      skus.map(s => this.calculateSKUCompleteness(s.id))
    );

    const avgSupplierScore = supplierScores.reduce((sum, s) => sum + s.score, 0) / (supplierScores.length || 1);
    const avgSKUScore = skuScores.reduce((sum, s) => sum + s.score, 0) / (skuScores.length || 1);

    return {
      suppliers: {
        total: suppliers.length,
        avgCompleteness: Math.round(avgSupplierScore),
        eudamedReady: supplierScores.filter(s => s.eudamed_ready).length,
        missingCritical: supplierScores.filter(s => s.score < 50).length
      },
      skus: {
        total: skus.length,
        avgCompleteness: Math.round(avgSKUScore),
        deviceMappingReady: skuScores.filter(s => s.device_mapping_ready).length,
        missingCritical: skuScores.filter(s => s.score < 50).length
      },
      sites: {
        total: sites.length,
        eudamedRelevant: sites.filter(s => s.eudamed_relevant).length,
        iso13485: sites.filter(s => s.iso13485_certified).length
      },
      boms: {
        total: boms.length,
        published: boms.filter(b => b.status === 'published').length,
        linkedToDevices: boms.filter(b => b.eudamed_device_model_id).length
      }
    };
  }

  /**
   * Identify missing data for external API injection
   */
  static async identifyExternalDataNeeds() {
    const suppliers = await base44.entities.Supplier.list();
    const skus = await base44.entities.SKU.list();

    const needs = {
      vat_validation: suppliers.filter(s => s.vat_number && !s.validation_status).map(s => ({
        supplierId: s.id,
        vatNumber: s.vat_number,
        country: s.country
      })),
      gmdn_lookup: skus.filter(s => s.device_category !== 'not_applicable' && !s.gmdn_code).map(s => ({
        skuId: s.id,
        description: s.description,
        intendedUse: s.intended_use
      })),
      emission_factors: skus.filter(s => !s.pcf_co2e && s.weight_kg).map(s => ({
        skuId: s.id,
        material: s.material_group,
        weight: s.weight_kg
      }))
    };

    return needs;
  }

  static isEUCountry(countryCode) {
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO'];
    return euCountries.includes(countryCode?.toUpperCase());
  }
}
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Master Data Orchestrator - Central service for all SupplyLens entity relationships
 * Ensures proper linking between Suppliers → Materials → SKUs → BOMs → Products
 * Syncs with compliance modules (CBAM, PFAS, EUDR, etc.)
 */

class MasterDataOrchestrator {
  /**
   * Core: Link Supplier to Material/SKU
   * Creates bidirectional relationship with confidence scoring
   */
  async linkSupplierToMaterial(supplierId, materialId, relationshipType = 'manufacturer', confidence = 100) {
    try {
      const user = await base44.auth.me();
      
      // Check if mapping already exists
      const existing = await base44.entities.SupplierSKUMapping.filter({
        supplier_id: supplierId,
        sku_id: materialId
      });

      if (existing.length > 0) {
        return { success: false, message: 'Mapping already exists', mapping_id: existing[0].id };
      }

      // Create the mapping
      const mapping = await base44.entities.SupplierSKUMapping.create({
        tenant_id: user.company_id,
        supplier_id: supplierId,
        sku_id: materialId,
        relationship_type: relationshipType,
        is_primary_supplier: relationshipType === 'manufacturer',
        mapping_confidence: confidence,
        source_system: 'master_data_orchestrator',
        active: true
      });

      // Sync to compliance modules
      await this.syncToComplianceModules(supplierId, materialId);

      return { success: true, mapping_id: mapping.id };
    } catch (error) {
      console.error('Failed to link supplier to material:', error);
      throw error;
    }
  }

  /**
   * Core: Link Material to BOM
   */
  async linkMaterialToBOM(materialId, bomId, quantity = 1, unit = 'pcs') {
    try {
      const user = await base44.auth.me();

      // Check if BOM item exists
      const existing = await base44.entities.BOMItem.filter({
        bom_id: bomId,
        material_sku_id: materialId
      });

      if (existing.length > 0) {
        return { success: false, message: 'BOM item already exists' };
      }

      const bomItem = await base44.entities.BOMItem.create({
        tenant_id: user.company_id,
        bom_id: bomId,
        material_sku_id: materialId,
        quantity: quantity,
        unit: unit,
        level: 1
      });

      return { success: true, bom_item_id: bomItem.id };
    } catch (error) {
      console.error('Failed to link material to BOM:', error);
      throw error;
    }
  }

  /**
   * Core: Link BOM to Product
   */
  async linkBOMToProduct(bomId, productId) {
    try {
      // Update BOM with product reference
      await base44.entities.BOM.update(bomId, {
        product_sku_id: productId
      });

      // Update product with BOM reference
      await base44.entities.ProductSKU.update(productId, {
        bom_id: bomId
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to link BOM to product:', error);
      throw error;
    }
  }

  /**
   * Auto-Discovery: Find and suggest supplier-material relationships
   * Uses fuzzy matching on names, codes, and metadata
   */
  async discoverRelationships(options = {}) {
    try {
      const { minConfidence = 70, autoApprove = false } = options;
      
      const suppliers = await base44.entities.Supplier.list();
      const materials = await base44.entities.MaterialSKU.list();
      const existingMappings = await base44.entities.SupplierSKUMapping.list();

      const mappedPairs = new Set(
        existingMappings.map(m => `${m.supplier_id}_${m.sku_id}`)
      );

      const suggestions = [];

      for (const supplier of suppliers) {
        for (const material of materials) {
          const pairKey = `${supplier.id}_${material.id}`;
          if (mappedPairs.has(pairKey)) continue;

          const score = this.calculateMatchScore(supplier, material);
          
          if (score >= minConfidence) {
            const suggestion = {
              supplier_id: supplier.id,
              supplier_name: supplier.legal_name,
              material_id: material.id,
              material_name: material.material_name,
              confidence: score,
              reasoning: this.getMatchReasoning(supplier, material, score)
            };

            suggestions.push(suggestion);

            // Auto-create if confidence is high enough and auto-approve enabled
            if (autoApprove && score >= 85) {
              await this.linkSupplierToMaterial(
                supplier.id, 
                material.id, 
                'manufacturer', 
                score
              );
            }
          }
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to discover relationships:', error);
      throw error;
    }
  }

  /**
   * Calculate match score between supplier and material
   */
  calculateMatchScore(supplier, material) {
    let score = 0;
    const factors = [];

    // Name similarity
    const supplierName = supplier.legal_name?.toLowerCase() || '';
    const materialName = material.material_name?.toLowerCase() || '';
    const supplierCode = supplier.vat_number?.toLowerCase() || '';
    const materialCode = material.internal_sku?.toLowerCase() || '';

    // Check if supplier name contains material name or vice versa
    if (supplierName.includes(materialName) || materialName.includes(supplierName)) {
      score += 30;
      factors.push('Name similarity');
    }

    // Check code matching
    if (supplierCode && materialCode && (
      supplierCode.includes(materialCode) || 
      materialCode.includes(supplierCode)
    )) {
      score += 40;
      factors.push('Code match');
    }

    // Check country match (if material has origin country)
    if (supplier.country === material.country_of_origin) {
      score += 20;
      factors.push('Country match');
    }

    // Check if supplier type matches material category
    if (supplier.supplier_type && material.category) {
      const typeMatch = this.matchSupplierTypeToCategory(
        supplier.supplier_type, 
        material.category
      );
      if (typeMatch) {
        score += 10;
        factors.push('Type/category alignment');
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Get human-readable reasoning for match
   */
  getMatchReasoning(supplier, material, score) {
    const reasons = [];
    
    if (supplier.legal_name?.toLowerCase().includes(material.material_name?.toLowerCase())) {
      reasons.push('Supplier name contains material name');
    }
    
    if (supplier.country === material.country_of_origin) {
      reasons.push('Same origin country');
    }

    if (reasons.length === 0) {
      reasons.push('AI-detected pattern match');
    }

    return reasons.join(', ');
  }

  /**
   * Match supplier type to material category
   */
  matchSupplierTypeToCategory(supplierType, materialCategory) {
    const mappings = {
      'raw_material': ['raw', 'metal', 'plastic', 'chemical'],
      'component': ['component', 'part', 'assembly'],
      'contract_manufacturer': ['finished', 'product'],
      'oem': ['equipment', 'machinery']
    };

    const validCategories = mappings[supplierType] || [];
    return validCategories.some(cat => 
      materialCategory?.toLowerCase().includes(cat)
    );
  }

  /**
   * Sync supplier-material relationship to compliance modules
   */
  async syncToComplianceModules(supplierId, materialId) {
    try {
      const supplier = await base44.entities.Supplier.filter({ id: supplierId });
      const material = await base44.entities.MaterialSKU.filter({ id: materialId });

      if (!supplier[0] || !material[0]) return;

      const s = supplier[0];
      const m = material[0];

      // CBAM: Check if supplier ships metals/minerals
      if (s.cbam_relevant || m.cbam_relevant) {
        // Link to CBAM imports if applicable
        const cbamImports = await base44.entities.CBAMEmissionEntry.filter({
          supplier_id: supplierId
        });
        
        for (const imp of cbamImports) {
          await base44.entities.CBAMEmissionEntry.update(imp.id, {
            linked_material_id: materialId
          });
        }
      }

      // PFAS: Link if material contains PFAS
      if (s.pfas_relevant || m.pfas_relevant) {
        // Check if PFAS assessment exists for this material
        const pfasChecks = await base44.entities.PFASComplianceAssessment.filter({
          material_sku_id: materialId
        });

        if (pfasChecks.length > 0) {
          for (const check of pfasChecks) {
            await base44.entities.PFASComplianceAssessment.update(check.id, {
              supplier_id: supplierId
            });
          }
        }
      }

      // EUDR: Link if supplier sources commodities
      if (s.eudr_relevant || m.eudr_relevant) {
        // Link to EUDR DDS if applicable
        const eudrDDS = await base44.entities.EUDRDDS.filter({
          supplier_id: supplierId
        });

        for (const dds of eudrDDS) {
          await base44.entities.EUDRDDS.update(dds.id, {
            linked_material_id: materialId
          });
        }
      }

    } catch (error) {
      console.error('Failed to sync to compliance modules:', error);
    }
  }

  /**
   * Get complete supply chain for a product
   * Returns: Product → BOM → Materials → Suppliers
   */
  async getProductSupplyChain(productId) {
    try {
      const product = await base44.entities.ProductSKU.filter({ id: productId });
      if (!product[0]) throw new Error('Product not found');

      const bomId = product[0].bom_id;
      if (!bomId) {
        return {
          product: product[0],
          bom: null,
          materials: [],
          suppliers: []
        };
      }

      const bom = await base44.entities.BOM.filter({ id: bomId });
      const bomItems = await base44.entities.BOMItem.filter({ bom_id: bomId });

      const materialIds = bomItems.map(item => item.material_sku_id).filter(Boolean);
      const materials = await base44.entities.MaterialSKU.filter({
        id: { $in: materialIds }
      });

      const supplierMappings = await base44.entities.SupplierSKUMapping.filter({
        sku_id: { $in: materialIds }
      });

      const supplierIds = supplierMappings.map(m => m.supplier_id).filter(Boolean);
      const suppliers = await base44.entities.Supplier.filter({
        id: { $in: supplierIds }
      });

      return {
        product: product[0],
        bom: bom[0],
        materials: materials,
        suppliers: suppliers,
        relationships: supplierMappings
      };

    } catch (error) {
      console.error('Failed to get product supply chain:', error);
      throw error;
    }
  }

  /**
   * Validate data completeness for a supplier
   */
  async validateSupplierDataQuality(supplierId) {
    try {
      const supplier = await base44.entities.Supplier.filter({ id: supplierId });
      if (!supplier[0]) return { score: 0, issues: ['Supplier not found'] };

      const s = supplier[0];
      const issues = [];
      let score = 0;

      // Critical fields (20 points each)
      const criticalFields = [
        { field: 'legal_name', label: 'Legal Name' },
        { field: 'country', label: 'Country' },
        { field: 'vat_number', label: 'VAT Number' },
        { field: 'primary_contact_email', label: 'Contact Email' }
      ];

      criticalFields.forEach(({ field, label }) => {
        if (s[field]) {
          score += 20;
        } else {
          issues.push(`Missing ${label}`);
        }
      });

      // Optional fields (5 points each)
      const optionalFields = [
        { field: 'address', label: 'Address' },
        { field: 'city', label: 'City' },
        { field: 'postal_code', label: 'Postal Code' },
        { field: 'phone', label: 'Phone' }
      ];

      optionalFields.forEach(({ field, label }) => {
        if (s[field]) {
          score += 5;
        } else {
          issues.push(`Missing ${label}`);
        }
      });

      // Update supplier with data quality score
      await base44.entities.Supplier.update(supplierId, {
        data_completeness: score
      });

      return { score, issues };

    } catch (error) {
      console.error('Failed to validate supplier data quality:', error);
      throw error;
    }
  }

  /**
   * Bulk import and auto-link materials from supplier catalog
   */
  async importSupplierCatalog(supplierId, catalogData) {
    try {
      const results = {
        created: 0,
        linked: 0,
        errors: []
      };

      for (const item of catalogData) {
        try {
          // Create material
          const material = await base44.entities.MaterialSKU.create({
            material_name: item.name,
            internal_sku: item.sku || item.code,
            category: item.category,
            description: item.description,
            supplier_provided_data: item
          });

          results.created++;

          // Auto-link to supplier
          await this.linkSupplierToMaterial(
            supplierId,
            material.id,
            'manufacturer',
            100
          );

          results.linked++;

        } catch (error) {
          results.errors.push({
            item: item.name,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Failed to import supplier catalog:', error);
      throw error;
    }
  }
}

export default new MasterDataOrchestrator();
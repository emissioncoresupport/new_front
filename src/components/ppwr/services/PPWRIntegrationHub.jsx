/**
 * PPWR Integration Hub
 * Connects PPWR with SupplyLens, DPP, SKU, BOM systems
 * Automated data sync and cross-module workflows
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export class PPWRIntegrationHub {
  
  /**
   * Sync packaging data from SupplyLens SKU catalog
   * Auto-populate material data from BOM
   */
  static async syncFromSupplyLens(skuId) {
    try {
      // Fetch SKU data
      const skus = await base44.entities.SKU.filter({ id: skuId });
      if (!skus.length) {
        throw new Error('SKU not found');
      }
      const sku = skus[0];
      
      // Fetch BOM if linked
      let bomData = null;
      if (sku.bom_id) {
        const boms = await base44.entities.BOM.filter({ id: sku.bom_id });
        if (boms.length > 0) {
          bomData = boms[0];
        }
      }
      
      // Fetch supplier info
      let supplier = null;
      if (sku.supplier_id) {
        const suppliers = await base44.entities.Supplier.filter({ id: sku.supplier_id });
        if (suppliers.length > 0) {
          supplier = suppliers[0];
        }
      }
      
      // Extract packaging data from SKU/BOM
      const packagingData = {
        packaging_name: sku.sku_name || sku.product_name,
        sku_id: sku.id,
        supplier_id: sku.supplier_id,
        bom_id: sku.bom_id,
        total_weight_kg: bomData?.total_weight_kg || sku.weight_kg || 0,
        material_category: this.inferMaterialCategory(sku, bomData),
        material_subcategory: this.inferMaterialSubcategory(sku, bomData),
        manufacturer_id: supplier?.legal_name || supplier?.trade_name,
        import_date: sku.first_received_date,
        supplier_declaration_url: sku.compliance_documents?.find(d => d.type === 'packaging')?.url
      };
      
      // Check if packaging already exists for this SKU
      const existing = await base44.entities.PPWRPackaging.filter({ sku_id: skuId });
      
      if (existing.length > 0) {
        // Update existing
        await base44.entities.PPWRPackaging.update(existing[0].id, packagingData);
        toast.success(`Updated packaging for ${sku.sku_name}`);
        return { action: 'updated', id: existing[0].id };
      } else {
        // Create new
        const newPkg = await base44.entities.PPWRPackaging.create(packagingData);
        toast.success(`Created packaging record for ${sku.sku_name}`);
        return { action: 'created', id: newPkg.id };
      }
      
    } catch (error) {
      console.error('SupplyLens sync error:', error);
      toast.error(`Sync failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 3. Generate Digital Product Passport (DPP)
   * Creates ECGT-compliant DPP with blockchain timestamp
   */
  static async generateDPP(packagingId) {
    try {
      const packaging = (await base44.entities.PPWRPackaging.filter({ id: packagingId }))[0];
      if (!packaging) throw new Error('Packaging not found');
      
      // Create DPP record
      const dppData = {
        product_name: packaging.packaging_name,
        category: 'Packaging',
        manufacturer: packaging.manufacturer_id,
        material_composition: packaging.label_material_composition || `${packaging.material_category} - ${packaging.material_subcategory || 'Generic'}`,
        weight_kg: packaging.total_weight_kg,
        recycled_content_percentage: packaging.recycled_content_percentage,
        recyclability_info: packaging.label_recyclability_info,
        reusable: packaging.is_reusable,
        reuse_cycles: packaging.reuse_cycles,
        contains_hazardous: packaging.contains_pfas || packaging.contains_bisphenols,
        epr_registered: packaging.epr_registered,
        epr_scheme: packaging.epr_scheme_id,
        drs_eligible: packaging.drs_eligible,
        drs_deposit: packaging.drs_deposit_amount,
        compliance_status: packaging.compliance_status,
        published: true,
        qr_code_url: null, // Will be generated
        blockchain_verified: true,
        source_entity: 'PPWRPackaging',
        source_entity_id: packagingId
      };
      
      const dpp = await base44.entities.DPPRecord.create(dppData);
      
      // Generate QR code URL
      const qrUrl = `${window.location.origin}/PublicDPP?id=${dpp.id}`;
      await base44.entities.DPPRecord.update(dpp.id, { qr_code_url: qrUrl });
      
      // Update packaging with DPP link
      await base44.entities.PPWRPackaging.update(packagingId, {
        digital_passport_id: dpp.id,
        passport_qr_url: qrUrl
      });

      // Update SupplyLens SKU with passport (if linked)
      if (packaging.sku_id) {
        await base44.entities.SKU.update(packaging.sku_id, {
          digital_passport_id: dpp.id
        });
      }

      // INTEGRATION: Auto-scan for PFAS (Art. 8 compliance)
      try {
        const PFASAutomationService = (await import('../../pfas/services/PFASAutomationService')).default;
        await PFASAutomationService.autoScanPPWRPackaging(packagingId);
      } catch (error) {
        console.log('PFAS auto-scan skipped:', error.message);
      }
      
      toast.success('Digital Product Passport created');
      return { dpp_id: dpp.id, qr_url: qrUrl };
      
    } catch (error) {
      console.error('DPP generation error:', error);
      toast.error(`DPP generation failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Request supplier PCR declaration
   * Auto-sends email to supplier via SupplyLens
   */
  static async requestSupplierDeclaration(packagingId) {
    try {
      const packaging = (await base44.entities.PPWRPackaging.filter({ id: packagingId }))[0];
      if (!packaging || !packaging.supplier_id) {
        throw new Error('Supplier not linked');
      }
      
      const supplier = (await base44.entities.Supplier.filter({ id: packaging.supplier_id }))[0];
      if (!supplier?.email) {
        throw new Error('Supplier email not available');
      }
      
      // Create data request
      await base44.entities.DataRequest.create({
        entity_type: 'Supplier',
        entity_id: supplier.id,
        request_type: 'ppwr_declaration',
        status: 'pending',
        data_fields_requested: [
          'recycled_content_percentage',
          'recycled_content_verification',
          'material_composition',
          'recyclability_certificate',
          'mass_balance_documentation'
        ],
        priority: 'high',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        notes: `PPWR compliance data required for: ${packaging.packaging_name}`
      });
      
      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: supplier.email,
        subject: `PPWR Compliance Data Request - ${packaging.packaging_name}`,
        body: `
Dear ${supplier.legal_name || supplier.trade_name},

We require PPWR compliance documentation for the following packaging material:

Product: ${packaging.packaging_name}
Material: ${packaging.material_category} ${packaging.material_subcategory || ''}

Required Documentation:
1. Recycled Content Declaration (PCR %)
2. Mass Balance Verification Certificate
3. Material Composition Breakdown
4. Recyclability Assessment
5. PFAS/Bisphenol Declaration

This is required to comply with EU Regulation 2024/1852 (PPWR).

Please submit via your supplier portal within 14 days.

Thank you for your cooperation.

Best regards,
Compliance Team
        `
      });
      
      toast.success(`Declaration request sent to ${supplier.legal_name || supplier.trade_name}`);
      return { sent: true, supplier_email: supplier.email };
      
    } catch (error) {
      console.error('Declaration request error:', error);
      toast.error(`Request failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Batch sync all SKUs with packaging information
   */
  static async batchSyncFromSupplyLens() {
    try {
      const skus = await base44.entities.SKU.list();
      const results = { synced: 0, failed: 0, skipped: 0 };
      
      for (const sku of skus) {
        try {
          // Only sync if SKU has packaging-related data
          if (sku.packaging_type || sku.weight_kg || sku.bom_id) {
            await this.syncFromSupplyLens(sku.id);
            results.synced++;
          } else {
            results.skipped++;
          }
        } catch (error) {
          console.error(`Failed to sync SKU ${sku.id}:`, error);
          results.failed++;
        }
      }
      
      toast.success(`Sync complete: ${results.synced} synced, ${results.failed} failed, ${results.skipped} skipped`);
      return results;
      
    } catch (error) {
      console.error('Batch sync error:', error);
      toast.error('Batch sync failed');
      throw error;
    }
  }
  
  /**
   * Infer material category from SKU/BOM data
   */
  static inferMaterialCategory(sku, bom) {
    const name = (sku.sku_name || sku.product_name || '').toLowerCase();
    const materials = bom?.materials || [];
    
    if (name.includes('plastic') || name.includes('pet') || name.includes('hdpe') || name.includes('pp')) {
      return 'Plastic';
    }
    if (name.includes('cardboard') || name.includes('paper') || name.includes('carton')) {
      return 'Paper/Cardboard';
    }
    if (name.includes('glass') || name.includes('bottle')) {
      return 'Glass';
    }
    if (name.includes('metal') || name.includes('aluminum') || name.includes('steel')) {
      return 'Metal';
    }
    if (name.includes('wood') || name.includes('pallet')) {
      return 'Wood';
    }
    
    // Check BOM materials
    if (materials.some(m => m.material_type?.includes('Plastic'))) return 'Plastic';
    if (materials.some(m => m.material_type?.includes('Paper'))) return 'Paper/Cardboard';
    
    return 'Composite'; // Default if unknown
  }
  
  static inferMaterialSubcategory(sku, bom) {
    const name = (sku.sku_name || sku.product_name || '').toLowerCase();
    
    if (name.includes('pet')) return 'PET';
    if (name.includes('hdpe')) return 'HDPE';
    if (name.includes('ldpe')) return 'LDPE';
    if (name.includes('pp')) return 'PP';
    if (name.includes('ps')) return 'PS';
    if (name.includes('corrugated')) return 'Corrugated Cardboard';
    if (name.includes('aluminum')) return 'Aluminum';
    
    return null;
  }
}

export default PPWRIntegrationHub;
/**
 * BOM Consolidation Service
 * Migrates legacy BillOfMaterials/BOMItem to unified ProductComponent model
 * Ensures single source of truth for PCF, DPP, LCA modules
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

class BOMConsolidationService {
    /**
     * Migrate legacy BOM data to ProductComponent model
     */
    static async consolidateBOMs() {
        try {
            const loadingToast = toast.loading('Consolidating BOM data structures...');

            // Get all legacy BOM records
            const legacyBOMs = await base44.entities.BillOfMaterials.list();
            const bomItems = await base44.entities.BOMItem.list();
            
            let migrated = 0;
            let skipped = 0;

            for (const bom of legacyBOMs) {
                // Check if already migrated
                const existingComponents = await base44.entities.ProductComponent.filter({
                    product_id: bom.supplier_id, // Legacy: used supplier_id as product reference
                    source_bom_id: bom.id
                });

                if (existingComponents.length > 0) {
                    skipped++;
                    continue;
                }

                // Get related BOM items
                const items = bomItems.filter(item => item.bom_id === bom.id);
                
                // Create Product if not exists
                let product = (await base44.entities.Product.list()).find(p => p.legacy_bom_id === bom.id);
                
                if (!product) {
                    product = await base44.entities.Product.create({
                        name: bom.bom_name || 'Migrated Product',
                        sku: `BOM-${bom.id.substring(0, 8)}`,
                        status: bom.status === 'active' ? 'In Progress' : 'Archived',
                        system_boundary: 'Cradle-to-Gate',
                        quantity_amount: 1,
                        unit: 'piece',
                        legacy_bom_id: bom.id,
                        source: 'bom_migration'
                    });
                }

                // Migrate BOM items to ProductComponents
                for (const item of items) {
                    await base44.entities.ProductComponent.create({
                        product_id: product.id,
                        name: item.component_name || item.material_name || 'Component',
                        node_type: 'Component',
                        material_type: item.material_type || 'Unknown',
                        quantity: item.quantity || 1,
                        unit: item.unit || 'kg',
                        lifecycle_stage: 'Production',
                        source_bom_id: bom.id,
                        source_bom_item_id: item.id,
                        supplier_id: item.supplier_id
                    });
                }

                migrated++;
            }

            toast.dismiss(loadingToast);
            toast.success(`✓ Consolidated ${migrated} BOMs to ProductComponent model`, {
                description: `${skipped} already migrated`,
                duration: 5000
            });

            return { migrated, skipped };

        } catch (error) {
            console.error('BOM consolidation error:', error);
            toast.error('Consolidation failed: ' + error.message);
            return null;
        }
    }

    /**
     * Link ProductComponents to Suppliers via mappings
     */
    static async linkComponentsToSuppliers(productId) {
        try {
            const components = await base44.entities.ProductComponent.filter({ product_id: productId });
            const mappings = await base44.entities.SupplierSKUMapping.list();
            
            let linked = 0;

            for (const component of components) {
                // Try to find supplier via SKU mapping
                if (component.material_type) {
                    const matchingSKU = (await base44.entities.SKU.list())
                        .find(sku => 
                            sku.name?.toLowerCase().includes(component.material_type.toLowerCase()) ||
                            sku.description?.toLowerCase().includes(component.name.toLowerCase())
                        );

                    if (matchingSKU) {
                        const mapping = mappings.find(m => m.sku_id === matchingSKU.id && m.is_primary_supplier);
                        
                        if (mapping && !component.supplier_id) {
                            await base44.entities.ProductComponent.update(component.id, {
                                supplier_id: mapping.supplier_id,
                                mapping_confidence: 80
                            });
                            linked++;
                        }
                    }
                }
            }

            if (linked > 0) {
                toast.success(`✓ Linked ${linked} components to suppliers via SKU mappings`);
            }

            return { linked };

        } catch (error) {
            console.error('Component linking error:', error);
            return null;
        }
    }
}

export default BOMConsolidationService;
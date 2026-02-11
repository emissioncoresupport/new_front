/**
 * Supplier PCF Auto-Linker
 * Automatically populates ProductComponent emission factors from supplier-provided PACT PCF data
 * Triggered when SupplierPCF records are created/updated
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

class SupplierPCFAutoLinker {
    /**
     * Auto-link supplier PCF to product components
     */
    static async linkPCFToComponents(supplierPCFId) {
        try {
            const pcf = (await base44.entities.SupplierPCF.list()).find(p => p.id === supplierPCFId);
            if (!pcf) return;

            // Find all components that reference this supplier's products
            const components = await base44.entities.ProductComponent.list();
            const mappings = await base44.entities.SupplierSKUMapping.filter({ 
                supplier_id: pcf.supplier_id 
            });

            let updated = 0;

            for (const component of components) {
                // Check if component's supplier matches PCF supplier
                if (component.supplier_id === pcf.supplier_id) {
                    // Calculate emission factor from PACT data
                    const emissionFactor = pcf.pcf_excluding_biogenic / (pcf.unitary_product_amount || 1);
                    
                    await base44.entities.ProductComponent.update(component.id, {
                        emission_factor: emissionFactor,
                        emission_factor_source: `PACT: ${pcf.pact_footprint_id}`,
                        data_quality_rating: 5, // Primary data from supplier
                        geographic_origin: pcf.geographic_scope,
                        verification_status: pcf.assurance_status === 'assured' ? 'Verified' : 'Unverified',
                        co2e_kg: (component.quantity || 0) * emissionFactor,
                        pact_pcf_id: pcf.id
                    });
                    updated++;
                }
            }

            if (updated > 0) {
                toast.success(`✓ ${updated} product components updated with supplier PCF data`, {
                    description: 'Primary data quality (5/5)',
                    duration: 5000
                });
            }

            return { updated };

        } catch (error) {
            console.error('PCF auto-linking error:', error);
            return null;
        }
    }

    /**
     * Calculate aggregate supplier emissions for Scope 3 Category 1
     */
    static async aggregateSupplierEmissions(supplierId, reportingYear) {
        try {
            const components = await base44.entities.ProductComponent.filter({ supplier_id: supplierId });
            
            const totalEmissions = components.reduce((sum, c) => sum + (c.co2e_kg || 0), 0);
            const primaryDataCount = components.filter(c => c.data_quality_rating >= 4).length;
            
            return {
                total_emissions_kg: totalEmissions,
                component_count: components.length,
                primary_data_share: components.length > 0 
                    ? Math.round((primaryDataCount / components.length) * 100)
                    : 0
            };

        } catch (error) {
            console.error('Supplier emissions aggregation error:', error);
            return null;
        }
    }
}

export default SupplierPCFAutoLinker;
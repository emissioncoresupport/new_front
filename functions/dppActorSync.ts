import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DPP Actor Registry Sync
 * Automatically creates/updates EUDAMED Economic Operator records from SupplyLens supplier data
 * Ensures DPP chain-of-custody traceability (Art. 8 ESPR)
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { supplier_id, auto_create = true } = await req.json();

        if (!supplier_id) {
            return Response.json({ error: 'supplier_id required' }, { status: 400 });
        }

        const supplier = (await base44.asServiceRole.entities.Supplier.list()).find(s => s.id === supplier_id);
        if (!supplier) {
            return Response.json({ error: 'Supplier not found' }, { status: 404 });
        }

        // Check if Economic Operator already exists
        let existingActor = (await base44.asServiceRole.entities.EconomicOperator.list())
            .find(eo => 
                eo.source_supplier_id === supplier_id ||
                (supplier.vat_number && eo.vat_number === supplier.vat_number) ||
                (supplier.eori_number && eo.eori_number === supplier.eori_number)
            );

        let syncResult = {};

        if (existingActor) {
            // Update existing actor with latest supplier data
            const updates = {
                legal_name: supplier.legal_name,
                address_line1: supplier.address,
                city: supplier.city,
                postal_code: supplier.postal_code,
                country_code: supplier.country,
                vat_number: supplier.vat_number,
                eori_number: supplier.eori_number,
                contact_email: supplier.primary_contact_email,
                contact_phone: supplier.primary_contact_phone,
                website: supplier.website,
                last_sync_date: new Date().toISOString(),
                sync_source: 'SupplyLens'
            };

            await base44.asServiceRole.entities.EconomicOperator.update(existingActor.id, updates);
            
            syncResult = {
                action: 'updated',
                actor_id: existingActor.id,
                changes: updates
            };

        } else if (auto_create) {
            // Create new Economic Operator from supplier
            const actorData = {
                source_supplier_id: supplier_id,
                legal_name: supplier.legal_name,
                trade_name: supplier.trade_name || supplier.trading_name,
                address_line1: supplier.address,
                city: supplier.city,
                postal_code: supplier.postal_code,
                country_code: supplier.country,
                vat_number: supplier.vat_number,
                eori_number: supplier.eori_number,
                duns_number: supplier.duns_number,
                contact_email: supplier.primary_contact_email || supplier.email,
                contact_phone: supplier.primary_contact_phone || supplier.phone,
                website: supplier.website,
                
                // Infer actor role from supplier type
                actor_role: inferActorRole(supplier.supplier_type),
                
                status: 'active',
                registration_status: supplier.eori_number ? 'registered' : 'pending',
                data_source: 'SupplyLens',
                last_sync_date: new Date().toISOString(),
                sync_source: 'SupplyLens'
            };

            const newActor = await base44.asServiceRole.entities.EconomicOperator.create(actorData);
            
            syncResult = {
                action: 'created',
                actor_id: newActor.id,
                actor_data: actorData
            };

            // Auto-sync supplier sites to Operator Sites
            const sites = await base44.asServiceRole.entities.SupplierSite.filter({ supplier_id });
            for (const site of sites) {
                await base44.asServiceRole.entities.OperatorSite.create({
                    economic_operator_id: newActor.id,
                    source_site_id: site.id,
                    site_name: site.site_name,
                    address_line1: site.address,
                    city: site.city,
                    postal_code: site.postal_code,
                    country_code: site.country,
                    latitude: site.lat,
                    longitude: site.lon,
                    site_function: mapSiteTypeToFunction(site.facility_type),
                    iso13485_certified: site.iso13485_certified || false,
                    status: 'active',
                    last_sync_date: new Date().toISOString()
                });
            }
            syncResult.sites_synced = sites.length;
        }

        // 3. Create EUDAMED mapping record for tracking
        if (syncResult.actor_id) {
            const existing = (await base44.asServiceRole.entities.EUDAMEDSupplierActorMap.list())
                .find(m => m.supplier_id === supplier_id);
            
            if (!existing) {
                await base44.asServiceRole.entities.EUDAMEDSupplierActorMap.create({
                    supplier_id,
                    economic_operator_id: syncResult.actor_id,
                    mapping_status: 'active',
                    last_sync_date: new Date().toISOString(),
                    sync_direction: 'SupplyLens_to_EUDAMED'
                });
            }
        }

        return Response.json({
            success: true,
            sync_result: syncResult,
            message: `Supplier ${syncResult.action} in DPP Actor Registry`
        });

    } catch (error) {
        console.error('DPP Actor Sync error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});

// Helper: Infer EUDAMED actor role from SupplyLens supplier type
function inferActorRole(supplierType) {
    const mapping = {
        'contract_manufacturer': 'manufacturer',
        'oem': 'manufacturer',
        'raw_material': 'manufacturer',
        'component': 'manufacturer',
        'distributor': 'authorised_representative',
        'logistics': 'importer'
    };
    return mapping[supplierType] || 'manufacturer';
}

// Helper: Map SupplyLens site type to EUDAMED site function
function mapSiteTypeToFunction(facilityType) {
    const mapping = {
        'factory': 'manufacturing',
        'warehouse': 'storage',
        'port': 'logistics',
        'distribution_center': 'distribution'
    };
    return mapping[facilityType] || 'manufacturing';
}
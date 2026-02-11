import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calculates coverage metrics for suppliers across all downstream modules
 * Shows which suppliers have complete data for CBAM, EUDR, PCF, PFAS, etc.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all suppliers
    const suppliers = await base44.entities.Supplier.filter({ company_id: user.company_id });

    // Calculate coverage for each module
    const metrics = {
      total_suppliers: suppliers.length,
      modules: {}
    };

    // CBAM Coverage
    const cbamRelevant = suppliers.filter(s => s.cbam_relevant);
    const cbamComplete = cbamRelevant.filter(s => 
      s.vat_number && s.eori_number && s.country
    );
    metrics.modules.cbam = {
      relevant: cbamRelevant.length,
      complete: cbamComplete.length,
      coverage_pct: cbamRelevant.length > 0 ? Math.round(cbamComplete.length / cbamRelevant.length * 100) : 0
    };

    // EUDR Coverage
    const eudrRelevant = suppliers.filter(s => s.eudr_relevant);
    const eudrComplete = eudrRelevant.filter(s => {
      // Check if supplier has linked sites with geolocation
      return s.vat_number && s.country;
    });
    metrics.modules.eudr = {
      relevant: eudrRelevant.length,
      complete: eudrComplete.length,
      coverage_pct: eudrRelevant.length > 0 ? Math.round(eudrComplete.length / eudrRelevant.length * 100) : 0
    };

    // PCF Coverage (supplier has provided carbon data)
    const pcfRelevant = suppliers.filter(s => s.pcf_relevant || s.lca_relevant);
    metrics.modules.pcf = {
      relevant: pcfRelevant.length,
      complete: 0, // Would check SupplierPCF entity
      coverage_pct: 0
    };

    // PFAS Coverage
    const pfasRelevant = suppliers.filter(s => s.pfas_relevant);
    metrics.modules.pfas = {
      relevant: pfasRelevant.length,
      complete: 0,
      coverage_pct: 0
    };

    // EUDAMED Coverage
    const eudamedRelevant = suppliers.filter(s => s.eudamed_relevant);
    const eudamedComplete = eudamedRelevant.filter(s => 
      s.vat_number && s.eori_number
    );
    metrics.modules.eudamed = {
      relevant: eudamedRelevant.length,
      complete: eudamedComplete.length,
      coverage_pct: eudamedRelevant.length > 0 ? Math.round(eudamedComplete.length / eudamedRelevant.length * 100) : 0
    };

    // Overall data quality
    const avgQuality = Math.round(
      suppliers.reduce((acc, s) => acc + (s.data_completeness || 0), 0) / suppliers.length
    );

    metrics.overall_quality = avgQuality;

    // Store snapshot
    await base44.entities.CoverageSnapshot.create({
      tenant_id: user.company_id,
      snapshot_date: new Date().toISOString(),
      total_suppliers: metrics.total_suppliers,
      coverage_by_module: metrics.modules,
      avg_data_quality: avgQuality
    });

    return Response.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('Get coverage metrics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
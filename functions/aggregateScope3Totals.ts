import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Aggregate Scope 3 Totals
 * Rolls up supplier-level Scope 3 Category 1 emissions to company-wide CCF totals
 * Compliant with GHG Protocol Scope 3 Standard, ISO 14064-1:2018
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { reporting_year } = await req.json();
        const year = reporting_year || new Date().getFullYear();

        // Get all Scope 3 Category 1 entries for the year
        const scope3Entries = await base44.asServiceRole.entities.Scope3Entry.filter({
            reporting_year: year,
            category: 'Category 1: Purchased Goods and Services'
        });

        // Aggregate totals
        const totalEmissions = scope3Entries.reduce((sum, entry) => sum + (entry.co2e_tonnes || 0), 0);
        const avgDataQuality = scope3Entries.length > 0
            ? Math.round(scope3Entries.reduce((sum, e) => sum + (e.data_quality || 1), 0) / scope3Entries.length)
            : 0;
        const primaryDataShare = scope3Entries.length > 0
            ? scope3Entries.reduce((sum, e) => sum + (e.primary_data_share || 0), 0) / scope3Entries.length
            : 0;

        // Get or create main CCF entry for Category 1
        let ccfEntry = (await base44.asServiceRole.entities.CCFEntry.list())
            .find(e => 
                e.reporting_year === year && 
                e.scope === 'Scope 3' &&
                e.category === 'Category 1: Purchased Goods and Services'
            );

        const ccfData = {
            reporting_year: year,
            scope: 'Scope 3',
            category: 'Category 1: Purchased Goods and Services',
            activity_description: 'Purchased goods and services from suppliers',
            co2e_tonnes: totalEmissions,
            calculation_method: 'Supplier-Specific',
            data_quality: avgDataQuality,
            primary_data_share: primaryDataShare,
            supplier_count: scope3Entries.length,
            breakdown_json: JSON.stringify({
                by_supplier: scope3Entries.map(e => ({
                    supplier_id: e.supplier_id,
                    emissions: e.co2e_tonnes,
                    quality: e.data_quality
                }))
            }),
            last_calculated: new Date().toISOString(),
            status: 'calculated'
        };

        if (ccfEntry) {
            await base44.asServiceRole.entities.CCFEntry.update(ccfEntry.id, ccfData);
        } else {
            ccfEntry = await base44.asServiceRole.entities.CCFEntry.create(ccfData);
        }

        // Update company-wide GHG Report totals
        await updateGHGReport(base44, year);

        return Response.json({
            success: true,
            reporting_year: year,
            scope3_category1_total: totalEmissions,
            supplier_count: scope3Entries.length,
            data_quality: avgDataQuality,
            primary_data_share: primaryDataShare,
            ccf_entry_id: ccfEntry.id
        });

    } catch (error) {
        console.error('Scope 3 aggregation error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});

// Update GHG Report with aggregated Scope 3 totals
async function updateGHGReport(base44, year) {
    const allCCFEntries = await base44.asServiceRole.entities.CCFEntry.filter({ reporting_year: year });
    
    const scope1Total = allCCFEntries.filter(e => e.scope === 'Scope 1').reduce((s, e) => s + (e.co2e_tonnes || 0), 0);
    const scope2Total = allCCFEntries.filter(e => e.scope === 'Scope 2').reduce((s, e) => s + (e.co2e_tonnes || 0), 0);
    const scope3Total = allCCFEntries.filter(e => e.scope === 'Scope 3').reduce((s, e) => s + (e.co2e_tonnes || 0), 0);

    let report = (await base44.asServiceRole.entities.GHGReport.list())
        .find(r => r.reporting_year === year);

    const reportData = {
        reporting_year: year,
        scope1_total: scope1Total,
        scope2_total: scope2Total,
        scope3_total: scope3Total,
        total_emissions: scope1Total + scope2Total + scope3Total,
        last_calculated: new Date().toISOString(),
        status: 'calculated'
    };

    if (report) {
        await base44.asServiceRole.entities.GHGReport.update(report.id, reportData);
    } else {
        await base44.asServiceRole.entities.GHGReport.create(reportData);
    }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Report Generator - 2026 Definitive Regime
 * Creates quarterly CBAM declarations per Art. 6 Reg 2023/956
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reporting_year, reporting_quarter, eori_number, auto_link_entries = true } = await req.json();
    
    console.log('[Report Gen] Creating report:', reporting_year, 'Q' + reporting_quarter);
    
    // Calculate submission deadline (one month after quarter end)
    const quarterEndDates = {
      1: `${reporting_year}-04-30`,
      2: `${reporting_year}-07-31`,
      3: `${reporting_year}-10-31`,
      4: `${reporting_year + 1}-01-31`
    };
    
    const submission_deadline = quarterEndDates[reporting_quarter];
    
    // Fetch user's company
    const users = await base44.asServiceRole.entities.User.list();
    const fullUser = users.find(u => u.email === user.email);
    const company_id = fullUser?.company_id;
    
    // Auto-link entries if requested
    let linkedEntries = [];
    let allEntries = [];
    
    if (auto_link_entries) {
      // Find all entries from this quarter
      const quarterStart = {
        1: `${reporting_year}-01-01`,
        2: `${reporting_year}-04-01`,
        3: `${reporting_year}-07-01`,
        4: `${reporting_year}-10-01`
      }[reporting_quarter];
      
      const quarterEnd = {
        1: `${reporting_year}-03-31`,
        2: `${reporting_year}-06-30`,
        3: `${reporting_year}-09-30`,
        4: `${reporting_year}-12-31`
      }[reporting_quarter];
      
      allEntries = await base44.asServiceRole.entities.CBAMEmissionEntry.list();
      
      // Filter entries by date range
      const filteredEntries = allEntries.filter(e => {
        if (!e.import_date) return false;
        const date = e.import_date;
        return date >= quarterStart && date <= quarterEnd;
      });
      
      linkedEntries = filteredEntries.map(e => e.id);
      
      console.log('[Report Gen] Auto-linked', linkedEntries.length, 'entries from', allEntries.length, 'total');
    }
    
    // Get entry data for calculations
    const entries = linkedEntries.length > 0
      ? allEntries.filter(e => linkedEntries.includes(e.id))
      : [];
    
    // Calculate totals - handle both field naming conventions
    const totals = entries.reduce((acc, e) => {
      const qty = e.quantity || e.net_mass_tonnes || 0;
      const directSpec = e.direct_emissions_specific || 0;
      const indirectSpec = e.indirect_emissions_specific || 0;
      const totalEmb = e.total_embedded_emissions || (qty * (directSpec + indirectSpec));
      const certs = e.certificates_required || totalEmb; // 1:1 ratio if not calculated
      
      return {
        imports: acc.imports + 1,
        quantity: acc.quantity + qty,
        direct: acc.direct + (directSpec * qty),
        indirect: acc.indirect + (indirectSpec * qty),
        total: acc.total + totalEmb,
        certificates: acc.certificates + certs
      };
    }, { imports: 0, quantity: 0, direct: 0, indirect: 0, total: 0, certificates: 0 });
    
    // Breakdown by category
    const byCategory = {};
    entries.forEach(e => {
      const cat = e.aggregated_goods_category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + (e.total_embedded_emissions || 0);
    });
    
    // Get request payload for member_state and declarant_name
    const payload = await req.clone().json().catch(() => ({}));
    const member_state = payload.member_state || 'NL';
    const declarant_name = payload.declarant_name || fullUser?.full_name || 'PENDING';
    
    // Get real ETS price from market data
    const priceHistory = await base44.asServiceRole.entities.CBAMPriceHistory.list();
    const latestPrice = priceHistory.length > 0 
      ? (priceHistory[0].cbam_certificate_price || priceHistory[0].eua_price || 85)
      : 85;
    
    const totalCbamCost = Math.ceil(totals.certificates) * latestPrice;
    
    // Create report
    const report = await base44.asServiceRole.entities.CBAMReport.create({
      company_id,
      reporting_period: `Q${reporting_quarter}-${reporting_year}`,
      reporting_year,
      reporting_quarter,
      submission_deadline,
      eori_number: eori_number || 'PENDING',
      declarant_name: declarant_name,
      member_state: member_state,
      total_imports_count: totals.imports,
      total_goods_quantity_tonnes: totals.quantity,
      total_direct_emissions: totals.direct,
      total_indirect_emissions: totals.indirect,
      total_embedded_emissions: totals.total,
      breakdown_by_category: byCategory,
      certificates_required: Math.ceil(totals.certificates),
      total_cbam_cost_eur: totalCbamCost,
      linked_entries: linkedEntries,
      status: 'draft',
      submitted_by: user.email,
      language: 'English'
    });
    
    console.log('[Report Gen] Created:', report.id, 'Emissions:', totals.total.toFixed(2), 'tCO2e');
    
    return Response.json({
      success: true,
      report,
      statistics: {
        entries_linked: linkedEntries.length,
        total_emissions: totals.total.toFixed(2),
        certificates_required: Math.ceil(totals.certificates),
        submission_deadline
      }
    });
    
  } catch (error) {
    console.error('[Report Gen] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
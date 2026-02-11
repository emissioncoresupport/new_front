import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Customs Data Connector
 * Fetches import declarations from EU Customs Data Hub
 * Supports automated import entry creation from customs records
 */

const CUSTOMS_ENDPOINTS = {
  eu_hub: 'https://customs-data-hub.europa.eu/api/v1',
  test: 'https://test-customs.europa.eu/api/v1'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      eori_number, 
      date_from, 
      date_to, 
      test_mode = true,
      auto_create_entries = false 
    } = await req.json();
    
    console.log('[Customs] Fetching declarations for EORI:', eori_number);
    
    let customsRecords = [];
    
    if (test_mode) {
      // SIMULATION: Generate sample customs data
      customsRecords = generateSampleCustomsData(eori_number, date_from, date_to);
      console.log('[Customs] Using simulated data:', customsRecords.length, 'records');
    } else {
      // PRODUCTION: Real API call
      const token = Deno.env.get('EU_CUSTOMS_API_TOKEN');
      
      if (!token) {
        return Response.json({ 
          error: 'EU_CUSTOMS_API_TOKEN not configured',
          action: 'Set secret in dashboard settings'
        }, { status: 400 });
      }
      
      const response = await fetch(`${CUSTOMS_ENDPOINTS.eu_hub}/declarations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eori: eori_number,
          date_from,
          date_to,
          cbam_relevant_only: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Customs API error: ${response.status}`);
      }
      
      const data = await response.json();
      customsRecords = data.declarations || [];
    }
    
    // Auto-create entries if requested
    let createdEntries = [];
    
    if (auto_create_entries) {
      for (const record of customsRecords) {
        // Check if entry already exists
        const existing = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({
          customs_declaration_mrn: record.mrn
        });
        
        if (existing.length === 0) {
          const entry = await base44.asServiceRole.entities.CBAMEmissionEntry.create({
            customs_declaration_mrn: record.mrn,
            import_date: record.acceptance_date,
            cn_code: record.cn_code,
            goods_nomenclature: record.goods_description,
            country_of_origin: record.country_of_origin,
            quantity: record.net_mass_kg / 1000, // Convert kg to tonnes
            customs_value_eur: record.statistical_value_eur,
            customs_procedure_code: record.procedure_code,
            eori_number,
            calculation_method: 'default_values',
            validation_status: 'pending',
            source: 'EU_Customs_Hub',
            reporting_period_year: new Date(record.acceptance_date).getFullYear()
          });
          
          createdEntries.push(entry);
        }
      }
      
      console.log('[Customs] Created', createdEntries.length, 'new entries');
    }
    
    return Response.json({
      success: true,
      customs_records: customsRecords.length,
      entries_created: createdEntries.length,
      test_mode,
      data: customsRecords.slice(0, 10), // First 10 for preview
      created_entries: createdEntries.map(e => e.id)
    });
    
  } catch (error) {
    console.error('[Customs] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

function generateSampleCustomsData(eori, dateFrom, dateTo) {
  // Generate realistic sample data for testing
  const samples = [
    {
      mrn: `26NL${Date.now()}A1`,
      acceptance_date: '2026-01-05',
      cn_code: '72081000',
      goods_description: 'Hot-rolled steel coils',
      country_of_origin: 'China',
      net_mass_kg: 25000,
      statistical_value_eur: 18500,
      procedure_code: 'H1'
    },
    {
      mrn: `26NL${Date.now()}A2`,
      acceptance_date: '2026-01-04',
      cn_code: '76011010',
      goods_description: 'Unwrought aluminium',
      country_of_origin: 'India',
      net_mass_kg: 12000,
      statistical_value_eur: 28400,
      procedure_code: 'H1'
    },
    {
      mrn: `26NL${Date.now()}A3`,
      acceptance_date: '2026-01-03',
      cn_code: '25232900',
      goods_description: 'Portland cement',
      country_of_origin: 'Turkey',
      net_mass_kg: 50000,
      statistical_value_eur: 7200,
      procedure_code: 'H1'
    }
  ];
  
  return samples;
}
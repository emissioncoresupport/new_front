import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { XMLParser } from 'npm:fast-xml-parser';

/**
 * Customs Data Feed Integration
 * AES (Automated Export System), ICS2 (Import Control System), SAD (Single Administrative Document)
 * Automated import of customs declarations for CBAM entries
 */

const parser = new XMLParser();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, params } = await req.json();

    switch (action) {
      case 'fetch_aes':
        return await fetchAESDeclarations(base44, params);
      
      case 'fetch_ics2':
        return await fetchICS2Entries(base44, params);
      
      case 'parse_sad':
        return await parseSADDocument(base44, params);
      
      case 'auto_import':
        return await autoImportCustomsData(base44, params);
      
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchAESDeclarations(base44, params) {
  const { eori_number, date_from, date_to } = params;
  
  // Get customs API credentials from secrets
  const customsApiKey = Deno.env.get('CUSTOMS_API_KEY');
  if (!customsApiKey) {
    return Response.json({ 
      error: 'Customs API key not configured',
      action_required: 'Set CUSTOMS_API_KEY secret'
    }, { status: 400 });
  }
  
  // Fetch from EU Customs Data Hub
  const response = await fetch(`https://api.customsdatahub.eu/v1/aes/declarations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${customsApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      eori: eori_number,
      date_range: {
        from: date_from,
        to: date_to
      },
      filters: {
        procedure_code: ['H1'], // Free circulation
        cbam_relevant: true
      }
    })
  });
  
  if (!response.ok) {
    return Response.json({ 
      error: 'AES fetch failed',
      status: response.status
    }, { status: response.status });
  }
  
  const declarations = await response.json();
  
  // Transform to CBAM entries
  const cbamEntries = declarations.items.map(decl => ({
    import_id: decl.declaration_number,
    eori_number: decl.eori,
    declarant_name: decl.declarant_name,
    import_date: decl.acceptance_date,
    country_of_origin: decl.country_of_origin,
    cn_code: decl.tariff_code,
    product_name: decl.goods_description,
    quantity: decl.net_mass_kg / 1000, // Convert kg to tonnes
    customs_value_eur: decl.customs_value,
    aggregated_goods_category: mapCNToCategory(decl.tariff_code),
    calculation_method: 'Default_values',
    source: 'AES_import',
    validation_status: 'pending'
  }));
  
  return Response.json({
    success: true,
    source: 'AES',
    declarations_found: declarations.total_count,
    cbam_relevant: cbamEntries.length,
    entries: cbamEntries
  });
}

async function fetchICS2Entries(base44, params) {
  const { eori_number, date_from, date_to } = params;
  
  const customsApiKey = Deno.env.get('CUSTOMS_API_KEY');
  if (!customsApiKey) {
    return Response.json({ 
      error: 'Customs API key not configured'
    }, { status: 400 });
  }
  
  // ICS2 Entry Summary Declarations (ENS)
  const response = await fetch(`https://api.ics2.europa.eu/v2/ens/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${customsApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      eori: eori_number,
      date_range: { from: date_from, to: date_to },
      cbam_filter: true
    })
  });
  
  if (!response.ok) {
    return Response.json({ 
      error: 'ICS2 fetch failed'
    }, { status: response.status });
  }
  
  const ens = await response.json();
  
  const cbamEntries = ens.declarations.map(e => ({
    import_id: e.mrn, // Movement Reference Number
    import_date: e.expected_arrival_date,
    country_of_origin: e.consignment_country,
    cn_code: e.commodity_code,
    product_name: e.goods_description,
    quantity: e.gross_mass_kg / 1000,
    source: 'ICS2_import',
    validation_status: 'pending'
  }));
  
  return Response.json({
    success: true,
    source: 'ICS2',
    entries_found: ens.total_count,
    entries: cbamEntries
  });
}

async function parseSADDocument(base44, params) {
  const { file_url } = params;
  
  // Fetch SAD document (XML or PDF)
  const fileResponse = await fetch(file_url);
  const content = await fileResponse.text();
  
  let sadData;
  
  if (content.startsWith('<?xml') || content.startsWith('<')) {
    // Parse XML SAD
    sadData = parser.parse(content);
  } else {
    // Use AI to extract from PDF SAD
    const extractRes = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          import_id: { type: "string" },
          eori_number: { type: "string" },
          import_date: { type: "string", format: "date" },
          country_of_origin: { type: "string" },
          cn_code: { type: "string" },
          product_name: { type: "string" },
          quantity_kg: { type: "number" },
          customs_value: { type: "number" }
        }
      }
    });
    
    sadData = extractRes.output;
  }
  
  // Transform to CBAM entry
  const cbamEntry = {
    import_id: sadData.Box_1_Declaration_Number || sadData.import_id,
    eori_number: sadData.Box_44_EORI || sadData.eori_number,
    import_date: sadData.Box_11_Date || sadData.import_date,
    country_of_origin: sadData.Box_34_Country || sadData.country_of_origin,
    cn_code: sadData.Box_33_Commodity_Code || sadData.cn_code,
    product_name: sadData.Box_31_Description || sadData.product_name,
    quantity: (sadData.Box_35_Gross_Mass || sadData.quantity_kg || 0) / 1000,
    customs_value_eur: sadData.Box_46_Statistical_Value || sadData.customs_value || 0,
    source: 'SAD_import',
    calculation_method: 'Default_values',
    validation_status: 'pending'
  };
  
  return Response.json({
    success: true,
    source: 'SAD',
    entry: cbamEntry
  });
}

async function autoImportCustomsData(base44, params) {
  const { eori_number, period_year, period_quarter } = params;
  
  // Calculate date range for quarter
  const quarterStarts = {
    1: `${period_year}-01-01`,
    2: `${period_year}-04-01`,
    3: `${period_year}-07-01`,
    4: `${period_year}-10-01`
  };
  
  const quarterEnds = {
    1: `${period_year}-03-31`,
    2: `${period_year}-06-30`,
    3: `${period_year}-09-30`,
    4: `${period_year}-12-31`
  };
  
  const date_from = quarterStarts[period_quarter];
  const date_to = quarterEnds[period_quarter];
  
  // Fetch from all sources
  const [aesResult, ics2Result] = await Promise.allSettled([
    fetchAESDeclarations(base44, { eori_number, date_from, date_to }),
    fetchICS2Entries(base44, { eori_number, date_from, date_to })
  ]);
  
  const allEntries = [];
  
  if (aesResult.status === 'fulfilled') {
    const aesData = await aesResult.value.json();
    if (aesData.entries) allEntries.push(...aesData.entries);
  }
  
  if (ics2Result.status === 'fulfilled') {
    const ics2Data = await ics2Result.value.json();
    if (ics2Data.entries) allEntries.push(...ics2Data.entries);
  }
  
  // Deduplicate by import_id
  const unique = Array.from(
    new Map(allEntries.map(e => [e.import_id, e])).values()
  );
  
  // Bulk create entries
  const user = await base44.auth.me();
  const users = await base44.asServiceRole.entities.User.list();
  const fullUser = users.find(u => u.email === user.email);
  
  for (const entry of unique) {
    await base44.asServiceRole.entities.CBAMEmissionEntry.create({
      ...entry,
      company_id: fullUser?.company_id
    });
  }
  
  return Response.json({
    success: true,
    period: `Q${period_quarter} ${period_year}`,
    sources: ['AES', 'ICS2'],
    total_imported: unique.length,
    aes_count: aesResult.status === 'fulfilled' ? (await aesResult.value.json()).cbam_relevant : 0,
    ics2_count: ics2Result.status === 'fulfilled' ? (await ics2Result.value.json()).entries.length : 0
  });
}

function mapCNToCategory(cn_code) {
  const code = cn_code.substring(0, 4);
  
  if (['7201', '7202', '7203', '7206', '7207', '7208', '7209'].includes(code)) return 'Iron & Steel';
  if (['7601', '7602', '7603', '7604'].includes(code)) return 'Aluminium';
  if (code === '2523') return 'Cement';
  if (['3102', '3103', '3104', '3105'].includes(code)) return 'Fertilizers';
  if (code === '2804') return 'Hydrogen';
  if (code === '2716') return 'Electricity';
  
  return 'Other';
}
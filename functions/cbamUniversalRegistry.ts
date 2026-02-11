import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Universal CBAM Registry Router
 * Routes requests to correct national registry based on member state
 * Supports: NL, DE, FR + 24 other MS via XML download fallback
 */

const REGISTRY_IMPLEMENTATIONS = {
  'NL': 'cbamNetherlandsRegistry',
  'DE': 'cbamGermanyRegistry',
  'FR': 'cbamFranceRegistry'
};

const FALLBACK_REGISTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'PL', 'PT', 'RO',
  'SK', 'SI', 'ES', 'SE'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { member_state, action, params } = await req.json();
    
    if (!member_state) {
      return Response.json({ error: 'Member state required' }, { status: 400 });
    }
    
    // Check if we have native implementation
    if (REGISTRY_IMPLEMENTATIONS[member_state]) {
      const functionName = REGISTRY_IMPLEMENTATIONS[member_state];
      
      const result = await base44.functions.invoke(functionName, {
        action,
        params
      });
      
      return Response.json(result.data);
    }
    
    // Fallback: XML download for manual submission
    if (FALLBACK_REGISTRIES.includes(member_state)) {
      if (action === 'submit_report') {
        return await generateXMLForManualSubmission(base44, params);
      }
      
      return Response.json({
        error: 'Direct API integration not available',
        member_state,
        available_action: 'xml_download',
        message: 'Use XML export for manual submission to national portal'
      }, { status: 501 });
    }
    
    return Response.json({ 
      error: 'Unsupported member state',
      member_state
    }, { status: 400 });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateXMLForManualSubmission(base44, params) {
  const { report_id } = params;
  
  // Generate standardized XML
  const result = await base44.functions.invoke('cbamEnhancedXMLGenerator', {
    report_id,
    include_ets_prices: true
  });
  
  if (!result.data.success) {
    return Response.json({ 
      error: 'XML generation failed',
      details: result.data.error
    }, { status: 500 });
  }
  
  const reports = await base44.asServiceRole.entities.CBAMReport.filter({ id: report_id });
  const memberState = reports[0]?.member_state || 'Unknown';
  
  const portalURLs = {
    'IT': 'https://cbam.agenziadogane.it',
    'ES': 'https://cbam.agenciatributaria.es',
    'PL': 'https://cbam.gov.pl',
    'BE': 'https://cbam-registry.belgium.be',
    'SE': 'https://cbam.tullverket.se',
    'DK': 'https://cbam.skat.dk',
    'FI': 'https://cbam.tulli.fi',
    'AT': 'https://cbam.bmf.gv.at'
  };
  
  return Response.json({
    success: true,
    mode: 'manual_submission',
    xml_content: result.data.xml,
    xml_download_url: result.data.xml_file_url,
    member_state: memberState,
    portal_url: portalURLs[memberState] || 'https://ec.europa.eu/taxation_customs/dds2/cbam',
    instructions: `
      Manual Submission Steps:
      1. Download the generated XML file
      2. Log in to ${memberState} CBAM portal: ${portalURLs[memberState] || 'National portal'}
      3. Upload XML via "Submit Declaration" section
      4. Save confirmation number
    `
  });
}
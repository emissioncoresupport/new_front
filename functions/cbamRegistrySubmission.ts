import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM National Registry Submission
 * Routes to country-specific registry APIs or provides manual XML
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id, xml_content } = await req.json();
    
    console.log('[Registry Submit] Report:', report_id);
    
    const reports = await base44.asServiceRole.entities.CBAMReport.list();
    const report = reports.find(r => r.id === report_id);
    
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }
    
    if (report.status !== 'validated') {
      return Response.json({ 
        error: 'Report must be validated first',
        current_status: report.status
      }, { status: 400 });
    }
    
    // Get or generate XML
    let xmlData = xml_content;
    if (!xmlData && report.xml_file_url) {
      const xmlResponse = await fetch(report.xml_file_url);
      xmlData = await xmlResponse.text();
    } else if (!xmlData) {
      // Generate XML
      const xmlGenResult = await base44.asServiceRole.functions.invoke('cbamEnhancedXMLGenerator', {
        report_id,
        include_ets_prices: true
      });
      xmlData = xmlGenResult.data.xml_content;
    }
    
    // Route to appropriate registry
    const memberState = report.member_state;
    const registryFunctions = {
      'NL': 'cbamNetherlandsRegistry',
      'DE': 'cbamGermanyRegistry',
      'FR': 'cbamFranceRegistry'
    };
    
    if (registryFunctions[memberState]) {
      // Direct API submission
      const registryResult = await base44.asServiceRole.functions.invoke(registryFunctions[memberState], {
        action: 'submit_report',
        params: { report_id, access_token: null } // Token handled in registry function
      });
      
      if (registryResult.data?.success) {
        // Update report
        await base44.asServiceRole.entities.CBAMReport.update(report_id, {
          status: 'submitted',
          submission_date: new Date().toISOString(),
          registry_confirmation_number: registryResult.data.confirmation_number,
          submitted_via_cbam_registry: true
        });
        
        // Send confirmation email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: `✅ CBAM Report Submitted - ${report.reporting_period}`,
          body: `Your CBAM report has been successfully submitted to ${memberState} national registry.

Period: ${report.reporting_period}
Confirmation: ${registryResult.data.confirmation_number}
Submitted: ${new Date().toLocaleString()}

View status: ${Deno.env.get('BASE_URL')}/CBAM?tab=reports`
        });
        
        return Response.json({
          success: true,
          confirmation_number: registryResult.data.confirmation_number,
          registry: memberState,
          submission_method: 'api',
          submitted_at: new Date().toISOString()
        });
      }
    }
    
    // Manual submission fallback
    console.log('[Registry Submit] Using manual submission for:', memberState);
    
    await base44.asServiceRole.entities.CBAMReport.update(report_id, {
      status: 'pending_manual_submission'
    });
    
    return Response.json({
      success: true,
      submission_method: 'manual',
      xml_content: xmlData,
      manual_portal_url: `https://cbam-registry.${memberState.toLowerCase()}.eu`,
      instructions: `
1. Download the generated XML file
2. Log in to ${memberState} CBAM registry portal
3. Upload XML via "Submit Declaration" section
4. Save confirmation number and update report status
      `.trim(),
      message: 'Direct API not available - use manual submission'
    });
    
  } catch (error) {
    console.error('[Registry Submit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
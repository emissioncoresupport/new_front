/**
 * PFAS Lab Integration API
 * Handles webhooks and API pulls from Eurofins, SGS, and other PFAS testing labs
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, lab_provider, payload, api_key, test_report_id } = await req.json();

    switch (action) {
      case 'webhook': {
        // Webhook from lab provider (Eurofins, SGS)
        return await handleLabWebhook(base44, lab_provider, payload);
      }

      case 'pull_results': {
        // Pull test results from lab API
        return await pullLabResults(base44, lab_provider, api_key, test_report_id);
      }

      case 'test_connection': {
        // Test API connection
        return await testLabConnection(lab_provider, api_key);
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('PFAS Lab Integration Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Handle incoming webhook from lab provider
 */
async function handleLabWebhook(base44, lab_provider, payload) {
  // Parse lab-specific payload format
  const labData = parseLabPayload(lab_provider, payload);

  // Create/update PFASAssessment
  const assessment = await procesLabResult(base44, labData);

  // Trigger SCIP notification if SVHCs detected
  if (labData.detected_svhcs && labData.detected_svhcs.length > 0) {
    await triggerSCIPNotification(base44, assessment.id, labData.detected_svhcs);
  }

  return Response.json({ 
    success: true, 
    assessment_id: assessment.id,
    scip_notification_triggered: labData.detected_svhcs?.length > 0
  });
}

/**
 * Pull test results from lab API
 */
async function pullLabResults(base44, lab_provider, api_key, test_report_id) {
  let labResponse;

  if (lab_provider === 'eurofins') {
    // Eurofins API (example endpoint)
    labResponse = await fetch(`https://api.eurofins.com/v1/reports/${test_report_id}`, {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    });
  } else if (lab_provider === 'sgs') {
    // SGS API (example endpoint)
    labResponse = await fetch(`https://api.sgs.com/testing/reports/${test_report_id}`, {
      headers: {
        'X-API-Key': api_key,
        'Accept': 'application/json'
      }
    });
  } else {
    return Response.json({ error: 'Unsupported lab provider' }, { status: 400 });
  }

  if (!labResponse.ok) {
    return Response.json({ 
      error: `Lab API error: ${labResponse.status}` 
    }, { status: labResponse.status });
  }

  const labData = await labResponse.json();
  const parsed = parseLabPayload(lab_provider, labData);

  // Process result
  const assessment = await procesLabResult(base44, parsed);

  // SCIP notification
  if (parsed.detected_svhcs && parsed.detected_svhcs.length > 0) {
    await triggerSCIPNotification(base44, assessment.id, parsed.detected_svhcs);
  }

  return Response.json({ 
    success: true, 
    assessment_id: assessment.id,
    detected_substances: parsed.detected_substances,
    scip_triggered: parsed.detected_svhcs?.length > 0
  });
}

/**
 * Parse lab-specific payload format to unified structure
 */
function parseLabPayload(lab_provider, payload) {
  if (lab_provider === 'eurofins') {
    return {
      sample_id: payload.sample_reference,
      test_date: payload.test_completed_date,
      entity_name: payload.sample_description,
      entity_id: payload.client_reference,
      entity_type: payload.sample_type || 'Product',
      test_report_url: payload.report_pdf_url,
      detected_substances: payload.pfas_results?.map(r => ({
        name: r.substance_name,
        cas_number: r.cas_number,
        concentration_ppm: r.concentration_ppm,
        regulation: r.regulatory_list,
        list_status: r.restriction_status,
        is_restricted: r.exceeds_limit
      })) || [],
      detected_svhcs: payload.pfas_results?.filter(r => r.is_svhc).map(r => ({
        name: r.substance_name,
        cas_number: r.cas_number,
        concentration_ppm: r.concentration_ppm
      })) || [],
      compliance_status: payload.overall_result === 'PASS' ? 'Compliant' : 'Non-Compliant',
      test_method: payload.test_method,
      lab_certificate_number: payload.certificate_number
    };
  } else if (lab_provider === 'sgs') {
    return {
      sample_id: payload.sampleId,
      test_date: payload.completedAt,
      entity_name: payload.productName,
      entity_id: payload.clientReferenceId,
      entity_type: payload.productType || 'Product',
      test_report_url: payload.reportUrl,
      detected_substances: payload.testResults?.substances?.map(s => ({
        name: s.chemicalName,
        cas_number: s.casNumber,
        concentration_ppm: s.concentrationPpm,
        regulation: s.regulatoryFramework,
        list_status: s.listingStatus,
        is_restricted: s.restricted
      })) || [],
      detected_svhcs: payload.testResults?.svhc_detected?.map(s => ({
        name: s.chemicalName,
        cas_number: s.casNumber,
        concentration_ppm: s.concentrationPpm
      })) || [],
      compliance_status: payload.complianceStatus === 'compliant' ? 'Compliant' : 'Non-Compliant',
      test_method: payload.testStandard,
      lab_certificate_number: payload.reportNumber
    };
  }

  // Generic fallback
  return payload;
}

/**
 * Process lab result and create/update PFASAssessment
 */
async function procesLabResult(base44, labData) {
  // Calculate risk score based on detected substances
  const risk_score = labData.detected_substances.length > 0 
    ? Math.min(100, labData.detected_substances.length * 20 + 
        (labData.detected_substances.filter(s => s.is_restricted).length * 30))
    : 0;

  // Check for existing assessment
  const existing = await base44.asServiceRole.entities.PFASAssessment.filter({
    entity_id: labData.entity_id,
    entity_type: labData.entity_type
  });

  let assessment;
  
  if (existing.length > 0) {
    // Update existing
    assessment = await base44.asServiceRole.entities.PFASAssessment.update(existing[0].id, {
      status: labData.compliance_status,
      risk_score: risk_score,
      detected_substances: labData.detected_substances,
      test_report_url: labData.test_report_url,
      verification_method: 'lab_test',
      last_checked: new Date().toISOString(),
      ai_analysis_notes: `Lab test completed on ${labData.test_date}. Method: ${labData.test_method}. Certificate: ${labData.lab_certificate_number}`
    });
  } else {
    // Create new
    assessment = await base44.asServiceRole.entities.PFASAssessment.create({
      entity_id: labData.entity_id,
      entity_type: labData.entity_type,
      name: labData.entity_name,
      status: labData.compliance_status,
      risk_score: risk_score,
      detected_substances: labData.detected_substances,
      test_report_url: labData.test_report_url,
      verification_method: 'lab_test',
      last_checked: new Date().toISOString(),
      ai_analysis_notes: `Lab test completed on ${labData.test_date}. Method: ${labData.test_method}. Certificate: ${labData.lab_certificate_number}`,
      regulatory_references: ['REACH Annex XVII', 'ECHA Candidate List']
    });
  }

  // Log to blockchain
  await base44.asServiceRole.entities.BlockchainAuditLog.create({
    entity_type: 'PFASAssessment',
    entity_id: assessment.id,
    action: 'lab_test_result_imported',
    actor: 'lab_api',
    timestamp: new Date().toISOString(),
    metadata_json: {
      lab_provider: labData.lab_provider,
      sample_id: labData.sample_id,
      substances_detected: labData.detected_substances.length,
      svhcs_detected: labData.detected_svhcs?.length || 0
    }
  });

  return assessment;
}

/**
 * Trigger SCIP database notification
 */
async function triggerSCIPNotification(base44, assessment_id, svhc_list) {
  // Create SCIP notification record
  await base44.asServiceRole.entities.SCIPNotification.create({
    pfas_assessment_id: assessment_id,
    notification_date: new Date().toISOString(),
    svhc_substances: svhc_list,
    notification_status: 'pending',
    echa_submission_required: true,
    notification_deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days
  });

  // Send email alert
  const assessment = await base44.asServiceRole.entities.PFASAssessment.filter({ id: assessment_id });
  if (assessment.length > 0) {
    await base44.integrations.Core.SendEmail({
      to: 'compliance@yourcompany.com', // Should be configured per tenant
      subject: `⚠️ SCIP Notification Required - SVHC Detected`,
      body: `
        SVHC substances detected in lab test for: ${assessment[0].name}
        
        Detected SVHCs: ${svhc_list.length}
        ${svhc_list.map(s => `- ${s.name} (CAS: ${s.cas_number}): ${s.concentration_ppm} ppm`).join('\n')}
        
        Action Required: Submit SCIP notification to ECHA within 45 days.
        
        View assessment: [Link to PFAS module]
      `
    });
  }
}

/**
 * Test lab API connection
 */
async function testLabConnection(lab_provider, api_key) {
  try {
    let testEndpoint;
    let headers;

    if (lab_provider === 'eurofins') {
      testEndpoint = 'https://api.eurofins.com/v1/health';
      headers = { 'Authorization': `Bearer ${api_key}` };
    } else if (lab_provider === 'sgs') {
      testEndpoint = 'https://api.sgs.com/health';
      headers = { 'X-API-Key': api_key };
    } else {
      return Response.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    const response = await fetch(testEndpoint, { headers });
    
    return Response.json({ 
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Connection successful' : 'Connection failed'
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
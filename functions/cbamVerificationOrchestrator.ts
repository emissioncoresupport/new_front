import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Verification Orchestrator
 * Manages accredited verifier workflows per C(2025) 8150
 * Routes verification requests to certified verifiers
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, params } = await req.json();
    
    console.log('[Verification] Action:', action);
    
    switch (action) {
      case 'request_verification':
        return await requestVerification(base44, user, params);
      
      case 'list_verifiers':
        return await listVerifiers(base44, params);
      
      case 'check_status':
        return await checkVerificationStatus(base44, params);
      
      case 'submit_monitoring_plan':
        return await submitMonitoringPlan(base44, user, params);
      
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[Verification] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

async function requestVerification(base44, user, params) {
  const { entry_ids, verifier_id, priority = 'normal' } = params;
  
  const verifier = (await base44.asServiceRole.entities.CBAMVerifier.list())
    .find(v => v.id === verifier_id);
  
  if (!verifier) {
    return Response.json({ error: 'Verifier not found' }, { status: 404 });
  }
  
  // Create verification request
  const request = await base44.asServiceRole.entities.CBAMVerificationRequest.create({
    verifier_id,
    entry_ids,
    status: 'pending',
    priority,
    requested_by: user.email,
    request_date: new Date().toISOString(),
    expected_completion_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  });
  
  // Notify verifier
  if (verifier.contact_email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: verifier.contact_email,
      subject: 'New CBAM Verification Request',
      body: `Dear ${verifier.organization_name},

New verification request received:

Request ID: ${request.id}
Entries to verify: ${entry_ids.length}
Priority: ${priority}
Expected completion: ${new Date(request.expected_completion_date).toLocaleDateString()}

Please review the monitoring plans and emission reports in your verifier portal.

Best regards,
CBAM Platform`
    });
  }
  
  console.log('[Verification] Request created:', request.id);
  
  return Response.json({
    success: true,
    request_id: request.id,
    verifier: verifier.organization_name,
    expected_completion: request.expected_completion_date
  });
}

async function listVerifiers(base44, params) {
  const { country, accreditation_status = 'active' } = params;
  
  let verifiers = await base44.asServiceRole.entities.CBAMVerifier.filter({
    accreditation_status
  });
  
  if (country) {
    verifiers = verifiers.filter(v => v.countries_covered?.includes(country));
  }
  
  return Response.json({
    success: true,
    verifiers: verifiers.map(v => ({
      id: v.id,
      name: v.organization_name,
      accreditation_number: v.accreditation_number,
      countries: v.countries_covered,
      specializations: v.product_specializations,
      avg_turnaround_days: v.avg_turnaround_days
    }))
  });
}

async function checkVerificationStatus(base44, params) {
  const { request_id } = params;
  
  const requests = await base44.asServiceRole.entities.CBAMVerificationRequest.list();
  const request = requests.find(r => r.id === request_id);
  
  if (!request) {
    return Response.json({ error: 'Request not found' }, { status: 404 });
  }
  
  return Response.json({
    success: true,
    status: request.status,
    verifier_id: request.verifier_id,
    completion_date: request.completion_date,
    opinion: request.verification_opinion,
    report_url: request.verification_report_url
  });
}

async function submitMonitoringPlan(base44, user, params) {
  const { installation_id, plan_data } = params;
  
  const plan = await base44.asServiceRole.entities.CBAMMonitoringPlan.create({
    installation_id,
    ...plan_data,
    submitted_by: user.email,
    submission_date: new Date().toISOString(),
    status: 'pending_approval'
  });
  
  console.log('[Verification] Monitoring plan submitted:', plan.id);
  
  return Response.json({
    success: true,
    plan_id: plan.id,
    status: 'pending_approval',
    message: 'Monitoring plan submitted for review'
  });
}
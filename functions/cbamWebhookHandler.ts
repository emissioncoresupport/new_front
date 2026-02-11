import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Webhook Handler
 * Receives real-time updates from national registries
 * Processes submission status, certificate purchases, validation results
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Verify webhook signature
  const signature = req.headers.get('X-CBAM-Signature');
  const webhookSecret = Deno.env.get('CBAM_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    console.error('CBAM_WEBHOOK_SECRET not configured');
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }
  
  const body = await req.text();
  
  // Verify HMAC signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  
  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (signature !== expectedHex) {
    console.error('Invalid webhook signature');
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  try {
    const payload = JSON.parse(body);
    
    switch (payload.event_type) {
      case 'submission_accepted':
        await handleSubmissionAccepted(base44, payload);
        break;
      
      case 'submission_rejected':
        await handleSubmissionRejected(base44, payload);
        break;
      
      case 'certificate_purchased':
        await handleCertificatePurchased(base44, payload);
        break;
      
      case 'verification_completed':
        await handleVerificationCompleted(base44, payload);
        break;
      
      default:
        console.warn('Unknown webhook event:', payload.event_type);
    }
    
    return Response.json({ 
      success: true, 
      event: payload.event_type,
      processed_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleSubmissionAccepted(base44, payload) {
  const { confirmation_number, report_id, acceptance_date } = payload.data;
  
  await base44.asServiceRole.entities.CBAMReport.update(report_id, {
    status: 'accepted',
    registry_confirmation_number: confirmation_number,
    acceptance_date
  });
  
  // Notify user
  const reports = await base44.asServiceRole.entities.CBAMReport.filter({ id: report_id });
  if (reports.length) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: reports[0].submitted_by,
      subject: `✅ CBAM Report Accepted - ${reports[0].reporting_period}`,
      body: `Your CBAM report has been accepted by the national registry.\n\nConfirmation: ${confirmation_number}\nAcceptance Date: ${acceptance_date}`
    });
  }
}

async function handleSubmissionRejected(base44, payload) {
  const { report_id, rejection_reason, errors } = payload.data;
  
  await base44.asServiceRole.entities.CBAMReport.update(report_id, {
    status: 'requires_correction',
    validation_errors: errors
  });
  
  // Notify user
  const reports = await base44.asServiceRole.entities.CBAMReport.filter({ id: report_id });
  if (reports.length) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: reports[0].submitted_by,
      subject: `⚠️ CBAM Report Rejected - Action Required`,
      body: `Your CBAM report requires correction.\n\nReason: ${rejection_reason}\n\nErrors:\n${errors.map(e => `• ${e}`).join('\n')}`
    });
  }
}

async function handleCertificatePurchased(base44, payload) {
  const { transaction_id, quantity, price_per_unit, total_cost } = payload.data;
  
  await base44.asServiceRole.entities.CBAMCertificate.create({
    certificate_type: 'CBAM_certificate',
    quantity,
    price_per_unit,
    total_cost,
    purchase_date: new Date().toISOString(),
    status: 'active',
    registry_reference: transaction_id,
    purchased_from: payload.registry
  });
}

async function handleVerificationCompleted(base44, payload) {
  const { entry_id, verification_status, verifier_id, opinion } = payload.data;
  
  await base44.asServiceRole.entities.CBAMEmissionEntry.update(entry_id, {
    validation_status: verification_status === 'approved' ? 'manual_verified' : 'flagged',
    verified_by: verifier_id,
    verification_date: new Date().toISOString()
  });
  
  if (opinion) {
    await base44.asServiceRole.entities.CBAMVerificationReport.create({
      entry_id,
      verifier_id,
      verification_opinion: opinion,
      report_date: new Date().toISOString()
    });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Notification Engine
 * Automated alerts for deadlines, submissions, verifications
 * Per Commission Implementing Regulation (EU) 2023/1773
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, params } = await req.json();

    switch (action) {
      case 'check_deadlines':
        return await checkDeadlines(base44, params);
      
      case 'send_submission_confirmation':
        return await sendSubmissionConfirmation(base44, params);
      
      case 'send_verification_alert':
        return await sendVerificationAlert(base44, params);
      
      case 'send_certificate_shortage':
        return await sendCertificateShortage(base44, params);
      
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function checkDeadlines(base44, params) {
  const now = new Date();
  const reports = await base44.asServiceRole.entities.CBAMReport.list();
  
  const alerts = [];
  
  for (const report of reports) {
    if (report.status === 'submitted' || report.status === 'accepted') continue;
    
    const deadline = new Date(report.submission_deadline);
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    // Alert thresholds: 30, 15, 7, 3, 1 days
    if ([30, 15, 7, 3, 1].includes(daysUntil)) {
      const urgency = daysUntil <= 3 ? 'critical' : daysUntil <= 7 ? 'high' : 'medium';
      
      alerts.push({
        report_id: report.id,
        type: 'deadline_approaching',
        urgency,
        days_remaining: daysUntil,
        deadline: report.submission_deadline,
        period: report.reporting_period
      });
      
      // Send email notification
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: report.submitted_by || user.email,
        subject: `⚠️ CBAM Report Due in ${daysUntil} Days - ${report.reporting_period}`,
        body: `
          Your CBAM report for ${report.reporting_period} is due on ${deadline.toLocaleDateString()}.
          
          Status: ${report.status}
          Days remaining: ${daysUntil}
          Urgency: ${urgency.toUpperCase()}
          
          Action required:
          ${report.status === 'draft' ? '• Complete and validate report data\n• Review linked emission entries\n• Submit via CBAM Registry' : ''}
          ${report.status === 'validated' ? '• Submit via CBAM Registry before deadline' : ''}
          
          Log in to submit: ${Deno.env.get('BASE_URL') || 'https://app.base44.com'}/CBAM?tab=reports
        `
      });
    }
  }
  
  return Response.json({ 
    success: true, 
    alerts,
    checked_reports: reports.length,
    alerts_sent: alerts.length
  });
}

async function sendSubmissionConfirmation(base44, params) {
  const { report_id, registry_confirmation, recipient } = params;
  
  const report = await base44.asServiceRole.entities.CBAMReport.filter({ id: report_id });
  if (!report.length) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }
  
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: recipient,
    subject: `✅ CBAM Report Submitted - ${report[0].reporting_period}`,
    body: `
      Your CBAM report has been successfully submitted to the national registry.
      
      Report Period: ${report[0].reporting_period}
      Submission Date: ${new Date().toISOString()}
      Registry Confirmation: ${registry_confirmation || 'Pending'}
      
      Next Steps:
      • Monitor registry for acceptance status
      • Prepare certificate purchase if needed
      • Archive supporting documentation
      
      View report: ${Deno.env.get('BASE_URL')}/CBAM?tab=reports
    `
  });
  
  // Create notification record
  await base44.asServiceRole.entities.Notification.create({
    user_email: recipient,
    type: 'cbam_submission',
    title: `CBAM Report Submitted - ${report[0].reporting_period}`,
    message: `Your report has been submitted with confirmation: ${registry_confirmation}`,
    severity: 'success',
    read: false
  });
  
  return Response.json({ success: true });
}

async function sendVerificationAlert(base44, params) {
  const { entry_id, verification_status, recipient } = params;
  
  const entry = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({ id: entry_id });
  if (!entry.length) {
    return Response.json({ error: 'Entry not found' }, { status: 404 });
  }
  
  const isSuccess = verification_status === 'verified';
  
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: recipient,
    subject: `${isSuccess ? '✅' : '⚠️'} CBAM Entry ${isSuccess ? 'Verified' : 'Requires Review'} - ${entry[0].import_id}`,
    body: `
      Import: ${entry[0].import_id}
      Product: ${entry[0].product_name}
      Status: ${verification_status}
      
      ${isSuccess ? 
        'This entry has been verified and is ready for inclusion in quarterly reports.' :
        'Action required: Review verification findings and provide additional documentation.'}
      
      View entry: ${Deno.env.get('BASE_URL')}/CBAM?tab=data-management
    `
  });
  
  return Response.json({ success: true });
}

async function sendCertificateShortage(base44, params) {
  const { shortfall, required, available, recipient } = params;
  
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: recipient,
    subject: `🚨 CBAM Certificate Shortage Alert - ${shortfall} Units Needed`,
    body: `
      Your CBAM certificate balance is insufficient for current obligations.
      
      Required: ${required} certificates
      Available: ${available} certificates
      Shortfall: ${shortfall} certificates
      
      Estimated Cost: €${(shortfall * 88).toLocaleString()}
      
      Action required:
      • Purchase additional certificates via EU CBAM Registry
      • Or set up auto-purchase automation
      
      Manage certificates: ${Deno.env.get('BASE_URL')}/CBAM?tab=certificates
    `
  });
  
  return Response.json({ success: true });
}
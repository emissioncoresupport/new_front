import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CBAM Scheduled Monitoring
 * Daily automation: deadlines, auto-purchase, verifications
 * ADMIN-ONLY via scheduled tasks
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Admin check (scheduled tasks run as admin)
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }
    
    console.log('[CBAM Monitor] Starting daily monitoring...');
    
    const results = {
      deadline_alerts_sent: 0,
      auto_purchases_executed: 0,
      verifications_processed: 0,
      errors: []
    };
    
    // 1. CHECK DEADLINES
    try {
      const reports = await base44.asServiceRole.entities.CBAMReport.list();
      const now = new Date();
      
      for (const report of reports) {
        if (['submitted', 'accepted'].includes(report.status)) continue;
        
        const deadline = new Date(report.submission_deadline);
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        
        // Alert at 30, 15, 7, 3, 1 days
        if ([30, 15, 7, 3, 1].includes(daysUntil)) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: report.submitted_by || user.email,
            subject: `⚠️ CBAM Report Due in ${daysUntil} Days - ${report.reporting_period}`,
            body: `Your CBAM report for ${report.reporting_period} is due on ${deadline.toLocaleDateString()}.

Status: ${report.status}
Days remaining: ${daysUntil}

Action required:
${report.status === 'draft' ? '• Complete and validate report\n• Submit via CBAM Registry' : ''}

Log in: ${Deno.env.get('BASE_URL')}/CBAM?tab=reports`
          });
          
          results.deadline_alerts_sent++;
        }
      }
      
      console.log('[CBAM Monitor] Deadline alerts:', results.deadline_alerts_sent);
      
    } catch (err) {
      results.errors.push({ task: 'deadlines', error: err.message });
    }
    
    // 2. AUTO-PURCHASE CHECK
    try {
      const settings = await base44.asServiceRole.entities.CBAMAutomationSettings.list();
      
      for (const setting of settings.filter(s => s.auto_purchase_enabled)) {
        const entries = await base44.asServiceRole.entities.CBAMEmissionEntry.filter({
          company_id: setting.company_id
        });
        
        const totalEmissions = entries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
        const required = Math.ceil(totalEmissions);
        
        const certs = await base44.asServiceRole.entities.CBAMCertificate.filter({
          company_id: setting.company_id,
          status: 'active'
        });
        
        const balance = certs.reduce((sum, c) => sum + (c.quantity || 0), 0);
        const shortfall = Math.max(0, required - balance);
        
        if (shortfall >= (setting.auto_purchase_threshold || 100)) {
          // Trigger purchase
          const purchaseResult = await base44.asServiceRole.functions.invoke('cbamCertificatePurchase', {
            action: 'auto_purchase',
            quantity: Math.min(shortfall, setting.max_auto_purchase_quantity || 1000),
            company_id: setting.company_id
          });
          
          if (purchaseResult.data?.success) {
            results.auto_purchases_executed++;
            console.log('[CBAM Monitor] Auto-purchased:', shortfall, 'units');
          }
        }
      }
      
    } catch (err) {
      results.errors.push({ task: 'auto_purchase', error: err.message });
    }
    
    // 3. VERIFICATION REMINDERS
    try {
      const verifications = await base44.asServiceRole.entities.CBAMVerificationRequest.filter({
        status: 'in_progress'
      });
      
      for (const verification of verifications) {
        if (verification.due_date && new Date(verification.due_date) < now) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: verification.assigned_to,
            subject: `⚠️ Overdue CBAM Verification - ${verification.request_id}`,
            body: `Verification request ${verification.request_id} is overdue.

Due: ${verification.due_date}
Entry: ${verification.entry_id}

Please complete verification to avoid reporting delays.`
          });
          
          results.verifications_processed++;
        }
      }
      
    } catch (err) {
      results.errors.push({ task: 'verifications', error: err.message });
    }
    
    console.log('[CBAM Monitor] Complete:', results);
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    });
    
  } catch (error) {
    console.error('[CBAM Monitor] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
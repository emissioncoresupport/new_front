import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Certificate Expiry Monitor
 * Proactive monitoring of certificate expirations
 * Sends alerts at 90, 60, 30, and 7 days before expiry
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function runs without user context (scheduled task)
    const suppliers = await base44.asServiceRole.entities.Supplier.list();
    
    const now = new Date();
    const alerts = [];
    
    for (const supplier of suppliers) {
      if (!supplier.certifications || supplier.certifications.length === 0) continue;
      
      for (const cert of supplier.certifications) {
        if (!cert.expiry_date) continue;
        
        const expiryDate = new Date(cert.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        // Check if we should send alert
        const alertDays = [90, 60, 30, 7, 0];
        if (alertDays.includes(daysUntilExpiry)) {
          let severity = 'warning';
          let title = '';
          
          if (daysUntilExpiry === 0) {
            severity = 'critical';
            title = `🚨 EXPIRED: ${cert.type} certificate for ${supplier.legal_name}`;
          } else if (daysUntilExpiry <= 7) {
            severity = 'critical';
            title = `🚨 URGENT: ${cert.type} expires in ${daysUntilExpiry} days - ${supplier.legal_name}`;
          } else if (daysUntilExpiry <= 30) {
            severity = 'warning';
            title = `⚠️ ${cert.type} expires in ${daysUntilExpiry} days - ${supplier.legal_name}`;
          } else {
            severity = 'info';
            title = `📅 ${cert.type} expires in ${daysUntilExpiry} days - ${supplier.legal_name}`;
          }
          
          // Check if alert already exists for this certificate
          const existingAlerts = await base44.asServiceRole.entities.RiskAlert.filter({
            supplier_id: supplier.id,
            alert_type: 'certificate_expiry',
            status: 'open'
          });
          
          const alreadyAlerted = existingAlerts.some(a => 
            a.description?.includes(cert.type) && 
            a.description?.includes(cert.certificate_number)
          );
          
          if (!alreadyAlerted) {
            await base44.asServiceRole.entities.RiskAlert.create({
              supplier_id: supplier.id,
              alert_type: 'certificate_expiry',
              severity: severity,
              title: title,
              description: `Certificate: ${cert.type} (${cert.certificate_number})
Issued by: ${cert.issuing_body}
Expires: ${expiryDate.toLocaleDateString()}
Days remaining: ${daysUntilExpiry}

${daysUntilExpiry <= 0 ? 'ACTION REQUIRED: Certificate has expired. Supplier may be non-compliant.' : 'ACTION REQUIRED: Request certificate renewal from supplier.'}`,
              source: 'Automated Certificate Monitoring',
              status: 'open'
            });
            
            alerts.push({
              supplier: supplier.legal_name,
              certificate: cert.type,
              expires_in_days: daysUntilExpiry,
              severity
            });
          }
        }
      }
    }
    
    return Response.json({
      success: true,
      monitored_suppliers: suppliers.length,
      alerts_created: alerts.length,
      alerts: alerts
    });

  } catch (error) {
    console.error('Certificate monitoring error:', error);
    return Response.json({ 
      error: 'Certificate monitoring failed', 
      details: error.message 
    }, { status: 500 });
  }
});
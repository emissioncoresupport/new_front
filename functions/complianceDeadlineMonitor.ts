/**
 * Compliance Deadline Monitor - Runs daily at 8 AM
 * Monitors all compliance deadlines and sends automated reminders
 */

export default async function complianceDeadlineMonitor(context) {
  const { base44 } = context;
  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in1Day = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);

  let notificationsSent = 0;

  // CBAM Reports
  const cbamReports = await base44.entities.CBAMReport.filter({
    submission_status: 'draft'
  });

  for (const report of cbamReports) {
    const deadline = new Date(report.period + '-01');
    deadline.setMonth(deadline.getMonth() + 4); // CBAM is due by end of month +1
    
    if (deadline <= in7Days && deadline > today) {
      await base44.integrations.Core.SendEmail({
        to: context.user.email,
        subject: `⏰ CBAM Report Due: ${report.period}`,
        body: `Your CBAM report for ${report.period} is due on ${deadline.toLocaleDateString()}.\n\nStatus: ${report.submission_status}\nAction: Complete and submit via CBAM module.`
      });
      
      await base44.entities.Notification.create({
        type: 'deadline',
        priority: deadline <= in1Day ? 'critical' : 'high',
        title: 'CBAM Report Deadline Approaching',
        message: `Report for ${report.period} due ${deadline.toLocaleDateString()}`,
        entity_type: 'CBAMReport',
        entity_id: report.id,
        deadline_date: deadline.toISOString()
      });
      
      notificationsSent++;
    }
  }

  // CSRD Tasks
  const csrdTasks = await base44.entities.CSRDTask.filter({
    status: 'pending'
  });

  for (const task of csrdTasks) {
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      
      if (dueDate <= in7Days && dueDate > today) {
        await base44.integrations.Core.SendEmail({
          to: task.assigned_to,
          subject: `⏰ CSRD Task Due: ${task.title}`,
          body: `Task: ${task.title}\nDue: ${dueDate.toLocaleDateString()}\n\nDescription: ${task.description}`
        });
        
        notificationsSent++;
      }
    }
  }

  // Certificate Expirations
  const cbamCertificates = await base44.entities.CBAMCertificate.list();
  
  for (const cert of cbamCertificates) {
    const expiry = new Date(cert.valid_until);
    
    if (expiry <= in7Days && expiry > today) {
      await base44.integrations.Core.SendEmail({
        to: context.user.email,
        subject: `⚠️ CBAM Certificate Expiring: ${cert.certificate_number}`,
        body: `Certificate ${cert.certificate_number} expires on ${expiry.toLocaleDateString()}.\n\nInstallation: ${cert.installation_id}\nAction: Renew certificate immediately.`
      });
      
      notificationsSent++;
    }
  }

  // Verification Requests Overdue
  const verificationRequests = await base44.entities.DataVerificationRequest.filter({
    status: 'open'
  });

  for (const req of verificationRequests) {
    if (req.due_date) {
      const dueDate = new Date(req.due_date);
      
      if (dueDate < today) {
        await base44.entities.DataVerificationRequest.update(req.id, {
          status: 'escalated'
        });
        
        await base44.integrations.Core.SendEmail({
          to: context.user.email,
          subject: `🚨 OVERDUE: Supplier Verification Request`,
          body: `Verification request is overdue.\n\nSupplier: ${req.supplier_id}\nDue Date: ${dueDate.toLocaleDateString()}\nAction: Escalate or extend deadline.`
        });
        
        notificationsSent++;
      }
    }
  }

  return {
    status: "success",
    notifications_sent: notificationsSent,
    timestamp: new Date().toISOString()
  };
}

export const config = {
  schedule: "0 8 * * *", // Daily at 8 AM
  timeout: 300
};
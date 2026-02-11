/**
 * EUDAMED Submission Service - Handles API submission and manual XML export
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { logReportSubmission } from './EUDAMEDAuditService';
import { submitReportToEUDAMED as apiSubmit } from './EUDAMEDAPIIntegration';

/**
 * Submit report directly to EUDAMED API (when available)
 * Currently returns simulation - will be connected to actual EUDAMED API
 */
export const submitToEUDAMED = async (report) => {
  try {
    // Use the API integration service which handles notifications
    const result = await apiSubmit(report);
    return result;
  } catch (error) {
    console.error('EUDAMED submission error:', error);
    throw new Error('Submission failed. Please try manual XML upload.');
  }
};

/**
 * Download XML file for manual submission
 */
export const downloadXMLFile = (report) => {
  const blob = new Blob([report.xml_content], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.report_reference}_EUDAMED.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  toast.success('XML file downloaded. Upload manually to EUDAMED portal.');
};

/**
 * Download PDF report
 */
export const generateAndDownloadPDF = async (report) => {
  toast.loading('Generating PDF report...');

  try {
    const pdfPrompt = `Generate a formal, professional PDF-ready document for this EUDAMED report.

Report Type: ${report.report_type}
Report Reference: ${report.report_reference}
Report Data: ${JSON.stringify(report.report_data, null, 2)}

Create a well-formatted document with:
- Header with EU/EUDAMED branding
- Report metadata section
- Device information section
- Incident/investigation details (if applicable)
- Root cause analysis and corrective actions
- Regulatory compliance statements
- Footer with submission date and reference

Format in HTML for PDF conversion with proper styling, tables, and sections.`;

    const htmlContent = await base44.integrations.Core.InvokeLLM({
      prompt: pdfPrompt,
      add_context_from_internet: true
    });

    // In production, convert HTML to PDF using a service
    // For now, create downloadable HTML
    const blob = new Blob([typeof htmlContent === 'string' ? htmlContent : JSON.stringify(htmlContent)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.report_reference}_Report.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.dismiss();
    toast.success('Report downloaded successfully');
  } catch (error) {
    toast.dismiss();
    toast.error('PDF generation failed');
    console.error(error);
  }
};

/**
 * Validate report before submission
 */
export const validateBeforeSubmission = async (report) => {
  const checks = [];

  // Check mandatory fields
  if (!report.xml_content) {
    checks.push({ field: 'XML Content', status: 'error', message: 'XML not generated' });
  }

  if (!report.report_data?.device_information?.udi_di) {
    checks.push({ field: 'UDI-DI', status: 'error', message: 'Device UDI-DI missing' });
  }

  if (!report.report_data?.report_metadata?.manufacturer_srn) {
    checks.push({ field: 'Manufacturer SRN', status: 'warning', message: 'SRN not provided' });
  }

  // Validate XML structure
  if (report.validation_errors && report.validation_errors.length > 0) {
    checks.push({ field: 'XML Validation', status: 'error', message: `${report.validation_errors.length} validation errors` });
  }

  const hasErrors = checks.some(c => c.status === 'error');
  
  return {
    can_submit: !hasErrors,
    checks,
    message: hasErrors ? 'Report has validation errors. Please review before submission.' : 'Report ready for submission'
  };
};
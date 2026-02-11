/**
 * EUDAMED Audit Trail Service - Tracks all EUDAMED module actions for compliance
 */

import { base44 } from '@/api/base44Client';
import { notifyAuditReview } from './EUDAMEDNotificationService';

/**
 * Log an audit entry
 */
export const logAuditEntry = async (actionType, entityType, entityData, outcome = 'success', metadata = {}, errorMessage = null) => {
  try {
    const user = await base44.auth.me().catch(() => ({ email: 'system@eudamed', full_name: 'System' }));

    const auditEntry = {
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityData?.id || null,
      entity_reference: entityData?.srn || entityData?.udi_di || entityData?.report_reference || entityData?.protocol_number || 'N/A',
      action_description: generateActionDescription(actionType, entityType, entityData),
      outcome,
      user_email: user.email,
      user_name: user.full_name || user.email,
      timestamp: new Date().toISOString(),
      metadata,
      error_message: errorMessage
    };

    const createdLog = await base44.entities.EUDAMEDAuditLog.create(auditEntry);
    
    // Create notification for review if needed
    await notifyAuditReview(createdLog);
    
    return createdLog;
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw - audit failure shouldn't break the main operation
  }
};

/**
 * Generate human-readable action description
 */
const generateActionDescription = (actionType, entityType, entityData) => {
  const entityName = entityData?.legal_name || entityData?.device_name || entityData?.investigation_title || entityData?.report_reference || 'Unknown';

  const descriptions = {
    actor_registration: `Registered new ${entityType}: ${entityName}`,
    device_registration: `Registered medical device: ${entityName} (${entityData?.udi_di || 'N/A'})`,
    incident_report: `Reported ${entityData?.incident_type || 'incident'} for device ${entityData?.device_id || 'N/A'}`,
    report_generation: `Generated ${entityData?.report_type || 'report'}: ${entityName}`,
    report_validation: `Validated report: ${entityName}`,
    report_submission: `Submitted report to EUDAMED: ${entityName}`,
    clinical_study_registration: `Registered clinical investigation: ${entityName}`,
    data_modification: `Modified ${entityType}: ${entityName}`,
    data_deletion: `Deleted ${entityType}: ${entityName}`
  };

  return descriptions[actionType] || `Performed ${actionType} on ${entityType}`;
};

/**
 * Log actor registration
 */
export const logActorRegistration = async (actor, outcome = 'success', errorMessage = null) => {
  await logAuditEntry('actor_registration', 'Actor', actor, outcome, {
    actor_type: actor.actor_type,
    country: actor.country
  }, errorMessage);
};

/**
 * Log device registration
 */
export const logDeviceRegistration = async (device, outcome = 'success', errorMessage = null) => {
  await logAuditEntry('device_registration', 'Device', device, outcome, {
    risk_class: device.risk_class,
    device_type: device.device_type,
    sterile: device.sterile
  }, errorMessage);
};

/**
 * Log incident report
 */
export const logIncidentReport = async (incident, outcome = 'success', errorMessage = null) => {
  await logAuditEntry('incident_report', 'Incident', incident, outcome, {
    incident_type: incident.incident_type,
    patient_outcome: incident.patient_outcome,
    country: incident.country_of_incident
  }, errorMessage);
};

/**
 * Log report generation
 */
export const logReportGeneration = async (report, outcome = 'success', errorMessage = null) => {
  await logAuditEntry('report_generation', 'Report', report, outcome, {
    report_type: report.report_type,
    validation_status: report.submission_status
  }, errorMessage);
};

/**
 * Log report validation
 */
export const logReportValidation = async (report, validationResult, outcome = 'success') => {
  await logAuditEntry('report_validation', 'Report', report, outcome, {
    is_valid: validationResult?.is_valid,
    errors_count: validationResult?.errors?.length || 0,
    compliance_score: validationResult?.compliance_score
  });
};

/**
 * Log report submission
 */
export const logReportSubmission = async (report, submissionResult, outcome = 'success', errorMessage = null) => {
  await logAuditEntry('report_submission', 'Report', report, outcome, {
    confirmation_number: submissionResult?.confirmation_number,
    submission_method: 'EUDAMED API'
  }, errorMessage);
};

/**
 * Log clinical study registration
 */
export const logClinicalStudyRegistration = async (study, outcome = 'success', errorMessage = null) => {
  await logAuditEntry('clinical_study_registration', 'Clinical Investigation', study, outcome, {
    investigation_type: study.investigation_type,
    countries: study.participating_countries
  }, errorMessage);
};
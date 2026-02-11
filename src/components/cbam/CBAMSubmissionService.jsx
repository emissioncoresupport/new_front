/**
 * CBAM Submission Service
 * Handles submission to EU CBAM Registry (Mocked - Real API requires official credentials)
 */

import { base44 } from '@/api/base44Client';

export const submitToRegistry = async (report, entries, installations) => {
  // In production, this would call the official EU CBAM Registry API
  // For now, we simulate the submission process
  
  try {
    // Step 1: Validate Report Status
    if (report.status === 'submitted') {
      throw new Error('Report already submitted. Registry ID: ' + report.registry_submission_id);
    }

    // Step 2: Pre-submission Validation
    const validation = await performPreSubmissionChecks(report, entries, installations);
    if (!validation.passed) {
      throw new Error('Pre-submission validation failed: ' + validation.errors.join(', '));
    }

    // Step 3: Prepare Submission Payload (EU CBAM XML Format)
    const payload = buildSubmissionPayload(report, entries, installations);

    // Step 4: Simulate API Call to EU Registry
    const response = await mockRegistrySubmission(payload);

    // Step 5: Update Report with Registry Response
    await base44.entities.CBAMReport.update(report.id, {
      status: 'submitted',
      registry_submission_id: response.transactionId,
      registry_status_message: response.message,
      submission_date: new Date().toISOString()
    });

    // Step 6: Mark all entries as submitted
    await Promise.all(
      entries.map(entry => 
        base44.entities.CBAMEmissionEntry.update(entry.id, {
          harmonization_status: 'harmonized'
        })
      )
    );

    return {
      success: true,
      transactionId: response.transactionId,
      message: response.message,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Submission error:', error);
    
    // Update report status to reflect error
    await base44.entities.CBAMReport.update(report.id, {
      status: 'draft',
      registry_status_message: 'Submission failed: ' + error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
};

const performPreSubmissionChecks = async (report, entries, installations) => {
  const errors = [];

  // Check 1: Report has entries
  if (!entries || entries.length === 0) {
    errors.push('Report contains no emission entries');
  }

  // Check 2: All entries are validated
  const unvalidated = entries.filter(e => e.validation_status === 'pending' || e.validation_status === 'rejected');
  if (unvalidated.length > 0) {
    errors.push(`${unvalidated.length} entries not validated`);
  }

  // Check 3: All entries have required fields
  const incomplete = entries.filter(e => !e.hs_code || !e.net_mass_tonnes || !e.country_of_origin);
  if (incomplete.length > 0) {
    errors.push(`${incomplete.length} entries missing required fields`);
  }

  // Check 4: Installation data available
  const missingInstallations = entries.filter(e => e.installation_id && !installations.find(i => i.id === e.installation_id));
  if (missingInstallations.length > 0) {
    errors.push(`${missingInstallations.length} entries reference missing installations`);
  }

  return {
    passed: errors.length === 0,
    errors
  };
};

const buildSubmissionPayload = (report, entries, installations) => {
  // This would build the official EU CBAM XML/JSON format
  // Simplified for demo purposes
  return {
    reportingPeriod: report.period,
    reportingYear: report.year,
    declarantEORI: 'EU123456789', // Would come from auth context
    totalEmissions: report.total_emissions,
    totalDirectEmissions: report.total_direct_emissions,
    totalIndirectEmissions: report.total_indirect_emissions,
    certificatesRequired: report.certificates_required,
    entries: entries.map(e => ({
      importId: e.import_id,
      cnCode: e.hs_code,
      countryOfOrigin: e.country_of_origin,
      netMass: e.net_mass_tonnes,
      embeddedEmissions: e.total_embedded_emissions,
      directEmissions: e.direct_emissions_specific,
      indirectEmissions: e.indirect_emissions_specific,
      calculationMethod: e.calculation_method,
      installationId: e.installation_id,
      carbonPricePaid: e.carbon_price_paid,
      evidenceDocuments: e.evidence_documents
    })),
    installations: installations.map(i => ({
      installationId: i.id,
      name: i.name,
      country: i.country,
      coordinates: { lat: i.latitude, lon: i.longitude },
      productionTechnology: i.production_technology
    })),
    timestamp: new Date().toISOString()
  };
};

const mockRegistrySubmission = async (payload) => {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simulate 95% success rate
  if (Math.random() > 0.95) {
    throw new Error('Registry timeout - please retry');
  }

  // Generate mock transaction ID
  const transactionId = `CBAM-${payload.reportingYear}-${payload.reportingPeriod}-${Date.now().toString(36).toUpperCase()}`;

  return {
    transactionId,
    message: 'Report successfully submitted to EU CBAM Registry. Awaiting verification.',
    status: 'pending_verification',
    estimatedVerificationTime: '3-5 business days'
  };
};

// Check Submission Status (for tracking)
export const checkSubmissionStatus = async (transactionId) => {
  // Mock status check - would call real registry API
  await new Promise(resolve => setTimeout(resolve, 1000));

  const statuses = ['pending_verification', 'verified', 'accepted', 'requires_clarification'];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  return {
    transactionId,
    status: randomStatus,
    lastUpdated: new Date().toISOString(),
    message: getStatusMessage(randomStatus)
  };
};

const getStatusMessage = (status) => {
  const messages = {
    'pending_verification': 'Your report is being reviewed by EU authorities',
    'verified': 'Report verified - awaiting final acceptance',
    'accepted': 'Report accepted by EU CBAM Registry',
    'requires_clarification': 'Additional information required - check your email'
  };
  return messages[status] || 'Status unknown';
};
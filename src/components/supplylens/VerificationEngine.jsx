import { base44 } from '@/api/base44Client';
import { format, addDays } from 'date-fns';

// Verification rules based on questionnaire responses
const VERIFICATION_RULES = {
  pfas: {
    uses_pfas: {
      trigger_value: 'yes',
      verifications: [
        {
          type: 'database_check',
          verification_type: 'pfas_database',
          title: 'PFAS Chemical Database Cross-Reference',
          description: 'Automated cross-reference of declared PFAS substances against ECHA SVHC list and EPA PFAS database.',
          due_days: 3
        },
        {
          type: 'test_report_request',
          title: 'Request PFAS Lab Test Reports',
          description: 'Request third-party laboratory test reports confirming PFAS content levels in products.',
          required_documents: ['PFAS Lab Test Certificate', 'Material Safety Data Sheet (MSDS)', 'Chemical Composition Declaration'],
          due_days: 14
        }
      ]
    },
    pfas_in_products: {
      trigger_value: 'yes',
      verifications: [
        {
          type: 'test_report_request',
          title: 'Product PFAS Content Testing',
          description: 'Request product-specific PFAS testing to verify concentration levels comply with regulatory limits.',
          required_documents: ['Product Test Report', 'Certificate of Analysis'],
          due_days: 21
        }
      ]
    },
    no_pfas_phase_out_plan: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'documentation',
          title: 'PFAS Elimination Roadmap Required',
          description: 'Supplier must provide a detailed PFAS phase-out plan with timelines and alternative materials.',
          required_documents: ['PFAS Phase-Out Plan', 'Alternative Materials Assessment'],
          due_days: 30
        }
      ]
    }
  },
  eudr: {
    traceable_to_origin: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'documentation',
          title: 'Supply Chain Traceability Documentation',
          description: 'Request detailed supply chain mapping and traceability documentation to plot of land.',
          required_documents: ['Supply Chain Map', 'Origin Certificates', 'GPS Coordinates Documentation'],
          due_days: 21
        }
      ]
    },
    deforestation_free: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'database_check',
          verification_type: 'deforestation_satellite',
          title: 'Satellite Deforestation Analysis',
          description: 'Automated satellite imagery analysis of supplier source regions for deforestation activity post Dec 2020.',
          due_days: 7
        },
        {
          type: 'audit_request',
          title: 'On-Site Deforestation Audit',
          description: 'Schedule third-party on-site audit to verify deforestation-free claims.',
          required_documents: ['Audit Scope Agreement', 'Site Access Authorization'],
          due_days: 45
        }
      ]
    },
    high_risk_country: {
      trigger_value: 'yes',
      verifications: [
        {
          type: 'documentation',
          title: 'Enhanced Due Diligence Package',
          description: 'Request enhanced due diligence documentation for high-risk country sourcing.',
          required_documents: ['Risk Mitigation Plan', 'Independent Verification Report', 'Legality Certificates'],
          due_days: 30
        }
      ]
    }
  },
  cbam: {
    emissions_data_available: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'documentation',
          title: 'Request Emissions Data Collection',
          description: 'Supplier must provide embedded emissions data for CBAM reporting.',
          required_documents: ['Emissions Calculation Methodology', 'Production Process Data', 'Energy Consumption Records'],
          due_days: 30
        }
      ]
    },
    third_party_verified: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'database_check',
          verification_type: 'emissions_registry',
          title: 'Emissions Registry Verification',
          description: 'Cross-reference declared emissions with EU ETS registry and national registries.',
          due_days: 5
        },
        {
          type: 'audit_request',
          title: 'Third-Party Emissions Verification',
          description: 'Request third-party verification of declared carbon emissions.',
          required_documents: ['Verification Statement', 'Emissions Report ISO 14064'],
          due_days: 60
        }
      ]
    }
  },
  human_rights: {
    no_child_labor: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'audit_request',
          title: 'Urgent Child Labor Audit',
          description: 'CRITICAL: Immediate third-party audit required due to potential child labor concerns.',
          required_documents: ['Age Verification Records', 'Worker Registry', 'Independent Audit Report'],
          due_days: 14,
          severity: 'critical'
        }
      ]
    },
    no_forced_labor: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'audit_request',
          title: 'Urgent Forced Labor Investigation',
          description: 'CRITICAL: Immediate investigation required due to potential forced labor indicators.',
          required_documents: ['Worker Contracts', 'Wage Payment Records', 'Freedom of Movement Evidence'],
          due_days: 14,
          severity: 'critical'
        },
        {
          type: 'database_check',
          verification_type: 'sanctions_screening',
          title: 'Sanctions & Forced Labor Database Screening',
          description: 'Screen supplier against UFLPA Entity List, UK Modern Slavery registry, and sanctions databases.',
          due_days: 1
        }
      ]
    },
    living_wage: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'documentation',
          title: 'Wage Documentation Review',
          description: 'Request wage records and comparison to local living wage benchmarks.',
          required_documents: ['Payroll Records', 'Living Wage Gap Analysis', 'Remediation Plan'],
          due_days: 21
        }
      ]
    }
  },
  environmental: {
    environmental_management: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'documentation',
          title: 'Environmental Management System Setup',
          description: 'Request supplier to implement and document environmental management practices.',
          required_documents: ['Environmental Policy', 'EMS Implementation Plan', 'Target KPIs'],
          due_days: 60
        }
      ]
    },
    emissions_monitoring: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'documentation',
          title: 'Emissions Monitoring Setup',
          description: 'Request implementation of emissions monitoring and reporting capabilities.',
          required_documents: ['Monitoring Plan', 'Baseline Emissions Report'],
          due_days: 45
        }
      ]
    }
  },
  general: {
    certified_management_system: {
      trigger_value: 'no',
      verifications: [
        {
          type: 'database_check',
          verification_type: 'certification_check',
          title: 'Certification Database Verification',
          description: 'Verify any claimed certifications against official certification body databases.',
          due_days: 3
        }
      ]
    }
  }
};

// Simulate external database checks (in production, these would call actual APIs)
async function performDatabaseCheck(verificationType, supplier, taskData) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const results = {
    pfas_database: {
      checked_databases: ['ECHA SVHC List', 'EPA PFAS Master List', 'REACH Registry'],
      matches_found: Math.random() > 0.7 ? 2 : 0,
      risk_substances: Math.random() > 0.7 ? ['PFOA', 'PFOS'] : [],
      recommendation: Math.random() > 0.7 ? 'High-concern substances detected. Request detailed substance inventory.' : 'No high-concern PFAS substances identified in databases.',
      verified_at: new Date().toISOString()
    },
    deforestation_satellite: {
      analysis_provider: 'Global Forest Watch',
      region_analyzed: supplier.country,
      deforestation_detected: Math.random() > 0.8,
      forest_loss_hectares: Math.random() > 0.8 ? Math.round(Math.random() * 500) : 0,
      confidence_level: '92%',
      imagery_date: format(addDays(new Date(), -30), 'yyyy-MM-dd'),
      recommendation: Math.random() > 0.8 ? 'Potential deforestation activity detected. On-site verification recommended.' : 'No significant deforestation activity detected in analyzed period.',
      verified_at: new Date().toISOString()
    },
    emissions_registry: {
      checked_registries: ['EU ETS Registry', 'National GHG Registries'],
      installation_found: Math.random() > 0.5,
      reported_emissions_tco2: Math.random() > 0.5 ? Math.round(Math.random() * 50000) : null,
      verification_status: Math.random() > 0.5 ? 'Third-party verified' : 'Self-reported',
      recommendation: Math.random() > 0.5 ? 'Emissions data found in registry. Cross-reference with supplier declaration.' : 'No registry entry found. Request direct emissions data.',
      verified_at: new Date().toISOString()
    },
    sanctions_screening: {
      checked_lists: ['UFLPA Entity List', 'UK Modern Slavery Registry', 'OFAC SDN', 'EU Sanctions List'],
      matches_found: Math.random() > 0.9 ? 1 : 0,
      match_details: Math.random() > 0.9 ? ['Potential match on UFLPA Entity List - manual review required'] : [],
      risk_level: Math.random() > 0.9 ? 'HIGH' : 'LOW',
      recommendation: Math.random() > 0.9 ? 'CRITICAL: Potential sanctions match detected. Halt engagement pending review.' : 'No matches found on screened sanctions lists.',
      verified_at: new Date().toISOString()
    },
    certification_check: {
      claimed_certifications: ['ISO 9001', 'ISO 14001'],
      verified_certifications: Math.random() > 0.3 ? ['ISO 9001'] : ['ISO 9001', 'ISO 14001'],
      unverified: Math.random() > 0.3 ? ['ISO 14001'] : [],
      certification_bodies_checked: ['BSI', 'TÜV', 'SGS', 'Bureau Veritas'],
      recommendation: Math.random() > 0.3 ? 'Some certifications could not be verified. Request certificate copies.' : 'All claimed certifications verified.',
      verified_at: new Date().toISOString()
    }
  };
  
  return results[verificationType] || { error: 'Unknown verification type' };
}

export async function triggerVerificationWorkflow(completedTask, supplier, contacts) {
  const { questionnaire_type, response_data, id: triggeredByTaskId } = completedTask;
  
  if (!questionnaire_type || !response_data) return [];
  
  const rules = VERIFICATION_RULES[questionnaire_type];
  if (!rules) return [];
  
  const createdTasks = [];
  const today = new Date();
  
  for (const [responseKey, responseValue] of Object.entries(response_data)) {
    const rule = rules[responseKey];
    if (!rule) continue;
    
    // Check if response triggers verification
    const triggers = responseValue === rule.trigger_value || 
                    (rule.trigger_value === 'yes' && responseValue === true) ||
                    (rule.trigger_value === 'no' && responseValue === false);
    
    if (!triggers) continue;
    
    // Create verification tasks
    for (const verification of rule.verifications) {
      const task = {
        supplier_id: supplier.id,
        task_type: verification.type,
        title: verification.title,
        description: verification.description,
        status: 'pending',
        due_date: format(addDays(today, verification.due_days), 'yyyy-MM-dd'),
        triggered_by_task_id: triggeredByTaskId,
        verification_type: verification.verification_type || null,
        required_documents: verification.required_documents || [],
        notes: `Auto-triggered by ${questionnaire_type} questionnaire response: ${responseKey} = ${responseValue}`
      };
      
      const created = await base44.entities.OnboardingTask.create(task);
      createdTasks.push(created);
      
      // If it's a database check, run it automatically
      if (verification.type === 'database_check' && verification.verification_type) {
        // Run async - don't await to avoid blocking
        runAutomatedVerification(created.id, verification.verification_type, supplier);
      }
      
      // Create critical alert if severity is critical
      if (verification.severity === 'critical') {
        await base44.entities.RiskAlert.create({
          supplier_id: supplier.id,
          alert_type: 'human_rights',
          severity: 'critical',
          title: `Critical Verification Required: ${verification.title}`,
          description: `Questionnaire response triggered critical verification workflow. Immediate action required.`,
          source: 'Verification Engine',
          status: 'open'
        });
      }
    }
  }
  
  return createdTasks;
}

export async function runAutomatedVerification(taskId, verificationType, supplier) {
  try {
    // Update task to in_progress
    await base44.entities.OnboardingTask.update(taskId, {
      status: 'in_progress'
    });
    
    // Perform the database check
    const result = await performDatabaseCheck(verificationType, supplier, {});
    
    // Determine if verification passed or needs attention
    const needsAttention = result.matches_found > 0 || 
                          result.deforestation_detected || 
                          result.risk_level === 'HIGH' ||
                          (result.unverified && result.unverified.length > 0);
    
    // Update task with results
    await base44.entities.OnboardingTask.update(taskId, {
      status: needsAttention ? 'failed' : 'verified',
      completed_date: new Date().toISOString(),
      verification_result: result
    });
    
    // Create alert if issues found
    if (needsAttention) {
      await base44.entities.RiskAlert.create({
        supplier_id: supplier.id,
        alert_type: 'compliance',
        severity: result.risk_level === 'HIGH' ? 'critical' : 'warning',
        title: `Verification Alert: ${verificationType.replace('_', ' ')}`,
        description: result.recommendation,
        source: 'Verification Engine',
        status: 'open'
      });
    }
    
    return result;
  } catch (error) {
    console.error('Verification error:', error);
    return null;
  }
}

export async function requestDocuments(task, supplier, contacts) {
  const primaryContact = contacts.find(c => c.supplier_id === supplier.id && c.is_primary) 
    || contacts.find(c => c.supplier_id === supplier.id);
  
  if (!primaryContact?.email) {
    throw new Error('No contact email found. Please add a contact person with an email address to this supplier.');
  }
  
  const documentList = (task.required_documents || []).map(doc => `• ${doc}`).join('\n');
  
  const emailBody = `
Dear ${primaryContact.name || 'Supplier Partner'},

As part of our ongoing due diligence process, we require the following documentation from ${supplier.legal_name}:

${documentList}

**Task:** ${task.title}
${task.description}

**Deadline:** ${format(new Date(task.due_date), 'MMMM d, yyyy')}

Please upload these documents through our supplier portal or reply to this email with the requested files attached.

This documentation is essential for maintaining compliance and continuing our business relationship.

Best regards,
Supplier Compliance Team
  `.trim();

  await base44.integrations.Core.SendEmail({
    to: primaryContact.email,
    subject: `Documentation Required: ${task.title} - ${supplier.legal_name}`,
    body: emailBody
  });

  await base44.entities.OnboardingTask.update(task.id, {
    status: 'sent',
    sent_date: new Date().toISOString()
  });

  return { sent: true, email: primaryContact.email };
}

// AI-Powered Document Analysis for Compliance
export async function analyzeUploadedDocument(documentUrl, documentType, supplier, task) {
  try {
    const analysisPrompt = `
      Analyze this ${documentType} document for compliance flags, completeness, and validity.
      
      Supplier: ${supplier.legal_name} (${supplier.country})
      Document Type: ${documentType}
      Verification Context: ${task?.title || 'General Compliance'}
      
      Check for:
      1. Document authenticity indicators (official stamps, signatures, letterheads)
      2. Expiration dates and validity periods
      3. Completeness of required information
      4. Red flags or concerning statements
      5. Compliance with stated requirements
      6. Missing information or gaps
      7. Inconsistencies with supplier's declared information
      
      Return detailed analysis with actionable findings.
    `;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: [documentUrl],
      response_json_schema: {
        type: "object",
        properties: {
          is_valid: { type: "boolean" },
          confidence_score: { type: "number" },
          authenticity_check: {
            type: "object",
            properties: {
              has_official_stamps: { type: "boolean" },
              has_signatures: { type: "boolean" },
              appears_authentic: { type: "boolean" }
            }
          },
          completeness_score: { type: "number" },
          expiration_date: { type: "string" },
          is_expired: { type: "boolean" },
          compliance_flags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                flag_type: { type: "string" },
                severity: { type: "string", enum: ["info", "warning", "critical"] },
                description: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          missing_information: { type: "array", items: { type: "string" } },
          inconsistencies: { type: "array", items: { type: "string" } },
          overall_assessment: { type: "string" },
          recommended_action: { type: "string", enum: ["accept", "request_clarification", "request_resubmission", "escalate"] }
        }
      }
    });

    return result;
  } catch (error) {
    console.error('Document analysis failed:', error);
    return null;
  }
}

// Generate Follow-Up Tasks Based on Document Analysis
export async function generateFollowUpTasks(documentAnalysis, supplier, originalTask) {
  const followUpTasks = [];
  const today = new Date();

  if (!documentAnalysis || documentAnalysis.is_valid) {
    return followUpTasks; // No follow-up needed if document is valid
  }

  // Handle critical flags
  const criticalFlags = documentAnalysis.compliance_flags?.filter(f => f.severity === 'critical') || [];
  for (const flag of criticalFlags) {
    const task = await base44.entities.OnboardingTask.create({
      supplier_id: supplier.id,
      task_type: 'documentation',
      title: `CRITICAL: ${flag.flag_type}`,
      description: `${flag.description}\n\nRecommendation: ${flag.recommendation}`,
      status: 'pending',
      due_date: format(addDays(today, 7), 'yyyy-MM-dd'),
      triggered_by_task_id: originalTask?.id
    });
    followUpTasks.push(task);

    // Create critical alert
    await base44.entities.RiskAlert.create({
      supplier_id: supplier.id,
      alert_type: 'compliance',
      severity: 'critical',
      title: `Document Compliance Issue: ${flag.flag_type}`,
      description: flag.description,
      source: 'Document Analysis AI',
      status: 'open'
    });
  }

  // Handle missing information
  if (documentAnalysis.missing_information?.length > 0) {
    const task = await base44.entities.OnboardingTask.create({
      supplier_id: supplier.id,
      task_type: 'documentation',
      title: 'Request Missing Document Information',
      description: `The submitted document is incomplete. Missing information:\n${documentAnalysis.missing_information.map(i => `• ${i}`).join('\n')}`,
      status: 'pending',
      due_date: format(addDays(today, 14), 'yyyy-MM-dd'),
      required_documents: ['Updated document with complete information'],
      triggered_by_task_id: originalTask?.id
    });
    followUpTasks.push(task);
  }

  // Handle inconsistencies
  if (documentAnalysis.inconsistencies?.length > 0) {
    const task = await base44.entities.OnboardingTask.create({
      supplier_id: supplier.id,
      task_type: 'verification',
      title: 'Clarify Document Inconsistencies',
      description: `Inconsistencies detected:\n${documentAnalysis.inconsistencies.map(i => `• ${i}`).join('\n')}\n\nPlease provide clarification.`,
      status: 'pending',
      due_date: format(addDays(today, 10), 'yyyy-MM-dd'),
      triggered_by_task_id: originalTask?.id
    });
    followUpTasks.push(task);
  }

  // Handle expiration
  if (documentAnalysis.is_expired) {
    const task = await base44.entities.OnboardingTask.create({
      supplier_id: supplier.id,
      task_type: 'documentation',
      title: 'Submit Updated Document (Expired)',
      description: `The submitted document expired on ${documentAnalysis.expiration_date}. Please submit a current version.`,
      status: 'pending',
      due_date: format(addDays(today, 7), 'yyyy-MM-dd'),
      required_documents: ['Updated non-expired document'],
      triggered_by_task_id: originalTask?.id
    });
    followUpTasks.push(task);
  }

  return followUpTasks;
}
/**
 * EUDAMED AI Service - Automates report generation, root cause analysis, and data aggregation
 */

import { base44 } from '@/api/base44Client';

/**
 * AI-powered root cause analysis for incidents
 */
export const analyzeIncidentRootCause = async (incident, device) => {
  const prompt = `As a medical device safety expert, analyze this incident and suggest the most likely root causes following EU MDR requirements.

Incident Details:
- Device: ${device?.device_name} (${device?.risk_class})
- Incident Type: ${incident?.incident_type}
- Date: ${incident?.incident_date}
- Description: ${incident?.description}
- Patient Outcome: ${incident?.patient_outcome}
- Country: ${incident?.country_of_incident}

Consider:
1. Device design and manufacturing
2. User error or misuse
3. Labeling or IFU inadequacy
4. Material degradation
5. Software/firmware issues (if applicable)
6. Sterilization/packaging issues (if applicable)

Provide:
- Primary root cause (most likely)
- Contributing factors
- Recommended corrective actions
- Preventive actions to avoid recurrence
- Risk level assessment

Return structured JSON.`;

  const analysis = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        primary_root_cause: { type: "string" },
        contributing_factors: { type: "array", items: { type: "string" } },
        corrective_actions: { type: "array", items: { type: "string" } },
        preventive_actions: { type: "array", items: { type: "string" } },
        risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
        mdr_article_references: { type: "array", items: { type: "string" } }
      }
    }
  });

  return analysis;
};

/**
 * Pre-fill MIR (Manufacturer Incident Report) data
 */
export const preFillMIRData = async (incident, device, manufacturer) => {
  const rootCauseAnalysis = await analyzeIncidentRootCause(incident, device);

  return {
    report_metadata: {
      report_type: "Manufacturer Incident Report (MIR)",
      report_reference: `MIR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      submission_date: new Date().toISOString(),
      manufacturer_srn: manufacturer?.srn || 'SRN-PENDING'
    },
    device_information: {
      udi_di: device?.udi_di,
      basic_udi_di: device?.basic_udi_di,
      device_name: device?.device_name,
      risk_class: device?.risk_class,
      gmdn_code: device?.gmdn_code,
      gmdn_term: device?.gmdn_term
    },
    incident_details: {
      incident_date: incident?.incident_date,
      country: incident?.country_of_incident,
      description: incident?.description,
      patient_outcome: incident?.patient_outcome,
      severity: incident?.incident_type
    },
    root_cause_analysis: rootCauseAnalysis,
    regulatory_references: {
      mdr_article: "Article 87",
      reporting_timeline: "Immediate (causal relationship established)",
      competent_authority_notified: true
    }
  };
};

/**
 * Pre-fill FSCA (Field Safety Corrective Action) data
 */
export const preFillFSCAData = async (incident, device, manufacturer) => {
  const mirData = await preFillMIRData(incident, device, manufacturer);

  return {
    ...mirData,
    report_metadata: {
      ...mirData.report_metadata,
      report_type: "Field Safety Corrective Action (FSCA)",
      report_reference: `FSCA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    },
    corrective_action_plan: {
      action_type: "Recall/Correction/Advisory",
      affected_devices: incident?.affected_devices_count || 0,
      lot_batch_numbers: incident?.lot_batch_numbers || [],
      implementation_timeline: "To be determined",
      customer_notification_method: "Field Safety Notice (FSN)"
    }
  };
};

/**
 * Aggregate clinical investigation data and generate summary
 */
export const generateClinicalInvestigationSummary = async (study, device, saeEvents) => {
  const prompt = `Generate a comprehensive Clinical Investigation Summary Report for EUDAMED submission following EU MDR Annex XV requirements.

Study Details:
- Title: ${study?.investigation_title}
- Protocol: ${study?.protocol_number}
- Type: ${study?.investigation_type}
- Device: ${device?.device_name} (${device?.risk_class})
- Status: ${study?.status}
- Enrollment: ${study?.actual_enrollment || 0}/${study?.estimated_enrollment || 0}
- SAEs Reported: ${study?.serious_adverse_events || 0}
- Countries: ${study?.participating_countries?.join(', ')}

Generate executive summary covering:
1. Study objectives and rationale
2. Study design and methodology
3. Patient population and inclusion/exclusion criteria
4. Primary and secondary endpoints
5. Safety results (SAEs, adverse events)
6. Efficacy results and clinical outcomes
7. Risk-benefit analysis
8. Conclusions and clinical implications

Format for regulatory submission.`;

  const summary = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        executive_summary: { type: "string" },
        study_objectives: { type: "string" },
        methodology: { type: "string" },
        patient_population: { type: "string" },
        safety_results: { type: "string" },
        efficacy_results: { type: "string" },
        risk_benefit_analysis: { type: "string" },
        conclusions: { type: "string" },
        regulatory_compliance_statement: { type: "string" }
      }
    }
  });

  return {
    report_metadata: {
      report_type: "Clinical Investigation Summary",
      report_reference: `CIS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      submission_date: new Date().toISOString()
    },
    study_information: {
      investigation_title: study?.investigation_title,
      protocol_number: study?.protocol_number,
      investigation_type: study?.investigation_type,
      sponsor_srn: study?.sponsor_id,
      ethics_approval: study?.ethics_committee_approval,
      start_date: study?.start_date,
      end_date: study?.end_date
    },
    device_information: {
      udi_di: device?.udi_di,
      device_name: device?.device_name,
      risk_class: device?.risk_class
    },
    enrollment_data: {
      estimated: study?.estimated_enrollment,
      actual: study?.actual_enrollment,
      participating_countries: study?.participating_countries,
      participating_sites: study?.participating_sites?.length || 0
    },
    safety_data: {
      total_saes: study?.serious_adverse_events || 0,
      sae_details: saeEvents?.map(e => ({
        date: e.incident_date,
        outcome: e.patient_outcome,
        description: e.description
      })) || []
    },
    summary_report: summary
  };
};

/**
 * Generate PSUR (Periodic Safety Update Report)
 */
export const generatePSURData = async (device, incidentsInPeriod, periodStart, periodEnd) => {
  const prompt = `Generate a Periodic Safety Update Report (PSUR) summary for this medical device covering the reporting period.

Device: ${device?.device_name} (${device?.udi_di})
Risk Class: ${device?.risk_class}
Reporting Period: ${periodStart} to ${periodEnd}
Total Incidents: ${incidentsInPeriod?.length || 0}

Incident Summary:
${incidentsInPeriod?.map((inc, i) => `${i + 1}. ${inc.incident_type} - ${inc.patient_outcome} (${inc.incident_date})`).join('\n') || 'No incidents'}

Analyze:
1. Overall safety profile during period
2. Trend analysis (increasing/decreasing incidents)
3. New safety signals identified
4. Risk-benefit assessment
5. Recommended actions or label updates

Return structured analysis per MDR Annex III requirements.`;

  const analysis = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        executive_summary: { type: "string" },
        incident_summary: { type: "string" },
        trend_analysis: { type: "string" },
        new_safety_signals: { type: "array", items: { type: "string" } },
        risk_benefit_conclusion: { type: "string" },
        recommended_actions: { type: "array", items: { type: "string" } }
      }
    }
  });

  return {
    report_metadata: {
      report_type: "Periodic Safety Update Report (PSUR)",
      report_reference: `PSUR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      reporting_period_start: periodStart,
      reporting_period_end: periodEnd,
      submission_date: new Date().toISOString()
    },
    device_information: {
      udi_di: device?.udi_di,
      device_name: device?.device_name,
      risk_class: device?.risk_class
    },
    safety_data: {
      total_incidents: incidentsInPeriod?.length || 0,
      serious_incidents: incidentsInPeriod?.filter(i => i.incident_type === 'Serious Incident').length || 0,
      fsca_issued: incidentsInPeriod?.filter(i => i.incident_type === 'Field Safety Corrective Action').length || 0
    },
    analysis: analysis
  };
};
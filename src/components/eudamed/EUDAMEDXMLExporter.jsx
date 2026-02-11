/**
 * EUDAMED XML Export Service - Generates compliant XML for submission
 */

import { base44 } from '@/api/base44Client';

export const generateEUDAMEDXML = async (reportType, data) => {
  const prompt = `Generate a valid EUDAMED XML file for ${reportType} following EU MDR/IVDR Article 87 requirements, Regulation 2025/1021 format, and ISO 15223-1 standards.

Report Data:
${JSON.stringify(data, null, 2)}

CRITICAL REQUIREMENTS:
1. XML Declaration: <?xml version="1.0" encoding="UTF-8"?>
2. Root element with EUDAMED namespace: <eudamed:report xmlns:eudamed="http://ec.europa.eu/eudamed/v1">
3. Report Header:
   - <reportMetadata>
     - <reportReference>${data?.report_metadata?.report_reference}</reportReference>
     - <reportType>${reportType}</reportType>
     - <submissionDate>${data?.report_metadata?.submission_date}</submissionDate>
     - <manufacturerSRN>${data?.report_metadata?.manufacturer_srn}</manufacturerSRN>
   </reportMetadata>

4. Device Information (mandatory):
   - <deviceInformation>
     - <udiDI>${data?.device_information?.udi_di}</udiDI>
     - <basicUdiDI>${data?.device_information?.basic_udi_di || ''}</basicUdiDI>
     - <deviceName>${data?.device_information?.device_name}</deviceName>
     - <riskClass>${data?.device_information?.risk_class}</riskClass>
     - <gmdnCode>${data?.device_information?.gmdn_code || ''}</gmdnCode>
     - <gmdnTerm>${data?.device_information?.gmdn_term || ''}</gmdnTerm>
   </deviceInformation>

5. Incident/Event Details (if applicable):
   - <incidentDetails>
     - <incidentDate>${data?.incident_details?.incident_date}</incidentDate>
     - <country>${data?.incident_details?.country}</country>
     - <description><![CDATA[${data?.incident_details?.description}]]></description>
     - <patientOutcome>${data?.incident_details?.patient_outcome}</patientOutcome>
     - <severity>${data?.incident_details?.severity}</severity>
   </incidentDetails>

6. Root Cause Analysis (for MIR/FSCA):
   - <rootCauseAnalysis>
     - <primaryCause><![CDATA[${data?.root_cause_analysis?.primary_root_cause}]]></primaryCause>
     - <contributingFactors>... (array)</contributingFactors>
     - <correctiveActions>... (array)</correctiveActions>
     - <riskLevel>${data?.root_cause_analysis?.risk_level}</riskLevel>
   </rootCauseAnalysis>

7. Regulatory References:
   - <regulatoryReferences>
     - <mdrArticle>Article 87</mdrArticle>
     - <reportingTimeline>${data?.regulatory_references?.reporting_timeline}</reportingTimeline>
   </regulatoryReferences>

Generate complete, well-formed XML with proper encoding, CDATA sections for text fields, and all mandatory elements.
Ensure compliance with EUDAMED XML schema validation requirements.`;

  const xmlContent = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true
  });

  return typeof xmlContent === 'string' ? xmlContent : JSON.stringify(xmlContent);
};

export const validateXMLStructure = async (xmlContent) => {
  const prompt = `Validate this EUDAMED XML for compliance with EU MDR/IVDR reporting requirements:

${xmlContent}

Check for:
- Valid XML structure
- Required fields present (UDI-DI, SRN, dates, descriptions)
- Correct namespace declarations
- Data format compliance (dates, codes)
- Mandatory vs optional fields
- Schema validation

Return JSON with:
- is_valid: boolean
- errors: array of error messages
- warnings: array of warning messages
- compliance_score: 0-100`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        is_valid: { type: "boolean" },
        errors: { type: "array", items: { type: "string" } },
        warnings: { type: "array", items: { type: "string" } },
        compliance_score: { type: "number" }
      }
    }
  });

  return result;
};
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Intelligent Document Classifier & Extractor
 * Recognizes document types and extracts relevant data accordingly
 * Uses AI to understand context and extract structured data
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, supplier_id } = await req.json();

    // Step 1: Classify document type using AI
    const classificationResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this document and classify its type. Return the document category and what data can be extracted.
      
DOCUMENT CATEGORIES:
1. company_registration: Business license, company registration certificate
2. tax_certificate: VAT certificate, tax registration
3. quality_certificate: ISO 9001, ISO 14001, ISO 45001, ISO 13485, etc.
4. social_audit: SMETA, SA8000, BSCI audit reports
5. financial_statement: Balance sheet, P&L, annual report
6. insurance_certificate: Product liability, professional indemnity
7. conflict_minerals_declaration: CMRT, RMI declaration
8. reach_declaration: SVHC declaration, SDS, REACH compliance
9. carbon_report: GHG inventory, CDP disclosure, carbon footprint
10. modern_slavery_statement: UK Modern Slavery Act statement
11. code_of_conduct: Business ethics policy
12. product_datasheet: Technical specifications, product catalog
13. capability_statement: Manufacturing capabilities, capacity info
14. contract: Supply agreement, purchase order
15. other: General correspondence

Analyze the document and determine:
- Primary category (from list above)
- Confidence level (0-100)
- What specific data fields can be extracted
- Document validity/expiry date if applicable`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { type: "string" },
          confidence: { type: "number" },
          extractable_fields: { type: "array", items: { type: "string" } },
          expiry_date: { type: "string" },
          summary: { type: "string" }
        }
      }
    });

    const docType = classificationResult.document_type;
    let extractedData = {};

    // Step 2: Extract data based on document type
    switch (docType) {
      case 'company_registration':
        extractedData = await extractCompanyRegistration(base44, file_url);
        break;
      case 'quality_certificate':
        extractedData = await extractQualityCertificate(base44, file_url);
        break;
      case 'social_audit':
        extractedData = await extractSocialAudit(base44, file_url);
        break;
      case 'financial_statement':
        extractedData = await extractFinancialStatement(base44, file_url);
        break;
      case 'conflict_minerals_declaration':
        extractedData = await extractConflictMinerals(base44, file_url);
        break;
      case 'reach_declaration':
        extractedData = await extractReachCompliance(base44, file_url);
        break;
      case 'carbon_report':
        extractedData = await extractCarbonData(base44, file_url);
        break;
      case 'modern_slavery_statement':
        extractedData = await extractModernSlaveryData(base44, file_url);
        break;
      case 'capability_statement':
        extractedData = await extractCapabilities(base44, file_url);
        break;
      default:
        extractedData = await extractGenericData(base44, file_url);
    }

    // Step 3: Update supplier record with extracted data
    if (supplier_id && Object.keys(extractedData).length > 0) {
      await base44.entities.Supplier.update(supplier_id, extractedData);
    }

    return Response.json({
      success: true,
      classification: classificationResult,
      extracted_data: extractedData,
      fields_updated: Object.keys(extractedData).length,
      recommendation: getRecommendation(docType, extractedData)
    });

  } catch (error) {
    console.error('Document classification error:', error);
    return Response.json({ 
      error: 'Document classification failed', 
      details: error.message 
    }, { status: 500 });
  }
});

async function extractCompanyRegistration(base44, file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract company registration data:
- legal_name: Official registered name
- chamber_id: Registration number
- country: Country of registration
- city: City
- address: Full address
- incorporation_date: Date of incorporation
- legal_form: GmbH, AG, Ltd, Inc, etc.`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        legal_name: { type: "string" },
        chamber_id: { type: "string" },
        country: { type: "string" },
        city: { type: "string" },
        address: { type: "string" }
      }
    }
  });
  return result;
}

async function extractQualityCertificate(base44, file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract certificate data:
- certificate_type: ISO9001, ISO14001, ISO45001, ISO13485, SA8000, etc.
- certificate_number: Unique certificate ID
- issuing_body: Certification body name
- issue_date: Issue date
- expiry_date: Expiry date
- scope: Scope of certification
- certificate_url: File URL`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        certification: {
          type: "object",
          properties: {
            type: { type: "string" },
            certificate_number: { type: "string" },
            issuing_body: { type: "string" },
            issue_date: { type: "string" },
            expiry_date: { type: "string" },
            scope: { type: "string" }
          }
        }
      }
    }
  });
  
  return {
    certifications: [{ ...result.certification, certificate_url: file_url }]
  };
}

async function extractSocialAudit(base44, file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract social audit report data for CSDDD compliance:
- audit_provider: SMETA, SA8000, BSCI, etc.
- audit_date: Date of audit
- audit_score: Overall score/rating
- child_labor_prevention: Evidence of child labor prevention (boolean)
- forced_labor_prevention: Evidence of forced labor prevention (boolean)
- living_wage_commitment: Living wage paid (boolean)
- freedom_of_association: Union rights respected (boolean)
- working_hours_compliance: Working hours compliant (boolean)
- health_safety_management: H&S management system (boolean)
- key_findings: Summary of findings`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        csddd_human_rights_dd: {
          type: "object",
          properties: {
            child_labor_prevention: { type: "boolean" },
            forced_labor_prevention: { type: "boolean" },
            living_wage_commitment: { type: "boolean" },
            freedom_of_association: { type: "boolean" },
            working_hours_compliance: { type: "boolean" },
            health_safety_management: { type: "boolean" },
            last_social_audit_date: { type: "string" },
            social_audit_score: { type: "number" },
            social_audit_provider: { type: "string" }
          }
        }
      }
    }
  });
  return result;
}

async function extractFinancialStatement(base44, file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract financial data:
- annual_revenue_eur: Annual revenue in EUR
- employee_count: Number of employees
- reporting_year: Financial year`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        annual_revenue_eur: { type: "number" },
        employee_count: { type: "integer" }
      }
    }
  });
  return result;
}

async function extractConflictMinerals(base44, file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract conflict minerals declaration (3TG + Cobalt):
- uses_3tg: Uses tin, tantalum, tungsten, or gold (boolean)
- uses_cobalt: Uses cobalt (boolean)
- cmrt_completed: CMRT template completed (boolean)
- smelters_identified: Smelters identified (boolean)
- conflict_free_certified: Certified conflict-free (boolean)
- rmi_compliant: RMI compliant (boolean)`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        conflict_minerals: {
          type: "object",
          properties: {
            uses_3tg: { type: "boolean" },
            uses_cobalt: { type: "boolean" },
            cmrt_completed: { type: "boolean" },
            smelters_identified: { type: "boolean" },
            conflict_free_certified: { type: "boolean" },
            rmi_compliant: { type: "boolean" },
            cmrt_date: { type: "string" }
          }
        },
        conflict_minerals_relevant: { type: "boolean", default: true }
      }
    }
  });
  return result;
}

async function extractReachCompliance(base44, file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract REACH compliance data:
- svhc_declaration_current: Is SVHC declaration current/up-to-date? (boolean)
- svhc_substances_count: Number of SVHC substances
- rohs_compliant: RoHS compliant (boolean)
- last_svhc_update_date: Date of last update`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        reach_compliance: {
          type: "object",
          properties: {
            svhc_declaration_current: { type: "boolean" },
            svhc_substances_count: { type: "integer" },
            rohs_compliant: { type: "boolean" },
            last_svhc_update_date: { type: "string" }
          }
        },
        reach_relevant: { type: "boolean", default: true }
      }
    }
  });
  return result;
}

async function extractCarbonData(base44, file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract carbon/climate data:
- scope1_emissions_tco2e: Scope 1 emissions in tonnes CO2e
- scope2_emissions_tco2e: Scope 2 emissions in tonnes CO2e
- scope3_emissions_tco2e: Scope 3 emissions in tonnes CO2e (if available)
- baseline_year: Baseline/reporting year
- has_sbti_target: Has SBTi-approved target (boolean)
- net_zero_commitment: Net zero commitment (boolean)
- net_zero_target_year: Target year for net zero
- renewable_energy_percentage: Renewable energy percentage`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        carbon_performance: {
          type: "object",
          properties: {
            scope1_emissions_tco2e: { type: "number" },
            scope2_emissions_tco2e: { type: "number" },
            scope3_emissions_tco2e: { type: "number" },
            baseline_year: { type: "integer" },
            has_sbti_target: { type: "boolean" },
            net_zero_commitment: { type: "boolean" },
            net_zero_target_year: { type: "integer" },
            renewable_energy_percentage: { type: "number" }
          }
        }
      }
    }
  });
  return result;
}

async function extractModernSlaveryData(base44, file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract modern slavery statement data:
- modern_slavery_statement: Has modern slavery statement (boolean)
- grievance_mechanism: Grievance mechanism available (boolean)`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        csddd_human_rights_dd: {
          type: "object",
          properties: {
            modern_slavery_statement: { type: "boolean" },
            grievance_mechanism: { type: "boolean" }
          }
        }
      }
    }
  });
  return result;
}

async function extractCapabilities(base44, file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract operational capabilities:
- production_capacity_annual: Annual production capacity
- lead_time_days: Standard lead time in days
- moq: Minimum order quantity
- capabilities: List of manufacturing capabilities`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        production_capacity_annual: { type: "number" },
        lead_time_days: { type: "integer" },
        moq: { type: "number" },
        capabilities: { type: "array", items: { type: "string" } }
      }
    }
  });
  return result;
}

async function extractGenericData(base44, file_url) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract any relevant supplier information from this document.`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" }
      }
    }
  });
  return { notes: result.summary };
}

function getRecommendation(docType, extractedData) {
  const recommendations = [];
  
  if (docType === 'quality_certificate') {
    recommendations.push('✓ Certificate added. Monitor expiry date.');
  }
  
  if (docType === 'social_audit') {
    recommendations.push('✓ CSDDD human rights data updated. Review audit score.');
  }
  
  if (docType === 'carbon_report') {
    recommendations.push('✓ Carbon data updated. Consider requesting SBTi validation.');
  }
  
  if (docType === 'conflict_minerals_declaration') {
    recommendations.push('✓ Conflict minerals declaration received. Verify RMI compliance.');
  }
  
  return recommendations.length > 0 ? recommendations.join(' ') : 'Document processed successfully.';
}
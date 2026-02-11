/**
 * Validate Supplier Identifiers
 * Validates EORI, VAT, Chamber ID using external APIs and AI
 */

export default async function validateSupplierIdentifiers(context) {
  const { base44, data } = context;
  const { eori_number, vat_number, chamber_id, country, legal_name } = data;

  const validationResults = {
    eori: { valid: false, details: null },
    vat: { valid: false, details: null },
    chamber: { valid: false, details: null },
    overall_score: 0,
    warnings: [],
    recommendations: []
  };

  // EORI Validation (EU Economic Operators Registration and Identification)
  if (eori_number) {
    try {
      const eoriValidation = await base44.integrations.Core.InvokeLLM({
        prompt: `Validate EORI number: ${eori_number} for company: ${legal_name} in ${country}.

EORI format rules:
- Must start with 2-letter country code
- Followed by unique identifier (typically 12-15 characters)
- EU format: CCXXXXXXXXXX (e.g., DE123456789012)

Check:
1. Format correctness
2. Country code matches company location
3. Likely validity based on structure
4. Any red flags

Search for this EORI in European Commission databases and business registries.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            valid: { type: "boolean" },
            format_correct: { type: "boolean" },
            country_match: { type: "boolean" },
            status: { type: "string" },
            details: { type: "string" },
            confidence: { type: "number" }
          }
        }
      });

      validationResults.eori = eoriValidation;
      
      if (!eoriValidation.valid) {
        validationResults.warnings.push(`EORI validation failed: ${eoriValidation.details}`);
      }
    } catch (error) {
      validationResults.warnings.push("EORI validation service unavailable");
    }
  }

  // VAT Validation (VIES - VAT Information Exchange System)
  if (vat_number) {
    try {
      const vatValidation = await base44.integrations.Core.InvokeLLM({
        prompt: `Validate EU VAT number: ${vat_number} for ${legal_name} in ${country}.

VAT format by country:
- DE: DE123456789 (9 digits)
- FR: FR12345678901 (11 digits)
- IT: IT12345678901 (11 digits)
- ES: ES12345678X (9 characters)
- NL: NL123456789B01 (12 characters)

Check:
1. Format correctness for country
2. Checksum validation
3. Active status in VIES database
4. Company name match

Search VIES database and official tax registries.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            valid: { type: "boolean" },
            format_correct: { type: "boolean" },
            active: { type: "boolean" },
            company_name: { type: "string" },
            details: { type: "string" },
            confidence: { type: "number" }
          }
        }
      });

      validationResults.vat = vatValidation;
      
      if (!vatValidation.valid) {
        validationResults.warnings.push(`VAT validation failed: ${vatValidation.details}`);
      } else if (vatValidation.company_name && !vatValidation.company_name.toLowerCase().includes(legal_name.toLowerCase().split(' ')[0])) {
        validationResults.warnings.push(`VAT registered name mismatch: "${vatValidation.company_name}" vs "${legal_name}"`);
      }
    } catch (error) {
      validationResults.warnings.push("VAT validation service unavailable");
    }
  }

  // Chamber of Commerce / Company Registry Validation
  if (chamber_id) {
    try {
      const chamberValidation = await base44.integrations.Core.InvokeLLM({
        prompt: `Validate company registry ID: ${chamber_id} for ${legal_name} in ${country}.

Registry formats:
- Germany: HRB/HRA + number (e.g., HRB 12345)
- UK: Company number (e.g., 12345678)
- France: SIREN (9 digits)
- Netherlands: KvK number

Search official company registries and verify:
1. ID format correctness
2. Company active status
3. Legal name match
4. Registered address
5. Directors/beneficial owners if available`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            valid: { type: "boolean" },
            active: { type: "boolean" },
            registered_name: { type: "string" },
            registered_address: { type: "string" },
            incorporation_date: { type: "string" },
            details: { type: "string" },
            confidence: { type: "number" }
          }
        }
      });

      validationResults.chamber = chamberValidation;
      
      if (!chamberValidation.valid) {
        validationResults.warnings.push(`Company registry validation failed: ${chamberValidation.details}`);
      }
    } catch (error) {
      validationResults.warnings.push("Chamber validation service unavailable");
    }
  }

  // Comprehensive Due Diligence Check
  try {
    const dueDiligence = await base44.integrations.Core.InvokeLLM({
      prompt: `Perform comprehensive due diligence check for supplier:
      
Company: ${legal_name}
Country: ${country}
VAT: ${vat_number || 'N/A'}
EORI: ${eori_number || 'N/A'}

Search for:
1. Sanctions lists (OFAC, EU, UN)
2. Negative news (fraud, bankruptcy, lawsuits)
3. Credit ratings
4. Financial health indicators
5. Trade compliance violations
6. Export control violations
7. Anti-corruption red flags
8. Ultimate beneficial owners (UBO)

Provide risk assessment and recommendations.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          sanctions_found: { type: "boolean" },
          negative_news: { type: "boolean" },
          financial_risk: { type: "string" },
          compliance_issues: { type: "array", items: { type: "string" } },
          risk_score: { type: "number" },
          recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    if (dueDiligence.sanctions_found) {
      validationResults.warnings.push("⚠️ CRITICAL: Company found on sanctions lists!");
    }
    
    if (dueDiligence.compliance_issues?.length > 0) {
      validationResults.warnings.push(...dueDiligence.compliance_issues);
    }
    
    validationResults.recommendations.push(...dueDiligence.recommendations);
  } catch (error) {
    console.error("Due diligence check failed:", error);
  }

  // Calculate overall validation score
  const scores = [
    validationResults.eori.valid ? 100 : validationResults.eori.confidence || 0,
    validationResults.vat.valid ? 100 : validationResults.vat.confidence || 0,
    validationResults.chamber.valid ? 100 : validationResults.chamber.confidence || 0
  ];
  
  validationResults.overall_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // Add general recommendations
  if (validationResults.overall_score < 70) {
    validationResults.recommendations.push("Consider requesting additional documentation");
    validationResults.recommendations.push("Conduct enhanced due diligence before onboarding");
  }

  return {
    status: "success",
    validation_results: validationResults,
    validated_at: new Date().toISOString()
  };
}
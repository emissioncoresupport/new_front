/**
 * CBAM AI Assistant Service
 * Powered by LLM for intelligent compliance guidance
 */

import { base44 } from '@/api/base44Client';

export const getHSCodeSuggestion = async (productDescription) => {
  const prompt = `As a CBAM compliance expert, suggest the correct 8-digit CN (Combined Nomenclature) code for the following product:

Product Description: "${productDescription}"

Context: This is for EU CBAM (Carbon Border Adjustment Mechanism) reporting. The product must fall under one of these CBAM-covered goods categories:
- Cement (CN codes 2523-2525)
- Electricity (CN code 2716)
- Fertilizers (CN codes 2808, 2814, 2834, 3102, 3105)
- Iron & Steel (CN codes 7201-7229)
- Aluminium (CN codes 7601-7616)
- Hydrogen (CN code 2804)

Provide:
1. The most appropriate 8-digit CN code
2. Brief explanation why this code fits
3. Warning if the product might not be CBAM-covered

Format as JSON: {"cn_code": "12345678", "explanation": "...", "confidence": "high/medium/low", "cbam_covered": true/false}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        cn_code: { type: "string" },
        explanation: { type: "string" },
        confidence: { type: "string" },
        cbam_covered: { type: "boolean" },
        goods_type: { type: "string" },
        warning: { type: "string" }
      }
    }
  });

  return response;
};

export const getCalculationMethodSuggestion = async (context) => {
  const { productType, hasEmissionData, hasInstallationData, hasVerification } = context;

  const prompt = `As a CBAM expert, recommend the best calculation method for this import:

Product Type: ${productType}
Has Actual Emission Data from Producer: ${hasEmissionData ? 'Yes' : 'No'}
Has Installation Information: ${hasInstallationData ? 'Yes' : 'No'}
Has Third-Party Verification: ${hasVerification ? 'Yes' : 'No'}

EU CBAM allows:
1. "actual_data" - Requires verified installation-level emissions data (preferred, more accurate)
2. "default_values" - Uses EU benchmark values from regulation annex (simpler, conservative)

Recommend the appropriate method and explain why. Consider accuracy, compliance requirements, and available data.

Format as JSON: {"method": "actual_data" or "default_values", "rationale": "...", "data_requirements": ["..."]}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        method: { type: "string" },
        rationale: { type: "string" },
        data_requirements: { type: "array", items: { type: "string" } },
        accuracy_level: { type: "string" }
      }
    }
  });

  return response;
};

export const getProductionRouteSuggestion = async (context) => {
  const { goodsType, productDescription, originCountry } = context;

  const prompt = `Suggest the production route for CBAM compliance:

Goods Type: ${goodsType}
Product: ${productDescription}
Country of Origin: ${originCountry}

For Iron & Steel, routes are: BF/BOF (Blast Furnace/Basic Oxygen Furnace), DRI/EAF (Direct Reduced Iron/Electric Arc Furnace), Scrap/EAF (Scrap-based Electric Arc Furnace)
For Aluminium: Primary (electrolysis) or Secondary (recycled)
For Cement: Grey or White

Based on typical production methods in ${originCountry} for this type of product, suggest the most likely production route.

Format as JSON: {"production_route": "...", "explanation": "...", "typical_emissions_range": "X-Y tCO2e/t"}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        production_route: { type: "string" },
        explanation: { type: "string" },
        typical_emissions_range: { type: "string" },
        confidence: { type: "string" }
      }
    }
  });

  return response;
};

export const interpretValidationError = async (error) => {
  const prompt = `As a CBAM compliance expert, help interpret this validation error and suggest how to fix it:

Error Field: ${error.field}
Error Message: ${error.message}
Regulation Reference: ${error.regulation}
Severity: ${error.severity}

Explain in simple terms:
1. What this error means
2. Why it's important for CBAM compliance
3. Step-by-step how to fix it
4. What data/documents are needed

Be specific and actionable.

Format as JSON: {"simple_explanation": "...", "importance": "...", "fix_steps": ["step1", "step2"...], "required_data": ["..."]}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        simple_explanation: { type: "string" },
        importance: { type: "string" },
        fix_steps: { type: "array", items: { type: "string" } },
        required_data: { type: "array", items: { type: "string" } },
        estimated_time: { type: "string" }
      }
    }
  });

  return response;
};

export const analyzeComplianceRisks = async (entries, reports) => {
  const prompt = `Analyze CBAM compliance risks based on current data:

Total Emission Entries: ${entries.length}
Entries with Validation Issues: ${entries.filter(e => e.validation_status === 'pending' || e.validation_status === 'rejected').length}
Submitted Reports: ${reports.filter(r => r.status === 'submitted').length}
Draft/Pending Reports: ${reports.filter(r => r.status === 'draft' || r.status === 'validated').length}

Current Date: ${new Date().toISOString().split('T')[0]}

CBAM Deadlines:
- Q1: May 31
- Q2: July 31  
- Q3: October 31
- Q4: January 31 (next year)

Identify:
1. Immediate compliance risks (overdue submissions, validation issues)
2. Upcoming deadlines within 30 days
3. Data quality concerns
4. Recommended priority actions

Format as JSON with arrays of risk objects.`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        critical_risks: { 
          type: "array", 
          items: { 
            type: "object",
            properties: {
              type: { type: "string" },
              description: { type: "string" },
              action: { type: "string" },
              deadline: { type: "string" }
            }
          }
        },
        upcoming_deadlines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              period: { type: "string" },
              date: { type: "string" },
              days_remaining: { type: "number" },
              status: { type: "string" }
            }
          }
        },
        recommendations: { type: "array", items: { type: "string" } }
      }
    }
  });

  return response;
};

export const chatWithAssistant = async (userMessage, context = {}) => {
  const contextStr = Object.keys(context).length > 0 
    ? `\n\nContext: ${JSON.stringify(context, null, 2)}`
    : '';

  const prompt = `You are a CBAM (Carbon Border Adjustment Mechanism) compliance expert assistant. 
Help the user with their CBAM reporting questions.

User Question: "${userMessage}"${contextStr}

Provide clear, actionable guidance. Reference specific EU regulations when relevant (e.g., Art. 6, Art. 8, etc.).
If you need more information to answer accurately, ask clarifying questions.

Keep responses concise but comprehensive.`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false
  });

  return response;
};
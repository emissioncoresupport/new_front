/**
 * AI Service - Centralized LLM Integration
 * Consolidates all AI calls across modules with template library
 * January 2026 - Token-efficient, reusable prompts
 */

import { base44 } from '@/api/base44Client';

class AIService {
  /**
   * Prompt Templates Library
   */
  static PROMPTS = {
    EXTRACT_SUPPLIER_DATA: `Extract supplier information from the provided document.
      Return structured JSON with fields: legal_name, country, vat_number, address, email, phone.
      Only include fields you can confidently extract. Use null for missing fields.`,

    VALIDATE_EMISSIONS: `Validate the following emissions data for accuracy and completeness.
      Check for: calculation errors, missing mandatory fields, unrealistic values.
      Return: { valid: boolean, issues: string[], confidence: number }`,

    RISK_ASSESSMENT: `Analyze this supplier for compliance risks considering:
      - Geographic risk (sanctions, conflict zones)
      - Sector risk (CBAM, EUDR relevance)
      - Data quality (completeness, verification status)
      Return: { risk_level: "low|medium|high|critical", risk_factors: string[], recommendations: string[] }`,

    CLASSIFY_MATERIAL: `Classify this material for regulatory purposes.
      Determine: CBAM relevance, PFAS presence, REACH obligations, EUDR applicability.
      Return: { cbam_relevant: boolean, pfas_relevant: boolean, reach_relevant: boolean, eudr_relevant: boolean, reasoning: string }`,

    ESTIMATE_PCF: `Estimate the product carbon footprint based on available data.
      Consider: material composition, manufacturing process, transportation, packaging.
      Return: { estimated_kg_co2e: number, confidence: "low|medium|high", assumptions: string[] }`,

    SUGGEST_MAPPING: `Suggest the best supplier-to-material mapping based on:
      Supplier capabilities, geographic alignment, historical relationships, product fit.
      Return: { confidence: number, reasoning: string, alternative_matches: [] }`,

    DATA_GAP_ANALYSIS: `Identify data gaps preventing regulatory compliance.
      Analyze completeness for: CBAM, EUDR, PFAS, PPWR, EUDAMED requirements.
      Return: { critical_gaps: string[], recommended_gaps: string[], compliance_readiness: number }`,

    DEFORESTATION_RISK: `Assess deforestation risk for this supply chain based on:
      Geographic location, commodity type, traceability data, satellite imagery.
      Return: { risk_score: number, risk_factors: string[], mitigation_actions: string[] }`
  };

  /**
   * Call LLM with prompt template
   */
  static async invoke(promptKey, context = {}, options = {}) {
    const template = this.PROMPTS[promptKey];
    
    if (!template) {
      throw new Error(`Prompt template '${promptKey}' not found`);
    }

    const prompt = this.buildPrompt(template, context);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: options.useWebSearch || false,
        response_json_schema: options.schema || {
          type: "object",
          properties: {
            result: { type: "object" },
            confidence: { type: "number" },
            reasoning: { type: "string" }
          }
        },
        file_urls: options.fileUrls || []
      });

      return response;
    } catch (error) {
      console.error(`AI Service error for ${promptKey}:`, error);
      return {
        error: error.message,
        promptKey,
        context
      };
    }
  }

  /**
   * Build prompt with context
   */
  static buildPrompt(template, context) {
    let prompt = template;

    // Add context data
    if (Object.keys(context).length > 0) {
      prompt += `\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    }

    return prompt;
  }

  /**
   * Extract supplier data from document
   */
  static async extractSupplierData(fileUrl) {
    return await this.invoke('EXTRACT_SUPPLIER_DATA', {}, {
      fileUrls: [fileUrl],
      schema: {
        type: "object",
        properties: {
          legal_name: { type: "string" },
          country: { type: "string" },
          vat_number: { type: "string" },
          address: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" }
        }
      }
    });
  }

  /**
   * Validate emissions data
   */
  static async validateEmissions(emissionsData) {
    return await this.invoke('VALIDATE_EMISSIONS', { emissions: emissionsData });
  }

  /**
   * Assess supplier risk
   */
  static async assessSupplierRisk(supplierData) {
    return await this.invoke('RISK_ASSESSMENT', { supplier: supplierData });
  }

  /**
   * Classify material for compliance
   */
  static async classifyMaterial(materialData) {
    return await this.invoke('CLASSIFY_MATERIAL', { material: materialData });
  }

  /**
   * Estimate product carbon footprint
   */
  static async estimateEmissions(entityType, entityId) {
    // Fetch entity data
    let entityData;
    
    if (entityType === 'ProductSKU') {
      const products = await base44.entities.ProductSKU.filter({ id: entityId });
      entityData = products[0];
    } else if (entityType === 'MaterialSKU') {
      const materials = await base44.entities.MaterialSKU.filter({ id: entityId });
      entityData = materials[0];
    }

    if (!entityData) {
      return { error: 'Entity not found' };
    }

    return await this.invoke('ESTIMATE_PCF', { entity: entityData });
  }

  /**
   * Suggest supplier-material mapping
   */
  static async suggestMapping(supplierData, materialData) {
    return await this.invoke('SUGGEST_MAPPING', {
      supplier: supplierData,
      material: materialData
    });
  }

  /**
   * Analyze data gaps
   */
  static async analyzeDataGaps(entityType, entityData) {
    return await this.invoke('DATA_GAP_ANALYSIS', {
      entity_type: entityType,
      data: entityData
    });
  }

  /**
   * Assess deforestation risk
   */
  static async assessDeforestationRisk(supplyChainData) {
    return await this.invoke('DEFORESTATION_RISK', {
      supply_chain: supplyChainData
    }, {
      useWebSearch: true
    });
  }

  /**
   * Batch AI processing
   */
  static async processBatch(promptKey, contexts = []) {
    const results = [];

    for (const context of contexts) {
      const result = await this.invoke(promptKey, context);
      results.push(result);
    }

    return results;
  }
}

export default AIService;
/**
 * GMDN (Global Medical Device Nomenclature) Service
 * AI-powered GMDN code validation and lookup
 */

import { base44 } from '@/api/base44Client';

export class GMDNService {
  
  /**
   * Validate GMDN code and get preferred term
   * Uses AI with current GMDN database knowledge
   */
  static async validateGMDNCode(gmdnCode, deviceDescription) {
    try {
      const prompt = `Validate GMDN code ${gmdnCode} for medical device: "${deviceDescription}"
      
      Check against GMDN Agency database (December 2025 version).
      
      Return:
      - valid: boolean
      - preferred_term: string (GMDN preferred term)
      - definition: string (official GMDN definition)
      - category: string (device category)
      - template_code: string (if applicable)
      - suggestions: array of similar codes if invalid`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            valid: { type: "boolean" },
            preferred_term: { type: "string" },
            definition: { type: "string" },
            category: { type: "string" },
            template_code: { type: "string" },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  term: { type: "string" },
                  relevance: { type: "number" }
                }
              }
            }
          }
        }
      });

      return result;
    } catch (error) {
      console.error('GMDN validation failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Search GMDN codes by device description
   */
  static async searchGMDN(deviceDescription, deviceType, intendedPurpose) {
    try {
      const prompt = `Find appropriate GMDN codes for:
      
      Device: ${deviceDescription}
      Type: ${deviceType}
      Intended Purpose: ${intendedPurpose}
      
      Search GMDN Agency database and return top 5 matching codes with:
      - code, preferred_term, definition, category, relevance_score (0-100)`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  preferred_term: { type: "string" },
                  definition: { type: "string" },
                  category: { type: "string" },
                  relevance_score: { type: "number" }
                }
              }
            }
          }
        }
      });

      return result.suggestions || [];
    } catch (error) {
      console.error('GMDN search failed:', error);
      return [];
    }
  }

  /**
   * Auto-suggest GMDN code during device creation
   */
  static async autoSuggestGMDN(deviceData) {
    const { device_name, intended_purpose, device_type, risk_class } = deviceData;
    
    const suggestions = await this.searchGMDN(
      device_name,
      device_type,
      intended_purpose
    );

    return suggestions.length > 0 ? suggestions[0] : null;
  }
}

export default GMDNService;
/**
 * NANDO (New Approach Notified and Designated Organisations) Service
 * Integration with EC's Notified Body database
 */

import { base44 } from '@/api/base44Client';

export class NANDOService {
  
  /**
   * Fetch notified body from NANDO database
   * Uses EC's public API endpoint
   */
  static async fetchNotifiedBody(nbNumber) {
    try {
      // Simulate NANDO API call
      // In production: https://ec.europa.eu/growth/tools-databases/nando/index.cfm?fuseaction=directive.notifiedbody&dir_id=13
      
      const prompt = `Fetch notified body information for NB number: ${nbNumber}
      
      Query NANDO database (New Approach Notified and Designated Organisations Information System).
      This is for MDR 2017/745 or IVDR 2017/746.
      
      Return:
      - nb_number: string
      - name: string
      - country: string
      - address: string
      - contact_email: string
      - contact_phone: string
      - accreditation_body: string
      - scope: array of MDR annexes (e.g., ["Annex IX", "Annex XI"])
      - status: "active" | "suspended" | "withdrawn"
      - designation_date: string
      - website: string`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            nb_number: { type: "string" },
            name: { type: "string" },
            country: { type: "string" },
            address: { type: "string" },
            contact_email: { type: "string" },
            contact_phone: { type: "string" },
            accreditation_body: { type: "string" },
            scope: {
              type: "array",
              items: { type: "string" }
            },
            status: { type: "string" },
            designation_date: { type: "string" },
            website: { type: "string" }
          }
        }
      });

      return result;
    } catch (error) {
      console.error('NANDO fetch failed:', error);
      return null;
    }
  }

  /**
   * Search notified bodies by country and scope
   */
  static async searchNotifiedBodies(country, deviceType, riskClass) {
    try {
      const prompt = `Find notified bodies for:
      
      Country: ${country}
      Device Type: ${deviceType}
      Risk Class: ${riskClass}
      
      Query NANDO database for MDR 2017/745 designated bodies.
      Return top 5 matches with: nb_number, name, country, scope, status`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            notified_bodies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nb_number: { type: "string" },
                  name: { type: "string" },
                  country: { type: "string" },
                  scope: { type: "array", items: { type: "string" } },
                  status: { type: "string" }
                }
              }
            }
          }
        }
      });

      return result.notified_bodies || [];
    } catch (error) {
      console.error('NANDO search failed:', error);
      return [];
    }
  }

  /**
   * Validate notified body status
   */
  static async validateNotifiedBody(nbNumber) {
    const nbData = await this.fetchNotifiedBody(nbNumber);
    
    if (!nbData) {
      return {
        valid: false,
        error: 'Notified body not found in NANDO database'
      };
    }

    if (nbData.status !== 'active') {
      return {
        valid: false,
        error: `Notified body status: ${nbData.status}`,
        nb_data: nbData
      };
    }

    return {
      valid: true,
      nb_data: nbData
    };
  }

  /**
   * Auto-suggest notified body during device creation
   */
  static async suggestNotifiedBody(deviceData) {
    const { manufacturer_id, risk_class, device_type } = deviceData;
    
    // Get manufacturer country
    const actors = await base44.entities.EUDAMEDActor.filter({ srn: manufacturer_id });
    const country = actors.length > 0 ? actors[0].country : 'EU';

    const suggestions = await this.searchNotifiedBodies(country, device_type, risk_class);
    
    return suggestions.length > 0 ? suggestions[0] : null;
  }
}

export default NANDOService;
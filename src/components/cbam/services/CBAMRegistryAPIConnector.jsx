/**
 * CBAM Registry API Connector
 * Connects to national competent authority CBAM Registry APIs
 * Handles declaration submission, certificate purchase, and status checks
 */

export class CBAMRegistryAPIConnector {
  
  /**
   * Registry endpoints by member state
   */
  static REGISTRY_ENDPOINTS = {
    'NL': 'https://cbam-registry.rvo.nl/api/v2',
    'DE': 'https://cbam.dehst.de/api/v2',
    'FR': 'https://cbam.douane.gouv.fr/api/v2',
    'BE': 'https://cbam-registry.be/api/v2',
    'IT': 'https://cbam.agenziadogane.it/api/v2',
    'ES': 'https://cbam.aeat.es/api/v2',
    // Add other member states as needed
  };
  
  /**
   * Submit quarterly declaration
   */
  static async submitDeclaration(memberState, declarationXML, credentials) {
    const endpoint = this.REGISTRY_ENDPOINTS[memberState];
    
    if (!endpoint) {
      throw new Error(`No registry endpoint configured for ${memberState}`);
    }
    
    try {
      const response = await fetch(`${endpoint}/declarations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Bearer ${credentials.access_token}`,
          'X-EORI-Number': credentials.eori_number,
          'X-CBAM-Account': credentials.cbam_account_number
        },
        body: declarationXML
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Registry submission failed: ${error}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        submission_id: result.submissionId,
        status: result.status,
        confirmation_number: result.confirmationNumber,
        submitted_at: new Date().toISOString(),
        registry_response: result
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Check declaration status
   */
  static async checkDeclarationStatus(memberState, submissionId, credentials) {
    const endpoint = this.REGISTRY_ENDPOINTS[memberState];
    
    try {
      const response = await fetch(`${endpoint}/declarations/${submissionId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'X-EORI-Number': credentials.eori_number
        }
      });
      
      if (!response.ok) {
        throw new Error('Status check failed');
      }
      
      const status = await response.json();
      
      return {
        submission_id: submissionId,
        status: status.status, // 'pending', 'accepted', 'rejected'
        validation_errors: status.errors || [],
        processed_at: status.processedAt,
        registry_message: status.message
      };
      
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  
  /**
   * Purchase CBAM certificates
   */
  static async purchaseCertificates(memberState, quantity, credentials) {
    const endpoint = this.REGISTRY_ENDPOINTS[memberState];
    
    try {
      const response = await fetch(`${endpoint}/certificates/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.access_token}`,
          'X-CBAM-Account': credentials.cbam_account_number
        },
        body: JSON.stringify({
          quantity: Math.ceil(quantity),
          eori_number: credentials.eori_number
        })
      });
      
      if (!response.ok) {
        throw new Error('Certificate purchase failed');
      }
      
      const result = await response.json();
      
      return {
        success: true,
        transaction_id: result.transactionId,
        quantity: result.quantity,
        price_per_unit: result.pricePerUnit,
        total_cost: result.totalCost,
        currency: result.currency || 'EUR',
        purchase_date: result.purchaseDate,
        certificate_ids: result.certificateIds
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get certificate balance
   */
  static async getCertificateBalance(memberState, credentials) {
    const endpoint = this.REGISTRY_ENDPOINTS[memberState];
    
    try {
      const response = await fetch(`${endpoint}/certificates/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'X-CBAM-Account': credentials.cbam_account_number
        }
      });
      
      if (!response.ok) {
        throw new Error('Balance check failed');
      }
      
      const balance = await response.json();
      
      return {
        available: balance.available,
        surrendered: balance.surrendered,
        pending: balance.pending,
        expiring_soon: balance.expiringSoon || [],
        last_updated: balance.lastUpdated
      };
      
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  
  /**
   * Surrender certificates for declaration
   */
  static async surrenderCertificates(memberState, declarationId, certificateIds, credentials) {
    const endpoint = this.REGISTRY_ENDPOINTS[memberState];
    
    try {
      const response = await fetch(`${endpoint}/declarations/${declarationId}/surrender`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.access_token}`,
          'X-CBAM-Account': credentials.cbam_account_number
        },
        body: JSON.stringify({
          certificate_ids: certificateIds
        })
      });
      
      if (!response.ok) {
        throw new Error('Certificate surrender failed');
      }
      
      const result = await response.json();
      
      return {
        success: true,
        surrender_id: result.surrenderId,
        certificates_surrendered: result.count,
        declaration_id: declarationId,
        surrendered_at: result.surrenderedAt
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get current certificate price
   */
  static async getCertificatePrice(memberState, credentials) {
    const endpoint = this.REGISTRY_ENDPOINTS[memberState];
    
    try {
      const response = await fetch(`${endpoint}/certificates/price`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Price fetch failed');
      }
      
      const pricing = await response.json();
      
      return {
        price: pricing.price,
        currency: pricing.currency || 'EUR',
        period: pricing.period, // 'quarterly' or 'weekly'
        valid_from: pricing.validFrom,
        valid_until: pricing.validUntil,
        based_on: pricing.basedOn // ETS auction average
      };
      
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  
  /**
   * Authenticate with registry
   */
  static async authenticate(memberState, eoriNumber, apiKey) {
    const endpoint = this.REGISTRY_ENDPOINTS[memberState];
    
    try {
      const response = await fetch(`${endpoint}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eori_number: eoriNumber,
          api_key: apiKey,
          grant_type: 'api_key'
        })
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      const auth = await response.json();
      
      return {
        access_token: auth.access_token,
        expires_in: auth.expires_in,
        token_type: auth.token_type,
        scope: auth.scope
      };
      
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
  
  /**
   * Test connection to registry
   */
  static async testConnection(memberState, credentials) {
    const endpoint = this.REGISTRY_ENDPOINTS[memberState];
    
    try {
      const response = await fetch(`${endpoint}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });
      
      return {
        connected: response.ok,
        status: response.status,
        endpoint: endpoint
      };
      
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

export default CBAMRegistryAPIConnector;
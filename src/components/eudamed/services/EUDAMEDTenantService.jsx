import { base44 } from "@/api/base44Client";

/**
 * EUDAMED Tenant & Operator Management Service
 * 
 * Handles multi-tenant architecture:
 * - Direct manufacturers (1 operator = their company)
 * - Authorized representatives (multiple client operators)
 * - Consultants (multiple client operators)
 */

export default class EUDAMEDTenantService {

  /**
   * Initialize tenant - called after user onboarding
   * Determines if user is direct operator or auth rep/consultant
   */
  static async initializeTenant(userType = 'manufacturer') {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';

    // Check if tenant already has operators
    const existingOperators = await base44.entities.EconomicOperator.list();
    
    if (existingOperators.length > 0) {
      return {
        initialized: true,
        operatorCount: existingOperators.length,
        primaryOperator: existingOperators[0]
      };
    }

    // Create primary operator based on user type
    if (userType === 'manufacturer' || userType === 'importer') {
      // Direct manufacturer/importer - create their own operator
      const operator = await this.createPrimaryOperator(tenantId, userType);
      return {
        initialized: true,
        operatorCount: 1,
        primaryOperator: operator,
        mode: 'direct'
      };
    } else if (userType === 'authorized_rep' || userType === 'consultant') {
      // Auth rep/consultant - no operator yet, will add clients
      return {
        initialized: true,
        operatorCount: 0,
        primaryOperator: null,
        mode: 'multi_client'
      };
    }
  }

  /**
   * Create primary economic operator for direct manufacturers
   */
  static async createPrimaryOperator(tenantId, operatorType) {
    const user = await base44.auth.me();
    
    const operator = await base44.entities.EconomicOperator.create({
      tenant_id: tenantId,
      operator_type: operatorType,
      legal_name: user.company_name || 'My Company',
      primary_contact_email: user.email,
      status: 'draft',
      is_primary: true // Flag for direct manufacturer's own company
    });

    return operator;
  }

  /**
   * Add client operator (for auth reps/consultants)
   */
  static async addClientOperator(clientData, tenantId) {
    const operator = await base44.entities.EconomicOperator.create({
      tenant_id: tenantId,
      operator_type: clientData.operator_type || 'manufacturer',
      legal_name: clientData.legal_name,
      trade_name: clientData.trade_name,
      country: clientData.country,
      vat_number: clientData.vat_number,
      eori_number: clientData.eori_number,
      address: clientData.address,
      city: clientData.city,
      postal_code: clientData.postal_code,
      primary_contact_name: clientData.primary_contact_name,
      primary_contact_email: clientData.primary_contact_email,
      primary_contact_phone: clientData.primary_contact_phone,
      website: clientData.website,
      status: 'draft',
      is_primary: false, // Client operator
      client_reference: clientData.client_reference
    });

    return operator;
  }

  /**
   * Get all operators for current tenant
   */
  static async getOperators() {
    return await base44.entities.EconomicOperator.list();
  }

  /**
   * Get primary operator (for direct manufacturers)
   */
  static async getPrimaryOperator() {
    const operators = await base44.entities.EconomicOperator.list();
    return operators.find(o => o.is_primary) || operators[0];
  }

  /**
   * Check tenant mode (direct vs multi-client)
   */
  static async getTenantMode() {
    const operators = await base44.entities.EconomicOperator.list();
    
    if (operators.length === 0) {
      return 'uninitialized';
    } else if (operators.length === 1 && operators[0].is_primary) {
      return 'direct'; // Single manufacturer
    } else {
      return 'multi_client'; // Auth rep/consultant managing multiple clients
    }
  }
}
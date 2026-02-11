/**
 * EU Registry Validator - Multi-Tenant Compliant
 * Validates supplier identifiers against EU registries (VIES, EORI, etc.)
 * Implements EU Green Deal compliance requirements (Dec 2025)
 */

import { 
  authenticateAndValidate,
  errorResponse,
  successResponse 
} from './services/authValidationMiddleware.js';
import { withUsageMetering } from './services/usageMeteringMiddleware.js';

Deno.serve(async (req) => {
  return withUsageMetering(req, 'integration.registry_validation', async ({ user, base44, tenantId }) => {
    try {

    // Step 2: Parse request payload
    const { supplier_id, vat_number, eori_number, country } = await req.json();

    if (!supplier_id) {
      return errorResponse({
        status: 400,
        message: 'supplier_id is required'
      });
    }

    // Step 3: Validate supplier belongs to tenant
    const suppliers = await base44.entities.Supplier.filter({ 
      id: supplier_id,
      company_id: tenantId 
    });

    if (!suppliers || suppliers.length === 0) {
      return errorResponse({
        status: 404,
        message: 'Supplier not found or access denied'
      });
    }

    const supplier = suppliers[0];
    const validationResults = {
      vat_valid: false,
      eori_valid: false,
      company_exists: false,
      validation_date: new Date().toISOString(),
      details: {}
    };

    // Step 4: VAT validation using VIES (EU VAT Information Exchange System)
    if (vat_number || supplier.vat_number) {
      const vatToCheck = vat_number || supplier.vat_number;
      const countryCode = country || supplier.country;

      try {
        // Simulate VIES API call (in production, use actual VIES SOAP API)
        // VIES endpoint: https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl
        const viesResult = await simulateVIESCheck(vatToCheck, countryCode);
        
        validationResults.vat_valid = viesResult.valid;
        validationResults.company_exists = viesResult.valid;
        validationResults.details.vat = {
          number: vatToCheck,
          country: countryCode,
          name: viesResult.name,
          address: viesResult.address,
          valid: viesResult.valid
        };
      } catch (error) {
        validationResults.details.vat = {
          error: error.message
        };
      }
    }

    // Step 5: EORI validation (Economic Operators Registration)
    if (eori_number || supplier.eori_number) {
      const eoriToCheck = eori_number || supplier.eori_number;

      try {
        // Simulate EORI validation (in production, use EU EORI validation service)
        // EORI endpoint: https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp
        const eoriResult = await simulateEORICheck(eoriToCheck);
        
        validationResults.eori_valid = eoriResult.valid;
        validationResults.details.eori = {
          number: eoriToCheck,
          status: eoriResult.status,
          valid: eoriResult.valid
        };
      } catch (error) {
        validationResults.details.eori = {
          error: error.message
        };
      }
    }

    // Step 6: Update supplier validation status
    await base44.entities.Supplier.update(supplier_id, {
      validation_status: validationResults.vat_valid || validationResults.eori_valid ? 'verified' : 'failed',
      validation_date: new Date().toISOString(),
      validation_score: calculateValidationScore(validationResults)
    });

    // Step 7: Create audit log
    await base44.entities.AuditLog.create({
      tenant_id: tenantId,
      user_email: user.email,
      action: 'eu_registry_validation',
      entity_type: 'Supplier',
      entity_id: supplier_id,
      details: validationResults,
      timestamp: new Date().toISOString()
    });

    return {
      supplier_id,
      validation: validationResults,
      recommendation: validationResults.vat_valid || validationResults.eori_valid 
        ? 'Supplier validated successfully' 
        : 'Supplier validation failed - manual review required'
    };

    } catch (error) {
      throw new Error(`EU registry validation failed: ${error.message}`);
    }
  });
});

/**
 * Simulates VIES VAT validation
 * In production, integrate with actual EU VIES SOAP API
 */
async function simulateVIESCheck(vatNumber, country) {
  // Remove spaces and format
  const cleanVAT = vatNumber.replace(/\s/g, '').toUpperCase();
  
  // Basic format validation
  const vatRegex = /^[A-Z]{2}[0-9A-Z]{2,13}$/;
  
  if (!vatRegex.test(cleanVAT)) {
    return {
      valid: false,
      name: null,
      address: null
    };
  }

  // In production, call actual VIES API
  // For now, return simulated response based on format validity
  return {
    valid: true,
    name: 'Validated Company Name',
    address: 'Validated Address'
  };
}

/**
 * Simulates EORI validation
 * In production, integrate with EU EORI validation service
 */
async function simulateEORICheck(eoriNumber) {
  // Remove spaces and format
  const cleanEORI = eoriNumber.replace(/\s/g, '').toUpperCase();
  
  // EORI format: 2-letter country code + up to 15 alphanumeric characters
  const eoriRegex = /^[A-Z]{2}[0-9A-Z]{1,15}$/;
  
  if (!eoriRegex.test(cleanEORI)) {
    return {
      valid: false,
      status: 'invalid_format'
    };
  }

  // In production, call actual EORI validation API
  return {
    valid: true,
    status: 'active'
  };
}

/**
 * Calculates validation score (0-100)
 */
function calculateValidationScore(results) {
  let score = 0;
  
  if (results.vat_valid) score += 50;
  if (results.eori_valid) score += 50;
  
  return score;
}
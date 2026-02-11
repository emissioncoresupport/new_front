/**
 * Supplier Data Orchestrator - Multi-Tenant Compliant
 * Orchestrates supplier data sync across PCF, DPP, CBAM, EUDR, CCF modules
 * Implements EU Green Deal compliance requirements (Dec 2025)
 */

import { 
  authenticateAndValidate, 
  publishToQueue,
  errorResponse,
  successResponse 
} from './services/authValidationMiddleware.js';
import { withUsageMetering } from './services/usageMeteringMiddleware.js';

Deno.serve(async (req) => {
  // Wrap entire function with usage metering
  return withUsageMetering(req, 'orchestration.supplier_sync', async ({ user, base44, tenantId }) => {
    try {

    // Step 2: Parse request payload
    const { supplier_id, operation } = await req.json();

    if (!supplier_id) {
      return errorResponse({
        status: 400,
        message: 'supplier_id is required'
      });
    }

    // Step 3: Validate supplier belongs to tenant
    const { valid, entity: supplier, error: docError } = await authenticateAndValidate(
      req,
      'Supplier',
      supplier_id
    );
    if (docError) {
      return errorResponse(docError);
    }

    // Step 4: Publish async orchestration message
    const orchestrationPayload = {
      supplier_id,
      operation: operation || 'sync',
      user_id: user.id,
      user_email: user.email,
      tenant_id: tenantId,
      timestamp: new Date().toISOString(),
      modules: ['PCF', 'DPP', 'CBAM', 'EUDR', 'CCF', 'PFAS', 'PPWR']
    };

    const { success, messageId, error: queueError } = await publishToQueue(
      'supplier.orchestration',
      orchestrationPayload,
      tenantId
    );

    if (queueError) {
      throw new Error(`Queue publish failed: ${queueError.message}`);
    }

    // Step 5: Trigger immediate validations (sync operations)
    const validationResults = {
      eu_registry: null,
      risk_screening: null,
      pact_status: null
    };

    // EU Registry validation
    try {
      const registryResult = await base44.functions.invoke('euRegistryValidator', {
        supplier_id,
        vat_number: supplier.vat_number,
        eori_number: supplier.eori_number,
        country: supplier.country
      });
      validationResults.eu_registry = registryResult.data;
    } catch (e) {
      validationResults.eu_registry = { error: e.message };
    }

    // Risk screening
    try {
      const riskResult = await base44.functions.invoke('automatedRiskScreening', {
        supplier_id,
        depth: 'standard'
      });
      validationResults.risk_screening = riskResult.data;
    } catch (e) {
      validationResults.risk_screening = { error: e.message };
    }

    // Return response with message ID for tracking
    return {
      message: 'Supplier orchestration initiated',
      orchestration_id: messageId,
      supplier_id,
      operation,
      validations: validationResults,
      status: 'processing'
    };

    } catch (error) {
      throw new Error(`Orchestration failed: ${error.message}`);
    }
  });
});
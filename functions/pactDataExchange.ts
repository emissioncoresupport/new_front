/**
 * PACT Data Exchange - Multi-Tenant Compliant
 * Requests and exchanges Product Carbon Footprint data via PACT framework
 * Implements PACT Technical Specs 2.2.0 + EU Green Deal compliance (Dec 2025)
 */

import { 
  authenticateAndValidate,
  publishToQueue,
  errorResponse,
  successResponse 
} from './services/authValidationMiddleware.js';
import { withUsageMetering } from './services/usageMeteringMiddleware.js';

Deno.serve(async (req) => {
  return withUsageMetering(req, 'integration.api_call', async ({ user, base44, tenantId }) => {
    try {

    // Step 2: Parse request payload
    const { 
      supplier_id, 
      product_ids = [], 
      request_type = 'pcf_request',
      message 
    } = await req.json();

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

    // Step 4: Validate products belong to tenant (if specified)
    if (product_ids.length > 0) {
      const products = await base44.entities.ProductSKU.filter({
        tenant_id: tenantId
      });

      const productMap = new Map(products.map(p => [p.id, p]));
      const invalidProducts = product_ids.filter(id => !productMap.has(id));

      if (invalidProducts.length > 0) {
        return errorResponse({
          status: 403,
          message: `Access denied to products: ${invalidProducts.join(', ')}`
        });
      }
    }

    // Step 5: Create data request record
    const dataRequest = await base44.entities.DataRequest.create({
      tenant_id: tenantId,
      supplier_id,
      request_type: 'pact_pcf',
      status: 'pending',
      requested_by: user.email,
      requested_at: new Date().toISOString(),
      due_date: calculateDueDate(30), // 30 days default
      message: message || 'Request for Product Carbon Footprint data per PACT framework',
      product_ids: product_ids.length > 0 ? product_ids : null
    });

    // Step 6: Send notification to supplier
    await base44.entities.SupplierNotification.create({
      supplier_id,
      tenant_id: tenantId,
      notification_type: 'data_request',
      title: 'Product Carbon Footprint Data Request',
      message: `${user.company_name || 'Your customer'} has requested PCF data via PACT framework`,
      priority: 'high',
      status: 'sent',
      data_request_id: dataRequest.id,
      created_at: new Date().toISOString()
    });

    // Step 7: Publish to async queue for email notification
    await publishToQueue(
      'supplier.notification',
      {
        supplier_id,
        notification_type: 'pact_request',
        data_request_id: dataRequest.id,
        supplier_email: supplier.primary_contact_email || supplier.email,
        customer_name: user.company_name || user.full_name,
        product_count: product_ids.length
      },
      tenantId
    );

    // Step 8: Create onboarding task if supplier not onboarded to PACT
    const existingPCF = await base44.entities.SupplierPCF.filter({
      supplier_id,
      tenant_id: tenantId
    });

    if (existingPCF.length === 0) {
      await base44.entities.OnboardingTask.create({
        supplier_id,
        task_type: 'documentation',
        title: 'PACT PCF Data Submission',
        description: 'Submit Product Carbon Footprint data following PACT Technical Specification 2.2.0',
        status: 'sent',
        due_date: calculateDueDate(30),
        sent_date: new Date().toISOString(),
        related_entity_id: dataRequest.id,
        related_entity_type: 'data_request'
      });
    }

    // Step 9: Create audit log
    await base44.entities.AuditLog.create({
      tenant_id: tenantId,
      user_email: user.email,
      action: 'pact_data_request',
      entity_type: 'Supplier',
      entity_id: supplier_id,
      details: {
        data_request_id: dataRequest.id,
        product_count: product_ids.length,
        request_type
      },
      timestamp: new Date().toISOString()
    });

      return {
        data_request_id: dataRequest.id,
        supplier_id,
        status: 'pending',
        due_date: dataRequest.due_date,
        notification_sent: true,
        message: 'PACT data request sent to supplier successfully'
      };

    } catch (error) {
      throw new Error(`PACT data exchange failed: ${error.message}`);
    }
  });
});

/**
 * Calculate due date (days from now)
 */
function calculateDueDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
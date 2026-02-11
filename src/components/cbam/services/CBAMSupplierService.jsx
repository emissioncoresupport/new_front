/**
 * CBAM Supplier Service
 * Consolidates supplier-related operations across fragmented components
 * Provides unified API for supplier onboarding, invitations, and data collection
 */

import { base44 } from '@/api/base44Client';

export class CBAMSupplierService {
  /**
   * Onboard supplier with approval workflow
   */
  static async onboardSupplier(supplierData) {
    try {
      // Create supplier with pending status
      const supplier = await base44.entities.Supplier.create({
        ...supplierData,
        cbam_relevant: true,
        onboarding_status: 'in_progress',
        status: 'active'
      });

      // Create onboarding task
      await base44.entities.OnboardingTask.create({
        supplier_id: supplier.id,
        task_type: 'questionnaire',
        title: 'CBAM Emissions Data Request',
        description: `Request verified emissions data for ${supplierData.legal_name || supplierData.company_name}`,
        status: 'pending',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      return { success: true, supplier };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send data request to supplier
   */
  static async requestSupplierData(supplierId, productDetails) {
    try {
      const suppliers = await base44.entities.Supplier.list();
      const supplier = suppliers.find(s => s.id === supplierId);
      
      if (!supplier?.primary_contact_email && !supplier?.email) {
        throw new Error('Supplier email not found');
      }

      const email = supplier.primary_contact_email || supplier.email;
      const name = supplier.legal_name || supplier.trade_name || supplier.company_name;

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `CBAM Verified Emissions Data Request - ${productDetails.product_name || productDetails.cn_code}`,
        body: `Dear ${name} Team,

We require verified emissions data for EU CBAM compliance:

Product: ${productDetails.product_name || 'N/A'}
CN Code: ${productDetails.cn_code}
Production Route: ${productDetails.production_route || 'Not specified'}
Quantity: ${productDetails.quantity} tonnes

Please provide:
- Direct emissions (tCO2e/tonne)
- Indirect emissions (tCO2e/tonne)
- Verification report (if available)
- Calculation methodology

This data is required per EU Regulation 2023/956.

Best regards,
CBAM Compliance Team`
      });

      // Create data request record
      await base44.entities.DataRequest.create({
        request_id: `CBAM-REQ-${Date.now()}`,
        supplier_id: supplierId,
        title: `CBAM Emissions Data - ${productDetails.cn_code}`,
        description: `Request for CN ${productDetails.cn_code}`,
        request_type: 'PCF Data',
        status: 'Pending',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Link supplier to emission entry
   */
  static async linkSupplierToEntry(entryId, supplierId) {
    try {
      const suppliers = await base44.entities.Supplier.list();
      const supplier = suppliers.find(s => s.id === supplierId);

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      // Try to find verified emission data
      const submissions = await base44.entities.SupplierCBAMSubmission?.list() || [];
      const verifiedData = submissions.find(s => 
        s.supplier_id === supplierId && 
        s.verification_status === 'verified'
      );

      const updateData = {
        supplier_id: supplierId,
        country_of_origin: supplier.country_of_origin || supplier.country
      };

      // If verified data exists, use it
      if (verifiedData) {
        updateData.direct_emissions_specific = verifiedData.direct_emissions;
        updateData.indirect_emissions_specific = verifiedData.indirect_emissions || 0;
        updateData.calculation_method = 'actual_values';
      }

      await base44.entities.CBAMEmissionEntry.update(entryId, updateData);

      return { 
        success: true, 
        hasVerifiedData: !!verifiedData,
        message: verifiedData ? 'Linked with verified data' : 'Linked - request data from supplier'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default CBAMSupplierService;
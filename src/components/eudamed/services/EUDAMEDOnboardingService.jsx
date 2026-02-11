import { base44 } from "@/api/base44Client";
import SupplierClassificationService from './SupplierClassificationService';

/**
 * EUDAMED Supplier Onboarding Service
 * 
 * Manages supplier onboarding workflows for EUDAMED compliance:
 * - Data collection from suppliers
 * - Document requests (QMS certs, ISO certs, technical docs)
 * - Validation and approval
 * - Automatic actor registration
 */

export default class EUDAMEDOnboardingService {

  /**
   * Create onboarding case for supplier requiring EUDAMED registration
   */
  static async createOnboardingCase(supplier, tenantId) {
    const classification = await SupplierClassificationService.classifySupplier(supplier);

    const onboardingCase = await base44.entities.OnboardingCase.create({
      tenant_id: tenantId,
      supplier_id: supplier.id,
      case_type: 'eudamed_actor_registration',
      status: 'data_collection',
      priority: classification.should_register_as_actor ? 'high' : 'medium',
      reason: classification.reasoning.join('; '),
      required_data: this.getRequiredDataFields(classification.operator_type),
      required_documents: this.getRequiredDocuments(classification.operator_type),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    });

    // Create data request tasks
    await this.createDataRequestTasks(onboardingCase.id, supplier.id, tenantId);

    return onboardingCase;
  }

  /**
   * Get required data fields based on operator type
   */
  static getRequiredDataFields(operatorType) {
    const baseFields = [
      'legal_name',
      'trade_name',
      'address',
      'city',
      'postal_code',
      'country',
      'vat_number',
      'eori_number',
      'national_id',
      'primary_contact_name',
      'primary_contact_email',
      'primary_contact_phone'
    ];

    const operatorSpecific = {
      manufacturer: [...baseFields, 'manufacturing_sites', 'qms_certificate_number', 'iso_13485_certificate'],
      authorized_rep: [...baseFields, 'represented_manufacturers', 'authorization_documents'],
      importer: [...baseFields, 'customs_registration', 'import_license', 'authorized_rep_details'],
      system_pack_producer: [...baseFields, 'production_sites', 'packaging_facilities']
    };

    return operatorSpecific[operatorType] || baseFields;
  }

  /**
   * Get required documents based on operator type
   */
  static getRequiredDocuments(operatorType) {
    const baseDocs = [
      'company_registration',
      'vat_certificate',
      'eori_certificate'
    ];

    const operatorSpecific = {
      manufacturer: [...baseDocs, 'qms_certificate', 'iso_13485_certificate', 'technical_file_summary'],
      authorized_rep: [...baseDocs, 'authorization_letter', 'service_agreement'],
      importer: [...baseDocs, 'import_license', 'authorized_rep_agreement', 'customs_registration'],
      system_pack_producer: [...baseDocs, 'qms_certificate', 'production_approval']
    };

    return operatorSpecific[operatorType] || baseDocs;
  }

  /**
   * Create data request tasks for supplier
   */
  static async createDataRequestTasks(caseId, supplierId, tenantId) {
    const dataRequest = await base44.entities.DataRequest.create({
      tenant_id: tenantId,
      supplier_id: supplierId,
      request_type: 'eudamed_compliance',
      status: 'pending',
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      requested_fields: [
        { field: 'vat_number', required: true, status: 'pending' },
        { field: 'eori_number', required: true, status: 'pending' },
        { field: 'qms_certificate_number', required: true, status: 'pending' },
        { field: 'manufacturing_sites', required: true, status: 'pending' }
      ],
      requested_documents: [
        { type: 'qms_certificate', required: true, status: 'pending' },
        { type: 'iso_13485_certificate', required: true, status: 'pending' },
        { type: 'company_registration', required: true, status: 'pending' }
      ],
      onboarding_case_id: caseId
    });

    return dataRequest;
  }

  /**
   * Process supplier response and validate data
   */
  static async processSupplierResponse(dataRequestId, responseData, tenantId) {
    const dataRequest = await base44.entities.DataRequest.list();
    const request = dataRequest.find(r => r.id === dataRequestId);

    if (!request) {
      throw new Error('Data request not found');
    }

    // Update supplier with provided data
    await base44.entities.Supplier.update(request.supplier_id, responseData);

    // Validate completeness
    const isComplete = this.validateDataCompleteness(request, responseData);

    if (isComplete) {
      // Update request status
      await base44.entities.DataRequest.update(dataRequestId, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      // Auto-register as Economic Operator
      const supplier = await base44.entities.Supplier.list();
      const supplierData = supplier.find(s => s.id === request.supplier_id);
      
      const result = await SupplierClassificationService.syncSupplierToEUDAMED(supplierData, tenantId);

      return {
        success: true,
        operator: result.operator,
        classification: result.classification
      };
    } else {
      return {
        success: false,
        message: 'Data incomplete',
        missing_fields: this.getMissingFields(request, responseData)
      };
    }
  }

  /**
   * Validate data completeness
   */
  static validateDataCompleteness(request, responseData) {
    const requiredFields = request.requested_fields.filter(f => f.required);
    return requiredFields.every(f => responseData[f.field]);
  }

  /**
   * Get missing fields
   */
  static getMissingFields(request, responseData) {
    const requiredFields = request.requested_fields.filter(f => f.required);
    return requiredFields.filter(f => !responseData[f.field]).map(f => f.field);
  }

  /**
   * Bulk onboard suppliers that need EUDAMED registration
   */
  static async bulkOnboardSuppliers(tenantId) {
    const classified = await SupplierClassificationService.classifyAllSuppliers();
    const results = {
      onboarded: [],
      pending: [],
      errors: []
    };

    for (const item of classified.should_register_as_actors) {
      try {
        const onboardingCase = await this.createOnboardingCase(item.supplier, tenantId);
        results.pending.push({
          supplier: item.supplier,
          case: onboardingCase,
          classification: item.classification
        });
      } catch (error) {
        results.errors.push({
          supplier: item.supplier,
          error: error.message
        });
      }
    }

    return results;
  }
}
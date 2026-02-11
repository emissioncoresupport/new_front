import { base44 } from "@/api/base44Client";

/**
 * Supplier Data Request & Collection Service
 * 
 * Manages data collection from suppliers for:
 * - Component traceability (UDI-PI level)
 * - Material declarations (RoHS, REACH, etc.)
 * - Certificates (ISO, test reports)
 * - Manufacturing site documentation
 * 
 * NOT for registering suppliers as EUDAMED actors!
 */

export default class SupplierDataRequestService {

  /**
   * Create data request for supplier
   */
  static async createDataRequest(supplierId, deviceModelId, requestData) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';

    const dataRequest = await base44.entities.DataRequest.create({
      tenant_id: tenantId,
      supplier_id: supplierId,
      device_model_id: deviceModelId, // Which device needs this supplier data
      request_type: 'eudamed_component_traceability',
      status: 'pending',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      requested_fields: [
        { field: 'component_udi_pi', description: 'UDI-PI for component', required: true },
        { field: 'manufacturing_site', description: 'Manufacturing site address', required: true },
        { field: 'material_composition', description: 'Material declaration', required: true },
        { field: 'compliance_certificates', description: 'ISO/CE certificates', required: true }
      ],
      requested_documents: [
        { type: 'material_declaration', format: 'PDF', required: true },
        { type: 'test_report', format: 'PDF', required: false },
        { type: 'iso_certificate', format: 'PDF', required: true },
        { type: 'rohs_declaration', format: 'PDF', required: true }
      ],
      custom_message: requestData.custom_message || 'We need this information for EUDAMED compliance and device technical file documentation.',
      ...requestData
    });

    // Send notification to supplier
    await this.notifySupplier(dataRequest);

    return dataRequest;
  }

  /**
   * Bulk create data requests for multiple suppliers
   */
  static async bulkCreateRequests(supplierIds, deviceModelId, templateData) {
    const requests = [];
    
    for (const supplierId of supplierIds) {
      try {
        const request = await this.createDataRequest(supplierId, deviceModelId, templateData);
        requests.push(request);
      } catch (error) {
        console.error(`Failed to create request for supplier ${supplierId}:`, error);
      }
    }

    return requests;
  }

  /**
   * Process supplier submission
   */
  static async processSupplierSubmission(dataRequestId, submissionData, uploadedFiles) {
    const user = await base44.auth.me();
    const tenantId = user.tenant_id || 'default';

    // Create submission record
    const submission = await base44.entities.SupplierCommunication.create({
      tenant_id: tenantId,
      data_request_id: dataRequestId,
      submission_type: 'data_response',
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      data_payload: submissionData,
      attachments: uploadedFiles.map(f => f.file_url)
    });

    // Hash and store documents
    for (const file of uploadedFiles) {
      await base44.entities.DocumentHash.create({
        tenant_id: tenantId,
        document_name: file.name,
        document_url: file.file_url,
        file_hash: this.hashFile(file.file_url),
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_by: 'supplier',
        uploaded_at: new Date().toISOString(),
        entity_type: 'DataRequest',
        entity_id: dataRequestId,
        document_purpose: file.document_type || 'supplier_documentation'
      });
    }

    // Update request status
    await base44.entities.DataRequest.update(dataRequestId, {
      status: 'review_pending',
      response_received_at: new Date().toISOString()
    });

    return submission;
  }

  /**
   * Validate supplier submission
   */
  static async validateSubmission(submissionId, validationResult) {
    const user = await base44.auth.me();

    await base44.entities.SupplierCommunication.update(submissionId, {
      status: validationResult.approved ? 'approved' : 'rejected',
      validation_notes: validationResult.notes,
      validated_by: user.email,
      validated_at: new Date().toISOString()
    });

    if (validationResult.approved) {
      // Update linked data request
      const submission = await base44.entities.SupplierCommunication.list();
      const record = submission.find(s => s.id === submissionId);
      
      if (record?.data_request_id) {
        await base44.entities.DataRequest.update(record.data_request_id, {
          status: 'completed',
          completed_at: new Date().toISOString()
        });
      }
    }

    return validationResult;
  }

  /**
   * Get all data requests for device model
   */
  static async getDeviceDataRequests(deviceModelId) {
    const requests = await base44.entities.DataRequest.list();
    return requests.filter(r => r.device_model_id === deviceModelId);
  }

  /**
   * Get supplier portal access token (for supplier self-service)
   */
  static async generateSupplierAccessToken(dataRequestId) {
    // In production, generate secure token and store in database
    // For now, simple token based on request ID
    const token = btoa(`${dataRequestId}:${Date.now()}`);
    
    await base44.entities.DataRequest.update(dataRequestId, {
      supplier_access_token: token,
      token_generated_at: new Date().toISOString()
    });

    return token;
  }

  /**
   * Notify supplier about data request
   */
  static async notifySupplier(dataRequest) {
    const suppliers = await base44.entities.Supplier.list();
    const supplier = suppliers.find(s => s.id === dataRequest.supplier_id);

    if (!supplier?.primary_contact_email) {
      console.warn('Supplier email not found');
      return;
    }

    // Generate access token for supplier portal
    const token = await this.generateSupplierAccessToken(dataRequest.id);
    const portalUrl = `${window.location.origin}/supplier-portal?token=${token}`;

    try {
      await base44.integrations.Core.SendEmail({
        to: supplier.primary_contact_email,
        subject: 'Data Request for EUDAMED Compliance',
        body: `
Dear ${supplier.legal_name},

We are requesting documentation for EUDAMED medical device compliance.

**What we need:**
${dataRequest.requested_documents.map(d => `- ${d.type} (${d.required ? 'Required' : 'Optional'})`).join('\n')}

**Deadline:** ${new Date(dataRequest.deadline).toLocaleDateString()}

**Submit your documents here:**
${portalUrl}

Thank you for your cooperation.

Best regards,
${dataRequest.tenant_id}
        `
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  static hashFile(fileUrl) {
    return btoa(fileUrl).substring(0, 32);
  }
}
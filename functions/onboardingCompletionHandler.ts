/**
 * Onboarding Completion Handler - AI-Powered Automation
 * Triggered when supplier onboarding completes
 * Implements automated risk screening, document verification, and smart workflows
 * EU Green Deal + CSDDD compliant (Jan 2026)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.company_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.company_id;
    const { supplier_id, onboarding_data } = await req.json();

    if (!supplier_id) {
      return Response.json({ error: 'supplier_id required' }, { status: 400 });
    }

    // Validate supplier ownership
    const suppliers = await base44.entities.Supplier.filter({
      id: supplier_id,
      company_id: tenantId
    });

    if (!suppliers || suppliers.length === 0) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const supplier = suppliers[0];
    const automationResults = {
      risk_assessment: null,
      document_verification: null,
      data_requests: [],
      workflows_triggered: []
    };

    // STEP 1: Trigger automated risk assessment
    try {
      const riskResult = await base44.functions.invoke('automatedRiskScreening', {
        supplier_id,
        depth: 'standard'
      });
      automationResults.risk_assessment = riskResult.data;
    } catch (error) {
      automationResults.risk_assessment = { error: error.message };
    }

    // STEP 2: AI document verification for uploaded onboarding docs
    if (onboarding_data?.uploaded_documents?.length > 0) {
      for (const doc of onboarding_data.uploaded_documents) {
        try {
          const verificationResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Verify this supplier onboarding document for completeness and authenticity:
            
Document Type: ${doc.document_type}
Expected Data: Company registration, tax certificates, compliance attestations

Check for:
1. Document authenticity indicators (watermarks, stamps, signatures)
2. Data completeness (all required fields filled)
3. Expiration dates and validity
4. Regulatory compliance indicators
5. Red flags or inconsistencies

Return assessment:`,
            file_urls: [doc.file_url],
            response_json_schema: {
              type: "object",
              properties: {
                authentic: { type: "boolean" },
                complete: { type: "boolean" },
                confidence_score: { type: "number" },
                missing_fields: { type: "array", items: { type: "string" } },
                red_flags: { type: "array", items: { type: "string" } },
                expiry_date: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          });

          // Update document verification status
          await base44.entities.SupplierDocumentVerification.create({
            supplier_id,
            document_id: doc.id,
            verification_type: 'ai_automated',
            status: verificationResult.authentic && verificationResult.complete ? 'verified' : 'flagged',
            verification_date: new Date().toISOString(),
            confidence_score: verificationResult.confidence_score,
            findings: verificationResult,
            verified_by: 'AI_SYSTEM'
          });

          automationResults.document_verification = verificationResult;
        } catch (error) {
          console.error('Document verification failed:', error);
        }
      }
    }

    // STEP 3: Smart workflow triggers based on supplier type and regulations
    const workflows = [];

    // PCF Data Request - for manufacturing suppliers
    if (['raw_material', 'component', 'contract_manufacturer', 'oem'].includes(supplier.supplier_type)) {
      if (supplier.pcf_relevant || supplier.lca_relevant) {
        try {
          const pactResult = await base44.functions.invoke('pactDataExchange', {
            supplier_id,
            request_type: 'pcf_request',
            message: 'Welcome! Please submit Product Carbon Footprint data per PACT framework for compliance.'
          });
          workflows.push({ type: 'pact_pcf_request', status: 'sent', result: pactResult.data });
        } catch (error) {
          workflows.push({ type: 'pact_pcf_request', status: 'failed', error: error.message });
        }
      }
    }

    // CBAM Data Request - for suppliers shipping CBAM goods
    if (supplier.cbam_relevant && supplier.ships_to_eu) {
      await base44.entities.DataRequest.create({
        tenant_id: tenantId,
        supplier_id,
        request_type: 'cbam_emissions',
        status: 'pending',
        requested_by: user.email,
        requested_at: new Date().toISOString(),
        due_date: calculateDueDate(45),
        message: 'Please provide CBAM emissions data for imported goods per EU Regulation 2023/956'
      });
      workflows.push({ type: 'cbam_data_request', status: 'sent' });
    }

    // EUDR Traceability - for deforestation-risk suppliers
    if (supplier.eudr_relevant) {
      await base44.entities.OnboardingTask.create({
        supplier_id,
        task_type: 'documentation',
        title: 'EUDR Geo-location and Traceability Data',
        description: 'Submit geo-coordinates and plot data for all production sites per EUDR requirements',
        status: 'pending',
        due_date: calculateDueDate(60)
      });
      workflows.push({ type: 'eudr_traceability', status: 'sent' });
    }

    // PFAS Declaration - for chemical/component suppliers
    if (supplier.pfas_relevant) {
      await base44.entities.OnboardingTask.create({
        supplier_id,
        task_type: 'questionnaire',
        questionnaire_type: 'pfas',
        title: 'PFAS Substance Declaration',
        description: 'Declare all PFAS substances per EU REACH restriction (effective 2025)',
        status: 'pending',
        due_date: calculateDueDate(30)
      });
      workflows.push({ type: 'pfas_declaration', status: 'sent' });
    }

    // ESG Questionnaire - for high-risk suppliers
    if (automationResults.risk_assessment?.risk_assessment?.overall_risk === 'high' || 
        automationResults.risk_assessment?.risk_assessment?.overall_risk === 'critical') {
      await base44.entities.SupplierESGQuestionnaire.create({
        supplier_id,
        questionnaire_type: 'csddd_self_assessment',
        status: 'sent',
        sent_date: new Date().toISOString(),
        due_date: calculateDueDate(21),
        template_version: 'CSDDD_2026_v1'
      });
      workflows.push({ type: 'csddd_esg_questionnaire', status: 'sent', reason: 'High risk detected' });
    }

    automationResults.workflows_triggered = workflows;

    // STEP 4: Update supplier onboarding status
    await base44.entities.Supplier.update(supplier_id, {
      onboarding_status: 'completed',
      onboarding_completion_date: new Date().toISOString(),
      status: 'active'
    });

    // STEP 5: Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      company_id: tenantId,
      user_email: user.email,
      action: 'COMPLETE_ONBOARDING',
      entity_type: 'Supplier',
      entity_id: supplier_id,
      module: 'SupplyLens',
      severity: 'INFO',
      notes: `Onboarding completed with ${workflows.length} automated workflows triggered`,
      changes: automationResults
    });

    return Response.json({
      success: true,
      supplier_id,
      automation_results: automationResults,
      message: `Onboarding completed. ${workflows.length} automated workflows initiated.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateDueDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
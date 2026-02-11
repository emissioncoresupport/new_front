import React, { useState } from 'react';
import UnifiedOrchestrator from '../services/UnifiedOrchestrator';
import AuditTrailService from '../services/AuditTrailService';
import DraggableDashboard from '@/components/layout/DraggableDashboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, Sparkles, Database, CheckCircle, ArrowRight, ArrowLeft,
  Building2, User, Package, ShieldCheck, FileText, Loader2,
  AlertTriangle, Globe, Hash, ShieldAlert, Eye
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { triggerSupplierOnboarding } from './OnboardingWorkflow';
import ExtractionFeedbackModal from './ExtractionFeedbackModal';
import CBAMDocumentViewer from '../cbam/CBAMDocumentViewer';
import ERPSyncModal from './ERPSyncModal';

const COUNTRIES = [
  "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Austria", 
  "Poland", "Czech Republic", "Sweden", "Denmark", "Finland", "Norway",
  "China", "India", "USA", "UK", "Japan", "South Korea", "Taiwan", 
  "Vietnam", "Thailand", "Indonesia", "Malaysia", "Singapore", "Philippines",
  "Mexico", "Brazil", "Argentina", "Chile", "Canada", "Australia"
];

const STEPS = [
  { id: 'source', title: 'Data Source', icon: Upload },
  { id: 'basic', title: 'Basic Info', icon: Building2 },
  { id: 'contact', title: 'Contact', icon: User },
  { id: 'compliance', title: 'Compliance', icon: ShieldCheck },
  { id: 'review', title: 'Review', icon: CheckCircle }
];

export default function UnifiedSupplierWizard({ open, onOpenChange, onComplete, supplier }) {
  const isEditMode = !!supplier;
  const [currentStep, setCurrentStep] = useState(isEditMode ? 1 : 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showERPSync, setShowERPSync] = useState(false);
  const [formData, setFormData] = useState(supplier || {
    legal_name: '', trade_name: '', country: '', city: '', address: '',
    vat_number: '', eori_number: '', chamber_id: '', duns_number: '', website: '',
    nace_code: '', tier: 'tier_1', status: 'active', supplier_type: '',
    source: 'manual',
    // Operational
    production_capacity_annual: '', lead_time_days: '', moq: '', 
    payment_terms_days: 30, incoterms_preference: '', aeo_status: false,
    // Financial
    annual_revenue_eur: '', employee_count: '', credit_rating: '',
    // Compliance objects
    csddd_human_rights_dd: {},
    csddd_environmental_dd: {},
    conflict_minerals: {},
    reach_compliance: {},
    carbon_performance: {},
    ethics_compliance: {}
  });
  const [contactData, setContactData] = useState({ name: '', email: '', phone: '' });
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [riskAssessmentResults, setRiskAssessmentResults] = useState(null);
  const [sanctionsResults, setSanctionsResults] = useState(null);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    console.log('=== FILE UPLOAD TRIGGERED ===');
    console.log('Files selected:', files.length);
    
    if (files.length === 0) {
      console.log('No files selected - returning');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading(`Processing ${files.length} file(s)...`);
    console.log('Toast shown, processing state set');

    try {
      console.log('Getting authenticated user...');
      const user = await base44.auth.me();
      console.log('User authenticated:', user.email, 'company_id:', user.company_id);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}:`, file.name, file.type, file.size);
        
        toast.loading(`Uploading ${file.name}...`, { id: toastId });

        // Upload file
        console.log('Uploading file to storage...');
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        const fileUrl = uploadResult.file_url;
        console.log('File uploaded successfully:', fileUrl);

        // Calculate hash
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const file_hash_sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Create document record
        const docRecord = await base44.entities.Document.create({
          tenant_id: user.company_id,
          object_type: 'Supplier',
          object_id: 'pending',
          file_name: file.name,
          file_url: fileUrl,
          file_hash_sha256,
          file_size_bytes: file.size,
          document_type: 'onboarding',
          uploaded_by: user.email,
          uploaded_at: new Date().toISOString(),
          status: 'processing'
        });
        console.log('Document record created:', docRecord.id);

        toast.loading(`AI analyzing ${file.name}...`, { id: toastId });

        // Create source record for pipeline processing
        const sourceRecord = await base44.entities.SourceRecord.create({
          tenant_id: user.company_id,
          source_system: 'document_upload',
          entity_type: 'supplier',
          external_id: file_hash_sha256,
          source_data: {},
          raw_payload: { file_name: file.name, file_url: fileUrl },
          document_ids: [docRecord.id],
          status: 'processing',
          ingested_at: new Date().toISOString()
        });

        // AI EXTRACTION
        const extractionResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract supplier company information from this document with compliance intelligence.
                
Extract ALL available fields:
- legal_name, trade_name, country (ISO alpha-2), city, address, postal_code
- vat_number, eori_number, chamber_id, duns_number
- primary_contact_email, primary_contact_phone, website
- supplier_type: raw_material|component|contract_manufacturer|oem|distributor|service_provider
- nace_code, manufacturing_countries, certifications

COMPLIANCE DETECTION (analyze document content):
- cbam_relevant: Produces/ships cement, steel, aluminum, fertilizers, electricity, hydrogen? (boolean)
- eudr_relevant: Related to cattle, cocoa, coffee, palm oil, rubber, soy, wood? (boolean)
- pfas_relevant: Chemicals, coatings, textiles with water/stain resistance? (boolean)
- pcf_relevant: Manufacturing requiring carbon footprint? (boolean)
- eudamed_relevant: Medical device manufacturing/distribution? (boolean)

Be thorough and extract EVERYTHING available.`,
          file_urls: [fileUrl],
          response_json_schema: {
            type: "object",
            properties: {
              legal_name: { type: "string" },
              trade_name: { type: "string" },
              country: { type: "string" },
              city: { type: "string" },
              address: { type: "string" },
              postal_code: { type: "string" },
              vat_number: { type: "string" },
              eori_number: { type: "string" },
              chamber_id: { type: "string" },
              duns_number: { type: "string" },
              primary_contact_email: { type: "string" },
              primary_contact_phone: { type: "string" },
              website: { type: "string" },
              supplier_type: { type: "string" },
              nace_code: { type: "string" },
              manufacturing_countries: { type: "array", items: { type: "string" } },
              certifications: { type: "array", items: { type: "string" } },
              cbam_relevant: { type: "boolean" },
              eudr_relevant: { type: "boolean" },
              pfas_relevant: { type: "boolean" },
              pcf_relevant: { type: "boolean" },
              eudamed_relevant: { type: "boolean" }
            }
          }
        });

        // Update source record with extracted data
        await base44.entities.SourceRecord.update(sourceRecord.id, {
          source_data: extractionResult,
          normalized_data: extractionResult,
          confidence_score: 85,
          status: 'normalized'
        });

        // Merge AI results into form with compliance flags
        setFormData({
          ...formData,
          ...extractionResult,
          source: 'ai_extracted',
          cbam_relevant: extractionResult.cbam_relevant || formData.cbam_relevant || false,
          eudr_relevant: extractionResult.eudr_relevant || formData.eudr_relevant || false,
          pfas_relevant: extractionResult.pfas_relevant || formData.pfas_relevant || false,
          pcf_relevant: extractionResult.pcf_relevant || formData.pcf_relevant || false,
          lca_relevant: extractionResult.pcf_relevant || formData.lca_relevant || false,
          eudamed_relevant: extractionResult.eudamed_relevant || formData.eudamed_relevant || false
        });

        if (extractionResult.primary_contact_email) {
          setContactData({
            name: extractionResult.contact_name || '',
            email: extractionResult.primary_contact_email,
            phone: extractionResult.primary_contact_phone || ''
          });
        }

        await base44.entities.Document.update(docRecord.id, { 
          status: 'verified',
          object_type: 'SourceRecord',
          object_id: sourceRecord.id
        });

        setUploadedDocs(prev => [...prev, {
          id: docRecord.id,
          name: file.name,
          url: fileUrl,
          size: file.size,
          hash: file_hash_sha256,
          source_record_id: sourceRecord.id
        }]);

        // Show compliance detection summary
        const detectedCompliance = [];
        if (extractionResult.cbam_relevant) detectedCompliance.push('CBAM');
        if (extractionResult.eudr_relevant) detectedCompliance.push('EUDR');
        if (extractionResult.pfas_relevant) detectedCompliance.push('PFAS');
        if (extractionResult.pcf_relevant) detectedCompliance.push('PCF');
        if (extractionResult.eudamed_relevant) detectedCompliance.push('EUDAMED');

        toast.dismiss(toastId);
        if (detectedCompliance.length > 0) {
          toast.success(`Extracted data from ${file.name} | Detected: ${detectedCompliance.join(', ')}`);
        } else {
          toast.success(`Extracted data from ${file.name}`);
        }
      }

      toast.dismiss(toastId);
      setCurrentStep(1);
    } catch (error) {
      console.error('=== UPLOAD ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      toast.dismiss(toastId);
      toast.error('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleValidateIdentifiers = async () => {
    if (!formData.legal_name || !formData.country) {
      toast.error("Legal name and country required");
      return;
    }

    setIsValidating(true);
    const toastId = toast.loading("Validating with EU registries...");

    try {
      const result = await base44.functions.invoke('euRegistryValidator', {
        supplier_id: supplier?.id || 'validation_only',
        vat_number: formData.vat_number,
        eori_number: formData.eori_number,
        country: formData.country
      });

      setValidationResults(result.data);
      toast.dismiss(toastId);
      
      if (result.data.vat_valid || result.data.eori_valid) {
        toast.success(`✓ Validated successfully`);
      } else {
        toast.warning(`⚠ Validation issues detected`);
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Validation failed: " + error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFinish = async () => {
    if (!formData.legal_name || !formData.country) {
      toast.error('Legal name and country are required');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Saving supplier...');
    
    try {
      const user = await base44.auth.me();

      // Create or update supplier
      let supplierId = supplier?.id;
      let evidencePackId = null;
      let sourceRecordId = null;

      if (!supplierId) {
        // Step 1: Create Source Record (ingestion pipeline entry point)
        const sourceRecord = await base44.entities.SourceRecord.create({
          tenant_id: user.company_id,
          source_system: formData.source === 'manual' ? 'manual_entry' : formData.source,
          entity_type: 'supplier',
          external_id: `manual_${Date.now()}`,
          source_data: formData,
          raw_payload: formData,
          document_ids: uploadedDocs.map(d => d.id),
          status: 'processing',
          ingested_at: new Date().toISOString(),
          ingested_by: user.email
        });
        sourceRecordId = sourceRecord.id;

        // Step 2: Create evidence pack
        const evidencePack = await base44.entities.EvidencePack.create({
          tenant_id: user.company_id,
          entity_type: 'supplier',
          entity_id: 'pending',
          pack_type: 'onboarding',
          created_by: user.email,
          status: 'approved',
          decision_metadata: {
            onboarding_method: formData.source,
            uploaded_documents: uploadedDocs.length,
            source_record_id: sourceRecordId
          }
        });
        evidencePackId = evidencePack.id;

        // Step 3: Create canonical supplier
        const newSupplier = await base44.entities.Supplier.create({
          company_id: user.company_id,
          ...formData,
          onboarding_status: 'in_progress',
          data_completeness: calculateCompleteness(formData)
        });
        supplierId = newSupplier.id;

        // Step 4: Link source record to canonical entity
        await base44.entities.SourceRecord.update(sourceRecordId, {
          canonical_entity_id: supplierId,
          status: 'canonical'
        });

        // Update evidence pack with supplier ID
        await base44.entities.EvidencePack.update(evidencePackId, { entity_id: supplierId });

        // Create change log
        await base44.entities.ChangeLog.create({
          tenant_id: user.company_id,
          entity_type: 'supplier',
          entity_id: supplierId,
          action: 'create',
          actor_id: user.email,
          actor_role: user.role,
          new_values_json: formData,
          reason_text: 'Supplier onboarded via wizard',
          correlation_id: evidencePackId
        });

        // Publish canonical event for downstream modules
        await base44.entities.EventOutbox.create({
          tenant_id: user.company_id,
          event_type: 'supplier_created',
          entity_type: 'supplier',
          entity_id: supplierId,
          payload: {
            supplier_id: supplierId,
            legal_name: formData.legal_name,
            country: formData.country,
            compliance_flags: {
              cbam_relevant: formData.cbam_relevant,
              eudr_relevant: formData.eudr_relevant,
              pfas_relevant: formData.pfas_relevant,
              pcf_relevant: formData.pcf_relevant,
              eudamed_relevant: formData.eudamed_relevant
            },
            evidence_pack_id: evidencePackId
          },
          status: 'pending'
        });

        // Trigger orchestration event
        window.dispatchEvent(new CustomEvent('supplierCreated', {
          detail: { supplierId: supplierId, supplier: formData }
        }));
        
        toast.success('Supplier created successfully');
      } else {
        // Update existing - create change log
        const oldData = { ...supplier };
        await base44.entities.Supplier.update(supplierId, formData);

        await base44.entities.ChangeLog.create({
          tenant_id: user.company_id,
          entity_type: 'supplier',
          entity_id: supplierId,
          action: 'update',
          actor_id: user.email,
          actor_role: user.role,
          old_values_json: oldData,
          new_values_json: formData,
          reason_text: 'Supplier data updated via wizard'
        });

        // Trigger orchestration re-sync event
        window.dispatchEvent(new CustomEvent('supplierUpdated', {
          detail: { supplierId: supplierId, changes: formData }
        }));

        toast.success('Supplier updated successfully');
      }

      // Create contact
      if (contactData.email) {
        try {
          await base44.entities.SupplierContact.create({
            supplier_id: supplierId,
            tenant_id: user.company_id,
            ...contactData,
            role: 'general',
            is_primary: true,
            active: true
          });
        } catch (error) {
          console.warn('Contact creation failed:', error);
        }
      }

      // Link documents to evidence pack
      if (evidencePackId) {
        for (const doc of uploadedDocs) {
          try {
            await base44.entities.Document.update(doc.id, { 
              object_type: 'Supplier',
              object_id: supplierId 
            });

            // Create evidence item linking
            await base44.entities.EvidenceItem.create({
              tenant_id: user.company_id,
              evidence_pack_id: evidencePackId,
              item_type: 'source_document',
              reference_id: doc.id,
              description: `Onboarding document: ${doc.name}`
            });

            // Update source record if exists
            if (doc.source_record_id) {
              await base44.entities.SourceRecord.update(doc.source_record_id, {
                canonical_entity_id: supplierId,
                status: 'canonical'
              });
            }
          } catch (error) {
            console.warn('Document linking failed:', error);
          }
        }
      }

      toast.dismiss(toastId);
      
      // AUTOMATED POST-ONBOARDING ORCHESTRATION (parallel execution)
      toast.loading('Running compliance automation...', { id: 'automation' });
      
      const automationPromises = [
        // 1. Risk Tier Classification
        base44.functions.invoke('supplierRiskTierClassifier', { supplier_id: supplierId })
          .catch(error => ({ error: error.message })),
        
        // 2. Sanctions Screening
        base44.functions.invoke('comprehensiveSanctionsScreening', { supplier_id: supplierId })
          .catch(error => ({ error: error.message })),
        
        // 3. External Data Enrichment
        base44.functions.invoke('externalDataEnrichment', { supplier_id: supplierId })
          .catch(error => ({ error: error.message }))
      ];

      const [riskResult, sanctionsResult, enrichmentResult] = await Promise.all(automationPromises);

      toast.dismiss('automation');

      if (riskResult?.data) setRiskAssessmentResults(riskResult.data);
      if (sanctionsResult?.data) {
        setSanctionsResults(sanctionsResult.data);
        if (sanctionsResult.data.screening_results.overall_risk === 'blocked') {
          toast.error('🚨 SANCTIONS MATCH - Supplier blocked');
          return; // Don't proceed with onboarding
        }
      }

      if (enrichmentResult?.data) {
        toast.success(`✓ Enriched ${enrichmentResult.data.fields_enriched} fields from public sources`);
      }

      // Send supplier portal invitation
      if (!isEditMode && contactData.email) {
        try {
          await base44.functions.invoke('inviteSupplierToPortal', {
            supplier_id: supplierId,
            custom_message: 'Welcome! Please complete your compliance profile to enable seamless collaboration.'
          });
          toast.success('✉️ Portal invitation sent to supplier');
        } catch (error) {
          console.warn('Portal invitation failed:', error);
        }
      }

      // Trigger onboarding completion handler (AI automation)
      const orchestrate = !isEditMode;
      if (orchestrate) {
        try {
          const automationResult = await base44.functions.invoke('onboardingCompletionHandler', {
            supplier_id: supplierId,
            onboarding_data: {
              supplier_type: formData.supplier_type,
              cbam_relevant: formData.cbam_relevant,
              eudr_relevant: formData.eudr_relevant,
              pfas_relevant: formData.pfas_relevant,
              pcf_relevant: formData.pcf_relevant,
              uploaded_documents: uploadedDocs.map(doc => ({
                id: doc.id,
                file_url: doc.file_url,
                document_type: doc.document_type
              }))
            }
          });

          toast.dismiss('automation');
          const workflowCount = automationResult.data?.automation_results?.workflows_triggered?.length || 0;
          toast.success(`Supplier onboarded successfully! ${workflowCount} automated workflows triggered.`);
        } catch (error) {
          console.error('Automation error:', error);
          toast.dismiss('automation');
          toast.warning('Supplier saved, but automation failed. Manual review recommended.');
        }
      } else {
        toast.dismiss('automation');
      }

      if (onComplete) onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Supplier save error:', error);
      toast.dismiss(toastId);
      toast.dismiss('automation');
      toast.error('Failed to save supplier: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateCompleteness = (data) => {
    const fields = ['legal_name', 'country', 'city', 'vat_number', 'eori_number', 'website'];
    const filled = fields.filter(f => data[f] && String(data[f]).trim()).length;
    return Math.round((filled / fields.length) * 100);
  };

  const StepIcon = STEPS[currentStep].icon;

  return (
    <>
    <DraggableDashboard
      open={open}
      onClose={() => onOpenChange(false)}
      title={isEditMode ? "Edit Supplier" : "AI Supplier Onboarding"}
      icon={Sparkles}
      width="800px"
      height="85vh"
    >
      <div className="h-full flex flex-col p-6">

        {/* Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Step {currentStep + 1} of {STEPS.length}</span>
            <span className="text-slate-900 font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#86b027] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Step Icons */}
        <div className="flex justify-between mb-6">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep;
            const isComplete = idx < currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 flex-1">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  isActive && "bg-[#86b027] text-white",
                  isComplete && "bg-[#86b027] text-white",
                  !isActive && !isComplete && "bg-slate-200 text-slate-400"
                )}>
                  {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-[9px] uppercase text-slate-600 text-center">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto mb-4">
          {currentStep === 0 && !isEditMode && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/40 backdrop-blur-xl border border-white/30 flex items-center justify-center">
                  <StepIcon className="w-8 h-8 text-[#86b027]" />
                </div>
                <h3 className="text-2xl font-extralight mb-2 text-slate-900">Choose Data Source</h3>
                <p className="text-sm text-slate-600 font-medium">How would you like to add this supplier?</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <label
                  htmlFor="wizard-file-upload-input"
                  className={cn(
                    "h-36 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all backdrop-blur-md",
                    isProcessing ? "border-slate-300 bg-slate-50/60 cursor-not-allowed" : "border-white/40 hover:border-[#86b027]/60 hover:bg-[#86b027]/10 bg-white/30 backdrop-blur-xl cursor-pointer"
                  )}
                >
                  <input
                    id="wizard-file-upload-input"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                    multiple
                  />
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-10 h-10 animate-spin text-[#86b027]" />
                      <div className="text-center">
                        <div className="font-medium text-sm">Processing...</div>
                        <div className="text-xs text-slate-500 font-medium">AI analyzing</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-700" />
                      <div className="text-center">
                        <div className="font-medium text-slate-900">Upload Document</div>
                        <div className="text-xs text-slate-600 font-medium mt-0.5">PDF, Excel, CSV</div>
                      </div>
                    </>
                  )}
                </label>

                <button
                  type="button"
                  className={cn(
                    "h-36 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all backdrop-blur-md",
                    isProcessing ? "border-slate-300 bg-slate-50/60 cursor-not-allowed" : "border-white/40 hover:border-[#86b027]/60 hover:bg-[#86b027]/10 bg-white/30 backdrop-blur-xl"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isProcessing) {
                      console.log('=== ERP SYNC CLICKED ===');
                      setShowERPSync(true);
                      console.log('showERPSync set to true');
                    }
                  }}
                  disabled={isProcessing}
                >
                  <Database className="w-10 h-10 text-slate-700" />
                  <div className="text-center">
                    <div className="font-medium text-slate-900">Sync from ERP</div>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">SAP, Oracle, etc</div>
                  </div>
                </button>

                <button
                  type="button"
                  className={cn(
                    "h-36 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all backdrop-blur-md",
                    isProcessing ? "border-slate-300 bg-slate-50/60 cursor-not-allowed" : "border-white/40 hover:border-[#86b027]/60 hover:bg-[#86b027]/10 bg-white/30 backdrop-blur-xl"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isProcessing) {
                      console.log('=== MANUAL ENTRY CLICKED ===');
                      setCurrentStep(1);
                      console.log('Current step set to 1');
                    }
                  }}
                  disabled={isProcessing}
                >
                  <FileText className="w-10 h-10 text-slate-700" />
                  <div className="text-center">
                    <div className="font-medium text-slate-900">Manual Entry</div>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">Fill form manually</div>
                  </div>
                </button>
              </div>

              {uploadedDocs.length > 0 && (
                <div className="bg-gradient-to-br from-[#86b027]/10 to-transparent backdrop-blur-xl border border-[#86b027]/30 rounded-xl p-5 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#86b027]" />
                      <p className="text-sm font-semibold text-slate-900">AI Extracted Data ({uploadedDocs.length} file{uploadedDocs.length > 1 ? 's' : ''})</p>
                    </div>
                    <Badge className="bg-[#86b027] text-white">
                      ✓ Auto-filled
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {uploadedDocs.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#86b027]/20 hover:border-[#86b027]/50 transition-all shadow-sm">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#86b027]/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-[#86b027]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                            <p className="text-xs text-slate-500">
                              {(doc.size / 1024).toFixed(1)} KB • Data extracted & merged
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setViewingDocument({
                              file_name: doc.name,
                              file_url: doc.url,
                              file_size_bytes: doc.size,
                              file_hash_sha256: doc.hash
                            });
                            setIsDocViewerOpen(true);
                          }}
                          className="h-8 px-4 gap-2 flex-shrink-0 border-[#86b027] text-[#86b027] hover:bg-[#86b027]/10"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="font-medium">View PDF</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <strong>AI extracted:</strong> Legal name, country, contact info, VAT, EORI, and compliance flags have been auto-filled in the form below. Review and edit if needed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <p className="text-sm text-slate-600 mb-4">
                Start with essentials. Detailed compliance data will be collected automatically.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Legal Name *</Label>
                  <Input
                    value={formData.legal_name}
                    onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                    placeholder="Company GmbH"
                  />
                </div>
                <div>
                  <Label>Trade Name</Label>
                  <Input
                    value={formData.trade_name}
                    onChange={(e) => setFormData({...formData, trade_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Country *</Label>
                  <Select value={formData.country} onValueChange={(v) => setFormData({...formData, country: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div>
                  <Label>VAT Number</Label>
                  <Input
                    value={formData.vat_number}
                    onChange={(e) => setFormData({...formData, vat_number: e.target.value})}
                    placeholder="DE123456789"
                  />
                </div>
                <div>
                  <Label>EORI Number</Label>
                  <Input
                    value={formData.eori_number}
                    onChange={(e) => setFormData({...formData, eori_number: e.target.value})}
                    placeholder="DE123456789012"
                  />
                </div>
                <div>
                  <Label>DUNS Number</Label>
                  <Input
                    value={formData.duns_number}
                    onChange={(e) => setFormData({...formData, duns_number: e.target.value})}
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <Label>Supplier Type</Label>
                  <Select value={formData.supplier_type} onValueChange={(v) => setFormData({...formData, supplier_type: v})}>
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw_material">Raw Material</SelectItem>
                      <SelectItem value="component">Component</SelectItem>
                      <SelectItem value="contract_manufacturer">Contract Manufacturer</SelectItem>
                      <SelectItem value="oem">OEM</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="service_provider">Service Provider</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Annual Revenue (EUR)</Label>
                  <Input
                    type="number"
                    value={formData.annual_revenue_eur}
                    onChange={(e) => setFormData({...formData, annual_revenue_eur: e.target.value})}
                    placeholder="1000000"
                  />
                </div>
                <div>
                  <Label>Employee Count</Label>
                  <Input
                    type="number"
                    value={formData.employee_count}
                    onChange={(e) => setFormData({...formData, employee_count: e.target.value})}
                    placeholder="50"
                  />
                </div>
                <div>
                  <Label>Credit Rating</Label>
                  <Select value={formData.credit_rating} onValueChange={(v) => setFormData({...formData, credit_rating: v})}>
                    <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AAA">AAA</SelectItem>
                      <SelectItem value="AA">AA</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="BBB">BBB</SelectItem>
                      <SelectItem value="BB">BB</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  💡 <strong>Smart Onboarding:</strong> After activation, the system will automatically:
                </p>
                <ul className="text-xs text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                  <li>Enrich data from public sources (company registries, CDP, credit bureaus)</li>
                  <li>Classify risk tier and run sanctions screening</li>
                  <li>Invite supplier to complete detailed compliance via self-service portal</li>
                  <li>Extract additional data from any uploaded documents using AI</li>
                </ul>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Primary Contact</h3>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={contactData.name}
                    onChange={(e) => setContactData({...contactData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={contactData.email}
                    onChange={(e) => setContactData({...contactData, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={contactData.phone}
                    onChange={(e) => setContactData({...contactData, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-2">Compliance Modules</h3>
              <p className="text-sm text-slate-600 mb-4">Select relevant regulations (detailed data collected via supplier portal)</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'cbam_relevant', label: 'CBAM', desc: 'Carbon Border Adjustment' },
                  { key: 'eudr_relevant', label: 'EUDR', desc: 'Deforestation' },
                  { key: 'pfas_relevant', label: 'PFAS', desc: 'Forever Chemicals' },
                  { key: 'pcf_relevant', label: 'PCF', desc: 'Product Footprint' },
                  { key: 'eudamed_relevant', label: 'EUDAMED', desc: 'Medical Devices' },
                  { key: 'ppwr_relevant', label: 'PPWR', desc: 'Packaging' }
                ].map(({ key, label, desc }) => (
                  <div key={key} className={cn(
                    "p-3 rounded-lg border-2 cursor-pointer transition-all",
                    formData[key] ? "border-[#86b027] bg-[#86b027]/10" : "border-slate-200 bg-white"
                  )} onClick={() => setFormData({...formData, [key]: !formData[key]})}>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={formData[key] || false}
                        onCheckedChange={(checked) => setFormData({...formData, [key]: checked})}
                      />
                      <Label className="cursor-pointer text-sm">{label}</Label>
                      {formData[key] && formData.source === 'ai_extracted' && (
                        <span className="text-xs text-[#86b027]">✓ AI detected</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 ml-6">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Review & Activate</h3>
              <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Supplier</Label>
                  <p className="text-lg font-semibold">{formData.legal_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Location</Label>
                  <p className="text-sm">{formData.city}, {formData.country}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Contact</Label>
                  <p className="text-sm">{contactData.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Compliance Modules</Label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {Object.entries(formData).filter(([k, v]) => k.endsWith('_relevant') && v).map(([k]) => (
                      <Badge key={k} className="bg-[#86b027]">{k.replace('_relevant', '').toUpperCase()}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Automation Pipeline</Label>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-2">
                    <p className="text-sm text-blue-900 mb-2">
                      <strong>Upon activation, system will automatically:</strong>
                    </p>
                    <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                      <li>✓ Risk tier classification (Critical/Strategic/Preferred/Approved)</li>
                      <li>✓ Sanctions screening (OFAC, EU, UN lists)</li>
                      <li>✓ Data enrichment from public sources (company registry, CDP, credit bureaus)</li>
                      <li>✓ Invite supplier to self-service portal for CSDDD compliance data</li>
                      <li>✓ Process uploaded documents with AI (certificates, audits, declarations)</li>
                      <li>✓ Activate continuous monitoring (news, certificates, performance)</li>
                    </ul>
                  </div>
                </div>
                {riskAssessmentResults && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <Label className="text-xs text-amber-900 font-semibold">Automated Risk Assessment</Label>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">
                        <strong>Risk Tier:</strong> {riskAssessmentResults.risk_tier.toUpperCase()} 
                        <Badge className="ml-2" variant={riskAssessmentResults.risk_level === 'critical' ? 'destructive' : 'secondary'}>
                          {riskAssessmentResults.risk_score}/100
                        </Badge>
                      </p>
                      <p className="text-xs text-slate-600">
                        Due Diligence: {riskAssessmentResults.dd_depth} • 
                        Reassessment: {riskAssessmentResults.reassessment_months} months
                      </p>
                    </div>
                  </div>
                )}
                {sanctionsResults && sanctionsResults.screening_results.overall_risk !== 'clear' && (
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <Label className="text-xs text-red-900 font-semibold">⚠️ Sanctions Screening Alert</Label>
                    <p className="text-sm text-red-800 mt-1">
                      {sanctionsResults.screening_results.matches.length} risk(s) detected - Manual review required
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0 || isProcessing}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={isProcessing}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={isSubmitting} className="bg-[#86b027]">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {isEditMode ? 'Update' : 'Complete Onboarding'}
            </Button>
          )}
        </div>
      </div>

    </DraggableDashboard>

    {/* Document Viewer */}
    {isDocViewerOpen && viewingDocument && (
      <CBAMDocumentViewer
        document={viewingDocument}
        open={isDocViewerOpen}
        onClose={() => {
          setIsDocViewerOpen(false);
          setViewingDocument(null);
        }}
      />
    )}

    {/* ERP Sync Modal */}
    {showERPSync && (
      <ERPSyncModal
        open={showERPSync}
        onClose={() => {
          console.log('=== ERP SYNC MODAL CLOSING ===');
          setShowERPSync(false);
        }}
        onSyncComplete={(syncedData) => {
          console.log('=== ERP SYNC COMPLETED ===');
          console.log('Synced data:', syncedData);
          setFormData({
            ...formData,
            ...syncedData,
            source: 'erp_sync'
          });
          setShowERPSync(false);
          setCurrentStep(1);
          toast.success('Data synced from ERP successfully');
        }}
      />
    )}
    </>
  );
}
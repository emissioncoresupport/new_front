import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, FileText, Database, CheckCircle, XCircle, 
  AlertCircle, Loader2, Sparkles, Eye, Trash2, RefreshCw,
  Building2, Mail, MapPin, Globe, Hash, ExternalLink, Shield, Pencil
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { runFullRiskAssessment } from './RiskEngine';
import { triggerSupplierOnboarding } from './OnboardingWorkflow';
import UsageMeteringService from '@/components/billing/UsageMeteringService';

export default function IntelligentOnboarding({ onSupplierCreated }) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [extractionResults, setExtractionResults] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedDocument, setSelectedDocument] = useState(null);

  const queryClient = useQueryClient();

  // Fetch existing suppliers for duplicate detection
  const { data: existingSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  // Handle file upload and extraction
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setIsExtracting(true);
    const newResults = [];

    for (const file of files) {
      const loadingToast = toast.loading(`Analyzing ${file.name}...`);

      try {
        // Step 1: Upload file to storage
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        
        if (!uploadResult.file_url) {
          throw new Error('File upload failed - no URL returned');
        }

        // Store file info for preview (will be linked to supplier later)
        const fileInfo = {
          name: file.name,
          url: uploadResult.file_url,
          type: file.type,
          size: file.size,
          uploaded_at: new Date().toISOString()
        };
        setUploadedFiles(prev => [...prev, fileInfo]);

        // Step 2: Extract supplier data using AI with detailed schema
        const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: uploadResult.file_url,
          json_schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                legal_name: { type: "string", description: "Official registered company name" },
                trade_name: { type: "string", description: "Trading or doing business as name" },
                country: { type: "string", description: "Country of registration" },
                city: { type: "string", description: "City location" },
                address: { type: "string", description: "Full street address" },
                vat_number: { type: "string", description: "VAT/Tax identification number" },
                email: { type: "string", description: "Company email address" },
                website: { type: "string", description: "Company website URL" },
                nace_code: { type: "string", description: "NACE industry classification code" },
                chamber_id: { type: "string", description: "Chamber of commerce registration ID" },
                duns_number: { type: "string", description: "DUNS number if available" },
                contact_name: { type: "string", description: "Primary contact person name" },
                contact_email: { type: "string", description: "Contact person email" },
                contact_phone: { type: "string", description: "Contact person phone number" }
              }
            }
          }
        });

        toast.dismiss(loadingToast);

        // Step 3: Process extraction results
        if (extractionResult.status === 'success' && extractionResult.output) {
          // Handle both single supplier and array of suppliers
          let suppliersData = [];
          
          if (Array.isArray(extractionResult.output)) {
            suppliersData = extractionResult.output;
          } else if (extractionResult.output.suppliers && Array.isArray(extractionResult.output.suppliers)) {
            suppliersData = extractionResult.output.suppliers;
          } else if (extractionResult.output.legal_name) {
            suppliersData = [extractionResult.output];
          }

          const suppliers = suppliersData.filter(s => s && (s.legal_name || s.name || s.company_name));
          
          if (suppliers.length === 0) {
            toast.warning(`No supplier data found in ${file.name}`);
            continue;
          }

          suppliers.forEach((supplier, index) => {
            // Normalize legal_name field
            const legalName = supplier.legal_name || supplier.name || supplier.company_name || '';
            
            if (!legalName || legalName.trim() === '') {
              return; // Skip invalid entries
            }
            
            supplier.legal_name = legalName;

            // Check for duplicates by VAT or name
            const duplicate = existingSuppliers.find(s => 
              (supplier.vat_number && s.vat_number === supplier.vat_number) ||
              (supplier.legal_name && s.legal_name?.toLowerCase() === supplier.legal_name?.toLowerCase())
            );

            newResults.push({
              id: `${Date.now()}-${index}`,
              source_file: file.name,
              source_url: uploadResult.file_url,
              file_url: uploadResult.file_url,
              data: {
                ...supplier,
                // Clean up data
                legal_name: supplier.legal_name?.trim(),
                trade_name: supplier.trade_name?.trim(),
                email: supplier.email?.toLowerCase().trim(),
                website: supplier.website?.trim()
              },
              status: duplicate ? 'duplicate' : 'pending',
              duplicate_id: duplicate?.id,
              confidence: 'high',
              verified: false
            });
          });

          toast.success(`Extracted ${suppliers.length} supplier(s) from ${file.name}`);
        } else {
          toast.error(`Failed to extract data from ${file.name}: ${extractionResult.details || 'Unknown error'}`);
        }

      } catch (error) {
        toast.dismiss(loadingToast);
        console.error(`Extraction error for ${file.name}:`, error);
        toast.error(`Failed to process ${file.name}: ${error.message}`);
      }
    }

    if (newResults.length > 0) {
      setExtractionResults([...extractionResults, ...newResults]);
      setActiveTab('review');
      toast.success(`Successfully extracted ${newResults.length} supplier(s) from ${files.length} document(s)`);
    }

    setIsExtracting(false);
  };

  // ERP Sync - Actually fetch from ERPConnection entities and ExternalRecord
  const syncFromERP = async () => {
    setIsExtracting(true);
    const loadingToast = toast.loading('Connecting to ERP system...');

    try {
      // Step 1: Check for active ERP connections
      const erpConnections = await base44.entities.ERPConnection.filter({ status: 'active' });

      if (!erpConnections || erpConnections.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('No active ERP connections found. Please configure an ERP connection first.');
        setIsExtracting(false);
        return;
      }

      const activeConnection = erpConnections[0];
      toast.loading(`Fetching suppliers from ${activeConnection.erp_system}...`);

      // Step 2: Fetch external records (supplier data from ERP)
      const externalRecords = await base44.entities.ExternalRecord.filter({ 
        record_type: 'supplier',
        source_system: activeConnection.erp_system 
      });

      if (!externalRecords || externalRecords.length === 0) {
        toast.dismiss(loadingToast);
        toast.warning('No supplier data found in ERP system');
        setIsExtracting(false);
        return;
      }

      toast.dismiss(loadingToast);
      toast.loading(`Processing ${externalRecords.length} suppliers from ERP...`);

      // Step 3: Process ERP records
      const newResults = [];

      for (const record of externalRecords) {
        try {
          // Parse external data (should contain supplier info)
          const supplierData = typeof record.external_data === 'string' 
            ? JSON.parse(record.external_data) 
            : record.external_data;

          // Check if already imported
          const alreadyImported = existingSuppliers.find(s => 
            s.erp_id === record.external_id || 
            (supplierData.vat_number && s.vat_number === supplierData.vat_number) ||
            (supplierData.legal_name && s.legal_name?.toLowerCase() === supplierData.legal_name?.toLowerCase())
          );

          newResults.push({
            id: `erp-${record.id}`,
            source_file: `${activeConnection.erp_system} (${activeConnection.connection_name || 'ERP'})`,
            data: {
              legal_name: supplierData.name || supplierData.legal_name || supplierData.supplier_name,
              trade_name: supplierData.trade_name || supplierData.dba,
              country: supplierData.country,
              city: supplierData.city,
              address: supplierData.address || supplierData.street_address,
              vat_number: supplierData.vat_number || supplierData.tax_id,
              email: supplierData.email || supplierData.contact_email,
              website: supplierData.website || supplierData.url,
              chamber_id: supplierData.chamber_id || supplierData.registration_number,
              erp_id: record.external_id,
              contact_name: supplierData.contact_name || supplierData.primary_contact,
              contact_email: supplierData.contact_email,
              contact_phone: supplierData.phone || supplierData.contact_phone
            },
            status: alreadyImported ? 'duplicate' : 'pending',
            duplicate_id: alreadyImported?.id,
            confidence: 'high',
            verified: false,
            erp_record_id: record.id
          });
        } catch (parseError) {
          console.error('Error parsing ERP record:', parseError);
          continue;
        }
      }

      setExtractionResults([...extractionResults, ...newResults]);
      setActiveTab('review');
      toast.dismiss();
      toast.success(`Found ${newResults.length} suppliers from ${activeConnection.erp_system}`);

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('ERP sync error:', error);
      toast.error(`Failed to sync from ERP: ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Create supplier mutation with full data integration and risk assessment
  const createSupplierMutation = useMutation({
    mutationFn: async ({ supplierData, sourceFile, erpRecordId, fileUrl, complianceOverrides }) => {
        console.log('Creating supplier with data:', supplierData);

        // Step 1: Detect regulatory compliance relevance using AI
        toast.loading('Analyzing compliance requirements with AI...');
        const complianceAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this supplier data and determine regulatory compliance relevance:

Supplier: ${supplierData.legal_name}
Country: ${supplierData.country}
City: ${supplierData.city}
NACE Code: ${supplierData.nace_code || 'Not provided'}
Industry: ${supplierData.industry || 'Not provided'}
Products/Services: ${supplierData.products || 'Not provided'}

Determine if this supplier is relevant for:
1. CBAM (Carbon Border Adjustment Mechanism) - Does it produce/import steel, cement, aluminum, fertilizers, electricity, hydrogen, or other CBAM goods?
2. PFAS (Per- and Polyfluoroalkyl Substances) - Does it manufacture or supply textiles, packaging, electronics, or chemical products that might contain PFAS?
3. EUDR (EU Deforestation Regulation) - Does it supply cattle, cocoa, coffee, palm oil, rubber, soy, wood or derived products?
4. PPWR (Packaging and Packaging Waste Regulation) - Does it manufacture or supply packaging materials?

Return a detailed assessment for each regulation including likelihood and reasoning.`,
        response_json_schema: {
          type: "object",
          properties: {
            cbam_relevant: { type: "boolean" },
            cbam_reasoning: { type: "string" },
            pfas_relevant: { type: "boolean" },
            pfas_reasoning: { type: "string" },
            eudr_relevant: { type: "boolean" },
            eudr_reasoning: { type: "string" },
            ppwr_relevant: { type: "boolean" },
            ppwr_reasoning: { type: "string" },
            recommended_actions: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Step 2: Create supplier with compliance flags (user overrides take precedence)
      toast.loading('Creating supplier profile...');
      const supplier = await base44.entities.Supplier.create({
        legal_name: supplierData.legal_name,
        trade_name: supplierData.trade_name,
        country: supplierData.country || 'Unknown',
        city: supplierData.city,
        address: supplierData.address,
        vat_number: supplierData.vat_number,
        chamber_id: supplierData.chamber_id,
        duns_number: supplierData.duns_number,
        email: supplierData.email,
        website: supplierData.website,
        nace_code: supplierData.nace_code,
        erp_id: supplierData.erp_id,
        tier: 'tier_1',
        status: 'active',
        risk_level: 'medium', // Will be updated by risk assessment
        risk_score: 50, // Will be updated by risk assessment
        cbam_relevant: complianceOverrides?.cbam_relevant ?? complianceAnalysis.cbam_relevant ?? false,
        pfas_relevant: complianceOverrides?.pfas_relevant ?? complianceAnalysis.pfas_relevant ?? false,
        eudr_relevant: complianceOverrides?.eudr_relevant ?? complianceAnalysis.eudr_relevant ?? false,
        ppwr_relevant: complianceOverrides?.ppwr_relevant ?? complianceAnalysis.ppwr_relevant ?? false,
        data_completeness: calculateCompleteness(supplierData),
        source: erpRecordId ? 'erp_sync' : 'document_extraction',
        notes: `Automatically onboarded from ${sourceFile}\n\nCompliance Analysis:\n- CBAM: ${complianceAnalysis.cbam_reasoning || 'N/A'}\n- PFAS: ${complianceAnalysis.pfas_reasoning || 'N/A'}\n- EUDR: ${complianceAnalysis.eudr_reasoning || 'N/A'}\n- PPWR: ${complianceAnalysis.ppwr_reasoning || 'N/A'}`
      });

      // Step 2.5: Upload source document to Evidence Vault
      toast.loading('Saving source document...');
      if (fileUrl) {
        await base44.entities.EvidenceDocument.create({
          supplier_id: supplier.id,
          file_name: sourceFile,
          file_url: fileUrl,
          document_type: 'onboarding_document',
          uploaded_by: 'system',
          uploaded_date: new Date().toISOString(),
          verification_status: 'pending',
          confidentiality_level: 'internal',
          tags: ['onboarding', 'automated_extraction']
        });
      }

      // Step 3: Create primary contact if provided
      toast.loading('Creating contact...');
      const contacts = [];
      if (supplierData.contact_name && supplierData.contact_email) {
        const contact = await base44.entities.SupplierContact.create({
          supplier_id: supplier.id,
          name: supplierData.contact_name,
          email: supplierData.contact_email,
          phone: supplierData.contact_phone,
          role: 'general',
          is_primary: true,
          source: erpRecordId ? 'erp_sync' : 'automated_extraction'
        });
        contacts.push(contact);
      }

      // Step 4: Create default site/facility if location data exists
      const sites = [];
      if (supplierData.city && supplierData.country) {
        const site = await base44.entities.SupplierSite.create({
          supplier_id: supplier.id,
          site_name: `${supplierData.legal_name} - Headquarters`,
          country: supplierData.country,
          city: supplierData.city,
          address: supplierData.address,
          facility_type: 'headquarters',
          is_primary: true
        });
        sites.push(site);
      }

      // Step 5: Run comprehensive risk assessment
      toast.loading('Running AI risk assessment...');
      const allSuppliers = await base44.entities.Supplier.list();
      const allSites = await base44.entities.SupplierSite.list();
      const allTasks = await base44.entities.OnboardingTask.list();

      const { runSingleSupplierRiskAssessment } = await import('./RiskEngine');
      const updatedSupplier = await runSingleSupplierRiskAssessment(
        supplier, 
        allSuppliers, 
        allSites, 
        allTasks
      );

      // Step 6: Trigger full onboarding workflow with automated emails
      toast.loading('Sending welcome emails and creating tasks...');
      await triggerSupplierOnboarding(updatedSupplier, contacts);

      // Step 6.5: Track usage
      await UsageMeteringService.trackSupplierOnboarding({
        supplierId: supplier.id
      });

      // Step 7: Create compliance alerts based on AI analysis
      if (complianceAnalysis.recommended_actions?.length > 0) {
        for (const action of complianceAnalysis.recommended_actions) {
          await base44.entities.RiskAlert.create({
            supplier_id: supplier.id,
            alert_type: 'compliance',
            severity: 'info',
            title: 'Regulatory Compliance Recommendation',
            description: action,
            status: 'open',
            source: 'ai_compliance_analysis'
          });
        }
      }

      // Step 8: Link to ERP record if applicable
      if (erpRecordId) {
        await base44.entities.ExternalRecord.update(erpRecordId, {
          mapped_entity_id: supplier.id,
          mapping_status: 'mapped',
          last_sync_date: new Date().toISOString()
        });
      }

      return { supplier: updatedSupplier, complianceAnalysis };
    },
    onSuccess: (data) => {
      console.log('✅ Supplier created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-sites'] });
      queryClient.invalidateQueries({ queryKey: ['external-records'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['risk-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['evidence-documents'] });
    },
    onError: (error) => {
      console.error('❌ Supplier creation failed:', error);
      toast.error('Failed to create supplier: ' + error.message);
    }
  });

  const calculateCompleteness = (data) => {
    const fields = ['legal_name', 'country', 'city', 'address', 'vat_number', 'website', 'nace_code'];
    const filled = fields.filter(f => data[f]).length;
    return Math.round(filled / fields.length * 100);
  };

  // Approve and create supplier with full onboarding
  const handleApprove = async (result) => {
    const loadingToast = toast.loading(`Creating supplier "${result.data.legal_name}"...`);

    try {
      console.log('🚀 Starting full supplier onboarding for:', result.data.legal_name);

      const { supplier, complianceAnalysis } = await createSupplierMutation.mutateAsync({
        supplierData: result.data,
        sourceFile: result.source_file,
        erpRecordId: result.erp_record_id,
        fileUrl: result.file_url || result.source_url,
        complianceOverrides: result.compliance_overrides
      });

      console.log('✅ Supplier created with full workflow:', supplier);

      setExtractionResults(prev => 
        prev.map(r => r.id === result.id ? { 
          ...r, 
          status: 'approved',
          created_supplier_id: supplier.id,
          compliance_analysis: complianceAnalysis
        } : r)
      );

      toast.dismiss(loadingToast);

      // Show detailed success with compliance info
      const complianceFlags = [];
      if (complianceAnalysis?.cbam_relevant) complianceFlags.push('CBAM');
      if (complianceAnalysis?.pfas_relevant) complianceFlags.push('PFAS');
      if (complianceAnalysis?.eudr_relevant) complianceFlags.push('EUDR');
      if (complianceAnalysis?.ppwr_relevant) complianceFlags.push('PPWR');

      toast.success(`✅ ${result.data.legal_name} fully onboarded!`, {
        description: `Risk: ${supplier.risk_score}/100 | Modules: ${complianceFlags.join(', ') || 'None'} | Emails sent`,
        duration: 6000
      });

      if (onSupplierCreated) {
        onSupplierCreated();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('❌ Supplier creation failed:', error);
      toast.error(`Failed to create supplier: ${error.message}`);
    }
  };

  // Reject extraction
  const handleReject = (resultId) => {
    setExtractionResults(prev => 
      prev.map(r => r.id === resultId ? { ...r, status: 'rejected' } : r)
    );
    toast.success('Extraction rejected');
  };

  // Edit data
  const handleEdit = (resultId, field, value) => {
    setExtractionResults(prev =>
      prev.map(r => r.id === resultId ? { 
        ...r, 
        data: { ...r.data, [field]: value },
        verified: true 
      } : r)
    );
  };

  const pendingCount = extractionResults.filter(r => r.status === 'pending').length;
  const approvedCount = extractionResults.filter(r => r.status === 'approved').length;
  const duplicateCount = extractionResults.filter(r => r.status === 'duplicate').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pending Review</p>
                <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Approved</p>
                <p className="text-2xl font-bold text-slate-900">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Duplicates</p>
                <p className="text-2xl font-bold text-slate-900">{duplicateCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Extracted</p>
                <p className="text-2xl font-bold text-slate-900">{extractionResults.length}</p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </TabsTrigger>
          <TabsTrigger value="review">
            <Eye className="w-4 h-4 mr-2" />
            Review & Approve ({pendingCount})
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#86b027]" />
                Document Upload & Extraction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-[#86b027] transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-upload').click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium text-slate-900 mb-2">
                  Drop files here or click to upload
                </p>
                <p className="text-sm text-slate-500">
                  Supports: PDF, Excel, CSV, Word documents
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  AI will automatically extract supplier information
                </p>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                  className="hidden"
                  onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                  disabled={isExtracting}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-slate-200" />
                <span className="text-xs text-slate-500 px-3">OR</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              <Button
                onClick={syncFromERP}
                disabled={isExtracting}
                className="w-full bg-[#02a1e8] hover:bg-[#0291d1] text-white"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing from ERP...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Sync from ERP System
                  </>
                )}
              </Button>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Uploaded Documents ({uploadedFiles.length}):</p>
                  <div className="grid grid-cols-2 gap-3">
                    {uploadedFiles.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between gap-3 text-sm bg-white border border-slate-200 p-3 rounded-lg hover:border-[#86b027] transition-all group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                          onClick={() => setSelectedDocument(file)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-4">
          {extractionResults.filter(r => r.status === 'pending' || r.status === 'duplicate').length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-12 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No suppliers pending review</p>
                <p className="text-xs text-slate-400 mt-2">Upload documents to extract supplier data</p>
              </CardContent>
            </Card>
          ) : (
            extractionResults
              .filter(r => r.status === 'pending' || r.status === 'duplicate')
              .map((result) => (
                <Card key={result.id} className={cn(
                  "border-2",
                  result.status === 'duplicate' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{result.data.legal_name || 'Unnamed Supplier'}</CardTitle>
                        {result.status === 'duplicate' && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                            Duplicate Detected
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                          {result.confidence} confidence
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500">
                          Source: {result.source_file}
                        </p>
                        {result.source_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => setSelectedDocument({
                              name: result.source_file,
                              url: result.source_url,
                              type: result.source_file.endsWith('.pdf') ? 'application/pdf' : 'unknown',
                              uploaded_at: new Date().toISOString()
                            })}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Document
                          </Button>
                        )}
                      </div>
                    </div>
                      <div className="flex items-center gap-2">
                        {result.status !== 'duplicate' && (
                          <Button
                            onClick={() => handleApprove(result)}
                            disabled={createSupplierMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve & Create
                          </Button>
                        )}
                        <Button
                          onClick={() => handleReject(result.id)}
                          variant="outline"
                          className="border-rose-300 text-rose-600 hover:bg-rose-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Legal Name
                        </label>
                        <input
                          type="text"
                          value={result.data.legal_name || ''}
                          onChange={(e) => handleEdit(result.id, 'legal_name', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Country
                        </label>
                        <input
                          type="text"
                          value={result.data.country || ''}
                          onChange={(e) => handleEdit(result.id, 'country', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          City
                        </label>
                        <input
                          type="text"
                          value={result.data.city || ''}
                          onChange={(e) => handleEdit(result.id, 'city', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          VAT Number
                        </label>
                        <input
                          type="text"
                          value={result.data.vat_number || ''}
                          onChange={(e) => handleEdit(result.id, 'vat_number', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          Email
                        </label>
                        <input
                          type="email"
                          value={result.data.email || ''}
                          onChange={(e) => handleEdit(result.id, 'email', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Website
                        </label>
                        <input
                          type="url"
                          value={result.data.website || ''}
                          onChange={(e) => handleEdit(result.id, 'website', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Source Document Preview */}
                    {result.source_url && (
                      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-700">Source Document:</span>
                            <span className="text-sm text-slate-600">{result.source_file}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDocument({
                              name: result.source_file,
                              url: result.source_url,
                              type: result.source_file.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
                                    result.source_file.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'unknown',
                              size: 0,
                              uploaded_at: new Date().toISOString()
                            })}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Document
                          </Button>
                        </div>
                      </div>
                    )}

                    {result.status === 'duplicate' && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          ⚠️ A supplier with similar information already exists in the system. 
                          Please review before approving.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDocument(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{selectedDocument.name}</h3>
                  <p className="text-xs text-slate-500">
                    {(selectedDocument.size / 1024).toFixed(1)} KB • Uploaded {new Date(selectedDocument.uploaded_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedDocument.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDocument(null)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Document Preview */}
            <div className="flex-1 overflow-auto bg-slate-100 p-4">
              {selectedDocument.type === 'application/pdf' || selectedDocument.name?.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-full min-h-[700px]">
                  <iframe
                    src={`${selectedDocument.url}#view=FitH&toolbar=0`}
                    className="w-full h-full bg-white rounded-lg shadow-inner border-0"
                    title={selectedDocument.name}
                    style={{ minHeight: '700px' }}
                  />
                </div>
              ) : selectedDocument.type?.includes('image') || selectedDocument.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div className="flex items-center justify-center h-full min-h-[500px]">
                  <img 
                    src={selectedDocument.url} 
                    alt={selectedDocument.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 min-h-[500px]">
                  <FileText className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-slate-600 mb-2">Preview not available for this file type</p>
                  <p className="text-sm text-slate-500 mb-4">Click the button below to download or view in a new tab</p>
                  <Button
                    onClick={() => window.open(selectedDocument.url, '_blank')}
                    className="bg-[#86b027] hover:bg-[#6d8f20] text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Document
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
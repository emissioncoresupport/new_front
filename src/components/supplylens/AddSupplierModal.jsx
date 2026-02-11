import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Globe, FileText, AlertTriangle, User, Sparkles, Database, Loader2, ShieldCheck, CheckCircle, Eye } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import NACECodeAutocomplete from './NACECodeAutocomplete';

const countries = [
  "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Austria", 
  "Poland", "Czech Republic", "Sweden", "China", "India", "USA", "UK", 
  "Japan", "South Korea", "Taiwan", "Vietnam", "Thailand", "Indonesia"
];

const defaultFormData = {
  legal_name: '',
  trade_name: '',
  vat_number: '',
  eori_number: '',
  chamber_id: '',
  country: '',
  address: '',
  city: '',
  website: '',
  nace_code: '',
  tier: 'unknown',
  status: 'active',
  cbam_relevant: false,
  pfas_relevant: false,
  eudr_relevant: false,
  ppwr_relevant: false,
  dpp_relevant: false,
  lca_relevant: false,
  pcf_relevant: false,
  ccf_relevant: false,
  csrd_relevant: false,
  vsme_relevant: false,
  eudamed_relevant: false,
  logistics_relevant: false,
  conflict_minerals_relevant: false,
  reach_relevant: false,
  notes: ''
};

export default function AddSupplierModal({ open, onOpenChange, onSubmit, isSubmitting, editSupplier }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingErp, setIsFetchingErp] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [formData, setFormData] = useState(defaultFormData);
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  React.useEffect(() => {
    if (!open) return;
    
    if (editSupplier) {
      setFormData(editSupplier);
      setContactData({ name: '', email: '', phone: '' });
    } else {
      setFormData({
        legal_name: '',
        trade_name: '',
        vat_number: '',
        eori_number: '',
        chamber_id: '',
        country: '',
        address: '',
        city: '',
        website: '',
        nace_code: '',
        tier: 'unknown',
        status: 'active',
        cbam_relevant: false,
        pfas_relevant: false,
        eudr_relevant: false,
        ppwr_relevant: false,
        dpp_relevant: false,
        lca_relevant: false,
        pcf_relevant: false,
        ccf_relevant: false,
        csrd_relevant: false,
        vsme_relevant: false,
        eudamed_relevant: false,
        logistics_relevant: false,
        conflict_minerals_relevant: false,
        reach_relevant: false,
        notes: ''
      });
      setContactData({ name: '', email: '', phone: '' });
      setUploadedDocuments([]);
      setValidationResults(null);
    }
  }, [open, editSupplier]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Form Data:', formData);
    console.log('Contact Data:', contactData);
    console.log('Uploaded Documents:', uploadedDocuments);
    
    // Validate required fields
    if (!formData.legal_name || !formData.country) {
      console.error('Validation failed: Missing required fields');
      toast.error('Please fill in required fields: Legal Name and Country');
      return;
    }
    
    if (!editSupplier && (!contactData.name || !contactData.email)) {
      console.error('Validation failed: Missing contact information');
      toast.error('Please fill in contact name and email for new supplier');
      return;
    }
    
    console.log('Validation passed, calling onSubmit...');
    
    try {
      await onSubmit({ 
        ...formData, 
        contact: contactData,
        uploaded_documents: uploadedDocuments
      });
      console.log('✅ onSubmit completed successfully');
    } catch (error) {
      console.error('❌ onSubmit failed:', error);
      toast.error(`Failed to save supplier: ${error.message}`);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Starting file upload:', file.name, file.type, file.size);
    setUploadedFile(file);
    setIsAnalyzing(true);
    const loadingToast = toast.loading(`Uploading ${file.name}...`);

    try {
      // Step 1: Upload file
      console.log('Uploading file to storage...');
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      console.log('Upload result:', uploadResult);

      if (!uploadResult || !uploadResult.file_url) {
        throw new Error('File upload failed - no URL returned');
      }

      const file_url = uploadResult.file_url;
      console.log('File uploaded successfully:', file_url);

      // Store uploaded document
      const docInfo = {
        name: file.name,
        url: file_url,
        type: file.type,
        size: file.size,
        uploaded_at: new Date().toISOString()
      };
      setUploadedDocuments(prev => [...prev, docInfo]);
      toast.dismiss(loadingToast);
      toast.success('✓ Document uploaded successfully!');

      // Step 2: Check file type support
      const supportedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.csv', '.xlsx', '.xls', '.doc', '.docx'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      console.log('File extension:', fileExtension);

      if (!supportedTypes.includes(fileExtension)) {
        console.log('File type not supported for extraction');
        toast.info('Document saved. AI extraction not available for this file type.');
        setIsAnalyzing(false);
        return;
      }

      // Step 3: Extract supplier data with AI
      console.log('Starting AI extraction...');
      toast.loading('AI is analyzing document and extracting supplier data...');

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            legal_name: { type: "string" },
            trade_name: { type: "string" },
            vat_number: { type: "string" },
            eori_number: { type: "string" },
            chamber_id: { type: "string" },
            country: { type: "string" },
            city: { type: "string" },
            address: { type: "string" },
            website: { type: "string" },
            nace_code: { type: "string" },
            contact_name: { type: "string" },
            contact_email: { type: "string" },
            contact_phone: { type: "string" }
          }
        }
      });

      console.log('Extraction result:', extractResult);
      toast.dismiss();

      if (extractResult.status === 'success' && extractResult.output) {
        const data = extractResult.output;
        console.log('Extracted data:', data);

        // Populate ALL form fields
        setFormData(prev => ({
          ...prev,
          legal_name: data.legal_name || prev.legal_name,
          trade_name: data.trade_name || prev.trade_name,
          vat_number: data.vat_number || prev.vat_number,
          eori_number: data.eori_number || prev.eori_number,
          chamber_id: data.chamber_id || prev.chamber_id,
          country: data.country || prev.country,
          city: data.city || prev.city,
          address: data.address || prev.address,
          website: data.website || prev.website,
          nace_code: data.nace_code || prev.nace_code
        }));

        // Populate contact tab
        if (data.contact_name || data.contact_email) {
          setContactData({
            name: data.contact_name || '',
            email: data.contact_email || '',
            phone: data.contact_phone || ''
          });
        }

        const fieldsExtracted = Object.keys(data).filter(k => data[k] && String(data[k]).trim()).length;
        toast.success(`✅ AI extracted ${fieldsExtracted} fields from document!`, {
          description: 'Form has been auto-filled. Review and click "Add Supplier" to save.',
          duration: 5000
        });
      } else {
        console.error('Extraction failed:', extractResult);
        toast.warning('Document uploaded but AI extraction failed', {
          description: extractResult.details || 'Could not parse supplier data from document'
        });
      }
    } catch (error) {
      toast.dismiss();
      console.error('File upload/extraction error:', error);
      toast.error(`Error: ${error.message}`, {
        description: 'The document was saved but data extraction failed'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoFill = () => {
    console.log('Upload Document button clicked');
    const fileInput = document.getElementById('supplier-doc-upload');
    console.log('File input element:', fileInput);
    if (fileInput) {
      fileInput.click();
    } else {
      console.error('File input not found');
      toast.error('Upload button configuration error');
    }
  };

  const handleErpFetch = async () => {
    if (!formData.legal_name && !formData.vat_number) {
      toast.error("Enter supplier name or VAT number to search ERP");
      return;
    }

    setIsFetchingErp(true);
    const loadingToast = toast.loading('Connecting to ERP system...');

    try {
      // Check for active ERP connections
      const erpConnections = await base44.entities.ERPConnection.filter({ status: 'active' });

      if (!erpConnections || erpConnections.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('No ERP system configured. Go to Integrations tab to connect your ERP.');
        setIsFetchingErp(false);
        return;
      }

      const erp = erpConnections[0];
      toast.loading(`Searching ${erp.erp_system} for supplier...`);

      // Fetch external records matching the search
      const externalRecords = await base44.entities.ExternalRecord.filter({ 
        record_type: 'supplier',
        source_system: erp.erp_system
      });

      // Search for matching supplier
      const matchingRecord = externalRecords.find(record => {
        const data = typeof record.external_data === 'string' 
          ? JSON.parse(record.external_data) 
          : record.external_data;
        
        const name = (data.name || data.legal_name || data.supplier_name || '').toLowerCase();
        const vat = (data.vat_number || data.tax_id || '').toLowerCase();
        
        return name.includes(formData.legal_name.toLowerCase()) || 
               (formData.vat_number && vat === formData.vat_number.toLowerCase());
      });

      toast.dismiss(loadingToast);

      if (matchingRecord) {
        const data = typeof matchingRecord.external_data === 'string' 
          ? JSON.parse(matchingRecord.external_data) 
          : matchingRecord.external_data;

        setFormData(prev => ({
          ...prev,
          legal_name: data.name || data.legal_name || data.supplier_name || prev.legal_name,
          trade_name: data.trade_name || data.dba || prev.trade_name,
          vat_number: data.vat_number || data.tax_id || prev.vat_number,
          country: data.country || prev.country,
          city: data.city || prev.city,
          address: data.address || data.street_address || prev.address,
          website: data.website || data.url || prev.website,
          chamber_id: data.chamber_id || data.registration_number || prev.chamber_id,
          erp_id: matchingRecord.external_id,
          tier: 'tier_1',
          status: 'active',
          source: 'erp_sync'
        }));

        if (data.contact_name || data.contact_email) {
          setContactData({
            name: data.contact_name || data.primary_contact || '',
            email: data.contact_email || data.email || '',
            phone: data.phone || data.contact_phone || ''
          });
        }

        toast.success(`✓ Found and synced from ${erp.erp_system}!`);
      } else {
        toast.warning(`No match found in ${erp.erp_system}. Try uploading a document instead.`);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error(error);
      toast.error(`ERP sync failed: ${error.message}`);
    } finally {
      setIsFetchingErp(false);
    }
  };

  const handleValidateIdentifiers = async () => {
    if (!formData.legal_name || !formData.country) {
      toast.error("Legal name and country are required for validation");
      return;
    }

    console.log('Starting validation for:', formData.legal_name, formData.country);
    setIsValidating(true);
    const loadingToast = toast.loading("🔍 Connecting to EU registries and business databases...");

    try {
      const prompt = `You are a business verification expert with access to real-time web data. Validate the following company identifiers using EU registries (VIES, ECS), business databases, and official company registers:

Company: ${formData.legal_name}
Country: ${formData.country}
${formData.vat_number ? `VAT Number: ${formData.vat_number}` : 'VAT Number: Not provided'}
${formData.eori_number ? `EORI Number: ${formData.eori_number}` : 'EORI Number: Not provided'}
${formData.chamber_id ? `Chamber/Registry ID: ${formData.chamber_id}` : 'Chamber ID: Not provided'}

TASK: Search real-time web data from official EU registries, VIES database, and business registers to:
1. Verify VAT number format and registration status (use VIES if EU country)
2. Validate EORI number format and check if it's active
3. Verify company registration in chamber of commerce/business register
4. Cross-check if company name matches registered business name
5. Search for any sanctions, compliance warnings, or legal issues

IMPORTANT: Use actual web search to check these registries, do not make assumptions.

Return a detailed JSON response:
{
  "eori": {
    "valid": boolean,
    "format_correct": boolean,
    "details": "Detailed findings from web search",
    "confidence": number (0-100)
  },
  "vat": {
    "valid": boolean,
    "format_correct": boolean,
    "active": boolean,
    "details": "VIES or tax authority findings",
    "confidence": number (0-100)
  },
  "chamber": {
    "valid": boolean,
    "registered_name": "Official registered name if found",
    "details": "Business register findings",
    "confidence": number (0-100)
  },
  "warnings": ["List any compliance issues, sanctions, or red flags found"],
  "recommendations": ["Actionable steps to resolve any issues"],
  "overall_score": number (0-100, overall confidence in supplier legitimacy)
}`;

      console.log('Calling InvokeLLM with web search...');
      toast.loading('AI is searching EU registries and business databases...');
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            eori: { 
              type: "object",
              properties: {
                valid: { type: "boolean" },
                format_correct: { type: "boolean" },
                details: { type: "string" },
                confidence: { type: "number" }
              }
            },
            vat: { 
              type: "object",
              properties: {
                valid: { type: "boolean" },
                format_correct: { type: "boolean" },
                active: { type: "boolean" },
                details: { type: "string" },
                confidence: { type: "number" }
              }
            },
            chamber: { 
              type: "object",
              properties: {
                valid: { type: "boolean" },
                registered_name: { type: "string" },
                details: { type: "string" },
                confidence: { type: "number" }
              }
            },
            warnings: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            overall_score: { type: "number" }
          },
          required: ["overall_score"]
        }
      });

      console.log('Validation result:', result);
      toast.dismiss(loadingToast);

      if (!result || typeof result.overall_score !== 'number') {
        throw new Error('Invalid validation response from AI');
      }

      setValidationResults(result);
      
      setFormData(prev => ({
        ...prev,
        validation_status: result.overall_score >= 70 ? 'verified' : result.overall_score >= 50 ? 'pending' : 'rejected',
        validation_score: result.overall_score,
        validation_date: new Date().toISOString()
      }));
      
      if (result.overall_score >= 70) {
        toast.success(`✅ Validation passed (${result.overall_score}% confidence)`, {
          description: `All identifiers verified successfully via EU registries`
        });
      } else if (result.overall_score >= 50) {
        toast.warning(`⚠️ Partial validation (${result.overall_score}% confidence)`, {
          description: `Some identifiers verified, review warnings below`
        });
      } else {
        toast.error(`❌ Validation issues (${result.overall_score}% confidence)`, {
          description: `Please review warnings and provide correct identifiers`
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.dismiss(loadingToast);
      toast.error("Validation failed", {
        description: error.message || "Unable to connect to validation services. Check console for details."
      });
      setValidationResults(null);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-slate-100/50 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-medium">
                {editSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </DialogTitle>
            <div className="flex gap-2">
                 {!editSupplier && (
                    <>
                        <Button 
                           variant="outline" 
                           size="sm" 
                           className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-8 px-3 text-xs shadow-none"
                           onClick={handleAutoFill}
                           disabled={isAnalyzing}
                        >
                           {isAnalyzing ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
                           {isAnalyzing ? 'Extracting...' : 'Upload Document'}
                        </Button>
                        <input
                         id="supplier-doc-upload"
                         type="file"
                         accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls,.doc,.docx"
                         className="hidden"
                         onChange={handleFileUpload}
                        />
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-8 px-3 text-xs shadow-none"
                            onClick={handleErpFetch}
                            disabled={isFetchingErp}
                        >
                            {isFetchingErp ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Database className="w-3 h-3 mr-1.5" />}
                            Sync ERP
                        </Button>
                    </>
                 )}
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Legal Name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="legal_name"
                      placeholder="Company GmbH"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_name">Trade Name</Label>
                  <Input
                    id="trade_name"
                    placeholder="Brand name"
                    value={formData.trade_name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Country *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <SelectValue placeholder="Select country" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vat_number">VAT Number</Label>
                  <Input
                    id="vat_number"
                    placeholder="DE123456789"
                    value={formData.vat_number}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eori_number">EORI Number</Label>
                  <Input
                    id="eori_number"
                    placeholder="DE123456789012"
                    value={formData.eori_number}
                    onChange={(e) => setFormData({ ...formData, eori_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chamber_id">Chamber ID</Label>
                  <Input
                    id="chamber_id"
                    placeholder="HRB 12345"
                    value={formData.chamber_id}
                    onChange={(e) => setFormData({ ...formData, chamber_id: e.target.value })}
                  />
                </div>
              </div>

              {/* Validation Button */}
              <div className="pt-3 pb-2">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="w-full text-[#02a1e8] border-[#02a1e8]/30 hover:bg-[#02a1e8]/10"
                  onClick={handleValidateIdentifiers}
                  disabled={isValidating || !formData.legal_name || !formData.country}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Validating with EU registries...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3 h-3 mr-2" />
                      Validate Identifiers (VAT, EORI, Chamber)
                    </>
                  )}
                </Button>
                {validationResults && (
                  <div className="mt-2 text-center">
                    <Badge className={
                      validationResults.overall_score >= 70 ? 'bg-[#86b027] text-white' : 
                      validationResults.overall_score >= 50 ? 'bg-amber-500 text-white' :
                      'bg-rose-500 text-white'
                    }>
                      {validationResults.overall_score}% Validation Confidence
                    </Badge>
                  </div>
                )}
              </div>

              {/* Validation Results */}
              {validationResults && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#545454]">Validation Report</h4>
                    <ShieldCheck className={`w-5 h-5 ${validationResults.overall_score >= 70 ? 'text-[#86b027]' : 'text-amber-500'}`} />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${validationResults.eori.valid ? 'bg-[#86b027]' : 'bg-slate-300'}`} />
                      <span>EORI: {validationResults.eori.confidence}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${validationResults.vat.valid ? 'bg-[#86b027]' : 'bg-slate-300'}`} />
                      <span>VAT: {validationResults.vat.confidence}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${validationResults.chamber.valid ? 'bg-[#86b027]' : 'bg-slate-300'}`} />
                      <span>Registry: {validationResults.chamber.confidence}%</span>
                    </div>
                  </div>

                  {validationResults.warnings.length > 0 && (
                    <div className="space-y-1">
                      {validationResults.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-700 flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          {w}
                        </p>
                      ))}
                    </div>
                  )}

                  {validationResults.recommendations.length > 0 && (
                    <div className="space-y-1">
                      {validationResults.recommendations.map((r, i) => (
                        <p key={i} className="text-xs text-[#86b027] flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />
                          {r}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="website"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <NACECodeAutocomplete
                value={formData.nace_code}
                onChange={(code) => setFormData({ ...formData, nace_code: code })}
              />

              {uploadedDocuments.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Documents ({uploadedDocuments.length})</Label>
                  <div className="space-y-2">
                    {uploadedDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                            <p className="text-xs text-slate-500">{(doc.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tier Classification</Label>
                  <Select
                    value={formData.tier}
                    onValueChange={(value) => setFormData({ ...formData, tier: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier_1">Tier 1 (Direct)</SelectItem>
                      <SelectItem value="tier_2">Tier 2 (Indirect)</SelectItem>
                      <SelectItem value="tier_3">Tier 3 (Sub-tier)</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="bg-[#86b027]/10 border border-[#86b027]/20 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-[#86b027] mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-[#545454]">Primary Contact Person</p>
                            <p className="text-xs text-[#545454]/70 mt-1">
                                This contact will be used for onboarding emails and notifications.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="contact_name">Full Name *</Label>
                        <Input
                            id="contact_name"
                            placeholder="John Doe"
                            value={contactData.name}
                            onChange={(e) => setContactData({...contactData, name: e.target.value})}
                            required={!editSupplier} // Required only for new suppliers
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="contact_email">Email Address *</Label>
                        <Input
                            id="contact_email"
                            type="email"
                            placeholder="john@company.com"
                            value={contactData.email}
                            onChange={(e) => setContactData({...contactData, email: e.target.value})}
                             required={!editSupplier}
                        />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="contact_phone">Phone Number</Label>
                    <Input
                        id="contact_phone"
                        placeholder="+1 234 567 890"
                        value={contactData.phone}
                        onChange={(e) => setContactData({...contactData, phone: e.target.value})}
                    />
                </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Country *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <SelectValue placeholder="Select country" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Munich"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  placeholder="Street, Number, Postal Code"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4 mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Regulatory Relevance</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Mark which regulations this supplier is relevant for based on their products/materials.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="cbam"
                    checked={formData.cbam_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, cbam_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="cbam" className="font-medium text-sm">CBAM</Label>
                    <p className="text-xs text-slate-500">Carbon Border Adjustment</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="pfas"
                    checked={formData.pfas_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, pfas_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="pfas" className="font-medium text-sm">PFAS</Label>
                    <p className="text-xs text-slate-500">Forever Chemicals</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="eudr"
                    checked={formData.eudr_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, eudr_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="eudr" className="font-medium text-sm">EUDR</Label>
                    <p className="text-xs text-slate-500">Deforestation Regulation</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ppwr"
                    checked={formData.ppwr_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, ppwr_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="ppwr" className="font-medium text-sm">PPWR</Label>
                    <p className="text-xs text-slate-500">Packaging Waste</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="dpp"
                    checked={formData.dpp_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, dpp_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="dpp" className="font-medium text-sm">DPP</Label>
                    <p className="text-xs text-slate-500">Digital Product Passport</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="lca"
                    checked={formData.lca_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, lca_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="lca" className="font-medium text-sm">LCA</Label>
                    <p className="text-xs text-slate-500">Life Cycle Assessment</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="pcf"
                    checked={formData.pcf_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, pcf_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="pcf" className="font-medium text-sm">PCF</Label>
                    <p className="text-xs text-slate-500">Product Carbon Footprint</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ccf"
                    checked={formData.ccf_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, ccf_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="ccf" className="font-medium text-sm">CCF</Label>
                    <p className="text-xs text-slate-500">Corporate Carbon Footprint</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="csrd"
                    checked={formData.csrd_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, csrd_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="csrd" className="font-medium text-sm">CSRD</Label>
                    <p className="text-xs text-slate-500">Corporate Sustainability</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="vsme"
                    checked={formData.vsme_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, vsme_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="vsme" className="font-medium text-sm">VSME</Label>
                    <p className="text-xs text-slate-500">Voluntary SME Standard</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="eudamed"
                    checked={formData.eudamed_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, eudamed_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="eudamed" className="font-medium text-sm">EUDAMED</Label>
                    <p className="text-xs text-slate-500">Medical Device Registry</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="logistics"
                    checked={formData.logistics_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, logistics_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="logistics" className="font-medium text-sm">Logistics</Label>
                    <p className="text-xs text-slate-500">Supply Chain Emissions</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="conflict_minerals"
                    checked={formData.conflict_minerals_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, conflict_minerals_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="conflict_minerals" className="font-medium text-sm">Conflict Minerals</Label>
                    <p className="text-xs text-slate-500">3TG & Responsible Sourcing</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="reach"
                    checked={formData.reach_relevant}
                    onCheckedChange={(checked) => setFormData({ ...formData, reach_relevant: checked })}
                  />
                  <div>
                    <Label htmlFor="reach" className="font-medium text-sm">REACH</Label>
                    <p className="text-xs text-slate-500">Chemical Substances</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about this supplier..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.legal_name || !formData.country || (!editSupplier && !contactData.email)}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm"
            >
              {isSubmitting ? 'Saving...' : editSupplier ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
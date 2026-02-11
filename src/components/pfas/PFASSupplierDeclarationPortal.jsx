import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Upload, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import PFASAIExtractionService from './services/PFASAIExtractionService';
import PFASMasterOrchestrator from './services/PFASMasterOrchestrator';

export default function PFASSupplierDeclarationPortal({ supplierId, materialId, materialType = 'sku' }) {
  const [formData, setFormData] = useState({
    claim_status: 'not_present',
    intentionally_added: 'no',
    threshold_definition: '',
    threshold_numeric_ppm: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: '',
    signatory: '',
    signatory_role: '',
    signatory_organization: ''
  });
  const [substances, setSubstances] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const queryClient = useQueryClient();

  const addSubstance = () => {
    setSubstances([...substances, { cas_number: '', substance_name: '', concentration_ppm: '' }]);
  };

  const removeSubstance = (index) => {
    setSubstances(substances.filter((_, i) => i !== index));
  };

  const updateSubstance = (index, field, value) => {
    const updated = [...substances];
    updated[index][field] = value;
    setSubstances(updated);
  };

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    },
    onSuccess: (fileUrl, file) => {
      setUploadedFiles([...uploadedFiles, { name: file.name, url: fileUrl }]);
      toast.success('File uploaded');
    }
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const tenantId = user.tenant_id || 'default';

      // Create Evidence Package
      const evidencePackage = await base44.entities.PFASEvidencePackage.create({
        tenant_id: tenantId,
        object_type: materialType,
        object_id: materialId,
        claim_status: formData.claim_status,
        intentionally_added: formData.intentionally_added,
        threshold_definition: formData.threshold_definition,
        threshold_numeric_ppm: parseFloat(formData.threshold_numeric_ppm) || null,
        valid_from: formData.valid_from,
        valid_to: formData.valid_to,
        signatory: formData.signatory,
        signatory_role: formData.signatory_role,
        signatory_organization: formData.signatory_organization,
        quality_grade: 'B', // Supplier declaration
        confidence_score: 85,
        review_status: 'submitted'
      });

      // Upload evidence documents
      for (const file of uploadedFiles) {
        const fileHash = `sha256_${Date.now()}_${Math.random().toString(36)}`;
        
        await base44.entities.PFASEvidenceDocument.create({
          tenant_id: tenantId,
          evidence_package_id: evidencePackage.id,
          file_url: file.url,
          file_hash_sha256: fileHash,
          file_name: file.name,
          doc_type: 'supplier_declaration',
          uploaded_by: user.email,
          uploaded_at: new Date().toISOString(),
          review_status: 'pending'
        });
      }

      // Create MaterialComposition records
      for (const substance of substances.filter(s => s.cas_number)) {
        await base44.entities.MaterialComposition.create({
          tenant_id: tenantId,
          material_id: materialId,
          material_type: materialType,
          substance_cas: substance.cas_number,
          substance_name: substance.substance_name,
          typical_concentration: parseFloat(substance.concentration_ppm) || 0,
          unit_basis: 'ppm',
          source_type: 'supplier_declaration',
          source_document_id: evidencePackage.id,
          confidence_score: 0.85,
          declared_date: new Date().toISOString(),
          valid_until: formData.valid_to,
          status: 'under_review'
        });
      }

      // AUTO-TRIGGER ASSESSMENT via MasterOrchestrator
      await PFASMasterOrchestrator.createOrUpdateAssessment({
        entity_id: materialId,
        entity_type: materialType,
        status: formData.claim_status === 'not_present' ? 'compliant' : 
                formData.claim_status === 'present' ? 'requires_action' : 'under_review',
        evidence_package_ids: [evidencePackage.id],
        verification_method: 'supplier_declaration',
        source: 'supplier_portal',
        detected_substances: substances.filter(s => s.cas_number)
      });

      return evidencePackage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pfas-evidence-packages']);
      queryClient.invalidateQueries(['pfas-compliance-assessments']);
      queryClient.invalidateQueries(['material-compositions']);
      toast.success('Declaration submitted - Assessment automatically triggered');
      
      // Reset form
      setFormData({
        claim_status: 'not_present',
        intentionally_added: 'no',
        threshold_definition: '',
        threshold_numeric_ppm: '',
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: '',
        signatory: '',
        signatory_role: '',
        signatory_organization: ''
      });
      setSubstances([]);
      setUploadedFiles([]);
    }
  });

  const handleAutoExtract = async (file) => {
    try {
      toast.loading('Extracting PFAS data from document...');
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await PFASAIExtractionService.extractSupplierDeclaration(
        file_url,
        materialId,
        materialType
      );

      toast.dismiss();
      
      if (result.extraction) {
        setFormData({
          claim_status: result.extraction.claim_status,
          intentionally_added: result.extraction.intentionally_added,
          threshold_definition: result.extraction.threshold_definition || '',
          threshold_numeric_ppm: result.extraction.threshold_numeric_ppm || '',
          valid_from: result.extraction.valid_from || formData.valid_from,
          valid_to: result.extraction.valid_to || '',
          signatory: result.extraction.signatory || '',
          signatory_role: result.extraction.signatory_role || '',
          signatory_organization: result.extraction.signatory_organization || ''
        });

        if (result.extraction.substances) {
          setSubstances(result.extraction.substances.map(s => ({
            cas_number: s.cas_number,
            substance_name: s.substance_name,
            concentration_ppm: s.concentration_ppm
          })));
        }

        setUploadedFiles([{ name: file.name, url: file_url }]);
        
        toast.success(`Data extracted (${Math.round(result.extraction.confidence_score * 100)}% confidence) - Review and submit`);
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Extraction failed: ' + error.message);
    }
  };

  return (
    <Card className="border-[#86b027]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#86b027]" />
          PFAS Supplier Declaration
        </CardTitle>
        <p className="text-sm text-slate-600">Submit PFAS-free declaration or substance details for this material</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>PFAS Claim Status *</Label>
            <Select value={formData.claim_status} onValueChange={(v) => setFormData({...formData, claim_status: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_present">Not Present</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
                <SelectItem value="inconclusive">Inconclusive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Intentionally Added? *</Label>
            <Select value={formData.intentionally_added} onValueChange={(v) => setFormData({...formData, intentionally_added: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Threshold Definition</Label>
            <Input
              value={formData.threshold_definition}
              onChange={(e) => setFormData({...formData, threshold_definition: e.target.value})}
              placeholder="e.g., 25 ppm total organofluorine"
            />
          </div>
          <div>
            <Label>Numeric Threshold (ppm)</Label>
            <Input
              type="number"
              value={formData.threshold_numeric_ppm}
              onChange={(e) => setFormData({...formData, threshold_numeric_ppm: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Valid From *</Label>
            <Input
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
            />
          </div>
          <div>
            <Label>Valid Until</Label>
            <Input
              type="date"
              value={formData.valid_to}
              onChange={(e) => setFormData({...formData, valid_to: e.target.value})}
            />
          </div>
        </div>

        {/* Substance List */}
        {formData.claim_status === 'present' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Detected Substances</Label>
              <Button size="sm" variant="outline" onClick={addSubstance}>
                <Plus className="w-3 h-3 mr-1" /> Add Substance
              </Button>
            </div>

            {substances.map((substance, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Input
                    placeholder="CAS Number"
                    value={substance.cas_number}
                    onChange={(e) => updateSubstance(idx, 'cas_number', e.target.value)}
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="Substance Name"
                    value={substance.substance_name}
                    onChange={(e) => updateSubstance(idx, 'substance_name', e.target.value)}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    placeholder="ppm"
                    value={substance.concentration_ppm}
                    onChange={(e) => updateSubstance(idx, 'concentration_ppm', e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <Button size="icon" variant="ghost" onClick={() => removeSubstance(idx)}>
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Signatory */}
        <div className="p-4 bg-slate-50 rounded-lg space-y-3">
          <Label className="font-semibold">Declaration Signatory</Label>
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="Full Name *"
              value={formData.signatory}
              onChange={(e) => setFormData({...formData, signatory: e.target.value})}
            />
            <Input
              placeholder="Role/Title"
              value={formData.signatory_role}
              onChange={(e) => setFormData({...formData, signatory_role: e.target.value})}
            />
            <Input
              placeholder="Organization"
              value={formData.signatory_organization}
              onChange={(e) => setFormData({...formData, signatory_organization: e.target.value})}
            />
          </div>
        </div>

        {/* Upload Documents */}
        <div className="space-y-3">
          <Label>Supporting Documents</Label>
          
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".pdf,.jpg,.png"
              className="hidden"
              id="pfas-declaration-upload"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  uploadMutation.mutate(e.target.files[0]);
                }
              }}
            />
            <label htmlFor="pfas-declaration-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Upload Declaration, SDS, or Certificate</p>
            </label>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {uploadedFiles.map((file, idx) => (
                <Badge key={idx} variant="outline" className="mr-2">{file.name}</Badge>
              ))}
            </div>
          )}

          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('pfas-auto-extract').click()}
            >
              <Upload className="w-3 h-3 mr-2" />
              Or Upload & Auto-Extract with AI
            </Button>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              id="pfas-auto-extract"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleAutoExtract(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>

        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!formData.signatory || submitMutation.isPending}
          className="w-full bg-[#86b027] hover:bg-[#769c22]"
        >
          Submit Declaration for Review
        </Button>
      </CardContent>
    </Card>
  );
}
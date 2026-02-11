import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Sparkles, Upload, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import VSMEAIFieldSuggestions from './VSMEAIFieldSuggestions';

// Validation rules for specific disclosures
const VALIDATION_RULES = {
  'B3': {
    fields: [
      { name: 'energy_consumption_kwh', label: 'Energy Consumption (kWh)', type: 'number', min: 0, required: true },
      { name: 'scope1_emissions_tco2e', label: 'Scope 1 Emissions (tCO2e)', type: 'number', min: 0, required: true },
      { name: 'scope2_emissions_tco2e', label: 'Scope 2 Emissions (tCO2e)', type: 'number', min: 0, required: true }
    ]
  },
  'B4': {
    fields: [
      { name: 'air_pollutants_kg', label: 'Air Pollutants (kg)', type: 'number', min: 0 },
      { name: 'water_pollutants_kg', label: 'Water Pollutants (kg)', type: 'number', min: 0 }
    ]
  },
  'B5': {
    fields: [
      { name: 'sites_near_biodiversity', label: 'Sites Near Biodiversity Areas', type: 'number', min: 0, integer: true },
      { name: 'total_area_hectares', label: 'Total Area (hectares)', type: 'number', min: 0 }
    ]
  },
  'B6': {
    fields: [
      { name: 'water_withdrawal_m3', label: 'Water Withdrawal (m³)', type: 'number', min: 0, required: true },
      { name: 'water_consumption_m3', label: 'Water Consumption (m³)', type: 'number', min: 0, required: true }
    ]
  },
  'B7': {
    fields: [
      { name: 'waste_generated_tonnes', label: 'Waste Generated (tonnes)', type: 'number', min: 0, required: true },
      { name: 'waste_recycled_percent', label: 'Waste Recycled (%)', type: 'number', min: 0, max: 100 }
    ]
  },
  'B8': {
    fields: [
      { name: 'total_employees', label: 'Total Employees', type: 'number', min: 0, integer: true, required: true },
      { name: 'female_employees', label: 'Female Employees', type: 'number', min: 0, integer: true },
      { name: 'male_employees', label: 'Male Employees', type: 'number', min: 0, integer: true },
      { name: 'permanent_employees', label: 'Permanent Employees', type: 'number', min: 0, integer: true },
      { name: 'temporary_employees', label: 'Temporary Employees', type: 'number', min: 0, integer: true }
    ]
  },
  'B9': {
    fields: [
      { name: 'work_accidents', label: 'Work-Related Accidents', type: 'number', min: 0, integer: true, required: true },
      { name: 'fatalities', label: 'Fatalities', type: 'number', min: 0, integer: true, required: true },
      { name: 'work_related_illness', label: 'Work-Related Illnesses', type: 'number', min: 0, integer: true }
    ]
  },
  'B10': {
    fields: [
      { name: 'employees_covered_collective', label: 'Employees Covered by Collective Bargaining (%)', type: 'number', min: 0, max: 100 },
      { name: 'training_hours_per_employee', label: 'Training Hours per Employee', type: 'number', min: 0 }
    ]
  },
  'B11': {
    fields: [
      { name: 'corruption_convictions', label: 'Corruption Convictions', type: 'number', min: 0, integer: true, required: true },
      { name: 'total_fines_eur', label: 'Total Fines (EUR)', type: 'number', min: 0 }
    ]
  },
  'C9': {
    fields: [
      { name: 'board_members_total', label: 'Total Board Members', type: 'number', min: 0, integer: true, required: true },
      { name: 'board_members_female', label: 'Female Board Members', type: 'number', min: 0, integer: true },
      { name: 'female_percentage', label: 'Female Percentage (%)', type: 'number', min: 0, max: 100 }
    ]
  }
};

export default function VSMEDisclosureModal({ disclosure, open, onOpenChange, moduleType }) {
  const queryClient = useQueryClient();
  const existingData = disclosure.existing;

  const [formData, setFormData] = useState({
    is_applicable: existingData?.is_applicable ?? true,
    applicability_justification: existingData?.applicability_justification || '',
    narrative: existingData?.narrative || '',
    data_points: existingData?.data_points || {},
    notes: existingData?.notes || '',
    status: existingData?.status || 'in_progress'
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  // Validation functions
  const validateField = (field, value) => {
    const errors = [];
    
    if (field.required && (value === '' || value === null || value === undefined)) {
      errors.push(`${field.label} is required`);
      return errors;
    }
    
    if (value === '' || value === null || value === undefined) {
      return errors; // Skip validation for optional empty fields
    }
    
    if (field.type === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        errors.push(`${field.label} must be a valid number`);
      } else {
        if (field.min !== undefined && numValue < field.min) {
          errors.push(`${field.label} must be at least ${field.min}`);
        }
        if (field.max !== undefined && numValue > field.max) {
          errors.push(`${field.label} must not exceed ${field.max}`);
        }
        if (field.integer && !Number.isInteger(numValue)) {
          errors.push(`${field.label} must be a whole number`);
        }
      }
    }
    
    return errors;
  };

  const validateAllFields = () => {
    const rules = VALIDATION_RULES[disclosure.code];
    if (!rules || !formData.is_applicable) return true;
    
    const errors = {};
    let hasErrors = false;
    
    rules.fields.forEach(field => {
      const value = formData.data_points[field.name];
      const fieldErrors = validateField(field, value);
      
      if (fieldErrors.length > 0) {
        errors[field.name] = fieldErrors;
        hasErrors = true;
      }
    });
    
    setValidationErrors(errors);
    return !hasErrors;
  };

  const validateOnChange = (fieldName, value) => {
    const rules = VALIDATION_RULES[disclosure.code];
    if (!rules) return;
    
    const field = rules.fields.find(f => f.name === fieldName);
    if (!field) return;
    
    const errors = validateField(field, value);
    
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      if (errors.length > 0) {
        newErrors[fieldName] = errors;
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        reporting_year: new Date().getFullYear(),
        module_type: moduleType,
        disclosure_code: disclosure.code,
        disclosure_category: disclosure.category,
        disclosure_title: disclosure.title,
        ...data,
        evidence_urls: uploadedFiles,
        completed_date: data.status === 'completed' ? new Date().toISOString() : undefined
      };

      if (existingData?.id) {
        return base44.entities.VSMEDisclosure.update(existingData.id, payload);
      } else {
        return base44.entities.VSMEDisclosure.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsme-disclosures'] });
      toast.success('Disclosure saved successfully');
      onOpenChange(false);
    }
  });

  const handleSave = (status) => {
    if (status === 'completed') {
      // Validate required narrative
      if (formData.is_applicable && !formData.narrative) {
        toast.error('Narrative disclosure is required');
        return;
      }
      
      // Validate data points if rules exist
      if (!validateAllFields()) {
        toast.error('Please fix validation errors before completing');
        return;
      }
    }
    
    saveMutation.mutate({ ...formData, status });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    toast.loading('Uploading file...');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFiles([...uploadedFiles, file_url]);
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  const handleAIAssist = async () => {
    toast.loading('AI generating guidance...');
    try {
      const prompt = `You are a VSME reporting expert. Provide detailed guidance for completing this disclosure:

Disclosure: ${disclosure.code} - ${disclosure.title}
Category: ${disclosure.category}
Description: ${disclosure.description}

Provide:
1. What specific data points should be collected
2. How to structure the narrative explanation
3. Common pitfalls to avoid
4. Example of good disclosure

Return as JSON with keys: data_points_guide, narrative_template, tips, example`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            data_points_guide: { type: "string" },
            narrative_template: { type: "string" },
            tips: { type: "array", items: { type: "string" } },
            example: { type: "string" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        narrative: result.narrative_template || prev.narrative
      }));

      toast.success('AI guidance loaded - check the narrative field');
    } catch (error) {
      toast.error('AI assist failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <Badge className={moduleType === 'basic' ? 'bg-[#86b027]' : 'bg-[#02a1e8]'}>
              {disclosure.code}
            </Badge>
            {disclosure.title}
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">{disclosure.description}</p>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Applicability */}
          <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
            <Checkbox
              id="applicable"
              checked={formData.is_applicable}
              onCheckedChange={(checked) => setFormData({ ...formData, is_applicable: checked })}
            />
            <div className="flex-1">
              <Label htmlFor="applicable" className="font-medium cursor-pointer">
                This disclosure is applicable to our business
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Per VSME "if applicable" principle - only disclose if relevant to your operations
              </p>
            </div>
          </div>

          {!formData.is_applicable && (
            <div className="space-y-2">
              <Label>Justification for Non-Applicability *</Label>
              <Textarea
                placeholder="Explain why this disclosure is not applicable to your business..."
                value={formData.applicability_justification}
                onChange={(e) => setFormData({ ...formData, applicability_justification: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
          )}

          {formData.is_applicable && (
            <>
              {/* AI Assist Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[#86b027] border-[#86b027]/30"
                onClick={handleAIAssist}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Guidance
              </Button>

              {/* AI Field Suggestions */}
              {VALIDATION_RULES[disclosure.code] && (
                <VSMEAIFieldSuggestions
                  disclosure={disclosure}
                  currentData={formData.data_points}
                  onApplySuggestion={(fieldName, value) => {
                    setFormData({
                      ...formData,
                      data_points: {
                        ...formData.data_points,
                        [fieldName]: value
                      }
                    });
                    toast.success('Suggestion applied');
                  }}
                />
              )}

              {/* Structured Data Points (if applicable) */}
              {VALIDATION_RULES[disclosure.code] && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Label className="font-bold text-[#545454]">Data Points</Label>
                    <Badge variant="outline" className="text-xs">Validated</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {VALIDATION_RULES[disclosure.code].fields.map(field => (
                      <div key={field.name} className="space-y-2">
                        <Label className="text-sm">
                          {field.label}
                          {field.required && <span className="text-rose-600 ml-1">*</span>}
                        </Label>
                        <Input
                          type={field.type === 'number' ? 'number' : 'text'}
                          step={field.integer ? '1' : 'any'}
                          placeholder={field.type === 'number' ? '0' : ''}
                          value={formData.data_points[field.name] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData({
                              ...formData,
                              data_points: {
                                ...formData.data_points,
                                [field.name]: value
                              }
                            });
                            validateOnChange(field.name, value);
                          }}
                          className={validationErrors[field.name] ? 'border-rose-500' : ''}
                        />
                        {validationErrors[field.name] && (
                          <div className="flex items-start gap-1 text-xs text-rose-600">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{validationErrors[field.name][0]}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Narrative */}
              <div className="space-y-2">
                <Label>Narrative Disclosure *</Label>
                <Textarea
                  placeholder="Describe your company's approach, policies, and performance for this disclosure..."
                  value={formData.narrative}
                  onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
                  className="min-h-[200px]"
                />
                <p className="text-xs text-slate-500">
                  Follow VSME principles: relevant, faithful, comparable, understandable, verifiable
                </p>
              </div>

              {/* Evidence Upload */}
              <div className="space-y-2">
                <Label>Supporting Evidence (Optional)</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="evidence-upload"
                    accept=".pdf,.xlsx,.csv,.jpg,.png"
                  />
                  <label htmlFor="evidence-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">Upload supporting documents</p>
                    <p className="text-xs text-slate-400">PDF, Excel, CSV, Images</p>
                  </label>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadedFiles.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#86b027]">
                        <CheckCircle className="w-3 h-3" />
                        Document {idx + 1} uploaded
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  placeholder="Add internal notes, data sources, calculations..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </>
          )}

          {/* Validation Summary */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-900 text-sm mb-2">Validation Errors</h4>
                  <ul className="text-xs text-rose-700 space-y-1">
                    {Object.entries(validationErrors).map(([field, errors]) => (
                      <li key={field}>• {errors[0]}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => handleSave('in_progress')}
              disabled={saveMutation.isPending}
              className="flex-1"
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave('completed')}
              disabled={saveMutation.isPending || (formData.is_applicable && !formData.narrative)}
              className="flex-1 bg-[#86b027] hover:bg-[#769c22]"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Mark as Complete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Configuration for different questionnaire types
const QUESTIONNAIRES = {
  general: {
    title: "General Due Diligence",
    fields: [
      { id: 'company_size', label: 'Company Size (Employees)', type: 'select', options: ['1-50', '51-200', '201-1000', '1000+'] },
      { id: 'founded_year', label: 'Year Founded', type: 'text' },
      { id: 'has_iso_9001', label: 'ISO 9001 Certified', type: 'boolean' },
      { id: 'has_iso_14001', label: 'ISO 14001 Certified', type: 'boolean' },
      { id: 'sustainability_policy', label: 'Has Sustainability Policy', type: 'boolean' },
      { id: 'policy_link', label: 'Link to Policy', type: 'text' }
    ]
  },
  pfas: {
    title: "PFAS Compliance",
    fields: [
      { id: 'uses_pfas', label: 'Do you intentionally use PFAS in your products?', type: 'boolean' },
      { id: 'pfas_in_process', label: 'Are PFAS used in your manufacturing process?', type: 'boolean' },
      { id: 'pfas_testing', label: 'Do you perform regular PFAS testing?', type: 'boolean' },
      { id: 'phase_out_plan', label: 'Do you have a PFAS phase-out plan?', type: 'boolean' },
      { id: 'comments', label: 'Additional Comments', type: 'textarea' }
    ]
  },
  eudr: {
    title: "EU Deforestation Regulation (EUDR)",
    fields: [
      { id: 'traceable_to_origin', label: 'Are all relevant commodities traceable to plot of land?', type: 'boolean' },
      { id: 'deforestation_free', label: 'Are products deforestation-free (after Dec 2020)?', type: 'boolean' },
      { id: 'geolocation_data', label: 'Do you have geolocation coordinates for all plots?', type: 'boolean' },
      { id: 'high_risk_sourcing', label: 'Do you source from high-risk countries?', type: 'boolean' },
      { id: 'risk_mitigation', label: 'Risk mitigation measures', type: 'textarea' }
    ]
  },
  cbam: {
    title: "CBAM Data Collection",
    fields: [
      { id: 'emissions_data_available', label: 'Is embedded emissions data available?', type: 'boolean' },
      { id: 'direct_emissions', label: 'Direct Emissions (tCO2e/ton)', type: 'text' },
      { id: 'indirect_emissions', label: 'Indirect Emissions (tCO2e/ton)', type: 'text' },
      { id: 'electricity_source', label: 'Main source of electricity', type: 'text' },
      { id: 'carbon_price_paid', label: 'Carbon price paid in country of origin?', type: 'boolean' }
    ]
  }
};

export default function QuestionnaireForm({ task, supplier, open, onOpenChange }) {
  const [formData, setFormData] = useState(task.response_data || {});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const config = QUESTIONNAIRES[task.questionnaire_type] || QUESTIONNAIRES.general;

  const updateTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.OnboardingTask.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-tasks'] });
      toast.success("Questionnaire saved");
      onOpenChange(false);
    }
  });

  const handleAutoFill = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `
        I need to fill out a supplier questionnaire for the company "${supplier.legal_name}" located in ${supplier.country}.
        The questionnaire type is "${task.questionnaire_type}".
        
        Please research this company online and try to infer or find answers for the following fields:
        ${JSON.stringify(config.fields.map(f => ({ id: f.id, label: f.label })))}
        
        Return a JSON object with keys matching the field IDs and the best estimated values.
        For booleans, return true/false. For text, return the string.
        If you cannot find info, leave it null or make a reasonable estimation based on the company's industry (${supplier.nace_code || 'Unknown'}) and size.
        
        IMPORTANT: Return ONLY the JSON object.
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: { type: "object", additionalProperties: true }
      });

      // Merge found data with existing form data (don't overwrite if user already typed something, actually maybe we should overwrite? let's merge)
      setFormData(prev => ({ ...prev, ...result }));
      toast.success("Auto-filled with AI insights!");
    } catch (error) {
      console.error("AI Auto-fill failed:", error);
      toast.error("Failed to auto-fill. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    // Basic validation could go here
    updateTaskMutation.mutate({
      response_data: formData,
      status: 'completed',
      completed_date: new Date().toISOString()
    });
  };

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{config.title}</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-violet-600 border-violet-200 hover:bg-violet-50"
              onClick={handleAutoFill}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Auto-fill with AI
            </Button>
          </DialogTitle>
          <DialogDescription>
            Please complete the following information accurately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {config.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={field.id} className="text-sm font-medium text-slate-700">
                  {field.label}
                </Label>
              </div>
              
              {field.type === 'boolean' ? (
                <div className="flex items-center space-x-2">
                  <Switch 
                    id={field.id} 
                    checked={formData[field.id] === true}
                    onCheckedChange={(checked) => handleChange(field.id, checked)}
                  />
                  <span className="text-sm text-slate-500">{formData[field.id] ? 'Yes' : 'No'}</span>
                </div>
              ) : field.type === 'textarea' ? (
                <Textarea 
                  id={field.id}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder="Enter details..."
                  className="resize-none"
                />
              ) : field.type === 'select' ? (
                <Select 
                  value={formData[field.id]} 
                  onValueChange={(val) => handleChange(field.id, val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  id={field.id}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateTaskMutation.isPending}>
            {updateTaskMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Questionnaire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
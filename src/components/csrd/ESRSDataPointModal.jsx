import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Sparkles, HelpCircle, Lightbulb } from "lucide-react";

export default function ESRSDataPointModal({ open, onOpenChange, dataPoint }) {
  const [formData, setFormData] = useState({
    esrs_standard: '',
    esrs_code: '',
    metric_name: '',
    value: '',
    unit: '',
    reporting_year: new Date().getFullYear(),
    verification_status: 'Unverified',
    data_source: '',
    notes: ''
  });

  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (dataPoint) {
      setFormData({
        esrs_standard: dataPoint.esrs_standard || '',
        esrs_code: dataPoint.esrs_code || '',
        metric_name: dataPoint.metric_name || '',
        value: dataPoint.value || '',
        unit: dataPoint.unit || '',
        reporting_year: dataPoint.reporting_year || new Date().getFullYear(),
        verification_status: dataPoint.verification_status || 'Unverified',
        data_source: dataPoint.data_source || '',
        notes: dataPoint.notes || ''
      });
    } else {
      setFormData({
        esrs_standard: '',
        esrs_code: '',
        metric_name: '',
        value: '',
        unit: '',
        reporting_year: new Date().getFullYear(),
        verification_status: 'Unverified',
        data_source: '',
        notes: ''
      });
    }
    setAiSuggestions(null);
  }, [dataPoint, open]);

  const saveDataPointMutation = useMutation({
    mutationFn: (data) => {
      if (dataPoint) {
        return base44.entities.CSRDDataPoint.update(dataPoint.id, data);
      }
      return base44.entities.CSRDDataPoint.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrd-data-points'] });
      toast.success(dataPoint ? 'Data point updated' : 'Data point created');
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to save data point')
  });

  const handleAISuggestions = async () => {
    if (!formData.esrs_standard) {
      toast.error('Please select an ESRS standard first');
      return;
    }

    setIsLoadingSuggestions(true);
    toast.loading('AI is analyzing common data points for this standard...');

    try {
      const suggestions = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an EFRAG CSRD expert. Provide guidance for ${formData.esrs_standard} data collection.

Explain:
1. What are the most common ESRS disclosure codes (e.g., E1-5, E1-6) for this standard?
2. What are typical metric names for each code? (Be specific with examples)
3. What units are commonly used? (e.g., tCO2e, m³, %, €)

Provide 5 common examples with clear explanations for someone new to CSRD reporting.`,
        response_json_schema: {
          type: 'object',
          properties: {
            explanation: { type: 'string', description: 'Brief explanation of this ESRS standard' },
            common_data_points: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  esrs_code: { type: 'string', description: 'e.g., E1-5' },
                  code_meaning: { type: 'string', description: 'What this code represents' },
                  metric_name_example: { type: 'string' },
                  typical_unit: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setAiSuggestions(suggestions);
      toast.dismiss();
      toast.success('AI guidance ready!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to get AI suggestions');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.esrs_standard || !formData.metric_name || !formData.value) {
      toast.error('ESRS Standard, Metric Name, and Value are required');
      return;
    }
    saveDataPointMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dataPoint ? 'Edit Data Point' : 'Add ESRS Data Point'}</DialogTitle>
          <p className="text-sm text-slate-600">
            Collect quantitative sustainability metrics per ESRS disclosure requirements
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AI Help Card */}
          <div className="bg-[#86b027]/10 border border-[#86b027]/30 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-[#86b027] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#545454] mb-1">Need Help? Get AI Guidance</h4>
                  <p className="text-sm text-slate-700">
                    Not sure what to enter? AI can explain common metrics, codes, and units for your selected standard.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAISuggestions}
                disabled={isLoadingSuggestions || !formData.esrs_standard}
                className="bg-[#86b027] hover:bg-[#769c22] shrink-0"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Get Examples
              </Button>
            </div>
          </div>

          {/* ESRS Standard Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              ESRS Standard *
              <span className="text-xs text-slate-500 font-normal">(Which sustainability topic?)</span>
            </Label>
            <Select 
              value={formData.esrs_standard} 
              onValueChange={(val) => setFormData({...formData, esrs_standard: val})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ESRS Standard" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ESRS E1">ESRS E1 - Climate Change (emissions, energy)</SelectItem>
                <SelectItem value="ESRS E2">ESRS E2 - Pollution (air, water, soil)</SelectItem>
                <SelectItem value="ESRS E3">ESRS E3 - Water & Marine Resources</SelectItem>
                <SelectItem value="ESRS E4">ESRS E4 - Biodiversity & Ecosystems</SelectItem>
                <SelectItem value="ESRS E5">ESRS E5 - Resource Use & Circular Economy</SelectItem>
                <SelectItem value="ESRS S1">ESRS S1 - Own Workforce (employees)</SelectItem>
                <SelectItem value="ESRS S2">ESRS S2 - Workers in Value Chain</SelectItem>
                <SelectItem value="ESRS S3">ESRS S3 - Affected Communities</SelectItem>
                <SelectItem value="ESRS S4">ESRS S4 - Consumers & End-users</SelectItem>
                <SelectItem value="ESRS G1">ESRS G1 - Business Conduct (governance)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* AI Suggestions Display */}
          {aiSuggestions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-[#02a1e8]" />
                <h4 className="font-bold text-[#545454]">Common Data Points for {formData.esrs_standard}</h4>
              </div>
              <p className="text-sm text-slate-700 mb-3">{aiSuggestions.explanation}</p>
              <div className="space-y-3">
                {aiSuggestions.common_data_points?.map((dp, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge className="bg-[#02a1e8] mb-1">{dp.esrs_code}</Badge>
                        <p className="text-xs text-slate-600">{dp.code_meaning}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            esrs_code: dp.esrs_code,
                            metric_name: dp.metric_name_example,
                            unit: dp.typical_unit
                          });
                          toast.success('Pre-filled from example!');
                        }}
                      >
                        Use This
                      </Button>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mb-1">{dp.metric_name_example}</p>
                    <p className="text-xs text-slate-600 mb-1">{dp.description}</p>
                    <p className="text-xs text-slate-500">Typical unit: <span className="font-mono">{dp.typical_unit}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* ESRS Code */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                ESRS Disclosure Code
                <span className="text-xs text-slate-500 font-normal">(e.g., E1-5 for GHG emissions)</span>
              </Label>
              <Input
                value={formData.esrs_code}
                onChange={(e) => setFormData({...formData, esrs_code: e.target.value})}
                placeholder="E.g., E1-5, S1-1"
              />
              <p className="text-xs text-slate-500">
                💡 The official disclosure requirement code from EFRAG standards
              </p>
            </div>

            {/* Reporting Year */}
            <div className="space-y-2">
              <Label>Reporting Year *</Label>
              <Input
                type="number"
                value={formData.reporting_year}
                onChange={(e) => setFormData({...formData, reporting_year: parseInt(e.target.value)})}
              />
            </div>
          </div>

          {/* Metric Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Metric Name *
              <span className="text-xs text-slate-500 font-normal">(What are you measuring?)</span>
            </Label>
            <Input
              value={formData.metric_name}
              onChange={(e) => setFormData({...formData, metric_name: e.target.value})}
              placeholder="E.g., Total Scope 1 GHG Emissions, Employee Turnover Rate"
            />
            <p className="text-xs text-slate-500">
              💡 Describe the metric clearly - this will appear in your CSRD report
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Value */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Value *
                <span className="text-xs text-slate-500 font-normal">(The number)</span>
              </Label>
              <Input
                type="number"
                step="any"
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value)})}
                placeholder="E.g., 2500.5"
              />
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Unit *
                <span className="text-xs text-slate-500 font-normal">(tCO2e, %, €, etc.)</span>
              </Label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                placeholder="E.g., tCO2e, m³, %, FTE"
              />
              <p className="text-xs text-slate-500">
                💡 Common units: tCO2e (emissions), m³ (water), % (rates), € (financial)
              </p>
            </div>
          </div>

          {/* Verification Status */}
          <div className="space-y-2">
            <Label>Verification Status</Label>
            <Select 
              value={formData.verification_status} 
              onValueChange={(val) => setFormData({...formData, verification_status: val})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unverified">Unverified (internal data)</SelectItem>
                <SelectItem value="Internally Verified">Internally Verified (reviewed by team)</SelectItem>
                <SelectItem value="Externally Assured">Externally Assured (third-party audit)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Source */}
          <div className="space-y-2">
            <Label>Data Source</Label>
            <Input
              value={formData.data_source}
              onChange={(e) => setFormData({...formData, data_source: e.target.value})}
              placeholder="E.g., Energy invoices, HR system, sustainability report"
            />
            <p className="text-xs text-slate-500">
              💡 Where did this data come from? Helps with audit trail
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes / Context</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any additional context, assumptions, or methodology notes..."
              className="h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-[#86b027] hover:bg-[#769c22]"
              disabled={saveDataPointMutation.isPending}
            >
              {saveDataPointMutation.isPending ? 'Saving...' : dataPoint ? 'Update Data Point' : 'Add Data Point'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
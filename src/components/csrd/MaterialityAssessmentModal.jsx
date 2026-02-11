import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { assessMaterialityWithAI, suggestESRSDataPoints } from './CSRDMaterialityService';
import { Sparkles, Loader2 } from "lucide-react";

export default function MaterialityAssessmentModal({ open, onOpenChange, topic }) {
  const [formData, setFormData] = useState({
    esrs_standard: 'ESRS E1',
    topic_name: '',
    impact_materiality_score: 5,
    financial_materiality_score: 5,
    assessment_method: 'Expert Workshop',
    impact_description: '',
    financial_impact_description: '',
    reporting_year: 2025
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (topic) {
      setFormData(topic);
    } else {
      setFormData({
        esrs_standard: 'ESRS E1',
        topic_name: '',
        impact_materiality_score: 5,
        financial_materiality_score: 5,
        assessment_method: 'Expert Workshop',
        impact_description: '',
        financial_impact_description: '',
        reporting_year: 2025
      });
    }
  }, [topic, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const isMaterial = data.impact_materiality_score >= 5 || data.financial_materiality_score >= 5;
      const payload = {
        ...data,
        is_material: isMaterial,
        last_assessed: new Date().toISOString().split('T')[0]
      };

      if (topic) {
        return base44.entities.CSRDMaterialityTopic.update(topic.id, payload);
      }
      return base44.entities.CSRDMaterialityTopic.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrd-materiality-topics'] });
      toast.success(topic ? 'Topic updated' : 'Topic assessed');
      onOpenChange(false);
    }
  });

  const handleAIAssessment = async () => {
    if (!formData.topic_name) {
      toast.error('Please enter a topic name first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const assessment = await assessMaterialityWithAI(
        formData.topic_name,
        `Impact: ${formData.impact_description}\nFinancial: ${formData.financial_impact_description}`,
        { industry: 'Manufacturing' }
      );

      setAiSuggestions(assessment);
      setFormData({
        ...formData,
        impact_materiality_score: assessment.impact_materiality_score || 5,
        financial_materiality_score: assessment.financial_materiality_score || 5,
        esrs_standard: assessment.recommended_esrs_standard || formData.esrs_standard,
        impact_description: assessment.impact_reasoning || formData.impact_description,
        financial_impact_description: assessment.financial_reasoning || formData.financial_impact_description
      });

      toast.success('AI assessment complete!');
    } catch (error) {
      toast.error('AI assessment failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Materiality Assessment</DialogTitle>
            <Button 
              onClick={handleAIAssessment} 
              disabled={isAnalyzing || !formData.topic_name}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI Assess
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {aiSuggestions && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h4 className="font-bold text-purple-900">AI Assessment Results</h4>
            </div>
            {aiSuggestions.is_material && (
              <p className="text-sm text-purple-800 font-semibold">
                ✅ This topic crosses the materiality threshold and should be reported
              </p>
            )}
            {aiSuggestions.key_data_points?.length > 0 && (
              <div className="text-sm">
                <p className="font-medium text-purple-900">Suggested Data Points:</p>
                <ul className="list-disc list-inside text-purple-800">
                  {aiSuggestions.key_data_points.map((dp, idx) => (
                    <li key={idx}>{dp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ESRS Standard</Label>
              <Select value={formData.esrs_standard} onValueChange={(v) => setFormData({...formData, esrs_standard: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['ESRS E1', 'ESRS E2', 'ESRS E3', 'ESRS E4', 'ESRS E5', 'ESRS S1', 'ESRS S2', 'ESRS S3', 'ESRS S4', 'ESRS G1'].map(std => 
                    <SelectItem key={std} value={std}>{std}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic Name</Label>
              <Input value={formData.topic_name} onChange={(e) => setFormData({...formData, topic_name: e.target.value})} />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-900">Impact Materiality Assessment</h4>
            <p className="text-sm text-blue-800">Rate the actual or potential impact on environment/society (0 = no impact, 10 = severe impact)</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Impact Materiality Score</Label>
                <span className="font-bold text-lg text-blue-600">{formData.impact_materiality_score}/10</span>
              </div>
              <Slider 
                value={[formData.impact_materiality_score]} 
                onValueChange={([v]) => setFormData({...formData, impact_materiality_score: v})}
                max={10}
                step={1}
              />
            </div>
            <textarea 
              className="w-full p-3 border rounded-lg text-sm"
              rows="3"
              placeholder="Describe the impact on environment or society..."
              value={formData.impact_description}
              onChange={(e) => setFormData({...formData, impact_description: e.target.value})}
            />
          </div>

          <div className="space-y-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h4 className="font-bold text-emerald-900">Financial Materiality Assessment</h4>
            <p className="text-sm text-emerald-800">Rate the financial risk or opportunity to the company (0 = no impact, 10 = critical)</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Financial Materiality Score</Label>
                <span className="font-bold text-lg text-emerald-600">{formData.financial_materiality_score}/10</span>
              </div>
              <Slider 
                value={[formData.financial_materiality_score]} 
                onValueChange={([v]) => setFormData({...formData, financial_materiality_score: v})}
                max={10}
                step={1}
              />
            </div>
            <textarea 
              className="w-full p-3 border rounded-lg text-sm"
              rows="3"
              placeholder="Describe financial risks or opportunities..."
              value={formData.financial_impact_description}
              onChange={(e) => setFormData({...formData, financial_impact_description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assessment Method</Label>
              <Select value={formData.assessment_method} onValueChange={(v) => setFormData({...formData, assessment_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Stakeholder Survey', 'Expert Workshop', 'Data Analysis', 'Risk Assessment'].map(m => 
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reporting Year</Label>
              <Input type="number" value={formData.reporting_year} onChange={(e) => setFormData({...formData, reporting_year: parseInt(e.target.value)})} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)} className="bg-purple-500 hover:bg-purple-600">
            {topic ? 'Update' : 'Assess'} Topic
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
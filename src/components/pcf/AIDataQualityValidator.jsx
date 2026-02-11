import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShieldAlert, CheckCircle2, XCircle, AlertTriangle, 
  Sparkles, Loader2, Flag, MapPin, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AIDataQualityValidator({ components, productId, onUpdateComponent }) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState([]);
  const queryClient = useQueryClient();

  const runValidation = async () => {
    setIsValidating(true);
    try {
      const componentsData = components.map(c => ({
        id: c.id,
        name: c.name,
        material_type: c.material_type,
        quantity: c.quantity,
        unit: c.unit,
        emission_factor: c.emission_factor,
        geographic_origin: c.geographic_origin,
        data_quality_rating: c.data_quality_rating,
        lifecycle_stage: c.lifecycle_stage
      }));

      const prompt = `
        Perform comprehensive data quality validation on these LCA components:
        
        ${JSON.stringify(componentsData, null, 2)}
        
        Validate each component for:
        
        1. **Emission Factor Reasonableness**
           - Check if EF is within typical range for material type
           - Flag unusually high or low values
           - Compare against industry benchmarks
        
        2. **Geographic Origin Accuracy**
           - Validate ISO country codes
           - Check if origin makes sense for material type
           - Flag if origin doesn't match typical supply chains
        
        3. **Unit Consistency**
           - Ensure units match material type conventions
           - Flag mismatched quantity/unit combinations
        
        4. **Data Quality Rating Justification**
           - Assess if DQR aligns with data source quality
           - Suggest improvements to increase DQR
        
        5. **Missing Critical Information**
           - Identify gaps that impact LCA accuracy
           - Suggest data collection priorities
        
        For each component with issues, return:
        - component_id
        - issue_type (emission_factor, geographic_origin, unit, dqr, missing_data)
        - severity (critical, warning, info)
        - description
        - suggested_correction
        - reasoning
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  component_id: { type: "string" },
                  component_name: { type: "string" },
                  issue_type: { type: "string" },
                  severity: { type: "string", enum: ["critical", "warning", "info"] },
                  description: { type: "string" },
                  suggested_correction: { type: "string" },
                  reasoning: { type: "string" },
                  auto_fixable: { type: "boolean" }
                }
              }
            },
            overall_quality_score: { type: "number" },
            critical_count: { type: "number" },
            warning_count: { type: "number" }
          }
        }
      });

      setValidationResults(result.issues || []);
      
      if (result.critical_count > 0) {
        toast.warning(`Found ${result.critical_count} critical data quality issues`);
      } else {
        toast.success(`Validation complete: Quality score ${result.overall_quality_score}/100`);
      }

      // Auto-create alerts for critical issues
      for (const issue of result.issues.filter(i => i.severity === 'critical')) {
        await base44.entities.RiskAlert.create({
          alert_type: 'data_quality',
          severity: 'warning',
          title: `LCA Data Quality: ${issue.issue_type}`,
          description: `${issue.description}\n\nSuggested: ${issue.suggested_correction}`,
          source: 'AI Data Quality Validator',
          status: 'open'
        });
      }

    } catch (error) {
      console.error('Validation failed:', error);
      toast.error('Failed to validate data quality');
    } finally {
      setIsValidating(false);
    }
  };

  const autoFixMutation = useMutation({
    mutationFn: async (issue) => {
      const component = components.find(c => c.id === issue.component_id);
      if (!component) return;

      // Parse suggested correction into structured updates
      const updates = {};
      
      if (issue.issue_type === 'emission_factor') {
        const efMatch = issue.suggested_correction.match(/(\d+\.?\d*)/);
        if (efMatch) {
          updates.emission_factor = parseFloat(efMatch[1]);
          updates.co2e_kg = component.quantity * parseFloat(efMatch[1]);
        }
      }
      
      if (issue.issue_type === 'geographic_origin') {
        const countryMatch = issue.suggested_correction.match(/([A-Z]{2})/);
        if (countryMatch) {
          updates.geographic_origin = countryMatch[1];
        }
      }

      if (issue.issue_type === 'dqr') {
        const dqrMatch = issue.suggested_correction.match(/(\d)/);
        if (dqrMatch) {
          updates.data_quality_rating = parseInt(dqrMatch[1]);
        }
      }

      if (Object.keys(updates).length > 0) {
        await base44.entities.ProductComponent.update(issue.component_id, updates);
        return updates;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-components'] });
      toast.success('Issue auto-fixed');
      runValidation(); // Re-validate
    }
  });

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default: return <Flag className="w-4 h-4 text-blue-600" />;
    }
  };

  const getIssueIcon = (issueType) => {
    switch (issueType) {
      case 'geographic_origin': return <MapPin className="w-3 h-3" />;
      case 'emission_factor': return <BarChart3 className="w-3 h-3" />;
      default: return <ShieldAlert className="w-3 h-3" />;
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
      <div className="relative">
        <div className="p-4 border-b border-white/30 bg-white/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-light text-sm text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#86b027]" />
                Data Quality Validator
              </div>
              <p className="text-xs text-slate-500 font-light mt-0.5">Run validation to check data quality</p>
            </div>
            <Button 
              onClick={runValidation}
              disabled={isValidating || components.length === 0}
              size="sm"
              variant="ghost"
              className="rounded-lg hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light h-8"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  Run Validation
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="p-4">
        {validationResults.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500 font-light">No validation results yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-2 pr-3">
              {validationResults.map((issue, idx) => (
                <div key={idx} className={cn(
                  "p-3 rounded-lg border-l-2 bg-white/30 backdrop-blur-sm",
                  issue.severity === 'critical' ? 'border-red-400' :
                  issue.severity === 'warning' ? 'border-amber-400' :
                  'border-slate-300'
                )}>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-light text-sm text-slate-900">{issue.component_name}</p>
                        <Badge variant="outline" className="text-[9px] flex items-center gap-1 font-light border-slate-200/60 bg-white/40">
                          {getIssueIcon(issue.issue_type)}
                          {issue.issue_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-700 font-light mb-1">{issue.description}</p>
                      <p className="text-xs text-[#86b027] font-light">
                        ✓ {issue.suggested_correction}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 italic font-light">{issue.reasoning}</p>
                    </div>
                    {issue.auto_fixable && (
                      <Button 
                        size="sm"
                        variant="ghost"
                        onClick={() => autoFixMutation.mutate(issue)}
                        className="shrink-0 text-[#86b027] hover:bg-[#86b027]/10 h-7 text-xs font-light"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Fix
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {validationResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/30">
            <div className="flex items-center justify-between text-xs font-light">
              <span className="text-slate-600">Issues Found:</span>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-red-50/80 text-red-700 border-red-200/60 font-light text-[9px]">
                  {validationResults.filter(i => i.severity === 'critical').length} Critical
                </Badge>
                <Badge variant="outline" className="bg-amber-50/80 text-amber-700 border-amber-200/60 font-light text-[9px]">
                  {validationResults.filter(i => i.severity === 'warning').length} Warnings
                </Badge>
                <Badge variant="outline" className="bg-slate-50/80 text-slate-600 border-slate-200/60 font-light text-[9px]">
                  {validationResults.filter(i => i.severity === 'info').length} Info
                </Badge>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
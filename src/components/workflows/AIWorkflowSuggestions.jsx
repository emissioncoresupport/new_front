import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, TrendingUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AIWorkflowSuggestions({ onCreateWorkflow }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setAnalyzing(true);
      
      // Gather data from different modules
      const [products, suppliers, emissions, disclosures] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.Supplier.list(),
        base44.entities.CCFEntry.list(),
        base44.entities.CSRDDataPoint.list()
      ]);

      const prompt = `Analyze this sustainability data and suggest 5 AI-driven workflow automations:

Products: ${products.length} total
Suppliers: ${suppliers.length} total  
Emissions Entries: ${emissions.length} total
CSRD Data Points: ${disclosures.length} total

Suggest workflows that:
1. Connect different modules intelligently
2. Automate manual processes
3. Flag compliance gaps proactively
4. Calculate environmental impact automatically
5. Alert stakeholders at the right time

Return JSON with array of suggestions. Each suggestion should have:
- name: workflow name
- description: what it does
- benefit: key benefit
- trigger_module: where it starts
- action_module: where it acts
- estimated_time_saved: hours per month
- priority: low/medium/high`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  benefit: { type: "string" },
                  trigger_module: { type: "string" },
                  action_module: { type: "string" },
                  estimated_time_saved: { type: "number" },
                  priority: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalyzing(false);
      return response;
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions || []);
      toast.success("AI analysis complete");
    },
    onError: () => {
      setAnalyzing(false);
      toast.error("Analysis failed");
    }
  });

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-amber-600" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">AI-Powered Workflow Discovery</h3>
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            Let AI analyze your sustainability data and suggest intelligent automations that save time and improve compliance.
          </p>
          <Button 
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzing}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Your Data...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Discover Workflow Opportunities
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {suggestions && suggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-700">AI Recommendations</h3>
          {suggestions.map((suggestion, idx) => (
            <Card key={idx} className="border-slate-200 hover:border-[#86b027] transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-slate-700">{suggestion.name}</h4>
                      <Badge variant={suggestion.priority === 'high' ? 'destructive' : 'secondary'}>
                        {suggestion.priority} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{suggestion.description}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{suggestion.trigger_module}</Badge>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <Badge variant="outline">{suggestion.action_module}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600">
                        <TrendingUp className="w-3 h-3" />
                        <span>~{suggestion.estimated_time_saved}h/month saved</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={onCreateWorkflow}>
                    Create
                  </Button>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm">
                  <span className="font-medium text-emerald-800">Benefit:</span>
                  <span className="text-slate-700 ml-2">{suggestion.benefit}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
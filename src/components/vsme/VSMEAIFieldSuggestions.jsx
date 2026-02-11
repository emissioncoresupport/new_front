import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Sparkles, Loader2, CheckCircle } from "lucide-react";

export default function VSMEAIFieldSuggestions({ disclosure, currentData, onApplySuggestion }) {
  const [suggestions, setSuggestions] = useState(null);

  const generateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const prompt = `You are an ESG data expert. Based on the following VSME disclosure and available context, suggest reasonable values for missing fields:

Disclosure: ${disclosure.code} - ${disclosure.title}
Category: ${disclosure.category}
Current Data: ${JSON.stringify(currentData, null, 2)}

Provide intelligent estimates based on:
- Industry benchmarks for SMEs
- Typical values for similar companies
- Logical relationships between data points (e.g., if employees=100, estimate energy usage)

Return suggestions as JSON with fields and estimated values, plus confidence scores (0-100) and reasoning for each.

Response format:
{
  "suggestions": [
    {
      "field_name": "string",
      "suggested_value": "number or string",
      "confidence": "number 0-100",
      "reasoning": "string explanation"
    }
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field_name: { type: "string" },
                  suggested_value: {},
                  confidence: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      return result.suggestions;
    },
    onSuccess: (data) => {
      setSuggestions(data);
      toast.success('AI suggestions generated');
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#545454] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          AI Field Suggestions
        </h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateSuggestionsMutation.mutate()}
          disabled={generateSuggestionsMutation.isPending}
          className="border-purple-500 text-purple-600 hover:bg-purple-50"
        >
          {generateSuggestionsMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-2" />
              Get Suggestions
            </>
          )}
        </Button>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion, idx) => (
            <div key={idx} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-mono">
                      {suggestion.field_name}
                    </Badge>
                    <Badge className={
                      suggestion.confidence >= 80 ? 'bg-[#86b027]' :
                      suggestion.confidence >= 60 ? 'bg-amber-500' :
                      'bg-slate-400'
                    }>
                      {suggestion.confidence}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-purple-900 mb-1">
                    Suggested Value: {suggestion.suggested_value}
                  </p>
                  <p className="text-xs text-slate-600">{suggestion.reasoning}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onApplySuggestion(suggestion.field_name, suggestion.suggested_value)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Apply
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
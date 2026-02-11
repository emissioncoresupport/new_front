import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Sparkles, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function SmartMappingAI() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch ALL External Records (not just pending, so we can display accepted ones too)
  const { data: externalRecords = [] } = useQuery({
    queryKey: ['external-records'],
    queryFn: () => base44.entities.ExternalRecord.list('-created_date', 100)
  });

  const pendingRecords = externalRecords.filter(r => r.status === 'pending');

  // Fetch Existing Suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['data-mapping-suggestions', 'pending'],
    queryFn: () => base44.entities.DataMappingSuggestion.filter({ status: 'pending' }, '-created_date', 50)
  });

  // Fetch Internal Entities (for context)
  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  // Generate Suggestions Mutation
  const generateSuggestions = async () => {
    setIsAnalyzing(true);
    try {
      // Filter PENDING records that don't have suggestions yet
      const recordsToAnalyze = pendingRecords.filter(r => 
        !suggestions.some(s => s.external_record_id === r.id)
      ).slice(0, 10); // Batch size

      if (recordsToAnalyze.length === 0) {
        toast.info("No new records to analyze.");
        setIsAnalyzing(false);
        return;
      }

      // Prepare context for LLM
      const internalSkusContext = skus.map(s => ({ id: s.id, code: s.sku_code, name: s.description }));
      const internalSuppliersContext = suppliers.map(s => ({ id: s.id, name: s.legal_name, country: s.country }));

      const prompt = `
        Match the following External Records to Internal Entities based on name similarity, codes, and descriptions.
        
        External Records:
        ${JSON.stringify(recordsToAnalyze.map(r => ({
          id: r.id,
          type: r.record_type,
          data: r.raw_data
        })))}

        Internal SKUs:
        ${JSON.stringify(internalSkusContext)}

        Internal Suppliers:
        ${JSON.stringify(internalSuppliersContext)}

        Return a JSON object with a "matches" array. Each match should have:
        - external_record_id
        - suggested_entity_id
        - suggested_entity_type ("SKU" or "Supplier")
        - confidence_score (0-100)
        - reasoning (short text)

        Only return matches with >50% confidence.
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  external_record_id: { type: "string" },
                  suggested_entity_id: { type: "string" },
                  suggested_entity_type: { type: "string" },
                  confidence_score: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.matches && result.matches.length > 0) {
        // Save suggestions
        await Promise.all(result.matches.map(match => 
          base44.entities.DataMappingSuggestion.create({
            external_record_id: match.external_record_id,
            suggested_entity_id: match.suggested_entity_id,
            suggested_entity_type: match.suggested_entity_type,
            confidence_score: match.confidence_score,
            reasoning: match.reasoning,
            status: 'pending'
          })
        ));
        toast.success(`Generated ${result.matches.length} suggestions`);
        queryClient.invalidateQueries({ queryKey: ['data-mapping-suggestions'] });
      } else {
        toast.info("No matches found.");
      }

    } catch (error) {
      console.error("AI Analysis failed", error);
      toast.error("Failed to generate suggestions");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Accept Suggestion Mutation
  const acceptMutation = useMutation({
    mutationFn: async (suggestion) => {
      // 1. Update Suggestion Status
      await base44.entities.DataMappingSuggestion.update(suggestion.id, { status: 'accepted' });
      
      // 2. Update External Record Status & Link
      await base44.entities.ExternalRecord.update(suggestion.external_record_id, {
        status: 'mapped',
        mapped_entity_id: suggestion.suggested_entity_id,
        mapped_entity_type: suggestion.suggested_entity_type
      });
    },
    onSuccess: () => {
      toast.success("Mapping Confirmed");
      queryClient.invalidateQueries({ queryKey: ['data-mapping-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['external-records'] });
    }
  });

  // Reject Suggestion Mutation
  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.DataMappingSuggestion.update(id, { status: 'rejected' }),
    onSuccess: () => {
      toast.success("Suggestion Rejected");
      queryClient.invalidateQueries({ queryKey: ['data-mapping-suggestions'] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            AI Matching Engine
          </h3>
          <p className="text-sm text-slate-500">
            {suggestions.length} pending suggestions • {pendingRecords.length} unmapped records
          </p>
        </div>
        <Button 
          onClick={generateSuggestions} 
          disabled={isAnalyzing || pendingRecords.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Analyze New Records
            </>
          )}
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Sparkles className="w-12 h-12 mb-4 opacity-20" />
            <p>No pending AI suggestions.</p>
            <p className="text-xs">Click "Analyze" to match pending records.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suggestions.map(suggestion => {
            const record = externalRecords.find(r => r.id === suggestion.external_record_id);
            
            const internalEntity = suggestion.suggested_entity_type === 'SKU' 
              ? skus.find(s => s.id === suggestion.suggested_entity_id)
              : suppliers.find(s => s.id === suggestion.suggested_entity_id);

            if (!record) {
               return null; 
            }

            return (
              <Card key={suggestion.id} className="border-indigo-100 bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  {/* External (Left) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-500">
                        {record.source_system}
                      </Badge>
                      <span className="text-xs font-mono text-slate-400">{record.source_id}</span>
                    </div>
                    <p className="font-medium text-slate-800 truncate">
                      {record.raw_data?.name || record.raw_data?.legal_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {record.raw_data?.description || record.raw_data?.sku_code || record.raw_data?.country}
                    </p>
                  </div>

                  {/* Match Info (Center) */}
                  <div className="flex flex-col items-center px-4">
                    <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3" />
                      {suggestion.confidence_score}% Match
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300" />
                  </div>

                  {/* Internal (Right) */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">
                        Internal {suggestion.suggested_entity_type}
                      </Badge>
                    </div>
                    <p className="font-medium text-slate-800 truncate">
                      {internalEntity?.sku_code || internalEntity?.legal_name || 'Unknown Entity'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {internalEntity?.description || internalEntity?.country}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                    <Button 
                      size="sm" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => acceptMutation.mutate(suggestion)}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      onClick={() => rejectMutation.mutate(suggestion.id)}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
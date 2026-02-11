import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wand2, CheckCircle2, XCircle, Sparkles, ArrowRight, 
  Shield, Globe, Calendar, DollarSign, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DataNormalizationEngine() {
  const [isNormalizing, setIsNormalizing] = useState(false);
  const queryClient = useQueryClient();

  const { data: suggestions = [] } = useQuery({
    queryKey: ['normalization-suggestions', 'pending'],
    queryFn: () => base44.entities.NormalizationSuggestion.filter({ validation_status: 'pending' }, '-confidence_score')
  });

  const { data: sourceRecords = [] } = useQuery({
    queryKey: ['source-records', 'pending'],
    queryFn: () => base44.entities.SourceRecord.filter({ processing_status: 'pending' })
  });

  // AI normalization engine
  const runNormalization = async () => {
    setIsNormalizing(true);
    toast.loading("AI normalizing data...");

    try {
      for (const record of sourceRecords.slice(0, 10)) {
        const prompt = `
          Normalize the following data to EU standards:
          
          Raw Data: ${JSON.stringify(record.raw_data)}
          
          Apply:
          1. Country codes → ISO 3166-1 alpha-2
          2. VAT numbers → standardized format with country prefix
          3. Dates → ISO 8601 (YYYY-MM-DD)
          4. Addresses → structured format (street, city, postal_code)
          5. Phone numbers → E.164 format
          6. Currencies → ISO 4217
          
          Return normalized_data object with corrected fields and a changes array 
          listing each normalization with field_name, original, suggested, confidence.
        `;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              normalized_data: { type: "object" },
              changes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field_name: { type: "string" },
                    original_value: { type: "string" },
                    suggested_value: { type: "string" },
                    normalization_type: { type: "string" },
                    confidence_score: { type: "number" }
                  }
                }
              }
            }
          }
        });

        // Store normalized data
        await base44.entities.SourceRecord.update(record.id, {
          normalized_data: result.normalized_data,
          processing_status: 'normalized'
        });

        // Create normalization suggestions for review
        for (const change of result.changes || []) {
          await base44.entities.NormalizationSuggestion.create({
            source_record_id: record.id,
            field_name: change.field_name,
            original_value: change.original_value,
            suggested_value: change.suggested_value,
            normalization_type: change.normalization_type,
            confidence_score: change.confidence_score,
            validation_status: change.confidence_score >= 95 ? 'auto_applied' : 'pending'
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['normalization-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['source-records'] });
      toast.dismiss();
      toast.success('Data normalization complete');
    } catch (error) {
      toast.dismiss();
      toast.error('Normalization failed: ' + error.message);
    } finally {
      setIsNormalizing(false);
    }
  };

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.NormalizationSuggestion.update(id, {
      validation_status: 'validated',
      applied: true,
      applied_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['normalization-suggestions'] });
      toast.success('Normalization approved');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.NormalizationSuggestion.update(id, {
      validation_status: 'rejected'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['normalization-suggestions'] });
      toast.success('Normalization rejected');
    }
  });

  const typeIcons = {
    country_standardization: Globe,
    vat_format: Shield,
    date_format: Calendar,
    unit_conversion: DollarSign,
    address_parsing: Globe
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#545454] flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-600" />
            Data Normalization Engine
          </h3>
          <p className="text-sm text-slate-500">
            AI-powered standardization to EU regulatory formats
          </p>
        </div>
        <Button 
          onClick={runNormalization}
          disabled={isNormalizing || sourceRecords.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isNormalizing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Normalizing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Run Normalization
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Normalization Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suggestions.map(sug => {
              const TypeIcon = typeIcons[sug.normalization_type] || Wand2;

              return (
                <div key={sug.id} className="border rounded-lg p-4 hover:border-indigo-300 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <TypeIcon className="w-4 h-4 text-indigo-600" />
                        <Badge variant="outline" className="text-xs">
                          {sug.normalization_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-slate-500">• {sug.field_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm">
                        <div className="px-3 py-1 bg-rose-50 text-rose-700 rounded font-mono">
                          {sug.original_value}
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded font-mono">
                          {sug.suggested_value}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className={cn(
                        "text-xl font-bold",
                        sug.confidence_score >= 95 ? "text-emerald-600" :
                        sug.confidence_score >= 80 ? "text-amber-600" :
                        "text-slate-600"
                      )}>
                        {sug.confidence_score}%
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => approveMutation.mutate(sug.id)}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => rejectMutation.mutate(sug.id)}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {suggestions.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No normalization suggestions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
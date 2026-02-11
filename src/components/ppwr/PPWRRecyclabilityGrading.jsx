import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Sparkles, Loader2, Award, TrendingUp } from "lucide-react";

export default function PPWRRecyclabilityGrading() {
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const gradingMutation = useMutation({
    mutationFn: async () => {
      toast.loading('Running AI recyclability assessment...');

      const results = [];
      for (const pkg of packaging) {
        const prompt = `Grade packaging recyclability for PPWR compliance:

Packaging: ${pkg.packaging_name}
Material: ${pkg.material_category}
${pkg.material_breakdown ? `Composition: ${JSON.stringify(pkg.material_breakdown)}` : ''}

Assessment Criteria (PPWR Annex VII):
1. Material type (mono-material preferred)
2. Separability of components
3. Contamination risk
4. Collection infrastructure availability
5. Sorting technology compatibility
6. Recycling yield potential

Return score 0-100 and grade A-F`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              recyclability_score: { type: "number" },
              grade: { type: "string" },
              strengths: { type: "array", items: { type: "string" } },
              weaknesses: { type: "array", items: { type: "string" } },
              improvement_actions: { type: "array", items: { type: "string" } }
            }
          }
        });

        await base44.entities.PPWRPackaging.update(pkg.id, {
          recyclability_score: result.recyclability_score,
          recyclability_grade: result.grade,
          recyclability_analysis: result
        });

        results.push({ ...pkg, ...result });
      }

      return results;
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success('Recyclability grading complete');
      queryClient.invalidateQueries(['ppwr-packaging']);
    },
    onError: () => {
      toast.dismiss();
      toast.error('Grading failed');
    }
  });

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-600" />
          Recyclability Performance Grading
        </CardTitle>
        <p className="text-sm text-slate-600">AI-powered assessment based on PPWR Annex VII criteria</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => gradingMutation.mutate()}
          disabled={gradingMutation.isPending || packaging.length === 0}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        >
          {gradingMutation.isPending ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Grading {packaging.length} packages...</>
          ) : (
            <><Sparkles className="w-5 h-5 mr-2" /> Grade All Packaging</>
          )}
        </Button>

        <div className="space-y-3">
          {packaging.filter(p => p.recyclability_score).map(pkg => (
            <div key={pkg.id} className="p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900">{pkg.packaging_name}</span>
                <Badge className={
                  pkg.recyclability_grade === 'A' ? 'bg-emerald-600' :
                  pkg.recyclability_grade === 'B' ? 'bg-green-500' :
                  pkg.recyclability_grade === 'C' ? 'bg-yellow-500' :
                  pkg.recyclability_grade === 'D' ? 'bg-orange-500' :
                  'bg-rose-500'
                }>
                  Grade {pkg.recyclability_grade}
                </Badge>
              </div>
              <div className="text-sm text-slate-600">
                Score: <strong>{pkg.recyclability_score}/100</strong>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
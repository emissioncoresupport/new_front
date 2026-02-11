import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Search, CheckCircle2, Loader2, AlertCircle, FileText, Sparkles } from "lucide-react";

const CBAM_CN_CODES = {
  "7208": "Flat-rolled products of iron/steel, width ≥ 600mm, hot-rolled",
  "7209": "Flat-rolled products of iron/steel, width ≥ 600mm, cold-rolled",
  "7210": "Flat-rolled products of iron/steel, plated/coated",
  "7211": "Flat-rolled products of iron/steel, width < 600mm",
  "7212": "Flat-rolled products of iron/steel, plated/coated, width < 600mm",
  "7213": "Bars and rods, hot-rolled, in irregularly wound coils",
  "7214": "Bars and rods of iron/steel, forged/hot-rolled",
  "7215": "Bars and rods of iron/steel, other",
  "7216": "Angles, shapes and sections of iron/steel",
  "7217": "Wire of iron or steel",
  "2804": "Hydrogen",
  "2814": "Ammonia",
  "3102": "Mineral/chemical fertilizers, nitrogenous"
};

export default function CBAMCNCodeClassifier() {
  const [productDescription, setProductDescription] = useState('');
  const [classificationResult, setClassificationResult] = useState(null);

  const classifyMutation = useMutation({
    mutationFn: async (description) => {
      toast.loading('Classifying product with AI...');

      const prompt = `Classify the following product for CBAM (Carbon Border Adjustment Mechanism):

Product Description: "${description}"

CBAM covers these CN codes:
${Object.entries(CBAM_CN_CODES).map(([code, desc]) => `- ${code}: ${desc}`).join('\n')}

Task:
1. Identify the most appropriate CN code
2. Verify if product falls under CBAM scope
3. Determine goods category
4. Suggest typical emission calculation method
5. Provide confidence score

Return structured classification result.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            cn_code: { type: "string" },
            cn_description: { type: "string" },
            is_cbam_covered: { type: "boolean" },
            goods_category: { type: "string" },
            suggested_method: { type: "string" },
            confidence_score: { type: "number" },
            reasoning: { type: "string" },
            precursor_materials: { 
              type: "array", 
              items: { type: "string" }
            }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      toast.dismiss();
      setClassificationResult(data);
      if (data.is_cbam_covered) {
        toast.success('Product classified successfully', {
          description: `CN Code: ${data.cn_code} (${data.confidence_score}% confidence)`
        });
      } else {
        toast.warning('Product not covered by CBAM', {
          description: 'This product does not fall under CBAM scope'
        });
      }
    },
    onError: () => {
      toast.dismiss();
      toast.error('Classification failed');
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-600" />
            CN Code Classification & Verification
          </CardTitle>
          <p className="text-sm text-slate-600">
            AI-powered classification for CBAM covered goods
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Product Description</Label>
            <Input
              placeholder="e.g., Hot-rolled steel coils, width 1500mm, thickness 3mm"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
            />
          </div>

          <Button
            onClick={() => classifyMutation.mutate(productDescription)}
            disabled={!productDescription || classifyMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {classifyMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Classifying...</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" /> Classify with AI</>
            )}
          </Button>

          {classificationResult && (
            <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className={`p-4 rounded-lg border-2 ${
                classificationResult.is_cbam_covered 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {classificationResult.is_cbam_covered ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-slate-500" />
                    )}
                    <span className="font-bold text-lg">
                      {classificationResult.is_cbam_covered ? 'CBAM Covered' : 'Not CBAM Covered'}
                    </span>
                  </div>
                  <Badge className="bg-white/80">
                    {classificationResult.confidence_score}% Confidence
                  </Badge>
                </div>
                <p className="text-sm text-slate-700">{classificationResult.reasoning}</p>
              </div>

              {classificationResult.is_cbam_covered && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border">
                      <div className="text-xs text-slate-500 font-semibold uppercase mb-1">CN Code</div>
                      <div className="text-xl font-bold text-slate-900">{classificationResult.cn_code}</div>
                      <div className="text-xs text-slate-600 mt-1">{classificationResult.cn_description}</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border">
                      <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Calculation Method</div>
                      <div className="text-sm font-medium text-slate-900">{classificationResult.suggested_method}</div>
                    </div>
                  </div>

                  {classificationResult.precursor_materials?.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="font-bold text-amber-900 text-sm mb-2">Precursor Materials Detected:</div>
                      <div className="flex flex-wrap gap-2">
                        {classificationResult.precursor_materials.map((mat, idx) => (
                          <Badge key={idx} variant="outline" className="bg-white border-amber-300 text-amber-700">
                            {mat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
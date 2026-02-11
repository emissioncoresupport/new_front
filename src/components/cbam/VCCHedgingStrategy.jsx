import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, TrendingUp, Shield, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function VCCHedgingStrategy({ totalEmissions, requiredCertificates, currentVCCHoldings, priceHistory }) {
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentPrice = priceHistory[0]?.cbam_certificate_price || 85;
  const volatility = priceHistory[0]?.volatility_index || 12;
  
  const exposureRemaining = Math.max(0, requiredCertificates - currentVCCHoldings);
  const hedgingPercentage = requiredCertificates > 0 
    ? Math.round((currentVCCHoldings / requiredCertificates) * 100) 
    : 0;

  const generateStrategyMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a CBAM financial hedging advisor. Analyze the following situation and provide a strategic VCC purchasing recommendation:

Current Situation:
- Total projected CBAM need: ${requiredCertificates} certificates
- Current VCC holdings: ${currentVCCHoldings} units
- Exposure remaining: ${exposureRemaining} units
- Current hedging coverage: ${hedgingPercentage}%
- Current CBAM certificate market price: €${currentPrice}
- Price volatility index: ${volatility}% (${volatility > 15 ? 'HIGH' : volatility > 8 ? 'MODERATE' : 'LOW'})
- Total embedded emissions: ${totalEmissions} tCO2e

Provide a comprehensive hedging strategy recommendation with:
1. Recommended hedge percentage (considering volatility and exposure)
2. Suggested VCC quantity to purchase immediately
3. Contract type recommendation (Spot, Margined Forward, or Full Credit Line Forward)
4. Timing strategy (buy now, phase over time, or wait)
5. Risk assessment and mitigation strategy
6. Estimated cost savings vs buying certificates at future projected prices
7. Key action items

Format the response in a structured way with clear sections.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_hedge_percentage: { type: "number" },
            immediate_purchase_quantity: { type: "number" },
            contract_type: { type: "string" },
            timing_strategy: { type: "string" },
            risk_level: { type: "string", enum: ["Low", "Medium", "High"] },
            estimated_savings_eur: { type: "number" },
            rationale: { type: "string" },
            key_actions: { type: "array", items: { type: "string" } },
            urgency_level: { type: "string", enum: ["Low", "Medium", "High", "Critical"] }
          }
        }
      });
      return response;
    },
    onSuccess: (data) => {
      setAiRecommendation(data);
      toast.success('AI hedging strategy generated');
    },
    onError: () => {
      toast.error('Failed to generate strategy');
    }
  });

  const handleGenerateStrategy = () => {
    setIsGenerating(true);
    generateStrategyMutation.mutate();
    setTimeout(() => setIsGenerating(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Current Exposure Status */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#86b027]" />
            Current Hedging Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Hedging Coverage</span>
                <span className="text-lg font-bold text-slate-900">{hedgingPercentage}%</span>
              </div>
              <Progress value={hedgingPercentage} className="h-3" indicatorClassName="bg-gradient-to-r from-[#86b027] to-[#02a1e8]" />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
              <div>
                <p className="text-xs text-slate-500 mb-1">Protected</p>
                <p className="text-xl font-bold text-emerald-600">{currentVCCHoldings} units</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Exposed</p>
                <p className="text-xl font-bold text-amber-600">{exposureRemaining} units</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Total Need</p>
                <p className="text-xl font-bold text-slate-900">{requiredCertificates} units</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card className={`border-2 ${
        volatility > 15 ? 'border-rose-300 bg-rose-50/30' :
        volatility > 8 ? 'border-amber-300 bg-amber-50/30' :
        'border-emerald-300 bg-emerald-50/30'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${
              volatility > 15 ? 'bg-rose-100 text-rose-600' :
              volatility > 8 ? 'bg-amber-100 text-amber-600' :
              'bg-emerald-100 text-emerald-600'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-2">Market Risk Assessment</h3>
              <p className="text-sm text-slate-700 mb-3">
                {volatility > 15 ? (
                  <>Current market volatility is <strong>HIGH ({volatility}%)</strong>. Strong recommendation to hedge immediately to protect against price spikes.</>
                ) : volatility > 8 ? (
                  <>Current market volatility is <strong>MODERATE ({volatility}%)</strong>. Consider phased hedging approach to balance cost and risk.</>
                ) : (
                  <>Current market volatility is <strong>LOW ({volatility}%)</strong>. Stable conditions - can consider strategic timing for purchases.</>
                )}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-slate-500 mb-1">Unhedged Exposure</p>
                  <p className="font-bold text-slate-900">€{(exposureRemaining * currentPrice).toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-slate-500 mb-1">Price Risk (±{volatility}%)</p>
                  <p className="font-bold text-rose-600">±€{(exposureRemaining * currentPrice * (volatility / 100)).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Strategy Generator */}
      <Card className="border-[#86b027] bg-gradient-to-br from-[#86b027]/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#86b027]" />
            AI-Powered Hedging Strategy
          </CardTitle>
          <p className="text-sm text-slate-500">Get personalized recommendations based on your exposure and market conditions</p>
        </CardHeader>
        <CardContent>
          {!aiRecommendation ? (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">Generate an AI-powered hedging strategy tailored to your needs</p>
              <Button
                onClick={handleGenerateStrategy}
                disabled={isGenerating}
                className="bg-gradient-to-r from-[#86b027] to-[#02a1e8] text-white"
              >
                {isGenerating ? (
                  <>Analyzing market conditions...</>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Strategy
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Strategy Header */}
              <div className="flex items-start justify-between p-4 bg-white rounded-lg border-2 border-[#86b027]">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-900">Recommended Strategy</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      aiRecommendation.urgency_level === 'Critical' ? 'bg-rose-100 text-rose-700' :
                      aiRecommendation.urgency_level === 'High' ? 'bg-amber-100 text-amber-700' :
                      aiRecommendation.urgency_level === 'Medium' ? 'bg-blue-100 text-blue-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {aiRecommendation.urgency_level} Urgency
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{aiRecommendation.rationale}</p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Target Coverage</p>
                  <p className="text-2xl font-bold text-[#86b027]">{aiRecommendation.recommended_hedge_percentage}%</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Buy Now</p>
                  <p className="text-2xl font-bold text-slate-900">{aiRecommendation.immediate_purchase_quantity} units</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Contract Type</p>
                  <p className="text-sm font-bold text-slate-900">{aiRecommendation.contract_type}</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Est. Savings</p>
                  <p className="text-2xl font-bold text-emerald-600">€{aiRecommendation.estimated_savings_eur.toFixed(0)}</p>
                </div>
              </div>

              {/* Action Items */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Key Actions
                </h4>
                <ul className="space-y-2">
                  {aiRecommendation.key_actions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-blue-600 font-bold">{idx + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={handleGenerateStrategy}
                variant="outline"
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate Strategy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, TrendingUp, AlertTriangle, CheckCircle2, Bot, Settings, DollarSign, Shield } from "lucide-react";
import { toast } from "sonner";

export default function CBAMCertificateAutomation({ 
  shortfall, 
  totalEmissions, 
  currentBalance, 
  pendingOrders,
  avgPrice 
}) {
  const queryClient = useQueryClient();
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [threshold, setThreshold] = useState(100);
  const [maxOrderSize, setMaxOrderSize] = useState(1000);
  const [priceThreshold, setPriceThreshold] = useState(100);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch price history for AI analysis
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['cbam-price-history'],
    queryFn: () => base44.entities.CBAMPriceHistory.list('-date', 20)
  });

  // Create purchase order mutation
  const createOrderMutation = useMutation({
    mutationFn: (orderData) => base44.entities.CBAMPurchaseOrder.create(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-purchase-orders'] });
      toast.success('Draft purchase order created successfully');
    }
  });

  // AI Analysis for purchase recommendations
  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      const prompt = `You are a CBAM certificate procurement AI advisor. Analyze the following data and provide purchase recommendations:

Current Situation:
- Certificate Shortfall: ${shortfall} units
- Total Emissions: ${totalEmissions} tCO2e
- Current Balance: ${currentBalance} certificates
- Pending Orders: ${pendingOrders} certificates
- Current EUA Price: €${avgPrice}
- 2026 Chargeable Emissions (after free allocation)

Recent Price Trends:
${priceHistory.slice(0, 5).map(p => `- ${p.quarter || p.date}: €${p.cbam_certificate_price}`).join('\n')}

Provide a JSON response with:
{
  "recommended_action": "buy_now|wait|partial_buy",
  "recommended_quantity": number,
  "reasoning": "brief explanation",
  "price_forecast": "increasing|stable|decreasing",
  "urgency": "low|medium|high",
  "optimal_timing": "immediate|within_week|within_month",
  "risk_level": "low|medium|high",
  "cost_savings_potential": number (in EUR)
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_action: { type: "string" },
            recommended_quantity: { type: "number" },
            reasoning: { type: "string" },
            price_forecast: { type: "string" },
            urgency: { type: "string" },
            optimal_timing: { type: "string" },
            risk_level: { type: "string" },
            cost_savings_potential: { type: "number" }
          }
        }
      });

      setAiRecommendation(response);
    } catch (error) {
      toast.error('AI analysis failed');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Automatic order generation based on thresholds
  useEffect(() => {
    if (!automationEnabled || shortfall <= 0) return;

    // Check if shortfall exceeds threshold
    if (shortfall >= threshold && avgPrice <= priceThreshold) {
      const orderQuantity = Math.min(shortfall, maxOrderSize);
      
      // Generate draft order
      const orderData = {
        order_number: `AUTO-PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        quantity: orderQuantity,
        estimated_price: avgPrice,
        total_amount: orderQuantity * avgPrice,
        status: autoApproveEnabled ? "approved" : "draft",
        notes: `Auto-generated order: Shortfall ${shortfall} units, Price €${avgPrice} ≤ threshold €${priceThreshold}`
      };

      // Only create if no recent automation orders exist
      const lastOrderTime = localStorage.getItem('last_auto_order_time');
      const now = Date.now();
      if (!lastOrderTime || (now - parseInt(lastOrderTime)) > 3600000) { // 1 hour cooldown
        createOrderMutation.mutate(orderData);
        localStorage.setItem('last_auto_order_time', now.toString());
        toast.success(`🤖 AI Auto-Purchase: ${orderQuantity} certificates queued for ${autoApproveEnabled ? 'approval' : 'review'}`);
      }
    }
  }, [shortfall, avgPrice, automationEnabled, threshold, priceThreshold, maxOrderSize, autoApproveEnabled]);

  // Execute AI recommendation
  const executeRecommendation = () => {
    if (!aiRecommendation) return;

    const orderData = {
      order_number: `AI-REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      quantity: aiRecommendation.recommended_quantity,
      estimated_price: avgPrice,
      total_amount: aiRecommendation.recommended_quantity * avgPrice,
      status: "draft",
      notes: `AI Recommendation: ${aiRecommendation.reasoning}`
    };

    createOrderMutation.mutate(orderData);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-slate-900">AI Certificate Procurement</h3>
            <p className="text-xs text-slate-500 mt-1">Automated purchase optimization</p>
          </div>
          <Button 
            onClick={runAIAnalysis} 
            disabled={isAnalyzing}
            className="bg-slate-900 hover:bg-slate-800 text-white"
            size="sm"
          >
            {isAnalyzing ? 'Analyzing...' : 'Get AI Advice'}
          </Button>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="automation" className="space-y-6">
          <TabsList className="bg-slate-50 border-b border-slate-200 rounded-none h-auto p-0 w-full justify-start">
            <TabsTrigger value="automation" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">Automation</TabsTrigger>
            <TabsTrigger value="ai-insights" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">AI Insights</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="automation" className="space-y-4">
            {/* Clean Status */}
            <div className={`p-4 rounded-lg border ${automationEnabled ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className={`w-5 h-5 ${automationEnabled ? 'text-[#86b027]' : 'text-slate-400'}`} />
                  <div>
                    <p className="font-semibold text-slate-900">Automated Procurement</p>
                    <p className="text-xs text-slate-600">Auto-generate orders when shortfall exceeds thresholds</p>
                  </div>
                </div>
                <Switch 
                  checked={automationEnabled} 
                  onCheckedChange={setAutomationEnabled}
                />
              </div>
            </div>

            {/* Clean Status Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-5 bg-white rounded-lg border border-slate-200 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Shortfall</p>
                <p className="text-3xl font-light text-slate-900">{shortfall}</p>
                <p className="text-xs text-slate-400 mt-1">units</p>
              </div>
              <div className="p-5 bg-white rounded-lg border border-slate-200 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Price</p>
                <p className="text-3xl font-light text-slate-900">€{avgPrice}</p>
                <p className="text-xs text-slate-400 mt-1">per unit</p>
              </div>
              <div className="p-5 bg-white rounded-lg border border-slate-200 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Total</p>
                <p className="text-3xl font-light text-slate-900">€{(shortfall * avgPrice).toFixed(0)}</p>
                <p className="text-xs text-slate-400 mt-1">cost</p>
              </div>
            </div>

            {/* Automation Rules */}
            {automationEnabled && (
              <div className="space-y-3 p-4 bg-white rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900">Active Rules</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-slate-700">When shortfall ≥ {threshold} units</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-slate-700">And price ≤ €{priceThreshold}</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-slate-700">Create draft order (max {maxOrderSize} units)</span>
                    <Badge className="bg-[#86b027] text-white">Enabled</Badge>
                  </div>
                  {autoApproveEnabled && (
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200">
                      <span className="text-amber-800 font-medium text-sm">Auto-approval enabled</span>
                      <Badge className="bg-amber-600 text-white border-0">High Risk</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-4">
            {!aiRecommendation ? (
              <div className="py-12 text-center">
                <Bot className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 mb-2">No AI analysis yet</p>
                <p className="text-xs text-slate-400 mb-4">Click "Get AI Advice" to analyze current market conditions</p>
                <Button onClick={runAIAnalysis} disabled={isAnalyzing}>
                  {isAnalyzing ? 'Analyzing...' : 'Run Analysis Now'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recommendation Header */}
                <div className={`p-4 rounded-lg border-2 ${
                  aiRecommendation.recommended_action === 'buy_now' 
                    ? 'bg-[#86b027]/10 border-[#86b027]' 
                    : aiRecommendation.recommended_action === 'wait'
                    ? 'bg-amber-50 border-amber-400'
                    : 'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-slate-900 text-lg mb-1">
                        {aiRecommendation.recommended_action === 'buy_now' ? '✅ Buy Now' : 
                         aiRecommendation.recommended_action === 'wait' ? '⏳ Wait' : '📊 Partial Purchase'}
                      </p>
                      <p className="text-sm text-slate-700">{aiRecommendation.reasoning}</p>
                    </div>
                    <Badge className={
                      aiRecommendation.urgency === 'high' ? 'bg-red-500' :
                      aiRecommendation.urgency === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }>
                      {aiRecommendation.urgency} urgency
                    </Badge>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Recommended Quantity</p>
                    <p className="text-2xl font-bold text-slate-900">{aiRecommendation.recommended_quantity}</p>
                    <p className="text-xs text-slate-600 mt-1">certificates</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Potential Savings</p>
                    <p className="text-2xl font-bold text-[#86b027]">€{aiRecommendation.cost_savings_potential?.toFixed(0) || 0}</p>
                    <p className="text-xs text-slate-600 mt-1">if purchased optimally</p>
                  </div>
                </div>

                {/* Market Outlook */}
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-3">Market Outlook</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Price Forecast:</span>
                      <Badge variant="outline">{aiRecommendation.price_forecast}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Optimal Timing:</span>
                      <Badge variant="outline">{aiRecommendation.optimal_timing}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Risk Level:</span>
                      <Badge className={
                        aiRecommendation.risk_level === 'high' ? 'bg-red-500' :
                        aiRecommendation.risk_level === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                      }>
                        {aiRecommendation.risk_level}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                {aiRecommendation.recommended_action !== 'wait' && (
                  <Button 
                    onClick={executeRecommendation}
                    disabled={createOrderMutation.isPending}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Execute Recommendation ({aiRecommendation.recommended_quantity} units)
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-4">
              {/* Shortfall Threshold */}
              <div>
                <Label className="text-sm font-semibold text-slate-700">Shortfall Threshold (units)</Label>
                <p className="text-xs text-slate-500 mb-2">Trigger automation when shortfall exceeds this value</p>
                <Input 
                  type="number" 
                  value={threshold} 
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="max-w-xs"
                />
              </div>

              {/* Price Threshold */}
              <div>
                <Label className="text-sm font-semibold text-slate-700">Maximum Price (EUR)</Label>
                <p className="text-xs text-slate-500 mb-2">Only auto-purchase if price is below this threshold</p>
                <Input 
                  type="number" 
                  value={priceThreshold} 
                  onChange={(e) => setPriceThreshold(Number(e.target.value))}
                  className="max-w-xs"
                />
              </div>

              {/* Max Order Size */}
              <div>
                <Label className="text-sm font-semibold text-slate-700">Max Order Size (units)</Label>
                <p className="text-xs text-slate-500 mb-2">Limit size of automatically generated orders</p>
                <Input 
                  type="number" 
                  value={maxOrderSize} 
                  onChange={(e) => setMaxOrderSize(Number(e.target.value))}
                  className="max-w-xs"
                />
              </div>

              {/* Auto-Approval */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-slate-900">Auto-Approval</p>
                      <p className="text-xs text-slate-600">Skip manual review and directly approve orders</p>
                    </div>
                  </div>
                  <Switch 
                    checked={autoApproveEnabled} 
                    onCheckedChange={setAutoApproveEnabled}
                  />
                </div>
                {autoApproveEnabled && (
                  <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>⚠️ <strong>Warning:</strong> Orders will be automatically approved without human oversight. Ensure thresholds are properly configured.</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
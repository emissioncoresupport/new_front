import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, Clock, AlertTriangle, Sparkles, RefreshCw, 
  ArrowRight, DollarSign, Activity, Play, Layers, Map as MapIcon
} from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { toast } from "sonner";

// Simple SVG Sankey-like Flow Visualization
const CostFlowDiagram = ({ product, bomData, totalCost }) => {
  // Process data into layers
  const layers = useMemo(() => {
    if (!product || !bomData || totalCost === 0) return [];
    
    // Level 0: Product
    const l0 = [{ id: product.id, name: product.sku_code, cost: totalCost, y: 0, height: 100 }];
    
    // Level 1: Direct Children
    const directChildren = bomData.filter(l => l.parent_sku_id === product.id);
    const l1 = directChildren.map(l => ({
      id: l.child_sku_id,
      name: l.child_sku_id, // We don't have name in link, would need SKU lookup. keeping simple.
      cost: l.cost_per_unit * l.quantity,
      quantity: l.quantity
    })).sort((a, b) => b.cost - a.cost);

    // Calculate layout for L1
    let currentY = 0;
    const l1Total = l1.reduce((sum, item) => sum + item.cost, 0);
    // Normalize heights to fit in 100% container (or similar pixel height)
    // We'll use pixel coordinates: 300px height
    const containerHeight = 300;
    
    l0[0].y = 0;
    l0[0].hPx = containerHeight; // Full height for root? No, proportional to value usually, but here root is 100%
    
    const l1Nodes = l1.map(item => {
      const hPx = (item.cost / totalCost) * containerHeight;
      const node = { ...item, y: currentY, hPx };
      currentY += hPx;
      return node;
    });

    return { l0, l1: l1Nodes };
  }, [product, bomData, totalCost]);

  if (!layers.l0) return <div className="text-center text-slate-400 text-xs p-4">No flow data available</div>;

  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-50/50 rounded-lg border border-slate-100 relative overflow-hidden p-4">
      <svg width="100%" height="100%" viewBox="0 0 600 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="flowGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Links */}
        {layers.l1.map((target, i) => {
          const source = layers.l0[0];
          // Source is centered vertically, but for Sankey typically starts from a stack
          // Let's assume source is one big block on left
          const sourceY = target.y; // Simplified: flow straight across? No, fan out.
          // Actually standard sankey: Source Y starts at 0, ends at 300.
          // We map source slice to target slice.
          
          const path = `
            M 50 ${target.y + target.hPx/2} 
            C 250 ${target.y + target.hPx/2}, 
              350 ${target.y + target.hPx/2}, 
              550 ${target.y + target.hPx/2}
          `;
          
          // Better "Fan Out" Path
          // Source is [0, 300], Target is slice [y, y+h]
          // We fan out from the single source block to the targets.
          // Actually, let's draw from specific source y-segments to target.
          const startY = target.y + target.hPx/2; // In reality source segments should align.
          // Since L1 sums to L0 (mostly), we can map 1:1
          
          return (
            <g key={target.id}>
               <path 
                 d={`M 120 ${target.y + target.hPx/2} C 300 ${target.y + target.hPx/2}, 300 ${target.y + target.hPx/2}, 480 ${target.y + target.hPx/2}`}
                 stroke="url(#flowGradient)"
                 strokeWidth={Math.max(target.hPx - 2, 1)}
                 fill="none"
               />
            </g>
          );
        })}

        {/* Nodes L0 */}
        <rect x="20" y="0" width="100" height="300" fill="#6366f1" rx="4" />
        <text x="70" y="150" textAnchor="middle" fill="white" className="text-xs font-bold" transform="rotate(-90 70 150)">
          {product.sku_code} (${totalCost.toFixed(0)})
        </text>

        {/* Nodes L1 */}
        {layers.l1.map((node, i) => (
          <g key={node.id}>
            <rect x="480" y={node.y} width="100" height={Math.max(node.hPx - 2, 2)} fill={i % 2 === 0 ? "#8b5cf6" : "#a78bfa"} rx="4" />
             {node.hPx > 20 && (
               <text x="530" y={node.y + node.hPx/2} dy="4" textAnchor="middle" fill="white" className="text-[10px] font-medium">
                 ${node.cost.toFixed(0)}
               </text>
             )}
          </g>
        ))}
      </svg>
      
      <div className="absolute top-2 left-2 text-xs font-bold text-indigo-900">Product Value</div>
      <div className="absolute top-2 right-2 text-xs font-bold text-purple-900">Component Breakdown</div>
    </div>
  );
};

export default function BOMScenarioSimulator({ product, bomData, skus, open, onOpenChange }) {
  const [scenarioName, setScenarioName] = useState("New Scenario");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Scenario Modifiers
  const [modifiers, setModifiers] = useState({
    globalPrice: 0, // % change
    globalLeadTime: 0, // days change
    componentDisruptions: [] // List of sku_ids disrupted
  });

  // Fetch Supplier Mappings to get Base Costs/Lead Times
  const { data: mappings = [] } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list(),
    enabled: !!open
  });
  
  // Fetch Suppliers for Risk Map
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: !!open
  });

  // 1. Calculate Base State
  const baseState = useMemo(() => {
    if (!product || !bomData.length) return { cost: 0, leadTime: 0 };

    let totalCost = 0;
    let maxLeadTime = 0;

    const calculateNode = (skuId, qtyMultiplier = 1) => {
      const children = bomData.filter(l => l.parent_sku_id === skuId);
      
      if (children.length === 0) {
        const bomLink = bomData.find(l => l.child_sku_id === skuId);
        const mapping = mappings.find(m => m.sku_id === skuId && m.is_primary_supplier) 
                     || mappings.find(m => m.sku_id === skuId);
        
        const price = bomLink?.cost_per_unit ?? (mapping?.unit_price || 0);
        const leadTime = bomLink?.lead_time_days ?? (mapping?.lead_time_days || 0);
        
        totalCost += price * qtyMultiplier;
        maxLeadTime = Math.max(maxLeadTime, leadTime);
      } else {
        children.forEach(link => {
          calculateNode(link.child_sku_id, qtyMultiplier * link.quantity);
        });
      }
    };

    calculateNode(product.id);
    return { cost: totalCost, leadTime: maxLeadTime };
  }, [product, bomData, mappings]);

  // 2. Calculate Simulated State
  const simulatedState = useMemo(() => {
    if (!product || !bomData.length) return { cost: 0, leadTime: 0, breakdown: [] };

    let totalCost = 0;
    let maxLeadTime = 0;
    let breakdown = [];

    const calculateNode = (skuId, qtyMultiplier = 1) => {
      const children = bomData.filter(l => l.parent_sku_id === skuId);
      
      if (children.length === 0) {
        const bomLink = bomData.find(l => l.child_sku_id === skuId);
        const mapping = mappings.find(m => m.sku_id === skuId && m.is_primary_supplier) 
                     || mappings.find(m => m.sku_id === skuId);
        
        let price = bomLink?.cost_per_unit ?? (mapping?.unit_price || 0);
        let leadTime = bomLink?.lead_time_days ?? (mapping?.lead_time_days || 0);

        // Apply Modifiers
        price = price * (1 + modifiers.globalPrice / 100);
        leadTime = leadTime + modifiers.globalLeadTime;

        if (modifiers.componentDisruptions.includes(skuId)) {
          price = price * 1.5;
          leadTime = leadTime + 20;
        }
        
        const cost = price * qtyMultiplier;
        totalCost += cost;
        maxLeadTime = Math.max(maxLeadTime, leadTime);
        
        // Find supplier for risk map
        const supplierId = bomLink?.supplier_id || mapping?.supplier_id;
        const supplier = suppliers.find(s => s.id === supplierId);
        
        breakdown.push({
          skuId,
          skuCode: skus.find(s => s.id === skuId)?.sku_code || 'Unknown',
          cost,
          supplier,
          riskScore: supplier?.risk_score || 50,
          leadTime
        });

      } else {
        children.forEach(link => {
          calculateNode(link.child_sku_id, qtyMultiplier * link.quantity);
        });
      }
    };

    calculateNode(product.id);
    return { cost: totalCost, leadTime: maxLeadTime, breakdown };
  }, [product, bomData, mappings, modifiers, suppliers, skus]);

  // AI Scenario Generation
  const generateAIScenario = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const relevantSkuIds = new Set();
      const traverse = (pid) => {
        bomData.filter(l => l.parent_sku_id === pid).forEach(l => {
          relevantSkuIds.add(l.child_sku_id);
          traverse(l.child_sku_id);
        });
      };
      traverse(product.id);
      const relevantSkus = skus.filter(s => relevantSkuIds.has(s.id));
      const skuContext = relevantSkus.map(s => `${s.sku_code} (${s.description})`).join(", ");

      const prompt = `
        Generate a supply chain scenario based on: "${aiPrompt}"
        Product Context: ${skuContext}
        Return JSON:
        {
          "scenario_name": "string",
          "global_price_change_percent": number,
          "global_lead_time_change_days": number,
          "disrupted_components": ["sku_code1", "sku_code2"]
        }
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            scenario_name: { type: "string" },
            global_price_change_percent: { type: "number" },
            global_lead_time_change_days: { type: "number" },
            disrupted_components: { type: "array", items: { type: "string" } }
          },
          required: ["scenario_name", "global_price_change_percent", "global_lead_time_change_days"]
        }
      });

      const disruptedIds = (response.disrupted_components || [])
        .map(code => skus.find(s => s.sku_code === code)?.id)
        .filter(Boolean);

      setScenarioName(response.scenario_name);
      setModifiers({
        globalPrice: response.global_price_change_percent,
        globalLeadTime: response.global_lead_time_change_days,
        componentDisruptions: disruptedIds
      });
      toast.success("Scenario Generated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate scenario");
    } finally {
      setIsGenerating(false);
    }
  };

  // Chart Data Preparation
  const impactData = [
    { name: 'Base Case', Cost: baseState.cost, LeadTime: baseState.leadTime },
    { name: 'Simulated', Cost: simulatedState.cost, LeadTime: simulatedState.leadTime },
  ];

  // Trend Data (Mocked)
  const trendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    // History (first 6) + Forecast (next 3)
    return months.map((m, i) => {
      const isHistory = i < 6;
      const baseVal = baseState.cost * (1 + (Math.sin(i) * 0.05)); // Random historic fluctuation
      
      if (isHistory) {
        return { name: m, Base: baseVal, Simulated: null, type: 'History' };
      } else {
        // Forecast
        return { 
          name: m, 
          Base: baseVal, // Base forecast
          Simulated: simulatedState.cost * (1 + ((i-6) * 0.02)), // Simulated diverges
          type: 'Forecast' 
        };
      }
    });
  }, [baseState.cost, simulatedState.cost]);

  // Risk Map Data
  const riskMapData = simulatedState.breakdown.map(item => ({
    x: item.riskScore,
    y: item.cost,
    z: 100, // Bubble size
    name: item.skuCode,
    supplier: item.supplier?.legal_name || 'Unknown'
  }));

  const costDiff = simulatedState.cost - baseState.cost;
  const timeDiff = simulatedState.leadTime - baseState.leadTime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Advanced Scenario Simulator
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 flex-1 overflow-hidden pt-4">
          {/* Left: Controls */}
          <div className="w-1/3 space-y-6 overflow-y-auto pr-2 border-r border-slate-100">
            {/* AI Input */}
            <Card className="border-indigo-100 bg-indigo-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
                  <Sparkles className="w-4 h-4" />
                  AI Scenario Generator
                </div>
                <Input 
                  placeholder="e.g. 'Copper price surge'" 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="bg-white text-xs"
                />
                <Button 
                  size="sm" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={generateAIScenario}
                  disabled={isGenerating}
                >
                  {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin mr-2" /> : <Play className="w-3 h-3 mr-2" />}
                  Generate
                </Button>
              </CardContent>
            </Card>

            {/* Manual Controls */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-slate-700">Global Price</label>
                  <span className={modifiers.globalPrice > 0 ? "text-rose-600 text-xs" : "text-emerald-600 text-xs"}>
                    {modifiers.globalPrice > 0 ? '+' : ''}{modifiers.globalPrice}%
                  </span>
                </div>
                <Slider 
                  defaultValue={[0]} 
                  value={[modifiers.globalPrice]}
                  min={-50} max={100} step={1}
                  onValueChange={(val) => setModifiers({...modifiers, globalPrice: val[0]})}
                />
              </div>

              <div>
                 <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-slate-700">Global Lead Time</label>
                  <span className={modifiers.globalLeadTime > 0 ? "text-amber-600 text-xs" : "text-emerald-600 text-xs"}>
                    {modifiers.globalLeadTime > 0 ? '+' : ''}{modifiers.globalLeadTime} days
                  </span>
                </div>
                <Slider 
                  defaultValue={[0]} 
                  value={[modifiers.globalLeadTime]}
                  min={-30} max={90} step={1}
                  onValueChange={(val) => setModifiers({...modifiers, globalLeadTime: val[0]})}
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-medium text-slate-700 mb-2 block">
                  Disrupted Components
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {modifiers.componentDisruptions.map(id => {
                    const sku = skus.find(s => s.id === id);
                    return (
                      <Badge key={id} variant="outline" className="mr-1 mb-1 text-[10px] border-rose-200 text-rose-700 bg-rose-50">
                        {sku?.sku_code || id}
                      </Badge>
                    );
                  })}
                  {modifiers.componentDisruptions.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No disruptions selected</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Visualization */}
          <div className="w-2/3 flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">{scenarioName}</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setScenarioName("Baseline Reset");
                    setModifiers({ globalPrice: 0, globalLeadTime: 0, componentDisruptions: [] });
                  }}
                >
                  Reset
                </Button>
             </div>

             {/* KPI Cards */}
             <div className="grid grid-cols-2 gap-4">
               <Card className={costDiff > 0 ? "border-rose-200 bg-rose-50/30" : "border-emerald-200 bg-emerald-50/30"}>
                 <CardContent className="p-4">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-xs font-medium text-slate-500 uppercase">Total Cost</p>
                       <p className="text-2xl font-bold text-slate-900 mt-1">
                         ${simulatedState.cost.toFixed(2)}
                       </p>
                     </div>
                     <div className={`p-2 rounded-full ${costDiff > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                       <DollarSign className="w-4 h-4" />
                     </div>
                   </div>
                   <div className="mt-2 text-xs font-medium">
                     {costDiff > 0 ? '+' : ''}{costDiff.toFixed(2)} ({((costDiff/baseState.cost)*100 || 0).toFixed(1)}%)
                   </div>
                 </CardContent>
               </Card>

               <Card className={timeDiff > 0 ? "border-amber-200 bg-amber-50/30" : "border-emerald-200 bg-emerald-50/30"}>
                 <CardContent className="p-4">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-xs font-medium text-slate-500 uppercase">Lead Time</p>
                       <p className="text-2xl font-bold text-slate-900 mt-1">
                         {simulatedState.leadTime} Days
                       </p>
                     </div>
                     <div className={`p-2 rounded-full ${timeDiff > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                       <Clock className="w-4 h-4" />
                     </div>
                   </div>
                   <div className="mt-2 text-xs font-medium">
                     {timeDiff > 0 ? '+' : ''}{timeDiff} Days
                   </div>
                 </CardContent>
               </Card>
             </div>

             {/* Advanced Visualizations Tabs */}
             <Card className="flex-1 border-slate-200 flex flex-col overflow-hidden">
               <Tabs defaultValue="impact" className="h-full flex flex-col">
                 <div className="border-b border-slate-100 px-4 py-2 bg-slate-50/50">
                   <TabsList className="grid w-full grid-cols-4 h-8">
                     <TabsTrigger value="impact" className="text-xs">Impact</TabsTrigger>
                     <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
                     <TabsTrigger value="risk" className="text-xs">Risk Map</TabsTrigger>
                     <TabsTrigger value="flow" className="text-xs">Flow</TabsTrigger>
                   </TabsList>
                 </div>
                 
                 <div className="flex-1 p-4 min-h-0">
                   <TabsContent value="impact" className="h-full m-0">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={impactData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} />
                         <XAxis dataKey="name" />
                         <YAxis yAxisId="left" orientation="left" />
                         <YAxis yAxisId="right" orientation="right" />
                         <Tooltip contentStyle={{ borderRadius: '8px' }} />
                         <Legend />
                         <Bar yAxisId="left" dataKey="Cost" fill="#6366f1" name="Cost ($)" radius={[4, 4, 0, 0]} barSize={50} />
                         <Bar yAxisId="right" dataKey="LeadTime" fill="#f59e0b" name="Lead Time (Days)" radius={[4, 4, 0, 0]} barSize={50} />
                       </BarChart>
                     </ResponsiveContainer>
                   </TabsContent>

                   <TabsContent value="trends" className="h-full m-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          <ReferenceLine x="Jun" stroke="red" strokeDasharray="3 3" label="Scenario Start" />
                          <Line type="monotone" dataKey="Base" stroke="#64748b" strokeWidth={2} dot={{r: 4}} />
                          <Line type="monotone" dataKey="Simulated" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} />
                        </LineChart>
                      </ResponsiveContainer>
                   </TabsContent>

                   <TabsContent value="risk" className="h-full m-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid />
                          <XAxis type="number" dataKey="x" name="Risk Score" unit="" domain={[0, 100]} label={{ value: 'Supplier Risk Score', position: 'bottom' }} />
                          <YAxis type="number" dataKey="y" name="Cost Impact" unit="$" label={{ value: 'Cost Contribution', angle: -90, position: 'insideLeft' }} />
                          <ZAxis type="number" dataKey="z" range={[60, 400]} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                             if (active && payload && payload.length) {
                               const data = payload[0].payload;
                               return (
                                 <div className="bg-white p-2 border border-slate-200 rounded shadow-lg text-xs">
                                   <p className="font-bold">{data.name}</p>
                                   <p>{data.supplier}</p>
                                   <p>Risk: {data.x}</p>
                                   <p>Cost: ${data.y.toFixed(2)}</p>
                                 </div>
                               );
                             }
                             return null;
                          }} />
                          <Scatter name="Components" data={riskMapData} fill="#ef4444" />
                        </ScatterChart>
                      </ResponsiveContainer>
                   </TabsContent>

                   <TabsContent value="flow" className="h-full m-0">
                     <CostFlowDiagram product={product} bomData={bomData} totalCost={simulatedState.cost} />
                   </TabsContent>
                 </div>
               </Tabs>
             </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
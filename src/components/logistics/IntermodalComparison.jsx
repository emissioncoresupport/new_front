import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plane, Ship, Truck, Train, TrendingDown, DollarSign, Clock, Leaf } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function IntermodalComparison() {
  const [origin, setOrigin] = useState('Shanghai');
  const [destination, setDestination] = useState('Rotterdam');
  const [weight, setWeight] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const runComparison = async () => {
    setLoading(true);
    toast.loading("Analyzing route options...");

    try {
      const prompt = `Compare transportation modes for shipment from ${origin} to ${destination}, ${weight} kg.
      Calculate realistic values for:
      - Air freight: CO2e emissions, cost, transit time
      - Sea freight: CO2e emissions, cost, transit time
      - Road (if applicable): CO2e emissions, cost, transit time
      - Rail (if applicable): CO2e emissions, cost, transit time
      - Intermodal combinations (Sea + Road, Rail + Road)
      
      Use GLEC Framework emission factors. Provide savings potential vs air freight.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            routes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mode: { type: "string" },
                  co2e_kg: { type: "number" },
                  cost_usd: { type: "number" },
                  transit_days: { type: "number" },
                  description: { type: "string" }
                }
              }
            },
            recommendations: { type: "string" }
          }
        }
      });

      setResults(response);
      toast.success("Route analysis complete");
    } catch (error) {
      toast.error("Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const getModeIcon = (mode) => {
    if (mode.includes('Air')) return <Plane className="w-4 h-4" />;
    if (mode.includes('Sea')) return <Ship className="w-4 h-4" />;
    if (mode.includes('Road')) return <Truck className="w-4 h-4" />;
    if (mode.includes('Rail')) return <Train className="w-4 h-4" />;
    return <Truck className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/20 shadow-md">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-[#86b027]">Intermodal Route Comparison</CardTitle>
          <p className="text-sm text-slate-500">Compare emissions, cost, and time across transport modes</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label>Origin</Label>
              <Input value={origin} onChange={(e) => setOrigin(e.target.value)} />
            </div>
            <div>
              <Label>Destination</Label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={runComparison}
                disabled={loading}
                className="w-full bg-[#86b027] hover:bg-[#769c22] text-white"
              >
                {loading ? 'Analyzing...' : 'Compare Routes'}
              </Button>
            </div>
          </div>

          {results && (
            <div className="space-y-6">
              {/* Chart */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-4">CO₂e Emissions Comparison</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={results.routes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mode" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} label={{ value: 'kg CO₂e', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="co2e_kg" fill="#86b027" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detailed Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.routes.map((route, idx) => (
                  <Card key={idx} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getModeIcon(route.mode)}
                          <h4 className="font-semibold text-slate-900">{route.mode}</h4>
                        </div>
                        {idx === 0 && <Badge className="bg-amber-500 text-white">Fastest</Badge>}
                        {route.co2e_kg === Math.min(...results.routes.map(r => r.co2e_kg)) && (
                          <Badge className="bg-[#86b027] text-white">Greenest</Badge>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 flex items-center gap-1">
                            <Leaf className="w-3 h-3" /> CO₂e
                          </span>
                          <span className="font-bold text-slate-900">{route.co2e_kg} kg</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Cost
                          </span>
                          <span className="font-bold text-slate-900">${route.cost_usd}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Transit
                          </span>
                          <span className="font-bold text-slate-900">{route.transit_days} days</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-3">{route.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recommendations */}
              <div className="bg-[#86b027]/5 border border-[#86b027]/20 rounded-lg p-4">
                <h4 className="font-semibold text-[#86b027] mb-2 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Optimization Recommendations
                </h4>
                <p className="text-sm text-slate-700">{results.recommendations}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
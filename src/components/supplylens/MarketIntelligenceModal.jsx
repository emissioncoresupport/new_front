import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Globe, TrendingUp, AlertTriangle, DollarSign, Newspaper } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

export default function MarketIntelligenceModal({ sku, open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (open && sku) {
      fetchMarketIntel();
    }
  }, [open, sku]);

  const fetchMarketIntel = async () => {
    setLoading(true);
    setData(null);
    try {
      // Use LLM with internet access to get real-time data
      const prompt = `
        Conduct a real-time market intelligence analysis for the following product/component:
        Product: ${sku.sku_code}
        Description: ${sku.description}
        Category: ${sku.category}

        Search the internet for:
        1. Global supply shortages or disruptions affecting this type of component.
        2. Recent price trends (increasing/decreasing/stable).
        3. Major news affecting key manufacturers or raw materials (e.g. Lithium, Steel, Chips).
        4. Regulatory updates (e.g. PFAS bans, new tariffs).

        Return the response as a JSON object with these keys:
        - "summary": A brief executive summary (max 2 sentences).
        - "risk_level": "Low", "Medium", "High" based on current market conditions.
        - "price_trend": "Rising", "Falling", "Stable".
        - "news": Array of recent news headlines/snippets with dates (max 3).
        - "disruptions": Description of any active supply chain disruptions.
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            risk_level: { type: "string", enum: ["Low", "Medium", "High"] },
            price_trend: { type: "string", enum: ["Rising", "Falling", "Stable"] },
            news: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  title: { type: "string" },
                  date: { type: "string" }
                }
              } 
            },
            disruptions: { type: "string" }
          },
          required: ["summary", "risk_level", "price_trend", "disruptions"]
        }
      });

      setData(response);
    } catch (error) {
      console.error("Market Intel Error:", error);
      toast.error("Failed to fetch market intelligence");
    } finally {
      setLoading(false);
    }
  };

  if (!sku) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Live Market Intelligence
          </DialogTitle>
          <DialogDescription>
            Real-time analysis for <span className="font-medium text-slate-900">{sku.description}</span> ({sku.sku_code})
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[300px] space-y-3 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p>Scanning global news sources...</p>
            </div>
          ) : data ? (
            <div className="space-y-6 py-2">
              {/* Key Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Market Risk Level
                  </p>
                  <Badge className={
                    data.risk_level === 'High' ? 'bg-rose-100 text-rose-700 hover:bg-rose-100' :
                    data.risk_level === 'Medium' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                    'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                  }>
                    {data.risk_level}
                  </Badge>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Price Trend
                  </p>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    {data.price_trend}
                    {data.price_trend === 'Rising' && <TrendingUp className="w-4 h-4 text-rose-500" />}
                    {data.price_trend === 'Falling' && <TrendingUp className="w-4 h-4 text-emerald-500 transform rotate-180" />}
                    {data.price_trend === 'Stable' && <div className="w-16 h-1 bg-slate-200 rounded" />}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Executive Summary</h4>
                <p className="text-sm text-slate-600 leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  {data.summary}
                </p>
              </div>

              {/* Disruptions */}
              {data.disruptions && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Active Disruptions
                  </h4>
                  <p className="text-sm text-slate-600">{data.disruptions}</p>
                </div>
              )}

              {/* Recent News */}
              {data.news?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-slate-500" />
                    Recent Headlines
                  </h4>
                  <ul className="space-y-2">
                    {data.news.map((item, i) => (
                      <li key={i} className="text-sm bg-white p-2 rounded border border-slate-100 shadow-sm">
                        <span className="block font-medium text-slate-800">{item.title}</span>
                        <span className="text-xs text-slate-400">{item.date}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
              <Globe className="w-10 h-10 mb-2 opacity-20" />
              <p>No data available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
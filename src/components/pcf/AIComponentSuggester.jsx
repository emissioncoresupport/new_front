import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, CheckCircle2, Plus, Loader2, Database, Copy, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AIComponentSuggester({ productId, productName, productCategory, existingComponents = [], onApplyComponent }) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const queryClient = useQueryClient();

  const { data: allComponents = [] } = useQuery({
    queryKey: ['all-product-components'],
    queryFn: () => base44.entities.ProductComponent.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  // AI-Powered Component Suggestions
  const generateSuggestions = async () => {
    setIsSuggesting(true);
    try {
      // Get components from similar products
      const similarProducts = products.filter(p => 
        p.category === productCategory && p.id !== productId
      );

      const similarComponents = allComponents.filter(c => 
        similarProducts.some(p => p.id === c.product_id) &&
        !existingComponents.some(ec => ec.name === c.name)
      );

      // Build reusable modules dataset
      const moduleLibrary = allComponents.filter(c => 
        c.product_id === 'TEMPLATE' || c.comment?.includes('reusable_module')
      );

      const prompt = `
        Analyze and suggest reusable components for this new product:
        
        **Product:** ${productName}
        **Category:** ${productCategory}
        **Current Components:** ${existingComponents.map(c => c.name).join(', ') || 'None'}
        
        **Available Reusable Modules:**
        ${JSON.stringify(moduleLibrary.map(m => ({
          name: m.name,
          material: m.material_type,
          ef: m.emission_factor,
          unit: m.unit
        })), null, 2)}
        
        **Components from Similar Products:**
        ${JSON.stringify(similarComponents.slice(0, 20).map(c => ({
          name: c.name,
          material: c.material_type,
          quantity: c.quantity,
          unit: c.unit,
          ef: c.emission_factor,
          co2e: c.co2e_kg
        })), null, 2)}
        
        Based on industry standards and similar products, suggest:
        1. Reusable modules from library that apply to this product
        2. Common components from similar products that should be added
        3. Standard industry components typically needed (packaging, transport, energy)
        
        Return top 10 most relevant suggestions with reasoning and confidence.
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source_component_id: { type: "string" },
                  component_name: { type: "string" },
                  material_type: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  emission_factor: { type: "number" },
                  data_quality_rating: { type: "number" },
                  lifecycle_stage: { type: "string" },
                  confidence_score: { type: "number" },
                  reasoning: { type: "string" },
                  source_type: { type: "string", enum: ["module_library", "similar_product", "industry_standard"] }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
      toast.success(`Found ${result.suggestions?.length || 0} reusable component suggestions`);
    } catch (error) {
      console.error('Suggestion generation failed:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setIsSuggesting(false);
    }
  };

  const applyMutation = useMutation({
    mutationFn: async (suggestion) => {
      const component = await base44.entities.ProductComponent.create({
        product_id: productId,
        name: suggestion.component_name,
        material_type: suggestion.material_type,
        quantity: suggestion.quantity || 1,
        unit: suggestion.unit || 'kg',
        emission_factor: suggestion.emission_factor,
        data_quality_rating: suggestion.data_quality_rating || 3,
        lifecycle_stage: suggestion.lifecycle_stage || 'Production',
        node_type: 'Component',
        comment: `AI suggested from ${suggestion.source_type}: ${suggestion.reasoning}`,
        co2e_kg: (suggestion.quantity || 1) * (suggestion.emission_factor || 0)
      });
      return component;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-components'] });
      toast.success('Component added from suggestion');
      if (onApplyComponent) onApplyComponent();
    }
  });

  const getSourceBadge = (sourceType) => {
    switch (sourceType) {
      case 'module_library':
        return <Badge className="bg-[#86b027]/10 text-[#86b027] border-[#86b027]/30 text-[10px] font-light">Module Library</Badge>;
      case 'similar_product':
        return <Badge className="bg-slate-100/80 text-slate-600 border-slate-200/60 text-[10px] font-light">Similar Product</Badge>;
      case 'industry_standard':
        return <Badge className="bg-slate-100/80 text-slate-600 border-slate-200/60 text-[10px] font-light">Industry Standard</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-light">AI Generated</Badge>;
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
      <div className="relative">
        <div className="p-4 border-b border-white/30 bg-white/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-light text-sm text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#86b027]" />
                Component Suggester
              </div>
              <p className="text-xs text-slate-500 font-light mt-0.5">Reuse proven components</p>
            </div>
            <Button 
              onClick={generateSuggestions}
              disabled={isSuggesting}
              size="sm"
              variant="ghost"
              className="rounded-lg hover:bg-white/20 backdrop-blur-sm text-slate-600 font-light h-8"
            >
              {isSuggesting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  Get Suggestions
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="p-4">
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-light">No suggestions yet</p>
            <p className="text-xs mt-1 font-light">Click "Get Suggestions" to find reusable components</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-2 pr-3">
              {suggestions.map((sugg, idx) => (
                <div key={idx} className="p-3 border border-white/60 rounded-lg hover:border-[#86b027]/30 hover:bg-white/40 transition-all bg-white/30 backdrop-blur-sm group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-light text-sm text-slate-900 truncate">{sugg.component_name}</p>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-light border-slate-200/60 bg-white/40",
                          sugg.confidence_score >= 80 ? 'text-[#86b027] border-[#86b027]/30' :
                          'text-slate-600'
                        )}>
                          {sugg.confidence_score}% match
                        </Badge>
                      </div>
                      {getSourceBadge(sugg.source_type)}
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => applyMutation.mutate(sugg)}
                      variant="ghost"
                      className="shrink-0 h-7 text-xs text-[#86b027] hover:bg-[#86b027]/10 font-light"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-light mb-2">
                    <div>Material: <span className="font-light text-slate-900">{sugg.material_type}</span></div>
                    <div>Quantity: <span className="font-light text-slate-900">{sugg.quantity} {sugg.unit}</span></div>
                    <div>EF: <span className="font-light text-slate-900">{sugg.emission_factor} kgCO₂e/{sugg.unit}</span></div>
                    <div>Impact: <span className="font-light text-slate-900">{((sugg.quantity || 1) * (sugg.emission_factor || 0)).toFixed(3)} kgCO₂e</span></div>
                  </div>
                  
                  <p className="text-[10px] text-slate-500 font-light italic">{sugg.reasoning}</p>
                  
                  <div className="flex items-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "w-1 h-1 rounded-full",
                          i < (sugg.data_quality_rating || 3) ? 'bg-[#86b027]' : 'bg-slate-200'
                        )}
                      />
                    ))}
                    <span className="text-[9px] text-slate-500 ml-1 font-light">DQR: {sugg.data_quality_rating}/5</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        </div>
      </div>
    </div>
  );
}
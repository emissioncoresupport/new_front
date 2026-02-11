import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Copy, Package, Sparkles, Plus, Grid3x3, 
  CheckCircle2, Loader2, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

export default function ProductFamilyTemplates() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [bulkCount, setBulkCount] = useState(5);
  const [newTemplate, setNewTemplate] = useState({
    family_name: '',
    description: '',
    base_product_id: '',
    variation_rules: ''
  });

  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: components = [] } = useQuery({
    queryKey: ['all-components'],
    queryFn: () => base44.entities.ProductComponent.list()
  });

  // Create Product Family from Base
  const createFamilyMutation = useMutation({
    mutationFn: async ({ baseProductId, familyName, variantCount }) => {
      const baseProduct = products.find(p => p.id === baseProductId);
      if (!baseProduct) throw new Error('Base product not found');

      const baseComponents = components.filter(c => c.product_id === baseProductId);
      
      const createdProducts = [];
      
      for (let i = 1; i <= variantCount; i++) {
        const variant = await base44.entities.Product.create({
          name: `${familyName} - Variant ${i}`,
          sku: `${baseProduct.sku}-V${i}`,
          description: `Auto-generated variant ${i} based on ${baseProduct.name} template`,
          category: baseProduct.category,
          weight_kg: baseProduct.weight_kg,
          expected_lifetime: baseProduct.expected_lifetime,
          manufacturer: baseProduct.manufacturer,
          manufacturing_country: baseProduct.manufacturing_country,
          lca_stage: 'screening', // Family variants use screening approach
          system_boundary: baseProduct.system_boundary
        });

        // Copy components from base
        for (const comp of baseComponents) {
          await base44.entities.ProductComponent.create({
            product_id: variant.id,
            name: comp.name,
            material_type: comp.material_type,
            quantity: comp.quantity,
            unit: comp.unit,
            emission_factor: comp.emission_factor,
            emission_factor_source: comp.emission_factor_source,
            assigned_dataset_id: comp.assigned_dataset_id,
            assigned_dataset_name: comp.assigned_dataset_name,
            lifecycle_stage: comp.lifecycle_stage,
            node_type: comp.node_type,
            geographic_origin: comp.geographic_origin,
            co2e_kg: comp.co2e_kg,
            data_quality_rating: comp.data_quality_rating
          });
        }

        createdProducts.push(variant);
      }

      return { products: createdProducts, count: variantCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['all-components'] });
      toast.success(`Created ${result.count} product variants from template`);
      setIsApplyOpen(false);
    }
  });

  const eligibleBaseProducts = products.filter(p => 
    p.lca_stage === 'full_lca' || p.lca_stage === 'full'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#545454] flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-[#86b027]" />
            Product Family Templates
          </h3>
          <p className="text-sm text-slate-500">Clone products with variations - use templates for product families</p>
        </div>
        <Button 
          onClick={() => setIsApplyOpen(true)}
          disabled={eligibleBaseProducts.length === 0}
          className="bg-[#86b027] hover:bg-[#769c22] text-white"
        >
          <Copy className="w-4 h-4 mr-2" />
          Create Family
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#545454]">
            Template-Based Product Creation
          </CardTitle>
          <CardDescription>
            Use detailed LCAs as templates for similar products - drastically reduce modeling time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-lg">
                <Sparkles className="w-6 h-6 text-[#86b027]" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-[#545454] mb-2">How It Works</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="font-bold text-xs text-slate-500 uppercase mb-1">Step 1</p>
                    <p className="text-xs text-slate-700">Select a fully modeled product as base template</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="font-bold text-xs text-slate-500 uppercase mb-1">Step 2</p>
                    <p className="text-xs text-slate-700">Specify number of variants to generate</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="font-bold text-xs text-slate-500 uppercase mb-1">Step 3</p>
                    <p className="text-xs text-slate-700">All components auto-cloned with emission data</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {eligibleBaseProducts.length === 0 ? (
            <div className="text-center py-8 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm font-medium text-amber-800">No base products available</p>
              <p className="text-xs text-amber-600 mt-1">
                Create at least one Full LCA product to use as a template
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold text-slate-700 mb-3">
                Available Base Templates ({eligibleBaseProducts.length})
              </p>
              <div className="grid grid-cols-2 gap-3">
                {eligibleBaseProducts.slice(0, 6).map(p => {
                  const compCount = components.filter(c => c.product_id === p.id).length;
                  return (
                    <div key={p.id} className="p-3 border border-slate-200 rounded-lg hover:border-[#86b027] transition-colors bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.sku}</p>
                        </div>
                        <Badge className="bg-[#86b027]/10 text-[#86b027] border-0 text-xs">Full LCA</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{compCount} components</span>
                        <span>{p.pcf_co2e?.toFixed(1) || 0} kg CO₂e</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Template Modal */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-[#86b027]" />
              Generate Product Family
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Base Template Product *</Label>
              <select
                className="w-full p-2 border border-slate-200 rounded-lg"
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <option value="">Select base product...</option>
                {eligibleBaseProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({components.filter(c => c.product_id === p.id).length} components)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Family Name *</Label>
              <Input 
                placeholder="e.g. Widget Series A"
                value={newTemplate.family_name}
                onChange={(e) => setNewTemplate({...newTemplate, family_name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Number of Variants to Generate</Label>
              <Input 
                type="number"
                min="1"
                max="50"
                value={bulkCount}
                onChange={(e) => setBulkCount(parseInt(e.target.value))}
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm font-bold text-emerald-800 mb-1">
                ⚡ Time Savings Estimate
              </p>
              <p className="text-xs text-emerald-700">
                Creating {bulkCount} variants manually: ~{bulkCount * 2} hours<br/>
                Using template: <strong>~5 minutes</strong> (96% faster)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApplyOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createFamilyMutation.mutate({
                baseProductId: selectedTemplate,
                familyName: newTemplate.family_name,
                variantCount: bulkCount
              })}
              disabled={!selectedTemplate || !newTemplate.family_name || createFamilyMutation.isPending}
              className="bg-[#86b027] hover:bg-[#769c22] text-white"
            >
              {createFamilyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Generate {bulkCount} Variants
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
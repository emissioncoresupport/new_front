import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Leaf, Zap, TrendingDown, CheckCircle2 } from "lucide-react";

/**
 * DPP-LCA-PCF Integration
 * Automatically pulls carbon data from LCA/PCF modules into DPP
 */
export default function DPPLCAIntegration({ productId, dppId }) {
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const product = products.find(p => p.id === productId);

  const syncCarbonData = useMutation({
    mutationFn: async () => {
      // Pull from PCF module
      if (!product?.total_co2e_kg) {
        throw new Error('Product has no carbon footprint calculated');
      }

      // Update DPP with LCA data
      await base44.entities.DPPRecord.update(dppId, {
        carbon_footprint_total_kgco2e: product.total_co2e_kg,
        carbon_footprint_breakdown: {
          raw_materials: product.raw_material_co2e,
          production: product.production_co2e,
          distribution: product.distribution_co2e,
          usage: product.usage_co2e,
          end_of_life: product.eol_co2e
        },
        lca_study_reference: product.reference_year,
        carbon_data_source: 'LCA Module',
        carbon_data_last_updated: new Date().toISOString()
      });

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Carbon data synced from LCA/PCF module');
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-600" />
          LCA/PCF Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {product?.total_co2e_kg ? (
          <>
            <div className="p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-emerald-900">Carbon Footprint Available</span>
                <Badge className="bg-emerald-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Calculated
                </Badge>
              </div>
              <p className="text-3xl font-bold text-emerald-900">
                {product.total_co2e_kg.toFixed(2)} kg CO2e
              </p>
            </div>

            <Button 
              onClick={() => syncCarbonData.mutate()}
              disabled={syncCarbonData.isPending}
              className="w-full bg-[#86b027] hover:bg-[#769c22]"
            >
              <Zap className="w-4 h-4 mr-2" />
              {syncCarbonData.isPending ? 'Syncing...' : 'Sync Carbon Data to DPP'}
            </Button>
          </>
        ) : (
          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-800">
              No carbon footprint calculated yet. Go to PCF module to calculate.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
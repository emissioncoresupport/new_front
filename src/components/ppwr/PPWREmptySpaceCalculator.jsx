import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Box, Loader2, Calculator } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function PPWREmptySpaceCalculator() {
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
      toast.loading('Calculating void space ratios...');

      for (const pkg of packaging) {
        const prompt = `Calculate empty space ratio for PPWR compliance:

Packaging: ${pkg.packaging_name}
Dimensions: ${pkg.dimensions || 'Not specified'}
Type: ${pkg.packaging_type}

PPWR requires max 40% void space for e-commerce packaging.
Estimate void space ratio as percentage.`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              empty_space_ratio: { type: "number" },
              is_compliant: { type: "boolean" },
              recommendation: { type: "string" }
            }
          }
        });

        await base44.entities.PPWRPackaging.update(pkg.id, {
          empty_space_ratio: result.empty_space_ratio,
          empty_space_compliant: result.is_compliant
        });
      }
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success('Void space analysis complete');
      queryClient.invalidateQueries(['ppwr-packaging']);
    }
  });

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Box className="w-5 h-5 text-blue-600" />
          Empty Space Ratio Calculation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => calculateMutation.mutate()}
          disabled={calculateMutation.isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          {calculateMutation.isPending ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Calculating...</>
          ) : (
            <><Calculator className="w-5 h-5 mr-2" /> Calculate Void Space</>
          )}
        </Button>

        <div className="space-y-3">
          {packaging.filter(p => p.empty_space_ratio !== null).map(pkg => (
            <div key={pkg.id} className="p-3 bg-white rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">{pkg.packaging_name}</span>
                <span className={`text-sm font-bold ${
                  pkg.empty_space_ratio <= 40 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {pkg.empty_space_ratio}%
                </span>
              </div>
              <Progress 
                value={pkg.empty_space_ratio} 
                className="h-2"
                indicatorClassName={pkg.empty_space_ratio <= 40 ? 'bg-emerald-500' : 'bg-rose-500'}
              />
              <div className="text-xs text-slate-500 mt-1">
                PPWR Limit: 40% {pkg.empty_space_ratio <= 40 ? '✓' : '✗'}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
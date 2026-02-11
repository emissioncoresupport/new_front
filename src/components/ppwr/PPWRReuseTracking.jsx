import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RotateCcw, Package, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function PPWRReuseTracking() {
  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const reusablePackaging = packaging.filter(p => p.is_reusable);
  const reusablePercentage = (reusablePackaging.length / (packaging.length || 1)) * 100;
  const targetReuse = 20; // PPWR target: 20% reusable packaging by 2030

  return (
    <Card className="border-teal-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-teal-600" />
          Reuse System Tracking
        </CardTitle>
        <p className="text-sm text-slate-600">Monitor reusable packaging adoption (PPWR Article 26)</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-teal-900">Reusable Packaging Adoption</span>
            <span className="text-2xl font-black text-teal-900">{reusablePercentage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={(reusablePercentage / targetReuse) * 100} 
            className="h-3"
            indicatorClassName="bg-teal-600"
          />
          <div className="text-xs text-teal-700 mt-2">
            2030 Target: {targetReuse}% • Gap: {(targetReuse - reusablePercentage).toFixed(1)}%
          </div>
        </div>

        <div className="space-y-3">
          {reusablePackaging.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reusable packaging registered yet</p>
            </div>
          ) : (
            reusablePackaging.map(pkg => (
              <div key={pkg.id} className="p-3 bg-white rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm">{pkg.packaging_name}</div>
                    <div className="text-xs text-slate-500">{pkg.material_category}</div>
                  </div>
                  <Badge className="bg-teal-100 text-teal-700">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reusable
                  </Badge>
                </div>
                {pkg.reuse_cycle_count && (
                  <div className="text-xs text-teal-600">
                    Designed for {pkg.reuse_cycle_count} cycles
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Recycle, TrendingUp, FileText } from "lucide-react";

export default function PPWRPCRTracking() {
  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const plasticPackaging = packaging.filter(p => p.material_category === 'Plastic');
  const avgPCR = plasticPackaging.length > 0
    ? plasticPackaging.reduce((sum, p) => sum + (p.recycled_content_percentage || 0), 0) / plasticPackaging.length
    : 0;

  const target2030 = 30; // PPWR requires 30% recycled content in contact-sensitive plastic packaging by 2030

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Recycle className="w-5 h-5 text-purple-600" />
          PCR Content Tracking
        </CardTitle>
        <p className="text-sm text-slate-600">Post-Consumer Recycled content compliance (PPWR Article 7)</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-purple-900">Portfolio Average PCR</span>
            <span className="text-2xl font-black text-purple-900">{avgPCR.toFixed(1)}%</span>
          </div>
          <Progress value={(avgPCR / target2030) * 100} className="h-3" indicatorClassName="bg-purple-600" />
          <div className="text-xs text-purple-700 mt-2">
            2030 Target: {target2030}% • Gap: {(target2030 - avgPCR).toFixed(1)}%
          </div>
        </div>

        {/* Individual Tracking */}
        <div className="space-y-3">
          {plasticPackaging.map(pkg => (
            <div key={pkg.id} className="p-3 bg-white rounded-lg border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-sm text-slate-900">{pkg.packaging_name}</div>
                  <div className="text-xs text-slate-500">{pkg.material_category}</div>
                </div>
                <Badge className={
                  pkg.recycled_content_percentage >= target2030 
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }>
                  {pkg.recycled_content_percentage}% PCR
                </Badge>
              </div>
              <Progress 
                value={(pkg.recycled_content_percentage / target2030) * 100} 
                className="h-2"
                indicatorClassName={
                  pkg.recycled_content_percentage >= target2030 ? 'bg-emerald-500' : 'bg-amber-500'
                }
              />
              {pkg.supplier_declaration_url && (
                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Supplier declaration on file
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
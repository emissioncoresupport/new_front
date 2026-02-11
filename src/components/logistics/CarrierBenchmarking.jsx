import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Award, TrendingUp, TrendingDown, Minus, Truck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function CarrierBenchmarking() {
  const { data: carriers = [] } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => base44.entities.Carrier.list()
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['logistics-shipments'],
    queryFn: () => base44.entities.LogisticsShipment.list()
  });

  // Calculate carrier performance
  const carrierPerformance = carriers.map(carrier => {
    const carrierShipments = shipments.filter(s => s.primary_carrier === carrier.name);
    const totalCO2e = carrierShipments.reduce((sum, s) => sum + (s.total_co2e_kg || 0), 0);
    const totalTonKm = carrierShipments.reduce((sum, s) => {
      const tonKm = ((s.total_weight_kg || 0) / 1000) * (s.total_distance_km || 0);
      return sum + tonKm;
    }, 0);
    
    const intensity = totalTonKm > 0 ? (totalCO2e * 1000) / totalTonKm : 0; // g CO2e/t-km
    const avgTransitDays = carrierShipments.length > 0 
      ? carrierShipments.reduce((sum, s) => sum + (s.avg_transit_days || 0), 0) / carrierShipments.length
      : 0;

    return {
      name: carrier.name,
      intensity: Math.round(intensity),
      shipmentCount: carrierShipments.length,
      sustainabilityRating: carrier.sustainability_rating || 'Not Rated',
      avgTransitDays: Math.round(avgTransitDays),
      certifications: carrier.certifications || []
    };
  }).filter(c => c.shipmentCount > 0).sort((a, b) => a.intensity - b.intensity);

  const industryAvg = 250; // Mock GLEC industry average

  const getRatingColor = (rating) => {
    switch(rating) {
      case 'Excellent': return 'bg-[#86b027] text-white';
      case 'Good': return 'bg-emerald-500 text-white';
      case 'Fair': return 'bg-amber-500 text-white';
      case 'Poor': return 'bg-rose-500 text-white';
      default: return 'bg-slate-300 text-slate-700';
    }
  };

  const getPerformanceIcon = (intensity) => {
    if (intensity < industryAvg * 0.8) return <TrendingDown className="w-4 h-4 text-[#86b027]" />;
    if (intensity > industryAvg * 1.2) return <TrendingUp className="w-4 h-4 text-rose-500" />;
    return <Minus className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/20 shadow-md">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-[#86b027] flex items-center gap-2">
            <Award className="w-5 h-5" />
            Carrier Performance Benchmarking
          </CardTitle>
          <p className="text-sm text-slate-500">
            Compare carrier emissions intensity vs GLEC industry benchmarks
          </p>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={carrierPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-20} textAnchor="end" height={80} />
                <YAxis tick={{ fill: '#64748b' }} label={{ value: 'g CO₂e/t-km', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="intensity" radius={[8, 8, 0, 0]}>
                  {carrierPerformance.map((entry, index) => (
                    <Cell key={index} fill={entry.intensity < industryAvg ? '#86b027' : entry.intensity < industryAvg * 1.2 ? '#fbbf24' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm">
              <div className="w-3 h-3 bg-slate-300 rounded" />
              <span className="text-slate-600">Industry Average: {industryAvg} g CO₂e/t-km</span>
            </div>
          </div>

          {/* Detailed Ranking */}
          <div className="space-y-3">
            {carrierPerformance.map((carrier, idx) => (
              <Card key={idx} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-slate-900">#{idx + 1}</span>
                        {idx === 0 && <Award className="w-4 h-4 text-[#86b027]" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-500" />
                          {carrier.name}
                        </h4>
                        <p className="text-xs text-slate-500">{carrier.shipmentCount} shipments tracked</p>
                      </div>
                    </div>
                    <Badge className={getRatingColor(carrier.sustainabilityRating)}>
                      {carrier.sustainabilityRating}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold">CO₂e Intensity</p>
                      <p className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        {carrier.intensity} g/t-km
                        {getPerformanceIcon(carrier.intensity)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold">Avg Transit</p>
                      <p className="text-lg font-bold text-slate-900">{carrier.avgTransitDays} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold">vs Industry</p>
                      <p className={`text-lg font-bold ${carrier.intensity < industryAvg ? 'text-[#86b027]' : 'text-rose-600'}`}>
                        {carrier.intensity < industryAvg ? '-' : '+'}{Math.abs(Math.round(((carrier.intensity - industryAvg) / industryAvg) * 100))}%
                      </p>
                    </div>
                  </div>

                  {carrier.certifications.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {carrier.certifications.map((cert, i) => (
                        <Badge key={i} variant="outline" className="text-xs border-[#86b027] text-[#86b027]">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Progress 
                    value={Math.min((industryAvg / carrier.intensity) * 100, 100)} 
                    className="h-2 mt-3"
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {carrierPerformance.length === 0 && (
            <div className="text-center py-8">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No carrier performance data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
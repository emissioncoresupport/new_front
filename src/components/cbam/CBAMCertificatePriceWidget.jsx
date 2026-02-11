import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar } from 'lucide-react';

/**
 * CBAM Certificate Price Widget
 * Shows current certificate pricing per C(2025) 8560
 */
export default function CBAMCertificatePriceWidget() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  
  const { data: priceData, isLoading } = useQuery({
    queryKey: ['cbam-certificate-price', currentYear, currentQuarter],
    queryFn: async () => {
      const response = await base44.functions.invoke('euETSPriceFetcherV2', {
        year: currentYear,
        period: currentQuarter
      });
      return response.data;
    },
    refetchInterval: 3600000, // Refresh hourly
    staleTime: 1800000 // 30 min stale time
  });
  
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }
  
  const isQuarterly = priceData?.period_type === 'quarterly';
  
  return (
    <Card className="p-4 bg-gradient-to-br from-slate-50 to-white border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">Certificate Price</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {isQuarterly ? 'Quarterly' : 'Weekly'}
        </Badge>
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-3xl font-light text-slate-900">
            €{priceData?.price?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-slate-500">per certificate</p>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-3 h-3" />
          <span>{priceData?.period || 'N/A'}</span>
        </div>
        
        <div className="pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            {isQuarterly ? (
              '2026: Quarterly average per C(2025) 8560'
            ) : (
              '2027+: Weekly average per C(2025) 8560'
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
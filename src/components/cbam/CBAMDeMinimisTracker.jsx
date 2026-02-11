import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Scale, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { getCurrentCompany } from '@/components/utils/multiTenant';

/**
 * CBAM De Minimis Tracker
 * Tracks 50-tonne annual threshold per CBAM Omnibus Regulation
 * Replaces obsolete €150 threshold
 */
export default function CBAMDeMinimisTracker() {
  const currentYear = new Date().getFullYear();
  
  const { data: company } = useQuery({
    queryKey: ['current-company'],
    queryFn: getCurrentCompany
  });
  
  const { data: annualTonnage, isLoading } = useQuery({
    queryKey: ['cbam-de-minimis', currentYear, company?.id],
    queryFn: async () => {
      if (!company) return { total: 0, by_category: {} };
      
      // Calculate cumulative annual tonnage for ALL Annex I goods
      const entries = await base44.entities.CBAMEmissionEntry.filter({
        company_id: company.id,
        reporting_period_year: currentYear
      });
      
      let total = 0;
      const by_category = {};
      
      entries.forEach(entry => {
        const qty = entry.quantity || 0;
        total += qty;
        
        const cat = entry.aggregated_goods_category || 'Other';
        by_category[cat] = (by_category[cat] || 0) + qty;
      });
      
      return {
        total: total,
        by_category,
        threshold: 50,
        is_exempt: total < 50,
        percentage: Math.min(100, (total / 50) * 100)
      };
    },
    enabled: !!company,
    refetchInterval: 60000 // Refresh every minute
  });
  
  if (isLoading || !annualTonnage) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }
  
  const { total, threshold, is_exempt, percentage, by_category } = annualTonnage;
  
  return (
    <Card className="p-4 bg-gradient-to-br from-slate-50 to-white border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">De Minimis Status</h3>
        </div>
        {is_exempt ? (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Exempt
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Above Threshold
          </Badge>
        )}
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-2xl font-light text-slate-900">
              {total.toFixed(1)}
              <span className="text-sm text-slate-500 ml-1">/ {threshold} tonnes</span>
            </p>
            <p className="text-xs text-slate-500">{percentage.toFixed(0)}%</p>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
        
        {Object.keys(by_category).length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-600 mb-1">By Category:</p>
            <div className="space-y-1">
              {Object.entries(by_category).map(([cat, qty]) => (
                <div key={cat} className="flex justify-between text-xs">
                  <span className="text-slate-600">{cat}</span>
                  <span className="text-slate-900 font-medium">{qty.toFixed(1)}t</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="pt-2 border-t border-slate-200 flex items-start gap-2">
          <Info className="w-3 h-3 text-slate-400 mt-0.5" />
          <p className="text-xs text-slate-500">
            {is_exempt ? (
              <>Below 50 tonnes/year &mdash; exempt from CBAM obligations for {currentYear} (Omnibus Art. 2)</>
            ) : (
              <>Above 50 tonnes/year &mdash; full CBAM compliance required (Omnibus Art. 2)</>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
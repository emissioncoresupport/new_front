import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * DATA SOURCE BANNER — Show LIVE | DEMO | TEST status
 * Based on tenant_id and created_via mix
 */

export default function Contract1ComplianceBanner({ metrics }) {
  const dataSourceType = () => {
    if (!metrics) return 'UNKNOWN';
    
    // If any TEST_RUNNER evidence exists in non-test tenant, flag it
    const hasMixedData = metrics.test_runner_count > 0 && metrics.is_production_tenant;
    if (hasMixedData) return 'MIXED (ERROR)';
    
    // If only TEST_RUNNER in TEST_TENANT
    if (metrics.test_runner_count > 0 && !metrics.is_production_tenant) return 'TEST';
    
    // If any SEED evidence
    if (metrics.seed_count > 0) return 'DEMO';
    
    // All production evidence
    return 'LIVE';
  };

  const sourceType = dataSourceType();
  const colorMap = {
    'LIVE': 'bg-green-50 border-green-200 text-green-900',
    'DEMO': 'bg-amber-50 border-amber-200 text-amber-900',
    'TEST': 'bg-blue-50 border-blue-200 text-blue-900',
    'MIXED (ERROR)': 'bg-red-50 border-red-200 text-red-900',
    'UNKNOWN': 'bg-slate-50 border-slate-200 text-slate-900'
  };

  const iconMap = {
    'LIVE': '🟢',
    'DEMO': '🟡',
    'TEST': '🔵',
    'MIXED (ERROR)': '🔴',
    'UNKNOWN': '⚪'
  };

  return (
    <Card className={`border ${colorMap[sourceType]}`}>
      <CardContent className="p-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">{iconMap[sourceType]}</span>
          <span className="font-medium">Data Source: <strong>{sourceType}</strong></span>
        </div>
        
        <div className="text-xs space-y-0.5">
          {metrics?.is_production_tenant && metrics?.test_runner_count > 0 && (
            <p className="text-red-700 font-semibold">⚠️ Test evidence mixed in production</p>
          )}
          {!metrics?.is_production_tenant && (
            <p>Test/evaluation environment</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
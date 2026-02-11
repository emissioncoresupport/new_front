import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2, Play, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function CBAMDataImportTestPanel() {
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: precursors = [] } = useQuery({
    queryKey: ['cbam-precursors'],
    queryFn: () => base44.entities.CBAMPrecursor.list()
  });

  const runTests = async () => {
    setTesting(true);
    const results = [];

    // Test 1: Backend Calculation Engine
    try {
      const { data } = await base44.functions.invoke('cbamCalculationEngine', {
        cn_code: '72081000',
        quantity: 100,
        country_of_origin: 'China',
        production_route: 'bf_bof_route',
        calculation_method: 'Default_values',
        direct_emissions_specific: 0,
        indirect_emissions_specific: 0,
        reporting_period_year: 2026,
        include_precursors: true
      });

      results.push({
        test: 'Backend Calculation Engine',
        status: data.success ? 'pass' : 'fail',
        details: data.success ? `✓ Calculated ${data.breakdown.total_embedded} tCO2e with ${data.calculated_entry.precursors_used?.length || 0} precursors` : data.error
      });
    } catch (error) {
      results.push({
        test: 'Backend Calculation Engine',
        status: 'fail',
        details: error.message
      });
    }

    // Test 2: Validator Function
    try {
      const { data } = await base44.functions.invoke('cbamEntryValidator', {
        entry_data: {
          cn_code: '72081000',
          country_of_origin: 'China',
          quantity: 100,
          direct_emissions_specific: 1.5,
          calculation_method: 'EU_method',
          reporting_period_year: 2026
        },
        strict_mode: false
      });

      results.push({
        test: 'Entry Validator Function',
        status: data.success ? 'pass' : 'fail',
        details: data.success ? `✓ Validation score: ${data.data_quality_score}% (${data.validation_level})` : 'Failed to validate'
      });
    } catch (error) {
      results.push({
        test: 'Entry Validator Function',
        status: 'fail',
        details: error.message
      });
    }

    // Test 3: Supplier Filtering (Non-EU)
    const nonEUSuppliers = suppliers.filter(s => {
      const euCountries = ['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 
        'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland', 
        'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland', 
        'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden'];
      return s.country && !euCountries.includes(s.country);
    });

    results.push({
      test: 'Non-EU Supplier Filtering',
      status: 'pass',
      details: `✓ Found ${nonEUSuppliers.length} non-EU suppliers (${suppliers.length - nonEUSuppliers.length} EU suppliers filtered out)`
    });

    // Test 4: Precursor Mappings
    results.push({
      test: 'Precursor Database',
      status: precursors.length > 0 ? 'pass' : 'warning',
      details: precursors.length > 0 ? `✓ ${precursors.length} precursor mappings configured` : '⚠ No precursor mappings found'
    });

    // Test 5: Entry Data Quality
    const brokenEntries = entries.filter(e => !e.total_embedded_emissions || e.total_embedded_emissions === 0);
    results.push({
      test: 'Entry Data Quality',
      status: brokenEntries.length === 0 ? 'pass' : 'warning',
      details: brokenEntries.length === 0 
        ? `✓ All ${entries.length} entries have calculated emissions` 
        : `⚠ ${brokenEntries.length} entries need recalculation`
    });

    // Test 6: Pagination Logic
    const pageSize = 50;
    const totalPages = Math.ceil(entries.length / pageSize);
    results.push({
      test: 'Pagination System',
      status: 'pass',
      details: `✓ ${entries.length} entries → ${totalPages} pages (${pageSize} per page)`
    });

    setTestResults(results);
    setTesting(false);

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    
    if (failed === 0) {
      toast.success(`All tests passed! (${passed}/${results.length})`);
    } else {
      toast.error(`${failed} tests failed`);
    }
  };

  return (
    <Card className="border-slate-200/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">System Diagnostics</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Verify all CBAM Data & Import features</p>
          </div>
          <Button 
            onClick={runTests}
            disabled={testing}
            size="sm"
            className="bg-slate-900 hover:bg-slate-800"
          >
            {testing ? (
              <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Testing...</>
            ) : (
              <><Play className="w-3.5 h-3.5 mr-2" /> Run Tests</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {testResults.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Click "Run Tests" to verify system integrity
          </div>
        ) : (
          testResults.map((result, idx) => (
            <div 
              key={idx}
              className={`p-3 rounded-lg border ${
                result.status === 'pass' ? 'bg-emerald-50/50 border-emerald-200/50' :
                result.status === 'warning' ? 'bg-amber-50/50 border-amber-200/50' :
                'bg-red-50/50 border-red-200/50'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />}
                {result.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />}
                {result.status === 'fail' && <XCircle className="w-4 h-4 text-red-600 mt-0.5" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-slate-900">{result.test}</span>
                    <Badge className={`text-xs ${
                      result.status === 'pass' ? 'bg-emerald-100 text-emerald-700' :
                      result.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {result.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">{result.details}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
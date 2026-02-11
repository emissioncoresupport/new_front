import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, FileCheck } from "lucide-react";
import { toast } from "sonner";

export default function CBAMDataCompletenessChecker({ entries = [] }) {
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState(null);

  const validateAll = async () => {
    setValidating(true);
    const validationResults = [];

    for (const entry of entries) {
      try {
        const { data } = await base44.functions.invoke('cbamEntryValidator', {
          entry_data: entry,
          strict_mode: false
        });
        
        validationResults.push({
          entry_id: entry.id,
          import_id: entry.import_id,
          cn_code: entry.cn_code,
          ...data
        });
      } catch (error) {
        validationResults.push({
          entry_id: entry.id,
          is_valid: false,
          validation_level: 'error',
          errors: [{ message: error.message }]
        });
      }
    }

    setResults(validationResults);
    setValidating(false);

    const validCount = validationResults.filter(r => r.is_valid).length;
    toast.success(`Validated ${validCount}/${entries.length} entries`);
  };

  const stats = results ? {
    total: results.length,
    excellent: results.filter(r => r.validation_level === 'excellent').length,
    good: results.filter(r => r.validation_level === 'good').length,
    failed: results.filter(r => !r.is_valid).length,
    avgQuality: results.reduce((sum, r) => sum + (r.data_quality_score || 0), 0) / results.length
  } : null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-medium text-slate-900">Data Completeness & Quality</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pre-submission validation for {entries.length} import entries
            </p>
          </div>
          <Button 
            onClick={validateAll}
            disabled={validating || entries.length === 0}
            size="sm"
            className="bg-slate-900 hover:bg-slate-800"
          >
            {validating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Validating...</>
            ) : (
              <><FileCheck className="w-4 h-4 mr-2" /> Validate All</>
            )}
          </Button>
        </div>

        {stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-emerald-50/50 rounded-lg border border-emerald-200/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-emerald-700 font-medium">Excellent</span>
                </div>
                <div className="text-2xl font-light text-emerald-900">{stats.excellent}</div>
              </div>

              <div className="bg-blue-50/50 rounded-lg border border-blue-200/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-700 font-medium">Good</span>
                </div>
                <div className="text-2xl font-light text-blue-900">{stats.good}</div>
              </div>

              <div className="bg-red-50/50 rounded-lg border border-red-200/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-700 font-medium">Failed</span>
                </div>
                <div className="text-2xl font-light text-red-900">{stats.failed}</div>
              </div>

              <div className="bg-slate-50/50 rounded-lg border border-slate-200/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-700 font-medium">Avg Quality</span>
                </div>
                <div className="text-2xl font-light text-slate-900">{stats.avgQuality.toFixed(0)}%</div>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result) => (
                <div 
                  key={result.entry_id}
                  className="bg-slate-50/50 rounded-lg border border-slate-200/60 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {result.cn_code || 'N/A'}
                      </Badge>
                      <span className="text-xs text-slate-600">
                        {result.import_id || result.entry_id.substring(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.is_valid ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {result.validation_level}
                        </Badge>
                      ) : (
                        <Badge className="bg-red-50 text-red-700 border border-red-200">
                          Failed
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500">
                        {result.data_quality_score || 0}%
                      </span>
                    </div>
                  </div>

                  {result.data_quality_score !== undefined && (
                    <Progress 
                      value={result.data_quality_score} 
                      className="h-1.5 mb-2"
                      indicatorClassName={
                        result.data_quality_score >= 85 ? 'bg-emerald-600' :
                        result.data_quality_score >= 60 ? 'bg-blue-600' : 'bg-red-600'
                      }
                    />
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div className="space-y-1">
                      {result.errors.map((error, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-red-700 font-medium">{error.field}:</span>{' '}
                            <span className="text-red-600">{error.message}</span>
                            {error.regulation && (
                              <span className="text-red-500 ml-1">({error.regulation})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.warnings && result.warnings.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {result.warnings.slice(0, 2).map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-amber-700">{warning.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!results && entries.length > 0 && (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600">Ready to validate {entries.length} entries</p>
            <p className="text-xs text-slate-500 mt-1">Click "Validate All" to check data quality</p>
          </div>
        )}

        {entries.length === 0 && (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
            <p className="text-sm text-slate-500">No entries to validate</p>
          </div>
        )}
      </div>
    </div>
  );
}
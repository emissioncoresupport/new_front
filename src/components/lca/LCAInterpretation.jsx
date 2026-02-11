import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function LCAInterpretation({ studyId, study }) {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Interpretation (ISO 14040 Phase 4)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-bold text-sm text-slate-700 mb-3">Key Findings</h4>
            <p className="text-sm text-slate-600">
              Analysis and interpretation of results will be available once impact assessment is complete.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h5 className="font-bold text-sm text-amber-900">Limitations</h5>
              </div>
              <p className="text-xs text-amber-800">
                {study.cutoff_criteria || 'Document any limitations and assumptions'}
              </p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h5 className="font-bold text-sm text-emerald-900">Recommendations</h5>
              </div>
              <p className="text-xs text-emerald-800">
                Improvement opportunities and recommendations will appear here
              </p>
            </div>
          </div>

          {study.sensitivity_analysis_done && (
            <div>
              <Badge className="bg-blue-100 text-blue-700 border-0 mb-2">
                Sensitivity Analysis Complete
              </Badge>
            </div>
          )}

          {study.uncertainty_analysis_done && (
            <div>
              <Badge className="bg-purple-100 text-purple-700 border-0 mb-2">
                Uncertainty Analysis Complete
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
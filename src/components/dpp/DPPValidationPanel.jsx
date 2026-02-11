import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DPPValidationPanel({ validationResult }) {
  if (!validationResult) return null;

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-rose-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  const criticalIssues = validationResult.issues?.filter(i => i.severity === 'critical') || [];
  const warnings = validationResult.issues?.filter(i => i.severity === 'warning') || [];

  return (
    <Card className={cn(
      "border-2",
      validationResult.is_compliant ? "border-emerald-200 bg-emerald-50/30" : "border-rose-200 bg-rose-50/30"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {validationResult.is_compliant ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-600" />
            )}
            Validation Results
          </CardTitle>
          <Badge className={validationResult.is_compliant ? "bg-emerald-500" : "bg-rose-500"}>
            {validationResult.overall_score}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Completeness</span>
              <span className="text-slate-600">{validationResult.completeness_score}%</span>
            </div>
            <Progress value={validationResult.completeness_score} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Accuracy</span>
              <span className="text-slate-600">{validationResult.accuracy_score}%</span>
            </div>
            <Progress value={validationResult.accuracy_score} className="h-2" />
          </div>
        </div>

        {/* Passed Checks */}
        {validationResult.passed_checks?.length > 0 && (
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
            <h4 className="font-semibold text-emerald-900 text-sm mb-2">✓ Passed Checks</h4>
            <ul className="text-xs text-emerald-800 space-y-1">
              {validationResult.passed_checks.map((check, idx) => (
                <li key={idx}>• {check}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues */}
        {validationResult.issues?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900">
              Issues Found ({criticalIssues.length} critical, {warnings.length} warnings)
            </h4>
            {validationResult.issues.map((issue, idx) => (
              <div key={idx} className={cn(
                "flex gap-3 p-3 rounded-lg border",
                issue.severity === 'critical' ? "bg-rose-50 border-rose-200" :
                issue.severity === 'warning' ? "bg-amber-50 border-amber-200" :
                "bg-blue-50 border-blue-200"
              )}>
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <p className="font-medium text-sm">{issue.message}</p>
                  <p className="text-xs text-slate-500 mt-1">Field: {issue.field}</p>
                  {issue.suggestion && (
                    <p className="text-xs text-blue-600 mt-2">💡 {issue.suggestion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Failed Checks */}
        {validationResult.failed_checks?.length > 0 && (
          <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
            <h4 className="font-semibold text-rose-900 text-sm mb-2">✗ Failed Checks</h4>
            <ul className="text-xs text-rose-800 space-y-1">
              {validationResult.failed_checks.map((check, idx) => (
                <li key={idx}>• {check}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
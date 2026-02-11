import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function CBAMReportAssistant({ report, entries, installations, certificates }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const context = {
        report,
        entries_count: entries.length,
        total_emissions: report.total_emissions,
        installations_sample: installations.slice(0, 5).map(i => ({ name: i.name, country: i.country, verified: i.verification_status })),
        certificates_available: certificates.filter(c => c.status === 'active').reduce((sum, c) => sum + c.quantity, 0),
        certificates_required: report.certificates_required || Math.ceil(report.total_emissions || 0)
      };

      const prompt = `
        Analyze this CBAM report data for discrepancies and compliance risks.
        
        Data Context:
        ${JSON.stringify(context, null, 2)}
        
        Rules:
        1. Check if certificates available cover the required amount.
        2. Flag any unverified installations if they contribute to emissions.
        3. Identify potential data anomalies (e.g. 0 emissions for large mass).
        4. Suggest corrections.

        Return a JSON object with:
        {
          "status": "compliant" | "warning" | "critical",
          "score": number (0-100),
          "issues": [{ "severity": "high"|"medium"|"low", "message": "string", "suggestion": "string" }],
          "summary": "string"
        }
      `;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["compliant", "warning", "critical"] },
            score: { type: "number" },
            issues: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: {
                  severity: { type: "string" },
                  message: { type: "string" },
                  suggestion: { type: "string" }
                }
              } 
            },
            summary: { type: "string" }
          }
        }
      });

      setAnalysis(res);
    } catch (error) {
      console.error("Analysis failed", error);
      toast.error("AI Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!analysis && !isAnalyzing) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              AI Compliance Assistant
            </h3>
            <p className="text-sm text-slate-300">
              Scan your report for anomalies, verification gaps, and certificate shortfalls before submission.
            </p>
          </div>
          <Button 
            onClick={runAnalysis}
            className="bg-white text-slate-900 hover:bg-slate-100 font-medium"
          >
            Run Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-[#86b027]" />
          Analysis Results
        </CardTitle>
        <div className="flex items-center gap-2">
            {isAnalyzing ? (
                <span className="flex items-center text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                </span>
            ) : (
                <Button variant="ghost" size="sm" onClick={runAnalysis} className="h-8 text-slate-400">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {isAnalyzing ? (
          <div className="space-y-3 py-4">
            <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-500 mb-1">Compliance Score</p>
                <div className="text-3xl font-bold text-slate-800">{analysis.score}/100</div>
              </div>
              <div className="text-right">
                <Badge className={
                  analysis.status === 'compliant' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" :
                  analysis.status === 'warning' ? "bg-amber-100 text-amber-700 hover:bg-amber-100" :
                  "bg-red-100 text-red-700 hover:bg-red-100"
                }>
                  {analysis.status?.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">Detected Issues & Suggestions</h4>
              {analysis.issues?.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded text-sm">
                      <CheckCircle2 className="w-4 h-4" /> No issues detected. Report looks good!
                  </div>
              ) : (
                  analysis.issues?.map((issue, idx) => (
                    <div key={idx} className="flex gap-3 p-3 rounded-lg border border-slate-100 bg-white">
                      <div className="mt-0.5">
                        {issue.severity === 'high' ? <XCircle className="w-4 h-4 text-red-500" /> :
                         issue.severity === 'medium' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                         <Info className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{issue.message}</p>
                        <p className="text-xs text-slate-500 mt-1">💡 {issue.suggestion}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
            
            <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 leading-relaxed">
                <strong>AI Summary:</strong> {analysis.summary}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
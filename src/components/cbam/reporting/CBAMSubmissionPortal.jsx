import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Send, CheckCircle2, AlertTriangle, FileCode, Download,
  Shield, ExternalLink, Loader2, FileCheck, Clock, RefreshCw
} from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

/**
 * CBAM Submission Portal
 * Handles submission to EU Transitional Registry / National Competent Authorities
 * 
 * Features:
 * - Pre-submission validation
 * - XML format validation
 * - Registry API integration (mock for now)
 * - Confirmation tracking
 * - Resubmission for corrections
 */

export default function CBAMSubmissionPortal({ report, onSubmitted }) {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const queryClient = useQueryClient();

  // Pre-submission Validation
  const validateReport = async () => {
    setValidating(true);
    
    try {
      // Check mandatory fields
      const issues = [];
      
      if (!report.eori_number) issues.push('Missing EORI number');
      if (!report.member_state) issues.push('Missing Member State');
      if (!report.total_imports_count || report.total_imports_count === 0) {
        issues.push('No imports declared');
      }
      if (!report.linked_entries || report.linked_entries.length === 0) {
        issues.push('No linked emission entries');
      }
      if (report.default_values_percentage > 20) {
        issues.push('Default values exceed 20% threshold (warning)');
      }

      // Generate XML if not exists
      if (!report.xml_file_url) {
        issues.push('XML file not generated');
      }

      setValidationResult({
        valid: issues.length === 0,
        issues,
        warnings: report.default_values_percentage > 20 ? ['High default values usage'] : []
      });

      if (issues.length === 0) {
        toast.success('Report validation passed - ready for submission');
      } else {
        toast.error(`Validation failed: ${issues.length} issues found`);
      }
    } catch (error) {
      toast.error('Validation failed: ' + error.message);
    } finally {
      setValidating(false);
    }
  };

  // Submit to Registry via Backend Function
  const submitMutation = useMutation({
    mutationFn: async () => {
      // Submit to EU Registry using V2 backend function
      const { data } = await base44.functions.invoke('cbamRegistrySubmissionV2', {
        report_id: report.id,
        test_mode: true
      });
      
      if (!data.success) {
        throw new Error(data.error || data.message || 'Submission failed');
      }

      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
      toast.success(
        result.message || `✅ Declaration Submitted`,
        {
          description: `Confirmation: ${result.confirmation_number}`,
          duration: 5000
        }
      );
      if (onSubmitted) onSubmitted(result);
    },
    onError: (error) => {
      toast.error('Submission Failed', {
        description: error.message,
        duration: 7000
      });
    }
  });

  const canSubmit = report.status === 'validated' && validationResult?.valid;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
                Submit to Registry
              </CardTitle>
              <p className="text-sm text-slate-600 mt-2">
                EU Transitional Registry Submission Portal
              </p>
            </div>
            <Badge className={
              report.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' :
              report.status === 'validated' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
            }>
              {report.status === 'submitted' ? 'Submitted' :
               report.status === 'validated' ? 'Ready' : 'Draft'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Report Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Period</div>
              <div className="font-bold text-slate-900">{report.reporting_period}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-xs text-slate-500 uppercase font-semibold mb-1">EORI</div>
              <div className="font-mono text-sm font-bold text-slate-900">{report.eori_number}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Member State</div>
              <div className="font-bold text-slate-900">{report.member_state}</div>
            </div>
          </div>

          {/* Pre-submission Checklist */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Pre-Submission Validation</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={validateReport}
                disabled={validating}
              >
                {validating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run Validation
                  </>
                )}
              </Button>
            </div>

            {validationResult && (
              <div className="space-y-2">
                {validationResult.valid ? (
                  <Alert className="border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-sm text-emerald-700 font-semibold">
                      ✓ All validation checks passed - report is ready for submission
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-slate-700">
                      <strong className="text-red-700">{validationResult.issues.length} issue(s) found:</strong>
                      <ul className="mt-2 space-y-1 ml-4 list-disc">
                        {validationResult.issues.map((issue, idx) => (
                          <li key={idx} className="text-red-600">{issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validationResult.warnings.length > 0 && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-sm text-slate-700">
                      <strong className="text-amber-700">Warnings:</strong>
                      <ul className="mt-1 space-y-1 ml-4 list-disc">
                        {validationResult.warnings.map((warning, idx) => (
                          <li key={idx} className="text-amber-700">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Submission Status */}
          {report.status === 'submitted' && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-emerald-900 mb-2">Successfully Submitted</h4>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Confirmation Number:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {report.registry_confirmation_number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Submission Date:</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(report.submission_date).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Registry Status:</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">
                        {report.registry_status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Submitted By:</span>
                      <span className="font-semibold text-slate-900">{report.submitted_by}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Download Options */}
          {report.xml_file_url && (
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 mb-3">Download Files</h4>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(report.xml_file_url, '_blank')}
                >
                  <FileCode className="w-4 h-4 mr-2" />
                  Download XML
                </Button>
                {report.report_pdf_url && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(report.report_pdf_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          {report.status !== 'submitted' && (
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-slate-600">
                <Shield className="w-4 h-4 inline mr-1" />
                Secure connection to EU Transitional Registry
              </div>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmit || submitMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit to Registry
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Info Notice */}
          <Alert className="border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              <strong>Secure Backend Submission:</strong> Your report will be authenticated with your company's API key, 
              digitally signed, and submitted to the EU Transitional Registry via encrypted connection. 
              Ensure your CBAM Registry credentials are configured in Company Settings.
            </AlertDescription>
          </Alert>
          
          {report.status !== 'submitted' && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                <strong>Prerequisites:</strong>
                <ul className="mt-1 space-y-1 ml-4 list-disc">
                  <li>Company Settings → CBAM Registry API credentials configured</li>
                  <li>Valid EORI number registered with EU</li>
                  <li>Backend functions enabled in app settings</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from 'sonner';
import { FlaskConical, Download, AlertTriangle, CheckCircle2, FileText, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PFASLabResultsInbox() {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [testReportId, setTestReportId] = useState('');
  const [labProvider, setLabProvider] = useState('eurofins');
  const queryClient = useQueryClient();

  const { data: assessments = [] } = useQuery({
    queryKey: ['pfas-lab-assessments'],
    queryFn: async () => {
      const all = await base44.entities.PFASAssessment.list('-last_checked');
      return all.filter(a => a.verification_method === 'lab_test');
    }
  });

  const { data: scipNotifications = [] } = useQuery({
    queryKey: ['scip-notifications'],
    queryFn: () => base44.entities.SCIPNotification.list('-notification_date')
  });

  const pullResultsMutation = useMutation({
    mutationFn: async ({ reportId, provider }) => {
      return await base44.functions.invoke('pfasLabIntegration', {
        action: 'pull_results',
        lab_provider: provider,
        test_report_id: reportId,
        api_key: 'stored_api_key' // Should fetch from secrets
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['pfas-lab-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['scip-notifications'] });
      toast.success(`Lab results imported: ${response.data.detected_substances?.length || 0} substances detected`);
      setShowImportDialog(false);
    },
    onError: () => {
      toast.error('Failed to import lab results');
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/30 bg-gradient-to-br from-white to-[#86b027]/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#86b027]">
                <FlaskConical className="w-5 h-5" />
                Lab Test Results Inbox
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Automatically imported PFAS test results from connected labs
              </p>
            </div>
            <Button
              onClick={() => setShowImportDialog(true)}
              className="bg-[#86b027] hover:bg-[#769c22]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Manual Import
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* SCIP Notifications */}
      {scipNotifications.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5" />
              SCIP Notifications Required ({scipNotifications.filter(s => s.notification_status === 'pending').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scipNotifications.filter(s => s.notification_status === 'pending').map(notif => (
                <div key={notif.id} className="p-4 bg-white rounded-lg border border-amber-300">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">SVHC Detected - ECHA Notification Required</p>
                      <p className="text-xs text-slate-600">
                        Deadline: {new Date(notif.notification_deadline).toLocaleDateString()} (45 days)
                      </p>
                    </div>
                    <Badge className="bg-amber-500 text-white">Action Required</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-slate-700">Detected SVHCs:</p>
                    {notif.svhc_substances.map((substance, idx) => (
                      <div key={idx} className="pl-4 text-xs text-slate-600">
                        • {substance.name} (CAS: {substance.cas_number}) - {substance.concentration_ppm} ppm
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="bg-[#86b027] hover:bg-[#769c22]">
                      Submit to ECHA SCIP
                    </Button>
                    <Button size="sm" variant="outline">
                      View Assessment
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lab Results List */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Recent Lab Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assessments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No lab test results imported yet</p>
              </div>
            ) : (
              assessments.map(assessment => (
                <div key={assessment.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        assessment.status === 'Compliant' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-rose-100 text-rose-600'
                      }`}>
                        {assessment.status === 'Compliant' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{assessment.name}</p>
                        <p className="text-xs text-slate-500">{assessment.entity_type} • {new Date(assessment.last_checked).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {assessment.detected_substances?.length || 0} substances detected • Risk: {assessment.risk_score}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        assessment.status === 'Compliant' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }>
                        {assessment.status}
                      </Badge>
                      {assessment.test_report_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={assessment.test_report_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-3 h-3 mr-1" />
                            Report
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  {assessment.detected_substances && assessment.detected_substances.length > 0 && (
                    <div className="mt-3 pl-11 space-y-1">
                      {assessment.detected_substances.slice(0, 3).map((substance, idx) => (
                        <div key={idx} className="text-xs text-slate-600">
                          • {substance.name} ({substance.cas_number}): {substance.concentration_ppm} ppm
                          {substance.is_restricted && <Badge className="ml-2 text-xs bg-rose-500 text-white">Restricted</Badge>}
                        </div>
                      ))}
                      {assessment.detected_substances.length > 3 && (
                        <p className="text-xs text-slate-500">+{assessment.detected_substances.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Lab Test Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lab Provider</label>
              <select 
                className="w-full p-2 border rounded-lg"
                value={labProvider}
                onChange={(e) => setLabProvider(e.target.value)}
              >
                <option value="eurofins">Eurofins</option>
                <option value="sgs">SGS</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Report ID</label>
              <Input
                placeholder="Enter report reference number..."
                value={testReportId}
                onChange={(e) => setTestReportId(e.target.value)}
              />
            </div>
            <Button
              onClick={() => pullResultsMutation.mutate({ reportId: testReportId, provider: labProvider })}
              disabled={pullResultsMutation.isPending || !testReportId}
              className="w-full bg-[#86b027] hover:bg-[#769c22]"
            >
              {pullResultsMutation.isPending ? 'Importing...' : 'Import Results'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
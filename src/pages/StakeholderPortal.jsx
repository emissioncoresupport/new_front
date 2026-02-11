import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Upload, FileText, Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function StakeholderPortal() {
  const [token, setToken] = useState('');
  const [hasConsented, setHasConsented] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) setToken(tokenParam);
  }, []);

  const { data: consent } = useQuery({
    queryKey: ['stakeholder-consent', token],
    queryFn: () => base44.entities.CSRDStakeholderConsent.filter({ id: token }).then(r => r[0]),
    enabled: !!token
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['stakeholder-tasks', consent?.stakeholder_email],
    queryFn: () => base44.entities.CSRDTask.filter({ assigned_to: consent.stakeholder_email }),
    enabled: !!consent
  });

  const giveConsentMutation = useMutation({
    mutationFn: () => base44.entities.CSRDStakeholderConsent.update(token, {
      consent_given: true,
      consent_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholder-consent'] });
      setHasConsented(true);
      toast.success('Consent recorded. Thank you!');
    }
  });

  const uploadEvidenceMutation = useMutation({
    mutationFn: async ({ taskId, file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const task = tasks.find(t => t.id === taskId);
      const existingUrls = task.document_urls || [];
      
      await base44.entities.CSRDTask.update(taskId, {
        document_urls: [...existingUrls, file_url],
        status: 'submitted',
        completed_date: new Date().toISOString()
      });

      return file_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stakeholder-tasks'] });
      toast.success('Evidence uploaded successfully!');
    }
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Access</h2>
            <p className="text-slate-600">
              This portal requires a valid invitation link. Please check your email for the correct link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!consent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-[#86b027]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-[#86b027] flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#545454]">CSRD Stakeholder Portal</h1>
                <p className="text-sm text-slate-600">Secure data collection & evidence submission</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Badge className="bg-[#86b027]">{consent.stakeholder_type}</Badge>
              <span className="text-sm text-slate-600">{consent.stakeholder_email}</span>
            </div>
          </CardContent>
        </Card>

        {/* GDPR Consent */}
        {!consent.consent_given && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-[#545454]">Data Processing Consent (GDPR)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-700 space-y-2">
                <p><strong>Purpose:</strong> {consent.purpose}</p>
                <p><strong>Data Categories:</strong> {consent.data_categories?.join(', ')}</p>
                <p><strong>Retention Period:</strong> {consent.retention_period_months} months</p>
                <p className="text-xs text-slate-600 mt-4">
                  By giving consent, you agree to provide sustainability data for CSRD reporting. 
                  You can withdraw consent at any time. Your data will be processed per GDPR regulations.
                </p>
              </div>
              <Button 
                onClick={() => giveConsentMutation.mutate()}
                disabled={giveConsentMutation.isPending}
                className="bg-[#86b027] hover:bg-[#769c22]"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                I Consent to Data Processing
              </Button>
            </CardContent>
          </Card>
        )}

        {(consent.consent_given || hasConsented) && (
          <>
            {/* Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#545454]">Your Assigned Tasks</CardTitle>
                <p className="text-sm text-slate-600">Upload evidence and complete data requests</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {tasks.map(task => (
                  <Card key={task.id} className="border-l-4 border-[#86b027]">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-[#545454]">{task.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                          {task.due_date && (
                            <p className="text-xs text-slate-500 mt-2">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge className={
                          task.status === 'approved' ? 'bg-emerald-500' :
                          task.status === 'submitted' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }>
                          {task.status}
                        </Badge>
                      </div>

                      {task.status !== 'approved' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium mb-2">Upload Evidence:</label>
                          <Input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                uploadEvidenceMutation.mutate({ taskId: task.id, file });
                              }
                            }}
                            disabled={uploadEvidenceMutation.isPending}
                          />
                        </div>
                      )}

                      {task.document_urls && task.document_urls.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-slate-600 font-semibold mb-2">Uploaded:</p>
                          <div className="space-y-1">
                            {task.document_urls.map((url, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <FileText className="w-4 h-4 text-[#02a1e8]" />
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#02a1e8] hover:underline">
                                  Document {idx + 1}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {tasks.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No tasks assigned yet</p>
                )}
              </CardContent>
            </Card>

            {/* Data Protection Info */}
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-slate-600 shrink-0" />
                  <div className="text-xs text-slate-600">
                    <p className="font-semibold mb-1">Your Data Rights (GDPR)</p>
                    <p>
                      You can request data deletion or withdraw consent anytime by contacting the sustainability team. 
                      All uploaded documents are encrypted and stored securely.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
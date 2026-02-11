import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Shield, CheckCircle2, XCircle, Mail, Calendar, Upload, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import StakeholderInviteModal from './StakeholderInviteModal';
import StakeholderEvidenceViewer from './StakeholderEvidenceViewer';

export default function StakeholderEngagement() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState(null);
  const queryClient = useQueryClient();

  const { data: consents = [] } = useQuery({
    queryKey: ['csrd-stakeholder-consents'],
    queryFn: () => base44.entities.CSRDStakeholderConsent.list('-consent_date')
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['csrd-stakeholder-tasks'],
    queryFn: () => base44.entities.CSRDTask.filter({ assignee_type: 'external' })
  });

  const withdrawConsentMutation = useMutation({
    mutationFn: async (consentId) => {
      await base44.entities.CSRDStakeholderConsent.update(consentId, {
        consent_withdrawn: true,
        withdrawal_date: new Date().toISOString()
      });
      
      await base44.integrations.Core.SendEmail({
        to: consents.find(c => c.id === consentId)?.stakeholder_email,
        subject: 'CSRD Data Consent Withdrawn - Confirmation',
        body: `Your data consent for CSRD reporting has been withdrawn as requested.

All personal data will be deleted in accordance with GDPR requirements.

If you have any questions, please contact our sustainability team.

Best regards,
Sustainability Team`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrd-stakeholder-consents'] });
      toast.success('Consent withdrawn and notification sent');
    },
    onError: () => toast.error('Failed to withdraw consent')
  });

  const stats = {
    total: consents.length,
    consented: consents.filter(c => c.consent_given && !c.consent_withdrawn).length,
    pending: consents.filter(c => !c.consent_given && !c.consent_withdrawn).length,
    withdrawn: consents.filter(c => c.consent_withdrawn).length,
    tasksAssigned: tasks.length,
    tasksCompleted: tasks.filter(t => t.status === 'approved').length
  };

  const getStatusColor = (consent) => {
    if (consent.consent_withdrawn) return 'border-slate-300 bg-slate-50';
    if (consent.consent_given) return 'border-emerald-200 bg-emerald-50';
    return 'border-amber-200 bg-amber-50';
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extralight text-slate-900 mb-1">Stakeholder Engagement & Portal</h2>
            <p className="text-sm text-slate-500 font-light">GDPR-compliant stakeholder data collection and evidence management</p>
          </div>
          <button 
            type="button"
            onClick={() => setShowInviteModal(true)} 
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 font-light text-sm tracking-wide"
          >
            <Mail className="w-4 h-4 stroke-[1.5]" />
            Invite Stakeholder
          </button>
        </div>
      </div>

      {/* GDPR Notice */}
      <div className="relative bg-gradient-to-br from-blue-50/60 via-blue-50/40 to-blue-50/30 backdrop-blur-xl rounded-2xl border border-blue-300/40 shadow-[0_4px_16px_rgba(59,130,246,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#02a1e8] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[#545454] mb-1">GDPR Compliance & Stakeholder Portal</h4>
              <p className="text-sm text-slate-700 mb-3">
                All stakeholder data is collected with explicit consent, encrypted in transit and at rest, 
                and automatically deleted after retention period. Stakeholders can withdraw consent anytime.
              </p>
              <div className="flex items-start gap-2 bg-white/60 p-3 rounded-lg border border-blue-200">
                <Upload className="w-4 h-4 text-[#02a1e8] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#545454] mb-1">Where stakeholders upload evidence:</p>
                  <p className="text-xs text-slate-700">
                    Invited stakeholders receive an email with a secure portal link. In their portal, they can:
                  </p>
                  <ul className="text-xs text-slate-700 mt-1 space-y-0.5 ml-4">
                    <li>• View assigned CSRD tasks and data requests</li>
                    <li>• Upload documents (PDFs, spreadsheets, images)</li>
                    <li>• Track submission status</li>
                    <li>• Download uploaded evidence history</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Total</p>
          <p className="text-4xl font-extralight text-slate-900">{stats.total}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Consented</p>
          <p className="text-4xl font-extralight text-emerald-600">{stats.consented}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Pending</p>
          <p className="text-4xl font-extralight text-amber-600">{stats.pending}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Withdrawn</p>
          <p className="text-4xl font-extralight text-slate-600">{stats.withdrawn}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Tasks</p>
          <p className="text-4xl font-extralight text-[#02a1e8]">{stats.tasksAssigned}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Completed</p>
          <p className="text-4xl font-extralight text-[#86b027]">{stats.tasksCompleted}</p>
        </div>
      </div>

      <Tabs defaultValue="consents" className="space-y-6">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="consents" className="data-[state=active]:bg-[#86b027] data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Consent Management
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-[#86b027] data-[state=active]:text-white">
            <Calendar className="w-4 h-4 mr-2" />
            Activity Calendar
          </TabsTrigger>
          <TabsTrigger value="evidence" className="data-[state=active]:bg-[#86b027] data-[state=active]:text-white">
            <Upload className="w-4 h-4 mr-2" />
            Evidence Hub
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consents" className="space-y-4">
          {consents.map(consent => {
            const relatedTasks = tasks.filter(t => t.assigned_to === consent.stakeholder_email);
            
            return (
              <div key={consent.id} className={`relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border-l-4 border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden ${getStatusColor(consent)}`}>
                <div className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-light text-slate-900">{consent.stakeholder_email}</h4>
                        <Badge variant="outline" className="text-xs">{consent.stakeholder_type}</Badge>
                        {consent.consent_given && !consent.consent_withdrawn && (
                          <Badge className="bg-emerald-500 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Consented
                          </Badge>
                        )}
                        {consent.consent_withdrawn && (
                          <Badge className="bg-slate-500 text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Withdrawn
                          </Badge>
                        )}
                        {!consent.consent_given && !consent.consent_withdrawn && (
                          <Badge className="bg-amber-500 text-xs">Pending Response</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-xs text-slate-500">Purpose</p>
                          <p className="text-slate-700">{consent.purpose}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Status</p>
                          <p className="text-slate-700">
                            {consent.consent_given 
                              ? `Consented: ${new Date(consent.consent_date).toLocaleDateString()}`
                              : consent.consent_withdrawn 
                                ? `Withdrawn: ${new Date(consent.withdrawal_date).toLocaleDateString()}`
                                : 'Awaiting response'}
                          </p>
                        </div>
                      </div>

                      {relatedTasks.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-slate-500 mb-2">Assigned Tasks: {relatedTasks.length}</p>
                          <div className="flex gap-2">
                            {relatedTasks.slice(0, 3).map(task => (
                              <Badge key={task.id} variant="outline" className="text-xs">
                                {task.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {consent.data_deletion_date && (
                        <p className="text-xs text-slate-500 mt-2">
                          🗑️ Auto-delete: {new Date(consent.data_deletion_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {consent.consent_given && !consent.consent_withdrawn && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedConsent(consent)}
                            className="w-full"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Portal Link
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[#02a1e8] border-[#02a1e8] hover:bg-[#02a1e8]/10 w-full"
                            onClick={() => window.open(`/stakeholder-portal?token=${consent.id}`, '_blank')}
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            Open Upload Portal
                          </Button>
                        </>
                      )}
                      {consent.consent_given && !consent.consent_withdrawn && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-600 hover:text-rose-700 w-full"
                          onClick={() => {
                            if (confirm('Withdraw consent for this stakeholder? They will be notified via email.')) {
                              withdrawConsentMutation.mutate(consent.id);
                            }
                          }}
                        >
                          Withdraw Consent
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {consents.length === 0 && (
            <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">No stakeholders invited yet</p>
              <Button onClick={() => setShowInviteModal(true)} className="bg-[#86b027] hover:bg-[#769c22]">
                <Mail className="w-4 h-4 mr-2" />
                Invite First Stakeholder
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Stakeholder Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...consents]
                  .sort((a, b) => new Date(b.consent_date || b.created_date) - new Date(a.consent_date || a.created_date))
                  .map(consent => (
                    <div key={consent.id} className="flex gap-4 items-start p-3 bg-slate-50 rounded-lg">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 bg-[#86b027] rounded-full" />
                        <div className="w-0.5 h-full bg-slate-200 mt-2" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="text-xs text-slate-500">
                            {consent.consent_date 
                              ? new Date(consent.consent_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : new Date(consent.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="font-semibold text-sm text-[#545454]">{consent.stakeholder_email}</p>
                        <p className="text-xs text-slate-600">
                          {consent.consent_given ? 'Provided consent' : consent.consent_withdrawn ? 'Withdrew consent' : 'Invited'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          <StakeholderEvidenceViewer consents={consents} tasks={tasks} />
        </TabsContent>
      </Tabs>

      <StakeholderInviteModal 
        open={showInviteModal} 
        onOpenChange={setShowInviteModal}
      />

      {selectedConsent && (
        <Card className="border-[#86b027]">
          <CardHeader className="bg-[#86b027]/10">
            <CardTitle className="text-[#545454]">
              Stakeholder Portal Link
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              Share this secure link with {selectedConsent.stakeholder_email} to access their portal:
            </p>
            <div className="flex gap-2">
              <Input 
                value={`${window.location.origin}/stakeholder-portal?token=${selectedConsent.id}`}
                readOnly
                className="font-mono text-sm"
              />
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/stakeholder-portal?token=${selectedConsent.id}`);
                  toast.success('Link copied to clipboard');
                }}
                className="bg-[#86b027] hover:bg-[#769c22]"
              >
                Copy Link
              </Button>
            </div>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setSelectedConsent(null)}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
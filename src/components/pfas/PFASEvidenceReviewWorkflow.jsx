import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, AlertCircle, FileText, Calendar, User, Shield } from "lucide-react";
import { toast } from "sonner";
import PFASMasterOrchestrator from './services/PFASMasterOrchestrator';

export default function PFASEvidenceReviewWorkflow() {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: evidencePackages = [] } = useQuery({
    queryKey: ['pfas-evidence-packages'],
    queryFn: () => base44.entities.PFASEvidencePackage.list('-created_date')
  });

  const { data: evidenceDocs = [] } = useQuery({
    queryKey: ['pfas-evidence-documents'],
    queryFn: () => base44.entities.PFASEvidenceDocument.list()
  });

  const approveMutation = useMutation({
    mutationFn: async ({ packageId, notes }) => {
      const user = await base44.auth.me();
      
      const pkg = evidencePackages.find(p => p.id === packageId);
      
      await base44.entities.PFASEvidencePackage.update(packageId, {
        review_status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      });

      // Update associated MaterialCompositions to 'current' status
      const compositions = await base44.entities.MaterialComposition.filter({
        source_document_id: packageId
      });
      
      for (const comp of compositions) {
        await base44.entities.MaterialComposition.update(comp.id, {
          status: 'current'
        });
      }

      // RE-TRIGGER ASSESSMENT via MasterOrchestrator with approved evidence
      await PFASMasterOrchestrator.createOrUpdateAssessment({
        entity_id: pkg.object_id,
        entity_type: pkg.object_type,
        status: pkg.claim_status === 'not_present' ? 'compliant' : 'requires_action',
        evidence_package_ids: [packageId],
        verification_method: 'evidence_approved',
        source: 'evidence_review',
        ai_analysis_notes: `Evidence approved by ${user.email}: ${notes}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pfas-evidence-packages']);
      queryClient.invalidateQueries(['pfas-compliance-assessments']);
      queryClient.invalidateQueries(['material-compositions']);
      toast.success('Evidence approved - Assessment updated');
      setSelectedPackage(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ packageId, reason }) => {
      const user = await base44.auth.me();
      
      await base44.entities.PFASEvidencePackage.update(packageId, {
        review_status: 'rejected',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason
      });

      // Mark compositions as rejected
      const compositions = await base44.entities.MaterialComposition.filter({
        source_document_id: packageId
      });
      
      for (const comp of compositions) {
        await base44.entities.MaterialComposition.update(comp.id, {
          status: 'expired'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pfas-evidence-packages']);
      toast.success('Evidence rejected');
      setSelectedPackage(null);
    }
  });

  const getStatusConfig = (status) => {
    const configs = {
      draft: { icon: Clock, color: 'bg-slate-100 text-slate-700', label: 'Draft' },
      submitted: { icon: AlertCircle, color: 'bg-blue-100 text-blue-700', label: 'Submitted' },
      under_review: { icon: Clock, color: 'bg-amber-100 text-amber-700', label: 'Under Review' },
      approved: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700', label: 'Approved' },
      rejected: { icon: XCircle, color: 'bg-rose-100 text-rose-700', label: 'Rejected' },
      superseded: { icon: AlertCircle, color: 'bg-slate-100 text-slate-500', label: 'Superseded' },
      expired: { icon: Clock, color: 'bg-amber-100 text-amber-700', label: 'Expired' }
    };
    return configs[status] || configs.draft;
  };

  const getQualityGradeColor = (grade) => {
    const colors = {
      A: 'bg-emerald-500',
      B: 'bg-blue-500',
      C: 'bg-amber-500',
      D: 'bg-slate-400'
    };
    return colors[grade] || colors.D;
  };

  const pendingReview = evidencePackages.filter(p => 
    ['submitted', 'under_review'].includes(p.review_status)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Evidence Review Workflow</h2>
          <p className="text-sm text-slate-600">Audit-safe approval process with mandatory review for PFAS claims</p>
        </div>
        <Badge className="bg-blue-500 text-white">
          {pendingReview.length} Pending Review
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Review Queue */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-lg">Pending Review</h3>
          {pendingReview.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No evidence packages pending review</p>
              </CardContent>
            </Card>
          ) : (
            pendingReview.map(pkg => {
              const statusConfig = getStatusConfig(pkg.review_status);
              const docs = evidenceDocs.filter(d => d.evidence_package_id === pkg.id);
              
              return (
                <Card key={pkg.id} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedPackage(pkg)}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getQualityGradeColor(pkg.quality_grade)}>
                            Grade {pkg.quality_grade}
                          </Badge>
                          <Badge className={statusConfig.color}>
                            <statusConfig.icon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-lg">{pkg.object_type}: {pkg.object_id}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Confidence</p>
                        <p className="text-2xl font-bold text-slate-700">{pkg.confidence_score}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500">Claim Status</p>
                        <Badge variant="outline" className={
                          pkg.claim_status === 'not_present' ? 'border-emerald-500 text-emerald-700' :
                          pkg.claim_status === 'present' ? 'border-rose-500 text-rose-700' :
                          'border-slate-500 text-slate-700'
                        }>
                          {pkg.claim_status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-slate-500">Intentionally Added</p>
                        <p className="font-medium">{pkg.intentionally_added}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Threshold</p>
                        <p className="font-medium">{pkg.threshold_numeric_ppm || 'N/A'} ppm</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Valid Until</p>
                        <p className="font-medium">{pkg.valid_to ? new Date(pkg.valid_to).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    {pkg.signatory && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="text-slate-600">
                          <User className="w-3 h-3 inline mr-1" />
                          Signed by: <strong>{pkg.signatory}</strong> ({pkg.signatory_role})
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{docs.length} document(s)</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* All Evidence Overview */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Overview</h3>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Evidence Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['approved', 'submitted', 'under_review', 'rejected', 'expired'].map(status => {
                const count = evidencePackages.filter(p => p.review_status === status).length;
                const config = getStatusConfig(status);
                return (
                  <div key={status} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{config.label}</span>
                    </div>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                Review Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-amber-900">
              <ul className="space-y-1">
                <li>• Grade A (lab) → Auto-approve if confidence &gt;90%</li>
                <li>• Grade B (supplier) → Requires review</li>
                <li>• Grade C (AI inferred) → Requires review + validation</li>
                <li>• All overrides need second-person approval</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedPackage} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Evidence Package</DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Object</p>
                  <p className="font-medium">{selectedPackage.object_type}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Quality Grade</p>
                  <Badge className={getQualityGradeColor(selectedPackage.quality_grade)}>
                    {selectedPackage.quality_grade}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Claim</p>
                  <p className="font-medium">{selectedPackage.claim_status}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Confidence</p>
                  <p className="font-medium">{selectedPackage.confidence_score}%</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Document your review decision and reasoning..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => approveMutation.mutate({ packageId: selectedPackage.id, notes: reviewNotes })}
                  disabled={approveMutation.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => rejectMutation.mutate({ packageId: selectedPackage.id, reason: reviewNotes })}
                  disabled={rejectMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
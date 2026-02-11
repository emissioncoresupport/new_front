import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Upload, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierSubmit() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const submissionId = params.get('submission_id');
  
  const [items, setItems] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const { data: submission, isLoading, error } = useQuery({
    queryKey: ['supplierSubmission', submissionId],
    queryFn: async () => {
      if (!submissionId) throw new Error('Missing submission ID');
      const subs = await base44.entities.CollaborationSubmission.filter({ id: submissionId });
      if (!subs.length) throw new Error('Submission not found');
      return subs[0];
    },
    enabled: !!submissionId
  });

  const { data: request } = useQuery({
    queryKey: ['collaborationRequest', submission?.request_id],
    queryFn: () => base44.entities.CollaborationRequest.filter({ id: submission.request_id }).then(r => r[0]),
    enabled: !!submission?.request_id
  });

  const { data: requestItems = [] } = useQuery({
    queryKey: ['requestItems', submission?.request_id],
    queryFn: () => base44.entities.CollaborationRequestItem.filter({ request_id: submission.request_id }),
    enabled: !!submission?.request_id
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Create evidence drafts for each item
      for (const item of requestItems) {
        const itemData = items[item.id];
        if (!itemData) continue;

        const draft = await base44.functions.invoke('createEvidenceDraft', {
          ingestion_method: itemData.file ? 'FILE_UPLOAD' : 'MANUAL_ENTRY',
          submission_channel: 'SUPPLIER',
          evidence_type: item.evidence_type,
          binding_context_id: item.binding_context_id,
          why_this_evidence: 'Submitted via supplier portal',
          attestation_notes: itemData.notes || 'Supplier submitted via secure link',
          trust_level: 'LOW',
          collaboration_submission_id: submissionId
        });

        if (draft.data?.draft_id) {
          // Create submission item
          await base44.entities.CollaborationSubmissionItem.create({
            tenant_id: submission.tenant_id,
            submission_id: submissionId,
            request_item_id: item.id,
            evidence_draft_id: draft.data.draft_id,
            status: 'SUBMITTED'
          });

          // Update request item status
          await base44.entities.CollaborationRequestItem.update(item.id, { status: 'SUBMITTED' });
        }
      }

      // Update submission status
      await base44.entities.CollaborationSubmission.update(submissionId, { status: 'SUBMITTED' });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Submission received successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Submission failed');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (error || !submission || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              This submission link is invalid or has expired. Please contact your customer for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Submission Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Thank you for your submission. Your evidence has been received and will be reviewed by our team.
              You will be notified of the outcome via email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-slate-900 tracking-tight">{request?.title || 'Data Request'}</h1>
          <p className="text-sm text-slate-600 mt-2">{request?.message_to_supplier}</p>
          {request?.due_date_utc && (
            <p className="text-xs text-slate-500 mt-1">
              Due: {new Date(request.due_date_utc).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="space-y-6">
          {requestItems.map((item, index) => (
            <Card key={item.id} className="glassmorphic-panel border-slate-200/60">
              <CardHeader>
                <CardTitle className="text-lg font-light flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#86b027]" />
                  Item {index + 1}: {item.evidence_type}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Notes / Description</label>
                  <Textarea
                    placeholder="Add any relevant notes..."
                    value={items[item.id]?.notes || ''}
                    onChange={(e) => setItems({ ...items, [item.id]: { ...items[item.id], notes: e.target.value } })}
                    className="min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-2 block">Upload File (if applicable)</label>
                  <Input
                    type="file"
                    onChange={(e) => setItems({ ...items, [item.id]: { ...items[item.id], file: e.target.files[0] } })}
                  />
                </div>

                {items[item.id]?.file && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    File selected: {items[item.id].file.name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            className="bg-[#86b027] hover:bg-[#86b027]/90"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || requestItems.length === 0}
          >
            <Upload className="w-4 h-4 mr-2" />
            {submitMutation.isPending ? 'Submitting...' : 'Submit All Items'}
          </Button>
        </div>
      </div>
    </div>
  );
}
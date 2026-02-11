import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, Upload, Loader2, CheckCircle2, AlertCircle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

export default function CollaborativeWorkflow({ supplierId }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const queryClient = useQueryClient();

  const { data: verificationRequests = [] } = useQuery({
    queryKey: ['verification-requests', supplierId],
    queryFn: () => base44.entities.DataVerificationRequest.filter({ supplier_id: supplierId }, '-created_date')
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, response, attachments }) => {
      const request = verificationRequests.find(r => r.id === id);
      const conversation = request.conversation_history || [];
      
      return base44.entities.DataVerificationRequest.update(id, {
        response,
        response_date: new Date().toISOString(),
        status: 'supplier_responded',
        attachments: [...(request.attachments || []), ...attachments],
        conversation_history: [
          ...conversation,
          {
            timestamp: new Date().toISOString(),
            author: 'Supplier',
            message: response
          }
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
      toast.success('Response submitted successfully');
      setSelectedRequest(null);
      setResponseText('');
      setAttachments([]);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachments([...attachments, file_url]);
      toast.success('File uploaded');
    } catch (error) {
      toast.error('File upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitResponse = () => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    respondMutation.mutate({
      id: selectedRequest.id,
      response: responseText,
      attachments
    });
  };

  const statusConfig = {
    open: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Action Required' },
    supplier_responded: { color: 'bg-blue-100 text-blue-700', icon: MessageSquare, label: 'Responded' },
    buyer_reviewing: { color: 'bg-purple-100 text-purple-700', icon: Clock, label: 'Under Review' },
    resolved: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Resolved' },
    escalated: { color: 'bg-rose-100 text-rose-700', icon: AlertCircle, label: 'Escalated' }
  };

  const priorityConfig = {
    low: 'border-l-slate-400',
    medium: 'border-l-blue-500',
    high: 'border-l-amber-500',
    urgent: 'border-l-rose-500'
  };

  const requestTypeLabels = {
    clarification: 'Clarification Needed',
    additional_evidence: 'Additional Evidence Required',
    correction: 'Correction Required',
    approval: 'Pending Approval'
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-[#545454]">Data Verification Requests</h3>
        <p className="text-sm text-slate-600">Collaborate with your buyer to verify and resolve data issues</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 mb-1">Open Requests</div>
            <div className="text-2xl font-bold text-amber-600">
              {verificationRequests.filter(r => r.status === 'open').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 mb-1">Responded</div>
            <div className="text-2xl font-bold text-blue-600">
              {verificationRequests.filter(r => r.status === 'supplier_responded').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 mb-1">Resolved</div>
            <div className="text-2xl font-bold text-emerald-600">
              {verificationRequests.filter(r => r.status === 'resolved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 mb-1">Avg Response Time</div>
            <div className="text-2xl font-bold text-[#545454]">2.3d</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {verificationRequests.map(request => {
          const config = statusConfig[request.status];
          const Icon = config.icon;
          const isSelected = selectedRequest?.id === request.id;
          
          return (
            <Card 
              key={request.id} 
              className={`cursor-pointer hover:border-[#86b027] transition-colors border-l-4 ${priorityConfig[request.priority]} ${isSelected ? 'ring-2 ring-[#86b027]' : ''}`}
              onClick={() => setSelectedRequest(request)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`w-5 h-5 mt-0.5 ${request.status === 'open' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{requestTypeLabels[request.request_type]}</Badge>
                        <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                        {request.priority === 'urgent' && <Badge variant="destructive" className="text-xs">URGENT</Badge>}
                      </div>
                      <p className="text-sm font-medium text-[#545454]">{request.message}</p>
                      {request.due_date && (
                        <p className="text-xs text-slate-600 mt-1">
                          Due: {new Date(request.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(request.created_date).toLocaleDateString()}
                  </span>
                </div>

                {/* Conversation History */}
                {request.conversation_history && request.conversation_history.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                    {request.conversation_history.slice(-2).map((msg, idx) => (
                      <div key={idx} className="text-xs bg-slate-50 p-2 rounded">
                        <span className="font-medium">{msg.author}:</span> {msg.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Response Form */}
                {isSelected && request.status !== 'resolved' && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    <Textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Enter your response..."
                      rows={3}
                    />
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id={`file-${request.id}`}
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`file-${request.id}`)?.click()}
                        disabled={uploadingFile}
                      >
                        {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        Attach File
                      </Button>
                      
                      {attachments.length > 0 && (
                        <span className="text-xs text-emerald-600">
                          ✓ {attachments.length} file(s) attached
                        </span>
                      )}
                      
                      <Button
                        onClick={handleSubmitResponse}
                        disabled={respondMutation.isPending}
                        className="ml-auto bg-[#86b027]"
                        size="sm"
                      >
                        {respondMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Send Response
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {verificationRequests.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
              <p className="font-medium text-slate-600">No verification requests</p>
              <p className="text-sm text-slate-500">All your data is verified</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
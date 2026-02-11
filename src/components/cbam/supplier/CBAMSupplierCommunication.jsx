import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  MessageSquare, Send, Paperclip, AlertCircle, Upload,
  Clock, CheckCircle2, Mail, Loader2, FileText
} from "lucide-react";
import moment from 'moment';

export default function CBAMSupplierCommunication({ supplier, companyId }) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState({
    subject: '',
    message: '',
    message_type: 'general',
    priority: 'normal',
    submission_id: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['supplier-messages', supplier?.id, companyId],
    queryFn: async () => {
      const all = await base44.entities.SupplierCBAMMessage.list('-created_date');
      return all.filter(m => 
        m.supplier_id === supplier?.id && 
        m.company_id === companyId
      );
    },
    enabled: !!supplier && !!companyId
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['supplier-submissions-for-messages', supplier?.id],
    queryFn: async () => {
      const all = await base44.entities.SupplierCBAMSubmission.list('-submission_date', 20);
      return all.filter(s => s.supplier_id === supplier?.id && s.company_id === companyId);
    },
    enabled: !!supplier && !!companyId
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.SupplierCBAMMessage.create({
        ...data,
        supplier_id: supplier.id,
        company_id: companyId,
        sender_type: 'supplier',
        sender_email: user.email,
        sender_name: user.full_name || supplier.legal_name,
        attachments
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-messages'] });
      toast.success('Message sent successfully');
      setNewMessage({
        subject: '',
        message: '',
        message_type: 'general',
        priority: 'normal',
        submission_id: ''
      });
      setAttachments([]);
    },
    onError: () => {
      toast.error('Failed to send message');
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setAttachments([...attachments, ...urls]);
      toast.success(`${files.length} file(s) attached`);
    } catch (error) {
      toast.error('File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = () => {
    if (!newMessage.subject || !newMessage.message) {
      toast.error('Subject and message are required');
      return;
    }
    sendMessageMutation.mutate(newMessage);
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      'urgent': 'bg-red-100 text-red-700',
      'high': 'bg-orange-100 text-orange-700',
      'normal': 'bg-slate-100 text-slate-700',
      'low': 'bg-slate-100 text-slate-500'
    };
    return <Badge className={configs[priority] || configs.normal}>{priority.toUpperCase()}</Badge>;
  };

  const unreadCount = messages.filter(m => !m.is_read && m.sender_type === 'company').length;

  return (
    <div className="space-y-6">
      {/* New Message Card */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-br from-[#86b027]/5 to-white">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#86b027]/10">
              <MessageSquare className="w-5 h-5 text-[#86b027]" />
            </div>
            Send Message to Buyer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Message Type</label>
                <Select
                  value={newMessage.message_type}
                  onValueChange={(v) => setNewMessage({...newMessage, message_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="clarification">Clarification Needed</SelectItem>
                    <SelectItem value="discrepancy">Report Discrepancy</SelectItem>
                    <SelectItem value="data_request">Data Request</SelectItem>
                    <SelectItem value="urgent">Urgent Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Priority</label>
                <Select
                  value={newMessage.priority}
                  onValueChange={(v) => setNewMessage({...newMessage, priority: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {submissions.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Related to Submission (Optional)
                </label>
                <Select
                  value={newMessage.submission_id}
                  onValueChange={(v) => setNewMessage({...newMessage, submission_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a submission" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {submissions.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.product_name} - {moment(sub.submission_date).format('MMM D, YYYY')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Subject</label>
              <Input
                value={newMessage.subject}
                onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                placeholder="Brief subject line..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Message</label>
              <Textarea
                value={newMessage.message}
                onChange={(e) => setNewMessage({...newMessage, message: e.target.value})}
                placeholder="Describe your inquiry or issue in detail..."
                rows={5}
              />
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Paperclip className="w-4 h-4" />
                  {attachments.length > 0 ? (
                    <span>{attachments.length} file(s) attached</span>
                  ) : (
                    <span>No attachments</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Attach Files
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSend}
                disabled={sendMessageMutation.isPending}
                className="bg-[#86b027] hover:bg-[#769c22]"
              >
                {sendMessageMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Thread */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#02a1e8]/10">
                <Mail className="w-5 h-5 text-[#02a1e8]" />
              </div>
              Message History
            </CardTitle>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-slate-400 animate-spin" />
              <p className="text-slate-600">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Messages Yet</h3>
              <p className="text-slate-500">Send your first message to start the conversation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isFromBuyer = msg.sender_type === 'company';
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg border ${
                      isFromBuyer 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">
                            {isFromBuyer ? 'Buyer' : 'You'}
                          </span>
                          {getPriorityBadge(msg.priority)}
                          <Badge variant="outline" className="text-xs">
                            {msg.message_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {moment(msg.created_date).format('MMM D, YYYY - HH:mm')}
                        </p>
                      </div>
                      {!msg.is_read && isFromBuyer && (
                        <Badge className="bg-red-100 text-red-700 border-0">NEW</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-2">{msg.subject}</h4>
                    <p className="text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                    {msg.attachments?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {msg.attachments.length} attachment(s)
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
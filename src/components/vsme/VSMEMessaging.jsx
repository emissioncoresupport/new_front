import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { MessageSquare, Send, AlertCircle, User } from "lucide-react";
import { format } from "date-fns";

export default function VSMEMessaging({ userEmail, userName, taskId, disclosureCode }) {
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['vsme-messages', taskId, disclosureCode],
    queryFn: async () => {
      const all = await base44.entities.VSMEMessage.list('-created_date');
      return all.filter(m => 
        (taskId && m.task_id === taskId) || 
        (disclosureCode && m.disclosure_code === disclosureCode) ||
        m.sender_email === userEmail ||
        m.recipient_email === userEmail
      );
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText) => {
      // Determine recipient (ESG officer or collaborator)
      const esgOfficerEmail = 'esg@company.com'; // This should come from settings
      const recipientEmail = userEmail.includes('esg') ? 
        (messages[0]?.sender_email !== userEmail ? messages[0]?.sender_email : messages[0]?.recipient_email) : 
        esgOfficerEmail;

      const msg = await base44.entities.VSMEMessage.create({
        task_id: taskId,
        disclosure_code: disclosureCode,
        sender_email: userEmail,
        sender_name: userName,
        recipient_email: recipientEmail,
        message: messageText
      });

      // Send email notification
      try {
        await base44.integrations.Core.SendEmail({
          to: recipientEmail,
          subject: `New Message: ${disclosureCode || 'VSME Task'}`,
          body: `${userName} sent you a message:\n\n${messageText}\n\nLog in to reply.`
        });
      } catch (e) {
        console.error('Email notification failed:', e);
      }

      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsme-messages'] });
      setNewMessage('');
      toast.success('Message sent');
    }
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Task Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {messages.length > 0 ? (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.sender_email === userEmail
                      ? 'bg-[#86b027]/10 ml-8'
                      : 'bg-slate-100 mr-8'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-bold text-[#545454]">
                      {msg.sender_name || msg.sender_email}
                    </span>
                    <span className="text-xs text-slate-500">
                      {msg.created_date && format(new Date(msg.created_date), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No messages yet</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="bg-[#86b027] hover:bg-[#769c22] shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
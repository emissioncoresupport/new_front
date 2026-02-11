import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, FileText, MessageSquare, UserPlus, Clock, Edit } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function VSMEActivityFeed({ collaboratorEmail = null }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['vsme-tasks-activity'],
    queryFn: () => base44.entities.VSMETask.list('-updated_date')
  });

  const { data: disclosures = [] } = useQuery({
    queryKey: ['vsme-disclosures-activity'],
    queryFn: () => base44.entities.VSMEDisclosure.list('-updated_date')
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['vsme-messages-activity'],
    queryFn: () => base44.entities.VSMEMessage.list('-created_date')
  });

  // Create activity feed
  const activities = [
    ...tasks.slice(0, 10).map(t => ({
      type: 'task',
      icon: t.status === 'completed' ? CheckCircle : Clock,
      color: t.status === 'completed' ? 'text-[#86b027]' : 'text-blue-600',
      bg: t.status === 'completed' ? 'bg-[#86b027]/10' : 'bg-blue-50',
      title: `Task ${t.status === 'completed' ? 'completed' : 'updated'}: ${t.title}`,
      user: t.completed_by || t.assigned_to,
      timestamp: t.completed_date || t.updated_date,
      details: `${t.disclosure_code} - ${t.status}`
    })),
    ...disclosures.slice(0, 10).map(d => ({
      type: 'disclosure',
      icon: FileText,
      color: 'text-[#02a1e8]',
      bg: 'bg-blue-50',
      title: `Disclosure ${d.status}: ${d.disclosure_code}`,
      user: d.completed_by || d.updated_by,
      timestamp: d.completed_date || d.updated_date,
      details: d.disclosure_title
    })),
    ...messages.slice(0, 10).map(m => ({
      type: 'message',
      icon: MessageSquare,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      title: `New message from ${m.sender_name}`,
      user: m.sender_email,
      timestamp: m.created_date,
      details: m.message?.substring(0, 80) + '...'
    }))
  ]
    .filter(a => !collaboratorEmail || a.user === collaboratorEmail)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);

  return (
    <Card className="shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-base">
          {collaboratorEmail ? 'Your Recent Activity' : 'Team Activity Feed'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {activities.map((activity, idx) => {
              const Icon = activity.icon;
              return (
                <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0">
                  <div className={`w-8 h-8 rounded-lg ${activity.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#545454] mb-1">{activity.title}</p>
                    <p className="text-xs text-slate-500 mb-1">{activity.details}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{activity.user}</span>
                      <span>•</span>
                      <span>{activity.timestamp && formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {activities.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p className="text-sm text-slate-500">No recent activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, BellOff, Calendar, AlertTriangle, CheckCircle2, XCircle, BookOpen, Eye } from "lucide-react";
import { markAsRead } from './EUDAMEDNotificationService';
import { toast } from 'sonner';

export default function EUDAMEDNotificationCenter({ compact = false }) {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date'),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    const icons = {
      deadline: Calendar,
      submission_success: CheckCircle2,
      submission_failure: XCircle,
      audit_review: Eye,
      regulatory_update: BookOpen
    };
    const Icon = icons[type] || Bell;
    return <Icon className="w-5 h-5" />;
  };

  const getIconColor = (type, priority) => {
    if (type === 'submission_failure') return 'text-rose-600';
    if (type === 'submission_success') return 'text-emerald-600';
    if (type === 'deadline' && priority === 'critical') return 'text-rose-600';
    if (type === 'deadline') return 'text-amber-600';
    if (type === 'audit_review') return 'text-[#02a1e8]';
    return 'text-[#86b027]';
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      critical: 'bg-rose-500',
      high: 'bg-amber-500',
      medium: 'bg-[#02a1e8]',
      low: 'bg-slate-500'
    };
    return <Badge className={configs[priority] || configs.medium}>{priority}</Badge>;
  };

  if (compact) {
    return (
      <div className="relative">
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[#545454]">Notification Center</h2>
          <p className="text-sm text-slate-600">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Bell className="w-8 h-8 text-[#86b027]" />
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-white">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
          <TabsTrigger value="deadline">Deadlines</TabsTrigger>
          <TabsTrigger value="submission_success">Submissions</TabsTrigger>
          <TabsTrigger value="audit_review">Audit Reviews</TabsTrigger>
          <TabsTrigger value="regulatory_update">Regulatory</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-3">
          {isLoading ? (
            <p className="text-center text-slate-500 py-8">Loading notifications...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No notifications</p>
            </div>
          ) : (
            filtered.map(notification => (
              <Card key={notification.id} className={`${!notification.read ? 'border-[#86b027] bg-[#86b027]/5' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 mt-1 ${getIconColor(notification.type, notification.priority)}`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h4 className="font-semibold text-[#545454]">{notification.title}</h4>
                        {getPriorityBadge(notification.priority)}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {notification.entity_reference && (
                            <span className="font-medium">{notification.entity_reference}</span>
                          )}
                          <span>{new Date(notification.created_date).toLocaleString()}</span>
                        </div>
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              markAsReadMutation.mutate(notification.id);
                              toast.success('Marked as read');
                            }}
                            className="text-[#86b027] hover:text-[#769c22]"
                          >
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
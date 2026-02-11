import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, CheckCircle, MessageSquare, FileText, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function VSMENotificationCenter({ userEmail }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['vsme-notifications', userEmail],
    queryFn: async () => {
      const all = await base44.entities.VSMENotification.list('-created_date');
      return all.filter(n => n.recipient_email === userEmail);
    },
    enabled: !!userEmail,
    refetchInterval: 30000 // Poll every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.VSMENotification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsme-notifications'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VSMENotification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsme-notifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const icons = {
    task_reminder: AlertCircle,
    task_overdue: AlertCircle,
    new_message: MessageSquare,
    disclosure_due: FileText,
    report_generated: CheckCircle
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-[#545454]">Notifications</h3>
          <p className="text-xs text-slate-500">{unreadCount} unread</p>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-2">
            {notifications.length > 0 ? (
              notifications.map(notif => {
                const Icon = icons[notif.notification_type] || Bell;
                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border transition-all ${
                      notif.read 
                        ? 'bg-white border-slate-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        notif.notification_type === 'task_overdue' ? 'bg-rose-100 text-rose-600' :
                        notif.notification_type === 'new_message' ? 'bg-blue-100 text-blue-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-sm text-[#545454] mb-1">{notif.title}</h5>
                        <p className="text-xs text-slate-600 mb-2">{notif.message}</p>
                        <p className="text-xs text-slate-400">
                          {notif.created_date && format(new Date(notif.created_date), 'MMM d, HH:mm')}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {!notif.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => markAsReadMutation.mutate(notif.id)}
                            >
                              Mark Read
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-rose-600"
                            onClick={() => deleteMutation.mutate(notif.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-500">No notifications</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
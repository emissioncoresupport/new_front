import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, CheckCheck, Trash2, AlertCircle, FileText, Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

export default function NotificationBell({ supplier }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['supplier-notifications', supplier?.id],
    queryFn: () => base44.entities.SupplierNotification.filter({ 
      supplier_id: supplier?.id 
    }, '-created_date'),
    enabled: !!supplier?.id,
    refetchInterval: 30000 // Poll every 30 seconds
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Mark as read
  const markReadMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.SupplierNotification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notifications'] });
    }
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => 
        base44.entities.SupplierNotification.update(n.id, { is_read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notifications'] });
      toast.success('All notifications marked as read');
    }
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.SupplierNotification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notifications'] });
    }
  });

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-amber-100 text-amber-700 border-amber-200',
      medium: 'bg-blue-100 text-blue-700 border-blue-200',
      low: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return colors[priority] || colors.medium;
  };

  const getIcon = (type) => {
    const icons = {
      new_request: FileText,
      deadline_approaching: Clock,
      document_verified: CheckCheck,
      document_needs_review: AlertCircle,
      task_assigned: FileText,
      message_received: Bell
    };
    return icons[type] || Bell;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => {
                const Icon = getIcon(notification.notification_type);
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-900">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(notification.created_date).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markReadMutation.mutate(notification.id)}
                              className="h-7 text-xs"
                            >
                              Mark as read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(notification.id)}
                            className="h-7 text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
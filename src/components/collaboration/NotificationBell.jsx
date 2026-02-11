import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationBell({ currentUserEmail }) {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications', currentUserEmail],
        queryFn: async () => {
            if (!currentUserEmail) return [];
            const all = await base44.entities.Notification.list('-created_at');
            return all.filter(n => n.recipient_email === currentUserEmail);
        },
        enabled: !!currentUserEmail,
        refetchInterval: 30000 // Poll every 30s
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const markAsReadMutation = useMutation({
        mutationFn: async (id) => {
            await base44.entities.Notification.update(id, { is_read: true });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const unread = notifications.filter(n => !n.is_read);
            for (const n of unread) {
                await base44.entities.Notification.update(n.id, { is_read: true });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        }
    });

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="xs" 
                            className="h-6 text-xs text-indigo-600"
                            onClick={() => markAllReadMutation.mutate()}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No notifications yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {notifications.map(notification => (
                                <div 
                                    key={notification.id} 
                                    className={`p-4 hover:bg-slate-50 transition-colors ${!notification.is_read ? 'bg-indigo-50/30' : ''}`}
                                    onClick={() => !notification.is_read && markAsReadMutation.mutate(notification.id)}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                            notification.type === 'Assignment' ? 'bg-blue-100 text-blue-700' :
                                            notification.type === 'StatusChange' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {notification.type}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {notification.created_at ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }) : 'Just now'}
                                        </span>
                                    </div>
                                    <h5 className={`text-sm ${!notification.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                        {notification.title}
                                    </h5>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                        {notification.message}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
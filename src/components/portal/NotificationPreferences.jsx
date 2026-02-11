import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Monitor } from "lucide-react";
import { toast } from "sonner";

const NOTIFICATION_TYPES = [
  { 
    type: 'new_request', 
    label: 'New Data Requests', 
    description: 'When new CBAM or compliance data is requested' 
  },
  { 
    type: 'deadline_approaching', 
    label: 'Approaching Deadlines', 
    description: 'Reminders for upcoming submission deadlines' 
  },
  { 
    type: 'document_verified', 
    label: 'Document Verified', 
    description: 'When your uploaded documents are verified' 
  },
  { 
    type: 'document_needs_review', 
    label: 'Document Needs Review', 
    description: 'When documents require additional review or correction' 
  },
  { 
    type: 'task_assigned', 
    label: 'Tasks Assigned', 
    description: 'When new tasks are assigned to you' 
  },
  { 
    type: 'message_received', 
    label: 'New Messages', 
    description: 'When you receive messages from the compliance team' 
  }
];

export default function NotificationPreferences({ supplier }) {
  const queryClient = useQueryClient();

  // Fetch preferences
  const { data: preferences = [] } = useQuery({
    queryKey: ['supplier-notification-preferences', supplier?.id],
    queryFn: () => base44.entities.SupplierNotificationPreference.filter({ 
      supplier_id: supplier?.id 
    }),
    enabled: !!supplier?.id
  });

  // Initialize preferences if they don't exist
  const initializePreferences = useMutation({
    mutationFn: async (type) => {
      return base44.entities.SupplierNotificationPreference.create({
        supplier_id: supplier.id,
        notification_type: type,
        enabled: true,
        email_enabled: true,
        in_app_enabled: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notification-preferences'] });
    }
  });

  // Update preference
  const updatePreference = useMutation({
    mutationFn: ({ id, data }) => 
      base44.entities.SupplierNotificationPreference.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-notification-preferences'] });
      toast.success('Notification preferences updated');
    }
  });

  const getPreference = (type) => {
    const pref = preferences.find(p => p.notification_type === type);
    if (!pref) {
      // Initialize with defaults
      initializePreferences.mutate(type);
      return { enabled: true, email_enabled: true, in_app_enabled: true };
    }
    return pref;
  };

  const handleToggle = (type, field, value) => {
    const pref = preferences.find(p => p.notification_type === type);
    if (pref) {
      updatePreference.mutate({
        id: pref.id,
        data: { [field]: value }
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#86b027]" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-slate-600 mb-4">
          Configure how you want to receive notifications about important updates and requests.
        </div>

        {NOTIFICATION_TYPES.map(({ type, label, description }) => {
          const pref = getPreference(type);
          
          return (
            <div key={type} className="space-y-3 pb-6 border-b last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{label}</h4>
                  <p className="text-sm text-slate-500 mt-0.5">{description}</p>
                </div>
                <Switch
                  checked={pref.enabled}
                  onCheckedChange={(checked) => handleToggle(type, 'enabled', checked)}
                />
              </div>

              {pref.enabled && (
                <div className="ml-4 space-y-3 pl-4 border-l-2 border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-700">In-App Notifications</span>
                    </div>
                    <Switch
                      checked={pref.in_app_enabled}
                      onCheckedChange={(checked) => handleToggle(type, 'in_app_enabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-700">Email Notifications</span>
                    </div>
                    <Switch
                      checked={pref.email_enabled}
                      onCheckedChange={(checked) => handleToggle(type, 'email_enabled', checked)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-6">
          <p className="text-xs text-blue-900">
            <strong>Note:</strong> Critical notifications (urgent compliance issues) will always be sent regardless of these settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
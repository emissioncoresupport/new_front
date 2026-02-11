import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Bell, Mail, MessageSquare, AlertCircle, FileText } from "lucide-react";

export default function VSMENotificationPreferences({ collaborator }) {
  const [preferences, setPreferences] = useState(collaborator?.notification_preferences || {
    email: true,
    reminders: true,
    task_assigned: true,
    task_due_3days: true,
    task_overdue: true,
    new_message: true,
    disclosure_updates: true,
    report_generated: false
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.VSMECollaborator.update(collaborator.id, {
      notification_preferences: preferences
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsme-collaborators'] });
      toast.success('Notification preferences saved');
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Notifications */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-[#02a1e8]" />
            <div>
              <Label className="font-bold text-sm">Email Notifications</Label>
              <p className="text-xs text-slate-500">Receive notifications via email</p>
            </div>
          </div>
          <Switch
            checked={preferences.email}
            onCheckedChange={(checked) => setPreferences({ ...preferences, email: checked })}
          />
        </div>

        {/* Task Reminders */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-[#545454]">Task Reminders</h4>
          
          <div className="flex items-center justify-between pl-3">
            <div>
              <Label className="text-sm">Task Assigned</Label>
              <p className="text-xs text-slate-500">When a new task is assigned to you</p>
            </div>
            <Switch
              checked={preferences.task_assigned}
              onCheckedChange={(checked) => setPreferences({ ...preferences, task_assigned: checked })}
            />
          </div>

          <div className="flex items-center justify-between pl-3">
            <div>
              <Label className="text-sm">Due in 3 Days</Label>
              <p className="text-xs text-slate-500">Reminder 3 days before deadline</p>
            </div>
            <Switch
              checked={preferences.task_due_3days}
              onCheckedChange={(checked) => setPreferences({ ...preferences, task_due_3days: checked })}
            />
          </div>

          <div className="flex items-center justify-between pl-3">
            <div>
              <Label className="text-sm">Overdue Tasks</Label>
              <p className="text-xs text-slate-500">Daily reminder for overdue tasks</p>
            </div>
            <Switch
              checked={preferences.task_overdue}
              onCheckedChange={(checked) => setPreferences({ ...preferences, task_overdue: checked })}
            />
          </div>
        </div>

        {/* Message Notifications */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-[#86b027]" />
            <div>
              <Label className="font-bold text-sm">New Messages</Label>
              <p className="text-xs text-slate-500">When you receive a new message</p>
            </div>
          </div>
          <Switch
            checked={preferences.new_message}
            onCheckedChange={(checked) => setPreferences({ ...preferences, new_message: checked })}
          />
        </div>

        {/* Disclosure Updates */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#02a1e8]" />
            <div>
              <Label className="font-bold text-sm">Disclosure Updates</Label>
              <p className="text-xs text-slate-500">Changes to assigned disclosures</p>
            </div>
          </div>
          <Switch
            checked={preferences.disclosure_updates}
            onCheckedChange={(checked) => setPreferences({ ...preferences, disclosure_updates: checked })}
          />
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full bg-[#86b027] hover:bg-[#769c22]"
        >
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, Mail, Calendar, AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";
import { toast } from "sonner";

export default function AutomatedWorkflowEngine() {
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['csrd-tasks'],
    queryFn: () => base44.entities.CSRDTask.list()
  });

  const autoReminderMutation = useMutation({
    mutationFn: async () => {
      const overdueTasks = tasks.filter(t => 
        t.due_date && 
        new Date(t.due_date) < new Date() && 
        t.status !== 'approved' && 
        t.status !== 'submitted'
      );

      const upcomingTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        const daysUntilDue = Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilDue > 0 && daysUntilDue <= 7 && t.status === 'pending';
      });

      for (const task of overdueTasks) {
        await base44.integrations.Core.SendEmail({
          to: task.assigned_to,
          subject: `⚠️ CSRD Task Overdue: ${task.title}`,
          body: `
Dear Team Member,

Your CSRD task "${task.title}" is now overdue.

Task Details:
- Due Date: ${new Date(task.due_date).toLocaleDateString()}
- ESRS Standard: ${task.esrs_standard || 'N/A'}
- Priority: ${task.priority}

Please complete this task as soon as possible to maintain CSRD compliance.

Best regards,
CSRD Automation System
          `
        });
      }

      for (const task of upcomingTasks) {
        await base44.integrations.Core.SendEmail({
          to: task.assigned_to,
          subject: `🔔 CSRD Task Due Soon: ${task.title}`,
          body: `
Dear Team Member,

Your CSRD task "${task.title}" is due soon.

Task Details:
- Due Date: ${new Date(task.due_date).toLocaleDateString()}
- ESRS Standard: ${task.esrs_standard || 'N/A'}
- Priority: ${task.priority}

Please complete this task before the deadline.

Best regards,
CSRD Automation System
          `
        });
      }

      return { overdue: overdueTasks.length, upcoming: upcomingTasks.length };
    },
    onSuccess: (data) => {
      toast.success(`✅ Sent ${data.overdue} overdue reminders and ${data.upcoming} upcoming reminders`);
    }
  });

  const autoEscalateMutation = useMutation({
    mutationFn: async () => {
      const criticalOverdue = tasks.filter(t => 
        t.due_date && 
        new Date(t.due_date) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && 
        t.status !== 'approved' &&
        (t.priority === 'critical' || t.priority === 'high')
      );

      const user = await base44.auth.me();
      
      for (const task of criticalOverdue) {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `🚨 Critical CSRD Task Escalation: ${task.title}`,
          body: `
ESCALATION NOTICE

A critical CSRD task has been overdue for more than 7 days:

Task: ${task.title}
Assigned to: ${task.assigned_to}
Due Date: ${new Date(task.due_date).toLocaleDateString()}
Priority: ${task.priority}
ESRS Standard: ${task.esrs_standard || 'N/A'}

Immediate action required for CSRD compliance.

System Administrator
          `
        });
      }

      return criticalOverdue.length;
    },
    onSuccess: (count) => {
      if (count > 0) {
        toast.warning(`⚠️ Escalated ${count} critical overdue tasks`);
      } else {
        toast.success('✅ No critical escalations needed');
      }
    }
  });

  const stats = {
    total: tasks.length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'approved').length,
    upcoming: tasks.filter(t => {
      if (!t.due_date) return false;
      const daysUntilDue = Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilDue > 0 && daysUntilDue <= 7;
    }).length,
    critical: tasks.filter(t => (t.priority === 'critical' || t.priority === 'high') && t.status !== 'approved').length
  };

  return (
    <Card className="border-[#86b027]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#86b027] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Automated Workflow Engine</CardTitle>
              <p className="text-xs text-slate-600">Smart task automation and reminders</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3 rounded-lg text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-slate-600" />
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-600">Total Tasks</p>
          </div>
          <div className="bg-rose-50 p-3 rounded-lg text-center">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-600" />
            <p className="text-2xl font-bold text-rose-600">{stats.overdue}</p>
            <p className="text-xs text-slate-600">Overdue</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
            <p className="text-2xl font-bold text-amber-600">{stats.upcoming}</p>
            <p className="text-xs text-slate-600">Due Soon</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">{stats.critical}</p>
            <p className="text-xs text-slate-600">Critical</p>
          </div>
        </div>

        {/* Automation Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#02a1e8]" />
              <div>
                <p className="font-bold text-slate-900">Send Automated Reminders</p>
                <p className="text-xs text-slate-600">Email stakeholders about overdue & upcoming tasks</p>
              </div>
            </div>
            <Button
              onClick={() => autoReminderMutation.mutate()}
              disabled={autoReminderMutation.isPending}
              className="bg-[#02a1e8] hover:bg-[#0291d1]"
            >
              {autoReminderMutation.isPending ? 'Sending...' : `Send Reminders (${stats.overdue + stats.upcoming})`}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-rose-50 to-white rounded-lg border border-rose-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <div>
                <p className="font-bold text-slate-900">Escalate Critical Tasks</p>
                <p className="text-xs text-slate-600">Alert admin for tasks overdue >7 days with high priority</p>
              </div>
            </div>
            <Button
              onClick={() => autoEscalateMutation.mutate()}
              disabled={autoEscalateMutation.isPending}
              variant="outline"
              className="border-rose-600 text-rose-600 hover:bg-rose-50"
            >
              {autoEscalateMutation.isPending ? 'Escalating...' : 'Escalate Now'}
            </Button>
          </div>

          <Card className="bg-gradient-to-br from-[#86b027]/5 to-white border-[#86b027]/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#86b027] mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 mb-2">Schedule Recurring Automation</p>
                  <p className="text-xs text-slate-600 mb-3">
                    Set up weekly automated reminders and monthly escalation reports (Enterprise feature - coming soon)
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Switch disabled />
                      <span className="text-slate-600">Weekly Reminders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch disabled />
                      <span className="text-slate-600">Monthly Reports</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pro Tip */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-xs font-bold text-blue-900 mb-1">💡 Pro Tip</p>
          <p className="text-xs text-blue-800">
            Set up automated workflows to run every Monday morning for weekly check-ins and every 1st of the month for stakeholder progress reports.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
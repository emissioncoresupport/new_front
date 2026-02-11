import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, CheckCircle, AlertTriangle, Mail, FileText, 
  ChevronRight, Send, Users, Plus, BarChart3
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import OnboardingWizard from './OnboardingWizard';
import OnboardingProgressTracker from './OnboardingProgressTracker';

export default function OnboardingDashboard({ tasks, suppliers, onViewSupplier, onInviteSupplier }) {
  const [showWizard, setShowWizard] = useState(false);
  
  // Calculate stats
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'sent');
  const overdueTasks = tasks.filter(t => 
    (t.status !== 'completed') && new Date(t.due_date) < new Date()
  );
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'sent');

  // Group tasks by supplier
  const supplierProgress = suppliers.map(supplier => {
    const supplierTasks = tasks.filter(t => t.supplier_id === supplier.id);
    const completed = supplierTasks.filter(t => t.status === 'completed').length;
    const total = supplierTasks.length;
    const hasOverdue = supplierTasks.some(t => 
      t.status !== 'completed' && new Date(t.due_date) < new Date()
    );
    return {
      supplier,
      completed,
      total,
      progress: total > 0 ? (completed / total) * 100 : 0,
      hasOverdue,
      nextDue: supplierTasks
        .filter(t => t.status !== 'completed')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0]
    };
  })
  .filter(s => s.total > 0)
  .sort((a, b) => b.progress - a.progress); // Sort by progress

  // Upcoming tasks (next 7 days)
  const upcomingTasks = tasks
    .filter(t => {
      if (t.status === 'completed') return false;
      const daysUntil = differenceInDays(new Date(t.due_date), new Date());
      return daysUntil >= 0 && daysUntil <= 7;
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header with Action */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">Supplier Onboarding Hub</h2>
          <p className="text-slate-500">Automated task assignment & progress tracking</p>
        </div>
        <div className="flex gap-3">
          {onInviteSupplier && (
            <Button 
              onClick={onInviteSupplier}
              variant="outline"
              className="border-[#86b027] text-[#86b027] hover:bg-[#86b027]/10"
            >
              <Mail className="w-4 h-4 mr-2" />
              Invite by Email
            </Button>
          )}
          <Button 
            onClick={() => setShowWizard(true)}
            className="bg-gradient-to-r from-[#86b027] to-[#769c22] hover:from-[#769c22] hover:to-[#86b027] text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start New Onboarding
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all rounded-2xl group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-[#02a1e8]/10 group-hover:bg-[#02a1e8] transition-colors">
                <Users className="w-6 h-6 text-[#02a1e8] group-hover:text-white" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-[#545454]">{supplierProgress.length}</p>
                <p className="text-xs font-bold text-[#545454]/70 uppercase tracking-wider">Onboardings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all rounded-2xl group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-amber-50 group-hover:bg-amber-400 transition-colors">
                <Clock className="w-6 h-6 text-amber-500 group-hover:text-white" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-[#545454]">{pendingTasks.length}</p>
                <p className="text-xs font-bold text-[#545454]/70 uppercase tracking-wider">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all rounded-2xl group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-rose-50 group-hover:bg-rose-400 transition-colors">
                <AlertTriangle className="w-6 h-6 text-rose-500 group-hover:text-white" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-[#545454]">{overdueTasks.length}</p>
                <p className="text-xs font-bold text-[#545454]/70 uppercase tracking-wider">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all rounded-2xl group">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-[#86b027]/10 group-hover:bg-[#86b027] transition-colors">
                <CheckCircle className="w-6 h-6 text-[#86b027] group-hover:text-white" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-[#545454]">{completedTasks.length}</p>
                <p className="text-xs font-bold text-[#545454]/70 uppercase tracking-wider">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="tasks">
            <FileText className="w-4 h-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="progress">
            <BarChart3 className="w-4 h-4 mr-2" />
            Progress Tracker
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Onboarding Progress */}
        <Card className="border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-[#545454]">Supplier Onboarding Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {supplierProgress.length > 0 ? (
              supplierProgress.map(({ supplier, completed, total, progress, hasOverdue, nextDue }) => (
                <div 
                  key={supplier.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors",
                    hasOverdue ? "border-rose-200 bg-rose-50/30" : "border-slate-100"
                  )}
                  onClick={() => onViewSupplier(supplier)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">{supplier.legal_name}</span>
                      {hasOverdue && (
                        <Badge variant="secondary" className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] px-1.5 py-0">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2 mb-3 bg-slate-100 [&>div]:bg-[#86b027]" />
                  {nextDue && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                       <Clock className="w-3 h-3 text-[#02a1e8]" />
                       <span>Next: <span className="font-bold text-[#545454]">{nextDue.title}</span></span>
                       <span className="text-slate-300">•</span>
                       <span>Due {format(new Date(nextDue.due_date), 'MMM d')}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No active onboardings</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-[#545454]">Upcoming Due (Next 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3 max-h-[350px] overflow-y-auto pr-2">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task) => {
                const supplier = suppliers.find(s => s.id === task.supplier_id);
                const daysUntil = differenceInDays(new Date(task.due_date), new Date());
                return (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-[#F5F7F8] hover:border-[#02a1e8]/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2.5 rounded-xl",
                        task.task_type === 'questionnaire' ? "bg-[#02a1e8]/10" : "bg-[#86b027]/10"
                      )}>
                        {task.task_type === 'questionnaire' ? (
                          <FileText className="w-5 h-5 text-[#02a1e8]" />
                        ) : (
                          <Mail className="w-5 h-5 text-[#86b027]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#545454]">{task.title}</p>
                        <p className="text-xs text-slate-500">{supplier?.legal_name}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-lg font-bold",
                        daysUntil === 0 ? "bg-amber-100 text-amber-700" : "bg-white text-slate-600 border border-slate-200"
                      )}
                    >
                      {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No upcoming tasks</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="progress">
          <OnboardingProgressTracker suppliers={suppliers} tasks={tasks} />
        </TabsContent>
      </Tabs>

      <OnboardingWizard open={showWizard} onOpenChange={setShowWizard} />
    </div>
  );
}
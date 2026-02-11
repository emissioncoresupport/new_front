import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, CheckCircle, Clock, AlertTriangle, Building2, Activity, MessageSquare, TrendingUp, Shield } from "lucide-react";
import { format } from "date-fns";
import VSMEDisclosureModal from '../components/vsme/VSMEDisclosureModal';
import VSMEMessaging from '../components/vsme/VSMEMessaging';
import VSMEActivityFeed from '../components/vsme/VSMEActivityFeed';

export default function VSMECollaboratorPortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const collaboratorEmail = urlParams.get('email');
  const [selectedDisclosure, setSelectedDisclosure] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: collaborator } = useQuery({
    queryKey: ['collaborator', collaboratorEmail],
    queryFn: async () => {
      const all = await base44.entities.VSMECollaborator.list();
      return all.find(c => c.email === collaboratorEmail);
    },
    enabled: !!collaboratorEmail
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['collaborator-tasks', collaboratorEmail],
    queryFn: async () => {
      const all = await base44.entities.VSMETask.list('-due_date');
      return all.filter(t => t.assigned_to === collaboratorEmail);
    },
    enabled: !!collaboratorEmail
  });

  const { data: disclosures = [] } = useQuery({
    queryKey: ['vsme-disclosures'],
    queryFn: () => base44.entities.VSMEDisclosure.list()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['vsme-messages', collaboratorEmail],
    queryFn: async () => {
      const all = await base44.entities.VSMEMessage.list('-created_date');
      return all.filter(m => m.sender_email === collaboratorEmail || m.recipient_email === collaboratorEmail);
    },
    enabled: !!collaboratorEmail
  });

  if (!collaboratorEmail || !collaborator) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md border-rose-200 bg-rose-50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-rose-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-rose-900 mb-2">Access Required</h2>
            <p className="text-sm text-rose-700">Please use the invitation link sent to your email.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Role-based permissions
  const permissions = {
    author: { canEdit: true, canApprove: true, canDelete: true, canInvite: true },
    preparer: { canEdit: true, canApprove: false, canDelete: false, canInvite: false },
    approver: { canEdit: false, canApprove: true, canDelete: false, canInvite: false },
    auditor: { canEdit: false, canApprove: false, canDelete: false, canInvite: false },
    contributor: { canEdit: true, canApprove: false, canDelete: false, canInvite: false }
  };

  const userPermissions = permissions[collaborator.role] || permissions.contributor;

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');
  const unreadMessages = messages.filter(m => !m.read && m.recipient_email === collaboratorEmail).length;
  
  const myDisclosures = disclosures.filter(d => 
    collaborator?.disclosure_assignments?.includes(d.disclosure_code)
  );

  const taskCompletionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
  const disclosureCompletionRate = myDisclosures.length > 0 
    ? (myDisclosures.filter(d => d.status === 'completed').length / myDisclosures.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#86b027] to-[#769c22] rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#545454]">VSME Collaborator Portal</h1>
                <p className="text-xs text-slate-500">{collaborator.name} • {collaborator.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-3">
                <div className="flex items-center gap-2 text-[#86b027] text-xs font-bold mb-1">
                  <Shield className="w-4 h-4" />
                  {userPermissions.canEdit ? 'Editor' : 'Viewer'} Access
                </div>
                <Badge className="bg-[#86b027]">{collaborator.department}</Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-white shadow-lg border-2 border-blue-100 hover:shadow-xl transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-600 uppercase font-bold">Active Tasks</p>
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#545454] mb-2">{pendingTasks.length}</p>
              <Progress value={taskCompletionRate} className="h-2" />
              <p className="text-xs text-slate-500 mt-2">{Math.round(taskCompletionRate)}% complete</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-2 border-[#86b027]/20 hover:shadow-xl transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-600 uppercase font-bold">Completed</p>
                <div className="w-10 h-10 rounded-xl bg-[#86b027]/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[#86b027]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-[#545454]">{completedTasks.length}</p>
              <p className="text-xs text-[#86b027] font-bold mt-3">Great work!</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-2 border-rose-100 hover:shadow-xl transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-600 uppercase font-bold">Overdue</p>
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-rose-600">{overdueTasks.length}</p>
              {overdueTasks.length > 0 && (
                <p className="text-xs text-rose-600 font-medium mt-3">Needs attention</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-2 border-purple-100 hover:shadow-xl transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-600 uppercase font-bold">Messages</p>
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-purple-600">{unreadMessages}</p>
              <p className="text-xs text-slate-500 mt-3">Unread</p>
            </CardContent>
          </Card>
        </div>

        {/* My Contributions Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-[#86b027]/5 to-white border-[#86b027]/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#86b027]" />
                My Disclosures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-[#545454]">
                  {myDisclosures.filter(d => d.status === 'completed').length}/{myDisclosures.length}
                </span>
                <span className="text-sm text-slate-600">Completed</span>
              </div>
              <Progress value={disclosureCompletionRate} className="h-3 mb-3" />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-[#86b027]/10 rounded">
                  <p className="font-bold text-[#86b027]">{myDisclosures.filter(d => d.status === 'completed').length}</p>
                  <p className="text-slate-600">Done</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <p className="font-bold text-blue-600">{myDisclosures.filter(d => d.status === 'in_progress').length}</p>
                  <p className="text-slate-600">In Progress</p>
                </div>
                <div className="text-center p-2 bg-slate-100 rounded">
                  <p className="font-bold text-slate-600">{myDisclosures.filter(d => d.status === 'not_started').length}</p>
                  <p className="text-slate-600">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <VSMEActivityFeed collaboratorEmail={collaboratorEmail} />
        </div>

        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="bg-white shadow-md border border-slate-200">
            <TabsTrigger value="tasks" className="gap-2 data-[state=active]:bg-[#86b027] data-[state=active]:text-white">
              <Clock className="w-4 h-4" />
              My Tasks
            </TabsTrigger>
            <TabsTrigger value="disclosures" className="gap-2 data-[state=active]:bg-[#86b027] data-[state=active]:text-white">
              <FileText className="w-4 h-4" />
              My Disclosures
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-[#86b027] data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4" />
              Messages
              {unreadMessages > 0 && (
                <Badge className="ml-1 bg-rose-500 text-white text-xs px-1.5 py-0">{unreadMessages}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#86b027]" />
                  Your Assigned Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasks.length > 0 ? (
                  tasks.map(task => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                    return (
                      <Card key={task.id} className={`${isOverdue ? 'border-rose-300 bg-rose-50/30' : 'bg-white'} shadow-md hover:shadow-lg transition-shadow`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-[#86b027]">{task.disclosure_code}</Badge>
                                <h4 className="font-bold text-[#545454]">{task.title}</h4>
                              </div>
                              {task.description && (
                                <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <Badge variant="outline">{task.task_type.replace('_', ' ')}</Badge>
                                {task.due_date && (
                                  <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                                    Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className={
                              task.status === 'completed' ? 'bg-[#86b027]/10 text-[#86b027]' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <VSMEMessaging
                            userEmail={collaboratorEmail}
                            userName={collaborator.name}
                            taskId={task.id}
                            disclosureCode={task.disclosure_code}
                          />
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Tasks Assigned</h3>
                    <p className="text-sm text-slate-500">You'll receive notifications when tasks are assigned to you</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disclosures Tab */}
          <TabsContent value="disclosures">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#86b027]" />
                    Your Assigned Disclosures
                  </CardTitle>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {userPermissions.canEdit ? 'Edit Access' : 'View Only'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {myDisclosures.length > 0 ? (
                  myDisclosures.map(disc => (
                    <Card key={disc.id} className="hover:shadow-lg transition-shadow bg-white shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-[#86b027]">{disc.disclosure_code}</Badge>
                              <h4 className="font-bold text-[#545454]">{disc.disclosure_title}</h4>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{disc.disclosure_category}</Badge>
                              <Badge className={
                                disc.status === 'completed' ? 'bg-[#86b027]/10 text-[#86b027]' :
                                disc.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }>
                                {disc.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDisclosure(disc);
                              setShowModal(true);
                            }}
                            disabled={!userPermissions.canEdit && disc.status !== 'completed'}
                            className="bg-[#86b027] hover:bg-[#769c22]"
                          >
                            {userPermissions.canEdit ? 'Edit' : 'View'} Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Disclosures Assigned</h3>
                    <p className="text-sm text-slate-500">Contact your ESG officer to get disclosure assignments</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  Communication Center
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VSMEMessaging
                  userEmail={collaboratorEmail}
                  userName={collaborator.name}
                  taskId={null}
                  disclosureCode={null}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {selectedDisclosure && (
        <VSMEDisclosureModal
          disclosure={{ ...selectedDisclosure, existing: selectedDisclosure }}
          open={showModal}
          onOpenChange={setShowModal}
          moduleType={selectedDisclosure.module_type}
        />
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, UploadCloud, Clock, AlertCircle, FileText, Lock, Loader2, Shield, Filter, Search, Eye, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import CommentsSection from "@/components/collaboration/CommentsSection";
import NotificationBell from "@/components/collaboration/NotificationBell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StakeholderHub() {
    const [selectedTask, setSelectedTask] = useState(null);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isDelegateOpen, setIsDelegateOpen] = useState(false);
    const [delegateEmail, setDelegateEmail] = useState("");
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [filter, setFilter] = useState('all'); // all, pending, completed
    const queryClient = useQueryClient();

    // Simulated Auth / Identity
    const { data: user } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me().catch(() => ({ email: 'demo@example.com' }))
    });

    // Fetch Stakeholder Role
    const { data: stakeholder } = useQuery({
        queryKey: ['my-role', user?.email],
        queryFn: async () => {
            if (!user?.email) return null;
            const all = await base44.entities.Stakeholder.list();
            return all.find(s => s.email === user.email) || { role: 'Contributor' }; // Default to Contributor for demo
        },
        enabled: !!user?.email
    });

    // Fetch all stakeholders for delegation
    const { data: allStakeholders = [] } = useQuery({
        queryKey: ['all-stakeholders'],
        queryFn: () => base44.entities.Stakeholder.list()
    });

    const role = stakeholder?.role || 'Viewer';
    const canEdit = role === 'Contributor';
    const isAuditor = role === 'Auditor';

    const { data: myTasks = [] } = useQuery({
        queryKey: ['my-hub-tasks', user?.email],
        queryFn: async () => {
            if (!user?.email) return [];
            const allTasks = await base44.entities.CCFTask.list();
            // Admin/Auditor sees all, Contributor sees assigned
            if (role === 'Auditor' || role === 'Viewer') return allTasks;
            
            // Demo logic: show tasks for demo user + actual user
            return allTasks.filter(t => 
                t.assignee_email === user.email || 
                t.assignee_email === 'demo@example.com'
            );
        },
        enabled: !!user?.email
    });

    const submitTaskMutation = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error("Please upload a file");
            setIsUploading(true);
            try {
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                
                const evidence = await base44.entities.EvidenceDocument.create({
                    file_name: file.name,
                    file_url: file_url,
                    uploaded_by: user.email,
                    upload_date: new Date().toISOString(),
                    document_type: 'Other',
                    status: 'Pending Review'
                });

                await base44.entities.CCFTask.update(selectedTask.id, {
                    status: 'Submitted',
                    evidence_id: evidence.id,
                    completion_date: new Date().toISOString()
                });
                
                // Notify Admin (mock)
                await base44.entities.Notification.create({
                    recipient_email: 'admin@example.com', // Assuming admin is monitoring
                    type: 'StatusChange',
                    title: 'Task Submitted',
                    message: `${user.email} submitted task "${selectedTask.title}"`,
                    related_entity_id: selectedTask.id,
                    related_entity_type: 'CCFTask',
                    created_at: new Date().toISOString()
                });
            } finally {
                setIsUploading(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['my-hub-tasks']);
            setSelectedTask(null);
            setFile(null);
            toast.success("Task submitted for review");
        },
        onError: () => toast.error("Submission failed")
    });

    const delegateMutation = useMutation({
        mutationFn: async () => {
            if (!selectedTask || !delegateEmail) return;
            
            await base44.entities.CCFTask.update(selectedTask.id, {
                assignee_email: delegateEmail
            });
            
            // Notify new assignee
            await base44.entities.Notification.create({
                recipient_email: delegateEmail,
                type: 'Assignment',
                title: 'Task Delegated to You',
                message: `${user.email} delegated task "${selectedTask.title}" to you.`,
                related_entity_id: selectedTask.id,
                related_entity_type: 'CCFTask',
                created_at: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['my-hub-tasks']);
            setIsDelegateOpen(false);
            setSelectedTask(null);
            setDelegateEmail("");
            toast.success("Task delegated");
        }
    });

    const filteredTasks = myTasks.filter(t => {
        if (filter === 'pending') return t.status === 'Pending';
        if (filter === 'completed') return t.status === 'Submitted' || t.status === 'Approved';
        return true;
    });

    const stats = {
        pending: myTasks.filter(t => t.status === 'Pending').length,
        completed: myTasks.filter(t => t.status === 'Submitted' || t.status === 'Approved').length,
        overdue: myTasks.filter(t => t.status === 'Pending' && new Date(t.due_date) < new Date()).length
    };

    return (
        <div className="min-h-screen bg-transparent p-6 font-sans text-slate-800">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#86b027]"></div>
                    <div className="z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <Shield className="w-8 h-8 text-[#86b027]" />
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Stakeholder Hub</h1>
                        </div>
                        <p className="text-slate-500 text-lg">
                            Secure workspace for <span className="font-semibold text-[#86b027]">{role}s</span>. 
                            {role === 'Contributor' ? ' Upload data and manage assigned tasks.' : ' Review and audit compliance data.'}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 z-10">
                         <div className="flex items-center gap-2">
                             <NotificationBell currentUserEmail={user?.email} />
                             <Badge variant="outline" className="px-4 py-1 bg-slate-50 border-slate-200 text-slate-600 text-sm">
                                {user?.email}
                            </Badge>
                         </div>
                        <Badge className={
                            role === 'Contributor' ? 'bg-[#86b027] hover:bg-[#769c22]' : 
                            role === 'Auditor' ? 'bg-[#545454] hover:bg-slate-700' : 
                            'bg-slate-600 hover:bg-slate-700'
                        }>
                            {role} Mode
                        </Badge>
                    </div>
                    {/* Decorative Background */}
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent -z-0"></div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-l-4 border-l-[#86b027] shadow-sm hover:shadow-[0_0_15px_rgba(134,176,39,0.3)] hover:scale-[1.02] transition-all duration-300 bg-white group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Pending Actions</p>
                                <h3 className="text-4xl font-bold text-[#545454] mt-2 group-hover:text-[#86b027] transition-colors">{stats.pending}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-[#86b027]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Clock className="w-6 h-6 text-[#86b027]" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-[#86b027] shadow-sm hover:shadow-[0_0_15px_rgba(134,176,39,0.3)] hover:scale-[1.02] transition-all duration-300 bg-white group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Completed</p>
                                <h3 className="text-4xl font-bold text-[#545454] mt-2 group-hover:text-[#86b027] transition-colors">{stats.completed}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-[#86b027]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <CheckCircle2 className="w-6 h-6 text-[#86b027]" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-[0_0_15px_rgba(134,176,39,0.3)] hover:scale-[1.02] transition-all duration-300 bg-white group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Overdue</p>
                                <h3 className="text-4xl font-bold text-[#545454] mt-2 group-hover:text-rose-600 transition-colors">{stats.overdue}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <AlertCircle className="w-6 h-6 text-rose-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Task List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Assigned Tasks</h2>
                        <div className="flex gap-2">
                            <Button 
                                variant={filter === 'all' ? 'default' : 'outline'} 
                                onClick={() => setFilter('all')}
                                size="sm"
                                className={filter === 'all' ? 'bg-slate-800 text-white' : ''}
                            >All</Button>
                            <Button 
                                variant={filter === 'pending' ? 'default' : 'outline'} 
                                onClick={() => setFilter('pending')}
                                size="sm"
                                className={filter === 'pending' ? 'bg-[#86b027] text-white hover:bg-[#769c22]' : ''}
                            >Pending</Button>
                            <Button 
                                variant={filter === 'completed' ? 'default' : 'outline'} 
                                onClick={() => setFilter('completed')}
                                size="sm"
                                className={filter === 'completed' ? 'bg-emerald-600 text-white' : ''}
                            >Completed</Button>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {filteredTasks.map(task => (
                            <Card key={task.id} className={`transition-all border-l-4 hover:shadow-md ${
                                task.status === 'Pending' ? 'border-l-[#86b027]' : 
                                task.status === 'Submitted' ? 'border-l-emerald-500' : 'border-l-slate-300'
                            }`}>
                                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-lg text-slate-800">{task.title}</h3>
                                            {task.priority === 'High' && <Badge variant="destructive" className="text-[10px]">High Priority</Badge>}
                                            <Badge variant="outline" className="text-[10px] bg-slate-50">{task.related_module}</Badge>
                                        </div>
                                        <p className="text-slate-600 text-sm mb-3">{task.description}</p>
                                        <div className="flex items-center gap-6 text-xs text-slate-400 font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" /> Due: {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No date'}
                                            </span>
                                            {task.completion_date && (
                                                <span className="flex items-center gap-1.5 text-emerald-600">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed: {format(new Date(task.completion_date), 'MMM d, yyyy')}
                                                </span>
                                            )}
                                            {isAuditor && (
                                                <span className="flex items-center gap-1.5 text-[#545454]">
                                                    <Eye className="w-3.5 h-3.5" /> Assignee: {task.assignee_email}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {canEdit && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => { setSelectedTask(task); setIsCommentsOpen(true); }}
                                                title="Discussion"
                                            >
                                                <MessageSquare className="w-5 h-5 text-slate-400" />
                                            </Button>
                                        )}
                                        {task.status === 'Pending' && canEdit ? (
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => { setSelectedTask(task); setIsDelegateOpen(true); }}
                                                    title="Delegate"
                                                >
                                                    <RefreshCw className="w-4 h-4 text-slate-500" />
                                                </Button>
                                                <Button onClick={() => setSelectedTask(task)} className="bg-[#86b027] hover:bg-[#769c22] text-white shadow-md">
                                                    <UploadCloud className="w-4 h-4 mr-2" /> Upload Data
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="outline" disabled className="bg-slate-50 text-slate-400 border-slate-200">
                                                {task.status === 'Pending' ? 'Read Only' : 'View Details'}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {filteredTasks.length === 0 && (
                            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">No tasks found</h3>
                                <p className="text-slate-500">Try adjusting your filters or check back later.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            <Dialog open={!!selectedTask} onOpenChange={(o) => !o && setSelectedTask(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Complete Task</DialogTitle>
                        <CardDescription>{selectedTask?.title}</CardDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-600">
                            {selectedTask?.description}
                        </div>
                        
                        <div className="space-y-3">
                            <Label>Upload Evidence / Document</Label>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-[#86b027] hover:bg-[#86b027]/5 transition-all cursor-pointer relative">
                                <input 
                                    type="file" 
                                    id="task-file" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                    onChange={(e) => setFile(e.target.files[0])}
                                />
                                <div className="flex flex-col items-center pointer-events-none">
                                    {file ? (
                                        <>
                                            <FileText className="w-10 h-10 text-[#86b027] mb-3" />
                                            <span className="font-bold text-slate-700">{file.name}</span>
                                            <span className="text-xs text-slate-400 mt-1">Ready to upload</span>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-10 h-10 text-slate-300 mb-3" />
                                            <span className="font-medium text-slate-600">Click or drag to upload</span>
                                            <span className="text-xs text-slate-400 mt-1">PDF, Excel, PNG supported</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedTask(null)}>Cancel</Button>
                        <Button onClick={() => submitTaskMutation.mutate()} disabled={!file || isUploading} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                             {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit & Complete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Discussion Modal */}
            <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Task Discussion</DialogTitle>
                    </DialogHeader>
                    {selectedTask && (
                        <CommentsSection 
                            entityId={selectedTask.id} 
                            entityType="CCFTask" 
                            currentUserEmail={user?.email} 
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delegate Modal */}
            <Dialog open={isDelegateOpen} onOpenChange={setIsDelegateOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Delegate Task</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-slate-500">Delegate <span className="font-bold text-slate-700">{selectedTask?.title}</span> to another contributor.</p>
                        <div className="space-y-2">
                            <Label>Assign To</Label>
                            <Select value={delegateEmail} onValueChange={setDelegateEmail}>
                                <SelectTrigger><SelectValue placeholder="Select Stakeholder" /></SelectTrigger>
                                <SelectContent>
                                    {allStakeholders.map(s => (
                                        <SelectItem key={s.id} value={s.email}>{s.name} ({s.email})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDelegateOpen(false)}>Cancel</Button>
                        <Button onClick={() => delegateMutation.mutate()} disabled={!delegateEmail} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Delegate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
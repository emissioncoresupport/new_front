import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, Plus, User, Calendar, FileText, Send, Bell, Shield, Users, Trash2, Edit2, Sparkles, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CommentsSection from "@/components/collaboration/CommentsSection";

export default function TaskManager() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isStakeholderOpen, setIsStakeholderOpen] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isReassignOpen, setIsReassignOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [reassignEmail, setReassignEmail] = useState("");
    const [activeTab, setActiveTab] = useState("tasks");
    
    // Task State
    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        assignee_email: "",
        priority: "Medium",
        due_date: ""
    });

    // Stakeholder State
    const [newStakeholder, setNewStakeholder] = useState({
        email: "",
        name: "",
        role: "Contributor",
        organization: "",
        expertise: ""
    });

    const [isSuggesting, setIsSuggesting] = useState(false);
    const queryClient = useQueryClient();

    const suggestAssignee = async () => {
        if (!newTask.title && !newTask.description) {
            toast.error("Please enter a title or description first");
            return;
        }
        setIsSuggesting(true);
        try {
            const stakeholderList = stakeholders.map(s => `${s.name} (${s.email}) - Expertise: ${s.expertise?.join(', ')}`).join('\n');
            
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Given the task "${newTask.title}: ${newTask.description}", suggest the best assignee from this list:\n${stakeholderList}\n. Return JSON with "email" and "reason".`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        email: { type: "string" },
                        reason: { type: "string" }
                    }
                }
            });

            const result = typeof response === 'string' ? JSON.parse(response) : response;
            if (result.email) {
                setNewTask(prev => ({ ...prev, assignee_email: result.email }));
                toast.success(`Suggested ${result.email}: ${result.reason}`);
            } else {
                toast.error("No suitable assignee found");
            }
        } catch (e) {
            toast.error("AI Suggestion failed");
        } finally {
            setIsSuggesting(false);
        }
    };

    // Queries
    const { data: tasks = [] } = useQuery({
        queryKey: ['ccf-tasks'],
        queryFn: () => base44.entities.CCFTask.list('-created_date')
    });

    const { data: stakeholders = [] } = useQuery({
        queryKey: ['stakeholders'],
        queryFn: () => base44.entities.Stakeholder.list()
    });

    const { data: goals = [] } = useQuery({
        queryKey: ['sustainability-goals'],
        queryFn: () => base44.entities.SustainabilityGoal.list()
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const task = await base44.entities.CCFTask.create({ ...data, status: 'Pending' });
            
            // Create Notification
            await base44.entities.Notification.create({
                recipient_email: data.assignee_email,
                type: 'Assignment',
                title: 'New Task Assigned',
                message: `You have been assigned a new task: ${data.title}`,
                related_entity_id: task.id,
                related_entity_type: 'CCFTask',
                created_at: new Date().toISOString()
            });

            // Send Email Alert
            await base44.integrations.Core.SendEmail({
                to: data.assignee_email,
                subject: `New Task Assigned: ${data.title}`,
                body: `You have been assigned a new task on the Carbon Platform.\n\nTask: ${data.title}\nDescription: ${data.description}\nDue Date: ${data.due_date || 'Not set'}\n\nPlease log in to the portal to complete this task.`
            });
            
            return task;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['ccf-tasks']);
            setIsCreateOpen(false);
            setNewTask({ title: "", description: "", assignee_email: "", priority: "Medium", due_date: "" });
            toast.success("Task assigned & notification sent");
        }
    });

    const reassignMutation = useMutation({
        mutationFn: async () => {
            if (!selectedTask || !reassignEmail) return;
            
            await base44.entities.CCFTask.update(selectedTask.id, {
                assignee_email: reassignEmail
            });
            
            // Notify new assignee
            await base44.entities.Notification.create({
                recipient_email: reassignEmail,
                type: 'Assignment',
                title: 'Task Reassigned to You',
                message: `Task "${selectedTask.title}" has been reassigned to you.`,
                related_entity_id: selectedTask.id,
                related_entity_type: 'CCFTask',
                created_at: new Date().toISOString()
            });

            // Send Email Alert to new assignee
            await base44.integrations.Core.SendEmail({
                to: reassignEmail,
                subject: `Task Reassigned to You: ${selectedTask.title}`,
                body: `A task has been reassigned to you.\n\nTask: ${selectedTask.title}\nPrevious Assignee: ${selectedTask.assignee_email}\n\nPlease log in to the portal to review.`
            });

            // Notify previous assignee (optional but good practice)
            await base44.entities.Notification.create({
                recipient_email: selectedTask.assignee_email,
                type: 'Assignment',
                title: 'Task Unassigned',
                message: `Task "${selectedTask.title}" has been reassigned to ${reassignEmail}.`,
                related_entity_id: selectedTask.id,
                related_entity_type: 'CCFTask',
                created_at: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['ccf-tasks']);
            setIsReassignOpen(false);
            setSelectedTask(null);
            setReassignEmail("");
            toast.success("Task reassigned");
        }
    });

    const createStakeholderMutation = useMutation({
        mutationFn: (data) => base44.entities.Stakeholder.create({ 
            ...data, 
            expertise: data.expertise ? data.expertise.split(',').map(s => s.trim()) : [],
            status: 'Active' 
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['stakeholders']);
            setIsStakeholderOpen(false);
            setNewStakeholder({ email: "", name: "", role: "Contributor", organization: "", expertise: "" });
            toast.success("Stakeholder added");
        }
    });

    const deleteStakeholderMutation = useMutation({
        mutationFn: (id) => base44.entities.Stakeholder.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['stakeholders']);
            toast.success("Stakeholder removed");
        }
    });

    // Alerts Logic
    const alerts = {
        completedRecently: tasks.filter(t => t.status === 'Submitted' && new Date(t.completion_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        dueSoon: tasks.filter(t => t.status === 'Pending' && t.due_date && new Date(t.due_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && new Date(t.due_date) > new Date()),
        overdue: tasks.filter(t => t.status === 'Pending' && t.due_date && new Date(t.due_date) < new Date())
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Admin Alerts Section */}
            {(alerts.completedRecently.length > 0 || alerts.dueSoon.length > 0 || alerts.overdue.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {alerts.completedRecently.length > 0 && (
                        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-800">{alerts.completedRecently.length} Tasks Completed</p>
                                    <p className="text-xs text-emerald-600">In the last 7 days</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {alerts.dueSoon.length > 0 && (
                        <Card className="bg-amber-50 border-amber-100 shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-800">{alerts.dueSoon.length} Tasks Due Soon</p>
                                    <p className="text-xs text-amber-600">Due within 3 days</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {alerts.overdue.length > 0 && (
                        <Card className="bg-rose-50 border-rose-100 shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 bg-rose-100 rounded-full text-rose-600">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-rose-800">{alerts.overdue.length} Overdue Tasks</p>
                                    <p className="text-xs text-rose-600">Action required</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Admin Center</h2>
                    <p className="text-slate-500 text-sm">Manage tasks, stakeholders, and permissions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsStakeholderOpen(true)}>
                        <Users className="w-4 h-4 mr-2" /> Add Stakeholder
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                        <Plus className="w-4 h-4 mr-2" /> Assign Task
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="tasks">Task Board</TabsTrigger>
                    <TabsTrigger value="stakeholders">Stakeholders & Permissions</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="space-y-6">
                     <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Task</TableHead>
                                        <TableHead>Goal</TableHead>
                                        <TableHead>Assignee</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tasks.map(task => (
                                        <TableRow key={task.id}>
                                            <TableCell>
                                                <div className="font-medium">{task.title}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{task.description}</div>
                                            </TableCell>
                                            <TableCell>
                                                {task.goal_id && goals.find(g => g.id === task.goal_id) ? (
                                                    <Badge variant="outline" className="text-[10px] bg-slate-50">
                                                        {goals.find(g => g.id === task.goal_id).name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                        {task.assignee_email[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-sm">{task.assignee_email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    task.priority === 'High' ? 'text-red-600 border-red-200 bg-red-50' :
                                                    task.priority === 'Medium' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                                                    'text-[#86b027] border-[#86b027]/30 bg-[#86b027]/10'
                                                }>{task.priority}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={
                                                    task.status === 'Submitted' ? 'bg-emerald-100 text-emerald-700' :
                                                    task.status === 'Approved' ? 'bg-[#86b027]/20 text-[#86b027]' :
                                                    'bg-slate-100 text-slate-700'
                                                }>{task.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-slate-400 hover:text-[#86b027]"
                                                        onClick={() => { setSelectedTask(task); setIsCommentsOpen(true); }}
                                                        title="Comments"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                                                        onClick={() => { setSelectedTask(task); setReassignEmail(task.assignee_email); setIsReassignOpen(true); }}
                                                        title="Reassign"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </Button>
                                                    {task.status === 'Submitted' && (
                                                        <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-200 bg-emerald-50" onClick={() => toast.success("Review flow...")}>
                                                            Review
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="stakeholders" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <Card className="hover:shadow-md hover:shadow-[#86b027]/20 transition-all duration-300 border-l-4 border-l-[#86b027]">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Total Stakeholders</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{stakeholders.length}</div></CardContent>
                        </Card>
                        <Card className="hover:shadow-md hover:shadow-[#86b027]/20 transition-all duration-300 border-l-4 border-l-[#86b027]">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Contributors (Editors)</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-[#86b027]">{stakeholders.filter(s => s.role === 'Contributor').length}</div></CardContent>
                        </Card>
                        <Card className="hover:shadow-md hover:shadow-[#86b027]/20 transition-all duration-300 border-l-4 border-l-[#545454]">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">Auditors</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-[#545454]">{stakeholders.filter(s => s.role === 'Auditor').length}</div></CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Organization</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stakeholders.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{s.name}</TableCell>
                                            <TableCell>{s.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={
                                                    s.role === 'Contributor' ? 'bg-[#86b027]/10 text-[#86b027]' :
                                                    s.role === 'Auditor' ? 'bg-slate-100 text-slate-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }>
                                                    {s.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{s.organization || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => deleteStakeholderMutation.mutate(s.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create Task Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign New Task</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Task Title</Label>
                            <Input 
                                placeholder="e.g. Upload Jan Electricity Bill" 
                                value={newTask.title} 
                                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input 
                                placeholder="Details..." 
                                value={newTask.description} 
                                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Assignee</Label>
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-[#86b027]" onClick={suggestAssignee} disabled={isSuggesting}>
                                    {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                    AI Suggest
                                </Button>
                            </div>
                            <Select value={newTask.assignee_email} onValueChange={(v) => setNewTask({...newTask, assignee_email: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Stakeholder" /></SelectTrigger>
                                <SelectContent>
                                    {stakeholders.map(s => (
                                        <SelectItem key={s.id} value={s.email}>{s.name} ({s.email}) - {s.role}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input 
                                    type="date" 
                                    value={newTask.due_date} 
                                    onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select value={newTask.priority} onValueChange={(v) => setNewTask({...newTask, priority: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Link to Goal (Optional)</Label>
                            <Select value={newTask.goal_id} onValueChange={(v) => setNewTask({...newTask, goal_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Select a Sustainability Goal" /></SelectTrigger>
                                <SelectContent>
                                    {goals.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={() => createMutation.mutate(newTask)} disabled={!newTask.title || !newTask.assignee_email} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                            Assign Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Stakeholder Modal */}
            <Dialog open={isStakeholderOpen} onOpenChange={setIsStakeholderOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Stakeholder</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input 
                                value={newStakeholder.name} 
                                onChange={(e) => setNewStakeholder({...newStakeholder, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input 
                                type="email"
                                value={newStakeholder.email} 
                                onChange={(e) => setNewStakeholder({...newStakeholder, email: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Organization</Label>
                            <Input 
                                value={newStakeholder.organization} 
                                onChange={(e) => setNewStakeholder({...newStakeholder, organization: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Expertise (Comma separated)</Label>
                            <Input 
                                placeholder="e.g. Logistics, Energy, Waste"
                                value={newStakeholder.expertise} 
                                onChange={(e) => setNewStakeholder({...newStakeholder, expertise: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role & Permissions</Label>
                            <Select value={newStakeholder.role} onValueChange={(v) => setNewStakeholder({...newStakeholder, role: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Contributor">Contributor (Can Edit/Upload)</SelectItem>
                                    <SelectItem value="Auditor">Auditor (Read Only + Audit Logs)</SelectItem>
                                    <SelectItem value="Viewer">Viewer (Read Only)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 mt-1">
                                <strong>Contributor:</strong> Can upload evidence and complete tasks.<br/>
                                <strong>Auditor:</strong> Can view all tasks and evidence but cannot edit.<br/>
                                <strong>Viewer:</strong> Restricted read-only access.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsStakeholderOpen(false)}>Cancel</Button>
                        <Button onClick={() => createStakeholderMutation.mutate(newStakeholder)} disabled={!newStakeholder.email} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Add Stakeholder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reassign Dialog */}
            <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Reassign Task</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Current Task</Label>
                            <div className="text-sm font-medium text-slate-700 border p-2 rounded-md bg-slate-50">
                                {selectedTask?.title}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>New Assignee</Label>
                            <Select value={reassignEmail} onValueChange={setReassignEmail}>
                                <SelectTrigger><SelectValue placeholder="Select Stakeholder" /></SelectTrigger>
                                <SelectContent>
                                    {stakeholders.map(s => (
                                        <SelectItem key={s.id} value={s.email}>{s.name} ({s.email})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReassignOpen(false)}>Cancel</Button>
                        <Button onClick={() => reassignMutation.mutate()} className="bg-indigo-600 text-white hover:bg-indigo-700">
                            Confirm Reassignment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Comments Dialog */}
            <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Task Discussion</DialogTitle>
                    </DialogHeader>
                    {selectedTask && (
                        <CommentsSection 
                            entityId={selectedTask.id} 
                            entityType="CCFTask" 
                            currentUserEmail="admin@example.com" // Mock admin email
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ClipboardList, Plus, Calendar as CalendarIcon, AlertCircle, CheckCircle, Clock, User, Send, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function VSMETaskManager({ report }) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['vsme-tasks'],
    queryFn: () => base44.entities.VSMETask.list('-created_date')
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ['vsme-collaborators'],
    queryFn: () => base44.entities.VSMECollaborator.list()
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.VSMETask.create(data),
    onSuccess: async (task) => {
      queryClient.invalidateQueries({ queryKey: ['vsme-tasks'] });
      
      // Send email notification
      try {
        await base44.integrations.Core.SendEmail({
          to: task.assigned_to,
          subject: `New VSME Task Assigned: ${task.title}`,
          body: `You have been assigned a new VSME reporting task:\n\nTask: ${task.title}\nDisclosure: ${task.disclosure_code}\nDue: ${task.due_date}\n\nPlease log in to complete this task.`
        });
      } catch (e) {
        console.error('Email failed:', e);
      }
      
      toast.success('Task created and notification sent');
      setShowNewTask(false);
    }
  });

  const filteredTasks = tasks.filter(t => 
    filterStatus === 'all' || t.status === filterStatus
  );

  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')).length
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Pending</p>
                <h3 className="text-2xl font-bold text-amber-600">{stats.pending}</h3>
              </div>
              <Clock className="w-8 h-8 text-amber-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('in_progress')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">In Progress</p>
                <h3 className="text-2xl font-bold text-[#02a1e8]">{stats.inProgress}</h3>
              </div>
              <ClipboardList className="w-8 h-8 text-[#02a1e8]/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('completed')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Completed</p>
                <h3 className="text-2xl font-bold text-[#86b027]">{stats.completed}</h3>
              </div>
              <CheckCircle className="w-8 h-8 text-[#86b027]/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('overdue')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Overdue</p>
                <h3 className="text-2xl font-bold text-rose-600">{stats.overdue}</h3>
              </div>
              <AlertCircle className="w-8 h-8 text-rose-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
            className={filterStatus === 'all' ? 'bg-[#86b027]' : ''}
          >
            All Tasks
          </Button>
          <Button
            variant={filterStatus === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </Button>
          <Button
            variant={filterStatus === 'overdue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('overdue')}
          >
            Overdue
          </Button>
        </div>
        <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
          <DialogTrigger asChild>
            <Button className="bg-[#86b027] hover:bg-[#769c22]">
              <Plus className="w-4 h-4 mr-2" />
              Assign Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign New VSME Task</DialogTitle>
            </DialogHeader>
            <NewTaskForm 
              collaborators={collaborators}
              onSubmit={(data) => createTaskMutation.mutate(data)}
              isSubmitting={createTaskMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.map(task => (
          <TaskCard key={task.id} task={task} collaborators={collaborators} />
        ))}
        {filteredTasks.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Tasks Found</h3>
              <p className="text-sm text-slate-500">Assign tasks to collaborators to track VSME data collection</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function NewTaskForm({ collaborators, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    disclosure_code: '',
    task_type: 'data_collection',
    priority: 'medium',
    due_date: null
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.assigned_to || !formData.due_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Task Title *</Label>
        <Input
          placeholder="e.g., Provide B3 Energy Consumption Data"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Disclosure Code *</Label>
          <Input
            placeholder="e.g., B3, C5"
            value={formData.disclosure_code}
            onChange={(e) => setFormData({ ...formData, disclosure_code: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Task Type *</Label>
          <Select value={formData.task_type} onValueChange={(value) => setFormData({ ...formData, task_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data_collection">Data Collection</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="approval">Approval</SelectItem>
              <SelectItem value="upload_evidence">Upload Evidence</SelectItem>
              <SelectItem value="narrative_input">Narrative Input</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Assign To *</Label>
          <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select collaborator" />
            </SelectTrigger>
            <SelectContent>
              {collaborators.map(c => (
                <SelectItem key={c.id} value={c.email}>
                  {c.name} ({c.department})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority *</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Due Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {formData.due_date ? format(new Date(formData.due_date), 'PPP') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.due_date ? new Date(formData.due_date) : undefined}
              onSelect={(date) => setFormData({ ...formData, due_date: date })}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Detailed task instructions..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-[100px]"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-[#86b027] hover:bg-[#769c22]"
      >
        <Send className="w-4 h-4 mr-2" />
        Assign Task & Notify
      </Button>
    </div>
  );
}

function TaskCard({ task, collaborators }) {
  const queryClient = useQueryClient();
  const collaborator = collaborators.find(c => c.email === task.assigned_to);
  
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  const updateStatusMutation = useMutation({
    mutationFn: (status) => base44.entities.VSMETask.update(task.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsme-tasks'] });
      toast.success('Task status updated');
    }
  });

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-[#86b027]/10 text-[#86b027]',
    overdue: 'bg-rose-100 text-rose-700'
  };

  const priorityColors = {
    low: 'border-slate-300',
    medium: 'border-amber-300',
    high: 'border-orange-400',
    urgent: 'border-rose-500'
  };

  return (
    <Card className={`border-l-4 ${priorityColors[task.priority]} ${isOverdue ? 'bg-rose-50/30' : ''}`}>
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
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {collaborator?.name || task.assigned_to}
              </span>
              {task.due_date && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-bold' : ''}`}>
                  <CalendarIcon className="w-3 h-3" />
                  Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                </span>
              )}
              <Badge variant="outline" className="text-xs">{task.task_type.replace('_', ' ')}</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge className={statusColors[isOverdue ? 'overdue' : task.status]}>
              {isOverdue ? 'Overdue' : task.status.replace('_', ' ')}
            </Badge>
            <Select value={task.status} onValueChange={(value) => updateStatusMutation.mutate(value)}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
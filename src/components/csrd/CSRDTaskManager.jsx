import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, CheckCircle2, Clock, AlertCircle, User, Calendar, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import CSRDTaskModal from './CSRDTaskModal';

export default function CSRDTaskManager() {
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['csrd-tasks'],
    queryFn: () => base44.entities.CSRDTask.list('-created_date')
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterAssignee !== 'all' && t.assigned_to !== filterAssignee) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'approved').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'approved').length
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { bg: 'bg-slate-500', icon: Clock },
      in_progress: { bg: 'bg-blue-500', icon: AlertCircle },
      submitted: { bg: 'bg-amber-500', icon: FileText },
      under_review: { bg: 'bg-purple-500', icon: User },
      approved: { bg: 'bg-emerald-500', icon: CheckCircle2 },
      rejected: { bg: 'bg-rose-500', icon: AlertCircle }
    };
    const config = configs[status] || configs.pending;
    return <Badge className={config.bg}>{status.replace('_', ' ')}</Badge>;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'border-rose-500 bg-rose-50',
      high: 'border-amber-500 bg-amber-50',
      medium: 'border-blue-500 bg-blue-50',
      low: 'border-slate-500 bg-slate-50'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extralight text-slate-900 mb-1">CSRD Task Management</h2>
            <p className="text-sm text-slate-500 font-light">Assign and track CSRD data collection and reporting tasks</p>
          </div>
          <button 
            type="button"
            onClick={() => setShowModal(true)} 
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 font-light text-sm tracking-wide"
          >
            <Plus className="w-4 h-4 stroke-[1.5]" />
            Create Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Total Tasks</p>
          <p className="text-4xl font-extralight text-slate-900">{stats.total}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Pending</p>
          <p className="text-4xl font-extralight text-slate-600">{stats.pending}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">In Progress</p>
          <p className="text-4xl font-extralight text-[#02a1e8]">{stats.inProgress}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Completed</p>
          <p className="text-4xl font-extralight text-emerald-600">{stats.completed}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Overdue</p>
          <p className="text-4xl font-extralight text-rose-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filtered.map(task => {
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'approved';
          const supplier = task.supplier_id ? suppliers.find(s => s.id === task.supplier_id) : null;

          return (
            <div key={task.id} className={`relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border-l-4 border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden ${getPriorityColor(task.priority)}`}>
              <div className="relative p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-light text-slate-900">{task.title}</h4>
                      {getStatusBadge(task.status)}
                      <Badge variant="outline" className="text-xs">{task.task_type}</Badge>
                      {isOverdue && <Badge className="bg-rose-500">Overdue</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{task.assigned_to}</span>
                        {task.assignee_type === 'external' && <Badge variant="outline" className="ml-1 text-xs">External</Badge>}
                        {supplier && <span className="ml-1">({supplier.legal_name})</span>}
                      </div>
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {task.esrs_standard && (
                        <Badge variant="outline" className="text-xs">{task.esrs_standard}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-light">No tasks found</p>
          </div>
        )}
      </div>

      <CSRDTaskModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
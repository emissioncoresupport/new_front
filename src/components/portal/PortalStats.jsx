import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, FileText, AlertTriangle } from "lucide-react";

export default function PortalStats({ tasks, supplier }) {
  const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const completed = tasks.filter(t => t.status === 'completed' || t.status === 'verified').length;
  const overdue = tasks.filter(t => t.status !== 'completed' && new Date(t.due_date) < new Date()).length;
  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="border-slate-100 shadow-sm bg-white hover:shadow-md transition-all rounded-2xl group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#545454]/70 uppercase tracking-wider">Pending Tasks</p>
              <p className="text-4xl font-extrabold text-[#545454] mt-2">{pending}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#02a1e8]/10 text-[#02a1e8] group-hover:bg-[#02a1e8] group-hover:text-white transition-colors">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-sm bg-white hover:shadow-md transition-all rounded-2xl group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#545454]/70 uppercase tracking-wider">Completion Rate</p>
              <p className="text-4xl font-extrabold text-[#545454] mt-2">{completionRate}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#86b027]/10 text-[#86b027] group-hover:bg-[#86b027] group-hover:text-white transition-colors">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-sm bg-white hover:shadow-md transition-all rounded-2xl group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#545454]/70 uppercase tracking-wider">Documents</p>
              <p className="text-4xl font-extrabold text-[#545454] mt-2">
                {tasks.filter(t => t.task_type === 'documentation').length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#02a1e8]/10 text-[#02a1e8] group-hover:bg-[#02a1e8] group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-sm bg-white hover:shadow-md transition-all rounded-2xl group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#545454]/70 uppercase tracking-wider">Overdue</p>
              <p className="text-4xl font-extrabold text-[#545454] mt-2">{overdue}</p>
            </div>
            <div className={cn(
              "p-4 rounded-2xl transition-colors",
              overdue > 0 
                ? "bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white" 
                : "bg-slate-50 text-slate-400 group-hover:bg-slate-400 group-hover:text-white"
            )}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
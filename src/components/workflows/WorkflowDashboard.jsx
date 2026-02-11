import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, CheckCircle2, AlertCircle, Clock, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function WorkflowDashboard({ onCreateWorkflow }) {
  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => base44.entities.WorkflowAutomation.list()
  });

  const { data: executions = [] } = useQuery({
    queryKey: ['workflow-executions'],
    queryFn: () => base44.entities.WorkflowExecution.list('-created_date', 50)
  });

  const activeWorkflows = workflows.filter(w => w.status === 'active').length;
  const totalExecutions = executions.length;
  const successRate = executions.length > 0 
    ? (executions.filter(e => e.status === 'completed').length / executions.length * 100).toFixed(1)
    : 0;
  const recentExecutions = executions.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Workflows</p>
                <p className="text-3xl font-bold text-[#86b027] mt-1">{activeWorkflows}</p>
              </div>
              <Activity className="w-10 h-10 text-[#86b027]/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Executions</p>
                <p className="text-3xl font-bold text-slate-700 mt-1">{totalExecutions}</p>
              </div>
              <Zap className="w-10 h-10 text-slate-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Success Rate</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{successRate}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-emerald-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">AI-Enhanced</p>
                <p className="text-3xl font-bold text-[#02a1e8] mt-1">
                  {workflows.filter(w => w.ai_enabled).length}
                </p>
              </div>
              <Zap className="w-10 h-10 text-[#02a1e8]/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      {workflows.length === 0 && (
        <Card className="bg-gradient-to-br from-[#86b027]/5 to-white border-[#86b027]/20">
          <CardContent className="p-8 text-center">
            <Activity className="w-16 h-16 mx-auto mb-4 text-[#86b027]" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">Get Started with Workflow Automation</h3>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Connect your modules with AI-driven workflows. Automate emissions calculations, gap detection, compliance checks, and more.
            </p>
            <Button onClick={onCreateWorkflow} className="bg-[#86b027] hover:bg-[#769c22]">
              Create Your First Workflow
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Executions */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Recent Workflow Executions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentExecutions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No workflow executions yet</p>
          ) : (
            <div className="space-y-3">
              {recentExecutions.map((execution) => (
                <div key={execution.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {execution.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : execution.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm text-slate-700">{execution.workflow_name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(execution.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {execution.execution_time_ms && (
                      <span className="text-xs text-slate-500">{execution.execution_time_ms}ms</span>
                    )}
                    <Badge variant={execution.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {execution.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkflowExecutionLog() {
  const { data: executions = [] } = useQuery({
    queryKey: ['workflow-executions'],
    queryFn: () => base44.entities.WorkflowExecution.list('-created_date', 100)
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-rose-600" />;
      default: return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle>Workflow Execution History</CardTitle>
      </CardHeader>
      <CardContent>
        {executions.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No workflow executions yet</p>
        ) : (
          <div className="space-y-2">
            {executions.map((execution) => (
              <div key={execution.id} className="border border-slate-100 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(execution.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-slate-700">{execution.workflow_name}</h4>
                        <Badge variant={execution.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {execution.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        {new Date(execution.created_date).toLocaleString()}
                      </p>
                      {execution.ai_analysis && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-slate-700 mb-2">
                          <span className="font-medium">AI Analysis:</span> {execution.ai_analysis}
                        </div>
                      )}
                      {execution.actions_performed && execution.actions_performed.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {execution.actions_performed.map((action, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px]">{action}</Badge>
                          ))}
                        </div>
                      )}
                      {execution.error_message && (
                        <p className="text-xs text-rose-600 mt-2">{execution.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {execution.execution_time_ms && <span>{execution.execution_time_ms}ms</span>}
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
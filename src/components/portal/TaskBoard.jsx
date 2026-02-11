import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, Upload, CheckCircle, Clock, AlertCircle, 
  ExternalLink, ChevronRight, Database
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DocumentUploader from './DocumentUploader';
import QuestionnaireForm from './QuestionnaireForm';

export default function TaskBoard({ tasks, supplier, limit }) {
  const [activeQuestionnaire, setActiveQuestionnaire] = useState(null);
  const displayTasks = limit ? tasks.slice(0, limit) : tasks;

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
        <CheckCircle className="w-12 h-12 text-lime-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-900">All Caught Up!</h3>
        <p className="text-slate-500 mt-1">You have no pending tasks at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayTasks.map((task) => (
        <Card key={task.id} className={cn(
          "border transition-all duration-200",
          task.status === 'completed' || task.status === 'verified' 
            ? "bg-slate-50/50 border-slate-100" 
            : "bg-white border-slate-200 hover:border-sky-200 hover:shadow-md"
        )}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                "p-3 rounded-xl shrink-0",
                task.status === 'completed' || task.status === 'verified' ? "bg-lime-100 text-lime-600" :
                task.status === 'overdue' || task.status === 'failed' ? "bg-rose-100 text-rose-600" :
                task.task_type === 'documentation' ? "bg-amber-100 text-amber-600" :
                task.task_type === 'questionnaire' ? "bg-purple-100 text-purple-600" :
                "bg-sky-100 text-sky-600"
              )}>
                {task.status === 'completed' || task.status === 'verified' ? <CheckCircle className="w-6 h-6" /> :
                 task.task_type === 'documentation' ? <Upload className="w-6 h-6" /> :
                 task.task_type === 'questionnaire' ? <FileText className="w-6 h-6" /> :
                 task.task_type === 'database_check' || task.task_type === 'verification' ? <Database className="w-6 h-6" /> :
                 <AlertCircle className="w-6 h-6" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <h4 className={cn(
                    "text-base font-semibold",
                    task.status === 'completed' ? "text-slate-500" : "text-slate-900"
                  )}>
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn(
                      "capitalize",
                      task.status === 'completed' || task.status === 'verified' ? "bg-lime-100 text-lime-700 hover:bg-lime-100" :
                      task.status === 'pending' ? "bg-slate-100 text-slate-600" :
                      task.status === 'overdue' || task.status === 'failed' ? "bg-rose-100 text-rose-700" :
                      "bg-sky-100 text-sky-700"
                    )}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                    {task.due_date && task.status !== 'completed' && (
                      <span className={cn(
                        "text-xs font-medium",
                        new Date(task.due_date) < new Date() ? "text-rose-600" : "text-slate-500"
                      )}>
                        Due {format(new Date(task.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 mb-4">{task.description}</p>

                {/* Actions based on task type */}
                {(task.status === 'pending' || task.status === 'in_progress' || task.status === 'sent') && (
                  <div className="mt-4">
                    {task.task_type === 'documentation' || task.task_type === 'test_report_request' ? (
                      <DocumentUploader task={task} supplier={supplier} />
                    ) : task.task_type === 'questionnaire' ? (
                      <Button 
                        className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
                        onClick={() => setActiveQuestionnaire(task)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Start Questionnaire
                      </Button>
                    ) : (
                      <div className="flex items-center text-sm text-sky-600 bg-sky-50 px-3 py-2 rounded-lg">
                        <Clock className="w-4 h-4 mr-2" />
                        Processing automatically...
                      </div>
                    )}
                  </div>
                )}
                
                {task.uploaded_documents && task.uploaded_documents.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.uploaded_documents.map((doc, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-2 text-xs px-2 py-1.5 rounded border transition-colors",
                        doc.analysis?.verification?.is_valid 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                          : doc.analysis?.verification?.issues?.length > 0 
                            ? "bg-rose-50 border-rose-200 text-rose-700"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                      )}>
                        <FileText className="w-3 h-3" />
                        <div className="flex flex-col">
                          <span className="font-medium max-w-[150px] truncate">{doc.name || 'Document'}</span>
                          {doc.analysis?.extracted_info && (
                            <span className="text-[10px] opacity-80">
                              {doc.analysis.extracted_info.certificate_number || doc.analysis.extracted_info.document_type}
                            </span>
                          )}
                        </div>
                        {doc.analysis?.verification ? (
                          doc.analysis.verification.is_valid ? (
                             <CheckCircle className="w-3 h-3 ml-1 flex-shrink-0" />
                          ) : (
                             <AlertCircle className="w-3 h-3 ml-1 flex-shrink-0" />
                          )
                        ) : (
                          <Clock className="w-3 h-3 ml-1 flex-shrink-0 text-slate-400" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {limit && tasks.length > limit && (
        <Button variant="outline" className="w-full text-slate-500" onClick={() => document.querySelector('[value="tasks"]').click()}>
          View all {tasks.length} tasks
        </Button>
      )}

      {activeQuestionnaire && (
        <QuestionnaireForm
          task={activeQuestionnaire}
          supplier={supplier}
          open={true}
          onOpenChange={(open) => !open && setActiveQuestionnaire(null)}
        />
      )}
    </div>
  );
}
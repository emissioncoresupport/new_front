import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Calendar } from "lucide-react";

export default function StakeholderEvidenceViewer({ consents, tasks }) {
  const tasksWithEvidence = tasks.filter(t => t.document_urls && t.document_urls.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Evidence & Documents</CardTitle>
          <p className="text-sm text-slate-600">Documents submitted by external stakeholders</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasksWithEvidence.map(task => {
              const consent = consents.find(c => c.stakeholder_email === task.assigned_to);
              
              return (
                <div key={task.id} className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-[#545454]">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-600">{task.assigned_to}</span>
                        {consent && (
                          <Badge variant="outline" className="text-xs">
                            {consent.stakeholder_type}
                          </Badge>
                        )}
                        <Badge className={
                          task.status === 'approved' ? 'bg-emerald-500' :
                          task.status === 'submitted' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                    {task.completed_date && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.completed_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 font-semibold">Uploaded Documents:</p>
                    {task.document_urls.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#02a1e8]" />
                          <span className="text-sm font-medium">
                            Document {idx + 1}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `evidence_${idx + 1}`;
                              a.click();
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {task.ai_extracted_data && (
                    <div className="mt-3 p-3 bg-[#86b027]/10 rounded">
                      <p className="text-xs text-[#86b027] font-semibold mb-1">AI Extracted Data:</p>
                      <pre className="text-xs text-slate-700 overflow-auto">
                        {JSON.stringify(task.ai_extracted_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}

            {tasksWithEvidence.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No evidence uploaded yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Documents will appear here once stakeholders submit them via their portal
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, Circle, AlertTriangle, ArrowRight, 
  Database, Users, FileCheck, Send, Clock
} from "lucide-react";

/**
 * CBAM Compliance Workflow Engine
 * Orchestrates the end-to-end CBAM compliance process per EU Regulation 2023/956
 * 
 * Workflow Steps:
 * 1. Data Collection (Import entries, supplier data)
 * 2. Supplier Engagement (Request emissions data)
 * 3. Data Validation (AI + Manual review)
 * 4. Report Generation (Quarterly XML + PDF)
 * 5. Internal Review & Approval
 * 6. Submission to Registry (National Competent Authority)
 * 7. Post-Submission Tracking
 */

export default function CBAMWorkflowEngine({ entries, reports, suppliers }) {
  // Calculate workflow status
  const currentQuarter = "Q4-2025";
  const quarterlyEntries = entries.filter(e => {
    if (!e.import_date) return false;
    const date = new Date(e.import_date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const q = month < 3 ? "Q1" : month < 6 ? "Q2" : month < 9 ? "Q3" : "Q4";
    return `${q}-${year}` === currentQuarter;
  });

  const validatedEntries = quarterlyEntries.filter(e => 
    e.validation_status === 'ai_validated' || e.validation_status === 'manual_verified'
  );
  
  const pendingSuppliers = quarterlyEntries.filter(e => 
    !e.verification_status || e.verification_status === 'not_verified'
  ).length;

  const currentReport = reports.find(r => r.reporting_period === currentQuarter);
  
  const steps = [
    {
      id: 1,
      name: "Data Collection",
      description: "Import customs data, link suppliers & installations",
      status: quarterlyEntries.length > 0 ? 'completed' : 'pending',
      progress: Math.min(100, (quarterlyEntries.length / 50) * 100),
      icon: Database,
      actions: ['Import customs declarations', 'Link to SupplyLens SKUs', 'Map CN codes'],
      metrics: {
        total: quarterlyEntries.length,
        target: 50
      }
    },
    {
      id: 2,
      name: "Supplier Engagement",
      description: "Request verified emissions data from operators",
      status: pendingSuppliers === 0 ? 'completed' : pendingSuppliers < quarterlyEntries.length ? 'in_progress' : 'pending',
      progress: quarterlyEntries.length > 0 ? ((quarterlyEntries.length - pendingSuppliers) / quarterlyEntries.length) * 100 : 0,
      icon: Users,
      actions: ['Send data requests', 'Track submissions', 'Follow up'],
      metrics: {
        responded: quarterlyEntries.length - pendingSuppliers,
        total: quarterlyEntries.length
      }
    },
    {
      id: 3,
      name: "Data Validation",
      description: "AI-powered validation against benchmarks",
      status: validatedEntries.length === quarterlyEntries.length && quarterlyEntries.length > 0 ? 'completed' : 
              validatedEntries.length > 0 ? 'in_progress' : 'pending',
      progress: quarterlyEntries.length > 0 ? (validatedEntries.length / quarterlyEntries.length) * 100 : 0,
      icon: FileCheck,
      actions: ['Run AI validation', 'Manual review flags', 'Approve entries'],
      metrics: {
        validated: validatedEntries.length,
        total: quarterlyEntries.length
      }
    },
    {
      id: 4,
      name: "Report Generation",
      description: "Generate official quarterly CBAM report",
      status: currentReport && currentReport.status !== 'draft' ? 'completed' : 
              currentReport ? 'in_progress' : 'pending',
      progress: currentReport ? 50 : 0,
      icon: FileCheck,
      actions: ['Generate XML', 'Create PDF summary', 'Internal review'],
      metrics: {
        status: currentReport?.status || 'Not Started'
      }
    },
    {
      id: 5,
      name: "Submission",
      description: "Submit to EU Transitional Registry",
      status: currentReport?.status === 'submitted' || currentReport?.status === 'accepted' ? 'completed' : 'pending',
      progress: currentReport?.status === 'submitted' ? 100 : 0,
      icon: Send,
      actions: ['Validate XML', 'Submit to registry', 'Receive confirmation'],
      metrics: {
        deadline: "31 Jan 2026"
      }
    }
  ];

  const getStepStatus = (status) => {
    switch(status) {
      case 'completed': return { color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' };
      case 'in_progress': return { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' };
      default: return { color: 'text-slate-400', bg: 'bg-slate-100', border: 'border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Progress Overview */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-4 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                CBAM Compliance Workflow
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                End-to-end process for {currentQuarter} reporting period
              </p>
            </div>
            <Badge className="bg-[#86b027] text-white text-sm">
              <Clock className="w-3 h-3 mr-1" />
              Deadline: 31 Jan 2026
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {steps.map((step, index) => {
              const styles = getStepStatus(step.status);
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="relative">
                  {index < steps.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-slate-200 -mb-6" />
                  )}
                  
                  <div className="flex gap-4">
                    <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${styles.bg} ${styles.border} border-2 flex items-center justify-center`}>
                      {step.status === 'completed' ? (
                        <CheckCircle2 className={`w-6 h-6 ${styles.color}`} />
                      ) : step.status === 'in_progress' ? (
                        <Icon className={`w-5 h-5 ${styles.color} animate-pulse`} />
                      ) : (
                        <Circle className={`w-5 h-5 ${styles.color}`} />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">{step.name}</h3>
                          <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                        </div>
                        <Badge variant="outline" className={`${styles.color} ${styles.border}`}>
                          {step.status === 'completed' ? 'Complete' : 
                           step.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </Badge>
                      </div>
                      
                      {/* Progress Bar */}
                      {step.progress > 0 && (
                        <div className="mt-3 mb-2">
                          <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span>Progress</span>
                            <span className="font-mono">{Math.round(step.progress)}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${styles.bg} transition-all duration-500`}
                              style={{ width: `${step.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Metrics */}
                      <div className="mt-3 flex items-center gap-4 text-xs">
                        {step.metrics.total !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Entries:</span>
                            <span className="font-mono font-bold text-slate-700">
                              {step.metrics.validated || step.metrics.responded || step.metrics.total}/{step.metrics.total}
                            </span>
                          </div>
                        )}
                        {step.metrics.status && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Status:</span>
                            <span className="font-semibold text-slate-700">{step.metrics.status}</span>
                          </div>
                        )}
                        {step.metrics.deadline && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span className="font-semibold text-amber-700">{step.metrics.deadline}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Quick Actions */}
                      {step.status === 'in_progress' && (
                        <div className="mt-3 flex gap-2">
                          {step.actions.slice(0, 2).map((action, idx) => (
                            <Button 
                              key={idx}
                              variant="outline" 
                              size="sm"
                              className="text-xs"
                            >
                              {action}
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {validatedEntries.length < quarterlyEntries.length && quarterlyEntries.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-slate-700">
            <strong>{quarterlyEntries.length - validatedEntries.length} entries pending validation</strong> - 
            Run AI validation and manual review before report generation.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
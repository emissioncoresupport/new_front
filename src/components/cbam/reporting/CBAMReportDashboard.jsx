import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, Plus, Search, Download, Send, AlertTriangle,
  CheckCircle2, Clock, Eye, Edit, Trash2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CBAMUnifiedReportWorkflow from './CBAMUnifiedReportWorkflow';
import CBAMSubmissionPortal from './CBAMSubmissionPortal';
import CBAMAutomatedReportEngine from './CBAMAutomatedReportEngine';
import { getCurrentCompany } from '@/components/utils/multiTenant';

export default function CBAMReportDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  const [showReportEngine, setShowReportEngine] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ['current-company'],
    queryFn: getCurrentCompany
  });

  // Fetch reports
  const { data: allReports = [] } = useQuery({
    queryKey: ['cbam-reports'],
    queryFn: () => base44.entities.CBAMReport.list('-reporting_period')
  });
  
  const reports = allReports.filter(r => !company || r.company_id === company.id || r.created_by === company.id);

  // Fetch entries for report generation
  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CBAMReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
      toast.success('Report deleted');
    }
  });

  const filteredReports = reports.filter(r => 
    r.reporting_period?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.eori_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch(status) {
      case 'submitted':
      case 'accepted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-0">Submitted</Badge>;
      case 'validated':
        return <Badge className="bg-blue-100 text-blue-700 border-0">Ready</Badge>;
      case 'draft':
        return <Badge className="bg-slate-100 text-slate-700 border-0">Draft</Badge>;
      case 'rejected':
      case 'requires_correction':
        return <Badge className="bg-red-100 text-red-700 border-0">Needs Correction</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Clean Header */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-slate-900">CBAM Reports & Submission</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate, validate and submit quarterly CBAM reports
            </p>
          </div>
          <Button 
            onClick={() => {
              setSelectedPeriod('Q1-2026');
              setShowGenerator(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Clean Search */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by period or EORI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-slate-200 bg-white"
            />
          </div>
          <Button variant="outline" className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 px-3 text-sm shadow-none">
            <Download className="w-3.5 h-3.5 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Clean Reports List */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="px-5 py-4 border-b border-slate-200/60">
          <h3 className="text-sm font-medium text-slate-900">Quarterly Reports</h3>
        </div>
        <div className="p-5">
          {filteredReports.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-base font-medium text-slate-900 mb-2">No Reports Generated</h3>
              <p className="text-sm text-slate-500 mb-6">Create your first quarterly CBAM report</p>
              <Button 
                onClick={() => {
                  setSelectedPeriod('Q1-2026');
                  setShowGenerator(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-2" />
                Generate Report
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => (
                <div 
                  key={report.id}
                  className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-base font-medium text-slate-900">
                          {report.reporting_period}
                        </h3>
                        {getStatusBadge(report.status)}
                        {report.submission_deadline && new Date(report.submission_deadline) < new Date() && 
                         report.status !== 'submitted' && (
                          <Badge className="bg-red-100 text-red-700 border-0">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">EORI:</span>
                          <span className="ml-2 font-mono font-semibold text-slate-900">
                            {report.eori_number}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Imports:</span>
                          <span className="ml-2 font-bold text-slate-900">
                            {report.total_imports_count || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Emissions:</span>
                          <span className="ml-2 font-bold text-emerald-700">
                            {(report.total_embedded_emissions || 0).toFixed(2)} tCO2e
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Deadline:</span>
                          <span className="ml-2 font-semibold text-slate-900 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {report.submission_deadline ? 
                              new Date(report.submission_deadline).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {report.registry_confirmation_number && (
                        <div className="mt-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-600" />
                          Confirmation: <span className="font-mono">{report.registry_confirmation_number}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setShowReportEngine(true);
                        }}
                        className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-8 px-3 text-xs shadow-none"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Generate
                      </Button>
                      {report.status !== 'submitted' && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowSubmission(true);
                          }}
                          disabled={report.status !== 'validated'}
                          className="bg-slate-900 hover:bg-slate-800 text-white h-8 px-3 text-xs shadow-sm"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Submit
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteMutation.mutate(report.id)}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 h-8 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unified Report Workflow */}
      {showGenerator && (
        <CBAMUnifiedReportWorkflow
          period={selectedPeriod}
          entries={entries}
          onComplete={(report) => {
            setShowGenerator(false);
            if (report) {
              queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
            }
          }}
        />
      )}

      {/* Report Engine Modal */}
      <Dialog open={showReportEngine} onOpenChange={setShowReportEngine}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate PDF & XML Reports</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <CBAMAutomatedReportEngine
              reportId={selectedReport.id}
              entries={entries.filter(e => selectedReport.linked_entries?.includes(e.id))}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Submission Portal Modal */}
      <Dialog open={showSubmission} onOpenChange={setShowSubmission}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit to Registry</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <CBAMSubmissionPortal
              report={selectedReport}
              onSubmitted={() => {
                setShowSubmission(false);
                setSelectedReport(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
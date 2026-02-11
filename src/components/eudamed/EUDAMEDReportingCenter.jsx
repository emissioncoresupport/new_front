import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Send, Download, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import EUDAMEDReportGenerator from './EUDAMEDReportGenerator';
import { submitToEUDAMED, downloadXMLFile, generateAndDownloadPDF, validateBeforeSubmission } from './EUDAMEDSubmissionService';

export default function EUDAMEDReportingCenter() {
  const [activeReportType, setActiveReportType] = useState('MIR');
  const [showGenerator, setShowGenerator] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ['eudamed-reports'],
    queryFn: () => base44.entities.EUDAMEDReport.list('-submission_date')
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['eudamed-incidents'],
    queryFn: () => base44.entities.EUDAMEDIncident.list()
  });

  const reportTypes = [
    { id: 'MIR', label: 'Manufacturer Incident Report', color: 'rose' },
    { id: 'FSCA', label: 'Field Safety Corrective Action', color: 'amber' },
    { id: 'FSN', label: 'Field Safety Notice', color: 'orange' },
    { id: 'PSUR', label: 'Periodic Safety Update', color: 'blue' },
    { id: 'SAE', label: 'Serious Adverse Event', color: 'purple' }
  ];

  const getStatusBadge = (status) => {
    const configs = {
      draft: { bg: 'bg-slate-500', label: 'Draft' },
      validated: { bg: 'bg-[#02a1e8]', label: 'Validated' },
      submitted: { bg: 'bg-[#86b027]', label: 'Submitted' },
      accepted: { bg: 'bg-emerald-500', label: 'Accepted' },
      rejected: { bg: 'bg-rose-500', label: 'Rejected' }
    };
    const config = configs[status] || configs.draft;
    return <Badge className={config.bg}>{config.label}</Badge>;
  };

  const handleSubmit = async (report) => {
    const validation = await validateBeforeSubmission(report);
    
    if (!validation.can_submit) {
      toast.error(validation.message);
      return;
    }

    toast.loading('Submitting to EUDAMED...');
    try {
      const result = await submitToEUDAMED(report);
      toast.dismiss();
      toast.success(`Submitted! Confirmation: ${result.confirmation_number}`);
    } catch (error) {
      toast.dismiss();
      toast.error('Submission failed. Download XML for manual upload.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[#545454]">EUDAMED Reporting Center</h2>
          <p className="text-sm text-slate-600">Generate, validate, and submit MDR/IVDR compliant reports</p>
        </div>
        <Button onClick={() => setShowGenerator(true)} className="bg-[#86b027] hover:bg-[#769c22]">
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Report Type Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {reportTypes.map(type => {
          const count = reports.filter(r => r.report_type?.includes(type.id)).length;
          return (
            <Card key={type.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-[#545454]">{count}</p>
                <p className="text-xs text-slate-600 mt-1">{type.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#545454]">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-[#545454]">{report.report_type}</h4>
                    {getStatusBadge(report.submission_status)}
                  </div>
                  <p className="text-sm text-slate-600">Ref: {report.report_reference}</p>
                  {report.submission_date && (
                    <p className="text-xs text-slate-500 mt-1">
                      Submitted: {new Date(report.submission_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {report.xml_content && (
                    <Button size="sm" variant="outline" onClick={() => downloadXMLFile(report)}>
                      <Download className="w-4 h-4 mr-1" />
                      XML
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => generateAndDownloadPDF(report)}>
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                  {report.submission_status === 'validated' && (
                    <Button size="sm" className="bg-[#86b027] hover:bg-[#769c22]" onClick={() => handleSubmit(report)}>
                      <Send className="w-4 h-4 mr-1" />
                      Submit
                    </Button>
                  )}
                  {report.submission_status === 'submitted' && report.submitted_to_authorities?.[0]?.confirmation_number && (
                    <Button size="sm" variant="outline" className="text-emerald-600">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      {report.submitted_to_authorities[0].confirmation_number}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <EUDAMEDReportGenerator open={showGenerator} onOpenChange={setShowGenerator} />
    </div>
  );
}
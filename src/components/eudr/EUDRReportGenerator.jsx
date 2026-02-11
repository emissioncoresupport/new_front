import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import UsageMeteringService from '@/components/billing/UsageMeteringService';
import { 
  FileText, 
  Download, 
  Send, 
  Clock, 
  Calendar,
  Settings,
  Sparkles,
  Loader2,
  CheckCircle2,
  Mail,
  Server,
  Plus
} from "lucide-react";

export default function EUDRReportGenerator() {
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();

  const { data: ddsRecords = [] } = useQuery({
    queryKey: ['eudr-dds-reports'],
    queryFn: () => base44.entities.EUDRDDS.list()
  });

  const { data: plots = [] } = useQuery({
    queryKey: ['eudr-plots-reports'],
    queryFn: () => base44.entities.EUDRPlot.list()
  });

  const { data: satelliteAnalyses = [] } = useQuery({
    queryKey: ['eudr-satellite-reports'],
    queryFn: () => base44.entities.EUDRSatelliteAnalysis.list()
  });

  const generateReportMutation = useMutation({
    mutationFn: async ({ ddsId, template, deliveryMethod, recipient }) => {
      setIsGenerating(true);
      toast.loading('Generating compliance report...');

      const dds = ddsRecords.find(d => d.id === ddsId);
      const ddsPlots = plots.filter(p => p.dds_reference === dds.dds_reference);
      const ddsAnalyses = satelliteAnalyses.filter(a => 
        ddsPlots.some(p => p.plot_id === a.plot_id)
      );

      // Fetch real-time customs data (simulated)
      const customsPrompt = `Fetch latest customs clearance status for DDS ${dds.dds_reference}. 
      HS Code: ${dds.hs_code}, Quantity: ${dds.quantity} ${dds.unit}. 
      Provide: clearance_status, customs_reference, inspection_notes, clearance_date`;

      const customsData = await base44.integrations.Core.InvokeLLM({
        prompt: customsPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            clearance_status: { type: "string" },
            customs_reference: { type: "string" },
            inspection_notes: { type: "string" },
            clearance_date: { type: "string" }
          }
        }
      });

      // Generate comprehensive report
      const reportPrompt = `Generate comprehensive EUDR compliance report:

DDS Information:
- Reference: ${dds.dds_reference}
- Commodity: ${dds.commodity_description}
- HS Code: ${dds.hs_code}
- Quantity: ${dds.quantity} ${dds.unit}
- Risk Level: ${dds.risk_level}
- Risk Score: ${dds.risk_score}/100
- Status: ${dds.status}

Geolocation Data:
- Total Plots: ${ddsPlots.length}
- Verified Plots: ${ddsPlots.filter(p => p.satellite_verification_status === "Pass").length}
- Deforestation Detected: ${ddsPlots.filter(p => p.deforestation_detected).length}

Satellite Verification:
- Analyses Conducted: ${ddsAnalyses.length}
- AI Confidence: ${ddsAnalyses.reduce((acc, a) => acc + (a.confidence_score || 0), 0) / ddsAnalyses.length}%

Customs Data:
- Status: ${customsData.clearance_status}
- Reference: ${customsData.customs_reference}
- Notes: ${customsData.inspection_notes}

Template: ${template}

Generate detailed compliance report including:
1. Executive Summary
2. Due Diligence Statement
3. Risk Assessment Results
4. Geolocation Verification
5. Satellite Analysis Summary
6. Customs Clearance Details
7. Compliance Conclusion
8. Recommendations

Format as professional document with sections and bullet points.`;

      const report = await base44.integrations.Core.InvokeLLM({
        prompt: reportPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            executive_summary: { type: "string" },
            due_diligence_statement: { type: "string" },
            risk_assessment: { type: "string" },
            geolocation_verification: { type: "string" },
            satellite_analysis: { type: "string" },
            customs_clearance: { type: "string" },
            compliance_conclusion: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Track usage
      await UsageMeteringService.logUsage({
        module: 'EUDR',
        operationType: 'REPORT_GENERATION',
        costUnits: 1,
        entityType: 'EUDRDDS',
        entityId: ddsId
      });

      // Deliver report
      if (deliveryMethod === 'email' && recipient) {
        await base44.integrations.Core.SendEmail({
          to: recipient,
          subject: `EUDR Compliance Report - ${dds.dds_reference}`,
          body: `
<h2>${report.title}</h2>

<h3>Executive Summary</h3>
<p>${report.executive_summary}</p>

<h3>Due Diligence Statement</h3>
<p>${report.due_diligence_statement}</p>

<h3>Risk Assessment</h3>
<p>${report.risk_assessment}</p>

<h3>Geolocation Verification</h3>
<p>${report.geolocation_verification}</p>

<h3>Satellite Analysis</h3>
<p>${report.satellite_analysis}</p>

<h3>Customs Clearance</h3>
<p>${report.customs_clearance}</p>

<h3>Compliance Conclusion</h3>
<p>${report.compliance_conclusion}</p>

<h3>Recommendations</h3>
<ul>${report.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>

<p>Generated: ${new Date().toISOString()}</p>
          `
        });
      }

      return { report, customsData };
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success('Report generated and delivered successfully!');
      setIsGenerating(false);
    },
    onError: () => {
      toast.dismiss();
      toast.error('Failed to generate report');
      setIsGenerating(false);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Automated Report Generation</h2>
          <p className="text-sm text-slate-600">Generate compliance reports with real-time data integration</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowTemplateEditor(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => setShowScheduler(true)} className="bg-[#86b027] hover:bg-[#769c22]">
            <Clock className="w-4 h-4 mr-2" />
            Schedule Report
          </Button>
        </div>
      </div>

      {/* Quick Generate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#86b027]" />
            Quick Report Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Select DDS</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose DDS..." />
                </SelectTrigger>
                <SelectContent>
                  {ddsRecords.map(dds => (
                    <SelectItem key={dds.id} value={dds.id}>
                      {dds.dds_reference} - {dds.commodity_description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Report Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Compliance</SelectItem>
                  <SelectItem value="detailed">Detailed Due Diligence</SelectItem>
                  <SelectItem value="executive">Executive Summary</SelectItem>
                  <SelectItem value="customs">Customs Focused</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Delivery Method</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="download">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4" /> Download
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email
                    </div>
                  </SelectItem>
                  <SelectItem value="sftp">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4" /> SFTP
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> Generate Report Now</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ddsRecords.slice(0, 5).map(dds => (
              <div key={dds.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="font-medium text-sm">{dds.dds_reference}</div>
                    <div className="text-xs text-slate-500">{dds.commodity_description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    dds.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                    dds.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }>
                    {dds.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Editor Modal */}
      <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Report Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Customize report templates with your branding and required sections</p>
            {/* Template editor content would go here */}
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Settings className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">Template editor coming soon</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scheduler Modal */}
      <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Automated Reports</DialogTitle>
          </DialogHeader>
          <EUDRReportScheduler onClose={() => setShowScheduler(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EUDRReportScheduler({ onClose }) {
  const [scheduleData, setScheduleData] = useState({
    name: '',
    frequency: 'weekly',
    template: 'standard',
    delivery: 'email',
    recipient: ''
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Schedule Name</Label>
        <Input 
          placeholder="e.g., Weekly Compliance Review"
          value={scheduleData.name}
          onChange={(e) => setScheduleData({...scheduleData, name: e.target.value})}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select value={scheduleData.frequency} onValueChange={(v) => setScheduleData({...scheduleData, frequency: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Report Template</Label>
          <Select value={scheduleData.template} onValueChange={(v) => setScheduleData({...scheduleData, template: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Delivery Method</Label>
        <Select value={scheduleData.delivery} onValueChange={(v) => setScheduleData({...scheduleData, delivery: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sftp">SFTP</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Recipient Email / SFTP Path</Label>
        <Input 
          placeholder="recipient@company.com or /sftp/path"
          value={scheduleData.recipient}
          onChange={(e) => setScheduleData({...scheduleData, recipient: e.target.value})}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-[#86b027] hover:bg-[#769c22]">
          <Calendar className="w-4 h-4 mr-2" />
          Create Schedule
        </Button>
      </div>
    </div>
  );
}
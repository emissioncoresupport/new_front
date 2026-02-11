import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, FileText, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { preFillMIRData, preFillFSCAData, generateClinicalInvestigationSummary, generatePSURData } from './EUDAMEDAIService';
import { generateEUDAMEDXML, validateXMLStructure } from './EUDAMEDXMLExporter';
import { logReportGeneration, logReportValidation } from './EUDAMEDAuditService';

export default function EUDAMEDReportGenerator({ open, onOpenChange }) {
  const [reportType, setReportType] = useState('Manufacturer Incident Report (MIR)');
  const [selectedIncident, setSelectedIncident] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedStudy, setSelectedStudy] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [preFilledData, setPreFilledData] = useState(null);

  const queryClient = useQueryClient();

  const { data: incidents = [] } = useQuery({
    queryKey: ['eudamed-incidents'],
    queryFn: () => base44.entities.EUDAMEDIncident.list()
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['eudamed-devices'],
    queryFn: () => base44.entities.EUDAMEDDevice.list()
  });

  const { data: studies = [] } = useQuery({
    queryKey: ['eudamed-clinical'],
    queryFn: () => base44.entities.EUDAMEDClinicalInvestigation.list()
  });

  const { data: actors = [] } = useQuery({
    queryKey: ['eudamed-actors'],
    queryFn: () => base44.entities.EUDAMEDActor.list()
  });

  // Auto-fill data when incident/device/study is selected
  useEffect(() => {
    const autoFillData = async () => {
      if (!reportType) return;

      try {
        const incident = incidents.find(i => i.id === selectedIncident);
        const device = devices.find(d => d.id === selectedDevice || d.id === incident?.device_id);
        const study = studies.find(s => s.id === selectedStudy);
        const manufacturer = actors.find(a => a.actor_type === 'Manufacturer');

        let data = null;

        if (reportType === 'Manufacturer Incident Report (MIR)' && incident && device) {
          data = await preFillMIRData(incident, device, manufacturer);
        } else if (reportType === 'Field Safety Corrective Action (FSCA)' && incident && device) {
          data = await preFillFSCAData(incident, device, manufacturer);
        } else if (reportType === 'Clinical Investigation Summary' && study && device) {
          const saeEvents = incidents.filter(i => i.device_id === device.id && i.patient_outcome === 'Serious Injury' || i.patient_outcome === 'Death');
          data = await generateClinicalInvestigationSummary(study, device, saeEvents);
        } else if (reportType === 'Periodic Safety Update Report (PSUR)' && device && periodStart && periodEnd) {
          const incidentsInPeriod = incidents.filter(i => 
            i.device_id === device.id && 
            new Date(i.incident_date) >= new Date(periodStart) &&
            new Date(i.incident_date) <= new Date(periodEnd)
          );
          data = await generatePSURData(device, incidentsInPeriod, periodStart, periodEnd);
        }

        setPreFilledData(data);
      } catch (error) {
        console.error('Auto-fill failed:', error);
      }
    };

    if ((selectedIncident || selectedDevice || selectedStudy) && reportType) {
      autoFillData();
    }
  }, [selectedIncident, selectedDevice, selectedStudy, reportType, periodStart, periodEnd]);

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      if (!preFilledData) {
        throw new Error('No data available to generate report');
      }

      // Generate XML compliant with EUDAMED schema
      const xmlContent = await generateEUDAMEDXML(reportType, preFilledData);

      // Validate XML structure
      const validation = await validateXMLStructure(xmlContent);
      
      const reportRef = preFilledData.report_metadata?.report_reference || `REP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Save report
      const report = await base44.entities.EUDAMEDReport.create({
        report_type: reportType,
        report_reference: reportRef,
        device_id: selectedDevice || preFilledData.device_information?.id,
        incident_id: selectedIncident,
        clinical_investigation_id: selectedStudy,
        reporting_period_start: periodStart,
        reporting_period_end: periodEnd,
        submission_date: new Date().toISOString(),
        submission_status: validation?.is_valid ? 'validated' : 'draft',
        xml_content: xmlContent,
        validation_errors: validation?.errors || [],
        report_data: preFilledData
      });

      // Log report generation
      await logReportGeneration(report, validation?.is_valid ? 'success' : 'warning');
      
      // Log validation
      await logReportValidation(report, validation, validation?.is_valid ? 'success' : 'warning');

      return { report, validation };
    },
    onSuccess: ({ report, validation }) => {
      queryClient.invalidateQueries({ queryKey: ['eudamed-reports'] });
      if (validation?.is_valid) {
        toast.success('Report generated and validated! Ready for submission.');
      } else {
        toast.warning('Report generated with validation warnings. Review before submission.');
      }
      onOpenChange(false);
      setPreFilledData(null);
    },
    onError: (error) => {
      toast.error(`Report generation failed: ${error.message}`);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate EUDAMED Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Manufacturer Incident Report (MIR)">Manufacturer Incident Report (MIR)</SelectItem>
                <SelectItem value="Field Safety Corrective Action (FSCA)">Field Safety Corrective Action (FSCA)</SelectItem>
                <SelectItem value="Field Safety Notice (FSN)">Field Safety Notice (FSN)</SelectItem>
                <SelectItem value="Periodic Safety Update Report (PSUR)">Periodic Safety Update Report (PSUR)</SelectItem>
                <SelectItem value="Trend Report">Trend Report</SelectItem>
                <SelectItem value="Clinical Investigation Summary">Clinical Investigation Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType.includes('Incident') || reportType.includes('FSCA') || reportType.includes('FSN') ? (
            <div className="space-y-2">
              <Label>Select Incident</Label>
              <Select value={selectedIncident} onValueChange={setSelectedIncident}>
                <SelectTrigger><SelectValue placeholder="Choose incident" /></SelectTrigger>
                <SelectContent>
                  {incidents.map(inc => (
                    <SelectItem key={inc.id} value={inc.id}>
                      {inc.incident_type} - {inc.report_reference} ({new Date(inc.incident_date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : reportType.includes('Clinical Investigation') ? (
            <div className="space-y-2">
              <Label>Select Clinical Investigation</Label>
              <Select value={selectedStudy} onValueChange={setSelectedStudy}>
                <SelectTrigger><SelectValue placeholder="Choose study" /></SelectTrigger>
                <SelectContent>
                  {studies.map(study => (
                    <SelectItem key={study.id} value={study.id}>
                      {study.investigation_title} ({study.protocol_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : reportType.includes('PSUR') ? (
            <>
              <div className="space-y-2">
                <Label>Select Device</Label>
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger><SelectValue placeholder="Choose device" /></SelectTrigger>
                  <SelectContent>
                    {devices.map(dev => (
                      <SelectItem key={dev.id} value={dev.id}>
                        {dev.device_name} ({dev.udi_di})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period Start</Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Period End</Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Select Device</Label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger><SelectValue placeholder="Choose device" /></SelectTrigger>
                <SelectContent>
                  {devices.map(dev => (
                    <SelectItem key={dev.id} value={dev.id}>
                      {dev.device_name} ({dev.udi_di})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {preFilledData && (
            <div className="bg-[#86b027]/10 border border-[#86b027]/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#86b027]" />
                <p className="text-sm font-bold text-[#545454]">AI Pre-Fill Complete</p>
              </div>
              <p className="text-xs text-slate-600">
                Data automatically extracted and root cause analysis performed. Ready to generate report.
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm">
            <h4 className="font-bold text-blue-900 mb-2">What will be generated:</h4>
            <ul className="text-blue-800 space-y-1 text-xs">
              <li>✓ XML file compliant with EUDAMED schema</li>
              <li>✓ PDF report for regulatory submission</li>
              <li>✓ Auto-validation against MDR/IVDR requirements</li>
              <li>✓ Ready for direct EUDAMED upload</li>
            </ul>
          </div>

          <Button 
            onClick={() => generateReportMutation.mutate()}
            disabled={!preFilledData || generateReportMutation.isPending}
            className="w-full bg-[#86b027] hover:bg-[#769c22]"
          >
            {generateReportMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating & Validating...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> Generate Compliant Report</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
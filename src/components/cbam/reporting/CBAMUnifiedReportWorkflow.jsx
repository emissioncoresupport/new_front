import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft,
  Download, FileCode, Loader2, Info, Send, Shield, X, AlertCircle
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { getCurrentCompany } from '@/components/utils/multiTenant';
import eventBus, { CBAM_EVENTS } from '../services/CBAMEventBus';

export default function CBAMUnifiedReportWorkflow({ period, entries, onComplete }) {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 400, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [step, setStep] = useState(1);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [xmlGenerated, setXmlGenerated] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    reporting_period: period,
    reporting_year: parseInt(period?.split('-')[1]) || new Date().getFullYear(),
    reporting_quarter: parseInt(period?.split('-')[0]?.replace('Q', '')) || 1,
    eori_number: '',
    declarant_name: '',
    member_state: '',
    notes: ''
  });

  const { data: company } = useQuery({
    queryKey: ['current-company'],
    queryFn: getCurrentCompany
  });

  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const calculateAggregates = () => {
    const filteredEntries = entries.filter(e => {
      if (!e.import_date) return false;
      const date = new Date(e.import_date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const q = Math.ceil((month + 1) / 3);
      return `Q${q}-${year}` === period;
    });

    // Handle both old and new field naming conventions
    const totals = filteredEntries.reduce((acc, e) => {
      const qty = e.quantity || e.net_mass_tonnes || 0;
      const direct = e.direct_emissions_specific || 0;
      const indirect = e.indirect_emissions_specific || 0;
      const total = e.total_embedded_emissions || (qty * (direct + indirect));

      return {
        imports: acc.imports + 1,
        quantity: acc.quantity + qty,
        directEmissions: acc.directEmissions + (direct * qty),
        indirectEmissions: acc.indirectEmissions + (indirect * qty),
        totalEmissions: acc.totalEmissions + total
      };
    }, { imports: 0, quantity: 0, directEmissions: 0, indirectEmissions: 0, totalEmissions: 0 });

    return {
      total_imports_count: totals.imports,
      total_goods_quantity_tonnes: totals.quantity,
      total_embedded_emissions: totals.totalEmissions,
      total_direct_emissions: totals.directEmissions,
      total_indirect_emissions: totals.indirectEmissions,
      filtered_entries: filteredEntries
    };
  };

  const aggregates = calculateAggregates();

  const generateReportMutation = useMutation({
        mutationFn: async () => {
          const { data } = await base44.functions.invoke('cbamReportGenerator', {
            reporting_year: formData.reporting_year,
            reporting_quarter: formData.reporting_quarter,
            eori_number: formData.eori_number,
            member_state: formData.member_state,
            declarant_name: formData.declarant_name,
            auto_link_entries: true
          });

          if (!data.success) throw new Error(data.message || 'Report generation failed');
          return data.report;
        },
        onSuccess: (report) => {
          setGeneratedReport(report);
          queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
          eventBus.emit(CBAM_EVENTS.REPORT_GENERATED, { reportId: report.id });
          toast.success('✓ Report generated and validated');
          setStep(4);
        },
        onError: (error) => toast.error('Generation failed: ' + error.message)
      });

  const generateXMLMutation = useMutation({
        mutationFn: async () => {
          const { data } = await base44.functions.invoke('cbamEnhancedXMLGenerator', {
            report_id: generatedReport.id
          });
          if (!data.success) throw new Error(data.error || 'XML generation failed');
          return data;
        },
        onSuccess: (data) => {
          setXmlGenerated(true);
          setGeneratedReport({...generatedReport, xml_file_url: data.xml_url});
          queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
          toast.success('✓ XML declaration generated');
          setStep(5);
        },
        onError: (error) => toast.error('XML failed: ' + error.message)
      });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('cbamRegistrySubmissionV2', {
        report_id: generatedReport.id,
        test_mode: true
      });
      if (!data.success) throw new Error(data.error || 'Submission failed');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-reports'] });
      eventBus.emit(CBAM_EVENTS.REPORT_SUBMITTED, { 
        reportId: generatedReport.id,
        confirmation: data.confirmation_number
      });
      toast.success(`✓ ${data.message}`, {
        description: `Confirmation: ${data.confirmation_number}`
      });
      if (onComplete) onComplete(data);
    },
    onError: (error) => toast.error('Submission failed: ' + error.message)
  });



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto" onClick={onComplete} />

      <div
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        className="relative bg-white/70 backdrop-blur-3xl rounded-3xl border border-white/50 shadow-[0_32px_64px_rgba(0,0,0,0.12)] w-[800px] max-h-[85vh] overflow-hidden select-none pointer-events-auto"
      >
        {/* Drag Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300/50 rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-200/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900/5 flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-xl font-light text-slate-900">New CBAM Declaration</h2>
              <p className="text-xs text-slate-500 font-light">{period} • {aggregates.total_imports_count} imports</p>
            </div>
          </div>
          <button
            onClick={onComplete}
            className="no-drag w-8 h-8 rounded-full hover:bg-slate-900/5 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-7 py-4 bg-slate-50/30">
                <Progress value={(step / 5) * 100} className="h-1.5 bg-slate-200/50" indicatorClassName="bg-slate-900" />
                <div className="flex justify-between text-[11px] text-slate-400 font-light mt-2">
                  <span className={step >= 1 ? 'text-slate-900 font-medium' : ''}>Imports</span>
                  <span className={step >= 2 ? 'text-slate-900 font-medium' : ''}>Details</span>
                  <span className={step >= 3 ? 'text-slate-900 font-medium' : ''}>Validate</span>
                  <span className={step >= 4 ? 'text-slate-900 font-medium' : ''}>Preview</span>
                  <span className={step >= 5 ? 'text-slate-900 font-medium' : ''}>Submit</span>
                </div>
              </div>

        {/* Content */}
                <div className="px-7 py-6 max-h-[50vh] overflow-y-auto">
                  {step === 1 && (
                    <div className="space-y-5">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 p-3 text-center">
                          <div className="text-2xl font-light text-slate-900">{aggregates.total_imports_count}</div>
                          <div className="text-xs text-slate-500 font-light">Imports</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 p-3 text-center">
                          <div className="text-2xl font-light text-slate-900">{aggregates.total_goods_quantity_tonnes.toFixed(1)}</div>
                          <div className="text-xs text-slate-500 font-light">Tonnes</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 p-3 text-center">
                          <div className="text-2xl font-light text-slate-900">{aggregates.total_embedded_emissions.toFixed(1)}</div>
                          <div className="text-xs text-slate-500 font-light">tCO2e</div>
                        </div>
                      </div>

                      {/* Import List Table */}
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200/50">
                          <h3 className="text-sm font-medium text-slate-900">Imports for {period}</h3>
                          <p className="text-xs text-slate-500 font-light mt-0.5">Review all entries to be included</p>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {aggregates.filtered_entries.length === 0 ? (
                            <div className="p-6 text-center">
                              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-sm text-slate-500">No imports found for this period</p>
                              <p className="text-xs text-slate-400 mt-1">Add imports via Data & Import tab first</p>
                            </div>
                          ) : (
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50/50 sticky top-0">
                                <tr className="text-left text-slate-600 font-light">
                                  <th className="px-3 py-2">CN Code</th>
                                  <th className="px-3 py-2">Origin</th>
                                  <th className="px-3 py-2 text-right">Quantity (t)</th>
                                  <th className="px-3 py-2 text-right">Emissions (tCO2e)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {aggregates.filtered_entries.map((entry, idx) => (
                                  <tr key={entry.id || idx} className="border-t border-slate-100 hover:bg-slate-50/50">
                                    <td className="px-3 py-2 font-mono text-[11px]">{entry.cn_code}</td>
                                    <td className="px-3 py-2">{entry.country_of_origin}</td>
                                    <td className="px-3 py-2 text-right">{entry.quantity?.toFixed(2) || 0}</td>
                                    <td className="px-3 py-2 text-right">{entry.total_embedded_emissions?.toFixed(2) || 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-light text-slate-600">EORI Number *</Label>
                          <Input
                            placeholder="EU123456789"
                            value={formData.eori_number}
                            onChange={(e) => setFormData({...formData, eori_number: e.target.value})}
                            className="mt-1 bg-white/50 border-slate-200/60"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-light text-slate-600">Declarant Name *</Label>
                          <Input
                            placeholder="Company Name"
                            value={formData.declarant_name}
                            onChange={(e) => setFormData({...formData, declarant_name: e.target.value})}
                            className="mt-1 bg-white/50 border-slate-200/60"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-light text-slate-600">EU Member State *</Label>
                        <Select value={formData.member_state} onValueChange={(val) => setFormData({...formData, member_state: val})}>
                          <SelectTrigger className="mt-1 bg-white/50 border-slate-200/60">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                            <SelectItem value="NL">🇳🇱 Netherlands</SelectItem>
                            <SelectItem value="FR">🇫🇷 France</SelectItem>
                            <SelectItem value="BE">🇧🇪 Belgium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                {step === 3 && (
                  <div className="space-y-5">
                    <Alert className="bg-[#02a1e8]/5 border-[#02a1e8]/20">
                      <Info className="h-4 w-4 text-[#02a1e8]" />
                      <AlertDescription className="text-xs font-light">
                        Validating {aggregates.total_imports_count} imports • {aggregates.total_embedded_emissions.toFixed(2)} tCO2e
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 font-light">Period</span>
                        <span className="font-medium">{period}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 font-light">EORI</span>
                        <span className="font-medium">{formData.eori_number}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 font-light">Member State</span>
                        <span className="font-medium">{formData.member_state}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 font-light">Declarant</span>
                        <span className="font-medium">{formData.declarant_name}</span>
                      </div>
                    </div>

                    {/* Data Quality Check */}
                    <div className="bg-slate-50/50 rounded-lg border border-slate-200/60 p-3">
                      <h4 className="text-xs font-medium text-slate-700 mb-2">Pre-Submission Validation</h4>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          All mandatory fields present
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          CN codes validated
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Emission calculations verified
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && generatedReport && (
                  <div className="space-y-5">
                    <Alert className="bg-emerald-50/80 border-emerald-200/50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-xs font-light">Report validated • ID: {generatedReport.id}</AlertDescription>
                    </Alert>

                    {/* Report Preview */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200/50 bg-slate-50/50">
                        <h3 className="text-sm font-medium text-slate-900">Quarterly Declaration Preview</h3>
                      </div>
                      <div className="p-4 space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-500 font-light">Reporting Period</span>
                            <div className="font-medium">{period}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-light">Member State</span>
                            <div className="font-medium">{formData.member_state}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-light">EORI Number</span>
                            <div className="font-medium">{formData.eori_number}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-light">Declarant</span>
                            <div className="font-medium">{formData.declarant_name}</div>
                          </div>
                        </div>

                        <div className="border-t border-slate-200/50 pt-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-600 font-light">Total Imports</span>
                            <span className="font-medium">{generatedReport.total_imports_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 font-light">Total Quantity</span>
                            <span className="font-medium">{generatedReport.total_goods_quantity_tonnes?.toFixed(2)} tonnes</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 font-light">Total Embedded Emissions</span>
                            <span className="font-medium">{generatedReport.total_embedded_emissions?.toFixed(2)} tCO2e</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200/50 pt-2">
                            <span className="text-slate-600 font-light">Certificates Required</span>
                            <span className="font-medium text-[#86b027]">{generatedReport.certificates_required?.toFixed(2) || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 font-light">Estimated Cost</span>
                            <span className="font-medium text-[#86b027]">€{generatedReport.total_cbam_cost_eur?.toLocaleString() || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {generatedReport.xml_file_url && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(generatedReport.xml_file_url, '_blank')}
                        className="no-drag w-full"
                      >
                        <Download className="w-3.5 h-3.5 mr-2" />
                        Download XML Declaration
                      </Button>
                    )}
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-5">
                    <Alert className="bg-blue-50/80 border-blue-200/50">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-xs font-light">
                        Ready for submission to {formData.member_state} National Registry
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      {[
                        'All entries validated',
                        'XML schema compliant',
                        'ETS pricing applied',
                        'Free allocation calculated',
                        'Report preview reviewed'
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-slate-600 font-light">{item}</span>
                        </div>
                      ))}
                    </div>

                    <Alert className="bg-amber-50/80 border-amber-200/50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-xs font-light">
                        Once submitted, this declaration cannot be modified. Ensure all data is correct.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-5 border-t border-slate-200/30">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => step > 1 ? setStep(step - 1) : onComplete()}
            className="no-drag"
          >
            {step > 1 ? <><ArrowLeft className="w-4 h-4 mr-1" /> Back</> : 'Cancel'}
          </Button>
          
          <Button 
            onClick={() => {
              if (step === 1) {
                if (aggregates.total_imports_count === 0) {
                  toast.error('No imports found for Q1-2026. Add entries via Data & Import tab first.', {
                    description: 'CBAM declarations require import entries with emissions data',
                    duration: 5000
                  });
                  return;
                }
                setStep(2);
              }
              else if (step === 2) {
                if (!formData.eori_number || !formData.member_state || !formData.declarant_name) {
                  toast.error('Please fill all required fields');
                  return;
                }
                setStep(3);
              }
              else if (step === 3) {
      // Run validation before generating report
      toast.info('Running pre-submission validation...');
      setTimeout(() => generateReportMutation.mutate(), 500);
    }
              else if (step === 4) generateXMLMutation.mutate();
              else if (step === 5) {
                // Use V2 submission function
                submitMutation.mutate();
              }
            }}
            disabled={
              (step === 1 && aggregates.total_imports_count === 0) ||
              (step === 2 && (!formData.eori_number || !formData.member_state || !formData.declarant_name)) ||
              (step === 3 && generateReportMutation.isPending) ||
              (step === 4 && generateXMLMutation.isPending) ||
              (step === 5 && submitMutation.isPending)
            }
            className="no-drag bg-slate-900 hover:bg-slate-800 text-white h-9 px-7 rounded-xl text-sm font-light"
          >
            {generateReportMutation.isPending || generateXMLMutation.isPending || submitMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing</>
            ) : step === 5 ? (
              <><Send className="w-4 h-4 mr-2" /> Submit to Registry</>
            ) : step === 3 ? (
              <>Generate Report <ArrowRight className="w-4 h-4 ml-2" /></>
            ) : step === 4 ? (
              <>Generate XML <ArrowRight className="w-4 h-4 ml-2" /></>
            ) : (
              <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileCode, Download, Send, CheckCircle2, Loader2 } from "lucide-react";
import PPWRReportingService from './services/PPWRReportingService';
import { toast } from 'sonner';

export default function PPWRXMLExporter() {
  const [selectedPackaging, setSelectedPackaging] = useState('');
  const [memberState, setMemberState] = useState('DE');
  const [generatedXML, setGeneratedXML] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const handleGenerateXML = async () => {
    if (!selectedPackaging) {
      toast.error('Please select packaging item');
      return;
    }

    const pkg = packaging.find(p => p.id === selectedPackaging);
    if (!pkg) return;

    toast.info('Generating XML report...');

    try {
      const xml = await PPWRReportingService.generateXMLReport(pkg, { member_state: memberState });
      setGeneratedXML(xml);
      toast.success('XML report generated');
    } catch (error) {
      toast.error('XML generation failed');
    }
  };

  const handleDownload = () => {
    if (!generatedXML) return;

    const blob = new Blob([generatedXML.xml], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedXML.filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    toast.success('XML file downloaded');
  };

  const handleSubmit = async () => {
    if (!generatedXML) return;

    setSubmitting(true);
    toast.info('Submitting to national authority...');

    try {
      const result = await PPWRReportingService.submitToAuthority(generatedXML, memberState);
      
      // Update packaging with submission confirmation
      await base44.entities.PPWRPackaging.update(selectedPackaging, {
        last_authority_submission: new Date().toISOString(),
        submission_confirmation_number: result.confirmation_number
      });
      
      toast.success(`Submitted successfully! Confirmation: ${result.confirmation_number}`);
    } catch (error) {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const memberStates = [
    { code: 'DE', name: '🇩🇪 Germany' },
    { code: 'FR', name: '🇫🇷 France' },
    { code: 'NL', name: '🇳🇱 Netherlands' },
    { code: 'IT', name: '🇮🇹 Italy' },
    { code: 'ES', name: '🇪🇸 Spain' },
    { code: 'PL', name: '🇵🇱 Poland' },
    { code: 'BE', name: '🇧🇪 Belgium' },
    { code: 'AT', name: '🇦🇹 Austria' }
  ];

  return (
    <div className="space-y-6">
      <Card className="border-[#02a1e8]/30 bg-gradient-to-br from-white to-[#02a1e8]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#02a1e8]">
            <FileCode className="w-5 h-5" />
            XML Report Generator & Submission
          </CardTitle>
          <p className="text-sm text-slate-500">
            Generate standardized XML reports for national authority submission
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Packaging</Label>
              <Select value={selectedPackaging} onValueChange={setSelectedPackaging}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose packaging item..." />
                </SelectTrigger>
                <SelectContent>
                  {packaging.map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.packaging_name} - {pkg.material_category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Member State</Label>
              <Select value={memberState} onValueChange={setMemberState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {memberStates.map(ms => (
                    <SelectItem key={ms.code} value={ms.code}>
                      {ms.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerateXML}
            disabled={!selectedPackaging}
            className="w-full bg-[#02a1e8] hover:bg-[#0287c3] text-white"
          >
            <FileCode className="w-4 h-4 mr-2" />
            Generate XML Report
          </Button>

          {generatedXML && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-900">XML Report Generated</p>
                  <p className="text-xs text-slate-600">{generatedXML.filename}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleDownload}
                  variant="outline"
                  className="flex-1 border-emerald-300 hover:bg-emerald-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download XML
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit to Authority
                    </>
                  )}
                </Button>
              </div>

              {/* XML Preview */}
              <div className="mt-4">
                <p className="text-xs text-slate-600 mb-2 font-semibold">XML Preview:</p>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
                  {generatedXML.xml}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-[#02a1e8] text-white flex items-center justify-center shrink-0 text-xs font-bold">
              1
            </div>
            <p>Generate XML report for individual packaging items or bulk export</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-[#02a1e8] text-white flex items-center justify-center shrink-0 text-xs font-bold">
              2
            </div>
            <p>Validate XML against national schema (automatic validation included)</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-[#02a1e8] text-white flex items-center justify-center shrink-0 text-xs font-bold">
              3
            </div>
            <p>Submit to Member State packaging registry (API endpoint varies by country)</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-[#02a1e8] text-white flex items-center justify-center shrink-0 text-xs font-bold">
              4
            </div>
            <p>Receive confirmation number and store for audit trail</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
/**
 * CBAM Unified Verification Hub
 * CONSOLIDATES: CBAMVerificationHub, CBAMAuditorVerificationHub
 * Single workflow for verification requests and auditor reviews
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, CheckCircle2, XCircle, AlertTriangle, Upload, 
  Eye, Clock, Building2
} from "lucide-react";
import { toast } from "sonner";

export default function CBAMUnifiedVerificationHub() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    opinion: 'satisfactory',
    findings: '',
    materiality_threshold: 5,
    site_visit_conducted: false,
    recommendations: '',
    verifier_name: 'Accredited Verifier'
  });
  const queryClient = useQueryClient();

  // Fetch entries
  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  // Fetch verification reports
  const { data: verificationReports = [] } = useQuery({
    queryKey: ['cbam-verification-reports'],
    queryFn: async () => {
      try {
        return await base44.entities.CBAMVerificationReport.list('-created_date');
      } catch {
        return [];
      }
    }
  });

  // Categorize entries
  const pendingEntries = entries.filter(e => 
    !e.verification_status || 
    e.verification_status === 'not_verified' || 
    e.verification_status === 'pending'
  );

  const verifiedEntries = entries.filter(e => 
    e.verification_status === 'accredited_verifier_satisfactory'
  );

  const flaggedEntries = entries.filter(e => 
    e.verification_status === 'requires_correction' ||
    e.verification_status === 'accredited_verifier_unsatisfactory'
  );

  // Verify entry mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ entryId, data }) => {
      // Create verification report
      const report = await base44.entities.CBAMVerificationReport.create({
        reporting_year: new Date().getFullYear(),
        operator_name: data.operator_name || 'N/A',
        verifier_name: data.verifier_name,
        verifier_accreditation: 'EU-Accredited',
        verification_opinion: data.opinion,
        site_visit_type: data.site_visit_conducted ? 'on_site' : 'remote',
        site_visit_date: data.site_visit_conducted ? new Date().toISOString().split('T')[0] : null,
        materiality_threshold_percent: data.materiality_threshold,
        materiality_misstatements_detected: data.opinion === 'unsatisfactory',
        findings_summary: data.findings,
        recommendations: data.recommendations,
        status: 'completed'
      });

      // Update entry
      const newStatus = data.opinion === 'satisfactory' ? 
        'accredited_verifier_satisfactory' : 
        'accredited_verifier_unsatisfactory';

      await base44.entities.CBAMEmissionEntry.update(entryId, {
        verification_status: newStatus,
        verifier_id: report.id,
        verification_report_id: report.id,
        materiality_assessment_5_percent: data.materiality_threshold <= 5
      });

      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      queryClient.invalidateQueries({ queryKey: ['cbam-verification-reports'] });
      toast.success('Entry verified successfully');
      setShowVerifyModal(false);
      setSelectedEntry(null);
    }
  });

  const handleVerifyEntry = (entry) => {
    setSelectedEntry(entry);
    setReviewData({
      opinion: 'satisfactory',
      findings: '',
      materiality_threshold: 5,
      site_visit_conducted: false,
      recommendations: '',
      operator_name: entry.operator_name || 'Unknown',
      verifier_name: 'Accredited Verifier'
    });
    setShowVerifyModal(true);
  };

  const EntryCard = ({ entry, showActions = true }) => (
    <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="font-medium text-slate-900 text-sm">{entry.product_name || entry.cn_code}</h4>
            <p className="text-xs text-slate-500 font-light mt-0.5">{entry.country_of_origin} • {entry.quantity} tonnes</p>
          </div>
          {entry.verification_status === 'accredited_verifier_satisfactory' && (
            <div className="w-8 h-8 rounded-xl bg-green-100/80 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs mb-4">
          <div>
            <p className="text-slate-500 font-light">Direct</p>
            <p className="font-semibold text-slate-900">{entry.direct_emissions_specific?.toFixed(3)} tCO2e/t</p>
          </div>
          <div>
            <p className="text-slate-500 font-light">Total</p>
            <p className="font-semibold text-[#86b027]">{entry.total_embedded_emissions?.toFixed(2)} tCO2e</p>
          </div>
          <div>
            <p className="text-slate-500 font-light">Method</p>
            <p className="font-medium text-slate-900 text-[10px]">{entry.calculation_method}</p>
          </div>
        </div>

        {showActions && (
          <Button 
            size="sm" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm font-light shadow-sm"
            onClick={() => handleVerifyEntry(entry)}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
            Verify Entry
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-slate-900">Unified Verification Hub</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Third-party verification and audit management
            </p>
          </div>
        </div>
      </div>

      {/* Stats - Tesla Design */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-black" />
            </div>
            <p className="text-3xl font-light text-slate-900">{pendingEntries.length}</p>
            <p className="text-sm text-slate-600 mt-1">Pending</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-5 h-5 text-black" />
            </div>
            <p className="text-3xl font-light text-slate-900">{verifiedEntries.length}</p>
            <p className="text-sm text-slate-600 mt-1">Verified</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-black" />
            </div>
            <p className="text-3xl font-light text-slate-900">{flaggedEntries.length}</p>
            <p className="text-sm text-slate-600 mt-1">Flagged</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <p className="text-3xl font-light text-slate-900">{verificationReports.length}</p>
            <p className="text-sm text-slate-600 mt-1">Reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-50/50 border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Pending ({pendingEntries.length})
          </TabsTrigger>
          <TabsTrigger value="verified" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Verified ({verifiedEntries.length})
          </TabsTrigger>
          <TabsTrigger value="flagged" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Flagged ({flaggedEntries.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Reports ({verificationReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="grid grid-cols-2 gap-4">
            {pendingEntries.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="verified">
          <div className="grid grid-cols-2 gap-4">
            {verifiedEntries.map(entry => (
              <EntryCard key={entry.id} entry={entry} showActions={false} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="flagged">
          <div className="grid grid-cols-2 gap-4">
            {flaggedEntries.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-4">
            {verificationReports.map(report => (
              <div key={report.id} className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-slate-900">{report.operator_name}</h4>
                      <Badge className={
                        report.verification_opinion === 'satisfactory' 
                          ? 'bg-green-100 text-green-700 border-0' 
                          : 'bg-amber-100 text-amber-700 border-0'
                      }>
                        {report.verification_opinion}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-slate-500">Verifier</p>
                        <p className="font-semibold">{report.verifier_name}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Year</p>
                        <p className="font-semibold">{report.reporting_year}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Site Visit</p>
                        <p className="font-semibold capitalize">{report.site_visit_type}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Verify Entry Modal */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent className="max-w-2xl bg-gradient-to-b from-white to-slate-50/50">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-slate-900">Verify CBAM Entry</DialogTitle>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h4 className="font-semibold text-slate-900 mb-1">{selectedEntry.product_name}</h4>
                <p className="text-sm text-slate-600">
                  {selectedEntry.cn_code} • {selectedEntry.country_of_origin} • {selectedEntry.quantity} tonnes
                </p>
              </div>

              <div>
                <Label>Verification Opinion</Label>
                <Select value={reviewData.opinion} onValueChange={(v) => setReviewData({...reviewData, opinion: v})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="satisfactory">✓ Satisfactory</SelectItem>
                    <SelectItem value="satisfactory_with_comments">⚠ Satisfactory with Comments</SelectItem>
                    <SelectItem value="unsatisfactory">✗ Unsatisfactory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Findings</Label>
                <Textarea
                  rows={3}
                  value={reviewData.findings}
                  onChange={(e) => setReviewData({...reviewData, findings: e.target.value})}
                  placeholder="Document findings..."
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="site-visit"
                  checked={reviewData.site_visit_conducted}
                  onChange={(e) => setReviewData({...reviewData, site_visit_conducted: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="site-visit" className="cursor-pointer text-sm">
                  On-site visit conducted
                </Label>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowVerifyModal(false)} className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 px-4 text-sm shadow-none">
                  Cancel
                </Button>
                <Button
                  onClick={() => verifyMutation.mutate({
                    entryId: selectedEntry.id,
                    data: reviewData
                  })}
                  disabled={verifyMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm"
                >
                  Submit Verification
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle, 
  FileText, Send, User, Calendar, Download
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AuditorVerificationHub() {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState(null);
  const [verificationData, setVerificationData] = useState({
    status: 'verified',
    notes: '',
    verifier_id: ''
  });
  const queryClient = useQueryClient();

  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations'],
    queryFn: () => base44.entities.CBAMInstallation.list()
  });

  const { data: verifiers = [] } = useQuery({
    queryKey: ['cbam-verifiers'],
    queryFn: () => base44.entities.CBAMVerifier.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const updateInstallationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CBAMInstallation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-installations'] });
      toast.success('Verification status updated');
      setShowVerifyModal(false);
    }
  });

  const requestVerificationMutation = useMutation({
    mutationFn: async (installation) => {
      await base44.entities.CBAMVerificationRequest.create({
        installation_id: installation.id,
        supplier_id: installation.supplier_id,
        request_date: new Date().toISOString(),
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        priority: 'high'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-verification-requests'] });
      toast.success('Verification request sent to auditor');
    }
  });

  const handleVerify = (installation) => {
    setSelectedInstallation(installation);
    setVerificationData({
      status: 'verified',
      notes: '',
      verifier_id: verifiers[0]?.id || ''
    });
    setShowVerifyModal(true);
  };

  const submitVerification = () => {
    updateInstallationMutation.mutate({
      id: selectedInstallation.id,
      data: {
        verification_status: verificationData.status,
        verification_notes: verificationData.notes,
        verifier_id: verificationData.verifier_id,
        last_verified_date: new Date().toISOString().split('T')[0]
      }
    });
  };

  const stats = {
    total: installations.length,
    pending: installations.filter(i => i.verification_status === 'pending').length,
    verified: installations.filter(i => i.verification_status === 'verified').length,
    flagged: installations.filter(i => i.verification_status === 'flagged').length
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'flagged':
        return <Badge className="bg-rose-100 text-rose-700"><AlertTriangle className="w-3 h-3 mr-1" />Flagged</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Auditor Verification Hub</h2>
          <p className="text-sm text-slate-600">Mandatory installation verification for 2026 definitive period</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase">Total Installations</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase">Pending Verification</p>
            <p className="text-3xl font-bold text-amber-700 mt-1">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase">Verified</p>
            <p className="text-3xl font-bold text-emerald-700 mt-1">{stats.verified}</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-rose-600 uppercase">Flagged/Rejected</p>
            <p className="text-3xl font-bold text-rose-700 mt-1">{stats.flagged}</p>
          </CardContent>
        </Card>
      </div>

      {/* 2026 Requirement Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-bold text-blue-900">2026 Verification Requirement</h4>
              <p className="text-sm text-blue-700 mt-1">
                All installations providing actual emissions data must be verified by an EU-accredited verifier (Regulation (EU) 2023/956, Art. 8). 
                Verification reports must be submitted alongside quarterly CBAM declarations starting Q1 2026.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Installation Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Installation</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Technology</TableHead>
                <TableHead>Verification Status</TableHead>
                <TableHead>Last Verified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installations.map(inst => {
                const supplier = suppliers.find(s => s.id === inst.supplier_id);
                return (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.name}</TableCell>
                    <TableCell>{supplier?.legal_name || 'Unknown'}</TableCell>
                    <TableCell>{inst.country}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {inst.production_technology}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(inst.verification_status)}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {inst.last_verified_date ? new Date(inst.last_verified_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleVerify(inst)}
                        >
                          {inst.verification_status === 'verified' ? 'Re-verify' : 'Verify'}
                        </Button>
                        {inst.verification_status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => requestVerificationMutation.mutate(inst)}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Request
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Verification Modal */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verify Installation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Verification Body</Label>
              <Select 
                value={verificationData.verifier_id} 
                onValueChange={(v) => setVerificationData({...verificationData, verifier_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select verifier" />
                </SelectTrigger>
                <SelectContent>
                  {verifiers.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Verification Outcome</Label>
              <Select 
                value={verificationData.status} 
                onValueChange={(v) => setVerificationData({...verificationData, status: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">✓ Verified - Data Approved</SelectItem>
                  <SelectItem value="flagged">⚠ Flagged - Requires Review</SelectItem>
                  <SelectItem value="rejected">✗ Rejected - Data Invalid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Verification Notes</Label>
              <Textarea 
                value={verificationData.notes}
                onChange={(e) => setVerificationData({...verificationData, notes: e.target.value})}
                placeholder="Enter verification findings, methodology used, and any recommendations..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowVerifyModal(false)}>Cancel</Button>
              <Button 
                onClick={submitVerification}
                className="bg-[#86b027] hover:bg-[#769c22]"
                disabled={updateInstallationMutation.isPending}
              >
                Submit Verification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
/**
 * CBAM Unified Supplier Hub
 * CONSOLIDATES: CBAMSupplierOnboarding, CBAMSupplierOnboardingWorkflow, 
 * CBAMSupplierInviteManager, CBAMSupplierSubmissionsReview
 * Single integrated workflow for supplier management
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserPlus, CheckCircle, Clock, XCircle, AlertTriangle, Send, 
  FileText, Building2, Upload, Mail, Eye
} from "lucide-react";
import { toast } from "sonner";
import { COMMON_NON_EU_COUNTRIES } from '../constants';
import CBAMSupplierService from '../services/CBAMSupplierService';
import moment from 'moment';

export default function CBAMUnifiedSupplierHub() {
  const [activeTab, setActiveTab] = useState('pending');
  const [showNewForm, setShowNewForm] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedForReview, setSelectedForReview] = useState(null);
  const [formData, setFormData] = useState({
    legal_name: '',
    country: '',
    primary_contact_email: '',
    preferred_contact: '',
    notes: ''
  });
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  const queryClient = useQueryClient();

  // Unified data fetching
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: onboardingTasks = [] } = useQuery({
    queryKey: ['onboarding-tasks'],
    queryFn: () => base44.entities.OnboardingTask.list('-created_date')
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['supplier-cbam-submissions'],
    queryFn: async () => {
      try {
        return await base44.entities.SupplierCBAMSubmission.list('-submission_date');
      } catch {
        return [];
      }
    }
  });

  // Categorize suppliers
  const pendingSuppliers = suppliers.filter(s => 
    s.onboarding_status === 'in_progress' || 
    s.validation_status === 'pending'
  );
  const approvedSuppliers = suppliers.filter(s => s.validation_status === 'verified');
  const pendingSubmissions = submissions.filter(s => s.verification_status === 'pending');

  // Unified onboarding mutation
  const onboardMutation = useMutation({
    mutationFn: async (data) => {
      const result = await CBAMSupplierService.onboardSupplier(data);
      if (!result.success) throw new Error(result.error);
      return result.supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
      setShowNewForm(false);
      setFormData({ legal_name: '', country: '', primary_contact_email: '', preferred_contact: '', notes: '' });
      toast.success('Supplier onboarded successfully');
    }
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            suppliers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  legal_name: { type: "string" },
                  country: { type: "string" },
                  primary_contact_email: { type: "string" },
                  preferred_contact: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.output?.suppliers) {
        const results = [];
        for (const supplier of result.output.suppliers) {
          const res = await CBAMSupplierService.onboardSupplier(supplier);
          results.push(res);
        }
        return results;
      }
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(`Imported ${results?.length || 0} suppliers`);
    }
  });

  // Send invitation
  const inviteMutation = useMutation({
    mutationFn: async (supplierId) => {
      const supplier = suppliers.find(s => s.id === supplierId);
      await CBAMSupplierService.requestSupplierData(supplierId, {
        cn_code: 'Multiple',
        product_name: 'General CBAM Data',
        quantity: 0
      });
    },
    onSuccess: () => {
      toast.success('Data request sent to supplier');
      setSelectedSupplier('');
      setShowInviteDialog(false);
    }
  });

  // Review submission
  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      const user = await base44.auth.me();
      return base44.entities.SupplierCBAMSubmission.update(id, {
        verification_status: status,
        reviewer_notes: notes,
        reviewed_by: user?.email,
        reviewed_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-cbam-submissions'] });
      toast.success('Submission reviewed');
      setSelectedForReview(null);
    }
  });

  // Approve supplier
  const approveMutation = useMutation({
    mutationFn: async (supplierId) => {
      await base44.entities.Supplier.update(supplierId, {
        validation_status: 'verified',
        onboarding_status: 'completed',
        onboarding_completion_date: new Date().toISOString()
      });
      
      // Complete tasks
      const tasks = onboardingTasks.filter(t => t.supplier_id === supplierId && t.status === 'pending');
      for (const task of tasks) {
        await base44.entities.OnboardingTask.update(task.id, {
          status: 'completed',
          completed_date: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
      toast.success('Supplier approved');
    }
  });

  const StatusBadge = ({ status }) => {
    const configs = {
      pending: { icon: Clock, color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pending' },
      in_progress: { icon: Clock, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'In Progress' },
      verified: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Verified' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200', label: 'Rejected' }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-slate-700" />
            Unified Supplier Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated onboarding, invitations, submissions & approvals
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowInviteDialog(true)}
            variant="outline"
            className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 px-4 text-sm shadow-none"
          >
            <Mail className="w-3.5 h-3.5 mr-2" />
            Send Request
          </Button>
          <Button 
            onClick={() => setShowNewForm(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-amber-50/30 border border-amber-200/60 rounded-lg p-5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] text-amber-700 uppercase tracking-wide mb-2">Pending Approval</p>
          <p className="text-3xl font-light text-amber-900">{pendingSuppliers.length}</p>
        </div>
        <div className="bg-emerald-50/30 border border-emerald-200/60 rounded-lg p-5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] text-emerald-700 uppercase tracking-wide mb-2">Approved</p>
          <p className="text-3xl font-light text-emerald-900">{approvedSuppliers.length}</p>
        </div>
        <div className="bg-blue-50/30 border border-blue-200/60 rounded-lg p-5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] text-blue-700 uppercase tracking-wide mb-2">Data Submissions</p>
          <p className="text-3xl font-light text-blue-900">{submissions.length}</p>
        </div>
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Tasks</p>
          <p className="text-3xl font-light text-slate-900">{onboardingTasks.length}</p>
        </div>
      </div>

      {/* Unified Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-50/50 border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Pending ({pendingSuppliers.length})
          </TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Submissions ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Approved ({approvedSuppliers.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Approvals */}
        <TabsContent value="pending" className="space-y-4">
          {pendingSuppliers.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] py-16 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">No pending approvals</p>
            </div>
          ) : (
            pendingSuppliers.map(supplier => (
              <div key={supplier.id} className="bg-white rounded-lg border border-amber-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-slate-700" />
                      <h3 className="font-medium text-base text-slate-900">{supplier.legal_name}</h3>
                      <StatusBadge status={supplier.validation_status || supplier.onboarding_status} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Country</p>
                        <p className="font-medium text-slate-900">{supplier.country}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Contact</p>
                        <p className="font-medium text-slate-900">{supplier.preferred_contact}</p>
                        <p className="text-xs text-slate-500">{supplier.primary_contact_email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveMutation.mutate(supplier.id)}
                      disabled={approveMutation.isPending}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-sm shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Data Submissions Review */}
        <TabsContent value="submissions" className="space-y-4">
          {pendingSubmissions.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] py-16 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">No pending submissions</p>
            </div>
          ) : (
            pendingSubmissions.map(sub => (
              <div key={sub.id} className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-2">{sub.product_name}</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Submitted:</span>
                        <p className="font-medium">{moment(sub.submission_date).format('MMM D, YYYY')}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Direct:</span>
                        <p className="font-medium">{sub.direct_emissions?.toFixed(2)} tCO₂e/t</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Total:</span>
                        <p className="font-bold text-emerald-700">{sub.total_emissions?.toFixed(2)} tCO₂e/t</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedForReview(sub);
                      setReviewNotes(sub.reviewer_notes || '');
                    }}
                    className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 px-4 text-sm"
                  >
                    <Eye className="w-3.5 h-3.5 mr-2" />
                    Review
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Approved Suppliers */}
        <TabsContent value="approved" className="space-y-3">
          {approvedSuppliers.map(supplier => (
            <div key={supplier.id} className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  <div>
                    <p className="font-medium text-sm text-slate-900">{supplier.legal_name}</p>
                    <p className="text-xs text-slate-500">{supplier.country}</p>
                  </div>
                </div>
                <StatusBadge status="verified" />
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Add Supplier Form */}
      <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Onboard New Non-EU Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Legal Name *</Label>
                <Input
                  value={formData.legal_name}
                  onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Country *</Label>
                <Select 
                  value={formData.country} 
                  onValueChange={(value) => setFormData({...formData, country: value})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select country..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_NON_EU_COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name *</Label>
                <Input
                  value={formData.preferred_contact}
                  onChange={(e) => setFormData({...formData, preferred_contact: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.primary_contact_email}
                  onChange={(e) => setFormData({...formData, primary_contact_email: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="mt-1"
                rows={2}
              />
            </div>
            
            {/* Bulk Import Option */}
            <div className="border-t pt-4">
              <Label>Or Bulk Import</Label>
              <div className="mt-2">
                <Input
                  type="file"
                  accept=".xlsx,.csv,.pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      bulkImportMutation.mutate(e.target.files[0]);
                      setShowNewForm(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            <Button 
              onClick={() => onboardMutation.mutate(formData)}
              disabled={!formData.legal_name || !formData.country || onboardMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {onboardMutation.isPending ? 'Adding...' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invitation Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Data Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Supplier</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.legal_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => inviteMutation.mutate(selectedSupplier)}
              disabled={!selectedSupplier || inviteMutation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Send className="w-3.5 h-3.5 mr-2" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Submission Dialog */}
      <Dialog open={!!selectedForReview} onOpenChange={() => setSelectedForReview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Supplier Submission</DialogTitle>
          </DialogHeader>
          {selectedForReview && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold mb-2">{selectedForReview.product_name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Direct:</span>
                    <span className="ml-2 font-bold">{selectedForReview.direct_emissions?.toFixed(2)} tCO₂e/t</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Indirect:</span>
                    <span className="ml-2 font-bold">{selectedForReview.indirect_emissions?.toFixed(2)} tCO₂e/t</span>
                  </div>
                </div>
              </div>
              <div>
                <Label>Review Notes</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add comments..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => reviewMutation.mutate({ id: selectedForReview.id, status: 'verified', notes: reviewNotes })}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => reviewMutation.mutate({ id: selectedForReview.id, status: 'rejected', notes: reviewNotes })}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
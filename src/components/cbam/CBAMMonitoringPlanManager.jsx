import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileCheck, AlertCircle, CheckCircle2, Upload, Plus, 
  Calendar, Factory, Languages, FileText, Eye, X
} from 'lucide-react';
import { toast } from 'sonner';
import CBAMMonitoringPlanValidator from './services/CBAMMonitoringPlanValidator';
import { getCurrentCompany } from '@/components/utils/multiTenant';

export default function CBAMMonitoringPlanManager() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ['current-company'],
    queryFn: getCurrentCompany
  });

  // Fetch monitoring plans
  const { data: plans = [] } = useQuery({
    queryKey: ['cbam-monitoring-plans'],
    queryFn: () => base44.entities.CBAMMonitoringPlan.list()
  });

  // Fetch installations
  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations'],
    queryFn: () => base44.entities.CBAMInstallation.list()
  });

  const companyPlans = plans.filter(p => !company || p.tenant_id === company.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-slate-900">Monitoring Plans</h2>
          <p className="text-sm text-slate-500 mt-1">
            Per Art. 8-12 C(2025) 8151 - Must be in English
          </p>
        </div>
        <Button onClick={() => { setSelectedPlan(null); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-2xl font-light text-slate-900">
                  {companyPlans.length}
                </div>
                <div className="text-xs text-slate-500">Total Plans</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-2xl font-light text-slate-900">
                  {companyPlans.filter(p => p.status === 'approved').length}
                </div>
                <div className="text-xs text-slate-500">Approved</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <div>
                <div className="text-2xl font-light text-slate-900">
                  {companyPlans.filter(p => p.status === 'requires_revision').length}
                </div>
                <div className="text-xs text-slate-500">Requires Revision</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-2xl font-light text-slate-900">
                  {companyPlans.filter(p => p.language === 'English').length}
                </div>
                <div className="text-xs text-slate-500">English Compliant</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Monitoring Plans Registry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {companyPlans.map(plan => {
              const validation = CBAMMonitoringPlanValidator.validatePlan(plan);
              const installation = installations.find(i => i.id === plan.installation_id);

              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Factory className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="font-medium text-slate-900">
                          {plan.plan_reference || 'Untitled Plan'}
                        </div>
                        <div className="text-sm text-slate-500">
                          {installation?.installation_name || 'No installation linked'} • {plan.reporting_period_year}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Language Badge */}
                    <Badge variant={plan.language === 'English' ? 'default' : 'destructive'}>
                      {plan.language || 'Not Set'}
                    </Badge>

                    {/* Status Badge */}
                    <Badge
                      variant={
                        plan.status === 'approved' ? 'default' :
                        plan.status === 'requires_revision' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {plan.status}
                    </Badge>

                    {/* Validation Score */}
                    <div className="text-sm text-slate-600">
                      {validation.completeness_score}% Complete
                    </div>

                    {/* Actions */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedPlan(plan); setShowModal(true); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {companyPlans.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No monitoring plans yet</p>
                <p className="text-sm mt-1">Create a plan to start tracking emissions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <MonitoringPlanModal
          plan={selectedPlan}
          installations={installations}
          onClose={() => { setShowModal(false); setSelectedPlan(null); }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['cbam-monitoring-plans'] });
            setShowModal(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
}

function MonitoringPlanModal({ plan, installations, onClose, onSave }) {
  const [formData, setFormData] = useState(plan || {
    language: 'English',
    status: 'draft',
    functional_units: [],
    production_processes: [],
    measurement_systems: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CBAMMonitoringPlan.create(data),
    onSuccess: () => {
      toast.success('Monitoring plan created');
      onSave();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CBAMMonitoringPlan.update(plan.id, data),
    onSuccess: () => {
      toast.success('Monitoring plan updated');
      onSave();
    }
  });

  const validation = CBAMMonitoringPlanValidator.validatePlan(formData);
  const approvalChecklist = CBAMMonitoringPlanValidator.getApprovalChecklist(formData);

  const handleSave = () => {
    if (plan) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              {plan ? 'Edit' : 'New'} Monitoring Plan
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Per C(2025) 8151 Art. 8-12
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="approval">Approval</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Plan Reference *</label>
                  <Input
                    value={formData.plan_reference || ''}
                    onChange={(e) => setFormData({ ...formData, plan_reference: e.target.value })}
                    placeholder="MP-2026-001"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Reporting Year *</label>
                  <Input
                    type="number"
                    min="2026"
                    value={formData.reporting_period_year || 2026}
                    onChange={(e) => setFormData({ ...formData, reporting_period_year: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Installation *</label>
                  <Select
                    value={formData.installation_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, installation_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select installation" />
                    </SelectTrigger>
                    <SelectContent>
                      {installations.map(inst => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.installation_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Language *</label>
                  <Select
                    value={formData.language || 'English'}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English (Required)</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.language !== 'English' && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠ Must be English per Art. 10(4)
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Monitoring Methodology *</label>
                  <Select
                    value={formData.monitoring_methodology || ''}
                    onValueChange={(value) => setFormData({ ...formData, monitoring_methodology: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calculation_based">Calculation-Based</SelectItem>
                      <SelectItem value="measurement_based">Measurement-Based</SelectItem>
                      <SelectItem value="mass_balance">Mass Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <Select
                    value={formData.status || 'draft'}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="requires_revision">Requires Revision</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Validation Tab */}
            <TabsContent value="validation" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Validation Results</CardTitle>
                    <Badge variant={validation.valid ? 'default' : 'destructive'}>
                      {validation.completeness_score}% Complete
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Errors */}
                  {validation.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-red-600">Errors ({validation.errors.length})</h4>
                      {validation.errors.map((error, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-red-800">{error.message}</p>
                            <p className="text-xs text-red-600 mt-1">{error.regulation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warnings */}
                  {validation.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-amber-600">Warnings ({validation.warnings.length})</h4>
                      {validation.warnings.map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-amber-800">{warning.message}</p>
                            <p className="text-xs text-amber-600 mt-1">{warning.regulation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {validation.valid && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-800">All validation checks passed</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Approval Tab */}
            <TabsContent value="approval" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Approval Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {approvalChecklist.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {item.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-sm text-slate-700">{item.item}</span>
                      </div>
                      {item.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>
                  ))}

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Ready for Approval</span>
                      {approvalChecklist.ready_for_approval ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {validation.errors.length > 0 && (
              <span className="text-red-600">
                {validation.critical_issues} critical issues
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Plan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
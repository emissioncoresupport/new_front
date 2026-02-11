import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Target, Plus, Pencil, Trash2, Shield, Users, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import MultiEntityOnboardingWizard from '@/components/settings/MultiEntityOnboardingWizard';
import ProfileSection from '@/components/settings/ProfileSection';
import { Badge } from "@/components/ui/badge";
import RoleManagement from '@/components/rbac/RoleManagement';
import UserRoleAssignment from '@/components/rbac/UserRoleAssignment';

export default function CompanySettings() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [editingSite, setEditingSite] = useState(null);
  const [editingScope, setEditingScope] = useState(null);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const companies = await base44.entities.Company.list();
      return companies[0];
    },
    enabled: !!user
  });

  const { data: legalEntities = [] } = useQuery({
    queryKey: ['legal-entities'],
    queryFn: () => base44.entities.LegalEntity.filter({ tenant_id: company?.id }),
    enabled: !!company
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.filter({ tenant_id: company?.id }),
    enabled: !!company
  });

  const { data: scopes = [] } = useQuery({
    queryKey: ['reporting-scopes'],
    queryFn: () => base44.entities.ReportingScope.filter({ tenant_id: company?.id }),
    enabled: !!company
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ tenant_id: company?.id });
      return subs[0];
    },
    enabled: !!company
  });

  const { data: moduleSubscriptions = [] } = useQuery({
    queryKey: ['module-subscriptions'],
    queryFn: () => base44.entities.SubscriptionModule.filter({ tenant_id: company?.id }),
    enabled: !!company
  });

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: () => base44.entities.RolePermission.filter({ tenant_id: company?.id }),
    enabled: !!company
  });

  const saveEntityMutation = useMutation({
    mutationFn: async (data) => {
      if (editingEntity) {
        return base44.entities.LegalEntity.update(editingEntity.id, data);
      }
      return base44.entities.LegalEntity.create({ ...data, tenant_id: company.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['legal-entities']);
      setShowEntityModal(false);
      setEditingEntity(null);
      toast.success(editingEntity ? 'Entity updated' : 'Entity created');
    }
  });

  const saveSiteMutation = useMutation({
    mutationFn: async (data) => {
      if (editingSite) {
        return base44.entities.Site.update(editingSite.id, data);
      }
      return base44.entities.Site.create({ ...data, tenant_id: company.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sites']);
      setShowSiteModal(false);
      setEditingSite(null);
      toast.success(editingSite ? 'Site updated' : 'Site created');
    }
  });

  const saveScopeMutation = useMutation({
    mutationFn: async (data) => {
      if (editingScope) {
        return base44.entities.ReportingScope.update(editingScope.id, data);
      }
      return base44.entities.ReportingScope.create({ ...data, tenant_id: company.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reporting-scopes']);
      setShowScopeModal(false);
      setEditingScope(null);
      toast.success(editingScope ? 'Scope updated' : 'Scope created');
    }
  });

  const deleteEntityMutation = useMutation({
    mutationFn: (id) => base44.entities.LegalEntity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['legal-entities']);
      toast.success('Entity deleted');
    }
  });

  const deleteSiteMutation = useMutation({
    mutationFn: (id) => base44.entities.Site.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['sites']);
      toast.success('Site deleted');
    }
  });

  const deleteScopeMutation = useMutation({
    mutationFn: (id) => base44.entities.ReportingScope.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['reporting-scopes']);
      toast.success('Scope deleted');
    }
  });

  if (!company) {
    return (
      <div className="p-8">
        <MultiEntityOnboardingWizard onComplete={() => queryClient.invalidateQueries()} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Company Settings</h1>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Company Profile</TabsTrigger>
          <TabsTrigger value="subscription">Subscription & Modules</TabsTrigger>
          <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
          <TabsTrigger value="entities">Legal Entities ({legalEntities.length})</TabsTrigger>
          <TabsTrigger value="sites">Sites ({sites.length})</TabsTrigger>
          <TabsTrigger value="scopes">Reporting Scopes ({scopes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Subscription Overview
                </CardTitle>
                {subscription && (
                  <Badge variant={subscription.status === 'ACTIVE' ? 'success' : subscription.status === 'TRIAL' ? 'warning' : 'destructive'}>
                    {subscription.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <Label className="text-xs text-slate-500 uppercase">Plan</Label>
                      <p className="text-xl font-bold mt-1">{subscription.plan_code}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <Label className="text-xs text-slate-500 uppercase">Billing Cycle</Label>
                      <p className="text-xl font-bold mt-1">{subscription.billing_cycle}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <Label className="text-xs text-slate-500 uppercase">Auto Renew</Label>
                      <p className="text-xl font-bold mt-1">{subscription.auto_renew ? '✓ Yes' : '✗ No'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-slate-500">Start Date</Label>
                      <p className="font-medium">{new Date(subscription.start_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">End Date</Label>
                      <p className="font-medium">{subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'No end date'}</p>
                    </div>
                    {subscription.billing_contact_email && (
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-500">Billing Contact</Label>
                        <p className="font-medium">{subscription.billing_contact_email}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500 mb-4">No active subscription found.</p>
                  <Button className="bg-[#86b027] hover:bg-[#769c22]">
                    Contact Sales
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Module Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {moduleSubscriptions.map(mod => (
                  <div key={mod.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-lg">{mod.module_code}</h4>
                        <p className="text-xs text-slate-500">
                          {mod.start_date && new Date(mod.start_date).toLocaleDateString()} - 
                          {mod.end_date ? new Date(mod.end_date).toLocaleDateString() : ' Ongoing'}
                        </p>
                      </div>
                      <Badge variant={
                        mod.status === 'ACTIVE' ? 'default' :
                        mod.status === 'TRIAL' ? 'secondary' :
                        mod.status === 'EXPIRED' ? 'destructive' : 'outline'
                      }>
                        {mod.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {mod.status === 'TRIAL' && <Clock className="w-3 h-3 mr-1" />}
                        {mod.status === 'EXPIRED' && <XCircle className="w-3 h-3 mr-1" />}
                        {mod.status}
                      </Badge>
                    </div>
                    {mod.trial_days_remaining && (
                      <div className="text-xs text-amber-600 mb-2">
                        {mod.trial_days_remaining} days remaining in trial
                      </div>
                    )}
                    {mod.limits_json && (
                      <div className="text-xs text-slate-600 space-y-1">
                        {Object.entries(mod.limits_json).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {moduleSubscriptions.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-slate-500">
                    No module subscriptions configured.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <RoleManagement />
          <UserRoleAssignment />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <ProfileSection />
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showEntityModal} onOpenChange={setShowEntityModal}>
              <DialogTrigger asChild>
                <Button className="bg-[#86b027] hover:bg-[#769c22]" onClick={() => setEditingEntity(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Legal Entity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingEntity ? 'Edit' : 'Add'} Legal Entity</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  saveEntityMutation.mutate(Object.fromEntries(formData));
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Entity Name *</Label>
                      <Input name="name" required defaultValue={editingEntity?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>Country *</Label>
                      <Input name="country" required defaultValue={editingEntity?.country} />
                    </div>
                    <div className="space-y-2">
                      <Label>Entity Type</Label>
                      <Select name="entity_type" defaultValue={editingEntity?.entity_type || 'Subsidiary'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Headquarters">Headquarters</SelectItem>
                          <SelectItem value="Subsidiary">Subsidiary</SelectItem>
                          <SelectItem value="Branch">Branch</SelectItem>
                          <SelectItem value="Joint Venture">Joint Venture</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Reporting Currency</Label>
                      <Input name="reporting_currency" defaultValue={editingEntity?.reporting_currency || 'EUR'} />
                    </div>
                    <div className="space-y-2">
                      <Label>Registration ID</Label>
                      <Input name="registration_id" defaultValue={editingEntity?.registration_id} />
                    </div>
                    <div className="space-y-2">
                      <Label>VAT ID</Label>
                      <Input name="vat_id" defaultValue={editingEntity?.vat_id} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Address</Label>
                      <Input name="address" defaultValue={editingEntity?.address} />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input name="city" defaultValue={editingEntity?.city} />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input name="postal_code" defaultValue={editingEntity?.postal_code} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowEntityModal(false)}>Cancel</Button>
                    <Button type="submit" className="bg-[#86b027] hover:bg-[#769c22]">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {legalEntities.map(entity => (
              <Card key={entity.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg">{entity.name}</h3>
                        <Badge variant={entity.active ? 'default' : 'secondary'}>
                          {entity.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-slate-500">Country</Label>
                          <p className="font-medium">{entity.country}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Type</Label>
                          <p className="font-medium">{entity.entity_type}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Currency</Label>
                          <p className="font-medium">{entity.reporting_currency}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">VAT ID</Label>
                          <p className="font-medium">{entity.vat_id || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingEntity(entity);
                        setShowEntityModal(true);
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm('Delete this entity?')) deleteEntityMutation.mutate(entity.id);
                      }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {legalEntities.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No legal entities configured. Add your first entity to get started.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sites" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showSiteModal} onOpenChange={setShowSiteModal}>
              <DialogTrigger asChild>
                <Button className="bg-[#86b027] hover:bg-[#769c22]" onClick={() => setEditingSite(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Site
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingSite ? 'Edit' : 'Add'} Site</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  saveSiteMutation.mutate(Object.fromEntries(formData));
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Site Name *</Label>
                      <Input name="name" required defaultValue={editingSite?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>Legal Entity *</Label>
                      <Select name="legal_entity_id" defaultValue={editingSite?.legal_entity_id} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent>
                          {legalEntities.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Site Type</Label>
                      <Select name="site_type" defaultValue={editingSite?.site_type || 'Office'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="Warehouse">Warehouse</SelectItem>
                          <SelectItem value="Office">Office</SelectItem>
                          <SelectItem value="R&D">R&D</SelectItem>
                          <SelectItem value="Distribution Center">Distribution Center</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Country *</Label>
                      <Input name="country" required defaultValue={editingSite?.country} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Address</Label>
                      <Input name="address" defaultValue={editingSite?.address} />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input name="city" defaultValue={editingSite?.city} />
                    </div>
                    <div className="space-y-2">
                      <Label>Postal Code</Label>
                      <Input name="postal_code" defaultValue={editingSite?.postal_code} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowSiteModal(false)}>Cancel</Button>
                    <Button type="submit" className="bg-[#86b027] hover:bg-[#769c22]">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {sites.map(site => (
              <Card key={site.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg">{site.name}</h3>
                        <Badge variant={site.active ? 'default' : 'secondary'}>
                          {site.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-slate-500">Type</Label>
                          <p className="font-medium">{site.site_type}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">City</Label>
                          <p className="font-medium">{site.city || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Country</Label>
                          <p className="font-medium">{site.country}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Address</Label>
                          <p className="font-medium">{site.address || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingSite(site);
                        setShowSiteModal(true);
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm('Delete this site?')) deleteSiteMutation.mutate(site.id);
                      }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {sites.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No sites configured. Add your first site to get started.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scopes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showScopeModal} onOpenChange={setShowScopeModal}>
              <DialogTrigger asChild>
                <Button className="bg-[#86b027] hover:bg-[#769c22]" onClick={() => setEditingScope(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Scope
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingScope ? 'Edit' : 'Create'} Reporting Scope</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const data = {
                    name: formData.get('name'),
                    scope_type: formData.get('scope_type'),
                    legal_entity_ids: formData.getAll('legal_entity_ids'),
                    site_ids: formData.getAll('site_ids'),
                    jurisdictions: formData.get('jurisdictions')?.split(',').map(j => j.trim()).filter(Boolean) || [],
                    active: true
                  };
                  saveScopeMutation.mutate(data);
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Scope Name *</Label>
                    <Input name="name" required defaultValue={editingScope?.name} placeholder="e.g., EU Operations, North America..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Scope Type</Label>
                    <Select name="scope_type" defaultValue={editingScope?.scope_type || 'LEGAL_ENTITY'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEGAL_ENTITY">Legal Entity</SelectItem>
                        <SelectItem value="GROUP">Group</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Legal Entities *</Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                      {legalEntities.map(entity => (
                        <label key={entity.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="legal_entity_ids"
                            value={entity.id}
                            defaultChecked={editingScope?.legal_entity_ids?.includes(entity.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{entity.name} ({entity.country})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Sites</Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                      {sites.map(site => (
                        <label key={site.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="site_ids"
                            value={site.id}
                            defaultChecked={editingScope?.site_ids?.includes(site.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{site.name} - {site.site_type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Jurisdictions (comma separated)</Label>
                    <Input name="jurisdictions" defaultValue={editingScope?.jurisdictions?.join(', ')} placeholder="EU, US, UK..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowScopeModal(false)}>Cancel</Button>
                    <Button type="submit" className="bg-[#86b027] hover:bg-[#769c22]">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {scopes.map(scope => (
              <Card key={scope.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg">{scope.name}</h3>
                        <Badge variant={scope.active ? 'default' : 'secondary'}>
                          {scope.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">{scope.scope_type}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-slate-500">Legal Entities</Label>
                          <p className="font-medium">{scope.legal_entity_ids?.length || 0} entities</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Sites</Label>
                          <p className="font-medium">{scope.site_ids?.length || 0} sites</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Jurisdictions</Label>
                          <p className="font-medium">{scope.jurisdictions?.join(', ') || 'None'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingScope(scope);
                        setShowScopeModal(true);
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        if (confirm('Delete this scope?')) deleteScopeMutation.mutate(scope.id);
                      }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {scopes.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No reporting scopes configured. Create your first scope to get started.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
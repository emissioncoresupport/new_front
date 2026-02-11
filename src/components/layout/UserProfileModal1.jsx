import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ComprehensiveUsageDashboard from '../billing/ComprehensiveUsageDashboard';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { User, Building2, Shield, Save, AlertCircle, Info, AlertTriangle, CheckCircle2, Users, Key, Settings, Euro, TrendingUp, BarChart3 } from "lucide-react";
import { getCurrentCompany, getCurrentUser, getUserMe, getUserListByCompany } from '@/components/utils/multiTenant';
import ERPIntegrationPanel from '@/components/integration/ERPIntegrationPanel';
import UserManagementPanel from '@/components/settings/UserManagementPanel';
import APIKeysPanel from '@/components/settings/APIKeysPanel';
import UsageBillingPanel from '@/components/billing/UsageBillingPanel';
import UsageAnalyticsDashboard from '@/components/settings/UsageAnalyticsDashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from 'moment';
//import { useAPIQuery } from '@/lib/ApiQueries'; 
//import { useAuth } from '@/lib/AuthContext'; 

export default function UserProfileModal({ open, onOpenChange }) {
  //const { getUserMe } = useAPIQuery();
  //const { getUserMe } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user-full'],
    queryFn: getCurrentUser,
    enabled: open
  });

  /*const { data: authUser } = useQuery({
    queryKey: ['auth-user'],
    queryFn: () => base44.auth.me(),
    enabled: open
  });
  */

  const { data: authUser, isLoading: loadingMe } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getUserMe,
    enabled: open
  });
  

  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ['user-company'],
    queryFn: getCurrentCompany,
    enabled: open && !!currentUser
  });


  //console.log(authUser);

  //const authUser = getUserMe();
  console.log("ASSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS");
  console.log(currentUser);
  console.log(authUser);
  console.log(company);
  console.log("ASSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS");

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['user-audit-logs'],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.list('-created_date', 100);
      return logs.filter(log => log.company_id === company?.id);
    },
    enabled: open && !!company
  });

  const [userFormData, setUserFormData] = useState({});
  const [companyFormData, setCompanyFormData] = useState({});

  React.useEffect(() => {
    if (currentUser) setUserFormData(currentUser);
  }, [currentUser]);

  React.useEffect(() => {
    if (company) setCompanyFormData(company);
  }, [company]);

  const updateUserMutation = useMutation({
    mutationFn: (data) => {
      if (currentUser?.id) {
        return base44.entities.User.update(currentUser.id, data);
      }
      return base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user-full'] });
      toast.success('Profile updated');
    }
  });

  const updateCompanyMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.update(company.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-company'] });
      toast.success('Company settings updated');
    }
  });

  //console.log("chamizoooooooooooooooooooooooooooooooooooooooo");
  //console.log(getUserMe());

  const isAdmin = authUser?.role === 'admin' || currentUser?.user_role === 'company_admin';

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'WARNING': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getActionColor = (action) => {
    switch(action) {
      case 'CREATE': return 'bg-green-100 text-green-700';
      case 'UPDATE': return 'bg-blue-100 text-blue-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      case 'SUBMIT': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loadingUser) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="py-8 text-center text-slate-500">Loading profile...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>User Profile & Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="usage">
              <TrendingUp className="w-4 h-4 mr-2" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="users" disabled={!isAdmin}>
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="api" disabled={!isAdmin}>
              <Key className="w-4 h-4 mr-2" />
              API
            </TabsTrigger>
            <TabsTrigger value="analytics" disabled={!isAdmin}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Shield className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        value={userFormData.full_name || authUser?.full_name || ''}
                        onChange={(e) => setUserFormData({...userFormData, full_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Email (Login)</Label>
                      <Input
                        value={authUser?.email || ''}
                        disabled
                        className="bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Department</Label>
                      <Input
                        value={userFormData.department || ''}
                        onChange={(e) => setUserFormData({...userFormData, department: e.target.value})}
                        placeholder="e.g., Compliance, Procurement"
                      />
                    </div>
                    <div>
                      <Label>Job Title</Label>
                      <Input
                        value={userFormData.job_title || ''}
                        onChange={(e) => setUserFormData({...userFormData, job_title: e.target.value})}
                        placeholder="e.g., CBAM Manager"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        value={userFormData.phone || ''}
                        onChange={(e) => setUserFormData({...userFormData, phone: e.target.value})}
                        placeholder="+49 123 456 7890"
                      />
                    </div>
                    <div>
                      <Label>Language</Label>
                      <Input
                        value={userFormData.language || 'en'}
                        onChange={(e) => setUserFormData({...userFormData, language: e.target.value})}
                        placeholder="en, de, fr"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-3">Role & Access</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">System Role</p>
                          <p className="text-xs text-slate-500">Inherited from account type</p>
                        </div>
                        <Badge>{authUser?.role || 'user'}</Badge>
                      </div>
                      {isAdmin ? (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <Label>Company Role</Label>
                          <Select
                            value={userFormData.user_role || 'data_entry'}
                            onValueChange={(v) => setUserFormData({...userFormData, user_role: v})}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="company_admin">Company Admin</SelectItem>
                              <SelectItem value="cbam_manager">CBAM Manager</SelectItem>
                              <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                              <SelectItem value="supplier_manager">Supplier Manager</SelectItem>
                              <SelectItem value="data_entry">Data Entry</SelectItem>
                              <SelectItem value="auditor">Auditor</SelectItem>
                              <SelectItem value="read_only">Read Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium">Company Role</p>
                            <p className="text-xs text-slate-500">Assigned by admin</p>
                          </div>
                          <Badge variant="outline">{currentUser?.user_role || 'data_entry'}</Badge>
                        </div>
                      )}
                      {isAdmin ? (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <Label>Assigned Modules</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {['CBAM', 'EUDR', 'CSRD', 'DPP', 'PFAS', 'PPWR', 'LCA', 'CCF', 'SupplyLens'].map(mod => (
                              <Badge
                                key={mod}
                                variant={(userFormData.assigned_modules || []).includes(mod) ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => {
                                  const modules = userFormData.assigned_modules || [];
                                  if (modules.includes(mod)) {
                                    setUserFormData({
                                      ...userFormData,
                                      assigned_modules: modules.filter(m => m !== mod)
                                    });
                                  } else {
                                    setUserFormData({
                                      ...userFormData,
                                      assigned_modules: [...modules, mod]
                                    });
                                  }
                                }}
                              >
                                {mod}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        currentUser?.assigned_modules && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="font-medium mb-2">Assigned Modules</p>
                            <div className="flex flex-wrap gap-2">
                              {currentUser.assigned_modules.map(mod => (
                                <Badge key={mod} variant="secondary">{mod}</Badge>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-3">Notification Preferences</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Email Notifications</Label>
                        <Switch
                          checked={userFormData.notification_preferences?.email_notifications ?? true}
                          onCheckedChange={(checked) => setUserFormData({
                            ...userFormData,
                            notification_preferences: {
                              ...userFormData.notification_preferences,
                              email_notifications: checked
                            }
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Deadline Alerts</Label>
                        <Switch
                          checked={userFormData.notification_preferences?.deadline_alerts ?? true}
                          onCheckedChange={(checked) => setUserFormData({
                            ...userFormData,
                            notification_preferences: {
                              ...userFormData.notification_preferences,
                              deadline_alerts: checked
                            }
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Data Request Notifications</Label>
                        <Switch
                          checked={userFormData.notification_preferences?.data_requests ?? true}
                          onCheckedChange={(checked) => setUserFormData({
                            ...userFormData,
                            notification_preferences: {
                              ...userFormData.notification_preferences,
                              data_requests: checked
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => updateUserMutation.mutate(userFormData)}
                    disabled={updateUserMutation.isPending}
                    className="w-full bg-[#86b027] hover:bg-[#769c22]"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateUserMutation.isPending ? 'Saving...' : 'Save Profile'}
                  </Button>
                </CardContent>
              </Card>

              {isAdmin && company && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Company Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Company Name *</Label>
                        <Input
                          value={companyFormData.company_name || ''}
                          onChange={(e) => setCompanyFormData({...companyFormData, company_name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Company Type</Label>
                        <Select
                          value={companyFormData.company_type || ''}
                          onValueChange={(v) => setCompanyFormData({...companyFormData, company_type: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Importer">Importer</SelectItem>
                            <SelectItem value="Authorized Representative">Authorized Representative</SelectItem>
                            <SelectItem value="Customs Agent">Customs Agent</SelectItem>
                            <SelectItem value="Consultant">Consultant</SelectItem>
                            <SelectItem value="Supplier">Supplier</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>EORI Number</Label>
                        <Input
                          value={companyFormData.eori_number || ''}
                          onChange={(e) => setCompanyFormData({...companyFormData, eori_number: e.target.value})}
                          placeholder="EU123456789012345"
                        />
                      </div>
                      <div>
                        <Label>VAT Number</Label>
                        <Input
                          value={companyFormData.vat_number || ''}
                          onChange={(e) => setCompanyFormData({...companyFormData, vat_number: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input
                        value={companyFormData.address || ''}
                        onChange={(e) => setCompanyFormData({...companyFormData, address: e.target.value})}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>City</Label>
                        <Input
                          value={companyFormData.city || ''}
                          onChange={(e) => setCompanyFormData({...companyFormData, city: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Postal Code</Label>
                        <Input
                          value={companyFormData.postal_code || ''}
                          onChange={(e) => setCompanyFormData({...companyFormData, postal_code: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Country *</Label>
                        <Input
                          value={companyFormData.country || ''}
                          onChange={(e) => setCompanyFormData({...companyFormData, country: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <Label>Active Modules</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['CBAM', 'EUDR', 'CSRD', 'DPP', 'PFAS', 'PPWR', 'LCA', 'CCF', 'SupplyLens', 'VSME', 'EUDAMED'].map(mod => (
                          <Badge
                            key={mod}
                            variant={(companyFormData.active_modules || []).includes(mod) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              const modules = companyFormData.active_modules || [];
                              if (modules.includes(mod)) {
                                setCompanyFormData({
                                  ...companyFormData,
                                  active_modules: modules.filter(m => m !== mod)
                                });
                              } else {
                                setCompanyFormData({
                                  ...companyFormData,
                                  active_modules: [...modules, mod]
                                });
                              }
                            }}
                          >
                            {mod}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button 
                      onClick={() => updateCompanyMutation.mutate(companyFormData)}
                      disabled={updateCompanyMutation.isPending}
                      className="w-full bg-[#86b027] hover:bg-[#769c22]"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateCompanyMutation.isPending ? 'Saving...' : 'Save Company Settings'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="usage" className="space-y-4">
              <ComprehensiveUsageDashboard />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              {!company ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-600">No company profile found</p>
                  </CardContent>
                </Card>
              ) : (
                <UserManagementPanel company={company} />
              )}
            </TabsContent>

            <TabsContent value="api" className="space-y-4">
              {company && isAdmin && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Integrations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ERPIntegrationPanel company={company} />
                    </CardContent>
                  </Card>
                </>
              )}
              <APIKeysPanel />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {isAdmin && authUser && (
                <UsageAnalyticsDashboard user={authUser} />
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-2">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Activity Log:</strong> All actions within your company are tracked for compliance and audit purposes.
                  Logs are retained for 7 years per regulatory requirements.
                </p>
              </div>
              {auditLogs.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-600">No activity logs yet</p>
                    <p className="text-xs text-slate-500 mt-2">Actions will appear here as they occur</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-slate-600">Recent activity (last 100 records)</p>
                    <Badge variant="outline">{auditLogs.length} events</Badge>
                  </div>
                  {auditLogs.map((log, idx) => (
                    <Card key={idx} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getSeverityIcon(log.severity)}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getActionColor(log.action)} variant="outline">
                                  {log.action}
                                </Badge>
                                <span className="font-medium text-slate-900">{log.entity_type}</span>
                                {log.entity_id && (
                                  <span className="text-xs text-slate-400 font-mono">
                                    #{log.entity_id.slice(-8)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600">
                                by <strong>{log.user_email}</strong> • {log.module} module
                              </p>
                              {log.ip_address && (
                                <p className="text-xs text-slate-400 mt-1">
                                  IP: {log.ip_address}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-500 block">
                              {moment(log.created_date).format('MMM D, HH:mm')}
                            </span>
                            <span className="text-xs text-slate-400">
                              {moment(log.created_date).fromNow()}
                            </span>
                          </div>
                        </div>
                        {log.notes && (
                          <p className="text-sm text-slate-700 ml-7 mt-2 p-2 bg-slate-50 rounded">
                            {log.notes}
                          </p>
                        )}
                        {log.changes && (
                          <details className="ml-7 mt-2">
                            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                              View detailed changes
                            </summary>
                            <pre className="mt-2 text-xs bg-slate-900 text-green-400 p-2 rounded overflow-x-auto max-h-40">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
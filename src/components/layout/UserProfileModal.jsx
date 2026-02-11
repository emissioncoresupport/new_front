import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GripHorizontal } from 'lucide-react';
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
import { getCurrentCompany, getCurrentUser, getUserMe } from '@/components/utils/multiTenant';
import ERPIntegrationPanel from '@/components/integration/ERPIntegrationPanel';
import UserManagementPanel from '@/components/settings/UserManagementPanel';
import APIKeysPanel from '@/components/settings/APIKeysPanel';
import UsageBillingPanel from '@/components/billing/UsageBillingPanel';
import UsageAnalyticsDashboard from '@/components/settings/UsageAnalyticsDashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from 'moment';

export default function UserProfileModal({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const contentRef = useRef(null);

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

  const handleDragStart = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

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
      <DialogContent 
        ref={contentRef}
        className="max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-slate-950/98 via-slate-950/95 to-slate-900/95 backdrop-blur-2xl border border-slate-300 cursor-grab active:cursor-grabbing shadow-2xl"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.2)'
        }}
      >
        <DialogHeader 
          onMouseDown={handleDragStart}
          className="border-b border-slate-300 pb-4 cursor-grab active:cursor-grabbing bg-white hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <GripHorizontal className="w-4 h-4 text-slate-600" />
            <DialogTitle className="text-slate-900 font-semibold text-xl">Profile & Settings</DialogTitle>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-6 bg-slate-100 border border-slate-400 p-1 h-auto gap-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 font-medium text-xs hover:text-slate-900">
              <User className="w-4 h-4 mr-1" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 font-medium text-xs hover:text-slate-900">
              <TrendingUp className="w-4 h-4 mr-1" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="users" disabled={!isAdmin} className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 font-medium text-xs hover:text-slate-900 disabled:opacity-50">
              <Users className="w-4 h-4 mr-1" />
              Users
            </TabsTrigger>
            <TabsTrigger value="api" disabled={!isAdmin} className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 font-medium text-xs hover:text-slate-900 disabled:opacity-50">
              <Key className="w-4 h-4 mr-1" />
              API
            </TabsTrigger>
            <TabsTrigger value="analytics" disabled={!isAdmin} className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 font-medium text-xs hover:text-slate-900 disabled:opacity-50">
              <BarChart3 className="w-4 h-4 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 font-medium text-xs hover:text-slate-900">
              <Shield className="w-4 h-4 mr-1" />
              Activity
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="profile" className="space-y-4">
              <div className="bg-gradient-to-br from-white/95 to-white/90 border border-slate-300 rounded-xl p-6 shadow-xl">
                 <h3 className="text-lg font-light text-slate-900 mb-6 flex items-center gap-3">
                   <User className="w-5 h-5 text-slate-700" />
                   Personal Information
                 </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                    <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Full Name *</Label>
                    <Input
                      value={userFormData.full_name || authUser?.full_name || ''}
                      onChange={(e) => setUserFormData({...userFormData, full_name: e.target.value})}
                      className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Email (Login)</Label>
                    <Input
                      value={authUser?.email || ''}
                      disabled
                      className="bg-slate-100 border-slate-300 text-slate-700 mt-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Department</Label>
                    <Input
                      value={userFormData.department || ''}
                      onChange={(e) => setUserFormData({...userFormData, department: e.target.value})}
                      placeholder="e.g., Compliance, Procurement"
                      className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                    />
                    </div>
                    <div>
                    <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Job Title</Label>
                    <Input
                      value={userFormData.job_title || ''}
                      onChange={(e) => setUserFormData({...userFormData, job_title: e.target.value})}
                      placeholder="e.g., CBAM Manager"
                      className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Phone Number</Label>
                    <Input
                      value={userFormData.phone || ''}
                      onChange={(e) => setUserFormData({...userFormData, phone: e.target.value})}
                      placeholder="+49 123 456 7890"
                      className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                    />
                    </div>
                    <div>
                    <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Language</Label>
                    <Input
                      value={userFormData.language || 'en'}
                      onChange={(e) => setUserFormData({...userFormData, language: e.target.value})}
                      placeholder="en, de, fr"
                      className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                </div>
                </div>

                <div className="pt-6 border-t border-slate-300">
                  <h4 className="font-semibold text-slate-900 mb-4 uppercase tracking-wider text-sm">Role & Access</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-300 rounded-lg">
                      <div>
                        <p className="font-light text-slate-900">System Role</p>
                        <p className="text-xs text-slate-700">Inherited from account type</p>
                      </div>
                      <Badge className="bg-slate-700 text-white border-slate-600">{authUser?.role || 'user'}</Badge>
                    </div>
                    {isAdmin ? (
                      <div className="p-4 bg-white border border-slate-300 rounded-lg">
                        <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Company Role</Label>
                        <Select
                          value={userFormData.user_role || 'data_entry'}
                          onValueChange={(v) => setUserFormData({...userFormData, user_role: v})}
                        >
                          <SelectTrigger className="mt-2 bg-white border-slate-300 text-slate-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-300">
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
                      <div className="flex items-center justify-between p-4 bg-white border border-slate-300 rounded-lg">
                        <div>
                          <p className="font-light text-slate-900">Company Role</p>
                          <p className="text-xs text-slate-600">Assigned by admin</p>
                        </div>
                        <Badge className="bg-slate-200 text-slate-900 border-slate-300">{currentUser?.user_role || 'data_entry'}</Badge>
                      </div>
                    )}
                    {isAdmin ? (
                      <div className="p-4 bg-white border border-slate-300 rounded-lg">
                        <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Assigned Modules</Label>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {['CBAM', 'EUDR', 'CSRD', 'DPP', 'PFAS', 'PPWR', 'LCA', 'CCF', 'SupplyLens'].map(mod => (
                            <Badge
                              key={mod}
                              className={(userFormData.assigned_modules || []).includes(mod) ? 'bg-slate-900 text-white border-slate-700 cursor-pointer hover:bg-black' : 'bg-slate-100 text-slate-700 border-slate-300 cursor-pointer hover:bg-slate-200'}
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
                        <div className="p-4 bg-white border border-slate-300 rounded-lg">
                          <p className="font-light text-slate-900 mb-3 text-sm">Assigned Modules</p>
                          <div className="flex flex-wrap gap-2">
                            {currentUser.assigned_modules.map(mod => (
                              <Badge key={mod} className="bg-slate-200 text-slate-900 border-slate-300">{mod}</Badge>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                    </div>
                  </div>

                <div className="pt-6 border-t border-slate-300">
                  <h4 className="font-semibold text-slate-900 mb-4 uppercase tracking-wider text-sm">Notification Preferences</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white border border-slate-300 rounded-lg">
                      <Label className="text-slate-900 font-medium">Email Notifications</Label>
                      <Switch
                        checked={userFormData.notification_preferences?.email_notifications ?? true}
                        onCheckedChange={(checked) => setUserFormData({
                          ...userFormData,
                          notification_preferences: {
                            ...userFormData.notification_preferences,
                            email_notifications: checked
                          }
                        })}
                        className="h-4 w-7 bg-slate-800"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white border border-slate-300 rounded-lg">
                      <Label className="text-slate-900 font-medium">Deadline Alerts</Label>
                      <Switch
                        checked={userFormData.notification_preferences?.deadline_alerts ?? true}
                        onCheckedChange={(checked) => setUserFormData({
                          ...userFormData,
                          notification_preferences: {
                            ...userFormData.notification_preferences,
                            deadline_alerts: checked
                          }
                        })}
                        className="h-4 w-7 bg-slate-800"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white border border-slate-300 rounded-lg">
                      <Label className="text-slate-900 font-medium">Data Request Notifications</Label>
                      <Switch
                        checked={userFormData.notification_preferences?.data_requests ?? true}
                        onCheckedChange={(checked) => setUserFormData({
                          ...userFormData,
                          notification_preferences: {
                            ...userFormData.notification_preferences,
                            data_requests: checked
                          }
                        })}
                        className="h-4 w-7 bg-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => updateUserMutation.mutate(userFormData)}
                  disabled={updateUserMutation.isPending}
                  className="w-full mt-6 bg-slate-900 text-white hover:bg-slate-800 border border-slate-700 font-light"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>

              {isAdmin && company && (
                 <div className="bg-gradient-to-br from-white/95 to-white/90 border border-slate-300 rounded-xl p-6 shadow-xl">
                   <h3 className="text-lg font-light text-slate-900 mb-6 flex items-center gap-3">
                     <Settings className="w-5 h-5 text-slate-700" />
                     Company Settings
                   </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Company Name *</Label>
                        <Input
                          value={companyFormData.company_name || ''}
                          onChange={(e) => setCompanyFormData({...companyFormData, company_name: e.target.value})}
                          className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                        />
                    </div>
                      <div>
                        <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Company Type</Label>
                        <Select
                        value={companyFormData.company_type || ''}
                        onValueChange={(v) => setCompanyFormData({...companyFormData, company_type: v})}
                        >
                        <SelectTrigger className="bg-white border-slate-300 text-slate-900 mt-2">
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-300">
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
                      <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">EORI Number</Label>
                      <Input
                        value={companyFormData.eori_number || ''}
                        onChange={(e) => setCompanyFormData({...companyFormData, eori_number: e.target.value})}
                        placeholder="EU123456789012345"
                        className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                      />
                      </div>
                      <div>
                        <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">VAT Number</Label>
                        <Input
                        value={companyFormData.vat_number || ''}
                        onChange={(e) => setCompanyFormData({...companyFormData, vat_number: e.target.value})}
                        className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                        />
                      </div>
                      </div>
                      <div>
                      <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Address</Label>
                      <Input
                      value={companyFormData.address || ''}
                      onChange={(e) => setCompanyFormData({...companyFormData, address: e.target.value})}
                      placeholder="Street address"
                      className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                      <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">City</Label>
                      <Input
                        value={companyFormData.city || ''}
                        onChange={(e) => setCompanyFormData({...companyFormData, city: e.target.value})}
                        className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                      />
                      </div>
                      <div>
                        <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Postal Code</Label>
                      <Input
                        value={companyFormData.postal_code || ''}
                        onChange={(e) => setCompanyFormData({...companyFormData, postal_code: e.target.value})}
                        className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                      />
                      </div>
                      <div>
                        <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Country *</Label>
                      <Input
                        value={companyFormData.country || ''}
                        onChange={(e) => setCompanyFormData({...companyFormData, country: e.target.value})}
                        className="bg-white border-slate-300 text-slate-900 placeholder-slate-500 mt-2 focus:ring-2 focus:ring-slate-400"
                      />
                      </div>
                      </div>
                      <div className="p-4 bg-white border border-slate-300 rounded-lg">
                      <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wider">Active Modules</Label>
                      <div className="flex flex-wrap gap-2 mt-3">
                      {['CBAM', 'EUDR', 'CSRD', 'DPP', 'PFAS', 'PPWR', 'LCA', 'CCF', 'SupplyLens', 'VSME', 'EUDAMED'].map(mod => (
                        <Badge
                          key={mod}
                          className={(companyFormData.active_modules || []).includes(mod) ? 'bg-slate-900 text-white border-slate-700 cursor-pointer hover:bg-black' : 'bg-slate-100 text-slate-700 border-slate-300 cursor-pointer hover:bg-slate-200'}
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
                    className="w-full mt-6 bg-slate-900 text-white hover:bg-slate-800 border border-slate-700 font-light"
                    >
                    <Save className="w-4 h-4 mr-2" />
                    {updateCompanyMutation.isPending ? 'Saving...' : 'Save Company Settings'}
                    </Button>
                    </div>
                    </div>
                    )}
                    </TabsContent>

            <TabsContent value="usage" className="space-y-4">
              <ComprehensiveUsageDashboard />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
               {!company ? (
                <div className="bg-white border-white/20 rounded-xl p-6 text-center shadow-lg">
                  <Users className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-700 font-light">No company profile found</p>
                </div>
              ) : (
                <UserManagementPanel company={company} />
              )}
            </TabsContent>

            <TabsContent value="api" className="space-y-4">
               {company && isAdmin && (
                 <div className="bg-white border-white/20 rounded-xl p-6 shadow-lg">
                   <h3 className="text-lg font-light text-slate-900 mb-6 flex items-center gap-3">
                     <Settings className="w-5 h-5 text-slate-600" />
                     Integrations
                   </h3>
                   <ERPIntegrationPanel company={company} />
                 </div>
               )}
               <div className="bg-white border-white/20 rounded-xl p-6 shadow-lg">
                 <APIKeysPanel />
               </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {isAdmin && authUser && (
                <UsageAnalyticsDashboard user={authUser} />
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-2">
              <div className="mb-4 p-4 bg-white border border-slate-300 rounded-lg">
                <p className="text-sm text-slate-700 font-light">
                  <span className="text-slate-900 font-medium">Activity Log:</span> All actions within your company are tracked for compliance and audit purposes. Logs are retained for 7 years per regulatory requirements.
                </p>
              </div>
               {auditLogs.length === 0 ? (
                <div className="bg-white border border-slate-300 rounded-xl p-6 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-700 font-light">No activity logs yet</p>
                  <p className="text-xs text-slate-600 mt-2">Actions will appear here as they occur</p>
                </div>
              ) : (
               <>
                 <div className="flex items-center justify-between mb-4">
                   <p className="text-sm text-slate-700 font-light">Recent activity (last 100 records)</p>
                   <Badge className="bg-slate-200 text-slate-900 border-slate-300">{auditLogs.length} events</Badge>
                 </div>
                 {auditLogs.map((log, idx) => (
                   <div key={idx} className="bg-white border border-slate-300 rounded-lg">
                     <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getSeverityIcon(log.severity)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-slate-200 text-slate-900 border-slate-300 text-xs">
                                {log.action}
                              </Badge>
                              <span className="font-light text-slate-900 text-sm">{log.entity_type}</span>
                              {log.entity_id && (
                                <span className="text-xs text-slate-600 font-mono">
                                  #{log.entity_id.slice(-8)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 font-light">
                              by <span className="text-slate-800">{log.user_email}</span> • {log.module} module
                            </p>
                            {log.ip_address && (
                              <p className="text-xs text-slate-500 mt-1">
                                IP: {log.ip_address}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">
                            {moment(log.created_date).format('MMM D, HH:mm')}
                          </span>
                          <span className="text-xs text-slate-500">
                            {moment(log.created_date).fromNow()}
                          </span>
                        </div>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-slate-700 font-light ml-7 mt-2 p-2 bg-slate-100 border border-slate-300 rounded">
                          {log.notes}
                        </p>
                      )}
                      {log.changes && (
                        <details className="ml-7 mt-2">
                          <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-700">
                            View detailed changes
                          </summary>
                          <pre className="mt-2 text-xs bg-slate-100 text-slate-800 p-2 rounded overflow-x-auto max-h-40 border border-slate-300">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </details>
                      )}
                      </div>
                    </div>
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
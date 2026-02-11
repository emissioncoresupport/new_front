import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Plus, Edit, Trash2, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RoleManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    role_name: '',
    role_code: '',
    description: '',
    permissions: {
      supplylens: { view: false, create_supplier: false, edit_supplier: false, delete_supplier: false, create_material: false, edit_material: false, delete_material: false, create_bom: false, edit_bom: false, delete_bom: false, create_mapping: false, edit_mapping: false, delete_mapping: false, view_risk: false, manage_risk: false },
      cbam: { view: false, create_entry: false, edit_entry: false, delete_entry: false, submit_report: false, manage_certificates: false },
      pcf: { view: false, create_product: false, edit_product: false, delete_product: false, calculate_pcf: false },
      dpp: { view: false, create_dpp: false, edit_dpp: false, publish_dpp: false },
      settings: { view: false, manage_users: false, manage_roles: false, manage_integrations: false }
    }
  });

  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list('-created_date'),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Role.create({
        tenant_id: user.tenant_id || user.company_id,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowModal(false);
      resetForm();
      toast.success('Role created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowModal(false);
      resetForm();
      toast.success('Role updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      role_name: '',
      role_code: '',
      description: '',
      permissions: {
        supplylens: { view: false, create_supplier: false, edit_supplier: false, delete_supplier: false, create_material: false, edit_material: false, delete_material: false, create_bom: false, edit_bom: false, delete_bom: false, create_mapping: false, edit_mapping: false, delete_mapping: false, view_risk: false, manage_risk: false },
        cbam: { view: false, create_entry: false, edit_entry: false, delete_entry: false, submit_report: false, manage_certificates: false },
        pcf: { view: false, create_product: false, edit_product: false, delete_product: false, calculate_pcf: false },
        dpp: { view: false, create_dpp: false, edit_dpp: false, publish_dpp: false },
        settings: { view: false, manage_users: false, manage_roles: false, manage_integrations: false }
      }
    });
    setEditingRole(null);
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      role_name: role.role_name,
      role_code: role.role_code,
      description: role.description || '',
      permissions: role.permissions || formData.permissions
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const togglePermission = (module, action) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: !prev.permissions[module][action]
        }
      }
    }));
  };

  const setAllModulePermissions = (module, value) => {
    const modulePerms = formData.permissions[module];
    const updated = Object.keys(modulePerms).reduce((acc, key) => {
      acc[key] = value;
      return acc;
    }, {});
    
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: updated
      }
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Role Management</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Define roles and permissions</p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-[#86b027] hover:bg-[#6d8f20]">
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading roles...</div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 font-medium">No custom roles defined</p>
              <p className="text-sm text-slate-400 mt-1">Create your first role to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {roles.map(role => (
                <div key={role.id} className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-semibold text-slate-900">{role.role_name}</h3>
                        {role.is_system_role && (
                          <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            System
                          </Badge>
                        )}
                        {!role.active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{role.description || 'No description'}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">Code: {role.role_code}</Badge>
                        {Object.entries(role.permissions || {}).map(([module, perms]) => {
                          const enabledCount = Object.values(perms).filter(v => v === true).length;
                          if (enabledCount === 0) return null;
                          return (
                            <Badge key={module} className="bg-slate-100 text-slate-700 text-xs capitalize">
                              {module}: {enabledCount} permissions
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(role)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!role.is_system_role && (
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (confirm(`Delete role "${role.role_name}"?`)) {
                            deleteMutation.mutate(role.id);
                          }
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role Name *</Label>
                <Input
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  required
                  placeholder="e.g., Material Specialist"
                />
              </div>
              <div>
                <Label>Role Code *</Label>
                <Input
                  value={formData.role_code}
                  onChange={(e) => setFormData({ ...formData, role_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  required
                  placeholder="e.g., material_specialist"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this role"
              />
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Permissions</Label>
              <Tabs defaultValue="supplylens" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="supplylens">SupplyLens</TabsTrigger>
                  <TabsTrigger value="cbam">CBAM</TabsTrigger>
                  <TabsTrigger value="pcf">PCF</TabsTrigger>
                  <TabsTrigger value="dpp">DPP</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                {Object.entries(formData.permissions).map(([module, perms]) => (
                  <TabsContent key={module} value={module} className="space-y-3 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-slate-700 capitalize">{module} Permissions</p>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setAllModulePermissions(module, true)}>
                          Select All
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setAllModulePermissions(module, false)}>
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(perms).map(([action, enabled]) => (
                        <div key={action} className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => togglePermission(module, action)}
                            className="rounded"
                          />
                          <Label className="capitalize cursor-pointer flex-1">
                            {action.replace(/_/g, ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#86b027] hover:bg-[#6d8f20]">
                {editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
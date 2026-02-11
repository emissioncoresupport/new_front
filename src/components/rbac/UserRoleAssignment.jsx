import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Search, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

export default function UserRoleAssignment() {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    user_email: '',
    role_id: ''
  });

  const queryClient = useQueryClient();

  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: () => base44.entities.UserRole.list('-created_date'),
    initialData: []
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.filter({ active: true }),
    initialData: []
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const assignMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.UserRole.create({
        tenant_id: user.tenant_id || user.company_id,
        ...data,
        assigned_by: user.email,
        assigned_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      setShowModal(false);
      setFormData({ user_email: '', role_id: '' });
      toast.success('Role assigned successfully');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => base44.entities.UserRole.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('Role revoked');
    }
  });

  const getRoleName = (roleId) => roles.find(r => r.id === roleId)?.role_name || 'Unknown';

  const filteredAssignments = userRoles.filter(ur =>
    ur.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getRoleName(ur.role_id).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">User Role Assignments</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Assign roles to users</p>
              </div>
            </div>
            <Button onClick={() => setShowModal(true)} className="bg-[#86b027] hover:bg-[#6d8f20]">
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Role
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by user email or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading assignments...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 font-medium">No role assignments yet</p>
              <p className="text-sm text-slate-400 mt-1">Start by assigning roles to users</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredAssignments.map(assignment => (
                <div key={assignment.id} className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-700">
                          {assignment.user_email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{assignment.user_email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Shield className="w-3 h-3 text-slate-400" />
                          <Badge variant="outline" className="text-xs">{getRoleName(assignment.role_id)}</Badge>
                          {assignment.assigned_by && (
                            <span className="text-xs text-slate-500">
                              by {assignment.assigned_by}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Revoke role from ${assignment.user_email}?`)) {
                          revokeMutation.mutate(assignment.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              assignMutation.mutate(formData);
            }}
            className="space-y-4"
          >
            <div>
              <Label>User Email *</Label>
              <Select
                value={formData.user_email}
                onValueChange={(v) => setFormData({ ...formData, user_email: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map(user => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Role *</Label>
              <Select
                value={formData.role_id}
                onValueChange={(v) => setFormData({ ...formData, role_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#86b027] hover:bg-[#6d8f20]">
                Assign Role
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
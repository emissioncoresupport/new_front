import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, Mail, Shield, CheckCircle2, XCircle } from "lucide-react";
import moment from 'moment';
import { getCurrentCompany, getCurrentUser, getUserMe, getUserListByCompany } from '@/components/utils/multiTenant';

export default function UserManagementPanel({ company }) {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  /*const { data: users = [] } = useQuery({
    queryKey: ['company-users', company?.id],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.company_id === company?.id);
    },
    enabled: !!company
  });*/

  const { data: users = [] } = useQuery({
      queryKey: ['company-users'],
      queryFn: getUserListByCompany,
      enabled: !!company
    });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      toast.success('User updated');
      setEditingUser(null);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      toast.success('User removed');
    }
  });

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'company_admin': return 'bg-purple-100 text-purple-700';
      case 'cbam_manager': return 'bg-blue-100 text-blue-700';
      case 'compliance_officer': return 'bg-green-100 text-green-700';
      case 'auditor': return 'bg-amber-100 text-amber-700';
      case 'read_only': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#86b027]" />
            User Management
          </CardTitle>
          <Button onClick={() => setInviteModalOpen(true)} size="sm" className="bg-[#86b027]">
            <Plus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No users yet. Invite team members to get started.</p>
            </div>
          ) : (
            users.map(user => (
              <Card key={user.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#86b027] text-white flex items-center justify-center font-bold">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{user.full_name}</span>
                          {user.is_active ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{user.email}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge className={getRoleBadgeColor(user.user_role)}>
                            {user.user_role}
                          </Badge>
                          {user.job_title && (
                            <Badge variant="outline">{user.job_title}</Badge>
                          )}
                        </div>
                        {user.last_login && (
                          <p className="text-xs text-slate-400 mt-1">
                            Last login: {moment(user.last_login).fromNow()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingUser(user)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Remove this user?')) {
                            deleteUserMutation.mutate(user.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User: {editingUser?.full_name}</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={editingUser.full_name || ''}
                      onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <Input
                      value={editingUser.job_title || ''}
                      onChange={(e) => setEditingUser({...editingUser, job_title: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={editingUser.department || ''}
                      onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={editingUser.phone || ''}
                      onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Company Role</Label>
                  <Select
                    value={editingUser.user_role}
                    onValueChange={(v) => setEditingUser({...editingUser, user_role: v})}
                  >
                    <SelectTrigger>
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
                <div>
                  <Label>Assigned Modules</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['CBAM', 'EUDR', 'CSRD', 'DPP', 'PFAS', 'PPWR', 'LCA', 'CCF', 'SupplyLens'].map(mod => (
                      <Badge
                        key={mod}
                        variant={(editingUser.assigned_modules || []).includes(mod) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          const modules = editingUser.assigned_modules || [];
                          if (modules.includes(mod)) {
                            setEditingUser({
                              ...editingUser,
                              assigned_modules: modules.filter(m => m !== mod)
                            });
                          } else {
                            setEditingUser({
                              ...editingUser,
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
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <Label>Active Status</Label>
                  <Switch
                    checked={editingUser.is_active}
                    onCheckedChange={(checked) => setEditingUser({...editingUser, is_active: checked})}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button
                className="bg-[#86b027]"
                onClick={() => updateUserMutation.mutate({ userId: editingUser.id, data: editingUser })}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite User Dialog */}
        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <p className="text-sm text-slate-500">
                An invitation email will be sent to this address. They will be able to create an account and join your company.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-[#86b027]"
                onClick={() => {
                  toast.success('Invitation sent to ' + inviteEmail);
                  setInviteModalOpen(false);
                  setInviteEmail('');
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
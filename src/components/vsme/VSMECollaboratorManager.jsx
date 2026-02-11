import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Users, Plus, Mail, Shield, Building2, CheckCircle, UserPlus, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VSMENotificationPreferences from './VSMENotificationPreferences';

export default function VSMECollaboratorManager() {
  const [showInvite, setShowInvite] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const queryClient = useQueryClient();

  const { data: collaborators = [] } = useQuery({
    queryKey: ['vsme-collaborators'],
    queryFn: () => base44.entities.VSMECollaborator.list('-created_date')
  });

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      const token = Math.random().toString(36).substr(2, 16);
      const collaborator = await base44.entities.VSMECollaborator.create({
        ...data,
        invite_token: token,
        invite_sent_date: new Date().toISOString(),
        status: 'invited'
      });

      // Send invitation email
      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: 'VSME Reporting Collaboration Invitation',
        body: `Hello ${data.name},\n\nYou have been invited to collaborate on VSME sustainability reporting.\n\nRole: ${data.role}\nDepartment: ${data.department}\n\nPlease access the portal to contribute your assigned disclosures.\n\nBest regards,\nEmission Core Team`
      });

      return collaborator;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vsme-collaborators'] });
      toast.success('Invitation sent successfully');
      setShowInvite(false);
    }
  });

  const roleIcons = {
    author: Shield,
    preparer: Building2,
    approver: CheckCircle,
    auditor: Shield,
    contributor: UserPlus
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              VSME Collaborators
            </CardTitle>
            <Dialog open={showInvite} onOpenChange={setShowInvite}>
              <DialogTrigger asChild>
                <Button className="bg-[#86b027] hover:bg-[#769c22]">
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Collaborator
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Collaborator</DialogTitle>
                </DialogHeader>
                <InviteForm onSubmit={(data) => inviteMutation.mutate(data)} isSubmitting={inviteMutation.isPending} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {collaborators.map(collab => {
            const RoleIcon = roleIcons[collab.role] || UserPlus;
            return (
              <Card key={collab.id} className="bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#86b027]/10 flex items-center justify-center">
                        <RoleIcon className="w-5 h-5 text-[#86b027]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#545454]">{collab.name}</h4>
                        <p className="text-xs text-slate-500">{collab.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{collab.department}</Badge>
                      <Badge className={collab.status === 'active' ? 'bg-[#86b027]' : 'bg-slate-400'}>
                        {collab.role}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCollaborator(collab);
                          setShowPreferences(true);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {collab.disclosure_assignments && collab.disclosure_assignments.length > 0 && (
                    <div className="mt-3 flex gap-1 flex-wrap">
                      {collab.disclosure_assignments.map(disc => (
                        <Badge key={disc} variant="outline" className="text-xs">{disc}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Notification Preferences Dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Settings - {selectedCollaborator?.name}</DialogTitle>
          </DialogHeader>
          {selectedCollaborator && (
            <VSMENotificationPreferences collaborator={selectedCollaborator} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteForm({ onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'contributor',
    department: 'esg',
    disclosure_assignments: []
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role *</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="author">Author</SelectItem>
              <SelectItem value="preparer">Preparer</SelectItem>
              <SelectItem value="approver">Approver</SelectItem>
              <SelectItem value="auditor">Auditor</SelectItem>
              <SelectItem value="contributor">Contributor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Department *</Label>
          <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="esg">ESG</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
              <SelectItem value="procurement">Procurement</SelectItem>
              <SelectItem value="management">Management</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={() => onSubmit(formData)}
        disabled={isSubmitting || !formData.name || !formData.email}
        className="w-full bg-[#86b027] hover:bg-[#769c22]"
      >
        <Mail className="w-4 h-4 mr-2" />
        Send Invitation
      </Button>
    </div>
  );
}
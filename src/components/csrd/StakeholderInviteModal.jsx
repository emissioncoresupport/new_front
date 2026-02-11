import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Users, Mail } from "lucide-react";

export default function StakeholderInviteModal({ open, onOpenChange }) {
  const [step, setStep] = useState(1);
  const [selectionMode, setSelectionMode] = useState('new'); // 'new' or 'existing'
  const [formData, setFormData] = useState({
    stakeholder_email: '',
    stakeholder_name: '',
    stakeholder_type: 'employee',
    purpose: 'CSRD Materiality Assessment and Sustainability Reporting',
    custom_message: '',
    supplier_id: ''
  });

  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-for-invite'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: open
  });

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      // Create consent record
      const consent = await base44.entities.CSRDStakeholderConsent.create({
        stakeholder_email: data.email,
        stakeholder_name: data.name,
        stakeholder_type: data.type,
        purpose: data.purpose,
        data_categories: ['sustainability data', 'ESG metrics', 'impact assessments', 'supporting documentation'],
        retention_period_months: 24
      });

      // Send GDPR-compliant invitation email with portal link
      const portalLink = `${window.location.origin}/stakeholder-portal?token=${consent.id}`;
      
      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: 'CSRD Stakeholder Engagement - Data Collection Request',
        body: `Dear ${data.name || 'Stakeholder'},

We are conducting our Corporate Sustainability Reporting Directive (CSRD) sustainability assessment and value your input.

${data.custom_message ? `\n${data.custom_message}\n\n` : ''}

ACCESS YOUR SECURE PORTAL:
Click here to access your stakeholder portal: ${portalLink}

In the portal, you can:
✓ Review and provide consent for data processing
✓ Upload supporting documents and evidence
✓ Complete assigned tasks and questionnaires
✓ Track your contributions

DATA PROTECTION & GDPR COMPLIANCE:
Your participation is voluntary. By accessing the portal and providing consent, you agree to:
• Provide feedback and data on sustainability topics
• Have your responses used for CSRD reporting purposes
• Data retention for 24 months as per CSRD requirements

Your data will be processed in accordance with GDPR. You may:
• Withdraw consent at any time
• Request data deletion
• Access all data we hold about you

If you have any questions, please contact our sustainability team.

Best regards,
Sustainability Team

---
This is an automated email for CSRD compliance. Portal link is valid and secure.`
      });

      return consent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrd-stakeholder-consents'] });
      toast.success('Invitation sent successfully!');
      setStep(1);
      setFormData({
        stakeholder_email: '',
        stakeholder_name: '',
        stakeholder_type: 'employee',
        purpose: 'CSRD Materiality Assessment and Sustainability Reporting',
        custom_message: '',
        supplier_id: ''
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to send invitation: ' + error.message);
    }
  });

  const handleSupplierSelect = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setFormData({
        ...formData,
        supplier_id: supplierId,
        stakeholder_email: supplier.contact_email || '',
        stakeholder_name: supplier.legal_name,
        stakeholder_type: 'supplier'
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.stakeholder_email || !formData.stakeholder_name) {
      toast.error('Email and name are required');
      return;
    }

    inviteMutation.mutate({
      email: formData.stakeholder_email,
      name: formData.stakeholder_name,
      type: formData.stakeholder_type,
      purpose: formData.purpose,
      custom_message: formData.custom_message
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite Stakeholder to CSRD Portal</DialogTitle>
          <p className="text-sm text-slate-600">Send a secure invitation with portal access</p>
        </DialogHeader>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Select Stakeholder Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={selectionMode === 'new' ? 'default' : 'outline'}
                    onClick={() => setSelectionMode('new')}
                    className={selectionMode === 'new' ? 'bg-[#86b027] hover:bg-[#769c22]' : ''}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    New Contact
                  </Button>
                  <Button
                    type="button"
                    variant={selectionMode === 'existing' ? 'default' : 'outline'}
                    onClick={() => setSelectionMode('existing')}
                    className={selectionMode === 'existing' ? 'bg-[#86b027] hover:bg-[#769c22]' : ''}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Existing Supplier
                  </Button>
                </div>
              </div>

              {selectionMode === 'existing' && (
                <div className="space-y-2">
                  <Label>Select Supplier from SupplyLens</Label>
                  <Select value={formData.supplier_id} onValueChange={handleSupplierSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.legal_name} - {supplier.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {suppliers.length === 0 && (
                    <p className="text-xs text-slate-500">No suppliers found in SupplyLens</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Stakeholder Category *</Label>
                <Select 
                  value={formData.stakeholder_type} 
                  onValueChange={(val) => setFormData({...formData, stakeholder_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee (Own Workforce)</SelectItem>
                    <SelectItem value="supplier">Supplier (Value Chain)</SelectItem>
                    <SelectItem value="customer">Customer / End-user</SelectItem>
                    <SelectItem value="community">Affected Community</SelectItem>
                    <SelectItem value="investor">Investor / Financial Stakeholder</SelectItem>
                    <SelectItem value="ngo">NGO / Civil Society</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stakeholder Name *</Label>
                <Input
                  value={formData.stakeholder_name}
                  onChange={(e) => setFormData({...formData, stakeholder_name: e.target.value})}
                  placeholder="Full name or organization"
                />
              </div>

              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={formData.stakeholder_email}
                  onChange={(e) => setFormData({...formData, stakeholder_email: e.target.value})}
                  placeholder="stakeholder@example.com"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => setStep(2)}
                  disabled={!formData.stakeholder_email || !formData.stakeholder_name}
                  className="bg-[#86b027] hover:bg-[#769c22]"
                >
                  Next: Customize Message
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Purpose of Data Collection</Label>
                <Input
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Custom Message (Optional)</Label>
                <Textarea
                  value={formData.custom_message}
                  onChange={(e) => setFormData({...formData, custom_message: e.target.value})}
                  placeholder="Add a personal message to the invitation..."
                  className="h-24"
                />
                <p className="text-xs text-slate-500">
                  This will be included in the invitation email before the portal link
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-sm text-[#545454] mb-2">Email Preview</h4>
                <p className="text-xs text-slate-600">
                  The stakeholder will receive an email with:
                </p>
                <ul className="text-xs text-slate-600 mt-2 space-y-1 ml-4">
                  <li>• Secure portal link for data submission</li>
                  <li>• GDPR consent form</li>
                  <li>• Instructions for uploading evidence</li>
                  <li>• Data protection information</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={inviteMutation.isPending}
                  className="bg-[#86b027] hover:bg-[#769c22]"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
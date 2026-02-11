import React, { useState } from 'react';
import DraggableDashboard from '@/components/layout/DraggableDashboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Mail, FileText } from "lucide-react";
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

const TEMPLATES = {
  standard_cbam: {
    label: "EU CBAM Communication Template (Official)",
    subject: "Action Required: EU CBAM Compliance Data Request",
    defaultMessage: "We require your CBAM emissions data for compliance with EU Regulation 2023/956. Please access the portal to download the official EU template and submit your installation data.",
    attachmentName: "Standard_CBAM_Communication_Template_v2.0.xls",
    description: "Attaches the official EU template for installations to fill out."
  },
  simplified: {
    label: "Simplified Data Request",
    subject: "Data Request: Preliminary CBAM Information",
    defaultMessage: "Please provide preliminary production and emissions data for your facility. This simplified request helps us assess initial compliance gaps.",
    attachmentName: "Simplified_Data_Collection_Form.xlsx",
    description: "A lighter version for initial data gathering (non-compliant for final submission)."
  },
  full_audit: {
    label: "Full Installation Audit Request",
    subject: "Urgent: Full Installation Audit for CBAM Verification",
    defaultMessage: "We require a full audit of your installation's emissions. Please upload your latest ISO 14064 verification reports and complete the detailed audit questionnaire.",
    attachmentName: "Full_Audit_Checklist_ISO14064.pdf",
    description: "Requests comprehensive verification documents and audit trails."
  }
};

export default function CBAMInviteModal({ open, onOpenChange }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [email, setEmail] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [templateType, setTemplateType] = useState("standard_cbam");
  const [message, setMessage] = useState(TEMPLATES.standard_cbam.defaultMessage);
  const [selectedImportId, setSelectedImportId] = useState(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);

  const { data: availableImports = [] } = useQuery({
    queryKey: ['cbam-imports-invite'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  const { data: existingSuppliers = [] } = useQuery({
    queryKey: ['suppliers-for-invite'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const tenant_id = user.company_id || user.tenant_id || user.id;
      return base44.entities.Supplier.filter({ company_id: tenant_id });
    }
  });

  const handleSupplierSelect = (supplierId) => {
    if (supplierId === 'new') {
      setIsNewSupplier(true);
      setSelectedSupplierId(null);
      setEmail("");
      setSupplierName("");
    } else {
      setIsNewSupplier(false);
      setSelectedSupplierId(supplierId);
      const supplier = existingSuppliers.find(s => s.id === supplierId);
      if (supplier) {
        setSupplierName(supplier.legal_name || supplier.trade_name || "");
        setEmail(supplier.primary_contact_email || supplier.email || "");
      }
    }
  };

  const handleTemplateChange = (value) => {
    setTemplateType(value);
    setMessage(TEMPLATES[value].defaultMessage);
  };

  const inviteMutation = useMutation({
    mutationFn: async () => {
      // 1. Use existing supplier or create new one
      let supplier;
      if (selectedSupplierId && !isNewSupplier) {
        supplier = existingSuppliers.find(s => s.id === selectedSupplierId);
      } else {
        supplier = await base44.entities.Supplier.create({
            legal_name: supplierName,
            primary_contact_email: email,
            country: "Unknown",
            status: "pending_review",
            source: "cbam_invite"
        });
      }

      // 2. Create Secure Token & Link
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days expiry

      const scopes = ['portal_access'];
      if (selectedImportId && selectedImportId !== 'all') {
        scopes.push(`import:${selectedImportId}`);
      }

      await base44.entities.SupplierInviteToken.create({
          token: token,
          supplier_id: supplier.id,
          email: email,
          expires_at: expiresAt,
          status: 'active',
          access_scope: scopes
      });

      const portalLink = `${window.location.origin}/SupplierPortal?token=${token}`;

      // 3. Send Email
      const template = TEMPLATES[templateType];
      await base44.integrations.Core.SendEmail({
          to: email,
          subject: `${template.subject} - ${supplierName}`,
          body: `
            Hello,
            
            ${message}
            
            Attached Template: ${template.attachmentName}
            
            Please access the Supplier Portal to upload your evidence and manage your compliance data:
            ${portalLink}
            
            Best regards,
            Compliance Team
          `
      });
      
      // 4. Create a tracking task
      await base44.entities.OnboardingTask.create({
          supplier_id: supplier.id,
          task_type: 'welcome_email',
          title: 'Invite Sent',
          status: 'sent',
          sent_date: new Date().toISOString()
      });

      // 5. Create the specific documentation task for the portal
      await base44.entities.OnboardingTask.create({
          supplier_id: supplier.id,
          task_type: 'documentation',
          title: `Complete ${template.label}`,
          description: `Please download the attached ${template.attachmentName} from your email, fill it out, and upload it here.`,
          status: 'pending',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days due
          required_documents: [template.attachmentName],
          related_entity_id: (selectedImportId && selectedImportId !== 'all') ? selectedImportId : null,
          related_entity_type: (selectedImportId && selectedImportId !== 'all') ? 'import' : null
      });
      
      return supplier;
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${email}`);
      onOpenChange(false);
      setSelectedSupplierId(null);
      setEmail("");
      setSupplierName("");
      setIsNewSupplier(false);
    }
  });

  return (
    <DraggableDashboard
      open={open}
      onClose={() => onOpenChange(false)}
      title="Invite Supplier to CBAM Portal"
      icon={Mail}
      width="600px"
      height="auto"
      defaultPosition="center"
    >
      <div className="p-6">
        <p className="text-sm text-slate-600 mb-6">
          Send an invitation to your supplier to onboard them and request CBAM-compliant data.
        </p>
        
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider">Select Supplier</Label>
            <Select value={selectedSupplierId || (isNewSupplier ? 'new' : '')} onValueChange={handleSupplierSelect}>
               <SelectTrigger className="bg-white/50 backdrop-blur-md border-white/40">
                 <SelectValue placeholder="Choose existing or create new..." />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="new">+ Create New Supplier</SelectItem>
                 {existingSuppliers.map(supplier => (
                   <SelectItem key={supplier.id} value={supplier.id}>
                     {supplier.legal_name || supplier.trade_name} {supplier.country ? `(${supplier.country})` : ''}
                   </SelectItem>
                 ))}
               </SelectContent>
            </Select>
          </div>

          {(isNewSupplier || selectedSupplierId) && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="supplierName" className="text-xs font-medium uppercase tracking-wider">
                  Supplier Company Name {!isNewSupplier && "(Read-only)"}
                </Label>
                <Input 
                  id="supplierName" 
                  value={supplierName} 
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g., SteelCorp Industries"
                  className="bg-white/50 backdrop-blur-md border-white/40"
                  disabled={!isNewSupplier}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider">
                  Contact Email {!isNewSupplier && supplier.primary_contact_email ? "(From supplier record)" : ""}
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@supplier.com"
                  className="bg-white/50 backdrop-blur-md border-white/40"
                />
              </div>
            </>
          )}
          
          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider">Link to Specific Import (Optional)</Label>
            <Select value={selectedImportId || "all"} onValueChange={setSelectedImportId}>
               <SelectTrigger className="bg-white/50 backdrop-blur-md border-white/40">
                 <SelectValue placeholder="Select Import Record..." />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Imports (Full Access)</SelectItem>
                 {availableImports.map(imp => (
                   <SelectItem key={imp.id} value={imp.id}>
                     {imp.import_id || imp.id.substring(0,8)} - {imp.product_name} ({imp.quantity}t)
                   </SelectItem>
                 ))}
               </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Restricts the supplier's view to only this specific import record if selected.
            </p>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider">Data Template</Label>
            <Select value={templateType} onValueChange={handleTemplateChange}>
               <SelectTrigger className="bg-white/50 backdrop-blur-md border-white/40">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                   <SelectItem key={key} value={key}>{tmpl.label}</SelectItem>
                 ))}
               </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {TEMPLATES[templateType].description}
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="message" className="text-xs font-medium uppercase tracking-wider">Personal Message</Label>
            <Textarea 
              id="message" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="bg-white/50 backdrop-blur-md border-white/40"
            />
          </div>
          
          <div className="bg-[#02a1e8]/5 backdrop-blur-xl p-4 rounded-lg border border-[#02a1e8]/20 flex gap-3">
             <FileText className="w-5 h-5 text-[#02a1e8] flex-shrink-0 mt-0.5" />
             <div className="text-xs text-slate-700">
               <span className="font-semibold text-slate-900">Included:</span> {TEMPLATES[templateType].attachmentName}
               <br/>
               Your supplier will receive a secure link to upload this file once completed.
             </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/60">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-200/80 text-slate-700 hover:bg-slate-50">
            Cancel
          </Button>
          <Button 
            onClick={() => inviteMutation.mutate()} 
            disabled={!email || !supplierName || (!selectedSupplierId && !isNewSupplier) || inviteMutation.isPending}
            className="bg-[#86b027] hover:bg-[#769c22] text-white"
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
            <Mail className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </DraggableDashboard>
  );
}
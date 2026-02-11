import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  FileText, CheckCircle2, X, Save, ExternalLink, 
  Calendar, Award, Building2 
} from "lucide-react";

export default function PPWRDeclarationViewer({ declaration, packaging, suppliers, onClose }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    verification_status: declaration.verification_status,
    notes: declaration.notes || '',
    ...declaration.extracted_data
  });
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.DPPEvidence.update(declaration.id, {
        verification_status: data.verification_status,
        notes: data.notes,
        extracted_data: {
          ...declaration.extracted_data,
          pcr_percentage: data.pcr_percentage,
          certificate_number: data.certificate_number,
          issue_date: data.issue_date,
          expiry_date: data.expiry_date,
          certification_body: data.certification_body,
          supplier_id: data.supplier_id
        },
        verified_by: (await base44.auth.me()).email,
        verification_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ppwr-declarations']);
      toast.success('Declaration updated');
      setIsEditing(false);
    }
  });

  const linkedPackaging = packaging.find(p => p.id === declaration.dpp_id);
  const supplier = suppliers.find(s => s.id === declaration.extracted_data?.supplier_id);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {declaration.file_name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Document Info */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-1">
              <div className="text-xs text-slate-500">Document</div>
              <div className="font-medium">{declaration.file_name}</div>
              <div className="text-xs text-slate-500">
                Uploaded {new Date(declaration.upload_date).toLocaleDateString()} by {declaration.uploaded_by}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(declaration.file_url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View
            </Button>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Verification Status</Label>
            {isEditing ? (
              <Select 
                value={formData.verification_status} 
                onValueChange={(value) => setFormData({...formData, verification_status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Valid</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="rejected">Incomplete/Rejected</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div>
                {formData.verification_status === 'verified' && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Valid
                  </Badge>
                )}
                {formData.verification_status === 'expiring_soon' && (
                  <Badge className="bg-amber-100 text-amber-700">Expiring Soon</Badge>
                )}
                {formData.verification_status === 'expired' && (
                  <Badge className="bg-rose-100 text-rose-700">Expired</Badge>
                )}
                {formData.verification_status === 'pending' && (
                  <Badge className="bg-blue-100 text-blue-700">Pending Review</Badge>
                )}
              </div>
            )}
          </div>

          {/* Extracted Data */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="font-bold text-blue-900">Extracted Information</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PCR Content (%)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.pcr_percentage || ''}
                    onChange={(e) => setFormData({...formData, pcr_percentage: Number(e.target.value)})}
                  />
                ) : (
                  <div className="text-2xl font-bold text-emerald-600">
                    {formData.pcr_percentage || 'N/A'}%
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Certificate Number</Label>
                {isEditing ? (
                  <Input
                    value={formData.certificate_number || ''}
                    onChange={(e) => setFormData({...formData, certificate_number: e.target.value})}
                  />
                ) : (
                  <div className="font-medium">{formData.certificate_number || 'N/A'}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Issue Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.issue_date || ''}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formData.issue_date ? new Date(formData.issue_date).toLocaleDateString() : 'N/A'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Expiry Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.expiry_date || ''}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formData.expiry_date ? new Date(formData.expiry_date).toLocaleDateString() : 'N/A'}
                  </div>
                )}
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Certification Body</Label>
                {isEditing ? (
                  <Input
                    value={formData.certification_body || ''}
                    onChange={(e) => setFormData({...formData, certification_body: e.target.value})}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-slate-400" />
                    {formData.certification_body || 'N/A'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Linked Data */}
          <div className="grid grid-cols-2 gap-4">
            {linkedPackaging && (
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-slate-500 mb-1">Linked Packaging</div>
                <div className="font-medium text-blue-600">{linkedPackaging.packaging_name}</div>
              </div>
            )}
            {supplier && (
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-slate-500 mb-1">Supplier</div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <div className="font-medium">{supplier.legal_name}</div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            {isEditing ? (
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Add verification notes..."
                className="h-24"
              />
            ) : (
              <div className="p-3 bg-slate-50 rounded border text-sm text-slate-700">
                {formData.notes || 'No notes'}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => updateMutation.mutate(formData)}
                  disabled={updateMutation.isPending}
                  className="bg-emerald-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
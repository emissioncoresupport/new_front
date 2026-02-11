import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

export default function RequestDataModal({ open, onOpenChange, importEntry }) {
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-for-request'],
    queryFn: () => base44.entities.Supplier.list(),
    enabled: open
  });

  const requestDataMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const users = await base44.entities.User.list();
      const fullUser = users.find(u => u.email === user.email);
      
      const defaultMessage = `We need verified emission data for the following import:

Product: ${importEntry.product_name}
CN Code: ${importEntry.cn_code}
Country: ${importEntry.country_of_origin}
Production Route: ${importEntry.production_route || 'Not specified'}
Quantity: ${importEntry.quantity} tonnes

Please provide:
- Direct emissions (tCO2e/tonne)
- Indirect emissions (tCO2e/tonne)  
- Third-party verification report (ISO 14064 or equivalent)
- Calculation methodology used per EU Implementing Regulation 2023/1773

${customMessage ? '\n\nAdditional Notes:\n' + customMessage : ''}

This data is required for accurate CBAM reporting per EU Regulation 2023/956.`;

      return base44.entities.SupplierCBAMMessage.create({
        supplier_id: selectedSupplier,
        company_id: fullUser?.company_id,
        sender_type: 'company',
        sender_email: user.email,
        sender_name: user.full_name || 'CBAM Team',
        subject: `URGENT: Verified Emission Data Request - ${importEntry.product_name}`,
        message: defaultMessage,
        message_type: 'data_request',
        priority: 'urgent',
        submission_id: importEntry.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-messages'] });
      toast.success('Data request sent to supplier');
      onOpenChange(false);
      setCustomMessage('');
      setSelectedSupplier('');
    },
    onError: () => {
      toast.error('Failed to send request');
    }
  });

  const handleSend = () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier');
      return;
    }
    requestDataMutation.mutate();
  };

  const relevantSuppliers = suppliers.filter(s => 
    s.country === importEntry?.country_of_origin || 
    s.cbam_relevant === true
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request Verified Data from Supplier</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold text-slate-900 mb-2">Import Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Product:</span>
                <p className="font-medium">{importEntry?.product_name}</p>
              </div>
              <div>
                <span className="text-slate-500">CN Code:</span>
                <p className="font-mono">{importEntry?.cn_code}</p>
              </div>
              <div>
                <span className="text-slate-500">Country:</span>
                <p className="font-medium">{importEntry?.country_of_origin}</p>
              </div>
              <div>
                <span className="text-slate-500">Quantity:</span>
                <p className="font-medium">{importEntry?.quantity} tonnes</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Supplier *</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Choose supplier..." />
              </SelectTrigger>
              <SelectContent>
                {relevantSuppliers.length > 0 ? (
                  relevantSuppliers.map(sup => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.legal_name || sup.trade_name} - {sup.country}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No suppliers found for this country</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add any specific requirements or context..."
              rows={4}
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              The supplier will receive a detailed request including product specs, required data fields, 
              and regulatory references. They can respond via the Supplier Portal.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={requestDataMutation.isPending || !selectedSupplier}
              className="bg-[#02a1e8] hover:bg-[#0189c9] text-white"
            >
              {requestDataMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
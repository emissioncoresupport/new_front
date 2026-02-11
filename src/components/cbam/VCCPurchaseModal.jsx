import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Info } from "lucide-react";
import { toast } from "sonner";

export default function VCCPurchaseModal({ isOpen, onClose, currentPrice }) {
  const [formData, setFormData] = useState({
    quantity: '',
    contract_type: 'Spot',
    conversion_date: '',
    collateral_percentage: 20,
    notes: ''
  });

  const queryClient = useQueryClient();

  const vccPrice = currentPrice * 0.95; // 5% discount to spot

  const purchaseVCCMutation = useMutation({
    mutationFn: async (data) => {
      const quantity = Number(data.quantity);
      const pricePerUnit = vccPrice;
      const totalAmount = quantity * pricePerUnit;

      let upfrontCost = totalAmount;
      if (data.contract_type === 'Margined Forward') {
        upfrontCost = totalAmount * (data.collateral_percentage / 100);
      } else if (data.contract_type === 'Full Credit Line Forward') {
        upfrontCost = 0; // Subject to credit approval
      }

      return await base44.entities.VCCertificate.create({
        vcc_id: `VCC-${Date.now()}`,
        purchase_date: new Date().toISOString(),
        quantity: quantity,
        purchase_price_per_unit: pricePerUnit,
        total_purchase_amount: totalAmount,
        contract_type: data.contract_type,
        conversion_date: data.conversion_date,
        status: 'Active',
        remaining_quantity: quantity,
        market_value_at_purchase: currentPrice,
        collateral_percentage: data.contract_type === 'Margined Forward' ? data.collateral_percentage : null,
        credit_approved: data.contract_type === 'Full Credit Line Forward' ? true : null,
        notes: data.notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcc-certificates'] });
      toast.success('VCC purchase order created successfully');
      onClose();
      setFormData({
        quantity: '',
        contract_type: 'Spot',
        conversion_date: '',
        collateral_percentage: 20,
        notes: ''
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.quantity || !formData.conversion_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    purchaseVCCMutation.mutate(formData);
  };

  const calculateCosts = () => {
    const quantity = Number(formData.quantity) || 0;
    const totalCost = quantity * vccPrice;
    let upfrontCost = totalCost;

    if (formData.contract_type === 'Margined Forward') {
      upfrontCost = totalCost * (formData.collateral_percentage / 100);
    } else if (formData.contract_type === 'Full Credit Line Forward') {
      upfrontCost = 0;
    }

    return { totalCost, upfrontCost };
  };

  const { totalCost, upfrontCost } = calculateCosts();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#86b027]" />
            Purchase Virtual CBAM Certificates (VCC®)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Type Selection */}
          <div>
            <Label>Contract Type *</Label>
            <Select value={formData.contract_type} onValueChange={(val) => setFormData({...formData, contract_type: val})}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Spot">
                  <div className="py-1">
                    <p className="font-semibold">Spot</p>
                    <p className="text-xs text-slate-500">Pay full upfront - Maximum flexibility</p>
                  </div>
                </SelectItem>
                <SelectItem value="Margined Forward">
                  <div className="py-1">
                    <p className="font-semibold">Margined Forward</p>
                    <p className="text-xs text-slate-500">Deposit % upfront + variation margin payments</p>
                  </div>
                </SelectItem>
                <SelectItem value="Full Credit Line Forward">
                  <div className="py-1">
                    <p className="font-semibold">Full Credit Line Forward</p>
                    <p className="text-xs text-slate-500">Subject to KYC & credit approval</p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantity (units) *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                placeholder="Enter quantity"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Conversion Date *</Label>
              <Input
                type="date"
                value={formData.conversion_date}
                onChange={(e) => setFormData({...formData, conversion_date: e.target.value})}
                className="mt-2"
              />
            </div>
          </div>

          {formData.contract_type === 'Margined Forward' && (
            <div>
              <Label>Collateral Percentage (%)</Label>
              <Input
                type="number"
                value={formData.collateral_percentage}
                onChange={(e) => setFormData({...formData, collateral_percentage: Number(e.target.value)})}
                min="10"
                max="100"
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">Initial deposit required (typically 20-30%)</p>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes..."
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Cost Summary */}
          {formData.quantity && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#86b027]" />
                Cost Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">VCC Price per Unit</p>
                  <p className="font-bold text-slate-900">€{vccPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Market Price per Unit</p>
                  <p className="font-bold text-slate-500">€{currentPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total Contract Value</p>
                  <p className="font-bold text-slate-900">€{totalCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Upfront Payment</p>
                  <p className="font-bold text-[#86b027]">€{upfrontCost.toFixed(2)}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs text-emerald-600 font-medium">
                  ✓ Saving €{((currentPrice - vccPrice) * Number(formData.quantity)).toFixed(2)} vs buying CBAM certificates now
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={purchaseVCCMutation.isPending}
              className="bg-gradient-to-r from-[#86b027] to-[#02a1e8] text-white"
            >
              {purchaseVCCMutation.isPending ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
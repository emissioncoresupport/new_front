import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRightLeft, TrendingUp, Calendar, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function VCCRegistry({ vccHoldings, priceHistory }) {
  const queryClient = useQueryClient();
  const currentPrice = priceHistory[0]?.cbam_certificate_price || 85;

  const convertToCAMMutation = useMutation({
    mutationFn: async (vcc) => {
      // Update VCC status
      await base44.entities.VCCertificate.update(vcc.id, {
        status: 'Converted',
        converted_quantity: vcc.remaining_quantity || vcc.quantity,
        remaining_quantity: 0
      });

      // Create CBAM Certificate
      await base44.entities.CBAMCertificate.create({
        certificate_number: `CBAM-${Date.now()}`,
        quantity: vcc.remaining_quantity || vcc.quantity,
        purchase_price: vcc.purchase_price_per_unit,
        purchase_date: new Date().toISOString(),
        status: 'active',
        source: 'VCC Conversion',
        notes: `Converted from VCC ID: ${vcc.vcc_id}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcc-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['cbam-certificates'] });
      toast.success('VCC successfully converted to CBAM certificates');
    }
  });

  const calculateSavings = (vcc) => {
    const quantity = vcc.remaining_quantity || vcc.quantity;
    const lockedCost = quantity * vcc.purchase_price_per_unit;
    const currentCost = quantity * currentPrice;
    return currentCost - lockedCost;
  };

  return (
    <div className="space-y-4">
      {vccHoldings.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 mb-2">No VCC holdings yet</p>
            <p className="text-xs text-slate-400">Purchase VCCs to protect against price volatility</p>
          </CardContent>
        </Card>
      ) : (
        vccHoldings.map((vcc) => {
          const savings = calculateSavings(vcc);
          const quantity = vcc.remaining_quantity || vcc.quantity;
          
          return (
            <Card key={vcc.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-slate-900">{vcc.vcc_id}</h3>
                      <Badge className={
                        vcc.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-0' :
                        vcc.status === 'Converted' ? 'bg-blue-100 text-blue-700 border-0' :
                        vcc.status === 'Resold' ? 'bg-purple-100 text-purple-700 border-0' :
                        'bg-slate-100 text-slate-700 border-0'
                      }>
                        {vcc.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {vcc.contract_type}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-5 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Quantity</p>
                        <p className="font-bold text-slate-900">{quantity} units</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Locked Price</p>
                        <p className="font-bold text-slate-900">€{vcc.purchase_price_per_unit.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Current Market</p>
                        <p className="font-bold text-slate-900">€{currentPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Conversion Date</p>
                        <p className="font-bold text-slate-900">
                          {format(new Date(vcc.conversion_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Total Savings</p>
                        <p className={`font-bold ${savings > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {savings > 0 ? '+' : ''}€{savings.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {savings > 0 && (
                      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg inline-flex">
                        <TrendingUp className="w-3 h-3" />
                        <span>You're saving €{(currentPrice - vcc.purchase_price_per_unit).toFixed(2)} per unit vs current market</span>
                      </div>
                    )}
                  </div>

                  {vcc.status === 'Active' && (
                    <Button
                      onClick={() => convertToCAMMutation.mutate(vcc)}
                      disabled={convertToCAMMutation.isPending}
                      className="bg-[#86b027] hover:bg-[#86b027]/90 text-white"
                    >
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Convert to CBAM
                    </Button>
                  )}

                  {vcc.status === 'Converted' && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Converted</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
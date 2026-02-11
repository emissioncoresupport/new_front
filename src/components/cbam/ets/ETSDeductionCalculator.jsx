import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calculator, CheckCircle2, AlertTriangle, ArrowRight, 
  Info, Minus, Euro, TrendingDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

/**
 * ETS Deduction Calculator
 * Per Art. 9 of EU Regulation 2023/956:
 * - Importers can deduct carbon price paid in country of origin
 * - ETS allowances surrendered for embedded emissions can be deducted
 * - Deduction limited to: embedded emissions × EUA price
 * - Proof required (registry confirmation)
 */

export default function ETSDeductionCalculator({ entry, onDeductionApplied }) {
  const [selectedAllowances, setSelectedAllowances] = useState([]);
  const [deductionAmount, setDeductionAmount] = useState(0);
  const queryClient = useQueryClient();

  // Fetch available ETS allowances
  const { data: allowances = [] } = useQuery({
    queryKey: ['ets-allowances'],
    queryFn: () => base44.entities.ETSAllowance.list()
  });

  // Fetch current ETS price
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['cbam-price-history'],
    queryFn: () => base44.entities.CBAMPriceHistory.list('-date', 1)
  });

  const currentETSPrice = priceHistory[0]?.eua_price || 88;
  const cbamPrice = priceHistory[0]?.cbam_certificate_price || 88;

  const availableAllowances = allowances.filter(a => 
    a.status === 'available' && (a.quantity - (a.allocated_quantity || 0)) > 0
  );

  // Calculate deduction
  useEffect(() => {
    const totalAllocated = selectedAllowances.reduce((sum, id) => {
      const allowance = allowances.find(a => a.id === id);
      return sum + Math.min(
        allowance?.quantity - (allowance?.allocated_quantity || 0) || 0,
        entry.total_embedded_emissions || 0
      );
    }, 0);

    // Deduction = min(allowances surrendered, embedded emissions) × ETS price
    const maxDeduction = Math.min(totalAllocated, entry.total_embedded_emissions || 0) * currentETSPrice;
    setDeductionAmount(maxDeduction);
  }, [selectedAllowances, allowances, entry, currentETSPrice]);

  // Apply deduction mutation
  const applyDeductionMutation = useMutation({
    mutationFn: async () => {
      // Allocate allowances
      for (const allowanceId of selectedAllowances) {
        const allowance = allowances.find(a => a.id === allowanceId);
        if (!allowance) continue;

        const availableQty = allowance.quantity - (allowance.allocated_quantity || 0);
        const allocateQty = Math.min(availableQty, entry.total_embedded_emissions || 0);

        await base44.entities.ETSAllowance.update(allowanceId, {
          status: 'allocated_cbam',
          allocated_to_entry_id: entry.id,
          allocated_quantity: (allowance.allocated_quantity || 0) + allocateQty,
          product_category: entry.aggregated_goods_category
        });
      }

      // Update emission entry with deduction
      await base44.entities.CBAMEmissionEntry.update(entry.id, {
        carbon_price_due_paid: deductionAmount,
        carbon_price_country: 'EU-ETS',
        carbon_price_scheme_name: 'European Union Emissions Trading System',
        carbon_price_certificate_url: 'ETS-REGISTRY-DEDUCTION'
      });

      return { deductionAmount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ets-allowances'] });
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      toast.success(`ETS deduction of €${data.deductionAmount.toFixed(2)} applied`);
      if (onDeductionApplied) onDeductionApplied(data.deductionAmount);
    }
  });

  const toggleAllowance = (id) => {
    setSelectedAllowances(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const grossCBAMCost = (entry.total_embedded_emissions || 0) * cbamPrice;
  const netCBAMCost = grossCBAMCost - deductionAmount;
  const savingsPercentage = grossCBAMCost > 0 ? (deductionAmount / grossCBAMCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Calculator className="w-5 h-5 text-blue-600" />
                </div>
                ETS Allowance Deduction
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Apply ETS allowances to reduce CBAM obligation per Art. 9
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Entry Summary */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="font-bold text-slate-800 mb-3">Import Details</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Product:</span>
                <span className="ml-2 font-semibold text-slate-900">{entry.product_name}</span>
              </div>
              <div>
                <span className="text-slate-500">Embedded Emissions:</span>
                <span className="ml-2 font-bold text-slate-900">
                  {(entry.total_embedded_emissions || 0).toFixed(2)} tCO2e
                </span>
              </div>
              <div>
                <span className="text-slate-500">Origin:</span>
                <span className="ml-2 font-semibold text-slate-900">{entry.country_of_origin}</span>
              </div>
            </div>
          </div>

          {/* Available Allowances */}
          <div>
            <h4 className="font-bold text-slate-800 mb-3">Select ETS Allowances</h4>
            {availableAllowances.length === 0 ? (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-slate-700">
                  No available ETS allowances. Add allowances to your portfolio to enable deductions.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {availableAllowances.map((allowance) => {
                  const available = allowance.quantity - (allowance.allocated_quantity || 0);
                  const isSelected = selectedAllowances.includes(allowance.id);
                  
                  return (
                    <div
                      key={allowance.id}
                      onClick={() => toggleAllowance(allowance.id)}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                                {allowance.allowance_type}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                Vintage: {allowance.vintage_year}
                              </span>
                            </div>
                            <p className="text-sm font-mono text-slate-600">
                              Account: {allowance.registry_account}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {available.toFixed(0)} tCO2e
                          </p>
                          <p className="text-xs text-slate-500">available</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deduction Calculation */}
          {deductionAmount > 0 && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-blue-600" />
                Deduction Summary
              </h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Gross CBAM Cost:</span>
                  <span className="font-mono font-bold text-slate-900">
                    €{grossCBAMCost.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm border-t border-blue-200 pt-3">
                  <span className="text-blue-700 font-semibold flex items-center gap-1">
                    <Minus className="w-4 h-4" />
                    ETS Deduction:
                  </span>
                  <span className="font-mono font-bold text-blue-700">
                    -€{deductionAmount.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm border-t border-blue-200 pt-3">
                  <span className="text-slate-900 font-bold">Net CBAM Cost:</span>
                  <span className="font-mono font-bold text-emerald-700 text-lg">
                    €{netCBAMCost.toFixed(2)}
                  </span>
                </div>

                <Alert className="border-emerald-200 bg-emerald-50 mt-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-sm text-emerald-700">
                    <strong>Savings: {savingsPercentage.toFixed(1)}%</strong> - 
                    Your CBAM obligation reduced by €{deductionAmount.toFixed(2)}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Regulatory Notice */}
          <Alert className="border-slate-200 bg-slate-50">
            <Info className="h-4 w-4 text-slate-600" />
            <AlertDescription className="text-xs text-slate-600">
              <strong>Art. 9 Requirements:</strong> Deduction limited to actual carbon price paid or 
              ETS allowances surrendered. Registry confirmation required. Allowances allocated here 
              will be marked as surrendered for CBAM compliance.
            </AlertDescription>
          </Alert>

          {/* Apply Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => applyDeductionMutation.mutate()}
              disabled={selectedAllowances.length === 0 || applyDeductionMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {applyDeductionMutation.isPending ? (
                'Applying...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Apply Deduction
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
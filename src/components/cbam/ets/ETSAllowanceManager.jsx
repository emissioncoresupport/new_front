import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, Plus, ArrowRight, Layers, CheckCircle2, 
  AlertTriangle, Calendar, Euro, Database
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ETSAllowanceManager() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    registry_account: '',
    allowance_type: 'EUA',
    quantity: 0,
    vintage_year: new Date().getFullYear(),
    acquisition_price: 0
  });
  
  const queryClient = useQueryClient();

  // Fetch allowances
  const { data: allowances = [] } = useQuery({
    queryKey: ['ets-allowances'],
    queryFn: () => base44.entities.ETSAllowance.list('-acquisition_date')
  });

  // Fetch latest ETS price
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['cbam-price-history'],
    queryFn: () => base44.entities.CBAMPriceHistory.list('-date', 1)
  });

  const currentETSPrice = priceHistory[0]?.eua_price || 88;

  // Calculate totals
  const totalAllowances = allowances.reduce((sum, a) => sum + (a.quantity || 0), 0);
  const availableAllowances = allowances
    .filter(a => a.status === 'available')
    .reduce((sum, a) => sum + ((a.quantity || 0) - (a.allocated_quantity || 0)), 0);
  const allocatedToCABM = allowances
    .filter(a => a.status === 'allocated_cbam')
    .reduce((sum, a) => sum + (a.allocated_quantity || 0), 0);
  const totalValue = availableAllowances * currentETSPrice;

  // Add allowance mutation
  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.ETSAllowance.create({
      ...data,
      current_market_value: currentETSPrice,
      status: 'available'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ets-allowances'] });
      toast.success('ETS allowance added successfully');
      setShowAddModal(false);
      setFormData({
        registry_account: '',
        allowance_type: 'EUA',
        quantity: 0,
        vintage_year: new Date().getFullYear(),
        acquisition_price: 0
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ETS Allowance Portfolio</h2>
          <p className="text-slate-500 mt-1">
            Manage EU ETS allowances for CBAM deductions per Art. 9 of Regulation 2023/956
          </p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#86b027] hover:bg-[#769c22]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Allowance
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Layers className="w-5 h-5 text-blue-500" />
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{totalAllowances.toFixed(0)}</h3>
            <p className="text-xs font-medium text-slate-600">Total Allowances</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{availableAllowances.toFixed(0)}</h3>
            <p className="text-xs font-medium text-slate-600">Available for CBAM</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ArrowRight className="w-5 h-5 text-purple-500" />
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{allocatedToCABM.toFixed(0)}</h3>
            <p className="text-xs font-medium text-slate-600">Allocated to CBAM</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Euro className="w-5 h-5 text-amber-500" />
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">€{totalValue.toLocaleString()}</h3>
            <p className="text-xs font-medium text-slate-600">Market Value @ €{currentETSPrice}</p>
          </CardContent>
        </Card>
      </div>

      {/* Current ETS Price */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Current EU ETS Price</p>
              <p className="text-xs text-slate-600">ICE Futures Europe (live)</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-700">€{currentETSPrice.toFixed(2)}</p>
            <p className="text-xs text-slate-600">per tCO2e</p>
          </div>
        </CardContent>
      </Card>

      {/* Allowances Table */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Allowance Registry</CardTitle>
        </CardHeader>
        <CardContent>
          {allowances.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No ETS Allowances</h3>
              <p className="text-slate-500 mb-6">Add your EU ETS allowances to enable CBAM deductions</p>
              <Button onClick={() => setShowAddModal(true)} className="bg-[#86b027] hover:bg-[#769c22]">
                <Plus className="w-4 h-4 mr-2" />
                Add First Allowance
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {allowances.map((allowance) => (
                <div 
                  key={allowance.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-blue-100 text-blue-700 border-0">
                          {allowance.allowance_type}
                        </Badge>
                        <Badge variant="outline">{allowance.vintage_year}</Badge>
                        <Badge className={
                          allowance.status === 'available' ? 'bg-emerald-100 text-emerald-700 border-0' :
                          allowance.status === 'allocated_cbam' ? 'bg-purple-100 text-purple-700 border-0' :
                          'bg-slate-100 text-slate-700 border-0'
                        }>
                          {allowance.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Account:</span>
                          <span className="ml-2 font-mono text-xs font-semibold text-slate-900">
                            {allowance.registry_account}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Quantity:</span>
                          <span className="ml-2 font-bold text-slate-900">
                            {allowance.quantity} tCO2e
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Available:</span>
                          <span className="ml-2 font-bold text-emerald-700">
                            {(allowance.quantity - (allowance.allocated_quantity || 0)).toFixed(0)} tCO2e
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Acquired:</span>
                          <span className="ml-2 font-semibold text-slate-900">
                            €{allowance.acquisition_price}/t
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Value:</span>
                          <span className="ml-2 font-bold text-slate-900">
                            €{((allowance.quantity - (allowance.allocated_quantity || 0)) * currentETSPrice).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Allowance Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add ETS Allowance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Registry Account *</Label>
                <Input
                  placeholder="EU-XXX-XXXXXXX"
                  value={formData.registry_account}
                  onChange={(e) => setFormData({...formData, registry_account: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Allowance Type *</Label>
                <Select 
                  value={formData.allowance_type}
                  onValueChange={(val) => setFormData({...formData, allowance_type: val})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUA">EUA (EU Allowance)</SelectItem>
                    <SelectItem value="CER">CER (Certified Emission Reduction)</SelectItem>
                    <SelectItem value="ERU">ERU (Emission Reduction Unit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity (tCO2e) *</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Vintage Year *</Label>
                <Input
                  type="number"
                  placeholder="2025"
                  value={formData.vintage_year}
                  onChange={(e) => setFormData({...formData, vintage_year: parseInt(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Acquisition Price (EUR per tCO2e) *</Label>
                <Input
                  type="number"
                  placeholder="85.50"
                  value={formData.acquisition_price}
                  onChange={(e) => setFormData({...formData, acquisition_price: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Current ETS price: €{currentETSPrice}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button 
              onClick={() => addMutation.mutate(formData)}
              disabled={!formData.registry_account || !formData.quantity}
              className="bg-[#86b027] hover:bg-[#769c22]"
            >
              Add Allowance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
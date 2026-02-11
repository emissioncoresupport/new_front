import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CreateInventoryFlowModal({ studyId, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    flow_name: '',
    flow_type: 'Elementary Flow',
    direction: 'Input',
    lifecycle_stage: 'Production',
    amount: 0,
    unit: 'kg',
    substance_category: '',
    data_source: '',
    data_quality_rating: 3
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.LCAInventoryFlow.create({
        ...data,
        study_id: studyId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-inventory-flows'] });
      toast.success('Inventory flow added');
      onClose();
      setFormData({
        flow_name: '',
        flow_type: 'Elementary Flow',
        direction: 'Input',
        lifecycle_stage: 'Production',
        amount: 0,
        unit: 'kg',
        substance_category: '',
        data_source: '',
        data_quality_rating: 3
      });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Inventory Flow</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Flow Name *</Label>
            <Input 
              value={formData.flow_name}
              onChange={(e) => setFormData({...formData, flow_name: e.target.value})}
              placeholder="e.g., Electricity, Steel, CO2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={formData.direction} onValueChange={(v) => setFormData({...formData, direction: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Input">Input</SelectItem>
                  <SelectItem value="Output">Output</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Flow Type</Label>
              <Select value={formData.flow_type} onValueChange={(v) => setFormData({...formData, flow_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Elementary Flow">Elementary Flow</SelectItem>
                  <SelectItem value="Product Flow">Product Flow</SelectItem>
                  <SelectItem value="Waste Flow">Waste Flow</SelectItem>
                  <SelectItem value="Energy Flow">Energy Flow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Life Cycle Stage</Label>
            <Select value={formData.lifecycle_stage} onValueChange={(v) => setFormData({...formData, lifecycle_stage: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Raw Material Acquisition">Raw Material Acquisition</SelectItem>
                <SelectItem value="Production">Production</SelectItem>
                <SelectItem value="Distribution">Distribution</SelectItem>
                <SelectItem value="Use">Use</SelectItem>
                <SelectItem value="End-of-Life">End-of-Life</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input 
                type="number"
                step="0.001"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Input 
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                placeholder="kg, kWh, m3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data Quality (1-5)</Label>
            <Select value={formData.data_quality_rating.toString()} onValueChange={(v) => setFormData({...formData, data_quality_rating: parseInt(v)})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n} - {n===5 ? 'Excellent' : n===4 ? 'Good' : n===3 ? 'Fair' : n===2 ? 'Poor' : 'Very Poor'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => createMutation.mutate(formData)}
            disabled={!formData.flow_name || !formData.amount}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Add Flow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
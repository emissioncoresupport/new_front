import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function LCACustomDatasetModal({ dataset, isOpen, onClose }) {
  const [formData, setFormData] = useState({
    dataset_name: '',
    process_name: '',
    activity_type: 'Material',
    unit: 'kg',
    emission_factor_climate: 0,
    emission_factor_water: 0,
    emission_factor_acidification: 0,
    geographic_scope: '',
    temporal_scope: new Date().getFullYear().toString(),
    data_source_type: 'Primary',
    source_type: 'Manual Entry',
    version: '1.0',
    temporal_representativeness: 1,
    geographical_representativeness: 1,
    technological_representativeness: 1,
    completeness_score: 1,
    measurement_method: '',
    validation_notes: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (dataset) {
      setFormData(dataset);
    }
  }, [dataset]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (dataset) {
        return base44.entities.LCACustomDataset.update(dataset.id, data);
      } else {
        return base44.entities.LCACustomDataset.create({
          ...data,
          validation_status: 'Pending',
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-custom-datasets'] });
      toast.success(dataset ? 'Dataset updated' : 'Dataset created');
      onClose();
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dataset ? 'Edit Dataset' : 'Create Custom Dataset'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Dataset Name *</Label>
            <Input
              value={formData.dataset_name}
              onChange={(e) => setFormData({...formData, dataset_name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Process Name *</Label>
            <Input
              value={formData.process_name}
              onChange={(e) => setFormData({...formData, process_name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Activity Type</Label>
            <Select value={formData.activity_type} onValueChange={(v) => setFormData({...formData, activity_type: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Material">Material</SelectItem>
                <SelectItem value="Energy">Energy</SelectItem>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="Waste">Waste</SelectItem>
                <SelectItem value="Process">Process</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Unit *</Label>
            <Input
              value={formData.unit}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
              placeholder="kg, kWh, tkm, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Climate Impact (kg CO₂e per unit)</Label>
            <Input
              type="number"
              step="0.001"
              value={formData.emission_factor_climate}
              onChange={(e) => setFormData({...formData, emission_factor_climate: parseFloat(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <Label>Water Use (m³ per unit)</Label>
            <Input
              type="number"
              step="0.001"
              value={formData.emission_factor_water}
              onChange={(e) => setFormData({...formData, emission_factor_water: parseFloat(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <Label>Acidification (kg SO₂ eq per unit)</Label>
            <Input
              type="number"
              step="0.001"
              value={formData.emission_factor_acidification}
              onChange={(e) => setFormData({...formData, emission_factor_acidification: parseFloat(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Source Type</Label>
            <Select value={formData.data_source_type} onValueChange={(v) => setFormData({...formData, data_source_type: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Primary">Primary (Measured)</SelectItem>
                <SelectItem value="Secondary">Secondary (Database)</SelectItem>
                <SelectItem value="Tertiary">Tertiary (Estimated)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Geographic Scope</Label>
            <Input
              value={formData.geographic_scope}
              onChange={(e) => setFormData({...formData, geographic_scope: e.target.value})}
              placeholder="e.g., Global, Europe, Germany"
            />
          </div>

          <div className="space-y-2">
            <Label>Temporal Scope (Year)</Label>
            <Input
              value={formData.temporal_scope}
              onChange={(e) => setFormData({...formData, temporal_scope: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Temporal Quality (1=current, 5=old)</Label>
            <Select value={formData.temporal_representativeness?.toString()} onValueChange={(v) => setFormData({...formData, temporal_representativeness: parseInt(v)})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Geographic Quality (1=exact, 5=far)</Label>
            <Select value={formData.geographical_representativeness?.toString()} onValueChange={(v) => setFormData({...formData, geographical_representativeness: parseInt(v)})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Technology Quality (1=same, 5=different)</Label>
            <Select value={formData.technological_representativeness?.toString()} onValueChange={(v) => setFormData({...formData, technological_representativeness: parseInt(v)})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Completeness (1=100%, 5=poor)</Label>
            <Select value={formData.completeness_score?.toString()} onValueChange={(v) => setFormData({...formData, completeness_score: parseInt(v)})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Measurement Method</Label>
            <Textarea
              value={formData.measurement_method}
              onChange={(e) => setFormData({...formData, measurement_method: e.target.value})}
              placeholder="Describe how this data was measured or estimated..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => saveMutation.mutate(formData)}
            disabled={!formData.dataset_name || !formData.process_name || !formData.unit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {dataset ? 'Update' : 'Create'} Dataset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
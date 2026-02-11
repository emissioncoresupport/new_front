import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CreateLCAStudyModal({ isOpen, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    study_name: '',
    product_id: '',
    functional_unit: '1 piece',
    goal_and_scope: '',
    system_boundary: 'Cradle-to-Gate',
    impact_assessment_method: 'ReCiPe 2016',
    study_type: 'Detailed',
    geographical_scope: '',
    temporal_scope: new Date().getFullYear().toString(),
    practitioner: '',
    status: 'Draft'
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.LCAStudy.create(data);
    },
    onSuccess: (study) => {
      queryClient.invalidateQueries({ queryKey: ['lca-studies'] });
      toast.success('LCA study created');
      onSuccess(study.id);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New LCA Study</DialogTitle>
          <DialogDescription>ISO 14040/14044 compliant life cycle assessment</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Study Name *</Label>
            <Input 
              value={formData.study_name}
              onChange={(e) => setFormData({...formData, study_name: e.target.value})}
              placeholder="e.g., LCA of Product X - 2024"
            />
          </div>

          <div className="space-y-2">
            <Label>Product *</Label>
            <Select value={formData.product_id} onValueChange={(v) => setFormData({...formData, product_id: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Study Type</Label>
              <Select value={formData.study_type} onValueChange={(v) => setFormData({...formData, study_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Screening">Screening</SelectItem>
                  <SelectItem value="Simplified">Simplified</SelectItem>
                  <SelectItem value="Detailed">Detailed</SelectItem>
                  <SelectItem value="Comparative">Comparative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Functional Unit *</Label>
              <Input 
                value={formData.functional_unit}
                onChange={(e) => setFormData({...formData, functional_unit: e.target.value})}
                placeholder="e.g., 1 kg, 1 piece"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Goal and Scope Definition (ISO 14040)</Label>
            <Textarea 
              value={formData.goal_and_scope}
              onChange={(e) => setFormData({...formData, goal_and_scope: e.target.value})}
              placeholder="Define the goal, scope, functional unit, system boundaries..."
              className="h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>System Boundary</Label>
              <Select value={formData.system_boundary} onValueChange={(v) => setFormData({...formData, system_boundary: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cradle-to-Gate">Cradle-to-Gate</SelectItem>
                  <SelectItem value="Cradle-to-Grave">Cradle-to-Grave</SelectItem>
                  <SelectItem value="Gate-to-Gate">Gate-to-Gate</SelectItem>
                  <SelectItem value="Cradle-to-Cradle">Cradle-to-Cradle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Impact Assessment Method</Label>
              <Select value={formData.impact_assessment_method} onValueChange={(v) => setFormData({...formData, impact_assessment_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ReCiPe 2016">ReCiPe 2016</SelectItem>
                  <SelectItem value="CML-IA">CML-IA</SelectItem>
                  <SelectItem value="ILCD 2011">ILCD 2011</SelectItem>
                  <SelectItem value="EF 3.0">EF 3.0</SelectItem>
                  <SelectItem value="TRACI">TRACI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Geographical Scope</Label>
              <Input 
                value={formData.geographical_scope}
                onChange={(e) => setFormData({...formData, geographical_scope: e.target.value})}
                placeholder="e.g., Europe, Global"
              />
            </div>

            <div className="space-y-2">
              <Label>Temporal Scope</Label>
              <Input 
                value={formData.temporal_scope}
                onChange={(e) => setFormData({...formData, temporal_scope: e.target.value})}
                placeholder="e.g., 2024"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>LCA Practitioner</Label>
            <Input 
              value={formData.practitioner}
              onChange={(e) => setFormData({...formData, practitioner: e.target.value})}
              placeholder="Name of person conducting study"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => createMutation.mutate(formData)}
            disabled={!formData.study_name || !formData.product_id || !formData.functional_unit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Create Study
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
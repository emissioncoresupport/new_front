import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function LCAGoalScope({ studyId, study }) {
  const [formData, setFormData] = useState({
    goal_and_scope: study?.goal_and_scope || '',
    system_boundary: study?.system_boundary || 'Cradle-to-Gate',
    reference_flow: study?.reference_flow || 1,
    impact_assessment_method: study?.impact_assessment_method || 'ReCiPe 2016',
    allocation_method: study?.allocation_method || 'Physical (Mass)',
    allocation_justification: study?.allocation_justification || '',
    geographical_scope: study?.geographical_scope || '',
    temporal_scope: study?.temporal_scope || '',
    cutoff_criteria: study?.cutoff_criteria || '',
    includes_packaging: study?.includes_packaging || false,
    includes_storage: study?.includes_storage || false,
    includes_waste_treatment: study?.includes_waste_treatment || false,
    includes_transport_packaging: study?.includes_transport_packaging || false
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.LCAStudy.update(studyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-study', studyId] });
      toast.success('Goal & Scope updated');
    }
  });

  const completenessCheck = () => {
    const required = ['goal_and_scope', 'system_boundary', 'allocation_method', 'allocation_justification', 'geographical_scope', 'temporal_scope'];
    const filled = required.filter(field => formData[field]).length;
    return Math.round((filled / required.length) * 100);
  };

  const completeness = completenessCheck();

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">ISO 14040: Goal & Scope Definition</CardTitle>
            <div className="flex items-center gap-2">
              {completeness === 100 ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Complete
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-0">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {completeness}% Complete
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Goal & Scope Statement *</Label>
            <Textarea
              value={formData.goal_and_scope}
              onChange={(e) => setFormData({...formData, goal_and_scope: e.target.value})}
              placeholder="Define the purpose, intended application, reasons for carrying out the study, and target audience..."
              className="h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>System Boundary *</Label>
              <Select 
                value={formData.system_boundary} 
                onValueChange={(v) => setFormData({...formData, system_boundary: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cradle-to-Gate">Cradle-to-Gate</SelectItem>
                  <SelectItem value="Cradle-to-Grave">Cradle-to-Grave</SelectItem>
                  <SelectItem value="Gate-to-Gate">Gate-to-Gate</SelectItem>
                  <SelectItem value="Cradle-to-Cradle">Cradle-to-Cradle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Impact Assessment Method *</Label>
              <Select 
                value={formData.impact_assessment_method} 
                onValueChange={(v) => setFormData({...formData, impact_assessment_method: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ReCiPe 2016">ReCiPe 2016</SelectItem>
                  <SelectItem value="CML-IA">CML-IA baseline</SelectItem>
                  <SelectItem value="ILCD 2011">ILCD 2011 Midpoint+</SelectItem>
                  <SelectItem value="EF 3.0">EF 3.0 (PEF)</SelectItem>
                  <SelectItem value="TRACI">TRACI 2.1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ISO 14044 Allocation */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <h4 className="font-bold text-sm text-amber-900">ISO 14044: Allocation Method</h4>
            <div className="space-y-2">
              <Label>Allocation Method *</Label>
              <Select 
                value={formData.allocation_method} 
                onValueChange={(v) => setFormData({...formData, allocation_method: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physical (Mass)">Physical Allocation - Mass Basis</SelectItem>
                  <SelectItem value="Physical (Energy)">Physical Allocation - Energy Content</SelectItem>
                  <SelectItem value="Economic">Economic Allocation</SelectItem>
                  <SelectItem value="System Expansion">System Expansion (Avoided Burden)</SelectItem>
                  <SelectItem value="None">No Allocation (Single Output)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Allocation Justification *</Label>
              <Textarea
                value={formData.allocation_justification}
                onChange={(e) => setFormData({...formData, allocation_justification: e.target.value})}
                placeholder="Explain why this allocation method is appropriate for this study..."
                className="h-20"
              />
            </div>
          </div>

          {/* Life Cycle Coverage */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <h4 className="font-bold text-sm text-blue-900">Life Cycle Coverage</h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includes_packaging}
                  onChange={(e) => setFormData({...formData, includes_packaging: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm">Packaging</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includes_storage}
                  onChange={(e) => setFormData({...formData, includes_storage: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm">Storage & Warehousing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includes_waste_treatment}
                  onChange={(e) => setFormData({...formData, includes_waste_treatment: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm">Waste Treatment</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includes_transport_packaging}
                  onChange={(e) => setFormData({...formData, includes_transport_packaging: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm">Transport Packaging</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Geographical Scope *</Label>
              <Input
                value={formData.geographical_scope}
                onChange={(e) => setFormData({...formData, geographical_scope: e.target.value})}
                placeholder="e.g., Europe, Global, Germany"
              />
            </div>
            <div className="space-y-2">
              <Label>Temporal Scope *</Label>
              <Input
                value={formData.temporal_scope}
                onChange={(e) => setFormData({...formData, temporal_scope: e.target.value})}
                placeholder="e.g., 2024, 2020-2024"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cut-off Criteria</Label>
            <Textarea
              value={formData.cutoff_criteria}
              onChange={(e) => setFormData({...formData, cutoff_criteria: e.target.value})}
              placeholder="e.g., Mass: <1%, Energy: <1%, Environmental significance: <5%"
              className="h-16"
            />
          </div>

          <Button 
            onClick={() => updateMutation.mutate(formData)}
            disabled={updateMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Goal & Scope'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
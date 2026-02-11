import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Link2, CheckCircle2, ArrowRight, Info } from "lucide-react";
import { toast } from "sonner";

export default function CBAMPrecursorManager() {
  const [showForm, setShowForm] = useState(false);
  const [newMapping, setNewMapping] = useState({
    final_product_cn: '',
    final_product_name: '',
    precursor_cn: '',
    precursor_name: '',
    typical_percentage: 0,
    emissions_intensity_factor: 0
  });

  const queryClient = useQueryClient();

  const { data: precursors = [] } = useQuery({
    queryKey: ['cbam-precursors'],
    queryFn: () => base44.entities.CBAMPrecursor.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CBAMPrecursor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-precursors'] });
      toast.success('Precursor mapping created');
      setShowForm(false);
      setNewMapping({
        final_product_cn: '', final_product_name: '',
        precursor_cn: '', precursor_name: '',
        typical_percentage: 0, emissions_intensity_factor: 0
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CBAMPrecursor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-precursors'] });
      toast.success('Mapping deleted');
    }
  });

  // Group by final product
  const groupedPrecursors = precursors.reduce((acc, p) => {
    const key = p.final_product_cn;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-medium text-slate-900">Complex Goods Precursor Mapping</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Define precursor relationships per C(2025) 8151 Art. 13-15
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)}
            size="sm"
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Mapping
          </Button>
        </div>

        {showForm && (
          <div className="bg-slate-50/50 rounded-lg border border-slate-200/60 p-4 mb-4">
            <h4 className="text-sm font-medium text-slate-900 mb-3">New Precursor Mapping</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Final Product CN Code</Label>
                <Input
                  placeholder="72081000"
                  value={newMapping.final_product_cn}
                  onChange={(e) => setNewMapping({...newMapping, final_product_cn: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Final Product Name</Label>
                <Input
                  placeholder="Hot Rolled Coil"
                  value={newMapping.final_product_name}
                  onChange={(e) => setNewMapping({...newMapping, final_product_name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Precursor CN Code</Label>
                <Input
                  placeholder="72011000"
                  value={newMapping.precursor_cn}
                  onChange={(e) => setNewMapping({...newMapping, precursor_cn: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Precursor Name</Label>
                <Input
                  placeholder="Pig Iron"
                  value={newMapping.precursor_name}
                  onChange={(e) => setNewMapping({...newMapping, precursor_name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Typical % in Final Product</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newMapping.typical_percentage}
                  onChange={(e) => setNewMapping({...newMapping, typical_percentage: parseFloat(e.target.value)})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Emission Factor (tCO2/t)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newMapping.emissions_intensity_factor}
                  onChange={(e) => setNewMapping({...newMapping, emissions_intensity_factor: parseFloat(e.target.value)})}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={() => createMutation.mutate(newMapping)}
                disabled={!newMapping.final_product_cn || !newMapping.precursor_cn || createMutation.isPending}
              >
                Create Mapping
              </Button>
            </div>
          </div>
        )}

        <Alert className="bg-blue-50/50 border-blue-200/50 mb-4">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-900">
            <strong>Art. 13-15 C(2025) 8151:</strong> Complex goods (e.g., steel products) must account for embedded emissions from precursors (e.g., iron ore, pig iron). 
            The system automatically calculates precursor contributions when calculating final product emissions.
          </AlertDescription>
        </Alert>

        {Object.keys(groupedPrecursors).length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg">
            <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">No precursor mappings yet</p>
            <p className="text-xs text-slate-500 mt-1">Add mappings to track embedded emissions in complex goods</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedPrecursors).map(([finalCN, mappings]) => (
              <div key={finalCN} className="bg-white rounded-lg border border-slate-200/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {finalCN}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900">
                        {mappings[0].final_product_name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {mappings.length} precursor{mappings.length !== 1 ? 's' : ''} mapped
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="space-y-2">
                  {mappings.map((mapping) => (
                    <div 
                      key={mapping.id}
                      className="flex items-center justify-between bg-slate-50/50 rounded-lg p-3 border border-slate-100"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {mapping.precursor_cn}
                        </Badge>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <div className="flex-1">
                          <div className="text-sm text-slate-900">{mapping.precursor_name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {mapping.typical_percentage}% • {mapping.emissions_intensity_factor.toFixed(3)} tCO2/t
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(mapping.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
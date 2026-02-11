import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Database, TrendingUp, TrendingDown, Search } from "lucide-react";
import { toast } from "sonner";
import LCADatasetBrowser from './LCADatasetBrowser';

export default function LCAInventoryManager({ studyId, study }) {
  const [showBrowser, setShowBrowser] = useState(false);
  const [selectedStage, setSelectedStage] = useState('Production');
  const queryClient = useQueryClient();

  const { data: flows = [] } = useQuery({
    queryKey: ['lca-inventory-flows', studyId],
    queryFn: async () => {
      const allFlows = await base44.entities.LCAInventoryFlow.list();
      return allFlows.filter(f => f.study_id === studyId);
    }
  });

  const stages = ['Raw Material Acquisition', 'Production', 'Distribution', 'Use', 'End-of-Life'];
  
  const calculateTotalImpacts = () => {
    const total = flows.reduce((acc, f) => ({
      climate: acc.climate + (f.calculated_climate_impact || 0),
      water: acc.water + (f.calculated_water_impact || 0),
      acidification: acc.acidification + (f.calculated_acidification_impact || 0)
    }), { climate: 0, water: 0, acidification: 0 });
    return total;
  };

  const totalImpacts = calculateTotalImpacts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#545454]">Life Cycle Inventory (ISO 14040 Phase 2)</h3>
          <p className="text-sm text-slate-500">Document all inputs and outputs across life cycle stages</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowBrowser(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Databases
          </Button>
        </div>
      </div>

      {/* Total Impacts Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-emerald-700 font-medium mb-1">Total Climate Change</p>
            <p className="text-2xl font-bold text-emerald-900">{totalImpacts.climate.toFixed(2)}</p>
            <p className="text-xs text-emerald-600">kg CO₂e</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-blue-700 font-medium mb-1">Total Water Use</p>
            <p className="text-2xl font-bold text-blue-900">{totalImpacts.water.toFixed(2)}</p>
            <p className="text-xs text-blue-600">m³</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-amber-700 font-medium mb-1">Total Acidification</p>
            <p className="text-2xl font-bold text-amber-900">{totalImpacts.acidification.toFixed(3)}</p>
            <p className="text-xs text-amber-600">kg SO₂ eq</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Flows by Stage */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {stages.map(stage => (
          <Button
            key={stage}
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStage(stage);
              setShowBrowser(true);
            }}
            className="text-xs h-auto py-3 flex flex-col items-center gap-1 hover:border-emerald-300"
          >
            <Plus className="w-4 h-4" />
            <span className="text-center">{stage.replace(' Acquisition', '')}</span>
          </Button>
        ))}
      </div>

      {/* Flows by Life Cycle Stage */}
      <div className="space-y-4">
        {stages.map(stage => {
          const stageFlows = flows.filter(f => f.lifecycle_stage === stage);
          if (stageFlows.length === 0) return null;
          
          return (
            <Card key={stage} className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>{stage}</span>
                  <Badge variant="outline">{stageFlows.length} flows</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stageFlows.map(flow => (
                    <div key={flow.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900">{flow.process_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {flow.quantity} {flow.unit} • {flow.activity_type}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={
                            flow.database_source === 'Climatiq' ? 'bg-blue-100 text-blue-700 border-0 text-xs' :
                            flow.database_source === 'Ecoinvent' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' :
                            'bg-slate-100 text-slate-700 border-0 text-xs'
                          }>
                            {flow.database_source}
                          </Badge>
                          <Badge className={
                            flow.data_source_type === 'Primary' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' :
                            flow.data_source_type === 'Secondary' ? 'bg-blue-100 text-blue-700 border-0 text-xs' :
                            'bg-slate-100 text-slate-700 border-0 text-xs'
                          }>
                            {flow.data_source_type || 'Secondary'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {flow.geographic_scope} • {flow.temporal_scope}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            DQ: {flow.data_quality_score || 3}/5
                          </Badge>
                          {flow.ghg_scope && (
                            <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                              {flow.ghg_scope}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                        <div className="text-xs">
                          <span className="text-slate-500">Climate:</span>
                          <span className="font-bold ml-1 text-slate-900">{flow.calculated_climate_impact?.toFixed(2)} kg CO₂e</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500">Water:</span>
                          <span className="font-bold ml-1 text-slate-900">{flow.calculated_water_impact?.toFixed(2)} m³</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500">Acidification:</span>
                          <span className="font-bold ml-1 text-slate-900">{flow.calculated_acidification_impact?.toFixed(3)} kg SO₂eq</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <LCADatasetBrowser 
        studyId={studyId}
        lifecycleStage={selectedStage}
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
      />
    </div>
  );
}
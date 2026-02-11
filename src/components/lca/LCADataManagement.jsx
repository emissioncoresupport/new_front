import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Upload, CheckCircle, AlertTriangle, Search, Plus, Edit2, Trash2, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import LCABulkImporter from './LCABulkImporter';
import LCACustomDatasetModal from './LCACustomDatasetModal';
import LCASupplierCollaboration from './LCASupplierCollaboration';

export default function LCADataManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showImporter, setShowImporter] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const queryClient = useQueryClient();

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ['lca-custom-datasets'],
    queryFn: () => base44.entities.LCACustomDataset.list('-created_date')
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const deleteDatasetMutation = useMutation({
    mutationFn: (id) => base44.entities.LCACustomDataset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-custom-datasets'] });
      toast.success('Dataset deleted');
    }
  });

  const validateDatasetMutation = useMutation({
    mutationFn: async (dataset) => {
      const qualityScore = calculateQualityScore(dataset);
      return await base44.entities.LCACustomDataset.update(dataset.id, {
        validation_status: qualityScore >= 70 ? 'Validated' : 'Needs Review',
        quality_score: qualityScore
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-custom-datasets'] });
      toast.success('Dataset validated');
    }
  });

  const calculateQualityScore = (dataset) => {
    let score = 100;
    
    // Temporal representativeness (max -20)
    if (dataset.temporal_representativeness) {
      score -= (dataset.temporal_representativeness - 1) * 5;
    }
    
    // Geographic representativeness (max -20)
    if (dataset.geographical_representativeness) {
      score -= (dataset.geographical_representativeness - 1) * 5;
    }
    
    // Technological representativeness (max -20)
    if (dataset.technological_representativeness) {
      score -= (dataset.technological_representativeness - 1) * 5;
    }
    
    // Completeness (max -20)
    if (dataset.completeness_score) {
      score -= (dataset.completeness_score - 1) * 5;
    }
    
    // Primary data bonus
    if (dataset.data_source_type === 'Primary') {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  };

  const filteredDatasets = datasets.filter(d => 
    d.dataset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.process_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBySource = {
    'Supplier Survey': filteredDatasets.filter(d => d.source_type === 'Supplier Survey'),
    'Internal Measurement': filteredDatasets.filter(d => d.source_type === 'Internal Measurement'),
    'SupplyLens Import': filteredDatasets.filter(d => d.source_type === 'SupplyLens Import'),
    'ERP Import': filteredDatasets.filter(d => d.source_type === 'ERP Import'),
    'Manual Entry': filteredDatasets.filter(d => d.source_type === 'Manual Entry')
  };

  const [activeMainTab, setActiveMainTab] = useState('datasets');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">LCA Data Management</h2>
          <p className="text-slate-500">Centralized repository for custom datasets, supplier data, and internal measurements</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowImporter(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button 
            onClick={() => {
              setSelectedDataset(null);
              setShowDatasetModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Dataset
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-emerald-700 font-medium mb-1">Total Datasets</p>
            <p className="text-2xl font-bold text-emerald-900">{datasets.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-blue-700 font-medium mb-1">Validated</p>
            <p className="text-2xl font-bold text-blue-900">
              {datasets.filter(d => d.validation_status === 'Validated').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-purple-700 font-medium mb-1">Primary Data</p>
            <p className="text-2xl font-bold text-purple-900">
              {datasets.filter(d => d.data_source_type === 'Primary').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-amber-700 font-medium mb-1">Avg Quality Score</p>
            <p className="text-2xl font-bold text-amber-900">
              {datasets.length > 0 
                ? Math.round(datasets.reduce((sum, d) => sum + (d.quality_score || 0), 0) / datasets.length)
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList>
          <TabsTrigger value="datasets">
            <Database className="w-4 h-4 mr-2" />
            My Datasets
          </TabsTrigger>
          <TabsTrigger value="collaboration">
            <Users className="w-4 h-4 mr-2" />
            Supplier Collaboration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datasets" className="space-y-6">
      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search datasets by name or process..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Datasets by Source */}
      <Tabs defaultValue="Supplier Survey">
        <TabsList>
          {Object.entries(groupedBySource).map(([source, items]) => (
            <TabsTrigger key={source} value={source}>
              {source} ({items.length})
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(groupedBySource).map(([source, items]) => (
          <TabsContent key={source} value={source} className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No datasets from {source}</p>
              </div>
            ) : (
              items.map(dataset => (
                <Card key={dataset.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-slate-900">{dataset.dataset_name}</h4>
                          <Badge variant="outline" className="text-xs">v{dataset.version}</Badge>
                          <Badge className={
                            dataset.validation_status === 'Validated' ? 'bg-emerald-100 text-emerald-700 border-0' :
                            dataset.validation_status === 'Needs Review' ? 'bg-amber-100 text-amber-700 border-0' :
                            'bg-slate-100 text-slate-700 border-0'
                          }>
                            {dataset.validation_status}
                          </Badge>
                          <Badge className={
                            dataset.data_source_type === 'Primary' ? 'bg-blue-100 text-blue-700 border-0' :
                            'bg-slate-100 text-slate-700 border-0'
                          }>
                            {dataset.data_source_type}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-2">{dataset.process_name}</p>
                        
                        <div className="grid grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500">Climate:</span>
                            <span className="font-bold ml-1">{dataset.emission_factor_climate?.toFixed(2)} kg CO₂e/{dataset.unit}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Quality:</span>
                            <span className="font-bold ml-1">{dataset.quality_score || 0}/100</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Geography:</span>
                            <span className="font-bold ml-1">{dataset.geographic_scope || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Used:</span>
                            <span className="font-bold ml-1">{dataset.usage_count || 0} times</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {dataset.validation_status === 'Pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => validateDatasetMutation.mutate(dataset)}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Validate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDataset(dataset);
                            setShowDatasetModal(true);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteDatasetMutation.mutate(dataset.id)}
                          className="text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
        </Tabs>
        </TabsContent>

        <TabsContent value="collaboration">
          <LCASupplierCollaboration />
        </TabsContent>
      </Tabs>

      <LCABulkImporter 
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
      />

      <LCACustomDatasetModal
        dataset={selectedDataset}
        isOpen={showDatasetModal}
        onClose={() => {
          setShowDatasetModal(false);
          setSelectedDataset(null);
        }}
      />
    </div>
  );
}
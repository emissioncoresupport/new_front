import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, Check, X, Search, Building2, Package, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MappingWorkbench() {
  const [searchTerm, setSearchTerm] = useState('');
  const [relationshipType, setRelationshipType] = useState('supplier_part');
  const queryClient = useQueryClient();

  const { data: mappingSuggestions = [], isLoading } = useQuery({
    queryKey: ['mapping-suggestions', relationshipType],
    queryFn: async () => {
      return await base44.entities.DataMappingSuggestion.filter(
        { 
          mapping_type: relationshipType,
          status: 'pending'
        },
        '-confidence_score',
        50
      );
    }
  });

  const approveMappingMutation = useMutation({
    mutationFn: async ({ suggestionId, action }) => {
      return await base44.functions.invoke('approveMappingSuggestion', {
        suggestion_id: suggestionId,
        action: action // 'approve', 'reject', 'modify'
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['mapping-suggestions']);
      queryClient.invalidateQueries(['supplier-sku-mappings']);
      queryClient.invalidateQueries(['supplier-part-mappings']);
      queryClient.invalidateQueries(['evidence-packs']);
      
      if (result.data.action === 'approve') {
        toast.success(`✓ Relationship approved and published - Evidence pack ${result.data.evidence_pack_id.substring(0, 8)}... created`);
      } else {
        toast.info('Mapping proposal rejected');
      }
    }
  });

  const filteredSuggestions = mappingSuggestions.filter(suggestion =>
    !searchTerm || 
    suggestion.source_entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    suggestion.target_entity_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const relationshipConfig = {
    supplier_part: {
      label: 'Supplier → Part',
      icon: Building2,
      description: 'Link suppliers to the parts they manufacture'
    },
    part_sku: {
      label: 'Part → SKU',
      icon: Package,
      description: 'Map supplier parts to internal SKU codes'
    },
    sku_bom: {
      label: 'SKU → BOM',
      icon: Link2,
      description: 'Define bill of materials relationships'
    }
  };

  const confidenceColor = (score) => {
    if (score >= 85) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold">Relationship Mapping Workbench</h2>
          <Badge variant="outline">{filteredSuggestions.length} pending</Badge>
        </div>
      </div>

      <Tabs value={relationshipType} onValueChange={setRelationshipType} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {Object.entries(relationshipConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-2">
                <Icon className="w-4 h-4" />
                {config.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(relationshipConfig).map(([key, config]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-3">
                <p className="text-sm text-blue-900">{config.description}</p>
              </CardContent>
            </Card>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search mappings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  Loading mapping suggestions...
                </CardContent>
              </Card>
            ) : filteredSuggestions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p className="text-slate-600 font-medium">No pending mappings</p>
                  <p className="text-sm text-slate-500 mt-1">All relationships reviewed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="bg-white/40 backdrop-blur-xl border-white/30">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-[#86b027]" />
                          <div>
                            <CardTitle className="text-base">AI Mapping Proposal</CardTitle>
                            <p className="text-sm text-slate-500 mt-1">
                              {suggestion.reasoning || 'Based on data analysis'}
                            </p>
                          </div>
                        </div>
                        <Badge className={cn('font-semibold', confidenceColor(suggestion.confidence_score))}>
                          {suggestion.confidence_score}% confidence
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                          <div className="text-xs text-slate-500 mb-1">Source</div>
                          <div className="font-semibold text-slate-900">{suggestion.source_entity_name}</div>
                          {suggestion.source_entity_id && (
                            <div className="text-xs text-slate-500 mt-1">ID: {suggestion.source_entity_id}</div>
                          )}
                        </div>

                        <ArrowRight className="w-6 h-6 text-slate-400 flex-shrink-0" />

                        <div className="flex-1 bg-[#86b027]/10 rounded-lg p-4 border-2 border-[#86b027]/30">
                          <div className="text-xs text-slate-500 mb-1">Target</div>
                          <div className="font-semibold text-slate-900">{suggestion.target_entity_name}</div>
                          {suggestion.target_entity_id && (
                            <div className="text-xs text-slate-500 mt-1">ID: {suggestion.target_entity_id}</div>
                          )}
                        </div>
                      </div>

                      {suggestion.evidence && (
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                            <div className="text-sm text-amber-900">
                              <strong>Evidence:</strong> {suggestion.evidence}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={() => approveMappingMutation.mutate({ suggestionId: suggestion.id, action: 'approve' })}
                          disabled={approveMappingMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve Mapping
                        </Button>
                        <Button
                          onClick={() => approveMappingMutation.mutate({ suggestionId: suggestion.id, action: 'reject' })}
                          disabled={approveMappingMutation.isPending}
                          variant="outline"
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
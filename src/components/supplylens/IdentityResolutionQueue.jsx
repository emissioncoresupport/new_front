import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GitMerge, AlertTriangle, Check, X, Info, ArrowRight, Building2, MapPin, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function IdentityResolutionQueue() {
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const queryClient = useQueryClient();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['dedupe-suggestions'],
    queryFn: async () => {
      return await base44.entities.DedupeSuggestion.filter({ status: 'pending' }, '-confidence_score', 50);
    }
  });

  const approveMergeMutation = useMutation({
    mutationFn: async ({ suggestionId, action }) => {
      return await base44.functions.invoke('resolveIdentityConflict', {
        suggestion_id: suggestionId,
        action: action // 'merge', 'reject', 'create_new'
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['dedupe-suggestions']);
      queryClient.invalidateQueries(['suppliers']);
      queryClient.invalidateQueries(['source-records']);
      queryClient.invalidateQueries(['evidence-packs']);
      
      if (result.data.action === 'merge') {
        toast.success(`✓ Merged into canonical supplier - Evidence pack created`);
      } else if (result.data.action === 'create_new') {
        toast.success(`✓ New canonical supplier created - Evidence pack created`);
      }
      setSelectedSuggestion(null);
    }
  });

  const entityIcons = {
    supplier: Building2,
    site: MapPin,
    material: Package
  };

  const confidenceColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitMerge className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold">Identity Resolution Queue</h2>
          <Badge variant="outline">{suggestions.length} pending</Badge>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Loading suggestions...
          </CardContent>
        </Card>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-slate-600 font-medium">No pending identity conflicts</p>
            <p className="text-sm text-slate-500 mt-1">All entities are resolved</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suggestions.map((suggestion) => {
            const EntityIcon = entityIcons[suggestion.entity_type] || Building2;
            
            return (
              <Card key={suggestion.id} className="bg-white/40 backdrop-blur-xl border-white/30">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <EntityIcon className="w-5 h-5 text-slate-600" />
                      <div>
                        <CardTitle className="text-base">
                          Potential Duplicate: {suggestion.entity_type}
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                          {suggestion.reasoning}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn('font-semibold', confidenceColor(suggestion.confidence_score))}>
                      {suggestion.confidence_score}% match
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Source Entity */}
                    <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">New Record</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(suggestion.source_data || {}).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-slate-600 font-medium">{key}:</span>{' '}
                            <span className="text-slate-900">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Target Entity */}
                    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-900">Existing Record</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(suggestion.target_data || {}).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-slate-600 font-medium">{key}:</span>{' '}
                            <span className="text-slate-900">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Matching Attributes */}
                  {suggestion.matching_attributes?.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Matching on:</strong> {suggestion.matching_attributes.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => approveMergeMutation.mutate({ suggestionId: suggestion.id, action: 'merge' })}
                      disabled={approveMergeMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <GitMerge className="w-4 h-4 mr-2" />
                      Merge Records
                    </Button>
                    <Button
                      onClick={() => approveMergeMutation.mutate({ suggestionId: suggestion.id, action: 'create_new' })}
                      disabled={approveMergeMutation.isPending}
                      variant="outline"
                      className="flex-1"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Keep Separate
                    </Button>
                    <Button
                      onClick={() => approveMergeMutation.mutate({ suggestionId: suggestion.id, action: 'reject' })}
                      disabled={approveMergeMutation.isPending}
                      variant="outline"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
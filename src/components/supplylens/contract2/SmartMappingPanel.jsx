import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Link2, 
  Zap,
  TrendingUp,
  Activity,
  Target,
  FileCheck,
  ArrowRight,
  Brain,
  Play,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SmartMappingPanel() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['mapping-stats'],
    queryFn: async () => {
      const { demoStore } = await import('../DemoDataStore');
      const evidence = demoStore.listEvidence();
      const workItems = demoStore.listWorkItems();
      const decisions = demoStore.listDecisions();
      
      const unmapped = evidence.filter(e => !e.linked_entities || e.linked_entities.length === 0);
      const autoApproved = decisions.filter(d => d.decision_type === 'AUTO_MAPPING');
      const mappingWorkItems = workItems.filter(w => w.type === 'MAPPING' && w.status === 'OPEN');
      
      return {
        totalEvidence: evidence.length,
        unmappedEvidence: unmapped.length,
        mappedEvidence: evidence.length - unmapped.length,
        autoApprovedCount: autoApproved.length,
        pendingReviewCount: mappingWorkItems.length,
        mappingRate: evidence.length > 0 ? ((evidence.length - unmapped.length) / evidence.length * 100).toFixed(0) : 0
      };
    }
  });

  const runMappingEngine = async () => {
    setIsProcessing(true);
    
    try {
      const { demoStore } = await import('../DemoDataStore');
      const { mappingEngine } = await import('./MappingEngine');
      
      const result = await mappingEngine.processBatchMappings(demoStore);
      
      setProcessResult(result);
      setSuggestions(result.suggestions);
      
      queryClient.invalidateQueries(['mapping-stats']);
      queryClient.invalidateQueries(['demo-work-items']);
      queryClient.invalidateQueries(['demo-evidence-vault']);
      
      toast.success(`Mapping complete: ${result.autoApproved} suggestions created, ${result.needsReview} awaiting decision`);
    } catch (error) {
      console.error('Mapping engine error:', error);
      toast.error('Failed to process mappings');
    } finally {
      setIsProcessing(false);
    }
  };

  const approveSuggestion = async (suggestion) => {
    try {
      const { demoStore } = await import('../DemoDataStore');
      
      // Link evidence to entity
      const evidence = demoStore.getEvidenceByRecordId(suggestion.source_id);
      if (evidence) {
        if (!evidence.linked_entities) evidence.linked_entities = [];
        evidence.linked_entities.push({
          type: suggestion.target_type,
          id: suggestion.target_id
        });
      }
      
      // Log decision
      demoStore.addDecision({
        decision_type: 'MAPPING_DECISION',
        decision_outcome: 'ACCEPTED',
        actor: 'USER',
        reason_code: 'MANUAL_DECISION',
        comment: `Accepted: ${suggestion.reasoning}`,
        evidence_refs: suggestion.evidence_refs,
        entity_refs: [suggestion.target_id]
      });

      // Update suggestion status
      suggestion.status = 'ACCEPTED';
      setSuggestions([...suggestions]);

      queryClient.invalidateQueries(['mapping-stats']);
      queryClient.invalidateQueries(['demo-evidence-vault']);

      toast.success('Suggestion accepted • Decision logged');
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to accept suggestion');
    }
  };

  const rejectSuggestion = async (suggestion) => {
    try {
      const { demoStore } = await import('../DemoDataStore');

      // Log decision
      demoStore.addDecision({
        decision_type: 'MAPPING_DECISION',
        decision_outcome: 'REJECTED',
        actor: 'USER',
        reason_code: 'MANUAL_DECISION',
        comment: `Rejected: ${suggestion.reasoning}`,
        evidence_refs: suggestion.evidence_refs,
        entity_refs: [suggestion.target_id]
      });

      suggestion.status = 'REJECTED';
      setSuggestions([...suggestions]);

      queryClient.invalidateQueries(['mapping-stats']);
      queryClient.invalidateQueries(['demo-evidence-vault']);

      toast.success('Suggestion rejected • Decision logged');
    } catch (error) {
      toast.error('Failed to reject suggestion');
    }
  };

  const getConfidenceBadge = (score) => {
    if (score >= 0.92) return <Badge className="bg-green-500/20 text-green-700 border-green-200">High Confidence</Badge>;
    if (score >= 0.85) return <Badge className="bg-blue-500/20 text-blue-700 border-blue-200">Good Match</Badge>;
    if (score >= 0.70) return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-200">Medium Confidence</Badge>;
    return <Badge className="bg-slate-500/20 text-slate-700 border-slate-200">Low Confidence</Badge>;
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'PENDING' && s.target_id);
  const autoApproved = suggestions.filter(s => s.status === 'AUTO_APPROVED');
  const needsNewEntity = suggestions.filter(s => !s.target_id);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light tracking-tight text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center backdrop-blur-sm border border-purple-200/30">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            AI Mapping Engine
          </h2>
          <p className="text-sm text-slate-500 mt-1 ml-1">
            AI generates suggestions • Humans make final decisions • Every decision is logged
          </p>
        </div>
        
        <Button
          onClick={runMappingEngine}
          disabled={isProcessing}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Mapping Engine
            </>
          )}
        </Button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="glassmorphic-panel border-slate-200/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mapping Rate</p>
                  <p className="text-3xl font-light text-slate-900 mt-2">{stats.mappingRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center backdrop-blur-sm border border-green-200/30">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <Progress value={stats.mappingRate} className="mt-4 h-1.5" />
            </CardContent>
          </Card>

          <Card className="glassmorphic-panel border-slate-200/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Workflow-Only Suggestions</p>
                  <p className="text-3xl font-light text-slate-900 mt-2">{stats.autoApprovedCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center backdrop-blur-sm border border-purple-200/30">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">Internal workflow state • Require human decision</p>
            </CardContent>
          </Card>

          <Card className="glassmorphic-panel border-slate-200/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending Review</p>
                  <p className="text-3xl font-light text-slate-900 mt-2">{stats.pendingReviewCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center backdrop-blur-sm border border-amber-200/30">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">Awaiting human decision</p>
            </CardContent>
          </Card>

          <Card className="glassmorphic-panel border-slate-200/60">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Unmapped</p>
                  <p className="text-3xl font-light text-slate-900 mt-2">{stats.unmappedEvidence}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 flex items-center justify-center backdrop-blur-sm border border-slate-200/30">
                  <Target className="w-6 h-6 text-slate-600" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">Need entity linkage</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {processResult && (
        <Card className="glassmorphic-panel border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-lg font-light flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Latest Run Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-light text-slate-900">{processResult.total}</p>
                <p className="text-xs text-slate-500 mt-1">Total Suggestions</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300" />
              <div className="text-center">
                <p className="text-3xl font-light text-green-600">{processResult.autoApproved}</p>
                 <p className="text-xs text-slate-500 mt-1">Suggestions Created</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300" />
              <div className="text-center">
                <p className="text-3xl font-light text-amber-600">{processResult.needsReview}</p>
                <p className="text-xs text-slate-500 mt-1">Need Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions Tabs */}
      {suggestions.length > 0 && (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="glassmorphic-panel border-slate-200/60">
            <TabsTrigger value="pending" className="data-[state=active]:bg-white/70">
              Pending Review ({pendingSuggestions.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-white/70">
              Internal Workflow ({autoApproved.length})
            </TabsTrigger>
            <TabsTrigger value="new" className="data-[state=active]:bg-white/70">
              New Entities ({needsNewEntity.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingSuggestions.map((suggestion) => (
              <Card key={suggestion.suggestion_id} className="glassmorphic-panel border-slate-200/60 hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Link2 className="w-5 h-5 text-indigo-600" />
                        <div>
                          <p className="font-medium text-slate-900">
                            {suggestion.source_name} <ArrowRight className="w-4 h-4 inline text-slate-400" /> {suggestion.target_name}
                          </p>
                          <p className="text-sm text-slate-500">{suggestion.target_type}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-3">
                        {getConfidenceBadge(suggestion.confidence_score)}
                        <span className="text-xs text-slate-500">
                          {(suggestion.confidence_score * 100).toFixed(0)}% match
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-2">{suggestion.reasoning}</p>
                      
                      {suggestion.matched_attributes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {suggestion.matched_attributes.map((attr) => (
                            <Badge key={attr} variant="outline" className="text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                              {attr}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectSuggestion(suggestion)}
                        className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                      >
                        Reject
                      </Button>
                      <Button
                         size="sm"
                         onClick={() => approveSuggestion(suggestion)}
                         className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                       >
                         <CheckCircle2 className="w-4 h-4 mr-1" />
                         Accept
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {pendingSuggestions.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No suggestions pending review</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3 mt-4">
            {autoApproved.map((suggestion) => (
              <Card key={suggestion.suggestion_id} className="glassmorphic-panel border-green-200/60">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {suggestion.source_name} → {suggestion.target_name}
                      </p>
                      <p className="text-sm text-slate-500">{suggestion.reasoning}</p>
                    </div>
                    <Badge className="bg-green-500/20 text-green-700 border-green-200">
                      {(suggestion.confidence_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {autoApproved.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No internal workflow suggestions yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-3 mt-4">
            {needsNewEntity.map((suggestion) => (
              <Card key={suggestion.suggestion_id} className="glassmorphic-panel border-indigo-200/60">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <p className="font-medium text-slate-900">Create: {suggestion.source_name}</p>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{suggestion.reasoning}</p>
                      <Badge variant="outline" className="text-xs">New {suggestion.target_type}</Badge>
                    </div>
                    <Button size="sm" variant="outline" className="hover:bg-indigo-50 hover:border-indigo-200">
                      Create Entity
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {needsNewEntity.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No new entity suggestions</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
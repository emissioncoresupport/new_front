import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, AlertTriangle, CheckCircle2, XCircle, Eye, 
  GitMerge, Loader2, ChevronRight, Shield
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function EntityResolutionEngine() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const queryClient = useQueryClient();

  const { data: dedupeSuggestions = [] } = useQuery({
    queryKey: ['dedupe-suggestions', 'pending_review'],
    queryFn: () => base44.entities.DedupeSuggestion.filter({ status: 'pending_review' }, '-confidence_score')
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  // AI-powered duplicate detection
  const scanForDuplicates = async () => {
    setIsScanning(true);
    toast.loading("AI scanning for potential duplicates...");
    
    try {
      // Batch suppliers by country for efficient scanning
      const suppliersByCountry = {};
      suppliers.forEach(s => {
        if (!suppliersByCountry[s.country]) suppliersByCountry[s.country] = [];
        suppliersByCountry[s.country].push(s);
      });

      let newSuggestions = 0;

      for (const [country, countrySuppliers] of Object.entries(suppliersByCountry)) {
        if (countrySuppliers.length < 2) continue;

        const prompt = `
          Analyze these suppliers for potential duplicates based on fuzzy name matching, 
          VAT similarity, address overlap, and contact details.
          
          Suppliers in ${country}:
          ${JSON.stringify(countrySuppliers.map(s => ({
            id: s.id,
            legal_name: s.legal_name,
            trade_name: s.trade_name,
            vat_number: s.vat_number,
            city: s.city,
            email: s.email
          })))}
          
          Return pairs of potential duplicates with confidence scores.
          Only suggest pairs with >70% confidence.
        `;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              duplicates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    master_id: { type: "string" },
                    duplicate_id: { type: "string" },
                    confidence: { type: "number" },
                    matching_fields: { type: "array", items: { type: "string" } },
                    reasoning: { type: "string" }
                  }
                }
              }
            }
          }
        });

        // Create EvidencePack and DedupeSuggestions
        for (const dup of result.duplicates || []) {
          const evidencePack = await base44.entities.EvidencePack.create({
            pack_type: 'deduplication',
            related_entity_type: 'Supplier',
            related_entity_id: dup.master_id,
            confidence_level: dup.confidence >= 90 ? 'high' : 'medium',
            summary: dup.reasoning,
            analyzed_by: 'AI Entity Resolution Engine'
          });

          // Create evidence items for each matching field
          for (const field of dup.matching_fields) {
            await base44.entities.EvidenceItem.create({
              evidence_pack_id: evidencePack.id,
              evidence_type: 'similarity_score',
              evidence_source: 'fuzzy_matching',
              evidence_value: `${field}: matched`,
              weight: 0.8
            });
          }

          await base44.entities.DedupeSuggestion.create({
            entity_type: 'supplier',
            master_record_id: dup.master_id,
            duplicate_record_id: dup.duplicate_id,
            confidence_score: dup.confidence,
            matching_attributes: dup.matching_fields,
            evidence_pack_id: evidencePack.id,
            ai_reasoning: dup.reasoning,
            status: 'pending_review'
          });

          newSuggestions++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['dedupe-suggestions'] });
      toast.dismiss();
      toast.success(`Found ${newSuggestions} potential duplicates`);
    } catch (error) {
      console.error('Duplicate scan failed:', error);
      toast.dismiss();
      toast.error('Scan failed: ' + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const approveMergeMutation = useMutation({
    mutationFn: async (suggestion) => {
      // 1. Update suggestion status
      await base44.entities.DedupeSuggestion.update(suggestion.id, {
        status: 'approved_merge',
        reviewed_by: (await base44.auth.me()).email,
        review_date: new Date().toISOString()
      });

      // 2. Log the merge
      await base44.entities.ChangeLog.create({
        entity_type: 'Supplier',
        entity_id: suggestion.master_record_id,
        change_type: 'merge',
        change_reason: `Merged duplicate: ${suggestion.duplicate_record_id}`,
        approval_required: true,
        approved_by: (await base44.auth.me()).email,
        approval_date: new Date().toISOString()
      });

      // 3. Create aliases from duplicate to master
      const duplicate = suppliers.find(s => s.id === suggestion.duplicate_record_id);
      if (duplicate) {
        await base44.entities.SupplierAlias.create({
          supplier_id: suggestion.master_record_id,
          alias_type: 'legal_name',
          alias_value: duplicate.legal_name,
          source_system: 'merge_operation',
          valid_from: new Date().toISOString().split('T')[0]
        });

        if (duplicate.vat_number) {
          await base44.entities.SupplierAlias.create({
            supplier_id: suggestion.master_record_id,
            alias_type: 'duns',
            alias_value: duplicate.vat_number,
            source_system: 'merge_operation'
          });
        }
      }

      // 4. Update all references to point to master
      const mappings = await base44.entities.SupplierSKUMapping.filter({ supplier_id: suggestion.duplicate_record_id });
      for (const mapping of mappings) {
        await base44.entities.SupplierSKUMapping.update(mapping.id, {
          supplier_id: suggestion.master_record_id
        });
      }

      // 5. Soft delete duplicate (set status to inactive)
      await base44.entities.Supplier.update(suggestion.duplicate_record_id, {
        status: 'offboarded',
        notes: `Merged into ${suggestion.master_record_id} on ${new Date().toISOString()}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dedupe-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Entities merged successfully');
      setSelectedSuggestion(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.DedupeSuggestion.update(id, {
      status: 'rejected',
      reviewed_by: 'current_user',
      review_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dedupe-suggestions'] });
      toast.success('Suggestion rejected');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#545454] flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Entity Resolution Engine
          </h3>
          <p className="text-sm text-slate-500">
            AI-powered duplicate detection with evidence-based confidence scoring
          </p>
        </div>
        <Button 
          onClick={scanForDuplicates}
          disabled={isScanning}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Scan for Duplicates
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Pending Review</p>
                <p className="text-2xl font-bold text-[#545454]">{dedupeSuggestions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Merged</p>
                <p className="text-2xl font-bold text-[#545454]">23</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <GitMerge className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Data Quality</p>
                <p className="text-2xl font-bold text-[#545454]">96%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Avg Confidence</p>
                <p className="text-2xl font-bold text-[#545454]">
                  {dedupeSuggestions.length > 0 
                    ? Math.round(dedupeSuggestions.reduce((s, d) => s + d.confidence_score, 0) / dedupeSuggestions.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Duplicate Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {dedupeSuggestions.map(suggestion => {
                const master = suppliers.find(s => s.id === suggestion.master_record_id);
                const duplicate = suppliers.find(s => s.id === suggestion.duplicate_record_id);

                return (
                  <div 
                    key={suggestion.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Master vs Duplicate */}
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-emerald-600">Master</Badge>
                              <span className="text-xs text-slate-500">{master?.country}</span>
                            </div>
                            <p className="font-bold text-slate-900">{master?.legal_name}</p>
                            <p className="text-xs text-slate-500 mt-1">VAT: {master?.vat_number || 'N/A'}</p>
                          </div>

                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-amber-600">Duplicate</Badge>
                              <span className="text-xs text-slate-500">{duplicate?.country}</span>
                            </div>
                            <p className="font-bold text-slate-900">{duplicate?.legal_name}</p>
                            <p className="text-xs text-slate-500 mt-1">VAT: {duplicate?.vat_number || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Matching Details */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-xs text-slate-500">Matches:</span>
                          {(suggestion.matching_attributes || []).map((attr, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {attr}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-sm text-slate-600">{suggestion.ai_reasoning}</p>
                      </div>

                      {/* Confidence & Actions */}
                      <div className="text-right space-y-3">
                        <div>
                          <div className={cn(
                            "text-3xl font-bold mb-1",
                            suggestion.confidence_score >= 90 ? "text-emerald-600" :
                            suggestion.confidence_score >= 75 ? "text-amber-600" :
                            "text-slate-600"
                          )}>
                            {suggestion.confidence_score}%
                          </div>
                          <p className="text-xs text-slate-500">Confidence</p>
                          <Progress value={suggestion.confidence_score} className="h-2 mt-2 w-24" />
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => approveMergeMutation.mutate(suggestion)}
                          >
                            <GitMerge className="w-3 h-3 mr-1" />
                            Merge
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate(suggestion.id)}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Duplicate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {dedupeSuggestions.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No duplicate candidates found</p>
                  <p className="text-xs mt-1">Run a scan to detect potential duplicates</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
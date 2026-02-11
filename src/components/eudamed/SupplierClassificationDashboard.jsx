import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Network, Building2, Package, Wrench, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import SupplierClassificationService from './services/SupplierClassificationService';
import EUDAMEDOnboardingService from './services/EUDAMEDOnboardingService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SupplierClassificationDashboard() {
  const [classifications, setClassifications] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const classifyMutation = useMutation({
    mutationFn: async () => {
      toast.loading('Classifying suppliers...');
      const result = await SupplierClassificationService.classifyAllSuppliers();
      return result;
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success('Classification complete');
      setClassifications(data);
    }
  });

  const bulkOnboardMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return await EUDAMEDOnboardingService.bulkOnboardSuppliers(user.tenant_id || 'default');
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['economic-operators']);
      queryClient.invalidateQueries(['onboarding-cases']);
      toast.success(`${result.pending.length} suppliers queued for onboarding`);
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-[#02a1e8]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-[#02a1e8]" />
            Intelligent Supplier Classification
          </CardTitle>
          <p className="text-sm text-slate-600">
            AI-powered classification determines which suppliers need EUDAMED actor registration
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!classifications ? (
            <Button 
              onClick={() => classifyMutation.mutate()}
              disabled={classifyMutation.isPending}
              className="w-full bg-[#02a1e8] hover:bg-[#0190d0]"
            >
              {classifyMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Network className="w-4 h-4 mr-2" />
              )}
              Classify All Suppliers
            </Button>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <div 
                className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => setSelectedGroup(classifications.should_register_as_actors)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Economic Operators</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {classifications.should_register_as_actors.length}
                </p>
                <p className="text-xs text-blue-700 mt-1">Need actor registration</p>
              </div>

              <div 
                className="p-4 bg-emerald-50 rounded-lg border-2 border-emerald-300 cursor-pointer hover:bg-emerald-100 transition-colors"
                onClick={() => setSelectedGroup(classifications.component_suppliers)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">Component Suppliers</span>
                </div>
                <p className="text-3xl font-bold text-emerald-600">
                  {classifications.component_suppliers.length}
                </p>
                <p className="text-xs text-emerald-700 mt-1">Link via BoM only</p>
              </div>

              <div 
                className="p-4 bg-purple-50 rounded-lg border-2 border-purple-300 cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => setSelectedGroup(classifications.service_providers)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-5 h-5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">Service Providers</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">
                  {classifications.service_providers.length}
                </p>
                <p className="text-xs text-purple-700 mt-1">Sterilization, testing</p>
              </div>

              <div 
                className="p-4 bg-amber-50 rounded-lg border-2 border-amber-300 cursor-pointer hover:bg-amber-100 transition-colors"
                onClick={() => setSelectedGroup(classifications.needs_review)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">Needs Review</span>
                </div>
                <p className="text-3xl font-bold text-amber-600">
                  {classifications.needs_review.length}
                </p>
                <p className="text-xs text-amber-700 mt-1">Low confidence</p>
              </div>
            </div>
          )}

          {classifications && (
            <div className="flex gap-2">
              <Button 
                onClick={() => bulkOnboardMutation.mutate()}
                disabled={bulkOnboardMutation.isPending || classifications.should_register_as_actors.length === 0}
                className="flex-1 bg-[#86b027] hover:bg-[#769c22]"
              >
                {bulkOnboardMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Start Onboarding for {classifications.should_register_as_actors.length} Suppliers
              </Button>
              <Button 
                variant="outline"
                onClick={() => classifyMutation.mutate()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-classify
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Classification Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedGroup?.map((item, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold">{item.supplier.legal_name}</h3>
                      <p className="text-sm text-slate-600">
                        {item.supplier.city}, {item.supplier.country}
                      </p>
                      <div className="mt-2 space-y-1">
                        <Badge className="bg-[#02a1e8]">
                          {item.classification.role_in_supply_chain}
                        </Badge>
                        {item.classification.is_economic_operator && (
                          <Badge className="bg-[#86b027]">
                            {item.classification.operator_type}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          Confidence: {(item.classification.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        {item.classification.reasoning.map((reason, i) => (
                          <p key={i}>• {reason}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
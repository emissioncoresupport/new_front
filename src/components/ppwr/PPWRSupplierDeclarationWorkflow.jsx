import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Mail, FileCheck, Clock, CheckCircle2, AlertCircle, Send, Search } from "lucide-react";
import PPWRIntegrationHub from './services/PPWRIntegrationHub';
import { toast } from 'sonner';

export default function PPWRSupplierDeclarationWorkflow() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: dataRequests = [] } = useQuery({
    queryKey: ['data-requests-ppwr'],
    queryFn: () => base44.entities.DataRequest.filter({ request_type: 'ppwr_declaration' })
  });

  const requestMutation = useMutation({
    mutationFn: async (packagingId) => {
      return await PPWRIntegrationHub.requestSupplierDeclaration(packagingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-requests-ppwr'] });
    }
  });

  const pendingItems = packaging.filter(p => 
    p.supplier_id && 
    !p.supplier_declaration_url &&
    (p.material_category === 'Plastic' || p.recycled_content_percentage > 0)
  );

  const stats = {
    total_requests: dataRequests.length,
    pending: dataRequests.filter(r => r.status === 'pending').length,
    received: dataRequests.filter(r => r.status === 'completed').length,
    overdue: dataRequests.filter(r => {
      if (r.status !== 'pending' || !r.due_date) return false;
      return new Date(r.due_date) < new Date();
    }).length
  };

  const filtered = pendingItems.filter(p =>
    p.packaging_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="border-[#02a1e8]/30 bg-gradient-to-br from-white to-[#02a1e8]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#02a1e8]">
            <Mail className="w-5 h-5" />
            Supplier Declaration Workflow
          </CardTitle>
          <p className="text-sm text-slate-500">
            Automated supplier data requests for recycled content verification
          </p>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total Requests</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats.total_requests}</h3>
              </div>
              <Mail className="w-10 h-10 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 uppercase font-bold">Pending</p>
                <h3 className="text-3xl font-extrabold text-amber-600 mt-2">{stats.pending}</h3>
              </div>
              <Clock className="w-10 h-10 text-amber-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 uppercase font-bold">Received</p>
                <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">{stats.received}</h3>
              </div>
              <CheckCircle2 className="w-10 h-10 text-emerald-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-700 uppercase font-bold">Overdue</p>
                <h3 className="text-3xl font-extrabold text-rose-600 mt-2">{stats.overdue}</h3>
              </div>
              <AlertCircle className="w-10 h-10 text-rose-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Items Requiring Supplier Declaration</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">All declarations received or no pending items</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(pkg => {
                const supplier = suppliers.find(s => s.id === pkg.supplier_id);
                const request = dataRequests.find(r => 
                  r.entity_id === supplier?.id && 
                  r.notes?.includes(pkg.packaging_name)
                );
                
                return (
                  <div 
                    key={pkg.id}
                    className="p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">{pkg.packaging_name}</h4>
                          {request ? (
                            <Badge variant="outline" className="border-amber-300 text-amber-700">
                              Request Sent
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-rose-300 text-rose-700">
                              Not Requested
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Supplier</p>
                            <p className="font-medium text-slate-900">
                              {supplier?.legal_name || supplier?.trade_name || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Claimed PCR</p>
                            <p className="font-bold text-[#86b027]">{pkg.recycled_content_percentage || 0}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Verification</p>
                            <p className={`font-bold ${
                              pkg.recycled_content_verified ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {pkg.recycled_content_verified ? 'Verified' : 'Pending'}
                            </p>
                          </div>
                        </div>

                        {request && request.due_date && (
                          <p className="text-xs text-slate-500 mt-2">
                            Due: {new Date(request.due_date).toLocaleDateString()}
                            {new Date(request.due_date) < new Date() && (
                              <span className="ml-2 text-rose-600 font-semibold">OVERDUE</span>
                            )}
                          </p>
                        )}
                      </div>

                      <Button 
                        size="sm"
                        onClick={() => requestMutation.mutate(pkg.id)}
                        disabled={requestMutation.isPending || !!request}
                        className="bg-[#02a1e8] hover:bg-[#0287c3] text-white"
                      >
                        {request ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Sent
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1" />
                            Request
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>Automated Workflow:</strong> System auto-detects packaging with recycled content claims, 
            identifies linked suppliers, and sends declaration requests with required documentation templates. 
            Suppliers receive email with 14-day deadline and portal access to upload certificates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
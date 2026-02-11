import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  Upload, Search, FileText, AlertTriangle, CheckCircle2, 
  Clock, Filter, Download, Eye, Trash2, RefreshCw
} from "lucide-react";
import PPWRDeclarationUpload from './PPWRDeclarationUpload';
import PPWRDeclarationViewer from './PPWRDeclarationViewer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PPWRSupplierDeclarations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState(null);
  const queryClient = useQueryClient();

  // Fetch declarations from DPPEvidence entity (reusing existing infrastructure)
  const { data: declarations = [], isLoading } = useQuery({
    queryKey: ['ppwr-declarations'],
    queryFn: async () => {
      const evidence = await base44.entities.DPPEvidence.filter({
        evidence_type: 'supplier_declaration'
      });
      return evidence;
    }
  });

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DPPEvidence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['ppwr-declarations']);
      toast.success('Declaration deleted');
    }
  });

  // Auto-flag expiring declarations
  const checkExpirationMutation = useMutation({
    mutationFn: async () => {
      toast.loading('Checking declaration expiration...');
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      for (const dec of declarations) {
        if (dec.extracted_data?.expiry_date) {
          const expiryDate = new Date(dec.extracted_data.expiry_date);
          let newStatus = 'verified';
          
          if (expiryDate < today) {
            newStatus = 'expired';
          } else if (expiryDate < thirtyDaysFromNow) {
            newStatus = 'expiring_soon';
          }

          if (dec.verification_status !== newStatus && (newStatus === 'expired' || newStatus === 'expiring_soon')) {
            await base44.entities.DPPEvidence.update(dec.id, {
              verification_status: newStatus
            });
          }
        }
      }

      toast.dismiss();
      toast.success('Expiration check complete');
      queryClient.invalidateQueries(['ppwr-declarations']);
    }
  });

  // Calculate stats
  const stats = {
    total: declarations.length,
    valid: declarations.filter(d => d.verification_status === 'verified').length,
    expiring: declarations.filter(d => d.verification_status === 'expiring_soon').length,
    expired: declarations.filter(d => d.verification_status === 'expired').length,
    pending: declarations.filter(d => d.verification_status === 'pending').length
  };

  // Filter declarations
  const filtered = declarations.filter(d => {
    const matchesSearch = 
      d.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.extracted_data?.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.linked_to_field?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || d.verification_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const configs = {
      verified: { label: 'Valid', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
      expiring_soon: { label: 'Expiring Soon', className: 'bg-amber-100 text-amber-700', icon: Clock },
      expired: { label: 'Expired', className: 'bg-rose-100 text-rose-700', icon: AlertTriangle },
      pending: { label: 'Pending Review', className: 'bg-blue-100 text-blue-700', icon: Clock },
      rejected: { label: 'Incomplete', className: 'bg-slate-100 text-slate-700', icon: AlertTriangle }
    };
    
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Total</div>
            <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4">
            <div className="text-xs text-emerald-700 uppercase font-bold mb-1">Valid</div>
            <div className="text-3xl font-bold text-emerald-600">{stats.valid}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4">
            <div className="text-xs text-amber-700 uppercase font-bold mb-1">Expiring</div>
            <div className="text-3xl font-bold text-amber-600">{stats.expiring}</div>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/30">
          <CardContent className="p-4">
            <div className="text-xs text-rose-700 uppercase font-bold mb-1">Expired</div>
            <div className="text-3xl font-bold text-rose-600">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <div className="text-xs text-blue-700 uppercase font-bold mb-1">Pending</div>
            <div className="text-3xl font-bold text-blue-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by supplier, document, or packaging..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="verified">Valid</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="rejected">Incomplete</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => checkExpirationMutation.mutate()}
          disabled={checkExpirationMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${checkExpirationMutation.isPending ? 'animate-spin' : ''}`} />
          Check Expiration
        </Button>

        <Button
          onClick={() => setShowUpload(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Declaration
        </Button>
      </div>

      {/* Declarations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Declarations & Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading declarations...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 font-medium">No declarations found</p>
              <p className="text-sm text-slate-400 mt-1">Upload supplier declarations to track PCR content and compliance</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(declaration => {
                const linkedPackaging = packaging.find(p => p.id === declaration.dpp_id);
                const supplier = suppliers.find(s => s.id === declaration.extracted_data?.supplier_id);
                
                return (
                  <div 
                    key={declaration.id} 
                    className="p-4 bg-white border rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <div>
                            <div className="font-medium text-slate-900">{declaration.file_name}</div>
                            <div className="text-xs text-slate-500">
                              Uploaded {new Date(declaration.upload_date).toLocaleDateString()}
                              {supplier && ` • ${supplier.legal_name}`}
                            </div>
                          </div>
                        </div>

                        {declaration.extracted_data && (
                          <div className="ml-8 grid grid-cols-4 gap-4 text-sm">
                            {declaration.extracted_data.pcr_percentage && (
                              <div>
                                <span className="text-slate-500">PCR Content:</span>
                                <span className="font-bold text-emerald-600 ml-2">
                                  {declaration.extracted_data.pcr_percentage}%
                                </span>
                              </div>
                            )}
                            {declaration.extracted_data.issue_date && (
                              <div>
                                <span className="text-slate-500">Issued:</span>
                                <span className="font-medium text-slate-700 ml-2">
                                  {new Date(declaration.extracted_data.issue_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {declaration.extracted_data.expiry_date && (
                              <div>
                                <span className="text-slate-500">Expires:</span>
                                <span className="font-medium text-slate-700 ml-2">
                                  {new Date(declaration.extracted_data.expiry_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {linkedPackaging && (
                              <div>
                                <span className="text-slate-500">Linked to:</span>
                                <span className="font-medium text-blue-600 ml-2">
                                  {linkedPackaging.packaging_name}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(declaration.verification_status)}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedDeclaration(declaration)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(declaration.file_url, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600"
                          onClick={() => deleteMutation.mutate(declaration.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <PPWRDeclarationUpload
        open={showUpload}
        onOpenChange={setShowUpload}
        packaging={packaging}
        suppliers={suppliers}
      />

      {selectedDeclaration && (
        <PPWRDeclarationViewer
          declaration={selectedDeclaration}
          packaging={packaging}
          suppliers={suppliers}
          onClose={() => setSelectedDeclaration(null)}
        />
      )}
    </div>
  );
}
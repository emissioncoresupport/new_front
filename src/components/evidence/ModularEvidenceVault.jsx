import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Upload, Search, Filter, Download, ExternalLink, 
  Shield, Calendar, User, Building2, CheckCircle, AlertTriangle, Clock, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Modular Evidence Vault - Module-specific evidence management
 * @param {string} module - Compliance module (cbam, eudr, pfas, ppwr, eudamed, etc.)
 * @param {string} supplierId - Optional: filter by specific supplier
 * @param {boolean} embedded - Compact view for embedding
 */
export default function ModularEvidenceVault({ module, supplierId = null, embedded = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch documents for this module
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', module, supplierId],
    queryFn: async () => {
      const filters = { module };
      if (supplierId) filters.object_id = supplierId;
      return await base44.entities.Document.filter(filters, '-uploaded_at');
    },
    initialData: []
  });

  // Fetch suppliers for document ownership
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => base44.entities.Document.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
      setSelectedDoc(null);
    }
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document updated');
    }
  });

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || doc.document_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const documentTypes = [...new Set(documents.map(d => d.document_type).filter(Boolean))];
  const statusCounts = {
    verified: documents.filter(d => d.status === 'verified').length,
    pending: documents.filter(d => d.status === 'pending').length,
    rejected: documents.filter(d => d.status === 'rejected').length
  };

  const getSupplierName = (objectId) => {
    const supplier = suppliers.find(s => s.id === objectId);
    return supplier?.legal_name || 'Unknown';
  };

  const getStatusConfig = (status) => {
    const configs = {
      verified: { color: 'bg-[#86b027] text-white', icon: CheckCircle },
      pending: { color: 'bg-slate-200 text-slate-700', icon: Clock },
      rejected: { color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
      processing: { color: 'bg-slate-200 text-slate-700', icon: Clock }
    };
    return configs[status] || configs.pending;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#86b027] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-light text-slate-900">
              {module.toUpperCase()} Evidence Vault
            </h2>
            <p className="text-sm text-slate-500 mt-1">{documents.length} documents stored</p>
          </div>
          <Button onClick={() => setUploadModalOpen(true)} className="bg-slate-900 hover:bg-slate-800">
            <Upload className="w-4 h-4 mr-2" />
            Upload Evidence
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <CheckCircle className="w-5 h-5 mx-auto mb-2 text-[#86b027]" />
          <div className="text-2xl font-light text-slate-900">{statusCounts.verified}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Verified</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <Clock className="w-5 h-5 mx-auto mb-2 text-slate-500" />
          <div className="text-2xl font-light text-slate-900">{statusCounts.pending}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Pending</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-600" />
          <div className="text-2xl font-light text-slate-900">{statusCounts.rejected}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {documentTypes.map(type => (
              <SelectItem key={type} value={type} className="capitalize">
                {type?.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border border-slate-200">
            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600 font-light">No evidence documents yet</p>
            <p className="text-sm text-slate-400 mt-1">Upload compliance evidence to get started</p>
          </div>
        ) : (
          filteredDocs.map(doc => {
            const statusConfig = getStatusConfig(doc.status);
            const StatusIcon = statusConfig.icon;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <FileText className="w-8 h-8 text-slate-400 group-hover:text-[#86b027] transition-colors" />
                  <Badge className={cn("text-xs", statusConfig.color)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {doc.status}
                  </Badge>
                </div>
                <h4 className="font-light text-slate-900 mb-2 truncate">{doc.file_name}</h4>
                <div className="space-y-1 text-xs text-slate-500">
                  {doc.object_type === 'Supplier' && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate">{getSupplierName(doc.object_id)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  </div>
                  {doc.document_type && (
                    <Badge variant="outline" className="text-xs mt-2 capitalize">
                      {doc.document_type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedDoc.file_name}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="space-y-4">
                <iframe
                  src={selectedDoc.file_url}
                  className="w-full h-[500px] border rounded-lg"
                  title={selectedDoc.file_name}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.open(selectedDoc.file_url, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button variant="outline" onClick={() => {
                    const a = document.createElement('a');
                    a.href = selectedDoc.file_url;
                    a.download = selectedDoc.file_name;
                    a.click();
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="metadata" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Status</Label>
                    <Select
                      value={selectedDoc.status}
                      onValueChange={(value) => updateDocMutation.mutate({ id: selectedDoc.id, data: { status: value } })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Type</Label>
                    <p className="font-medium capitalize">{selectedDoc.document_type?.replace(/_/g, ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Uploaded By</Label>
                    <p className="font-medium">{selectedDoc.uploaded_by || 'System'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Uploaded At</Label>
                    <p className="font-medium">{new Date(selectedDoc.uploaded_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">File Hash (SHA-256)</Label>
                    <p className="font-mono text-xs truncate">{selectedDoc.file_hash_sha256}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Module</Label>
                    <Badge className="uppercase">{selectedDoc.module || 'Unknown'}</Badge>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Delete this document permanently?')) {
                      deleteDocMutation.mutate(selectedDoc.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Document
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Modal */}
      <UploadEvidenceModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        module={module}
        supplierId={supplierId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
      />
    </div>
  );
}

// Upload Modal Component
function UploadEvidenceModal({ open, onClose, module, supplierId, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(supplierId || '');
  const [documentType, setDocumentType] = useState('certificate');

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const user = await base44.auth.me();

      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const file_hash_sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        await base44.entities.Document.create({
          tenant_id: user.company_id,
          object_type: 'Supplier',
          object_id: selectedSupplier,
          module,
          file_name: file.name,
          file_url,
          file_hash_sha256,
          file_size_bytes: file.size,
          document_type: documentType,
          uploaded_by: user.email,
          uploaded_at: new Date().toISOString(),
          status: 'pending'
        });
      }

      toast.success(`${files.length} document(s) uploaded`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload {module.toUpperCase()} Evidence</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Supplier</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.legal_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="declaration">Declaration</SelectItem>
                <SelectItem value="test_report">Test Report</SelectItem>
                <SelectItem value="sds">Safety Data Sheet</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Files</Label>
            <Input type="file" multiple onChange={handleUpload} disabled={uploading || !selectedSupplier} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
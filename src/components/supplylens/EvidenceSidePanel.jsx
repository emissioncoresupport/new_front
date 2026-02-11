import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Upload, X, Eye, Download, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function EvidenceSidePanel({ entityType, entityId, entityName }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const queryClient = useQueryClient();

  // Fetch evidence packs for this entity
  const { data: evidencePacks = [] } = useQuery({
    queryKey: ['evidence-packs', entityType, entityId],
    queryFn: () => base44.entities.EvidencePack.filter({ entity_type: entityType, entity_id: entityId }),
    enabled: !!entityId
  });

  // Fetch all documents linked to these packs
  const documentIds = evidencePacks.flatMap(ep => ep.evidence_document_ids || []);
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', documentIds],
    queryFn: async () => {
      if (documentIds.length === 0) return [];
      const docs = await Promise.all(
        documentIds.map(id => base44.entities.Document.filter({ id }).then(r => r[0]))
      );
      return docs.filter(Boolean);
    },
    enabled: documentIds.length > 0
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType, extractedFields }) => {
      const user = await base44.auth.me();
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Calculate hash
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const file_hash_sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Create document
      const doc = await base44.entities.Document.create({
        tenant_id: user.company_id || user.id,
        object_type: entityType,
        object_id: entityId,
        file_name: file.name,
        file_url,
        file_hash_sha256,
        file_size_bytes: file.size,
        document_type: documentType,
        uploaded_by: user.email,
        uploaded_at: new Date().toISOString(),
        status: 'verified'
      });

      // Create or update evidence pack
      const existingPack = evidencePacks.find(ep => ep.pack_type === 'entity_creation');
      
      if (existingPack) {
        await base44.entities.EvidencePack.update(existingPack.id, {
          evidence_document_ids: [...(existingPack.evidence_document_ids || []), doc.id],
          decision_metadata: {
            ...existingPack.decision_metadata,
            [`doc_${doc.id}`]: { extractedFields, uploadedAt: new Date().toISOString() }
          }
        });
      } else {
        await base44.entities.EvidencePack.create({
          tenant_id: user.company_id || user.id,
          entity_type: entityType,
          entity_id: entityId,
          pack_type: 'entity_creation',
          evidence_document_ids: [doc.id],
          status: 'approved',
          created_by: user.email,
          title: `Evidence for ${entityName}`,
          decision_metadata: {
            [`doc_${doc.id}`]: { extractedFields, uploadedAt: new Date().toISOString() }
          }
        });
      }

      return doc;
    },
    onSuccess: () => {
      toast.success('Evidence uploaded');
      queryClient.invalidateQueries(['evidence-packs']);
      queryClient.invalidateQueries(['documents']);
      setShowUploadModal(false);
    }
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-600" />
          <h3 className="text-base font-light text-slate-900">Evidence Vault</h3>
          <Badge variant="outline" className="text-xs font-light">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          size="sm"
          variant="outline"
          className="h-8"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* Evidence Packs */}
      <div className="space-y-3">
        {evidencePacks.length === 0 ? (
          <Card className="bg-slate-50/50 border-slate-200">
            <CardContent className="p-8 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-500 font-light">No evidence yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload documents to build evidence pack</p>
            </CardContent>
          </Card>
        ) : (
          evidencePacks.map(pack => {
            const packDocs = documents.filter(d => pack.evidence_document_ids?.includes(d.id));
            
            return (
              <Card key={pack.id} className="bg-white border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-light text-slate-900">{pack.title || 'Evidence Pack'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-light capitalize">
                          {pack.pack_type?.replace('_', ' ')}
                        </Badge>
                        <Badge className={cn(
                          "text-xs font-light",
                          pack.status === 'approved' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {pack.status}
                        </Badge>
                      </div>
                    </div>
                    {pack.source === 'gpt5' && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs font-light">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                    )}
                  </div>

                  {/* Documents in Pack */}
                  <div className="space-y-2">
                    {packDocs.map(doc => {
                      const metadata = pack.decision_metadata?.[`doc_${doc.id}`];
                      
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-light text-slate-900 truncate">{doc.file_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs font-light capitalize">
                                  {doc.document_type}
                                </Badge>
                                {metadata?.extractedFields && (
                                  <span className="text-xs text-slate-500">
                                    {Object.keys(metadata.extractedFields).length} fields extracted
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.status === 'verified' && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(doc.file_url, '_blank');
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Metadata */}
                  {pack.model_name && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Sparkles className="w-3 h-3" />
                        <span>Model: {pack.model_name}</span>
                        {pack.prompt_version && <span>• Version: {pack.prompt_version}</span>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUpload={uploadMutation.mutate}
        isUploading={uploadMutation.isPending}
      />

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <DocumentViewerModal
          document={selectedDoc}
          evidencePack={evidencePacks.find(ep => ep.evidence_document_ids?.includes(selectedDoc.id))}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}

function UploadModal({ open, onOpenChange, onUpload, isUploading }) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('certificate');
  const [extracting, setExtracting] = useState(false);
  const [extractedFields, setExtractedFields] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Auto-extract fields from PDF
    if (selectedFile.type === 'application/pdf') {
      setExtracting(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
        
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract key information from this document. Identify:
          - Document type (certificate, declaration, test report, audit report, etc.)
          - Issuer/authority
          - Issue date and expiry date
          - Certificate number or reference
          - Any compliance standards mentioned
          - Key findings or attestations`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              document_type: { type: "string" },
              issuer: { type: "string" },
              issue_date: { type: "string" },
              expiry_date: { type: "string" },
              certificate_number: { type: "string" },
              standards: { type: "array", items: { type: "string" } },
              findings: { type: "string" }
            }
          }
        });
        
        setExtractedFields(result);
        toast.success('Document analyzed successfully');
      } catch (error) {
        toast.error('Failed to analyze document: ' + error.message);
      } finally {
        setExtracting(false);
      }
    }
  };

  const handleUpload = () => {
    if (!file) return;
    onUpload({ file, documentType, extractedFields });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Evidence Document</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Document Type</Label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg"
            >
              <option value="certificate">Certificate</option>
              <option value="declaration">Declaration</option>
              <option value="test_report">Test Report</option>
              <option value="audit_report">Audit Report</option>
              <option value="invoice">Invoice</option>
              <option value="sds">Safety Data Sheet</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <Label>File</Label>
            <Input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="mt-1"
            />
          </div>

          {extracting && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-light">Analyzing document with AI...</span>
              </div>
            </div>
          )}

          {extractedFields && (
            <div className="p-4 bg-green-50 rounded-lg space-y-2">
              <p className="text-sm font-medium text-green-900">Extracted Information:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(extractedFields).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-green-700 capitalize">{key.replace('_', ' ')}:</span>
                    <span className="ml-1 text-green-900">
                      {Array.isArray(value) ? value.join(', ') : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="bg-[#86b027] hover:bg-[#86b027]/90"
            >
              {isUploading ? 'Uploading...' : 'Upload Evidence'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentViewerModal({ document, evidencePack, onClose }) {
  const metadata = evidencePack?.decision_metadata?.[`doc_${document.id}`];
  
  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{document.file_name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(document.file_url, '_blank')}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Document Viewer */}
          <div className="col-span-2 border rounded-lg overflow-hidden">
            <iframe
              src={document.file_url}
              className="w-full h-[600px]"
              title={document.file_name}
            />
          </div>

          {/* Metadata Panel */}
          <div className="space-y-4">
            <Card className="bg-slate-50">
              <CardContent className="p-4 space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Type</Label>
                  <p className="text-sm font-medium capitalize">{document.document_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Status</Label>
                  <Badge variant={document.status === 'verified' ? 'default' : 'secondary'}>
                    {document.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Uploaded</Label>
                  <p className="text-sm">{new Date(document.uploaded_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Size</Label>
                  <p className="text-sm">{(document.file_size_bytes / 1024).toFixed(2)} KB</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Hash (SHA-256)</Label>
                  <p className="text-xs font-mono break-all">{document.file_hash_sha256?.substring(0, 32)}...</p>
                </div>
              </CardContent>
            </Card>

            {/* Extracted Fields */}
            {metadata?.extractedFields && (
              <Card className="bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-medium text-purple-900">AI Extracted Data</p>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(metadata.extractedFields).map(([key, value]) => (
                      <div key={key}>
                        <Label className="text-xs text-purple-700 capitalize">
                          {key.replace('_', ' ')}
                        </Label>
                        <p className="text-sm text-purple-900">
                          {Array.isArray(value) ? value.join(', ') : value || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
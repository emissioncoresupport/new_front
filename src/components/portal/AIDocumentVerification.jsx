import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle2, XCircle, AlertTriangle, Loader2, FileText, Eye, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AIDocumentVerification({ supplier }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('certification');
  const [viewingDoc, setViewingDoc] = useState(null);

  const queryClient = useQueryClient();

  // Fetch verification records
  const { data: verifications = [] } = useQuery({
    queryKey: ['supplier-verifications', supplier?.id],
    queryFn: () => base44.entities.SupplierDocumentVerification.filter({ 
      supplier_id: supplier?.id 
    }),
    enabled: !!supplier?.id
  });

  // Upload and verify document
  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }) => {
      // Step 1: Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Step 2: Create initial record
      const record = await base44.entities.SupplierDocumentVerification.create({
        supplier_id: supplier.id,
        document_type: type,
        document_name: file.name,
        document_url: file_url,
        ai_extraction_status: 'processing',
        validation_status: 'pending'
      });

      // Step 3: AI extraction and validation
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this document and extract key information. Validate it against these criteria:
        
Document Type: ${type}
Supplier: ${supplier.legal_name || supplier.company_name}
Country: ${supplier.country}

Extract and validate:
1. Document issuer/authority
2. Issue date and expiry date (if applicable)
3. Certification/verification number
4. Scope of certification/verification
5. Compliance standards referenced
6. Any emissions data or metrics
7. Key findings or attestations

Validation criteria:
- Document must be recent (within 2 years for certifications, 1 year for reports)
- Must be from recognized authority/auditor
- Must include specific scope and standards
- Data must be complete and consistent
- For CBAM: Must include direct and indirect emissions, verification methodology

Provide:
1. Extracted data in structured format
2. List of discrepancies or issues found
3. Overall validation score (0-100)
4. Feedback for the supplier on document quality and any improvements needed
5. Recommendation: PASSED, NEEDS_REVIEW, or FAILED`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            extracted_data: {
              type: "object",
              properties: {
                issuer: { type: "string" },
                issue_date: { type: "string" },
                expiry_date: { type: "string" },
                reference_number: { type: "string" },
                scope: { type: "string" },
                standards: { type: "array", items: { type: "string" } },
                metrics: { type: "object" }
              }
            },
            discrepancies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  expected: { type: "string" },
                  found: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            validation_score: { type: "number" },
            supplier_feedback: { type: "string" },
            recommendation: { type: "string" }
          }
        }
      });

      // Step 4: Update record with AI results
      const validationStatus = 
        aiResult.recommendation === 'PASSED' ? 'passed' :
        aiResult.recommendation === 'FAILED' ? 'failed' : 'needs_review';

      await base44.entities.SupplierDocumentVerification.update(record.id, {
        ai_extraction_status: 'completed',
        extracted_data: aiResult.extracted_data,
        validation_status: validationStatus,
        validation_score: aiResult.validation_score,
        discrepancies: aiResult.discrepancies || [],
        ai_feedback: aiResult.supplier_feedback,
        validation_criteria: {
          document_type: type,
          timestamp: new Date().toISOString()
        }
      });

      // Create notification for supplier
      const notificationType = validationStatus === 'passed' ? 'document_verified' : 'document_needs_review';
      const notificationTitle = validationStatus === 'passed' 
        ? '✅ Document Verified' 
        : '⚠️ Document Needs Review';
      const notificationMessage = validationStatus === 'passed'
        ? `Your ${type} document has been successfully verified.`
        : `Your ${type} document requires additional review. Please check the feedback.`;

      await base44.entities.SupplierNotification.create({
        supplier_id: supplier.id,
        notification_type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        priority: validationStatus === 'failed' ? 'high' : 'medium',
        related_entity_type: 'SupplierDocumentVerification',
        related_entity_id: record.id
      });

      return { record, aiResult };
    },
    onSuccess: ({ aiResult }) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-verifications'] });
      setSelectedFile(null);
      setUploading(false);
      
      if (aiResult.recommendation === 'PASSED') {
        toast.success('✅ Document verified successfully!');
      } else if (aiResult.recommendation === 'FAILED') {
        toast.error('❌ Document verification failed. Please review feedback.');
      } else {
        toast.warning('⚠️ Document needs review. See feedback for details.');
      }
    },
    onError: (error) => {
      toast.error('Error processing document');
      console.error(error);
      setUploading(false);
    }
  });

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    uploadMutation.mutate({ file: selectedFile, type: documentType });
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700', icon: Loader2 },
      processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700', icon: Loader2 },
      passed: { label: 'Passed', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-700', icon: XCircle },
      needs_review: { label: 'Needs Review', className: 'bg-amber-100 text-amber-700', icon: AlertTriangle }
    };

    const { label, className, icon: Icon } = config[status] || config.pending;

    return (
      <Badge className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#86b027]" />
            AI-Powered Document Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="certification">Certification</SelectItem>
                  <SelectItem value="verification_report">Verification Report</SelectItem>
                  <SelectItem value="emissions_report">Emissions Report</SelectItem>
                  <SelectItem value="audit_report">Audit Report</SelectItem>
                  <SelectItem value="test_results">Test Results</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Upload Document</Label>
              <Input
                type="file"
                accept=".pdf,.xlsx,.csv,.jpg,.png"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="mt-1.5"
                disabled={uploading}
              />
            </div>
          </div>

          {selectedFile && (
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-[#86b027] hover:bg-[#769c22]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Verify
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong className="text-blue-700">AI Verification:</strong> AI will automatically extract key data, validate against compliance criteria, and provide instant feedback.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Verification History */}
      <Card>
        <CardHeader>
          <CardTitle>Document Verification History</CardTitle>
        </CardHeader>
        <CardContent>
          {verifications.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>AI Status</TableHead>
                  <TableHead>Validation</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.document_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.document_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.ai_extraction_status)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.validation_status)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${
                        doc.validation_score >= 80 ? 'text-emerald-600' :
                        doc.validation_score >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {doc.validation_score || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(doc.created_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingDoc(doc)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
          </DialogHeader>

          {viewingDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Document</Label>
                  <p className="font-medium">{viewingDoc.document_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Type</Label>
                  <Badge variant="outline" className="mt-1">{viewingDoc.document_type}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Validation Status</Label>
                  <div className="mt-1">{getStatusBadge(viewingDoc.validation_status)}</div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Score</Label>
                  <p className="text-2xl font-bold text-[#86b027]">{viewingDoc.validation_score || 'N/A'}</p>
                </div>
              </div>

              {viewingDoc.ai_feedback && (
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader>
                    <CardTitle className="text-sm">AI Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700">{viewingDoc.ai_feedback}</p>
                  </CardContent>
                </Card>
              )}

              {viewingDoc.discrepancies && viewingDoc.discrepancies.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/30">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Discrepancies Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {viewingDoc.discrepancies.map((disc, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm">{disc.field}</span>
                            <Badge className={
                              disc.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              disc.severity === 'high' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }>
                              {disc.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600">Expected: {disc.expected}</p>
                          <p className="text-xs text-slate-600">Found: {disc.found}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {viewingDoc.extracted_data && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Extracted Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto max-h-[300px]">
                      {JSON.stringify(viewingDoc.extracted_data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => window.open(viewingDoc.document_url, '_blank')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Original Document
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
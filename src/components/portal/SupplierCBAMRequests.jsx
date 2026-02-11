import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle2, Clock, AlertCircle, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SupplierCBAMRequests({ supplier }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [emissionsData, setEmissionsData] = useState({
    direct_emissions: '',
    indirect_emissions: '',
    emissions_intensity: '',
    verification_document: null
  });

  const queryClient = useQueryClient();

  // Fetch CBAM entries where supplier is linked and validation is pending
  const { data: cbamRequests = [] } = useQuery({
    queryKey: ['supplier-cbam-requests', supplier?.id],
    queryFn: () => base44.entities.CBAMEmissionEntry.filter({ 
      supplier_id: supplier?.id,
      validation_status: 'pending'
    }),
    enabled: !!supplier?.id
  });

  // Fetch verified/completed requests
  const { data: completedRequests = [] } = useQuery({
    queryKey: ['supplier-cbam-completed', supplier?.id],
    queryFn: () => base44.entities.CBAMEmissionEntry.filter({ 
      supplier_id: supplier?.id,
      validation_status: 'manual_verified'
    }),
    enabled: !!supplier?.id
  });

  // Upload verified emissions data
  const uploadEmissionsMutation = useMutation({
    mutationFn: async (data) => {
      let documentUrl = null;
      
      // Upload verification document if provided
      if (data.verification_document) {
        const { file_url } = await base44.integrations.Core.UploadFile({ 
          file: data.verification_document 
        });
        documentUrl = file_url;
      }

      const intensity = parseFloat(data.emissions_intensity) || 0;
      const quantity = parseFloat(selectedRequest.quantity) || 0;

      // Update the CBAM entry with verified data
      const updatedEntry = await base44.entities.CBAMEmissionEntry.update(selectedRequest.id, {
        embedded_emissions_factor: intensity,
        total_embedded_emissions: quantity * intensity,
        direct_emissions_specific: parseFloat(data.direct_emissions) || 0,
        indirect_emissions_specific: parseFloat(data.indirect_emissions) || 0,
        validation_status: 'manual_verified',
        data_quality_rating: 'high',
        verification_document_url: documentUrl,
        verified_date: new Date().toISOString()
      });

      // Create SupplierPCF record for future use
      await base44.entities.SupplierPCF.create({
        supplier_id: supplier.id,
        product_name: selectedRequest.product_name,
        cn_code: selectedRequest.cn_code,
        emissions_intensity: parseFloat(data.emissions_intensity),
        direct_emissions: parseFloat(data.direct_emissions) || 0,
        indirect_emissions: parseFloat(data.indirect_emissions) || 0,
        verification_status: 'verified',
        verification_document_url: documentUrl,
        last_updated: new Date().toISOString()
      });

      // Create success notification
      await base44.entities.SupplierNotification.create({
        supplier_id: supplier.id,
        notification_type: 'document_verified',
        title: '✅ Emissions Data Verified',
        message: `Your verified emissions data for ${selectedRequest.product_name} has been successfully submitted.`,
        priority: 'medium',
        related_entity_type: 'CBAMEmissionEntry',
        related_entity_id: selectedRequest.id
      });

      return updatedEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-cbam-requests'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-cbam-completed'] });
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-pcfs'] });
      toast.success('✅ Verified emissions data uploaded successfully');
      setUploadModalOpen(false);
      setSelectedRequest(null);
      resetForm();
    }
  });

  const handleUpload = async () => {
    if (!emissionsData.emissions_intensity) {
      toast.error('Please enter emissions intensity');
      return;
    }

    setUploading(true);
    try {
      await uploadEmissionsMutation.mutateAsync(emissionsData);
    } catch (error) {
      toast.error('Error uploading data');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setEmissionsData({
      direct_emissions: '',
      indirect_emissions: '',
      emissions_intensity: '',
      verification_document: null
    });
  };

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pending CBAM Data Requests</span>
            <Badge variant="outline">{cbamRequests.length} pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cbamRequests.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No pending requests</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>CN Code</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Import Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cbamRequests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.product_name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.cn_code}</Badge>
                    </TableCell>
                    <TableCell>{request.quantity ? request.quantity.toFixed(2) : '0.00'} tonnes</TableCell>
                    <TableCell>{request.import_date || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className="bg-amber-100 text-amber-700">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setUploadModalOpen(true);
                        }}
                        className="bg-[#86b027] hover:bg-[#769c22]"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Data
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Completed Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Verified Submissions</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
              {completedRequests.length} verified
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedRequests.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No verified submissions yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>CN Code</TableHead>
                  <TableHead>Emissions Intensity</TableHead>
                  <TableHead>Verified Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedRequests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>{request.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.cn_code}</Badge>
                    </TableCell>
                    <TableCell>
                      {request.embedded_emissions_factor ? request.embedded_emissions_factor.toFixed(2) : 'N/A'} tCO2/t
                    </TableCell>
                    <TableCell>
                      {request.verified_date ? new Date(request.verified_date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Verified Emissions Data</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-semibold text-slate-900">Product: {selectedRequest.product_name}</p>
                <p className="text-xs text-slate-600 mt-1">CN Code: {selectedRequest.cn_code}</p>
                <p className="text-xs text-slate-600">Quantity: {selectedRequest.quantity ? selectedRequest.quantity.toFixed(2) : '0.00'} tonnes</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Direct Emissions (tCO2/t)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={emissionsData.direct_emissions}
                    onChange={(e) => setEmissionsData({...emissionsData, direct_emissions: e.target.value})}
                    className="mt-1.5"
                    placeholder="e.g., 1.5"
                  />
                </div>
                <div>
                  <Label>Indirect Emissions (tCO2/t)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={emissionsData.indirect_emissions}
                    onChange={(e) => setEmissionsData({...emissionsData, indirect_emissions: e.target.value})}
                    className="mt-1.5"
                    placeholder="e.g., 0.5"
                  />
                </div>
              </div>

              <div>
                <Label>Total Emissions Intensity (tCO2/t) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={emissionsData.emissions_intensity}
                  onChange={(e) => setEmissionsData({...emissionsData, emissions_intensity: e.target.value})}
                  className="mt-1.5"
                  placeholder="e.g., 2.1"
                />
                <p className="text-xs text-slate-500 mt-1">Total embedded emissions per tonne of product</p>
              </div>

              <div>
                <Label>Verification Document (Optional)</Label>
                <Input
                  type="file"
                  accept=".pdf,.xlsx,.csv"
                  onChange={(e) => setEmissionsData({...emissionsData, verification_document: e.target.files[0]})}
                  className="mt-1.5"
                />
                <p className="text-xs text-slate-500 mt-1">Upload certificate, report, or evidence</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900">
                  <strong>Note:</strong> Verified data will be used for all future imports of this product, reducing CBAM costs through accurate emissions reporting.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!emissionsData.emissions_intensity || uploading}
                  className="bg-[#86b027] hover:bg-[#769c22]"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit Verified Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
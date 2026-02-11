import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Upload, FileText, CheckCircle2, AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ESGDataSubmission({ supplierId }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: 'emissions',
    metric_name: '',
    value: '',
    unit: '',
    data_source: '',
    notes: ''
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState([]);
  const queryClient = useQueryClient();

  const { data: esgData = [] } = useQuery({
    queryKey: ['supplier-esg-data', supplierId],
    queryFn: () => base44.entities.SupplierESGData.filter({ supplier_id: supplierId }, '-created_date')
  });

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierESGData.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-esg-data'] });
      toast.success('ESG data submitted successfully');
      setShowForm(false);
      setFormData({ category: 'emissions', metric_name: '', value: '', unit: '', data_source: '', notes: '' });
      setEvidenceUrls([]);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEvidenceUrls([...evidenceUrls, file_url]);
      toast.success('File uploaded');
    } catch (error) {
      toast.error('File upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.metric_name || !formData.value) {
      toast.error('Please fill in required fields');
      return;
    }

    submitMutation.mutate({
      supplier_id: supplierId,
      reporting_period: new Date().toISOString().split('T')[0],
      ...formData,
      value: parseFloat(formData.value),
      evidence_urls: evidenceUrls,
      verification_status: 'submitted'
    });
  };

  const categoryMetrics = {
    emissions: ['Scope 1 Emissions', 'Scope 2 Emissions', 'Scope 3 Emissions', 'Total GHG Emissions'],
    energy: ['Total Energy Consumption', 'Renewable Energy %', 'Energy Intensity', 'Electricity Usage'],
    water: ['Water Withdrawal', 'Water Discharge', 'Water Recycled', 'Water Intensity'],
    waste: ['Total Waste Generated', 'Waste Recycled %', 'Hazardous Waste', 'Waste to Landfill'],
    labor: ['Total Employees', 'Employee Turnover %', 'Training Hours', 'Gender Diversity %'],
    health_safety: ['Accident Rate', 'Lost Time Injury Rate', 'Near Misses', 'Safety Training Hours'],
    governance: ['Board Diversity %', 'Ethics Training %', 'Audit Score', 'Compliance Incidents'],
    supply_chain: ['Suppliers Audited %', 'Tier 1 Suppliers', 'Local Sourcing %', 'Conflict Minerals']
  };

  const statusColors = {
    submitted: 'bg-blue-100 text-blue-700',
    under_review: 'bg-amber-100 text-amber-700',
    verified: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700'
  };

  const categoryIcons = {
    emissions: '🌍',
    energy: '⚡',
    water: '💧',
    waste: '♻️',
    labor: '👥',
    health_safety: '🛡️',
    governance: '⚖️',
    supply_chain: '🔗'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-[#545454]">ESG Data Submission</h3>
          <p className="text-sm text-slate-600">Submit your ESG metrics and supporting evidence</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#86b027]">
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'Submit Data'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#86b027]">
          <CardHeader>
            <CardTitle className="text-base">Submit ESG Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val, metric_name: ''})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emissions">🌍 Emissions</SelectItem>
                    <SelectItem value="energy">⚡ Energy</SelectItem>
                    <SelectItem value="water">💧 Water</SelectItem>
                    <SelectItem value="waste">♻️ Waste</SelectItem>
                    <SelectItem value="labor">👥 Labor</SelectItem>
                    <SelectItem value="health_safety">🛡️ Health & Safety</SelectItem>
                    <SelectItem value="governance">⚖️ Governance</SelectItem>
                    <SelectItem value="supply_chain">🔗 Supply Chain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Metric Name *</Label>
                <Select value={formData.metric_name} onValueChange={(val) => setFormData({...formData, metric_name: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryMetrics[formData.category]?.map(metric => (
                      <SelectItem key={metric} value={metric}>{metric}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Value *</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  placeholder="Enter value"
                />
              </div>

              <div>
                <Label>Unit *</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  placeholder="e.g., tCO2e, kWh, m³"
                />
              </div>

              <div>
                <Label>Data Source</Label>
                <Select value={formData.data_source} onValueChange={(val) => setFormData({...formData, data_source: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="meter_reading">Meter Reading</SelectItem>
                    <SelectItem value="calculation">Calculation</SelectItem>
                    <SelectItem value="estimate">Estimate</SelectItem>
                    <SelectItem value="third_party">Third Party Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Upload Evidence</Label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="evidence-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('evidence-upload')?.click()}
                    disabled={uploadingFile}
                    className="w-full"
                  >
                    {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload File
                  </Button>
                </div>
                {evidenceUrls.length > 0 && (
                  <div className="mt-2 text-xs text-emerald-600">
                    ✓ {evidenceUrls.length} file(s) attached
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional context or methodology..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="bg-[#86b027]">
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Submit Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submitted Data Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Submitted ESG Data</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className={statusColors.submitted}>
                {esgData.filter(d => d.verification_status === 'submitted').length} Submitted
              </Badge>
              <Badge variant="outline" className={statusColors.verified}>
                {esgData.filter(d => d.verification_status === 'verified').length} Verified
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {esgData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {esgData.map(data => (
                  <TableRow key={data.id}>
                    <TableCell>
                      <span className="text-lg mr-2">{categoryIcons[data.category]}</span>
                      {data.category.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="font-medium">{data.metric_name}</TableCell>
                    <TableCell className="font-bold">
                      {data.value} <span className="text-slate-500 font-normal">{data.unit}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[data.verification_status]}>
                        {data.verification_status === 'verified' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {data.verification_status === 'rejected' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {data.verification_status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(data.created_date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No ESG data submitted yet</p>
              <p className="text-sm">Click "Submit Data" to start reporting your ESG metrics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
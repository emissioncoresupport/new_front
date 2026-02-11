import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Database, Clock, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

export function SourceTrustPolicyEditor() {
  const [policies, setPolicies] = useState([
    { id: 1, dataset_type: 'SUPPLIER_MASTER_V1', field: 'legal_name', trusted_source: 'ERP', trust_rank: 10 },
    { id: 2, dataset_type: 'SUPPLIER_MASTER_V1', field: 'country_code', trusted_source: 'MANUAL_ENTRY', trust_rank: 9 },
    { id: 3, dataset_type: 'SKU_MASTER_V1', field: 'sku_code', trusted_source: 'ERP', trust_rank: 10 },
  ]);

  const addPolicy = () => {
    const newPolicy = {
      id: Date.now(),
      dataset_type: 'SUPPLIER_MASTER_V1',
      field: '',
      trusted_source: 'ERP',
      trust_rank: 9
    };
    setPolicies([...policies, newPolicy]);
  };

  const removePolicy = (id) => {
    setPolicies(policies.filter(p => p.id !== id));
    toast.success('Policy removed');
  };

  const updatePolicy = (id, updates) => {
    setPolicies(policies.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const saveAll = () => {
    toast.success('Source trust policies saved (mock)');
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-[#86b027]/30 bg-gradient-to-r from-[#86b027]/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#86b027] mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Source Trust Policies</h3>
              <p className="text-xs text-slate-600 mt-1">
                Define which ingestion source is authoritative for each dataset field. Higher trust rank wins conflicts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-slate-300 shadow-sm">
        <CardHeader className="border-b-2 border-slate-200 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Trust Policy Rules</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={addPolicy} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Rule
            </Button>
            <Button size="sm" onClick={saveAll} className="gap-2 bg-[#86b027] hover:bg-[#86b027]/90">
              <Save className="w-4 h-4" />
              Save All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {policies.map((policy) => (
            <div key={policy.id} className="flex items-center gap-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-lg">
              <div className="flex-1 grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Dataset Type</Label>
                  <Select
                    value={policy.dataset_type}
                    onValueChange={(v) => updatePolicy(policy.id, { dataset_type: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPPLIER_MASTER_V1">Supplier Master</SelectItem>
                      <SelectItem value="SKU_MASTER_V1">SKU Master</SelectItem>
                      <SelectItem value="BOM_V1">Bill of Materials</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Field</Label>
                  <Input
                    value={policy.field}
                    onChange={(e) => updatePolicy(policy.id, { field: e.target.value })}
                    placeholder="field_name"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Trusted Source</Label>
                  <Select
                    value={policy.trusted_source}
                    onValueChange={(v) => updatePolicy(policy.id, { trusted_source: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ERP">ERP</SelectItem>
                      <SelectItem value="FILE_UPLOAD">File Upload</SelectItem>
                      <SelectItem value="MANUAL_ENTRY">Manual Entry</SelectItem>
                      <SelectItem value="SUPPLIER_PORTAL">Supplier Portal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Trust Rank (1-10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={policy.trust_rank}
                    onChange={(e) => updatePolicy(policy.id, { trust_rank: parseInt(e.target.value) || 9 })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removePolicy(policy.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-300 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="text-xs text-blue-900">
            <p className="font-semibold mb-1">How Trust Rank Works</p>
            <p>When multiple evidence records provide conflicting values for the same field, the source with the highest trust rank wins. If ranks are equal, the most recent evidence is preferred.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function RetentionPolicyEditor() {
  const [policies, setPolicies] = useState([
    { id: 1, dataset_type: 'SUPPLIER_MASTER_V1', retention_years: 10, reason: 'CSRD compliance requirement' },
    { id: 2, dataset_type: 'SKU_MASTER_V1', retention_years: 10, reason: 'Product traceability' },
    { id: 3, dataset_type: 'BOM_V1', retention_years: 7, reason: 'Standard business record' },
  ]);

  const addPolicy = () => {
    const newPolicy = {
      id: Date.now(),
      dataset_type: 'SUPPLIER_MASTER_V1',
      retention_years: 7,
      reason: ''
    };
    setPolicies([...policies, newPolicy]);
  };

  const removePolicy = (id) => {
    setPolicies(policies.filter(p => p.id !== id));
    toast.success('Policy removed');
  };

  const updatePolicy = (id, updates) => {
    setPolicies(policies.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const saveAll = () => {
    toast.success('Retention policies saved (mock)');
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-amber-300/50 bg-gradient-to-r from-amber-50/80 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Data Retention Policies</h3>
              <p className="text-xs text-slate-600 mt-1">
                Configure retention periods for sealed evidence by dataset type. Applies to all sealed records.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-slate-300 shadow-sm">
        <CardHeader className="border-b-2 border-slate-200 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Retention Rules</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={addPolicy} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Rule
            </Button>
            <Button size="sm" onClick={saveAll} className="gap-2 bg-[#86b027] hover:bg-[#86b027]/90">
              <Save className="w-4 h-4" />
              Save All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {policies.map((policy) => (
            <div key={policy.id} className="flex items-center gap-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Dataset Type</Label>
                  <Select
                    value={policy.dataset_type}
                    onValueChange={(v) => updatePolicy(policy.id, { dataset_type: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPPLIER_MASTER_V1">Supplier Master</SelectItem>
                      <SelectItem value="SKU_MASTER_V1">SKU Master</SelectItem>
                      <SelectItem value="BOM_V1">Bill of Materials</SelectItem>
                      <SelectItem value="PRODUCT_CARBON_FOOTPRINT_V1">Product Carbon Footprint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Retention Years</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={policy.retention_years}
                    onChange={(e) => updatePolicy(policy.id, { retention_years: parseInt(e.target.value) || 7 })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600 mb-1">Reason</Label>
                  <Input
                    value={policy.reason}
                    onChange={(e) => updatePolicy(policy.id, { reason: e.target.value })}
                    placeholder="Compliance requirement"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removePolicy(policy.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-300 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="text-xs text-blue-900">
            <p className="font-semibold mb-1">Regulatory Compliance</p>
            <p>CSRD requires 10 years retention for material ESG data. CBAM requires 7 years for emission records. EUDR requires 5 years for due diligence evidence.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
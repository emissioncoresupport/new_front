import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, Search } from 'lucide-react';

export default function EvidenceVaultFilters({ filters, setFilters }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Search */}
      <div className="col-span-2 md:col-span-1">
        <Label className="text-xs text-slate-600 mb-1 block">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Evidence ID, dataset..."
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Method Filter */}
      <div>
        <Label className="text-xs text-slate-600 mb-1 block">Method</Label>
        <Select value={filters.method || 'all'} onValueChange={(v) => setFilters({ ...filters, method: v })}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="FILE_UPLOAD">File Upload</SelectItem>
            <SelectItem value="API_PUSH">API Push</SelectItem>
            <SelectItem value="ERP_EXPORT">ERP Export</SelectItem>
            <SelectItem value="ERP_API">ERP API</SelectItem>
            <SelectItem value="SUPPLIER_PORTAL">Supplier Portal</SelectItem>
            <SelectItem value="MANUAL_ENTRY">Manual Entry</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div>
        <Label className="text-xs text-slate-600 mb-1 block">Status</Label>
        <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ ...filters, status: v })}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="SEALED">Sealed</SelectItem>
            <SelectItem value="INGESTED">Ingested</SelectItem>
            <SelectItem value="QUARANTINED">Quarantined</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dataset Type Filter */}
      <div>
        <Label className="text-xs text-slate-600 mb-1 block">Dataset Type</Label>
        <Select value={filters.dataset_type || 'all'} onValueChange={(v) => setFilters({ ...filters, dataset_type: v })}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="SUPPLIER_MASTER">Supplier Master</SelectItem>
            <SelectItem value="PRODUCT_MASTER">Product Master</SelectItem>
            <SelectItem value="EMISSION_FACTORS">Emission Factors</SelectItem>
            <SelectItem value="CERTIFICATES">Certificates</SelectItem>
            <SelectItem value="CBAM_SUBMISSION">CBAM Submission</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
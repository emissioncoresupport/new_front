/**
 * CONTRACT 2 HARDENING - Simplified Evidence Filters
 * Glassmorphic, minimal by default with "More Filters" drawer
 * RULE: Default view shows only 3 controls (Search, Status, Type)
 */

import React, { useState } from 'react';
import { X, ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function SimpleEvidenceFilters({
  onSearch,
  onStatusChange,
  onTypeChange,
  onDataModeChange,
  onClearAll,
  activeFilters = {}
}) {
  const [searchValue, setSearchValue] = useState('');
  const [statusValue, setStatusValue] = useState('all');
  const [typeValue, setTypeValue] = useState('all');
  
  // More Filters (drawer)
  const [dataModeValue, setDataModeValue] = useState('all');
  const [ingestionMethodValue, setIngestionMethodValue] = useState('all');

  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== 'all' && v !== '');

  const handleClearAll = () => {
    setSearchValue('');
    setStatusValue('all');
    setTypeValue('all');
    setDataModeValue('all');
    setIngestionMethodValue('all');
    onClearAll?.();
  };

  return (
    <div className="space-y-3">
      {/* Primary Controls - Always Visible */}
      <div className="flex flex-col gap-3">
        {/* Search Bar */}
        <Input
          placeholder="Search evidence ID, dataset, source system..."
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            onSearch?.(e.target.value);
          }}
          className="border-2 border-slate-200/70 bg-white/60 backdrop-blur-sm placeholder:text-slate-400"
        />

        {/* Status & Type Dropdowns */}
        <div className="flex gap-3">
          <Select value={statusValue} onValueChange={(v) => {
            setStatusValue(v);
            onStatusChange?.(v);
          }}>
            <SelectTrigger className="flex-1 border-2 border-slate-200/70 bg-white/60 backdrop-blur-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ingested">Ingested</SelectItem>
              <SelectItem value="quarantined">Quarantined</SelectItem>
              <SelectItem value="sealed">Sealed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeValue} onValueChange={(v) => {
            setTypeValue(v);
            onTypeChange?.(v);
          }}>
            <SelectTrigger className="flex-1 border-2 border-slate-200/70 bg-white/60 backdrop-blur-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="supplier_master">Supplier Master</SelectItem>
              <SelectItem value="sku_data">SKU Data</SelectItem>
              <SelectItem value="bom">BOM</SelectItem>
              <SelectItem value="certificate">Certificate</SelectItem>
            </SelectContent>
          </Select>

          {/* More Filters Drawer */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="border-2 border-slate-200/70 bg-white/60 backdrop-blur-sm hover:bg-white/80 gap-2"
              >
                <Filter className="w-4 h-4" />
                More Filters
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[400px] bg-white/70 backdrop-blur-xl border-l border-slate-200/50">
              <SheetHeader>
                <SheetTitle className="text-slate-900 font-light">Advanced Filters</SheetTitle>
              </SheetHeader>

              <div className="space-y-4 mt-6">
                {/* Data Mode */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2">Data Mode</label>
                  <Select value={dataModeValue} onValueChange={(v) => {
                    setDataModeValue(v);
                    onDataModeChange?.(v);
                  }}>
                    <SelectTrigger className="border-2 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modes</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Ingestion Method */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-2">Ingestion Method</label>
                  <Select value={ingestionMethodValue} onValueChange={(v) => {
                    setIngestionMethodValue(v);
                  }}>
                    <SelectTrigger className="border-2 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="file_upload">File Upload</SelectItem>
                      <SelectItem value="erp_export">ERP Export</SelectItem>
                      <SelectItem value="erp_api">ERP API</SelectItem>
                      <SelectItem value="api_push">API Push</SelectItem>
                      <SelectItem value="manual_entry">Manual Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Button */}
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-700 hover:bg-red-50"
                  onClick={handleClearAll}
                >
                  Clear All Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters Display (Chips) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 p-2 bg-slate-50/60 backdrop-blur-sm rounded-lg border border-slate-200/40">
          {searchValue && (
            <Badge variant="secondary" className="bg-slate-200/80 gap-1 pr-1">
              Search: {searchValue}
              <button
                onClick={() => {
                  setSearchValue('');
                  onSearch?.('');
                }}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          
          {statusValue !== 'all' && (
            <Badge variant="secondary" className="bg-slate-200/80 gap-1 pr-1">
              Status: {statusValue}
              <button
                onClick={() => {
                  setStatusValue('all');
                  onStatusChange?.('all');
                }}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          
          {typeValue !== 'all' && (
            <Badge variant="secondary" className="bg-slate-200/80 gap-1 pr-1">
              Type: {typeValue}
              <button
                onClick={() => {
                  setTypeValue('all');
                  onTypeChange?.('all');
                }}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          
          {dataModeValue !== 'all' && (
            <Badge variant="secondary" className="bg-slate-200/80 gap-1 pr-1">
              Mode: {dataModeValue}
              <button
                onClick={() => {
                  setDataModeValue('all');
                  onDataModeChange?.('all');
                }}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-red-600 hover:bg-red-50"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
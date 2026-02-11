import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const countries = [
  "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Austria", 
  "Poland", "Czech Republic", "Sweden", "China", "India", "USA", "UK", 
  "Japan", "South Korea", "Taiwan", "Vietnam", "Thailand", "Indonesia"
];

export default function SupplierFilters({ filters, onFilterChange, onClearFilters }) {
  const hasActiveFilters = 
    filters.search || 
    filters.tier !== 'all' || 
    filters.riskLevel !== 'all' || 
    filters.country !== 'all' ||
    filters.status !== 'all';

  const activeFilterCount = [
    filters.search,
    filters.tier !== 'all',
    filters.riskLevel !== 'all',
    filters.country !== 'all',
    filters.status !== 'all'
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search suppliers..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9 h-9"
          />
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2 text-slate-500">
          <SlidersHorizontal className="w-4 h-4" />
        </div>

        {/* Tier Filter */}
        <Select
          value={filters.tier || 'all'}
          onValueChange={(value) => onFilterChange({ ...filters, tier: value })}
        >
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="tier_1">Tier 1</SelectItem>
            <SelectItem value="tier_2">Tier 2</SelectItem>
            <SelectItem value="tier_3">Tier 3</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>

        {/* Risk Level Filter */}
        <Select
          value={filters.riskLevel || 'all'}
          onValueChange={(value) => onFilterChange({ ...filters, riskLevel: value })}
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        {/* Country Filter */}
        <Select
          value={filters.country || 'all'}
          onValueChange={(value) => onFilterChange({ ...filters, country: value })}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFilterChange({ ...filters, status: value })}
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 text-slate-500 hover:text-slate-700"
          >
            <X className="w-4 h-4 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  );
}
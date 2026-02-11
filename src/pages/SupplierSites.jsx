import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Building2, Factory, Warehouse, Search, Plus, ExternalLink } from "lucide-react";
import SupplierSiteDetail from '@/components/mdm/SupplierSiteDetail';

export default function SupplierSites() {
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedSite, setSelectedSite] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ['supplier-sites'],
    queryFn: () => base44.entities.SupplierSite.list('-created_date')
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          site.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          site.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = countryFilter === 'all' || site.country === countryFilter;
    const matchesRole = roleFilter === 'all' || site.site_role === roleFilter;
    return matchesSearch && matchesCountry && matchesRole;
  });

  const uniqueCountries = [...new Set(sites.map(s => s.country).filter(Boolean))].sort();

  const getRoleIcon = (role) => {
    switch (role) {
      case 'manufacturing': return Factory;
      case 'distribution': return Warehouse;
      case 'office': return Building2;
      default: return MapPin;
    }
  };

  const stats = {
    total: sites.length,
    manufacturing: sites.filter(s => s.site_role === 'manufacturing').length,
    distribution: sites.filter(s => s.site_role === 'distribution').length,
    office: sites.filter(s => s.site_role === 'office').length,
    active: sites.filter(s => s.status === 'active').length
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Sites</h1>
          <p className="text-sm text-slate-500">Manage production facilities, warehouses, and offices</p>
        </div>
        <Button className="bg-[#86b027] hover:bg-[#6d8f20]">
          <Plus className="w-4 h-4 mr-2" />
          Add Site
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#86b027]/10">
                <MapPin className="w-5 h-5 text-[#86b027]" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Total Sites</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <Factory className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Manufacturing</p>
                <p className="text-2xl font-bold text-slate-900">{stats.manufacturing}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <Warehouse className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Distribution</p>
                <p className="text-2xl font-bold text-slate-900">{stats.distribution}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Offices</p>
                <p className="text-2xl font-bold text-slate-900">{stats.office}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Active</p>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by site name, city, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {uniqueCountries.map(country => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="manufacturing">Manufacturing</SelectItem>
            <SelectItem value="distribution">Distribution</SelectItem>
            <SelectItem value="office">Office</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredSites.map(site => {
          const supplier = suppliers.find(s => s.id === site.supplier_id);
          const RoleIcon = getRoleIcon(site.site_role);

          return (
            <Card key={site.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
              setSelectedSite(site);
              setShowDetailModal(true);
            }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-slate-100">
                      <RoleIcon className="w-6 h-6 text-slate-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{site.site_name}</h3>
                        <Badge variant="outline" className="capitalize">{site.site_role}</Badge>
                        <Badge className={site.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}>
                          {site.status}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{supplier?.legal_name || 'Unknown Supplier'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {[site.address_line1, site.city, site.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button size="sm" variant="ghost">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredSites.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No sites found</p>
          </div>
        )}
      </div>

      {selectedSite && (
        <SupplierSiteDetail
          site={selectedSite}
          supplier={suppliers.find(s => s.id === selectedSite.supplier_id)}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
        />
      )}
    </div>
  );
}
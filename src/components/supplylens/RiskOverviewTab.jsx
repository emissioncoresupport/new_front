import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Search, ShieldAlert, CheckCircle2, XCircle, AlertCircle, TrendingUp, Clock } from "lucide-react";
import RiskBadge from './RiskBadge';

export default function RiskOverviewTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: []
  });

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['risk-alerts'],
    queryFn: () => base44.entities.RiskAlert.list('-created_date'),
    initialData: []
  });

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.legal_name || 'Unknown';

  const filteredAlerts = alerts.filter(alert => {
    const supplierName = getSupplierName(alert.supplier_id).toLowerCase();
    const matchesSearch = supplierName.includes(searchQuery.toLowerCase()) ||
                         alert.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const metrics = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
    open: alerts.filter(a => a.status === 'open').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    highRiskSuppliers: suppliers.filter(s => s.risk_level === 'high' || s.risk_level === 'critical').length
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-rose-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'info': return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getAlertTypeLabel = (type) => {
    const labels = {
      location: 'Location Risk',
      sector: 'Sector Risk',
      human_rights: 'Human Rights',
      environmental: 'Environmental',
      chemical: 'Chemical',
      mineral: 'Mineral',
      performance: 'Performance',
      sanctions: 'Sanctions',
      compliance: 'Compliance'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-3">
      {/* Risk Metrics Scorecard - Glassmorphic Compact */}
      <div className="bg-white/85 backdrop-blur-xl rounded-lg border border-white/40 shadow-xl p-3 mb-3">
        <div className="grid grid-cols-4 divide-x divide-slate-300/60">
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-rose-500/25 to-rose-500/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-2xl font-semibold text-rose-600 mb-1">{metrics.critical}</p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Critical</p>
          </div>
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-amber-500/25 to-amber-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-semibold text-amber-600 mb-1">{metrics.warning}</p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Warning</p>
          </div>
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-slate-400/25 to-slate-400/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{metrics.open}</p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Open</p>
          </div>
          <div className="text-center py-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-green-500/25 to-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-semibold text-green-600 mb-1">{metrics.resolved}</p>
            <p className="text-[10px] text-slate-700 uppercase tracking-wider font-medium">Resolved</p>
          </div>
        </div>
      </div>

      {/* Risk Alerts Scorecard - Glassmorphic */}
      <div className="bg-white/85 backdrop-blur-xl rounded-lg border border-white/40 shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-slate-900">Risk Alerts</h2>
            <p className="text-sm text-slate-700 mt-0.5 font-medium">{metrics.highRiskSuppliers} high-risk suppliers</p>
          </div>
        </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 border-0 border-b border-slate-200 rounded-none focus:border-slate-900 bg-transparent"
              />
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-32 border-0 border-b border-slate-200 rounded-none">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 border-0 border-b border-slate-200 rounded-none">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading risk alerts...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#86b027]/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-[#86b027]" />
            </div>
            <p className="text-slate-600 font-light">No risk alerts</p>
            <p className="text-sm text-slate-400 mt-1">Your supply chain is secure</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className="py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-start justify-between"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    alert.severity === 'critical' ? 'bg-rose-50' :
                    alert.severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                  )}>
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{alert.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{getSupplierName(alert.supplier_id)}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{alert.description}</p>
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span className="capitalize">{getAlertTypeLabel(alert.alert_type)}</span>
                      <span>• {alert.status}</span>
                      {alert.source && <span>• {alert.source}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
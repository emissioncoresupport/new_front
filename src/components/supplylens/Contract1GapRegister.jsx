import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function Contract1GapRegister() {
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');

  const { data: gaps = [] } = useQuery({
    queryKey: ['gapItems'],
    queryFn: async () => {
      try {
        const items = await base44.asServiceRole.entities.GapItem.filter(
          { contract: 'CONTRACT_1' },
          '-created_date'
        );
        return items || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000
  });

  const filteredGaps = gaps.filter(gap => {
    if (riskFilter !== 'ALL' && gap.risk_level !== riskFilter) return false;
    if (statusFilter !== 'ALL' && gap.status !== statusFilter) return false;
    if (ownerFilter !== 'ALL' && gap.owner !== ownerFilter) return false;
    return true;
  });

  const riskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'bg-red-50 border-red-300';
      case 'IN_PROGRESS': return 'bg-blue-50 border-blue-300';
      case 'BLOCKED': return 'bg-orange-50 border-orange-300';
      case 'DONE': return 'bg-green-50 border-green-300';
      default: return 'bg-gray-50 border-gray-300';
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Area', 'Title', 'Risk', 'Status', 'Owner', 'Target Release'];
    const rows = filteredGaps.map(gap => [
      gap.id || '',
      gap.area || '',
      gap.title || '',
      gap.risk_level || '',
      gap.status || '',
      gap.owner || '',
      gap.target_release || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gap_register_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-600" />
            <p className="text-sm font-medium text-slate-700">Filter</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600 block mb-1">Risk Level</label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
              >
                <option value="ALL">All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
              >
                <option value="ALL">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Owner</label>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
              >
                <option value="ALL">All</option>
                <option value="BASE44">Base44</option>
                <option value="BACKEND_TEAM">Backend Team</option>
                <option value="DEVOPS">DevOps</option>
              </select>
            </div>
          </div>
          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Gap Items */}
      <div className="space-y-3">
        {filteredGaps.length === 0 ? (
          <Card className="bg-green-50 border-green-300">
            <CardContent className="p-4 text-center text-xs text-green-800">
              <p>✓ No gaps found matching filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredGaps.map(gap => (
            <Card key={gap.id} className={`border ${statusColor(gap.status)}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">{gap.title}</CardTitle>
                    <p className="text-xs text-slate-600 mt-1">{gap.area} • {gap.module}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    <Badge className={riskColor(gap.risk_level)}>{gap.risk_level}</Badge>
                    <Badge variant="outline">{gap.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div>
                  <p className="font-medium text-slate-700">Description</p>
                  <p className="text-slate-600">{gap.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <p className="font-medium text-slate-700">Current</p>
                    <p className="text-slate-600">{gap.current_behavior}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Required</p>
                    <p className="text-slate-600">{gap.required_behavior}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <p className="text-slate-600">Owner</p>
                    <p className="font-medium text-slate-700">{gap.owner}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Target</p>
                    <p className="font-medium text-slate-700">{gap.target_release || 'TBD'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Impact</p>
                    <p className="font-medium text-slate-700">{gap.impact?.join(', ') || 'N/A'}</p>
                  </div>
                </div>
                {gap.workaround_in_base44 && (
                  <div className="p-2 bg-blue-50 rounded text-xs text-blue-800 mt-2">
                    <p className="font-medium mb-1">⚠️ Workaround</p>
                    <p>{gap.workaround_in_base44}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
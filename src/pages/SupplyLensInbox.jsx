import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Database, Network, FileQuestion, CheckCircle2, Clock, Play, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SupplyLensInbox() {
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Mock work items - in production, fetch from backend
  const workItems = [
    {
      id: 'WI-001',
      type: 'REVIEW',
      status: 'OPEN',
      title: 'Review Supplier Master Upload - 450 records',
      description: 'Supplier master data needs validation before sealing',
      evidence_id: 'EV-2026-001',
      created_at: '2026-02-03T10:30:00Z',
      priority: 'HIGH'
    },
    {
      id: 'WI-002',
      type: 'EXTRACTION',
      status: 'IN_PROGRESS',
      title: 'Extract BOM data from PDF',
      description: 'AI extraction job in progress',
      evidence_id: 'EV-2026-002',
      created_at: '2026-02-03T09:15:00Z',
      priority: 'MEDIUM'
    },
    {
      id: 'WI-003',
      type: 'MAPPING',
      status: 'OPEN',
      title: 'Review 12 supplier-SKU mapping suggestions',
      description: 'AI confidence: 85% - requires human approval',
      evidence_id: 'EV-2026-003',
      created_at: '2026-02-02T16:20:00Z',
      priority: 'MEDIUM'
    },
    {
      id: 'WI-004',
      type: 'CONFLICT',
      status: 'BLOCKED',
      title: 'Resolve duplicate supplier entry',
      description: 'Supplier "Acme Corp" exists in both ERP and manual entry',
      evidence_id: 'EV-2026-001',
      created_at: '2026-02-01T14:00:00Z',
      priority: 'HIGH'
    },
    {
      id: 'WI-005',
      type: 'REVIEW',
      status: 'DONE',
      title: 'Review Product Master Data',
      description: 'Completed and sealed',
      evidence_id: 'EV-2026-004',
      created_at: '2026-02-01T11:00:00Z',
      priority: 'LOW'
    }
  ];

  const getTypeIcon = (type) => {
    const icons = {
      REVIEW: AlertCircle,
      EXTRACTION: Database,
      MAPPING: Network,
      CONFLICT: FileQuestion
    };
    return icons[type] || AlertCircle;
  };

  const getTypeColor = (type) => {
    const colors = {
      REVIEW: 'bg-blue-100 text-blue-800 border-blue-200',
      EXTRACTION: 'bg-purple-100 text-purple-800 border-purple-200',
      MAPPING: 'bg-green-100 text-green-800 border-green-200',
      CONFLICT: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[type] || 'bg-slate-100 text-slate-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      OPEN: Clock,
      IN_PROGRESS: Play,
      BLOCKED: Ban,
      DONE: CheckCircle2
    };
    return icons[status] || Clock;
  };

  const getStatusColor = (status) => {
    const colors = {
      OPEN: 'bg-orange-100 text-orange-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      BLOCKED: 'bg-red-100 text-red-800',
      DONE: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      HIGH: 'border-l-red-500',
      MEDIUM: 'border-l-yellow-500',
      LOW: 'border-l-slate-300'
    };
    return colors[priority] || 'border-l-slate-300';
  };

  const filteredItems = workItems.filter(item => {
    const typeMatch = typeFilter === 'ALL' || item.type === typeFilter;
    const statusMatch = statusFilter === 'ALL' || item.status === statusFilter;
    return typeMatch && statusMatch;
  });

  const stats = {
    total: workItems.length,
    open: workItems.filter(i => i.status === 'OPEN').length,
    inProgress: workItems.filter(i => i.status === 'IN_PROGRESS').length,
    blocked: workItems.filter(i => i.status === 'BLOCKED').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-slate-900 tracking-tight mb-2">Inbox</h1>
        <p className="text-slate-600">Work items requiring your attention</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 mb-1">Total Items</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-orange-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-4">
            <div className="text-xs text-orange-600 mb-1">Open</div>
            <div className="text-2xl font-bold text-orange-800">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-4">
            <div className="text-xs text-blue-600 mb-1">In Progress</div>
            <div className="text-2xl font-bold text-blue-800">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-red-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-4">
            <div className="text-xs text-red-600 mb-1">Blocked</div>
            <div className="text-2xl font-bold text-red-800">{stats.blocked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 font-medium">Type:</span>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="EXTRACTION">Extraction</SelectItem>
                  <SelectItem value="MAPPING">Mapping</SelectItem>
                  <SelectItem value="CONFLICT">Conflict</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 font-medium">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Items */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const TypeIcon = getTypeIcon(item.type);
          const StatusIcon = getStatusIcon(item.status);

          return (
            <Card key={item.id} className={cn("border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-l-4", getPriorityColor(item.priority))}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getTypeColor(item.type)} variant="outline">
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {item.type}
                      </Badge>
                      <Badge className={getStatusColor(item.status)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {item.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-slate-500 font-mono">{item.id}</span>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-600 mb-3">{item.description}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <Link to={createPageUrl(`EvidenceRecordDetail?id=${item.evidence_id}`)} className="text-[#86b027] hover:underline font-medium">
                        View Evidence: {item.evidence_id}
                      </Link>
                      <span>•</span>
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <Button className="bg-[#86b027] hover:bg-[#86b027]/90 text-white">
                    Take Action
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredItems.length === 0 && (
          <Card className="border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No work items found</h3>
              <p className="text-slate-600">Try adjusting your filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
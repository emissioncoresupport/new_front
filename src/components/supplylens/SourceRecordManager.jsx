import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Search, FileText, CheckCircle, XCircle, Clock, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SourceRecordManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: sourceRecords = [], isLoading } = useQuery({
    queryKey: ['source-records'],
    queryFn: async () => {
      return await base44.entities.SourceRecord.list('-created_date', 100);
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['material-skus'],
    queryFn: () => base44.entities.MaterialSKU.list()
  });

  const processRecordMutation = useMutation({
    mutationFn: async ({ sourceRecordId, action, mergeWithId }) => {
      return await base44.functions.invoke('processSourceRecord', { 
        sourceRecordId, 
        action,
        mergeWithId
      });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries(['source-records', 'suppliers', 'material-skus']);
      
      if (variables.action === 'approve') {
        toast.success('Approved - canonical entity created');
      } else if (variables.action === 'reject') {
        toast.success('Rejected');
      } else if (variables.action === 'merge') {
        toast.success('Merged with existing entity');
      }
    },
    onError: (error) => {
      toast.error('Failed: ' + error.message);
    }
  });

  const filteredRecords = sourceRecords.filter(record => {
    const matchesSearch = !searchTerm || 
      record.source_data?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.source_system?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusConfig = {
    pending_review: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending Review' },
    processing: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Processing' },
    canonical: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Canonical' },
    merged: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle, label: 'Merged' },
    rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold">Source Records</h2>
          <Badge variant="outline">{filteredRecords.length}</Badge>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or system..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="canonical">Canonical</SelectItem>
            <SelectItem value="merged">Merged</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source System</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Name/Identifier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Imported</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Loading source records...
                </TableCell>
              </TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No source records found
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record) => {
                const StatusIcon = statusConfig[record.status]?.icon || Clock;
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{record.source_system}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.entity_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate">
                        {record.source_data?.legal_name || record.source_data?.name || record.external_id || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(statusConfig[record.status]?.color)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[record.status]?.label || record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.confidence_score ? (
                        <span className={cn(
                          "font-medium",
                          record.confidence_score >= 80 ? "text-green-600" :
                          record.confidence_score >= 60 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {record.confidence_score}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(record.created_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {record.status === 'pending_review' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => processRecordMutation.mutate({ 
                                sourceRecordId: record.id, 
                                action: 'approve' 
                              })}
                              disabled={processRecordMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 h-7 px-2"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            {record.entity_type === 'supplier' && suppliers.length > 0 && (
                              <Select 
                                onValueChange={(targetId) => {
                                  if (targetId === 'new') {
                                    processRecordMutation.mutate({ sourceRecordId: record.id, action: 'approve' });
                                  } else {
                                    processRecordMutation.mutate({ 
                                      sourceRecordId: record.id, 
                                      action: 'merge',
                                      mergeWithId: targetId
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 w-24">
                                  <SelectValue placeholder="Merge" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">Create New</SelectItem>
                                  {suppliers.slice(0, 10).map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.legal_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {record.entity_type === 'material' && materials.length > 0 && (
                              <Select 
                                onValueChange={(targetId) => {
                                  if (targetId === 'new') {
                                    processRecordMutation.mutate({ sourceRecordId: record.id, action: 'approve' });
                                  } else {
                                    processRecordMutation.mutate({ 
                                      sourceRecordId: record.id, 
                                      action: 'merge',
                                      mergeWithId: targetId
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 w-24">
                                  <SelectValue placeholder="Merge" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">Create New</SelectItem>
                                  {materials.slice(0, 10).map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.material_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => processRecordMutation.mutate({ 
                                sourceRecordId: record.id, 
                                action: 'reject' 
                              })}
                              disabled={processRecordMutation.isPending}
                              className="h-7 px-2"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
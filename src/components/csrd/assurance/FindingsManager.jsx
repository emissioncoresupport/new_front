import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, FileText, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import FindingModal from './FindingModal';

export default function FindingsManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingFinding, setEditingFinding] = useState(null);
  const queryClient = useQueryClient();

  const { data: findings = [] } = useQuery({
    queryKey: ['csrd-assurance-findings'],
    queryFn: () => base44.entities.CSRDAssuranceFinding.list('-created_date')
  });

  const filteredFindings = findings.filter(f => {
    const matchesSearch = f.finding_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         f.finding_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         f.esrs_standard?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || f.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || f.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'Critical': return 'bg-rose-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Open': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'In Progress': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Resolved': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default: return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">Assurance Findings</h2>
          <p className="text-sm text-slate-600 mt-1">Track and manage audit findings and remediation</p>
        </div>
        <Button onClick={() => { setEditingFinding(null); setShowModal(true); }} className="bg-[#86b027] hover:bg-[#769c22]">
          <Plus className="w-4 h-4 mr-2" />
          Add Finding
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search findings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Accepted Risk">Accepted Risk</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No findings match your filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredFindings.map(finding => (
            <Card key={finding.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(finding.status)}
                      <h3 className="font-bold text-[#545454]">{finding.finding_reference || 'Untitled Finding'}</h3>
                      <Badge className={getSeverityColor(finding.severity)}>{finding.severity}</Badge>
                      <Badge variant="outline">{finding.finding_type}</Badge>
                      {finding.esrs_standard && (
                        <Badge className="bg-[#02a1e8]">{finding.esrs_standard}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mb-3">{finding.finding_description}</p>
                    {finding.recommended_action && (
                      <div className="bg-blue-50 border-l-4 border-[#02a1e8] p-3 mb-3">
                        <p className="text-xs font-semibold text-[#02a1e8] mb-1">Recommended Action:</p>
                        <p className="text-sm text-slate-700">{finding.recommended_action}</p>
                      </div>
                    )}
                    {finding.management_response && (
                      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">Management Response:</p>
                        <p className="text-sm text-slate-700">{finding.management_response}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingFinding(finding); setShowModal(true); }}>
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Auditor</p>
                    <p className="font-medium">{finding.auditor_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Status</p>
                    <Badge variant="outline">{finding.status}</Badge>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Due Date</p>
                    <p className="font-medium">{finding.remediation_due_date ? new Date(finding.remediation_due_date).toLocaleDateString() : 'Not set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <FindingModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditingFinding(null);
        }}
        finding={editingFinding}
      />
    </div>
  );
}
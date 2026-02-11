import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  History, CheckCircle2, AlertCircle, Clock, Download, 
  Search, Filter, Calendar, Eye, FileText
} from "lucide-react";
import moment from 'moment';

export default function CBAMSupplierHistory({ supplier, companyId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['supplier-submissions', supplier?.id, companyId],
    queryFn: async () => {
      const all = await base44.entities.SupplierCBAMSubmission.list('-submission_date');
      return all.filter(s => 
        s.supplier_id === supplier?.id && 
        (!companyId || s.company_id === companyId)
      );
    },
    enabled: !!supplier
  });

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sub.cn_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.verification_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const configs = {
      'verified': { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Verified' },
      'pending': { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending Review' },
      'needs_clarification': { color: 'bg-blue-100 text-blue-700', icon: AlertCircle, label: 'Needs Clarification' },
      'rejected': { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Rejected' }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getComplianceBadge = (status) => {
    const configs = {
      'compliant': { color: 'bg-green-100 text-green-700', label: 'Compliant' },
      'non_compliant': { color: 'bg-red-100 text-red-700', label: 'Non-Compliant' },
      'under_review': { color: 'bg-slate-100 text-slate-700', label: 'Under Review' }
    };
    const config = configs[status] || configs.under_review;
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-400 animate-spin" />
          <p className="text-slate-600">Loading submission history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#02a1e8]/10">
                <History className="w-5 h-5 text-[#02a1e8]" />
              </div>
              Submission History
            </CardTitle>
            <Badge variant="outline" className="font-mono">
              {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by product name or CN code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="needs_clarification">Needs Clarification</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Submissions Found</h3>
              <p className="text-slate-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Start by submitting your first emission data'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <Card key={submission.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">
                          {submission.product_name}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {moment(submission.submission_date).format('MMM D, YYYY')}
                          </span>
                          {submission.cn_code && (
                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                              CN: {submission.cn_code}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(submission.verification_status)}
                        {getComplianceBadge(submission.compliance_status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Direct Emissions</p>
                        <p className="font-semibold text-slate-900">
                          {submission.direct_emissions?.toFixed(2)} tCO₂e/t
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Indirect Emissions</p>
                        <p className="font-semibold text-slate-900">
                          {(submission.indirect_emissions || 0).toFixed(2)} tCO₂e/t
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Total Embedded</p>
                        <p className="font-bold text-emerald-700">
                          {submission.total_emissions?.toFixed(2)} tCO₂e/t
                        </p>
                      </div>
                    </div>

                    {submission.reviewer_notes && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Reviewer Notes:</p>
                        <p className="text-sm text-blue-800">{submission.reviewer_notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Method: {submission.calculation_method}</span>
                        {submission.data_quality_score && (
                          <>
                            <span>•</span>
                            <span>Quality Score: {submission.data_quality_score}/100</span>
                          </>
                        )}
                      </div>
                      {submission.supporting_documents?.length > 0 && (
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Documents ({submission.supporting_documents.length})
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-6">
          <h4 className="font-semibold text-slate-900 mb-4">Compliance Summary</h4>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-700">
                {submissions.filter(s => s.verification_status === 'verified').length}
              </p>
              <p className="text-xs text-slate-600 mt-1">Verified</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-700">
                {submissions.filter(s => s.verification_status === 'pending').length}
              </p>
              <p className="text-xs text-slate-600 mt-1">Pending</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">
                {submissions.filter(s => s.verification_status === 'needs_clarification').length}
              </p>
              <p className="text-xs text-slate-600 mt-1">Needs Action</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-700">
                {submissions.length > 0 
                  ? Math.round((submissions.filter(s => s.compliance_status === 'compliant').length / submissions.length) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-slate-600 mt-1">Compliance Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
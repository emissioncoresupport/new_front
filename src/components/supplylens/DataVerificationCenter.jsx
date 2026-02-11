import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, XCircle, FileText, AlertCircle, Eye, 
  ExternalLink, Search, Filter, Clock, ShieldCheck 
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";

export default function DataVerificationCenter({ suppliers }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [verificationNote, setVerificationNote] = useState("");
  const queryClient = useQueryClient();

  // Fetch data requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['data-requests'],
    queryFn: () => base44.entities.DataRequest.list('-created_date')
  });

  // Fetch SKUs for context
  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, reason }) => {
      const updateData = {
        status: status,
        verified_at: new Date().toISOString(),
        verified_by: 'Current User', // In real app, get from auth context
      };
      if (reason) updateData.rejection_reason = reason;
      
      return await base44.entities.DataRequest.update(id, updateData);
    },
    onSuccess: () => {
      toast.success(verificationNote ? "Request Rejected" : "Data Verified Successfully");
      setSelectedRequest(null);
      setVerificationNote("");
      queryClient.invalidateQueries({ queryKey: ['data-requests'] });
    }
  });

  const filteredRequests = requests.filter(r => 
    filterStatus === 'all' ? true : r.status === filterStatus
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified': return <Badge className="bg-[#86b027] hover:bg-[#769c22]">Verified</Badge>;
      case 'submitted': return <Badge className="bg-[#02a1e8] hover:bg-[#0280ba]">Review Needed</Badge>;
      case 'rejected': return <Badge className="bg-rose-500 hover:bg-rose-600">Rejected</Badge>;
      case 'requested': return <Badge variant="outline" className="text-slate-500 border-slate-300">Pending Supplier</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.legal_name || 'Unknown Supplier';
  const getSKUCode = (id) => skus.find(s => s.id === id)?.sku_code || 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Data Verification Center</h2>
          <p className="text-slate-500">Review and verify supplier submitted evidence for DPP compliance.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Needs Review</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="requested">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <Card className="border-slate-100 shadow-sm rounded-2xl group hover:shadow-md transition-all">
          <CardContent className="pt-6 flex items-center gap-5">
            <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 group-hover:bg-amber-400 group-hover:text-white transition-colors">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-[#545454]/70 font-bold uppercase tracking-wider">Pending Review</p>
              <h3 className="text-3xl font-extrabold text-[#545454]">
                {requests.filter(r => r.status === 'submitted').length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm rounded-2xl group hover:shadow-md transition-all">
          <CardContent className="pt-6 flex items-center gap-5">
            <div className="p-4 bg-[#86b027]/10 rounded-2xl text-[#86b027] group-hover:bg-[#86b027] group-hover:text-white transition-colors">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-[#545454]/70 font-bold uppercase tracking-wider">Verified Today</p>
              <h3 className="text-3xl font-extrabold text-[#545454]">
                {requests.filter(r => r.status === 'verified' && new Date(r.verified_at).toDateString() === new Date().toDateString()).length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm rounded-2xl group hover:shadow-md transition-all">
          <CardContent className="pt-6 flex items-center gap-5">
            <div className="p-4 bg-rose-50 rounded-2xl text-rose-500 group-hover:bg-rose-400 group-hover:text-white transition-colors">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs text-[#545454]/70 font-bold uppercase tracking-wider">Rejected/Issues</p>
              <h3 className="text-3xl font-extrabold text-[#545454]">
                {requests.filter(r => r.status === 'rejected').length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold text-[#545454]">Request Title</TableHead>
              <TableHead className="font-bold text-[#545454]">Supplier</TableHead>
              <TableHead className="font-bold text-[#545454]">Related SKU</TableHead>
              <TableHead className="font-bold text-[#545454]">Type</TableHead>
              <TableHead className="font-bold text-[#545454]">Submission Date</TableHead>
              <TableHead className="font-bold text-[#545454]">Status</TableHead>
              <TableHead className="text-right font-bold text-[#545454]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No requests found matching current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map(req => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.title}</TableCell>
                  <TableCell>{getSupplierName(req.supplier_id)}</TableCell>
                  <TableCell>
                    {req.sku_id ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {getSKUCode(req.sku_id)}
                      </Badge>
                    ) : <span className="text-slate-400">-</span>}
                  </TableCell>
                  <TableCell className="capitalize text-slate-600">{req.request_type.replace('_', ' ')}</TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {req.updated_date ? format(new Date(req.updated_date), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={selectedRequest?.id === req.id} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant={req.status === 'submitted' ? "default" : "ghost"} 
                          size="sm"
                          className={req.status === 'submitted' ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                          onClick={() => setSelectedRequest(req)}
                        >
                          {req.status === 'submitted' ? 'Review' : 'Details'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Verify Data Submission</DialogTitle>
                        </DialogHeader>
                        
                        <div className="grid grid-cols-2 gap-6 py-4">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-slate-500 mb-1">Request Details</h4>
                              <p className="font-semibold">{selectedRequest?.title}</p>
                              <p className="text-sm text-slate-600 mt-1">{selectedRequest?.description}</p>
                            </div>
                            
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Metadata</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-slate-500">Supplier:</span>
                                <span>{getSupplierName(selectedRequest?.supplier_id)}</span>
                                <span className="text-slate-500">Type:</span>
                                <span className="capitalize">{selectedRequest?.request_type?.replace('_', ' ')}</span>
                                <span className="text-slate-500">Due Date:</span>
                                <span>{selectedRequest?.due_date || 'None'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-slate-500 mb-1">Submitted Evidence</h4>
                              {selectedRequest?.evidence_file_url ? (
                                <div className="p-4 border border-slate-200 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                                     onClick={() => window.open(selectedRequest.evidence_file_url, '_blank')}>
                                  <FileText className="w-8 h-8 text-indigo-500" />
                                  <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">Evidence Document</p>
                                    <p className="text-xs text-indigo-600 flex items-center gap-1">
                                      View File <ExternalLink className="w-3 h-3" />
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-sm">
                                  No file uploaded
                                </div>
                              )}
                            </div>

                            {selectedRequest?.response_value && (
                              <div>
                                <h4 className="text-sm font-medium text-slate-500 mb-1">Submitted Value</h4>
                                <div className="p-3 bg-slate-100 rounded-md font-mono text-sm">
                                  {selectedRequest.response_value}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedRequest?.status === 'rejected' && (
                          <div className="bg-rose-50 border border-rose-100 p-3 rounded-md mb-4">
                             <p className="text-sm text-rose-800 font-medium">Rejection Reason:</p>
                             <p className="text-sm text-rose-600">{selectedRequest.rejection_reason}</p>
                          </div>
                        )}

                        <DialogFooter className="flex justify-between sm:justify-between gap-2">
                           {selectedRequest?.status === 'submitted' ? (
                             <>
                               <div className="flex-1 mr-2">
                                  <Input 
                                    placeholder="Reason for rejection (required if rejecting)" 
                                    value={verificationNote}
                                    onChange={(e) => setVerificationNote(e.target.value)}
                                    className="w-full"
                                  />
                               </div>
                               <div className="flex gap-2">
                                 <Button 
                                   variant="destructive"
                                   disabled={!verificationNote}
                                   onClick={() => verifyMutation.mutate({ 
                                     id: selectedRequest.id, 
                                     status: 'rejected',
                                     reason: verificationNote
                                   })}
                                 >
                                   <XCircle className="w-4 h-4 mr-2" />
                                   Reject
                                 </Button>
                                 <Button 
                                   className="bg-emerald-600 hover:bg-emerald-700"
                                   onClick={() => verifyMutation.mutate({ 
                                     id: selectedRequest.id, 
                                     status: 'verified' 
                                   })}
                                 >
                                   <CheckCircle2 className="w-4 h-4 mr-2" />
                                   Verify Data
                                 </Button>
                               </div>
                             </>
                           ) : (
                             <Button variant="outline" onClick={() => setSelectedRequest(null)} className="ml-auto">
                               Close
                             </Button>
                           )}
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
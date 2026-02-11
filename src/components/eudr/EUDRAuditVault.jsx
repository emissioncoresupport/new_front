import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, FileDown, ShieldCheck, Lock, History, FileCode, X, ArrowRight, Network } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TransactionTraceabilityFlow from "./TransactionTraceabilityFlow";

export default function EUDRAuditVault() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showHighRisk, setShowHighRisk] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data: ddsRecords = [] } = useQuery({
      queryKey: ['eudr-dds-audit'],
      queryFn: () => base44.entities.EUDRDDS.list()
  });

  const filteredData = ddsRecords.filter((row) => {
    const matchesSearch =
      row.dds_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.po_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = showHighRisk ? row.risk_level === "High" : true;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[2.5rem] border border-[#86b027]/20 shadow-[0_8px_32px_0_rgba(134,176,39,0.1)]">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#86b027]/10 text-[#86b027]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#545454]">Audit & Evidence Vault</h1>
        </div>
        <p className="text-sm text-slate-600 max-w-3xl pl-12">
          All Due Diligence Statements (DDS) are locked, immutable, and retained for 5 years under
          Regulation (EU) 2023/1115, Article 25. Records can be provided at any time to competent
          authorities upon request.
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 items-center border rounded-md px-3 py-2 bg-white shadow-sm flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search DDS ID, PO Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 focus-visible:ring-0 h-auto p-0 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-md border shadow-sm">
          <Checkbox
            id="highRisk"
            checked={showHighRisk}
            onCheckedChange={(checked) => setShowHighRisk(!!checked)}
          />
          <label htmlFor="highRisk" className="text-sm cursor-pointer">Show only High Risk</label>
        </div>

        <Button variant="secondary" className="ml-auto">
            <History className="w-4 h-4 mr-2" /> Access Logs
        </Button>
        <Button variant="outline">Export Report</Button>
      </div>

      {/* Traceability Info Banner */}
      <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Network className="w-5 h-5" />
              </div>
              <div>
                  <h3 className="font-bold text-indigo-900">Full Traceability Available</h3>
                  <p className="text-xs text-indigo-700">Click the "Eye" icon on any record to visualize the complete journey from plot to TRACES NT.</p>
              </div>
          </div>
          <Button variant="ghost" className="text-indigo-700 hover:bg-indigo-100" size="sm">
              Learn more
          </Button>
      </div>

      <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>DDS ID</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Commodity</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>Digital Seal</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredData.map((row) => (
                    <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs font-medium">{row.dds_reference}</TableCell>
                    <TableCell>{row.po_number}</TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{row.commodity_description}</span>
                            <span className="text-[10px] text-slate-500">{row.hs_code}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" className={
                            row.risk_level === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                            row.risk_level === 'Low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            'bg-slate-50'
                        }>
                            {row.risk_level}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        {row.risk_score ? (
                            <span className={`font-bold text-xs ${row.risk_score > 50 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {row.risk_score}/100
                            </span>
                        ) : <span className="text-slate-400">-</span>}
                    </TableCell>
                    <TableCell>
                        <span className={`text-sm font-medium ${row.risk_decision === 'Negligible' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {row.risk_decision}
                        </span>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                            {row.status === 'Locked' && <Lock className="w-3 h-3" />}
                            {row.status}
                        </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                        {row.submission_date ? new Date(row.submission_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-slate-400 max-w-[100px] truncate">
                        {row.digital_seal || 'UNSIGNED'}
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedRecord(row)}>
                                <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                                <FileDown className="w-4 h-4" />
                            </Button>
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                {filteredData.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                            No records found in the vault.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      {/* Audit Record Detail Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                      Transaction Traceability & Audit
                  </DialogTitle>
              </DialogHeader>

              {selectedRecord && (
                  <div className="space-y-8 py-4">
                      {/* Traceability Visualizer */}
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-4 text-sm font-bold text-[#545454]">
                              <Network className="w-4 h-4 text-indigo-600" /> Supply Chain Journey
                          </div>
                          <TransactionTraceabilityFlow ddsRecord={selectedRecord} />
                      </div>

                      {/* Standard Details */}
                      <div>
                          <h4 className="text-sm font-bold text-slate-700 mb-3 border-b pb-2">Record Metadata</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div className="space-y-1">
                                  <span className="text-slate-500 text-xs uppercase tracking-wider">Reference ID</span>
                                  <p className="font-mono font-medium text-slate-900">{selectedRecord.dds_reference}</p>
                              </div>
                              <div className="space-y-1">
                                  <span className="text-slate-500 text-xs uppercase tracking-wider">Status</span>
                                  <Badge className={selectedRecord.status === 'Locked' ? "bg-emerald-600" : "bg-slate-500"}>
                                      {selectedRecord.status}
                                  </Badge>
                              </div>
                              <div className="space-y-1">
                                  <span className="text-slate-500 text-xs uppercase tracking-wider">Commodity</span>
                                  <p>{selectedRecord.commodity_description}</p>
                              </div>
                              <div className="space-y-1">
                                  <span className="text-slate-500 text-xs uppercase tracking-wider">Quantity</span>
                                  <p>{selectedRecord.quantity} {selectedRecord.unit}</p>
                              </div>
                              <div className="space-y-1">
                                  <span className="text-slate-500 text-xs uppercase tracking-wider">Risk Decision</span>
                                  <p className="font-medium">{selectedRecord.risk_decision}</p>
                              </div>
                              <div className="space-y-1">
                                  <span className="text-slate-500 text-xs uppercase tracking-wider">Digital Seal</span>
                                  <p className="font-mono text-xs truncate text-slate-400" title={selectedRecord.digital_seal}>
                                      {selectedRecord.digital_seal || "N/A"}
                                  </p>
                              </div>
                          </div>
                      </div>

                      {/* Technical Details Collapsible */}
                      <div className="space-y-4">
                          {(selectedRecord.risk_analysis_details || selectedRecord.mitigation_suggestions) && (
                          <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100">
                              <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                                  <ShieldCheck className="w-4 h-4 text-amber-600" /> Risk Analysis
                              </h4>
                              {selectedRecord.risk_analysis_details && (
                                  <p className="text-xs text-slate-600 mb-3 italic">"{selectedRecord.risk_analysis_details}"</p>
                              )}
                              {selectedRecord.mitigation_suggestions && (
                                  <div>
                                      <p className="text-xs font-semibold text-slate-700 mb-1">Mitigations:</p>
                                      <p className="text-xs text-slate-600">{selectedRecord.mitigation_suggestions}</p>
                                  </div>
                              )}
                          </div>
                          )}

                          {selectedRecord.xml_payload ? (
                          <div className="bg-slate-900 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2 text-slate-400 text-xs">
                                  <span className="flex items-center gap-1"><FileCode className="w-3 h-3" /> TRACES XML Payload</span>
                                  <span>{selectedRecord.xml_payload.length} bytes</span>
                              </div>
                              <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-[150px]">
                                  {selectedRecord.xml_payload}
                              </pre>
                          </div>
                          ) : (
                            <div className="p-4 bg-slate-50 text-slate-500 text-center text-sm italic rounded-lg border border-dashed border-slate-200">
                                No XML payload captured for this record.
                            </div>
                          )}
                      </div>

                      <div className="flex justify-end pt-4 border-t">
                          <Button variant="outline" onClick={() => setSelectedRecord(null)}>Close</Button>
                      </div>
                  </div>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Send, Clock, AlertTriangle, Plus } from "lucide-react";
import CBAMUnifiedReportWorkflow from '../reporting/CBAMUnifiedReportWorkflow';

export default function RepReports({ clients }) {
  const [showNewReportWizard, setShowNewReportWizard] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg text-slate-800">Quarterly Report Submissions</h3>
        <Button 
          onClick={() => setShowNewReportWizard(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white h-9"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Declaration
        </Button>
      </div>
      
      {showNewReportWizard && (
        <CBAMUnifiedReportWorkflow 
          period="Q1-2026"
          entries={[]}
          onComplete={() => setShowNewReportWizard(false)}
        />
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Declarant</TableHead>
                <TableHead>Reporting Period</TableHead>
                <TableHead>Completeness</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Submit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(client => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>Q2 2025</TableCell>
                  <TableCell>
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-[#86b027]" style={{width: `${client.readiness_score}%`}} />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{client.readiness_score}% Complete</div>
                  </TableCell>
                  <TableCell>
                    {client.readiness_score >= 90 ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Ready</Badge>
                    ) : (
                       <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">In Progress</Badge>
                    )}
                  </TableCell>
                  <TableCell>30 Sep</TableCell>
                  <TableCell className="text-right">
                     {client.readiness_score >= 90 ? (
                       <Button size="sm" className="bg-[#0f172a] text-white hover:bg-[#1e293b]">
                         <Send className="w-3.5 h-3.5 mr-2" /> Submit
                       </Button>
                     ) : (
                       <Button size="sm" variant="ghost" disabled className="text-slate-400">
                         <Clock className="w-3.5 h-3.5 mr-2" /> Waiting
                       </Button>
                     )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
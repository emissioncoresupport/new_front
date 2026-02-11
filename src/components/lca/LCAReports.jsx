import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function LCAReports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#545454]">LCA Reports</h2>
        <p className="text-slate-500 text-sm">Generate ISO-compliant reports</p>
      </div>

      <Card className="border-slate-200">
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 mb-2">Report generation coming soon</p>
          <p className="text-xs text-slate-400">Export studies as ISO 14040/14044 compliant reports</p>
        </CardContent>
      </Card>
    </div>
  );
}
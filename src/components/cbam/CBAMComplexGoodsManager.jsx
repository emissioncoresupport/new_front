import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, GitBranch, Database } from "lucide-react";
import CBAMPrecursorManager from './CBAMPrecursorManager';
import CBAMPrecursorMapper from './CBAMPrecursorMapper';
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Complex Goods Management
 * Handles precursor materials per C(2025) 8151 Art. 13-15
 * Compliant with embedded emissions reporting requirements
 */
export default function CBAMComplexGoodsManager() {
  return (
    <div className="space-y-5">
      {/* Regulatory Context */}
      <Alert className="border-blue-200/60 bg-blue-50/50">
        <FileText className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-slate-700">
          <strong>Regulatory Basis:</strong> Commission Implementing Regulation (EU) C(2025) 8151 Articles 13-15 requires 
          reporting of embedded emissions from precursor materials in complex goods. Default values available per C(2025) 8552 Table 6.
        </AlertDescription>
      </Alert>

      {/* Tabs for Precursor Management */}
      <Tabs defaultValue="database" className="space-y-5">
        <TabsList className="bg-slate-50 border border-slate-200 rounded-lg p-1">
          <TabsTrigger value="database" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Database className="w-3.5 h-3.5 mr-2" />
            Precursor Database
          </TabsTrigger>
          <TabsTrigger value="mappings" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <GitBranch className="w-3.5 h-3.5 mr-2" />
            Product Mappings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database">
          <CBAMPrecursorManager />
        </TabsContent>

        <TabsContent value="mappings">
          <CBAMPrecursorMapper />
        </TabsContent>
      </Tabs>

      {/* Quick Reference */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-900 mb-2">Key Regulations</h4>
        <div className="space-y-1 text-xs text-slate-600">
          <p>• <strong>Art. 13:</strong> Precursor emissions must be reported for complex goods</p>
          <p>• <strong>Art. 14:</strong> Operator must identify all relevant precursors</p>
          <p>• <strong>Art. 15:</strong> Combined methodology allowed (actual + default)</p>
          <p>• <strong>Table 6 (C(2025) 8552):</strong> Default values for common precursors</p>
        </div>
      </div>
    </div>
  );
}
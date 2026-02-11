import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Sparkles, CheckCircle } from "lucide-react";
import CBAMDataCompletenessChecker from './CBAMDataCompletenessChecker';
import CBAMDataHarmonizer from './CBAMDataHarmonizer';
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Quality Control Center
 * Consolidated data validation, harmonization, and completeness checking
 * Ensures compliance with Art. 7 data quality requirements
 */
export default function CBAMQualityControl({ entries = [] }) {
  return (
    <div className="space-y-5">
      {/* Quality Standards */}
      <Alert className="border-emerald-200/60 bg-emerald-50/50">
        <Shield className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-xs text-slate-700">
          <strong>Data Quality Standards:</strong> All entries must meet C(2025) 8151 Art. 7 requirements for accuracy, 
          completeness, and consistency. Deviation from EU benchmarks &gt;5% requires documentation.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="validator" className="space-y-5">
        <TabsList className="bg-slate-50 border border-slate-200 rounded-lg p-1">
          <TabsTrigger value="validator" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CheckCircle className="w-3.5 h-3.5 mr-2" />
            Completeness Checker
          </TabsTrigger>
          <TabsTrigger value="harmonizer" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            AI Harmonization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="validator">
          <CBAMDataCompletenessChecker entries={entries} />
        </TabsContent>

        <TabsContent value="harmonizer">
          <CBAMDataHarmonizer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
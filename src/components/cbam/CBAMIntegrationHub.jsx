import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link as LinkIcon, Truck, TrendingUp } from "lucide-react";
import CBAMSupplyLensConnector from './CBAMSupplyLensConnector';
import CustomsDataImporter from './integration/CustomsDataImporter';
import ETSMarketConnector from './integration/ETSMarketConnector';
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Integration Hub
 * Connects CBAM module with external systems:
 * - SupplyLens (supplier data synchronization)
 * - Customs systems (automatic MRN import)
 * - ETS Market (live pricing feeds)
 */
export default function CBAMIntegrationHub() {
  return (
    <div className="space-y-5">
      {/* Integration Overview */}
      <Alert className="border-blue-200/60 bg-blue-50/50">
        <LinkIcon className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-slate-700">
          <strong>Automated Data Flows:</strong> Connect external systems to automatically populate CBAM entries, 
          synchronize supplier emissions data, and maintain real-time compliance.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="supplylens" className="space-y-5">
        <TabsList className="bg-slate-50 border border-slate-200 rounded-lg p-1">
          <TabsTrigger value="supplylens" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <LinkIcon className="w-3.5 h-3.5 mr-2" />
            SupplyLens Sync
          </TabsTrigger>
          <TabsTrigger value="customs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Truck className="w-3.5 h-3.5 mr-2" />
            Customs Data
          </TabsTrigger>
          <TabsTrigger value="ets" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TrendingUp className="w-3.5 h-3.5 mr-2" />
            ETS Market Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supplylens">
          <CBAMSupplyLensConnector />
        </TabsContent>

        <TabsContent value="customs">
          <CustomsDataImporter />
        </TabsContent>

        <TabsContent value="ets">
          <ETSMarketConnector />
        </TabsContent>
      </Tabs>
    </div>
  );
}
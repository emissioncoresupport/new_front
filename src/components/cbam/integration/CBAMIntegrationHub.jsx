import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, Database, Link as LinkIcon, Truck, TrendingUp, 
  Shield, FileText, CheckCircle2, XCircle
} from "lucide-react";
import RegistryCredentialsConfig from './RegistryCredentialsConfig';
import CustomsDataImporter from './CustomsDataImporter';
import ETSMarketConnector from './ETSMarketConnector';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * CBAM Integration Hub
 * Central dashboard for all external integrations
 */

export default function CBAMIntegrationHub() {
  const { data: registryConfigs = [] } = useQuery({
    queryKey: ['cbam-registry-configs'],
    queryFn: () => base44.entities.CBAMClient.list()
  });
  
  const activeRegistry = registryConfigs.find(c => c.status === 'active');
  
  const integrations = [
    {
      name: 'National CBAM Registry',
      status: activeRegistry ? 'connected' : 'not_configured',
      type: 'registry',
      provider: activeRegistry?.member_state || 'None',
      icon: Globe,
      color: 'blue'
    },
    {
      name: 'EU Customs Data Hub',
      status: 'available',
      type: 'customs',
      provider: 'AES / ICS2',
      icon: Truck,
      color: 'purple'
    },
    {
      name: 'ETS Market Data',
      status: 'connected',
      type: 'market',
      provider: 'EEX / ICE',
      icon: TrendingUp,
      color: 'green'
    },
    {
      name: 'SupplyLens',
      status: 'connected',
      type: 'internal',
      provider: 'Internal',
      icon: LinkIcon,
      color: 'orange'
    }
  ];
  
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#86b027]" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {integrations.map((integration, idx) => {
              const Icon = integration.icon;
              const statusColor = integration.status === 'connected' 
                ? 'bg-green-100 text-green-700 border-green-200'
                : integration.status === 'available'
                ? 'bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-600 border-slate-200';
              
              return (
                <div key={idx} className="p-4 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg bg-${integration.color}-50`}>
                      <Icon className={`w-5 h-5 text-${integration.color}-600`} />
                    </div>
                    <Badge className={`${statusColor} border`}>
                      {integration.status === 'connected' ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</>
                      ) : integration.status === 'available' ? (
                        <>Ready</>
                      ) : (
                        <><XCircle className="w-3 h-3 mr-1" /> Not Set</>
                      )}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">{integration.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{integration.provider}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="registry">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="registry">
            <Globe className="w-4 h-4 mr-2" />
            Registry
          </TabsTrigger>
          <TabsTrigger value="customs">
            <Truck className="w-4 h-4 mr-2" />
            Customs
          </TabsTrigger>
          <TabsTrigger value="market">
            <TrendingUp className="w-4 h-4 mr-2" />
            Market
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="registry">
          <RegistryCredentialsConfig />
        </TabsContent>
        
        <TabsContent value="customs">
          <CustomsDataImporter />
        </TabsContent>
        
        <TabsContent value="market">
          <ETSMarketConnector />
        </TabsContent>
      </Tabs>
    </div>
  );
}
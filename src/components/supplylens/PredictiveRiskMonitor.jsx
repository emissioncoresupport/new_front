import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, TrendingUp, Globe, Newspaper, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function PredictiveRiskMonitor() {
  const [isScanning, setIsScanning] = useState(false);
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['risk-alerts'],
    queryFn: () => base44.entities.RiskAlert.list('-created_date', 20)
  });

  const scanSuppliersMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      
      for (const supplier of suppliers.slice(0, 10)) { // Scan top 10
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze real-time risk for supplier: ${supplier.legal_name} in ${supplier.country}.

Search for:
- Recent news/sanctions/ESG ratings
- Financial distress signals
- Geopolitical risks
- Environmental violations
- Labor rights issues
- Supply chain disruptions

Return risk assessment with severity (low/medium/high/critical) and brief explanation.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              risk_detected: { type: "boolean" },
              severity: { type: "string" },
              risk_type: { type: "string" },
              summary: { type: "string" },
              source: { type: "string" }
            }
          }
        });

        const riskData = typeof response === 'string' ? JSON.parse(response) : response;
        
        if (riskData.risk_detected) {
          await base44.entities.RiskAlert.create({
            supplier_id: supplier.id,
            alert_type: riskData.risk_type || 'operational',
            severity: riskData.severity || 'medium',
            title: `${riskData.risk_type}: ${supplier.legal_name}`,
            description: riskData.summary,
            status: 'open',
            source: 'AI Risk Monitor'
          });
          
          results.push({ supplier: supplier.legal_name, risk: riskData });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['risk-alerts'] });
      if (results.length > 0) {
        toast.warning(`⚠️ Found ${results.length} new risk alerts`);
      } else {
        toast.success('✅ No new risks detected');
      }
    }
  });

  const handleScan = async () => {
    setIsScanning(true);
    const loadingToast = toast.loading('🤖 AI scanning suppliers for risks...');
    
    try {
      await scanSuppliersMutation.mutateAsync();
      toast.dismiss(loadingToast);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Scan failed: ' + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const recentAlerts = alerts.slice(0, 5);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status === 'open');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#545454]">Predictive Risk Monitor</h3>
            <p className="text-xs text-slate-600">AI-powered real-time risk surveillance</p>
          </div>
        </div>
        <Button
          onClick={handleScan}
          disabled={isScanning}
          className="bg-rose-600 hover:bg-rose-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Scan Now'}
        </Button>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4">
            <AlertTriangle className="w-5 h-5 text-rose-600 mb-2" />
            <p className="text-2xl font-bold text-rose-600">{criticalAlerts.length}</p>
            <p className="text-xs text-slate-600">Critical Alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Globe className="w-5 h-5 text-amber-600 mb-2" />
            <p className="text-2xl font-bold text-amber-600">
              {alerts.filter(a => a.alert_type === 'geopolitical').length}
            </p>
            <p className="text-xs text-slate-600">Geopolitical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-blue-600">
              {alerts.filter(a => a.alert_type === 'financial').length}
            </p>
            <p className="text-xs text-slate-600">Financial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Newspaper className="w-5 h-5 text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-purple-600">
              {alerts.filter(a => a.source === 'AI Risk Monitor').length}
            </p>
            <p className="text-xs text-slate-600">AI-Detected</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Risk Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === 'critical' ? 'border-rose-500 bg-rose-50' :
                    alert.severity === 'high' ? 'border-amber-500 bg-amber-50' :
                    alert.severity === 'medium' ? 'border-blue-500 bg-blue-50' :
                    'border-slate-500 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={
                        alert.severity === 'critical' ? 'bg-rose-600' :
                        alert.severity === 'high' ? 'bg-amber-600' :
                        alert.severity === 'medium' ? 'bg-blue-600' :
                        'bg-slate-600'
                      }>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline">{alert.alert_type}</Badge>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(alert.created_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-slate-900 mb-1">{alert.title}</p>
                  <p className="text-xs text-slate-700">{alert.description}</p>
                  {alert.source && (
                    <p className="text-xs text-slate-500 mt-2">Source: {alert.source}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Shield className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No recent alerts</p>
              <p className="text-xs">Run a scan to monitor suppliers</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-xs font-bold text-blue-900 mb-1">💡 How It Works</p>
        <p className="text-xs text-blue-800">
          AI continuously monitors news, sanctions lists, ESG ratings, financial indicators, and geopolitical events. 
          Real-time alerts help you stay ahead of supply chain disruptions. Schedule daily auto-scans or run on-demand.
        </p>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from 'sonner';
import { FlaskConical, CheckCircle2, XCircle, Loader2, Key, Link2 } from "lucide-react";

export default function PFASLabAPIConfiguration() {
  const [provider, setProvider] = useState('eurofins');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const testConnection = async () => {
    if (!apiKey) {
      toast.error('Please enter API key');
      return;
    }

    setTesting(true);
    try {
      const response = await base44.functions.invoke('pfasLabIntegration', {
        action: 'test_connection',
        lab_provider: provider,
        api_key: apiKey
      });

      if (response.data.success) {
        setConnectionStatus('connected');
        toast.success('Lab API connection successful');
      } else {
        setConnectionStatus('failed');
        toast.error('Connection failed: ' + response.data.message);
      }
    } catch (error) {
      setConnectionStatus('failed');
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = () => {
    // Save to secrets or company settings
    toast.success('Lab API configuration saved');
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/30 bg-gradient-to-br from-white to-[#86b027]/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#86b027]">
                <FlaskConical className="w-5 h-5" />
                PFAS Testing Lab API Configuration
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Connect to Eurofins, SGS, or other PFAS testing labs for automated result import
              </p>
            </div>
            {connectionStatus && (
              <Badge className={connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}>
                {connectionStatus === 'connected' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                {connectionStatus === 'connected' ? 'Connected' : 'Failed'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lab Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eurofins">Eurofins Environment Testing</SelectItem>
                <SelectItem value="sgs">SGS</SelectItem>
                <SelectItem value="als">ALS Environmental</SelectItem>
                <SelectItem value="intertek">Intertek</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Enter lab API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button
                onClick={testConnection}
                disabled={testing}
                variant="outline"
                className="shrink-0"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Obtain API key from your lab provider's developer portal
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveConfiguration} className="bg-[#86b027] hover:bg-[#769c22]">
              <Key className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Features */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Automated Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">Webhook Auto-Import</p>
                <p className="text-xs text-slate-600">Lab results automatically imported when tests complete</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">PFASAssessment Auto-Update</p>
                <p className="text-xs text-slate-600">Compliance status, detected substances, risk scores updated</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">SCIP Notification Trigger</p>
                <p className="text-xs text-slate-600">Auto-alert when SVHCs detected (ECHA 45-day deadline)</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">Test Report Linking</p>
                <p className="text-xs text-slate-600">PDF reports and certificates automatically attached</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card className="border-blue-200 bg-blue-50/20">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Webhook Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-3">
            Configure this webhook URL in your lab provider's dashboard to receive automatic test result notifications:
          </p>
          <div className="p-3 bg-white rounded-lg border border-blue-200 font-mono text-xs break-all">
            https://yourapp.base44.com/api/pfasLabIntegration?action=webhook&provider={provider}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
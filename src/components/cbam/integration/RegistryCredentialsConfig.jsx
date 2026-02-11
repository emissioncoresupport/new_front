import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { 
  Shield, CheckCircle2, AlertTriangle, Globe, 
  Lock, RefreshCw, ExternalLink, Info
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

/**
 * CBAM Registry Credentials Configuration
 * Manage API credentials for EU member state CBAM registries
 * Required for automated report submission
 * 
 * Security: Credentials encrypted at rest
 */

export default function RegistryCredentialsConfig() {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const [config, setConfig] = useState({
    member_state: '',
    eori_number: '',
    cbam_account_number: '',
    registry_url: '',
    api_key: '',
    oauth_enabled: false,
    auto_submit_enabled: false
  });

  const { data: registryConfigs = [] } = useQuery({
    queryKey: ['cbam-registry-configs'],
    queryFn: () => base44.entities.CBAMClient.list()
  });

  const activeConfig = registryConfigs.find(c => c.status === 'active');

  const saveConfigMutation = useMutation({
    mutationFn: (data) => {
      if (activeConfig) {
        return base44.entities.CBAMClient.update(activeConfig.id, data);
      }
      return base44.entities.CBAMClient.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-registry-configs'] });
      toast.success('Registry configuration saved');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Failed to save configuration');
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      // Test connection to registry
      const { data } = await base44.functions.invoke('cbamRegistrySubmission', {
        action: 'test_connection',
        member_state: config.member_state
      });

      return data;
    },
    onSuccess: () => {
      toast.success('✓ Connection successful');
    },
    onError: () => {
      toast.error('Connection test failed');
    }
  });

  const registryEndpoints = {
    'DE': 'https://cbam-registry.deutschland.de',
    'NL': 'https://cbam.belastingdienst.nl',
    'FR': 'https://cbam.douane.gouv.fr',
    'BE': 'https://cbam-registry.belgium.be',
    'IT': 'https://cbam.agenziadogane.it',
    'ES': 'https://cbam.agenciatributaria.es',
    'PL': 'https://cbam.gov.pl',
    'SE': 'https://cbam.tullverket.se'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#86b027]" />
              CBAM Registry Integration
            </CardTitle>
            <CardDescription>
              Configure API credentials for automated report submission to EU member state registries
            </CardDescription>
          </div>
          {activeConfig && !isEditing && (
            <Badge className="bg-green-100 text-green-700 border-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeConfig && !isEditing ? (
          // Display Mode
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">Member State</div>
                <div className="font-semibold text-slate-900">{activeConfig.member_state}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">EORI Number</div>
                <div className="font-mono text-sm">{activeConfig.eori_number}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">CBAM Account</div>
                <div className="font-mono text-sm">{activeConfig.cbam_account_number || 'Not set'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Registry URL</div>
                <div className="text-sm text-blue-600 truncate">{activeConfig.registry_url}</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-green-600" />
                <span className="text-sm text-slate-700">API credentials encrypted</span>
              </div>
              {activeConfig.auto_submit_enabled && (
                <Badge className="bg-blue-100 text-blue-700">Auto-submit enabled</Badge>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setConfig({
                    member_state: activeConfig.member_state,
                    eori_number: activeConfig.eori_number,
                    cbam_account_number: activeConfig.cbam_account_number,
                    registry_url: activeConfig.registry_url,
                    api_key: '',
                    oauth_enabled: activeConfig.oauth_enabled || false,
                    auto_submit_enabled: activeConfig.auto_submit_enabled || false
                  });
                  setIsEditing(true);
                }}
              >
                Edit Configuration
              </Button>
            </div>
          </div>
        ) : (
          // Edit Mode
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-xs">
                <strong>Production Integration:</strong> Contact your member state customs authority to obtain CBAM Registry API credentials. Currently supports automated submission for DE, NL, FR, BE, IT, ES, PL, SE.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Member State *</Label>
                <Select 
                  value={config.member_state} 
                  onValueChange={(val) => {
                    setConfig({
                      ...config, 
                      member_state: val,
                      registry_url: registryEndpoints[val] || ''
                    });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(registryEndpoints).map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>EORI Number *</Label>
                <Input
                  value={config.eori_number}
                  onChange={(e) => setConfig({...config, eori_number: e.target.value})}
                  placeholder="EU123456789"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>CBAM Account Number</Label>
                <Input
                  value={config.cbam_account_number}
                  onChange={(e) => setConfig({...config, cbam_account_number: e.target.value})}
                  placeholder="CBAM-xxxxx"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Registry URL</Label>
                <Input
                  value={config.registry_url}
                  onChange={(e) => setConfig({...config, registry_url: e.target.value})}
                  placeholder="https://..."
                  className="mt-1"
                  disabled
                />
              </div>

              <div className="col-span-2">
                <Label>API Key / Client Secret</Label>
                <Input
                  type="password"
                  value={config.api_key}
                  onChange={(e) => setConfig({...config, api_key: e.target.value})}
                  placeholder="Enter API key..."
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Credentials will be encrypted before storage</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-slate-900 text-sm">OAuth Authentication</div>
                  <div className="text-xs text-slate-500">Use OAuth 2.0 instead of API key</div>
                </div>
                <Switch 
                  checked={config.oauth_enabled}
                  onCheckedChange={(val) => setConfig({...config, oauth_enabled: val})}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 border-amber-200">
                <div>
                  <div className="font-medium text-slate-900 text-sm">Auto-Submit Reports</div>
                  <div className="text-xs text-amber-700">Automatically submit validated reports</div>
                </div>
                <Switch 
                  checked={config.auto_submit_enabled}
                  onCheckedChange={(val) => setConfig({...config, auto_submit_enabled: val})}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setConfig({
                    member_state: '',
                    eori_number: '',
                    cbam_account_number: '',
                    registry_url: '',
                    api_key: '',
                    oauth_enabled: false,
                    auto_submit_enabled: false
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveConfigMutation.mutate(config)}
                disabled={!config.member_state || !config.eori_number || saveConfigMutation.isPending}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        )}

        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs">
            <strong>Important:</strong> Direct API integration requires production credentials from your national customs authority. 
            Without credentials, reports can be downloaded as XML for manual submission via member state portals.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
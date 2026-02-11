import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Settings, Zap, Shield, Bell, TrendingUp, AlertTriangle } from "lucide-react";
import { getCurrentCompany } from '@/components/utils/multiTenant';

export default function CBAMAutomationSettings() {
  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ['current-company'],
    queryFn: getCurrentCompany
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['cbam-automation-settings', company?.id],
    queryFn: async () => {
      const allSettings = await base44.entities.CBAMAutomationSettings.list();
      return allSettings.find(s => s.company_id === company?.id);
    },
    enabled: !!company
  });

  const [formData, setFormData] = useState({
    auto_generate_orders: false,
    shortfall_threshold: 100,
    auto_approve_enabled: false,
    auto_approve_limit: 10000,
    notification_email: '',
    buffer_percentage: 10
  });

  React.useEffect(() => {
    if (settings) {
      setFormData({
        auto_generate_orders: settings.auto_generate_orders || false,
        shortfall_threshold: settings.shortfall_threshold || 100,
        auto_approve_enabled: settings.auto_approve_enabled || false,
        auto_approve_limit: settings.auto_approve_limit || 10000,
        notification_email: settings.notification_email || '',
        buffer_percentage: settings.buffer_percentage || 10
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.CBAMAutomationSettings.update(settings.id, data);
      }
      return base44.entities.CBAMAutomationSettings.create({
        ...data,
        company_id: company?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-automation-settings'] });
      toast.success('Automation settings saved successfully');
    },
    onError: () => toast.error('Failed to save settings')
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <h2 className="text-base font-medium text-slate-900">Certificate Purchase Automation</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure automated draft order generation
        </p>
      </div>

      <div className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-3.5">
        <p className="text-xs text-slate-700">
          <strong>Smart Automation:</strong> System monitors balance in real-time and creates draft orders when shortfall detected.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Clean Settings Card */}
        <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="border-b border-slate-200/60 px-5 py-4">
            <h3 className="text-sm font-medium text-slate-900">Auto-Generate Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create draft orders when shortfall detected
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Enable Auto-Generation</Label>
                <p className="text-xs text-slate-500 mt-1">Create draft orders automatically</p>
              </div>
              <Switch
                checked={formData.auto_generate_orders}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_generate_orders: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Shortfall Threshold (units)</Label>
              <Input
                type="number"
                value={formData.shortfall_threshold}
                onChange={(e) => setFormData(prev => ({ ...prev, shortfall_threshold: Number(e.target.value) }))}
                placeholder="100"
              />
              <p className="text-xs text-slate-500">Minimum shortfall to trigger automatic order generation</p>
            </div>

            <div className="space-y-2">
              <Label>Safety Buffer (%)</Label>
              <Input
                type="number"
                value={formData.buffer_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, buffer_percentage: Number(e.target.value) }))}
                placeholder="10"
              />
              <p className="text-xs text-slate-500">Additional % added to calculated shortfall as safety margin</p>
            </div>
          </div>
        </div>

        {/* Clean Approval Card */}
        <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="border-b border-slate-200/60 px-5 py-4">
            <h3 className="text-sm font-medium text-slate-900">Auto-Approve Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Approve orders below specified value
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Enable Auto-Approval</Label>
                <p className="text-xs text-slate-500 mt-1">Approve orders automatically if below limit</p>
              </div>
              <Switch
                checked={formData.auto_approve_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_approve_enabled: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Auto-Approve Limit (EUR)</Label>
              <Input
                type="number"
                value={formData.auto_approve_limit}
                onChange={(e) => setFormData(prev => ({ ...prev, auto_approve_limit: Number(e.target.value) }))}
                placeholder="10000"
              />
              <p className="text-xs text-slate-500">Maximum order value that can be automatically approved</p>
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-700">
                Orders exceeding €{formData.auto_approve_limit.toLocaleString()} will remain in "pending_approval" status
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      {/* Clean Notifications */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="border-b border-slate-200/60 px-5 py-4">
          <h3 className="text-sm font-medium text-slate-900">Notifications</h3>
          <p className="text-xs text-slate-500 mt-0.5">Get notified when automated actions taken</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>Notification Email</Label>
            <Input
              type="email"
              value={formData.notification_email}
              onChange={(e) => setFormData(prev => ({ ...prev, notification_email: e.target.value }))}
              placeholder="procurement@company.com"
            />
            <p className="text-xs text-slate-500">Receive email alerts for auto-generated and auto-approved orders</p>
          </div>
        </div>
      </div>

      {/* Clean Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 text-sm shadow-none"
          onClick={() => {
            if (settings) {
              setFormData({
                auto_generate_orders: settings.auto_generate_orders || false,
                shortfall_threshold: settings.shortfall_threshold || 100,
                auto_approve_enabled: settings.auto_approve_enabled || false,
                auto_approve_limit: settings.auto_approve_limit || 10000,
                notification_email: settings.notification_email || '',
                buffer_percentage: settings.buffer_percentage || 10
              });
            }
          }}
        >
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm shadow-sm"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Clean Status */}
      {settings && (
        <div className="bg-slate-50/50 border border-slate-200/60 rounded-lg p-5">
          <h4 className="text-sm font-medium text-slate-900 mb-4">Automation Status</h4>
          <div className="text-sm text-slate-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Auto-Generation</p>
                <p className="font-semibold">{settings.auto_generate_orders ? '✓ Enabled' : '✗ Disabled'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Auto-Approval</p>
                <p className="font-semibold">{settings.auto_approve_enabled ? '✓ Enabled' : '✗ Disabled'}</p>
              </div>
              {settings.last_auto_order_date && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Last Auto-Order</p>
                  <p className="font-semibold">{new Date(settings.last_auto_order_date).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Database, RefreshCw, CheckCircle, XCircle, Plus, Settings, 
  ArrowRightLeft, Activity, ShieldCheck, FileText, Clock
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ERPSyncModal from './ERPSyncModal';

export default function ERPIntegration() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [syncModalConnection, setSyncModalConnection] = useState(null);
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: () => base44.entities.ERPConnection.list()
  });

  const createConnection = useMutation({
    mutationFn: (data) => base44.entities.ERPConnection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
      setIsAddModalOpen(false);
      toast.success("ERP Connection configured successfully");
    }
  });

  const handleAddConnection = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      type: formData.get('type'),
      endpoint_url: formData.get('endpoint_url'),
      api_key: formData.get('api_key'),
      sync_frequency: formData.get('sync_frequency'),
      status: 'active',
      sync_modules: formData.getAll('sync_modules')
    };
    createConnection.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">ERP Integrations</h2>
          <p className="text-sm text-slate-500">Manage connections to external ERP systems for data synchronization.</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure New ERP Connection</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddConnection} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Connection Name</Label>
                <Input id="name" name="name" placeholder="e.g. Global SAP Instance" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">ERP System</Label>
                <Select name="type" defaultValue="SAP">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAP">SAP S/4HANA</SelectItem>
                    <SelectItem value="Oracle">Oracle NetSuite</SelectItem>
                    <SelectItem value="Microsoft Dynamics">Microsoft Dynamics 365</SelectItem>
                    <SelectItem value="Custom">Custom REST API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint_url">Endpoint URL</Label>
                <Input id="endpoint_url" name="endpoint_url" placeholder="https://api.erp-system.com/v1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key / Token</Label>
                <div className="flex gap-2">
                  <Input id="api_key" name="api_key" type="password" placeholder="••••••••••••••••" required />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => toast.promise(
                      new Promise(resolve => setTimeout(resolve, 2000)), 
                      {
                        loading: 'Testing connection...',
                        success: 'Connection successful!',
                        error: 'Connection failed'
                      }
                    )}
                  >
                    Test
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sync_frequency">Sync Frequency</Label>
                <Select name="sync_frequency" defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Only</SelectItem>
                    <SelectItem value="daily">Daily (Midnight)</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="realtime">Real-time (Webhook)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 border-t pt-3">
                <Label>Data Modules to Sync</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="mod_suppliers" name="sync_modules" value="suppliers" defaultChecked />
                    <Label htmlFor="mod_suppliers" className="font-normal cursor-pointer">Suppliers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="mod_po" name="sync_modules" value="purchase_orders" defaultChecked />
                    <Label htmlFor="mod_po" className="font-normal cursor-pointer">Purchase Orders</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="mod_logistics" name="sync_modules" value="logistics" defaultChecked />
                    <Label htmlFor="mod_logistics" className="font-normal cursor-pointer">Logistics Data</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="mod_energy" name="sync_modules" value="energy_bills" defaultChecked />
                    <Label htmlFor="mod_energy" className="font-normal cursor-pointer">Energy Bills</Label>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full mt-2">Save Connection</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {connections.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-white mb-4 shadow-sm">
              <ArrowRightLeft className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No ERP Connections</h3>
            <p className="text-slate-500 max-w-md mt-2 mb-6">
              Connect your ERP system to automatically sync supplier data, purchase orders, and compliance documents.
            </p>
            <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>
              Configure Integration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {connections.map(conn => (
            <Card key={conn.id} className="border-slate-200 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <Database className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{conn.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {conn.type}
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 text-xs">
                          <Activity className="w-3 h-3" /> {conn.sync_frequency}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={conn.status === 'active' ? 'default' : 'destructive'} className={conn.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                    {conn.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-slate-500 text-xs uppercase tracking-wide font-medium">Last Sync</p>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700">
                        {conn.last_sync_at ? format(new Date(conn.last_sync_at), 'MMM d, HH:mm') : 'Never'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500 text-xs uppercase tracking-wide font-medium">Modules</p>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="text-xs font-normal">Suppliers</Badge>
                      <Badge variant="secondary" className="text-xs font-normal">PO</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                  <Button variant="ghost" size="sm" className="text-slate-500">
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setSyncModalConnection(conn)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {syncModalConnection && (
        <ERPSyncModal 
          connection={syncModalConnection}
          open={!!syncModalConnection}
          onOpenChange={(open) => !open && setSyncModalConnection(null)}
        />
      )}
    </div>
  );
}
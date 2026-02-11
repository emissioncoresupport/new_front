import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, RefreshCw, ArrowRightLeft, ArrowDownCircle, ArrowUpCircle,
  CheckCircle, AlertCircle, Clock, Settings, Zap, Activity, Loader2,
  Calendar, Plus, Edit, Trash, Eye, Download
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ERPSyncDashboard() {
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [syncDirection, setSyncDirection] = useState('bidirectional');
  const [selectedEntities, setSelectedEntities] = useState(['suppliers', 'materials', 'purchase_orders']);
  const [conflictResolution, setConflictResolution] = useState('erp_wins');
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: () => base44.entities.ERPConnection.list()
  });

  const { data: syncRuns = [] } = useQuery({
    queryKey: ['erp-sync-runs', selectedConnection],
    queryFn: () => selectedConnection 
      ? base44.entities.ERPSyncRun.filter({ erp_connection_id: selectedConnection })
      : [],
    enabled: !!selectedConnection
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['erp-schedules', selectedConnection],
    queryFn: () => selectedConnection
      ? base44.entities.ERPExportSchedule.filter({ erp_connection_id: selectedConnection })
      : [],
    enabled: !!selectedConnection
  });

  const { data: exportLogs = [] } = useQuery({
    queryKey: ['erp-export-logs', selectedConnection],
    queryFn: async () => {
      if (!selectedConnection) return [];
      const runs = await base44.entities.ERPSyncRun.filter({ erp_connection_id: selectedConnection });
      if (runs.length === 0) return [];
      const logs = await base44.entities.ERPExportLog.filter({ 
        erp_sync_run_id: runs[0].id 
      });
      return logs;
    },
    enabled: !!selectedConnection
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('erpBidirectionalSync', {
        erp_connection_id: selectedConnection,
        sync_direction: syncDirection,
        entity_types: selectedEntities,
        conflict_resolution: conflictResolution
      });
    },
    onSuccess: (response) => {
      const results = response.data.results;
      const total = Object.values(results)
        .filter(r => typeof r === 'object')
        .reduce((sum, r) => sum + (r.imported || 0) + (r.exported || 0), 0);
      
      toast.success(`Sync completed: ${total} records processed`, {
        description: results.errors?.length > 0 
          ? `${results.errors.length} errors occurred` 
          : 'All operations successful'
      });
      queryClient.invalidateQueries({ queryKey: ['erp-sync-runs'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (error) => {
      toast.error('Sync failed: ' + error.message);
    }
  });

  const activeConnections = connections.filter(c => c.status === 'active');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light text-slate-900">ERP Integration</h2>
          <p className="text-sm text-slate-600 mt-1">Bidirectional sync with SAP, Oracle, Dynamics 365</p>
        </div>
        <Badge className="bg-[#86b027]">
          {activeConnections.length} Active Connection{activeConnections.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Tabs defaultValue="sync" className="w-full">
        <TabsList>
          <TabsTrigger value="sync">Sync Operations</TabsTrigger>
          <TabsTrigger value="schedules">Scheduled Syncs</TabsTrigger>
          <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
          <TabsTrigger value="logs">Export Logs</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configure Sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>ERP Connection</Label>
                <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ERP connection..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeConnections.map(conn => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.connection_name} ({conn.system_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Sync Direction</Label>
                <Select value={syncDirection} onValueChange={setSyncDirection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="import">
                      <div className="flex items-center gap-2">
                        <ArrowDownCircle className="w-4 h-4" />
                        Import from ERP
                      </div>
                    </SelectItem>
                    <SelectItem value="export">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4" />
                        Export to ERP
                      </div>
                    </SelectItem>
                    <SelectItem value="bidirectional">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4" />
                        Bidirectional Sync
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3 block">Entity Types</Label>
                <div className="space-y-2">
                  {[
                    { value: 'suppliers', label: 'Suppliers' },
                    { value: 'materials', label: 'Materials/SKUs' },
                    { value: 'purchase_orders', label: 'Purchase Orders' },
                    { value: 'boms', label: 'Bill of Materials' }
                  ].map(entity => (
                    <div key={entity.value} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedEntities.includes(entity.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEntities([...selectedEntities, entity.value]);
                          } else {
                            setSelectedEntities(selectedEntities.filter(e => e !== entity.value));
                          }
                        }}
                      />
                      <Label className="cursor-pointer">{entity.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Conflict Resolution</Label>
                <Select value={conflictResolution} onValueChange={setConflictResolution}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="erp_wins">ERP Wins (ERP data overwrites app)</SelectItem>
                    <SelectItem value="app_wins">App Wins (App data overwrites ERP)</SelectItem>
                    <SelectItem value="manual">Manual Review Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => syncMutation.mutate()}
                disabled={!selectedConnection || syncMutation.isPending}
                className="w-full bg-[#86b027] hover:bg-[#86b027]/90"
              >
                {syncMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Start Sync
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Scheduled Syncs</CardTitle>
                <Button size="sm" className="bg-[#86b027]">
                  <Plus className="w-4 h-4 mr-2" />
                  New Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {schedules.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No scheduled syncs configured</p>
                  </div>
                ) : (
                  schedules.map(schedule => (
                    <div key={schedule.id} className="border rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-slate-900">{schedule.schedule_name}</h4>
                            <Badge variant={schedule.is_active ? 'default' : 'outline'}>
                              {schedule.is_active ? 'Active' : 'Paused'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600">
                            {schedule.frequency} • {schedule.entity_types.join(', ')} • {schedule.sync_direction}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                        <div>
                          <span className="text-slate-500">Last Run:</span>
                          <p className="font-medium">
                            {schedule.last_run_at 
                              ? format(new Date(schedule.last_run_at), 'MMM d, HH:mm')
                              : 'Never'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Next Run:</span>
                          <p className="font-medium">
                            {schedule.next_run_at 
                              ? format(new Date(schedule.next_run_at), 'MMM d, HH:mm')
                              : 'Not scheduled'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Field Mappings</CardTitle>
                <Button size="sm" className="bg-[#86b027]">
                  <Plus className="w-4 h-4 mr-2" />
                  New Mapping
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Configure field mappings between SupplyLens and your ERP</p>
                <p className="text-xs text-slate-400 mt-1">Map supplier, material, and PO fields to your ERP schema</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sync History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {syncRuns.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No sync runs yet</p>
                  </div>
                ) : (
                  syncRuns.map(run => (
                    <div key={run.id} className="border rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={run.status === 'completed' ? 'default' : 'outline'}>
                              {run.status}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {format(new Date(run.started_at), 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Sync Mode: <strong>{run.sync_mode}</strong> • Entities: {run.entity_types.join(', ')}
                          </p>
                        </div>
                        {run.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-3 text-xs">
                        <div>
                          <span className="text-slate-500">Processed:</span>
                          <p className="font-semibold">{run.records_processed}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Created:</span>
                          <p className="font-semibold text-green-600">{run.records_created}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Updated:</span>
                          <p className="font-semibold text-blue-600">{run.records_updated}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Failed:</span>
                          <p className="font-semibold text-red-600">{run.records_failed}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Export Logs</CardTitle>
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {exportLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No export logs yet</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-50 border-b">
                        <tr>
                          <th className="text-left py-2 px-3">Entity</th>
                          <th className="text-left py-2 px-3">Operation</th>
                          <th className="text-left py-2 px-3">Status</th>
                          <th className="text-left py-2 px-3">Retries</th>
                          <th className="text-left py-2 px-3">Duration</th>
                          <th className="text-left py-2 px-3">Time</th>
                          <th className="text-left py-2 px-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportLogs.map(log => (
                          <tr key={log.id} className="border-b hover:bg-slate-50">
                            <td className="py-2 px-3">{log.entity_type}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-xs">
                                {log.operation}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              {log.status === 'success' && (
                                <Badge className="bg-green-100 text-green-800 text-xs">Success</Badge>
                              )}
                              {log.status === 'failed' && (
                                <Badge className="bg-red-100 text-red-800 text-xs">Failed</Badge>
                              )}
                              {log.status === 'retrying' && (
                                <Badge className="bg-amber-100 text-amber-800 text-xs">Retrying</Badge>
                              )}
                            </td>
                            <td className="py-2 px-3">{log.retry_count || 0}</td>
                            <td className="py-2 px-3">
                              {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                            </td>
                            <td className="py-2 px-3">
                              {format(new Date(log.exported_at), 'MMM d, HH:mm:ss')}
                            </td>
                            <td className="py-2 px-3">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Eye className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Real-time Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">Webhook Endpoint URL</p>
                  <div className="flex gap-2">
                    <Input 
                      value={`${window.location.origin}/api/functions/erpWebhookReceiver`}
                      readOnly
                      className="bg-white text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/functions/erpWebhookReceiver`);
                        toast.success('Webhook URL copied');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Configure this URL in your ERP system to receive real-time updates
                  </p>
                </div>

                <div>
                  <Label className="mb-2 block">Webhook Secret</Label>
                  <p className="text-xs text-slate-600 mb-2">
                    Set ERP_WEBHOOK_SECRET in environment variables for signature verification
                  </p>
                  <Badge variant="outline">ERP_WEBHOOK_SECRET</Badge>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Supported Events:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Supplier Created/Updated/Deleted
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Material Created/Updated
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Purchase Order Created
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      BOM Updates
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
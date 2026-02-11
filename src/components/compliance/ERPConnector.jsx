import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, RefreshCw, Database, CheckCircle2, XCircle, Settings, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function ERPConnector() {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newConnection, setNewConnection] = useState({
        name: "",
        system_type: "SAP",
        endpoint_url: "",
        auth_type: "API Key",
        sync_frequency: "Manual",
        resource_types: ["Materials", "Suppliers"]
    });

    const { data: connections = [], isLoading } = useQuery({
        queryKey: ['erp-connections'],
        queryFn: () => base44.entities.ERPConnection.list()
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ERPConnection.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['erp-connections']);
            setIsAddOpen(false);
            toast.success("Connection created successfully");
        }
    });

    const syncMutation = useMutation({
        mutationFn: async (id) => {
            // Simulate sync delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            return base44.entities.ERPConnection.update(id, { 
                last_sync: new Date().toISOString(),
                status: 'Active'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['erp-connections']);
            toast.success("Sync completed successfully");
        },
        onError: () => {
            toast.error("Sync failed");
        }
    });

    const handleResourceToggle = (resource) => {
        setNewConnection(prev => {
            const current = prev.resource_types;
            if (current.includes(resource)) {
                return { ...prev, resource_types: current.filter(r => r !== resource) };
            } else {
                return { ...prev, resource_types: [...current, resource] };
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-slate-900">External Systems</h3>
                    <p className="text-sm text-slate-500">Manage connections to ERP, PLM, and other data sources.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2" /> Add Connection
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add System Connection</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Connection Name</Label>
                                <Input 
                                    placeholder="e.g. SAP Production" 
                                    value={newConnection.name}
                                    onChange={e => setNewConnection({...newConnection, name: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>System Type</Label>
                                    <Select 
                                        value={newConnection.system_type} 
                                        onValueChange={v => setNewConnection({...newConnection, system_type: v})}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SAP">SAP S/4HANA</SelectItem>
                                            <SelectItem value="Oracle">Oracle NetSuite</SelectItem>
                                            <SelectItem value="Microsoft Dynamics">Microsoft Dynamics 365</SelectItem>
                                            <SelectItem value="Salesforce">Salesforce</SelectItem>
                                            <SelectItem value="Teamcenter">Siemens Teamcenter</SelectItem>
                                            <SelectItem value="Windchill">PTC Windchill</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Sync Frequency</Label>
                                    <Select 
                                        value={newConnection.sync_frequency} 
                                        onValueChange={v => setNewConnection({...newConnection, sync_frequency: v})}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Manual">Manual</SelectItem>
                                            <SelectItem value="Daily">Daily</SelectItem>
                                            <SelectItem value="Weekly">Weekly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Endpoint URL</Label>
                                <Input 
                                    placeholder="https://api.example.com/v1" 
                                    value={newConnection.endpoint_url}
                                    onChange={e => setNewConnection({...newConnection, endpoint_url: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="mb-2 block">Data to Sync</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {["Materials", "Products", "Suppliers", "BOMs"].map(r => (
                                        <div key={r} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={r} 
                                                checked={newConnection.resource_types.includes(r)}
                                                onCheckedChange={() => handleResourceToggle(r)}
                                            />
                                            <label htmlFor={r} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {r}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button onClick={() => createMutation.mutate(newConnection)} disabled={!newConnection.name || !newConnection.endpoint_url}>
                                Save Connection
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {connections.map(conn => (
                    <Card key={conn.id} className="flex flex-row items-center p-4 gap-4">
                        <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Database className="w-6 h-6 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900 truncate">{conn.name}</h4>
                                <Badge variant="outline" className={
                                    conn.status === 'Active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 
                                    conn.status === 'Error' ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-slate-500'
                                }>
                                    {conn.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                <span>{conn.system_type}</span>
                                <span>•</span>
                                <span>{conn.auth_type}</span>
                                <span>•</span>
                                <span className="truncate">Last Sync: {conn.last_sync ? new Date(conn.last_sync).toLocaleString() : 'Never'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => syncMutation.mutate(conn.id)}
                                disabled={syncMutation.isPending}
                            >
                                {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                Sync Now
                            </Button>
                            <Button variant="ghost" size="icon">
                                <Settings className="w-4 h-4 text-slate-400" />
                            </Button>
                        </div>
                    </Card>
                ))}
                {connections.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <LinkIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500">No external systems connected.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
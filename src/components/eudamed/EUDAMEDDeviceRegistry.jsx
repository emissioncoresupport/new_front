import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Activity, Upload } from "lucide-react";
import EUDAMEDDeviceModal from './EUDAMEDDeviceModal';
import EUDAMEDBulkImporter from './EUDAMEDBulkImporter';
import EUDAMEDMasterOrchestrator from './services/EUDAMEDMasterOrchestrator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function EUDAMEDDeviceRegistry() {
  const [showModal, setShowModal] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: devices = [] } = useQuery({
    queryKey: ['eudamed-devices'],
    queryFn: () => base44.entities.DeviceModel.list()
  });

  const filtered = devices.filter(d => 
    d.model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Device & UDI Registry</h2>
          <p className="text-sm text-slate-600">Manage medical device registrations with UDI-DI identifiers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowModal(true)} className="bg-[#86b027] hover:bg-[#769c22]">
            <Plus className="w-4 h-4 mr-2" />
            Register Device
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by device name or UDI-DI..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4">
        {filtered.map(device => (
          <Card key={device.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{device.commercial_name || device.model_name}</h3>
                  <p className="text-sm text-slate-600 mb-2">Model: {device.model_name}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p><strong>Catalog #:</strong> {device.catalog_number || 'N/A'}</p>
                    <p><strong>Version:</strong> {device.version_number || '1.0'}</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Badge className={
                      device.status === 'exported' ? 'bg-emerald-500' :
                      device.status === 'ready' ? 'bg-blue-500' :
                      device.status === 'validated' ? 'bg-amber-500' : 'bg-slate-500'
                    }>{device.status}</Badge>
                    {device.sterile && <Badge variant="outline">Sterile</Badge>}
                    {device.single_use && <Badge variant="outline">Single Use</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EUDAMEDDeviceModal open={showModal} onOpenChange={setShowModal} />
      <EUDAMEDBulkImporter open={bulkImportOpen} onOpenChange={setBulkImportOpen} type="devices" />
    </div>
  );
}